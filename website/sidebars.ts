import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docs: [
    'index',
    {
      type: 'category',
      label: 'Getting Started',
      link: { type: 'generated-index' },
      items: ['getting-started/installation'],
    },
    {
      type: 'category',
      label: 'CLI',
      link: { type: 'generated-index' },
      items: ['cli/overview'],
    },
    {
      type: 'category',
      label: 'MCP',
      link: { type: 'generated-index' },
      items: ['mcp/overview'],
    },
    {
      type: 'category',
      label: 'SDK',
      link: { type: 'generated-index' },
      items: [
        {
          type: 'category',
          label: 'Packages',
          link: { type: 'generated-index' },
          items: ['sdk/packages/overview'],
        },
        {
          type: 'category',
          label: 'Contracts',
          link: { type: 'generated-index' },
          items: ['sdk/contracts/overview'],
        },
      ],
    },
    {
      type: 'category',
      label: 'Plugins',
      link: { type: 'generated-index' },
      items: ['plugins/overview'],
    },
    {
      type: 'category',
      label: 'Architecture',
      link: { type: 'generated-index' },
      items: ['architecture/overview'],
    },
    {
      type: 'category',
      label: 'Contributing',
      link: { type: 'generated-index' },
      items: ['contributing/overview'],
    },
  ],
};

export default sidebars;
