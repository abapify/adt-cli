---
title: '@abapify/adt-tui'
description: Ink/React terminal UI framework for ADT navigation.
---

# `@abapify/adt-tui`

Page-based terminal UI for browsing ADT APIs. Built on [Ink](https://github.com/vadimdemedes/ink)
(React for the terminal). Pages return `PageResult` values; the framework
handles navigation and rendering.

## Install

```bash
bun add @abapify/adt-tui
```

## Public API

```ts
export { run, type RunOptions } from '@abapify/adt-tui';
export { App, type AppProps } from '@abapify/adt-tui';
export { Navigator } from '@abapify/adt-tui';
export { PageRenderer } from '@abapify/adt-tui';
export { NavigationProvider, useNavigation } from '@abapify/adt-tui';
export {
  parseResponse,
  getActionName,
  categorizeLinks,
} from '@abapify/adt-tui';
export { genericPage } from '@abapify/adt-tui';

export type {
  HypermediaLink,
  ParsedResponse,
  NavigationEntry,
  FetchFn,
  PageProps,
  PageResult,
  MenuItem,
  PageComponent,
  Route,
} from '@abapify/adt-tui';
```

## Dependencies

- `ink`, `react`
- Consumed by: [`adt-cli`](./adt-cli).
