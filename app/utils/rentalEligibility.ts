/** Pure own-advert checks, mirrored in app/utils/rentalEligibility.ts. No inferred market price. */
export interface RentalEligibilityInput {
  title: string
  description?: string | null
  /** Sanitized guarantee field published by this same advert; never a property fallback. */
  guaranteeText?: string | null
  currency: 'UYU' | 'USD'
  price: number
  propertyType: string
}

export type RentalEligibilityReason =
  | 'invalid_price'
  | 'not_residential'
  | 'no_rental_evidence'
  | 'short_term'
  | 'unavailable'
  | 'non_residential_use'
  | 'ambiguous_units'
  | 'ambiguous_transfer'
  | 'auction'
  | 'price_conflict'

export interface RentalEligibilityResult {
  eligible: boolean
  reasons: RentalEligibilityReason[]
}

function plain(value: unknown): string {
  return String(value ?? '')
    .slice(0, 20_000)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/[^\S\n]+/g, ' ')
}

/** A direct negative does not say the property has the condition. Do not scan across sentences. */
function negated(text: string, start: number): boolean {
  return /\b(?:no|sin)\s+(?:(?:se|es|esta|son|estan|hay|disponible|disponibilidad|para|ofrece|acepta|aceptan|realiza|realizan|incluye)\s+){0,3}$/.test(
    text.slice(Math.max(0, start - 75), start)
  )
}

function affirmed(text: string, pattern: RegExp): boolean {
  for (const match of text.matchAll(new RegExp(pattern.source, 'g'))) {
    const tail = text.slice((match.index ?? 0) + match[0].length)
    if (
      !negated(text, match.index ?? 0) &&
      !/^\s+no\s+(?:disponible|se ofrece|se realiza)\b/.test(tail)
    )
      return true
  }
  return false
}

export function rentalPeriodEvidence(
  title: string,
  description = ''
): {
  rental: boolean
  monthly: boolean
  shortTerm: boolean
} {
  const heading = plain(title)
  const detail = plain(description)
  const text = `${heading}\n${detail}`
  const rental = affirmed(
    text,
    /\b(?:alquiler|alquilo|alquila|alquilan|alquilar|arrendamiento|arriendo)\b/
  )
  const monthly =
    affirmed(
      text,
      /\b(?:alquiler|alquilo|alquila|arrendamiento|contrato)\s+(?:(?:de|es|por|para|tipo)\s+){0,2}(?:anual|mensual|permanente|habitacional)\b/
    ) ||
    affirmed(text, /\b(?:vivienda|residencia) permanente\b/) ||
    affirmed(text, /(?:\$|usd|uyu|u\$s)\s*\d[\d.,]*\s*(?:mensuales|(?:por|al) mes)\b/)
  // A winter contract can quote a monthly price. Only a year-round option overrides a
  // description's winter/temporary offer; the word "mensuales" by itself cannot do that.
  const annual =
    affirmed(
      text,
      /\b(?:alquiler|alquilo|alquila|arrendamiento|contrato)\s+(?:(?:de|es|por|para|tipo)\s+){0,2}(?:anual|permanente)\b/
    ) || affirmed(text, /\b(?:vivienda|residencia) permanente\b/)

  // A price attached to a short stay remains ambiguous even if another annual option exists.
  // "Transporte diario", "mucama diaria" and "jardín de invierno" are not rental periods.
  const pricedStay =
    affirmed(
      text,
      /\b(?:precio|valor|tarifa)\s+(?:(?:del?|por|el|la|alquiler)\s+){0,3}(?:diari[oa]|(?:por|x)\s+(?:dia|noche)|fin de semana|semanal|quincenal)\b/
    ) ||
    affirmed(text, /\b(?:alquiler|alquilo|alquila)\s+diari[oa]\b/) ||
    affirmed(
      text,
      /(?:\$|usd|uyu|u\$s)\s*\d[\d.,]*\s*(?:por|x|\/)\s*(?:dia|noche|semana|quincena)\b/
    ) ||
    affirmed(text, /\b\d[\d.,]*\s*(?:(?:pesos|dolares)\s+)?(?:por|x)\s+(?:dia|noche|quincena)\b/) ||
    affirmed(text, /(?:\$|usd|uyu|u\$s)\s*\d[\d.,]*\s*diari[oa]s?\b/) ||
    affirmed(text, /\b(?:enero|febrero|diciembre)\s+completo\s*(?:[:=]\s*)?(?:\$|usd|u\$s)\s*\d/)
  const headingStay = affirmed(
    heading,
    /\b(?:temporada|temporal|temporario|temporaria|turistico|invernal|(?:por|x)\s+(?:dia|noche|semana|quincena)|fin de semana)\b/
  )
  const describedStay =
    affirmed(
      detail,
      /\b(?:alquiler(?:es)?|alquilo|alquila|alquilar|renta|arrendamiento)\s+(?:(?:solo|solamente|exclusivamente|de|por|durante|el|en)\s+){0,3}(?:temporari[oa]s?|temporales?|turistic[oa]s?|invernal(?:es)?|invierno|temporada|(?:x\s+)?(?:dia|noche|semana|quincena)|fin de semana)\b/
    ) ||
    affirmed(
      detail,
      /\b(?:estadia|alquiler)\s+minim[oa]\s+(?:de\s+)?\d{1,2}\s+(?:dias?|noches?)\b/
    ) ||
    affirmed(detail, /(?:^|\n)\s*(?:temporada\s+20\d{2}|(?:alquiler\s+)?temporario)\b/)
  const winterTitle = affirmed(heading, /\balquiler\s+(?:(?:de|por|durante|el)\s+){0,3}invierno\b/)
  return {
    rental,
    monthly,
    shortTerm: pricedStay || headingStay || winterTitle || (describedStay && !annual),
  }
}

function amount(raw: string): number {
  const compact = raw.replace(/\s/g, '').replace(/[.,]+$/, '')
  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(compact)) return Number(compact.replace(/[.,]/g, ''))
  return Number(compact.replace(/,(?=\d{1,2}$)/, '.'))
}

function moneyConflict(input: RentalEligibilityInput, text: string): boolean {
  // Only the advertised rent/price, never guarantees, commissions, expenses or a sale price.
  const labelled =
    /\b(?:precio(?: de alquiler)?|alquiler)\s*(?:(?:mensual|anual|es|de|:|=)\s*){0,3}(?:(usd|u\s*\$\s*s|us\$|uyu|uy\$|\$)\s*)?(\d[\d.,]*)/g
  for (const match of text.matchAll(labelled)) {
    const prefix = text.slice(Math.max(0, (match.index ?? 0) - 40), match.index)
    if (
      /\b(?:garaje|garage|cochera|deposito|comision|honorarios|gastos comunes)\s*(?:(?:con|de|:)\s*)?$/.test(
        prefix
      )
    )
      continue
    const value = amount(match[2]!)
    if (!Number.isFinite(value) || value <= 0) continue
    const symbol = match[1]
    const currency = symbol ? (/usd|us\$|u\s*\$\s*s/.test(symbol) ? 'USD' : 'UYU') : input.currency
    const tail = text.slice((match.index ?? 0) + match[0].length)
    if (
      !symbol &&
      (/^\s*(?:mes(?:es)?|anos?|dias?|dormitorios?|ambientes?|banos?|m2|m²)\b/.test(tail) ||
        /^\s*%/.test(tail) ||
        (value >= 1900 && value <= 2100 && /^\s*\/\s*20\d{2}\b/.test(tail)))
    )
      continue
    if (
      currency !== input.currency ||
      Math.abs(value - input.price) > Math.max(1, input.price * 0.01)
    )
      return true
  }
  return false
}

/** Broker advertising is not evidence that this specific home accepts a guarantee. */
function ownGuaranteeText(value: unknown): string {
  return plain(value)
    .split(/(?<=[.;!?])\s+|\n+/)
    .filter(
      sentence =>
        !/(?:somos|soy)\s+corredor|corredores?\s+de\s+(?:seguros?|porto)|gestionamos\s+(?:tu|su)\s+garant|tramita\s+con\s+nosotros/.test(
          sentence
        )
    )
    .join(' ')
}

/** A shortlist guard, not a claim of availability or a valuation. Missing own evidence abstains. */
export function rentalEligibility(input: RentalEligibilityInput): RentalEligibilityResult {
  const heading = plain(input.title)
  const text = `${heading}\n${plain(input.description)}`
  const reasons: RentalEligibilityReason[] = []
  const periods = rentalPeriodEvidence(input.title, input.description || '')
  if (
    !Number.isFinite(input.price) ||
    input.price <= 1 ||
    !['UYU', 'USD'].includes(input.currency) ||
    (input.currency === 'UYU' && input.price < 3000)
  )
    reasons.push('invalid_price')
  if (!['casa', 'apartamento'].includes(input.propertyType)) reasons.push('not_residential')
  const saleOnlyTitle =
    affirmed(heading, /\b(?:venta|vendo|se vende|permuta)\b/) &&
    !affirmed(heading, /\b(?:alquiler|alquilo|alquila|alquilar|arriendo)\b/)
  // A named rental guarantee in this advert is explicit tenancy evidence in pesos.
  // It does not establish the period of a dollar price or override any risk veto.
  const rentalGuarantee =
    input.currency === 'UYU' &&
    (affirmed(
      ownGuaranteeText(input.description),
      /\bgarantias?\s*(?:[:=-]\s*)?(?:de\s+)?(?:anda|contaduria|porto(?:\s+seguros?)?|fideciu|sura)\b/
    ) ||
      affirmed(
        ownGuaranteeText(input.guaranteeText),
        /^\s*(?:(?:se\s+)?aceptan?\s+)?(?:garantias?\s*(?:[:=-]\s*)?(?:de\s+)?)?(?:anda|contaduria|porto(?:\s+seguros?)?|fideciu|sura)\b/
      ))
  if (
    (!periods.rental && !rentalGuarantee) ||
    saleOnlyTitle ||
    (input.currency === 'USD' && !periods.monthly)
  )
    reasons.push('no_rental_evidence')
  if (periods.shortTerm) reasons.push('short_term')
  // A transfer price may be a one-off payment. Require the advert's explicit monthly rent.
  if (
    affirmed(text, /\b(?:traspaso|derechos?\s+de\s+(?:cesion|llave))\b/) &&
    !affirmed(
      text,
      /\balquiler\s+(?:mensual\s*(?:(?::|de|=)\s*)?(?:(?:\$|uyu|uy\$|usd|u\s*\$\s*s|us\$)\s*)?\d[\d.,]*|(?:\$|uyu|uy\$|usd|u\s*\$\s*s|us\$)\s*\d[\d.,]*\s*(?:mensuales|(?:por|al)\s+mes))\b/
    )
  )
    reasons.push('ambiguous_transfer')
  if (
    affirmed(
      text,
      /\b(?:ya\s+(?:fue\s+)?|actualmente\s+|se encuentra\s+|esta\s+)(?:alquilad[oa]|arrendad[oa]|ocupad[oa]|reservad[oa])\b/
    ) ||
    affirmed(text, /(?:^|\n)\s*(?:alquilad[oa]|arrendad[oa]|reservad[oa])\s*(?:[.!]|$)/) ||
    /\b(?:no disponible|sin disponibilidad|el publicado ya fue arrendado)\b/.test(text)
  )
    reasons.push('unavailable')
  if (
    affirmed(
      text,
      /\b(?:unico destino permitido|destino exclusivo|uso exclusivo|solo (?:para|como)|solamente (?:para|como))\s*(?:[:=]\s*)?(?:como\s+)?(?:deposito|oficina|consultorio|comercial)\b/
    ) ||
    affirmed(heading, /\b(?:para|como) (?:deposito|oficina|consultorio)\b/) ||
    affirmed(
      heading,
      /\b(?:alquiler|alquilo|alquila|arriendo)\s+(?:de\s+)?(?:oficina|consultorio|local|deposito|garaje|cochera)\b/
    ) ||
    affirmed(text, /\b(?:precio|alquiler|valor|tarifa)\s+(?:por|x)\s+persona\b/) ||
    affirmed(text, /(?:\$|usd|uyu|u\$s)\s*\d[\d.,]*\s*(?:por|x)\s+persona\b/) ||
    affirmed(
      heading,
      /\b(?:alquiler|alquilo|alquila)\s+(?:de\s+)?(?:habitacion(?:es)?|cuartos?|piezas?|camas?)\b/
    ) ||
    affirmed(
      text,
      /(?:^|\n)\s*(?:residencia|pension)\s+(?:estudiantil|universitaria|femenina|masculina|para estudiantes)\b/
    ) ||
    affirmed(text, /\b(?:casa|habitacion|dormitorio|cuarto|pieza)\s+compartid[oa]\b/)
  )
    reasons.push('non_residential_use')
  if (affirmed(text, /\b(?:remate|subasta|remato)\b/)) reasons.push('auction')
  // Inventory variants in this advert do not identify which home the one headline price buys.
  // A building's total units or a shared entrance alone says nothing about that attribution.
  if (
    affirmed(
      text,
      /\b(?:[2-9]|[1-9]\d|dos|tres|cuatro|cinco|varias)\s+(?:unidades|apartamentos|casas|viviendas)\s+(?:actualmente\s+)?disponibles\b/
    ) ||
    affirmed(
      text,
      /\b(?:esta publicacion|este aviso)\s+(?:muestra|corresponde a|es de)\s+(?:una\s+)?unidad de referencia\b/
    )
  )
    reasons.push('ambiguous_units')
  if (moneyConflict(input, text)) reasons.push('price_conflict')
  return { eligible: reasons.length === 0, reasons }
}
