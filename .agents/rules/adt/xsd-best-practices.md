---
trigger: model_decision
description: Best practices for working with XSD files and XML parsing in this project.
---

# XSD and XML Best Practices

## XSD Validity

**CRITICAL:** Never create broken/invalid XSD files and then modify ts-xsd to handle them. XSDs must be valid W3C XML Schema documents FIRST.

- `xs:import` = cross-namespace. Only ONE `xs:import` per namespace per schema.
- `xs:include` = same-namespace composition/extension.
- Every `ref="prefix:name"` must resolve to an in-scope element declaration.
- Every `type="prefix:TypeName"` must resolve to an in-scope type definition.

## Custom Extensions

If SAP's XSD is missing types:

1. Create a custom extension XSD in `.xsd/custom/` with the **SAME** targetNamespace as the SAP schema.
2. Use `xs:include` to bring in the SAP schema.
3. Add new types/elements in the extension.
4. Have consumers `xs:import` the extension instead of the SAP schema directly.

## XML Parsing Gotchas

- **xmldom & Attributes:** The `@xmldom/xmldom` library returns an empty string `""` (instead of `null`) when calling `getAttribute()` for a non-existent attribute.
  - **Rule:** Always use `hasAttribute()` to check for existence before reading values to avoid treating missing attributes as present empty strings.

## TS-XSD Builder Logic (Do Not Regress)

- **Qualified Attributes:** When building XML with schemas that use `attributeFormDefault="qualified"` and inherit attributes from imported schemas, the builder must collect namespace prefixes from the **ENTIRE** `$imports` chain, not just the root schema's `$xmlns`.
  - _Context:_ SAP ADT schemas often import `abapsource.xsd` -> `adtcore.xsd`. Attributes like `name` defined in `adtcore.xsd` need the `adtcore:` prefix even if the root schema doesn't import `adtcore` directly.
- **Inherited Child Elements:** When building XML with inherited child elements (e.g. `packageRef` defined in `adtcore.xsd` but used by `interfaces.xsd`), the builder must use the **defining schema's namespace prefix** for the element tag, not the root schema's prefix.
  - _Context:_ `walkElements` must return the schema where the element was defined. `buildElement` must use this schema to resolve the prefix.
