#!/usr/bin/env node
/**
 * Convert the article markdown files -> paste-ready HTML for Medium.
 *
 * Medium's editor does NOT parse raw markdown, but it DOES convert pasted rich
 * HTML into its own formatting (headings, bold, links, lists, quotes). So:
 *   1. node docs/medium-articles/export-html.mjs
 *   2. open the generated <lang>.html in your (logged-in) browser
 *   3. Ctrl+A, Ctrl+C
 *   4. medium.com -> "Write" -> click in the body -> Ctrl+V
 *   5. the first H1 becomes the post title automatically; set tags; publish.
 *
 * No network, no token, nothing published. Pure local conversion.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, basename } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..');
// marked lives in app/node_modules
const appRequire = createRequire(pathToFileURL(join(repoRoot, 'app', 'package.json')));
const { marked } = appRequire('marked');

const FILES = [
  'es-dolar-hoy-uruguay.md',
  'pt-cotacao-dolar-uruguai.md',
  'en-exchange-rates-uruguay.md',
];

/** Same extraction as publish.mjs: title + body, strip meta front-block + footer. */
function parse(md) {
  const title = (md.match(/^#\s+(.+)$/m)?.[1] || 'Untitled').trim();
  const parts = md.split(/\n---\n/);
  const body =
    parts.length >= 3
      ? parts.slice(1, -1).join('\n---\n').trim()
      : parts.slice(1).join('\n---\n').trim() || md;
  return { title, body };
}

for (const f of FILES) {
  const md = await readFile(join(here, f), 'utf8');
  const { title, body } = parse(md);
  // First H1 = title (Medium picks it up as the post title on paste).
  const articleHtml = marked.parse(`# ${title}\n\n${body}`);
  const page = `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>body{max-width:720px;margin:2rem auto;padding:0 1rem;font:18px/1.6 -apple-system,Segoe UI,Roboto,sans-serif}</style>
</head><body>
${articleHtml}
</body></html>`;
  const out = join(here, f.replace(/\.md$/, '.html'));
  await writeFile(out, page, 'utf8');
  console.log(`✓ ${basename(out)}`);
}
console.log('\nOpen each .html, select all, copy, paste into a new Medium story.');
