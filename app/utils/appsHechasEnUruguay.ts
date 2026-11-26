// app/utils/appsHechasEnUruguay.ts
// Las apps, webs y herramientas de /apps-hechas-en-uruguay: lo que hacen desarrolladores uruguayos
// por su cuenta. La lista arrancó con el hilo «Recopilatorio apps uruguayas» de r/CharruaDevs
// (17/11/2026) y suma lo que llega por la invitación de la página («¿Hiciste una app o una web?
// Mandala»), pero NADA de lo que dice una tarjeta sale del hilo ni del mensaje de quien la manda:
// cada frase se leyó en la web o en la ficha de tienda del propio proyecto, abierta el día de
// `verifiedAt` (la URL de `source`).
//
// Reglas que este archivo cumple y su test vigila (tests/unit/appsHechasEnUruguay.test.ts):
// - Ningún usuario de Reddit, ningún perfil personal de GitHub, ningún nombre de persona. Si la
//   tienda nombra a una persona como desarrollador (pasa con dos de estas apps), la tarjeta no dice
//   quién la publica: `publisher` sólo se completa con una marca u organización que el propio
//   proyecto declara.
// - Un precio sólo si el proyecto lo publica, con sus palabras.
// - `uruguayBy` + `origin` dicen EXACTAMENTE qué afirma la fuente sobre Uruguay: «hecha por
//   uruguayos» (sus palabras), un domicilio en sus términos o su ficha, una web hecha para el
//   mercado uruguayo que no dice quién la hace, o nada (sólo el hilo). Una web para «tiendas de
//   Uruguay» no dice que la haga alguien de acá, y la tarjeta no lo afirma por ella.
// - Una app que sí cumpla la regla de /apps-utiles-uruguay (en tienda, publicada por quien presta el
//   servicio, o no oficial pero muy usada) va ALLÁ, no acá. Al 20/11/2026 ninguna del hilo la cumplía.
//
// Módulo puro (sin Vue ni Nuxt) para que lo cargue vitest. `utils/` es un espacio de auto-import
// plano: todo lo exportado lleva el prefijo HECHAS_EN_UY / hechasEnUy para no chocar con moneyApps.ts
// ni con usefulApps.ts.
import type { FaqItem } from './faqAnswers'
import { usefulAppAppStoreUrl, usefulAppPlayUrl } from './usefulApps'

export type HechaEnUyCategoryId =
  'dia-a-dia' | 'herramientas' | 'juegos' | 'negocios' | 'codigo-abierto'

export type HechaEnUyPlatform = 'web' | 'android' | 'ios' | 'api' | 'biblioteca'

export interface HechaEnUyCategory {
  id: HechaEnUyCategoryId
  label: string
  /** Una línea debajo del título de la sección. */
  blurb: string
  icon: string
}

/**
 * De dónde sale lo de "hecho en Uruguay", de más fuerte a más débil. No es lo mismo decir «hecha por
 * uruguayos» que estar hecha PARA Uruguay: un buscador de tiendas uruguayas lo puede hacer cualquiera.
 * - `hecha-por-uruguayos`: el proyecto lo dice con esas palabras en su web o su ficha.
 * - `domicilio-en-uruguay`: sus términos o su ficha de tienda ubican a quien lo hace en Uruguay.
 * - `para-uruguay`: su web está hecha para el mercado uruguayo, pero no dice quién lo hace.
 * - `hilo`: su web no dice nada de Uruguay; llegó porque su autor lo compartió en el hilo.
 */
export type HechaEnUyOrigin =
  'hecha-por-uruguayos' | 'domicilio-en-uruguay' | 'para-uruguay' | 'hilo'

export interface HechaEnUy {
  /** kebab-case, único: también es el #ancla de la tarjeta. */
  id: string
  /** Como lo escribe el proyecto (se dibuja con translate="no"). */
  name: string
  /** La web propia del proyecto, en https. Falta sólo si el proyecto no tiene otra cosa que su ficha. */
  url?: string
  /** Texto del botón de `url` cuando no es "Ir al sitio" (p. ej. el código en GitHub). */
  urlLabel?: string
  /** Documentación propia, si el proyecto la publica aparte. */
  docs?: string
  platforms: readonly HechaEnUyPlatform[]
  /** Paquete de Google Play; el botón se arma con usefulAppPlayUrl(). */
  android?: { id: string }
  /** Id numérico del App Store; el botón se arma con usefulAppAppStoreUrl(). */
  ios?: { id: string }
  category: HechaEnUyCategoryId
  /** Qué hace, en una o dos frases, con lo que dice su web o su ficha. */
  what: string
  /** `what` en pocas palabras, para la pregunta frecuente que lista todos («que traduce subtítulos con IA»). */
  tagline: string
  /** Sólo si el proyecto lo publica. */
  price?: string
  /** Sólo una marca u organización que el propio proyecto declara; nunca una persona. */
  publisher?: string
  /** Qué dice la fuente sobre lo de "hecho en Uruguay" (ver HechaEnUyOrigin). */
  uruguayBy: HechaEnUyOrigin
  /** La línea de la tarjeta, con lo que dice exactamente esa fuente y nada más. */
  origin: string
  /** Dónde se leyó `origin`, cuando no es `source` (p. ej. los términos del servicio). */
  originSource?: string
  /** Dónde se leyó `what` (y el resto de la tarjeta). */
  source: string
  /** YYYY-MM-DD: el día en que se abrió `source`. */
  verifiedAt: string
  /** Una aclaración corta (p. ej. el nombre exacto en la tienda). */
  note?: string
}

/**
 * La última revisión: el día más reciente en que se abrió una web o una ficha de este archivo. Cada
 * tarjeta lleva el suyo (`verifiedAt`): las ocho primeras se abrieron el 20/11/2026 y las que llegan
 * después por la invitación de la página, el día en que se revisaron.
 */
export const HECHAS_EN_UY_VERIFIED_AT = '2026-11-25'

/** La única referencia a Reddit de la página: el hilo, con su fecha. Sin usuarios ni citas. */
export const HECHAS_EN_UY_THREAD = Object.freeze({
  url: 'https://www.reddit.com/r/CharruaDevs/comments/1xyrlpa/recopilatorio_apps_uruguayas/',
  title: 'Recopilatorio apps uruguayas',
  subreddit: 'r/CharruaDevs',
  date: '2026-11-17',
})

export const HECHAS_EN_UY_CATEGORIES: readonly HechaEnUyCategory[] = Object.freeze([
  {
    id: 'dia-a-dia',
    label: 'Para el día a día',
    blurb: 'Para comprar, para la casa y para los datos de todos los días.',
    icon: 'mdi-account-group-outline',
  },
  {
    id: 'herramientas',
    label: 'Herramientas y creatividad',
    blurb: 'Servicios web que resuelven una tarea puntual.',
    icon: 'mdi-star-four-points-outline',
  },
  {
    id: 'juegos',
    label: 'Para jugar',
    blurb: 'Juegos que se juegan en el navegador, sin instalar nada.',
    icon: 'mdi-gamepad-variant-outline',
  },
  {
    id: 'negocios',
    label: 'Para tu negocio',
    blurb: 'Software para comercios y gimnasios, con suscripción.',
    icon: 'mdi-store-outline',
  },
  {
    id: 'codigo-abierto',
    label: 'Código abierto',
    blurb: 'Para quien programa: se usa dentro de otra aplicación.',
    icon: 'mdi-code-braces',
  },
])

export const HECHAS_EN_UY_PLATFORM_LABELS: Readonly<Record<HechaEnUyPlatform, string>> =
  Object.freeze({
    web: 'Web',
    android: 'Android',
    ios: 'iPhone',
    api: 'API',
    biblioteca: 'Biblioteca de Python',
  })

export const HECHAS_EN_UY_PLATFORM_ICONS: Readonly<Record<HechaEnUyPlatform, string>> =
  Object.freeze({
    web: 'mdi-web',
    android: 'mdi-android',
    ios: 'mdi-apple',
    api: 'mdi-api',
    biblioteca: 'mdi-code-braces',
  })

export const HECHAS_EN_UY: readonly HechaEnUy[] = Object.freeze([
  {
    id: 'luce',
    name: 'Luce',
    url: 'https://luce.uy/',
    platforms: ['web'],
    category: 'dia-a-dia',
    what: 'Un buscador de ropa con inteligencia artificial que junta más de 200.000 productos de más de 400 tiendas uruguayas, con los precios en pesos. Le contás qué buscás y comparás las ofertas de varias tiendas a la vez.',
    tagline: 'que busca ropa en más de 400 tiendas uruguayas',
    uruguayBy: 'para-uruguay',
    origin:
      'Su web busca en tiendas de Uruguay, pero no dice quién la hace; su autor la compartió en el hilo de r/CharruaDevs.',
    source: 'https://luce.uy/',
    verifiedAt: '2026-11-20',
  },
  {
    id: 'carpincho',
    name: 'Carpincho',
    url: 'https://superapp.uy/',
    platforms: ['android', 'ios'],
    android: { id: 'com.carpincho.app' },
    ios: { id: '6759762265' },
    category: 'dia-a-dia',
    what: 'Junta el dólar del BROU, la nafta de ANCAP y los feriados, con datos oficiales, más el clima, una calculadora de sueldo y un mapa de cortes de luz que reporta la gente. Avisa vencimientos (cédula, carné de salud) y divide gastos compartidos.',
    tagline: 'con el dólar, la nafta y los feriados',
    price: 'Gratis y sin publicidad, según su ficha del App Store.',
    uruguayBy: 'hecha-por-uruguayos',
    origin: 'Su web y su ficha del App Store dicen que la hacen uruguayos.',
    source: 'https://apps.apple.com/uy/app/carpincho-d%C3%B3lar-y-nafta-uy/id6759762265',
    verifiedAt: '2026-11-20',
    note: 'En el App Store figura como «Carpincho: Dólar y Nafta UY».',
  },
  {
    id: 'clara-bienestar-digital',
    name: 'Clara: Bienestar Digital',
    platforms: ['android'],
    android: { id: 'com.martin.kidsscreentimer' },
    category: 'dia-a-dia',
    what: 'Un temporizador para anotar cuánto tiempo pasa cada hijo frente a las pantallas: un perfil por niño, el tiempo permitido y una alarma al terminar, con gráficos por día y por mes. Los datos quedan en tu teléfono.',
    tagline: 'un temporizador de pantallas para chicos',
    price: 'Gratis en Google Play.',
    uruguayBy: 'domicilio-en-uruguay',
    origin:
      'Su ficha de Google Play ubica al desarrollador en Uruguay; su autor la compartió en el hilo de r/CharruaDevs.',
    source: 'https://play.google.com/store/apps/details?id=com.martin.kidsscreentimer&hl=es&gl=UY',
    verifiedAt: '2026-11-20',
    note: 'En Google Play figura como «Clara: Bienestar digítal».',
  },
  {
    id: 'subtitio',
    name: 'Subtitio.ai',
    url: 'https://subtitio.ai/',
    platforms: ['web', 'api'],
    category: 'herramientas',
    what: 'Traduce archivos de subtítulos SRT, VTT y ASS con inteligencia artificial a más de 50 idiomas, sin tocar los tiempos ni el formato. También tiene una API para mandarle archivos desde tu propio servicio.',
    tagline: 'que traduce subtítulos con IA',
    price: 'Plan gratis, sin tarjeta, y planes pagos para traducir más.',
    uruguayBy: 'hilo',
    origin:
      'Su web no dice de dónde es; su autor la compartió en el hilo de r/CharruaDevs sobre apps uruguayas.',
    source: 'https://subtitio.ai/',
    verifiedAt: '2026-11-20',
    note: 'La web está en inglés.',
  },
  {
    id: 'your-starry-map',
    name: 'Your Starry Map',
    url: 'https://yourstarrymap.com/es/',
    platforms: ['web'],
    category: 'herramientas',
    what: 'Armás el mapa de las estrellas tal como estaba el cielo en el lugar y la fecha que elegís, le agregás nombres y un texto, elegís un estilo y bajás un PDF A3 listo para imprimir.',
    tagline: 'que arma mapas de estrellas para imprimir',
    price: 'Se paga por mapa, en dólares y por PayPal; el precio se ve antes de pagar.',
    publisher: 'YourStarryMap, según sus términos',
    uruguayBy: 'hilo',
    origin:
      'Su web no dice de dónde es; su autor la compartió en el hilo de r/CharruaDevs sobre apps uruguayas.',
    source: 'https://yourstarrymap.com/es/',
    verifiedAt: '2026-11-20',
    note: 'Es un archivo digital: te llega por correo un enlace al PDF y no se imprime ni se manda nada en papel.',
  },
  {
    id: 'mapa-en-clave',
    name: 'El mapa en clave: 5 pistas para descubrir Uruguay',
    url: 'https://tina-gateway-app-production.up.railway.app/mateina/pistas',
    platforms: ['web'],
    category: 'juegos',
    what: 'Un juego de cinco pistas: te muestra el código oficial de un departamento, como UYTT, y elegís a cuál corresponde entre tres opciones. Cada respuesta enlaza a la tabla de códigos del Instituto Geográfico Militar.',
    tagline: 'un juego para adivinar departamentos por su código oficial',
    publisher: 'Mateína, según su web',
    uruguayBy: 'para-uruguay',
    origin:
      'Su web es de Mateína, que se presenta como noticias y entretenimiento de Uruguay, pero no dice quién la hace; nos la mandaron por la invitación de esta página.',
    source: 'https://tina-gateway-app-production.up.railway.app/mateina/pistas',
    verifiedAt: '2026-11-25',
    note: 'Se juega en el navegador y sin registro; las cinco pistas son siempre las mismas.',
  },
  {
    id: 'kiosko',
    name: 'Kiosko.uy',
    url: 'https://kiosko.uy/',
    platforms: ['web'],
    category: 'negocios',
    what: 'Un sistema de caja y stock para kioscos, almacenes y autoservicios de Uruguay: cobrás con el lector de códigos, recibís mercadería, cerrás la caja y ves cuánto ganaste. Emite e-Tickets y e-Facturas a través de Pymo.',
    tagline: 'la caja y el stock de un almacén',
    price: '$ 1.000 + IVA por mes por local; la demo es gratis.',
    uruguayBy: 'para-uruguay',
    origin:
      'Su web está hecha para los comercios de Uruguay, pero no dice quién la hace; llegó a la lista por el hilo de r/CharruaDevs.',
    source: 'https://kiosko.uy/',
    verifiedAt: '2026-11-20',
    note: 'Se usa desde el navegador: su web no enlaza ninguna app de tienda.',
  },
  {
    id: 'gymapp',
    name: 'GymApp',
    url: 'https://gymapp.live/',
    platforms: ['web'],
    category: 'negocios',
    what: 'Un sistema en la nube para gimnasios, entrenadores y nutricionistas: socios, ventas, rutinas, dietas, control de acceso por QR, molinete o huella, y stock. Los socios tienen una app para ver rutinas y comprar membresías.',
    tagline: 'el sistema de un gimnasio',
    price: 'Planes anuales desde US$ 50 por año, con un mes gratis.',
    uruguayBy: 'domicilio-en-uruguay',
    origin: 'Sus términos lo ubican en Montevideo y lo rigen por las leyes de Uruguay.',
    originSource: 'https://gymapp.live/terminos',
    source: 'https://gymapp.live/',
    verifiedAt: '2026-11-20',
    note: 'Su web no enlaza la app de los socios en ninguna tienda.',
  },
  {
    id: 'python-social-auth',
    name: 'Python Social Auth',
    url: 'https://github.com/python-social-auth',
    urlLabel: 'Código en GitHub',
    docs: 'https://python-social-auth.readthedocs.io/',
    platforms: ['biblioteca'],
    category: 'codigo-abierto',
    what: 'Una biblioteca de código abierto en Python para que una aplicación web deje entrar o registrarse con cuentas de otros servicios, con módulos para Django, Flask, Pyramid, Tornado y otros frameworks.',
    tagline: 'una biblioteca de código abierto para Python',
    price: 'Código abierto, con licencia BSD.',
    publisher: 'la organización Python Social Auth, en GitHub',
    uruguayBy: 'hilo',
    origin:
      'Su página en GitHub no dice de dónde es; la compartió en el hilo de r/CharruaDevs alguien que trabaja en el proyecto.',
    source: 'https://github.com/python-social-auth/social-core',
    verifiedAt: '2026-11-20',
  },
])

export interface HechaEnUyLink {
  label: string
  href: string
  icon: string
  ariaLabel: string
}

/**
 * Los botones de una tarjeta, en dos grupos porque llevan `rel` distinto: los del proyecto son una
 * elección editorial (sólo `noopener`, para que el desarrollador vea de dónde llegó la visita) y los
 * de tienda copian a /apps-utiles-uruguay (`noopener noreferrer nofollow`).
 */
export function hechasEnUyLinks(item: HechaEnUy): {
  site: HechaEnUyLink[]
  stores: HechaEnUyLink[]
} {
  const site: HechaEnUyLink[] = []
  if (item.url) {
    const label = item.urlLabel ?? 'Ir al sitio'
    site.push({
      label,
      href: item.url,
      icon: new URL(item.url).hostname === 'github.com' ? 'mdi-github' : 'mdi-web',
      ariaLabel: `${label} de ${item.name} (se abre en otra pestaña)`,
    })
  }
  if (item.docs) {
    site.push({
      label: 'Documentación',
      href: item.docs,
      icon: 'mdi-book-open-page-variant-outline',
      ariaLabel: `Documentación de ${item.name} (se abre en otra pestaña)`,
    })
  }
  const stores: HechaEnUyLink[] = []
  if (item.android) {
    stores.push({
      label: 'Google Play',
      href: usefulAppPlayUrl(item.android.id),
      icon: 'mdi-google-play',
      ariaLabel: `${item.name} en Google Play (se abre en otra pestaña)`,
    })
  }
  if (item.ios) {
    stores.push({
      label: 'App Store',
      href: usefulAppAppStoreUrl(item.ios.id),
      icon: 'mdi-apple',
      ariaLabel: `${item.name} en el App Store (se abre en otra pestaña)`,
    })
  }
  return { site, stores }
}

/** El nombre corto de un proyecto, para la prosa: «Clara: Bienestar Digital» → «Clara». */
export function hechasEnUyShortName(item: HechaEnUy): string {
  return item.name.split(':')[0]!.trim()
}

/** «a; b; y c» (las partes llevan comas adentro, así que se separan con punto y coma). */
function joinParts(parts: string[]): string {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join('; ')}; y ${parts[parts.length - 1]}`
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1)
}

/**
 * Las dos respuestas que nombran proyectos se ARMAN con HECHAS_EN_UY: la página invita a mandar apps,
 * y una lista escrita a mano quedaría vieja con la primera que se sume.
 */
function faqQueApps(items: readonly HechaEnUy[]): string {
  return hechasEnUyByCategory(items)
    .map(
      ({ category, items: inGroup }) =>
        `${category.label}: ${joinParts(inGroup.map(item => `${hechasEnUyShortName(item)}, ${item.tagline}`))}.`
    )
    .join(' ')
}

function faqSonGratis(items: readonly HechaEnUy[]): string {
  const priced = items
    .filter(item => item.price)
    .map(item => `${hechasEnUyShortName(item)}: ${lowerFirst(item.price!)}`)
  const unpriced = items.filter(item => !item.price).map(hechasEnUyShortName)
  const tail =
    unpriced.length === 0
      ? ''
      : unpriced.length === 1
        ? ` ${unpriced[0]} no publica un precio.`
        : ` ${unpriced.slice(0, -1).join(', ')} y ${unpriced[unpriced.length - 1]} no publican un precio.`
  return `Depende de cada una, y en cada tarjeta va sólo lo que el proyecto publica. ${priced.join(' ')}${tail}`
}

/** Preguntas frecuentes, en texto plano (FaqSection emite el FAQPage con estas mismas palabras). */
export const HECHAS_EN_UY_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'que-apps',
    question: '¿Qué apps hechas en Uruguay hay en esta lista?',
    answer: faqQueApps(HECHAS_EN_UY),
  },
  {
    id: 'sumar-mi-app',
    question: '¿Cómo sumo mi app a la lista?',
    answer:
      'Mandanos el nombre, el enlace a su web o a su ficha de tienda y qué hace en una frase, desde el formulario de esta misma página. La revisamos en su propia web y, si encaja, la sumamos con lo que dice ella. No se cobra nada por aparecer.',
  },
  {
    id: 'por-que-no-apps-utiles',
    question: '¿Por qué estas apps no están en Apps útiles?',
    answer:
      'Ese directorio sólo lleva apps de Google Play o del App Store de Uruguay que publica quien presta el servicio, como la del BPS o la de UTE, y alguna no oficial sólo si la usa muchísima gente. Las de esta lista son proyectos independientes: varias son sólo web, y las que tienen ficha de tienda todavía tienen pocas descargas.',
    link: { label: 'Apps útiles en Uruguay', to: '/apps-utiles-uruguay' },
  },
  {
    id: 'son-gratis',
    question: '¿Son gratis?',
    answer: faqSonGratis(HECHAS_EN_UY),
  },
  {
    id: 'quien-elige',
    question: '¿Quién elige qué entra?',
    answer:
      'Es una lista editorial de Cambio Uruguay. Empezó con lo que la gente compartió en un hilo de r/CharruaDevs, suma lo que llega por el formulario de esta página y cada proyecto se revisa a mano en su propia web o ficha de tienda. Nadie paga por aparecer y los enlaces no son de afiliados.',
  },
])

/** Las categorías en orden, cada una con sus proyectos; una categoría vacía no se devuelve. */
export function hechasEnUyByCategory(
  items: readonly HechaEnUy[] = HECHAS_EN_UY
): { category: HechaEnUyCategory; items: HechaEnUy[] }[] {
  return HECHAS_EN_UY_CATEGORIES.map(category => ({
    category,
    items: items.filter(item => item.category === category.id),
  })).filter(group => group.items.length > 0)
}

/** Cuántos tienen ficha en Google Play o en el App Store. */
export function hechasEnUyWithStore(items: readonly HechaEnUy[] = HECHAS_EN_UY): number {
  return items.filter(item => Boolean(item.android || item.ios)).length
}

/**
 * La línea de dónde sale el "hecho en Uruguay" de cada tarjeta: la de la entrada, escrita con lo que
 * dice su fuente (el test ata cada `uruguayBy` a las entradas que de verdad lo tienen).
 */
export function hechasEnUyOriginLine(item: HechaEnUy): string {
  return item.origin
}
