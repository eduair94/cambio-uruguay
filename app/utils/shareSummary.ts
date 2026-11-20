import { normalizeShareText } from './sharedLinks'

/** The 19 departments, written here and not imported from utils/cars.ts: this module ships with the share button on every page. */
const DEPARTMENT_NAMES = [
  'Artigas',
  'Canelones',
  'Cerro Largo',
  'Colonia',
  'Durazno',
  'Flores',
  'Florida',
  'Lavalleja',
  'Maldonado',
  'Montevideo',
  'Paysandú',
  'Río Negro',
  'Rivera',
  'Rocha',
  'Salto',
  'San José',
  'Soriano',
  'Tacuarembó',
  'Treinta y Tres',
]

const labels = {
  es: [
    'Búsqueda',
    'Marca',
    'Modelo',
    'Precio desde',
    'Precio hasta',
    'Departamento',
    'Barrio',
    'Dormitorios',
    'Condición',
    'Categoría',
    'Moneda',
    'Año desde',
    'Año hasta',
    'Kilometraje hasta',
    'Banco',
  ],
  en: [
    'Search',
    'Brand',
    'Model',
    'Minimum price',
    'Maximum price',
    'Department',
    'Neighbourhood',
    'Bedrooms',
    'Condition',
    'Category',
    'Currency',
    'Year from',
    'Year to',
    'Maximum mileage',
    'Bank',
  ],
  pt: [
    'Busca',
    'Marca',
    'Modelo',
    'Preço mínimo',
    'Preço máximo',
    'Departamento',
    'Bairro',
    'Quartos',
    'Condição',
    'Categoria',
    'Moeda',
    'Ano desde',
    'Ano até',
    'Quilometragem máxima',
    'Banco',
  ],
}
const labelIndex: Record<string, number> = {
  q: 0,
  brand: 1,
  marca: 1,
  model: 2,
  modelo: 2,
  priceMin: 3,
  minPrice: 3,
  precioMin: 3,
  priceMax: 4,
  maxPrice: 4,
  precioMax: 4,
  department: 5,
  departamento: 5,
  neighborhood: 6,
  bedrooms: 7,
  condicion: 8,
  condition: 8,
  categoria: 9,
  currency: 10,
  moneda: 10,
  yearMin: 11,
  anioDesde: 11,
  yearMax: 12,
  anioHasta: 12,
  kmMax: 13,
  banco: 14,
}

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
const DEPARTMENTS = new Map(DEPARTMENT_NAMES.map(name => [fold(name), name]))
const CURRENCIES = new Set(['UYU', 'USD', 'EUR', 'BRL', 'ARS'])
const CONDITIONS = new Map([
  ['nuevo', { es: 'nuevo', en: 'new', pt: 'novo' }],
  ['usado', { es: 'usado', en: 'used', pt: 'usado' }],
])
const NUMERIC = new Set([3, 4, 7, 11, 12, 13])

/**
 * The value as the card may print it, or null. Only closed vocabularies pass: a department, a
 * currency, a condition, a number. Free text from the URL (the search box, a brand, a model, a
 * neighbourhood, a category) never reaches a card on this domain: a link anyone can mint must not
 * carry words its author typed under the site's name.
 */
function closedValue(index: number, raw: string, locale: string): string | null {
  if (NUMERIC.has(index)) return /^\d{1,9}$/.test(raw) ? raw : null
  if (index === 5) return DEPARTMENTS.get(fold(raw)) ?? null
  if (index === 10) return CURRENCIES.has(raw.toUpperCase()) ? raw.toUpperCase() : null
  if (index === 8) {
    const condition = CONDITIONS.get(fold(raw))
    return condition ? condition[locale as 'es' | 'en' | 'pt'] || condition.es : null
  }
  return null
}

/** A brief readable preview, never an assertion about how many results or current prices exist. */
export function publicShareSummary(path: string, locale: string): string {
  const names = labels[locale as keyof typeof labels] || labels.es
  const params = new URL(path, 'https://cambio-uruguay.com').searchParams
  const parts: string[] = []
  const used = new Set<number>()
  for (const [key, value] of params) {
    const index = labelIndex[key]
    if (index === undefined || used.has(index)) continue
    const text = closedValue(index, value.trim(), locale)
    if (!text) continue
    used.add(index)
    parts.push(`${names[index]}: ${normalizeShareText(text, 60)}`)
    if (parts.length === 5) break
  }
  return parts.join(' · ')
}
