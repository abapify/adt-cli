/**
 * Text Component
 *
 * Simple text with optional styling.
 */

import chalk from 'chalk';
import type { Component } from '../types';

type TextStyle =
  | 'bold'
  | 'dim'
  | 'italic'
  | 'underline'
  | 'success'
  | 'error'
  | 'warning';

export default function Text(content: string, style?: TextStyle): Component {
  let styled = content;

  switch (style) {
    case 'bold':
      styled = chalk.bold(content);
      break;
    case 'dim':
      styled = chalk.dim(content);
      break;
    case 'italic':
      styled = chalk.italic(content);
      break;
    case 'underline':
      styled = chalk.underline(content);
      break;
    case 'success':
      styled = chalk.green(content);
      break;
    case 'error':
      styled = chalk.red(content);
      break;
    case 'warning':
      styled = chalk.yellow(content);
      break;
  }

  return {
    render: () => [styled],
  };
}
