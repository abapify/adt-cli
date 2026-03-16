# Project Documentation Structure

This directory contains supplementary documentation. **Specifications have moved to OpenSpec.**

## Specs → OpenSpec

Design contracts and specifications are now managed via [OpenSpec](https://openspec.dev/):

```
openspec/
├── specs/              # Source of truth (organized by domain)
│   ├── adk/            # ABAP Development Kit
│   ├── adt-cli/        # ADT CLI design and plugins
│   ├── adt-client/     # ADT API client
│   └── cicd/           # CI/CD pipeline
├── changes/            # Proposed changes (one folder per change)
└── config.yaml         # Project configuration
```

Use `/opsx:propose`, `/opsx:apply`, and `/opsx:archive` to manage changes.

## Structure Overview

```
docs/
├── architecture/       # Architecture documentation
├── design/             # Design documentation
├── examples/           # Usage examples
├── migration/          # Migration guides
├── planning/           # Project Management (WHEN & HOW)
├── history/            # Historical Context (WHAT HAPPENED)
├── changelogs/         # Changelog records
└── README.md           # This file
```

## Directory Purposes

### `/docs/architecture/` - Architecture Docs

Implementation-focused documentation describing how components work.

### `/docs/planning/` - Project Management

**Dynamic project coordination and execution tracking**

- Current sprint status
- Implementation plans
- Task breakdowns
- **Update Frequency**: Daily/weekly as work progresses

### `/docs/history/` - Historical Context

**Detailed records of completed work and decisions**

- Daily work summaries
- Technical decision logs
- Implementation retrospectives

## Navigation Guidelines

### For Current Work

1. Check `openspec/changes/` for active change proposals
2. Reference `openspec/specs/` for specification contracts
3. Check `docs/planning/` for sprint status

### For New Features

1. Check `openspec/specs/` for existing specifications
2. Use `/opsx:propose "description"` to create a structured change proposal
3. Implement with `/opsx:apply` and archive with `/opsx:archive`

### For Context Research

1. Search `docs/history/` for similar past work
2. Review `openspec/specs/` for architectural constraints
3. Check `docs/planning/` for current priorities
