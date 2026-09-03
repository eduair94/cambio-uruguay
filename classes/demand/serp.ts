// Cómo se ve el SERP uruguayo de una consulta, para decidir si vale la pena escribirla.
//
// Usa el servidor de búsqueda que ya corre en el VPS (`google_search_server`, pm2, :5112). Es
// interno: sólo responde desde la propia máquina, que es donde corre este job. Si no está, la
// evaluación devuelve null y el candidato queda "dudoso" en vez de romper la corrida — la cola sin
// clasificar sigue sirviendo, sólo hay que mirarla a mano.
import axios from "axios";
import { assessSerp, type SerpAssessment } from "./classify";

const BASE = process.env.SERP_SERVER_URL || "http://127.0.0.1:5112/google/";

export interface SerpProbe {
  assessment: SerpAssessment;
  domains: string[];
}

/**
 * Una consulta contra el SERP uruguayo (gl=uy, es).
 *
 * Devuelve null cuando el servidor no está o contesta algo que no se puede leer. Nunca lanza: una
 * clasificación que falta no puede costar la corrida entera.
 */
export async function probeSerp(query: string, timeoutMs = 25000): Promise<SerpProbe | null> {
  try {
    const res = await axios.get(BASE, {
      params: { query, gl: "uy", lr: "lang_es", num: 8 },
      timeout: timeoutMs,
    });
    const data: any = res.data;
    const results: any[] = Array.isArray(data?.results) ? data.results : [];
    if (!results.length) return null;

    const domains = results.map((r) => String(r?.link || r?.url || "")).filter(Boolean);
    // `featured_snippet` viene siempre como objeto; lo que dice si existe es que traiga URL.
    const hasAnswerBox = Boolean(data?.featured_snippet?.url) || Boolean(data?.unit_converter?.result);

    return { assessment: assessSerp({ domains, hasAnswerBox }), domains: domains.slice(0, 6) };
  } catch {
    return null;
  }
}
