// Una lectura de la ficha propia de un monopatín: Mercado Libre o la tienda.
//
// Medido el 2026-11-03 desde una IP común con nuestra UA: la ficha de ML contesta 200 (la versión
// estática para bots) con la tabla `ui-vpp-striped-specs`, igual que la leen currency-autos-detail y
// currency-rentals-ml-detail; delcar y superbikers (WooCommerce) imprimen su tabla como texto; una
// tienda Shopify publica `<producto>.json` con el `body_html`. Facebook no se lee nunca.
import { fetchText, type FetchOptions } from "../../rentals/net";
import { decodeEntities, hasAnySpecs, mergeSpecs, mlDescription, mlSpecRows, specsFromRows, specsFromText } from "./parse";
import type { MonopatinSpecs } from "./types";

export const MOVILIDAD_SPECS_USER_AGENT =
  process.env.MOVILIDAD_SPECS_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/monopatines-electricos-uruguay; ficha tecnica de monopatines; contact via site)";

export interface FichaTarget {
  listingId: string;
  url: string;
  source: "mercadolibre" | "store";
}

export interface FichaRead {
  /** La página se leyó (aunque no traiga ningún dato). */
  ok: boolean;
  /** El aviso ya no existe: 404/410 o ficha cerrada. No es una falla. */
  gone: boolean;
  specs: MonopatinSpecs | null;
  brand: string | null;
  model: string | null;
  failure?: string;
}

export type Fetcher = (url: string, options?: FetchOptions) => Promise<string | null>;

const GONE_STATUS = /^HTTP (404|410)$/;
const CLOSED = /"item_status":"(closed|inactive|paused|under_review)"/;
/** Donde termina la ficha y empiezan las de otros productos. */
const RELATED = /productos relacionados|related products|tambi[eé]n te puede interesar|quiz[aá]s te interese|te puede interesar/i;

function pageText(html: string): string {
  const text = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
  const cut = text.search(RELATED);
  return (cut >= 0 ? text.slice(0, cut) : text).replace(/[ \t]+/g, " ");
}

const nothing = (over: Partial<FichaRead>): FichaRead => ({
  ok: false,
  gone: false,
  specs: null,
  brand: null,
  model: null,
  ...over,
});

async function get(url: string, fetcher: Fetcher): Promise<{ body: string | null; failure: string }> {
  let failure = "";
  const body = await fetcher(url, {
    retries: 1,
    timeoutMs: 20_000,
    headers: { "user-agent": MOVILIDAD_SPECS_USER_AGENT },
    onFailure: (reason) => {
      failure = reason;
    },
  });
  return { body, failure };
}

const withSpecs = (specs: MonopatinSpecs): MonopatinSpecs | null => (hasAnySpecs(specs) ? specs : null);

export async function readFicha(target: FichaTarget, fetcher: Fetcher = fetchText): Promise<FichaRead> {
  const clean = target.url.split("#")[0]!;

  if (target.source === "mercadolibre") {
    const { body, failure } = await get(clean, fetcher);
    if (!body) return nothing({ gone: GONE_STATUS.test(failure), failure });
    if (CLOSED.test(body) || !/ui-pdp|ui-vpp|andes-table/.test(body)) return nothing({ gone: true });
    const rows = mlSpecRows(body);
    const specs = mergeSpecs(specsFromRows(rows), specsFromText(mlDescription(body), "descripcion"));
    return { ok: true, gone: false, specs: withSpecs(specs), brand: rows["Marca"] ?? null, model: rows["Modelo"] ?? null };
  }

  if (/\/products\//.test(clean)) {
    const { body, failure } = await get(`${clean.split("?")[0]!.replace(/\/+$/, "")}.json`, fetcher);
    if (!body) return nothing({ gone: GONE_STATUS.test(failure), failure });
    try {
      const product = (JSON.parse(body) as { product?: { body_html?: string; vendor?: string } }).product;
      const specs = specsFromText(pageText(product?.body_html ?? ""), "descripcion");
      return { ok: true, gone: false, specs: withSpecs(specs), brand: product?.vendor?.trim() || null, model: null };
    } catch {
      return nothing({ failure: "cuerpo ilegible" });
    }
  }

  const { body, failure } = await get(clean, fetcher);
  if (!body) return nothing({ gone: GONE_STATUS.test(failure), failure });
  const specs = specsFromText(pageText(body), "descripcion");
  return { ok: true, gone: false, specs: withSpecs(specs), brand: null, model: null };
}
