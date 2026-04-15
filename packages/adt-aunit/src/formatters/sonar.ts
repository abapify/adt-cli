/**
 * AUnit Sonar Generic Execution Format Formatter
 *
 * Converts AUnit test results to Sonar Generic Execution format.
 * @see https://docs.sonarsource.com/sonarqube/latest/analyzing-source-code/test-coverage/generic-test-data/#generic-execution
 *
 * Output structure:
 * <testExecutions version="1">
 *   <file path="...">
 *     <testCase name="..." duration="..." />
 *     <testCase name="...">
 *       <failure message="...">stack trace</failure>
 *     </testCase>
 *   </file>
 * </testExecutions>
 */

import { writeFileSync } from 'node:fs';
import type {
  AunitResult,
  AunitProgram,
  AunitTestClass,
  AunitTestMethod,
} from '../types';

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Build a file path for the test object.
 * Mirrors sapcli behaviour: uses the object type and name as a pseudo-path
 * so that Sonar can link findings to source files in a checkout.
 */
function objectPath(program: AunitProgram): string {
  const type = (program.type ?? '').replace('/', '_');
  const name = program.name.toLowerCase();
  if (type.startsWith('CLAS')) {
    return `src/${name}.clas.abap`;
  }
  if (type.startsWith('PROG')) {
    return `src/${name}.prog.abap`;
  }
  if (type.startsWith('INTF')) {
    return `src/${name}.intf.abap`;
  }
  return `src/${name}.abap`;
}

function methodElement(method: AunitTestMethod, cls: AunitTestClass): string {
  const durationMs = Math.round(method.executionTime * 1000);
  const testName = escapeXml(`${cls.name}.${method.name}`);

  if (method.status === 'pass' || method.status === 'skip') {
    return `      <testCase name="${testName}" duration="${durationMs}" />`;
  }

  const kind = method.status === 'fail' ? 'failure' : 'error';
  const messages = method.alerts
    .map((a) => {
      const detail = [a.title, ...a.details].join('\n');
      return detail;
    })
    .join('\n---\n');

  const stack = method.alerts
    .flatMap((a) => a.stack.map((s) => s.description ?? s.name ?? ''))
    .filter(Boolean)
    .join('\n');

  const msgAttr = escapeXml(method.alerts[0]?.title ?? method.status);
  const body = escapeXml([messages, stack].filter(Boolean).join('\n\n'));

  return [
    `      <testCase name="${testName}" duration="${durationMs}">`,
    `        <${kind} message="${msgAttr}">${body}</${kind}>`,
    `      </testCase>`,
  ].join('\n');
}

function programElement(program: AunitProgram): string {
  const path = escapeXml(objectPath(program));
  const methods = program.testClasses.flatMap((cls) =>
    cls.methods.map((m) => methodElement(m, cls)),
  );
  if (methods.length === 0) return '';
  return [`  <file path="${path}">`, ...methods, `  </file>`].join('\n');
}

/**
 * Convert AUnit result to Sonar Generic Execution XML string
 */
export function toSonarXml(result: AunitResult): string {
  const files = result.programs.map(programElement).filter(Boolean).join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<testExecutions version="1">',
    files,
    '</testExecutions>',
  ].join('\n');
}

/**
 * Write Sonar Generic Execution XML report to file
 */
export function outputSonarReport(result: AunitResult, filePath: string): void {
  const xml = toSonarXml(result);
  writeFileSync(filePath, xml, 'utf-8');
}
