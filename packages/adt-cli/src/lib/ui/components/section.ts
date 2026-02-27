/**
 * Section Component
 *
 * Groups components under a title.
 */

import chalk from 'chalk';
import type { Component } from '../types';

export default function Section(
  title: string,
  ...children: Component[]
): Component {
  return {
    render: () => [
      '',
      chalk.underline(title),
      ...children.flatMap((c) => c.render()),
    ],
  };
}
