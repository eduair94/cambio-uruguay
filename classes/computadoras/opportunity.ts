// Qué aviso es una oportunidad: pide bastante menos que su referencia, con evidencia que se puede
// mostrar. La vara es la de `/oportunidades-autos-usados-uruguay`: cohorte fija, mínimo de avisos,
// pasa por su ficha, tope por vendedor.
//
// «Oportunidad» no es «el veredicto por debajo»: el veredicto se publica con 4 comparables y
// cualquier base, y acá cada regla quita una explicación aburrida de un precio bajo:
//  - por debajo del 45 % de la referencia NO entra: a ese precio lo más probable es un error de
//    moneda, una falla que el aviso no dice o una estafa, no una ganga;
//  - sin fallas declaradas y sin moneda deducida;
//  - visto ayer u hoy: una oportunidad vendida hace tres días no le sirve a nadie;
//  - Facebook sólo con la ficha leída: en la descripción es donde el vendedor dice lo que falla.
import type { Comparables, ComputerKind, Opportunity, Valuation } from "./types";

export const OPPORTUNITY_POLICY = {
  /** Pide como mucho esta parte de la referencia… */
  maxRatio: 0.85,
  /** …y no menos que ésta. */
  minRatio: 0.45,
  minPriceUsd: 40,
  /** Días desde la última vez que se vio el aviso. */
  freshDays: 1,
  /** Iguales para una comparación sólida, y para una pieza suelta. */
  solidComparables: 6,
  solidParts: 5,
  /** Oportunidades por vendedor de Mercado Libre. */
  perSeller: 3,
} as const;

export interface OpportunityInput {
  kind: ComputerKind;
  source: "facebook" | "mercadolibre";
  priceUsd: number;
  currencyInferred: boolean;
  faults: readonly string[];
  /** La ficha de Facebook se leyó (en ML no hay ficha legible: el título es todo lo que hay). */
  detailRead: boolean;
  /** Días desde la última vez que se lo vio. */
  ageDays: number;
  valuation: Valuation | null;
  /** Los iguales, con `strict` cuando la cohorte es por procesador/placa/chip exactos. */
  comparables: (Comparables & { strict?: boolean }) | null;
}

export function opportunityOf(input: OpportunityInput): Opportunity | null {
  const policy = OPPORTUNITY_POLICY;
  if (input.currencyInferred || input.faults.length || input.priceUsd < policy.minPriceUsd || input.ageDays > policy.freshDays) return null;
  if (input.source === "facebook" && !input.detailRead) return null;
  const valuation = input.valuation;

  let reference: Opportunity["reference"] | null = null;
  let referenceUsd = 0;
  let referenceLabel = "";
  let n = 0;
  let solid = false;

  const machine = input.kind === "notebook" || input.kind === "desktop" || input.kind === "all-in-one" || input.kind === "mini-pc";
  if (machine || input.kind === "combo") {
    // El total usado de la valuación cuenta mother, fuente y gabinete supuestos a precio NUEVO: es una
    // cota de arriba, y contra ella cualquier PC parece barata. Acá la referencia es la cota de
    // ABAJO: sólo las piezas con precio usado real. Pedir menos que eso es pedir menos que las piezas
    // declaradas solas, sin contar las supuestas.
    const real = valuation?.usedTotalUsd ? valuation.parts.filter((part) => !part.usedFromNew && part.usedUsd) : [];
    const declared = real.filter((part) => !part.estimated);
    if (declared.length >= 2) {
      reference = "used";
      referenceUsd = real.reduce((total, part) => total + (part.usedUsd ?? 0), 0);
      referenceLabel = real.length < valuation!.parts.length ? "sus piezas usadas, sin contar mother, fuente ni gabinete" : "sus piezas usadas";
      solid = true;
    } else if (input.comparables && input.comparables.n >= 4) {
      reference = "comparables";
      referenceUsd = input.comparables.medianUsd;
      referenceLabel = input.comparables.label;
      n = input.comparables.n;
      solid = !!input.comparables.strict && n >= policy.solidComparables;
    }
  } else {
    const part = valuation?.parts[0];
    if (part?.usedUsd && !part.usedFromNew && part.usedN >= 3) {
      reference = "part";
      referenceUsd = part.usedUsd;
      referenceLabel = `${part.label} usada`;
      n = part.usedN;
      solid = n >= policy.solidParts;
    }
  }
  if (!reference || !(referenceUsd > 0)) return null;
  const ratio = input.priceUsd / referenceUsd;
  if (ratio > policy.maxRatio || ratio < policy.minRatio) return null;
  return {
    tier: solid ? "solida" : "exploratoria",
    reference,
    referenceUsd: Math.round(referenceUsd),
    referenceLabel,
    n,
    savingsUsd: Math.round(referenceUsd - input.priceUsd),
    savingsPct: Math.round((1 - ratio) * 1000) / 1000,
  };
}

/** Como mucho `perSeller` oportunidades por vendedor: las de más ahorro. Devuelve los slugs que se quedan. */
export function capBySeller(rows: ReadonlyArray<{ slug: string; sellerId: string | null; savingsPct: number }>): Set<string> {
  const kept = new Set<string>();
  const perSeller = new Map<string, number>();
  for (const row of [...rows].sort((a, b) => b.savingsPct - a.savingsPct)) {
    // Los particulares de Mercado Libre llegan sin nombre ni id y caen todos en `ml:unknown`
    // (1.778 de 1.784 usados el 24/11/2026): no son UN vendedor, y el tope los dejaba en tres.
    if (!row.sellerId || /:unknown$/.test(row.sellerId)) {
      kept.add(row.slug);
      continue;
    }
    const count = perSeller.get(row.sellerId) ?? 0;
    if (count >= OPPORTUNITY_POLICY.perSeller) continue;
    perSeller.set(row.sellerId, count + 1);
    kept.add(row.slug);
  }
  return kept;
}
