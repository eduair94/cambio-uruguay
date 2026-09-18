// Lo que el aviso DECLARA sobre el auto: deuda, choque, recupero de seguro, papeles, uso intensivo.
//
// El que afirma es el vendedor, no nosotros: cada riesgo guarda la frase textual del aviso, limpia de
// datos de contacto, y de dónde salió. La página publica la cita; el sitio no dictamina que un auto
// esté chocado, muestra que su propio aviso lo dice.
//
// Todo pasa por `affirmedMatches`, que descarta lo negado: medir sin eso cuenta "sin deuda" y "sin
// choques" como riesgo, que es al revés — son argumentos de venta. Medido el 2026-09-18 sobre 647
// descripciones guardadas: de 43 coincidencias crudas de "deuda", la mayoría eran "sin deuda".
import { affirmedMatches, cleanPublicText, foldOffsets } from "./normalize";

export type CarRiskCategory =
  | "deuda" | "papeles" | "siniestro" | "recupero" | "mecanica" | "chapa_extranjera" | "uso_intensivo";
export type CarRiskSeverity = "alta" | "media";
export type CarRiskFrom = "title" | "description";

export interface CarRisk {
  category: CarRiskCategory;
  severity: CarRiskSeverity;
  /** The seller's own words, cleaned of phones and links. */
  quote: string;
  from: CarRiskFrom;
}

interface RiskRule {
  category: CarRiskCategory;
  severity: CarRiskSeverity;
  source: string;
}

/**
 * Plural/gender tolerant, like the flag vocabulary in `normalize.ts` (whose `damaged`, `paperwork`,
 * `recovered` and `foreign_plate` are a subset of this table — `tests/autos/risk.test.ts` pins that
 * every flagged advert also yields its risk, so the two tables cannot drift apart).
 */
export const RISK_RULES: readonly RiskRule[] = [
  {
    category: "deuda", severity: "alta",
    // An amount is required for the generic "debe"/"deuda de": "deuda" alone is almost always part of
    // "libre de deuda". "Deuda de SUCIVE" and "prenda" name themselves and need no amount.
    source: "\\b(sucive|prenda(?:d[oa]s?|rio)?|prendad[oa]s?|empeñad[oa]s?|embargad[oa]s?|patente atrasada|patentes atrasadas|multas? (?:impagas?|pendientes?|sin pagar)|con deudas?|tiene (?:una |alguna )?deudas?|deudas? (?:total )?(?:de )?(?:u?\\$s?\\s?)?[1-9]\\w*|debe (?:u?\\$s?\\s?)?[1-9]\\w*)\\b",
  },
  {
    category: "papeles", severity: "alta",
    source: "\\b(sin (?:papeles|titulo|libreta|documentos|matriculas?|placas?)|solo (?:con )?libreta|unicamente libreta|sucesion|a nombre de (?:un )?tercer[oa]s?|(?:matriculas?|placas?|chapas?) (?:entregad|retirad|depositad)[oa]s?|remate|leasing|falta (?:el )?(?:titulo|empadronamiento))\\b",
  },
  {
    category: "siniestro", severity: "alta",
    source: "\\b(chocad[oa]s?|choques?|chocamos|siniestros?|siniestrad[oa]s?|accidentad[oa]s?|granizo|inundad[oa]s?|incendiad[oa]s?|volcad[oa]s?|sin (?:los |el |las )?airbags?|no tiene (?:los |el |las )?airbags?|airbags? (?:reventad|activad|disparad|explotad)[oa]s?)\\b",
  },
  {
    category: "recupero", severity: "alta",
    source: "\\b(recuperad[oa]s? (?:de|por|del) (?:robo|hurto|seguro|aseguradora)|resto de (?:la )?aseguradora|de aseguradora|ex seguro|salvamento|salvataje)\\b",
  },
  {
    category: "mecanica", severity: "alta",
    source: "\\b(a reparar\\w*|para reparar\\w*|a arreglar|para repuestos?|por partes|para desarme|no arranca|(?:motor|caja) (?:fundid[oa]|rot[oa]|trancad[oa]|a reparar))\\b",
  },
  {
    category: "chapa_extranjera", severity: "media",
    source: "\\b(?:chapa|placa|matricula|patente|empadronad[oa])s? (?:en |de )?(?:argentin[oa]|brasil(?:en[oa]|er[oa])?|paraguay[oa]?|extranjer[oa])\\b",
  },
  {
    category: "uso_intensivo", severity: "media",
    // "ex taxi" is the seller's own disclosure; a plain "taxi" in a dealer's address line is not.
    source: "\\b(ex ?taxi|fue taxi|trabaj[oó] (?:de |como )?taxi|ex ?remise|fue remise|ex ?uber|de flota|fue flota|escuela de manejo|rent ?a ?car)\\b",
  },
];

const QUOTE_MAX = 160;
const SEVERITY_ORDER: Readonly<Record<CarRiskSeverity, number>> = { alta: 0, media: 1 };

/**
 * `foldOffsets` keeps offsets by replacing each punctuation mark with ONE space, so a run of them
 * survives as a run: every literal space in a rule has to match one or more.
 */
const spaced = (source: string): string => source.replace(/ /g, "\\s+");

/** The seller's own sentence around the match: from the previous full stop to the next one. */
export function quoteAround(text: string, index: number, length: number): string {
  const windowStart = Math.max(0, index - 70);
  const windowEnd = Math.min(text.length, index + length + 90);
  const before = text.slice(windowStart, index);
  // The last sentence end before the match, else the start of the word the window landed inside.
  const sentenceStart = before.search(/[.;!?\n][^.;!?\n]*$/);
  const start = sentenceStart >= 0
    ? windowStart + sentenceStart + 1
    : windowStart + (windowStart > 0 ? Math.max(0, before.search(/\S*$/)) : 0);
  const after = text.slice(index + length, windowEnd);
  const sentenceEnd = after.search(/[.;!?\n]/);
  const end = sentenceEnd >= 0 ? index + length + sentenceEnd + 1 : windowEnd;
  let quote = cleanPublicText(text.slice(start, end).replace(/\s+/g, " ")).trim();
  if (sentenceEnd < 0 && end < text.length) quote = quote.replace(/\s+\S*$/, "");
  if (quote.length > QUOTE_MAX) quote = `${quote.slice(0, QUOTE_MAX - 1).replace(/\s+\S*$/, "")}…`;
  return quote;
}

/** Everything one piece of the advert declares, at most one risk per category. */
export function risksIn(text: string, from: CarRiskFrom): CarRisk[] {
  const source = String(text || "");
  if (!source.trim()) return [];
  const folded = foldOffsets(source);
  const risks: CarRisk[] = [];
  for (const rule of RISK_RULES) {
    const [match] = affirmedMatches(folded, spaced(rule.source));
    if (!match) continue;
    const quote = quoteAround(source, match.index, match.length);
    if (!quote) continue;
    risks.push({ category: rule.category, severity: rule.severity, quote, from });
  }
  return risks;
}

/**
 * The advert's declared risks. The title is read first so its quote wins a category the description
 * repeats: the title is what the seller chose to say out loud.
 */
export function declaredRisks(title: string, description: string): CarRisk[] {
  const risks = [...risksIn(title, "title")];
  for (const risk of risksIn(description, "description")) {
    if (!risks.some(existing => existing.category === risk.category)) risks.push(risk);
  }
  return risks.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.category.localeCompare(b.category));
}

export const riskCategories = (risks: readonly CarRisk[]): CarRiskCategory[] =>
  [...new Set(risks.map(risk => risk.category))].sort();

export const worstSeverity = (risks: readonly CarRisk[]): CarRiskSeverity | null =>
  risks.length ? (risks.some(risk => risk.severity === "alta") ? "alta" : "media") : null;
