// Daily fallback chain across every lender: the cheap/precise regex parser first (oca/pronto/cash),
// then a Gemini-grounded lookup for everyone else (or when the parser attempt didn't succeed). Both
// paths degrade to ok:false rather than throwing — classes/loans/store.ts leaves the prior value
// untouched. Verbatim port of app/server/utils/loanRateRefresh.ts.
import { LOAN_LENDERS, lenderIds } from "./catalog";
import { fetchLenderRateFromGemini } from "./gemini";
import { scrapeAllLenderRates, TEA_PARSERS } from "./scraper";

export interface LenderRateResult {
  id: string;
  teaPct: number | null;
  ok: boolean;
  method: "regex" | "gemini";
  sourceUrl?: string;
}

export async function refreshAllLenderRates(): Promise<LenderRateResult[]> {
  const regexResults = await scrapeAllLenderRates();
  const regexById = new Map(regexResults.map((r) => [r.id, r]));
  const lenderById = new Map(LOAN_LENDERS.map((l) => [l.id, l]));

  return Promise.all(
    lenderIds().map(async (id): Promise<LenderRateResult> => {
      const regex = regexById.get(id);
      if (regex?.ok && regex.teaPct != null) {
        return { id, teaPct: regex.teaPct, ok: true, method: "regex", sourceUrl: TEA_PARSERS[id]?.url };
      }

      const lender = lenderById.get(id)!;
      const gemini = await fetchLenderRateFromGemini(lender);
      if (gemini) {
        return { id, teaPct: gemini.teaPct, ok: true, method: "gemini", sourceUrl: gemini.sourceUrl };
      }

      return { id, teaPct: null, ok: false, method: id in TEA_PARSERS ? "regex" : "gemini" };
    })
  );
}
