// El procesador de un aviso: marca, familia, modelo exacto y lo que se deduce del modelo (generación,
// socket, tipo de RAM, si es de notebook, año aproximado de la serie).
//
// Precisión sobre recall: «i7» sin número es una familia, no un procesador, y no se valúa como
// ninguno (`slug: null`). Los hechos deducidos son de la SERIE y públicos (Intel y AMD los publican
// por generación); el año es el de lanzamiento de la serie, no el del modelo exacto, y la página lo
// dice con «~».
//
// Todo corre sobre `norm()`.
import type { CpuIdentity, RamType } from "./types";

const INTEL_YEAR: Record<number, number> = {
  1: 2010, 2: 2011, 3: 2012, 4: 2013, 5: 2015, 6: 2015, 7: 2017, 8: 2017, 9: 2018,
  10: 2020, 11: 2021, 12: 2021, 13: 2022, 14: 2023,
};

/** Socket y RAM de un Core de escritorio por generación. La 12–14 acepta DDR4 y DDR5: sin dato, null. */
function intelDesktop(generation: number): { socket: string | null; ramType: RamType | null } {
  if (generation <= 1) return { socket: null, ramType: "ddr3" };
  if (generation <= 3) return { socket: "LGA1155", ramType: "ddr3" };
  if (generation <= 5) return { socket: "LGA1150", ramType: "ddr3" };
  if (generation <= 9) return { socket: "LGA1151", ramType: "ddr4" };
  if (generation <= 11) return { socket: "LGA1200", ramType: "ddr4" };
  return { socket: "LGA1700", ramType: null };
}

/** Sufijos de procesador de notebook (Intel y AMD). `g1`–`g7` son los Ice/Tiger Lake de notebook. */
const MOBILE_SUFFIX = /^(u|h|hq|hk|hx|hs|hz|p|y|m|qm|mq|g[1-7]|v)$/;

/** Los Core de primera generación con número de tres cifras («i5 750», «i3-530»). */
const FIRST_GEN = new Set([
  "i3-530", "i3-540", "i3-550", "i3-560", "i5-650", "i5-660", "i5-670", "i5-680", "i5-750", "i5-760",
  "i7-860", "i7-870", "i7-880", "i7-920", "i7-930", "i7-940", "i7-950", "i7-960", "i7-970", "i7-980", "i7-990",
]);

/** Un número de modelo seguido de una unidad no es un modelo («i7 512gb», «i5 3200mhz»). */
const UNIT_AFTER = /^\s?(gb|g\b|tb|mb|mhz|ghz|hz|w\b|ram|ssd|hdd)/;

function intelGeneration(digits: string, suffix: string): number | null {
  if (digits.length === 5) return Number(digits.slice(0, 2));
  if (digits.length === 4) {
    // 1235U, 1165G7, 1035G1, 1335U: notebook de 10ª a 13ª con cuatro cifras.
    if (digits.startsWith("1")) return MOBILE_SUFFIX.test(suffix) || /^g\d$/.test(suffix) ? Number(digits.slice(0, 2)) : null;
    return Number(digits[0]);
  }
  if (digits.length === 3) return 1;
  return null;
}

const titleCase = (suffix: string): string => suffix.toUpperCase();

function readIntelCore(text: string): CpuIdentity | null {
  // «i5-12400f», «i7 8700», «core i5 9400f», «7430i7» (la i pegada al número de la línea).
  // El sufijo va pegado («12400f»), salvo K/KF/F, que a veces se escriben aparte («13600 kf»).
  const match = /(?<![a-z])(?:core\s*)?i\s?([3579])\s*-?\s*(\d{3,5})(?:\s(kf|ks|k|f)(?![a-z0-9])|([a-z]{0,2}\d?)(?![a-z0-9]))/.exec(text);
  if (match) {
    const tier = match[1]!;
    const digits = match[2]!;
    const suffix = match[3] || match[4] || "";
    const rest = text.slice(match.index + match[0].length);
    const unitless = !(suffix === "" && UNIT_AFTER.test(rest)) && !/^(gb|tb|mb|hz|g)$/.test(suffix);
    const plausible = digits.length === 3 ? FIRST_GEN.has(`i${tier}-${digits}`) : digits.length >= 4;
    const generation = unitless && plausible ? intelGeneration(digits, suffix) : null;
    if (generation && generation >= 1 && generation <= 14) {
      const mobile = MOBILE_SUFFIX.test(suffix) || (digits.length === 4 && digits.startsWith("1"));
      const model = `${digits}${titleCase(suffix)}`;
      const desktop = mobile ? { socket: null, ramType: null } : intelDesktop(generation);
      return {
        brand: "intel",
        family: `core-i${tier}`,
        model,
        slug: `cpu:i${tier}-${digits}${suffix}`,
        label: `Intel Core i${tier}-${model}`,
        generation,
        socket: desktop.socket,
        ramType: desktop.ramType,
        mobile,
        year: INTEL_YEAR[generation] ?? null,
      };
    }
  }
  // «Core i3-N305»: la serie N de notebook con nombre de Core.
  const nseries = /(?<![a-z])(?:core\s*)?i\s?3\s*-?\s*n(300|305)(?![0-9])/.exec(text);
  if (nseries) {
    return { brand: "intel", family: "core-i3", model: `N${nseries[1]}`, slug: `cpu:i3-n${nseries[1]}`, label: `Intel Core i3-N${nseries[1]}`, generation: null, socket: null, ramType: null, mobile: true, year: 2023 };
  }
  // Familia sola, con o sin generación: «i5 10ma generacion», «i7 11th», «core i3 de 5th gen».
  const family = /(?<![a-z])(?:core\s*)?i\s?([3579])(?![0-9a-z])/.exec(text);
  if (!family) return null;
  const tier = family[1]!;
  const generation = genFromText(text);
  const desktop = generation ? intelDesktop(generation) : { socket: null, ramType: null };
  return {
    brand: "intel",
    family: `core-i${tier}`,
    model: null,
    slug: null,
    label: generation ? `Intel Core i${tier} de ${generation}ª generación` : `Intel Core i${tier}`,
    generation,
    socket: null,
    ramType: generation ? desktop.ramType : null,
    mobile: false,
    year: generation ? (INTEL_YEAR[generation] ?? null) : null,
  };
}

/** «10ma generacion», «12va gen», «8a generacion», «11th», «3ra gen», «12agen», «10th gen». */
export function genFromText(text: string): number | null {
  // «gen» sin \b al final: Facebook escribe «12agen16gb». «2da» suelto NO es una generación (es
  // «segunda mano»), por eso la segunda forma sólo acepta th/ma/va/na.
  const match = /(?<![0-9.,])(1[0-4]|[2-9])\s?(?:ra|da|ta|va|ma|na|a|th|st|nd|rd|era|o)?\s?(?:gen(?![a-z])|generacion|generation)/.exec(text)
    ?? /(?<![0-9.,])(1[0-4]|[2-9])(?:th|ma|va|na)\b/.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  return value >= 2 && value <= 14 ? value : null;
}

function readCoreUltra(text: string): CpuIdentity | null {
  const match = /(?<![a-z])(?:core\s*)?ultra\s*([579])\s*-?\s*(\d{3})([a-z]{0,2})(?![a-z0-9])/.exec(text);
  if (!match) {
    // «Legion Pro 5 – RTX 5070 – Ultra 7»: la familia sin el número.
    const family = /(?<![a-z])(?:intel\s*)?(?:core\s*)?ultra\s*([579])(?![0-9a-z])/.exec(text);
    if (!family || !/\b(intel|core|notebook|laptop|legion|rtx|pc)\b/.test(text)) return null;
    return { brand: "intel", family: `core-ultra-${family[1]}`, model: null, slug: null, label: `Intel Core Ultra ${family[1]}`, generation: null, socket: null, ramType: null, mobile: false, year: 2023 };
  }
  const [, tier, digits, suffix = ""] = match;
  const series = Number(digits![0]);
  const mobile = /^(h|u|v|hx)$/.test(suffix) || series === 1;
  return {
    brand: "intel",
    family: `core-ultra-${tier}`,
    model: `${digits}${suffix.toUpperCase()}`,
    slug: `cpu:ultra-${tier}-${digits}${suffix}`,
    label: `Intel Core Ultra ${tier} ${digits}${suffix.toUpperCase()}`,
    generation: series,
    socket: mobile ? null : "LGA1851",
    ramType: mobile ? null : "ddr5",
    mobile,
    year: series === 1 ? 2023 : 2024,
  };
}

function readIntelOther(text: string): CpuIdentity | null {
  const xeon = /\bxeon\s*(?:cpu\s*)?([ew][3-7]?-?\s?\d{4}[a-z]?(?:\s?v\d)?|\d{4})?/.exec(text);
  if (xeon) {
    const model = xeon[1]?.replace(/\s+/g, "").toUpperCase() ?? null;
    return { brand: "intel", family: "xeon", model, slug: model ? `cpu:xeon-${model.toLowerCase()}` : null, label: `Intel Xeon${model ? ` ${model}` : ""}`, generation: null, socket: null, ramType: null, mobile: false, year: null };
  }
  const celeron = /\bceleron\s*(?:dual core\s*)?([njg]?\d{3,4}[a-z]?)?/.exec(text);
  if (celeron) {
    const model = celeron[1]?.toUpperCase() ?? null;
    const mobile = !!model && /^N/.test(model);
    return { brand: "intel", family: "celeron", model, slug: model ? `cpu:celeron-${model.toLowerCase()}` : null, label: `Intel Celeron${model ? ` ${model}` : ""}`, generation: null, socket: null, ramType: null, mobile, year: null };
  }
  const pentium = /\bpentium\s*(?:gold\s*|silver\s*|dual core\s*)?([gn]?\d{4}[a-z]?)?/.exec(text);
  if (pentium) {
    const model = pentium[1]?.toUpperCase() ?? null;
    return { brand: "intel", family: "pentium", model, slug: model ? `cpu:pentium-${model.toLowerCase()}` : null, label: `Intel Pentium${model ? ` ${model}` : ""}`, generation: null, socket: null, ramType: null, mobile: false, year: null };
  }
  if (/\bcore\s*2\s*(?:duo|quad)\b|\bcore2\s*duo\b/.test(text)) {
    return { brand: "intel", family: "core-2", model: null, slug: null, label: "Intel Core 2", generation: null, socket: "LGA775", ramType: "ddr3", mobile: false, year: 2008 };
  }
  // «Ideapad 1 … Intel N4020», «Asus E410ma N4020»: los Celeron/Pentium Silver de notebook sin la familia.
  const silver = /(?<![a-z0-9])(n[456]\d{3}|j[345]\d{3})(?![a-z0-9])/.exec(text);
  if (silver && /\b(intel|notebook|laptop|ideapad|vivobook|chromebook|celeron|pentium)\b/.test(text)) {
    const model = silver[1]!.toUpperCase();
    const family = /^N[56]/.test(model) ? "pentium" : "celeron";
    return { brand: "intel", family, model, slug: `cpu:${family}-${model.toLowerCase()}`, label: `Intel ${family === "pentium" ? "Pentium Silver" : "Celeron"} ${model}`, generation: null, socket: null, ramType: null, mobile: true, year: null };
  }
  const nseries = /\bintel\s*(?:processor\s*)?n(95|97|100|150|200|300|305)\b/.exec(text);
  if (nseries) {
    return { brand: "intel", family: "intel-n", model: `N${nseries[1]}`, slug: `cpu:intel-n${nseries[1]}`, label: `Intel N${nseries[1]}`, generation: null, socket: null, ramType: null, mobile: true, year: 2023 };
  }
  return null;
}

const RYZEN_YEAR: Record<number, number> = { 1: 2017, 2: 2018, 3: 2019, 4: 2020, 5: 2020, 6: 2022, 7: 2022, 8: 2024, 9: 2024 };

function readRyzen(text: string): CpuIdentity | null {
  const ai = /\bra?[yi][sz]en\s*ai\s*([579])\s*(?:hx\s*|pro\s*)?(\d{3})\b/.exec(text);
  if (ai) {
    return { brand: "amd", family: `ryzen-${ai[1]}`, model: `AI ${ai[2]}`, slug: `cpu:ryzen-ai-${ai[1]}-${ai[2]}`, label: `AMD Ryzen AI ${ai[1]} ${ai[2]}`, generation: null, socket: null, ramType: null, mobile: true, year: 2024 };
  }
  const match = /\bra?[yi][sz]en\s*([3579])\s*(?:pro\s*)?-?\s*(\d{4})\s?(x3d|xt|x|gt|ge|g|f|hs|hx|h|u)?(?![a-z0-9])/.exec(text)
    ?? /(?<![a-z0-9])r([3579])\s?-?\s?(\d{4})(x3d|xt|x|gt|ge|g|f|hs|hx|h|u)?(?![a-z0-9])/.exec(text);
  if (match) {
    const [, tier, digits, suffix = ""] = match;
    const series = Number(digits![0]);
    const mobile = /^(u|h|hs|hx)$/.test(suffix) || series === 6;
    const desktop = !mobile && series >= 7 ? { socket: "AM5", ramType: "ddr5" as const } : !mobile ? { socket: "AM4", ramType: "ddr4" as const } : { socket: null, ramType: null };
    const model = `${digits}${suffix.toUpperCase()}`;
    return {
      brand: "amd",
      family: `ryzen-${tier}`,
      model,
      slug: `cpu:ryzen-${tier}-${digits}${suffix}`,
      label: `AMD Ryzen ${tier} ${model}`,
      generation: series,
      socket: desktop.socket,
      ramType: desktop.ramType,
      mobile,
      year: RYZEN_YEAR[series] ?? null,
    };
  }
  // «Amd 9800x3d», «amd 5600g»: el número de un Ryzen con su sufijo, sin la palabra. La gama sale
  // de la segunda cifra (5600 → 5, 5700 → 7, 3200 → 3, 7950 → 9), que es como AMD los numera.
  // También «Ryzen 5500» / «Ryzen 7800x3d», sin la gama entre la palabra y el número.
  const bare = /\bamd\s*(\d{4})(x3d|xt|x|gt|ge|g|f)(?![a-z0-9])/.exec(text) ?? /\bra?[yi][sz]en\s*(\d{4})(x3d|xt|x|gt|ge|g|f|)(?![a-z0-9])/.exec(text);
  if (bare) {
    const [, digits, suffix] = bare;
    const second = Number(digits![1]);
    const tier = second <= 3 ? 3 : second <= 6 ? 5 : second <= 8 ? 7 : 9;
    const series = Number(digits![0]);
    if (series >= 1 && series <= 9 && series !== 6) {
      const desktop = series >= 7 ? { socket: "AM5", ramType: "ddr5" as const } : { socket: "AM4", ramType: "ddr4" as const };
      const model = `${digits}${(suffix ?? "").toUpperCase()}`;
      return { brand: "amd", family: `ryzen-${tier}`, model, slug: `cpu:ryzen-${tier}-${digits}${suffix ?? ""}`, label: `AMD Ryzen ${tier} ${model}`, generation: series, ...desktop, mobile: false, year: RYZEN_YEAR[series] ?? null };
    }
  }
  const family = /\bra?[yi][sz]en\s*([3579])(?![0-9])/.exec(text);
  if (family) {
    return { brand: "amd", family: `ryzen-${family[1]}`, model: null, slug: null, label: `AMD Ryzen ${family[1]}`, generation: null, socket: null, ramType: null, mobile: false, year: null };
  }
  const threadripper = /\bthreadripper\s*(?:pro\s*)?(\d{4}[a-z]{0,2})/.exec(text);
  if (threadripper) {
    const model = threadripper[1]!.toUpperCase();
    return { brand: "amd", family: "threadripper", model, slug: `cpu:threadripper-${model.toLowerCase()}`, label: `AMD Threadripper ${model}`, generation: null, socket: null, ramType: null, mobile: false, year: null };
  }
  return null;
}

function readAmdOther(text: string): CpuIdentity | null {
  const fx = /\bfx\s*-?\s*(\d{4})\b/.exec(text);
  if (fx) {
    return { brand: "amd", family: "fx", model: fx[1]!, slug: `cpu:fx-${fx[1]}`, label: `AMD FX-${fx[1]}`, generation: null, socket: "AM3+", ramType: "ddr3", mobile: false, year: 2012 };
  }
  const athlon = /\bathlon\s*(?:silver\s*|gold\s*|ii\s*x[24]\s*)?(\d{3,4}[a-z]{0,2})?\b/.exec(text);
  if (athlon) {
    const model = athlon[1]?.toUpperCase() ?? null;
    const am4 = !!model && /^(200|220|240|300|3000|320)/.test(model);
    return { brand: "amd", family: "athlon", model, slug: model ? `cpu:athlon-${model.toLowerCase()}` : null, label: `AMD Athlon${model ? ` ${model}` : ""}`, generation: null, socket: am4 ? "AM4" : null, ramType: am4 ? "ddr4" : null, mobile: false, year: am4 ? 2018 : null };
  }
  // A-series sólo con AMD/APU en el texto: «a8» suelto es demasiadas cosas.
  if (/\bamd\b|\bapu\b|\bradeon\b/.test(text)) {
    const apu = /\ba(4|6|8|9|10|12)\s*-?\s*(\d{4})([a-z]{0,2})\b/.exec(text);
    if (apu) {
      const [, tier, digits, suffix = ""] = apu;
      const mobile = /^(p|m)$/.test(suffix) || /^9[12]/.test(digits!);
      const am4 = !mobile && digits!.startsWith("9");
      const model = `A${tier}-${digits}${suffix.toUpperCase()}`;
      return { brand: "amd", family: "a-series", model, slug: `cpu:${model.toLowerCase()}`, label: `AMD ${model}`, generation: null, socket: am4 ? "AM4" : mobile ? null : "FM2+", ramType: am4 ? "ddr4" : mobile ? null : "ddr3", mobile, year: am4 ? 2016 : 2014 };
    }
  }
  if (/\b(sempron|phenom)\b/.test(text)) {
    const family = /\bsempron\b/.test(text) ? "sempron" : "phenom";
    return { brand: "amd", family, model: null, slug: null, label: `AMD ${family === "sempron" ? "Sempron" : "Phenom"}`, generation: null, socket: null, ramType: "ddr3", mobile: false, year: null };
  }
  return null;
}

const APPLE_CONTEXT = /\b(macbook|imac|mac\s*mini|mac\s*studio|mac\s*pro|apple|chip|macos)\b/;
const APPLE_YEAR: Record<number, number> = { 1: 2020, 2: 2022, 3: 2023, 4: 2024, 5: 2025 };

function readApple(text: string): CpuIdentity | null {
  if (!APPLE_CONTEXT.test(text)) return null;
  // «m2» también es un disco («1tb m2», «ssd m.2»): no si lo acompaña una palabra de disco.
  for (const match of text.matchAll(/(?<![a-z0-9.])m([1-5])(?:\s*(pro|max|ultra))?(?![a-z0-9.])/g)) {
    const before = text.slice(Math.max(0, match.index! - 8), match.index!);
    const after = text.slice(match.index! + match[0].length, match.index! + match[0].length + 8);
    if (/(ssd|nvme|disco|tb|gb|sata)\s*$/.test(before) || /^\s*(ssd|nvme|sata|2280|pcie|\.)/.test(after)) continue;
    const generation = Number(match[1]);
    const variant = match[2] ? ` ${match[2][0]!.toUpperCase()}${match[2].slice(1)}` : "";
    return {
      brand: "apple",
      family: "apple-m",
      model: `M${generation}${variant}`,
      slug: `cpu:apple-m${generation}${match[2] ? `-${match[2]}` : ""}`,
      label: `Apple M${generation}${variant}`,
      generation,
      socket: null,
      ramType: null,
      mobile: false,
      year: APPLE_YEAR[generation] ?? null,
    };
  }
  return null;
}

/**
 * El número de modelo de Apple («A2337») cuando el título no nombra el chip. Sólo los que tienen UN
 * chip: A2338 es la MacBook Pro 13" con M1 (2020) y con M2 (2022), así que no está.
 */
const APPLE_MODEL_CHIP: Record<string, string> = {
  a2337: "m1", // MacBook Air 13" 2020
  a2348: "m1", // Mac mini 2020
  a2438: "m1", // iMac 24" 2021
  a2439: "m1", // iMac 24" 2021
  a2681: "m2", // MacBook Air 13" 2022
  a2941: "m2", // MacBook Air 15" 2023
  a2686: "m2", // Mac mini 2023
  a3113: "m3", // MacBook Air 13" 2024
  a3114: "m3", // MacBook Air 15" 2024
  a2918: "m3", // MacBook Pro 14" 2023
  a2873: "m3", // iMac 24" 2023
  a2874: "m3", // iMac 24" 2023
};

function readAppleModelNumber(text: string): CpuIdentity | null {
  if (!APPLE_CONTEXT.test(text)) return null;
  const code = /\b(a\d{4})\b/.exec(text)?.[1];
  if (code === "a2338") {
    // La familia sin el modelo: no se valúa como ninguno de los dos, pero se sabe que es Apple Silicon.
    return { brand: "apple", family: "apple-m", model: null, slug: null, label: "Apple M1 o M2", generation: null, socket: null, ramType: null, mobile: false, year: 2020 };
  }
  const chip = code ? APPLE_MODEL_CHIP[code] : undefined;
  return chip ? readApple(`apple ${chip}`) : null;
}

/** El procesador que nombra el texto (ya normalizado), o null. Apple primero: «macbook pro i7» es Intel. */
export function readCpu(text: string): CpuIdentity | null {
  return readCoreUltra(text) ?? readIntelCore(text) ?? readRyzen(text) ?? readApple(text) ?? readAppleModelNumber(text) ?? readAmdOther(text) ?? readIntelOther(text);
}

/** El procesador con modelo exacto de un texto, si lo hay: lo que se busca en un título de pieza. */
export function exactCpu(text: string): CpuIdentity | null {
  const cpu = readCpu(text);
  return cpu?.slug ? cpu : null;
}
