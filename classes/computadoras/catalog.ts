// De lo crudo (`computerlistings` + fichas de Facebook) a la fila pública de `computercatalog`.
//
// El orden importa: primero se leen TODOS los avisos (especificaciones), después se arma la tabla de
// precios por pieza con lo que hay (sabiendo cuántos avisos usan cada pieza), y recién ahí cada fila
// recibe su valuación y sus comparables. La moneda deducida de Facebook necesita una referencia (lo
// que valen sus piezas o sus iguales), así que también va después de la tabla.
import { canonicalDepartment } from "../rentals/normalize";
import { readCurrency } from "./currency";
import { capBySeller, opportunityOf } from "./opportunity";
import { cpuLacksGraphics, partIdentityOf, partsOf } from "./parts";
import { readComputerSpecs, specCount } from "./specs";
import { median, norm, round } from "./text";
import { isMachineKind, type Comparables, type ComputerCatalogRow, type ComputerSpecs, type FacebookComputerDetail, type PartObservation, type PartRow, type RawComputerListing, type Valuation } from "./types";
import { valueListing, valuePart } from "./valuation";

export interface ReadListing {
  raw: RawComputerListing;
  detail: FacebookComputerDetail | null;
  specs: ComputerSpecs;
}

/** Las especificaciones de cada aviso; los que no son computadoras ni piezas quedan afuera. */
export function readListings(raws: readonly RawComputerListing[], details: ReadonlyMap<string, FacebookComputerDetail>): ReadListing[] {
  const out: ReadListing[] = [];
  for (const raw of raws) {
    const detail = raw.source === "facebook" ? details.get(raw.sourceId) ?? null : null;
    if (detail?.gone) continue;
    const specs = readComputerSpecs({
      title: raw.title,
      description: detail?.description ?? null,
      mlCategory: raw.source === "mercadolibre" ? raw.category : null,
      mlCondition: raw.source === "mercadolibre" ? raw.condition : null,
      fbAttributes: detail?.attributes ?? null,
    });
    if (!specs.kind) continue;
    out.push({ raw, detail, specs });
  }
  return out;
}

/** Cuántos avisos usan (o son) cada identidad de pieza: ordena la tabla y decide qué buscar nuevo. */
export function usageOf(read: readonly ReadListing[]): Map<string, number> {
  const usage = new Map<string, number>();
  const bump = (slug: string | null | undefined): void => {
    if (slug) usage.set(slug, (usage.get(slug) ?? 0) + 1);
  };
  for (const { specs, raw } of read) {
    for (const need of partsOf(specs)) {
      bump(need.slug);
      if (need.altSlug && need.altSlug !== need.slug) bump(need.altSlug);
    }
    for (const identity of partIdentityOf(specs, raw.title)) bump(identity.slug);
    if (specs.kind && isMachineKind(specs.kind) && specs.kind !== "desktop" && specs.cpu?.slug) bump(specs.cpu.slug);
  }
  return usage;
}

/** El precio del aviso en dólares con la moneda que declara la tarjeta. */
const cardUsd = (raw: RawComputerListing, usdUyu: number): number => (raw.currency === "USD" ? raw.price : raw.price / usdUyu);

/** Las piezas sueltas usadas del directorio como observaciones de precio (sin fallas, moneda declarada). */
export function usedPartObservations(read: readonly ReadListing[], usdUyu: number): PartObservation[] {
  const out: PartObservation[] = [];
  for (const { raw, specs } of read) {
    if (specs.kind === "combo" || isMachineKind(specs.kind) || specs.faults.length || specs.condition === "new") continue;
    // Facebook en pesos chicos puede ser dólares: una pieza usada a menos de 6.000 pesos sólo entra
    // si la tarjeta dijo dólares. Sin eso, la tabla usada se contaminaría con la duda.
    if (raw.source === "facebook" && raw.currency === "UYU" && raw.price <= 6_000) continue;
    const priceUsd = cardUsd(raw, usdUyu);
    if (!(priceUsd >= 5)) continue;
    for (const identity of partIdentityOf(specs, raw.title)) {
      out.push({ ...identity, condition: "used", priceUsd, sellerId: raw.sellerId ?? raw.slug, title: raw.title, url: raw.url, image: raw.image });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Ubicación

const CITY_DEPARTMENT: Record<string, string> = {
  "las piedras": "Canelones", "la paz": "Canelones", pando: "Canelones", "ciudad de la costa": "Canelones", "barros blancos": "Canelones",
  progreso: "Canelones", "colonia nicolich": "Canelones", piedras: "Canelones", "cap. juan a. artigas": "Canelones", atlantida: "Canelones",
  "el pinar": "Canelones", solymar: "Canelones", lagomar: "Canelones", "santa lucia": "Canelones", "joaquin suarez": "Canelones", toledo: "Canelones",
  "punta del este": "Maldonado", "san carlos": "Maldonado", piriapolis: "Maldonado", "pan de azucar": "Maldonado",
  melo: "Cerro Largo", mercedes: "Soriano", dolores: "Soriano", "fray bentos": "Río Negro", young: "Río Negro", minas: "Lavalleja",
  trinidad: "Flores", carmelo: "Colonia", "nueva helvecia": "Colonia", "juan lacaze": "Colonia", "colonia del sacramento": "Colonia",
  "rosario": "Colonia", libertad: "San José", "ciudad del plata": "San José", "bella union": "Artigas", chuy: "Rocha", "la paloma": "Rocha",
};

export function locationOf(raw: RawComputerListing): { department: string | null; city: string | null } {
  const parts = String(raw.location ?? "").split(",").map((part) => part.trim()).filter((part) => part && !/^uruguay$/i.test(part));
  if (!parts.length) return { department: null, city: null };
  const city = parts[0]!;
  const department = (parts.length >= 2 ? canonicalDepartment(parts[1]!) : "") || canonicalDepartment(city) || CITY_DEPARTMENT[norm(city)] || null;
  return { department, city };
}

// ---------------------------------------------------------------------------------------------
// Comparables

interface Priced {
  item: ReadListing;
  priceUsd: number;
  inferred: boolean;
  ambiguous?: boolean;
}

/** Placa dedicada de 2016 en adelante, procesador de 2017 en adelante o un Apple M. */
export function hasModernParts(specs: ComputerSpecs): boolean {
  const gpu = specs.gpu && !specs.gpu.integrated && (specs.gpu.year ?? 0) >= 2016;
  const cpu = (specs.cpu?.year ?? 0) >= 2017 || specs.cpu?.family === "apple-m";
  return !!gpu || cpu;
}

/** 123456, 111111, 188888: el precio de relleno de quien no quiere poner precio. Los nueves no: «$ 9.999» y
 * «$ 99.999» son precios de verdad. */
export function isPlaceholderPrice(price: number): boolean {
  const text = String(Math.round(price));
  return /([0-8])\1{4,}/.test(text) || ["1234", "12345", "123456", "1234567", "12345678"].includes(text);
}

// Sólo los tamaños de siempre hacen cohorte por RAM. 12, 20 o 24 GB caían en el tramo de arriba y
// un «MacBook Pro M4 Pro 24 GB» se comparaba contra «… y 32 GB»: esos van a la cohorte sin RAM.
const RAM_BUCKET = (gb: number | null): string => (gb && [4, 8, 16, 32, 64].includes(gb) ? String(gb) : "");
// Cada tipo de máquina con los suyos: un Mac mini M1 (US$ 500) y un iMac M1 (US$ 1.000) comparten chip
// y nada más, y juntos hacían del Mac mini una «oportunidad» (24/11/2026).
const kindGroupOf = (kind: string): string => kind;

/** Las claves de cohorte de un aviso, de la más estrecha a la más ancha, con su etiqueta y su base. */
interface Cohort {
  key: string;
  label: string;
  basis: Comparables["basis"];
  /** Cohorte por procesador, placa o chip exactos: la que sostiene una oportunidad sólida. */
  strict: boolean;
}

function cohortKeys(specs: ComputerSpecs): Cohort[] {
  const kind = specs.kind!;
  const group = kindGroupOf(kind);
  const cpu = specs.cpu;
  const keys: Cohort[] = [];
  if (kind === "desktop") {
    // Siempre procesador + placa: «PCs con i7-8700» mezclaba una de oficina con una gamer con GTX
    // 1060, y la de oficina salía «muy por debajo» de la mediana de las otras (23/11/2026).
    if (!cpu?.slug) return keys;
    const dedicated = specs.gpu && !specs.gpu.integrated ? specs.gpu.baseSlug ?? specs.gpu.slug : null;
    if (specs.gpu && !specs.gpu.integrated && !dedicated) return keys;
    // Un procesador SIN gráficos (Ryzen 5 5600X, i5-12400F) con la placa sin declarar no es «sin placa
    // dedicada»: tiene una y no se sabe cuál, de una GTX 1650 a una RTX 4070. Juntarlas dio en
    // producción una «oportunidad sólida» de 52 % (24/11/2026). Sin placa conocida no hay iguales.
    if (!dedicated && cpuLacksGraphics(specs.cpu)) return keys;
    keys.push({
      key: `${group}|${cpu.slug}|${dedicated ?? "sin-dedicada"}`,
      label: `PCs con ${cpu.label} y ${dedicated ? specs.gpu!.model : "sin placa de video dedicada declarada"}`,
      basis: "cpu+gpu",
      strict: true,
    });
    return keys;
  }
  const ram = RAM_BUCKET(specs.ramGb);
  const what = kind === "notebook" ? "Notebooks" : kind === "all-in-one" ? "All-in-one" : "Mini PC";
  // Un Mac se compara dentro de su línea: «Apple M1» junta una Air (US$ 799) con una Pro (US$ 900).
  const mac = kind === "notebook" && specs.line && /^macbook/.test(specs.line) ? { line: specs.line, label: specs.lineLabel ?? "MacBook" } : null;
  if (cpu?.slug) {
    const scope = mac ? `${mac.line}|` : "";
    const name = mac ? mac.label : what;
    if (ram) keys.push({ key: `${group}|${scope}${cpu.slug}|${ram}`, label: `${name} con ${cpu.label} y ${ram} GB`, basis: mac ? "line" : "cpu", strict: true });
    keys.push({ key: `${group}|${scope}${cpu.slug}`, label: `${name} con ${cpu.label}`, basis: mac ? "line" : "cpu", strict: true });
    return keys;
  }
  // Mac sin chip en el título: la línea y el año que dice («MacBook Air 2017»). Exploratoria: el año
  // lo escribe el vendedor y dentro de un año hay más de una configuración.
  if (mac && specs.modelYear) keys.push({ key: `${group}|${mac.line}|${specs.modelYear}`, label: `${mac.label} de ${specs.modelYear}`, basis: "line", strict: false });
  // Línea + modelo + familia del procesador («ThinkPad T490 con Core i5»). Nunca sin familia: «IdeaPad
  // 3» sola va de US$ 119 a US$ 1.100.
  if (kind === "notebook" && specs.line && specs.model && cpu && !mac) {
    keys.push({ key: `${group}|${specs.line}|${specs.model}|${cpu.family}`, label: `${specs.lineLabel} ${specs.model} con ${cpu.label.replace(/ de \d+ª generación$/, "")}`, basis: "line", strict: false });
  }
  if (cpu && cpu.generation && cpu.brand === "intel" && ram) {
    // Una familia SIN generación mezcla un i5 de 2013 con uno de 2023: no es una cohorte.
    keys.push({ key: `${group}|${cpu.family}-gen${cpu.generation}|${ram}`, label: `${what} ${cpu.label} con ${ram} GB`, basis: "model", strict: false });
  }
  return keys;
}

type FoundComparables = Comparables & { strict: boolean };

function comparablesFor(specs: ComputerSpecs, pool: ReadonlyMap<string, number[]>): FoundComparables | null {
  for (const cohort of cohortKeys(specs)) {
    const prices = pool.get(cohort.key) ?? [];
    if (prices.length >= 4) return { label: cohort.label, medianUsd: round(median(prices)), n: prices.length, basis: cohort.basis, strict: cohort.strict };
  }
  return null;
}

function poolOf(priced: readonly Priced[]): Map<string, number[]> {
  const pool = new Map<string, number[]>();
  for (const { item, priceUsd, inferred } of priced) {
    if (inferred || item.specs.faults.length || !isMachineKind(item.specs.kind)) continue;
    for (const cohort of cohortKeys(item.specs)) {
      const list = pool.get(cohort.key) ?? [];
      list.push(priceUsd);
      pool.set(cohort.key, list);
    }
  }
  return pool;
}

// ---------------------------------------------------------------------------------------------

export interface CatalogInput {
  read: readonly ReadListing[];
  table: ReadonlyMap<string, PartRow>;
  /** La notebook nueva con el mismo procesador, por `notebook:<cpuSlug>`. */
  notebookRefs: ReadonlyMap<string, { label: string; medianUsd: number; n: number }>;
  usdUyu: number;
  /** El día de la corrida (`AAAA-MM-DD`): una oportunidad tiene que haberse visto ayer u hoy. */
  day?: string;
  /** Lo que la corrida no publicó y por qué (lo llena `buildComputerCatalog`). */
  stats?: { heldForDetail: number };
}

/**
 * Un precio dudoso espera su ficha. Facebook nunca informa dólares en la tarjeta (0 de 4.991 el
 * 24/11/2026) y el vendedor escribe el número como le sale: de 424 máquinas entre $ 628 y $ 3.000,
 * había dólares evidentes («Macbook Pro 14\" M3 Pro — $ 1.610»), pesos evidentes («Torre de pc retro
 * Pentium III — $ 1.000») y dudosos («Pc Gamer — $ 1.300»). La descripción lo resuelve casi siempre
 * (trae las piezas, y de ahí sale la referencia), así que la máquina no se publica hasta leerla.
 * Con «dólares» escrito, con una falla declarada (un equipo roto sí vale $ 1.000) o con una
 * referencia que ya permitió deducir la moneda, no espera.
 */
export const HOLD_MAX_UYU = 3_000;
export function waitsForDetail(input: { source: string; price: number; currency: string; inferred: boolean; machine: boolean; faults: readonly unknown[]; detailRead: boolean }): boolean {
  return input.source === "facebook" && input.currency === "UYU" && !input.inferred && input.machine && input.price <= HOLD_MAX_UYU && !input.faults.length && !input.detailRead;
}

/**
 * La clave de «la misma notebook nueva»: el procesador, y en un Mac también la línea («Apple M2»
 * nueva junta una Air de US$ 1.300 con una Pro de US$ 2.500).
 */
export const notebookRefKey = (cpuSlug: string, line: string | null | undefined): string =>
  line && /^macbook-(air|pro)$/.test(line) ? `notebook:${line}|${cpuSlug}` : `notebook:${cpuSlug}`;

/** Un precio que no puede ser de una computadora ni de una pieza (0, «consultar», 1 peso). */
export const PRICE_FLOOR_USD = 15;
/** Menos que esta parte de la mediana de sus iguales (≥ 5) no es un precio de ese equipo. */
export const IMPOSSIBLE_SHARE = 0.15;
/** Más que estas veces la mediana de sus iguales (≥ 5) tampoco. */
export const IMPOSSIBLE_MULTIPLE = 5;
export const PRICE_CEIL_USD = 20_000;

export function buildComputerCatalog(input: CatalogInput): ComputerCatalogRow[] {
  const { usdUyu, table } = input;
  const usable = input.read.filter(({ raw }) => raw.price > 1 && !(raw.source === "mercadolibre" && /^nuevo$/i.test(raw.condition ?? "")));

  // Primera pasada: la moneda de la tarjeta, para tener cohortes con lo que no está en duda.
  const sure: Priced[] = usable
    .filter(({ raw }) => !(raw.source === "facebook" && raw.currency === "UYU" && raw.price <= 6_000))
    .map((item) => ({ item, priceUsd: cardUsd(item.raw, usdUyu), inferred: false }));
  const firstPool = poolOf(sure);

  // La moneda de cada aviso, con lo que valen sus piezas o sus iguales como referencia.
  const priced: Priced[] = usable.map((item) => {
    const { raw, specs, detail } = item;
    let referenceUsd: number | null = null;
    if (raw.source === "facebook" && raw.currency === "UYU" && raw.price <= 6_000) {
      const valuation = valueListing({ specs, priceUsd: 1, table, comparables: comparablesFor(specs, firstPool), sameNew: null, currencyInferred: false });
      // Sólo las piezas DECLARADAS: fuente y gabinete supuestos suman lo mismo para cualquier PC y no
      // dicen nada de ésta («PC GAMER RTX 3090 … $ 2.500» tenía US$ 220 de referencia sólo por ellos).
      const declared = (valuation?.parts ?? []).filter((part) => !part.estimated);
      const partial = Math.max(
        declared.reduce((total, part) => total + (part.usedUsd ?? 0), 0),
        declared.reduce((total, part) => total + (part.newUsd ?? 0), 0) * 0.5
      );
      const identity = partIdentityOf(specs, raw.title)[0];
      const part = identity ? table.get(identity.slug) : null;
      referenceUsd = partial || comparablesFor(specs, firstPool)?.medianUsd || part?.used?.medianUsd || (part?.new ? part.new.medianUsd * 0.6 : null) || null;
    }
    const currency = readCurrency({ amount: raw.price, currency: raw.currency, text: `${raw.title} ${detail?.description ?? ""}`, referenceUsd, usdUyu });
    const priceUsd = currency.currency === "USD" ? raw.price : raw.price / usdUyu;
    // «Rtx 3090 24gb evga ftw3 — $ 825» (23/11/2026): sin referencia la moneda no se puede deducir,
    // y en pesos sería una 3090 a US$ 20 encabezando «las más baratas». Un precio así con piezas
    // modernas no se publica; uno sin piezas que lo contradigan («Laptop dell $ 1000») sí.
    const ambiguous = raw.source === "facebook" && currency.currency === "UYU" && raw.price <= 6_000 && !referenceUsd && hasModernParts(specs) && priceUsd < 80;
    return { item: { ...item, raw: { ...raw, currency: currency.currency } }, priceUsd, inferred: currency.inferred, ambiguous };
  });

  const pool = poolOf(priced);
  const rows: ComputerCatalogRow[] = [];
  const sellers = new Map<string, string | null>();
  for (const { item, priceUsd, inferred, ambiguous } of priced) {
    if (ambiguous || isPlaceholderPrice(item.raw.price)) continue;
    if (priceUsd < PRICE_FLOOR_USD || priceUsd > PRICE_CEIL_USD) continue;
    const { raw, specs, detail } = item;
    const kind = specs.kind!;
    const machine = isMachineKind(kind);
    if (waitsForDetail({ source: raw.source, price: raw.price, currency: raw.currency, inferred, machine, faults: specs.faults, detailRead: !!detail?.found })) {
      if (input.stats) input.stats.heldForDetail++;
      continue;
    }
    const comparables = machine ? comparablesFor(specs, pool) : null;
    // Un precio que no puede ser de ese equipo (la regla de `priceSanity` de autos): menos del 15 % de
    // lo que piden por sus iguales, sin una falla que lo explique. Es un error de moneda o de tipeo, y
    // encabezaría «las más baratas». Se retira el aviso; el precio no se corrige.
    if (comparables && comparables.n >= 5 && !specs.faults.length && priceUsd < comparables.medianUsd * IMPOSSIBLE_SHARE) continue;
    // …y por arriba: cinco veces lo que piden por sus iguales es un cero de más.
    if (comparables && comparables.n >= 5 && priceUsd > comparables.medianUsd * IMPOSSIBLE_MULTIPLE) continue;
    // Sin iguales para comparar, una máquina con piezas modernas por menos de US$ 60 tampoco es un
    // precio («Apple Macbook Pro A2338 … $ 899» en Mercado Libre, en pesos declarados).
    if (machine && !specs.faults.length && hasModernParts(specs) && priceUsd < 60) continue;
    let valuation: Valuation | null;
    if (machine || kind === "combo") {
      const sameNew = kind === "notebook" && specs.cpu?.slug ? input.notebookRefs.get(notebookRefKey(specs.cpu.slug, specs.line)) ?? null : null;
      valuation = valueListing({ specs, priceUsd, table, comparables, sameNew, currencyInferred: inferred });
    } else {
      const identity = partIdentityOf(specs, raw.title);
      const exact = identity[0] ?? null;
      const alt = identity.find((entry) => entry.slug !== exact?.slug && entry.role === exact?.role) ?? null;
      valuation = exact ? valuePart({ slug: exact.slug, altSlug: alt?.slug ?? null, label: exact.label, role: exact.role, priceUsd, table, noVerdict: inferred || specs.faults.length > 0 }) : null;
      // La misma guarda en una pieza: «GTX 1650 — $ 1.000» es el 12 % de lo que piden por la misma
      // usada. No es una ganga: es un precio de «consultar» o un error.
      const used = valuation?.parts[0];
      if (used?.usedUsd && used.usedN >= 3 && !specs.faults.length && priceUsd < used.usedUsd * IMPOSSIBLE_SHARE) continue;
      // Una pieza USADA al doble de la misma nueva («RTX 5080 — $ 186.497») tampoco es un precio.
      if (used?.newUsd && used.newN >= 3 && priceUsd > used.newUsd * 2) continue;
    }
    const { department, city } = locationOf(raw);
    const storageGb = specs.storage.length ? specs.storage.reduce((total, drive) => total + drive.gb, 0) : null;
    const known = specs.storage.filter((drive) => drive.type !== "unknown");
    const { baseSlug: _base, mobile: _mobile, ...gpu } = specs.gpu ?? ({} as NonNullable<ComputerSpecs["gpu"]>);
    rows.push({
      slug: raw.slug,
      source: raw.source,
      url: raw.url,
      title: raw.title.slice(0, 200),
      image: raw.image,
      kind,
      kindGroup: machine ? "computer" : "part",
      price: raw.price,
      currency: item.raw.currency,
      priceUsd: round(priceUsd),
      priceUyu: round(priceUsd * usdUyu),
      currencyInferred: inferred,
      department,
      city,
      condition: specs.condition,
      sellerType: raw.source === "mercadolibre" ? (raw.officialStore ? "tienda" : "particular") : null,
      brand: specs.brand,
      cpu: specs.cpu,
      cpuBrand: specs.cpu?.brand ?? null,
      cpuFamily: specs.cpu?.family ?? null,
      gpu: specs.gpu ? (gpu as ComputerCatalogRow["gpu"]) : null,
      gpuSlug: specs.gpu && !specs.gpu.integrated ? specs.gpu.baseSlug ?? null : null,
      gpuDedicated: specs.gpu ? (!specs.gpu.integrated ? true : specs.gpu.inferred ? null : false) : null,
      ramGb: specs.ramGb,
      ramType: specs.ramType,
      storage: specs.storage,
      storageGb,
      hasSsd: known.length ? known.some((drive) => drive.type === "ssd" || drive.type === "nvme") : null,
      screenInches: specs.screenInches,
      psuWatts: specs.psuWatts,
      chipset: specs.chipset,
      includes: specs.includes,
      faults: specs.faults,
      detailRead: !!detail?.found,
      specCount: specCount(specs),
      valuation,
      // `strict` es de este módulo: la fila pública lleva sólo lo que declara el contrato.
      comparables: comparables ? { label: comparables.label, medianUsd: comparables.medianUsd, n: comparables.n, basis: comparables.basis } : null,
      line: specs.line ?? null,
      lineLabel: specs.lineLabel ?? null,
      model: specs.model ?? null,
      modelYear: specs.modelYear ?? null,
      opportunity: opportunityOf({
        kind,
        source: raw.source,
        priceUsd,
        currencyInferred: inferred,
        faults: specs.faults,
        detailRead: !!detail?.found,
        ageDays: input.day ? Math.max(0, Math.round((Date.parse(input.day) - Date.parse(raw.lastSeen.slice(0, 10))) / 86_400_000)) : 0,
        valuation,
        comparables,
      }),
      firstSeen: raw.firstSeen,
      lastSeen: raw.lastSeen,
      publishedAt: detail?.createdAt ?? raw.firstSeen,
    });
    sellers.set(raw.slug, raw.sellerId);
  }
  // Como mucho tres oportunidades por vendedor de Mercado Libre: una tienda que retoca veinte
  // precios el mismo día no puede ocupar la lista entera.
  const kept = capBySeller(rows.filter((row) => row.opportunity).map((row) => ({ slug: row.slug, sellerId: sellers.get(row.slug) ?? null, savingsPct: row.opportunity!.savingsPct })));
  for (const row of rows) if (row.opportunity && !kept.has(row.slug)) row.opportunity = null;
  return rows;
}
