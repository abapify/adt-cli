/**
 * Convert an ADT URI to an on-disk abapGit filename.
 *
 * This mapper belongs next to the ATC resolver because ATC findings carry
 * ADT locations while the GitLab report needs an abapGit file name. The
 * abapGit format plugin re-exports it for consumers that already use that
 * package.
 */

/** Apply abapGit namespace transform: `/MYNS/zcl_foo` → `(myns)zcl_foo`. */
function applyNamespace(raw: string): string {
  const nsMatch = /^\/([^/]+)\/(.*)$/.exec(raw);
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

// Class include → abapGit suffix. Kept here so the built-in ATC package does
// not depend on the format plugin (which depends on @abapify/adt-atc).
// `main` maps to the primary class source (no suffix).
const CLASS_INCLUDE_TO_SUFFIX: Record<string, string | undefined> = {
  testclasses: 'testclasses',
  definitions: 'locals_def',
  implementations: 'locals_imp',
  macros: 'macros',
  localtypes: 'locals_types',
};

interface Rule {
  test: RegExp;
  build: (match: RegExpMatchArray) => string;
}

// Order matters – most specific first.
const RULES: Rule[] = [
  {
    test: /^\/sap\/bc\/adt\/oo\/classes\/([^/]+)\/includes\/([^/]+)$/,
    build: (match) => {
      const name = applyNamespace(decodeURIComponent(match[1]));
      const include = match[2].toLowerCase();
      if (include === 'main') return `src/${name}.clas.abap`;
      const suffix = CLASS_INCLUDE_TO_SUFFIX[include];
      return suffix
        ? `src/${name}.clas.${suffix}.abap`
        : `src/${name}.clas.${include}.abap`;
    },
  },
  {
    test: /^\/sap\/bc\/adt\/oo\/classes\/([^/]+)\/source\/main$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.clas.abap`,
  },
  {
    test: /^\/sap\/bc\/adt\/oo\/classes\/([^/]+)$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.clas.abap`,
  },

  // Interfaces
  {
    test: /^\/sap\/bc\/adt\/oo\/interfaces\/([^/]+?)(?:\/source\/main)?$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.intf.abap`,
  },

  // Programs
  {
    test: /^\/sap\/bc\/adt\/programs\/programs\/([^/]+?)(?:\/source\/main)?$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.prog.abap`,
  },

  // Function group metadata and source components
  {
    test: /^\/sap\/bc\/adt\/functions\/groups\/([^/]+)\/source\/main$/,
    build: (match) => {
      const group = applyNamespace(decodeURIComponent(match[1]));
      return `src/${group}.fugr.l${group}top.abap`;
    },
  },
  {
    test: /^\/sap\/bc\/adt\/functions\/groups\/([^/]+)$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.fugr.xml`,
  },
  {
    test: /^\/sap\/bc\/adt\/functions\/groups\/([^/]+)\/fmodules\/([^/]+?)(?:\/source\/main)?$/,
    build: (match) => {
      const group = applyNamespace(decodeURIComponent(match[1]));
      const functionModule = applyNamespace(decodeURIComponent(match[2]));
      return `src/${group}.fugr.${functionModule}.abap`;
    },
  },
  {
    test: /^\/sap\/bc\/adt\/functions\/groups\/([^/]+)\/includes\/([^/]+?)(?:\/source\/main)?$/,
    build: (match) => {
      const group = applyNamespace(decodeURIComponent(match[1]));
      const include = applyNamespace(decodeURIComponent(match[2]));
      return `src/${group}.fugr.${include}.abap`;
    },
  },

  // CDS and RAP source objects
  {
    test: /^\/sap\/bc\/adt\/ddic\/ddl\/sources\/([^/]+?)(?:\/source\/main)?$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.ddls.acds`,
  },
  {
    test: /^\/sap\/bc\/adt\/acm\/dcl\/sources\/([^/]+?)(?:\/source\/main)?$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.dcls.acds`,
  },
  {
    test: /^\/sap\/bc\/adt\/bo\/behaviordefinitions\/([^/]+?)(?:\/source\/main)?$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.bdef.abdl`,
  },
  {
    test: /^\/sap\/bc\/adt\/ddic\/srvd\/sources\/([^/]+?)(?:\/source\/main)?$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.srvd.acds`,
  },
  {
    test: /^\/sap\/bc\/adt\/businessservices\/bindings\/([^/]+?)(?:\/publishedstates)?$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.srvb.xml`,
  },

  // DDIC objects
  {
    test: /^\/sap\/bc\/adt\/ddic\/domains\/([^/]+)$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.doma.xml`,
  },
  {
    test: /^\/sap\/bc\/adt\/ddic\/dataelements\/([^/]+)$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.dtel.xml`,
  },
  {
    test: /^\/sap\/bc\/adt\/ddic\/(?:structures|tables)\/([^/]+)$/,
    build: (match) =>
      `src/${applyNamespace(decodeURIComponent(match[1]))}.tabl.xml`,
  },

  // Package — abapGit serializes every package to the fixed filename
  // `package.devc.xml`, regardless of the package name.
  {
    test: /^\/sap\/bc\/adt\/packages\/([^/]+)$/,
    build: () => 'src/package.devc.xml',
  },
];

/**
 * Convert an ADT URI to the abapGit on-disk filename. The returned path is
 * rooted at the configured abapGit starting folder (`src/` by default);
 * callers resolve that prefix against the repository's actual source tree.
 */
export function adtUriToAbapGitPath(uri: string): string | null {
  if (!uri) return null;
  const clean = stripFragment(uri).trim();
  for (const rule of RULES) {
    const match = rule.test.exec(clean);
    if (match) {
      try {
        return rule.build(match);
      } catch (error) {
        if (error instanceof URIError) return null;
        throw error;
      }
    }
  }
  return null;
}
