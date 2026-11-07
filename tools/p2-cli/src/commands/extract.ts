import { existsSync, rmSync } from 'node:fs';
import { basename } from 'node:path';
import { execOutput, ensureDir, findFiles, pathArg } from '../lib/utils';

interface ExtractOptions {
  output: string;
  patterns?: string[];
  verbose?: boolean;
}

/**
 * Extract files from JAR archives - just unzip preserving package structure
 */
export function extractJars(
  input: string,
  options: ExtractOptions,
): Promise<void> {
  const { output, patterns, verbose = false } = options;

  console.log(`🔧 JAR Extraction`);
  console.log(`   Input: ${input}`);
  console.log(`   Output: ${output}`);
  console.log(`   Patterns: ${patterns ? patterns.join(', ') : 'all files'}`);
  console.log('');

  // Find JAR files
  const jars = findFiles(input, '*.jar');

  if (jars.length === 0) {
    // Maybe input is a single JAR file
    if (input.endsWith('.jar') && existsSync(input)) {
      jars.push(input);
    } else {
      console.log('❌ No JAR files found');
      return Promise.resolve();
    }
  }

  console.log(`📦 Found ${jars.length} JAR files`);
  console.log('');

  // Clean and create output directory
  if (existsSync(output)) {
    rmSync(output, { recursive: true });
  }
  ensureDir(output);

  // Files to extract - no patterns = extract everything
  const fileArgs = patterns ?? [];

  for (const jar of jars) {
    const jarName = basename(jar);

    if (verbose) {
      console.log(`   📦 ${jarName}`);
    }

    try {
      // Just unzip, preserving directory structure
      execOutput('unzip', [
        '-o',
        '-q',
        pathArg(jar),
        ...fileArgs,
        '-d',
        pathArg(output),
      ]);
    } catch {
      // unzip returns non-zero if no matches, that's ok
    }
  }

  console.log('');
  console.log('✅ Extraction complete!');
  console.log(`   Output: ${output}`);
  return Promise.resolve();
}
