import { existsSync, rmSync } from 'node:fs';
import { basename } from 'node:path';
import { execOutput, ensureDir, findFiles } from '../lib/utils';

interface ExtractOptions {
  output: string;
  patterns?: string[];
  verbose?: boolean;
}

/**
 * Extract files from JAR archives - just unzip preserving package structure
 */
export async function extractJars(
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
      return;
    }
  }

  console.log(`📦 Found ${jars.length} JAR files`);
  console.log('');

  // Clean and create output directory
  if (existsSync(output)) {
    rmSync(output, { recursive: true });
  }
  ensureDir(output);

  // Build unzip command - no patterns = extract everything
  const patternArgs = patterns ? patterns.map((p) => `"${p}"`).join(' ') : '';

  for (const jar of jars) {
    const jarName = basename(jar);

    if (verbose) {
      console.log(`   📦 ${jarName}`);
    }

    try {
      // Just unzip, preserving directory structure
      execOutput(
        `unzip -o -q "${jar}" ${patternArgs} -d "${output}" 2>/dev/null || true`,
      );
    } catch {
      // unzip returns non-zero if no matches, that's ok
    }
  }

  console.log('');
  console.log('✅ Extraction complete!');
  console.log(`   Output: ${output}`);
}
