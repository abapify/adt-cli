---
trigger: glob
description: Enforce extensionless imports for internal files in bundled TypeScript packages.
globs: *.ts
---

## Rule: Use Extensionless Imports for Internal Files

When working within a TypeScript package that has `"moduleResolution": "bundler"` in its `tsconfig.json` and is processed by a build tool (like `tsdown`, `vite`, or `rollup`), **all internal, relative imports MUST be extensionless.**

This applies to any file inside a package's `src` directory importing another file from the same package.

### Rationale

- With `"moduleResolution": "bundler"`, TypeScript allows extensionless imports and relies on the build tool to resolve them correctly.
- The build tool (e.g., `tsdown`) bundles the code, making runtime file extensions irrelevant for internal modules.
- This keeps import statements clean and consistent with modern JavaScript/TypeScript module practices.

### Correct ✅

```typescript
// Correct: No file extension for internal, relative import
import { something } from './local-module';
import { another } from '../utils/helpers';
```

### Incorrect ❌

```typescript
// Incorrect: Unnecessary .js extension for an internal module
import { something } from './local-module.js';
```

### Agent Behavior

- When generating or modifying code in a package that uses a bundler, I will always use extensionless relative paths for internal imports.
- If I encounter existing code with `.js` extensions on internal imports, I will remove them.
- This rule does not apply to imports from external packages (e.g., `from 'fast-xml-parser'`).
