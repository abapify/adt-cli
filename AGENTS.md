<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# AGENTS.md

## Project Context & Goals

**Primary Mission**: Build efficient CI/CD pipeline for ABAP development using GitLab

**Current Focus**: GitLab CI/CD pipeline for code review with:

- ATC runs visualization (source code + findings overlay)
- Delta analysis (before/after comparison for each task/TR)
- Code coverage integration (lower priority)
- Future AI integration for quality check summaries

**DevOps-First Design**: All tools (especially ADT CLI) are built to be DevOps-friendly and automation-ready

## Essential Commands (HIGHEST PRIORITY)

**Package Manager**: This project uses **npm workspaces** (NOT pnpm)

- `workspace:*` dependencies are NOT supported with npm
- Use npm commands, not pnpm commands
- For workspace dependencies, use `*` instead of `workspace:*`

**Development**

- `nx build` - Build all packages
- `nx build [package-name]` - Build specific package (e.g., `nx build adt-cli`)
- `nx typecheck` - Type check all TypeScript code
- `nx lint` - Lint and fix all projects

**Testing**

- `nx test` - Run all tests with coverage
- `nx test [package-name]` - Run tests for specific package

**ADT CLI Features** (Sep 2025)

- `adt get <object> --properties` - Show package hierarchy & application component
- `adt outline <object>` - Visual tree structure (methods, attributes, hierarchy)
- Object types supported: CLAS (classes), INTF (interfaces)

**File Organization**

- All temporary files → `tmp/` directory
- CLI output files → `tmp/` (e.g., `adt get ZCL_TEST -o tmp/class.xml`)

## Monorepo Structure (CRITICAL)

```
/workspaces/abapify-js/
├── packages/           # Core libraries
│   ├── adk/           # ABAP Development Kit
│   ├── adt-cli/       # ADT CLI tool
│   ├── cds2abap/      # CDS to ABAP converter
│   └── sample-tsdown/ # Template for new packages
├── samples/           # Example implementations
└── tmp/              # Temporary files only
```

**Import Rules**

- Cross-package: `@abapify/[package-name]`
- Internal files: `../relative/path`

## New Package Creation

**Template**: Copy `packages/sample-tsdown`

1. `npx nx g @nx/node:library --directory=packages/[name] --no-interactive`
2. Copy `tsdown.config.ts` from sample package
3. Update `package.json`: `"build": "tsdown"`
4. Ensure `skipNodeModulesBundle: true` in config

## Code Standards

**Language**: TypeScript (ES2015, strict mode, decorators enabled)

**Style**

- PascalCase: types, classes, interfaces
- camelCase: variables, methods, functions
- 2-space indentation (Prettier)
- Async over callbacks/sync calls
- Use native APIs when possible

**Architecture Principles**

1. Minimalism
2. Modularity (small focused files)
3. Reusability
4. Readability

## ADK ↔ ADT CLI Integration (Sep 2025)

**Clean Separation Achieved:**

- **ADK**: TypeScript types + native ADT XML parsing/rendering
- **OAT**: Git-friendly project structure (packages/pkg/objects/type/name/)
- **ADT CLI**: HTTP client + CLI commands + orchestration

**Key Decisions:**

- ADK replaces manual XML parsing (eliminated ~400 lines)
- `AdkObjectHandler` bridge pattern connects ADK adapters to CLI
- No feature flags - ADK is the standard parsing layer
- Legacy `ClasObject`/`IntfObject`/`DevcObject` removed

**Bridge Pattern:**

```typescript
// In ObjectRegistry
this.handlers.set(
  'CLAS',
  (client) =>
    new AdkObjectHandler(
      client,
      (xml) => ClassAdtAdapter.fromAdtXML(xml),
      (name) => `/sap/bc/adt/oo/classes/${name.toLowerCase()}`,
    ),
);
```

**Benefits Proven:**

- Type safety throughout pipeline
- Native ADT compatibility
- Reduced code complexity
- Maintainable architecture

## Specification-Driven Development

**Core Principle**: All development must align with project specifications in `/specs/` directory

**Specification Compliance Process**:

1. **Check Existing Specs**: Before any code changes, review relevant specifications in `/specs/`
2. **Spec Alignment**: Ensure proposed changes align with documented specifications
3. **Spec Negotiation**: If changes conflict with specs, negotiate spec updates FIRST
4. **No Spec Violations**: Never implement code that contradicts existing specifications

**Key Specifications**:

- `/specs/cicd/abap-cicd-pipeline.md` - Core ABAP CI/CD architecture and principles
- `/specs/oat/` - OAT format specifications and documentation
- Additional specs as they are created

## Workflow Rules

**Before Code Changes**

1. **Review Specifications**: Check `/specs/` for relevant documentation
2. **Spec Compliance Check**: Ensure changes align with documented architecture
3. **Spec Update Process**: If changes require spec modifications:
   - Discuss spec changes with user FIRST
   - Update specification documents
   - Only then proceed with code implementation
4. Always propose plan and get confirmation
5. Update relevant README.md files for significant changes

**After Code Changes**

1. Rebuild package: `nx build [package-name]`
2. Run type check: `nx typecheck`
3. Test: `nx test [package-name]`
4. **Spec Validation**: Confirm implementation matches updated specifications

<!-- nx configuration end-->
