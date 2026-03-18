---
name: adt-reverse-engineering
description: Reverse-engineer SAP ADT REST endpoints using discovery, open source projects, and Sourcegraph code search. USE WHEN the user wants to understand an unknown ADT endpoint, figure out request/response formats, find content-types, discover URL patterns, or research how other tools integrate with SAP ADT. Trigger words - reverse engineer, discover endpoint, what does this endpoint return, ADT API research, find ADT endpoint, how does SAP ADT work, sniff endpoint, endpoint investigation.
---

# ADT Reverse Engineering

This skill guides the systematic reverse engineering of SAP ADT REST endpoints. Use it when you need to understand an undocumented endpoint's behavior, request/response format, content types, or URL patterns before implementing support via `$add-endpoint` or `$add-object-type`.

## When to Use This Skill

- **Before** `$add-endpoint` — to gather endpoint details when no documentation exists
- **Before** `$add-object-type` — to understand the full ADT surface for an object type
- When the user asks "what endpoints exist for X?" or "how does Y work in ADT?"
- When you need to find content-types, XML namespaces, or URL patterns for an endpoint

## Skill Chain

```
$adt-reverse-engineering  →  Research & discover endpoint details
        ↓
$add-endpoint             →  Create schema + contract + fixture
        ↓
$add-object-type          →  Full ADK model + abapGit handler (if applicable)
```

---

## Overview of Research Sources

| Priority | Source                            | Best For                                           | Tool                   |
| -------- | --------------------------------- | -------------------------------------------------- | ---------------------- |
| 1        | **Live SAP system** (discovery)   | Definitive URL paths, content-types, XML structure | `adt discovery` CLI    |
| 2        | **This repo** (`abapify/adt-cli`) | Existing patterns, schemas, contracts              | Local grep/read        |
| 3        | **Open source projects**          | Implementation patterns, undocumented behaviors    | Sourcegraph `src` CLI  |
| 4        | **SAP documentation**             | Official API specs (often incomplete)              | Web search             |
| 5        | **Eclipse ADT network capture**   | Full HTTP request/response details                 | Web search / community |

---

## Step 1: Start with Discovery (Live System)

The ADT discovery endpoint is the **authoritative source** for available services.

### 1a: Fetch the discovery document

```bash
# Using adt-cli (preferred)
npx adt discovery -o tmp/discovery.json
npx adt discovery -o tmp/discovery.xml

# Filter to a specific area
npx adt discovery --filter "CDS"
npx adt discovery --filter "programs"
npx adt discovery --filter "objects"
```

### 1b: Understand the discovery structure

The discovery document is an AtomPub service document:

```
service
  └── workspace[]
        ├── title          → Service area name (e.g., "Object Inspector")
        └── collection[]
              ├── title    → Collection name (e.g., "Classes")
              ├── href     → Base URL path (e.g., "/sap/bc/adt/oo/classes")
              ├── category → Object type terms (e.g., "CLAS/OC")
              └── templateLinks
                    └── templateLink[]
                          ├── template  → URL template with {placeholders}
                          ├── rel       → Link relation type
                          └── type      → Content-Type for the response
```

### 1c: Key things to extract from discovery

For each endpoint you're researching, extract:

| Field              | Where to Find                              | Example                                     |
| ------------------ | ------------------------------------------ | ------------------------------------------- |
| **Base URL**       | `collection.href`                          | `/sap/bc/adt/oo/classes`                    |
| **Content-Type**   | `templateLink.type` or `collection.accept` | `application/vnd.sap.adt.oo.classes.v4+xml` |
| **URL template**   | `templateLink.template`                    | `/sap/bc/adt/oo/classes/{objectName}`       |
| **Object type**    | `category.term`                            | `CLAS/OC`                                   |
| **Link relations** | `templateLink.rel`                         | `http://www.sap.com/adt/relations/source`   |

### 1d: Make actual requests to the endpoint

```bash
# Fetch a specific object and save response
npx adt get ZCL_MY_CLASS -o tmp/class.xml

# Or use curl directly for raw HTTP inspection
curl -u "$SAP_USER:$SAP_PASSWORD" \
  "https://$SAP_HOST/sap/bc/adt/oo/classes/zcl_my_class" \
  -H "Accept: application/vnd.sap.adt.oo.classes.v4+xml" \
  -v 2>tmp/headers.txt >tmp/response.xml
```

**Save ALL raw responses to `tmp/`** (see [tmp-folder-testing](../../rules/development/tmp-folder-testing.md)) — they become fixtures later.

---

## Step 2: Search Open Source Projects

When no live system is available, or to understand implementation patterns and edge cases, search these open source projects that implement SAP ADT clients.

### Reference Projects

| Project                   | Language   | Strength                                                          | Repository                                        |
| ------------------------- | ---------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| **vscode_abap_remote_fs** | TypeScript | Most complete ADT client, great for content-types and XML parsing | `github.com/marcellourbani/vscode_abap_remote_fs` |
| **abap-adt-api**          | TypeScript | Standalone ADT API lib extracted from above                       | `github.com/marcellourbani/abap-adt-api`          |
| **sapcli**                | Python     | Clean endpoint definitions, good for URL patterns                 | `github.com/jfilak/sapcli`                        |
| **jenkins-library**       | Go         | SAP's own CI/CD lib, has ADT client for ATC/CTS                   | `github.com/SAP/jenkins-library`                  |
| **erpl-adt**              | C++        | DuckDB ADT extension, different perspective on parsing            | `github.com/DataZooDE/erpl-adt`                   |
| **vibing-steampunk**      | Mixed      | Community ADT experiments                                         | `github.com/oisee/vibing-steampunk`               |
| **abapify/adt-cli**       | TypeScript | **This repo** — existing schemas, contracts, patterns             | Local codebase                                    |

### 2a: Using Sourcegraph `src` CLI (Preferred)

The `src` CLI (v6.9.0 available) searches across public GitHub repositories. Use it as the primary tool for cross-project research.

#### Search for endpoint URL patterns

```bash
# Find all references to a specific ADT endpoint path
src search 'repo:^github\.com/(marcellourbani/abap-adt-api|jfilak/sapcli|SAP/jenkins-library|DataZooDE/erpl-adt) /sap/bc/adt/programs' -json | jq '.Results[].file.name'

# Search for a specific endpoint across all ADT projects
src search 'repo:^github\.com/(marcellourbani|jfilak|SAP/jenkins-library) /sap/bc/adt/cts/transport'

# Find content-type patterns for an object type
src search 'repo:^github\.com/marcellourbani/abap-adt-api application/vnd.sap.adt.programs'
```

#### Search for XML namespace patterns

```bash
# Find namespace declarations for a specific ADT area
src search 'repo:^github\.com/marcellourbani/abap-adt-api xmlns.*sap.com/adt/programs'

# Find XML parsing code for a specific object type
src search 'repo:^github\.com/marcellourbani/abap-adt-api abapProgram' -json
```

#### Search for request/response handling

```bash
# Find how content-types are used
src search 'repo:^github\.com/marcellourbani/abap-adt-api vnd.sap.adt' --count 50

# Find lock/unlock patterns (important for write operations)
src search 'repo:^github\.com/marcellourbani/abap-adt-api X-sap-adt-sessiontype'

# Find CSRF token handling
src search 'repo:^github\.com/(marcellourbani/abap-adt-api|jfilak/sapcli) x-csrf-token'
```

#### Project-specific search patterns

**vscode_abap_remote_fs / abap-adt-api (TypeScript — most comprehensive):**

```bash
# Find endpoint definitions
src search 'repo:^github\.com/marcellourbani/abap-adt-api path.*=.*"/sap/bc/adt'

# Find content-type constants
src search 'repo:^github\.com/marcellourbani/abap-adt-api CONTENT_TYPE' --count 30

# Find XML parsing for specific elements
src search 'repo:^github\.com/marcellourbani/abap-adt-api fullParse.*class'
```

**sapcli (Python — clean structure):**

```bash
# Find endpoint definitions (Python uses class-based definitions)
src search 'repo:^github\.com/jfilak/sapcli adt_uri.*=.*"/sap/bc/adt'

# Find content-type definitions
src search 'repo:^github\.com/jfilak/sapcli content_type.*vnd.sap'

# Find object type handling
src search 'repo:^github\.com/jfilak/sapcli class.*ADTObject' --count 20
```

**jenkins-library (Go — SAP's official):**

```bash
# Find ADT endpoint URLs
src search 'repo:^github\.com/SAP/jenkins-library /sap/bc/adt' --count 30

# Find ATC-specific endpoints (jenkins-library specializes in ATC)
src search 'repo:^github\.com/SAP/jenkins-library /sap/bc/adt/atc'

# Find CTS transport endpoints
src search 'repo:^github\.com/SAP/jenkins-library /sap/bc/adt/cts'
```

**erpl-adt (C++ — different parsing approach):**

```bash
# Find endpoint definitions
src search 'repo:^github\.com/DataZooDE/erpl-adt /sap/bc/adt'

# Find XML parsing patterns
src search 'repo:^github\.com/DataZooDE/erpl-adt ParseXML'
```

### 2b: Using Sourcegraph MCP Tools (Alternative)

If the repos are indexed on the connected Sourcegraph instance, use MCP tools directly:

```
mcp0_sourcegraph-http__keyword_search
  query: "repo:marcellourbani/abap-adt-api /sap/bc/adt/programs"

mcp0_sourcegraph-http__nls_search
  query: "repo:marcellourbani/abap-adt-api ADT program endpoint content type"
```

**Note:** The Sourcegraph instance may not have all external repos indexed. If MCP search returns empty, fall back to `src` CLI.

### 2c: Manual GitHub Search (Fallback)

If neither Sourcegraph approach works:

```bash
# GitHub code search via web
# https://github.com/search?type=code&q=%2Fsap%2Fbc%2Fadt%2Fprograms+org%3Amarcellourbani

# Or clone and grep locally
git clone --depth=1 https://github.com/marcellourbani/abap-adt-api.git tmp/abap-adt-api
grep -r "/sap/bc/adt/programs" tmp/abap-adt-api/
```

---

## Step 3: Search This Repository

Always check what already exists locally before creating new endpoints.

### 3a: Check existing schemas

```bash
# List all existing schemas
ls packages/adt-schemas/src/schemas/generated/schemas/sap/

# Check if XSD source exists for your endpoint
ls packages/adt-schemas/.xsd/sap/ | grep -i <keyword>
ls packages/adt-schemas/.xsd/custom/ | grep -i <keyword>
```

### 3b: Check existing contracts

```bash
# List all existing contracts
find packages/adt-contracts/src/adt/ -name "*.ts" -not -name "index.ts"

# Search for endpoint paths
grep -r "/sap/bc/adt/" packages/adt-contracts/src/ | grep -v node_modules
```

### 3c: Check existing fixtures

```bash
# List all existing fixtures
find packages/adt-fixtures/src/fixtures/ -name "*.xml"

# Search for XML namespace patterns
grep -r 'xmlns.*sap.com/adt' packages/adt-fixtures/
```

---

## Step 4: SAP Documentation & Community

### Official sources

| Source               | URL                                                                    | Best For                         |
| -------------------- | ---------------------------------------------------------------------- | -------------------------------- |
| SAP Help - ADT API   | https://help.sap.com/docs/abap-cloud/abap-development-tools-user-guide | Official endpoint docs           |
| SAP Community        | https://community.sap.com                                              | Blog posts with endpoint details |
| SAP API Business Hub | https://api.sap.com                                                    | Some ADT-related APIs            |

### Web search patterns

```
# Search for specific endpoint documentation
"site:help.sap.com /sap/bc/adt/{endpoint}"

# Search for community blog posts
"site:community.sap.com ADT REST API {object-type}"

# Search for Eclipse ADT plugin source (has XSD definitions)
"github.com SAP abap-adt xsd {object-type}"
```

---

## Step 5: Analyze and Document Findings

After gathering data from the sources above, create a structured analysis in `tmp/` (see [tmp-folder-testing](../../rules/development/tmp-folder-testing.md)).

### 5a: Create endpoint analysis file

````bash
# Save analysis to tmp/
cat > tmp/endpoint-analysis-{name}.md << 'EOF'
# ADT Endpoint Analysis: {Name}

## Endpoint Details
- **URL**: /sap/bc/adt/{path}
- **Methods**: GET, POST, PUT, DELETE
- **Content-Type**: application/vnd.sap.adt.{type}.v{n}+xml
- **XML Namespace**: http://www.sap.com/adt/{namespace}
- **Root Element**: {elementName}

## Discovery Info
- **Workspace**: {workspace title}
- **Collection**: {collection title}
- **Category**: {OBJTYPE/SUBTYPE}

## Sources
- [ ] Discovery document
- [ ] Live system response
- [ ] vscode_abap_remote_fs / abap-adt-api
- [ ] sapcli
- [ ] jenkins-library
- [ ] erpl-adt
- [ ] SAP documentation

## XML Structure (from research)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- Paste sample XML here -->
````

## Key Attributes

| Attribute | Namespace | Type   | Required |
| --------- | --------- | ------ | -------- |
| name      | adtcore   | string | yes      |
| type      | adtcore   | string | yes      |

## Notes

- {any edge cases, version differences, etc.}
  EOF

```

### 5b: Save raw artifacts

```

tmp/
├── endpoint-analysis-{name}.md ← Analysis document
├── discovery.json ← Full discovery response
├── {name}-response.xml ← Raw XML response (if available)
├── {name}-headers.txt ← HTTP headers (if captured)
└── {name}-research/ ← Code snippets from other projects
├── abap-adt-api.ts ← Relevant code from abap-adt-api
├── sapcli.py ← Relevant code from sapcli
└── jenkins-library.go ← Relevant code from jenkins-library

```

---

## Step 6: Proceed to Implementation

Once you have sufficient endpoint details, chain to the appropriate skill:

### For a simple endpoint (read-only, no ADK model needed):
→ Use `$add-endpoint`

### For a full object type (CRUD + ADK + abapGit):
→ Use `$add-object-type`

### Minimum information needed before proceeding:

| Required | Field | Source Priority |
|----------|-------|----------------|
| **Yes** | Base URL path | Discovery > open source > docs |
| **Yes** | Content-Type (Accept header) | Discovery > open source > live capture |
| **Yes** | Root XML element name | Live response > open source > docs |
| **Yes** | XML namespace URI | Live response > open source > XSD |
| **Recommended** | Full XML sample | Live response > open source fixtures |
| **Recommended** | Object type code (e.g., CLAS/OC) | Discovery > open source |
| **Optional** | XSD schema source | `.xsd/sap/` directory > SAP Eclipse plugins |

---

## Common ADT Endpoint Patterns

### URL structure

```

/sap/bc/adt/{area}/{sub-area}/{object-name}
/sap/bc/adt/{area}/{sub-area}/{object-name}/source/{include-type}
/sap/bc/adt/{area}/{sub-area}/{object-name}/objectstructure

```

### Known areas and their endpoints

| Area | Endpoints | Notes |
|------|-----------|-------|
| `oo/classes` | GET, POST, PUT, DELETE, lock, source | OO classes, multiple includes |
| `oo/interfaces` | GET, POST, PUT, DELETE, lock, source | OO interfaces |
| `programs/programs` | GET, POST, PUT, DELETE, lock, source | ABAP programs |
| `functions/groups` | GET, POST, PUT, DELETE, lock | Function groups |
| `functions/groups/{name}/fmodules/{fm}` | Nested | Function modules within groups |
| `packages` | GET, POST, PUT, DELETE | Packages (DEVC) |
| `ddic/tables` | GET, POST, PUT, DELETE | Database tables |
| `ddic/domains` | GET, POST, PUT, DELETE | DDIC domains |
| `ddic/dataelements` | GET, POST, PUT, DELETE | Data elements |
| `ddic/structures` | GET, POST, PUT, DELETE | DDIC structures |
| `messageclass` | GET, POST, PUT, DELETE | Message classes |
| `cts/transportrequests` | GET, POST | Transport requests |
| `cts/transportrequests/{id}/tasks` | GET | Transport tasks |
| `atc/runs` | POST | ATC check runs |
| `atc/worklists/{id}` | GET | ATC results |
| `discovery` | GET | Service catalog |
| `repository/informationsystem` | POST | Object search |
| `activation` | POST | Object activation |

### HTTP headers to watch

| Header | Purpose | Example |
|--------|---------|---------|
| `Accept` | Response content-type | `application/vnd.sap.adt.oo.classes.v4+xml` |
| `Content-Type` | Request body format | `application/vnd.sap.adt.oo.classes.v4+xml` |
| `X-sap-adt-sessiontype` | Lock session type | `stateful` |
| `X-CSRF-Token` | CSRF protection | `Fetch` (request) / token value (response) |
| `x-csrf-token` | CSRF token (response) | Token value returned by server |
| `If-Match` | Optimistic locking (ETag) | `202412201234560011` |

### Content-Type patterns

```

application/vnd.sap.adt.{area}.{sub}.v{version}+xml → Object metadata
application/vnd.sap.adt.{area}.{sub}.source.v{version} → Source code
application/vnd.sap.adt.discovery+xml → Discovery
application/atomsvc+xml → Discovery (AtomPub)
application/atom+xml → Search results
application/xml → Generic XML

````

---

## Quick Reference: Sourcegraph Search Patterns

### By research goal

| Goal | Search Pattern |
|------|---------------|
| Find endpoint URL | `src search 'repo:marcellourbani/abap-adt-api /sap/bc/adt/{area}'` |
| Find content-type | `src search 'repo:marcellourbani/abap-adt-api vnd.sap.adt.{area}'` |
| Find XML namespace | `src search 'repo:marcellourbani/abap-adt-api xmlns.*sap.com/adt/{ns}'` |
| Find XML element | `src search 'repo:marcellourbani/abap-adt-api {elementName}' --count 20` |
| Find lock handling | `src search 'repo:marcellourbani/abap-adt-api lock.*{area}'` |
| Find Python impl | `src search 'repo:jfilak/sapcli /sap/bc/adt/{area}'` |
| Find Go impl | `src search 'repo:SAP/jenkins-library /sap/bc/adt/{area}'` |
| Find across ALL | `src search '(repo:marcellourbani/abap-adt-api OR repo:jfilak/sapcli OR repo:SAP/jenkins-library) /sap/bc/adt/{area}'` |

### Multi-repo shorthand

```bash
# Define an alias for common ADT repos (add to shell profile)
ADT_REPOS='repo:^github\.com/(marcellourbani/abap-adt-api|jfilak/sapcli|SAP/jenkins-library|DataZooDE/erpl-adt|oisee/vibing-steampunk)'

# Then use:
src search "$ADT_REPOS /sap/bc/adt/programs"
src search "$ADT_REPOS application/vnd.sap.adt.programs"
````

---

## Checklist

- [ ] Discovery document fetched and analyzed (if live system available)
- [ ] Endpoint URL path identified
- [ ] Content-Type(s) identified
- [ ] XML namespace(s) identified
- [ ] Root element name identified
- [ ] At least 2 open source projects consulted via Sourcegraph
- [ ] Existing schemas/contracts in this repo checked for overlap
- [ ] Endpoint analysis saved to `tmp/endpoint-analysis-{name}.md`
- [ ] Sample XML saved to `tmp/` (live or reconstructed from research)
- [ ] Ready to proceed with `$add-endpoint` or `$add-object-type`
