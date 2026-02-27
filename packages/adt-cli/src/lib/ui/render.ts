/**
 * Page Renderer
 *
 * Helper to create print function for pages.
 */

import chalk from 'chalk';
import type { Page, MenuItem } from './types';

/**
 * Create print function for a page
 */
export function createPrintFn(page: {
  title: string;
  titleLink?: string;
  icon?: string;
  menu?: MenuItem[];
  footer?: string;
  render: () => string[];
}): () => void {
  return () => {
    // Title - use titleLink if available (clickable ADT link)
    const titleDisplay = page.titleLink || page.title;
    console.log();
    console.log(chalk.bold(`${page.icon || '📄'} ${titleDisplay}`));

    // Content (from component tree)
    for (const line of page.render()) {
      console.log(line);
    }

    // Menu
    if (page.menu?.length) {
      console.log();
      console.log(chalk.dim('─'.repeat(40)));
      for (const item of page.menu) {
        const icon = item.icon || '•';
        const info = item.info ? chalk.dim(` (${item.info})`) : '';
        console.log(`  ${icon} ${item.label}${info}`);
      }
    }

    // Footer
    if (page.footer) {
      console.log();
      console.log(chalk.dim(page.footer));
    }

    console.log();
  };
}

/**
 * Render a page to console (legacy, calls page.print())
 */
export default function render(page: Page): void {
  page.print();
}
