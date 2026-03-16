# ADK on xmld — Specification (Review Draft)

Status: Draft for review

## Goals

- Rebuild ADK with a clean, spec-driven architecture on top of `xmld`.
- Keep ADK generic and client-agnostic; ADK objects map to XML via composition.
- Use `xmld` for metadata/decorators and `fast-xml-parser` for final XML building.
- Provide robust parsing/serialization round-trips for Interfaces, Classes, Domains (Phase A).

## Design Principles

- xmld remains domain-agnostic (no SAP-specific logic inside xmld).
- Namespaces and object specifics are implemented in the new ADK using thin wrappers around xmld decorators.
- Base classes prevent duplication: `BaseXML` (adtcore + atom), `OoXML` (abapsource + abapoo).
- Decorators apply only to class properties (no nested literal decoration). Use small XML classes where needed.
- ESNext/Node 22+, extensionless imports, no legacy backups.

## Core Building Blocks

### xmld primitives used

- `@xml()` marks a class as xml-serializable.
- `@root(elementName: string)` sets root element (may contain prefix like `intf:abapInterface`).
- `@namespace(prefix, uri)` applied at class or property to register namespace.
- `@attribute` and `@element({ name?, type?, array? })` set property kind and options.
- `@unwrap` flattens an object's key-value pairs into parent as attributes/elements (based on the property's kind).
- `toSerializationData(instance)` → `toFastXMLObject(data)` → `XMLBuilder.build(obj)`.

### BaseXML

- Purpose: Common ADT bits for all objects.
- Structure:
  - `@unwrap @attribute @namespace('adtcore', 'http://www.sap.com/adt/core') core: AdtCoreAttrs`
    - Flattens adtcore attributes into root attributes.
  - `@namespace('atom', 'http://www.w3.org/2005/Atom') @element({ type: AtomLink, array: true, name: 'link' }) link?: AtomLink[]`
    - Emits repeated `atom:link` elements.
- Parsing helpers (static):
  - `parseAdtCoreAttributes(root)` → returns `AdtCoreAttrs` from `@_adtcore:*` fields.
  - `parseAtomLinks(root)` → returns `AtomLink[]` from `atom:link`.

### OoXML (extends BaseXML)

- Purpose: For OO artifacts (Interfaces, Classes).
- Structure:
  - Abap Source attributes: `@unwrap @attribute @namespace('abapsource','http://www.sap.com/adt/abapsource') sourceAttrs: AbapSourceAttrs`
  - Abap Source nested element: `@namespace('abapsource', ...) @element({ name: 'syntaxConfiguration', type: SyntaxConfiguration }) syntaxConfiguration?: SyntaxConfiguration`
  - Abap OO attributes: `@unwrap @attribute @namespace('abapoo','http://www.sap.com/adt/oo') oo: AbapOOAttrs`
- Parsing helpers (static):
  - `parseAbapSourceAttributes(root)` → attributes.
  - `parseAbapOOAttributes(root)` → attributes.
  - `parseSyntaxConfiguration(root)` → nested element.

## Namespace Modeling (Phase A)

Define TypeScript types and thin decorator utilities per namespace. No domain logic in xmld.

- adtcore
  - Attributes: `name`, `type`, `version?`, `description?`, `language?`, `masterLanguage?`, `masterSystem?`, `abapLanguageVersion?`, `responsible?`, `changedBy?`, `createdBy?`, dates, text limit.
  - Element (optional): `packageRef` as nested element when needed.
- atom
  - `AtomLink` xml class: root `atom:link`; attributes `href`, `rel`, `type?`, `title?`, `etag?` (attributes on the element).
- abapoo
  - Attributes: `modeled: boolean`.
- abapsource
  - Attributes: `sourceUri?`, `fixPointArithmetic?`, `activeUnicodeCheck?`.
  - Element: `syntaxConfiguration` (object with `language?: { version?: string|number, description?: string, supported?, etag? }`).
- intf (interfaces)
  - Root: `intf:abapInterface`.
  - No interface-specific attributes; relies on other namespaces.
- class
  - Root: `class:abapClass`.
  - Class-specific attributes (e.g., `class:final`, `class:abstract`, `class:sharedMemoryEnabled`) as a dedicated decorated property.
- ddic (domains)
  - Root: `ddic:domain`.
  - Elements: `dataType`, `length`, `decimals`, `outputLength`, `conversionExit`, `valueTable`, `fixedValues` with repeated `ddic:fixedValue` children.

## Object XMLs

### InterfaceXML

- `@xml()`
- `@root('intf:abapInterface')` and `@namespace('intf', 'http://www.sap.com/adt/oo/interfaces')`
- Inherits `core`, `link`,
- OO & Source via `OoXML`: `oo`, `sourceAttrs`, `syntaxConfiguration`.
- Static `fromXMLString(xml)` uses base parsers and returns a constructed instance.

### ClassXML

- `@xml()`
- `@root('class:abapClass')` + `@namespace('class', 'http://www.sap.com/adt/oo/classes')`
- Inherits `core`, `link`, and `OoXML` parts.
- Adds class-specific attributes via decorated property.
- Static `fromXMLString(xml)` parses and constructs instance.

### DomainXML

- `@xml()`
- `@root('ddic:domain')` + `@namespace('ddic','http://www.sap.com/adt/ddic')`
- Inherits `core`, `link` from `BaseXML`.
- Adds `ddic`-specific elements (including `fixedValues`).
- Static `fromXMLString(xml)` parses ddic section and constructs instance.

## ADK Domain Layer

- Interface `AdkObject` (unchanged conceptually): `kind`, `name`, `type`, `description?`, `package?`, `toAdtXml()`.
- Domain classes compose `xmlRep` (one of InterfaceXML/ClassXML/DomainXML).
- `toAdtXml()` delegates to `xmlRep` serialization.
- `static fromAdtXml(xml)` parses via XML class and wraps into domain instance.

## Serialization Pipeline

- `toSerializationData(xmlRep)` (xmld) → `toFastXMLObject(data)` (xmld plugin) → `new XMLBuilder(opts).build(obj)` (fast-xml-parser).
- Options:
  - `ignoreAttributes: false`
  - `attributeNamePrefix: '@_'`
  - `format: true`
  - `xmlDeclaration: true` (manually add if builder omits)

## Parsing Pipeline

- `new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', trimValues: true, removeNSPrefix: false, parseTagValue: false })`.
- Strip xml declaration before parsing when needed.
- Use BaseXML/OoXML helpers to map to typed structures.

## Testing Strategy

- Round-trip tests for `packages/adk/fixtures/*.xml` (intf, clas, doma):
  1. Parse fixture → build xmlRep → serialize → parse both sides → compare normalized structures.
  2. Compare namespaced attributes/elements ignoring ordering differences.
- Unit tests for BaseXML/OoXML parsers.
- Vitest `--reporter=default`.

## Open Questions

1. Root declaration style:
   - Option A: `@root('ns:element')` (single decorator)
   - Option B: `@root('element')` + class-level `@namespace('ns','uri')`
   - Preference?
2. Class attributes namespace coverage for Phase A (exact set)?
3. Keep `Kind` enum and `objectRegistry` semantics as-is?

## Deliverables (Phase A)

- Base classes + parsers implemented per spec.
- Namespaces wrappers/types added for Phase A.
- InterfaceXML, ClassXML, DomainXML implemented.
- Domain objects delegating to xmlRep with `toAdtXml()`.
- Tests green (unit + round-trip).

## Non-Goals (for Phase A)

- Extending to all ADT object types; will follow in Phase B+ based on priority.
- Rich OO model details beyond attributes needed for fixtures.

---

If approved, I will proceed to implement BaseXML/OoXML and InterfaceXML first, validate using `zif_test.intf.xml`, then complete ClassXML and DomainXML.
