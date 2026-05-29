## 0.4.1 (2026-05-29)

This was a version bump only for @abapify/adt-lint to align it with other projects, there were no code changes.

## 0.4.0 (2026-05-29)

### 🚀 Features

- implement arc-1 parity across adt-lint, adt-contracts, adt-mcp, and adt-cli ([aeb5e8b2](https://github.com/abapify/adt-cli/commit/aeb5e8b2))
- **adt-lint:** scaffold shared abaplint utilities package ([20827906](https://github.com/abapify/adt-cli/commit/20827906))

### 🩹 Fixes

- use localeCompare in sort for SonarCloud S2871 reliability ([a40e9dec](https://github.com/abapify/adt-cli/commit/a40e9dec))
- guard starts[0] with nullish coalescing for SonarCloud reliability ([77334cf7](https://github.com/abapify/adt-cli/commit/77334cf7))
- address PR review — regex security, method detection, BTP 404, lint gate, specs ([bf634260](https://github.com/abapify/adt-cli/commit/bf634260))
- **adt-lint:** replace lazy '._?' with '[^']_' in token regex to fix S5852/polynomial-redos ([6238f973](https://github.com/abapify/adt-cli/commit/6238f973))

### ❤️ Thank You

- Devin AI @devin-ai-integration[bot]
- Petr Plenkov
- ThePlenkov @ThePlenkov

# Changelog

All notable changes to this project will be documented in this file.
