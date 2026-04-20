# ── Stage 1: builder ─────────────────────────────────────────────────────────
# Installs all dependencies and builds every workspace package from source.
# Nothing is downloaded from the npm registry for @abapify/* packages.
FROM node:24-bookworm AS builder

# Install bun (matches the version used in CI)
RUN npm install -g bun@1.2.9

WORKDIR /build

# Copy workspace manifests first for better layer caching
COPY package.json bun.lock nx.json tsconfig.base.json tsconfig.json tsdown.config.ts ./

# Copy all workspace members required for the build
COPY packages/ ./packages/
COPY tools/    ./tools/
COPY samples/  ./samples/
# website/ is declared in root workspaces but is a docs-only project; copy just
# its package.json so `bun install --frozen-lockfile` can resolve the workspace.
COPY website/package.json ./website/package.json

# Install all dependencies (including dev deps needed for the build)
RUN bun install --frozen-lockfile

# Disable the Nx daemon and TUI (not needed / unsupported in Docker builds)
ENV NX_DAEMON=false
ENV NX_TUI=false

# Build every publishable package (docs site is excluded — its sources are
# intentionally not copied into the image).
RUN npx nx run-many -t build --parallel=2 --exclude=adt-cli-docs

# ── Stage 2: runner ──────────────────────────────────────────────────────────
# Lean image that ships only the built artifacts and their runtime deps.
# The adt CLI and all plugins are available without any npm registry access.
FROM node:24-bookworm-slim

WORKDIR /app

# Copy the built workspace packages (dist/ directories are now populated)
COPY --from=builder /build/packages    ./packages
# Copy the workspace node_modules so @abapify/* symlinks resolve correctly
# and third-party runtime deps (commander, axios, etc.) are present
COPY --from=builder /build/node_modules ./node_modules
# Copy the root package.json so npm workspace resolution works at runtime
COPY --from=builder /build/package.json ./

# Create bin symlinks for workspace packages (bun workspace install
# doesn't create these automatically in node_modules/.bin/)
RUN ln -sf ../../packages/adt-cli/dist/bin/adt.mjs node_modules/.bin/adt \
 && ln -sf ../../packages/adt-cli/dist/bin/adt-all.mjs node_modules/.bin/adt-all \
 && chmod +x packages/adt-cli/dist/bin/adt.mjs packages/adt-cli/dist/bin/adt-all.mjs

# Expose workspace binaries (adt, adt-codegen, …) as global commands
ENV PATH="/app/node_modules/.bin:$PATH"

# Default: show adt help (GitLab CI overrides entrypoint anyway)
CMD ["bash", "-c", "adt --help"]
