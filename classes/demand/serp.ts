// Cómo se ve el SERP uruguayo de una consulta, para decidir si vale la pena escribirla.
//
// Usa el servidor de búsqueda que ya corre en el VPS (`google_search_server`, pm2, :5112). Es
// interno: sólo responde desde la propia máquina, que es donde corre este job. Si no está, la
// evaluación conserva una categoría de fallo y el candidato queda sin clasificar — la cola sin
// clasificar sigue sirviendo, sólo hay que mirarla a mano.
import axios from "axios";
import { assessSerp, type SerpAssessment, type SerpFailure } from "./classify";

const BASE = process.env.SERP_SERVER_URL || "http://127.0.0.1:5112/google/";

export type SerpProbe =
  | { status: "classified"; assessment: SerpAssessment }
  | SerpFailure;

function failureOf(error: unknown): SerpFailure {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (Number.isInteger(status) && status! >= 100 && status! <= 599) {
      return { status: "failed", reason: "http", httpStatus: status };
    }
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return { status: "failed", reason: "timeout" };
    }
    if (error.request && !error.response) return { status: "failed", reason: "network" };
  }
  return { status: "failed", reason: "unexpected" };
}

function resultDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname
      ? url.hostname
      : null;
  } catch {
    return null;
  }
}

/**
 * Una consulta contra el SERP uruguayo (gl=uy, es).
 *
 * Devuelve una categoría segura cuando falla o no se puede leer. Nunca guarda el error, su URL,
 * cabeceras ni respuesta. Una clasificación que falta no puede costar la corrida entera.
 */
// 12 s y no 25: son 25 sondas en serie, así que el tiempo máximo de la etapa es el timeout por
// veinticinco. Con 25 s la etapa podía tardar once minutos, y una consulta que tarda más de doce
// segundos casi siempre termina fallando igual.
export async function probeSerp(query: string, timeoutMs = 12000): Promise<SerpProbe> {
  try {
    const res = await axios.get(BASE, {
      params: { query, gl: "uy", lr: "lang_es", num: 8 },
      timeout: timeoutMs,
    });
    const data: any = res.data;
    if (!Array.isArray(data?.results)) return { status: "failed", reason: "invalid-response" };
    const results: any[] = data.results;
    if (!results.length) return { status: "failed", reason: "empty-results" };

    const domains = results
      .map((r) => resultDomain(r?.link) ?? resultDomain(r?.url))
      .filter((domain): domain is string => domain !== null);
    if (!domains.length) return { status: "failed", reason: "invalid-response" };
    // `featured_snippet` viene siempre como objeto; lo que dice si existe es que traiga URL.
    const hasAnswerBox = Boolean(data?.featured_snippet?.url) || Boolean(data?.unit_converter?.result);

    return { status: "classified", assessment: assessSerp({ domains, hasAnswerBox }) };
  } catch (error: unknown) {
    return failureOf(error);
  }
}
