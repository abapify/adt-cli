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
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push(buildSchema(schema, ctx));

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
  if (schema.$xmlns) {
    for (const [prefix, uri] of Object.entries(schema.$xmlns)) {
      if (prefix === '') {
        attrs.push(`xmlns="${uri}"`);
      } else {
        attrs.push(`xmlns:${prefix}="${uri}"`);
      }
    }
  }

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
  if (schema.annotation) {
    for (const ann of schema.annotation) {
      children.push(buildAnnotation(ann, childCtx));
    }
  }

  // Imports/includes
  if (schema.include) {
    for (const inc of schema.include) {
      children.push(buildInclude(inc, childCtx));
    }
  }
  if (schema.import) {
    for (const imp of schema.import) {
      children.push(buildImport(imp, childCtx));
    }
  }
  if (schema.redefine) {
    for (const red of schema.redefine) {
      children.push(buildRedefine(red, childCtx));
    }
  }
  if (schema.override) {
    for (const ovr of schema.override) {
      children.push(buildOverride(ovr, childCtx));
    }
  }

  // Default open content
  if (schema.defaultOpenContent) {
    children.push(buildDefaultOpenContent(schema.defaultOpenContent, childCtx));
  }

  // Top-level declarations
  if (schema.simpleType && Array.isArray(schema.simpleType)) {
    for (const st of schema.simpleType) {
      children.push(buildTopLevelSimpleType(st, childCtx));
    }
  }
  if (schema.complexType && Array.isArray(schema.complexType)) {
    for (const ct of schema.complexType) {
      children.push(buildTopLevelComplexType(ct, childCtx));
    }
  }
  if (schema.group) {
    for (const grp of schema.group) {
      children.push(buildNamedGroup(grp, childCtx));
    }
  }
  if (schema.attributeGroup) {
    for (const ag of schema.attributeGroup) {
      children.push(buildNamedAttributeGroup(ag, childCtx));
    }
  }
  if (schema.element) {
    for (const el of schema.element) {
      children.push(buildTopLevelElement(el, childCtx));
    }
  }
  if (schema.attribute) {
    for (const attr of schema.attribute) {
      children.push(buildTopLevelAttribute(attr, childCtx));
    }
  }
  if (schema.notation) {
    for (const not of schema.notation) {
      children.push(buildNotation(not, childCtx));
    }
  }

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

  if (ovr.annotation) {
    for (const ann of ovr.annotation) {
      children.push(buildAnnotation(ann, childCtx));
    }
  }
  if (ovr.simpleType) {
    for (const st of ovr.simpleType) {
      children.push(buildTopLevelSimpleType(st, childCtx));
    }
  }
  if (ovr.complexType) {
    for (const ct of ovr.complexType) {
      children.push(buildTopLevelComplexType(ct, childCtx));
    }
  }
  if (ovr.group) {
    for (const grp of ovr.group) {
      children.push(buildNamedGroup(grp, childCtx));
    }
  }
  if (ovr.attributeGroup) {
    for (const ag of ovr.attributeGroup) {
      children.push(buildNamedAttributeGroup(ag, childCtx));
    }
  }
  if (ovr.element) {
    for (const el of ovr.element) {
      children.push(buildTopLevelElement(el, childCtx));
    }
  }
  if (ovr.attribute) {
    for (const attr of ovr.attribute) {
      children.push(buildTopLevelAttribute(attr, childCtx));
    }
  }
  if (ovr.notation) {
    for (const not of ovr.notation) {
      children.push(buildNotation(not, childCtx));
    }
  }

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

  if (ct.annotation) {
    children.push(buildAnnotation(ct.annotation, childCtx));
  }

  // Content model (choice)
  if (ct.simpleContent) {
    children.push(buildSimpleContent(ct.simpleContent, childCtx));
  } else if (ct.complexContent) {
    children.push(buildComplexContent(ct.complexContent, childCtx));
  } else {
    // Short form
    if (ct.openContent) {
      children.push(buildOpenContent(ct.openContent, childCtx));
    }
    if (ct.group) {
      children.push(buildGroupRef(ct.group, childCtx));
    }
    if (ct.all) {
      children.push(buildAll(ct.all, childCtx));
    }
    if (ct.choice) {
      children.push(buildExplicitGroup(ct.choice, 'choice', childCtx));
    }
    if (ct.sequence) {
      children.push(buildExplicitGroup(ct.sequence, 'sequence', childCtx));
    }
    if (ct.attribute) {
      for (const attr of ct.attribute) {
        children.push(buildLocalAttribute(attr, childCtx));
      }
    }
    if (ct.attributeGroup) {
      for (const ag of ct.attributeGroup) {
        children.push(buildAttributeGroupRef(ag, childCtx));
      }
    }
    if (ct.anyAttribute) {
      children.push(buildAnyAttribute(ct.anyAttribute, childCtx));
    }
    if (ct.assert) {
      for (const a of ct.assert) {
        children.push(buildAssertion(a, childCtx));
      }
    }
  }

  return buildElement(`${ctx.prefix}:complexType`, attrs, children, ctx);
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
  if (r.minExclusive) {
    for (const f of r.minExclusive) {
      children.push(buildFacet(f, 'minExclusive', ctx));
    }
  }
  if (r.minInclusive) {
    for (const f of r.minInclusive) {
      children.push(buildFacet(f, 'minInclusive', ctx));
    }
  }
  if (r.maxExclusive) {
    for (const f of r.maxExclusive) {
      children.push(buildFacet(f, 'maxExclusive', ctx));
    }
  }
  if (r.maxInclusive) {
    for (const f of r.maxInclusive) {
      children.push(buildFacet(f, 'maxInclusive', ctx));
    }
  }
  if (r.totalDigits) {
    for (const f of r.totalDigits) {
      children.push(buildFacet(f, 'totalDigits', ctx));
    }
  }
  if (r.fractionDigits) {
    for (const f of r.fractionDigits) {
      children.push(buildFacet(f, 'fractionDigits', ctx));
    }
  }
  if (r.length) {
    for (const f of r.length) {
      children.push(buildFacet(f, 'length', ctx));
    }
  }
  if (r.minLength) {
    for (const f of r.minLength) {
      children.push(buildFacet(f, 'minLength', ctx));
    }
  }
  if (r.maxLength) {
    for (const f of r.maxLength) {
      children.push(buildFacet(f, 'maxLength', ctx));
    }
  }
  if (r.enumeration) {
    for (const f of r.enumeration) {
      children.push(buildFacet(f, 'enumeration', ctx));
    }
  }
  if (r.whiteSpace) {
    for (const f of r.whiteSpace) {
      children.push(buildFacet(f, 'whiteSpace', ctx));
    }
  }
  if (r.pattern) {
    for (const p of r.pattern) {
      children.push(buildPattern(p, ctx));
    }
  }
  if (r.assertion) {
    for (const a of r.assertion) {
      children.push(buildAssertion(a, ctx));
    }
  }
  if (r.explicitTimezone) {
    for (const f of r.explicitTimezone) {
      children.push(buildFacet(f, 'explicitTimezone', ctx));
    }
  }
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

  if (r.annotation) {
    children.push(buildAnnotation(r.annotation, childCtx));
  }
  if (r.openContent) {
    children.push(buildOpenContent(r.openContent, childCtx));
  }
  if (r.group) {
    children.push(buildGroupRef(r.group, childCtx));
  }
  if (r.all) {
    children.push(buildAll(r.all, childCtx));
  }
  if (r.choice) {
    children.push(buildExplicitGroup(r.choice, 'choice', childCtx));
  }
  if (r.sequence) {
    children.push(buildExplicitGroup(r.sequence, 'sequence', childCtx));
  }
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

function buildComplexContentExtension(
  e: ComplexContentExtension,
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
  if (e.openContent) {
    children.push(buildOpenContent(e.openContent, childCtx));
  }
  if (e.group) {
    children.push(buildGroupRef(e.group, childCtx));
  }
  if (e.all) {
    children.push(buildAll(e.all, childCtx));
  }
  if (e.choice) {
    children.push(buildExplicitGroup(e.choice, 'choice', childCtx));
  }
  if (e.sequence) {
    children.push(buildExplicitGroup(e.sequence, 'sequence', childCtx));
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

  if (g.annotation) {
    children.push(buildAnnotation(g.annotation, childCtx));
  }
  if (g.element) {
    for (const el of g.element) {
      children.push(buildLocalElement(el, childCtx));
    }
  }
  if (g.group) {
    for (const grp of g.group) {
      children.push(buildGroupRef(grp, childCtx));
    }
  }
  if (g.choice) {
    for (const c of g.choice) {
      children.push(buildExplicitGroup(c, 'choice', childCtx));
    }
  }
  if (g.sequence) {
    for (const s of g.sequence) {
      children.push(buildExplicitGroup(s, 'sequence', childCtx));
    }
  }
  if (g.any) {
    for (const a of g.any) {
      children.push(buildAny(a, childCtx));
    }
  }

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

function addAttr(
  attrs: string[],
  name: string,
  value: string | undefined,
): void {
  if (value !== undefined) {
    attrs.push(`${name}="${escapeXml(value)}"`);
  }
}

function addBoolAttr(
  attrs: string[],
  name: string,
  value: boolean | undefined,
): void {
  if (value !== undefined) {
    attrs.push(`${name}="${value}"`);
  }
}

function addOccursAttr(
  attrs: string[],
  name: string,
  value: number | string | undefined,
): void {
  if (value !== undefined) {
    attrs.push(`${name}="${value}"`);
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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
