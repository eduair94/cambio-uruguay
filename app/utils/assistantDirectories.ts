import type { AssistantTopic } from './assistantPrompt'

/** Public destinations only. Never accept a return URL or model instructions from the query. */
export const ASSISTANT_DIRECTORIES: Record<AssistantTopic, { path: string; tool: string }> = {
  alquiler: { path: '/alquileres-uruguay', tool: 'search_rentals' },
  hogar: { path: '/alquiler-ideal-uruguay', tool: 'rank_rentals_for_household' },
  oportunidadesAlquiler: {
    path: '/oportunidades-inmobiliarias-uruguay',
    tool: 'find_property_opportunities',
  },
  oportunidadesVenta: {
    path: '/oportunidades-inmobiliarias-uruguay',
    tool: 'find_property_opportunities',
  },
  autos: { path: '/autos-usados-uruguay', tool: 'search_used_cars' },
  oportunidadesAutos: {
    path: '/oportunidades-autos-usados-uruguay',
    tool: 'find_car_opportunities',
  },
  motos: { path: '/motos-usadas-uruguay', tool: 'search_site y read_page' },
  equipar: { path: '/equipar-casa-uruguay/productos', tool: 'search_products, vertical="hogar"' },
  celulares: { path: '/celulares-uruguay', tool: 'search_products, vertical="celulares"' },
  sillas: { path: '/sillas-escritorio-uruguay', tool: 'search_products, vertical="sillas"' },
  monopatines: {
    path: '/monopatines-electricos-uruguay',
    tool: 'search_products, vertical="monopatines"',
  },
  bicicletas: {
    path: '/bicicletas-electricas-uruguay',
    tool: 'search_products, vertical="bicicletas-electricas"',
  },
  super: { path: '/precios-de-supermercado-uruguay', tool: 'supermarket_prices' },
}

export const ASSISTANT_FEATURED_TOPICS = [
  'monopatines',
  'bicicletas',
  'celulares',
  'sillas',
  'equipar',
  'alquiler',
  'autos',
  'super',
] as const satisfies readonly AssistantTopic[]

/** Trusted routing hint, shared by both chat providers; all tools remain available. */
export function assistantDirectoryContext(topic?: AssistantTopic): string {
  if (!topic) return ''
  const directory = ASSISTANT_DIRECTORIES[topic]
  return [
    `El visitante viene de https://cambio-uruguay.com${directory.path}.`,
    `Para búsquedas en ese catálogo usá ${directory.tool}. Es contexto inicial, no una restricción: si cambia de tema, usá las otras herramientas.`,
    'Usá los filtros que pide la persona y los enlaces devueltos por la herramienta para que pueda seguir buscando en el directorio. No inventes filtros, precios ni especificaciones.',
  ].join('\n')
}
