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
