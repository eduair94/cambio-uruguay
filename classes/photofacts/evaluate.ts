// La vara para publicar un atributo visual, y la cuenta que dice si lo pasa.
//
// La precisión se mide sobre lo que el modelo AFIRMÓ (que se ve un balcón, que la vivienda está
// amueblada): un positivo falso es lo que llegaría al lector. Las negativas también se etiquetan,
// porque cuentan para el tamaño de la muestra y dicen cuánto se pierde, pero no deciden.
//
// Las etiquetas las pone una PERSONA. La verificación del piloto la hizo otra IA, y por eso no
// alcanzó para publicar nada.
import { AMENITY_KEYS, type AmenityKey } from "./schema";

export const PUBLISH_BAR = { precision: 0.95, n: 100, positives: 30 } as const;

/** Lo que se etiqueta de cada aviso: las seis comodidades, el mobiliario y dos banderas internas. */
export const LABEL_ATTRIBUTES = [...AMENITY_KEYS, "furniture", "render", "watermark"] as const;
export type LabelAttribute = (typeof LABEL_ATTRIBUTES)[number];

export interface Label {
  id: string;
  attribute: LabelAttribute | string;
  /** El modelo afirmó algo (se ve / amueblado o vacío / hay render / hay marca de agua). */
  positive: boolean;
  verdict: "correcto" | "incorrecto" | "no_se_ve";
}

export interface AttributeScore {
  attribute: string;
  n: number;
  positives: number;
  correctPositives: number;
  precision: number | null;
  wilsonLow: number | null;
  accuracy: number | null;
  passes: boolean;
}

/** Cota inferior del intervalo de Wilson: lo peor que la muestra todavía no descarta. */
export function wilsonLower(k: number, n: number, z = 1.96): number {
  if (n <= 0) return 0;
  const p = k / n;
  const z2 = z * z;
  return (p + z2 / (2 * n) - z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / (1 + z2 / n);
}

export function evaluateLabels(labels: readonly Label[]): AttributeScore[] {
  const groups = new Map<string, Label[]>();
  for (const label of labels) {
    if (label.verdict === "no_se_ve") continue;
    const list = groups.get(label.attribute) ?? [];
    list.push(label);
    groups.set(label.attribute, list);
  }
  return [...groups.entries()]
    .map(([attribute, list]) => {
      const positives = list.filter(label => label.positive);
      const correctPositives = positives.filter(label => label.verdict === "correcto").length;
      const correct = list.filter(label => label.verdict === "correcto").length;
      const precision = positives.length ? correctPositives / positives.length : null;
      return {
        attribute,
        n: list.length,
        positives: positives.length,
        correctPositives,
        precision,
        wilsonLow: positives.length ? wilsonLower(correctPositives, positives.length) : null,
        accuracy: list.length ? correct / list.length : null,
        passes: list.length >= PUBLISH_BAR.n && positives.length >= PUBLISH_BAR.positives && (precision ?? 0) >= PUBLISH_BAR.precision,
      };
    })
    .sort((a, b) => a.attribute.localeCompare(b.attribute));
}

/** Lo que el modelo afirmó de un documento guardado, atributo por atributo. */
export function claimsOf(doc: {
  facts?: { furniture?: string; seen?: Partial<Record<AmenityKey, number | null>> };
  photos?: Array<{ render?: boolean | null; watermark?: boolean | null }>;
}): Record<LabelAttribute, boolean> {
  const seen = doc.facts?.seen ?? {};
  const photos = doc.photos ?? [];
  const out = Object.fromEntries(AMENITY_KEYS.map(key => [key, typeof seen[key] === "number"])) as Record<LabelAttribute, boolean>;
  out.furniture = doc.facts?.furniture === "si" || doc.facts?.furniture === "no";
  out.render = photos.some(photo => photo.render === true);
  out.watermark = photos.some(photo => photo.watermark === true);
  return out;
}

const hashOf = (id: string): number => {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
};

/**
 * Una muestra que trae, para cada atributo, hasta `perAttribute` avisos donde el modelo lo afirmó y
 * otros tantos donde no: al azar se etiquetarían cien avisos sin un solo parrillero. Determinista
 * (orden por hash del id) para que dos corridas con los mismos datos den la misma página.
 */
export function stratifiedSample<T extends { _id?: unknown; id?: unknown } & Parameters<typeof claimsOf>[0]>(docs: readonly T[], perAttribute: number): T[] {
  const idOf = (doc: T): string => String(doc._id ?? doc.id ?? "");
  const ordered = [...docs].sort((a, b) => hashOf(idOf(a)) - hashOf(idOf(b)) || idOf(a).localeCompare(idOf(b)));
  const picked = new Map<string, T>();
  for (const attribute of LABEL_ATTRIBUTES) {
    let yes = 0;
    let no = 0;
    for (const doc of ordered) {
      if (yes >= perAttribute && no >= perAttribute) break;
      const claimed = claimsOf(doc)[attribute];
      if (claimed && yes < perAttribute) { yes++; picked.set(idOf(doc), doc); }
      else if (!claimed && no < perAttribute) { no++; picked.set(idOf(doc), doc); }
    }
  }
  return ordered.filter(doc => picked.has(idOf(doc)));
}
