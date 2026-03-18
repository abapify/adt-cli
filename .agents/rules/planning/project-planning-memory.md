---
trigger: always_on
description: OpenSpec-based project planning. Check openspec/specs/ and openspec/changes/ before making changes.
---

# Project Planning and Memory Persistence Rule

## Planning System

This workspace uses [OpenSpec](https://openspec.dev/) for project planning and specification management.

## Key Locations

- `openspec/specs/` — Source of truth for system specifications (organized by domain)
- `openspec/changes/` — Active proposed changes (one folder per change)
- `openspec/config.yaml` — Project configuration and AI context
- `docs/planning/` — Roadmap, sprint tracking, and project coordination

## AI Assistant Workflow

1. **Check `openspec/specs/`** for existing specifications before making changes
2. **Check `openspec/changes/`** for active change proposals to understand context
3. **Use `/opsx:propose`** to create new change proposals with specs, design, and tasks
4. **Use `/opsx:apply`** to implement tasks from a change proposal
5. **Use `/opsx:archive`** to finalize completed changes and merge specs
6. **Sync with GitHub Issues** using label-based status tracking

## GitHub Integration

- GitHub Issues: External collaboration and detailed requirements
- OpenSpec Changes: Structured change proposals with specs and tasks
- Status sync through labels: status:ready → status:in-progress → status:review → status:done

## Memory Persistence

The `openspec/` directory serves as persistent project memory that survives:

- Container rebuilds
- Repository clones
- Session changes
- Team member transitions

This ensures consistent project understanding across all contributors and AI assistants.
