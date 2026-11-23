// De un aviso crudo a una moto con todo lo derivado ya calculado, y el filtro de lo que no es una
// moto. Todo puro: ni red ni base, así que se prueba entero sin nada levantado.
import { carColorFamily } from "../autos/bodyType";
import { fold, slugify, titleFlags, wordText } from "../autos/normalize";
import { declaredRisks, type CarRisk } from "../autos/risk";
import { attachDisplacement, type DisplacementInput } from "./displacement";
import {
  displacementBandOf,
  motoHasNoModel,
  motoProductKey,
  motoRejection,
  motoTypeFromTitle,
  type MotoRejection,
} from "./identify";
import { MOTO_SOURCES } from "./sources";
import { motoFuelOf } from "./sources/mercadolibre";
import type {
  MotoCurrency,
  MotoDetail,
  MotoDisplacementBandId,
  MotoFuel,
  MotoKmQuality,
  MotoListing,
  MotoPricePoint,
  MotoType,
  PublicMotoSpecs,
  RawMotoListing,
  StoredMoto,
} from "./types";

/**
 * Calidad del kilometraje. NO se reusa `kmQuality` de autos y el motivo está medido: allá todo lo
 * que está debajo de 1.000 km es stock 0 km de automotora, y acá no — de las 100 tarjetas leídas el
 * 2026-09-22, "Sherco Sef 300 My 2026" tiene 11 km reales, la "Ktm 890 Adventure R" 14 y el
 * "Morbidelli N352" 200. Lo que en este catálogo sí es un placeholder es el **1**: "Vespa 125" de
 * 2009, "Honda 50, C-70" de 1979 y "Moto Zanela Due 50 Cc" de 1991 vienen las tres con 1 km, que es
 * lo que queda cuando el vendedor no declaró nada.
 *
 * El dígito repetido se exige de CUATRO cifras para arriba (111.111 es el placeholder clásico de ML
 * y aparece en esta categoría también), porque con el patrón de autos "11" sería un placeholder y en
 * motos 11 km es un número real.
 */
export function motoKmQuality(km: number | null): MotoKmQuality {
  if (km === null || !Number.isFinite(km)) return "unknown";
  if (km <= 1) return "placeholder";
  // Nadie vende una moto con más de 300.000 km; ese número es un error de tipeo o un precio metido
  // en el campo equivocado.
  if (km > 300_000) return "placeholder";
  if (/^(\d)\1{3,}$/.test(String(Math.round(km)))) return "placeholder";
  return "ok";
}

/** Una baja que OBSERVAMOS: el precio guardado anterior era mayor, en la misma moneda. */
export function motoPriceDrop(
  listing: Pick<RawMotoListing, "price" | "currency">,
  history: readonly MotoPricePoint[]
): MotoListing["priceDrop"] {
  if (history.length < 2) return null;
  const current = history[history.length - 1]!;
  const previous = history[history.length - 2]!;
  if (current.price !== listing.price || current.currency !== listing.currency) return null;
  if (previous.currency !== listing.currency || previous.price <= listing.price) return null;
  return { from: previous.price, currency: listing.currency, since: current.observedAt };
}

/** El título dice que es eléctrica aunque la etiqueta de ML no lo diga. */
const TITULO_ELECTRICA = /\b(electric[oa]s?|e-?bike|litio)\b/;

export interface EnrichMotoContext {
  usdUyu: number;
  firstSeen: string;
  lastSeen: string;
  priceHistory: readonly MotoPricePoint[];
  /** El tipo que declaró la faceta `MOTO_TYPE` del origen, cuando la corrida la barrió. */
  declaredType?: MotoType | null;
  /** El tramo de cilindrada que declaró la faceta `ENGINE_DISPLACEMENT`, cuando la corrida la barrió. */
  declaredBand?: MotoDisplacementBandId | null;
  /** La ficha propia del aviso, si `sync_motos_detail.ts` ya la leyó. */
  detail?: MotoDetail | null;
}

/**
 * La fila «Tipo de moto» de la ficha a la taxonomía de la faceta. Medido el 2026-11-23: casi siempre
 * es la etiqueta de ML en plural ("Scooters", "Deportivas"); cuando es texto libre ("Yumbo 125 gtr")
 * no matchea nada y no decide nada.
 */
const FICHA_TYPES: Array<[RegExp, MotoType]> = [
  [/^calle$/, "calle"],
  [/^naked$/, "naked"],
  [/^scooters?$/, "scooter"],
  [/^doble proposito$/, "doble-proposito"],
  [/^deportivas?$/, "deportiva"],
  [/^custom$/, "custom"],
  [/^choppers?$/, "chopper"],
  [/^cruceros?$/, "crucero"],
  [/^cross$/, "cross"],
  [/^enduro$/, "enduro"],
  [/^trial$/, "trial"],
  [/^turismo$/, "turismo"],
  [/^(mini motos?|pit ?bikes?)$/, "mini"],
];

export function motoTypeFromFicha(typeText: string | null | undefined): MotoType | null {
  const text = fold(String(typeText ?? "")).replace(/\s+/g, " ").trim();
  return FICHA_TYPES.find(([pattern]) => pattern.test(text))?.[1] ?? null;
}

/** La ficha dice que no es una moto: los mismos tres tipos que la faceta excluye. */
export function motoFichaExcluded(detail: MotoDetail | null | undefined): boolean {
  return /^(cuatriciclos?|triciclos?|motocarros?)$/.test(fold(String(detail?.typeText ?? "")).trim());
}

/**
 * Un aviso cuya ficha, leída DESPUÉS de la última vez que lo vimos en la búsqueda, dice que ya no
 * está activo (pausado, finalizado): no se publica. Si la búsqueda lo volvió a mostrar después de
 * leer la ficha, manda la búsqueda — se reactivó.
 */
export function motoInactive(doc: Pick<StoredMoto, "detail" | "lastSeen" | "detailGoneAt">): boolean {
  if (doc.detailGoneAt && doc.detailGoneAt >= doc.lastSeen) return true;
  return !!doc.detail && doc.detail.active === false && doc.detail.readAt >= doc.lastSeen;
}

const yesNo = (value: string | undefined): boolean | null => {
  const text = fold(String(value ?? "")).trim();
  return text === "si" ? true : text === "no" ? false : null;
};

/**
 * La potencia declarada, sólo si se puede creer: la unidad tiene que ser hp, cv o kW y el número
 * plausible para la moto. Medido: «636 hp» para una Ninja 636 (es la cilindrada en el campo de la
 * potencia), «125 kW» para una Yumbo 125, «150 W» para una Vespa. Ninguna moto de calle pasa de
 * 250 hp, y ninguna da más de 0,25 hp por cc.
 */
export function motoPowerOf(raw: string | null | undefined, displacement: number | null): string | null {
  const match = /^(\d{1,3}(?:[.,]\d{1,2})?)\s*(hp|cv|kw)$/i.exec(String(raw ?? "").trim());
  if (!match) return null;
  const value = Number(match[1]!.replace(",", "."));
  const unit = match[2]!.toLowerCase() === "kw" ? "kW" : match[2]!.toLowerCase();
  const hp = unit === "kW" ? value * 1.341 : value;
  if (!(hp >= 1 && hp <= 250)) return null;
  if (displacement !== null && hp > displacement * 0.25 + 2) return null;
  return `${match[1]} ${unit}`;
}

export function motoSpecsOf(detail: MotoDetail | null | undefined, displacement: number | null): PublicMotoSpecs | null {
  if (!detail) return null;
  const specs = detail.specs ?? {};
  const engine = /^([24]) tiempos$/i.exec(String(specs["Motor"] ?? "").trim());
  const gears = Number(String(specs["Numero de velocidades"] ?? specs["Número de velocidades"] ?? "").replace(/[^\d]/g, ""));
  const short = (value: string | undefined) => (value && value.trim() ? value.trim().slice(0, 60) : null);
  return {
    engine: engine ? `${engine[1]} tiempos` : null,
    brakes: short(specs["Frenos"]),
    transmission: short(specs["Transmisión"]),
    gears: Number.isInteger(gears) && gears >= 1 && gears <= 8 ? gears : null,
    power: motoPowerOf(specs["Potencia"], displacement),
    uniqueOwner: yesNo(specs["Único dueño"]),
    tradeIn: yesNo(specs["Acepta permuta"]),
    negotiable: yesNo(specs["Con precio negociable"]),
    readAt: detail.readAt,
  };
}

const ML_PICTURE = /^https:\/\/http2\.mlstatic\.com\//;

/**
 * Lo que declara el vendedor, con el detector de autos (`declaredRisks`) y dos correcciones propias,
 * medidas sobre las 590 fichas leídas el 2026-11-23:
 *   * La regla de deuda de autos cuenta CUALQUIER mención de "SUCIVE", así que «Documentación:
 *     totalmente al día (SUCIVE pago, sin multas ni deudas)» salía como deuda — y la negación con
 *     «ni» tampoco la ataja. Una cita de deuda que dice que está al día, paga o sin deudas, y no da
 *     ningún monto ni un "debe", no es una deuda.
 *   * «Puedo permutar auto al día o con deuda pagable» habla del vehículo que el vendedor ACEPTA en
 *     parte de pago, no de la moto.
 * No se toca el detector de autos desde acá: su página de riesgo publica estas citas y cambiarlo sin
 * medir allá movería sus números.
 */
const DEUDA_NEGADA = /\b(al dia|sucive pago|pagad[oa]s?|sin (?:multas|deudas?)|ni (?:multas|deudas?)|libre de deudas?)\b/;
const DEUDA_AFIRMADA = /\b(debe|adeuda\w*|impag\w*|atrasad\w*)\b|\$\s?\d|u\$s\s?\d/;
const OTRO_VEHICULO_EN_PERMUTA = /\b(permut\w*|tomo|recibo|acepto)\b/;

export function motoDeclaredRisks(title: string, description: string): CarRisk[] {
  return declaredRisks(title, description).filter(risk => {
    if (risk.category !== "deuda") return true;
    const quote = fold(risk.quote);
    if (OTRO_VEHICULO_EN_PERMUTA.test(quote)) return false;
    return !(DEUDA_NEGADA.test(quote) && !DEUDA_AFIRMADA.test(quote));
  });
}

/** Lo que la cascada de cilindrada necesita de una moto ya enriquecida. */
const displacementInput = (listing: MotoListing, declaredBand: MotoDisplacementBandId | null): DisplacementInput => ({
  // Un aviso todavía sin modelo es su propia cohorte: "Honda Sin modelo" junta motos distintas y su
  // consenso inventaría una cilindrada.
  marketSlug: motoHasNoModel(listing) ? `${listing.marketSlug}#${listing.key}` : listing.marketSlug,
  model: listing.model,
  title: listing.title,
  declaredBand,
  fichaDisplacement: listing.detail?.displacement ?? null,
  electric: listing.fuel === "electrica",
});

/** Pone la cilindrada (y lo que cuelga de ella) que devolvió la cascada. */
function withDisplacement(
  listing: MotoListing,
  declaredBand: MotoDisplacementBandId | null,
  result: ReturnType<typeof attachDisplacement>[number]
): MotoListing {
  const derivedBand = displacementBandOf(result.displacement);
  return {
    ...listing,
    displacement: result.displacement,
    displacementBasis: result.displacementBasis,
    displacementVotes: result.displacementVotes,
    exactDisplacement: result.exactDisplacement,
    // El tramo lo declara la faceta del origen; si la corrida no la barrió, sale de la cilindrada que
    // haya, con la base de esa cilindrada. Nunca al revés: un tramo no inventa una cilindrada.
    displacementBand: declaredBand ?? derivedBand,
    displacementBandBasis: declaredBand ? "mercadolibre" : derivedBand ? result.displacementBasis : null,
    // La identidad de producto sólo con el DATO del aviso: una estimación no parte cohortes.
    productKey: motoProductKey(listing.brand, listing.model, result.exactDisplacement),
    // La potencia se mide contra la mejor cilindrada que haya, también la estimada: «125 kW» en una
    // GTR 125 sin cilindrada en la ficha pasaba con el tope absoluto (medido el 2026-11-23).
    specs: listing.specs ? { ...listing.specs, power: motoPowerOf(listing.detail?.specs?.["Potencia"], result.displacement) } : null,
  };
}

/**
 * La cascada entera sobre el catálogo: el consenso del modelo necesita ver a todos los avisos a la
 * vez, así que corre DESPUÉS de enriquecer uno por uno (que ya dejó ficha, título y nombre).
 */
export function attachMotoDisplacements(listings: readonly MotoListing[]): MotoListing[] {
  const bandOf = (listing: MotoListing) => (listing.displacementBandBasis === "mercadolibre" ? listing.displacementBand : null);
  const results = attachDisplacement(listings.map(listing => displacementInput(listing, bandOf(listing))));
  return listings.map((listing, index) => withDisplacement(listing, bandOf(listing), results[index]!));
}

/**
 * El modelo de un aviso que Mercado Libre trajo sin modelo (el barrido por marca): la fila «Modelo»
 * de su ficha propia, que es el mismo atributo que el vendedor dejó vacío en la búsqueda pero cargó
 * en el aviso. Si la ficha no lo dice, sigue sin modelo.
 */
export function motoModelFromFicha(raw: RawMotoListing, detail: MotoDetail | null): RawMotoListing {
  if (!motoHasNoModel(raw)) return raw;
  const fichaModel = String(detail?.specs?.["Modelo"] ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  if (!fichaModel || !slugify(fichaModel)) return raw;
  return { ...raw, model: fichaModel, modelId: `ficha-${slugify(fichaModel)}` };
}

export function enrichMotoListing(input: RawMotoListing, context: EnrichMotoContext): MotoListing {
  const detail = context.detail ?? null;
  const raw = motoModelFromFicha(input, detail);
  const brandSlug = slugify(raw.brand);
  const modelSlug = slugify(raw.model);
  const titleType = motoTypeFromTitle(raw.title);
  const fichaType = motoTypeFromFicha(detail?.typeText);
  // La faceta del origen gana siempre: es lo que el vendedor eligió al publicar. Después la ficha
  // (la misma taxonomía, otra vía) y al final la palabra del título: el orden de la carrocería de autos.
  const type = context.declaredType ?? fichaType ?? titleType;
  const declaredBand = context.declaredBand ?? null;
  const fuel: MotoFuel | null =
    raw.fuel ??
    motoFuelOf(detail?.specs?.["Tipo de combustible"] ?? "") ??
    (TITULO_ELECTRICA.test(wordText(raw.title)) ? "electrica" : null);
  const base: MotoListing = {
    ...raw,
    key: motoKey(raw.id, raw.source),
    sourceName: MOTO_SOURCES[raw.source].name,
    brandSlug,
    modelSlug,
    marketSlug: `${brandSlug}-${modelSlug}`,
    displacement: null,
    displacementBasis: null,
    displacementVotes: null,
    exactDisplacement: null,
    displacementBand: declaredBand,
    displacementBandBasis: declaredBand ? "mercadolibre" : null,
    type,
    typeBasis: context.declaredType ? "mercadolibre" : fichaType ? "ficha" : titleType ? "title" : null,
    productKey: motoProductKey(raw.brand, raw.model, null),
    kmQuality: motoKmQuality(raw.km),
    fuel,
    flags: titleFlags(raw.title, raw.price, raw.currency as MotoCurrency),
    priceUsd: raw.currency === "USD" ? raw.price : Math.round(raw.price / context.usdUyu),
    priceConverted: raw.currency !== "USD",
    // Mercado Libre declara la moneda en cada tarjeta, así que en v1 nunca se deduce. El campo viaja
    // igual porque el comparador de transporte lo LEE para descartar filas (`currencyInferred`), y
    // una fuente futura sin moneda declarada tiene que poder ponerlo en true sin cambiar el contrato.
    currencyInferred: raw.currencyInferred === true,
    firstSeen: context.firstSeen,
    lastSeen: context.lastSeen,
    priceDrop: motoPriceDrop(raw, context.priceHistory),
    pictures: (detail?.pictures ?? []).filter(url => ML_PICTURE.test(url)).slice(0, 8),
    color: carColorFamily(detail?.color),
    specs: motoSpecsOf(detail, null),
    // El que afirma es el vendedor: la cita sale de su título o de su descripción.
    risks: motoDeclaredRisks(raw.title, detail?.description ?? ""),
    detail,
  };
  // Sola, la cascada ve ficha, título y nombre del modelo; el consenso lo agrega
  // `attachMotoDisplacements` cuando están todos.
  const [single] = attachDisplacement([displacementInput(base, declaredBand)]);
  return withDisplacement(base, declaredBand, single!);
}

export function motoKey(id: string, source: RawMotoListing["source"] = "mercadolibre"): string {
  return `${source === "mercadolibre" ? "ml" : source === "facebook" ? "fb" : source}-${id}`;
}

export interface MotoFilterResult<T> {
  kept: T[];
  /** Cuántos se fueron por cada motivo. Se publica en el log: la ausencia se declara. */
  rejected: Partial<Record<MotoRejection | "tipo-excluido", number>>;
}

/**
 * Saca del directorio lo que no es una moto usada en venta.
 *
 * `excludedIds` son los avisos que la PROPIA taxonomía de Mercado Libre clasifica como cuatriciclo,
 * triciclo o motocarro (faceta `MOTO_TYPE`). Van primero porque son los únicos con evidencia del
 * origen; el título es el respaldo, y hace falta: de los 23 títulos distintos de esas tres facetas,
 * 16 no nombran su clase en ninguna parte (ver ./identify.ts).
 */
export function filterMotos<T extends { id: string; title: string }>(
  listings: readonly T[],
  excludedIds: ReadonlySet<string> = new Set()
): MotoFilterResult<T> {
  const kept: T[] = [];
  const rejected: MotoFilterResult<T>["rejected"] = {};
  for (const listing of listings) {
    if (excludedIds.has(listing.id)) {
      rejected["tipo-excluido"] = (rejected["tipo-excluido"] ?? 0) + 1;
      continue;
    }
    const reason = motoRejection(listing.title);
    if (reason) {
      rejected[reason] = (rejected[reason] ?? 0) + 1;
      continue;
    }
    kept.push(listing);
  }
  return { kept, rejected };
}

/**
 * La misma moto publicada en dos fuentes queda UNA vez, con la de menor `priority` (ver
 * ./sources/index.ts). Misma marca, modelo y año, km dentro de max(500, 1 %) y precio dentro del 3 %
 * — los mismos umbrales que `classes/autos/dedupe.ts`, que es el archivo del que sale la regla.
 *
 * En v1 hay una sola fuente y esto no descarta nada; existe porque es el seam por el que entra la
 * segunda, y porque una identidad de producto que sólo funciona con una fuente no es una identidad.
 */
const DUPLICATE = { kmAbsolute: 500, kmRatio: 0.01, priceRatio: 0.03 } as const;

export function motoTwins(a: MotoListing, b: MotoListing): boolean {
  return (
    a.brandId === b.brandId &&
    a.modelId === b.modelId &&
    a.year === b.year &&
    a.km !== null &&
    b.km !== null &&
    Math.abs(a.km - b.km) <= Math.max(DUPLICATE.kmAbsolute, a.km * DUPLICATE.kmRatio) &&
    Math.abs(a.priceUsd - b.priceUsd) <= a.priceUsd * DUPLICATE.priceRatio
  );
}

export function dedupeMotos(listings: readonly MotoListing[]): {
  kept: MotoListing[];
  duplicates: Partial<Record<RawMotoListing["source"], number>>;
} {
  const sorted = [...listings].sort(
    (a, b) => MOTO_SOURCES[a.source].priority - MOTO_SOURCES[b.source].priority || a.key.localeCompare(b.key)
  );
  const keptByMoto = new Map<string, MotoListing[]>();
  const kept: MotoListing[] = [];
  const duplicates: Partial<Record<RawMotoListing["source"], number>> = {};
  for (const listing of sorted) {
    const cohort = `${listing.brandId}|${listing.modelId}|${listing.year}`;
    const peers = keptByMoto.get(cohort) ?? [];
    if (peers.some(peer => peer.source !== listing.source && motoTwins(peer, listing))) {
      duplicates[listing.source] = (duplicates[listing.source] ?? 0) + 1;
      continue;
    }
    peers.push(listing);
    keptByMoto.set(cohort, peers);
    kept.push(listing);
  }
  return { kept, duplicates };
}
