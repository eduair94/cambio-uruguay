// Mercado Libre Uruguay, categoría MLU1763 ("Motos"), leída por el MISMO puente que usa autos
// (pm2 `mercadolibre` en el 104, :9656). Nada de la mecánica se reescribe: `facetValues`,
// `drainTasks` y `CAR_HARVEST_RETRY` se importan de `classes/autos/sources/mercadolibre.ts`, porque
// encodean un incidente de producción medido —una ráfaga hace que el puente caiga a su proxy
// residencial durante 10 minutos PARA TODOS los jobs que lo usan (alquileres, sillas, equipar,
// celulares, movilidad)— y ese conocimiento no se duplica, se reusa.
//
// Lo que sí es propio de motos, todo medido el 2026-09-22 contra el puente vivo:
//   * la categoría (MLU1763) y sus 1.391 avisos usados repartidos en 97 marcas;
//   * el host del permalink, que NO es el de autos: `moto.mercadolibre.com.uy` en las 164 tarjetas
//     de la muestra, contra `auto.mercadolibre.com.uy` que tiene compilado el lector de autos;
//   * la faceta `MOTO_TYPE`, que autos no tiene y que acá reemplaza a la carrocería;
//   * `SHORT_VERSION` NO existe en esta categoría (las facetas son BRAND, MODEL, VEHICLE_YEAR,
//     ENGINE_DISPLACEMENT, MOTO_TYPE, FUEL_TYPE, KILOMETERS, price, state, seller_type), así que no
//     hay vocabulario de versiones que minar y la cohorte se apoya en la cilindrada.
//
// `ITEM_CONDITION=2230581` ("usado") SÍ vale en MLU1763: se verificó que vuelve APLICADO en
// `filters[]`, no sólo aceptado.
import { fetchJson } from "../../rentals/net";
import { collectPolycards } from "../../rentals/sources/mercadolibre";
import { fold, fuelOf, parseCarLocation, parsePrimaryAttribute } from "../../autos/normalize";
import {
  CAR_HARVEST_RETRY,
  ML_OFFSET_CEILING,
  ML_PAGE_SIZE,
  ML_USED_CONDITION,
  drainTasks,
  facetValues,
  type MLCarCard,
  type MLCarPage,
} from "../../autos/sources/mercadolibre";
import { MOTO_DISPLACEMENT_FACETS, MOTO_EXCLUDED_TYPES, MOTO_TYPES, resolveDisplacementBand } from "../identify";
import type { MotoDisplacementBandId, MotoFuel, MotoHarvestGap, MotoHarvestResult, MotoType, RawMotoListing } from "../types";

export const ML_MOTOS_CATEGORY = "MLU1763";
export const ML_MOTOS_PERMALINK_PREFIX = "https://moto.mercadolibre.com.uy/MLU-";

/**
 * Las claves de partición de ESTA categoría. No se importa la de autos porque no es la misma lista:
 * acá se parte además por `MOTO_TYPE`, y una clave que la página aplica pero el verificador no
 * conoce dejaría pasar una página que no es la que se pidió.
 */
const PARTITION_KEYS = ["ITEM_CONDITION", "BRAND", "MODEL", "VEHICLE_YEAR", "MOTO_TYPE", "ENGINE_DISPLACEMENT"];

const TYPE_BY_ID = new Map(MOTO_TYPES.map(entry => [entry.id, entry.type]));
const EXCLUDED_TYPE_IDS = MOTO_EXCLUDED_TYPES.map(entry => entry.id);

export function mlMotosApiBase(): string {
  // Mismo puente que autos; la variable propia existe para poder apuntarlo a otro lado en una
  // prueba sin desviar de paso al job de autos, que corre en el mismo VPS.
  return (process.env.MOTOS_ML_API || process.env.AUTOS_ML_API || "http://104.234.204.107:9656/mercadolibre").replace(/\/+$/, "");
}

export function motoSearchUrl(
  filters: Readonly<Record<string, string>>,
  offset: number,
  apiBase = mlMotosApiBase()
): string {
  const params = new URLSearchParams({
    country: "UY",
    q: "motos",
    category: ML_MOTOS_CATEGORY,
    "q.category": ML_MOTOS_CATEGORY,
    ITEM_CONDITION: ML_USED_CONDITION,
    raw: "true",
    limit: String(ML_PAGE_SIZE),
    ...filters,
    offset: String(offset),
  });
  return `${apiBase}/search?${params}`;
}

function count(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

/** Sólo el offset exacto y los filtros APLICADOS prueban que la página es la que se pidió. */
export function motoPageMatches(page: MLCarPage, filters: Readonly<Record<string, string>>, offset: number): boolean {
  if (count(page.paging?.offset) !== offset) return false;
  const expected: Record<string, string> = { ITEM_CONDITION: ML_USED_CONDITION, ...filters };
  return Object.entries(expected)
    .filter(([id]) => PARTITION_KEYS.includes(id))
    .every(([id, value]) =>
      (page.filters || []).some(filter => filter?.id === id && (filter.values || []).some(item => item?.id === value))
    );
}

/** El vocabulario de combustible de autos, traducido al de motos (femenino, y sin GNC). */
export function motoFuelOf(label: string): MotoFuel | null {
  const fuel = fuelOf(label);
  if (fuel === "electrico") return "electrica";
  if (fuel === "hibrido") return "hibrida";
  if (fuel === "nafta") return "nafta";
  if (fuel === "diesel") return "diesel";
  return null;
}

export interface MotoCardContext {
  brandId: string;
  brand: string;
  modelId: string;
  model: string;
  observedAt: string;
  maxYear: number;
}

export function toRawMoto(card: MLCarCard, context: MotoCardContext): RawMotoListing | null {
  const id = String(card.metadata?.id || "");
  if (!/^MLU\d{6,14}$/.test(id) || card.metadata?.category_id !== ML_MOTOS_CATEGORY || card.metadata?.is_pad === "true") return null;
  const query = String(card.metadata?.url_params || "");
  if (!query) return null;
  const params = new URLSearchParams(query.replace(/^\?/, ""));
  const condition = params.get("condition");
  if (condition && fold(condition) !== "usado") return null;
  const part = (type: string) => card.components?.find(component => component.type === type);
  const title = String(params.get("title") || part("title")?.title?.text || "").replace(/\s+/g, " ").trim();
  const price = Number(part("price")?.price?.current_price?.value ?? params.get("price"));
  const currency = String(part("price")?.price?.current_price?.currency || params.get("currency_id") || "").toUpperCase();
  const permalink = String(params.get("permalink") || "");
  const primary = parsePrimaryAttribute(params.get("primary_attribute") || "", context.maxYear);
  if (!title || !(price > 0) || (currency !== "USD" && currency !== "UYU") || primary.year === null) return null;
  // El host es el de la vertical de motos, medido, y se exige: un permalink de otro host es un
  // aviso de otra categoría colado en la respuesta, no una moto con la URL rara.
  if (!permalink.startsWith(ML_MOTOS_PERMALINK_PREFIX)) return null;
  const labels = (part("labels")?.labels?.labels || [])
    .map(label => String(label?.text || "").replace(/\{[^}]*\}/g, "").trim())
    .filter(Boolean);
  const kmLabel = labels.find(label => /\bkm\b/i.test(label));
  const labelKm = kmLabel ? Number(kmLabel.replace(/[^\d]/g, "")) : NaN;
  const location = parseCarLocation(part("location")?.location?.text || params.get("location") || "");
  const sellerId = params.get("seller_id") || "";
  const picture = (params.get("picture") || params.get("thumbnail") || "").replace(/^http:\/\//, "https://");
  let fuel: MotoFuel | null = null;
  for (const label of labels) fuel = fuel ?? motoFuelOf(label);
  return {
    id,
    source: "mercadolibre",
    brandId: context.brandId,
    brand: context.brand,
    modelId: context.modelId,
    model: context.model,
    title: title.slice(0, 200),
    year: primary.year,
    km: primary.km ?? (Number.isFinite(labelKm) ? labelKm : null),
    price,
    currency,
    fuel,
    neighborhood: location.neighborhood,
    department: location.department,
    sellerType: location.sellerType,
    sellerId: /^\d{1,15}$/.test(sellerId) ? sellerId : null,
    picture: /^https:\/\/http2\.mlstatic\.com\//.test(picture) ? picture : null,
    pictureCount: count(card.pictures?.quantity),
    permalink,
    observedAt: context.observedAt,
  };
}

export interface MotoHarvestOptions {
  mode: "full" | "fast";
  maxRequests: number;
  maxDurationMs: number;
  apiBase?: string;
  /** Tiempo mínimo entre el arranque de dos pedidos al puente. Producción: 1.500 ms. */
  gapMs?: number;
  /** Sólo para la espera por caída del puente (inyectable para que ningún test duerma de verdad). */
  sleep?: (ms: number) => Promise<void>;
  now?: () => Date;
  onProgress?: (message: string) => void;
  /**
   * Barrer las 13 facetas de tipo para conocer el tipo de casi todos los avisos. Las 3 facetas
   * EXCLUIDAS (cuatriciclo, triciclo, motocarro) se barren siempre: son 32 avisos y sin ellas se
   * cuela un cuatriciclo cada dos.
   */
  typeSweep?: boolean;
  /**
   * Barrer los 3 tramos de `ENGINE_DISPLACEMENT`. Es la dimensión propia del directorio y la única
   * que el catálogo tiene de verdad: medido el 2026-09-22, sólo 2 de 73 títulos escriben la unidad.
   */
  displacementSweep?: boolean;
  /**
   * Recorrer sólo las N marcas más grandes. Existe para el `--dry-run`: el recorrido reparte las
   * tareas por marca ANTES que las de modelo, así que un presupuesto chico sin este tope se va
   * entero en páginas de marca y vuelve con cero avisos — o sea que la prueba de humo no probaría
   * justamente lo que se quiere probar, que es que una tarjeta se lee bien de punta a punta.
   * Una corrida truncada así lo declara en `note` y nunca cuenta como completa para las marcas que
   * no miró (no están en `completeBrands`, así que ninguno de sus avisos se puede retirar).
   */
  maxBrands?: number;
}

const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

interface Named {
  id: string;
  name: string;
}

type Task = () => Promise<Task[]>;

export async function harvestMercadoLibreMotos(options: MotoHarvestOptions): Promise<MotoHarvestResult> {
  const clock = options.now ?? (() => new Date());
  const startedAt = clock().toISOString();
  const started = Date.now();
  const maxYear = new Date(startedAt).getUTCFullYear() + 1;
  const base: Record<string, string> = options.mode === "fast" ? { since: "today" } : {};
  const listings = new Map<string, RawMotoListing>();
  const types = new Map<string, MotoType>();
  // Un aviso puede caer en DOS tramos: los de ML se solapan en el borde (ver identify.ts), así que
  // se juntan todos los que se vieron y recién al final se resuelve uno solo.
  const displacementHits = new Map<string, Set<string>>();
  const excluded = new Set<string>();
  const failedBrands = new Set<string>();
  const gaps: MotoHarvestGap[] = [];
  let requests = 0;
  let pages = 0;
  let failedPages = 0;
  let rejectedCards = 0;
  let budgetCut = false;
  let taskErrors = 0;
  const sleep = options.sleep ?? delay;
  const gapMs = Math.max(0, options.gapMs ?? 0);
  const failureReasons = new Set<string>();
  let nextStart = 0;
  let streak = 0;
  let cooldowns = 0;
  let cooldown: Promise<void> | null = null;

  const remainingMs = (): number => options.maxDurationMs - (Date.now() - started);

  async function pace(): Promise<void> {
    if (!gapMs) return;
    const now = Date.now();
    const wait = nextStart - now;
    nextStart = Math.max(now, nextStart) + gapMs;
    if (wait > 0) await delay(wait);
  }

  /** Una sola espera compartida por la ventana de caída del puente; toda lectura hace cola detrás. */
  function startCooldown(): void {
    if (cooldown || cooldowns >= CAR_HARVEST_RETRY.maxCooldowns) return;
    const remaining = remainingMs();
    if (remaining < 30_000) return;
    cooldowns++;
    streak = 0;
    options.onProgress?.(`[motos] el puente falló ${CAR_HARVEST_RETRY.failureStreak} veces seguidas: se espera antes de releer`);
    cooldown = sleep(Math.min(CAR_HARVEST_RETRY.cooldownMs, remaining)).then(() => {
      cooldown = null;
    });
  }

  async function read(filters: Record<string, string>, offset: number): Promise<MLCarPage | null> {
    let reason: string | null = null;
    for (let attempt = 0; attempt < CAR_HARVEST_RETRY.pageAttempts; attempt++) {
      if (cooldown) await cooldown;
      if (requests >= options.maxRequests || remainingMs() <= 0) {
        budgetCut = true;
        return null;
      }
      await pace();
      requests++;
      let failure = "";
      const page = await fetchJson<MLCarPage>(motoSearchUrl({ ...base, ...filters }, offset, options.apiBase), {
        timeoutMs: 45_000,
        // Nunca se reintenta adentro de fetchJson: un reintento multiplica los intentos de proxy del
        // puente, que es justo lo que dispara la ventana de 10 minutos.
        retries: 0,
        unthrottled: true,
        onFailure: detail => {
          failure = detail;
        },
      });
      if (!page || typeof page !== "object") {
        reason = failure ? `puente caído: ${failure}` : "puente caído";
        streak++;
        if (streak >= CAR_HARVEST_RETRY.failureStreak) startCooldown();
        continue;
      }
      if (!motoPageMatches(page, filters, offset)) {
        reason = "página desfasada";
        continue;
      }
      streak = 0;
      pages++;
      return page;
    }
    failedPages++;
    if (reason) failureReasons.add(reason);
    return null;
  }

  function accept(page: MLCarPage, brand: Named, model: Named): void {
    const observedAt = clock().toISOString();
    const cards = collectPolycards(page.components ?? page) as unknown as MLCarCard[];
    for (const card of cards) {
      const raw = toRawMoto(card, {
        brandId: brand.id,
        brand: brand.name,
        modelId: model.id,
        model: model.name,
        observedAt,
        maxYear,
      });
      if (!raw) {
        rejectedCards++;
        continue;
      }
      if (!listings.has(raw.id)) listings.set(raw.id, raw);
    }
  }

  /** De un barrido por faceta sólo interesa el id: la identidad ya la dio el barrido por marca/modelo. */
  function facetIds(page: MLCarPage): string[] {
    const found: string[] = [];
    for (const card of collectPolycards(page.components ?? page) as unknown as MLCarCard[]) {
      const id = String(card.metadata?.id || "");
      if (!/^MLU\d{6,14}$/.test(id) || card.metadata?.category_id !== ML_MOTOS_CATEGORY || card.metadata?.is_pad === "true") continue;
      found.push(id);
    }
    return found;
  }

  const collectType = (typeId: string) => (page: MLCarPage): void => {
    for (const id of facetIds(page)) {
      if (EXCLUDED_TYPE_IDS.includes(typeId)) excluded.add(id);
      const type = TYPE_BY_ID.get(typeId);
      if (type) types.set(id, type);
    }
  };

  const collectDisplacement = (facetId: string) => (page: MLCarPage): void => {
    for (const id of facetIds(page)) {
      const hits = displacementHits.get(id) ?? new Set<string>();
      hits.add(facetId);
      displacementHits.set(id, hits);
    }
  };

  const modelTask = (brand: Named, model: Named, extra: Record<string, string> = {}): Task => async () => {
    const filters = { BRAND: brand.id, MODEL: model.id, ...extra };
    const first = await read(filters, 0);
    if (!first) {
      failedBrands.add(brand.id);
      return [];
    }
    accept(first, brand, model);
    const total = count(first.paging?.total) ?? 0;
    if (total > ML_OFFSET_CEILING && !extra.VEHICLE_YEAR) {
      const years = facetValues(first, "VEHICLE_YEAR");
      const covered = years.reduce((sum, year) => sum + year.results, 0);
      if (covered < total) gaps.push({ brandId: brand.id, brand: `${brand.name} ${model.name} (sin año)`, missing: total - covered });
      return years.map(year => modelTask(brand, model, { VEHICLE_YEAR: year.id }));
    }
    if (total > ML_OFFSET_CEILING) gaps.push({ brandId: brand.id, brand: `${brand.name} ${model.name}`, missing: total - ML_OFFSET_CEILING });
    const tasks: Task[] = [];
    for (let offset = ML_PAGE_SIZE; offset < Math.min(total, ML_OFFSET_CEILING); offset += ML_PAGE_SIZE) {
      tasks.push(async () => {
        const next = await read(filters, offset);
        if (next) accept(next, brand, model);
        else failedBrands.add(brand.id);
        return [];
      });
    }
    return tasks;
  };

  const brandTask = (brand: Named): Task => async () => {
    const first = await read({ BRAND: brand.id }, 0);
    if (!first) {
      failedBrands.add(brand.id);
      return [];
    }
    const models = facetValues(first, "MODEL");
    const total = count(first.paging?.total) ?? 0;
    const covered = models.reduce((sum, model) => sum + model.results, 0);
    if (covered < total) gaps.push({ brandId: brand.id, brand: brand.name, missing: total - covered });
    options.onProgress?.(`[motos] ${brand.name}: ${models.length} modelos, ${total} avisos`);
    return models.map(model => modelTask(brand, model));
  };

  /** Recorre una faceta entera y le pasa a `collect` los ids de cada página. */
  const facetTask = (facet: string, valueId: string, label: string, collect: (page: MLCarPage) => void): Task => async () => {
    const filters = { [facet]: valueId };
    const first = await read(filters, 0);
    if (!first) return [];
    collect(first);
    const total = count(first.paging?.total) ?? 0;
    const tasks: Task[] = [];
    for (let offset = ML_PAGE_SIZE; offset < Math.min(total, ML_OFFSET_CEILING); offset += ML_PAGE_SIZE) {
      tasks.push(async () => {
        const next = await read(filters, offset);
        if (next) collect(next);
        return [];
      });
    }
    options.onProgress?.(`[motos] ${label}: ${total} avisos`);
    return tasks;
  };

  const root = await read({}, 0);
  const allBrands = root ? facetValues(root, "BRAND") : [];
  const reportedTotal = root ? count(root.paging?.total) : null;
  if (root && reportedTotal !== null) {
    const covered = allBrands.reduce((sum, brand) => sum + brand.results, 0);
    if (covered < reportedTotal) gaps.push({ brandId: "*", brand: "(sin marca)", missing: reportedTotal - covered });
  }
  // Mercado Libre no devuelve la faceta ordenada por volumen, así que el tope se aplica sobre una
  // copia ordenada: si se recorta, que lo que quede sea lo que más mercado explica.
  const brands =
    options.maxBrands && options.maxBrands < allBrands.length
      ? [...allBrands].sort((a, b) => b.results - a.results).slice(0, options.maxBrands)
      : allBrands;
  const truncatedBrands = brands.length < allBrands.length;
  if (brands.length) {
    // Secuencial a propósito (concurrencia 1): ver el comentario de cabecera y CAR_HARVEST_RETRY.
    await drainTasks(
      brands.map(brandTask),
      1,
      () => {
        taskErrors++;
      }
    );
  }

  // El barrido por tipo va DESPUÉS del de marcas: si el presupuesto se agota, lo que se pierde es la
  // etiqueta de tipo, no la identidad ni el precio. Las tres facetas excluidas van primero dentro de
  // este barrido por el mismo motivo: sacar un cuatriciclo importa más que etiquetar una naked.
  const sweep: Task[] = [
    ...MOTO_EXCLUDED_TYPES.map(entry => facetTask("MOTO_TYPE", entry.id, `tipo ${entry.label}`, collectType(entry.id))),
    ...(options.displacementSweep
      ? MOTO_DISPLACEMENT_FACETS.map(entry =>
          facetTask("ENGINE_DISPLACEMENT", entry.id, `cilindrada ${entry.label}`, collectDisplacement(entry.id))
        )
      : []),
    ...(options.typeSweep
      ? MOTO_TYPES.map(entry => facetTask("MOTO_TYPE", entry.id, `tipo ${entry.label}`, collectType(entry.id)))
      : []),
  ];
  if (root) {
    await drainTasks(sweep, 1, () => {
      taskErrors++;
    });
  }

  const note = !root
    ? "el puente de Mercado Libre no respondió"
    : truncatedBrands
      ? `sólo las ${brands.length} marcas más grandes de ${allBrands.length}: cosecha parcial`
      : budgetCut
      ? "presupuesto de pedidos o de tiempo agotado: cosecha parcial"
      : taskErrors > 0
        ? `${taskErrors} tareas fallaron por un error inesperado: cosecha parcial`
        : failedPages
          ? `${failedPages} páginas sin respuesta válida (${[
              ...failureReasons,
              ...(cooldowns ? [`${cooldowns} esperas por caída del puente`] : []),
            ].join(", ")})`
          : null;

  return {
    mode: options.mode,
    startedAt,
    finishedAt: clock().toISOString(),
    listings: [...listings.values()].sort((a, b) => a.id.localeCompare(b.id)),
    types: [...types].map(([id, type]) => ({ id, type })).sort((a, b) => a.id.localeCompare(b.id)),
    displacements: [...displacementHits]
      .map(([id, hits]) => ({ id, band: resolveDisplacementBand([...hits]) }))
      .filter((row): row is { id: string; band: MotoDisplacementBandId } => row.band !== null)
      .sort((a, b) => a.id.localeCompare(b.id)),
    excludedIds: [...excluded].sort(),
    requests,
    pages,
    failedPages,
    rejectedCards,
    cooldowns,
    // Un error de tarea deja sin saber qué marca perdió datos a mitad del recorrido, así que ninguna
    // cuenta como completa — y sin marca completa, una ausencia nunca retira un aviso.
    completeBrands: taskErrors > 0 ? [] : brands.map(brand => brand.id).filter(id => !failedBrands.has(id)).sort(),
    gaps,
    reportedTotal,
    note,
  };
}
