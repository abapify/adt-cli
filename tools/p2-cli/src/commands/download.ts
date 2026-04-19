import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { execOutput, ensureDir } from '../lib/utils';

interface Artifact {
  id: string;
  version: string;
  classifier: string;
}

interface DownloadOptions {
  output: string;
  filter?: string;
  extract?: boolean;
  extractOutput?: string;
  extractPatterns?: string[];
}

/**
 * Parse artifacts.xml from P2 repository
 */
function parseArtifacts(xml: string): Artifact[] {
  const artifacts: Artifact[] = [];
  const regex =
    /<artifact classifier='([^']+)' id='([^']+)' version='([^']+)'>/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    artifacts.push({
      classifier: match[1],
      id: match[2],
      version: match[3],
    });
  }

  return artifacts;
}

/**
 * Download P2 repository metadata and optionally plugins
 */
export async function download(
  repoUrl: string,
  options: DownloadOptions,
): Promise<void> {
  const { output, filter, extract, extractOutput, extractPatterns } = options;

  console.log(`🔧 P2 Repository Download`);
  console.log(`   Repository: ${repoUrl}`);
  console.log(`   Output: ${output}`);
  console.log('');

  ensureDir(output);

  // Always re-download metadata (small files, may have updates)
  const artifactsJar = join(output, 'artifacts.jar');
  console.log('📥 Downloading artifacts.jar...');
  execOutput(`wget -q "${repoUrl}/artifacts.jar" -O "${artifactsJar}"`);

  const contentJar = join(output, 'content.jar');
  console.log('📥 Downloading content.jar...');
  execOutput(`wget -q "${repoUrl}/content.jar" -O "${contentJar}"`);

  // Parse artifacts
  const xml = execOutput(`unzip -p "${artifactsJar}" artifacts.xml`);
  const artifacts = parseArtifacts(xml);
  const bundles = artifacts.filter((a) => a.classifier === 'osgi.bundle');

  console.log(`📋 Found ${bundles.length} plugins`);

  // Filter if specified
  let toDownload = bundles;
  if (filter) {
    const patterns = filter.split(',').map((p) => p.trim());
    toDownload = bundles.filter((a) =>
      patterns.some((p) => {
        if (p.includes('*')) {
          // Escape regex metacharacters in user-supplied filter before
          // expanding the glob wildcard. Prevents regex-injection when
          // the filter contains characters like '.', '+', '(' etc.
          const escaped = p.replace(/[.+?^${}()|[\]\\/]/g, '\\$&');
          const regex = new RegExp('^' + escaped.replace(/\*/g, '.*') + '$');
          return regex.test(a.id);
        }
        return a.id.startsWith(p);
      }),
    );
    console.log(
      `🎯 Filtered to ${toDownload.length} plugins matching: ${filter}`,
    );
  }

  if (toDownload.length === 0) {
    console.log('⚠️  No plugins to download');
    return;
  }

  // Download plugins
  const pluginsDir = join(output, 'plugins');
  ensureDir(pluginsDir);

  let downloaded = 0;
  let skipped = 0;

  for (let i = 0; i < toDownload.length; i++) {
    const artifact = toDownload[i];
    const fileName = `${artifact.id}_${artifact.version}.jar`;
    const targetPath = join(pluginsDir, fileName);

    process.stdout.write(
      `\r   Downloading ${i + 1}/${toDownload.length}: ${artifact.id.slice(0, 50).padEnd(50)}`,
    );

    if (existsSync(targetPath)) {
      skipped++;
      continue;
    }

    const url = `${repoUrl}/plugins/${fileName}`;
    try {
      execOutput(`wget -q "${url}" -O "${targetPath}"`);
      downloaded++;
    } catch {
      console.error(`\n   ❌ Failed: ${artifact.id}`);
    }
  }

  console.log('\n');
  console.log('✅ Download complete!');
  console.log(`   Downloaded: ${downloaded}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Location: ${pluginsDir}`);

  // Extract if requested
  if (extract) {
    const { extractJars } = await import('./extract');
    console.log('');
    await extractJars(pluginsDir, {
      output: extractOutput || join(output, 'extracted'),
      patterns: extractPatterns, // undefined = extract all
    });
  }
}
