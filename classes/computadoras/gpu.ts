// La placa de video de un aviso: NVIDIA (GTX/RTX/GT/MX/Quadro), AMD (RX, Radeon HD/R7/R9), Intel
// Arc, o integrada (Vega, Iris, UHD, la de un Apple M). Todo sobre `norm()`.
//
// Un modelo que se vende con dos memorias (RTX 3060 de 8 y 12 GB, RX 580 de 4 y 8) lleva la VRAM en
// la identidad cuando el texto la dice (`gpu:rtx-3060-12gb`) y además una identidad base sin VRAM
// (`gpu:rtx-3060`) que junta a las dos: la que se usa cuando el aviso no dice cuál es.
import type { GpuIdentity } from "./types";

/** Modelos con dos (o más) memorias en el mercado. */
const DUAL_VRAM = new Set([
  "gtx-1050", "gtx-1060", "rtx-3050", "rtx-3060", "rtx-4060-ti", "rtx-5060-ti", "rx-470", "rx-480", "rx-570", "rx-580", "rx-560", "rx-550",
  "gt-730", "gt-1030", "gtx-960", "gtx-750-ti", "rx-7600-xt",
]);

function nvidiaYear(series: string, number: number): number | null {
  if (series === "rtx") return number >= 5000 ? 2025 : number >= 4000 ? 2022 : number >= 3000 ? 2020 : 2018;
  if (series === "gtx") return number >= 1600 ? 2019 : number >= 1000 ? 2016 : number >= 900 ? 2014 : number >= 700 ? 2013 : null;
  return null;
}

function amdYear(number: number): number | null {
  if (number >= 9000) return 2025;
  if (number >= 7000) return 2022;
  if (number >= 6000) return 2020;
  if (number >= 5000) return 2019;
  if (number >= 500) return 2017;
  if (number >= 400) return 2016;
  return null;
}

/**
 * La VRAM escrita cerca del modelo («rtx 3060 12gb», «rx 580 8gb»). Un número seguido de «ram» o
 * «ddr4» es la memoria del sistema («Rtx 4050 16gb Ram»), y más de 16 GB sólo existe en la gama x90
 * y la RX 7900 («Legion Pro 5 – RTX 5070 – 32GB» son 32 GB de RAM).
 */
function vramNear(text: string, start: number, end: number): number | null {
  const after = text.slice(end, end + 24);
  const match = /^\s*(?:ti\b|super\b|xt\b|oc\b|de\b|\s)*\s*(\d{1,2})\s*(?:gb|g\b)(?!\s*(?:de\s*)?(?:ram|ddr|memoria(?!\s*de\s*video)))/.exec(after)
    ?? /^[^,/+]{0,14}?\b(\d{1,2})\s*gb\s*(?:gddr\d|vram|de\s*video)/.exec(after);
  const value = match ? Number(match[1]) : NaN;
  return [1, 2, 3, 4, 6, 8, 10, 11, 12, 16, 20, 24, 32].includes(value) ? value : null;
}

const validRtx = (n: number): boolean => [2050, 2060, 2070, 2080, 3050, 3060, 3070, 3080, 3090, 4050, 4060, 4070, 4080, 4090, 5050, 5060, 5070, 5080, 5090].includes(n);
const validGtx = (n: number): boolean => (n >= 450 && n <= 1080 && n % 10 === 0) || [1630, 1650, 1660].includes(n);
const validGt = (n: number): boolean => [210, 610, 620, 630, 640, 710, 720, 730, 740, 1030].includes(n);
const validRx = (n: number): boolean =>
  [460, 470, 480, 550, 560, 570, 580, 590, 5500, 5600, 5700, 6400, 6500, 6600, 6650, 6700, 6750, 6800, 6900, 6950, 7600, 7700, 7800, 7900, 9060, 9070].includes(n);

function build(
  brand: GpuIdentity["brand"],
  base: string,
  model: string,
  vramGb: number | null,
  year: number | null,
  mobile: boolean
): GpuIdentity {
  if (vramGb && vramGb > 16 && !/90|7900|titan|quadro/i.test(model)) vramGb = null;
  const dual = DUAL_VRAM.has(base);
  const slug = dual && vramGb ? `gpu:${base}-${vramGb}gb` : `gpu:${base}`;
  return {
    brand,
    model,
    slug: mobile ? null : slug,
    baseSlug: mobile ? null : `gpu:${base}`,
    label: `${brand === "nvidia" ? "NVIDIA " : brand === "amd" ? "AMD " : "Intel "}${model}${vramGb ? ` ${vramGb} GB` : ""}${mobile ? " (de notebook)" : ""}`,
    vramGb,
    integrated: false,
    mobile,
    year,
  };
}

function readNvidia(text: string): GpuIdentity | null {
  const direct = /(?<![a-z])(rtx|gtx|gt)\s*-?\s*(\d{3,4})\s*(ti|super|s)?(m)?(?![a-z0-9])/.exec(text);
  // «2070rtx», «3060 rtx»: el número antes de la serie.
  const reversed = direct ? null : /(?<![0-9])(\d{4})\s*(ti|super)?\s*(rtx|gtx)(?![a-z])/.exec(text);
  // «Nvidia 4070ti 12gb», «geforce 1660 super», y el número pelado con su VRAM («1060 6gb»).
  const named = direct || reversed ? null : /\b(?:nvidia|geforce)\s*(?:geforce\s*)?(\d{4})\s*(ti|super)?(?![a-z0-9])/.exec(text)
    ?? /(?<![0-9a-z.,])(1050|1060|1070|1080|1650|1660|2060|2070|2080|3050|3060|3070|3080|3090|4060|4070|4080|4090|5060|5070|5080|5090)\s*(ti|super)?\s*(?=\d{1,2}\s*gb\b)/.exec(text);
  if (named) {
    const number = Number(named[1]);
    const series = number >= 2000 ? "rtx" : "gtx";
    if (series === "rtx" ? validRtx(number) : validGtx(number)) {
      const variant = named[2] ?? "";
      const base = `${series}-${number}${variant ? `-${variant}` : ""}`;
      const model = `${series.toUpperCase()} ${number}${variant ? ` ${variant === "ti" ? "Ti" : "Super"}` : ""}`;
      return build("nvidia", base, model, vramNear(text, named.index, named.index + named[0].length), nvidiaYear(series, number), false);
    }
  }
  let series: string, number: number, variant: string, mobileSuffix: boolean, start: number, end: number;
  if (direct) {
    [series, number, variant, mobileSuffix] = [direct[1]!, Number(direct[2]), direct[3] ?? "", !!direct[4]];
    [start, end] = [direct.index, direct.index + direct[0].length];
  } else if (reversed) {
    [series, number, variant, mobileSuffix] = [reversed[3]!, Number(reversed[1]), reversed[2] ?? "", false];
    [start, end] = [reversed.index, reversed.index + reversed[0].length];
  } else {
    const mx = /(?<![a-z])mx\s*-?\s*(\d{3})(?![0-9])/.exec(text);
    if (mx && /\b(nvidia|geforce|notebook|laptop)\b/.test(text)) {
      return { brand: "nvidia", model: `MX${mx[1]}`, slug: null, baseSlug: null, label: `NVIDIA MX${mx[1]} (de notebook)`, vramGb: null, integrated: false, mobile: true, year: null };
    }
    const quadro = /\bquadro\s*([kpmt]?\d{3,4})\b/.exec(text);
    if (quadro) {
      const model = `Quadro ${quadro[1]!.toUpperCase()}`;
      return build("nvidia", `quadro-${quadro[1]}`, model, vramNear(text, quadro.index, quadro.index + quadro[0].length), null, false);
    }
    const geforce = /\bgeforce\s*(\d{3})\b/.exec(text);
    if (geforce && validGt(Number(geforce[1]))) return build("nvidia", `gt-${geforce[1]}`, `GT ${geforce[1]}`, null, null, false);
    return null;
  }
  const valid = series === "rtx" ? validRtx(number) : series === "gtx" ? validGtx(number) : validGt(number);
  if (!valid) return null;
  const variantSlug = variant === "s" ? "super" : variant;
  const base = `${series}-${number}${variantSlug ? `-${variantSlug}` : ""}`;
  const model = `${series.toUpperCase()} ${number}${variantSlug ? ` ${variantSlug === "ti" ? "Ti" : "Super"}` : ""}${mobileSuffix ? "M" : ""}`;
  return build("nvidia", base, model, vramNear(text, start, end), nvidiaYear(series, number), mobileSuffix);
}

function readAmd(text: string): GpuIdentity | null {
  const rx = /(?<![a-z])rx\s*-?\s*(\d{3,4})\s*(xtx|xt|gre)?(?![a-z0-9])/.exec(text);
  if (rx) {
    const number = Number(rx[1]);
    if (!validRx(number)) return null;
    const variant = rx[2] ?? "";
    const base = `rx-${number}${variant ? `-${variant}` : ""}`;
    const model = `RX ${number}${variant ? ` ${variant.toUpperCase()}` : ""}`;
    return build("amd", base, model, vramNear(text, rx.index, rx.index + rx[0].length), amdYear(number), false);
  }
  // «Amd 9070», «radeon 6600 xt»: sin «rx», con la marca delante y un número que sólo es de RX
  // (5600/7600/7700… también son Ryzen: «Amd 5600» es casi siempre el procesador).
  const bare = /\b(?:amd|radeon)\s*(?:radeon\s*)?(6400|6500|6650|6700|6750|6800|6900|6950|9060|9070)\s*(xtx|xt|gre)?(?![a-z0-9])/.exec(text);
  if (bare) {
    const number = Number(bare[1]);
    const variant = bare[2] ?? "";
    return build("amd", `rx-${number}${variant ? `-${variant}` : ""}`, `RX ${number}${variant ? ` ${variant.toUpperCase()}` : ""}`, vramNear(text, bare.index, bare.index + bare[0].length), amdYear(number), false);
  }
  const vega = /\brx\s*vega\s*(56|64)\b/.exec(text);
  if (vega) return build("amd", `rx-vega-${vega[1]}`, `RX Vega ${vega[1]}`, null, 2017, false);
  const radeon = /\bradeon\s*(?:hd\s*)?(r[79]\s*\d{3}x?|\d{4})\b/.exec(text);
  if (radeon && !/\bradeon\s*r7\s*(?:graphics|\d\s|$)/.test(text)) {
    const raw = radeon[1]!.replace(/\s+/g, " ").toUpperCase();
    return build("amd", `radeon-${raw.toLowerCase().replace(/\s+/g, "-")}`, `Radeon ${raw}`, vramNear(text, radeon.index, radeon.index + radeon[0].length), null, false);
  }
  const firepro = /\bfirepro\s*([wv]\d{4})\b/.exec(text);
  if (firepro) return build("amd", `firepro-${firepro[1]}`, `FirePro ${firepro[1]!.toUpperCase()}`, null, null, false);
  return null;
}

function readIntelArc(text: string): GpuIdentity | null {
  const arc = /\b(?:arc\s*|intel\s*)([ab])([3-7][0-9]0)\b/.exec(text);
  if (!arc) return null;
  const model = `Arc ${arc[1]!.toUpperCase()}${arc[2]}`;
  return build("intel", `arc-${arc[1]}${arc[2]}`, model, vramNear(text, arc.index, arc.index + arc[0].length), arc[1] === "b" ? 2024 : 2022, false);
}

const INTEGRATED = /\b(vega\s*(?:3|6|7|8|10|11)|radeon\s*(?:graphics|vega|\d{3}m)|iris\s*(?:xe|plus|pro)?|uhd\s*(?:graphics|\d{3})?|intel\s*hd|hd\s*graphics(?:\s*\d{3,4})?|graficos?\s*integrad[oa]s?|video\s*integrad[oa])\b/;

/** Una integrada nombrada en el texto. */
function readIntegrated(text: string): GpuIdentity | null {
  const match = INTEGRATED.exec(text);
  if (!match) return null;
  const raw = match[1]!;
  const brand = /vega|radeon/.test(raw) ? "amd" : "intel";
  const label = /vega/.test(raw) ? `Radeon ${raw.replace(/\s+/g, " ").replace("vega", "Vega")}` : /iris/.test(raw) ? "Intel Iris" : /uhd|hd/.test(raw) ? "Intel HD/UHD" : "Gráficos integrados";
  return { brand, model: null, slug: null, baseSlug: null, label: `${label} (integrada)`, vramGb: null, integrated: true, mobile: false, year: null };
}

/**
 * La placa de video que nombra el texto (normalizado). `notebook` marca la dedicada como de
 * notebook: una «RTX 4050» en una laptop no se vende suelta y no se valúa como la de escritorio.
 */
export function readGpu(text: string, notebook = false): GpuIdentity | null {
  const dedicated = readNvidia(text) ?? readAmd(text) ?? readIntelArc(text);
  if (dedicated) {
    if (!notebook || dedicated.mobile) return dedicated;
    return { ...dedicated, slug: null, baseSlug: null, mobile: true, label: dedicated.label.includes("(de notebook)") ? dedicated.label : `${dedicated.label} (de notebook)` };
  }
  return readIntegrated(text);
}

/** La integrada de un procesador que la tiene (Ryzen G, Intel sin F, Apple M). */
export function integratedFor(cpu: { brand: string; model: string | null; family: string } | null): GpuIdentity | null {
  if (!cpu?.model) return null;
  const model = cpu.model.toUpperCase();
  if (cpu.brand === "apple") return { brand: "apple", model: null, slug: null, baseSlug: null, label: `GPU del ${cpu.model} (integrada)`, vramGb: null, integrated: true, mobile: false, year: null };
  if (cpu.brand === "amd" && /^\d{4}(G|GE|GT)$/.test(model)) return { brand: "amd", model: null, slug: null, baseSlug: null, label: "Radeon Graphics (integrada)", vramGb: null, integrated: true, mobile: false, year: null };
  if (cpu.brand === "intel" && /^core-/.test(cpu.family) && !/F$/.test(model)) return { brand: "intel", model: null, slug: null, baseSlug: null, label: "Intel HD/UHD (integrada)", vramGb: null, integrated: true, mobile: false, year: null };
  return null;
}
