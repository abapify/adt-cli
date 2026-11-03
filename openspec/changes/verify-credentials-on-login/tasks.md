# Tasks

- [x] 1. Add `verifyBasicAuth` helper (service-level, no console I/O)
  - [x] 1.1 Tests first: local HTTP server asserting 200 / 401 /
        unexpected-status / correct header behaviour
  - [x] 1.2 Implement using `createAdtClient` + `client.fetch` so auth
        header construction and error mapping stay in one place
- [x] 2. Wire verification into `adt auth login`
  - [x] 2.1 Manual basic-auth flow: verify before `authManager.login`
  - [x] 2.2 Destination-config basic-auth flow: verify before
        `authManager.login`
  - [x] 2.3 `--skip-verify` flag bypasses verification with a notice
- [x] 3. Verify: `nx test adt-cli` unit tests pass; lint/typecheck clean
      (test suite matches pre-existing main failures — 2 failed / 96
      passed identical on main; new tests 4/4 pass; `tsc --noEmit`
      clean)
