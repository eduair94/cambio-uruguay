// app/utils/importRules.ts
// Effective-dated rules for Uruguay's personal-import regime (envíos postales
// internacionales / courier "puerta a puerta"), resolved from a date instead of
// hard-coded — the same pattern as `ivaStatus.ts`.
//
// WHY THIS EXISTS: the regime was rewritten in 2026 (Ley 20.446 → Decreto 50/026 →
// RG DNA 09/2026), and one of its conditions is on a clock that has ALREADY been
// postponed twice. A bare constant cannot express "true today, false on 1 October",
// so the calculator silently keeps applying a rule after it stops being true. It
// was doing exactly that.
//
// EVERY NUMBER HERE IS SOURCED. Re-verified against primary sources on 2026-07-26:
//   - Ley 20.446 art. 627        https://www.impo.com.uy/bases/leyes/20446-2025/627
//   - Decreto 50/026 (19/03/2026) https://www.impo.com.uy/bases/decretos/50-2026
//   - RG DNA 09/2026 (20/04/2026) https://www.aduanas.gub.uy/innovaportal/file/28428/1/resolucion-9_2026.pdf
//   - RG DNA 21/2026 (25/06/2026) https://www.aduanas.gub.uy/innovaportal/file/28613/1/rg-21-2026.pdf
//   - TIFA, Ley 18.761 art. 7 (g) https://www.impo.com.uy/bases/leyes-internacional/18761-2011
//   - FAQ MEF (24/04/2026)        https://www.gub.uy/ministerio-economia-finanzas/comunicacion/noticias/guia-preguntas-frecuentes-sobre-regimen-envios-postales-franquicias
//
// DO NOT "fix" these against aduanas.gub.uy/innovaportal/v/27950 ("Encomiendas
// Postales"): that page still describes the REPEALED Decreto 356/014 (USD 10 minimum,
// USD 200 per shipment) and will "confirm" the very bugs this module removes.

/** Date the facts below were last verified against primary sources. */
export const LAST_RESEARCHED = '2026-07-26'

/**
 * From this date the IVA exoneration for US shipments additionally requires the INVOICE
 * ISSUER (the seller/platform, NOT the courier) to be registered with the DNA, and LUCIA
 * validates it automatically — no informal grace.
 *
 * Already postponed twice (RG 12/2026 → 2026-07-01; RG 21/2026 → 2026-10-01) and RG 21's
 * own recitals concede that "resta aún cumplir con varias etapas ineludibles", so a third
 * postponement is likely. When it moves, change THIS CONSTANT — nothing else.
 * Source: RG 21/2026 num. 1.
 *
 * DISCREPANCIA ABIERTA (2026-08-19), deliberadamente NO resuelta a favor de la fecha más tardía:
 * la RG DNA 26/2026 (13/08/2026) num. 10 prorroga al 2026-11-03 únicamente el numeral 13 del
 * Anexo I de la RG 09/2026 — la VALIDACIÓN AUTOMÁTICA de LUCIA —, no la exigibilidad del
 * requisito de fondo, que sigue en 2026-10-01. Así lo lee el baseline del backend
 * (classes/aduana/baseline.ts, ficha "factura-exigida"). Pero la pagina de franquicia de la DNA
 * le dice al público otra cosa: "A partir del 3 de noviembre de 2026 (…) para acceder a la
 * exoneración del IVA, será exigible que el emisor de la factura se encuentre registrado".
 * Quedan 33 días en disputa. Mantenemos 2026-10-01 porque es la lectura CONSERVADORA: cobrar el
 * IVA antes de tiempo sobreestima el costo, prometer la exoneración de más lo subestima, y en una
 * página de plata el error caro es el segundo. Si un humano confirma la lectura de la DNA, mover
 * esta constante Y la ficha del backend juntas.
 * https://www.aduanas.gub.uy/innovaportal/file/28724/1/rg-26-2026-exoneracion-iva-encomiendas-postales.pdf
 * https://www.aduanas.gub.uy/innovaportal/v/28221/1/innova.front/
 */
export const SELLER_REGISTRY_ENFORCED_FROM = '2026-10-01'

/** Annual franchise: USD 800 ACCUMULATED per calendar year (Decreto 50/026 art. 3 y 4 lit. c). */
export const FRANCHISE_ANNUAL_USD = 800

/** Franchise shipments: at most 3 per calendar year (Decreto 50/026 art. 4 lit. c). */
export const FRANCHISE_MAX_SHIPMENTS = 3

/**
 * Per-shipment weight ceiling of BOTH postal regimes, in kg (Decreto 50/026 arts. 1 y 2).
 *
 * It is a ceiling on the REGIME, not on the franquicia: a 25 kg parcel does not "pay the 60%
 * instead", it leaves the postal regimes altogether and needs DUA + despachante, exactly like a
 * shipment over USD 800. The DNA's operative page says the same. Splitting the parcel after it
 * arrived is not a right the norm provides.
 */
export const MAX_WEIGHT_KG = 20

/** Simplified single rate, % of the invoice value (Ley 20.446 art. 627). */
export const SIMPLIFIED_RATE_PCT = 60

/**
 * Minimum payable under the simplified regime, per shipment.
 *
 * USD 20 — NOT the USD 10 we shipped for months. The 10 is Decreto 356/014, repealed.
 * Ley 20.446 art. 627: "…con un pago mínimo de US$ 20 (veinte dólares…) por envío", and the
 * MEF's FAQ says the same ("El 60% del valor del envío, con un mínimo de USD 20").
 */
export const SIMPLIFIED_MIN_USD = 20

/**
 * US-origin shipments up to this invoice value keep the IVA exoneration (TIFA, Ley 18.761
 * art. 7 lit. g). ALL-OR-NOTHING: one dollar over and the whole shipment pays IVA — there is
 * no partial exemption. This is the ONLY meaning of "USD 200" in the regime; there is no
 * USD 200 per-shipment franchise cap (that too was Decreto 356/014).
 */
export const USA_IVA_EXEMPTION_USD = 200

/**
 * Floor on the IVA payable by a postal shipment, per shipment.
 *
 * Título 10 del T.O. 2023, art. 13 lit. B), inciso 3.º — added by **Ley 20.446 art. 660**, in
 * force since 1/1/2026 (Ley 20.446 art. 3): "Para las importaciones correspondientes al régimen de
 * envíos postales internacionales, las tasas se aplicarán sobre el valor de factura o declaración
 * de valor de mercadería. En ningún caso el monto a pagar por concepto de este impuesto podrá ser
 * inferior al equivalente a US$ 20 …, salvo que el envío postal esté integrado exclusivamente por
 * bienes cuya importación se encuentra exonerada de este impuesto."
 *
 * It bites in the FRANQUICIA branch — the only branch where IVA is liquidated on its own (LUCIA
 * even issues separate talones for the prestación única and the IVA). The prestación única has
 * its OWN US$ 20 minimum in art. 627 inciso 1, so reading art. 660 as belonging to that regime
 * would make it inoperative. The DNA restates it for the whole régimen de EPI in **RG DNA 11/2026,
 * Anexo I numeral 27** ("Para las importaciones correspondientes al régimen de EPI …").
 *
 * CAVEAT WE OWE THE READER: no consumer-facing official page mentions this floor when explaining
 * the franquicia — the MEF and DNA FAQs quote the US$ 20 only for the 60% regime, and there is no
 * official worked example of a taxed franquicia shipment. The norm is unambiguous; the
 * communication is not. The page says so instead of pretending certainty about the counter.
 *
 * The carve-out is what saves a books-only shipment. "Exclusivamente" is strict: one taxed item in
 * the box and the whole shipment loses it (RG 11/2026 num. 24 states the same rule for
 * consolidated shipments). Medicines do NOT qualify — they are taxed at the 10% tasa mínima, so a
 * medicines-only parcel pays the floor.
 *
 * Sources:
 *  - Ley 20.446 art. 660  https://www.impo.com.uy/bases/leyes/20446-2025/660
 *  - Título 10 art. 13    https://www.impo.com.uy/bases/todgi2023/101-2024/13_T10
 *  - RG DNA 11/2026       https://www.aduanas.gub.uy/innovaportal/file/28447/1/rg-11_2026.pdf
 */
export const POSTAL_IVA_MIN_USD = 20

/**
 * The subset of regime figures that can move — the amounts the backend tracks as facts, plus the
 * October enforcement date. Passing a `rules` overlay to `resolveRegime` / `isSellerRegistryEnforced`
 * lets the live `/api/aduana` values drive the calculator and the semáforo; the constants above are
 * the baseline fallback, assembled here into `DEFAULT_REGIME_RULES`. `FRANCHISE_MAX_SHIPMENTS` and
 * `MAX_WEIGHT_KG` stay static on purpose — the decree in play changes the date and the amounts, not
 * the 3-envíos / 20-kg structure. This is how the app stays a single source of truth WITHOUT ever
 * calling Gemini (it only reads its own /api/aduana proxy — noGeminiInApp stays green).
 */
export interface RegimeRules {
  franchiseAnnualUsd: number
  simplifiedRatePct: number
  simplifiedMinUsd: number
  usaIvaExemptionUsd: number
  /** Floor on the IVA of a postal shipment (see {@link POSTAL_IVA_MIN_USD}). */
  postalIvaMinUsd: number
  /** YYYY-MM-DD */
  sellerRegistryEnforcedFrom: string
}

export const DEFAULT_REGIME_RULES: RegimeRules = {
  franchiseAnnualUsd: FRANCHISE_ANNUAL_USD,
  simplifiedRatePct: SIMPLIFIED_RATE_PCT,
  simplifiedMinUsd: SIMPLIFIED_MIN_USD,
  usaIvaExemptionUsd: USA_IVA_EXEMPTION_USD,
  postalIvaMinUsd: POSTAL_IVA_MIN_USD,
  sellerRegistryEnforcedFrom: SELLER_REGISTRY_ENFORCED_FROM,
}

/**
 * How the shipment physically arrives. The decree does not distinguish modalities — but the
 * OPERATOR does, and the operator is who decides at the counter.
 *
 *  - `courier`        private door-to-door (DAC, UPS, FedEx, Gripper, Casilla Mía courier, Punto
 *                     Mío, Tiendamia…). The USD 800/3-shipment annual franquicia is the only ceiling.
 *  - `postal-ems`     Correo Uruguayo EMS (Express Mail Service). Tracking starts with E.
 *  - `postal-simple`  Correo Uruguayo NO exprés — the "PP, SIMPLE" modalities. This is where
 *                     AliExpress/Shein/Temu "envío gratis" and most Etsy/eBay standard shipping
 *                     land, and it is the channel our guides used to ignore entirely.
 */
export type ArrivalChannel = 'courier' | 'postal-ems' | 'postal-simple'

/**
 * The per-shipment franquicia ceilings that applied BY MODALITY until 30/04/2026 — and no longer.
 * `null` = no per-shipment ceiling for that channel even under the old regime.
 *
 * They are Decreto 356/014 art. 3 ("entrega no expresa … no supere … U$S 50,00") and art. 4
 * ("entrega expresa … no exceda los U$S 200,00"), DEROGADO by Decreto 50/026 art. 19, whose art.
 * 18 sets the full entry into force at 1/5/2026. The MEF's own comparison table files
 * "US$ 200 (Expreso) / US$ 50 (No expreso)" under "Régimen Actual (Hasta 30/04/2026)" and
 * replaces it with "Tope anual acumulado de US$ 800"; its FAQ adds "No es un tope por compra".
 *
 * WHY THEY ARE STILL HERE, then: two official pages keep publishing them, so readers keep hitting
 * them and believing them —
 *   - Correo Uruguayo, "Cómo declarar su compra u obsequio" (paso 3), still says franquicia only
 *     up to US$ 50 non-express / US$ 200 EMS, contradicting its own paso 4 (self-manage up to
 *     US$ 800), its own current FAQ, and the decree. https://www.correo.com.uy/como-declarar-su-compra-u-obsequio
 *   - DNA's "Encomiendas Postales" glossary (21/10/2025) repeats the same pair plus the US$ 10
 *     minimum.
 * The old regime really did bite: every reported case of "tenía franquicia y me cobraron igual"
 * we found (r/uruguay, oct-2025 — US$ 118 de AliExpress, US$ 75 cobrados; ene-2026 — Etsy Brasil)
 * predates 1/5/2026. We surface the discrepancy and tell the reader what to do if the Correo form
 * still refuses; we do NOT price a repealed rule. Same discipline as the note at the top of this
 * file about the DNA page.
 */
export const LEGACY_CHANNEL_FRANCHISE_CAP_USD: Record<ArrivalChannel, number | null> = {
  courier: null,
  'postal-ems': 200,
  'postal-simple': 50,
}

/** Last day the modality caps above were in force (Decreto 50/026 arts. 18 y 19). */
export const LEGACY_CHANNEL_CAPS_UNTIL = '2026-04-30'

/** Human label per channel, used in the reasons the resolver hands back to the page. */
export const CHANNEL_LABEL: Record<ArrivalChannel, string> = {
  courier: 'courier privado',
  'postal-ems': 'EMS del Correo (exprés)',
  'postal-simple': 'correo no exprés (PP, SIMPLE)',
}

/**
 * Which regime a shipment falls under. They are ALTERNATIVE, never combined.
 *
 * `exonerado` is not a fourth regime of the decree: it is the case where the MERCHANDISE carries
 * its own exoneration from every tax the import could trigger (books — Título 10 art. 41, Ley
 * 15.913 art. 8), so no regime has anything left to charge. It short-circuits the other three.
 */
export type CourierRegime = 'franquicia' | 'simplificado' | 'general' | 'exonerado'

/** Where the invoice was issued — drives the TIFA exoneration. */
export type ImportOrigin = 'usa' | 'other'

export interface RegimeInput {
  /**
   * The shipment's VALUE for every threshold: the invoice TOTAL, i.e. price + US sales tax +
   * any shipping the SELLER charges on that invoice (Decreto 50/026 art. 5: "el total de la
   * factura original de compra, incluidos todos los conceptos que figuren adicionados en la
   * misma"). The courier's own separately-billed freight is not part of the seller's invoice.
   */
  valueUsd: number
  /**
   * Shipment weight in kg. Over {@link MAX_WEIGHT_KG} neither postal regime applies, whatever the
   * invoice says. Omitted (or 0) means "not declared" and the weight rule is not applied.
   */
  weightKg?: number
  origin: ImportOrigin
  /** Franchise USD still unused this calendar year. */
  franchiseAvailableUsd: number
  /** Franchise shipments already used this calendar year. */
  shipmentsUsed: number
  /** Whether the reader asked to use their franchise on this shipment. */
  useFranchise: boolean
  /**
   * How far the merchandise's own import exoneration reaches. `'todo-tributo'` (books and
   * educational material) short-circuits every regime: there is no tax to charge.
   */
  exemption?: 'none' | 'iva' | 'todo-tributo'
  /**
   * The goods are excepted from the USD 800 annual cap (Decreto 50/026 art. 4, inciso final:
   * libros y medicamentos de uso personal con autorización del MSP), so a shipment of them does
   * not eat the reader's balance.
   */
  franchiseCapExempt?: boolean
  /**
   * How the parcel arrives. Defaults to `'courier'` — the historical behaviour of this module,
   * so every existing caller keeps its result until it opts in.
   */
  channel?: ArrivalChannel
  /** Is the invoice issuer registered with the DNA? Only consulted once enforcement starts. */
  sellerRegistered?: boolean
  /** Resolution date; defaults to today. Injectable so the rules are testable. */
  today?: Date
}

export interface RegimeDecision {
  regime: CourierRegime
  /** True when this shipment pays no IVA (US-origin, within the TIFA threshold). */
  ivaExempt: boolean
  /**
   * Set when the shipment left the postal regimes because it weighs more than
   * {@link MAX_WEIGHT_KG}, so the caller can say WHY instead of only "supera US$ 800".
   */
  overWeight?: boolean
  /** Machine-readable reasons, in the order they were decided. */
  reasons: string[]
  /** Whether the seller-registration condition is being enforced on `today`. */
  registryEnforced: boolean
  /**
   * True when the estimate chose prestación única only because the remaining annual balance is
   * smaller than this shipment. No published rule explains whether one shipment may consume the
   * balance and pay 60% on the rest, so the UI must show this as a conservative estimate.
   */
  partialFranchiseUnverified?: boolean
  /**
   * Present when the parcel arrives by post and would have BLOWN the repealed modality cap
   * (see {@link LEGACY_CHANNEL_FRANCHISE_CAP_USD}). The regime above is what the norm says; this
   * flag lets the page warn that Correo's declaration page still publishes the old ceiling, so
   * the form may refuse the franquicia and charge the 60% anyway.
   */
  legacyChannelCap?: { channel: ArrivalChannel; capUsd: number }
}

/** YYYY-MM-DD in UTC — date-only strings compare correctly with `<=`. */
export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Is the DNA seller-registration requirement exigible on `today`? Uses the live date if provided. */
export function isSellerRegistryEnforced(
  today: Date,
  rules: RegimeRules = DEFAULT_REGIME_RULES
): boolean {
  return toISODate(today) >= rules.sellerRegistryEnforcedFrom
}

/**
 * Decide which regime a shipment falls under, and whether it pays IVA.
 *
 * The three rules that the old code got wrong:
 *  - no published article says what happens when the remaining annual franchise balance is less
 *    than one shipment. The estimate applies prestación única to the full invoice because the
 *    sources provide no partial-allocation mechanism, but marks the result unverified. Decreto
 *    50/026 art. 15 is NOT authority for this case: it governs an incumplimiento tied to Ley
 *    20.446 art. 632. Never present the estimate as an explicit statutory "no split" rule;
 *  - the franchise ceiling is USD 800 ACCUMULATED PER YEAR across at most 3 shipments (Decreto
 *    50/026 art. 3 y art. 4 lit. c) — the NORM sets no per-shipment cap;
 *  - above USD 800 a shipment fits neither regime and goes to the general one (Decreto 50/026
 *    arts. 2 y 3), which this calculator does not attempt to price. The SAME is true above
 *    {@link MAX_WEIGHT_KG} kg: the two ceilings are independent, and blowing either one is
 *    enough — a 25 kg parcel of USD 60 is a formal import.
 *
 * The modality (express vs non-express) has NO fiscal consequence since 1/5/2026 — Decreto 50/026
 * art. 1 covers "operadores postales, públicos o privados" alike, one regime and one franquicia
 * counter for Correo and for a private courier. Passing `channel` never changes the regime; it
 * only raises {@link RegimeDecision.legacyChannelCap} so the page can warn the reader that the
 * Correo form still publishes the repealed per-modality ceiling.
 */
export function resolveRegime(
  input: RegimeInput,
  rules: RegimeRules = DEFAULT_REGIME_RULES
): RegimeDecision {
  const today = input.today ?? new Date()
  const registryEnforced = isSellerRegistryEnforced(today, rules)
  const value = Math.max(input.valueUsd || 0, 0)
  const reasons: string[] = []

  // Heads-up, never a rule: the modality cap the Correo form may still apply (repealed 30/4/2026).
  const channel = input.channel ?? 'courier'
  const legacyCap = LEGACY_CHANNEL_FRANCHISE_CAP_USD[channel]
  const legacyChannelCap =
    input.useFranchise && legacyCap !== null && value > legacyCap
      ? { channel, capUsd: legacyCap }
      : undefined

  // Neither regime reaches past USD 800 nor past 20 kg (Decreto arts. 1, 2 y 3): formal import.
  // The two ceilings are independent — either one on its own throws the shipment out.
  const weight = Math.max(input.weightKg || 0, 0)
  const overWeight = weight > MAX_WEIGHT_KG
  const overValue = value > rules.franchiseAnnualUsd

  // The merchandise carries its own exoneration of EVERY tax the import can trigger. This is
  // decided BEFORE the regimes, because it survives all of them: the prestación única is an
  // option the taxpayer "podrá optar por pagar" (Ley 20.446 art. 627), not a tax that displaces
  // an exoneration granted by law. The 20 kg ceiling still applies — it is a ceiling on the
  // postal REGIME, not on the exoneration, so an over-weight parcel of books is exonerated but
  // needs a formal despacho.
  if (input.exemption === 'todo-tributo' && !overWeight) {
    reasons.push(
      'La importación de libros y material educativo está exonerada de todo tributo nacional, incluidos los gravámenes aduaneros y las tasas consulares (Título 10 del T.O. 2023, art. 41; Ley 15.913 art. 8).'
    )
    reasons.push(
      `Tampoco corre el mínimo de US$ ${rules.postalIvaMinUsd} de IVA: no se aplica cuando el envío está integrado exclusivamente por bienes cuya importación está exonerada (Título 10, art. 13 lit. B).`
    )
    if (overValue) {
      reasons.push(
        `El envío supera los US$ ${rules.franchiseAnnualUsd} del régimen postal. La exoneración del libro no depende de ese tope, pero las normas no están armonizadas: la Ley 15.913 art. 8 dispensa del despachante hasta US$ 1.000 de factura por envíos postales, y el régimen postal se corta en US$ ${rules.franchiseAnnualUsd}. Consultá a la Aduana antes de comprar.`
      )
    }
    return { regime: 'exonerado', ivaExempt: true, reasons, registryEnforced }
  }

  if (overValue || overWeight) {
    if (overValue) {
      reasons.push(
        `El envío supera US$ ${rules.franchiseAnnualUsd}: no entra en franquicia ni en el régimen simplificado.`
      )
    }
    if (overWeight) {
      reasons.push(
        `El envío pesa ${weight} kg y el tope de los regímenes postales es ${MAX_WEIGHT_KG} kg por envío: va por el régimen general, con DUA y despachante.`
      )
    }
    return {
      regime: 'general',
      ivaExempt: false,
      reasons,
      registryEnforced,
      overWeight: overWeight || undefined,
    }
  }

  // Books and MSP-authorised personal medicines are excepted from the USD 800 cap (Decreto 50/026
  // art. 4, inciso final) AND from the 3-shipment count: RG DNA 11/2026 num. 26 excepts them from
  // num. 25 lit. b) V, the requirement that carries BOTH limits ("Hasta 3 envíos por año civil …
  // no debiendo la sumatoria … exceder los US$ 800 … anuales"), and from lit. b) VI (the duty to
  // document the value). The DNA says the same in prose: books enter "sin restricción de
  // frecuencia en el año civil siempre y cuando el valor de factura no supere los USD 1.000".
  const capExempt = input.franchiseCapExempt === true
  const franchiseFits = capExempt || input.franchiseAvailableUsd >= value
  const shipmentsLeft = capExempt || input.shipmentsUsed < FRANCHISE_MAX_SHIPMENTS
  const useFranchise = input.useFranchise && franchiseFits && shipmentsLeft
  const partialFranchiseUnverified =
    input.useFranchise &&
    shipmentsLeft &&
    !franchiseFits &&
    !capExempt &&
    input.franchiseAvailableUsd > 0

  if (input.useFranchise && !shipmentsLeft) {
    reasons.push(`Ya usaste los ${FRANCHISE_MAX_SHIPMENTS} envíos con franquicia del año.`)
  }
  if (input.useFranchise && capExempt) {
    reasons.push(
      `No consume el cupo: ni los US$ ${rules.franchiseAnnualUsd} del año ni los ${FRANCHISE_MAX_SHIPMENTS} envíos. El Decreto 50/026 art. 4 exceptúa del tope a los libros y a los medicamentos de uso personal autorizados por el MSP, y la RG DNA 11/2026 (num. 26) los exceptúa del requisito que contiene los dos límites.`
    )
  }
  if (input.useFranchise && shipmentsLeft && !franchiseFits) {
    reasons.push(
      `Te quedan US$ ${input.franchiseAvailableUsd} de franquicia y el envío vale US$ ${value}. Las fuentes oficiales no publican un mecanismo para dividir el mismo envío entre ese saldo y la prestación única; esta estimación aplica un solo régimen al valor completo.`
    )
  }

  if (!useFranchise) {
    reasons.push(
      `Paga la prestación única: ${rules.simplifiedRatePct}% del valor, mínimo US$ ${rules.simplifiedMinUsd}.`
    )
    return {
      regime: 'simplificado',
      ivaExempt: false,
      reasons,
      registryEnforced,
      partialFranchiseUnverified: partialFranchiseUnverified || undefined,
      legacyChannelCap,
    }
  }

  // Franchise: exempt from aranceles, but IVA still applies — except the TIFA carve-out.
  const withinUsaThreshold = input.origin === 'usa' && value <= rules.usaIvaExemptionUsd
  const sellerOk = !registryEnforced || input.sellerRegistered === true
  const ivaExempt = withinUsaThreshold && sellerOk

  reasons.push('Entra en la franquicia anual: exenta de aranceles.')
  if (input.origin === 'usa' && value > rules.usaIvaExemptionUsd) {
    reasons.push(
      `La exoneración de IVA de EE.UU. es hasta US$ ${rules.usaIvaExemptionUsd} y es todo o nada: por US$ ${value} pagás IVA sobre el total.`
    )
  }
  if (withinUsaThreshold && registryEnforced && input.sellerRegistered !== true) {
    reasons.push(
      `Desde el ${rules.sellerRegistryEnforcedFrom} la exoneración exige que el vendedor esté registrado ante la Aduana. Si no lo está, el envío paga IVA.`
    )
  }
  if (ivaExempt) reasons.push(`Sin IVA: compra en EE.UU. de hasta US$ ${rules.usaIvaExemptionUsd}.`)

  return { regime: 'franquicia', ivaExempt, reasons, registryEnforced, legacyChannelCap }
}
