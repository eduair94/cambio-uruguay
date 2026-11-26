// Quién usa los datos de Cambio Uruguay, para /quienes-usan-cambio-uruguay.
//
// Tres listas, con reglas distintas a propósito:
//
//   - PUBLIC_USES: sitios que muestran nuestras cotizaciones en público y lo DICEN. Entra sólo lo
//     que cualquiera puede ir a ver: la cita es textual (el pie que ellos escribieron) y la fecha es
//     la del día que lo vimos en su sitio. Un sitio que usa la API sin decirlo no entra con nombre:
//     no es nuestro anunciarlo.
//   - INTEGRATIONS: lo que muestran los registros del servidor de la API (referer y user-agent de
//     una semana), descrito por TIPO de uso y sin nombre. Son paneles, apps y scripts de terceros que
//     no nos citan en público; nombrarlos sería publicar algo que eligieron no publicar.
//   - CATALOGS: directorios de APIs que listan la nuestra después de revisarla.
//
// Para sumar un sitio: verlo con los propios ojos, copiar su pie tal cual y poner la fecha.
// Módulo PURO (sin Vue/Nuxt): la página y el test comparten la misma fuente.

export interface PublicUse {
  id: string
  name: string
  /** La página donde se ve el uso. */
  url: string
  /** Qué es el sitio, en pocas palabras. */
  kind: string
  /** Qué muestra y dónde. */
  what: string
  /** El pie o la mención tal cual está en su sitio. */
  quote: string
  /** Qué parte de Cambio Uruguay usa. */
  uses: string
  /** YYYY-MM-DD en que lo vimos publicado. */
  verifiedAt: string
}

export interface Integration {
  id: string
  /** El tipo de uso, sin nombre. */
  what: string
  /** Qué ruta de la API lee. */
  endpoint: string
}

export interface Catalog {
  id: string
  name: string
  url: string
  what: string
  verifiedAt: string
}

/** Semana de registros de la API sobre la que se describen las integraciones. */
export const INTEGRATIONS_WINDOW = Object.freeze({ from: '2026-11-19', to: '2026-11-25' })

export const PUBLIC_USES: readonly PublicUse[] = Object.freeze([
  {
    id: 'diario-norte',
    name: 'Diario NORTE',
    url: 'https://diarionorte.com.uy/',
    kind: 'Diario regional del norte del país, editado en Rivera',
    what: 'El recuadro «Cotización del día» de la portada y de cada nota: dólar, dólar eBROU, peso argentino, real, euro y unidad indexada, con compra y venta.',
    quote: 'Fuente: Banco República (datos vía Cambio-Uruguay.com)',
    uses: 'La pizarra del Banco República, como la publica nuestra API.',
    verifiedAt: '2026-11-25',
  },
  {
    id: 'eltemadehoy',
    name: 'ElTemaDeHoy',
    url: 'https://eltemadehoy.uy/',
    kind: 'Sitio de noticias de Uruguay',
    what: 'El bloque «Dólar hoy» de la portada, que se actualiza solo.',
    quote: 'Fuente: Cambio Uruguay · datos del BCU · se actualiza cada 10 min',
    uses: 'La API pública de cotizaciones, leída desde el navegador.',
    verifiedAt: '2026-11-25',
  },
  {
    id: 'montevideo-insider',
    name: 'Montevideo Insider',
    url: 'https://mvdinsider.com/money',
    kind: 'Noticias de Uruguay en inglés',
    what: 'La página «Dollar exchange rate in Uruguay today», con el promedio de las casas de cambio.',
    quote: 'Aggregate from cambio-uruguay.com across 42 exchange houses.',
    uses: 'Las cotizaciones de las casas de cambio, con enlace al sitio.',
    verifiedAt: '2026-11-25',
  },
])

export const INTEGRATIONS: readonly Integration[] = Object.freeze([
  {
    id: 'panel-casa',
    what: 'Un panel que muestra el dólar y el real de una casa de cambio uruguaya y se refresca cada pocos minutos.',
    endpoint: '/exchange/{casa}/{moneda}',
  },
  {
    id: 'widget-iphone',
    what: 'Un widget para la pantalla de inicio del iPhone, hecho con Scriptable, con las cotizaciones de la región.',
    endpoint: '/regional',
  },
  {
    id: 'extension-mercadolibre',
    what: 'Un complemento del navegador que consulta la cotización mientras se navega Mercado Libre de Argentina, México, Colombia y Uruguay.',
    endpoint: '/fortex',
  },
  {
    id: 'app-billetera',
    what: 'Una app web de finanzas personales que lee todas las cotizaciones del día.',
    endpoint: '/',
  },
  {
    id: 'app-preferenciales',
    what: 'Una aplicación sobre Supabase que lee las tasas preferenciales por monto.',
    endpoint: '/preferential-rates',
  },
  {
    id: 'historicos-bancos',
    what: 'Integraciones de servidor que leen la evolución del dólar del BROU, Itaú, Santander y Prex, y la unidad indexada del BCU.',
    endpoint: '/evolution/{origen}/{moneda} · /exchange/bcu/UI',
  },
  {
    id: 'intradia',
    what: 'Un lector que sigue la cotización intradía.',
    endpoint: '/intraday',
  },
])

export const CATALOGS: readonly Catalog[] = Object.freeze([
  {
    id: 'public-apis',
    name: 'public-apis (marcelscruz)',
    url: 'https://github.com/marcelscruz/public-apis',
    what: 'Una de las listas de APIs públicas más seguidas de GitHub.',
    verifiedAt: '2026-09-04',
  },
  {
    id: 'apis-io',
    name: 'APIs.io',
    url: 'https://apis.io/providers/cambio-uruguay/',
    what: 'Directorio de APIs; verificaron la especificación OpenAPI, las respuestas sin clave y el servidor MCP.',
    verifiedAt: '2026-09-22',
  },
  {
    id: 'jentic',
    name: 'Jentic',
    url: 'https://jentic.com/apis/cambio-uruguay.com/cambio-uruguay',
    what: 'Catálogo de APIs para que los agentes de IA las puedan llamar.',
    verifiedAt: '2026-11-13',
  },
  {
    id: 'awesome-quant',
    name: 'awesome-quant',
    url: 'https://github.com/wilsonfreitas/awesome-quant',
    what: 'Lista de recursos de finanzas cuantitativas, en «Market Data & Data Sources».',
    verifiedAt: '2026-09-22',
  },
])
