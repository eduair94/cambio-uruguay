// Marcas de monopatín y de bicicleta eléctrica, para llenar la faceta de marca del directorio y
// para saber de qué modelo es un aviso (classes/movilidad/models/identify.ts).
//
// Medido el 2026-11-03: la tarjeta de búsqueda de Mercado Libre llega con `attributes: []`, así
// que de 782 avisos sólo 7 tenían marca (Xiaomi 6, Voltbike 1). La ficha propia sí la trae, pero
// a veces con un genérico ("Monopatin", "Genérica"), y Facebook nunca. Este diccionario reconoce
// las marcas que el mercado uruguayo vende de verdad (la faceta de marca de ML para "monopatin
// electrico" del mismo día) por palabra entera en el título; la primera que aparece gana, así "Go
// Green Mod. Zero" es Gogreen y no la marca Zero (que por eso no está en la lista).
import { norm } from "../../equipar/classify";
import { BICICLETA_CATEGORY, MONOPATIN_CATEGORY } from "./profiles";

interface BrandEntry {
  name: string;
  pattern: RegExp;
}

const MONOPATIN_BRANDS: readonly BrandEntry[] = [
  { name: "Xiaomi", pattern: /\b(xiaomi|mi electric scooter)\b/ },
  { name: "Segway", pattern: /\b(segway|ninebot)\b/ },
  { name: "Atom", pattern: /\batom\b/ },
  { name: "K'nex", pattern: /\bk'?nex\b/ },
  { name: "Gogreen", pattern: /\bgo[- ]?green\b/ },
  { name: "Mistyle", pattern: /\bmistyle\b/ },
  { name: "Luxor", pattern: /\bluxor\b/ },
  { name: "Joyor", pattern: /\bjoyor\b/ },
  { name: "Navee", pattern: /\bnavee\b/ },
  { name: "Enxuta", pattern: /\benxuta\b/ },
  { name: "Gyroor", pattern: /\bgyroor\b/ },
  { name: "S-Pro", pattern: /\bs-pro\b|\bs pro\b/ },
  { name: "Hiboy", pattern: /\bhiboy\b/ },
  { name: "Cecotec", pattern: /\bcecotec\b/ },
  { name: "Kugoo", pattern: /\bkugoo\b/ },
  { name: "Kukirin", pattern: /\bkukirin\b/ },
  { name: "Razor", pattern: /\brazor\b/ },
  { name: "Gotrax", pattern: /\bgotrax\b/ },
  { name: "Voltex", pattern: /\bvoltex\b/ },
  { name: "Xion", pattern: /\bxion\b/ },
  { name: "Wheele", pattern: /\bwheele\b/ },
  { name: "Emove", pattern: /\bemove\b/ },
  { name: "Purare", pattern: /\bpurare\b/ },
  { name: "Atrix", pattern: /\batrix\b/ },
  { name: "Dualtron", pattern: /\bdualtron\b/ },
  { name: "Kaabo", pattern: /\bkaabo\b/ },
  { name: "Inokim", pattern: /\binokim\b/ },
  { name: "Voltbike", pattern: /\bvolt ?bike\b/ },
  { name: "Hover-1", pattern: /\bhover-?1\b/ },
  { name: "Jetson", pattern: /\bjetson\b/ },
  { name: "iScooter", pattern: /\biscooter\b/ },
  { name: "Isinwheel", pattern: /\bisinwheel\b/ },
  { name: "Megawheels", pattern: /\bmegawheels\b/ },
  { name: "Minimotors", pattern: /\bminimotors\b/ },
  { name: "Smartgyro", pattern: /\bsmartgyro\b/ },
  { name: "Teverun", pattern: /\bteverun\b/ },
  { name: "Vsett", pattern: /\bvsett\b/ },
  { name: "Niu", pattern: /\bniu\b/ },
  { name: "Okai", pattern: /\bokai\b/ },
  // Medidas el 2026-11-04 en las fichas de ML (marca declarada, varios vendedores cada una).
  { name: "Proove", pattern: /\bproove\b/ },
  { name: "Maxwheel", pattern: /\bmaxwheel\b/ },
  { name: "Mirrend", pattern: /\bmirrend\b/ },
];

/**
 * Marcas de bicicleta eléctrica, medidas el 4/11/2026 en los 478 avisos frescos (títulos y "Marca" de
 * la ficha de ML). El orden importa cuando dos aparecen en el mismo lugar: "Trinx Swft Zip S" es una
 * Swft que vende el distribuidor de Trinx, así que Swft va primero y su patrón se come el "trinx".
 */
const BICICLETA_BRANDS: readonly BrandEntry[] = [
  { name: "Swft", pattern: /\b(?:trinx )?swft\b/ },
  { name: "S-Pro", pattern: /\bs-?pro\b|\bs pro\b/ },
  { name: "Gyroor", pattern: /\bgyroor\b/ },
  { name: "Loop", pattern: /\bloop\b/ },
  { name: "Wheele", pattern: /\bwheele\b/ },
  { name: "Trinx", pattern: /\btrinx\b/ },
  { name: "Snake", pattern: /\bsnake\b/ },
  { name: "Eleglide", pattern: /\beleglide\b/ },
  { name: "Hiper Engine", pattern: /\bhiper ?engine\b/ },
  { name: "Ado", pattern: /\bado\b/ },
  { name: "Gogreen", pattern: /\bgo[- ]?green\b/ },
  { name: "Luxor", pattern: /\bluxor\b/ },
  { name: "K'nex", pattern: /\bk'?nex\b/ },
  { name: "Voltbike", pattern: /\bvolt ?bike\b/ },
  { name: "Tern", pattern: /\btern\b/ },
  { name: "Amalfyt", pattern: /\bamalfyt\b/ },
  // "Shimano Nexus" es el buje de cambios internos, no la marca (revisión de rama, 4/11/2026).
  { name: "Nexus", pattern: /(?<!shimano )\bnexus\b/ },
  { name: "Valentini", pattern: /\bvalentini\b/ },
  { name: "Xiaomi", pattern: /\b(xiaomi|qicycle|himo)\b/ },
  { name: "Hotebike", pattern: /\bhotebike\b/ },
  { name: "Nakto", pattern: /\bnakto\b/ },
  { name: "Positivo", pattern: /\bpositivo\b/ },
  { name: "Kixin", pattern: /\bkixin\b/ },
  { name: "Jeep", pattern: /\bjeep\b/ },
  { name: "Vivibot", pattern: /\bvivibot\b/ },
  { name: "Samebike", pattern: /\bsamebike\b/ },
  { name: "Urban Halley", pattern: /\burban halley\b/ },
  { name: "Ciclo Electro", pattern: /\bciclo electro\b/ },
  { name: "Trek", pattern: /\btrek\b/ },
  { name: "Swagtron", pattern: /\bswagtron\b/ },
  { name: "Blaupunkt", pattern: /\bblau?k?pun?k?t\b/ },
  { name: "Fiido", pattern: /\bfiido\b/ },
  { name: "Engwe", pattern: /\bengwe\b/ },
  { name: "Himiway", pattern: /\bhimiway\b/ },
  { name: "Stacyc", pattern: /\bstacyc\b/ },
  { name: "Atom", pattern: /\batom\b/ },
  { name: "Mistyle", pattern: /\bu?mistyle\b/ },
  { name: "Legend", pattern: /\blegend\b/ },
];

const BRANDS_BY_CATEGORY: Readonly<Record<string, readonly BrandEntry[]>> = {
  [MONOPATIN_CATEGORY]: MONOPATIN_BRANDS,
  [BICICLETA_CATEGORY]: BICICLETA_BRANDS,
};

/** Las marcas de la categoría; sin categoría, las de monopatín (las únicas hasta el 4/11/2026). */
const brandsOf = (category?: string | null): readonly BrandEntry[] =>
  (category && BRANDS_BY_CATEGORY[category]) || MONOPATIN_BRANDS;

/** El patrón con que se reconoce una marca conocida en un título ya normalizado, o null. */
export function brandPattern(name: string, category?: string | null): RegExp | null {
  const key = norm(name);
  return brandsOf(category).find((brand) => norm(brand.name) === key)?.pattern ?? null;
}

/** Lo que el formulario de ML guarda cuando el vendedor no sabe o no quiere poner la marca. */
const GENERIC =
  /^(monopatin( electrico)?|monopatines|scooter( electrico)?|e-?scooter|patinete( electrico)?|electric|electrico|generic[ao]?|sin marca|otras? marcas?|otros?|varios|importado|nacional|no aplica|n\/a|-)$/;
/** Lo mismo en una bicicleta: "Bicicleta", "E-bike", "Bici Eléctrica". */
const BICICLETA_GENERIC =
  /^(bicicletas?( electricas?)?|bicis?( electricas?)?|e-?bikes?|electric bike|bike|electrica|generic[ao]?|sin marca|otras? marcas?|otros?|varios|importado|importada|nacional|no aplica|n\/a|-)$/;

/** La marca conocida que aparece primero en el título, o null. */
export function brandFromTitle(title: string, category?: string | null): string | null {
  const text = norm(title);
  let best: { name: string; at: number } | null = null;
  for (const brand of brandsOf(category)) {
    const match = brand.pattern.exec(text);
    if (match && (!best || match.index < best.at)) best = { name: brand.name, at: match.index };
  }
  return best?.name ?? null;
}

/** La marca que escribió el vendedor, con el nombre canónico si es conocida; null si es un genérico. */
export function cleanBrand(raw: string | null | undefined, category?: string | null): string | null {
  const value = (raw ?? "").trim();
  const key = norm(value).trim();
  const generic = category === BICICLETA_CATEGORY ? BICICLETA_GENERIC : GENERIC;
  if (!key || generic.test(key)) return null;
  const known = brandsOf(category).find((brand) => brand.pattern.test(key));
  return known ? known.name : value;
}
