import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import { execSync } from 'node:child_process';
import { ensureDir, findFiles } from '../lib/utils';

interface DecompileOptions {
  output: string;
  decompiler?: 'cfr' | 'procyon' | 'fernflower';
  filter?: string;
  verbose?: boolean;
}

const DECOMPILERS = {
  cfr: {
    name: 'CFR',
    check: 'which cfr-decompiler',
    command: (input: string, output: string) =>
      `cfr-decompiler "${input}" --outputdir "${output}"`,
    install:
      'brew install cfr-decompiler (macOS/Linux) or download from https://www.benf.org/other/cfr/',
  },
  procyon: {
    name: 'Procyon',
    check: 'which procyon',
    command: (input: string, output: string) =>
      `procyon -o "${output}" "${input}"`,
    install: 'Download from https://github.com/mstrobel/procyon',
  },
  fernflower: {
    name: 'Fernflower',
    check: 'test -f fernflower.jar',
    command: (input: string, output: string) =>
      `java -jar fernflower.jar "${input}" "${output}"`,
    install:
      'Find in IntelliJ IDEA: plugins/java-decompiler/lib/java-decompiler.jar',
  },
};

/**
 * Check if a decompiler is available
 */
function isDecompilerAvailable(decompiler: keyof typeof DECOMPILERS): boolean {
  try {
    execSync(DECOMPILERS[decompiler].check, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Find available decompiler
 */
function findDecompiler(): keyof typeof DECOMPILERS | null {
  for (const key of Object.keys(DECOMPILERS) as (keyof typeof DECOMPILERS)[]) {
    if (isDecompilerAvailable(key)) {
      return key;
    }
  }
  return null;
}

/**
 * Decompile Java class files or JAR files
 */
export async function decompile(
  input: string,
  options: DecompileOptions,
): Promise<void> {
  const {
    output,
    decompiler: requestedDecompiler,
    filter,
    verbose = false,
  } = options;

  console.log(`🔧 Java Decompilation`);
  console.log(`   Input: ${input}`);
  console.log(`   Output: ${output}`);
  console.log('');

  // Find or verify decompiler
  const decompiler = requestedDecompiler || findDecompiler();

  if (!decompiler) {
    console.log('❌ No Java decompiler found!');
    console.log('');
    console.log('Install one of these decompilers:');
    for (const [key, config] of Object.entries(DECOMPILERS)) {
      console.log(`   ${config.name}: ${config.install}`);
    }
    process.exit(1);
  }

  if (requestedDecompiler && !isDecompilerAvailable(requestedDecompiler)) {
    console.log(
      `❌ Requested decompiler '${requestedDecompiler}' is not available.`,
    );
    console.log(`   ${DECOMPILERS[requestedDecompiler].install}`);
    process.exit(1);
  }

  const config = DECOMPILERS[decompiler];
  console.log(`📦 Using decompiler: ${config.name}`);
  console.log('');

  ensureDir(output);

  // Check if input is a JAR file, directory with JARs, or directory with classes
  let jarFiles = findFiles(input, '*.jar');

  // Apply filter if specified
  if (filter && jarFiles.length > 0) {
    const patterns = filter.split(',').map((p) => p.trim());
    jarFiles = jarFiles.filter((jar) => {
      const jarName = basename(jar);
      return patterns.some((pattern) => {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(jarName);
      });
    });
    console.log(`🎯 Filtered to ${jarFiles.length} JARs matching: ${filter}`);
  }

  if (jarFiles.length > 0) {
    // Decompile JAR files directly (much faster)
    console.log(`🔍 Found ${jarFiles.length} JAR files`);
    console.log('');

    let success = 0;
    let failed = 0;

    for (let i = 0; i < jarFiles.length; i++) {
      const jar = jarFiles[i];
      const jarName = basename(jar, '.jar');

      process.stdout.write(
        `\r   Decompiling ${i + 1}/${jarFiles.length}: ${jarName.slice(0, 50).padEnd(50)}`,
      );

      try {
        const cmd = config.command(jar, output);
        execSync(cmd, { stdio: 'ignore' });
        success++;
      } catch {
        if (verbose) {
          console.error(`\n   ❌ Failed: ${jarName}`);
        }
        failed++;
      }
    }

    console.log('\n');
    console.log('✅ Decompilation complete!');
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Output: ${output}`);
  } else {
    // Decompile individual class files
    const classFiles = findFiles(input, '*.class');

    if (classFiles.length === 0) {
      console.log('❌ No JAR or class files found');
      return;
    }

    console.log(`🔍 Found ${classFiles.length} class files`);
    console.log('');

    let success = 0;
    let failed = 0;

    for (let i = 0; i < classFiles.length; i++) {
      const classFile = classFiles[i];

      if (verbose) {
        process.stdout.write(
          `\r   Decompiling ${i + 1}/${classFiles.length}: ${basename(classFile).slice(0, 50).padEnd(50)}`,
        );
      }

      try {
        const cmd = config.command(classFile, output);
        execSync(cmd, { stdio: 'ignore' });
        success++;
      } catch {
        failed++;
      }
    }

    console.log('\n');
    console.log('✅ Decompilation complete!');
    console.log(`   Success: ${success}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Output: ${output}`);
  }
}
