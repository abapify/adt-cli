---
trigger: always_on
description: Commit and push authorized feature work without re-prompting.
---

# Autonomous Delivery Rule

## Rule

Once the user authorizes implementation, that authorization includes creating
and pushing verified atomic commits to the scoped feature branch. Do not pause
to request a second commit or push confirmation.

Before committing and pushing:

1. Inspect the exact staged files and diff.
2. Verify that the current branch and remote match the authorized feature branch and repository.
3. Verify that every staged path is within the authorized scope and excludes pre-existing changes.
4. Run the relevant verification gates and record known blockers.
5. Use a scoped, public-safe commit message and author identity where required.
6. Push only the verified feature branch and report the resulting commit/MR.

## Actions that remain gated

- destructive history rewrites or force-pushes;
- direct protected-branch updates or merges;
- releases and package publication;
- expanding the branch, repository, or delivery scope.
