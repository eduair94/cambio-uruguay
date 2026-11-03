// Marcas de monopatín eléctrico, para llenar la faceta de marca del directorio.
//
// Medido el 2026-11-03: la tarjeta de búsqueda de Mercado Libre llega con `attributes: []`, así
// que de 782 avisos sólo 7 tenían marca (Xiaomi 6, Voltbike 1). La ficha propia sí la trae, pero
// a veces con un genérico ("Monopatin", "Genérica"), y Facebook nunca. Este diccionario reconoce
// las marcas que el mercado uruguayo vende de verdad (la faceta de marca de ML para "monopatin
// electrico" del mismo día) por palabra entera en el título; la primera que aparece gana, así "Go
// Green Mod. Zero" es Gogreen y no la marca Zero (que por eso no está en la lista).
import { norm } from "../../equipar/classify";

interface BrandEntry {
  name: string;
  pattern: RegExp;
}

const BRANDS: readonly BrandEntry[] = [
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
];

/** Lo que el formulario de ML guarda cuando el vendedor no sabe o no quiere poner la marca. */
const GENERIC =
  /^(monopatin( electrico)?|monopatines|scooter( electrico)?|e-?scooter|patinete( electrico)?|electric|electrico|generic[ao]?|sin marca|otras? marcas?|otros?|varios|importado|nacional|no aplica|n\/a|-)$/;

/** La marca conocida que aparece primero en el título, o null. */
export function brandFromTitle(title: string): string | null {
  const text = norm(title);
  let best: { name: string; at: number } | null = null;
  for (const brand of BRANDS) {
    const match = brand.pattern.exec(text);
    if (match && (!best || match.index < best.at)) best = { name: brand.name, at: match.index };
  }
  return best?.name ?? null;
}

/** La marca que escribió el vendedor, con el nombre canónico si es conocida; null si es un genérico. */
export function cleanBrand(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  const key = norm(value).trim();
  if (!key || GENERIC.test(key)) return null;
  const known = BRANDS.find((brand) => brand.pattern.test(key));
  return known ? known.name : value;
}
