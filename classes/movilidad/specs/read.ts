// Una lectura de la ficha propia de un monopatín: Mercado Libre o la tienda.
//
// Medido el 2026-11-03 desde una IP común con nuestra UA: la ficha de ML contesta 200 (la versión
// estática para bots) con la tabla `ui-vpp-striped-specs`, igual que la leen currency-autos-detail y
// currency-rentals-ml-detail; delcar y superbikers (WooCommerce) imprimen su tabla como texto; una
// tienda Shopify publica `<producto>.json` con el `body_html`. Facebook no se lee nunca.
import { fetchText, type FetchOptions } from "../../rentals/net";
import { ML_API_BASE } from "../../retail/sources/mercadolibre";
import { decodeEntities, hasAnySpecs, mergeSpecs, specsFromRows, specsFromText } from "./parse";
import { mlProductId } from "./queue";
import type { MonopatinSpecs } from "./types";

export const MOVILIDAD_SPECS_USER_AGENT =
  process.env.MOVILIDAD_SPECS_USER_AGENT ||
  "CambioUruguayBot/1.0 (+https://cambio-uruguay.com/monopatines-electricos-uruguay; ficha tecnica de monopatines; contact via site)";

export interface FichaTarget {
  listingId: string;
  url: string;
  source: "mercadolibre" | "store";
  /** La categoría del aviso: decide qué bandas y qué campos se leen (`profiles.ts`). Sin ella, monopatín. */
  category?: string | null;
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

interface BridgeProduct {
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  specifications?: Array<{ attributes?: Array<{ name?: string; id?: string; value?: string }> }>;
}

/**
 * La ficha de un aviso de Mercado Libre, por el puente propio (:9656, `/product/<id>`).
 *
 * Medido en producción el 3/11/2026 a las 23:40 UTC, en la primera corrida del job: desde la IP del
 * VPS toda página de producto de ML (`/up/MLUU…`, `/p/MLU…`, `articulo.…/MLU-…`) redirige a
 * `/gz/account-verification`, el muro de login; los clasificados (`auto.`, `casa.`) siguen abiertos,
 * por eso currency-autos-detail y currency-rentals-ml-detail no lo vieron. El puente es la vía que el
 * repo ya usa para leer ML y contesta la misma tabla (`specifications`) y la descripción. No se rodea
 * el muro con otra IP. Un aviso sin id de producto (`articulo.…`, el 1,5 % medido) no lo puede leer
 * el puente y la cola ni lo intenta (`mlProductId`).
 */
async function readMlFromBridge(target: FichaTarget, fetcher: Fetcher): Promise<FichaRead> {
  const id = mlProductId(target.url);
  if (!id) return nothing({ failure: "aviso sin id de producto" });
  const { body, failure } = await get(`${ML_API_BASE}/product/${id}?country=UY`, fetcher);
  if (!body) return nothing({ gone: GONE_STATUS.test(failure), failure });
  let product: BridgeProduct;
  try {
    product = JSON.parse(body) as BridgeProduct;
  } catch {
    return nothing({ failure: "respuesta del puente ilegible" });
  }
  const rows: Record<string, string> = {};
  for (const group of product.specifications ?? []) {
    for (const attribute of group.attributes ?? []) {
      const label = String(attribute.name ?? attribute.id ?? "").trim();
      const value = String(attribute.value ?? "").trim();
      if (label && value && !(label in rows)) rows[label] = value;
    }
  }
  const specs = mergeSpecs(
    specsFromRows(rows, target.category),
    specsFromText(product.description ?? "", "descripcion", target.category)
  );
  return {
    ok: true,
    gone: false,
    specs: withSpecs(specs),
    brand: product.brand?.trim() || rows["Marca"] || null,
    model: product.model?.trim() || rows["Modelo"] || null,
  };
}

export async function readFicha(target: FichaTarget, fetcher: Fetcher = fetchText): Promise<FichaRead> {
  const clean = target.url.split("#")[0]!;

  if (target.source === "mercadolibre") return readMlFromBridge(target, fetcher);

  if (/\/products\//.test(clean)) {
    const { body, failure } = await get(`${clean.split("?")[0]!.replace(/\/+$/, "")}.json`, fetcher);
    if (!body) return nothing({ gone: GONE_STATUS.test(failure), failure });
    try {
      const product = (JSON.parse(body) as { product?: { body_html?: string; vendor?: string } }).product;
      const specs = specsFromText(pageText(product?.body_html ?? ""), "descripcion", target.category);
      return { ok: true, gone: false, specs: withSpecs(specs), brand: product?.vendor?.trim() || null, model: null };
    } catch {
      return nothing({ failure: "cuerpo ilegible" });
    }
  }

  const { body, failure } = await get(clean, fetcher);
  if (!body) return nothing({ gone: GONE_STATUS.test(failure), failure });
  const specs = specsFromText(pageText(body), "descripcion", target.category);
  return { ok: true, gone: false, specs: withSpecs(specs), brand: null, model: null };
}
