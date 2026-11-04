// Qué MODELO de monopatín es un aviso, para juntar en una página los avisos de todos los vendedores.
//
// Medido el 2026-11-04 sobre los 774 avisos vivos: la tabla de modelos del régimen `modelo` de equipar
// identificaba por el texto entero del título, así que cada aviso era su propio "producto" (23
// productos, uno por aviso; "Xiaomi 5 Max" tres veces). Con la marca y el modelo que trae la ficha de
// ML salían 190 grupos y 37 con dos vendedores o más. Esto los arma con una regla que se puede leer:
//
//   * la marca es la del aviso (ficha → título, `specs/brands.ts`); una marca desconocida que el título
//     no nombra suele ser el VENDEDOR ("Like Latam"), y no da modelo;
//   * el modelo son hasta tres palabras que siguen a la marca en el título, salteando las genéricas
//     ("Monopatín Eléctrico Electric Xiaomi Scooter 5 Pro 25km/h" → 5 Pro) y cortando en la primera
//     medida, color, conector o palabra de venta;
//   * el modelo de la ficha se usa si el título no trae ninguno, o si el título es ese mismo modelo con
//     ruido alrededor ("Enxuta 45 Meenx552n" con ficha MEENX552N) — nunca para sacarle la gama: "6 Pro"
//     con ficha "Electric Scooter 6" sigue siendo un 6 Pro;
//   * los avisos del mismo producto de catálogo de ML (`/p/MLU…`) son el mismo modelo, porque ML lo
//     dice: toman el modelo mayoritario del grupo.
//
// Precisión sobre recall, como `classes/phones/identify.ts`: un aviso sin modelo queda en el
// directorio y no entra a ninguna página. Nunca se une por precio, foto ni parecido de texto.
import { norm } from "../../equipar/classify";
import { brandPattern, cleanBrand } from "../specs/brands";

export interface ModelIdentity {
  brandKey: string;
  brandLabel: string;
  tokens: string[];
  /** `<brandKey>-<tokens>`: la identidad y el slug de la página. */
  key: string;
  /** El modelo como lo vende la marca ("Electric Scooter 6 Pro", "ME1000", "Kaizen Pro"). */
  label: string;
}

export interface IdentifyInput {
  title: string;
  brand: string | null;
  brandKey: string | null;
  /** El "Modelo" que declara la ficha (ML) o null. */
  fichaModel: string | null;
  source: string;
}

const MAX_TOKENS = 3;
const TIERS = new Set(["pro", "max", "lite", "plus", "ultra", "mini"]);
const TIER_SUFFIX = /^([a-z]*\d[a-z0-9]*?)(pro|max|lite|plus|ultra|mini)$/;

/** Palabras que nunca son parte del nombre de un modelo. */
const GENERIC = new Set(
  (
    "monopatin monopatines scooter scooters patinete patinetes patineta electrico electrica electricos electric " +
    "escooter e-scooter plegable plegables adulto adultos adulta nino ninos nina infantil todoterreno urbano urbana " +
    "original nuevo nueva usado usada oferta ofertas envio gratis garantia modelo mod potente compacto premium smart " +
    "deportivo color con de del para y el la los las en hasta sin carga autonomia velocidad motor bateria rueda " +
    "ruedas doble freno frenos suspension app bluetooth led luces luz asiento kit pack mas km kms metal reforzado " +
    "barato barata version ver edicion global internacional us usa eu negro negra blanco blanca gris azul rojo roja " +
    "rodado pulgadas timbre cover funda repuesto repuestos cargador accesorio accesorios casco " +
    // Palabras de venta (revisión final, 4/11: "6 Lite Entrega Inmediata" daba un modelo aparte).
    "entrega inmediata envios stock tienda liquidacion liviano liviana promo promocion cuotas disponible " +
    "disponibles oficial importado kick kickscooter " +
    "rosa verde naranja amarillo violeta celeste plateado plata dorado mate black white grey gray blue red pink green"
  ).split(" ")
);
/** Sólo al principio: "Mi Electric Scooter Pro 2" es Xiaomi y "mi" no es el modelo. */
const LEADING_ONLY = new Set(["mi", "e"]);
const UNITS = new Set([
  "w",
  "kw",
  "km",
  "kms",
  "kmh",
  "kph",
  "kilometros",
  "h",
  "hs",
  "hr",
  "kg",
  "v",
  "ah",
  "wh",
  "mah",
  "cm",
  "mm",
  "mph",
  "pulg",
  "pulgada",
  "pulgadas",
  "watts",
  "volts",
]);
const MEASURE = /^\d+(?:\.\d+)?(?:w|kw|km|kmh|kph|kg|kgs|v|ah|wh|mah|cm|mm|mph|hs|h|")$/;

/** Prefijo de línea: Xiaomi vende "Electric Scooter 6 Pro", y así se busca. */
const LINE_PREFIX: Record<string, string> = { xiaomi: "Electric Scooter" };

function words(text: string): string[] {
  return (
    norm(text)
      // El punto separa salvo entre dígitos: "8.5" (la rueda) sigue siendo un número.
      .replace(/[,+]|(?<!\d)\.|\.(?!\d)/g, " ")
      .split(/[\s-]+/)
      .filter(Boolean)
      // "Move 2.0" es la versión 2 del Move.
      .map((word) => word.replace(/^(\d)\.0$/, "$1"))
  );
}

/**
 * La generación se escribe "Gen2", "Gen 2", "2nd", "2da Gen" o "segunda": las cinco son `gen2`, y
 * "4 Lite Gen2" sigue siendo otro modelo que el "4 Lite" (medido 4/11: tres claves para el mismo).
 */
function generations(list: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const word = list[i]!;
    const ordinal = /^(\d)(?:nd|da|rd|ra|th|ta|st)$/.exec(word);
    if (/^gen\d$/.test(word)) out.push(word);
    else if (ordinal || word === "segunda") {
      out.push(`gen${ordinal ? ordinal[1] : "2"}`);
      if (/^(gen|generacion)$/.test(list[i + 1] ?? "")) i++;
    } else if (word === "gen" || word === "generacion") {
      if (/^\d$/.test(list[i + 1] ?? "")) out.push(`gen${list[++i]}`);
    } else out.push(word);
  }
  return out;
}

function splitTier(token: string): string[] {
  const match = TIER_SUFFIX.exec(token);
  return match && match[1] ? [match[1], match[2]!] : [token];
}

/**
 * Las palabras del modelo en `text` (ya sin la marca adelante): saltea genéricas iniciales y corta en
 * la primera palabra que no puede ser parte de un nombre de modelo.
 */
function verdict(token: string, next: string | undefined, out: string[], skip: Set<string>): "skip" | "stop" | "take" {
  if (!out.length && (GENERIC.has(token) || skip.has(token) || LEADING_ONLY.has(token))) return "skip";
  if (GENERIC.has(token) || skip.has(token)) return "stop";
  if (MEASURE.test(token)) return "stop";
  if (/^\d+(?:\.\d+)?$/.test(token)) {
    // "25 km", "350 w": una medida separada. Un número pelado grande es una potencia sin unidad, y
    // uno chico después de un código ("Sgx3 10", "E9pro 25") es ruido del título.
    if (next && UNITS.has(next)) return "stop";
    if (Number(token) > 99) return "stop";
    if (out.some((word) => /\d/.test(word))) return "stop";
  }
  return /^[a-z0-9]+$/.test(token) ? "take" : "stop";
}

/**
 * Las palabras del modelo en `text` (ya sin la marca adelante): saltea genéricas iniciales y corta en
 * la primera palabra que no puede ser parte de un nombre de modelo. Si el nombre sigue más allá de
 * MAX_TOKENS no se trunca: devuelve nada, porque truncar unía "Max G30" con "Max G2" cuando la marca
 * ocupaba un lugar (revisión final, 4/11).
 */
export function modelTokens(text: string, brandWords: string[]): string[] {
  const skip = new Set(brandWords);
  const list = generations(words(text)).flatMap(splitTier);
  const out: string[] = [];
  for (let i = 0; i < list.length; i++) {
    const v = verdict(list[i]!, list[i + 1], out, skip);
    if (v === "skip") continue;
    if (v === "stop") break;
    if (out.length === MAX_TOKENS) return [];
    out.push(list[i]!);
  }
  return out;
}

function labelOf(brandKey: string, tokens: string[]): string {
  const words = tokens.map((token) =>
    /^gen\d$/.test(token)
      ? `Gen ${token.slice(3)}`
      : /\d/.test(token)
        ? token.toUpperCase()
        : token.charAt(0).toUpperCase() + token.slice(1)
  );
  const prefix = LINE_PREFIX[brandKey];
  return prefix && /^\d$/.test(tokens[0] ?? "") ? `${prefix} ${words.join(" ")}` : words.join(" ");
}

/** Igual que `enrichMovilidadRow`: la marca guardada por una tienda puede traer espacios o apóstrofo. */
const slugOf = (value: string): string =>
  norm(value)
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Dónde empieza `needle` adentro de `hay`, o -1. */
const indexOfSub = (needle: string[], hay: string[]): number => {
  if (!needle.length || needle.length > hay.length) return -1;
  for (let start = 0; start + needle.length <= hay.length; start++) {
    if (needle.every((word, i) => hay[start + i] === word)) return start;
  }
  return -1;
};

export function identifyModel(input: IdentifyInput): ModelIdentity | null {
  if (input.source === "facebook" || !input.brand || !input.brandKey) return null;
  const brandKey = slugOf(input.brandKey);
  if (!brandKey) return null;
  const brandLabel = cleanBrand(input.brand) ?? input.brand;
  const brandWords = words(input.brand);
  const title = norm(input.title);
  const pattern = brandPattern(input.brand);
  const literal = new RegExp(`\\b${brandWords.join("[\\s-]?")}\\b`);
  const match = (pattern ?? literal).exec(title) ?? literal.exec(title);

  // Una marca desconocida que el título no nombra es casi siempre el nombre del vendedor.
  if (!match && !pattern) return null;

  // Todos los alias que el título usa para la marca ("Segway Ninebot ...") se saltean, no sólo el
  // primero: si no, "ninebot" pasaba a ser parte del modelo.
  const aliases = pattern ? [...title.matchAll(new RegExp(pattern.source, "g"))].flatMap((m) => words(m[0])) : [];
  const allBrandWords = [...brandWords, ...aliases, ...(match ? words(match[0]) : [])];
  const fromTitle = match ? modelTokens(title.slice(match.index + match[0].length), allBrandWords) : [];
  const fromFicha = input.fichaModel ? modelTokens(input.fichaModel, allBrandWords) : [];

  let tokens = fromTitle;
  if (!tokens.length) tokens = fromFicha;
  else if (fromFicha.length && fromFicha.length < fromTitle.length) {
    // La ficha es el mismo modelo sin el ruido del título ("Enxuta 45 Meenx552n" con ficha MEENX552N),
    // nunca para sacarle la gama, la generación ni un número que siga al modelo ("Tenacity 2").
    const start = indexOfSub(fromFicha, fromTitle);
    if (start >= 0) {
      const dropped = fromTitle.filter((word) => !fromFicha.includes(word));
      const after = fromTitle.slice(start + fromFicha.length);
      const keeps =
        dropped.some((word) => TIERS.has(word) || /^gen\d$/.test(word)) || after.some((word) => /^\d+$/.test(word));
      if (!keeps) tokens = fromFicha;
    }
  }
  if (!tokens.length) return null;

  return {
    brandKey,
    brandLabel,
    tokens,
    key: `${brandKey}-${tokens.join("-")}`,
    label: labelOf(brandKey, tokens),
  };
}

/** El id de producto de catálogo de ML (`/p/MLU…`), el único que comparten vendedores distintos. */
export function mlCatalogId(url: string): string | null {
  return /\/p\/(MLU\d+)/.exec(url)?.[1] ?? null;
}

/**
 * Los avisos del mismo producto de catálogo de ML son el mismo modelo: toman el modelo mayoritario del
 * grupo (en empate no se elige), también los que no tenían.
 */
export function unifyByCatalog<T extends { url: string; identity: ModelIdentity | null }>(rows: T[]): T[] {
  const votes = new Map<string, Map<string, { count: number; identity: ModelIdentity }>>();
  for (const row of rows) {
    const catalog = mlCatalogId(row.url);
    if (!catalog || !row.identity) continue;
    const tally = votes.get(catalog) ?? new Map();
    const entry = tally.get(row.identity.key) ?? { count: 0, identity: row.identity };
    entry.count++;
    tally.set(row.identity.key, entry);
    votes.set(catalog, tally);
  }
  const winner = new Map<string, ModelIdentity>();
  for (const [catalog, tally] of votes) {
    const ranked = [...tally.values()].sort((a, b) => b.count - a.count);
    // Empate: ML dice que es el mismo producto pero los vendedores no coinciden en cuál. No se elige
    // (el de clave menor ponía un 6 Pro en la página del 6): cada aviso conserva el suyo.
    if (ranked.length > 1 && ranked[0]!.count === ranked[1]!.count) continue;
    winner.set(catalog, ranked[0]!.identity);
  }
  return rows.map((row) => {
    const catalog = mlCatalogId(row.url);
    const identity = catalog ? winner.get(catalog) : undefined;
    return identity ? { ...row, identity } : row;
  });
}
