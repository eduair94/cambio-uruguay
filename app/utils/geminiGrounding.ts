export interface GroundingChunk {
  web?: { uri?: string; title?: string }
}

export interface GroundingSupport {
  segment: { text: string; startIndex?: number; endIndex: number }
  groundingChunkIndices: number[]
}

export interface GroundedHeadline {
  title: string
  source: string
  link: string
}

const stripWww = (domain: string): string => domain.replace(/^www\./i, '')

const truncate = (text: string, max: number): string =>
  text.length > max ? text.slice(0, max - 3) + '...' : text

/**
 * Gemini's groundingChunks[].web.title is just the bare domain, not the
 * source's actual headline — there is no headline field in this API. Build
 * an honest title substitute from groundingSupports: the segment of the
 * model's own (grounded) narrative that cites this chunk most specifically
 * (fewest total chunks on that segment; earliest wins ties). Falls back to
 * the domain itself when no segment covers the chunk.
 */
export function extractGroundedHeadlines(
  chunks: GroundingChunk[],
  supports: GroundingSupport[],
  limit = 3
): GroundedHeadline[] {
  const bestSupportForChunk = new Map<number, GroundingSupport>()
  for (const support of supports) {
    for (const idx of support.groundingChunkIndices) {
      const current = bestSupportForChunk.get(idx)
      if (!current || support.groundingChunkIndices.length < current.groundingChunkIndices.length) {
        bestSupportForChunk.set(idx, support)
      }
    }
  }

  const out: GroundedHeadline[] = []
  chunks.forEach((chunk, idx) => {
    const uri = chunk.web?.uri
    if (!uri) return
    const domain = stripWww(chunk.web?.title ?? '')
    const rawTitle = bestSupportForChunk.get(idx)?.segment.text?.trim()
    const title = truncate(rawTitle || domain, 140)
    out.push({ title, source: domain, link: uri })
  })
  return out.slice(0, limit)
}

/** True when Gemini's text reply signals it found nothing real (case-insensitive prefix match). */
export function isNoNewsText(text: string): boolean {
  return /^\s*sin noticias/i.test(text)
}
