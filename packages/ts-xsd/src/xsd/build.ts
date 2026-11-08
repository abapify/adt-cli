/**
 * XSD Builder - Build XSD documents from typed Schema objects
 *
 * This builder produces valid XSD XML from Schema objects,
 * completing the roundtrip: XSD → Schema → XSD
 */

import type {
  Schema,
  Annotation,
  Documentation,
  Appinfo,
  Include,
  Import,
  Redefine,
  Override,
  TopLevelElement,
  LocalElement,
  TopLevelAttribute,
  LocalAttribute,
  TopLevelComplexType,
  LocalComplexType,
  TopLevelSimpleType,
  LocalSimpleType,
  SimpleTypeRestriction,
  List,
  Union,
  ComplexContent,
  SimpleContent,
  ComplexContentRestriction,
  ComplexContentExtension,
  SimpleContentRestriction,
  SimpleContentExtension,
  ExplicitGroup,
  All,
  NamedGroup,
  GroupRef,
  NamedAttributeGroup,
  AttributeGroupRef,
  Any,
  AnyAttribute,
  Unique,
  Key,
  Keyref,
  Selector,
  Field,
  Facet,
  Pattern,
  OpenContent,
  DefaultOpenContent,
  Assertion,
  Alternative,
  Notation,
} from './types';

export interface BuildOptions {
  /** XML namespace prefix for XSD elements (default: 'xs') */
  prefix?: string;
  /** Pretty print with indentation (default: true) */
  pretty?: boolean;
  /** Indentation string (default: '  ') */
  indent?: string;
}

/**
 * Build an XSD string from a typed Schema object
 */
export function buildXsd(schema: Schema, options: BuildOptions = {}): string {
  const prefix = options.prefix ?? 'xs';
  const pretty = options.pretty ?? true;
  const indentStr = options.indent ?? '  ';

  const ctx: BuildContext = {
    prefix,
    pretty,
    indent: indentStr,
    level: 0,
  };

  const lines: string[] = [];
  lines.push(
    '<?xml version="1.0" encoding="UTF-8"?>',
    buildSchema(schema, ctx),
  );

  return lines.join(pretty ? '\n' : '');
}

interface BuildContext {
  prefix: string;
  pretty: boolean;
  indent: string;
  level: number;
}

// =============================================================================
// Schema (root)
// =============================================================================

function buildSchema(schema: Schema, ctx: BuildContext): string {
  const attrs: string[] = [];

  // XML namespace declarations (only if present in schema)
  addXmlnsAttrs(attrs, schema.$xmlns);

  // Schema attributes
  addAttr(attrs, 'id', schema.id);
  addAttr(attrs, 'targetNamespace', schema.targetNamespace);
  addAttr(attrs, 'version', schema.version);
  addAttr(attrs, 'finalDefault', schema.finalDefault);
  addAttr(attrs, 'blockDefault', schema.blockDefault);
  addAttr(attrs, 'attributeFormDefault', schema.attributeFormDefault);
  addAttr(attrs, 'elementFormDefault', schema.elementFormDefault);
  addAttr(attrs, 'defaultAttributes', schema.defaultAttributes);
  addAttr(attrs, 'xpathDefaultNamespace', schema.xpathDefaultNamespace);
  addAttr(attrs, 'xml:lang', schema['xml:lang']);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  // Annotations first
  appendBuilt(children, schema.annotation, (ann) =>
    buildAnnotation(ann, childCtx),
  );

  // Imports/includes
  appendBuilt(children, schema.include, (inc) => buildInclude(inc, childCtx));
  appendBuilt(children, schema.import, (imp) => buildImport(imp, childCtx));
  appendBuilt(children, schema.redefine, (red) => buildRedefine(red, childCtx));
  appendBuilt(children, schema.override, (ovr) => buildOverride(ovr, childCtx));

  // Default open content
  appendBuiltOne(children, schema.defaultOpenContent, (doc) =>
    buildDefaultOpenContent(doc, childCtx),
  );

  // Top-level declarations
  appendBuilt(
    children,
    Array.isArray(schema.simpleType) ? schema.simpleType : [],
    (st) => buildTopLevelSimpleType(st, childCtx),
  );
  appendBuilt(
    children,
    Array.isArray(schema.complexType) ? schema.complexType : [],
    (ct) => buildTopLevelComplexType(ct, childCtx),
  );
  appendBuilt(children, schema.group, (grp) => buildNamedGroup(grp, childCtx));
  appendBuilt(children, schema.attributeGroup, (ag) =>
    buildNamedAttributeGroup(ag, childCtx),
  );
  appendBuilt(children, schema.element, (el) =>
    buildTopLevelElement(el, childCtx),
  );
  appendBuilt(children, schema.attribute, (attr) =>
    buildTopLevelAttribute(attr, childCtx),
  );
  appendBuilt(children, schema.notation, (not) => buildNotation(not, childCtx));

  return buildElement(`${ctx.prefix}:schema`, attrs, children, ctx);
}

// =============================================================================
// Annotation
// =============================================================================

function buildAnnotation(ann: Annotation, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', ann.id);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (ann.appinfo) {
    for (const ai of ann.appinfo) {
      children.push(buildAppinfo(ai, childCtx));
    }
  }
  if (ann.documentation) {
    for (const doc of ann.documentation) {
      children.push(buildDocumentation(doc, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:annotation`, attrs, children, ctx);
}

function buildDocumentation(doc: Documentation, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'source', doc.source);
  addAttr(attrs, 'xml:lang', doc['xml:lang']);

  if (doc._text) {
    return buildElementWithText(
      `${ctx.prefix}:documentation`,
      attrs,
      doc._text,
      ctx,
    );
  }
  return buildElement(`${ctx.prefix}:documentation`, attrs, [], ctx);
}

function buildAppinfo(ai: Appinfo, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'source', ai.source);

  if (ai._text) {
    return buildElementWithText(`${ctx.prefix}:appinfo`, attrs, ai._text, ctx);
  }
  return buildElement(`${ctx.prefix}:appinfo`, attrs, [], ctx);
}

// =============================================================================
// Include / Import / Redefine / Override
// =============================================================================

function buildInclude(inc: Include, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', inc.id);
  addAttr(attrs, 'schemaLocation', inc.schemaLocation);

  const children: string[] = [];
  if (inc.annotation) {
    children.push(
      buildAnnotation(inc.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:include`, attrs, children, ctx);
}

function buildImport(imp: Import, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', imp.id);
  addAttr(attrs, 'namespace', imp.namespace);
  addAttr(attrs, 'schemaLocation', imp.schemaLocation);

  const children: string[] = [];
  if (imp.annotation) {
    children.push(
      buildAnnotation(imp.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:import`, attrs, children, ctx);
}

function buildRedefine(red: Redefine, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', red.id);
  addAttr(attrs, 'schemaLocation', red.schemaLocation);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (red.annotation) {
    for (const ann of red.annotation) {
      children.push(buildAnnotation(ann, childCtx));
    }
  }
  if (red.simpleType) {
    for (const st of red.simpleType) {
      children.push(buildTopLevelSimpleType(st, childCtx));
    }
  }
  if (red.complexType) {
    for (const ct of red.complexType) {
      children.push(buildTopLevelComplexType(ct, childCtx));
    }
  }
  if (red.group) {
    for (const grp of red.group) {
      children.push(buildNamedGroup(grp, childCtx));
    }
  }
  if (red.attributeGroup) {
    for (const ag of red.attributeGroup) {
      children.push(buildNamedAttributeGroup(ag, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:redefine`, attrs, children, ctx);
}

function buildOverride(ovr: Override, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', ovr.id);
  addAttr(attrs, 'schemaLocation', ovr.schemaLocation);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  appendBuilt(children, ovr.annotation, (ann) =>
    buildAnnotation(ann, childCtx),
  );
  appendBuilt(children, ovr.simpleType, (st) =>
    buildTopLevelSimpleType(st, childCtx),
  );
  appendBuilt(children, ovr.complexType, (ct) =>
    buildTopLevelComplexType(ct, childCtx),
  );
  appendBuilt(children, ovr.group, (grp) => buildNamedGroup(grp, childCtx));
  appendBuilt(children, ovr.attributeGroup, (ag) =>
    buildNamedAttributeGroup(ag, childCtx),
  );
  appendBuilt(children, ovr.element, (el) =>
    buildTopLevelElement(el, childCtx),
  );
  appendBuilt(children, ovr.attribute, (attr) =>
    buildTopLevelAttribute(attr, childCtx),
  );
  appendBuilt(children, ovr.notation, (not) => buildNotation(not, childCtx));

  return buildElement(`${ctx.prefix}:override`, attrs, children, ctx);
}

// =============================================================================
// Element Declarations
// =============================================================================

function buildTopLevelElement(el: TopLevelElement, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', el.id);
  addAttr(attrs, 'name', el.name);
  addAttr(attrs, 'type', el.type);
  addAttr(attrs, 'substitutionGroup', el.substitutionGroup);
  addAttr(attrs, 'default', el.default);
  addAttr(attrs, 'fixed', el.fixed);
  addBoolAttr(attrs, 'nillable', el.nillable);
  addBoolAttr(attrs, 'abstract', el.abstract);
  addAttr(attrs, 'final', el.final);
  addAttr(attrs, 'block', el.block);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (el.annotation) {
    children.push(buildAnnotation(el.annotation, childCtx));
  }
  if (el.simpleType) {
    children.push(buildLocalSimpleType(el.simpleType, childCtx));
  }
  if (el.complexType) {
    children.push(buildLocalComplexType(el.complexType, childCtx));
  }
  if (el.alternative) {
    for (const alt of el.alternative) {
      children.push(buildAlternative(alt, childCtx));
    }
  }
  if (el.unique) {
    for (const u of el.unique) {
      children.push(buildUnique(u, childCtx));
    }
  }
  if (el.key) {
    for (const k of el.key) {
      children.push(buildKey(k, childCtx));
    }
  }
  if (el.keyref) {
    for (const kr of el.keyref) {
      children.push(buildKeyref(kr, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:element`, attrs, children, ctx);
}

function buildLocalElement(el: LocalElement, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', el.id);
  addAttr(attrs, 'name', el.name);
  addAttr(attrs, 'ref', el.ref);
  addAttr(attrs, 'type', el.type);
  addOccursAttr(attrs, 'minOccurs', el.minOccurs);
  addOccursAttr(attrs, 'maxOccurs', el.maxOccurs);
  addAttr(attrs, 'default', el.default);
  addAttr(attrs, 'fixed', el.fixed);
  addBoolAttr(attrs, 'nillable', el.nillable);
  addAttr(attrs, 'block', el.block);
  addAttr(attrs, 'form', el.form);
  addAttr(attrs, 'targetNamespace', el.targetNamespace);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (el.annotation) {
    children.push(buildAnnotation(el.annotation, childCtx));
  }
  if (el.simpleType) {
    children.push(buildLocalSimpleType(el.simpleType, childCtx));
  }
  if (el.complexType) {
    children.push(buildLocalComplexType(el.complexType, childCtx));
  }
  if (el.alternative) {
    for (const alt of el.alternative) {
      children.push(buildAlternative(alt, childCtx));
    }
  }
  if (el.unique) {
    for (const u of el.unique) {
      children.push(buildUnique(u, childCtx));
    }
  }
  if (el.key) {
    for (const k of el.key) {
      children.push(buildKey(k, childCtx));
    }
  }
  if (el.keyref) {
    for (const kr of el.keyref) {
      children.push(buildKeyref(kr, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:element`, attrs, children, ctx);
}

// =============================================================================
// Attribute Declarations
// =============================================================================

function buildTopLevelAttribute(
  attr: TopLevelAttribute,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', attr.id);
  addAttr(attrs, 'name', attr.name);
  addAttr(attrs, 'type', attr.type);
  addAttr(attrs, 'default', attr.default);
  addAttr(attrs, 'fixed', attr.fixed);
  addBoolAttr(attrs, 'inheritable', attr.inheritable);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (attr.annotation) {
    children.push(buildAnnotation(attr.annotation, childCtx));
  }
  if (attr.simpleType) {
    children.push(buildLocalSimpleType(attr.simpleType, childCtx));
  }

  return buildElement(`${ctx.prefix}:attribute`, attrs, children, ctx);
}

function buildLocalAttribute(attr: LocalAttribute, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', attr.id);
  addAttr(attrs, 'name', attr.name);
  addAttr(attrs, 'ref', attr.ref);
  addAttr(attrs, 'type', attr.type);
  addAttr(attrs, 'use', attr.use);
  addAttr(attrs, 'default', attr.default);
  addAttr(attrs, 'fixed', attr.fixed);
  addAttr(attrs, 'form', attr.form);
  addAttr(attrs, 'targetNamespace', attr.targetNamespace);
  addBoolAttr(attrs, 'inheritable', attr.inheritable);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (attr.annotation) {
    children.push(buildAnnotation(attr.annotation, childCtx));
  }
  if (attr.simpleType) {
    children.push(buildLocalSimpleType(attr.simpleType, childCtx));
  }

  return buildElement(`${ctx.prefix}:attribute`, attrs, children, ctx);
}

// =============================================================================
// Complex Types
// =============================================================================

function buildTopLevelComplexType(
  ct: TopLevelComplexType,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', ct.id);
  addAttr(attrs, 'name', ct.name);
  addBoolAttr(attrs, 'mixed', ct.mixed);
  addBoolAttr(attrs, 'abstract', ct.abstract);
  addAttr(attrs, 'final', ct.final);
  addAttr(attrs, 'block', ct.block);
  addBoolAttr(attrs, 'defaultAttributesApply', ct.defaultAttributesApply);

  return buildComplexTypeContent(ct, attrs, ctx);
}

function buildLocalComplexType(
  ct: LocalComplexType,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', ct.id);
  addBoolAttr(attrs, 'mixed', ct.mixed);

  return buildComplexTypeContent(ct, attrs, ctx);
}

function buildComplexTypeContent(
  ct: TopLevelComplexType | LocalComplexType,
  attrs: string[],
  ctx: BuildContext,
): string {
  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  appendBuiltOne(children, ct.annotation, (ann) =>
    buildAnnotation(ann, childCtx),
  );

  // Content model (choice)
  if (ct.simpleContent) {
    children.push(buildSimpleContent(ct.simpleContent, childCtx));
  } else if (ct.complexContent) {
    children.push(buildComplexContent(ct.complexContent, childCtx));
  } else {
    // Short form
    buildComplexTypeShortForm(ct, children, childCtx);
  }

  return buildElement(`${ctx.prefix}:complexType`, attrs, children, ctx);
}

/** Short form: content model and attributes directly on the complexType. */
function buildComplexTypeShortForm(
  ct: TopLevelComplexType | LocalComplexType,
  children: string[],
  childCtx: BuildContext,
): void {
  appendBuiltOne(children, ct.openContent, (oc) =>
    buildOpenContent(oc, childCtx),
  );
  appendBuiltOne(children, ct.group, (grp) => buildGroupRef(grp, childCtx));
  appendBuiltOne(children, ct.all, (all) => buildAll(all, childCtx));
  appendBuiltOne(children, ct.choice, (c) =>
    buildExplicitGroup(c, 'choice', childCtx),
  );
  appendBuiltOne(children, ct.sequence, (s) =>
    buildExplicitGroup(s, 'sequence', childCtx),
  );
  appendBuilt(children, ct.attribute, (attr) =>
    buildLocalAttribute(attr, childCtx),
  );
  appendBuilt(children, ct.attributeGroup, (ag) =>
    buildAttributeGroupRef(ag, childCtx),
  );
  appendBuiltOne(children, ct.anyAttribute, (aa) =>
    buildAnyAttribute(aa, childCtx),
  );
  appendBuilt(children, ct.assert, (a) => buildAssertion(a, childCtx));
}

// =============================================================================
// Simple Types
// =============================================================================

function buildTopLevelSimpleType(
  st: TopLevelSimpleType,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', st.id);
  addAttr(attrs, 'name', st.name);
  addAttr(attrs, 'final', st.final);

  return buildSimpleTypeContent(st, attrs, ctx);
}

function buildLocalSimpleType(st: LocalSimpleType, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', st.id);

  return buildSimpleTypeContent(st, attrs, ctx);
}

function buildSimpleTypeContent(
  st: TopLevelSimpleType | LocalSimpleType,
  attrs: string[],
  ctx: BuildContext,
): string {
  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (st.annotation) {
    children.push(buildAnnotation(st.annotation, childCtx));
  }

  if (st.restriction) {
    children.push(buildSimpleTypeRestriction(st.restriction, childCtx));
  } else if (st.list) {
    children.push(buildList(st.list, childCtx));
  } else if (st.union) {
    children.push(buildUnion(st.union, childCtx));
  }

  return buildElement(`${ctx.prefix}:simpleType`, attrs, children, ctx);
}

function buildSimpleTypeRestriction(
  r: SimpleTypeRestriction,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', r.id);
  addAttr(attrs, 'base', r.base);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (r.annotation) {
    children.push(buildAnnotation(r.annotation, childCtx));
  }
  if (r.simpleType) {
    children.push(buildLocalSimpleType(r.simpleType, childCtx));
  }

  // Facets
  buildFacets(r, children, childCtx);

  return buildElement(`${ctx.prefix}:restriction`, attrs, children, ctx);
}

function buildFacets(
  r: SimpleTypeRestriction | SimpleContentRestriction,
  children: string[],
  ctx: BuildContext,
): void {
  appendBuilt(children, r.minExclusive, (f) =>
    buildFacet(f, 'minExclusive', ctx),
  );
  appendBuilt(children, r.minInclusive, (f) =>
    buildFacet(f, 'minInclusive', ctx),
  );
  appendBuilt(children, r.maxExclusive, (f) =>
    buildFacet(f, 'maxExclusive', ctx),
  );
  appendBuilt(children, r.maxInclusive, (f) =>
    buildFacet(f, 'maxInclusive', ctx),
  );
  appendBuilt(children, r.totalDigits, (f) =>
    buildFacet(f, 'totalDigits', ctx),
  );
  appendBuilt(children, r.fractionDigits, (f) =>
    buildFacet(f, 'fractionDigits', ctx),
  );
  appendBuilt(children, r.length, (f) => buildFacet(f, 'length', ctx));
  appendBuilt(children, r.minLength, (f) => buildFacet(f, 'minLength', ctx));
  appendBuilt(children, r.maxLength, (f) => buildFacet(f, 'maxLength', ctx));
  appendBuilt(children, r.enumeration, (f) =>
    buildFacet(f, 'enumeration', ctx),
  );
  appendBuilt(children, r.whiteSpace, (f) => buildFacet(f, 'whiteSpace', ctx));
  appendBuilt(children, r.pattern, (p) => buildPattern(p, ctx));
  appendBuilt(children, r.assertion, (a) => buildAssertion(a, ctx));
  appendBuilt(children, r.explicitTimezone, (f) =>
    buildFacet(f, 'explicitTimezone', ctx),
  );
}

function buildFacet(f: Facet, name: string, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', f.id);
  addAttr(attrs, 'value', f.value);
  addBoolAttr(attrs, 'fixed', f.fixed);

  const children: string[] = [];
  if (f.annotation) {
    children.push(
      buildAnnotation(f.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:${name}`, attrs, children, ctx);
}

function buildPattern(p: Pattern, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', p.id);
  addAttr(attrs, 'value', p.value);

  const children: string[] = [];
  if (p.annotation) {
    children.push(
      buildAnnotation(p.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:pattern`, attrs, children, ctx);
}

function buildList(l: List, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', l.id);
  addAttr(attrs, 'itemType', l.itemType);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (l.annotation) {
    children.push(buildAnnotation(l.annotation, childCtx));
  }
  if (l.simpleType) {
    children.push(buildLocalSimpleType(l.simpleType, childCtx));
  }

  return buildElement(`${ctx.prefix}:list`, attrs, children, ctx);
}

function buildUnion(u: Union, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', u.id);
  addAttr(attrs, 'memberTypes', u.memberTypes);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (u.annotation) {
    children.push(buildAnnotation(u.annotation, childCtx));
  }
  if (u.simpleType) {
    for (const st of u.simpleType) {
      children.push(buildLocalSimpleType(st, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:union`, attrs, children, ctx);
}

// =============================================================================
// Complex Content / Simple Content
// =============================================================================

function buildComplexContent(cc: ComplexContent, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', cc.id);
  addBoolAttr(attrs, 'mixed', cc.mixed);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (cc.annotation) {
    children.push(buildAnnotation(cc.annotation, childCtx));
  }
  if (cc.restriction) {
    children.push(buildComplexContentRestriction(cc.restriction, childCtx));
  } else if (cc.extension) {
    children.push(buildComplexContentExtension(cc.extension, childCtx));
  }

  return buildElement(`${ctx.prefix}:complexContent`, attrs, children, ctx);
}

function buildSimpleContent(sc: SimpleContent, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', sc.id);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (sc.annotation) {
    children.push(buildAnnotation(sc.annotation, childCtx));
  }
  if (sc.restriction) {
    children.push(buildSimpleContentRestriction(sc.restriction, childCtx));
  } else if (sc.extension) {
    children.push(buildSimpleContentExtension(sc.extension, childCtx));
  }

  return buildElement(`${ctx.prefix}:simpleContent`, attrs, children, ctx);
}

function buildComplexContentRestriction(
  r: ComplexContentRestriction,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', r.id);
  addAttr(attrs, 'base', r.base);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  appendBuiltOne(children, r.annotation, (ann) =>
    buildAnnotation(ann, childCtx),
  );
  appendBuiltOne(children, r.openContent, (oc) =>
    buildOpenContent(oc, childCtx),
  );
  appendBuiltOne(children, r.group, (grp) => buildGroupRef(grp, childCtx));
  appendBuiltOne(children, r.all, (all) => buildAll(all, childCtx));
  appendBuiltOne(children, r.choice, (c) =>
    buildExplicitGroup(c, 'choice', childCtx),
  );
  appendBuiltOne(children, r.sequence, (s) =>
    buildExplicitGroup(s, 'sequence', childCtx),
  );
  appendBuilt(children, r.attribute, (attr) =>
    buildLocalAttribute(attr, childCtx),
  );
  appendBuilt(children, r.attributeGroup, (ag) =>
    buildAttributeGroupRef(ag, childCtx),
  );
  appendBuiltOne(children, r.anyAttribute, (aa) =>
    buildAnyAttribute(aa, childCtx),
  );
  appendBuilt(children, r.assert, (a) => buildAssertion(a, childCtx));

  return buildElement(`${ctx.prefix}:restriction`, attrs, children, ctx);
}

function buildComplexContentExtension(
  e: ComplexContentExtension,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', e.id);
  addAttr(attrs, 'base', e.base);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  appendBuiltOne(children, e.annotation, (ann) =>
    buildAnnotation(ann, childCtx),
  );
  appendBuiltOne(children, e.openContent, (oc) =>
    buildOpenContent(oc, childCtx),
  );
  appendBuiltOne(children, e.group, (grp) => buildGroupRef(grp, childCtx));
  appendBuiltOne(children, e.all, (all) => buildAll(all, childCtx));
  appendBuiltOne(children, e.choice, (c) =>
    buildExplicitGroup(c, 'choice', childCtx),
  );
  appendBuiltOne(children, e.sequence, (s) =>
    buildExplicitGroup(s, 'sequence', childCtx),
  );
  appendBuilt(children, e.attribute, (attr) =>
    buildLocalAttribute(attr, childCtx),
  );
  appendBuilt(children, e.attributeGroup, (ag) =>
    buildAttributeGroupRef(ag, childCtx),
  );
  appendBuiltOne(children, e.anyAttribute, (aa) =>
    buildAnyAttribute(aa, childCtx),
  );
  appendBuilt(children, e.assert, (a) => buildAssertion(a, childCtx));

  return buildElement(`${ctx.prefix}:extension`, attrs, children, ctx);
}

function buildSimpleContentRestriction(
  r: SimpleContentRestriction,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', r.id);
  addAttr(attrs, 'base', r.base);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (r.annotation) {
    children.push(buildAnnotation(r.annotation, childCtx));
  }
  if (r.simpleType) {
    children.push(buildLocalSimpleType(r.simpleType, childCtx));
  }

  // Facets
  buildFacets(r, children, childCtx);

  // Attributes
  if (r.attribute) {
    for (const attr of r.attribute) {
      children.push(buildLocalAttribute(attr, childCtx));
    }
  }
  if (r.attributeGroup) {
    for (const ag of r.attributeGroup) {
      children.push(buildAttributeGroupRef(ag, childCtx));
    }
  }
  if (r.anyAttribute) {
    children.push(buildAnyAttribute(r.anyAttribute, childCtx));
  }
  if (r.assert) {
    for (const a of r.assert) {
      children.push(buildAssertion(a, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:restriction`, attrs, children, ctx);
}

function buildSimpleContentExtension(
  e: SimpleContentExtension,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', e.id);
  addAttr(attrs, 'base', e.base);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (e.annotation) {
    children.push(buildAnnotation(e.annotation, childCtx));
  }
  if (e.attribute) {
    for (const attr of e.attribute) {
      children.push(buildLocalAttribute(attr, childCtx));
    }
  }
  if (e.attributeGroup) {
    for (const ag of e.attributeGroup) {
      children.push(buildAttributeGroupRef(ag, childCtx));
    }
  }
  if (e.anyAttribute) {
    children.push(buildAnyAttribute(e.anyAttribute, childCtx));
  }
  if (e.assert) {
    for (const a of e.assert) {
      children.push(buildAssertion(a, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:extension`, attrs, children, ctx);
}

// =============================================================================
// Model Groups (sequence, choice, all)
// =============================================================================

function buildExplicitGroup(
  g: ExplicitGroup,
  name: 'sequence' | 'choice',
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', g.id);
  addOccursAttr(attrs, 'minOccurs', g.minOccurs);
  addOccursAttr(attrs, 'maxOccurs', g.maxOccurs);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  appendBuiltOne(children, g.annotation, (ann) =>
    buildAnnotation(ann, childCtx),
  );
  appendBuilt(children, g.element, (el) => buildLocalElement(el, childCtx));
  appendBuilt(children, g.group, (grp) => buildGroupRef(grp, childCtx));
  appendBuilt(children, g.choice, (c) =>
    buildExplicitGroup(c, 'choice', childCtx),
  );
  appendBuilt(children, g.sequence, (s) =>
    buildExplicitGroup(s, 'sequence', childCtx),
  );
  appendBuilt(children, g.any, (a) => buildAny(a, childCtx));

  return buildElement(`${ctx.prefix}:${name}`, attrs, children, ctx);
}

function buildAll(a: All, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', a.id);
  addOccursAttr(attrs, 'minOccurs', a.minOccurs);
  addOccursAttr(attrs, 'maxOccurs', a.maxOccurs);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (a.annotation) {
    children.push(buildAnnotation(a.annotation, childCtx));
  }
  if (a.element) {
    for (const el of a.element) {
      children.push(buildLocalElement(el, childCtx));
    }
  }
  if (a.any) {
    for (const any of a.any) {
      children.push(buildAny(any, childCtx));
    }
  }
  if (a.group) {
    for (const grp of a.group) {
      children.push(buildGroupRef(grp, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:all`, attrs, children, ctx);
}

// =============================================================================
// Groups and Attribute Groups
// =============================================================================

function buildNamedGroup(g: NamedGroup, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', g.id);
  addAttr(attrs, 'name', g.name);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (g.annotation) {
    children.push(buildAnnotation(g.annotation, childCtx));
  }
  if (g.all) {
    children.push(buildAll(g.all, childCtx));
  }
  if (g.choice) {
    children.push(buildExplicitGroup(g.choice, 'choice', childCtx));
  }
  if (g.sequence) {
    children.push(buildExplicitGroup(g.sequence, 'sequence', childCtx));
  }

  return buildElement(`${ctx.prefix}:group`, attrs, children, ctx);
}

function buildGroupRef(g: GroupRef, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', g.id);
  addAttr(attrs, 'ref', g.ref);
  addOccursAttr(attrs, 'minOccurs', g.minOccurs);
  addOccursAttr(attrs, 'maxOccurs', g.maxOccurs);

  const children: string[] = [];
  if (g.annotation) {
    children.push(
      buildAnnotation(g.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:group`, attrs, children, ctx);
}

function buildNamedAttributeGroup(
  ag: NamedAttributeGroup,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', ag.id);
  addAttr(attrs, 'name', ag.name);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (ag.annotation) {
    children.push(buildAnnotation(ag.annotation, childCtx));
  }
  if (ag.attribute) {
    for (const attr of ag.attribute) {
      children.push(buildLocalAttribute(attr, childCtx));
    }
  }
  if (ag.attributeGroup) {
    for (const agr of ag.attributeGroup) {
      children.push(buildAttributeGroupRef(agr, childCtx));
    }
  }
  if (ag.anyAttribute) {
    children.push(buildAnyAttribute(ag.anyAttribute, childCtx));
  }

  return buildElement(`${ctx.prefix}:attributeGroup`, attrs, children, ctx);
}

function buildAttributeGroupRef(
  ag: AttributeGroupRef,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', ag.id);
  addAttr(attrs, 'ref', ag.ref);

  const children: string[] = [];
  if (ag.annotation) {
    children.push(
      buildAnnotation(ag.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:attributeGroup`, attrs, children, ctx);
}

// =============================================================================
// Wildcards
// =============================================================================

function buildAny(a: Any, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', a.id);
  addOccursAttr(attrs, 'minOccurs', a.minOccurs);
  addOccursAttr(attrs, 'maxOccurs', a.maxOccurs);
  addAttr(attrs, 'namespace', a.namespace);
  addAttr(attrs, 'processContents', a.processContents);
  addAttr(attrs, 'notNamespace', a.notNamespace);
  addAttr(attrs, 'notQName', a.notQName);

  const children: string[] = [];
  if (a.annotation) {
    children.push(
      buildAnnotation(a.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:any`, attrs, children, ctx);
}

function buildAnyAttribute(aa: AnyAttribute, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', aa.id);
  addAttr(attrs, 'namespace', aa.namespace);
  addAttr(attrs, 'processContents', aa.processContents);
  addAttr(attrs, 'notNamespace', aa.notNamespace);
  addAttr(attrs, 'notQName', aa.notQName);

  const children: string[] = [];
  if (aa.annotation) {
    children.push(
      buildAnnotation(aa.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:anyAttribute`, attrs, children, ctx);
}

// =============================================================================
// Identity Constraints
// =============================================================================

function buildUnique(u: Unique, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', u.id);
  addAttr(attrs, 'name', u.name);
  addAttr(attrs, 'ref', u.ref);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (u.annotation) {
    children.push(buildAnnotation(u.annotation, childCtx));
  }
  if (u.selector) {
    children.push(buildSelector(u.selector, childCtx));
  }
  if (u.field) {
    for (const f of u.field) {
      children.push(buildField(f, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:unique`, attrs, children, ctx);
}

function buildKey(k: Key, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', k.id);
  addAttr(attrs, 'name', k.name);
  addAttr(attrs, 'ref', k.ref);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (k.annotation) {
    children.push(buildAnnotation(k.annotation, childCtx));
  }
  if (k.selector) {
    children.push(buildSelector(k.selector, childCtx));
  }
  if (k.field) {
    for (const f of k.field) {
      children.push(buildField(f, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:key`, attrs, children, ctx);
}

function buildKeyref(kr: Keyref, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', kr.id);
  addAttr(attrs, 'name', kr.name);
  addAttr(attrs, 'ref', kr.ref);
  addAttr(attrs, 'refer', kr.refer);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (kr.annotation) {
    children.push(buildAnnotation(kr.annotation, childCtx));
  }
  if (kr.selector) {
    children.push(buildSelector(kr.selector, childCtx));
  }
  if (kr.field) {
    for (const f of kr.field) {
      children.push(buildField(f, childCtx));
    }
  }

  return buildElement(`${ctx.prefix}:keyref`, attrs, children, ctx);
}

function buildSelector(s: Selector, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', s.id);
  addAttr(attrs, 'xpath', s.xpath);
  addAttr(attrs, 'xpathDefaultNamespace', s.xpathDefaultNamespace);

  const children: string[] = [];
  if (s.annotation) {
    children.push(
      buildAnnotation(s.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:selector`, attrs, children, ctx);
}

function buildField(f: Field, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', f.id);
  addAttr(attrs, 'xpath', f.xpath);
  addAttr(attrs, 'xpathDefaultNamespace', f.xpathDefaultNamespace);

  const children: string[] = [];
  if (f.annotation) {
    children.push(
      buildAnnotation(f.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:field`, attrs, children, ctx);
}

// =============================================================================
// XSD 1.1 Features
// =============================================================================

function buildOpenContent(oc: OpenContent, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', oc.id);
  addAttr(attrs, 'mode', oc.mode);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (oc.annotation) {
    children.push(buildAnnotation(oc.annotation, childCtx));
  }
  if (oc.any) {
    children.push(buildAny(oc.any, childCtx));
  }

  return buildElement(`${ctx.prefix}:openContent`, attrs, children, ctx);
}

function buildDefaultOpenContent(
  doc: DefaultOpenContent,
  ctx: BuildContext,
): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', doc.id);
  addBoolAttr(attrs, 'appliesToEmpty', doc.appliesToEmpty);
  addAttr(attrs, 'mode', doc.mode);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (doc.annotation) {
    children.push(buildAnnotation(doc.annotation, childCtx));
  }
  children.push(buildAny(doc.any, childCtx));

  return buildElement(`${ctx.prefix}:defaultOpenContent`, attrs, children, ctx);
}

function buildAssertion(a: Assertion, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', a.id);
  addAttr(attrs, 'test', a.test);
  addAttr(attrs, 'xpathDefaultNamespace', a.xpathDefaultNamespace);

  const children: string[] = [];
  if (a.annotation) {
    children.push(
      buildAnnotation(a.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:assert`, attrs, children, ctx);
}

function buildAlternative(alt: Alternative, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', alt.id);
  addAttr(attrs, 'test', alt.test);
  addAttr(attrs, 'type', alt.type);
  addAttr(attrs, 'xpathDefaultNamespace', alt.xpathDefaultNamespace);

  const children: string[] = [];
  const childCtx = { ...ctx, level: ctx.level + 1 };

  if (alt.annotation) {
    children.push(buildAnnotation(alt.annotation, childCtx));
  }
  if (alt.simpleType) {
    children.push(buildLocalSimpleType(alt.simpleType, childCtx));
  }
  if (alt.complexType) {
    children.push(buildLocalComplexType(alt.complexType, childCtx));
  }

  return buildElement(`${ctx.prefix}:alternative`, attrs, children, ctx);
}

function buildNotation(n: Notation, ctx: BuildContext): string {
  const attrs: string[] = [];
  addAttr(attrs, 'id', n.id);
  addAttr(attrs, 'name', n.name);
  addAttr(attrs, 'public', n.public);
  addAttr(attrs, 'system', n.system);

  const children: string[] = [];
  if (n.annotation) {
    children.push(
      buildAnnotation(n.annotation, { ...ctx, level: ctx.level + 1 }),
    );
  }

  return buildElement(`${ctx.prefix}:notation`, attrs, children, ctx);
}

// =============================================================================
// Utility Functions
// =============================================================================

/** Add xmlns:* namespace declaration attributes. */
function addXmlnsAttrs(
  attrs: string[],
  xmlns: Record<string, string> | undefined,
): void {
  if (!xmlns) return;

  for (const [prefix, uri] of Object.entries(xmlns)) {
    if (prefix === '') {
      attrs.push(`xmlns="${uri}"`);
    } else {
      attrs.push(`xmlns:${prefix}="${uri}"`);
    }
  }
}

/** Append one built child element per item, skipped when `items` is absent. */
function appendBuilt<T>(
  children: string[],
  items: readonly T[] | undefined,
  build: (item: T) => string,
): void {
  if (items) {
    for (const item of items) {
      children.push(build(item));
    }
  }
}

/** Append a single built child element when `item` is present. */
function appendBuiltOne<T>(
  children: string[],
  item: T | undefined,
  build: (item: T) => string,
): void {
  if (item) {
    children.push(build(item));
  }
}

function addAttr(
  attrs: string[],
  name: string,
  value: string | undefined,
): void {
  if (value !== undefined) {
    attrs.push(`${name}="${escapeXml(value)}"`);
  }
}

function addPlainAttr(
  attrs: string[],
  name: string,
  value: boolean | number | string | undefined,
): void {
  if (value !== undefined) {
    attrs.push(`${name}="${value}"`);
  }
}

function addBoolAttr(
  attrs: string[],
  name: string,
  value: boolean | undefined,
): void {
  addPlainAttr(attrs, name, value);
}

function addOccursAttr(
  attrs: string[],
  name: string,
  value: number | string | undefined,
): void {
  addPlainAttr(attrs, name, value);
}

function escapeXml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function buildElement(
  tag: string,
  attrs: string[],
  children: string[],
  ctx: BuildContext,
): string {
  const indent = ctx.pretty ? ctx.indent.repeat(ctx.level) : '';
  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  if (children.length === 0) {
    return `${indent}<${tag}${attrStr}/>`;
  }

  const nl = ctx.pretty ? '\n' : '';
  const childContent = children.join(nl);
  return `${indent}<${tag}${attrStr}>${nl}${childContent}${nl}${indent}</${tag}>`;
}

function buildElementWithText(
  tag: string,
  attrs: string[],
  text: string,
  ctx: BuildContext,
): string {
  const indent = ctx.pretty ? ctx.indent.repeat(ctx.level) : '';
  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';
  return `${indent}<${tag}${attrStr}>${escapeXml(text)}</${tag}>`;
}

export default buildXsd;
