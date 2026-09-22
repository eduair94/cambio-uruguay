// La ficha técnica del aviso: lo que la página propia de Mercado Libre publica como tabla y nadie
// leía. Medido el 2026-09-22 sobre 27 fichas: las 12 filas básicas (marca, modelo, año, versión, km,
// motor, color, puertas, caja, combustible, carrocería, tracción) están en TODAS; potencia, tanque,
// medidas, distancia entre ejes y plazas en ~20 de 27; y después una lista de equipamiento en Sí/No
// que va de 0 a 45 filas según lo que el vendedor marcó — con "Con garantía mecánica", "Único
// dueño", "Acepta permuta" y "Con precio negociable" entre las condiciones del aviso.
//
// Dos reglas. Sólo se publica lo que está en la lista de abajo: una etiqueta desconocida se guarda
// en privado (`detail.specs`, para poder mirarla) y no cruza la frontera. Y nada se estima: a
// diferencia de la carrocería o el consumo, acá no hay "≈" — o lo dice la ficha del aviso o no está.
import type { CarDetail } from "./types";
import type { PublicCarDrivetrain, PublicCarEquipment, PublicCarSpecs, PublicCarSteering } from "./publicTypes";

const decode = (raw: string): string => {
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw;
  }
};

const SPECS_MAX_ROWS = 80;
const LABEL_MAX = 60;
const VALUE_MAX = 80;
// Una etiqueta humana empieza en mayúscula ("Año", "AM/FM", "Único dueño"); un id de máquina
// ("description", "technical_specifications") no.
const HUMAN_LABEL = /^[A-ZÁÉÍÓÚÑÜ0-9]/;

// Las dos formas en que la página entrega la tabla: filas `andes-table` renderizadas en el servidor
// y, en otras entregas, un blob JSON con pares {"id":"Potencia","text":"101 hp"}.
const TABLE_ROW =
  /<div class="andes-table__header__container">([^<]{1,60})<\/div><\/th><td[^>]*>\s*<span[^>]*class="andes-table__column--value"[^>]*>([^<]{1,80})<\/span>/g;
const JSON_PAIR = /\{"id":"((?:[^"\\]|\\.){1,60})","text":"((?:[^"\\]|\\.){1,80})"\}/g;

/** Toda la tabla de la ficha tal cual la etiqueta la página, etiqueta → valor. Privado. */
export function detailSpecs(html: string): Record<string, string> {
  const specs: Record<string, string> = {};
  let count = 0;
  const add = (label: string, value: string): void => {
    const key = decode(label).trim().slice(0, LABEL_MAX);
    const text = decode(value).trim().slice(0, VALUE_MAX);
    if (!key || !text || !HUMAN_LABEL.test(key) || key in specs || count >= SPECS_MAX_ROWS) return;
    specs[key] = text;
    count++;
  };
  let match: RegExpExecArray | null;
  TABLE_ROW.lastIndex = 0;
  while ((match = TABLE_ROW.exec(html))) add(match[1]!, match[2]!);
  JSON_PAIR.lastIndex = 0;
  while ((match = JSON_PAIR.exec(html))) add(match[1]!, match[2]!);
  return specs;
}

/**
 * El equipamiento que la ficha marca con Sí o No, etiqueta de Mercado Libre → clave pública, en el
 * orden en que se publica (seguridad, confort, audio y conectividad, exterior). Sólo etiquetas
 * vistas en fichas reales: una que no está acá se guarda en privado y no se publica.
 */
export const ML_EQUIPMENT: ReadonlyArray<readonly [label: string, key: PublicCarEquipment]> = [
  ["Frenos ABS", "abs"],
  ["Control de estabilidad", "control_estabilidad"],
  ["Tracción ASR", "control_traccion"],
  ["Airbag conductor", "airbag_conductor"],
  ["Airbag para conductor y pasajero", "airbag_pasajero"],
  ["Sistema ISOFIX", "isofix"],
  ["Alarma", "alarma"],
  ["Blindado", "blindado"],
  ["Con cámara de retroceso", "camara_retroceso"],
  ["Sensor de estacionamiento", "sensor_estacionamiento"],
  ["Con sistema de estacionamiento automático", "estacionamiento_automatico"],
  ["Sensor de lluvia", "sensor_lluvia"],
  ["Faros antinieblas traseros", "faros_antiniebla"],
  ["Faros con regulación automática", "faros_automaticos"],
  ["Tercera luz de freno led", "tercera_luz_freno"],
  ["Alarma de luces encendidas", "alarma_luces"],
  ["Aire acondicionado", "aire_acondicionado"],
  ["Climatizador", "climatizador"],
  ["Piloto automático", "piloto_automatico"],
  ["Computadora de abordo", "computadora_abordo"],
  ["Cristales eléctricos", "cristales_electricos"],
  ["Cierre centralizado de puertas", "cierre_centralizado"],
  ["Cierre automático de vidrios", "cierre_automatico_vidrios"],
  ["Apertura remota de baúl", "apertura_remota_baul"],
  ["Tapizado de cuero", "tapizado_cuero"],
  ["Asientos delanteros calefaccionados", "asientos_calefaccionados"],
  ["Techo solar eléctrico retráctil", "techo_solar"],
  ["Porta vasos", "porta_vasos"],
  ["Bluetooth", "bluetooth"],
  ["Apple CarPlay", "apple_carplay"],
  ["Android auto", "android_auto"],
  ["Entrada USB", "usb"],
  ["Entrada auxiliar", "entrada_auxiliar"],
  ["AM/FM", "am_fm"],
  ["CD", "cd"],
  ["DVD", "dvd"],
  ["Reproductor de MP3", "mp3"],
  ["Comando remoto para radio en el volante", "comando_volante"],
  ["Llantas de aleación", "llantas_aleacion"],
  ["Porta equipaje en techo", "porta_equipaje"],
  ["Defensa delantera", "defensa_delantera"],
  ["Desempañador trasero", "desempanador_trasero"],
  ["Limpia/lava luneta", "limpia_luneta"],
  ["Soporte para rueda de auxilio", "rueda_auxilio"],
];

/** Las claves de equipamiento, en el orden de publicación. */
export const CAR_EQUIPMENT: readonly PublicCarEquipment[] = ML_EQUIPMENT.map(([, key]) => key);

const yesNo = (value: string | undefined): boolean | null =>
  value === undefined ? null : /^s[ií]$/i.test(value.trim()) ? true : /^no$/i.test(value.trim()) ? false : null;

const inRange = (value: number | null, min: number, max: number): number | null =>
  value !== null && Number.isFinite(value) && value >= min && value <= max ? value : null;

/** "2.600 mm" → 2600, "4530 mm" → 4530: en milímetros el punto es de miles. */
const millimetres = (text: string | undefined): number | null => {
  const digits = /(\d[\d.]*)\s*mm/i.exec(text ?? "")?.[1]?.replace(/\./g, "");
  return digits ? Number(digits) : null;
};

/** "50 L", "77,6 L", "985 L" → litros con un decimal. */
const litres = (text: string | undefined): number | null => {
  const raw = /(\d{1,4}(?:[.,]\d)?)\s*L\b/i.exec(text ?? "")?.[1];
  return raw ? Math.round(Number(raw.replace(",", ".")) * 10) / 10 : null;
};

const integer = (text: string | undefined): number | null => {
  const raw = /^\s*(\d{1,4})\b/.exec(text ?? "")?.[1];
  return raw ? Number(raw) : null;
};

// Mercado Libre archiva la tracción bajo "Control de tracción" (Delantera, 4x4, Integral…); el
// control de tracción de verdad es "Tracción ASR", y ése va en el equipamiento.
const DRIVETRAINS: ReadonlyArray<readonly [RegExp, PublicCarDrivetrain]> = [
  [/^4\s*x\s*4$/i, "4x4"],
  [/^4\s*x\s*2$/i, "4x2"],
  [/^delantera$/i, "delantera"],
  [/^trasera$/i, "trasera"],
  [/^(integral|awd|permanente)$/i, "integral"],
];
const STEERINGS: ReadonlyArray<readonly [RegExp, PublicCarSteering]> = [
  [/^hidr[aá]ulica$/i, "hidraulica"],
  [/^el[eé]ctrica$/i, "electrica"],
  [/^asistida$/i, "asistida"],
  [/^mec[aá]nica$/i, "mecanica"],
];
const pick = <T>(table: ReadonlyArray<readonly [RegExp, T]>, text: string | undefined): T | null => {
  const value = (text ?? "").trim();
  return table.find(([pattern]) => pattern.test(value))?.[1] ?? null;
};

/**
 * La ficha técnica pública de un aviso, rearmada campo por campo desde la tabla privada. Null si el
 * aviso no tiene ficha leída o si la tabla no dice nada que se publique. Sólo Mercado Libre tiene
 * ficha propia leída, así que sólo sus avisos llevan esto.
 */
export function carSpecsOf(detail: CarDetail | null | undefined): PublicCarSpecs | null {
  const specs = detail?.specs;
  if (!detail || !specs) return null;
  const power = /(\d{2,4})\s*(?:hp|cv)\b/i.exec(specs["Potencia"] ?? "")?.[1];
  const size = (specs["Largo x Altura x Ancho"] ?? "").split(/\s*x\s*/i);
  const equipment: PublicCarEquipment[] = [];
  const missing: PublicCarEquipment[] = [];
  for (const [label, key] of ML_EQUIPMENT) {
    const value = yesNo(specs[label]);
    if (value === true) equipment.push(key);
    else if (value === false) missing.push(key);
  }
  const result: PublicCarSpecs = {
    readAt: detail.readAt,
    powerHp: inRange(power ? Number(power) : null, 20, 1500),
    valvesPerCylinder: inRange(integer(specs["Válvulas por cilindro"]), 2, 6),
    gears: inRange(integer(specs["Marchas"]), 1, 10),
    drivetrain: pick(DRIVETRAINS, specs["Control de tracción"]),
    steering: pick(STEERINGS, specs["Dirección"]),
    fuelTankL: inRange(litres(specs["Capacidad del tanque"]), 10, 300),
    trunkL: inRange(litres(specs["Baúl"]), 50, 5000),
    lengthMm: inRange(size.length === 3 ? millimetres(size[0]) : null, 2000, 7000),
    heightMm: inRange(size.length === 3 ? millimetres(size[1]) : null, 1000, 2600),
    widthMm: inRange(size.length === 3 ? millimetres(size[2]) : null, 1000, 2600),
    wheelbaseMm: inRange(millimetres(specs["Distancia entre ejes"]), 1500, 4500),
    seats: inRange(integer(specs["Capacidad de personas"]), 1, 15),
    equipment,
    missing,
    singleOwner: yesNo(specs["Único dueño"]),
    acceptsTrade: yesNo(specs["Acepta permuta"]),
    negotiable: yesNo(specs["Con precio negociable"]),
    mechanicalWarranty: yesNo(specs["Con garantía mecánica"]),
    factoryWarranty: yesNo(specs["Con garantía de fábrica"]),
  };
  const anything = Object.entries(result).some(([key, value]) =>
    key !== "readAt" && (Array.isArray(value) ? value.length > 0 : value !== null),
  );
  return anything ? result : null;
}
