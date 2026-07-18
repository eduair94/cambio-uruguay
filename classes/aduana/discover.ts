// Deterministic discovery: read the official 2026 Resoluciones Generales index and diff its RG
// NUMBERS against the ones we already cite. A candidate is a NEW resolución general we do not yet
// reference — the AI interprets it downstream (norms.ts) but can never invent one, because it must
// appear on an index page we actually fetched.
//
// WHY keyed on the RG number, and why only this index: the seller-registry enforcement date has been
// moved by RESOLUCIÓN GENERAL twice already (RG 12/2026 → 1/7, RG 21/2026 → 1/10). The next prórroga,
// or a new condition, will almost certainly arrive the same way, and the Aduanas 2026 RG list is the
// one clean, enumerable channel for it. The list links per-RG DETAIL pages (…/resolucion-general-NN),
// not the PDFs — and our stored sources hold PDF URLs — so diffing URLs would flag all 24 every week.
// Diffing NUMBERS is the honest signal: "is there an RG we don't cite yet?" Decretos are not on a
// clean index and typically surface through the MEF FAQ the weekly norms re-check already reads.
//
// The 2026 list itself is reached in two hops from the RG landing (v/27953 → v/28211); we go straight
// to the leaf. If Aduanas renumbers the leaf, discoverNewNorms returns [] (a fetch miss is never fatal)
// and the norms re-check still runs — discovery only ADDS candidates, it never gates anything.

/** The 2026 Resoluciones Generales list (leaf page), verified live 2026-07-18. */
export const RG_INDEX_URL =
  "https://www.aduanas.gub.uy/innovaportal/v/28211/8/innova.front/2026.html";

/** Matches a per-RG detail link and captures its number: …/resolucion-general-21 → "21". */
const RG_LINK = /href=['"]([^'"]*\/innova\.front\/resolucion-general-(\d+)[^'"]*)['"]/gi;

/** A resolución general the index lists but we may not yet cite. */
export interface NormCandidate {
  url: string; // absolute detail-page URL
  number: string; // RG number, leading zeros stripped ("09" → "9")
  title: string; // "RG DNA 9/2026"
}

/** Every RG detail link on the index, one per number (last occurrence wins), absolutised. */
export function extractRgLinks(html: string, baseUrl: string): NormCandidate[] {
  const byNumber = new Map<string, NormCandidate>();
  let m: RegExpExecArray | null;
  RG_LINK.lastIndex = 0;
  while ((m = RG_LINK.exec(html)) !== null) {
    const number = String(parseInt(m[2], 10));
    if (!Number.isFinite(Number(number))) continue;
    try {
      const url = new URL(m[1], baseUrl).toString();
      byNumber.set(number, { url, number, title: `RG DNA ${number}/2026` });
    } catch {
      /* an unparseable href is not a candidate */
    }
  }
  return [...byNumber.values()];
}

/**
 * RG numbers we already reference, parsed from source `norm` strings like "RG DNA 21/2026". This is
 * how discovery knows what is NOT new without threading our full source list through the diff.
 */
export function knownRgNumbers(norms: string[]): string[] {
  const out: string[] = [];
  for (const n of norms) {
    const m = /RG\s+(?:DNA\s+)?0*(\d+)\/2026/i.exec(n);
    if (m) out.push(String(parseInt(m[1], 10)));
  }
  return out;
}

/**
 * Fetch the 2026 RG index and return only resoluciones NEWER than the latest we already cite
 * (number greater than max(knownNumbers)). Forward-looking on purpose: RGs are sequential, the
 * regime's prórrogas have marched 12 → 21, and the next one will be a higher number — so "newer than
 * our latest citation" is the low-noise signal for "something we might have to react to", instead of
 * flagging every unrelated older RG we happen not to cite. Never throws: a network error or a
 * non-200 yields [] — discovery is additive, so a miss must degrade to "nothing new", never sink the
 * weekly job.
 */
export async function discoverNewNorms(
  knownNumbers: string[],
  fetchImpl: typeof fetch = fetch
): Promise<NormCandidate[]> {
  const maxKnown = knownNumbers.reduce((mx, n) => Math.max(mx, parseInt(n, 10) || 0), 0);
  try {
    const res = await fetchImpl(RG_INDEX_URL);
    if (!res.ok) return [];
    const html = await res.text();
    return extractRgLinks(html, RG_INDEX_URL).filter((c) => Number(c.number) > maxKnown);
  } catch {
    return [];
  }
}
