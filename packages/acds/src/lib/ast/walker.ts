/**
 * AST walker utilities.
 *
 * Traversal helpers for the CDS AST. The visitor pattern here is intentionally
 * light — most downstream consumers just need to iterate over definitions,
 * elements, associations, or annotations without wiring a full Chevrotain
 * visitor.
 */
import type {
  AbstractEntityDefinition,
  Annotation,
  AssociationDeclaration,
  CdsDefinition,
  CdsSourceFile,
  CustomEntityDefinition,
  FieldDefinition,
  ParameterDefinition,
  StructureDefinition,
  TableDefinition,
  ViewElement,
  ViewEntityDefinition,
  ViewMember,
} from '../../ast';

export type WithMembers =
  | ViewEntityDefinition
  | AbstractEntityDefinition
  | CustomEntityDefinition;

export type WithFields = TableDefinition | StructureDefinition;

export type WithParameters =
  | ViewEntityDefinition
  | AbstractEntityDefinition
  | CustomEntityDefinition;

/** True when the definition has a `members` array (view-like entities). */
export function hasMembers(def: CdsDefinition): def is WithMembers {
  return (
    def.kind === 'viewEntity' ||
    def.kind === 'abstractEntity' ||
    def.kind === 'customEntity'
  );
}

/** True when the definition has a `members` array of typed fields (TABL/structure). */
export function hasFields(def: CdsDefinition): def is WithFields {
  return def.kind === 'table' || def.kind === 'structure';
}

export function hasParameters(def: CdsDefinition): def is WithParameters {
  return (
    def.kind === 'viewEntity' ||
    def.kind === 'abstractEntity' ||
    def.kind === 'customEntity'
  );
}

/** Yield every definition in the file (currently one, future-proofed). */
export function* walkDefinitions(file: CdsSourceFile): Iterable<CdsDefinition> {
  for (const def of file.definitions) yield def;
}

/**
 * Yield every annotation attached anywhere in the AST (definitions,
 * elements/fields, parameters, associations).
 */
export function* walkAnnotations(file: CdsSourceFile): Iterable<Annotation> {
  for (const def of walkDefinitions(file)) {
    for (const a of getAnnotations(def)) yield a;
    if (hasFields(def)) {
      for (const m of def.members) {
        if ('annotations' in m) {
          for (const a of m.annotations) yield a;
        }
      }
    }
    if (hasMembers(def)) {
      for (const m of def.members) {
        for (const a of m.annotations) yield a;
      }
    }
    if (hasParameters(def)) {
      for (const p of def.parameters) {
        for (const a of p.annotations) yield a;
      }
    }
  }
}

/** Safe accessor — returns an empty array if the definition carries none. */
export function getAnnotations(def: CdsDefinition): Annotation[] {
  return 'annotations' in def ? def.annotations : [];
}

/** Yield every element (`ViewElement`) across all view-like definitions. */
export function* walkViewElements(
  file: CdsSourceFile,
): Iterable<{ owner: WithMembers; element: ViewElement }> {
  for (const def of walkDefinitions(file)) {
    if (!hasMembers(def)) continue;
    for (const m of def.members) {
      if (isAssociation(m)) continue;
      yield { owner: def, element: m };
    }
  }
}

/** Yield every association declaration across view-like definitions. */
export function* walkAssociations(
  file: CdsSourceFile,
): Iterable<{ owner: WithMembers; association: AssociationDeclaration }> {
  for (const def of walkDefinitions(file)) {
    if (!hasMembers(def)) continue;
    for (const m of def.members) {
      if (!isAssociation(m)) continue;
      yield { owner: def, association: m };
    }
  }
}

/** Yield every field definition from tables and structures. */
export function* walkFields(
  file: CdsSourceFile,
): Iterable<{ owner: WithFields; field: FieldDefinition }> {
  for (const def of walkDefinitions(file)) {
    if (!hasFields(def)) continue;
    for (const m of def.members) {
      if ('kind' in m && m.kind === 'include') continue;
      yield { owner: def, field: m as FieldDefinition };
    }
  }
}

/** Yield every parameter definition across view-like entities. */
export function* walkParameters(
  file: CdsSourceFile,
): Iterable<{ owner: WithParameters; parameter: ParameterDefinition }> {
  for (const def of walkDefinitions(file)) {
    if (!hasParameters(def)) continue;
    for (const p of def.parameters) yield { owner: def, parameter: p };
  }
}

export function isAssociation(m: ViewMember): m is AssociationDeclaration {
  return 'kind' in m && m.kind === 'association';
}

/** Look up an annotation by its dotted key. Returns the first match. */
export function findAnnotation(
  annotations: readonly Annotation[],
  key: string,
): Annotation | undefined {
  return annotations.find((a) => a.key === key);
}
