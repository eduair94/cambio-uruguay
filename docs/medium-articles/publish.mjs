#!/usr/bin/env node
/**
 * Publish the Medium articles in this folder via Medium's API.
 *
 * Medium no longer issues NEW integration tokens and dropped official API
 * support, but EXISTING tokens still work for creating posts (verified 2026).
 *
 * Get a token: medium.com -> Settings -> "Security and apps" -> Integration
 * tokens -> enter a description -> "Get integration token".
 *
 * Usage (PowerShell):
 *   $env:MEDIUM_TOKEN = "xxxxx"
 *   node docs/medium-articles/publish.mjs                 # all 3 files as DRAFTS
 *   node docs/medium-articles/publish.mjs --publish       # publish PUBLIC (careful)
 *   node docs/medium-articles/publish.mjs es-dolar-hoy-uruguay.md
 *   node docs/medium-articles/publish.mjs --canonical https://cambio-uruguay.com/blog/...
 *
 * Usage (bash):
 *   MEDIUM_TOKEN=xxxxx node docs/medium-articles/publish.mjs
 *
 * Defaults to DRAFT. Nothing goes public unless you pass --publish.
 * The token is a write-credential to your Medium account: keep it in the env
 * var only. Do NOT commit it or paste it anywhere.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, isAbsolute } from 'node:path';

const argv = process.argv.slice(2);
const publish = argv.includes('--publish');
const dryRun = argv.includes('--dry-run');

const TOKEN = process.env.MEDIUM_TOKEN;
if (!TOKEN && !dryRun) {
  console.error('ERROR: set the MEDIUM_TOKEN env var first (your Medium integration token).');
  process.exit(1);
}
const canonIdx = argv.indexOf('--canonical');
const canonicalUrl = canonIdx !== -1 ? argv[canonIdx + 1] : null;
const fileArgs = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--canonical');

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULTS = [
  'es-dolar-hoy-uruguay.md',
  'pt-cotacao-dolar-uruguai.md',
  'en-exchange-rates-uruguay.md',
];
const targets = (fileArgs.length ? fileArgs : DEFAULTS).map((f) =>
  isAbsolute(f) ? f : join(here, basename(f)),
);

/** Pull title, tags, and article body (strips the meta front-block + footer). */
function parse(md) {
  const titleMatch = md.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled';

  const tagsLine = md.match(/\*\*[^*]*tags[^*]*:\*\*\s*(.+)/i);
  const tags = tagsLine
    ? tagsLine[1].split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5)
    : [];

  // Files are: <title + meta block>  ---  <article body>  ---  <footer>
  const parts = md.split(/\n---\n/);
  const body =
    parts.length >= 3
      ? parts.slice(1, -1).join('\n---\n').trim()
      : parts.slice(1).join('\n---\n').trim() || md;

  // Prepend the title as an H1 so it renders visibly in the Medium post.
  const content = `# ${title}\n\n${body}`;
  return { title, tags, content };
}

async function main() {
  // 1. Resolve the author id from the token (skipped on dry-run).
  let me = { id: 'DRY-RUN', username: 'dry-run', name: 'dry-run' };
  if (!dryRun) {
    const meRes = await fetch('https://api.medium.com/v1/me', {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' },
    });
    if (!meRes.ok) {
      console.error(`Auth failed: ${meRes.status} ${await meRes.text()}`);
      process.exit(1);
    }
    me = (await meRes.json()).data;
    console.log(`Authenticated as @${me.username} (${me.name}) [${me.id}]`);
  }
  console.log(`Mode: ${publish ? 'PUBLIC' : 'DRAFT'}${dryRun ? ' (dry-run)' : ''}\n`);

  // 2. Create one post per file.
  for (const path of targets) {
    let md;
    try {
      md = await readFile(path, 'utf8');
    } catch {
      console.error(`✗ ${basename(path)} → file not found`);
      continue;
    }
    const { title, tags, content } = parse(md);
    const payload = {
      title,
      contentFormat: 'markdown',
      content,
      tags, // Medium uses only the first 3
      publishStatus: publish ? 'public' : 'draft',
      notifyFollowers: false,
      ...(canonicalUrl ? { canonicalUrl } : {}),
    };

    if (dryRun) {
      console.log(`• ${basename(path)}`);
      console.log(`    title: ${title}`);
      console.log(`    tags:  ${tags.join(', ')} (first 3 used)`);
      console.log(`    body:  ${content.length} chars\n`);
      continue;
    }

    const res = await fetch(`https://api.medium.com/v1/users/${me.id}/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const txt = await res.text();
    if (!res.ok) {
      console.error(`✗ ${basename(path)} → ${res.status} ${txt}`);
      continue;
    }
    const data = JSON.parse(txt).data;
    console.log(`✓ ${basename(path)} → ${data.publishStatus}: ${data.url}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
