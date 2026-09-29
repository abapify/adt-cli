## 0.4.16 (2026-09-29)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.15 (2026-09-29)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.14 (2026-09-28)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.13 (2026-09-28)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.12 (2026-09-28)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.11 (2026-09-23)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.10 (2026-09-21)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.9 (2026-09-20)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.8 (2026-09-20)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.5.0 (2026-09-20)

### 🚀 Features

- **release:** setup Nx Release publishing with GitHub CI ([0243482f](https://github.com/abapify/adt-cli/commit/0243482f))
- decommission old transport commands, add cts tr commands, adt-tui package ([b1fcbfbe](https://github.com/abapify/adt-cli/commit/b1fcbfbe))

### 🩹 Fixes

- **packages:** add repository/homepage/bugs to every published package ([85b29310](https://github.com/abapify/adt-cli/commit/85b29310))
- add missing ts-morph and adk deps, bump to 0.1.10 ([ed143378](https://github.com/abapify/adt-cli/commit/ed143378))
- add missing zod dependency to adt-schemas and ts-xsd, bump to 0.1.9 ([c85f3a8c](https://github.com/abapify/adt-cli/commit/c85f3a8c))
- address all Qodo review comments from today's PRs (#44-#49) ([#44](https://github.com/abapify/adt-cli/issues/44), [#49](https://github.com/abapify/adt-cli/issues/49))
- resolve typecheck failures across workspace ([e6d46651](https://github.com/abapify/adt-cli/commit/e6d46651))
- **ci:** address Qodo review comments on release workflows ([645ee885](https://github.com/abapify/adt-cli/commit/645ee885))
- allow adt-puppeteer test to pass with no test files ([7d82f621](https://github.com/abapify/adt-cli/commit/7d82f621))
- resolve all ESLint errors causing CI pipeline failures ([7c6e5128](https://github.com/abapify/adt-cli/commit/7c6e5128))
- **ci:** fix format and lint errors to unblock CI pipeline ([74f4a1d9](https://github.com/abapify/adt-cli/commit/74f4a1d9))

### 🧱 Updated Dependencies

- Updated @abapify/browser-auth to 0.5.0
- Updated @abapify/adt-config to 0.5.0
- Updated adt-auth to 0.5.0

### ❤️ Thank You

- Claude
- Petr Plenkov
- ThePlenkov @ThePlenkov

## 0.4.7 (2026-09-18)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.6 (2026-09-18)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.5 (2026-09-17)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.4 (2026-09-17)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.3 (2026-09-16)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.2 (2026-09-08)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.1 (2026-05-29)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.4.0 (2026-05-29)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.3.6 (2026-04-21)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.3.5 (2026-04-20)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.3.4 (2026-04-20)

### 🩹 Fixes

- **packages:** add repository/homepage/bugs to every published package ([e1853e48](https://github.com/abapify/adt-cli/commit/e1853e48))

### ❤️ Thank You

- Petr Plenkov

## 0.3.3 (2026-04-20)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.3.2 (2026-04-20)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.3.1 (2026-04-20)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.3.0 (2026-04-20)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

## 0.2.0 (2026-04-02)

This was a version bump only for @abapify/adt-puppeteer to align it with other projects, there were no code changes.

# Changelog

## [Unreleased]

### Added

- **Session Persistence**: Added `userDataDir` option to persist browser profile across runs
  - Set `userDataDir: true` to use default directory (`~/.adt/puppeteer-profile`)
  - Set `userDataDir: '/custom/path'` for custom profile location
  - Automatically validates existing sessions before prompting for re-login
  - Perfect for long-lived Okta/IDP tokens - only need to refresh SAP cookies
- **Silent Session Refresh**: Implemented `refresh()` method for automatic session renewal
  - Launches headless browser with persistent profile (no window popup)
  - Leverages stored Okta session to obtain fresh SAP cookies
  - Completes in <30 seconds without user interaction
  - Enables `npx adt auth refresh` command for manual refresh
  - ADT CLI can auto-refresh expired sessions transparently

### Changed

- Improved authentication flow to check for valid existing sessions when using persistent profiles
- Enhanced logging to show session validation status
- Refactored `userDataDir` to be a plugin-level setting (via `PuppeteerPluginOptions`)
  - Use `withPuppeteer(config, { userDataDir: true })` instead of per-destination config
  - Aligns with standard plugin architecture patterns

### Example

```typescript
import { puppeteer } from '@abapify/adt-puppeteer';

export default defineConfig({
  destinations: {
    // Enable session persistence (recommended for SSO/Okta)
    PROD: puppeteer({
      url: 'https://sap.example.com',
      userDataDir: true, // Okta cookies persist between runs
    }),
  },
});
```

**Benefits:**

- First run: Complete Okta login → profile saved
- Subsequent runs: Reuse Okta session → skip login or only refresh SAP cookies
- Massive time savings for users with SSO authentication
