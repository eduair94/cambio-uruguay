// app/utils/commercialImport.ts
//
// Importing TO RESELL (e-commerce, revendedor, emprendimiento) — the case the rest of
// the import cluster deliberately does NOT model. `importRules.ts` answers "¿mi compra
// personal paga IVA?"; this module answers the four questions a first-time importer
// actually asks:
//
//   1. ¿Necesito despachante de aduana, y en qué caso?
//   2. ¿Necesito empresa (unipersonal) antes de importar, o después?
//   3. ¿Dónde y cómo se paga el 60%?
//   4. ¿Mi producto necesita algún trámite extra?
//
// WHY IT IS SEPARATE: the popular answer ("hasta USD 800 y 20 kg no necesitás
// despachante") is TRUE but incomplete, and the popular counter-answer ("siempre
// necesitás despachante para importar") is TRUE for a different route. Both people in
// the argument are right about different regimes. Modelling the ROUTE — not the tax —
// is what makes the contradiction disappear.
//
// EVERY NUMBER AND EVERY RULE HERE IS SOURCED. Verified against primary sources on
// 2026-08-08 (see `COMMERCIAL_IMPORT_SOURCES`). Two hard-won facts that contradict
// most of what is written about this online:
//
//   - The prestación única del 60% is EXPRESSLY open to companies. Decreto 50/026
//     art. 2 says "Los titulares, sean personas físicas o jurídicas"; the DNA's own
//     page repeats "Se pueden amparar personas jurídicas o personas físicas de
//     cualquier edad". The "uso personal y sin fines comerciales" condition lives in
//     arts. 3 y 4 — the FRANQUICIA — and nowhere else. So yes: you can legally import
//     stock to resell by courier at 60%, without a despachante, forever, as long as
//     each shipment stays inside USD 800 / 20 kg.
//   - What actually caps a persona física is the DUA, not the courier: "Las personas
//     físicas podrán realizar únicamente hasta dos Documento Único Aduanero (DUA) por
//     año" (DNA). That is the real reason a recurring importer ends up with a company.
//
// PURE data + functions (no Vue/Nuxt runtime) so vitest can exercise them in plain Node.
// Reference material, NOT professional advice — the page renders that disclaimer.

/** Date every fact below was last checked against its primary source. */
export const LAST_RESEARCHED = '2026-08-08'

/* -------------------------------------------------------------------------- */
/* Sources                                                                     */
/* -------------------------------------------------------------------------- */

export interface CommercialImportSource {
  id: string
  label: string
  authority: string
  url: string
  /** `norma` = law/decree text; `pagina-oficial` = a State page that asserts it without citing an article. */
  kind: 'norma' | 'pagina-oficial' | 'consulta-dgi' | 'operador'
}

export const COMMERCIAL_IMPORT_SOURCES: Readonly<Record<string, CommercialImportSource>> =
  Object.freeze({
    'decreto-50-026': {
      id: 'decreto-50-026',
      label:
        'Decreto 50/026 — art. 2 (prestación única, "personas físicas o jurídicas"), art. 3 y 4 (franquicia, uso personal), art. 5 (valor de factura), art. 7 (exclusiones), art. 8 (operadores postales responsables por obligaciones de terceros), art. 14 (abandono)',
      authority: 'IMPO',
      url: 'https://www.impo.com.uy/bases/decretos-originales/50-2026',
      kind: 'norma',
    },
    'ley-20446-627': {
      id: 'ley-20446-627',
      label: 'Ley 20.446 art. 627 — prestación única del 60%, mínimo US$ 20 por envío',
      authority: 'IMPO',
      url: 'https://www.impo.com.uy/bases/leyes/20446-2025/627',
      kind: 'norma',
    },
    'dna-prestacion-unica': {
      id: 'dna-prestacion-unica',
      label:
        'DNA — "Régimen tributario con prestación única (60%)": se amparan personas jurídicas o físicas de cualquier edad; el pago se hace a través del operador postal',
      authority: 'Dirección Nacional de Aduanas',
      url: 'https://www.aduanas.gub.uy/innovaportal/v/28222/1/innova.front/',
      kind: 'pagina-oficial',
    },
    'dna-regimen-general': {
      id: 'dna-regimen-general',
      label:
        'DNA — "Importación Régimen General – DUA Importación": despachante preceptivo; las personas físicas pueden hacer hasta dos DUA por año',
      authority: 'Dirección Nacional de Aduanas',
      url: 'https://www.aduanas.gub.uy/innovaportal/v/28223/1/innova.front/',
      kind: 'pagina-oficial',
    },
    'dna-franquicia': {
      id: 'dna-franquicia',
      label:
        'DNA — "Régimen de Franquicia (vigente desde 1º de mayo de 2026)": el destinatario debe ser persona física mayor de edad (no puede ser persona jurídica) y sólo para uso personal, no comercial',
      authority: 'Dirección Nacional de Aduanas',
      url: 'https://www.aduanas.gub.uy/innovaportal/v/28221/1/innova.front/',
      kind: 'pagina-oficial',
    },
    'ley-19535-265': {
      id: 'ley-19535-265',
      label:
        'Ley 19.535 art. 265 — tasa consular: 5% extrazona y 3% Mercosur sobre el valor en aduana, con facultad de reducirla 0,5 puntos por año desde 2020',
      authority: 'IMPO',
      url: 'https://www.impo.com.uy/bases/leyes/19535-2017/265',
      kind: 'norma',
    },
    'dgi-consulta-6410': {
      id: 'dgi-consulta-6410',
      label:
        'DGI Consulta 6.410 — pequeña empresa (literal E) con giro importador: paga IVA importación (código 550) y anticipo de IVA importación (código 551); el anticipo se descuenta del IVA mínimo mensual. Reproducida por GPA: no localizamos una URL estable de dgi.gub.uy para esta consulta',
      authority: 'DGI (vía GPA)',
      url: 'https://www.gpa.uy/posts/informes/6157-dgi-pequena-empresa-con-giro-importador-iva-consulta-6-410/',
      kind: 'consulta-dgi',
    },
    'decreto-220-998': {
      id: 'decreto-220-998',
      label:
        'Decreto 220/998 (reglamentación del IVA) — art. 132: los amparados por el monotributo pagan el IVA como no contribuyentes en el momento de la importación; art. 116 lit. c: esas importaciones no llevan anticipo',
      authority: 'IMPO',
      url: 'https://www.impo.com.uy/bases/decretos/220-1998',
      kind: 'norma',
    },
    'ursec-tramite': {
      id: 'ursec-tramite',
      label:
        'gub.uy / URSEC — certificado para ingresar equipos radioeléctricos: "no es necesaria la intervención de URSEC para el ingreso al país de dispositivos que operen únicamente con las tecnologías Wifi4, Wifi5 y Wifi6 y/o Bluetooth"',
      authority: 'URSEC',
      url: 'https://www.gub.uy/tramites/certificado-habilitar-ingreso-pais-equipos-radioelectricos-bajo-regimen-importacion-empresa',
      kind: 'pagina-oficial',
    },
    'vuce-ursec': {
      id: 'vuce-ursec',
      label:
        'VUCE — trámite URSE/URSEC de autorización de equipamiento radioeléctrico: alcance, nómina de equipos homologados y pasos',
      authority: 'VUCE',
      url: 'https://vuce.gub.uy/urse2/',
      kind: 'pagina-oficial',
    },
    'ursea-rspebt': {
      id: 'ursea-rspebt',
      label:
        'URSEA — Reglamento de Seguridad de Productos Eléctricos de Baja Tensión: alcance (>50 V c.a. / >75 V c.c.) y listado de productos de los Anexos II, V y VI que requieren autorización previa',
      authority: 'URSEA',
      url: 'https://www.gub.uy/unidad-reguladora-servicios-energia-agua/productos-electricos',
      kind: 'pagina-oficial',
    },
    'ursea-tramite': {
      id: 'ursea-tramite',
      label:
        'gub.uy / URSEA — "Autorización de productos eléctricos de baja tensión" (fabricantes o importadores), sin costo, se tramita por VUCE',
      authority: 'URSEA',
      url: 'https://www.gub.uy/tramites/autorizacion-productos-electricos-baja-tension',
      kind: 'pagina-oficial',
    },
    'vuce-arancel': {
      id: 'vuce-arancel',
      label: 'VUCE — Consulta de Arancel: el arancel y los tributos vigentes por código NCM',
      authority: 'VUCE',
      url: 'https://vuce.gub.uy/consulta-de-arancel/',
      kind: 'pagina-oficial',
    },
    'gripper-baterias': {
      id: 'gripper-baterias',
      label:
        'Gripper (operador postal) — "No se permite el transporte de baterías de litio sueltas (sin el dispositivo correspondiente)"',
      authority: 'Gripper',
      url: 'https://soporte.gripper.com.uy/articulos/envios-con-restricciones/64/puedo-enviar-baterias',
      kind: 'operador',
    },
  })

/** Look up sources by id, dropping ids that do not exist. */
export function commercialImportSources(ids: readonly string[]): CommercialImportSource[] {
  return ids
    .map(id => COMMERCIAL_IMPORT_SOURCES[id])
    .filter((s): s is CommercialImportSource => Boolean(s))
}

/* -------------------------------------------------------------------------- */
/* Figures                                                                     */
/* -------------------------------------------------------------------------- */

/** Per-shipment invoice ceiling of the postal regimes, in USD (Decreto 50/026 arts. 2 y 3). */
export const POSTAL_MAX_INVOICE_USD = 800

/** Per-shipment weight ceiling of the postal regimes, in kg (Decreto 50/026 arts. 1 y 2). */
export const POSTAL_MAX_WEIGHT_KG = 20

/** Prestación única: % of the invoice value (Ley 20.446 art. 627). */
export const SIMPLIFIED_RATE_PCT = 60

/** Prestación única: minimum payable per shipment, in USD (Ley 20.446 art. 627). */
export const SIMPLIFIED_MIN_USD = 20

/**
 * How many DUA a persona física may file per year before it has to become a registered
 * taxpayer-importer. The DNA publishes it flatly; we have NOT located the article that
 * establishes it, and say so wherever it is shown (same discipline as `aduanaFaq.ts`).
 */
export const PERSONA_FISICA_MAX_DUA_PER_YEAR = 2

/** IVA tasa básica, % (Título 10). Used only as the default of the general-regime estimator. */
export const IVA_BASICA_PCT = 22

/**
 * Tasa consular, % of the valor en aduana (Ley 19.535 art. 265).
 *
 * The same article empowered the Executive to cut it 0,5 points a year from 2020 down to
 * 2% (extrazona) and 0% (Mercosur). We could NOT find a public decree confirming how far
 * that reduction has actually been applied as of {@link LAST_RESEARCHED}, so the estimator
 * uses the statutory rates and the page tells the reader to confirm the live figure. Never
 * present these as "the rate you will pay".
 */
export const TASA_CONSULAR_EXTRAZONA_PCT = 5
export const TASA_CONSULAR_MERCOSUR_PCT = 3

/* -------------------------------------------------------------------------- */
/* Which route does this shipment take?                                        */
/* -------------------------------------------------------------------------- */

/**
 * The three ways stock can legally enter the country:
 *  - `prestacion-unica` — postal/courier, 60% flat, no DUA, no despachante.
 *  - `regimen-general`  — DUA + despachante; the only route above USD 800 / 20 kg.
 *  - `franquicia`       — NEVER available for resale (personal use only). Modelled so the
 *                         resolver can say "no" out loud instead of staying silent.
 */
export type ResaleRoute = 'prestacion-unica' | 'regimen-general' | 'franquicia'

export interface ResaleRouteInput {
  /** Invoice TOTAL of the shipment in USD (Decreto 50/026 art. 5: everything added on the invoice). */
  invoiceUsd: number
  /** Weight of the shipment in kg. */
  weightKg: number
  /** Goods taxed by IMESI (alcohol, tobacco, cosmetics…) — excluded from the postal regimes. */
  imesi?: boolean
  /**
   * The goods need an authorisation from another agency (URSEC, URSEA, MSP, MGAP…) and it has
   * NOT been obtained. Decreto 50/026 art. 7 excludes those goods from the postal regimes;
   * WITH the authorisation in hand they are back in.
   */
  missingAgencyAuthorization?: boolean
  /** Goods a postal operator will not carry at all (e.g. loose lithium batteries). */
  carrierRefuses?: boolean
}

export interface ResaleRouteDecision {
  route: ResaleRoute
  /** Does a despachante de aduana have to intervene? */
  despachante: boolean
  /** Does the operation need a DUA? */
  dua: boolean
  /** Ordered, human-readable reasons — the page renders them verbatim. */
  reasons: string[]
  /** Blocking problems that must be solved before ANY route works. */
  blockers: string[]
  /** Source ids backing this decision. */
  sourceIds: string[]
}

/**
 * Decide how a shipment of goods bought TO RESELL enters Uruguay.
 *
 * The franquicia is never returned: Decreto 50/026 art. 4 requires "uso personal y sin fines
 * comerciales" and the DNA adds that the addressee "no puede ser persona jurídica". Resale is
 * outside it by definition, so the answer is always one of the other two routes.
 */
export function resolveResaleRoute(input: ResaleRouteInput): ResaleRouteDecision {
  const invoice = Math.max(input.invoiceUsd || 0, 0)
  const weight = Math.max(input.weightKg || 0, 0)
  const reasons: string[] = []
  const blockers: string[] = []
  const sourceIds = ['decreto-50-026', 'dna-prestacion-unica', 'dna-regimen-general']

  if (input.carrierRefuses) {
    blockers.push(
      'El operador postal no transporta esta mercadería, así que el envío puerta a puerta no es una opción por más que los montos den: tiene que entrar como carga, con DUA y despachante.'
    )
    sourceIds.push('gripper-baterias')
  }

  if (input.missingAgencyAuthorization) {
    blockers.push(
      'Falta la autorización del organismo competente. El Decreto 50/026 art. 7 deja fuera de los regímenes postales a la mercadería que requiere una autorización y no la tiene: sin el certificado no entra ni pagando el 60%.'
    )
  }

  const overValue = invoice > POSTAL_MAX_INVOICE_USD
  const overWeight = weight > POSTAL_MAX_WEIGHT_KG

  if (overValue) {
    reasons.push(
      `El envío factura US$ ${round2(invoice)} y el tope de los regímenes postales es US$ ${POSTAL_MAX_INVOICE_USD}.`
    )
  }
  if (overWeight) {
    reasons.push(
      `El envío pesa ${round2(weight)} kg y el tope de los regímenes postales es ${POSTAL_MAX_WEIGHT_KG} kg.`
    )
  }
  if (input.imesi) {
    reasons.push(
      'La mercadería está gravada por IMESI, y el Decreto 50/026 art. 7 la excluye de los regímenes postales.'
    )
  }

  const forcedToGeneral =
    overValue || overWeight || Boolean(input.imesi) || Boolean(input.carrierRefuses)

  if (forcedToGeneral) {
    reasons.push(
      'Va por Régimen General: DUA y despachante de aduana. Según la DNA, "la intervención del Despachante de Aduana en el Régimen de importación es preceptiva".'
    )
    reasons.push(
      `Ojo con el cupo: la DNA publica que "las personas físicas podrán realizar únicamente hasta ${PERSONA_FISICA_MAX_DUA_PER_YEAR} Documento Único Aduanero (DUA) por año". Para importar seguido hay que hacerlo con empresa.`
    )
    return { route: 'regimen-general', despachante: true, dua: true, reasons, blockers, sourceIds }
  }

  reasons.push(
    `Entra por la prestación única: ${SIMPLIFIED_RATE_PCT}% del valor de factura, mínimo US$ ${SIMPLIFIED_MIN_USD} por envío.`
  )
  reasons.push(
    'Sí, aunque sea para revender: el Decreto 50/026 art. 2 habla de "los titulares, sean personas físicas o jurídicas" y no exige uso personal. Esa condición es de la franquicia (arts. 3 y 4), que acá no se usa.'
  )
  reasons.push('No hace falta despachante de aduana ni DUA en esta vía.')
  return { route: 'prestacion-unica', despachante: false, dua: false, reasons, blockers, sourceIds }
}

/* -------------------------------------------------------------------------- */
/* What does each route cost?                                                  */
/* -------------------------------------------------------------------------- */

export interface LandedCostInput {
  /** Invoice value of the goods, USD. */
  invoiceUsd: number
  /** Freight the carrier bills you separately, USD. Part of the valor en aduana (CIF). */
  freightUsd?: number
  /** Insurance, USD. Part of the valor en aduana (CIF). */
  insuranceUsd?: number
  /** Arancel for the NCM code, %. There is no single rate — look it up per product. */
  arancelPct?: number
  /** IVA rate, %. Defaults to the tasa básica. */
  ivaPct?: number
  /** Tasa consular, %. Defaults to the extrazona statutory rate. */
  tasaConsularPct?: number
  /** Despachante fees, terminal, storage and the rest, USD. */
  clearingCostsUsd?: number
}

export interface LandedCostLine {
  label: string
  amountUsd: number
  note?: string
}

export interface LandedCostResult {
  /** Total paid to the State (and the despachante, when it applies), on top of the goods. */
  chargesUsd: number
  /** Goods + charges. */
  totalUsd: number
  /** Charges as a % of the invoice value — the number people actually compare. */
  effectivePct: number
  lines: LandedCostLine[]
}

/** Prestación única: 60% of the invoice, never below the per-shipment minimum. */
export function estimatePrestacionUnica(invoiceUsd: number): LandedCostResult {
  const invoice = Math.max(invoiceUsd || 0, 0)
  const raw = (invoice * SIMPLIFIED_RATE_PCT) / 100
  const charges = Math.max(raw, SIMPLIFIED_MIN_USD)
  const lines: LandedCostLine[] = [
    {
      label: `Prestación única (${SIMPLIFIED_RATE_PCT}% del valor de factura)`,
      amountUsd: round2(raw),
      note:
        charges > raw
          ? `Se aplica el mínimo de US$ ${SIMPLIFIED_MIN_USD} por envío, que es mayor.`
          : 'Reemplaza arancel, IVA y tasas: es un pago único.',
    },
  ]
  if (charges > raw) {
    lines.push({
      label: `Mínimo por envío`,
      amountUsd: round2(charges - raw),
      note: `Ley 20.446 art. 627: mínimo US$ ${SIMPLIFIED_MIN_USD} por envío.`,
    })
  }
  return {
    chargesUsd: round2(charges),
    totalUsd: round2(invoice + charges),
    effectivePct: invoice > 0 ? round2((charges / invoice) * 100) : 0,
    lines,
  }
}

/**
 * Régimen general, estimated. Structure only — the arancel depends on the NCM code and the
 * tasa consular on a reduction we could not confirm, so both are INPUTS, never guesses.
 *
 * Base: valor en aduana ≈ CIF (mercadería + flete + seguro). IVA is charged over the valor en
 * aduana plus the arancel, i.e. the duties go into the IVA base — that is why the effective
 * percentage is higher than "arancel + IVA".
 *
 * NOT modelled, deliberately: the anticipo de IVA a la importación (DGI código 551). It exists
 * and it is real cash at the border, but it is an ADVANCE — a literal E discounts it from its
 * monthly IVA mínimo and an IRAE taxpayer credits it — and we could not verify its rate against
 * a primary source. Showing it as a cost would overstate the route; showing it at a made-up rate
 * would be worse. The page says it out loud instead.
 */
export function estimateRegimenGeneral(input: LandedCostInput): LandedCostResult {
  const invoice = Math.max(input.invoiceUsd || 0, 0)
  const freight = Math.max(input.freightUsd || 0, 0)
  const insurance = Math.max(input.insuranceUsd || 0, 0)
  const arancelPct = Math.max(input.arancelPct ?? 0, 0)
  const ivaPct = Math.max(input.ivaPct ?? IVA_BASICA_PCT, 0)
  const consularPct = Math.max(input.tasaConsularPct ?? TASA_CONSULAR_EXTRAZONA_PCT, 0)
  const clearing = Math.max(input.clearingCostsUsd || 0, 0)

  const customsValue = invoice + freight + insurance
  const arancel = (customsValue * arancelPct) / 100
  const consular = (customsValue * consularPct) / 100
  const ivaBase = customsValue + arancel + consular
  const iva = (ivaBase * ivaPct) / 100
  const charges = arancel + consular + iva + clearing

  const lines: LandedCostLine[] = [
    {
      label: 'Valor en aduana (mercadería + flete + seguro)',
      amountUsd: round2(customsValue),
      note: 'Es la base de todo lo demás, no sólo el precio de la mercadería.',
    },
    {
      label: `Arancel (${round2(arancelPct)}%)`,
      amountUsd: round2(arancel),
      note: 'Depende del código NCM de cada producto: consultalo antes de comprar.',
    },
    {
      label: `Tasa consular (${round2(consularPct)}%)`,
      amountUsd: round2(consular),
      note: 'Ley 19.535 art. 265. Confirmá la alícuota vigente: la ley habilitó reducciones graduales.',
    },
    {
      label: `IVA (${round2(ivaPct)}%)`,
      amountUsd: round2(iva),
      note: 'Se calcula sobre el valor en aduana MÁS el arancel y la tasa, no sobre la mercadería sola.',
    },
  ]
  if (clearing > 0) {
    lines.push({
      label: 'Despacho (honorarios, terminal, depósito)',
      amountUsd: round2(clearing),
      note: 'Lo cotiza el despachante; no es un tributo.',
    })
  }

  return {
    chargesUsd: round2(charges),
    totalUsd: round2(invoice + freight + insurance + charges),
    effectivePct: invoice > 0 ? round2((charges / invoice) * 100) : 0,
    lines,
  }
}

export interface RouteComparison {
  simplified: LandedCostResult
  general: LandedCostResult
  /** Which route lands the goods cheaper. `null` when the postal route is not available. */
  cheaper: 'prestacion-unica' | 'regimen-general' | null
  /** How much the cheaper route saves, USD. `0` when the postal route is not available. */
  savingUsd: number
  /** True when the shipment cannot use the postal route at all, so there is nothing to compare. */
  postalUnavailable: boolean
}

/**
 * Compare both routes on the same shipment.
 *
 * The comparison is only meaningful when the shipment COULD go either way — under USD 800 and
 * 20 kg. Above that the postal route does not exist and `postalUnavailable` says so; the caller
 * must not render a "you would have saved X" that is not on the table.
 */
export function compareRoutes(input: LandedCostInput & { weightKg?: number }): RouteComparison {
  const invoice = Math.max(input.invoiceUsd || 0, 0)
  const weight = Math.max(input.weightKg || 0, 0)
  const postalUnavailable = invoice > POSTAL_MAX_INVOICE_USD || weight > POSTAL_MAX_WEIGHT_KG

  const simplified = estimatePrestacionUnica(invoice)
  const general = estimateRegimenGeneral(input)

  if (postalUnavailable) {
    return { simplified, general, cheaper: null, savingUsd: 0, postalUnavailable }
  }
  const diff = round2(Math.abs(simplified.chargesUsd - general.chargesUsd))
  return {
    simplified,
    general,
    cheaper: simplified.chargesUsd <= general.chargesUsd ? 'prestacion-unica' : 'regimen-general',
    savingUsd: diff,
    postalUnavailable,
  }
}

/**
 * Invoice value (USD) at which the general regime stops being more expensive than the flat 60%,
 * ignoring the per-shipment minimum. `null` when the general regime is cheaper at every value
 * (its percentage is already below 60%) or when the inputs make the answer meaningless.
 *
 * Useful because the fixed costs of a DUA (despachante, terminal) are per SHIPMENT: the bigger
 * the shipment, the more they dilute — which is the whole reason a growing seller switches route.
 */
export function breakEvenInvoiceUsd(input: Omit<LandedCostInput, 'invoiceUsd'>): number | null {
  const freight = Math.max(input.freightUsd || 0, 0)
  const insurance = Math.max(input.insuranceUsd || 0, 0)
  const arancelPct = Math.max(input.arancelPct ?? 0, 0)
  const ivaPct = Math.max(input.ivaPct ?? IVA_BASICA_PCT, 0)
  const consularPct = Math.max(input.tasaConsularPct ?? TASA_CONSULAR_EXTRAZONA_PCT, 0)
  const clearing = Math.max(input.clearingCostsUsd || 0, 0)

  // charges(v) = k * (v + F) + clearing, with k the combined ad-valorem load on the customs value.
  const k =
    arancelPct / 100 +
    consularPct / 100 +
    (ivaPct / 100) * (1 + arancelPct / 100 + consularPct / 100)
  const flat = SIMPLIFIED_RATE_PCT / 100
  const fixed = freight + insurance

  // k*(v + fixed) + clearing = flat*v  →  v = (k*fixed + clearing) / (flat - k)
  if (k >= flat) return null
  const v = (k * fixed + clearing) / (flat - k)
  if (!Number.isFinite(v) || v <= 0) return null
  return round2(v)
}

/* -------------------------------------------------------------------------- */
/* Do my products need an extra procedure?                                     */
/* -------------------------------------------------------------------------- */

export type ProcedureVerdict = 'no-requiere' | 'requiere' | 'consultar' | 'bloqueante'

export interface ProductCheck {
  id: string
  label: string
  icon: string
  /** One-line answer, used as the chip/summary. */
  verdict: ProcedureVerdict
  /** The organisations involved, if any. */
  organisms: readonly string[]
  /** Why — written to be read by someone who has never imported. */
  detail: string
  sourceIds: readonly string[]
}

/**
 * The accessories people actually start an e-commerce with, and what each one triggers.
 *
 * The two findings worth the page's existence:
 *  - a plain USB wall charger needs NO prior authorisation. URSEA's RSPEBT covers it by
 *    voltage, but the list of products that need an authorisation BEFORE selling (Anexos II,
 *    V y VI) is closed and "cargadores"/"fuentes de alimentación" are not on it. Plug
 *    ADAPTERS and extension cords ARE — the very thing a first-time importer assumes is
 *    equivalent;
 *  - Bluetooth earbuds need NO URSEC homologation. URSEC's own trámite carves out devices
 *    "que operen únicamente con las tecnologías Wifi4, Wifi5 y Wifi6 y/o Bluetooth". A phone
 *    is not carved out, because it also uses mobile networks.
 */
export const PRODUCT_CHECKS: readonly ProductCheck[] = Object.freeze([
  {
    id: 'cargador-pared',
    label: 'Cargador de pared / cubo USB',
    icon: 'mdi-power-plug-outline',
    verdict: 'no-requiere',
    organisms: ['URSEA'],
    detail:
      'No necesita autorización previa. Queda dentro del alcance del Reglamento de Seguridad de Productos Eléctricos de Baja Tensión por su tensión de entrada, pero la lista de productos que exigen autorización de URSEA antes de comercializar (Anexos II, V y VI) es cerrada y no incluye cargadores ni fuentes de alimentación. Ojo: URSEA igual puede exigirle al importador que demuestre el cumplimiento de los requisitos esenciales de seguridad, así que guardá la ficha técnica y el certificado del fabricante.',
    sourceIds: ['ursea-rspebt', 'ursea-tramite'],
  },
  {
    id: 'cable-usb',
    label: 'Cables USB / Lightning',
    icon: 'mdi-cable-data',
    verdict: 'no-requiere',
    organisms: [],
    detail:
      'Un cable de datos de baja tensión no está en los anexos de URSEA (el ítem "Cables" del anexo es cable de instalación eléctrica, NCM 8544.49.00.99, con norma UNIT 2474) y no emite radiofrecuencia, así que no pasa por URSEC.',
    sourceIds: ['ursea-rspebt'],
  },
  {
    id: 'funda-vidrio',
    label: 'Fundas, forros y vidrios templados',
    icon: 'mdi-cellphone-cog',
    verdict: 'no-requiere',
    organisms: [],
    detail:
      'No hay organismo interviniente: no es un producto eléctrico ni radioeléctrico. Es el rubro más simple para arrancar — el único trámite es el aduanero.',
    sourceIds: [],
  },
  {
    id: 'powerbank',
    label: 'Power banks / baterías portátiles',
    icon: 'mdi-battery-charging-high',
    verdict: 'bloqueante',
    organisms: [],
    detail:
      'El problema no es un permiso: es el transporte. Los operadores postales no llevan baterías de litio sueltas, es decir sin el dispositivo que alimentan, y un power bank es exactamente eso. En la práctica no entran puerta a puerta: hay que traerlas como carga (DUA, despachante y documentación de mercancía peligrosa) o comprarlas a un importador local. Confirmá la política con tu courier ANTES de pagar el pedido.',
    sourceIds: ['gripper-baterias', 'decreto-50-026'],
  },
  {
    id: 'auriculares-bt',
    label: 'Auriculares y parlantes Bluetooth',
    icon: 'mdi-headphones',
    verdict: 'no-requiere',
    organisms: ['URSEC'],
    detail:
      'Emiten radiofrecuencia, pero URSEC publica la excepción: "no es necesaria la intervención de URSEC para el ingreso al país de dispositivos que operen únicamente con las tecnologías Wifi4, Wifi5 y Wifi6 y/o Bluetooth". Si el equipo suma otra tecnología (LTE, banda propietaria, 60 GHz), la excepción no lo cubre.',
    sourceIds: ['ursec-tramite'],
  },
  {
    id: 'cargador-inalambrico',
    label: 'Cargadores inalámbricos (Qi)',
    icon: 'mdi-cellphone-wireless',
    verdict: 'consultar',
    organisms: ['URSEC'],
    detail:
      'La carga inductiva no es Wi-Fi ni Bluetooth, así que la excepción publicada no lo alcanza automáticamente, y tampoco figura en la lista de equipos que URSEC enumera. Antes de comprar, consultá a URSEC si tu modelo requiere homologación — el propio trámite prevé esa consulta previa y responde por escrito.',
    sourceIds: ['ursec-tramite', 'vuce-ursec'],
  },
  {
    id: 'celulares',
    label: 'Celulares y smartwatches con red móvil',
    icon: 'mdi-cellphone',
    verdict: 'requiere',
    organisms: ['URSEC'],
    detail:
      'URSEC lista expresamente las "terminales de telecomunicaciones móviles (entre ellos, teléfonos celulares)" y no las alcanza la excepción de Wi-Fi/Bluetooth. El equipo debe estar homologado; si no lo está, hay que gestionar la homologación y después el certificado de ingreso por VUCE. El trámite ronda los $ 204 a $ 239 según la vía, más hasta $ 252 adicionales en ciertos equipos, y el plazo máximo de intervención favorable es de 2 días hábiles.',
    sourceIds: ['ursec-tramite', 'vuce-ursec'],
  },
  {
    id: 'adaptadores-zapatillas',
    label: 'Adaptadores de enchufe y zapatillas',
    icon: 'mdi-power-socket-eu',
    verdict: 'requiere',
    organisms: ['URSEA'],
    detail:
      'Éstos SÍ están en los anexos de URSEA: "Adaptadores" (NCM 8536.90.90.99 y 8536.69.90.00) y "Prolongadores eléctricos" (8536.50.90.99 y 8536.69.90.00). Necesitan certificado de un organismo reconocido (LATU, LSQA o UNIT) y la autorización de URSEA antes de comercializar. Es el error clásico de quien asume que "es igual que un cargador".',
    sourceIds: ['ursea-rspebt', 'ursea-tramite'],
  },
])

/** Look up a product check by id. */
export function productCheck(id: string): ProductCheck | undefined {
  return PRODUCT_CHECKS.find(p => p.id === id)
}

/**
 * Summarise a basket of product ids into the flags `resolveResaleRoute` needs.
 * `missingAgencyAuthorization` is only raised for checks that flatly REQUIRE a procedure —
 * a `consultar` is an open question, not a proven blocker, and must not silently reroute.
 */
export function basketFlags(ids: readonly string[]): {
  requiresAuthorization: boolean
  carrierRefuses: boolean
  toConsult: boolean
} {
  const checks = ids.map(productCheck).filter((c): c is ProductCheck => Boolean(c))
  return {
    requiresAuthorization: checks.some(c => c.verdict === 'requiere'),
    carrierRefuses: checks.some(c => c.verdict === 'bloqueante'),
    toConsult: checks.some(c => c.verdict === 'consultar'),
  }
}

/* -------------------------------------------------------------------------- */
/* Do I need a company, and when?                                              */
/* -------------------------------------------------------------------------- */

export interface FormalizationStep {
  id: string
  title: string
  body: string
  /** When this step becomes necessary, in plain language. */
  when: string
  sourceIds: readonly string[]
  /** Internal page that goes deeper. */
  to?: string
}

/**
 * The order in which things actually have to happen — which is NOT "empresa primero".
 * Customs does not ask for a RUT to release a courier parcel under the prestación única;
 * DGI asks for one the moment you SELL. That distinction is the whole answer to "¿me abro
 * la unipersonal antes de importar?".
 */
export const FORMALIZATION_STEPS: readonly FormalizationStep[] = Object.freeze([
  {
    id: 'probar',
    title: 'Probar con envíos chicos: no necesitás empresa todavía',
    when: 'Mientras testeás productos y proveedores',
    body: 'Para traer un envío por la prestación única no te piden RUT: el régimen admite titulares personas físicas o jurídicas y el operador postal liquida el 60%. Esta etapa sirve para validar producto, calidad y tiempos sin costos fijos. Lo que NO habilita es vender: importar y vender son dos obligaciones distintas.',
    sourceIds: ['decreto-50-026', 'dna-prestacion-unica'],
  },
  {
    id: 'vender',
    title: 'Vender de forma habitual: ahí sí, empresa y RUT',
    when: 'Antes de la primera venta con intención de repetirla',
    body: 'La actividad comercial habitual se formaliza ante DGI y BPS, y ahí elegís régimen (monotributo, literal E, IRAE…). No es un requisito aduanero, es un requisito fiscal: podés haber importado legalmente y estar vendiendo informalmente. Elegí el régimen por tus números, no por el que sea más barato de abrir.',
    sourceIds: [],
    to: '/que-empresa-abrir-uruguay',
  },
  {
    id: 'regimen-fiscal',
    title: 'Cómo pega el régimen fiscal en lo que importás',
    when: 'Al elegir entre monotributo, literal E e IRAE',
    body: 'Una pequeña empresa del literal E puede tener giro importador: paga IVA importación (código 550) y anticipo de IVA importación (código 551), y el anticipo lo descuenta del IVA mínimo mensual o lo pide en certificados de crédito — pero el IVA de la importación le queda como costo, no como crédito fiscal. El monotributista importa como no contribuyente de IVA y no paga anticipos. Un contribuyente de IRAE con IVA general sí deduce el IVA de la importación: por eso el mismo producto le termina costando menos.',
    sourceIds: ['dgi-consulta-6410', 'decreto-220-998'],
    to: '/que-empresa-abrir-uruguay',
  },
  {
    id: 'escalar',
    title: 'Escalar: el cupo de DUA obliga a la empresa',
    when: 'Cuando pasás a contenedores o envíos de más de US$ 800',
    body: `Acá la empresa deja de ser opcional. La DNA publica que una persona física puede hacer hasta ${PERSONA_FISICA_MAX_DUA_PER_YEAR} DUA por año; para importar seguido por Régimen General se importa con empresa y despachante. Además el 60% deja de ser competitivo frente a arancel + IVA cuando el volumen diluye los costos fijos del despacho.`,
    sourceIds: ['dna-regimen-general'],
  },
])

/* -------------------------------------------------------------------------- */
/* How the 60% is actually paid                                                */
/* -------------------------------------------------------------------------- */

export interface PaymentStep {
  title: string
  body: string
  sourceIds: readonly string[]
}

/**
 * "¿Dónde se paga el 60%?" — nowhere, in the sense the question expects. There is no DGI
 * form and no boleta to print: the postal operator is designated by Decreto 50/026 art. 8 as
 * responsable por el pago de obligaciones tributarias de terceros, charges you and settles
 * with the DNA. The DNA's own page says it in one line (with a typo worth warning about:
 * it calls the single payment "monotributo", which has nothing to do with DGI's monotributo).
 */
export const PAYMENT_STEPS: readonly PaymentStep[] = Object.freeze([
  {
    title: 'Comprás y declarás el valor real',
    body: 'La base es el total de la factura original de compra, "incluidos todos los conceptos que figuren adicionados a la misma" (Decreto 50/026 art. 5). Es decir: producto + impuestos del vendedor + envío que cobre el vendedor en esa misma factura. Subdeclarar es lo que convierte un trámite en una infracción.',
    sourceIds: ['decreto-50-026', 'dna-prestacion-unica'],
  },
  {
    title: 'El operador postal liquida y cobra',
    body: 'No hay trámite ante DGI ni ante la Aduana. El Decreto 50/026 art. 8 designa a los operadores postales como responsables por el pago de obligaciones tributarias de terceros: el courier o el Correo te cobra el 60% (mínimo US$ 20) junto con el envío y le paga a la Aduana.',
    sourceIds: ['decreto-50-026', 'dna-prestacion-unica'],
  },
  {
    title: 'Cuidado con la palabra "monotributo"',
    body: 'La página de la DNA dice "el pago del monotributo se realiza a través del operador postal". Se refiere al tributo único del 60%, NO al monotributo de DGI/BPS. Son cosas distintas y confundirlas hace pensar que hay que inscribirse en algo para pagar el envío.',
    sourceIds: ['dna-prestacion-unica'],
  },
  {
    title: 'Si no pagás, la mercadería cae en abandono',
    body: 'Constatado el incumplimiento, hay 30 días desde el ingreso para pagar los tributos que correspondan; vencido el plazo la mercadería se considera en abandono no infraccional. Y aunque esté todo bien, si no retirás el envío en 90 días desde su ingreso también cae en abandono (Decreto 50/026 art. 14).',
    sourceIds: ['decreto-50-026', 'dna-prestacion-unica'],
  },
])

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
