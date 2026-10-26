/**
 * El guion de la presentación en video de un aviso (auto, alquiler, venta).
 *
 * Es una función pura de los datos que la ficha YA trae: no pide nada, no gasta un token y no corre
 * en el servidor. El mismo guion lo dibuja `presentationCanvas.ts`, lo lee la narración del
 * navegador y lo lista la transcripción accesible, así que las tres cosas nunca se contradicen.
 *
 * Las reglas son las de cada ficha: nada que el aviso no diga (sin garantías publicadas no se dice
 * "sin garantía", se calla), el precio con los formateadores de siempre y ninguna cifra inventada.
 * Ver docs/superpowers/specs/2026-10-26-presentacion-de-avisos-design.md.
 */
import { CAR_RISK_GUIDE } from './carsRisk'
import {
  CAR_COLOR_LABELS,
  CAR_FLAG_LABELS,
  CAR_FUEL_LABELS,
  CAR_SELLER_LABELS,
  CAR_TRANSMISSION_LABELS,
  formatCarBody,
  formatCarFuelEconomy,
  formatCarKm,
  formatCarPrice,
  formatCarUsd,
} from './cars'
import type { PublicCarListing, PublicCarMarketRow } from './carsPublic'
import { carEquipmentGroups } from './carsSpecs'
import type { PriceHistorySeries } from './priceHistory'
import type { PropertySaleListing } from './propertySales'
import { propertySaleMoney } from './propertySales'
import { propertySaleSourceName } from './propertySalesMessages'
import type { RentalPageMarket } from './rentalPage'
import { rentalMoney, rentalPhotos } from './rentalPresentation'
import {
  RENTAL_GUARANTEE_LABELS,
  RENTAL_GUARANTEE_PUBLISHED,
  RENTAL_SOURCE_LABEL,
  type RentalOffer,
  type RentalPublicProperty,
} from './rentals'

export type PresentationKind = 'car' | 'rental' | 'sale'

/** Portada + hasta siete fotos más: pasado eso el video deja de ser un resumen. */
export const PRESENTATION_MAX_PHOTOS = 8

interface SceneBase {
  id: string
  /** Lo que dice la voz y lo que lista la transcripción. */
  narration: string
  /** Milisegundos en pantalla. */
  duration: number
}

export interface CoverScene extends SceneBase {
  kind: 'cover'
  photo: string | null
  title: string
  price: string
  /** Una nota debajo del precio ("Precio de contado", "+ $ 4.000 de gastos comunes"). */
  priceNote: string | null
  location: string
  chips: string[]
}

export interface PhotoScene extends SceneBase {
  kind: 'photo'
  photo: string
  label: string | null
  detail: string | null
  /** "3 / 8": las fotos se cuentan, así quien mira sabe cuánto falta. */
  counter: string
}

export interface CompareScene extends SceneBase {
  kind: 'compare'
  photo: string | null
  heading: string
  p25: number
  median: number
  p75: number
  value: number
  format: (value: number) => string
  verdict: string
  note: string
}

export interface DropScene extends SceneBase {
  kind: 'drop'
  photo: string | null
  from: string
  to: string
  since: string | null
}

export interface DeclaredScene extends SceneBase {
  kind: 'declared'
  items: { label: string; quote: string | null }[]
}

export interface OutroScene extends SceneBase {
  kind: 'outro'
  photo: string | null
  source: string
  note: string
}

export type PresentationScene =
  CoverScene | PhotoScene | CompareScene | DropScene | DeclaredScene | OutroScene

export interface ListingPresentation {
  kind: PresentationKind
  title: string
  scenes: PresentationScene[]
  /** Milisegundos, suma de las escenas. */
  duration: number
}

export type PresentationSource =
  | { kind: 'car'; car: PublicCarListing; cohort: PublicCarMarketRow | null }
  | {
      kind: 'rental'
      property: RentalPublicProperty
      offer?: RentalOffer | null
      market?: RentalPageMarket | null
      usdUyu?: number
    }
  | { kind: 'sale'; property: PropertySaleListing; priceHistory?: PriceHistorySeries | null }

/** Lo que tarda la voz del sistema en leer el texto, con un piso para que los ojos lleguen. */
export function sceneDuration(narration: string, minimum = 3800): number {
  const words = narration.trim().split(/\s+/).filter(Boolean).length
  return Math.min(10_000, Math.max(minimum, 1200 + words * 340))
}

const grouped = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** "12.990 dólares": la voz lee "US$" como letras sueltas. */
export function spokenMoney(value: number, currency: 'USD' | 'UYU'): string {
  return `${grouped(value)} ${currency === 'USD' ? 'dólares' : 'pesos'}`
}

const spokenKm = (km: number) => `${grouped(km)} kilómetros`

const sentence = (text: string) => {
  const trimmed = text.trim()
  return !trimmed || /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

const unique = (urls: (string | null | undefined)[]) => [
  ...new Set(
    urls.filter((url): url is string => typeof url === 'string' && /^https:\/\//.test(url))
  ),
]

const join = (parts: (string | null | undefined | false)[], glue = ' · ') =>
  parts.filter(Boolean).join(glue)

function scene<T extends PresentationScene>(value: Omit<T, 'duration'>, minimum?: number): T {
  return { ...value, duration: sceneDuration(value.narration, minimum) } as T
}

/** Un rótulo por foto: el primero que tiene datos, en orden de lo que se mira primero. */
interface Fact {
  label: string
  detail?: string | null
  narration: string
}

function photoScenes(photos: string[], facts: Fact[]): PhotoScene[] {
  const rest = photos.slice(1, PRESENTATION_MAX_PHOTOS)
  const total = Math.min(photos.length, PRESENTATION_MAX_PHOTOS)
  return rest.map((photo, index) => {
    const fact = facts[index]
    return scene<PhotoScene>(
      {
        id: `photo-${index + 1}`,
        kind: 'photo',
        photo,
        label: fact?.label ?? null,
        detail: fact?.detail ?? null,
        counter: `${index + 2} / ${total}`,
        narration: fact ? sentence(fact.narration) : '',
      },
      fact ? 3800 : 2600
    )
  })
}

/** Dónde cae el precio contra la mitad central de los comparables, dicho sin adjetivos. */
export function compareVerdict(value: number, p25: number, median: number, p75: number): string {
  const pct = Math.round((value / median - 1) * 100)
  const versus =
    Math.abs(pct) < 3
      ? 'Está en la mediana'
      : `${Math.abs(pct)} % ${pct < 0 ? 'menos' : 'más'} que la mediana`
  if (value < p25) return `${versus}: más barato que 3 de cada 4 comparables`
  if (value > p75) return `${versus}: más caro que 3 de cada 4 comparables`
  return `${versus}, dentro de la mitad central`
}

const outro = (source: string, photo: string | null): OutroScene =>
  scene<OutroScene>({
    id: 'outro',
    kind: 'outro',
    photo,
    source,
    note: 'Precio pedido, no tasación. Confirmá todo con quien publica.',
    narration: `El aviso completo está en ${source}.`,
  })

function finish(kind: PresentationKind, title: string, scenes: PresentationScene[]) {
  return {
    kind,
    title,
    scenes,
    duration: scenes.reduce((sum, item) => sum + item.duration, 0),
  } satisfies ListingPresentation
}

// ---------------------------------------------------------------------------------------- autos

export function carPresentation(car: PublicCarListing, cohort: PublicCarMarketRow | null) {
  const photos = unique(car.pictures?.length ? car.pictures : [car.picture]).slice(
    0,
    PRESENTATION_MAX_PHOTOS
  )
  const location = join([car.neighborhood, car.department], ', ')
  const price = formatCarPrice(car)
  const spokenPrice = spokenMoney(car.price, car.currency)
  const cover = scene<CoverScene>(
    {
      id: 'cover',
      kind: 'cover',
      photo: photos[0] ?? null,
      title: `${car.title} ${car.year}`,
      price,
      priceNote: car.listedPrice != null ? 'Precio de contado según el aviso' : null,
      location,
      // El año ya va en el título: el chip lleva lo que el título no dice.
      chips: [
        car.km !== null ? formatCarKm(car.km) : null,
        car.transmission ? CAR_TRANSMISSION_LABELS[car.transmission] : null,
      ].filter((chip): chip is string => !!chip),
      narration: sentence(
        join(
          [
            `${car.title}, año ${car.year}`,
            car.km !== null ? spokenKm(car.km) : null,
            `Piden ${spokenPrice}`,
            location ? `Está en ${location}` : null,
          ],
          '. '
        )
      ),
    },
    5200
  )

  const equipment = carEquipmentGroups(car.specs)
    .flatMap(group => group.has)
    .slice(0, 4)
  const facts: Fact[] = [
    car.trim || car.engine
      ? {
          label: join([car.trim, car.engine]),
          detail: 'Versión',
          narration: `Versión ${join([car.trim, car.engine && `motor ${car.engine}`], ', ')}`,
        }
      : null,
    car.transmission || car.fuel
      ? {
          label: join([
            car.transmission && CAR_TRANSMISSION_LABELS[car.transmission],
            car.fuel && CAR_FUEL_LABELS[car.fuel],
          ]),
          detail: 'Caja y combustible',
          narration: join(
            [
              car.transmission && `Caja ${CAR_TRANSMISSION_LABELS[car.transmission].toLowerCase()}`,
              car.fuel && CAR_FUEL_LABELS[car.fuel].toLowerCase(),
            ],
            ', '
          ),
        }
      : null,
    car.body
      ? {
          label: formatCarBody(car.body)!,
          detail: car.body.basis === 'advert' ? 'Carrocería' : 'Carrocería estimada por el modelo',
          narration: `Carrocería ${formatCarBody(car.body)!.replace('≈ ', '').toLowerCase()}`,
        }
      : null,
    car.fuelEconomy
      ? {
          label: formatCarFuelEconomy(car.fuelEconomy)!,
          detail:
            car.fuelEconomy.basis === 'advert' ? 'Consumo según el aviso' : 'Consumo estimado',
          narration: `Consume ${formatCarFuelEconomy(car.fuelEconomy)!
            .replace('≈ ', 'unos ')
            .replace(' L/100 km', ' litros cada cien kilómetros')}`,
        }
      : null,
    car.specs?.powerHp
      ? {
          label: `${car.specs.powerHp} CV`,
          detail: 'Potencia según la ficha',
          narration: `${car.specs.powerHp} caballos de potencia`,
        }
      : null,
    car.color || car.doors
      ? {
          label: join([
            car.color ? (CAR_COLOR_LABELS[car.color] ?? car.color) : null,
            car.doors ? `${car.doors} puertas` : null,
          ]),
          detail: 'Color y puertas',
          narration: join(
            [
              car.color
                ? `Color ${(CAR_COLOR_LABELS[car.color] ?? car.color).toLowerCase()}`
                : null,
              car.doors ? `${car.doors} puertas` : null,
            ],
            ', '
          ),
        }
      : null,
    equipment.length
      ? {
          label: equipment.join(' · '),
          detail: 'Equipamiento que marcó el vendedor',
          narration: `Equipamiento: ${equipment.join(', ')}`,
        }
      : null,
    car.sellerType
      ? {
          label: car.dealerName || CAR_SELLER_LABELS[car.sellerType],
          detail: 'Quién vende',
          narration: `Lo vende ${car.dealerName || CAR_SELLER_LABELS[car.sellerType].toLowerCase()}`,
        }
      : null,
  ].filter((fact): fact is Fact => !!fact)

  const scenes: PresentationScene[] = [cover, ...photoScenes(photos, facts)]

  if (cohort && cohort.n >= 3 && cohort.median > 0 && car.priceUsd > 0) {
    const verdict = compareVerdict(car.priceUsd, cohort.p25, cohort.median, cohort.p75)
    const what = join([car.brand, car.model, cohort.trim, String(cohort.year)], ' ')
    scenes.push(
      scene<CompareScene>(
        {
          id: 'compare',
          kind: 'compare',
          photo: photos[0] ?? null,
          heading: `Contra ${cohort.n} ${what} publicados`,
          p25: cohort.p25,
          median: cohort.median,
          p75: cohort.p75,
          value: car.priceUsd,
          format: formatCarUsd,
          verdict,
          note: `Mitad central: ${formatCarUsd(cohort.p25)} a ${formatCarUsd(cohort.p75)}. Mediana de kilómetros: ${formatCarKm(cohort.kmMedian)}.`,
          narration: sentence(
            `Comparado con ${cohort.n} avisos de ${what}: ${verdict.replace(' %', ' por ciento')}`
          ),
        },
        5600
      )
    )
  }

  if (car.priceDrop && car.priceDrop.from > car.price) {
    const from = formatCarPrice({ price: car.priceDrop.from, currency: car.priceDrop.currency })
    scenes.push(
      scene<DropScene>({
        id: 'drop',
        kind: 'drop',
        photo: photos[1] ?? photos[0] ?? null,
        from,
        to: price,
        since: car.priceDrop.since,
        narration: `Bajó de precio: antes pedía ${spokenMoney(car.priceDrop.from, car.priceDrop.currency)}.`,
      })
    )
  }

  const declared = [
    ...(car.risks ?? []).map(risk => ({
      label: CAR_RISK_GUIDE[risk.category].label,
      quote: risk.quote,
    })),
    ...(car.risks?.length
      ? []
      : (car.flags ?? []).map(flag => ({ label: CAR_FLAG_LABELS[flag], quote: null }))),
  ].slice(0, 3)
  if (declared.length) {
    scenes.push(
      scene<DeclaredScene>(
        {
          id: 'declared',
          kind: 'declared',
          items: declared,
          narration: sentence(
            `Atención, el propio aviso menciona: ${declared.map(item => item.label.toLowerCase()).join('; ')}. Revisalo antes de señar`
          ),
        },
        5600
      )
    )
  }

  scenes.push(outro(car.sourceName, photos[photos.length - 1] ?? null))
  return finish('car', cover.title, scenes)
}

// ---------------------------------------------------------------------------------- viviendas

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  habitacion: 'Habitación',
  local: 'Local comercial',
  oficina: 'Oficina',
  garaje: 'Garaje',
  terreno: 'Terreno',
}

/** Con espacio duro: el rótulo puede partirse entre datos, nunca entre el número y su unidad. */
const plural = (n: number, one: string, many: string) => `${n}\u00A0${n === 1 ? one : many}`

interface HomeShape {
  propertyType: string
  bedrooms: number | null
  bathrooms: number | null
  area: number | null
  parkingSpaces: number | null
  furnished: true | null
  petsAllowed?: true | null
}

function homeChips(home: HomeShape): string[] {
  return [
    home.bedrooms === 0
      ? 'Monoambiente'
      : home.bedrooms !== null
        ? plural(home.bedrooms, 'dormitorio', 'dormitorios')
        : null,
    home.bathrooms !== null ? plural(home.bathrooms, 'baño', 'baños') : null,
    home.area ? `${grouped(home.area)}\u00A0m²` : null,
  ].filter((chip): chip is string => !!chip)
}

/** Los rótulos de las fotos de una vivienda: sólo lo que el aviso afirma. */
function homeFacts(home: HomeShape, extra: Fact[], amenities: string[]): Fact[] {
  const type = PROPERTY_TYPE_LABELS[home.propertyType]
  const chips = homeChips(home)
  return [
    chips.length
      ? {
          label: chips.join(' · '),
          detail: type ?? null,
          narration: join([type, ...chips], ', '),
        }
      : null,
    ...extra,
    home.parkingSpaces && home.parkingSpaces > 0
      ? {
          label: plural(home.parkingSpaces, 'lugar de garaje', 'lugares de garaje'),
          detail: 'Según el aviso',
          narration: `Con ${plural(home.parkingSpaces, 'lugar', 'lugares')} de garaje`,
        }
      : null,
    home.furnished
      ? {
          label: 'Amueblado',
          detail: 'Según el aviso',
          narration: 'El aviso dice que está amueblado',
        }
      : null,
    home.petsAllowed
      ? { label: 'Acepta mascotas', detail: 'Según el aviso', narration: 'Acepta mascotas' }
      : null,
    amenities.length
      ? {
          label: amenities.slice(0, 4).join(' · '),
          detail: 'Comodidades',
          narration: `Comodidades: ${amenities.slice(0, 4).join(', ')}`,
        }
      : null,
  ].filter((fact): fact is Fact => !!fact)
}

function historyDrop(
  history: PriceHistorySeries | null | undefined,
  money: (value: number) => string,
  photo: string | null
): DropScene | null {
  const change = history?.lastChange
  if (!history || !change || history.currencySwitched || !(change.to < change.from)) return null
  const currency = history.currency
  return scene<DropScene>({
    id: 'drop',
    kind: 'drop',
    photo,
    from: money(change.from),
    to: money(change.to),
    since: change.at,
    narration: `Bajó de precio: antes pedía ${spokenMoney(change.from, currency)}.`,
  })
}

export function rentalPresentationOf(
  property: RentalPublicProperty,
  offer: RentalOffer | null | undefined,
  market: RentalPageMarket | null | undefined
) {
  const photos = unique(rentalPhotos(property).map(photo => photo.url)).slice(
    0,
    PRESENTATION_MAX_PHOTOS
  )
  const chosen = offer ?? property.matchingOffer ?? property.offers[0] ?? null
  const amount = chosen?.price ?? property.price
  const currency = chosen?.currency ?? property.currency
  const location = join([property.neighborhood, property.department], ', ')
  const expenses =
    chosen && chosen.commonExpenses && chosen.commonExpensesCurrency
      ? { amount: chosen.commonExpenses, currency: chosen.commonExpensesCurrency }
      : null
  const type = PROPERTY_TYPE_LABELS[property.propertyType] ?? 'Vivienda'
  const cover = scene<CoverScene>(
    {
      id: 'cover',
      kind: 'cover',
      photo: photos[0] ?? null,
      title: property.title,
      price: `${rentalMoney(amount, currency)} / mes`,
      priceNote: expenses
        ? `+ ${rentalMoney(expenses.amount, expenses.currency)} de gastos comunes`
        : chosen?.commonExpenses === 0
          ? 'Sin gastos comunes según el aviso'
          : null,
      location,
      chips: homeChips(property),
      narration: sentence(
        join(
          [
            `${type} en alquiler${location ? ` en ${location}` : ''}`,
            `Piden ${spokenMoney(amount, currency)} por mes`,
            expenses
              ? `más ${spokenMoney(expenses.amount, expenses.currency)} de gastos comunes`
              : null,
          ],
          '. '
        )
      ),
    },
    5200
  )
  const guarantees = (chosen?.guarantees ?? property.guarantees ?? []).filter(value =>
    RENTAL_GUARANTEE_PUBLISHED.includes(value)
  )
  const extra: Fact[] = guarantees.length
    ? [
        {
          label: guarantees.map(value => RENTAL_GUARANTEE_LABELS[value].label).join(' · '),
          detail: 'Garantías que acepta el aviso',
          narration: `Acepta garantía ${guarantees.map(value => RENTAL_GUARANTEE_LABELS[value].label).join(', ')}`,
        },
      ]
    : []
  const facts = homeFacts(
    {
      ...property,
      parkingSpaces: chosen?.parkingSpaces ?? property.parkingSpaces,
      furnished: chosen?.furnished ?? property.furnished,
      petsAllowed: chosen?.petsAllowed ?? property.petsAllowed,
    },
    extra,
    chosen?.details?.amenities ?? []
  )
  const scenes: PresentationScene[] = [cover, ...photoScenes(photos, facts)]

  const asked = chosen?.priceUyu ?? property.priceUyu
  if (
    market?.status === 'available' &&
    market.medianRentUyu &&
    market.p25RentUyu !== null &&
    market.p75RentUyu !== null &&
    asked > 0
  ) {
    const verdict = compareVerdict(
      asked,
      market.p25RentUyu,
      market.medianRentUyu,
      market.p75RentUyu
    )
    const zone = market.scope?.neighborhood || property.neighborhood || property.department
    scenes.push(
      scene<CompareScene>(
        {
          id: 'compare',
          kind: 'compare',
          photo: photos[0] ?? null,
          heading: `Contra ${market.sampleSize} alquileres parecidos${zone ? ` en ${zone}` : ''}`,
          p25: market.p25RentUyu,
          median: market.medianRentUyu,
          p75: market.p75RentUyu,
          value: asked,
          format: value => rentalMoney(value, 'UYU'),
          verdict,
          note: 'Alquiler pedido sin gastos comunes, en pesos, contra avisos vigentes del mismo tipo y dormitorios.',
          narration: sentence(
            `Comparado con ${market.sampleSize} alquileres parecidos${zone ? ` en ${zone}` : ''}: ${verdict.replace(' %', ' por ciento')}`
          ),
        },
        5600
      )
    )
  }

  const drop = historyDrop(
    chosen?.priceHistory,
    value => rentalMoney(value, chosen?.priceHistory?.currency ?? currency),
    photos[1] ?? photos[0] ?? null
  )
  if (drop) scenes.push(drop)

  scenes.push(
    outro(
      chosen ? RENTAL_SOURCE_LABEL[chosen.source] : 'el portal',
      photos[photos.length - 1] ?? null
    )
  )
  return finish('rental', property.title, scenes)
}

export function salePresentationOf(
  property: PropertySaleListing,
  priceHistory: PriceHistorySeries | null | undefined
) {
  const photos = unique([...(property.images ?? []), property.image]).slice(
    0,
    PRESENTATION_MAX_PHOTOS
  )
  const location = [property.neighborhood, property.locality, property.department]
    .filter((value, index, all) => value && all.indexOf(value) === index)
    .join(', ')
  const area =
    property.areas.built || property.areas.total || property.areas.land || property.areas.reported
  const home: HomeShape = {
    propertyType: property.propertyType,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: area ?? null,
    parkingSpaces: property.parkingSpaces,
    furnished: property.furnished,
  }
  const price = propertySaleMoney(property.price.amount, property.price.currency)
  const type = PROPERTY_TYPE_LABELS[property.propertyType] ?? 'Vivienda'
  const cover = scene<CoverScene>(
    {
      id: 'cover',
      kind: 'cover',
      photo: photos[0] ?? null,
      title: property.title,
      price,
      priceNote: property.expenses
        ? `Gastos comunes: ${propertySaleMoney(property.expenses.amount, property.expenses.currency)}`
        : null,
      location,
      chips: homeChips(home),
      narration: sentence(
        join(
          [
            `${type} en venta${location ? ` en ${location}` : ''}`,
            `Piden ${spokenMoney(property.price.amount, property.price.currency)}`,
          ],
          '. '
        )
      ),
    },
    5200
  )
  const extra: Fact[] =
    area && property.price.currency && property.price.amount > 0
      ? [
          {
            label: `${propertySaleMoney(Math.round(property.price.amount / area), property.price.currency)} por m²`,
            detail: 'Precio pedido dividido por la superficie publicada',
            narration: `Sale ${spokenMoney(Math.round(property.price.amount / area), property.price.currency)} el metro cuadrado`,
          },
        ]
      : []
  const facts = homeFacts(home, extra, property.amenities ?? [])
  const scenes: PresentationScene[] = [cover, ...photoScenes(photos, facts)]
  const drop = historyDrop(
    priceHistory,
    value => propertySaleMoney(value, priceHistory?.currency ?? property.price.currency),
    photos[1] ?? photos[0] ?? null
  )
  if (drop) scenes.push(drop)
  scenes.push(outro(propertySaleSourceName(property.source), photos[photos.length - 1] ?? null))
  return finish('sale', property.title, scenes)
}

export function buildPresentation(source: PresentationSource): ListingPresentation {
  if (source.kind === 'car') return carPresentation(source.car, source.cohort)
  if (source.kind === 'rental')
    return rentalPresentationOf(source.property, source.offer, source.market)
  return salePresentationOf(source.property, source.priceHistory)
}

/** Las fotos que el reproductor tiene que precargar antes de arrancar. */
export function presentationPhotos(presentation: ListingPresentation): string[] {
  return unique(
    presentation.scenes.map(item => ('photo' in item ? (item.photo as string | null) : null))
  )
}

/**
 * Saca las escenas cuya foto no se pudo cargar (o no manda CORS: el canvas quedaría manchado y la
 * descarga fallaría). La portada y el cierre se quedan sin foto, con su fondo liso; una foto suelta
 * sin imagen no tiene nada que mostrar y se va. Los contadores se rehacen.
 */
export function withoutBrokenPhotos(
  presentation: ListingPresentation,
  broken: ReadonlySet<string>
): ListingPresentation {
  const scenes = presentation.scenes.flatMap<PresentationScene>(item => {
    if (!('photo' in item) || !item.photo || !broken.has(item.photo)) return [item]
    return item.kind === 'photo' ? [] : [{ ...item, photo: null }]
  })
  const photos = scenes.filter(item => item.kind === 'photo')
  const cover = scenes[0]?.kind === 'cover' && scenes[0].photo ? 1 : 0
  const total = photos.length + cover
  let seen = cover
  const recounted = scenes.map(item =>
    item.kind === 'photo' ? { ...item, counter: `${++seen} / ${total}` } : item
  )
  return {
    ...presentation,
    scenes: recounted,
    duration: recounted.reduce((sum, item) => sum + item.duration, 0),
  }
}

/** "38 s" / "1 min 05 s". */
export function formatPresentationLength(ms: number): string {
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return `${seconds} s`
  return `${Math.floor(seconds / 60)} min ${String(seconds % 60).padStart(2, '0')} s`
}

/** Nombre del archivo descargado: el título sin tildes ni signos. */
export function presentationFileName(title: string, extension: string): string {
  const slug = title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${slug || 'aviso'}-cambio-uruguay.${extension}`
}
