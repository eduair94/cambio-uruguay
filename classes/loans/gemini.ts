// Daily Gemini-grounded TEA lookup for lenders with no regex parser (scraper.ts only covers
// oca/pronto/cash). Same client/guardrail/graceful-null pattern as every other backend Gemini
// caller (classes/gemini.ts). Additionally requires the grounding citation's RESOLVED hostname to
// match the lender's own domain, so an unrelated page's rate can never be attributed to this
// lender.
//
// Port of app/server/utils/loanGeminiRate.ts, with ONE deliberate change: the host gate compares
// against the RESOLVED url (classes/gemini.ts#askGrounded already resolved Google's redirect
// wrapper), not `chunk.web.title` — see classes/gemini.ts's own comment: title is the source
// domain only by convention, is not verified, and is not a security boundary. The app's version
// trusted `web.title` as if it were a checked hostname, which it never was.
import { askGrounded, geminiConfigured, groundedHeadlines } from "../gemini";
import type { LoanLender } from "./catalog";
import { TEA_MAX, TEA_MIN, toNum } from "./scraper";

export interface GeminiRateResult {
  teaPct: number;
  sourceUrl: string;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

function buildPrompt(lender: Pick<LoanLender, "name" | "website">): string {
  return (
    `Buscá la Tasa Efectiva Anual (TEA) actual publicada para un préstamo personal/de consumo de ` +
    `"${lender.name}" en Uruguay (sitio ${lender.website}). ` +
    `Respondé en una sola línea, exactamente en este formato: "TEA: <numero>%". ` +
    `Usá solo un número que hayas encontrado en una búsqueda real y citable, en el propio sitio del ` +
    `prestamista o una fuente que lo confirme — no inventes. ` +
    `Si no encontrás una TEA publicada y verificable, respondé exactamente "TEA: NO ENCONTRADO".`
  );
}

/**
 * Grounded Gemini lookup for one lender's advertised TEA. Returns null on missing config, any
 * network/parse failure, an implausible value, or a citation whose RESOLVED url doesn't match the
 * lender's own domain — the caller (refresh.ts) keeps the prior stored value in every null case.
 */
export async function fetchLenderRateFromGemini(
  lender: Pick<LoanLender, "id" | "name" | "website" | "source">
): Promise<GeminiRateResult | null> {
  if (!geminiConfigured()) return null;

  const reply = await askGrounded(buildPrompt(lender));
  if (!reply) return null;

  const match = reply.text.match(/TEA:\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*%/i);
  if (!match) return null;

  const teaPct = toNum(match[1]!);
  if (!Number.isFinite(teaPct) || teaPct < TEA_MIN || teaPct > TEA_MAX) return null;

  // Ask for headlines up to every chunk the model cited — this is a host check, not a display
  // list, so nothing should be silently dropped by the default limit.
  const headlines = groundedHeadlines(reply, Math.max(reply.chunks?.length ?? 0, 1));
  if (headlines.length === 0) return null;

  const expectedHosts = [hostnameOf(lender.website), hostnameOf(lender.source)].filter(Boolean);
  const cited = headlines.find((h) => expectedHosts.includes(hostnameOf(h.link)));
  if (!cited) return null;

  return { teaPct, sourceUrl: cited.link };
}
