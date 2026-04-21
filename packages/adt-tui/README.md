# @abapify/adt-tui

Terminal UI primitives for ADT, built on [Ink](https://github.com/vadimdemedes/ink)
and React. Provides a small page-based navigation framework — a `Navigator`,
a `PageRenderer`, a hypermedia link parser, and a generic page — that other
packages and CLI commands use to build interactive ADT explorers in the
terminal.

[![npm](https://img.shields.io/npm/v/%40abapify%2Fadt-tui.svg)](https://www.npmjs.com/package/@abapify/adt-tui)

## Install

```bash
npm i @abapify/adt-tui
# or
bun add @abapify/adt-tui
```

`@abapify/adt-client` is a peer dependency and must be installed by the host.

## Usage

Boot the TUI from a CLI command, passing in an initial fetch function
(typically backed by the ADT client) and a start URI:

```ts
import { run } from '@abapify/adt-tui';

await run({
  fetch: (uri) => client.request(uri),
  startUrl: '/sap/bc/adt/repository/nodestructure',
});
```

Or compose the primitives directly inside your own Ink app:

```tsx
import { App, Navigator, NavigationProvider } from '@abapify/adt-tui';
import { render } from 'ink';

render(
  <NavigationProvider>
    <App fetch={fetchFn} startUrl="/sap/bc/adt/discovery" />
  </NavigationProvider>,
);
```

Custom pages implement the `PageComponent` contract and return a
`PageResult` describing which link to follow next; the framework takes
care of history, rendering, and back-navigation.

## Role in the monorepo

- Ink-based TUI primitives layer: it owns `Navigator`, `PageRenderer`,
  the navigation context, the hypermedia response parser, and the shared
  page/route types.
- Consumed by interactive `adt-cli` commands and experiments; it deliberately
  contains no ADT-specific business logic beyond link parsing, so commands
  bring their own pages.
- Depends on `@abapify/adt-contracts` for response typing and keeps
  `@abapify/adt-client` as a peer dependency to avoid duplicating the
  client in host applications.

## Related

- [abapify/adt-cli monorepo](https://github.com/abapify/adt-cli)
- [Full docs](https://adt-cli.netlify.app)

## License

MIT
