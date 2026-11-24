// Las piezas: qué piezas tiene una computadora (`partsOf`), qué pieza ES un aviso de pieza suelta
// (`partObservationsFrom`) y la tabla de precios por identidad (`buildPartTable`).
//
// Identidades: `cpu:i5-12400f`, `gpu:rtx-3060-12gb` (y la base `gpu:rtx-3060`), `ram:ddr4:16`,
// `ram:ddr4-sodimm:8`, `storage:nvme:1000`, `motherboard:b450`, `motherboard:socket-am4`,
// `psu:650`, `case:basico`. Una pieza sin identidad exacta no tiene slug y queda sin precio.
import { socketOfChipset } from "./specs";
import { median, norm, quantile, round } from "./text";
import type { ComputerKind, ComputerSpecs, Drive, PartObservation, PartRole, PartRow, PriceStat, RamType } from "./types";

export interface PartNeed {
  role: PartRole;
  label: string;
  slug: string | null;
  /** Identidad de respaldo: la base sin VRAM de una placa que se vende con dos memorias. */
  altSlug?: string | null;
  /** El aviso no la declara: se supone (mother por socket, fuente por placa, gabinete). */
  estimated: boolean;
  /** Supuesta: se toma el cuartil bajo de las nuevas, no la mediana. */
  pricing: "median" | "p25";
  /** RAM de un tamaño sin tramo propio (12, 24 GB): precio del tramo más cercano × GB. */
  scale: number;
}

const RAM_TIERS = [4, 8, 16, 32, 64];
const SSD_TIERS = [128, 256, 512, 1000, 2000, 4000];
const HDD_TIERS = [500, 1000, 2000, 4000];
const PSU_TIERS = [450, 500, 550, 600, 650, 700, 750, 850, 1000, 1200];

const nearest = (value: number, tiers: number[]): number =>
  tiers.reduce((best, tier) => (Math.abs(Math.log(tier / value)) < Math.abs(Math.log(best / value)) ? tier : best), tiers[0]!);

const TIER_LABEL: Record<number, string> = { 128: "120–128 GB", 256: "240–256 GB", 512: "480–512 GB", 1000: "1 TB", 2000: "2 TB", 4000: "4 TB", 500: "500 GB" };
const DRIVE_LABEL: Record<string, string> = { nvme: "SSD NVMe", ssd: "SSD", hdd: "Disco HDD" };

export function ramSlug(type: RamType, gb: number, sodimm = false): { slug: string; scale: number; label: string } {
  const tier = nearest(gb, RAM_TIERS);
  const form = sodimm ? "-sodimm" : "";
  return {
    slug: `ram:${type}${form}:${tier}`,
    scale: gb / tier,
    label: `${gb} GB ${type.toUpperCase()}${sodimm ? " SO-DIMM (notebook)" : ""}${gb === tier ? "" : " (por GB)"}`,
  };
}

export function driveSlug(drive: Drive): { slug: string; label: string } | null {
  if (drive.type === "unknown" || drive.type === "emmc") return null;
  const tier = nearest(drive.gb, drive.type === "hdd" ? HDD_TIERS : SSD_TIERS);
  return { slug: `storage:${drive.type}:${tier}`, label: `${DRIVE_LABEL[drive.type]} ${TIER_LABEL[tier] ?? `${tier} GB`}` };
}

export function psuSlug(watts: number): { slug: string; label: string } {
  const tier = nearest(watts, PSU_TIERS);
  return { slug: `psu:${tier}`, label: `Fuente ${tier} W` };
}

/** La fuente que pide la placa de video, cuando el aviso no la declara. */
export function psuFor(gpu: ComputerSpecs["gpu"]): number {
  if (!gpu || gpu.integrated || !gpu.model) return 500;
  const model = gpu.model.toLowerCase();
  const number = Number(/(\d{3,4})/.exec(model)?.[1] ?? 0);
  if (gpu.brand === "nvidia") {
    const tier = number % 100;
    if (/^gt\s/.test(model) || /^gtx/.test(model)) return number >= 1070 ? 650 : 550;
    if (tier >= 80) return 850;
    if (tier >= 70) return 750;
    if (tier >= 60) return 650;
    return 550;
  }
  if (gpu.brand === "amd") {
    if (number < 1000) return 550;
    const tier = Math.floor((number % 1000) / 100);
    if (tier >= 9) return 850;
    if (tier >= 8) return 750;
    if (tier >= 7 || number >= 9060) return 650;
    return 550;
  }
  return 550;
}

/** Procesador sin gráficos propios: Intel F/KF, Ryzen F, y los Ryzen sin G de las series 1000–5000. */
export const cpuLacksGraphics = (cpu: ComputerSpecs["cpu"]): boolean => {
  if (!cpu?.model) return false;
  const model = cpu.model.toUpperCase();
  if (cpu.brand === "intel") return /F$|KF$/.test(model);
  if (cpu.brand === "amd" && /^ryzen-/.test(cpu.family)) return /F$/.test(model) || /^[1-5]\d{3}(X|X3D|XT)?$/.test(model);
  return false;
};

const MACHINE_PART_KINDS = new Set<ComputerKind>(["desktop", "combo"]);

/** Las piezas de una PC de escritorio (o de un combo), con lo que el aviso NO dice marcado como supuesto. */
export function partsOf(specs: ComputerSpecs): PartNeed[] {
  if (!specs.kind || !MACHINE_PART_KINDS.has(specs.kind)) return [];
  const combo = specs.kind === "combo";
  const needs: PartNeed[] = [];
  const add = (need: Omit<PartNeed, "pricing" | "scale"> & Partial<Pick<PartNeed, "pricing" | "scale">>): void => {
    needs.push({ pricing: "median", scale: 1, ...need });
  };

  if (specs.cpu) add({ role: "cpu", label: specs.cpu.label, slug: specs.cpu.slug, estimated: false });
  else if (!combo) add({ role: "cpu", label: "Procesador (no declarado)", slug: null, estimated: false });

  const dedicated = specs.gpu && !specs.gpu.integrated ? specs.gpu : null;
  if (dedicated) add({ role: "gpu", label: dedicated.label, slug: dedicated.slug, altSlug: dedicated.baseSlug, estimated: false });
  else if (!combo && cpuLacksGraphics(specs.cpu)) add({ role: "gpu", label: "Placa de video (no declarada)", slug: null, estimated: false });

  if (specs.ramGb) {
    const type = specs.ramType;
    if (type) {
      const ram = ramSlug(type, specs.ramGb);
      // La RAM la declara el aviso; sólo el TIPO sale del procesador. No es una pieza supuesta: su
      // precio usado es el usado, nunca el nuevo más barato.
      add({ role: "ram", label: `${ram.label}${specs.ramTypeInferred ? " (tipo deducido del procesador)" : ""}`, slug: ram.slug, estimated: false, scale: ram.scale });
    } else add({ role: "ram", label: `${specs.ramGb} GB (tipo no declarado)`, slug: null, estimated: false });
  } else if (!combo) add({ role: "ram", label: "Memoria RAM (no declarada)", slug: null, estimated: false });

  for (const drive of specs.storage) {
    const identity = driveSlug(drive);
    if (identity) add({ role: "storage", label: identity.label, slug: identity.slug, estimated: false });
    else if (drive.type !== "emmc") add({ role: "storage", label: `Disco de ${drive.gb >= 1000 ? `${drive.gb / 1000} TB` : `${drive.gb} GB`} (tipo no declarado)`, slug: null, estimated: false });
  }
  if (!specs.storage.length && !combo && !specs.faults.includes("sin-disco")) add({ role: "storage", label: "Disco (no declarado)", slug: null, estimated: false });

  if (specs.chipset) {
    const socket = socketOfChipset(specs.chipset);
    add({ role: "motherboard", label: `Mother ${specs.chipset.toUpperCase()}${socket ? ` (${socket})` : ""}`, slug: `motherboard:${specs.chipset}`, altSlug: socket ? `motherboard:socket-${socket.toLowerCase()}` : null, estimated: false });
  } else if (!combo) {
    const socket = specs.cpu?.socket ?? null;
    add(socket
      ? { role: "motherboard", label: `Mother para ${socket} (supuesta: el aviso no la dice)`, slug: `motherboard:socket-${socket.toLowerCase()}`, estimated: true, pricing: "p25" }
      : { role: "motherboard", label: "Mother (no se deduce del procesador)", slug: null, estimated: true });
  }

  if (specs.psuWatts) {
    const psu = psuSlug(specs.psuWatts);
    add({ role: "psu", label: psu.label, slug: psu.slug, estimated: false });
  } else if (!combo) {
    const psu = psuSlug(psuFor(specs.gpu));
    add({ role: "psu", label: `${psu.label} (supuesta por la placa de video)`, slug: psu.slug, estimated: true, pricing: "p25" });
  }

  if (!combo) add({ role: "case", label: "Gabinete (supuesto: el más barato del cuartil)", slug: "case:basico", estimated: true, pricing: "p25" });
  return needs;
}

/** La pieza que es un aviso de pieza suelta: su identidad y su etiqueta. */
export function partIdentityOf(specs: ComputerSpecs, title: string): Array<Omit<PartObservation, "condition" | "priceUsd" | "sellerId" | "title" | "url" | "image">> {
  const kind = specs.kind;
  const out: Array<Omit<PartObservation, "condition" | "priceUsd" | "sellerId" | "title" | "url" | "image">> = [];
  if (kind === "cpu" && specs.cpu?.slug && !specs.cpu.mobile) {
    out.push({ slug: specs.cpu.slug, role: "cpu", label: specs.cpu.label, facts: { year: specs.cpu.year, socket: specs.cpu.socket, ramType: specs.cpu.ramType } });
  }
  if (kind === "gpu" && specs.gpu?.slug && !specs.gpu.integrated) {
    const facts = { year: specs.gpu.year, vramGb: specs.gpu.vramGb, brand: specs.gpu.brand };
    out.push({ slug: specs.gpu.slug, role: "gpu", label: specs.gpu.label, facts });
    if (specs.gpu.baseSlug && specs.gpu.baseSlug !== specs.gpu.slug) {
      out.push({ slug: specs.gpu.baseSlug, role: "gpu", label: `${specs.gpu.label.replace(/\s\d+ GB$/, "")} (cualquier memoria)`, facts: { ...facts, vramGb: null } });
    }
  }
  if (kind === "ram" && specs.ramGb && specs.ramType) {
    const t = norm(title);
    const sodimm = /\b(sodimm|so-dimm|so dimm|notebook|laptop|portatil)\b/.test(t);
    const ram = ramSlug(specs.ramType, specs.ramGb, sodimm);
    // Sólo tramos exactos: un kit de 12 GB no es la observación del tramo de 16.
    if (ram.scale === 1) out.push({ slug: ram.slug, role: "ram", label: ram.label, facts: { ramType: specs.ramType, gb: specs.ramGb } });
  }
  if (kind === "storage" && specs.storage.length === 1) {
    const identity = driveSlug(specs.storage[0]!);
    const t = norm(title);
    if (identity && !/\bexterno\b|\bportatil\b|\busb\b/.test(t)) out.push({ slug: identity.slug, role: "storage", label: identity.label, facts: { driveType: specs.storage[0]!.type, gb: specs.storage[0]!.gb } });
  }
  if (kind === "motherboard" && specs.chipset) {
    const socket = socketOfChipset(specs.chipset);
    out.push({ slug: `motherboard:${specs.chipset}`, role: "motherboard", label: `Mother ${specs.chipset.toUpperCase()}${socket ? ` (${socket})` : ""}`, facts: { chipset: specs.chipset, socket } });
    if (socket) out.push({ slug: `motherboard:socket-${socket.toLowerCase()}`, role: "motherboard", label: `Mother para ${socket}`, facts: { socket } });
  }
  if (kind === "psu" && specs.psuWatts) {
    const psu = psuSlug(specs.psuWatts);
    out.push({ slug: psu.slug, role: "psu", label: psu.label, facts: { watts: Number(psu.slug.split(":")[1]) } });
  }
  return out;
}

/** Un gabinete solo, sin fuente ni kit: la fila `case:basico`. */
export function isBareCase(title: string): boolean {
  const t = norm(title);
  return /\bgabinete\b/.test(t) && !/\b(fuente|kit|combo|\+|monitor|pc|computadora|cpu)\b/.test(t) && !/\d{3,4}\s*w\b/.test(t);
}

// ---------------------------------------------------------------------------------------------
// La tabla

/** Fuera de [mediana/3, mediana×3] contra su propia identidad no es esa pieza (un repuesto, un lote). */
function band(values: PartObservation[]): PartObservation[] {
  if (values.length < 3) return values;
  const mid = median(values.map((value) => value.priceUsd));
  return values.filter((value) => value.priceUsd >= mid / 3 && value.priceUsd <= mid * 3);
}

function stat(values: PartObservation[]): PriceStat | null {
  if (!values.length) return null;
  const prices = values.map((value) => value.priceUsd);
  return { medianUsd: round(median(prices)), p25Usd: round(quantile(prices, 0.25)), minUsd: round(Math.min(...prices)), n: values.length };
}

/** Mínimos para publicar una mediana: 3 ofertas nuevas de 2 vendedores; 3 avisos usados. */
export const PART_MIN = { newOffers: 3, newSellers: 2, usedOffers: 3 } as const;

export interface PartTableInput {
  /** Las piezas nuevas vistas HOY. */
  newObservations: PartObservation[];
  /** Las usadas de la ventana (las sueltas del directorio de los últimos 30 días). */
  usedObservations: PartObservation[];
  previous: PartRow[];
  /** La lectura de piezas nuevas anduvo: si no, se conserva lo nuevo de la tabla anterior. */
  newOk: boolean;
  day: string;
  /** Cuántos avisos del directorio usan cada identidad. */
  usage?: Map<string, number>;
}

export function buildPartTable(input: PartTableInput): PartRow[] {
  const previous = new Map(input.previous.map((row) => [row.slug, row]));
  const groups = new Map<string, { identity: PartObservation; fresh: PartObservation[]; used: PartObservation[] }>();
  const groupOf = (observation: PartObservation) => {
    let group = groups.get(observation.slug);
    if (!group) groups.set(observation.slug, (group = { identity: observation, fresh: [], used: [] }));
    return group;
  };
  for (const observation of input.newObservations) groupOf(observation).fresh.push(observation);
  for (const observation of input.usedObservations) groupOf(observation).used.push(observation);
  for (const slug of previous.keys()) if (!groups.has(slug) && input.usage?.get(slug)) groups.set(slug, { identity: { ...(previous.get(slug) as unknown as PartObservation) }, fresh: [], used: [] });

  const rows: PartRow[] = [];
  for (const [slug, group] of groups) {
    const before = previous.get(slug) ?? null;
    let fresh: PartRow["new"] = null;
    if (input.newOk) {
      // Una oferta por vendedor y producto: la misma placa publicada tres veces por la misma tienda
      // no son tres precios.
      const seen = new Set<string>();
      const deduped = group.fresh.filter((value) => {
        const id = `${value.sellerId}|${norm(value.title)}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      const kept = band(deduped);
      const sellers = new Set(kept.map((value) => value.sellerId)).size;
      const summary = stat(kept);
      if (summary && summary.n >= PART_MIN.newOffers && sellers >= PART_MIN.newSellers) {
        const cheapest = [...kept].sort((a, b) => a.priceUsd - b.priceUsd)[0]!;
        fresh = { ...summary, sellers, cheapest: { title: cheapest.title.slice(0, 140), url: cheapest.url, priceUsd: round(cheapest.priceUsd), image: cheapest.image } };
      }
    } else fresh = before?.new ?? null;
    const usedKept = band(group.used);
    const usedSummary = stat(usedKept);
    const used = usedSummary && usedSummary.n >= PART_MIN.usedOffers ? usedSummary : null;
    if (!fresh && !used && !input.usage?.get(slug)) continue;
    const history = (before?.history ?? []).filter((entry) => entry.day !== input.day);
    history.push({ day: input.day, newUsd: fresh?.medianUsd ?? null, usedUsd: used?.medianUsd ?? null });
    rows.push({
      slug,
      role: group.identity.role,
      label: before && !group.fresh.length && !group.used.length ? before.label : group.identity.label,
      facts: group.identity.facts ?? before?.facts ?? {},
      new: fresh,
      used,
      inCatalog: input.usage?.get(slug) ?? 0,
      history: history.slice(-120),
      updatedAt: new Date().toISOString(),
    });
  }
  return rows.sort((a, b) => a.role.localeCompare(b.role) || (b.inCatalog - a.inCatalog) || a.slug.localeCompare(b.slug));
}
