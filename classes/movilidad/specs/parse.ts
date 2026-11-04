// Lee la ficha técnica de un monopatín: la tabla de la ficha de Mercado Libre, el texto de una
// tienda y el título. Puro, sin red: `read.ts` trae el HTML, esto lo entiende.
//
// Lo que se midió el 2026-11-03 y decide el diseño:
//   * La ficha de ML trae la tabla `ui-vpp-striped-specs` con Autonomía, Tiempo de carga, Potencia
//     del motor, Velocidad máxima, Peso máximo soportado, Tamaño de las ruedas, Es plegable, Sistema
//     de frenos, Voltaje y Capacidad de la batería, Peso y Edad mínima.
//   * Las tiendas lo escriben como texto rotulado (delcar y superbikers con su tabla, Shopify en el
//     `body_html`) y a veces se contradicen consigo mismas: superbikers dice "rodado 10”" en la prosa
//     y "Ruedas: 8,5”" en su tabla. El par con dos puntos (una tabla) gana sobre el par sin ellos, y
//     los dos sobre la prosa, campo por campo.
//   * Rangos ("Autonomía: 20–25 km", "Peso del monopatín: 12–14 kg") se resuelven hacia el lado
//     conservador para un filtro de "al menos" / "como mucho": la autonomía y la carga que soporta
//     toman el extremo bajo; el peso del aparato y el tiempo de carga, el alto.
//   * Valores imposibles existen ("Largo = 100 m" en un monopatín infantil). Fuera de
//     `SPEC_BANDS` el campo queda en null: no se corrige un error del vendedor.
import { specProfile, type SpecProfile } from "./profiles";
import {
  SPEC_BANDS,
  SPEC_FIELDS,
  type BooleanSpecField,
  type MonopatinSpecs,
  type NumericSpecField,
  type SpecSource,
} from "./types";

type Bands = SpecProfile["bands"];

export const EMPTY_SPECS: MonopatinSpecs = Object.freeze({
  rangeKm: null,
  maxSpeedKmh: null,
  motorW: null,
  motorPeakW: null,
  batteryV: null,
  batteryAh: null,
  batteryWh: null,
  chargeHours: null,
  maxLoadKg: null,
  weightKg: null,
  wheelInches: null,
  minAge: null,
  foldable: null,
  suspension: null,
  discBrake: null,
  bluetooth: null,
  brakes: null,
  ipRating: null,
  gears: null,
  removableBattery: null,
  throttle: null,
  centralMotor: null,
  from: Object.freeze({}),
}) as MonopatinSpecs;

const blank = (): MonopatinSpecs => ({ ...EMPTY_SPECS, from: {} });

// ---------------------------------------------------------------------------------------------
// Texto

const ENTITIES: Record<string, string> = { quot: '"', amp: "&", lt: "<", gt: ">", nbsp: " ", apos: "'" };

export function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole);
}

/** Minúsculas sin acentos, comillas de pulgada unificadas, coma decimal a punto, guiones a "-". */
export function prep(value: string): string {
  return decodeEntities(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[”“″]|''/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/\s+/g, " ")
    .trim();
}

const round1 = (value: number): number => Math.round(value * 10) / 10;

function inBand(field: NumericSpecField, value: number | null, bands: Bands = SPEC_BANDS): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  const [min, max] = bands[field];
  return value >= min && value <= max ? value : null;
}

// ---------------------------------------------------------------------------------------------
// Reglas por campo

type Pick = "low" | "high";

interface FieldRule {
  field: NumericSpecField;
  /** Alternativas del rótulo, ya en minúsculas y sin acentos. */
  labels: string;
  /** La unidad. Un grupo de captura propio para reconocer millas, mph y libras. */
  unit: string;
  unitOptional?: boolean;
  pick: Pick;
  /** Lo que no puede seguir al valor (la potencia "máxima" no es la nominal). */
  notAfter?: string;
}

const PEAK_AFTER = "\\s*\\(?\\s*(?:de )?potencia (?:maxima|max|pico)";

const RULES: readonly FieldRule[] = [
  {
    field: "rangeKm",
    labels: "autonomia(?: maxima| aproximada| estimada| real)?|alcance",
    unit: "kms?|kilometros|millas|mi(?![a-z])",
    pick: "low",
  },
  {
    field: "maxSpeedKmh",
    labels: "velocidad(?: maxima| max\\.?| tope)?(?: estimada)?",
    unit: "km ?/ ?h|kmh|km por hora|mph",
    pick: "high",
  },
  {
    field: "motorPeakW",
    labels: "potencia (?:maxima|max\\.?|pico)",
    unit: "w|watts?|vatios",
    pick: "high",
  },
  {
    field: "motorW",
    labels: "potencia(?: del motor| nominal| continua)?(?! (?:maxima|max|pico))|motor(?: de| electrico de)?",
    unit: "w|watts?|vatios",
    pick: "low",
    notAfter: PEAK_AFTER,
  },
  {
    field: "batteryV",
    labels: "voltaje(?: de (?:la )?bateria)?|tension|bateria(?: de)?(?: (?:ion de )?litio)?(?: de)?",
    unit: "v|volts?|voltios",
    pick: "high",
  },
  {
    field: "batteryAh",
    labels: "capacidad(?: de (?:la )?bateria| bateria)?|bateria(?: de)?(?: (?:ion de )?litio)?(?: de)?",
    unit: "ah",
    pick: "low",
  },
  {
    field: "batteryWh",
    labels: "capacidad(?: de (?:la )?bateria| bateria)?|bateria(?: de)?|energia",
    unit: "wh",
    pick: "low",
  },
  {
    field: "chargeHours",
    labels: "tiempo de carga(?: completa| total)?|carga completa(?: en)?|se carga en|carga rapida(?: de)?",
    unit: "h|hs|hrs?|horas?",
    pick: "high",
  },
  {
    field: "maxLoadKg",
    labels:
      "peso maximo(?: soportado| del usuario| de carga| admitido| de usuario)?|carga maxima(?: soportada)?|capacidad maxima(?: de carga)?|capacidad de carga|soporta(?: un peso)?(?: maximo)?(?: de)?|peso max\\.?|max\\.? peso",
    unit: "kgs?|kilos?|lbs?|libras",
    pick: "low",
  },
  {
    field: "weightKg",
    labels: "peso(?: del monopatin| del scooter| del producto| neto| propio| total)?(?! max)",
    unit: "kgs?|kilos?",
    pick: "high",
  },
  {
    field: "wheelInches",
    labels: "tamano de (?:las )?ruedas|ruedas?|rodado|neumaticos?|cubiertas?|llantas?",
    unit: '"|pulgadas?|pulg\\.?',
    unitOptional: true,
    pick: "high",
  },
  {
    field: "minAge",
    labels: "edad minima(?: recomendada)?|edad recomendada",
    unit: "anos",
    pick: "low",
  },
];

const NUM = "(\\d+(?:\\.\\d+)?)";
const RANGE = `${NUM}(?:\\s*(?:-|a|y)\\s*${NUM})?`;
const LEAD = "(?:(?:de|hasta|aprox\\.?|aproximadamente|entre|real|total|estimada|nominal|continua)\\s+)*";

/** Pasa la cifra a la unidad del campo (millas, mph y libras sólo si están escritas). */
function convert(value: number, unit: string, converted: { flag: boolean }): number {
  if (/^(millas|mi|mph)$/.test(unit)) {
    converted.flag = true;
    return value * 1.609;
  }
  if (/^(lbs?|libras)$/.test(unit)) {
    converted.flag = true;
    return value * 0.4536;
  }
  return value;
}

function valueOf(
  rule: FieldRule,
  low: string,
  high: string | undefined,
  unit: string | undefined,
  bands: Bands
): number | null {
  const raw = Number(rule.pick === "high" && high ? high : low);
  const converted = { flag: false };
  const value = convert(raw, (unit ?? "").trim(), converted);
  return inBand(rule.field, converted.flag ? Math.round(value) : round1(value), bands);
}

function labeledPattern(rule: FieldRule, separator: string): RegExp {
  const unit = rule.unitOptional ? `(?:\\s*(${rule.unit}))?` : `\\s*(${rule.unit})`;
  const after = rule.notAfter ? `(?!${rule.notAfter})` : "";
  return new RegExp(
    `(?:^|[^a-z])(?:${rule.labels})${separator}${LEAD}${RANGE}${unit}(?![a-z0-9])${after}`,
    "g"
  );
}

/** La primera coincidencia del patrón cuyo valor cae en banda. */
function firstValue(text: string, pattern: RegExp, rule: FieldRule, bands: Bands): number | null {
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    const value = valueOf(rule, match[1]!, match[2], match[3], bands);
    if (value !== null) return value;
  }
  return null;
}

/** Cifras sin rótulo delante: la prosa ("45 km de autonomía") y los títulos ("350w"). */
const BARE: ReadonlyArray<{ field: NumericSpecField; pattern: RegExp; pick: Pick; unitGroup?: number }> = [
  { field: "rangeKm", pattern: /(\d+(?:\.\d+)?) ?(kms?|kilometros|millas) de autonomia/g, pick: "low", unitGroup: 2 },
  {
    field: "motorPeakW",
    pattern: /(\d{3,5}) ?(?:w|watts?)(?![a-z])\s*\(?\s*(?:de )?potencia (?:maxima|max|pico)/g,
    pick: "high",
  },
  {
    field: "motorW",
    // Ni el número que sigue a un rótulo de potencia máxima ("Potencia máxima: 600 W") ni el que lo
    // precede ("800 W de potencia máxima"): el pico nunca pasa por nominal (revisión final, 3/11).
    pattern:
      /(?<!potencia (?:maxima|max\.?|pico)\s*[:=]?\s*(?:(?:de|hasta)\s+)*)(?:^|[^a-z0-9.])(\d{3,5}) ?(?:w|watts?)(?![a-z0-9])(?!\s*\(?\s*(?:de )?potencia (?:maxima|max|pico))/g,
    pick: "low",
  },
  { field: "maxSpeedKmh", pattern: /(\d+(?:\.\d+)?) ?(km ?\/ ?h|kmh|mph)(?![a-z])/g, pick: "high", unitGroup: 2 },
  { field: "batteryV", pattern: /(?:^|[^a-z0-9.])(\d{2}(?:\.\d)?) ?v(?![a-z0-9])/g, pick: "high" },
  { field: "batteryAh", pattern: /(?:^|[^a-z0-9.])(\d{1,2}(?:\.\d+)?) ?ah(?![a-z0-9])/g, pick: "low" },
  { field: "batteryWh", pattern: /(?:^|[^a-z0-9.])(\d{2,4}(?:\.\d+)?) ?wh(?![a-z0-9])/g, pick: "low" },
  {
    field: "maxLoadKg",
    pattern: /soporta[^.]{0,25}?(\d{2,3}(?:\.\d+)?) ?(kgs?|kilos?|lbs?|libras)(?![a-z])/g,
    pick: "low",
    unitGroup: 2,
  },
  { field: "wheelInches", pattern: /(?:^|[^a-z0-9.])(\d{1,2}(?:\.\d)?) ?(?:"|pulgadas?)/g, pick: "high" },
  {
    field: "chargeHours",
    pattern: /carga (?:rapida |completa |total )?(?:de |en )?(\d{1,2}(?:\.\d)?)(?:\s*(?:-|a)\s*(\d{1,2}(?:\.\d)?))? ?(?:h|hs|horas?)(?![a-z])/g,
    pick: "high",
  },
];

function bareValue(text: string, rule: (typeof BARE)[number], bands: Bands): number | null {
  rule.pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = rule.pattern.exec(text))) {
    const low = match[1]!;
    const high = rule.unitGroup ? undefined : match[2];
    const unit = rule.unitGroup ? match[rule.unitGroup] : undefined;
    const converted = { flag: false };
    const raw = Number(rule.pick === "high" && high ? high : low);
    const number = convert(raw, unit ?? "", converted);
    const value = inBand(rule.field, converted.flag ? Math.round(number) : round1(number), bands);
    if (value !== null) return value;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Sí / no

function booleansFromText(text: string, specs: MonopatinSpecs, source: SpecSource): void {
  const set = (field: BooleanSpecField, value: boolean | null) => {
    if (value === null || specs[field] !== null) return;
    specs[field] = value;
    specs.from[field] = source;
  };

  if (/\bno (?:es )?plegable\b/.test(text)) set("foldable", false);
  else if (/\b(?:plegable|plegado|se pliega)\b/.test(text)) set("foldable", true);

  const suspensions = [...text.matchAll(/\b(sin )?suspension(?:es)?(?: (?:delantera|trasera|doble))?\s*[:=]?\s*(no\b)?/g)];
  if (suspensions.length) set("suspension", suspensions.some((match) => !match[1] && !match[2]));

  // "Freno de disco: No" y "sin freno de disco" nombran el disco para negarlo (diferido del 3/11).
  const disc =
    /(\bsin )?\b(?:frenos? (?:\S+ ){0,3}?(?:a |de )?discos?\b|discos? de freno\b|doble disco\b)(\s*[:=]?\s*no\b)?/.exec(
      text
    );
  if (disc && !disc[1] && !disc[2]) set("discBrake", true);

  const bluetooth = /\b(sin |con )?(?:bluetooth|app)\b(\s*[:=]?\s*no\b)?/.exec(text);
  if (bluetooth) set("bluetooth", bluetooth[1] !== "sin " && !bluetooth[2]);

  const ip = /\bip ?(x\d|\d{2})\b/.exec(text);
  if (ip && specs.ipRating === null) {
    specs.ipRating = `IP${ip[1]!.toUpperCase()}`;
    specs.from.ipRating = source;
  }
}

// ---------------------------------------------------------------------------------------------
// Sólo bicicleta (`profiles.ts`)
//
// Lo medido el 4/11/2026 en las fichas de ML de bicis y en los 478 títulos frescos: el rodado casi
// nunca lleva comillas ("R20", "Rod. 28", "Rodado 20x4.0", "26x1.95"); los cambios se escriben "Shimano
// Tourney 7 velocidades" o "21 Vel"; la ficha de ML trae "Con batería removible" y "Con acelerador
// independiente". Nada de esto se lee en un monopatín: "3 velocidades" son ahí los modos del acelerador.

const RODADOS = "12|14|16|18|20|24|26|27\\.5|28|29";
const RODADO_PATTERNS: readonly RegExp[] = [
  new RegExp(`(?:^|[^a-z0-9])(?:rodado|rod\\.?|r) ?(${RODADOS})(?:"|x ?\\d+(?:\\.\\d+)?)?(?![0-9.])`),
  new RegExp(`(?:^|[^a-z0-9.])(${RODADOS}) ?x ?\\d(?:\\.\\d+)?(?![0-9])`),
];
const GEARS_PATTERNS: readonly RegExp[] = [
  /\b(?:cantidad de )?(?:velocidades|cambios)\s*[:=]\s*(\d{1,2})\b/,
  /(?:^|[^a-z0-9.])(\d{1,2}) ?(?:velocidades|cambios|speeds?)(?![a-z])/,
  // "21 Vel.f/disco", "7 Vel": la abreviatura, nunca seguida de una palabra ("vel max").
  /(?:^|[^a-z0-9.])(\d{1,2}) ?vel\.?(?![a-z]{2})/,
];
const CENTRAL_MOTOR =
  /\bmotor (?:central|centrado|en el centro|mid-?drive)\b|\bmid-?drive\b|\bbosch (?:performance|active|cargo|smart)\b|\bbafang m\d{3}\b|\bshimano (?:steps|ep\d)\b/;
const HUB_MOTOR =
  /\bmotor (?:(?:en (?:la |el )?)?(?:rueda|buje|eje|maza) )?(?:traser[oa]|delanter[oa])\b|\b(?:rear|front) hub\b|\bhub motor\b/;

function bikeFromText(text: string, specs: MonopatinSpecs, source: SpecSource, bands: Bands): void {
  const setBool = (field: BooleanSpecField, value: boolean) => {
    if (specs[field] !== null) return;
    specs[field] = value;
    specs.from[field] = source;
  };

  if (specs.wheelInches === null) {
    for (const pattern of RODADO_PATTERNS) {
      const match = pattern.exec(text);
      const value = match ? inBand("wheelInches", Number(match[1]), bands) : null;
      if (value !== null) {
        specs.wheelInches = value;
        specs.from.wheelInches = source;
        break;
      }
    }
  }

  if (specs.gears === null) {
    for (const pattern of GEARS_PATTERNS) {
      const match = pattern.exec(text);
      const value = match ? inBand("gears", Number(match[1]), bands) : null;
      if (value !== null) {
        specs.gears = value;
        specs.from.gears = source;
        break;
      }
    }
  }

  const removable =
    /\bbateria\b(?:[^.\n:]|\.(?=\d)){0,50}?\b(no (?:es )?)?(?:extraible|removible|desmontable)\b(\s*[:=]\s*no\b)?/.exec(
      text
    );
  if (removable) setBool("removableBattery", !removable[1] && !removable[2]);
  else if (/\bbateria (?:integrada|fija)\b/.test(text)) setBool("removableBattery", false);

  const throttle =
    /(\bsin |\bno (?:tiene|trae|incluye|lleva) )?\bacelerador\b(?: (?:de (?:puno|gatillo|dedo)|independiente))?(\s*[:=]\s*no\b)?/.exec(
      text
    );
  if (throttle) setBool("throttle", !throttle[1] && !throttle[2]);

  if (CENTRAL_MOTOR.test(text)) setBool("centralMotor", true);
  else if (HUB_MOTOR.test(text)) setBool("centralMotor", false);
}

function finish(specs: MonopatinSpecs, bands: Bands = SPEC_BANDS): MonopatinSpecs {
  if (specs.batteryWh === null && specs.batteryV !== null && specs.batteryAh !== null) {
    const wh = inBand("batteryWh", Math.round(specs.batteryV * specs.batteryAh), bands);
    if (wh !== null) {
      specs.batteryWh = wh;
      specs.from.batteryWh = specs.from.batteryAh;
    }
  }
  return specs;
}

// ---------------------------------------------------------------------------------------------
// API

/** Texto rotulado y prosa de una tienda o de la descripción de un aviso. */
export function specsFromText(text: string, source: SpecSource, category?: string | null): MonopatinSpecs {
  const profile = specProfile(category);
  const bands = profile.bands;
  const clean = prep(text);
  const specs = blank();
  const set = (field: NumericSpecField, value: number | null) => {
    if (value === null || specs[field] !== null) return;
    specs[field] = value;
    specs.from[field] = source;
  };
  // Una tabla ("Ruedas: 8,5”") antes que un par suelto ("Rodado 10"), y los dos antes que la prosa.
  for (const rule of RULES) set(rule.field, firstValue(clean, labeledPattern(rule, "\\s*[:=]\\s*"), rule, bands));
  for (const rule of RULES) set(rule.field, firstValue(clean, labeledPattern(rule, "\\s+"), rule, bands));
  for (const rule of BARE) set(rule.field, bareValue(clean, rule, bands));
  // "36v350w", "48V500W": voltaje y potencia pegados, que las dos reglas sueltas no ven.
  const glued = /(?:^|[^a-z0-9.])(\d{2}) ?v ?(\d{3,4}) ?w(?![a-z0-9])/.exec(clean);
  if (glued) {
    set("batteryV", inBand("batteryV", Number(glued[1]), bands));
    set("motorW", inBand("motorW", Number(glued[2]), bands));
  }
  booleansFromText(clean, specs, source);
  if (profile.bike) bikeFromText(clean, specs, source, bands);
  return finish(specs, bands);
}

/** El título: lo mismo que el texto, más "45km" suelto, que en un título sólo puede ser la autonomía. */
export function specsFromTitle(title: string, category?: string | null): MonopatinSpecs {
  const specs = specsFromText(title, "titulo", category);
  if (specs.rangeKm === null) {
    const match = /(?:^|[^a-z0-9.])(\d{1,3}) ?kms?(?![a-z0-9]| ?\/ ?h| por hora)/.exec(prep(title));
    const value = match ? inBand("rangeKm", Number(match[1]), specProfile(category).bands) : null;
    if (value !== null) {
      specs.rangeKm = value;
      specs.from.rangeKm = "titulo";
    }
  }
  if (specProfile(category).bike && specs.wheelInches === null) {
    const wheel = bareRodado(prep(title));
    if (wheel !== null) {
      specs.wheelInches = wheel;
      specs.from.wheelInches = "titulo";
    }
  }
  return specs;
}

/**
 * Sólo en el título de una bici: un rodado sin "rodado" ni comillas ("Gyroor 20 Eb025", "Gyroor
 * 27.5 Cd-2614", "Valentini Bikes - Bicicleta Eléctrica 26 Negra"). Medido el 4/11/2026: es como
 * titulan los vendedores de ML, y un número suelto de esa lista no es otra cosa en un título de bici
 * — salvo que lo siga una unidad ("20 km", "26 v", "28 kg") o que sea parte de un código ("C3-14").
 */
const BARE_RODADO = /(?:^|\s)(12|14|16|20|24|26|27\.5|28|29)(?=\s|$|,)/g;
const UNIT_AFTER = /^\s*(?:km|kms|w|watts?|v|volts?|kg|kgs|kilos?|ah|wh|h|hs|horas?|cm|mm|%|x\b|anos?|meses|dias|cuotas)/;

function bareRodado(text: string): number | null {
  BARE_RODADO.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = BARE_RODADO.exec(text))) {
    if (UNIT_AFTER.test(text.slice(match.index + match[0].length))) continue;
    return Number(match[1]);
  }
  return null;
}

const ROW_STRING = '"((?:[^"\\\\]|\\\\.)*)"';

function decodeJson(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
}

/** Todas las filas de la tabla de especificaciones de una ficha de Mercado Libre: rótulo → valor. */
export function mlSpecRows(html: string): Record<string, string> {
  const rows: Record<string, string> = {};
  const table =
    /<div class="andes-table__header__container">([^<]*)<\/div><\/th><td[^>]*>\s*<span[^>]*class="andes-table__column--value"[^>]*>([^<]*)<\/span>/g;
  let match: RegExpExecArray | null;
  while ((match = table.exec(html))) {
    const label = decodeEntities(match[1]!).trim();
    const value = decodeEntities(match[2]!).trim();
    if (label && value && !(label in rows)) rows[label] = value;
  }
  const json = new RegExp(`\\{"id":${ROW_STRING},"text":${ROW_STRING}\\}`, "g");
  while ((match = json.exec(html))) {
    const label = decodeJson(match[1]!).trim();
    const value = decodeJson(match[2]!).trim();
    if (label && value && !(label in rows)) rows[label] = value;
  }
  return rows;
}

const stripTags = (html: string): string =>
  decodeEntities(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").trim();

/** La descripción del vendedor (la del cuerpo y la de `og:description`), en texto. */
export function mlDescription(html: string): string {
  const parts: string[] = [];
  const og = /<meta property="og:description" content="([^"]*)"/.exec(html);
  if (og) parts.push(decodeEntities(og[1]!));
  const body = /<p class="ui-pdp-description__content"[^>]*>([\s\S]*?)<\/p>/.exec(html);
  if (body) parts.push(stripTags(body[1]!));
  else {
    const json = new RegExp(`"type":"description","state":"VISIBLE","title":${ROW_STRING},"content":${ROW_STRING}`).exec(html);
    if (json) parts.push(decodeJson(json[2]!));
  }
  return parts.join("\n");
}

const yesNo = (value: string): boolean | null => {
  const clean = prep(value);
  if (/^(si|yes|true)\b/.test(clean)) return true;
  if (/^(no|sin|false)\b/.test(clean)) return false;
  return null;
};

/** Una fila de la tabla: qué campo es y cómo se lee su valor. */
const ROW_FIELDS: ReadonlyArray<{ label: RegExp; field: NumericSpecField }> = [
  { label: /^autonomia/, field: "rangeKm" },
  { label: /^tiempo de carga/, field: "chargeHours" },
  { label: /^potencia (maxima|pico)/, field: "motorPeakW" },
  { label: /^potencia/, field: "motorW" },
  { label: /^velocidad maxima/, field: "maxSpeedKmh" },
  { label: /^(peso maximo|carga maxima|capacidad (maxima )?de carga)/, field: "maxLoadKg" },
  { label: /^(tamano|diametro) de (las )?ruedas|^rodado/, field: "wheelInches" },
  { label: /^voltaje/, field: "batteryV" },
  { label: /^peso$/, field: "weightKg" },
  { label: /^edad minima/, field: "minAge" },
];

/** La tabla de la ficha de ML (o cualquier tabla rótulo → valor) convertida en ficha. */
export function specsFromRows(rows: Record<string, string>, category?: string | null): MonopatinSpecs {
  const profile = specProfile(category);
  const bands = profile.bands;
  const specs = blank();
  const source: SpecSource = "ficha";
  for (const [rawLabel, rawValue] of Object.entries(rows)) {
    const label = prep(rawLabel);
    const value = prep(rawValue);
    // "4 a 6 h" y "5 hasta 7 h" son rangos como "4-6 h" (diferido del 3/11: daban el extremo bajo).
    const number = /(\d+(?:\.\d+)?)(?:\s*(?:-|\ba\b|\bhasta\b)\s*(\d+(?:\.\d+)?))?\s*([a-z"/ ]*)/.exec(value);

    const numeric = ROW_FIELDS.find((entry) => entry.label.test(label));
    if (numeric && number && specs[numeric.field] === null) {
      const rule = RULES.find((candidate) => candidate.field === numeric.field)!;
      const result = valueOf(rule, number[1]!, number[2], (number[3] ?? "").trim().split(" ")[0], bands);
      if (result !== null) {
        specs[numeric.field] = result;
        specs.from[numeric.field] = source;
      }
      continue;
    }
    if (/^capacidad de (la )?bateria|^energia de (la )?bateria/.test(label) && number) {
      const field: NumericSpecField = /wh\b/.test(value) ? "batteryWh" : "batteryAh";
      const result = inBand(field, round1(Number(number[1])), bands);
      if (result !== null && specs[field] === null) {
        specs[field] = result;
        specs.from[field] = source;
      }
      continue;
    }
    if (/^(es )?plegable/.test(label)) {
      if (specs.foldable === null && yesNo(value) !== null) {
        specs.foldable = yesNo(value);
        specs.from.foldable = source;
      }
      continue;
    }
    if (/^(con )?(bluetooth|app)/.test(label)) {
      if (specs.bluetooth === null && yesNo(value) !== null) {
        specs.bluetooth = yesNo(value);
        specs.from.bluetooth = source;
      }
      continue;
    }
    if (/^(con |tipo de )?suspension/.test(label)) {
      if (specs.suspension === null) {
        specs.suspension = yesNo(value) ?? true;
        specs.from.suspension = source;
      }
      continue;
    }
    if (/^(sistema de )?frenos?|^tipo de freno/.test(label)) {
      if (specs.brakes === null) {
        specs.brakes = rawValue.trim().slice(0, 80);
        specs.discBrake = /disco/.test(value);
        specs.from.brakes = source;
        specs.from.discBrake = source;
      }
      continue;
    }
    if (profile.bike && bikeRow(label, value, number, specs, bands)) continue;
    if (/proteccion|resistencia al agua|certificacion ip/.test(label)) {
      const ip = /\bip ?(x\d|\d{2})\b/.exec(value);
      if (ip && specs.ipRating === null) {
        specs.ipRating = `IP${ip[1]!.toUpperCase()}`;
        specs.from.ipRating = source;
      }
    }
  }
  return finish(specs, bands);
}

/** Una fila de la ficha que sólo declara una bicicleta. true si la fila era de una de ellas. */
function bikeRow(
  label: string,
  value: string,
  number: RegExpExecArray | null,
  specs: MonopatinSpecs,
  bands: Bands
): boolean {
  const setBool = (field: BooleanSpecField, result: boolean | null) => {
    if (result === null || specs[field] !== null) return;
    specs[field] = result;
    specs.from[field] = "ficha";
  };
  if (/^(con )?bateria (removible|extraible|desmontable)/.test(label)) {
    setBool("removableBattery", yesNo(value));
    return true;
  }
  if (/^(con )?acelerador/.test(label)) {
    setBool("throttle", yesNo(value));
    return true;
  }
  if (/^(cantidad de )?(velocidades|cambios)$/.test(label)) {
    const gears = number ? inBand("gears", Number(number[1]), bands) : null;
    if (gears !== null && specs.gears === null) {
      specs.gears = gears;
      specs.from.gears = "ficha";
    }
    return true;
  }
  if (/^(posicion|ubicacion|tipo) (del|de) motor|^motor$/.test(label)) {
    if (/central|centrado|medio|mid/.test(value)) setBool("centralMotor", true);
    else if (/traser|delanter|rueda|buje|hub|maza/.test(value)) setBool("centralMotor", false);
    return true;
  }
  return false;
}

/** Campo por campo, la primera capa con dato gana (ficha > descripción > título). */
export function mergeSpecs(...layers: ReadonlyArray<MonopatinSpecs | null | undefined>): MonopatinSpecs {
  const merged = blank();
  for (const layer of layers) {
    if (!layer) continue;
    for (const field of SPEC_FIELDS) {
      const value = layer[field];
      if (value === null || value === undefined || merged[field] !== null) continue;
      (merged as unknown as Record<string, unknown>)[field] = value;
      const source = layer.from?.[field];
      if (source) merged.from[field] = source;
    }
  }
  return finish(merged);
}

/** Algún campo salió de la ficha o de la descripción del vendedor, no sólo del título. */
export const hasFichaSpecs = (specs: MonopatinSpecs | null | undefined): boolean =>
  Boolean(specs && Object.values(specs.from ?? {}).some((source) => source !== "titulo"));

/** Algún campo tiene dato. */
export const hasAnySpecs = (specs: MonopatinSpecs | null | undefined): boolean =>
  Boolean(specs && SPEC_FIELDS.some((field) => specs[field] !== null));
