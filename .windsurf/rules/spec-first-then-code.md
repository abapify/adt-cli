---
trigger: model_decision
description: When making any changes for any of spec-driven packages
---

# Specification-Driven Development Rule (OpenSpec)

## Core Philosophy

- Specifications are design contracts (stable, versioned, change-resistant)
- Documentation describes implementation (living, refactorable)
- Specs define WHAT and WHY before coding HOW
- This project uses [OpenSpec](https://openspec.dev/) for spec management

## Critical Review Process

- **Additions**: New features can be added to specs with standard review
- **Modifications**: Changes to existing specs require critical review and strong justification
- **Breaking Changes**: Must introduce new spec version, never modify existing version
- **AI Assistant Rule**: Be extremely critical of any proposed spec changes vs additions

## Workflow

1. Check existing specs in `openspec/specs/` before any code changes
2. To propose a new change, use `/opsx:propose "description"`
3. Negotiate spec updates FIRST if changes conflict with specs
4. Never implement code that contradicts existing specifications
5. After implementation, archive the change with `/opsx:archive`

## Spec Domains

- `openspec/specs/adk/` — ADK (ABAP Development Kit, TS native way to work with ABAP code and other objects)
- `openspec/specs/oat/` — OAT (Alternative to AbapGit and gCTS way of representing ABAP objects in a file tree)
- `openspec/specs/adt-cli/` — ADT CLI (alternative to piper CLI solution to operate with ABAP backend)
- `openspec/specs/adt-client/` — ADT Client (abstracted ADT API communication)
- `openspec/specs/cicd/` — CI/CD pipeline architecture
