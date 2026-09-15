// El control que no pasa por ningún modelo: frases de alarma literales por cada 1.000 comentarios.
// Si el clasificador inventara el pesimismo, esta curva no lo acompañaría.
import { isGone } from "./filter";
import { LEX_KEYS } from "./types";
import type { LexKey } from "./types";

export const LEX: Record<LexKey, RegExp> = {
  no_hay_laburo:
    /no hay (m[aá]s )?(laburo|trabajo|ofertas)|no (consigo|encuentro) (laburo|trabajo)|mercado (est[aá] )?(muerto|horrible|p[eé]simo|complicad[oa]|dif[ií]cil|jodido|saturado)/i,
  saturado: /saturad[oa]|sobreoferta|demasiados (devs|programadores)/i,
  despidos: /despid|layoff|recorte|echaron|reestructura/i,
  reemplazo_ia:
    /\b(ia|ai|chatgpt|llm|agentes?)\b[^.]{0,60}(reemplaz|sustitu|quitar(nos)? el trabajo|dejar sin trabajo)|reemplaz[a-z]* (por|con) (la )?(ia|ai)\b/i,
  ia_menciones: /\b(ia|ai|chatgpt|gpt-?\d*|copilot|claude|cursor|llms?|gemini|vibe ?cod\w*|agentes?)\b/i,
  optimismo:
    /(hay|sobra) (mucho )?(laburo|trabajo)|consegu[ií] (laburo|trabajo)|me (contrataron|sali[oó] (una|el) (laburo|trabajo|oferta))|buena carrera/i,
};

export function lexCounts(bodies: readonly string[]): { n: number; counts: Record<LexKey, number> } {
  const counts = Object.fromEntries(LEX_KEYS.map((k) => [k, 0])) as Record<LexKey, number>;
  let n = 0;
  for (const b of bodies) {
    if (isGone(b)) continue;
    n++;
    for (const k of LEX_KEYS) if (LEX[k].test(b)) counts[k]++;
  }
  return { n, counts };
}
