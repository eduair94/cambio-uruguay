// Monthly self-updating layer for /saldar-deudas-uruguay. Refreshes the two volatile BCU
// usury-cap figures (con/sin autorización de descuento, < 10.000 UI) via grounded search. Only
// the validated caps are returned/stored — refiRates and period are static page content that
// stay in the app (app/utils/debtRelief.ts).
//
// Moved out of the Nuxt app (server/utils/debtReliefLive.ts). Same endpoint + graceful-null +
// guardrail-band pattern as classes/costs/refresh.ts.
import { askGrounded, geminiConfigured, groundedHeadlines } from "../gemini";
import { applyLiveCaps, BASELINE_CAPS, type UsuryCap } from "./bands";

export interface LiveDebtRelief {
  usuryCaps: UsuryCap[];
  /** ISO timestamp of the last successful refresh, or null when nothing usable was found. */
  asOf: string | null;
  updated: string[];
  sources: Array<{ label: string; url: string }>;
}

const PROMPT = `Buscá con búsqueda real y citable los topes de usura vigentes que publica el Banco Central del Uruguay (Ley 18.212, "Tasas medias de interés") para crédito al CONSUMO de familias, en moneda nacional no reajustable, hasta 366 días, tramo menor a 10.000 UI. Necesito la TASA MÁXIMA (tope) efectiva anual, en porcentaje:
1. Con autorización de descuento (retención de haberes): tope de tasa y tope de mora.
2. Sin autorización de descuento: tope de tasa y tope de mora.
Respondé SOLO con un objeto JSON válido, sin texto ni markdown, con números en porcentaje sin el signo %:
{"topeConDescuento": <num>, "moraConDescuento": <num>, "topeSinDescuento": <num>, "moraSinDescuento": <num>}
Usá solo valores hallados en una búsqueda real (idealmente bcu.gub.uy). Si un dato no lo encontrás, poné null. No inventes.`;

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function baselineDebtRelief(): LiveDebtRelief {
  return {
    usuryCaps: BASELINE_CAPS.map((c) => ({ ...c })),
    asOf: null,
    updated: [],
    sources: [],
  };
}

/**
 * Fetch + validate live usury caps. Returns the merged caps, or the pure baseline (asOf: null)
 * when the key is missing, the reply is unparseable, or nothing passed a band.
 */
export async function refreshLiveDebtRelief(): Promise<LiveDebtRelief> {
  const baseline = baselineDebtRelief();
  if (!geminiConfigured()) return baseline;

  const reply = await askGrounded(PROMPT);
  if (!reply) return baseline;

  const data = parseJsonLoose(reply.text);
  if (!data) return baseline;

  const { caps, updated } = applyLiveCaps({ usuryCaps: BASELINE_CAPS }, data);
  if (updated.length === 0) return baseline;

  const sources = groundedHeadlines(reply, 6).map((h) => ({ label: h.source || h.title, url: h.link }));
  return { usuryCaps: caps, asOf: new Date().toISOString(), updated, sources };
}
