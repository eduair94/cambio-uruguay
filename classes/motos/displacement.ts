// La cilindrada de cada moto, con la misma cascada de evidencia que la carrocería de autos
// (`classes/autos/bodyType.ts`): primero lo que dice el aviso, después lo que dicen los demás avisos
// del mismo modelo, y al final lo más flojo.
//
// | orden | evidencia                                         | base         |
// |-------|---------------------------------------------------|--------------|
// | 1     | la fila «Cilindrada» de la ficha propia del aviso | `ficha`      |
// | 2     | el título, con la unidad escrita ("125 cc")       | `title`      |
// | 3     | el consenso de los avisos del mismo modelo        | `model`      |
// | 4     | el número del nombre del modelo ("GTR 125")       | `model-name` |
//
// Las dos primeras son DATO del aviso; las dos últimas son ESTIMACIONES, la página las imprime con
// "≈" y dice de dónde salen. Hasta el 23/11/2026 sólo existía la segunda y cubría el 10 % del
// catálogo (57 de 590); la ficha la declara 19 de cada 21 veces (muestra de ese día).
//
// Tres reglas que no son de forma:
//   * **El consenso sólo lo votan la ficha y el título.** Si votaran también las estimaciones, un
//     modelo le enseñaría a sus propios avisos lo que ya adivinó, y esa adivinanza volvería
//     multiplicada — la misma regla que el diccionario de carrocerías de autos.
//   * **El tramo de la faceta de Mercado Libre veta.** La ficha la carga el vendedor y se equivoca:
//     una Bajaj Pulsar de la muestra dice «2.000 cc» con el tramo «126 a 250 cc» declarado. Un valor
//     que no entra en el tramo del propio aviso se descarta y se baja un escalón.
//   * **Un valor de ficha que contradice un consenso fuerte es un tipeo.** Con cuatro o más avisos
//     del modelo concordando, una ficha a más de 30 % del consenso no se publica como dato — salvo
//     que el propio aviso lo respalde: con un tramo declarado en el que el valor entra (son dos
//     afirmaciones del vendedor que coinciden) o con el número de su nombre de modelo. Sin eso, una
//     CB 500 entre CB 190 quedaba sin cilindrada o publicada como "≈ 190" (revisión del 23/11/2026).
import { fold } from "../autos/normalize";
import { displacementOf, MOTO_DISPLACEMENT_RANGE } from "./identify";
import type { MotoDisplacementBandId } from "./types";

export type MotoDisplacementBasis = "ficha" | "title" | "model" | "model-name";

/** Mínimo de votos del modelo y fracción que tiene que concordar. Más laxo que la carrocería (8 y
 * 90 %) porque el catálogo es unas 35 veces más chico y la cilindrada es un número: 124 y 125
 * concuerdan. */
export const DISPLACEMENT_MIN_VOTES = 3;
export const DISPLACEMENT_MIN_SHARE = 0.8;
/** Dos cilindradas concuerdan si están a menos de esto de la mediana del modelo. */
export const DISPLACEMENT_AGREE = 0.1;
/** Con al menos tantos votos concordantes, una ficha que se aparta más de `DISPLACEMENT_TYPO` es un tipeo. */
export const DISPLACEMENT_STRONG_VOTES = 4;
export const DISPLACEMENT_TYPO = 0.3;
/** Tolerancia en el borde del tramo: los tramos de Mercado Libre se solapan en 125 y 250 cc. */
export const DISPLACEMENT_BAND_SLACK = 0.1;

const inRange = (value: number): boolean =>
  Number.isFinite(value) && value >= MOTO_DISPLACEMENT_RANGE.min && value <= MOTO_DISPLACEMENT_RANGE.max;

/**
 * La fila «Cilindrada» de la ficha: "150 cc", "1.590 cc", "249,5 cc". El punto es separador de
 * miles (así lo escribe Mercado Libre Uruguay) y la coma, decimal.
 */
export function parseFichaDisplacement(raw: string | null | undefined): number | null {
  const text = fold(String(raw ?? "")).trim();
  const match = /^(\d{1,4}(?:\.\d{3})?(?:,\d+)?)\s*(?:cc|c\.c\.?|cm3|cm³)?$/.exec(text);
  if (!match) return null;
  const value = Math.round(Number(match[1]!.replace(/\./g, "").replace(",", ".")));
  return inRange(value) ? value : null;
}

/**
 * El número del nombre del modelo que publica Mercado Libre: "GTR 125", "Versys 650", "PX 110F",
 * "Z900". Es la evidencia más floja: el nombre es comercial ("Svartpilen 401" tiene 373 cc), así que
 * sirve para ubicar a la moto en su tramo, no para afirmar el número — por eso va con "≈".
 *
 * Por debajo de 50 no es una cilindrada ("MT 03", "FZ25"); dos números distintos no se arbitran.
 */
export function displacementFromModelName(model: string): number | null {
  const found = new Set<number>();
  const pattern = /(?:^|[^0-9])(\d{2,4})(?![0-9])/g;
  let match: RegExpExecArray | null;
  const text = fold(model);
  while ((match = pattern.exec(text))) {
    const value = Number(match[1]);
    if (value >= 50 && inRange(value)) found.add(value);
  }
  return found.size === 1 ? [...found][0]! : null;
}

const BAND_LIMITS: Record<MotoDisplacementBandId, { min: number; max: number }> = {
  "hasta-125": { min: 0, max: 125 },
  "126-250": { min: 125, max: 250 },
  "mas-250": { min: 250, max: Number.POSITIVE_INFINITY },
};

/** Si una cilindrada entra en el tramo que declaró el aviso (sin tramo, entra siempre). */
export function fitsBand(value: number, band: MotoDisplacementBandId | null | undefined): boolean {
  if (!band) return true;
  const limits = BAND_LIMITS[band];
  if (!limits) return true;
  return value >= limits.min * (1 - DISPLACEMENT_BAND_SLACK) && value <= limits.max * (1 + DISPLACEMENT_BAND_SLACK);
}

export interface DisplacementInput {
  /** `marca-modelo`: la cohorte que vota. */
  marketSlug: string;
  /** El nombre del modelo de Mercado Libre, para el último escalón. */
  model: string;
  title: string;
  /** El tramo que declaró la faceta del origen, que veta. */
  declaredBand: MotoDisplacementBandId | null;
  /** La fila «Cilindrada» de la ficha propia, ya leída. */
  fichaDisplacement: number | null;
  /** Una eléctrica no tiene cilindrada: ni vota ni recibe. */
  electric: boolean;
}

export interface DisplacementOutput {
  /** La mejor cilindrada que hay, de cualquier base. Es la que filtra y la que se muestra. */
  displacement: number | null;
  displacementBasis: MotoDisplacementBasis | null;
  /** Cuántos avisos del modelo sostienen la estimación (sólo con base `model`). */
  displacementVotes: number | null;
  /** Sólo el DATO del aviso (ficha o título): lo único que entra a una estadística por cilindrada. */
  exactDisplacement: number | null;
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

const agrees = (value: number, reference: number, share = DISPLACEMENT_AGREE): boolean =>
  Math.abs(value - reference) <= reference * share;

/** La cilindrada que el propio aviso declara, ya pasada por el veto del tramo. */
function ownDisplacement(listing: DisplacementInput): { value: number; basis: "ficha" | "title" } | null {
  if (listing.electric) return null;
  const ficha = listing.fichaDisplacement;
  if (ficha !== null && inRange(ficha) && fitsBand(ficha, listing.declaredBand)) return { value: ficha, basis: "ficha" };
  const title = displacementOf(listing.title);
  if (title !== null && fitsBand(title, listing.declaredBand)) return { value: title, basis: "title" };
  return null;
}

export function attachDisplacement<T extends DisplacementInput>(listings: readonly T[]): Array<T & DisplacementOutput> {
  const own = listings.map(ownDisplacement);
  const votes = new Map<string, number[]>();
  listings.forEach((listing, index) => {
    const declared = own[index];
    if (!declared) return;
    const list = votes.get(listing.marketSlug) ?? [];
    list.push(declared.value);
    votes.set(listing.marketSlug, list);
  });
  const consensus = new Map<string, { value: number; votes: number }>();
  for (const [slug, values] of votes) {
    if (values.length < DISPLACEMENT_MIN_VOTES) continue;
    const center = median(values);
    const agreeing = values.filter(value => agrees(value, center));
    if (agreeing.length / values.length < DISPLACEMENT_MIN_SHARE) continue;
    consensus.set(slug, { value: Math.round(median(agreeing)), votes: agreeing.length });
  }

  return listings.map((listing, index) => {
    const none: DisplacementOutput = { displacement: null, displacementBasis: null, displacementVotes: null, exactDisplacement: null };
    if (listing.electric) return { ...listing, ...none };
    const declared = own[index];
    const model = consensus.get(listing.marketSlug) ?? null;
    if (declared) {
      const named = displacementFromModelName(listing.model);
      const backed = !!listing.declaredBand || (named !== null && agrees(declared.value, named));
      const typo =
        !backed &&
        !!model &&
        model.votes >= DISPLACEMENT_STRONG_VOTES &&
        !agrees(declared.value, model.value, DISPLACEMENT_TYPO);
      if (!typo) {
        return {
          ...listing,
          displacement: declared.value,
          displacementBasis: declared.basis,
          displacementVotes: null,
          exactDisplacement: declared.value,
        };
      }
    }
    if (model && fitsBand(model.value, listing.declaredBand)) {
      return { ...listing, displacement: model.value, displacementBasis: "model", displacementVotes: model.votes, exactDisplacement: null };
    }
    const named = displacementFromModelName(listing.model);
    // El nombre calla si los avisos reales del modelo dicen otra cosa: es la evidencia más floja y
    // no puede contradecir a la que sí es del aviso.
    const contradicted = named !== null && (votes.get(listing.marketSlug) ?? []).some(value => !agrees(value, named));
    if (named !== null && !contradicted && fitsBand(named, listing.declaredBand)) {
      return { ...listing, displacement: named, displacementBasis: "model-name", displacementVotes: null, exactDisplacement: null };
    }
    return { ...listing, ...none };
  });
}
