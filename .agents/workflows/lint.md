---
name: lint
description: Run Nx lint with fix and iterate until clean.
category: workflow
tags: [nx, lint, quality]
---

1. Run lint with fix (Nx `lint` target for affected packages).
2. Analyse findings and fix errors and warnings.
3. Run again until lint is clean (including unused variables).

- Avoid unnecessary `@ts-ignore`.
- Avoid unnecessary `_` prefixes unless the codebase convention requires them.
