import { basename } from 'node:path';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { ensureDir, findFiles, pathArg } from '../lib/utils';

interface DecompileOptions {
  output: string;
  decompiler?: 'cfr' | 'procyon' | 'fernflower';
  filter?: string;
  verbose?: boolean;
}

/** Command as an argument vector — never interpolated through a shell. */
interface Command {
  file: string;
  args: string[];
}

const DECOMPILERS = {
  cfr: {
    name: 'CFR',
    check: (): void => {
      execFileSync('which', ['cfr-decompiler'], { stdio: 'ignore' });
    },
    command: (input: string, output: string): Command => ({
      file: 'cfr-decompiler',
      args: [pathArg(input), '--outputdir', pathArg(output)],
    }),
    install:
      'brew install cfr-decompiler (macOS/Linux) or download from https://www.benf.org/other/cfr/',
  },
  procyon: {
    name: 'Procyon',
    check: (): void => {
      execFileSync('which', ['procyon'], { stdio: 'ignore' });
    },
    command: (input: string, output: string): Command => ({
      file: 'procyon',
      args: ['-o', pathArg(output), pathArg(input)],
    }),
    install: 'Download from https://github.com/mstrobel/procyon',
  },
  fernflower: {
    name: 'Fernflower',
    // The IntelliJ plugin ships it as java-decompiler.jar; accepting both
    // names matches the install guidance shown below.
    jar: (): string => {
      for (const candidate of ['fernflower.jar', 'java-decompiler.jar']) {
        if (existsSync(candidate)) return candidate;
      }
      throw new Error('fernflower.jar not found');
    },
    check: (): void => {
      DECOMPILERS.fernflower.jar();
    },
    command: (input: string, output: string): Command => ({
      file: 'java',
      args: ['-jar', DECOMPILERS.fernflower.jar(), pathArg(input), pathArg(output)],
    }),
    install:
      'Find in IntelliJ IDEA: plugins/java-decompiler/lib/java-decompiler.jar',
  },
};

/**
 * Check if a decompiler is available
 */
function isDecompilerAvailable(decompiler: keyof typeof DECOMPILERS): boolean {
  try {
    DECOMPILERS[decompiler].check();
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
 * Match a name against a `*`-glob without building a RegExp: literal segments
 * must appear in order, with backtracking so a later occurrence can satisfy
 * the rest of the pattern. Every other character (including `?`) is literal.
 */
function matchesGlob(name: string, pattern: string): boolean {
  const star = pattern.indexOf('*');
  if (star === -1) return name === pattern;
  const head = pattern.slice(0, star);
  const tail = pattern.slice(star + 1);
  if (!name.startsWith(head)) return false;
  for (let cut = head.length; cut <= name.length; cut++) {
    if (matchesGlob(name.slice(cut), tail)) return true;
  }
  return false;
}

 * Keep only JARs whose basename matches one of the comma-separated glob
 * patterns in `filter`.
 */
function filterJars(jarFiles: string[], filter: string): string[] {
  const patterns = filter.split(',').map((p) => p.trim());
  return jarFiles.filter((jar) => {
    const jarName = basename(jar);
    return patterns.some((pattern) => matchesGlob(jarName, pattern));
  });
}

type DecompilerConfig = (typeof DECOMPILERS)[keyof typeof DECOMPILERS];

/** Run the decompiler on one input; `true` when it succeeded. */
function decompileOne(
  config: DecompilerConfig,
  input: string,
  output: string,
): boolean {
  try {
    const { file, args } = config.command(input, output);
    execFileSync(file, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Print the shared "Decompilation complete" summary. */
function reportDecompilation(
  success: number,
  failed: number,
  output: string,
): void {
  console.log('\n');
  console.log('✅ Decompilation complete!');
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}`);
  console.log(`   Output: ${output}`);
}

/** Decompile JAR files directly (much faster). */
function decompileJars(
  jarFiles: string[],
  config: DecompilerConfig,
  output: string,
  verbose: boolean,
): void {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < jarFiles.length; i++) {
    const jar = jarFiles[i];
    const jarName = basename(jar, '.jar');

    process.stdout.write(
      `\r   Decompiling ${i + 1}/${jarFiles.length}: ${jarName.slice(0, 50).padEnd(50)}`,
    );

    if (decompileOne(config, jar, output)) {
      success++;
    } else {
      if (verbose) {
        console.error(`\n   ❌ Failed: ${jarName}`);
      }
      failed++;
    }
  }

  reportDecompilation(success, failed, output);
}

/** Decompile individual class files. */
function decompileClasses(
  classFiles: string[],
  config: DecompilerConfig,
  output: string,
  verbose: boolean,
): void {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < classFiles.length; i++) {
    const classFile = classFiles[i];

    if (verbose) {
      process.stdout.write(
        `\r   Decompiling ${i + 1}/${classFiles.length}: ${basename(classFile).slice(0, 50).padEnd(50)}`,
      );
    }

    if (decompileOne(config, classFile, output)) success++;
    else failed++;
  }

  reportDecompilation(success, failed, output);
}

/**
 * Decompile Java class files or JAR files
 */
export function decompile(
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
    for (const [_key, config] of Object.entries(DECOMPILERS)) {
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
    jarFiles = filterJars(jarFiles, filter);
    console.log(`🎯 Filtered to ${jarFiles.length} JARs matching: ${filter}`);
  }

  if (jarFiles.length > 0) {
    console.log(`🔍 Found ${jarFiles.length} JAR files`);
    console.log('');
    decompileJars(jarFiles, config, output, verbose);
  } else {
    // Decompile individual class files
    const classFiles = findFiles(input, '*.class');

    if (classFiles.length === 0) {
      console.log('❌ No JAR or class files found');
      return Promise.resolve();
    }

    console.log(`🔍 Found ${classFiles.length} class files`);
    console.log('');
    decompileClasses(classFiles, config, output, verbose);
  }
  return Promise.resolve();
}
