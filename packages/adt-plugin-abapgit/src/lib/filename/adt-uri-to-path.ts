/**
 * Convert an ADT URI to an on-disk abapGit filename.
 *
 * abapGit stores objects as `<name>.<type>.<ext>` inside `src/`.
 * Classes have additional includes serialised as
 * `<name>.clas.<suffix>.abap`. Function modules become
 * `<group>.fugr.<fm_name>.abap`. Namespaces are rendered as
 * `(namespace)name`.
 *
 * Returns `null` for URIs we don't recognise; callers may warn or fall
 * back to a synthetic path.
 */

import { ABAPGIT_SUFFIX } from '../handlers/objects/clas';

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

/**
 * Apply abapGit namespace transform: `/MYNS/zcl_foo` → `(myns)zcl_foo`.
 * Case is lower-cased afterwards; name without namespace returned as-is
 * (lower-cased).
 */
function applyNamespace(raw: string): string {
  const nsMatch = raw.match(/^\/([^/]+)\/(.*)$/);
  if (nsMatch) {
    const [, ns, rest] = nsMatch;
    return `(${ns.toLowerCase()})${rest.toLowerCase()}`;
  }
  return raw.toLowerCase();
}

function stripFragment(uri: string): string {
  const hashIndex = uri.indexOf('#');
  return hashIndex >= 0 ? uri.slice(0, hashIndex) : uri;
}

// Class include → abapGit suffix (reversed view of ABAPGIT_SUFFIX).
const CLASS_INCLUDE_TO_SUFFIX: Record<string, string | undefined> = {
  testclasses: ABAPGIT_SUFFIX.testclasses,
  definitions: ABAPGIT_SUFFIX.definitions,
  implementations: ABAPGIT_SUFFIX.implementations,
  macros: ABAPGIT_SUFFIX.macros,
  localtypes: ABAPGIT_SUFFIX.localtypes,
};

// ──────────────────────────────────────────────────────────────────────
// Individual URI shape handlers
// ──────────────────────────────────────────────────────────────────────

interface Rule {
  test: RegExp;
  build: (m: RegExpMatchArray) => string;
}

// Order matters – most specific first.
const RULES: Rule[] = [
  // /sap/bc/adt/oo/classes/<name>/includes/<include>
  {
    test: /^\/sap\/bc\/adt\/oo\/classes\/([^/]+)\/includes\/([^/]+)$/,
    build: (m) => {
      const name = applyNamespace(decodeURIComponent(m[1]));
      const include = m[2].toLowerCase();
      const suffix = CLASS_INCLUDE_TO_SUFFIX[include];
      return suffix
        ? `src/${name}.clas.${suffix}.abap`
        : `src/${name}.clas.${include}.abap`;
    },
  },
  // /sap/bc/adt/oo/classes/<name>/source/main
  {
    test: /^\/sap\/bc\/adt\/oo\/classes\/([^/]+)\/source\/main$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.clas.abap`,
  },
  // /sap/bc/adt/oo/classes/<name>
  {
    test: /^\/sap\/bc\/adt\/oo\/classes\/([^/]+)$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.clas.abap`,
  },

  // Interfaces
  {
    test: /^\/sap\/bc\/adt\/oo\/interfaces\/([^/]+?)(?:\/source\/main)?$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.intf.abap`,
  },

  // Programs
  {
    test: /^\/sap\/bc\/adt\/programs\/programs\/([^/]+?)(?:\/source\/main)?$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.prog.abap`,
  },

  // Function group – metadata only
  {
    test: /^\/sap\/bc\/adt\/functions\/groups\/([^/]+)$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.fugr.xml`,
  },
  // Function modules  – /fmodules/<fm>
  {
    test: /^\/sap\/bc\/adt\/functions\/groups\/([^/]+)\/fmodules\/([^/]+?)(?:\/source\/main)?$/,
    build: (m) => {
      const group = applyNamespace(decodeURIComponent(m[1]));
      const fm = applyNamespace(decodeURIComponent(m[2]));
      return `src/${group}.fugr.${fm}.abap`;
    },
  },
  // Function group includes – /includes/<name>
  {
    test: /^\/sap\/bc\/adt\/functions\/groups\/([^/]+)\/includes\/([^/]+?)(?:\/source\/main)?$/,
    build: (m) => {
      const group = applyNamespace(decodeURIComponent(m[1]));
      const inc = applyNamespace(decodeURIComponent(m[2]));
      return `src/${group}.fugr.${inc}.abap`;
    },
  },

  // CDS DDL source
  {
    test: /^\/sap\/bc\/adt\/ddic\/ddl\/sources\/([^/]+?)(?:\/source\/main)?$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.ddls.asddls`,
  },
  // CDS DCL source
  {
    test: /^\/sap\/bc\/adt\/acm\/dcl\/sources\/([^/]+?)(?:\/source\/main)?$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.dcls.asdcls`,
  },

  // RAP Behavior Definition (BDEF) — `.abdl` source
  {
    test: /^\/sap\/bc\/adt\/bo\/behaviordefinitions\/([^/]+?)(?:\/source\/main)?$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.bdef.abdl`,
  },

  // DDIC domain / data element / structure / table / type
  {
    test: /^\/sap\/bc\/adt\/ddic\/domains\/([^/]+)$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.doma.xml`,
  },
  {
    test: /^\/sap\/bc\/adt\/ddic\/dataelements\/([^/]+)$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.dtel.xml`,
  },
  {
    test: /^\/sap\/bc\/adt\/ddic\/structures\/([^/]+)$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.tabl.xml`,
  },
  {
    test: /^\/sap\/bc\/adt\/ddic\/tables\/([^/]+)$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.tabl.xml`,
  },

  // Package
  {
    test: /^\/sap\/bc\/adt\/packages\/([^/]+)$/,
    build: (m) => `src/${applyNamespace(decodeURIComponent(m[1]))}.devc.xml`,
  },
];

/**
 * Convert an ADT URI to the abapGit on-disk filename (lower-cased,
 * namespace-aware). Returns `null` when the URI shape is not recognised.
 */
export function adtUriToAbapGitPath(uri: string): string | null {
  if (!uri) return null;
  const clean = stripFragment(uri).trim();
  for (const rule of RULES) {
    const m = clean.match(rule.test);
    if (m) return rule.build(m);
  }
  return null;
}
