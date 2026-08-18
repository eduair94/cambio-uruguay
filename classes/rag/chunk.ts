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

  // 1. Split the page into sections: one heading plus the text under it.
  const sections = toSections(page.text, title);

  // 2. Pack them. Measured on the real corpus, one-section-per-chunk produced 3 514 chunks of which
  //    47 % were under 400 characters — the site is full of FAQ pages and link directories where
  //    every item is its own heading, so `/alquilar-en-uruguay` alone became 72 chunks averaging 256
  //    characters and `/guias` became 116. That is bad twice over: each fragment costs one embedding
  //    out of a metered daily allowance, and a 256-character fragment carries too little context to
  //    answer anything with.
  //
  //    Packing only groups SIBLINGS — sections under the same parent heading — so a chunk never
  //    spans two unrelated parts of a page. Each packed section keeps its own heading inline, which
  //    matters most exactly where packing helps most: on a FAQ, the heading IS the question, and
  //    losing it would strand the answers.
  const chunks: PageChunk[] = [];
  let batch: Section[] = [];

  const flushBatch = (): void => {
    if (!batch.length) return;

    // One section: its own heading is already the tail of `headingPath`, so repeating it in the
    // text would just duplicate it into the embedding.
    //
    // Several: the chunk covers siblings, so its path is the shared PARENT and each section must
    // carry its own heading inline — otherwise the first one's heading is the one that disappears,
    // which on a directory page means losing the entry itself.
    const single = batch.length === 1;
    const text = batch
      .map((section) => (single || !section.heading ? section.body : `${section.heading}\n${section.body}`.trim()))
      .filter(Boolean)
      .join("\n")
      .trim();

    const headingPath = single ? batch[0]!.headingPath : parentOf(batch[0]!.headingPath) || title;
    if (text) chunks.push(make(headingPath, text, chunks.length));
    batch = [];
  };

  for (const section of sections) {
    // A section too big to pack is sliced on its own, exactly as before.
    if (section.body.length > CHUNK_CHARS) {
      flushBatch();
      for (const slice of sliceRun(section.body)) {
        if (slice) chunks.push(make(section.headingPath, slice, chunks.length));
      }
      continue;
    }

    const sameParent = batch.length === 0 || parentOf(batch[0]!.headingPath) === parentOf(section.headingPath);
    const packed = batch.reduce((n, s) => n + s.heading.length + s.body.length + 2, 0);
    if (!sameParent || packed + section.body.length > CHUNK_CHARS) flushBatch();
    batch.push(section);
  }
  flushBatch();

  return chunks;
}

interface Section {
  headingPath: string;
  /** The heading text alone, or "" for the lead paragraphs before the first heading. */
  heading: string;
  body: string;
}

/** Everything above the last `›`. Two sections with the same parent are siblings. */
const parentOf = (headingPath: string): string => headingPath.split(" › ").slice(0, -1).join(" › ");

/** The page, as heading-plus-body sections in document order. */
function toSections(text: string, title: string): Section[] {
  const stack: Array<string | undefined> = [title, undefined, undefined, undefined, undefined];
  const out: Section[] = [];
  let heading = "";
  let headingPath = headingPathOf(title, stack);
  let body: string[] = [];

  const push = (): void => {
    const joined = body.join("\n").trim();
    body = [];
    // A heading with nothing under it is still content on a directory page, where the heading IS
    // the entry; dropping it would erase the page.
    if (joined || heading) out.push({ headingPath, heading, body: joined });
  };

  for (const block of toBlocks(text)) {
    if (block.level > 0) {
      push();
      stack[block.level] = block.text;
      for (let deeper = block.level + 1; deeper < stack.length; deeper++) stack[deeper] = undefined;
      heading = block.text;
      headingPath = headingPathOf(title, stack);
      continue;
    }
    body.push(block.text);
  }
  push();

  return out.filter((section) => section.body || section.heading);
}
