// Weekly self-updating layer for /conviene-comprar-en-cuotas (pm2 app `currency-financing`).
// Refreshes the macro/yield figures the page's verdict hinges on (TPM, inflación, plazo fijo BROU,
// fondo de dinero en pesos, tope de usura) via grounded search. Only the validated scalar figures
// are returned/stored — the INSTRUMENTOS table and the neto() arithmetic that turn them into the
// page's model stay in the app (app/server/utils/financingMerge.ts), because the baseline table
// lives there and the page imports it.
//
// Moved out of the Nuxt app (server/utils/financingLive.ts) as part of the Gemini→backend
// migration — the app forbids Gemini (app/tests/unit/noGeminiInApp.test.ts).
import { askGrounded, geminiConfigured, groundedHeadlines } from "../gemini";
import { applyFinancingBands, type FinancingFigures } from "./bands";

export interface LiveFinancing {
  figures: FinancingFigures;
  /** ISO timestamp of the last successful refresh, or null when nothing usable was found. */
  asOf: string | null;
  updated: string[];
  sources: Array<{ label: string; url: string }>;
}

const PROMPT = `Buscá con búsqueda real y citable estos datos financieros de URUGUAY (no de Argentina) vigentes hoy:
1. La Tasa de Política Monetaria (TPM) que fija el Banco Central del Uruguay, en % anual.
2. La inflación interanual de Uruguay (IPC del INE), en % anual.
3. La tasa del plazo fijo en PESOS URUGUAYOS del BROU por e-BROU a 732-1096 días, en % efectivo anual.
4. El rendimiento anualizado de un fondo de dinero / fondo de liquidez en PESOS URUGUAYOS (por ejemplo Fondo Centenario Gestión de Liquidez, o el fondo de Prex), en % anual.
5. El tope legal de usura para crédito al consumo de familias en moneda nacional sin autorización de descuento, hasta 366 días, que publica el BCU, en % efectivo anual.

MUY IMPORTANTE:
- Son datos de URUGUAY. Si encontrás rendimientos en pesos del 15%, 20% o más, son de ARGENTINA: descartalos y poné null.
- Con la TPM uruguaya cerca del 5-6%, ningún instrumento en pesos uruguayos seguro rinde más del 9%. Si una fuente dice que las Letras de Regulación Monetaria pagan más del 8%, está equivocada: no la uses.

Respondé SOLO con un objeto JSON válido, sin texto ni markdown, con números en porcentaje sin el signo %:
{"tpm": <num>, "inflacion": <num>, "plazoFijoBrou": <num>, "fondoPesos": <num>, "topeUsura": <num>}
Si un dato no lo encontrás con una búsqueda real, poné null. No inventes.`;

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function emptyLiveFinancing(): LiveFinancing {
  return { figures: {}, asOf: null, updated: [], sources: [] };
}

/**
 * Fetch + validate live financing figures. Returns the validated figures, or an empty result
 * (asOf: null) when the key is missing, the reply is unparseable, or nothing passed a band.
 */
export async function refreshLiveFinancing(): Promise<LiveFinancing> {
  const empty = emptyLiveFinancing();
  if (!geminiConfigured()) return empty;

  const reply = await askGrounded(PROMPT);
  if (!reply) return empty;

  const data = parseJsonLoose(reply.text);
  if (!data) return empty;

  const { figures, updated } = applyFinancingBands(data);
  if (updated.length === 0) return empty;

  const sources = groundedHeadlines(reply, 6).map((h) => ({ label: h.source || h.title, url: h.link }));
  return { figures, asOf: new Date().toISOString(), updated, sources };
}
