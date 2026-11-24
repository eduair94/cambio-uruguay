// Lo que dice un aviso de computadora o de pieza: qué es, y cada componente que nombra.
//
// Medido el 23/11/2026 sobre 1.000 títulos de Mercado Libre usados y 254 tarjetas + 13 fichas de
// Facebook Marketplace. El título de ML suele traer las piezas («Pc Gamer I5 9400f, 16gb Ram Ddr4,
// Gtx 1050ti 4gb, Ssd 480gb»); el de Facebook casi nunca («PC GAMER»), y las piezas están en la
// descripción de la ficha, muchas veces en líneas rotuladas («Procesador: Ryzen 7 5700G»).
//
// Reglas: el título gana sobre la descripción cuando los dos nombran la misma pieza (la descripción
// a veces habla de lo que el equipo «admite» o de otro aviso); una pieza que el texto no nombra no
// se inventa; un número sin unidad no se adivina salvo en los casos medidos («16ram», «8 de ram»,
// «ssd 240»).
import { exactCpu, readCpu } from "./cpu";
import { integratedFor, readGpu } from "./gpu";
import { norm, num, uniq } from "./text";
import type { Basis, ComputerKind, ComputerSpecs, Condition, Drive, DriveType, Fault, RamType } from "./types";

export interface SpecsInput {
  title: string;
  description?: string | null;
  /** Categoría de Mercado Libre (`MLU1649`…). */
  mlCategory?: string | null;
  /** ML «Nuevo»/«Usado». */
  mlCondition?: string | null;
  /** `attribute_data` de la ficha de Facebook, como `{ Condition: "used_like_new", Brand: "Apple" }`. */
  fbAttributes?: Record<string, string> | null;
}

// ---------------------------------------------------------------------------------------------
// Tipo de aviso

const ML_KIND: Record<string, ComputerKind | "reject"> = {
  MLU1649: "desktop",
  MLU1652: "notebook",
  MLU407379: "mini-pc",
  MLU443594: "all-in-one",
  MLU1693: "cpu",
  MLU1658: "gpu",
  MLU1694: "ram",
  MLU3582: "ram",
  MLU1672: "storage",
  MLU430802: "storage",
  MLU39130: "storage",
  MLU1692: "motherboard",
  MLU1695: "psu",
};

// Sin «portátil»: «PC de torre … por una CONSOLA PORTÁTIL» (Facebook, 23/11/2026).
const NOTEBOOK = /\b(notebooks?|laptops?|macbook|mac\s*book|mc\s*book|mackbook|ultrabook|chromebook|netbook|thinkpad|ideapad|vivobook|zenbook|elitebook|probook|latitude|surface\s*(?:laptop|pro|book)|zephyrus|rog\s*(?:strix\s*g\d|flow)|tuf\s*(?:gaming\s*)?f[ax]\d|nitro\s*(?:5|v\d*|an\d+)|predator\s*helios|legion\s*(?:5|7|pro|slim)|\bloq\b|katana|thin\s*gf|gf6\d|omen\s*1[567]|victus|galaxy\s*book|matebook|expertbook|travelmate|stream\s*1[14]|aspire\s*[357]\b|swift\s*[gx135]|yoga\s*(?:slim|\d)|xps\s*1[3-7])\b/;
const AIO = /\b(all\s*-?\s*in\s*-?\s*one|todo\s*en\s*uno|aio|imac)\b/;
const MINI = /\b(mini\s*-?\s*pc|minipc|nuc\d*|mac\s*mini|mac\s*studio|micro\s*pc|thin\s*client|tiny)\b/;
const DESKTOP = /\b(pc|pcs|computadora|computadoras|computador|ordenador|torre|equipo|desktop|workstation|optiplex|thinkcentre|elitedesk|prodesk|vostro|setup|sobremesa)\b/;

const GPU_WORD = /\b(placa\s*de\s*video|placa\s*grafica|tarjeta\s*(?:de\s*)?(?:video|grafica)|grafica|gpu|aceleradora)\b/;
const CPU_WORD = /\b(procesador|microprocesador|micro\s*procesador)\b/;
const RAM_WORD = /\b(memoria\s*ram|memorias?\s*ram|memoria|memorias|ram|sodimm|so-dimm|udimm|dimm)\b/;
const STORAGE_WORD = /\b(ssd|nvme|disco\s*(?:duro|solido|rigido|externo|interno)?|hdd|m\.?2)\b/;
const MOBO_WORD = /\b(mother\s*board|motherboard|mother|motherboards|placa\s*madre|tarjeta\s*madre|placa\s*base|board)\b/;
const PSU_WORD = /\b(fuente(?:\s*de\s*(?:poder|alimentacion))?|psu)\b/;

/** Lo que no es este directorio, aunque Marketplace lo traiga en las mismas búsquedas. */
const NOT_COMPUTER = /\b(smart\s*tv|televisor|television|tv|tele|playstation|ps[2-5]|play\s*[2-5]|xbox|nintendo|switch|consola|celular|iphone|ipone|ipad|tablet|redmi\s*pad|galaxy\s*tab|impresora|proyector|parlantes?|silla|camara|drone|smartwatch|reloj|router|modem|heladera|lavarropas)\b/;
/** Un accesorio que nombra la computadora a la que va («Cargador Laptop Toshiba»). */
const ACCESSORY_LEAD = /^(?:vendo\s+|se\s+vende\s+)?(cargador|cargadores|bateria|baterias|pantalla|display|teclado|teclados|mouse|carcasa|bisagras?|cooler|disipador|ventilador|fan|fans|cables?|adaptador|hub|soporte|base|funda|mochila|bolso|maletin|webcam|auriculares|monitor|monitores|gabinete|gabinetes|joystick|control|pad|alfombrilla|kit\s*de\s*limpieza|lector|grabadora|lectora)\b/;
const MACHINE_LEAD = /^(?:vendo\s+|oferta\s+|kit\s+|combo\s+)?(?:pc|computadora|computador|notebook|laptop|torre|equipo|macbook|imac|mini\s*pc)\b/;
// «Torre funcionando, 3 notebook y 2 mini PC para repuesto», «Variedad de notebook»: muchos equipos
// por un precio que no es de ninguno.
const MULTI = /\bdesde\s*(?:\$|u\$?s|usd|\d)|\bmodelos?\s+disponibles\b|\bvarios\s+modelos\b|\bstock\b|\bpor\s+partes\b|\blote\b|\bcompro\b|\bbusco\b|\bvariedad\b|\b[2-9]\s+(?:notebooks?|laptops?|pcs?|computadoras?|torres?|mini\s*pcs?)\b/;

export function classifyKind(title: string, description: string, mlCategory?: string | null, fbAttributes?: Record<string, string> | null): { kind: ComputerKind | null; reject: string | null } {
  const t = title;
  const machineWords = NOTEBOOK.test(t) || AIO.test(t) || MINI.test(t) || DESKTOP.test(t);

  if (MULTI.test(t)) return { kind: null, reject: "multi" };
  if (/^(compro|busco)\b/.test(t)) return { kind: null, reject: "compra" };

  if (mlCategory) {
    const mapped = ML_KIND[mlCategory];
    if (!mapped || mapped === "reject") return { kind: null, reject: "categoria" };
    if (mapped === "desktop") {
      if (NOTEBOOK.test(t) && !/\b(torre|gabinete)\b/.test(t)) return { kind: "notebook", reject: null };
      if (AIO.test(t)) return { kind: "all-in-one", reject: null };
      if (MINI.test(t)) return { kind: "mini-pc", reject: null };
      if (/^(?:vendo\s+)?monitor(es)?\b/.test(t)) return { kind: null, reject: "monitor" };
      return { kind: "desktop", reject: null };
    }
    if (mapped === "all-in-one" && MINI.test(t)) return { kind: "mini-pc", reject: null };
    if (["cpu", "gpu", "ram", "storage", "motherboard", "psu"].includes(mapped)) {
      // «Memoria Ram 16gb Ddr4 … Para Pc» es una pieza: la categoría manda salvo que el título
      // ABRA con una máquina («Pc Gamer …» publicado en Procesadores).
      if (MACHINE_LEAD.test(t)) return { kind: null, reject: "pc-en-categoria-de-pieza" };
      if ((mapped === "motherboard" || mapped === "cpu") && exactCpu(t) && chipsetOf(t)) return { kind: "combo", reject: null };
      return { kind: mapped as ComputerKind, reject: null };
    }
    return { kind: mapped as ComputerKind, reject: null };
  }

  // Facebook: sólo palabras. La ficha decide únicamente cuando el título no dice nada.
  if (ACCESSORY_LEAD.test(t) && !(/^gabinete/.test(t) && (exactCpu(t) || /\b\d{1,2}\s*gb\b/.test(t)))) {
    return { kind: null, reject: "accesorio" };
  }
  // «Fuente para computadora», «Memoria para notebook»: una pieza, no un accesorio.
  const partLead = /^(?:vendo\s+)?(fuente|memoria|ram|placa\s*de\s*video|tarjeta|disco|ssd|procesador|mother|placa\s*madre)\b/.exec(t);
  if (partLead && /\bpara\s+(?:notebook|laptop|pc|computadora|macbook|mac)\b/.test(t)) {
    const lead = partLead[1]!;
    return { kind: /fuente/.test(lead) ? "psu" : /memoria|ram/.test(lead) ? "ram" : /disco|ssd/.test(lead) ? "storage" : /procesador/.test(lead) ? "cpu" : /mother|madre/.test(lead) ? "motherboard" : "gpu", reject: null };
  }
  if (/\bpara\s+(?:notebook|laptop|pc|computadora|macbook|mac)\b/.test(t) && !machineWordsBefore(t)) return { kind: null, reject: "accesorio" };
  if (NOT_COMPUTER.test(t) && !(NOTEBOOK.test(t) || /\b(pc|computadora|torre|cpu)\b/.test(t))) return { kind: null, reject: "otro-producto" };
  if (/\b\d{2,3}\s*hz\b/.test(t) && !machineWords && !readGpu(t)?.slug) return { kind: null, reject: "monitor" };

  if (NOTEBOOK.test(t) || (fbAttributes?.["Laptop Type"] && !DESKTOP.test(t))) return { kind: "notebook", reject: null };
  if (AIO.test(t)) return { kind: "all-in-one", reject: null };
  if (MINI.test(t)) return { kind: "mini-pc", reject: null };
  // «Partes de Computadora», «Componentes de pc de entrada»: piezas sueltas vendidas juntas.
  if (/\bcombo\b|\b(?:partes|componentes)\b/.test(t) && !DESKTOP.test(t.replace(/\b(?:partes|componentes)\s*de\s*(?:una\s*)?(?:pc|computadora)\b/, ""))) {
    return { kind: "combo", reject: null };
  }
  if (DESKTOP.test(t) || /\bcpu\b/.test(t) && /\b\d{1,2}\s*(?:gb|g)\b|\bram\b|\bssd\b|\bhdd\b/.test(t)) return { kind: "desktop", reject: null };

  const gpu = readGpu(t);
  const cpu = readCpu(t);
  if (GPU_WORD.test(t) || (gpu?.slug && !cpu)) return gpu?.slug || GPU_WORD.test(t) ? { kind: "gpu", reject: null } : { kind: null, reject: "sin-identidad" };
  if (cpu && chipsetOf(t)) return { kind: "combo", reject: null };
  if (MOBO_WORD.test(t) || (chipsetOf(t) && !cpu)) return { kind: "motherboard", reject: null };
  if (CPU_WORD.test(t) || (cpu?.slug && !RAM_WORD.test(t))) return cpu ? { kind: "cpu", reject: null } : { kind: null, reject: "sin-identidad" };
  if (cpu && gpu?.slug) return { kind: "desktop", reject: null };
  if (PSU_WORD.test(t)) return { kind: "psu", reject: null };
  if (RAM_WORD.test(t) && /\d{1,2}\s*(?:gb|g)\b/.test(t)) return { kind: "ram", reject: null };
  if (STORAGE_WORD.test(t) && /\d\s*(?:gb|tb|tera)/.test(t)) return { kind: "storage", reject: null };
  if (/\bgamer\b/.test(t) && (cpu || gpu)) return { kind: "desktop", reject: null };

  // Título sin nada («Vendo», «Pc»): la ficha.
  if (description) {
    const d = description;
    if (MULTI.test(d.slice(0, 200))) return { kind: null, reject: "multi" };
    if (NOTEBOOK.test(d.slice(0, 160))) return { kind: "notebook", reject: null };
    if (/\b(pc|computadora|torre|equipo)\b/.test(d.slice(0, 160)) && (readCpu(d) || readGpu(d))) return { kind: "desktop", reject: null };
  }
  return { kind: null, reject: "no-computadora" };
}

const machineWordsBefore = (t: string): boolean => {
  const cut = t.search(/\bpara\s+(?:notebook|laptop|pc|computadora|macbook|mac)\b/);
  const head = cut > 0 ? t.slice(0, cut) : "";
  return NOTEBOOK.test(head) || DESKTOP.test(head);
};

// ---------------------------------------------------------------------------------------------
// Chipset

const CHIPSETS = "a320|a520|a620|b350|b450|b550|b650e|b650|b840|b850|x370|x470|x570|x670e|x670|x870e|x870|h61|h81|h110|h310c|h310|h410|h510|h610|h810|b75|b85|b150|b250|b360|b365|b460|b560|b660|b760|b860|z77|z87|z97|z170|z270|z370|z390|z490|z590|z690|z790|z890|h55|h67|h77|h87|h97|h170|h270|h370|h470|h570|h670|h770|q170|q270|q370|x99|x299";
const CHIPSET = new RegExp(`(?<![a-z0-9])(${CHIPSETS})(?:m|-[a-z]+)?(?![0-9])`);

export function chipsetOf(text: string): string | null {
  const match = CHIPSET.exec(text);
  return match ? match[1]!.replace(/c$/, "").replace(/e$/, "") : null;
}

const CHIPSET_SOCKET: Array<[RegExp, string]> = [
  [/^(a320|a520|b350|b450|b550|x370|x470|x570)$/, "AM4"],
  [/^(a620|b650|b840|b850|x670|x870)$/, "AM5"],
  [/^(h61|h67|h77|b75|z77)$/, "LGA1155"],
  [/^(h81|h87|h97|b85|z87|z97)$/, "LGA1150"],
  [/^(h110|b150|h170|z170|q170|b250|h270|z270|q270|h310|b360|b365|h370|z370|z390|q370)$/, "LGA1151"],
  [/^(h410|b460|h470|z490|h510|b560|h570|z590)$/, "LGA1200"],
  [/^(h610|b660|h670|z690|b760|h770|z790)$/, "LGA1700"],
  [/^(h810|b860|z890)$/, "LGA1851"],
];

export function socketOfChipset(chipset: string | null): string | null {
  if (!chipset) return null;
  return CHIPSET_SOCKET.find(([pattern]) => pattern.test(chipset))?.[1] ?? null;
}

// ---------------------------------------------------------------------------------------------
// Blanqueo: lo que ya se leyó como placa de video no puede volver a leerse como RAM o disco

// La VRAM pegada al modelo se blanquea con él, salvo que el número siga con «ram»/«ddr4»: «Rtx 3070
// 16gb Ram» son 16 GB de RAM, no de video (medido en ML el 23/11/2026).
const NOT_SYSTEM_RAM = "(?!\\s*(?:de\\s*)?(?:ram|ddr|memoria(?!\\s*de\\s*video)))";
const GPU_SPAN = new RegExp(
  `(?<![a-z])(?:rtx|gtx|gt|rx|arc|quadro|mx|nvidia|geforce)\\s*-?\\s*[a-z]?\\d{3,4}\\s*(?:ti|super|xtx|xt|gre|s)?(?:\\s*(?:oc|edition|strix|ventus|eagle|windforce|dual|gaming|twin|x2|2x|3x|trio|aorus|tuf|phoenix|pulse|nitro\\+?)\\b)*\\s*(?:de\\s*)?(?:\\d{1,2}\\s*(?:gb|g)\\b${NOT_SYSTEM_RAM}(?:\\s*(?:de\\s*)?(?:g?ddr\\d|vram|de\\s*vram|de\\s*memoria\\s*de\\s*video))?)?|(?<![0-9])\\d{4}\\s*(?:ti|super)?\\s*(?:rtx|gtx)(?![a-z])`,
  "g"
);
const VRAM_SPAN = /\b\d{1,2}\s*(?:gb|g)\s*(?:de\s*)?(?:vram|gddr\d|de\s*video|de\s*memoria\s*de\s*video)\b/g;

/** Lo leído se cambia por `#`: ningún `\s*` lo cruza, así dos piezas no se pegan a través del hueco. */
const blank = (text: string, pattern: RegExp): string => text.replace(pattern, (m) => "#".repeat(m.length));

// ---------------------------------------------------------------------------------------------
// RAM

// Sin 1: «1 Ram 4gb ddr3» es UNA memoria de 4 GB.
const RAM_SIZES = new Set([2, 3, 4, 6, 8, 10, 12, 16, 20, 24, 32, 36, 40, 48, 64, 96, 128, 192, 256]);
const UNITLESS_RAM = new Set([2, 4, 6, 8, 12, 16, 24, 32, 64]);
const NEAR_STORAGE = /(ssd|hdd|nvme|m\.?2|emmc|disco|almacenamiento|rom|storage|sata)/;

export function readRam(text: string): { gb: number; span: [number, number] } | null {
  const tries: RegExp[] = [
    /(?<![0-9])(\d)\s*x\s*(\d{1,2})\s*(?:gb|g)(?![a-z0-9])/,
    /(?<![0-9.,x])(\d{1,3})\s*(?:gb|g|gigas?)?\s*(?:de\s*)?(?:memoria\s*)?(?:ram\b|lpddr\s*[345]x?|d{2,3}r\s*[345])/,
    /(?:\bram|memoria(?:\s*ram)?)\s*(?:instalada\s*)?(?:d{2,3}r\s*[345]\s*)?:?\s*(?:de\s*)?(\d{1,3})\s*(?:gb|g)?(?![0-9])/,
  ];
  for (const [index, pattern] of tries.entries()) {
    const match = pattern.exec(text);
    if (!match) continue;
    const gb = index === 0 ? Number(match[1]) * Number(match[2]) : Number(match[1]);
    // «ram 4 emmc» sin unidad vale; «ram 1tdisk» no: sin unidad, sólo los tamaños de siempre.
    const unitless = index === 2 && !/\d\s*(?:gb|g)$/.test(match[0]);
    if (unitless ? UNITLESS_RAM.has(gb) : RAM_SIZES.has(gb)) return { gb, span: [match.index, match.index + match[0].length] };
  }
  // Sin rótulo: «32gb» suelto es RAM si es un tamaño de RAM y la palabra que lo sigue (o lo precede)
  // no es de disco. «32gb 1tb ssd»: el ssd es del 1tb, no del 32.
  for (const match of text.matchAll(/(?<![0-9.,x])(\d{1,3})\s*(?:gb|g)(?![a-z0-9])/g)) {
    const gb = Number(match[1]);
    if (!RAM_SIZES.has(gb) || gb > 128) continue;
    const before = text.slice(Math.max(0, match.index! - 16), match.index!);
    const after = text.slice(match.index! + match[0].length, match.index! + match[0].length + 16);
    if (new RegExp(`^\\s*(?:de\\s*)?${NEAR_STORAGE.source}`).test(after) || /(ssd|hdd|nvme|m\.?2|emmc|disco|almacenamiento|rom)\s*(?:de\s*|:\s*)?$/.test(before)) continue;
    return { gb, span: [match.index!, match.index! + match[0].length] };
  }
  return null;
}

export function readRamType(text: string): RamType | null {
  const match = /(?<![a-z])(?:lp)?d{2,3}r\s*([345])(?![0-9])/.exec(text);
  return match ? (`ddr${match[1]}` as RamType) : null;
}

// ---------------------------------------------------------------------------------------------
// Discos

const driveTypeOf = (word: string, context: string): DriveType => {
  if (/nvme|m\.?2|nv\d/.test(word) || /nvme/.test(context)) return "nvme";
  if (/ssd|solido/.test(word)) return "ssd";
  if (/hdd|duro|rigido|mecanico/.test(word)) return "hdd";
  if (/emmc/.test(word)) return "emmc";
  return "unknown";
};

function capacityGb(raw: string, unit: string | undefined, type: DriveType): number | null {
  const value = num(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  // Un terabyte se escribe con su unidad: «disco 1» sin unidad no se adivina (medido: «Vega 11 …
  // Ssd» se leía 11 TB).
  const tb = !!unit && /^(tb|t|tera|teras|terabytes?)$/.test(unit);
  const gb = tb ? Math.round(value * 1000) : Math.round(value);
  if (type === "emmc" ? gb < 16 || gb > 512 : gb < 64 || gb > 16_000) return null;
  return gb;
}

const STORAGE_UNIT = "(gb|g|tb|t|tera|teras|terabytes?|gigas?)";
// Número primero: «480ssd», «512gb ssd», «1tb nvme», «500 de disco», «1.5 tb ssd». Sin `g` suelta
// como unidad («3200g» es un Ryzen) y, sin unidad, el número tiene que estar pegado a la palabra.
const NUMBER_FIRST = /(?<![0-9.,x])(\d{1,4}(?:[.,]\d{1,2})?)(\s*(?:gb|tb|t|tera|teras|terabytes?|gigas?)\s*|\s?)(?:de\s*)?(?:disco\s*)?(ssd|nvme|m\.?2|hdd|emmc|disco\s*(?:duro|solido|rigido|mecanico)?|sata|solido|de\s*almacenamiento|almacenamiento)(?![a-z])/g;
// Palabra primero: «ssd 240gb», «hdd 1tb», «disco: hdd 1tb», «almacenamiento: m.2 nv3 1tb».
const WORD_FIRST = new RegExp(`(ssd|nvme|m\\.?2|hdd|emmc|disco\\s*(?:duro|solido|rigido|mecanico|ssd|hdd)?|almacenamiento)\\s*(?:de\\s*|:\\s*|-\\s*)?(?:(?:nvme|m\\.?2|ssd|hdd|sata|nv\\d|kingston|wd|samsung|crucial|adata|interno|solido|pcie|gen\\s*\\d)\\s*)*(\\d{1,4}(?:[.,]\\d{1,2})?)\\s*${STORAGE_UNIT}?(?![a-z0-9])`, "g");

type DriveAt = Drive & { at: number };

function storagePass(text: string, order: "number-first" | "word-first"): DriveAt[] {
  const drives: DriveAt[] = [];
  const taken: Array<[number, number]> = [];
  const free = (start: number, end: number): boolean => !taken.some(([a, b]) => start < b && end > a);
  const push = (type: DriveType, gb: number | null, start: number, end: number): void => {
    if (!gb || !free(start, end)) return;
    taken.push([start, end]);
    drives.push({ type, gb, at: start });
  };
  const numberFirst = (): void => {
    for (const match of text.matchAll(NUMBER_FIRST)) {
      const word = match[3]!;
      const type = driveTypeOf(word, text.slice(match.index!, match.index! + match[0].length + 8));
      const unit = match[2]!.trim().replace(/^gigas?$/, "gb") || undefined;
      if (!unit && !/ssd|nvme|hdd|m\.?2|emmc|disco|almacenamiento/.test(word)) continue;
      push(type === "unknown" && /sata/.test(word) ? "ssd" : type, capacityGb(match[1]!, unit, type), match.index!, match.index! + match[0].length);
    }
  };
  const wordFirst = (): void => {
    for (const match of text.matchAll(WORD_FIRST)) {
      const segment = match[0];
      const type = driveTypeOf(segment, segment);
      const unit = match[3]?.replace(/^gigas?$/, "gb");
      // «Macbook Air M2 2022»: el chip y el año, no un disco. Sin unidad, un año no es una
      // capacidad, y «m2» suelto sin unidad tampoco.
      const value = num(match[2]!);
      if (!unit && ((value >= 1990 && value <= 2035) || /^m\.?2/.test(match[1]!))) continue;
      push(type, capacityGb(match[2]!, unit, type), match.index!, match.index! + match[0].length);
    }
  };
  if (order === "number-first") {
    numberFirst();
    wordFirst();
  } else {
    wordFirst();
    numberFirst();
  }
  // Con unidad y sin palabra: «1tb», «2tb+512gb», «500gb» (≥ 120 GB, que no es RAM).
  for (const match of text.matchAll(/(?<![0-9.,x])(\d{1,4}(?:[.,]\d{1,2})?)\s*(gb|tb|tera|teras)(?![a-z0-9])/g)) {
    const unit = match[2]!;
    const gb = capacityGb(match[1]!, unit, "unknown");
    if (!gb || (unit === "gb" && gb < 120)) continue;
    push("unknown", gb, match.index!, match.index! + match[0].length);
  }
  return drives;
}

/**
 * Los discos que nombra el texto. «1tb Nvme 2tb Hdd» se lee número→palabra; «Almacenamiento ssd 256
 * gb / Ssd 240gb» palabra→número, y leído al revés le roba al segundo disco su palabra. Las dos
 * lecturas compiten y gana la que deja menos discos sin tipo (empate: número→palabra, la de los títulos).
 */
export function readStorage(text: string): Drive[] {
  const a = storagePass(text, "number-first");
  const b = storagePass(text, "word-first");
  const unknowns = (drives: DriveAt[]): number => drives.filter((drive) => drive.type === "unknown").length;
  const best = unknowns(b) < unknowns(a) ? b : a;
  return best.sort((x, y) => x.at - y.at).map(({ type, gb }) => ({ type, gb }));
}

// ---------------------------------------------------------------------------------------------
// Fuente, pantalla, lo que trae

export function readPsuWatts(text: string, isPsu = false): number | null {
  const tries = [
    /(?:fuente|psu|poder)[^.\n|]{0,40}?(?<![0-9])(\d{3,4})\s*(?:w|watts?|vatios)(?![a-z0-9])/,
    /(?<![0-9])(\d{3,4})\s*(?:w|watts?|vatios)\b[^.\n|]{0,25}(?:80\s*\+?\s*plus|fuente|modular|bronze|bronce|gold|silver|platinum)/,
    ...(isPsu ? [/(?<![0-9])(\d{3,4})\s*(?:w|watts?|vatios)(?![a-z0-9])/] : []),
  ];
  for (const pattern of tries) {
    const match = pattern.exec(text);
    const watts = match ? Number(match[1]) : NaN;
    if (watts >= 250 && watts <= 2000) return watts;
  }
  return null;
}

export function readScreenInches(text: string, kind: ComputerKind | null): number | null {
  const max = kind === "all-in-one" ? 34 : 18.5;
  const min = kind === "all-in-one" ? 17 : 10;
  for (const match of text.matchAll(/(?<![0-9.,])(\d{2}(?:[.,]\d)?)\s*(?:"|''|pulgadas?|pulg\b|in\b|inch)/g)) {
    const value = num(match[1]!);
    if (value >= min && value <= max) return value;
  }
  const label = /\bpantalla\s*(?:de\s*)?(\d{2}(?:[.,]\d)?)\b/.exec(text);
  if (label) {
    const value = num(label[1]!);
    if (value >= min && value <= max) return value;
  }
  // «Ideapad L340, 15.6 1tb»: el tamaño de notebook con decimal se reconoce aun sin unidad.
  if (kind === "notebook") {
    const bare = /(?<![0-9.,])(11\.6|12\.5|13\.3|13\.4|13\.5|13\.6|14\.0|14\.5|15\.3|15\.6|16\.0|16\.1|17\.3)(?![0-9])/.exec(text.replace(/,(?=\d)/g, "."));
    if (bare) return num(bare[1]!);
  }
  return null;
}

function readIncludes(text: string): ComputerSpecs["includes"] {
  const noMonitor = /\bsin\s*(?:el\s*)?monitor\b/.test(text);
  const monitorMatch = /(?:\+|\bcon\b|\bincluye\b|\bmas\b|\by\b|\bcombo\b|•|-|\/)\s*(?:un\s*|el\s*)?monitor(?:es)?\b([^.\n|+]{0,30})/.exec(text);
  const monitor = !noMonitor && !!monitorMatch;
  let monitorInches: number | null = null;
  if (monitor) {
    const inches = /(?<![0-9])(1[7-9]|[2-4]\d)(?:[.,]\d)?\s*(?:"|''|pulgadas?|pulg\b)?/.exec(monitorMatch![1] ?? "");
    monitorInches = inches ? Number(inches[1]) : null;
  }
  const peripherals = /\b(teclado|mouse|combo\s*gamer|kit\s*gamer|perifericos)\b/.test(text) && !/\bsin\s*(?:teclado|mouse)\b/.test(text);
  return { monitor, monitorInches, peripherals };
}

// ---------------------------------------------------------------------------------------------
// Fallas declaradas

const FAULTS: Array<[Fault, RegExp]> = [
  ["no-enciende", /\bno\s*(?:enciende|prende|arranca|bootea|inicia|carga\s*(?:el\s*)?(?:windows|sistema))\b/],
  ["no-da-video", /\bno\s*da\s*(?:video|imagen|senal)\b|\b(?:tira|con)\s*artifacts?\b|\bartefactos\b/],
  ["para-repuesto", /\bpara\s*(?:repuestos?|piezas|reparar|arreglar|tecnicos?|entendidos)\b|\ba\s*reparar\b|\bno\s*funciona\b/],
  ["pantalla", /\bpantalla\s*(?:rota|partida|quebrada|rajada|con\s*(?:rayas?|lineas?|manchas?|pixeles?))\b|\b(?:display|lcd)\s*roto\b/],
  ["teclado", /\b(?:falla|fallas|detalle|detalles|problema)\s*(?:en\s*(?:el\s*)?)?teclado\b|\bteclado\s*(?:no\s*funciona|roto|con\s*fallas?)\b/],
  ["bateria", /\bbateria\s*(?:no\s*(?:funciona|carga|anda|dura|sirve)|muerta|agotada|inflada|hinchada|mala)\b|\bsin\s*bateria\b/],
  ["bloqueada", /\bbloquead[ao]\b|\bicloud\b|\bclave\s*(?:de\s*)?(?:la\s*)?bios\b/],
  ["sin-disco", /\bsin\s*(?:disco|ssd|hdd|almacenamiento)\b/],
  ["sin-cargador", /\bsin\s*cargador\b/],
  ["falla", /\b(?:con|tiene|presenta)\s*(?:una\s*|algunas?\s*)?fallas?\b|\bcarpeta\s*con\s*signo\b|\bpara\s*revisar\b/],
];

export function readFaults(text: string): Fault[] {
  const found: Fault[] = [];
  for (const [fault, pattern] of FAULTS) {
    const match = pattern.exec(text);
    if (!match) continue;
    const before = text.slice(Math.max(0, match.index - 8), match.index);
    if (/\b(no|sin|nunca)\s*$/.test(before)) continue;
    found.push(fault);
  }
  return found;
}

// ---------------------------------------------------------------------------------------------
// Marca y estado

const BRANDS: Array<[RegExp, string]> = [
  [/\b(alienware)\b/, "Alienware"],
  [/\b(dell|optiplex|latitude|inspiron|vostro|xps)\b/, "Dell"],
  [/\b(hp|hewlett|compaq|elitebook|probook|elitedesk|prodesk|pavilion|omen|victus|envy)\b/, "HP"],
  [/\b(lenovo|thinkpad|thinkcentre|ideapad|legion|yoga|loq)\b/, "Lenovo"],
  [/\b(asus|vivobook|zenbook|rog|tuf\s*gaming|expertbook|expertcenter)\b/, "Asus"],
  [/\b(acer|aspire|nitro|predator|swift|travelmate)\b/, "Acer"],
  [/\b(msi|katana)\b/, "MSI"],
  [/\b(apple|macbook|imac|mac\s*mini|mac\s*studio)\b/, "Apple"],
  [/\b(samsung)\b/, "Samsung"],
  [/\b(toshiba)\b/, "Toshiba"],
  [/\b(gigabyte|aorus)\b/, "Gigabyte"],
  [/\b(huawei|matebook)\b/, "Huawei"],
  [/\b(xiaomi)\b/, "Xiaomi"],
  [/\b(microsoft|surface)\b/, "Microsoft"],
  [/\b(razer)\b/, "Razer"],
  [/\b(chuwi)\b/, "Chuwi"],
  [/\b(sony|vaio)\b/, "Sony"],
  [/\b(lg)\b/, "LG"],
  [/\b(gateway)\b/, "Gateway"],
];

export function readBrand(text: string, fbBrand?: string | null): string | null {
  const found = BRANDS.find(([pattern]) => pattern.test(text))?.[1];
  if (found) return found;
  const fb = String(fbBrand ?? "").trim();
  return fb && fb.length <= 24 ? fb : null;
}

function conditionOf(fbAttributes?: Record<string, string> | null, mlCondition?: string | null): Condition | null {
  const fb = String(fbAttributes?.Condition ?? "").toLowerCase();
  if (fb === "new") return "new";
  if (fb === "used_like_new") return "like-new";
  if (fb === "used_good") return "good";
  if (fb === "used_fair") return "fair";
  const ml = String(mlCondition ?? "").toLowerCase();
  if (ml === "nuevo" || ml === "new") return "new";
  return null;
}

// ---------------------------------------------------------------------------------------------

const RAM_FROM_CPU = (cpu: ComputerSpecs["cpu"]): RamType | null => cpu?.ramType ?? null;

/** Todo lo que dice un aviso. */
export function readComputerSpecs(input: SpecsInput): ComputerSpecs {
  const title = norm(input.title);
  const description = norm(input.description ?? "");
  const { kind, reject } = classifyKind(title, description, input.mlCategory, input.fbAttributes);
  const empty: ComputerSpecs = {
    kind,
    rejectReason: reject,
    brand: null,
    cpu: null,
    gpu: null,
    ramGb: null,
    ramType: null,
    ramTypeInferred: false,
    storage: [],
    psuWatts: null,
    chipset: null,
    screenInches: null,
    includes: { monitor: false, monitorInches: null, peripherals: false },
    faults: [],
    condition: conditionOf(input.fbAttributes, input.mlCondition),
    basis: {},
  };
  if (!kind) return empty;

  const machine = kind === "notebook" || kind === "desktop" || kind === "all-in-one" || kind === "mini-pc";
  const notebookish = kind === "notebook";
  const both = `${title} | ${description}`;
  const specs: ComputerSpecs = { ...empty, brand: machine ? readBrand(title, input.fbAttributes?.Brand) : null };

  // Procesador: el del título; la descripción completa un título que sólo dice la familia.
  const wantsCpu = machine || kind === "cpu" || kind === "combo";
  if (wantsCpu) {
    const fromTitle = readCpu(title);
    const fromDescription = description ? readCpu(description) : null;
    if (fromTitle && (fromTitle.slug || !fromDescription?.slug || fromDescription.family !== fromTitle.family)) specs.cpu = { ...fromTitle, basis: "title" };
    else if (fromDescription) specs.cpu = { ...fromDescription, basis: "description" };
  }

  // Placa de video.
  const wantsGpu = machine || kind === "gpu" || kind === "combo";
  if (wantsGpu) {
    const fromTitle = readGpu(title, notebookish);
    const fromDescription = description && kind !== "gpu" ? readGpu(description, notebookish) : null;
    const pick = fromTitle && !(fromTitle.integrated && fromDescription && !fromDescription.integrated) ? { ...fromTitle, basis: "title" as Basis } : fromDescription ? { ...fromDescription, basis: "description" as Basis } : null;
    if (pick) specs.gpu = pick;
    else if (machine) {
      // La integrada del procesador existe; si además hay una dedicada que el aviso no nombra, no se
      // sabe: `inferred` hace que el catálogo publique `gpuDedicated: null` y no `false`.
      const integrated = integratedFor(specs.cpu);
      if (integrated) specs.gpu = { ...integrated, basis: specs.cpu!.basis, inferred: true };
    }
  }

  // RAM y discos, sobre el texto sin la placa de video.
  const clean = (text: string): string => blank(blank(text, GPU_SPAN), VRAM_SPAN);
  const cleanTitle = clean(title);
  const cleanDescription = clean(description);
  if (machine || kind === "ram" || kind === "combo") {
    const fromTitle = readRam(cleanTitle);
    const fromDescription = fromTitle ? null : readRam(cleanDescription);
    const ram = fromTitle ?? fromDescription;
    if (ram) {
      specs.ramGb = ram.gb;
      specs.basis.ram = fromTitle ? "title" : "description";
    }
    const declared = readRamType(cleanTitle) ?? readRamType(cleanDescription);
    if (declared) specs.ramType = declared;
    else if (specs.ramGb && kind === "desktop" && RAM_FROM_CPU(specs.cpu)) {
      specs.ramType = RAM_FROM_CPU(specs.cpu);
      specs.ramTypeInferred = true;
    }
  }
  if (machine || kind === "storage" || kind === "combo") {
    const withoutRam = (text: string): string => {
      const ram = readRam(text);
      return ram ? text.slice(0, ram.span[0]) + "#".repeat(ram.span[1] - ram.span[0]) + text.slice(ram.span[1]) : text;
    };
    const fromTitle = readStorage(withoutRam(cleanTitle));
    const drives = fromTitle.length ? fromTitle : readStorage(withoutRam(cleanDescription));
    specs.storage = dedupeDrives(drives);
    if (specs.storage.length) specs.basis.storage = fromTitle.length ? "title" : "description";
  }

  if (kind === "desktop" || kind === "psu" || kind === "combo") {
    const watts = readPsuWatts(title, kind === "psu") ?? readPsuWatts(description, kind === "psu");
    if (watts) {
      specs.psuWatts = watts;
      specs.basis.psu = readPsuWatts(title, kind === "psu") ? "title" : "description";
    }
  }
  if (kind === "desktop" || kind === "motherboard" || kind === "combo") {
    const chipset = chipsetOf(title) ?? chipsetOf(description);
    if (chipset) {
      specs.chipset = chipset;
      specs.basis.chipset = chipsetOf(title) ? "title" : "description";
    }
  }
  if (kind === "notebook" || kind === "all-in-one") {
    const inches = readScreenInches(title, kind) ?? readScreenInches(description, kind);
    if (inches) {
      specs.screenInches = inches;
      specs.basis.screen = readScreenInches(title, kind) ? "title" : "description";
    }
  }
  if (kind === "desktop") specs.includes = readIncludes(both);
  specs.faults = uniq(readFaults(both));
  return specs;
}

/** Un mismo disco nombrado dos veces («ssd 240gb» y «240 ssd») cuenta una vez. */
function dedupeDrives(drives: Drive[]): Drive[] {
  const out: Drive[] = [];
  for (const drive of drives) {
    const twin = out.find((other) => other.gb === drive.gb && (other.type === drive.type || other.type === "unknown" || drive.type === "unknown"));
    if (twin) {
      if (twin.type === "unknown") twin.type = drive.type;
      continue;
    }
    out.push({ ...drive });
  }
  return out.slice(0, 4);
}

/** Cuántos datos se leyeron: ordena «los más completos». */
export function specCount(specs: ComputerSpecs): number {
  return [specs.cpu, specs.gpu, specs.ramGb, specs.storage.length ? 1 : null, specs.psuWatts, specs.chipset, specs.screenInches].filter((value) => value !== null && value !== undefined).length;
}
