// Los tuits de la cuenta de X de cambio-uruguay: un feed RSS (`/feeds/x.xml`) que IFTTT lee cada 5
// minutos y publica con el applet "RSS Feed → X (Twitter): Post a tweet". Guía: `docs/app/X_FEED.md`.
//
// Mismo esquema que el post diario de LinkedIn (`linkedinPosts.ts`), con dos diferencias:
// - La voz es la de la marca, no la de una persona.
// - En X el dólar es lo que se mira todos los días: sale cada día hábil, no sólo los lunes. Las
//   guías van tres veces por semana a la tarde, y sus afirmaciones son las mismas que ya se
//   verificaron contra cada página para LinkedIn, en versión corta.
//
// Por qué no usa el bot de `bots/` (`content_promo`, que ya tenía ganchos para X): en el servidor no
// hay credenciales de la API de X (verificado el 12/11/2026). Con IFTTT no hace falta una app de
// desarrollador. OJO: `CONTENT_PROMO_ENABLED=1` sí está en `bots/.env`, así que si algún día se cargan
// las claves de X ahí, ese bot y el resumen diario también tuitearían y habría posts duplicados.

import {
  LINKEDIN_SITE,
  USD_MIN_GAP_PESOS,
  cdata,
  escapeXml,
  formatPesos,
  formatRate,
  type UsdSnapshot,
} from './linkedinPosts'

export interface XPost {
  id: string
  /** Ruta del sitio, sin prefijo de idioma ni barra final. Tiene que existir. */
  path: string
  /** El tuit sin la URL (se agrega al pie). Con la URL contada como 23, tiene que entrar en 280. */
  text: string
}

/** Lunes de inicio de la rotación de guías: `X_GUIDES[0]` sale ese día a la tarde. */
export const X_EPOCH = '2026-11-16'
/** Hora de Montevideo del tuit del dólar (días hábiles). */
export const X_DOLLAR_HOUR = 10
/** Hora de Montevideo del tuit de guía. */
export const X_GUIDE_HOUR = 15
/** Lunes, miércoles y viernes (`getUTCDay`). */
export const X_GUIDE_DAYS: readonly number[] = [1, 3, 5]
/** Los cinco feriados pagos: las casas no abren y "el dólar de hoy" sería el de ayer. */
export const X_NO_DOLLAR: readonly string[] = ['01-01', '05-01', '07-18', '08-25', '12-25']

/** X cuenta cada URL como 23 caracteres, sea cual sea su largo. */
export const TCO_URL_LENGTH = 23
export const TWEET_LIMIT = 280

// Las mismas afirmaciones que `LINKEDIN_POSTS`, verificadas contra cada página, en versión corta y
// con la voz de la marca. Sin montos ni porcentajes (el test lo vigila).
export const X_GUIDES: readonly XPost[] = Object.freeze([
  {
    id: 'cuotas-sin-interes',
    path: '/conviene-comprar-en-cuotas',
    text: '"Sin interés" casi nunca es gratis: el seguro sobre saldo deudor se cobra todos los meses sobre lo que falta pagar, y en cuotas con crédito perdés la rebaja de IVA del débito. La cuenta completa, con calculadora:',
  },
  {
    id: 'contractor',
    path: '/contractor-en-uruguay',
    text: 'Facturar como contractor tu mismo nominal es cobrar menos: en relación de dependencia son trece sueldos al año con el aguinaldo, más licencia paga y salario vacacional. Cuánto tendrías que facturar para quedar igual:',
  },
  {
    id: 'deuda-prescripta',
    path: '/guias/cuando-prescribe-una-deuda-uruguay',
    text: 'Una deuda vieja no se borra sola: la prescripción hay que oponerla, y pagar una cuota, aunque sea chica, reinicia el reloj. Antes de pagarle a un estudio por algo de hace años:',
  },
  {
    id: 'garantia-o-deposito',
    path: '/guias/garantias-de-alquiler-uruguay',
    text: 'Garantía y depósito no son lo mismo. La garantía la emite un tercero que cobra por el riesgo (ANDA, la CGN, una aseguradora); el depósito es plata tuya que te tienen que devolver.',
  },
  {
    id: 'horas-extra',
    path: '/guias/horas-extra-en-uruguay',
    text: 'Las horas extra se pagan aunque nadie las haya autorizado por escrito: alcanza con que la empresa supiera que te quedabas y lo tolerara. Cómo se calculan:',
  },
  {
    id: 'dolares-con-debito',
    path: '/tarjetas-de-debito-uruguay',
    text: 'Pagar en dólares con débito o prepaga no cuesta lo mismo en todas las tarjetas uruguayas: cambia el recargo del emisor y el tipo de cambio que aplica. Ranking con calculadora:',
  },
  {
    id: 'transferencia-equivocada',
    path: '/guias/transferencia-a-cuenta-equivocada-uruguay',
    text: 'Si transferiste a la cuenta equivocada, el banco no te devuelve la plata solo: le pide al que la recibió que autorice. Si no autoriza, queda la vía judicial. Qué hacer y en qué orden:',
  },
  {
    id: 'pizarras-quietas',
    path: '/',
    text: 'Hay pizarras de casas de cambio que muestran el mismo precio durante semanas. El dólar se mueve y ese número no, hasta que queda primero en cualquier lista de "más barato". Nosotros las marcamos:',
  },
  {
    id: 'deuda-vendida',
    path: '/guias/me-compraron-la-deuda-uruguay',
    text: 'Vender tu deuda no necesita tu permiso, pero sí notificarte con el título. Hasta que eso pase, el pago válido sigue siendo al acreedor original. Cómo verificar a quién le debés:',
  },
  {
    id: 'comisiones-transferencia',
    path: '/comisiones-de-transferencia-uruguay',
    text: 'Pasar plata de un banco a otro a veces es gratis y a veces no: depende del par de bancos y de la moneda. El tarifario de cada banco y fintech, con la fila textual de cada comisión:',
  },
  {
    id: 'base-del-despido',
    path: '/guias/despido-y-liquidacion-uruguay',
    text: 'La indemnización por despido no se calcula sobre el nominal a secas: entran todas las partidas salariales habituales, promediadas. Revisalo antes de firmar la liquidación:',
  },
  {
    id: 'impuesto-temu',
    path: '/guias/impuesto-temu-uruguay',
    text: 'El impuesto a las compras en Temu no lo cobra Temu: lo liquida el correo o el courier, que retiene el paquete hasta que pagues el IVA. Cómo funciona:',
  },
  {
    id: 'mercado-it',
    path: '/mercado-it-uruguay',
    text: 'Clasificamos más de cien mil posts y comentarios de r/CharruaDevs sobre el futuro de la profesión, desde 2022. Las opiniones negativas pasaron de minoría a gran mayoría. La curva, mes a mes:',
  },
  {
    id: 'clearing-alquiler',
    path: '/alquilar-estando-en-clearing',
    text: 'Estar en el Clearing no te deja afuera de todas las garantías de alquiler: los organismos públicos no pueden negarte el servicio por figurar en una base comercial. Cuál te sirve:',
  },
  {
    id: 'aliexpress',
    path: '/guias/importar-de-aliexpress-a-uruguay',
    text: 'AliExpress parte tu carrito en varios paquetes, y para la Aduana cada número de seguimiento es una declaración aparte, con su propio mínimo. Cómo funciona:',
  },
  {
    id: 'cobrar-en-dolares',
    path: '/cobrar-en-dolares-gastar-en-pesos',
    text: 'La rebaja de IVA por pagar con débito es menor que los "dos puntos" que se repiten: se descuentan sobre el precio sin IVA. Las tres formas de cobrar en dólares y gastar en pesos, con tus números:',
  },
  {
    id: 'deposito-alquiler',
    path: '/guias/deposito-de-alquiler-uruguay',
    text: 'El depósito del alquiler es tuyo: al irte sólo pueden descontar deudas y daños más allá del desgaste normal. Tu mejor defensa es el inventario que firmaste al entrar.',
  },
  {
    id: 'sueldo-liquido',
    path: '/herramientas/calculadora-sueldo-liquido',
    text: 'Del nominal al líquido: BPS, FONASA, IRPF y, si te toca, el Fondo de Solidaridad, cada descuento por separado en lugar de un número final sin explicación. Calculadora:',
  },
  {
    id: 'paro-arreglado',
    path: '/guias/pedir-que-me-despidan-uruguay',
    text: 'Pedir que te despidan para cobrar el seguro de paro puede salir mal: el seguro exige desocupación forzosa, y un despido arreglado te puede dejar sin subsidio.',
  },
  {
    id: 'tarjetas-credito',
    path: '/tarjetas-de-credito-uruguay',
    text: 'Comparamos los programas de puntos y beneficios de las tarjetas de crédito uruguayas con un puntaje ponderado, con cada criterio a la vista. El ranking:',
  },
  {
    id: 'comision-inmobiliaria',
    path: '/guias/comision-inmobiliaria-uruguay',
    text: 'Ninguna ley fija la comisión inmobiliaria en Uruguay: el porcentaje que todos repiten sale de un arancel privado, y se negocia.',
  },
  {
    id: 'bancos-tier',
    path: '/mejores-bancos-uruguay',
    text: 'Tier list de bancos y fintech uruguayas: app, comisiones, atención y lo que te cobran por lo que ya hacés. Los tiers salen de un puntaje, no de una opinión.',
  },
  {
    id: 'feriados-pagos',
    path: '/guias/feriados-en-uruguay-como-se-pagan',
    text: 'Sólo cinco feriados se pagan doble en Uruguay. Carnaval y Turismo son feriados comunes: trabajarlos no suma nada. Cuáles son los cinco:',
  },
  {
    id: 'renuncia',
    path: '/renunciar-al-trabajo-uruguay',
    text: 'Si renunciás, la empresa tiene un plazo corto para pagarte la licencia no gozada, el salario vacacional y el aguinaldo. Si se pasa, corre un recargo. Qué te toca y cuándo:',
  },
  {
    id: 'autos-baratos',
    path: '/oportunidades-autos-usados-uruguay',
    text: 'Un auto usado "más barato que el promedio" casi siempre es otra versión, otro motor u otra caja. Las oportunidades comparan contra el mismo modelo, año, versión, motor y caja, con los comparables a la vista:',
  },
  {
    id: 'cuenta-vaciada',
    path: '/estafas-uruguay',
    text: 'Si te vacían la cuenta, la pregunta es quién tiene que probar qué. Y con las billeteras virtuales estás menos protegido que con una tarjeta. Qué hacer y a quién reclamarle:',
  },
  {
    id: 'monotributo',
    path: '/facturar-en-monotributo-uruguay',
    text: 'El monotributo no está obligado a emitir factura electrónica. Si te dijeron que sí, probablemente te estén vendiendo un servicio que no necesitás.',
  },
  {
    id: 'api-cotizaciones',
    path: '/empresas',
    text: '¿Necesitás el tipo de cambio de Uruguay en tu sistema? Más de 40 casas cada 5 minutos, con historial intradía y de la región, por API. La clave es gratis y sale en un minuto:',
  },
  {
    id: 'itp-catastro',
    path: '/guias/costos-de-escrituracion-uruguay',
    text: 'El ITP de una compraventa se calcula sobre el valor real de Catastro, no sobre el precio, y lo pagan comprador y vendedor. Todos los costos de escriturar:',
  },
  {
    id: 'tope-usura',
    path: '/ley-de-usura-uruguay',
    text: 'El tope de usura no es un número fijo: es un recargo sobre la tasa media del BCU, que se publica todos los meses. La tabla vigente, por tipo de crédito y moneda:',
  },
  {
    id: 'fonasa-sin-trabajo',
    path: '/guias/me-quede-sin-trabajo-mutualista-fonasa-uruguay',
    text: 'Si te quedás sin trabajo, la mutualista por FONASA no se corta ese día: llega a fin de mes, y tus hijos la conservan un año.',
  },
  {
    id: 'fiador-solidario',
    path: '/guias/ser-garante-o-codeudor-riesgos-uruguay',
    text: 'Firmar como "fiador solidario" es renunciar a que primero le cobren al deudor: si no paga, te pueden reclamar el total a vos. Qué estás firmando:',
  },
  {
    id: 'salario-vacacional',
    path: '/salario-vacacional-uruguay',
    text: 'El salario vacacional se cobra antes de salir de licencia, no después: es el jornal líquido por día, sin aportes al BPS. Simulador con tus días:',
  },
  {
    id: 'laudo',
    path: '/cuanto-me-tienen-que-pagar-uruguay',
    text: 'Tu mínimo no es el Salario Mínimo Nacional: es el laudo de tu grupo, subgrupo y categoría, y es exigible. Cómo ubicarlo:',
  },
  {
    id: 'cambio-fin-de-semana',
    path: '/casas-de-cambio-abiertas-fin-de-semana',
    text: '¿Tenés que cambiar plata un sábado o un domingo? Todos los mostradores de casas de cambio y bancos que abren el fin de semana, con dirección y horario:',
  },
  {
    id: 'brasil',
    path: '/llevar-dolares-o-reales-a-brasil',
    text: '¿Reales o dólares para Brasil? Depende de dos precios del mismo día: el real en una casa uruguaya y el dólar en un câmbio brasileño. Las dos puntas lado a lado:',
  },
  {
    id: 'cuenta-remunerada',
    path: '/cuenta-remunerada-uruguay',
    text: 'Las cuentas que pagan "rendimiento diario" no pagan interés: invierten tu saldo en un fondo, y el rendimiento no está garantizado. Qué rinde cada una:',
  },
  {
    id: 'banco-o-casa',
    path: '/banco-o-casa-de-cambio-uruguay',
    text: '¿Banco o casa de cambio para comprar dólares? Comparamos la venta mediana de los dos todos los días, y cuánto es la diferencia sobre mil dólares:',
  },
  {
    id: 'ia-datos',
    path: '/buscar-con-ia',
    text: 'Conectamos los datos del sitio a Claude y ChatGPT: pedile un alquiler por presupuesto y viaje, autos que piden menos que otros iguales o que te compare barrios. Gratis:',
  },
])

// ---- turnos ------------------------------------------------------------------------------------

export interface XSlot {
  kind: 'dolar' | 'guia'
  /** Día de Montevideo (`AAAA-MM-DD`). */
  date: string
  /** Instante en que sale (UTC). */
  at: Date
}

const DAY_MS = 86_400_000
/** Montevideo es UTC-3 todo el año (sin horario de verano desde 2015). */
const MVD_OFFSET_HOURS = 3

const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay()
const shiftDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)
const at = (date: string, hour: number) =>
  new Date(`${date}T${String(hour + MVD_OFFSET_HOURS).padStart(2, '0')}:00:00Z`)
const mvdDate = (now: Date) =>
  new Date(now.getTime() - MVD_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10)

/** Los turnos de un día, en orden. */
export function xSlotsOn(date: string): XSlot[] {
  const d = weekday(date)
  const slots: XSlot[] = []
  if (d >= 1 && d <= 5 && !X_NO_DOLLAR.includes(date.slice(5))) {
    slots.push({ kind: 'dolar', date, at: at(date, X_DOLLAR_HOUR) })
  }
  if (X_GUIDE_DAYS.includes(d)) slots.push({ kind: 'guia', date, at: at(date, X_GUIDE_HOUR) })
  return slots
}

/** El último turno que ya empezó en `now`. */
export function currentXSlot(now: Date): XSlot {
  const today = mvdDate(now)
  for (let back = 0; back < 14; back++) {
    const slots = xSlotsOn(shiftDays(today, -back)).reverse()
    const hit = slots.find(s => s.at.getTime() <= now.getTime())
    if (hit) return hit
  }
  throw new Error('sin turnos en dos semanas')
}

/** El instante del próximo turno después de `now`. */
export function nextXSlotAt(now: Date): Date {
  const today = mvdDate(now)
  for (let ahead = 0; ahead < 14; ahead++) {
    const hit = xSlotsOn(shiftDays(today, ahead)).find(s => s.at.getTime() > now.getTime())
    if (hit) return hit.at
  }
  throw new Error('sin turnos en dos semanas')
}

const daysSinceXEpoch = (date: string) =>
  Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${X_EPOCH}T12:00:00Z`)) / DAY_MS)

const mod = (n: number, m: number) => ((n % m) + m) % m

/** La guía del turno de la tarde de `date`: tres por semana, en orden, sin saltear ninguna. */
export function xGuideFor(date: string): XPost {
  const week = Math.floor(daysSinceXEpoch(date) / 7)
  const pos = Math.max(0, X_GUIDE_DAYS.indexOf(weekday(date)))
  return X_GUIDES[mod(week * X_GUIDE_DAYS.length + pos, X_GUIDES.length)]!
}

// ---- el tuit del dólar -------------------------------------------------------------------------

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/** `lunes 16/11`. */
function dayLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number)
  return `${DIAS[weekday(date)]} ${d}/${m}`
}

/** Un nombre, dos si entran, o "A y N más": el tuit tiene 280 caracteres. */
function shortNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length === 2 && names.join(' y ').length <= 40) return names.join(' y ')
  return `${names[0]} y ${names.length - 1} más`
}

/** El tuit del dólar de `date`. Tres redacciones que rotan por día. */
export function dollarTweet(s: UsdSnapshot, date: string): XPost {
  const label = dayLabel(date)
  const sell = formatRate(s.cheapestSell)
  const where = shortNames(s.cheapestNames)
  const buy = formatRate(s.bestBuy)
  const buyWhere = shortNames(s.bestBuyNames)
  const gap = s.brouSell === null ? 0 : (s.brouSell - s.cheapestSell) * 1000

  let text: string
  if (s.brouSell === null || gap < USD_MIN_GAP_PESOS) {
    text = `Dólar hoy, ${label}.\n\nPara comprar, lo más barato: $ ${sell} (${where}).\nPara vender, lo que mejor paga: $ ${buy} (${buyWhere}).\n\nComparamos más de 40 casas cada pocos minutos.`
  } else {
    const brou = formatRate(s.brouSell)
    const diff = formatPesos(gap)
    const Label = label.charAt(0).toUpperCase() + label.slice(1)
    const variants = [
      `Dólar hoy, ${label}.\n\nPara comprar, lo más barato: $ ${sell} (${where}).\nPara vender, lo que mejor paga: $ ${buy} (${buyWhere}).\nBROU: $ ${brou}.\n\nEn US$ 1.000 son $ ${diff} menos que en el BROU.`,
      `${Label}: el dólar más barato para comprar está a $ ${sell} (${where}). En el BROU, $ ${brou}: $ ${diff} más por cada US$ 1.000.\n\nSi vendés, el que mejor paga es ${buyWhere}, a $ ${buy}.`,
      `El dólar, ${label}\n\nComprar: $ ${sell} en ${where}\nVender: $ ${buy} en ${buyWhere}\nBROU: $ ${brou}\n\nComparamos más de 40 casas cada pocos minutos.`,
    ]
    text = variants[mod(daysSinceXEpoch(date), variants.length)]!
  }
  return { id: 'dolar-hoy', path: '/', text }
}

// ---- el feed -----------------------------------------------------------------------------------

const urlFor = (path: string) => (path === '/' ? `${LINKEDIN_SITE}/` : `${LINKEDIN_SITE}${path}`)

/** El tuit tal como se publica: el texto y la URL al pie. */
export function xMessage(post: XPost): string {
  return `${post.text.trim()}\n\n${urlFor(post.path)}`
}

/** El largo que cuenta X, con cada URL a 23 caracteres. */
export function tweetLength(text: string): number {
  return text.replace(/https?:\/\/\S+/g, 'x'.repeat(TCO_URL_LENGTH)).length
}

/**
 * Cache-Control del feed (la regla de Cloudflare de `/feeds/*` respeta `s-maxage`). Con ítem, el
 * borde lo guarda hasta el próximo turno: al vencer, Cloudflare va al origen en el acto (medido el
 * 12/11/2026 con el feed de LinkedIn), así que un vencimiento por turno es lo mínimo. Sin ítem (el
 * dólar no tenía datos confiables), cinco minutos: que el próximo intento de IFTTT lo vuelva a pedir.
 */
export function xFeedCacheControl(now: Date, hasItem: boolean): string {
  const untilNext = Math.round((nextXSlotAt(now).getTime() - now.getTime()) / 1000)
  const ttl = hasItem ? Math.min(86_400, Math.max(60, untilNext)) : 300
  return `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=86400, stale-if-error=86400`
}

/** RSS 2.0 con el tuit del turno vigente, o sin ítems si no hay nada confiable que publicar. */
export function renderXFeed(slot: XSlot, post: XPost | null, now: Date): string {
  const item = post
    ? [
        '<item>',
        `<title>${escapeXml(post.text.trim().split('\n')[0]!.slice(0, 140))}</title>`,
        `<link>${escapeXml(urlFor(post.path))}</link>`,
        `<guid isPermaLink="false">cambio-uruguay-x-${slot.date}-${slot.kind}</guid>`,
        `<pubDate>${slot.at.toUTCString()}</pubDate>`,
        `<description>${cdata(xMessage(post))}</description>`,
        '</item>',
      ]
    : []
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    '<title>Cambio Uruguay en X</title>',
    `<link>${LINKEDIN_SITE}/</link>`,
    `<atom:link href="${LINKEDIN_SITE}/feeds/x.xml" rel="self" type="application/rss+xml"/>`,
    '<description>Los tuits de cambio-uruguay.com: el dólar de cada día hábil y guías.</description>',
    '<language>es-UY</language>',
    `<lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    '<ttl>5</ttl>',
    ...item,
    '</channel>',
    '</rss>',
    '',
  ].join('\n')
}
