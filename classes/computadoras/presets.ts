// Cuánto sale armar hoy tres PCs tipo con las medianas nuevas del día. Cada rol tiene una lista de
// candidatos en orden de preferencia y se toma el primero con precio; la mother y la RAM salen del
// socket del procesador elegido, para que el armado sea compatible (un i5-13400F no entra en una B550).
// El total existe sólo si todas las piezas tienen precio.
import { socketOfChipset } from "./specs";
import type { PartRole, PartRow, Preset } from "./types";

interface PresetSpec {
  id: string;
  label: string;
  description: string;
  cpu: string[];
  gpu?: string[];
  ramGb: number;
  storage: string[];
  psu: string[];
}

export const PRESET_SPECS: readonly PresetSpec[] = [
  {
    id: "oficina",
    label: "PC de oficina y estudio",
    description: "Procesador con gráficos integrados, 16 GB y un SSD: navegar, ofimática, clases y video.",
    cpu: ["cpu:ryzen-5-5600g", "cpu:i3-12100", "cpu:ryzen-5-8600g", "cpu:i5-12400"],
    ramGb: 16,
    storage: ["storage:nvme:512", "storage:ssd:512", "storage:nvme:256"],
    psu: ["psu:500", "psu:550", "psu:450"],
  },
  {
    id: "gamer-entrada",
    label: "PC gamer de entrada",
    description: "Juegos actuales en 1080p con detalle medio, y los competitivos con fluidez.",
    cpu: ["cpu:ryzen-5-5600", "cpu:i5-12400f", "cpu:ryzen-5-5500"],
    gpu: ["gpu:rtx-5050", "gpu:rtx-3050-8gb", "gpu:rtx-3050", "gpu:rx-6600", "gpu:arc-b570"],
    ramGb: 16,
    storage: ["storage:nvme:1000", "storage:nvme:512"],
    psu: ["psu:600", "psu:650", "psu:550"],
  },
  {
    id: "gamer-media",
    label: "PC gamer media",
    description: "Juegos actuales en 1080p con detalle alto y 1440p con ajustes.",
    cpu: ["cpu:ryzen-7-5700x", "cpu:i5-13400f", "cpu:i5-12400f", "cpu:ryzen-5-7600"],
    gpu: ["gpu:rtx-5060", "gpu:rtx-4060", "gpu:rx-9060-xt", "gpu:rtx-5060-ti-16gb"],
    ramGb: 32,
    storage: ["storage:nvme:1000"],
    psu: ["psu:650", "psu:750"],
  },
];

const CHIPSETS_BY_SOCKET: Record<string, string[]> = {
  AM4: ["a520", "b450", "b550"],
  AM5: ["a620", "b650", "b850"],
  LGA1700: ["h610", "b660", "b760"],
  LGA1200: ["h510", "h410", "b460", "b560"],
  LGA1851: ["b860", "z890"],
};

export function buildPresets(table: ReadonlyMap<string, PartRow>): Preset[] {
  const priced = (slug: string): PartRow | null => {
    const row = table.get(slug);
    return row?.new ? row : null;
  };
  return PRESET_SPECS.map((spec) => {
    const parts: Preset["parts"] = [];
    const missing: string[] = [];
    const pick = (role: PartRole, slugs: readonly string[], label: string, cheap = false): PartRow | null => {
      const row = slugs.map(priced).find(Boolean) ?? null;
      if (row) parts.push({ role, label: row.label, slug: row.slug, newUsd: cheap ? row.new!.p25Usd : row.new!.medianUsd });
      else missing.push(label);
      return row;
    };
    const cpu = pick("cpu", spec.cpu, "procesador");
    if (spec.gpu) pick("gpu", spec.gpu, "placa de video");
    const socket = (cpu?.facts.socket as string | undefined) ?? null;
    const ramType = socket === "AM5" || socket === "LGA1851" ? "ddr5" : "ddr4";
    pick("ram", [`ram:${ramType}:${spec.ramGb}`], `memoria ${spec.ramGb} GB ${ramType.toUpperCase()}`);
    pick("storage", spec.storage, "disco");
    const boards = socket ? [...(CHIPSETS_BY_SOCKET[socket] ?? []).map((chipset) => `motherboard:${chipset}`).filter((slug) => socketOfChipset(slug.split(":")[1]!) === socket), `motherboard:socket-${socket.toLowerCase()}`] : [];
    pick("motherboard", boards, "mother", true);
    pick("psu", spec.psu, "fuente");
    pick("case", ["case:basico"], "gabinete", true);
    const totalUsd = missing.length ? null : Math.round(parts.reduce((total, part) => total + (part.newUsd ?? 0), 0));
    return { id: spec.id, label: spec.label, description: spec.description, parts, totalUsd, missing };
  });
}
