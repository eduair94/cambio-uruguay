// Daily self-updating layer for the cost-of-living tool (/herramientas/costo-de-vida). Refreshes
// the most volatile figures (salario mínimo, boleto STM, alquileres típicos de Montevideo) via
// grounded search. Only the validated figures are returned/stored — the arithmetic that turns
// them into a full cost model (transporte = boleto × 2 tramos × 22 días, rents rounded to the
// nearest 500) stays in the app (app/server/utils/costsMerge.ts), because COST_MODEL stays there.
//
// Moved out of the Nuxt app (server/utils/costOfLivingLive.ts).
import { askGrounded, geminiConfigured, groundedHeadlines } from "../gemini";
import { applyCostBands, type CostFigures } from "./bands";

export interface LiveCosts {
  figures: CostFigures;
  /** ISO timestamp of the last successful refresh, or null when nothing usable was found. */
  asOf: string | null;
  updated: string[];
  sources: Array<{ label: string; url: string }>;
}

const PROMPT = `Buscá con búsqueda real y citable los valores ACTUALES en Uruguay (en pesos uruguayos UYU) de:
1. Salario mínimo nacional vigente (nominal, mensual).
2. Precio del boleto común de ómnibus de Montevideo (STM, con tarjeta).
3. Alquiler mensual TÍPICO en Montevideo de: un monoambiente, un apartamento de 1 dormitorio y uno de 2 dormitorios (usá promedios de portales inmobiliarios como InfoCasas).
Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown, con este formato exacto y números sin separadores de miles:
{"salarioMinimo": <num>, "boletoStm": <num>, "rentMono": <num>, "rent1": <num>, "rent2": <num>}
Usá solo valores que hayas encontrado en una búsqueda real. Si algún dato no lo encontrás, poné null en ese campo. No inventes.`;

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function emptyLiveCosts(): LiveCosts {
  return { figures: {}, asOf: null, updated: [], sources: [] };
}

/**
 * Fetch + validate live cost figures. Returns the validated figures, or an empty result
 * (asOf: null) when the key is missing, the reply is unparseable, or nothing passed a band.
 */
export async function refreshLiveCosts(): Promise<LiveCosts> {
  const empty = emptyLiveCosts();
  if (!geminiConfigured()) return empty;

  const reply = await askGrounded(PROMPT);
  if (!reply) return empty;

  const data = parseJsonLoose(reply.text);
  if (!data) return empty;

  const { figures, updated } = applyCostBands(data);
  if (updated.length === 0) return empty;

  const sources = groundedHeadlines(reply, 6).map((h) => ({ label: h.source || h.title, url: h.link }));
  return { figures, asOf: new Date().toISOString(), updated, sources };
}
