// Weekly per-lender fact refresh for /mejores-prestamos-uruguay, via the private Claude endpoint.
//
// WHY CLAUDE AND NOT GEMINI. The other rate job in this repo (classes/loans/gemini.ts) asks for one
// number and gets grounding chunks back, which is the right tool for "what is the TEA". This job
// asks a harder question — does this lender still lend to somebody with Clearing marks, is the
// insurance compulsory, can you cancel early — and the answer lives in a terms-and-conditions PDF
// or three paragraphs down a help page. That needs a researcher that can search AND open pages,
// which is what the Claude endpoint has and grounded Gemini does not.
//
// WHAT THAT COSTS US. Claude returns prose, and the URLs it names are claims rather than evidence
// (classes/gaps/research.ts makes the same point at length). So every patch is verified here
// before it is allowed anywhere near the snapshot:
//
//   1. the cited URL must resolve to the LENDER'S OWN domain, or to an official source
//      (bcu.gub.uy, gub.uy, impo.com.uy) — otherwise a comparison blog's number gets attributed
//      to the lender;
//   2. we fetch it ourselves and require a 200 — a plausible URL the model never opened is worse
//      than no source, because the little link icon invites the reader to skip the check;
//   3. numbers outside a sane band are dropped rather than clamped, because a clamped number is
//      indistinguishable from a real one on the page.
//
// Everything degrades to "no patch for this lender", which classes/loantiers/merge.ts reads as
// "keep last week's facts". A bad week is a quiet week, never a wrong page.
import axios from "axios";
import { askClaudeJson, claudeHasBudget, claudeSaturated } from "../claude";
import type { LoanLenderSeed } from "./catalog";
import type { LenderFactPatch } from "./types";

/** Research is slow: a web search plus several page opens per lender. */
const RESEARCH_TIMEOUT_MS = 420000;
/** Per-source verification. A slow lender site must not hold up the whole run. */
const VERIFY_TIMEOUT_MS = 15000;

/**
 * Plausibility band for a Uruguayan consumer-loan TEA (%). Same band classes/loans/scraper.ts
 * uses, and for the same reason: below 5 is somebody quoting a monthly rate, above 250 is either
 * a typo or a lender that has left the legal universe.
 */
export const TEA_MIN = 5;
export const TEA_MAX = 250;

/** Official sources allowed to back a fact besides the lender's own site. */
const OFFICIAL_HOSTS = ["bcu.gub.uy", "gub.uy", "impo.com.uy"];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

const PATCH_SCHEMA = {
  type: "object",
  properties: {
    found: { type: "boolean" },
    sourceUrl: { type: "string" },
    teaPct: { type: ["number", "null"] },
    teaMaxPct: { type: ["number", "null"] },
    ivaOnInterest: { type: ["boolean", "null"] },
    publishesCft: { type: ["boolean", "null"] },
    clearing: { type: ["string", "null"] },
    clearingNote: { type: ["string", "null"] },
    clearingEvidence: { type: ["string", "null"] },
    minIncomeUyu: { type: ["number", "null"] },
    maxAmountUyu: { type: ["number", "null"] },
    maxTermMonths: { type: ["number", "null"] },
    currencies: { type: ["array", "null"], items: { type: "string" } },
    onlineEndToEnd: { type: ["boolean", "null"] },
    disbursementHours: { type: ["number", "null"] },
    audiences: { type: ["array", "null"], items: { type: "string" } },
    payrollDeductionRequired: { type: ["boolean", "null"] },
    earlyRepaymentFree: { type: ["boolean", "null"] },
    originationFee: { type: ["boolean", "null"] },
    insuranceMandatory: { type: ["boolean", "null"] },
    bcu: { type: ["string", "null"] },
    membershipRequired: { type: ["boolean", "null"] },
    stillOperating: { type: ["boolean", "null"] },
    changeNote: { type: ["string", "null"] },
  },
  required: ["found", "sourceUrl"],
} as const;

interface RawPatch {
  found: boolean;
  sourceUrl: string;
  teaPct?: number | null;
  teaMaxPct?: number | null;
  ivaOnInterest?: boolean | null;
  publishesCft?: boolean | null;
  clearing?: string | null;
  clearingNote?: string | null;
  clearingEvidence?: string | null;
  minIncomeUyu?: number | null;
  maxAmountUyu?: number | null;
  maxTermMonths?: number | null;
  currencies?: string[] | null;
  onlineEndToEnd?: boolean | null;
  disbursementHours?: number | null;
  audiences?: string[] | null;
  payrollDeductionRequired?: boolean | null;
  earlyRepaymentFree?: boolean | null;
  originationFee?: boolean | null;
  insuranceMandatory?: boolean | null;
  bcu?: string | null;
  membershipRequired?: boolean | null;
  stillOperating?: boolean | null;
  changeNote?: string | null;
}

export function researchPrompt(lender: LoanLenderSeed): string {
  return `Estás actualizando la ficha de un prestamista uruguayo para una comparativa pública. Hoy es ${new Date()
    .toISOString()
    .slice(0, 10)}.

PRESTAMISTA: ${lender.name}
SITIO OFICIAL: ${lender.website}
PÁGINA DE REFERENCIA QUE YA TENÍAMOS: ${lender.sourceUrl}

Buscá en la web y ABRÍ las páginas oficiales del prestamista (y sus términos y condiciones, tarifario o "letra chica" si hace falta). Contestá SOLO con lo que puedas leer hoy en una página real.

Necesito, sobre su préstamo personal / de consumo en efectivo a personas físicas en Uruguay:

1. teaPct: la Tasa Efectiva Anual representativa que publican (la más baja publicitada, o la única si publican una sola). Número, sin el signo %. null si no publican ninguna.
2. teaMaxPct: el techo del rango si publican un rango ("entre X% y Y%"). null si no hay rango.
3. ivaOnInterest: true si el IVA sobre los intereses se suma APARTE de esa TEA (en Uruguay suele decir "+ IVA"). false si la TEA ya lo incluye.
4. publishesCft: true solo si publican un Costo Financiero Total (CFT), no solo la TEA.
5. clearing: uno de "si" | "parcial" | "no" | "desconocido". ¿Le prestan a alguien que HOY tiene antecedentes negativos en el Clearing de Informes o mala calificación en la Central de Riesgos del BCU?
   - "si": lo dicen ellos o está verificado.
   - "parcial": prestan con condiciones (garantía, codeudor, monto chico, retención del sueldo) o solo para algunos casos.
   - "no": piden expresamente no tener antecedentes.
   - "desconocido": no encontraste nada. NO adivines.
6. clearingEvidence: la frase textual (corta) de la página que respalda el punto 5, o "" si es "desconocido".
7. clearingNote: una oración para el lector explicando la política real.
8. minIncomeUyu: ingreso líquido mensual mínimo exigido, en pesos uruguayos. null si no lo publican.
9. maxAmountUyu: monto máximo en pesos uruguayos. null si no lo publican.
10. maxTermMonths: plazo máximo en meses. null si no lo publican.
11. currencies: array con "UYU", "USD" y/o "UI" según en qué monedas prestan.
12. onlineEndToEnd: true solo si TODO el trámite (solicitud, firma y desembolso) se puede hacer sin ir a una sucursal.
13. disbursementHours: horas típicas entre la solicitud y tener la plata, según lo que ELLOS prometen. null si no lo dicen.
14. audiences: array con "dependiente", "jubilado", "independiente", "extranjero", "socio" según a quién le prestan.
15. payrollDeductionRequired: true si EXIGEN retención de haberes / descuento por planilla (no si solo la ofrecen).
16. earlyRepaymentFree: true si se puede cancelar anticipadamente sin multa, false si cobran multa, null si no lo publican.
17. originationFee: true si cobran gastos de otorgamiento o administración además del interés.
18. insuranceMandatory: true si el seguro de vida / desempleo / saldo deudor es obligatorio y va dentro de la cuota.
19. bcu: "supervisada" (institución de intermediación financiera o EAC de mayores activos supervisada), "registrada" (inscripta pero no supervisada), "no-regulada" o "desconocido".
20. membershipRequired: true si hay que asociarse y pagar capital social o cuota antes de poder pedir.
21. stillOperating: false si la empresa cerró, fue absorbida o dejó de prestar. true si sigue operando.
22. sourceUrl: la URL EXACTA de la página del prestamista donde leíste la mayoría de estos datos. Tiene que ser del dominio del prestamista (o de bcu.gub.uy / gub.uy / impo.com.uy). NO pongas un blog, un comparador ni un agregador.
23. changeNote: si algo cambió respecto de lo que suele decirse de este prestamista (subió la tasa, dejó de prestar, cambió de dueño), escribilo en una oración. Si no, "".
24. found: true si pudiste leer la página oficial; false si no llegaste a ninguna fuente propia del prestamista.

REGLAS DURAS:
- No inventes ningún número. Si no lo encontraste, null. Un null es una respuesta correcta; un número inventado arruina la página.
- No copies cifras de comparadores, blogs de "préstamos rápidos" ni agregadores: la mitad están desactualizados y la otra mitad son publicidad.
- Si la TEA que ves es mensual, convertila a anual y decilo en changeNote.
- Si el sitio no abre o está caído, devolvé found:false en vez de responder de memoria.`;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "";
  }
}

/**
 * Is this URL allowed to back a fact about this lender?
 *
 * Suffix match rather than equality so `solicitar.creditodelacasa.com.uy` counts for
 * `creditodelacasa.com.uy`, while `creditodelacasa.com.uy.spam.net` does not (the check is on the
 * dot-boundary, not a bare `includes`).
 */
export function sourceHostAllowed(url: string, website: string): boolean {
  const host = hostnameOf(url);
  if (!host) return false;
  const own = hostnameOf(website);
  if (own && (host === own || host.endsWith(`.${own}`) || own.endsWith(`.${host}`))) return true;
  return OFFICIAL_HOSTS.some((official) => host === official || host.endsWith(`.${official}`));
}

/** Did WE open it and get a 200? A URL the model named but nobody fetched is not a source. */
export async function urlResolves(url: string): Promise<boolean> {
  try {
    const res = await axios.get(url, {
      timeout: VERIFY_TIMEOUT_MS,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS + 2000),
      headers: { "user-agent": UA },
      maxRedirects: 5,
      validateStatus: () => true,
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

function plausibleTea(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= TEA_MIN && n <= TEA_MAX;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : undefined;
}

function positive(n: unknown, max: number): number | undefined {
  return typeof n === "number" && Number.isFinite(n) && n > 0 && n <= max ? n : undefined;
}

/**
 * Raw model output → a patch we are willing to publish.
 *
 * Exported and pure so tests can hammer it with malformed answers without a network. Returns null
 * when nothing survived, which the caller reads as "no patch this week".
 */
export function sanitizePatch(raw: RawPatch | null, lender: LoanLenderSeed): LenderFactPatch | null {
  if (!raw || raw.found !== true) return null;
  if (!raw.sourceUrl || !sourceHostAllowed(raw.sourceUrl, lender.website)) return null;

  const patch: LenderFactPatch = { id: lender.id, sourceUrl: raw.sourceUrl };

  if (plausibleTea(raw.teaPct)) patch.teaPct = raw.teaPct;
  else if (raw.teaPct === null) patch.teaPct = null;
  if (plausibleTea(raw.teaMaxPct)) patch.teaMaxPct = raw.teaMaxPct;

  if (typeof raw.ivaOnInterest === "boolean") patch.ivaOnInterest = raw.ivaOnInterest;
  if (typeof raw.publishesCft === "boolean") patch.publishesCft = raw.publishesCft;

  const clearing = oneOf(raw.clearing, ["si", "parcial", "no", "desconocido"] as const);
  // A stance change is the single most consequential thing this job can publish: it decides
  // whether we send somebody with Clearing marks to a door. It only lands with a quoted sentence
  // from the page behind it.
  if (clearing && (clearing === "desconocido" || (raw.clearingEvidence ?? "").trim().length >= 12)) {
    patch.clearing = clearing;
    if (raw.clearingNote?.trim()) patch.clearingNote = raw.clearingNote.trim().slice(0, 400);
  }

  const minIncome = positive(raw.minIncomeUyu, 500000);
  if (minIncome !== undefined) patch.minIncomeUyu = minIncome;
  const maxAmount = positive(raw.maxAmountUyu, 50000000);
  if (maxAmount !== undefined) patch.maxAmountUyu = maxAmount;
  const maxTerm = positive(raw.maxTermMonths, 360);
  if (maxTerm !== undefined) patch.maxTermMonths = Math.round(maxTerm);

  if (Array.isArray(raw.currencies)) {
    const currencies = raw.currencies
      .map((c) => oneOf(c, ["UYU", "USD", "UI"] as const))
      .filter((c): c is "UYU" | "USD" | "UI" => !!c);
    if (currencies.length) patch.currencies = [...new Set(currencies)];
  }

  if (typeof raw.onlineEndToEnd === "boolean") patch.onlineEndToEnd = raw.onlineEndToEnd;

  const hours = positive(raw.disbursementHours, 2160);
  if (hours !== undefined) patch.disbursementHours = hours;

  if (Array.isArray(raw.audiences)) {
    const audiences = raw.audiences
      .map((a) => oneOf(a, ["dependiente", "jubilado", "independiente", "extranjero", "socio"] as const))
      .filter((a): a is NonNullable<typeof a> => !!a);
    if (audiences.length) patch.audiences = [...new Set(audiences)];
  }

  if (typeof raw.payrollDeductionRequired === "boolean")
    patch.payrollDeductionRequired = raw.payrollDeductionRequired;
  if (typeof raw.earlyRepaymentFree === "boolean") patch.earlyRepaymentFree = raw.earlyRepaymentFree;
  if (typeof raw.originationFee === "boolean") patch.originationFee = raw.originationFee;
  if (typeof raw.insuranceMandatory === "boolean") patch.insuranceMandatory = raw.insuranceMandatory;

  const bcu = oneOf(raw.bcu, ["supervisada", "registrada", "no-regulada", "desconocido"] as const);
  if (bcu) patch.bcu = bcu;

  if (typeof raw.membershipRequired === "boolean") patch.membershipRequired = raw.membershipRequired;

  if (raw.changeNote?.trim()) patch.changeNote = raw.changeNote.trim().slice(0, 300);
  if (raw.stillOperating === false) {
    patch.changeNote = `${patch.changeNote ? `${patch.changeNote} ` : ""}La investigación no encontró señales de que siga prestando: revisar a mano.`;
  }

  patch.verifiedAt = new Date().toISOString().slice(0, 10);
  return patch;
}

/**
 * One lender, one refreshed patch (or null).
 *
 * Sequential by design at the call site: the endpoint's concurrency cap is 2 and its daily budget
 * is shared with a human, so a fan-out here would buy a few minutes and cost somebody their tool.
 */
export async function researchLender(lender: LoanLenderSeed): Promise<LenderFactPatch | null> {
  if (claudeSaturated()) return null;

  const raw = await askClaudeJson<RawPatch>(researchPrompt(lender), PATCH_SCHEMA, {
    allowedTools: ["WebSearch", "WebFetch"],
    effort: "high",
    timeoutMs: RESEARCH_TIMEOUT_MS,
  });

  const patch = sanitizePatch(raw, lender);
  if (!patch?.sourceUrl) return null;

  if (!(await urlResolves(patch.sourceUrl))) {
    console.warn(`[loan-tiers] ${lender.id}: la fuente citada no responde 200 (${patch.sourceUrl}) — se descarta`);
    return null;
  }
  return patch;
}

export interface ResearchRun {
  patches: LenderFactPatch[];
  attempted: number;
}

/** Refresh every lender in the catalogue, one at a time, stopping if the endpoint saturates. */
export async function researchAllLenders(lenders: readonly LoanLenderSeed[]): Promise<ResearchRun> {
  if (!(await claudeHasBudget())) {
    console.warn("[loan-tiers] sin presupuesto en el endpoint de Claude — no se refresca nada");
    return { patches: [], attempted: 0 };
  }

  const patches: LenderFactPatch[] = [];
  let attempted = 0;
  for (const lender of lenders) {
    if (claudeSaturated()) {
      console.warn("[loan-tiers] el endpoint se saturó — se corta la corrida y se conserva lo anterior");
      break;
    }
    attempted++;
    try {
      const patch = await researchLender(lender);
      if (patch) patches.push(patch);
      else console.warn(`[loan-tiers] ${lender.id}: sin patch verificable esta semana`);
    } catch (error: any) {
      console.warn(`[loan-tiers] ${lender.id}: falló la investigación:`, error?.message || error);
    }
  }
  return { patches, attempted };
}
