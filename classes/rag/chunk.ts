// Cut a crawled page into embeddable slices.
//
// Two rules earn their keep here.
//
// 1. Every slice is prefixed, FOR THE EMBEDDING ONLY, with its heading path
//    ("Importar para revender › El 60% › Quién lo cobra"). A slice torn out of the middle of a
//    long guide often reads as a pronoun soup — "en ese caso se paga al courier" — and embeds as
//    noise. The heading path is the cheapest possible restoration of what "ese caso" was.
//
// 2. The prefix is NOT part of `text`. `text` is what the composer is allowed to quote and what
//    the no-invented-number gate checks against, so it must be exactly what the page says — a
//    heading duplicated into the body would let a number from one section vouch for a claim in
//    another.

import { sha1 } from "./crawl";
import type { CrawledPage } from "./types";

/** Target slice size. ~1 100 characters is 3-4 sentences of this site's prose: one answerable idea. */
export const CHUNK_CHARS = 1100;
/** Overlap, so a fact that straddles a cut survives in one piece on at least one side. */
export const CHUNK_OVERLAP = 180;
/** Below this a slice is a fragment; it gets folded into the previous one instead of standing alone. */
const MIN_CHUNK_CHARS = 120;

export interface PageChunk {
  path: string;
  tier: CrawledPage["tier"];
  chunkIndex: number;
  title: string;
  headingPath: string;
  text: string;
  contentHash: string;
  lastmod: string;
  /** What actually gets embedded: `headingPath` + blank line + `text`. */
  embedInput: string;
}

interface Block {
  /** 0 for body text, 1-4 for h1-h4. */
  level: number;
  text: string;
}

/** Split the extractor's output back into headings and paragraphs. */
function toBlocks(text: string): Block[] {
  const out: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      out.push({ level: heading[1]!.length, text: heading[2]!.trim() });
      continue;
    }
    out.push({ level: 0, text: line });
  }
  return out;
}

/** `Título › H2 › H3` for the current position in the document. */
function headingPathOf(title: string, stack: ReadonlyArray<string | undefined>): string {
  return [title, ...stack.slice(1).filter((h): h is string => !!h)].filter(Boolean).join(" › ");
}

/**
 * Break one body run into ~CHUNK_CHARS pieces on sentence boundaries where possible.
 *
 * Cutting mid-sentence is worse than an oversized chunk: the tail of a truncated sentence is the
 * half most likely to contain the qualifier ("…salvo que el envío supere los 20 kg"), and a
 * composer handed a chunk that stops before the qualifier will confidently drop it.
 */
function sliceRun(run: string): string[] {
  if (run.length <= CHUNK_CHARS) return [run];

  const sentences = run.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) ?? [run];
  const out: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current && current.length + sentence.length > CHUNK_CHARS) {
      out.push(current.trim());
      // Carry the tail of the finished chunk into the next one.
      const carry = current.slice(-CHUNK_OVERLAP);
      const boundary = carry.search(/[.!?]\s/);
      current = (boundary >= 0 ? carry.slice(boundary + 2) : carry).trimStart();
    }
    current += sentence;
    // A single sentence longer than the target (a table row dump, a long enumeration) still has to
    // be cut somewhere; a hard slice is the only option left, and it is rare.
    while (current.length > CHUNK_CHARS * 1.6) {
      out.push(current.slice(0, CHUNK_CHARS).trim());
      current = current.slice(CHUNK_CHARS - CHUNK_OVERLAP);
    }
  }
  if (current.trim()) out.push(current.trim());
  return out.filter(Boolean);
}

/**
 * A page's chunks.
 *
 * A `stub` page yields exactly one chunk built from its title and description — that is the whole
 * point of the tier (see sources.ts).
 */
export function chunkPage(page: CrawledPage): PageChunk[] {
  const title = page.title || page.h1 || page.path;
  const make = (headingPath: string, text: string, chunkIndex: number): PageChunk => {
    const embedInput = `${headingPath}\n\n${text}`;
    return {
      path: page.path,
      tier: page.tier,
      chunkIndex,
      title,
      headingPath,
      text,
      contentHash: sha1(embedInput),
      lastmod: page.lastmod,
      embedInput,
    };
  };

  if (page.tier === "stub" || !page.text.trim()) {
    const text = [page.description, page.h1 && page.h1 !== title ? page.h1 : ""].filter(Boolean).join(" ").trim();
    if (!title && !text) return [];
    return [make(title, text || title, 0)];
  }

  const blocks = toBlocks(page.text);
  const stack: Array<string | undefined> = [title, undefined, undefined, undefined, undefined];
  const chunks: PageChunk[] = [];
  let run: string[] = [];
  let runHeading = headingPathOf(title, stack);

  const flush = (): void => {
    const body = run.join("\n").trim();
    run = [];
    if (!body) return;
    for (const slice of sliceRun(body)) {
      if (!slice) continue;
      const last = chunks[chunks.length - 1];
      // Fold a runt into its predecessor rather than embedding a fragment of its own.
      if (slice.length < MIN_CHUNK_CHARS && last && last.headingPath === runHeading) {
        const merged = `${last.text}\n${slice}`;
        chunks[chunks.length - 1] = make(last.headingPath, merged, last.chunkIndex);
        continue;
      }
      chunks.push(make(runHeading, slice, chunks.length));
    }
  };

  for (const block of blocks) {
    if (block.level > 0) {
      flush();
      stack[block.level] = block.text;
      for (let deeper = block.level + 1; deeper < stack.length; deeper++) stack[deeper] = undefined;
      runHeading = headingPathOf(title, stack);
      continue;
    }
    run.push(block.text);
  }
  flush();

  // Re-number: `flush` merges runts, which can leave gaps.
  return chunks.map((chunk, index) => (chunk.chunkIndex === index ? chunk : { ...chunk, chunkIndex: index }));
}
