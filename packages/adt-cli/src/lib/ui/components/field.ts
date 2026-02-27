/**
 * Field Component
 *
 * Displays a label: value pair.
 * Skips rendering if value is empty/undefined.
 */

import chalk from 'chalk';
import type { Component } from '../types';

export default function Field(
  label: string,
  value?: string | number | boolean,
): Component {
  // Skip empty values (including false for booleans)
  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    value === '-' ||
    value === false;

  return {
    render: () =>
      isEmpty
        ? []
        : [
            `  ${chalk.dim(label + ':')} ${value === true ? 'Yes' : String(value)}`,
          ],
  };
}
