// /novedades: el registro público de lo que mejoramos y arreglamos en el sitio.
//
// Se escribe A MANO y en el idioma de quien lee, no se genera desde el historial de git: los
// mensajes de commit hablan de cachés, guardas y colecciones, y lo que le importa a una persona es
// qué puede hacer ahora que antes no podía. Tres reglas al sumar una entrada:
//
//   - Lo que la persona ve o usa, no cómo se hizo. «El año de la tabla lleva a esos avisos», no
//     «MarketTable acepta yearTo».
//   - Sin cifras de ingreso ni nada privado: este archivo se publica tal cual y el repo es público.
//   - `origin` sólo cuando es cierto. «reporte» quiere decir que alguien lo escribió en el buzón
//     (/contacto#sugerencias); inventarlo le quita valor a la marca cuando sí lo es.
//
// La lista va de la más nueva a la más vieja (lo verifica tests/unit/siteChangelog.test.ts, que
// también comprueba que cada `to` sea una página que existe).

export const CHANGE_KINDS = ['nuevo', 'mejora', 'arreglo'] as const
export type ChangeKind = (typeof CHANGE_KINDS)[number]

/** De dónde salió el cambio, cuando no salió sólo de nuestra lista de pendientes. */
export const CHANGE_ORIGINS = ['reporte', 'uso', 'comunidad'] as const
export type ChangeOrigin = (typeof CHANGE_ORIGINS)[number]

export interface SiteChange {
  /** Día en que quedó publicado en el sitio, `YYYY-MM-DD`. */
  date: string
  kind: ChangeKind
  title: string
  body: string
  /** La página donde se ve el cambio, si hay una. */
  to?: string
  origin?: ChangeOrigin
}

export const CHANGE_KIND_LABELS: Record<ChangeKind, string> = {
  nuevo: 'Nuevo',
  mejora: 'Mejora',
  arreglo: 'Arreglo',
}

export const CHANGE_ORIGIN_LABELS: Record<ChangeOrigin, string> = {
  reporte: 'Lo reportaron en el buzón',
  uso: 'Visto en cómo se usa el sitio',
  comunidad: 'Pedido de la comunidad',
}

export const SITE_CHANGES: SiteChange[] = [
  {
    date: '2026-11-22',
    kind: 'nuevo',
    title: 'Esta página de novedades',
    body: 'Un registro de lo que cambia en el sitio, semana a semana, con lo que arreglamos a partir de lo que nos escriben.',
  },
  {
    date: '2026-11-21',
    kind: 'arreglo',
    title: 'Elegir el destino tocando la fila del ranking',
    body: 'En el ranking de destinos de la calculadora de comisiones, tocar una fila ahora la elige y sube a la cuenta. Antes había que volver a la lista de arriba.',
    to: '/comisiones-de-transferencia-uruguay',
    origin: 'uso',
  },
  {
    date: '2026-11-21',
    kind: 'mejora',
    title: 'Del precio por año a los autos de ese año',
    body: 'En la página de precios de cada modelo, el año y la cantidad de avisos llevan directo al directorio con esos autos.',
    to: '/autos-usados-uruguay',
    origin: 'uso',
  },
  {
    date: '2026-11-21',
    kind: 'mejora',
    title: 'Toda la tarjeta del producto abre el aviso',
    body: 'En los directorios de productos, monopatines y bicicletas, tocar cualquier parte de la tarjeta abre el aviso, no sólo el título.',
    to: '/equipar-casa-uruguay',
    origin: 'uso',
  },
  {
    date: '2026-11-20',
    kind: 'nuevo',
    title: 'Productos que te cambian la vida',
    body: 'Lo que recomendó la comunidad de r/uruguay, con el precio de hoy en Mercado Libre al lado de cada uno.',
    to: '/productos-que-te-cambian-la-vida-uruguay',
    origin: 'comunidad',
  },
  {
    date: '2026-11-20',
    kind: 'nuevo',
    title: 'Apps hechas en Uruguay',
    body: 'Un recopilatorio de proyectos de desarrolladores uruguayos, para encontrarlos y probarlos.',
    to: '/apps-hechas-en-uruguay',
    origin: 'comunidad',
  },
  {
    date: '2026-11-20',
    kind: 'arreglo',
    title: 'Veinte arreglos de interfaz en el teléfono',
    body: 'El menú, el aviso de cookies, el conversor de la portada, los selectores y el buscador, revisados uno por uno en pantallas chicas.',
  },
  {
    date: '2026-11-20',
    kind: 'arreglo',
    title: 'Alquileres: «Más recientes» ordena por fecha',
    body: 'El orden «Más recientes» del directorio de alquileres mostraba los avisos por precio. Además, el primer aviso ya entra en la primera pantalla del teléfono.',
    to: '/alquileres-uruguay',
  },
  {
    date: '2026-11-15',
    kind: 'mejora',
    title: 'El aguinaldo, también en líquido',
    body: 'La calculadora de aguinaldo da lo que cobrás en mano, con cada descuento y de dónde sale.',
    to: '/herramientas/calculadora-aguinaldo',
  },
  {
    date: '2026-11-14',
    kind: 'nuevo',
    title: 'Comparar autos usados lado a lado',
    body: 'Elegí hasta tres avisos y compará precio, kilómetros, equipamiento y lo que declara cada vendedor.',
    to: '/autos-usados-uruguay/comparar',
  },
  {
    date: '2026-11-13',
    kind: 'nuevo',
    title: 'Datos abiertos de alquileres, viviendas y autos',
    body: 'Las series de precios del sitio, para descargar y reutilizar, con quién ya las cita.',
    to: '/datos-abiertos-uruguay',
  },
  {
    date: '2026-11-12',
    kind: 'nuevo',
    title: 'Armadores de muebles en Montevideo',
    body: 'Quién arma muebles en cada barrio y cuánto cobra por mueble, con la fuente de cada precio.',
    to: '/armadores-de-muebles-montevideo',
  },
  {
    date: '2026-11-11',
    kind: 'nuevo',
    title: 'Buzón de sugerencias y reporte de errores',
    body: 'Desde el pie de cualquier página podés contarnos un error o proponer una mejora. Lo leemos todo y lo que arreglamos queda en esta página.',
    to: '/contacto',
  },
  {
    date: '2026-11-11',
    kind: 'mejora',
    title: 'El asistente con IA muestra tarjetas y cotizaciones',
    body: 'Las respuestas del asistente traen las fotos de los avisos, carruseles y el panel de cotizaciones, y el chat se puede abrir en pantalla completa.',
    to: '/asistente-ia',
  },
  {
    date: '2026-11-11',
    kind: 'arreglo',
    title: 'Una pizarra congelada ya no aparece como la mejor',
    body: 'Si una casa de cambio publica el mismo precio hace días, no se la muestra como la que mejor paga: el número puede estar viejo.',
    to: '/mejor-casa-de-cambio',
  },
  {
    date: '2026-11-08',
    kind: 'arreglo',
    title: 'Alquileres: los barrios son barrios',
    body: 'Los selectores de barrio mostraban direcciones de algunos avisos como si fueran barrios. Ahora ofrecen sólo lugares reales, también los que tienen un solo aviso.',
    to: '/alquileres-uruguay',
  },
  {
    date: '2026-11-08',
    kind: 'mejora',
    title: 'Más privacidad',
    body: 'Si rechazás las cookies, vale desde la primera página. La dirección de referencia ya no viaja en el enlace y la política de privacidad dice lo que el sitio hace.',
    to: '/privacidad',
  },
  {
    date: '2026-11-04',
    kind: 'nuevo',
    title: 'Ficha técnica y asesor de tamaño para electrodomésticos',
    body: 'Heladeras, lavarropas, televisores y aires con litros, kilos, pulgadas o frigorías, filtros por ficha y un asesor que dice qué tamaño necesitás.',
    to: '/equipar-casa-uruguay',
  },
  {
    date: '2026-11-04',
    kind: 'nuevo',
    title: 'Monopatines y bicicletas eléctricas por modelo',
    body: 'Una página por modelo, comparador y un asesor para elegir según el uso.',
    to: '/monopatines-electricos-uruguay',
  },
  {
    date: '2026-11-01',
    kind: 'mejora',
    title: 'Topes de usura del BCU al día',
    body: 'La página de préstamos muestra el tope vigente con la tabla del BCU del mes y su fecha.',
    to: '/prestamos-uruguay',
  },
]

/** Las entradas de un mes juntas, en el orden de la lista. */
export function changesByMonth(changes: SiteChange[]): { month: string; items: SiteChange[] }[] {
  const groups: { month: string; items: SiteChange[] }[] = []
  for (const change of changes) {
    const month = change.date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.month === month) last.items.push(change)
    else groups.push({ month, items: [change] })
  }
  return groups
}

/**
 * Fechas legibles sin depender de la zona del servidor ni del navegador: el borde guarda una sola
 * copia de la página, y una fecha calculada con la hora local puede cambiar de día entre el HTML
 * del servidor y la hidratación.
 */
export function formatChangeDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/** «Noviembre de 2026»: sólo la primera letra en mayúscula (un `text-transform` subía la «de»). */
export function formatChangeMonth(month: string): string {
  const label = new Date(`${month}-15T12:00:00Z`).toLocaleDateString('es-UY', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
