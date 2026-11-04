// La ficha técnica de una heladera, un lavarropas, un televisor o un aire acondicionado: las filas de
// la ficha de Mercado Libre y, como respaldo, el título. Puro, sin red.
//
// Lo que decide el diseño (medido el 4/11/2026 en fichas reales, ver fields.ts):
//   * los números vienen en formato uruguayo: punto de miles y coma decimal ("1.400 rpm", "12.000 BTU",
//     "3.754,14 BTU"), salvo las medidas, que a veces usan punto decimal ("54.5 cm", "1.67 m");
//   * la ficha gana al título campo por campo; el título sólo completa lo que la ficha no dice, y queda
//     marcado como tal (`from: titulo`), porque se escribe para vender;
//   * un número fuera de banda queda vacío; nunca se corrige.
import { BTU_POR_FRIGORIA, EQUIPAR_FICHA_FIELDS, type EquiparFicha, type EquiparFichaCategory, type FichaField, type FichaValue } from "./fields";

const ENTITIES: Record<string, string> = { quot: '"', amp: "&", lt: "<", gt: ">", nbsp: " ", apos: "'" };

/** Minúsculas sin acentos, comillas de pulgada unificadas, espacios simples. */
export function prepFicha(value: string): string {
  return value
    .replace(/&([a-z]+);/gi, (whole, name: string) => ENTITIES[name.toLowerCase()] ?? whole)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[”“″]|''/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** "1.400" → 1400, "12.000" → 12000, "3.754,14" → 3754.14, "54.5" → 54.5, "12,5" → 12.5. */
export function uyNumber(raw: string): number | null {
  const text = raw.trim();
  if (!/^\d[\d.,]*$/.test(text)) return null;
  const unthousand = text.replace(/\.(?=\d{3}(?:\D|$))/g, "");
  const value = Number(unthousand.replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** El primer número de un valor ("245 L", "12.000 BTU", "50 \"", "1.67 m") y la unidad que lo sigue. */
function numberWithUnit(value: string): { n: number; unit: string } | null {
  const match = /(\d[\d.,]*)\s*([a-z"°]*)/.exec(value);
  if (!match) return null;
  const n = uyNumber(match[1]!.replace(/[.,]$/, ""));
  return n === null ? null : { n, unit: match[2] ?? "" };
}

/** Un largo en centímetros, sea cual sea su unidad. */
function toCm(value: string): number | null {
  const parsed = numberWithUnit(value);
  if (!parsed) return null;
  if (parsed.unit === "m") return Math.round(parsed.n * 100);
  if (parsed.unit === "mm") return Math.round(parsed.n / 10);
  return Math.round(parsed.n * 10) / 10;
}

const yesNo = (value: string): boolean | null =>
  /^(si|yes|true)\b/.test(value) ? true : /^(no|false)\b/.test(value) ? false : null;

const eficiencia = (value: string): string | null => {
  const match = /^(a\+{0,3}|[b-g])\b/.exec(value.replace(/\s/g, ""));
  return match ? match[1]!.toUpperCase() : null;
};

const resolucion = (value: string): string | null =>
  /\b8k\b/.test(value)
    ? "8k"
    : /\b(4k|uhd|ultra hd)\b/.test(value)
      ? "4k"
      : /full ?hd|fhd|1080/.test(value)
        ? "fhd"
        : /\bhd\b|720/.test(value)
          ? "hd"
          : null;

const panel = (value: string): string | null =>
  /\boled\b/.test(value) && !/qned/.test(value)
    ? "oled"
    : /\bqled\b|qned|neo qled/.test(value)
      ? "qled"
      : /mini ?led/.test(value)
        ? "miniled"
        : /nanocell/.test(value)
          ? "nanocell"
          : /\bled\b|lcd/.test(value)
            ? "led"
            : null;

const sistemaOperativo = (value: string): string | null =>
  /google tv/.test(value)
    ? "google-tv"
    : /android/.test(value)
      ? "android-tv"
      : /tizen/.test(value)
        ? "tizen"
        : /web ?os/.test(value)
          ? "webos"
          : /vidaa/.test(value)
            ? "vidaa"
            : /roku/.test(value)
              ? "roku"
              : /fire ?tv/.test(value)
                ? "fire-tv"
                : null;

type Values = Record<string, FichaValue>;

function inBand(field: FichaField | undefined, value: number | null): number | null {
  if (value === null || !field?.band) return value;
  const [min, max] = field.band;
  return value >= min && value <= max ? value : null;
}

const fieldOf = (category: EquiparFichaCategory, key: string): FichaField | undefined =>
  EQUIPAR_FICHA_FIELDS[category].find((field) => field.key === key);

function blank(category: EquiparFichaCategory): EquiparFicha {
  const values: Values = {};
  for (const field of EQUIPAR_FICHA_FIELDS[category]) values[field.key] = null;
  return { values, from: {} };
}

function setter(category: EquiparFichaCategory, ficha: EquiparFicha, source: "ficha" | "titulo") {
  return (key: string, value: FichaValue) => {
    if (value === null || value === undefined || ficha.values[key] !== null) return;
    const field = fieldOf(category, key);
    if (!field) return;
    const clean = typeof value === "number" ? inBand(field, Math.round(value * 10) / 10) : value;
    if (clean === null) return;
    ficha.values[key] = clean;
    ficha.from[key] = source;
  };
}

/** Lo que se deduce de otros campos: las frigorías de los BTU (o al revés). */
function finish(category: EquiparFichaCategory, ficha: EquiparFicha): EquiparFicha {
  if (category === "aire-acondicionado") {
    const { btu, frigorias } = ficha.values;
    if (typeof btu === "number" && frigorias === null) {
      const fg = inBand(fieldOf(category, "frigorias"), Math.round(btu / BTU_POR_FRIGORIA));
      if (fg !== null) {
        ficha.values.frigorias = fg;
        ficha.from.frigorias = ficha.from.btu!;
      }
    } else if (typeof frigorias === "number" && btu === null) {
      const value = inBand(fieldOf(category, "btu"), Math.round(frigorias * BTU_POR_FRIGORIA));
      if (value !== null) {
        ficha.values.btu = value;
        ficha.from.btu = ficha.from.frigorias!;
      }
    }
  }
  return ficha;
}

/** Las filas de la ficha de ML (rótulo → valor) de una categoría. */
export function fichaFromRows(category: EquiparFichaCategory, rows: Record<string, string>): EquiparFicha {
  const ficha = blank(category);
  const set = setter(category, ficha, "ficha");
  const entries = Object.entries(rows).map(([label, value]) => [prepFicha(label), prepFicha(value)] as const);
  const get = (label: RegExp) => entries.find(([key]) => label.test(key))?.[1] ?? null;
  const num = (label: RegExp) => {
    const value = get(label);
    return value === null ? null : (numberWithUnit(value)?.n ?? null);
  };
  const bool = (label: RegExp) => {
    const value = get(label);
    return value === null ? null : yesNo(value);
  };
  const dims = get(/^ancho x profundidad x altura$/);
  const parts = dims ? dims.split(/\s*x\s*/) : [];

  set("eficiencia", get(/^eficiencia energetica/) ? eficiencia(get(/^eficiencia energetica/)!) : null);
  set("wifi", bool(/^con (conexion )?wi-?fi$/));
  set("inverter", bool(/^con tecnologia inverter$/));

  switch (category) {
    case "heladera": {
      set("capacidadL", num(/^capacidad total$/) ?? num(/^capacidad (neta|bruta|util)$/));
      set("freezerL", num(/^capacidad del freezer/));
      const deshielo = get(/^tipo de deshielo$/);
      if (deshielo) set("noFrost", /no ?frost|frio seco/.test(deshielo) ? true : /ciclico|manual|semi/.test(deshielo) ? false : null);
      set("puertas", num(/^cantidad de puertas$/));
      set("dispensador", bool(/^con dispensador de agua$/));
      set("anchoCm", parts[0] ? toCm(parts[0]) : get(/^ancho$/) ? toCm(get(/^ancho$/)!) : null);
      set("altoCm", parts[2] ? toCm(parts[2]) : get(/^altura$/) ? toCm(get(/^altura$/)!) : null);
      break;
    }
    case "lavarropas": {
      set("capacidadKg", num(/^capacidad (del lavarropas|de lavado)$/));
      const carga = get(/^tipo de carga$/);
      if (carga) set("carga", /frontal/.test(carga) ? "frontal" : /superior/.test(carga) ? "superior" : null);
      set("lavaseca", bool(/^es lavasecarropas$/));
      set("secadoKg", num(/^capacidad de secado$/));
      set("rpm", num(/^velocidad de centrifugado$/));
      break;
    }
    case "tv": {
      set("pulgadas", num(/^tamano de (la )?pantalla$|^pulgadas$/));
      const res = get(/^tipo de resolucion$/);
      set("resolucion", res ? resolucion(res) : null);
      const pantalla = get(/^tipo de pantalla$/);
      set("panel", pantalla ? panel(pantalla) : null);
      set("smart", bool(/^es smart$/));
      const so = get(/^sistema operativo$/);
      set("so", so ? sistemaOperativo(so) : null);
      set("hdr", bool(/^con hdr$/));
      set("hz", num(/^frecuencia de actualizacion/));
      break;
    }
    case "aire-acondicionado": {
      const refrig = get(/^capacidad de refrigeracion$/);
      if (refrig) {
        const parsed = numberWithUnit(refrig);
        if (parsed && /btu/.test(parsed.unit)) set("btu", parsed.n);
        else if (parsed && /^(fg|frig)/.test(parsed.unit)) set("frigorias", parsed.n);
      }
      const tipoAire = get(/^tipo de aire acondicionado$/);
      if (tipoAire && /inverter/.test(tipoAire)) set("inverter", true);
      if (tipoAire && /on\/off|on-off/.test(tipoAire)) set("inverter", false);
      const clima = get(/^tipo de climatizacion$/);
      if (clima) set("frioCalor", /calor/.test(clima) ? true : /solo frio|frio$/.test(clima) ? false : null);
      const lugar = get(/^lugares? de colocacion$/) ?? "";
      set(
        "tipo",
        tipoAire && /portatil/.test(tipoAire)
          ? "portatil"
          : /ventana/.test(lugar)
            ? "ventana"
            : /techo/.test(lugar)
              ? "piso-techo"
              : /pared/.test(lugar) || (tipoAire && /inverter|on\/off|split/.test(tipoAire))
                ? "split"
                : null
      );
      set("ruidoDb", num(/^nivel de ruido/));
      break;
    }
  }
  return finish(category, ficha);
}

/** El título: sólo lo que se escribe para nombrar el producto ("245 L", "12kg", "50\"", "12.000 btu"). */
export function fichaFromTitle(category: EquiparFichaCategory, title: string): EquiparFicha {
  const text = prepFicha(title);
  const ficha = blank(category);
  const set = setter(category, ficha, "titulo");
  if (/\binverter\b/.test(text)) set("inverter", true);
  if (/\bwi-?fi\b/.test(text)) set("wifi", true);

  switch (category) {
    case "heladera": {
      const litros = /(?:^|[^\d.,])(\d{2,3})\s?(?:l|lt|lts|litros)\b/.exec(text);
      if (litros) set("capacidadL", Number(litros[1]));
      if (/no ?frost|frio seco/.test(text)) set("noFrost", true);
      else if (/\bciclic[ao]\b/.test(text)) set("noFrost", false);
      if (/dispen(s|c)er|dispensador/.test(text)) set("dispensador", true);
      break;
    }
    case "lavarropas": {
      const kilos = /(?:^|[^\d.,])(\d{1,2}(?:[.,]\d)?)\s?kgs?\b/.exec(text);
      if (kilos) set("capacidadKg", uyNumber(kilos[1]!));
      if (/carga frontal|\bfrontal\b/.test(text)) set("carga", "frontal");
      else if (/carga superior|\bsuperior\b|tapa superior/.test(text)) set("carga", "superior");
      if (/lava ?seca(rropas)?/.test(text)) set("lavaseca", true);
      const rpm = /(\d[\d.]{2,4})\s?rpm\b/.exec(text);
      if (rpm) set("rpm", uyNumber(rpm[1]!));
      break;
    }
    case "tv": {
      const inches =
        /(?:^|[^\d.,])(\d{2})\s?(?:"|pulgadas|pulg\b)/.exec(text) ??
        /\b(?:tv|televisor|smart|led|qled|oled|uhd|4k|hd|fhd)\s+(\d{2})\b(?!\s?(?:hz|w|"|\d))/.exec(text);
      if (inches) set("pulgadas", Number(inches[1]));
      set("resolucion", resolucion(text));
      if (/\bsmart\b|android tv|google tv|webos|tizen/.test(text)) set("smart", true);
      set("panel", /\b(oled|qled|qned|nanocell|mini ?led)\b/.test(text) ? panel(text) : null);
      set("so", sistemaOperativo(text));
      break;
    }
    case "aire-acondicionado": {
      const btu = /(?:^|[^\d])(\d{1,2}[.,]?\d{3})\s?btu/.exec(text);
      if (btu) set("btu", uyNumber(btu[1]!.replace(",", ".")));
      const fg = /(?:^|[^\d])(\d[.,]?\d{3})\s?(?:frigorias|frig\b|fg\b)/.exec(text);
      if (fg) set("frigorias", uyNumber(fg[1]!.replace(",", ".")));
      if (/fr[i]o\s?(?:\/|y|-)?\s?calor/.test(text)) set("frioCalor", true);
      else if (/solo fr[i]o/.test(text)) set("frioCalor", false);
      set(
        "tipo",
        /portatil/.test(text)
          ? "portatil"
          : /ventana/.test(text)
            ? "ventana"
            : /piso ?techo/.test(text)
              ? "piso-techo"
              : /\bsplit\b/.test(text)
                ? "split"
                : null
      );
      break;
    }
  }
  return finish(category, ficha);
}

/** Campo por campo, la primera capa con dato gana (ficha > título). */
export function mergeFicha(category: EquiparFichaCategory, ...layers: ReadonlyArray<EquiparFicha | null | undefined>): EquiparFicha {
  const merged = blank(category);
  for (const layer of layers) {
    if (!layer) continue;
    for (const field of EQUIPAR_FICHA_FIELDS[category]) {
      const value = layer.values?.[field.key];
      if (value === null || value === undefined || merged.values[field.key] !== null) continue;
      merged.values[field.key] = value;
      const source = layer.from?.[field.key];
      if (source) merged.from[field.key] = source;
    }
  }
  return finish(category, merged);
}

export const fichaHasAny = (ficha: EquiparFicha | null | undefined): boolean =>
  Boolean(ficha && Object.values(ficha.values).some((value) => value !== null));

/** Algún dato salió de la ficha del vendedor, no sólo del título. */
export const fichaFromSeller = (ficha: EquiparFicha | null | undefined): boolean =>
  Boolean(ficha && Object.values(ficha.from).some((source) => source === "ficha"));
