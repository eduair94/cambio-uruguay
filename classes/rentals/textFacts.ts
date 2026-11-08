// What the advert's own words say about two things a reader filters by: whether it comes with
// furniture and whether it is a year-round or a winter contract. Asked on 2026-10-09 by a reader of
// /alquileres-uruguay ("separar por anuales, temporada, invernales, con y sin mueble"). Pure.
//
// Furniture: until then only InfoCasas' structured "Amueblado" facility set it (2.156 of 63.193
// homes seen in ten days), while 2.551 titles and 2.152 more descriptions said it in words and 492
// said "sin muebles". Read conservatively: "con muebles aéreos y bajo mesada" is a kitchen, and an
// advert that offers both ("con o sin amoblar", "amoblado ó sin amoblar") says neither.
//
// Period: a summer stay is priced per night or fortnight and is never published (eligibility.ts);
// a winter contract (March to December on the coast) quotes a month's rent, so it is published
// and marked, and an advert can offer both a year-round and a winter contract.
//
// Gastos comunes (2026-11-08): 21-40 % of the InfoCasas and El País adverts without the portal's
// field state them in the description ("Gastos comunes: $U11.000.-"), and without them the card has
// no total, "Menor total mensual" sorts them last and the total cap drops them. Read with the same
// parser as the video captions (`captionAmounts`), only when the portal gave nothing, and published
// only with `RENTALS_GC_FROM_TEXT=1` once a hand-labelled sample measured its precision
// (`npm run rentals_gc_text_sample`).
import { zoneOwnCommonExpenses } from "../propertyzones/project";
import { rentalPeriodEvidence } from "./eligibility";
import { mlDetailExpenses } from "./mlDetail";
import { flatten } from "./normalize";
import { captionAmounts } from "./sources/social/caption";
import type { RawRental, RentalCommonExpensesSource, RentalCurrency, RentalSource, RentalTerm } from "./types";

const UNFURNISHED = /\b(?:sin muebles|sin amueblar|sin amoblar|sin mobiliario|no (?:esta |se entrega )?(?:amueblad[oa]|amoblad[oa]))\b/g;
const FURNISHED = /\b(?:amueblad[oa]s?|amoblad[oa]s?|semi ?amueblad[oa]s?|semi ?amoblad[oa]s?|full amueblad[oa]|con (?:todos (?:los|sus) |sus )?muebles(?!\s+(?:aereos?|bajo|de |del |en |empotrad|y bajo|para|tipo|nuevos de cocina)))\b/;
// Either is on offer, or furniture is negotiable: no claim either way.
const EITHER = /\bcon o sin (?:muebles|amueblar|amoblar)\b|\b(?:amueblad|amoblad)[oa]\s*(?:o|u|\/)\s*(?:no|sin)\b|\b(?:sin|con)\s+(?:o|u|\/)\s*(?:sin|con)\s+muebles\b|\b(?:opcional(?:mente)?|a eleccion|a convenir|a pedido)\b.{0,25}\b(?:amuebl|amobl|muebles)|\b(?:amuebl|amobl)\w*.{0,25}\b(?:opcional|a eleccion|a convenir|a pedido)\b/;
// "Cocina con muebles…" describes cabinets.
const KITCHEN_BEFORE = /\b(?:cocina|kitchenette|bano|placard|mesada)\b[^.;\n]{0,40}$/;

function furnitureClaim(raw: string): boolean | null {
  const text = flatten(raw);
  if (!text || EITHER.test(text)) return null;
  const unfurnished = new RegExp(UNFURNISHED.source).test(text);
  const rest = text.replace(UNFURNISHED, " ");
  let furnished = false;
  for (const match of rest.matchAll(new RegExp(FURNISHED.source, "g"))) {
    if (/^con\b/.test(match[0]) && KITCHEN_BEFORE.test(rest.slice(0, match.index ?? 0))) continue;
    furnished = true;
    break;
  }
  if (furnished && unfurnished) return null;
  return furnished ? true : unfurnished ? false : null;
}

/**
 * true = the advert says furnished (semi-furnished included), false = it says unfurnished, null =
 * it says neither, or contradicts itself. The title is the advert's headline: the description only
 * speaks when the title is silent, and a title the description contradicts says nothing.
 */
export function furnishedFromText(title: string, description = ""): boolean | null {
  const heading = furnitureClaim(title);
  const body = furnitureClaim(description);
  if (heading !== null && body !== null && heading !== body) return null;
  return heading ?? body;
}

/** The contract periods the advert offers: year-round, winter, both, or none stated. */
export function rentalTermsFromText(title: string, description = ""): RentalTerm[] {
  const period = rentalPeriodEvidence(title, description);
  const terms: RentalTerm[] = [];
  if (period.annual) terms.push("anual");
  if (period.winter) terms.push("invernal");
  return terms;
}

/**
 * A portal's structured "furnished" (InfoCasas' facility) and the advert's words, together. They
 * disagreeing is no claim at all.
 */
export function combineFurnished(portal: boolean | null | undefined, text: boolean | null): boolean | null {
  if (portal === true) return text === false ? null : true;
  return text;
}

// --- Gastos comunes --------------------------------------------------------------------------

/** `RENTALS_GC_FROM_TEXT=1` publishes gastos comunes read from the description. Read per call: off by default. */
export function gcFromTextEnabled(): boolean {
  return process.env.RENTALS_GC_FROM_TEXT === "1";
}

/**
 * Portals whose stored description is the advert's own text. Casasweb's search card carries none
 * (its own page is read for the figure instead); the social sources already read gastos comunes
 * from the same caption with the same parser, and Marketplace has not been measured.
 */
const GC_TEXT_SOURCES: ReadonlySet<RentalSource> = new Set<RentalSource>(["infocasas", "elpais", "casasweb", "mercadolibre"]);

const GC_LABEL = String.raw`(?:gastos\s+comunes|gastos\s+c\.?|\bg\.?\s?c\b\.?|expensas)`;
/** The figure right after the label: "GC aprox. $6.000", "Gastos comunes: $U 11.000.-", "gastos comunes ($4.000)". */
const GC_FIGURE = String.raw`\s*(?:de\s+|aprox\.?\s*)?[:=]?\s*\(?\s*(?:u\$s|us\$|usd|\$\s*u?)?\s*\d[\d.,]*(?:\.?-)?\s*\)?\s*`;
/** What stands between a figure (or the label) and the word that qualifies it: "$ 6.000 (incluidos", "$5.000 - incluidos", ": incluidos". */
const GC_GAP = String.raw`[\s,.;:()\-–—]*`;
/** "incluidos", "incluídos" (a common spelling), "ya incluidos", "están incluidos". */
const INCLUDED = String.raw`(?:est[aá]n\s+|van\s+|ya\s+)?inclu[ií]d[oa]s?`;
/**
 * "Gastos comunes incluidos", "incluye los GC", "GC $4.000 (incluidos en el precio)": the rent already
 * holds them, so a figure added to it would count them twice. And "Precio total con GC $ 30.000",
 * "Alquiler + GC: $ 33.000": that figure is the rent and the gastos comunes together, never the
 * gastos comunes alone.
 */
const GC_INCLUDED = new RegExp(
  [
    String.raw`${GC_LABEL}${GC_GAP}${INCLUDED}`,
    String.raw`\bincluyen?\s+(?:los\s+)?${GC_LABEL}`,
    String.raw`\b${INCLUDED}\s+(?:los\s+)?${GC_LABEL}`,
    String.raw`${GC_LABEL}${GC_FIGURE}${GC_GAP}${INCLUDED}`,
    String.raw`\b(?:precio|alquiler|valor|total)(?:\s+(?:total|final))?\s*(?:\+|m[aá]s|con|incluyendo)\s*(?:los\s+)?${GC_LABEL}${GC_FIGURE}`,
  ].join("|"),
  "i"
);
/**
 * "Gastos comunes $48.000 anuales", "$ 12.000 por trimestre", "$ 9.000 bimestrales", "cada 3 meses":
 * the figure of a longer period, never a month's. Above the rent the band below would catch it; a
 * quarter of a cheap building's gastos comunes is not.
 */
const GC_PERIOD = String.raw`(?:anual(?:es)?|(?:bi|tri|cuatri|se)mestral(?:es)?|(?:al|por|x|cada)\s+(?:a[ñn]o|(?:bi|tri|cuatri|se)mestre)|cada\s+(?:\d{1,2}|dos|tres|cuatro|seis|doce)\s+meses)`;
const GC_NOT_MONTHLY = new RegExp(String.raw`${GC_LABEL}${GC_FIGURE}${GC_GAP}${GC_PERIOD}(?![a-záéíóúñ])`, "i");
/**
 * "Ideal para vivir sin gastos comunes elevados", "no tiene gastos comunes tan altos": a building with
 * modest ones, not one without them. The phrase says nothing about the figure, so it is taken out
 * before the amounts are read; "sin gastos comunes" on its own still means none.
 */
const GC_QUALIFIED_NONE = new RegExp(
  String.raw`\b(?:sin|no\s+(?:paga|pagas|tiene|abona)|libre\s+de)\s+(?:gastos\s+comunes|gc|expensas)\s+(?:(?:tan|muy|demasiado)\s+)?` +
    String.raw`(?:alt[oa]s|alt[ií]sim[oa]s|elevad[oa]s|car[oa]s|car[ií]sim[oa]s|excesiv[oa]s|abusiv[oa]s|exorbitantes|importantes|grandes|enormes)(?![a-záéíóúñ])`,
  "gi"
);
/**
 * "Sin gastos comunes reportados, lo que implica un ahorro": the advert does not report them, which
 * is not saying there are none (the hand-labelled sample of 2026-11-08 had one, in a description
 * that also said it "no detalla servicios"). Taken out before reading, like the modest ones above.
 */
const GC_UNREPORTED = new RegExp(
  String.raw`\b(?:sin|no\s+(?:tiene|hay|se\s+(?:reportan|informan|indican|detallan|especifican)))\s+(?:gastos\s+comunes|gc|expensas)\s+` +
    String.raw`(?:reportad[oa]s|informad[oa]s|declarad[oa]s|especificad[oa]s|detallad[oa]s|indicad[oa]s|mencionad[oa]s|registrad[oa]s|publicad[oa]s|conocid[oa]s)(?![a-záéíóúñ])`,
  "gi"
);
/**
 * "Gastos comunes mínimos" (bajos, reducidos, accesibles…): a building with small ones. The same
 * sample had one that later said "Sin Gastos Comunes": an advert that says both says neither, so its
 * zero is not read. A figure next to the word ("gastos comunes bajos: $2.000") is still read.
 */
const GC_SMALL = new RegExp(
  String.raw`${GC_LABEL}\s+(?:(?:muy|bien|s[uú]per|realmente)\s+)?` +
    String.raw`(?:m[ií]nimos|baj[oa]s|baj[ií]sim[oa]s|reducid[oa]s|accesibles|econ[oó]mic[oa]s|razonables|moderad[oa]s|chic[oa]s|peque[ñn][oa]s)(?![a-záéíóúñ])`,
  "i"
);

export interface CommonExpensesReading {
  /** 0 = the description says there are none ("sin gastos comunes"). */
  commonExpenses: number;
  /** null with a zero, as the portals store "sin gastos comunes". */
  commonExpensesCurrency: RentalCurrency | null;
}

/** Why a description yields a figure or not: the hand-labelled sample counts each reason. */
export type CommonExpensesReason =
  | "stated" | "none" | "silent" | "included" | "not-monthly" | "ambiguous" | "unmarked" | "implausible" | "conditional" | "disputed";

/**
 * What the advert's own description says its gastos comunes are, or why it says nothing usable.
 * Precision first: two different figures, "incluidos" (or a total with them), the figure of a year,
 * a quarter or any period but a month, a bare number beside a dollar rent (pesos or dollars?), and a
 * figure under $ 200, above the rent or equal to it (the same band as Mercado Libre's spec table, in
 * pesos at the run's rate) all abstain. The rent itself is never read here.
 *
 * The zone statistics read the same words with their own rules (`zoneOwnCommonExpenses`,
 * propertyzones/project.ts), and they have the last word: "sin gastos comunes los primeros 6 meses"
 * is a discount, not a building without them, and a figure they would not accept is not published,
 * so the directory and the barrio's numbers never disagree about one advert.
 */
export function readCommonExpensesFromText(
  description: string | null | undefined,
  offer: { price: number; currency: RentalCurrency },
  usdUyu: number
): { reading: CommonExpensesReading | null; reason: CommonExpensesReason } {
  const text = String(description || "");
  if (!text.trim()) return { reading: null, reason: "silent" };
  if (GC_INCLUDED.test(text)) return { reading: null, reason: "included" };
  if (GC_NOT_MONTHLY.test(text)) return { reading: null, reason: "not-monthly" };
  const amounts = captionAmounts(text.replace(GC_QUALIFIED_NONE, " ").replace(GC_UNREPORTED, " "));
  if (amounts.commonExpensesAmbiguous) return { reading: null, reason: "ambiguous" };
  if (amounts.commonExpenses === null) return { reading: null, reason: "silent" };
  if (amounts.commonExpenses === 0) {
    if (GC_SMALL.test(text)) return { reading: null, reason: "disputed" };
    return zoneOwnCommonExpenses({ commonExpenses: null }, text).commonExpenses === 0
      ? { reading: { commonExpenses: 0, commonExpensesCurrency: null }, reason: "none" }
      : { reading: null, reason: "conditional" };
  }
  if (!amounts.commonExpensesMarked && offer.currency !== "UYU") return { reading: null, reason: "unmarked" };
  const plausible = mlDetailExpenses(
    { amount: amounts.commonExpenses, currency: amounts.commonExpensesCurrency ?? "UYU" },
    offer,
    usdUyu
  );
  // The rent itself, repeated under the label ("Alquiler $ 30.000 - Gastos comunes $ 30.000"), is no month of gastos comunes.
  if (!plausible || (plausible.commonExpensesCurrency === offer.currency && plausible.commonExpenses === offer.price)) {
    return { reading: null, reason: "implausible" };
  }
  const zone = zoneOwnCommonExpenses(plausible, text);
  return zone.commonExpenses === plausible.commonExpenses ? { reading: plausible, reason: "stated" } : { reading: null, reason: "disputed" };
}

/** The figure alone; `null` = abstain. */
export function commonExpensesFromText(
  description: string | null | undefined,
  offer: { price: number; currency: RentalCurrency },
  usdUyu: number
): CommonExpensesReading | null {
  return readCommonExpensesFromText(description, offer, usdUyu).reading;
}

type GcOffer = {
  source?: RentalSource;
  price?: number;
  currency?: RentalCurrency;
  commonExpenses?: number | null;
  commonExpensesCurrency?: RentalCurrency | null;
  commonExpensesSource?: RentalCommonExpensesSource;
  details?: { description?: string } | null;
};

export interface CommonExpensesState {
  commonExpenses: number | null;
  commonExpensesCurrency: RentalCurrency | null;
  commonExpensesSource?: RentalCommonExpensesSource;
}

export interface RentalTextFactsOptions {
  /** The run's dollar, for the plausibility band; without it a dollar figure or rent abstains. */
  usdUyu?: number;
  /** Overrides `RENTALS_GC_FROM_TEXT` (tests, the read-only sample). */
  gcFromText?: boolean;
}

/**
 * The advert's gastos comunes as today's rules read them, or `null` when this advert is not the
 * rule's business: a portal's own figure (no `commonExpensesSource`) is never touched, and neither
 * is a portal this reader does not measure. A figure read before from the description is read again
 * from today's description, and dropped when the flag is off or the description no longer says it.
 * Only the description that is PUBLISHED (`details.description`) is read, so the reader of the page
 * can find the figure the label points to.
 */
export function commonExpensesToday(offer: GcOffer, options: RentalTextFactsOptions = {}): CommonExpensesState | null {
  if (!offer.source || !GC_TEXT_SOURCES.has(offer.source)) return null;
  if (typeof offer.price !== "number" || (offer.currency !== "UYU" && offer.currency !== "USD")) return null;
  const fromText = offer.commonExpensesSource === "description";
  if (!fromText && offer.commonExpenses !== null) return null;
  const enabled = options.gcFromText ?? gcFromTextEnabled();
  const reading = enabled
    ? commonExpensesFromText(offer.details?.description, { price: offer.price, currency: offer.currency }, options.usdUyu ?? 0)
    : null;
  return reading ? { ...reading, commonExpensesSource: "description" } : { commonExpenses: null, commonExpensesCurrency: null };
}

/** Whether an advert's gastos comunes already stand as `today` says. */
export function sameCommonExpenses(offer: GcOffer, today: CommonExpensesState): boolean {
  return (offer.commonExpenses ?? null) === today.commonExpenses &&
    (offer.commonExpensesCurrency ?? null) === today.commonExpensesCurrency &&
    offer.commonExpensesSource === today.commonExpensesSource;
}

/** Applies `commonExpensesToday` to a copy of the advert: the source tag goes with the figure, or goes. */
export function withCommonExpenses<T extends GcOffer>(offer: T, today: CommonExpensesState): T {
  const { commonExpensesSource: _source, ...rest } = offer;
  return {
    ...rest,
    commonExpenses: today.commonExpenses,
    commonExpensesCurrency: today.commonExpensesCurrency,
    ...(today.commonExpensesSource ? { commonExpensesSource: today.commonExpensesSource } : {}),
  } as T;
}

type TextFactsListing = Pick<RawRental, "title" | "description" | "details" | "furnished" | "furnishedPortal" | "terms"> &
  Partial<Pick<RawRental, "source" | "price" | "currency" | "commonExpenses" | "commonExpensesCurrency" | "commonExpensesSource">>;

/**
 * The text facts on one freshly read advert. Idempotent. Gastos comunes only on an advert that
 * carries its source, rent and an empty figure (see `commonExpensesToday`).
 */
export function applyRentalTextFacts<T extends TextFactsListing>(listing: T, options: RentalTextFactsOptions = {}): T {
  const description = listing.description || listing.details?.description || "";
  const facts = {
    ...listing,
    furnished: combineFurnished(listing.furnishedPortal, furnishedFromText(listing.title, description)),
    terms: rentalTermsFromText(listing.title, description),
  };
  const expenses = commonExpensesToday(listing, options);
  return expenses && !sameCommonExpenses(listing, expenses) ? withCommonExpenses(facts, expenses) : facts;
}

/**
 * Many adverts about one home: each portal says what it says. Furnished only if some say so and none
 * says the opposite; the periods are every one any advert offers.
 */
export function aggregateFurnished(values: ReadonlyArray<boolean | null | undefined>): boolean | null {
  const yes = values.includes(true);
  const no = values.includes(false);
  return yes && !no ? true : no && !yes ? false : null;
}

export function aggregateTerms(values: ReadonlyArray<readonly RentalTerm[] | undefined>): RentalTerm[] {
  const all = new Set(values.flatMap((terms) => terms ?? []));
  return (["anual", "invernal"] as const).filter((term) => all.has(term));
}
