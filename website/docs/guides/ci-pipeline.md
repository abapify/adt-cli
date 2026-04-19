---
title: CI pipeline integration
sidebar_position: 11
description: Run adt-cli in GitHub Actions / GitLab CI — cached auth, tests, coverage, PR gating.
---

# CI pipeline integration

## Goal

Run adt-cli from CI to validate pull requests against a real SAP system:
syntax-check changed objects, run unit tests, collect coverage, and fail the
build if anything regressed. Cover both GitHub Actions and GitLab CI.

## Prerequisites

- A CI runner with Node.js ≥ 20 and outbound access to the SAP system
- Service user on SAP with dev auth (`S_DEVELOP`) and `S_TRANSPRT` for the
  relevant transport layer
- Credentials stored as CI secrets — **never** commit `~/.adt/auth.json`

## The auth cache

`adt auth login` writes `~/.adt/auth.json`. In CI you don't want to run an
interactive login every time; instead, render the file from secrets at job
start.

### Option A — Basic auth (simple, fine for CI)

```yaml
# .github/workflows/sap-ci.yml
jobs:
  sap-ci:
    runs-on: ubuntu-latest
    env:
      SAP_HOST: ${{ secrets.SAP_HOST }}
      SAP_USER: ${{ secrets.SAP_USER }}
      SAP_PASS: ${{ secrets.SAP_PASS }}
      SAP_CLIENT: ${{ secrets.SAP_CLIENT }}
      SAP_SID: DEV
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: lts/* }
      - run: npm i -g @abapify/adt-cli
      - name: Render auth file
        run: |
          mkdir -p "$HOME/.adt"
          cat > "$HOME/.adt/auth.json" <<JSON
          {
            "default": "$SAP_SID",
            "sessions": {
              "$SAP_SID": {
                "sid": "$SAP_SID",
                "host": "$SAP_HOST",
                "client": "$SAP_CLIENT",
                "auth": {
                  "method": "basic",
                  "plugin": "@abapify/adt-auth",
                  "credentials": { "username": "$SAP_USER", "password": "$SAP_PASS" }
                }
              }
            }
          }
          JSON
          chmod 600 "$HOME/.adt/auth.json"
      - run: adt auth status
```

### Option B — Cookie session (refresh once, reuse)

For SSO systems, render a pre-captured cookie session in the same shape —
see `AuthSession` in [`@abapify/adt-auth`](/sdk/packages/adt-auth). Schedule
a nightly refresh job that runs `adt auth refresh` and re-encrypts the file
into the secret store.

## Gate PRs on syntax

```yaml
- name: Syntax-check changed objects
  run: |
    git diff --name-only origin/main...HEAD -- 'src/**' \
      | awk -F. '/\.(clas|intf|prog|ddls)\./ { print $1 }' \
      | sort -u \
      | while read name; do
          adt check --uri "/sap/bc/adt/oo/classes/${name,,}" || exit 1
        done
```

## Run AUnit on the package under test

```yaml
- name: AUnit + coverage
  run: |
    mkdir -p reports
    adt aunit -p "$ZDEMO" \
      --format junit --output reports/aunit.xml \
      --coverage --coverage-format jacoco \
      --coverage-output reports/jacoco.xml

- name: Publish JUnit
  if: always()
  uses: mikepenz/action-junit-report@v4
  with:
    report_paths: reports/aunit.xml
```

See [AUnit with coverage](./aunit-with-coverage) for report-format choices.

## Checkin a feature branch (optional)

If the CI itself pushes to SAP (mono-system gitflow):

```yaml
- name: Checkin feature branch
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  run: |
    adt checkin ./src -p "$ZDEMO" -t "$CI_TR" --json > checkin.json
    jq -e '.results | all(.status == "ok")' checkin.json
```

## GitLab CI equivalent

```yaml
# .gitlab-ci.yml
image: node:lts

stages: [test]

sap-ci:
  stage: test
  variables:
    SAP_SID: DEV
  before_script:
    - npm i -g @abapify/adt-cli
    - mkdir -p ~/.adt
    - echo "$ADT_AUTH_JSON" > ~/.adt/auth.json # stored as File CI var
    - chmod 600 ~/.adt/auth.json
    - adt auth status
  script:
    - adt aunit -p "$ZDEMO" --format junit --output aunit.xml
  artifacts:
    when: always
    reports:
      junit: aunit.xml
```

## Troubleshooting

| Error                         | Cause                                                   | Fix                                                                             |
| ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| `Not authenticated` at step 1 | Auth file not rendered or wrong SID                     | `cat ~/.adt/auth.json                                                           | jq .default`and compare to`$SAP_SID` |
| `ECONNREFUSED` / timeouts     | Runner can't reach SAP host                             | Use a self-hosted runner inside the corporate network, or add a tunnel step     |
| Random 500 from SAP           | Security-session slot exhausted (SAP allows 1 per user) | Add `adt auth logout --sid $SAP_SID` at job end, or use a dedicated CI user     |
| `Too many redirects`          | SSL proxy stripped `Set-Cookie`                         | Talk to network team; last resort `--insecure` on `auth login`                  |
| Coverage report empty         | AUnit step failed before coverage flush                 | Check `aunit.xml` for errors first; coverage only emits on successful test runs |

## See also

- [AUnit with coverage](./aunit-with-coverage)
- [`adt auth` reference](/cli/auth)
- [`@abapify/adt-auth`](/sdk/packages/adt-auth)
- [abapGit roundtrip](./abapgit-checkout-checkin)
