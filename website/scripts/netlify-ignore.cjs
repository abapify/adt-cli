#!/usr/bin/env node
/**
 * Netlify ignore script for the Docusaurus site under website/.
 *
 * Exit 0  -> skip the build (no deploy preview/production build needed).
 * Exit 1  -> run the build (website/ or netlify.toml changed).
 *
 * The script is executed by Netlify from the `website/` base directory.
 */

const { spawnSync } = require('node:child_process');
const https = require('node:https');

const CONTEXT = process.env.CONTEXT || '';
const IS_PULL_REQUEST = process.env.PULL_REQUEST === 'true';
const REVIEW_ID = process.env.REVIEW_ID || '';
const COMMIT_REF = process.env.COMMIT_REF || '';
const CACHED_COMMIT_REF = process.env.CACHED_COMMIT_REF || '';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

const REPO = 'abapify/adt-cli';

function hasWebsiteRelevantPath(filePath) {
  if (!filePath) return false;
  return filePath === 'netlify.toml' || filePath.startsWith('website/');
}

function gitDiffChangedFiles(refA, refB) {
  const result = spawnSync(
    '/usr/bin/git',
    ['diff', '--name-only', refA, refB, '--', '.', '../netlify.toml'],
    {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, PATH: '/usr/local/bin:/usr/bin:/bin' },
      shell: false,
    },
  );
  if (result.error || result.status !== 0) {
    return null;
  }
  return result.stdout.trim().split('\n').filter(Boolean);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = { headers: { 'User-Agent': 'netlify-ignore-script' } };
    if (GITHUB_TOKEN) {
      options.headers.Authorization = `token ${GITHUB_TOKEN}`;
    }
    https
      .get(url, options, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`GitHub API returned ${res.statusCode}`));
          return;
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      })
      .on('error', reject);
  });
}

async function prTouchesWebsite() {
  const reviewId = Number(REVIEW_ID);
  if (!Number.isInteger(reviewId) || reviewId <= 0) {
    throw new Error(`Invalid REVIEW_ID: ${REVIEW_ID}`);
  }
  const pageSize = 100;
  let page = 1;
  while (true) {
    const files = await fetchJson(
      `https://api.github.com/repos/${REPO}/pulls/${reviewId}/files?per_page=${pageSize}&page=${page}`,
    );
    if (!Array.isArray(files) || files.length === 0) return false;
    for (const file of files) {
      if (hasWebsiteRelevantPath(file.filename)) return true;
    }
    if (files.length < pageSize) return false;
    page += 1;
  }
}

async function main() {
  // Fast path: we have two distinct cached refs. If nothing in website/ or
  // netlify.toml changed, skip the build.
  if (COMMIT_REF && CACHED_COMMIT_REF && CACHED_COMMIT_REF !== COMMIT_REF) {
    const files = gitDiffChangedFiles(CACHED_COMMIT_REF, COMMIT_REF);
    if (files?.length > 0) {
      console.log(
        `Building: ${files.length} change(s) in website/ or netlify.toml`,
      );
      process.exit(1);
    }
    if (files?.length === 0) {
      console.log(
        'Skipping: no website/ or netlify.toml changes since the last build',
      );
      process.exit(0);
    }
    // git diff failed; fall through to PR API or default build.
  }

  // For pull/merge request previews, ask GitHub which files changed.
  if ((IS_PULL_REQUEST || CONTEXT === 'deploy-preview') && REVIEW_ID) {
    try {
      const touches = await prTouchesWebsite();
      if (!touches) {
        console.log(
          'Skipping deploy preview: PR does not touch website/ or netlify.toml',
        );
        process.exit(0);
      }
      console.log(
        'Building deploy preview: PR touches website/ or netlify.toml',
      );
      process.exit(1);
    } catch (err) {
      // If we cannot determine the changed files, build to be safe.
      console.warn(
        `Could not determine PR changed files (${err.message}); building to be safe`,
      );
      process.exit(1);
    }
  }

  // Production / branch-deploy without useful cached refs or PR info: build.
  console.log('Building: no cached diff or PR information available');
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
