// app/utils/discountApps.ts
// "¿Dónde tengo descuento con esta tarjeta?" — buscadores de beneficios de terceros.
//
// Los rankings de /tarjetas-de-credito-uruguay y /tarjetas-de-debito-uruguay miden
// el PROGRAMA (acumulación, canje, costo). Esto es el problema del día a día: ya
// tenés las tarjetas, y el descuento existe, pero nadie entra a la web de cada
// banco antes de sentarse a comer. Estas herramientas resuelven eso.
//
// Módulo PURO (sin Vue/Nuxt) para que las dos páginas y el test compartan una sola
// fuente de verdad.
//
// No tenemos afiliación ni acuerdo con ninguna de estas apps: no hay links de
// referido ni comisión. Cada dato duro tiene fuente y fecha; lo que la app declara
// de sí misma se marca como autodeclarado y no se presenta como verificado.

/** Fecha (YYYY-MM-DD) en que se verificaron los datos de abajo contra las fuentes. */
export const DISCOUNT_FINDERS_LAST_REVIEWED = '2026-08-17'

/** Un dato concreto, con la fuente que lo respalda, mostrado como fila de ficha. */
export interface FinderFact {
  label: string
  value: string
  /** De dónde sale el dato: sirve para separar lo verificado de lo autodeclarado. */
  source: 'oficial' | 'tienda' | 'prensa' | 'autodeclarado'
}

export interface DiscountFinder {
  id: string
  name: string
  /** Qué resuelve, en una línea. */
  tagline: string
  kind: 'app' | 'web'
  /** Gratis para el usuario final. */
  free: boolean
  siteUrl: string
  iosUrl?: string
  androidUrl?: string
  /** Cómo funciona, en criollo. */
  how: string
  /** Emisores y clubes de beneficios que declara cubrir. */
  covers: readonly string[]
  strengths: readonly string[]
  /** Lo que hay que saber antes de confiarle una decisión de compra. */
  caveats: readonly string[]
  facts: readonly FinderFact[]
  /** true cuando los datos centrales se pudieron ver en fuente primaria. */
  verified: boolean
}

export interface FinderSource {
  label: string
  url: string
  publisher: string
}

export const DISCOUNT_FINDERS: readonly DiscountFinder[] = Object.freeze([
  {
    id: 'bankos',
    name: 'Bankos',
    tagline:
      'Marcás las tarjetas que tenés y te muestra en un mapa qué comercios cerca tuyo tienen descuento con esas tarjetas.',
    kind: 'app',
    free: true,
    siteUrl: 'https://bankos.uy/',
    iosUrl: 'https://apps.apple.com/uy/app/bankos/id6748040860',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.anonymous.bankos',
    how: 'Elegís de una lista los bancos y tarjetas que usás —nunca te pide el número de tarjeta— y a partir de ahí el mapa te muestra solo los beneficios que podés usar de verdad. Se filtra por rubro (restaurantes, cafeterías, heladerías, mercados, tecnología, ópticas, vehículos), por día de la semana —que es justo el filtro que resuelve el "¿qué me conviene hoy?"— y por comercio, con vistas de mejor calificados y favoritos. Cada ficha de comercio muestra el beneficio textual por emisor y discrimina por gama de tarjeta. Los datos no los carga nadie a mano: el equipo levanta las webs de los bancos, las procesa con código, cruza con Google Maps y suma reportes de usuarios. Desde la versión de julio de 2026 sumó un "Recomendador de tarjetas" que te muestra qué tarjeta o banco te conviene más.',
    covers: [
      'BROU',
      'BBVA',
      'Itaú',
      'Scotiabank',
      'Santander',
      'OCA',
      'Club El País',
      'ANDA',
      'Mercado Pago',
      'Prex',
    ],
    strengths: [
      'Resuelve el problema real: el descuento ya existe, lo que falta es enterarse antes de pagar y no después.',
      'No pide número de tarjeta ni datos bancarios, y funciona sin crear cuenta.',
      'Cubre crédito y débito del mismo emisor, y discrimina por gama de tarjeta (no es lo mismo la clásica que la Platinum).',
      'Filtra por las tarjetas que realmente tenés: no te muestra el 10% del banco del que no sos cliente.',
      'El filtro por día de la semana es el que más sirve: los descuentos uruguayos son casi todos "los martes" o "los viernes".',
    ],
    caveats: [
      'Los beneficios los arma un tercero scrapeando las webs de los bancos y sumando reportes de usuarios: un descuento vencido o mal leído puede quedar visible. Sus propios términos se cubren ("los descuentos y condiciones pueden cambiar sin previo aviso"). La letra chica válida sigue siendo la del emisor.',
      'Los comercios pueden pagar por aparecer destacados en el mapa ($ 2.500/mes por local según su propia tarifa). Un pin destacado significa que el local paga, no que tenga el mejor descuento.',
      'No pide datos de tarjeta, pero sí recoge nombre de pila, fecha de nacimiento, género y qué bancos y tarjetas marcaste. Su política de privacidad (8/8/2026) prevé compartir o vender conjuntos de datos agregados o desidentificados a terceros; ofrece opt-out y borrado a pedido, pero por mail, no con un botón en la app.',
      'Las cifras de tamaño son autodeclaradas y no cierran entre sí: el sitio dice +25.000 usuarios activos, pero en abril de 2026 uno de los fundadores declaró a la prensa 20.000 descargas totales y 2.500 usuarios activos en 30 días, y hoy Google Play la lista en +5.000 descargas.',
      'La cobertura fuera de Montevideo no es verificable: todo el material oficial es de Montevideo y una captura de la propia app cuenta "1385 comercios encontrados" contra el "+5.000 locales" del sitio.',
      'No cubre todos los emisores: faltan Cabal, Passcard, Creditel, MiDinero y Socio Espectacular, y hay reseñas pidiéndolos. Tampoco podés marcar más de 10 tarjetas.',
      'No hay versión web: si no querés instalar nada, Bankos no te sirve.',
      'Las críticas en las tiendas apuntan a lo previsible: la lista no siempre se reordena según la zona del mapa, información de tarjetas percibida como desactualizada y locales con descuento que no figuran.',
    ],
    facts: [
      {
        label: 'Precio',
        value: '100% gratis para el usuario, sin registro obligatorio',
        source: 'oficial',
      },
      {
        label: 'Datos de tarjeta',
        value: 'No los pide: solo marcás qué bancos y tarjetas tenés',
        source: 'oficial',
      },
      {
        label: 'Cobertura declarada',
        value: '+5.000 locales con beneficios en todo el país',
        source: 'autodeclarado',
      },
      {
        label: 'En las tiendas',
        value:
          'App Store: 5,0 con 24 calificaciones, v2.1.4 del 4/8/2026. Google Play: 4,3 con 28 opiniones y +5.000 descargas, actualizada el 30/7/2026. Sin anuncios ni compras dentro de la app',
        source: 'tienda',
      },
      {
        label: 'Quién está detrás',
        value:
          'Juan Manuel Pagola y Rémy Lhéritier (Uruguay). MVP a fines de 2024 y versión definitiva en octubre de 2025',
        source: 'prensa',
      },
      {
        label: 'Cómo se financia',
        value:
          'Planes para comercios desde $ 2.500/mes por local, más la venta de datos agregados o desidentificados prevista en su política de privacidad',
        source: 'oficial',
      },
    ],
    verified: true,
  },
  {
    id: 'uruguay-descuentos',
    name: 'Uruguay Descuentos',
    tagline:
      'Sitio web que lista promociones del día filtrables por banco y tarjeta, sin instalar nada.',
    kind: 'web',
    free: true,
    siteUrl: 'https://uruguaydescuentos.com/',
    how: 'Es una web, no una app: entrás, filtrás por banco o por rubro y ves las promos vigentes del día. Sirve para chequear rápido desde la computadora o cuando no querés instalar nada, pero no tiene mapa ni te arma la lista según las tarjetas que tenés.',
    covers: ['BROU', 'BBVA', 'Itaú', 'Scotiabank', 'Santander', 'OCA'],
    strengths: [
      'No hay que instalar ni registrarse.',
      'Vista por día, útil para planificar (a qué supermercado ir el martes).',
    ],
    caveats: [
      'Sin geolocalización ni mapa: te dice el beneficio, no dónde está el local más cercano.',
      'No filtra por las tarjetas que tenés, así que hay que descartar a mano.',
    ],
    facts: [
      { label: 'Precio', value: 'Gratis, sin registro', source: 'oficial' },
      { label: 'Formato', value: 'Web, sin app', source: 'oficial' },
    ],
    verified: false,
  },
])

/**
 * La fuente de última instancia sigue siendo el emisor: cualquier agregador puede
 * atrasarse, y ante una diferencia manda la base y condiciones del banco.
 */
export const OFFICIAL_BENEFIT_PAGES: readonly FinderSource[] = Object.freeze([
  {
    label: 'Beneficios BROU Recompensa',
    url: 'https://recompensa.brou.com.uy/beneficios',
    publisher: 'BROU',
  },
  {
    label: 'Descuentos BBVA',
    url: 'https://www.bbva.com.uy/personas/productos/tarjetas/descuentos.html',
    publisher: 'BBVA Uruguay',
  },
  {
    label: 'Beneficios Santander',
    url: 'https://www.santander.com.uy/beneficios',
    publisher: 'Banco Santander Uruguay',
  },
  {
    label: 'Beneficios Scotiabank',
    url: 'https://www.scotiabank.com.uy/Personas/Tarjetas/Beneficios/default',
    publisher: 'Scotiabank Uruguay',
  },
])

export const DISCOUNT_FINDER_SOURCES: readonly FinderSource[] = Object.freeze([
  { label: 'Bankos — sitio oficial', url: 'https://bankos.uy/', publisher: 'Bankos' },
  {
    label: 'Bankos — política de privacidad (8/8/2026)',
    url: 'https://bankos.uy/privacy/',
    publisher: 'Bankos',
  },
  {
    label: 'Bankos en App Store',
    url: 'https://apps.apple.com/uy/app/bankos/id6748040860',
    publisher: 'Apple',
  },
  {
    label: 'Bankos en Google Play',
    url: 'https://play.google.com/store/apps/details?id=com.anonymous.bankos',
    publisher: 'Google',
  },
  {
    label: '"¿En dónde tengo descuentos con mi tarjeta?" — nota sobre Bankos (23/4/2026)',
    url: 'https://www.egu.org.uy/post/en-d%C3%B3nde-tengo-descuentos-con-mi-tarjeta-la-app-uruguaya-convierte-beneficios-en-inteligencia-de',
    publisher: 'EGU',
  },
])

/** El buscador principal (el que encabeza el bloque en las páginas de tarjetas). */
export function primaryFinder(): DiscountFinder {
  return DISCOUNT_FINDERS[0]!
}

export function getDiscountFinder(id: string): DiscountFinder | undefined {
  return DISCOUNT_FINDERS.find(f => f.id === id)
}

/** Emisores cubiertos por al menos una de las herramientas, sin repetir. */
export function coveredIssuers(): string[] {
  return [...new Set(DISCOUNT_FINDERS.flatMap(f => f.covers))]
}
