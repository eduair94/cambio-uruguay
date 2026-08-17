// Shared shapes for the site RAG index.
//
// The index answers one question: "which page of cambio-uruguay.com already answers this?" —
// asked by the Reddit bot against a stranger's post. Everything here is built for that: a chunk
// carries enough text to ground a two-sentence answer, and enough provenance (url + heading path)
// that the answer can cite exactly one link and the composer can be forbidden from inventing
// anything the chunk does not say.

/** How deeply a URL gets indexed. See `sources.ts` for the classification rules. */
export type PageTier =
  /** Editorial pages, guides, tools: full text, chunked. */
  | "full"
  /** Programmatic families (one page per branch / per casa / per comparison): title + description only. */
  | "stub";

/** One crawled page, before chunking. */
export interface CrawledPage {
  /** Site-relative path, always starting with `/` and without a trailing slash (except the root). */
  path: string;
  tier: PageTier;
  title: string;
  description: string;
  h1: string;
  /** Main-content text with heading markers kept inline as `\n## <heading>\n`. */
  text: string;
  /** `lastmod` as published by the sitemap, ISO-8601. Drives incremental recrawl. */
  lastmod: string;
  crawledAt: Date;
}

/** One indexable unit: a slice of a page's text, plus the vector for it. */
export interface RagChunk {
  path: string;
  tier: PageTier;
  chunkIndex: number;
  /** Page title, kept on the chunk so retrieval never has to join back to the page. */
  title: string;
  /** `Título › Sección › Subsección` for the slice, prepended to the embedded text. */
  headingPath: string;
  /** The slice itself, WITHOUT the heading prefix (that is only for the embedding). */
  text: string;
  /** sha1 of `headingPath + text`. A chunk whose hash is unchanged is never re-embedded. */
  contentHash: string;
  /**
   * L2-normalised embedding, length `RAG_EMBED_DIMS` — or EMPTY for a chunk that is indexed
   * lexically only.
   *
   * Stub chunks are deliberately left unembedded: the embedding quota is metered per day (1 000
   * requests on the free tier, and every item of a batch counts as one), and spending 40 % of the
   * corpus budget on 1 900 templated one-line titles buys almost nothing — those are won by BM25 on
   * the department or casa name. An empty vector means "skip me in the dense arm", not "broken".
   */
  vector: Float32Array;
  lastmod: string;
}

/** A chunk as it comes back from retrieval, with its score. */
export interface ScoredChunk {
  chunk: RagChunk;
  /** Fused rank score (RRF). Not a cosine — comparable only against other chunks of the same query. */
  score: number;
  /** The raw cosine, kept for diagnostics and for the "is this remotely on topic" sanity gate. */
  cosine: number;
}

/** A page as retrieval reports it: the aggregate of its chunks. */
export interface RetrievedPage {
  path: string;
  title: string;
  tier: PageTier;
  /** Aggregate score: the best chunk, plus a decaying bonus for further chunks of the same page. */
  score: number;
  /** Best cosine over the page's chunks. */
  cosine: number;
  /** The page's matching chunks, best first, capped by the caller. */
  chunks: ScoredChunk[];
}
