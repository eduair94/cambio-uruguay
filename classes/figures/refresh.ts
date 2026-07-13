// Daily self-updating source of truth for Uruguay's key national figures (salario mínimo, BPC,
// boleto STM, inflación anual) used across /salud-financiera and /indicadores. Same guardrailed
// Gemini-grounded pattern as classes/costs/refresh.ts and classes/debt/refresh.ts: one grounded
// call, validate every value against applyFigureBands, keep the baseline on anything that fails.
//
// Moved out of the Nuxt app (server/utils/uyFiguresLive.ts). The DRIFT WATCHDOG did NOT move —
// it stayed in the app (nitro task figures:drift) because it needs the app's Telegram config and
// its own dedupe state, and it spends no Gemini call at all.
import { askGrounded, geminiConfigured, groundedHeadlines } from "../gemini";
import { applyFigureBands, baselineFigures, type UyFigures } from "./bands";

const PROMPT = `Buscá con búsqueda web real y citable los valores ACTUALES en Uruguay de estos indicadores oficiales:
1. Salario mínimo nacional vigente (nominal, mensual, en pesos uruguayos).
2. Valor actual de la BPC (Base de Prestaciones y Contribuciones), en pesos.
3. Precio del boleto común de ómnibus de Montevideo (STM, con tarjeta), en pesos.
4. Variación anual del IPC (inflación interanual), en porcentaje.
Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown, con este formato exacto y números sin separadores de miles ni símbolos:
{"salarioMinimo": <num>, "bpc": <num>, "boletoStm": <num>, "inflacionAnual": <num>}
Usá solo valores encontrados en fuentes oficiales (MTSS, BPS, INE, Intendencia de Montevideo). Si algún dato no lo encontrás, poné null. No inventes.`;

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Fetch + validate live figures. Returns the merged figures, or the pure baseline (asOf: null)
 * when the key is missing, the reply is unparseable, or nothing passed a band.
 */
export async function refreshUyFigures(): Promise<UyFigures> {
  const baseline = baselineFigures();
  if (!geminiConfigured()) return baseline;

  const reply = await askGrounded(PROMPT);
  if (!reply) return baseline;

  const data = parseJsonLoose(reply.text);
  if (!data) return baseline;

  const { figures, updated } = applyFigureBands(baseline, data);
  if (updated.length === 0) return baseline;

  figures.sources = groundedHeadlines(reply, 6).map((h) => ({ label: h.source || h.title, url: h.link }));
  figures.asOf = new Date().toISOString();
  return figures;
}
