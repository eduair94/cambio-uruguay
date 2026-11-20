// Lo que el directorio de armadores lee del TEXTO de un aviso (título de Marketplace o de ML,
// descripción de la ficha de Facebook): si es un servicio de armado, dónde dice trabajar, qué hace
// y cuánto cobra por cada mueble.
//
// Precisión antes que cobertura, como en todo el repo: un armador mal ubicado aparece en la zona
// equivocada y un precio inventado contamina la referencia; uno de menos sólo dice "sin informar".
import { DEPARTMENTS, flatten } from "../rentals/normalize";
import { neighborhoodsListedIn } from "../rentals/neighborhoods";
import type { ArmadorItem, ArmadorPrice, ArmadorService } from "./types";
import { zoneOfBarrio } from "./zones";

const fold = (text: string): string => flatten(text).replace(/[^a-z0-9$]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Un mueble a la venta que trae el armado (no es un armador), herramientas, kits. El regalo va
 * pegado al armado ("armador incluido", "armado de muebles sin costo"): "presupuesto sin costo"
 * en un aviso de armador es otra cosa.
 */
const PRODUCT = /\b(armado|armada|armador)s? (de muebles? )?(gratis|incluid[oa]s?|sin cargo|sin costo|bonificad[oa]s?|de regalo)\b|\bincluye armado\b|\bcon armado\b|\btaladro|\batornillador|\bherramientas?\b|\bkit\b/;
/** Un título que ABRE con un mueble es la venta de ese mueble, salvo que diga que es un servicio. */
const FURNITURE_FIRST = /^(vendo |venta de |se vende )?(roperos?|placares?|placards?|camas?|cuchetas?|comodas?|escritorios?|racks?|mesas?|sillas?|bibliotecas?|modular(es)?|aparadores?|armarios?|sommiers?|respaldos?|zapateras?|cajoneras?|muebles?)\b/;
const SAYS_SERVICE = /\ba domicilio\b|\bservicios?\b|\barmador(es|a)?\b|\barmamos\b/;
/** Otros "armados" que no son muebles; sólo descartan si el título no nombra muebles. */
export const OTHER_OBJECT = /\b(galpon|galpones|caseta|casetas|casitas?|cobertizo|carpa|carpas|gazebo|gazebos|evento|eventos|fiesta|fiestas|andamio|andamios|computadora|pc|jardin|piscinas?|ropa|perchas?|percheros?|industrial|metalurgic[oa]s?)\b/;
const SERVICE = /\barmador(es|a)?\b|\barmados? y desarmados?\b|\b(armado|desarmado)s? (y desarmados? )?(de )?muebles?\b|\barmados? a domicilio\b|\bdesarmados?\b.*\bmuebles?\b/;

/** El título anuncia un servicio de armado de muebles (no un mueble que viene armado). */
export function isAssemblyTitle(title: string): boolean {
  const text = fold(title);
  if (!SERVICE.test(text) || PRODUCT.test(text)) return false;
  if (FURNITURE_FIRST.test(text) && !SAYS_SERVICE.test(text)) return false;
  // "Armadores de madera para ropa" son perchas aunque no nombren otro objeto que la ropa.
  return !OTHER_OBJECT.test(text) || (/\bmuebles?\b/.test(text) && !/\b(ropa|perchas?|percheros?|piscinas?)\b/.test(text));
}

/** Contactos escritos en un texto de aviso: nunca se publican (la ficha exige sesión). */
const CONTACTS = [
  /https?:\/\/\S+|\bwww\.\S+|\bwa\.me\/\S*/gi,
  /[\w.+-]+@[\w-]+\.[\w.]+/g,
  /(^|\s)@[\w.]{2,}/g,
  /\+?\d[\d\s.-]{5,}\d/g,
];
/** El título de un aviso sin teléfonos, correos, @usuarios ni enlaces. */
export function stripContacts(text: string): string {
  let out = String(text || "");
  for (const pattern of CONTACTS) out = out.replace(pattern, " ");
  return out.replace(/\s+/g, " ").replace(/^[\s,.:;|-]+|[\s,.:;|-]+$/g, "").trim();
}

const ALL_MONTEVIDEO = /\btod[oa]s? (el |la )?(montevideo|mvd|mdeo|ciudad|capital)\b|\btodos los barrios\b|\btodas las zonas\b|\bcualquier (barrio|zona)\b|\bzona metropolitana\b/;
const OUTSIDE_DEPARTMENTS = DEPARTMENTS.filter(name => name !== "Montevideo");

export interface TextCoverage {
  allMontevideo: boolean;
  barrios: string[];
  outside: string[];
}

/** Dónde dice trabajar: todo Montevideo, barrios y localidades metropolitanas, y lo de afuera. */
export function coverageFromText(text: string): TextCoverage {
  const folded = fold(text);
  const barrios: string[] = [];
  const outside: string[] = [];
  for (const { neighborhood } of neighborhoodsListedIn(text)) {
    const target = zoneOfBarrio(neighborhood) ? barrios : outside;
    if (!target.includes(neighborhood)) target.push(neighborhood);
  }
  for (const department of OUTSIDE_DEPARTMENTS) {
    // "Canelones" sola es el departamento; una localidad metropolitana ya entró arriba.
    if (new RegExp(`\\b${fold(department)}\\b`).test(folded) && !outside.includes(department)) outside.push(department);
  }
  return { allMontevideo: ALL_MONTEVIDEO.test(folded), barrios, outside };
}

const SERVICE_PATTERNS: ReadonlyArray<[ArmadorService, RegExp]> = [
  ["armado", /\barm(ado|ados|ador|adores|adora|amos|o)\b|\bmontaje\b|\bensambl/],
  ["desarmado", /\bdesarm/],
  ["traslado", /\btraslad|\bflete|\bmudanza/],
  ["colgado", /\bcolg(ar|ado|ados|amos|ado de)\b|\bamurad|\bfijacion a (la )?pared|\bsoportes? de tv\b|\bcuadros\b|\bcortinas?\b/],
  ["instalacion", /\binstala(cion|ciones|mos|r)\b/],
  ["reparacion", /\brepar(acion|aciones|amos|ar|o)\b|\barreglos?\b/],
];

/** Qué servicios nombra el texto, en orden fijo. */
export function servicesFromText(text: string): ArmadorService[] {
  const folded = fold(text);
  // "desarmados" también contiene "armad…" sólo como parte de otra palabra: \b lo separa.
  return SERVICE_PATTERNS.filter(([, pattern]) => pattern.test(folded)).map(([service]) => service);
}

const ITEM_PATTERNS: ReadonlyArray<[ArmadorItem, RegExp]> = [
  ["desarmado", /\bdesarm/],
  ["cucheta", /\bcuchetas?\b|\bmarineras?\b|\bliteras?\b|\bcamas? superpuestas?\b/],
  ["mesa-de-luz", /\bmesas? de luz\b|\bmesitas? de (luz|noche)\b|\bmesas? de noche\b/],
  ["cama", /\bcamas?\b|\bsommier|\bsomier|\brespaldos?\b|\bfuton/],
  ["ropero", /\bropero|\bplacar|\bplacard|\barmarios?\b|\bguardarropas?\b|\bvestidor/],
  ["comoda", /\bcomodas?\b|\bchif+onier|\bcajoneras?\b/],
  ["escritorio", /\bescritorios?\b/],
  ["rack", /\bracks?\b|\bmuebles? (de |para )?(tv|televisor)\b|\bcentro de entretenimiento\b|\bmodular de tv\b/],
  ["biblioteca", /\bbibliotecas?\b|\bestanter|\brepisas?\b|\bestantes?\b/],
  ["cocina", /\bcocinas?\b|\balacenas?\b|\bbajo ?mesadas?\b|\bdespensero|\baereos?\b/],
  ["bano", /\bbanos?\b|\bvanitory|\bbotiquin/],
  ["zapatera", /\bzapater/],
  ["cuna", /\bcunas?\b|\bcambiador/],
  ["mesa", /\bmesas?\b|\bratonas?\b/],
  ["silla", /\bsillas?\b|\bbanquetas?\b|\btaburetes?\b/],
  ["exterior", /\bgalpon|\bpergola|\bjuegos? de jardin\b|\bhamacas?\b|\bparrillero|\bbarbacoa|\bcasetas?\b/],
  ["colgado", /\bcolg|\btv en (la )?pared\b|\bsoportes?\b|\bcuadros?\b|\bcortinas?\b|\bamurar/],
  ["visita", /\bvisita\b|\bviatico|\bminimo\b|\brecargo\b/],
  ["hora", /\bpor hora\b|\bla hora\b/],
];

/** El mueble que nombra una etiqueta de precio; null si no nombra ninguno. */
export function itemOf(label: string): ArmadorItem | null {
  const folded = fold(label);
  for (const [item, pattern] of ITEM_PATTERNS) if (pattern.test(folded)) return item;
  return null;
}

const PHONE = /(?:\+?598[\s.-]?)?\b0?9\d[\s.-]?\d{3}[\s.-]?\d{3}\b|\b2\d{3}[\s.-]?\d{4}\b/g;
// Un monto exige marca de moneda: "$ 1.200", "$U 800", "U$S 50", "1200 pesos", "800$".
const MONEY = /(u\$s|us\$|usd|\$u|\$)\s*(\d{1,3}(?:[.\s]\d{3})+|\d{2,6})(?![\d.,]*\d)|(\d{1,3}(?:\.\d{3})+|\d{2,6})\s*(\$|pesos\b|uyu\b)/gi;
// "y" sólo une un rango detrás de "entre" ("entre $ 900 y $ 1.500"); "$ 1.500 y $ 900" son dos muebles.
const RANGE_GLUE = /^\s*(a|al|hasta|-|–)\s*$/i;
// Sin " - ": "$ 800 - $ 1.200" es un rango, no dos segmentos.
const SEGMENTS = /\r?\n|•|·|;|\||\.\s+(?=[A-ZÁÉÍÓÚÑ])/;
const PLAUSIBLE: Record<"UYU" | "USD", [number, number]> = { UYU: [100, 30_000], USD: [5, 1_000] };

interface Money { amount: number; currency: "UYU" | "USD"; start: number; end: number }

function moneyIn(segment: string): Money[] {
  const out: Money[] = [];
  for (const match of segment.matchAll(MONEY)) {
    const marker = (match[1] || match[4] || "").toLowerCase();
    const digits = (match[2] || match[3] || "").replace(/[.\s]/g, "");
    const amount = Number(digits);
    if (!Number.isFinite(amount)) continue;
    const currency = /u\$s|us\$|usd/.test(marker) ? "USD" : "UYU";
    out.push({ amount, currency, start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  }
  return out;
}

const ITEM_NAME: Record<ArmadorItem, string> = {
  ropero: "Ropero", cama: "Cama", cucheta: "Cucheta", comoda: "Cómoda", "mesa-de-luz": "Mesa de luz",
  escritorio: "Escritorio", rack: "Rack", biblioteca: "Biblioteca", mesa: "Mesa", silla: "Silla", cocina: "Cocina",
  bano: "Mueble de baño", zapatera: "Zapatera", cuna: "Cuna", exterior: "Exterior", colgado: "Colgado",
  desarmado: "Desarmado", visita: "Visita", hora: "Por hora", otro: "Otro",
};

/**
 * La etiqueta es lo que el aviso escribe ANTES del monto, sin contactos: lo que viene después
 * ("consultas al 099…", "tel 098… Juan") es justo lo que no se publica.
 */
const labelOf = (segment: string, firstMoney: number, item: ArmadorItem): string => {
  const head = stripContacts(segment.slice(0, firstMoney).replace(PHONE, " "))
    .replace(/(\s|^)(desde|a partir de|de|entre|por|precio|a)\s*$/i, "")
    .replace(/[\s:,.;-]+$/g, "")
    .trim();
  return (head || ITEM_NAME[item]).slice(0, 80);
};

/**
 * La lista de precios de un aviso: un segmento (línea, viñeta, punto y coma) que nombra un mueble
 * y trae UN monto, o dos unidos por "a/hasta/-" (un rango). Más montos en el mismo segmento no
 * dicen cuál es de qué mueble: se abstiene. Montos fuera de rango tampoco entran.
 */
export function pricesFromText(text: string, sourceUrl: string, observedAt: string): ArmadorPrice[] {
  const out: ArmadorPrice[] = [];
  const seen = new Set<string>();
  for (const raw of String(text || "").split(SEGMENTS)) {
    const segment = raw.trim();
    if (!segment) continue;
    // "12 cuotas de $ 250" es una cuota, no la tarifa.
    if (/\bcuotas?\b/i.test(segment)) continue;
    // "armado y desarmado de roperos" es el precio del ropero, no del desarmado.
    const item = itemOf(segment.replace(PHONE, " ").replace(/\barmados? y desarmados?\b/gi, " "));
    if (!item) continue;
    const money = moneyIn(segment);
    let price: Pick<ArmadorPrice, "amount" | "amountMax" | "currency" | "kind"> | null = null;
    if (money.length === 1) {
      const kind = /\bdesde\b|a partir de/i.test(segment) ? "from" : "exact";
      price = { amount: money[0]!.amount, amountMax: null, currency: money[0]!.currency, kind };
    } else if (
      money.length === 2 &&
      money[0]!.currency === money[1]!.currency &&
      (RANGE_GLUE.test(segment.slice(money[0]!.end, money[1]!.start)) ||
        (/^\s*y\s*$/i.test(segment.slice(money[0]!.end, money[1]!.start)) && /\bentre\s*$/i.test(segment.slice(0, money[0]!.start))))
    ) {
      const [low, high] = [money[0]!.amount, money[1]!.amount].sort((a, b) => a - b) as [number, number];
      if (high > low) price = { amount: low, amountMax: high, currency: money[0]!.currency, kind: "range" };
    }
    if (!price) continue;
    const [min, max] = PLAUSIBLE[price.currency];
    if (price.amount < min || (price.amountMax ?? price.amount) > max) continue;
    const key = `${item}|${price.amount}|${price.amountMax}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ item, label: labelOf(segment, money[0]!.start, item), ...price, conditions: null, sourceUrl, observedAt, origin: "ad-text" });
  }
  return out;
}
