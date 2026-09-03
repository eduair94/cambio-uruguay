// ¿Google ya nos muestra para esta consulta?
//
// Es la señal más fuerte que hay y es gratis: el archivo propio de Search Console dice, consulta
// por consulta, si el sitio ya aparece y en qué posición. Mientras el índice RAG contesta "tenemos
// una página parecida", esto contesta "Google YA nos pone acá, en el puesto N" — que no es lo
// mismo y decide cosas distintas.
//
// La distinción importa porque cambia el trabajo, no sólo la prioridad. Una consulta donde el
// sitio no aparece se resuelve escribiendo; una donde ya aparece en el puesto 12 se resuelve
// mejorando la página que ya existe. Confundirlas es exactamente lo que llevó a que /historico
// compitiera consigo mismo en nueve consultas.
import { SearchConsoleDayModel } from "../models/SearchConsoleDay";
import type { GscDay } from "../gsc/types";

export interface KnownQuery {
  impressions: number;
  clicks: number;
  /** Posición media ponderada por impresiones. */
  position: number;
}

/** Cuántos días del archivo se leen. Cuatro semanas es la ventana que usa el resto del tablero. */
const WINDOW_DAYS = 28;

/**
 * Las consultas donde el sitio ya aparece, agregadas sobre la ventana.
 *
 * La posición se pondera por impresiones y no se promedia a secas: un día con tres impresiones en
 * el puesto 2 no puede pesar lo mismo que uno con mil en el 9.
 *
 * Devuelve un Map vacío si el archivo no está o falla la lectura. Es deliberado: esta señal MEJORA
 * la cola, no la habilita. Sin ella la cobertura sigue midiéndose contra el índice propio, que es
 * como funcionó hasta ahora.
 */
export async function loadKnownQueries(days = WINDOW_DAYS): Promise<Map<string, KnownQuery>> {
  const out = new Map<string, KnownQuery>();
  let docs: GscDay[] = [];
  try {
    docs = await SearchConsoleDayModel.find({}).sort({ day: -1 }).limit(days).lean<GscDay[]>().exec();
  } catch {
    return out;
  }

  // Acumulador aparte para la posición: hace falta la suma ponderada antes de poder dividir.
  const weighted = new Map<string, number>();
  for (const doc of docs) {
    for (const row of doc.queries || []) {
      const key = String(row.key || "").trim().toLowerCase();
      if (!key) continue;
      const prev = out.get(key) || { impressions: 0, clicks: 0, position: 0 };
      prev.impressions += row.impressions || 0;
      prev.clicks += row.clicks || 0;
      out.set(key, prev);
      weighted.set(key, (weighted.get(key) || 0) + (row.position || 0) * (row.impressions || 0));
    }
  }
  for (const [key, agg] of out) {
    agg.position = agg.impressions > 0 ? (weighted.get(key) || 0) / agg.impressions : 0;
  }
  return out;
}
