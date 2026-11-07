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
  ExtensionDefinition,
  ExternalEntityDefinition,
  FieldDefinition,
  HierarchyDefinition,
  JoinClause,
  JoinSource,
  ParameterDefinition,
  SelectStatement,
  ScalarFunctionDefinition,
  StructureDefinition,
  TableDefinition,
  TableFunctionDefinition,
  ViewElement,
  ViewEntityDefinition,
  ViewMember,
} from '../../ast';

export type WithMembers =
  | ViewEntityDefinition
  | AbstractEntityDefinition
  | CustomEntityDefinition
  | HierarchyDefinition
  | ExtensionDefinition;

export type WithFields =
  | TableDefinition
  | StructureDefinition
  | ExternalEntityDefinition
  | TableFunctionDefinition;

export type WithParameters =
  | ViewEntityDefinition
  | AbstractEntityDefinition
  | CustomEntityDefinition
  | ExternalEntityDefinition
  | TableFunctionDefinition
  | ScalarFunctionDefinition
  | HierarchyDefinition;

/** True when the definition has a `members` array (view-like entities). */
export function hasMembers(def: CdsDefinition): def is WithMembers {
  return (
    def.kind === 'viewEntity' ||
    def.kind === 'abstractEntity' ||
    def.kind === 'customEntity' ||
    def.kind === 'hierarchy' ||
    def.kind === 'extension'
  );
}

/** True when the definition has a `members` array of typed fields (TABL/structure). */
export function hasFields(def: CdsDefinition): def is WithFields {
  return (
    def.kind === 'table' ||
    def.kind === 'structure' ||
    def.kind === 'externalEntity' ||
    def.kind === 'tableFunction'
  );
}

export function hasParameters(def: CdsDefinition): def is WithParameters {
  return (
    def.kind === 'viewEntity' ||
    def.kind === 'abstractEntity' ||
    def.kind === 'customEntity' ||
    def.kind === 'externalEntity' ||
    def.kind === 'tableFunction' ||
    def.kind === 'scalarFunction' ||
    def.kind === 'hierarchy'
  );
}

/** Yield every definition in the file (currently one, future-proofed). */
export function* walkDefinitions(file: CdsSourceFile): Iterable<CdsDefinition> {
  for (const def of file.definitions) yield def;
}

/**
 * Member pools that can carry annotations: fields/members (whichever the
 * definition supports), parameters, and extension-level associations.
 */
function annotationMemberPools(
  def: CdsDefinition,
): ReadonlyArray<readonly unknown[]> {
  const pools: Array<readonly unknown[]> = [];
  if (hasFields(def)) pools.push(def.members);
  if (hasMembers(def)) pools.push(def.members);
  if (def.kind === 'aspect') pools.push(def.members);
  if (hasParameters(def)) pools.push(def.parameters);
  if (def.kind === 'extension') pools.push(def.associations);
  return pools;
}

/** Yield every annotation carried by a definition's members. */
function* memberAnnotations(def: CdsDefinition): Iterable<Annotation> {
  for (const pool of annotationMemberPools(def)) {
    for (const m of pool) {
      if (typeof m === 'object' && m !== null && 'annotations' in m) {
        for (const a of m.annotations as Annotation[]) yield a;
      }
    }
  }
}

/**
 * Yield every annotation attached anywhere in the AST (definitions,
 * elements/fields, parameters, associations).
 */
export function* walkAnnotations(file: CdsSourceFile): Iterable<Annotation> {
  for (const def of walkDefinitions(file)) {
    for (const a of getAnnotations(def)) yield a;
    yield* memberAnnotations(def);
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
    const pools: AssociationDeclaration[][] = [
      def.members.filter(isAssociation),
    ];
    if (def.kind === 'extension') pools.push(def.associations);
    for (const association of pools.flat()) {
      yield { owner: def, association };
    }
  }
}

/**
 * Yield every association declared in the FROM region of a view entity.
 *
 * FROM associations are declared next to the data source (before the element
 * list) and are therefore kept apart from the associations inside
 * `members`.
 */
export function* walkFromAssociations(file: CdsSourceFile): Iterable<{
  owner: ViewEntityDefinition;
  association: AssociationDeclaration;
}> {
  for (const def of walkDefinitions(file)) {
    if (def.kind !== 'viewEntity') continue;
    yield* fromAssocOfSelect(def, def);
    // Set-operation branches (`union … select …`) carry their own FROM
    // associations.
    for (const op of def.setOperations ?? []) {
      yield* fromAssocOfSelect(def, op.statement);
    }
  }
}

function* fromAssocOfSelect(
  owner: ViewEntityDefinition,
  select: {
    fromAssociations?: AssociationDeclaration[];
    setOperations?: { statement: SelectStatement }[];
  },
): Iterable<{
  owner: ViewEntityDefinition;
  association: AssociationDeclaration;
}> {
  for (const a of select.fromAssociations ?? []) {
    yield { owner, association: a };
  }
  for (const op of select.setOperations ?? []) {
    yield* fromAssocOfSelect(owner, op.statement);
  }
}

/** Yield every join of every view entity, in source order. */
export function* walkJoins(
  file: CdsSourceFile,
): Iterable<{ owner: ViewEntityDefinition; join: JoinClause }> {
  for (const def of walkDefinitions(file)) {
    if (def.kind !== 'viewEntity') continue;
    yield* walkJoinChain(def, def.joins ?? []);
    // Set-operation branches (`union … select …`) carry their own joins.
    for (const op of def.setOperations ?? []) {
      yield* walkSelectJoins(def, op.statement);
    }
  }
}

function* walkSelectJoins(
  owner: ViewEntityDefinition,
  select: {
    joins?: JoinClause[];
    setOperations?: { statement: SelectStatement }[];
  },
): Iterable<{ owner: ViewEntityDefinition; join: JoinClause }> {
  yield* walkJoinChain(owner, select.joins ?? []);
  for (const op of select.setOperations ?? []) {
    yield* walkSelectJoins(owner, op.statement);
  }
}

function* walkJoinChain(
  owner: ViewEntityDefinition,
  joins: JoinClause[],
): Iterable<{ owner: ViewEntityDefinition; join: JoinClause }> {
  for (const join of joins) {
    yield { owner, join };
    yield* walkJoinSource(owner, join.source);
  }
}

/** Descend into a grouped join source (`join (A join B on …) on …`). */
function* walkJoinSource(
  owner: ViewEntityDefinition,
  source: JoinSource,
): Iterable<{ owner: ViewEntityDefinition; join: JoinClause }> {
  if (source.kind !== 'joinGroup') return;
  yield* walkJoinSource(owner, source.source);
  yield* walkJoinChain(owner, source.joins);
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
