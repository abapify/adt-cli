import type { Config } from '@docusaurus/types';
import type {
  Options as PresetOptions,
  ThemeConfig,
} from '@docusaurus/preset-classic';

const config: Config = {
  title: 'adt-cli',
  tagline: 'SAP ADT tooling — CLI, MCP, SDK, plugins',
  favicon: 'img/favicon.svg',

  url: process.env.SITE_URL || 'https://adt-cli.netlify.app',
  baseUrl: process.env.BASE_URL || '/',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/abapify/adt-cli/tree/main/',
          exclude: [
            'README.md',
            'architecture/adk-overview.md',
            'architecture/plugin-system.md',
            'changelogs/**',
            'ci-cd-setup.md',
            'design/**',
            'examples/**',
            'history/**',
            'migration/**',
            'planning/**',
            'roadmap/**',
            'tmp/**',
          ],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies PresetOptions,
    ],
  ],

  themeConfig: {
    navbar: {
      title: 'adt-cli',
      logo: {
        alt: 'adt-cli logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/contributing/overview',
          label: 'Roadmap',
          position: 'left',
        },
        {
          to: '/mcp/overview',
          label: 'MCP integration',
          position: 'left',
        },
        {
          href: 'https://github.com/abapify/adt-cli',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/getting-started/installation',
            },
            { label: 'CLI', to: '/cli/overview' },
            { label: 'MCP', to: '/mcp/overview' },
          ],
        },
        {
          title: 'Reference',
          items: [
            { label: 'SDK Packages', to: '/sdk/packages/overview' },
            { label: 'Contracts', to: '/sdk/contracts/overview' },
            { label: 'Plugins', to: '/plugins/overview' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Architecture', to: '/architecture/overview' },
            { label: 'Contributing', to: '/contributing/overview' },
            {
              label: 'GitHub',
              href: 'https://github.com/abapify/adt-cli',
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} abapify. Built with Docusaurus.`,
    },
    colorMode: {
      respectPrefersColorScheme: true,
    },
    prism: {
      additionalLanguages: ['bash', 'typescript', 'json', 'xml-doc'],
    },
  } satisfies ThemeConfig,

  themes: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        docsDir: '../docs',
        docsRouteBasePath: '/',
        language: ['en'],
      },
    ],
  ],
};

export default config;
