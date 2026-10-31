// El título y la descripción con la cifra del día para /cotizacion/<moneda> y /dolar/<departamento>
// (y sus espejos /en y /pt). Es la lección de la portada (pages/index.vue, `homeTitle`) llevada a
// las dos familias que la siguen en impresiones: 16.512 en /cotizacion/* a 0,4 % de CTR y 4.501 en
// /pt/dolar/* + /pt/cotizacion/* a 0,7 %, en 28 días al 28/10/2026, con títulos genéricos del tipo
// "Cotización del Real en Uruguay Hoy" contestando a "precio del real hoy".
//
// Las reglas son las de la portada:
//   - UNA cifra en el título, la de venta, con "desde": es el mínimo entre casas distintas, no la
//     pizarra de una sola. Las dos van en la descripción, con "desde" y "hasta".
//   - El separador decimal sigue al idioma (`dateLocale`) y en /en y /pt el símbolo es "$U": un "$"
//     pelado ahí se lee como dólar. El símbolo lo pone cada mensaje, acá va la cifra sola.
//   - Sin lectura (SSR sin payload, API caída) no hay título vivo: vuelve el traducido de siempre.
//   - Cada idioma trae plantillas de la más rica a la más corta, y gana la primera que entra en 60
//     caracteres CON el " | Cambio Uruguay" que agrega el titleTemplate de app.vue. Si ninguna
//     entra, vuelve el traducido: un título cortado pierde justo la cifra, que es lo que gana el clic.
//
// Módulo PURO: la página arma los mensajes con `t()` y le pasa los candidatos ya traducidos.

import { dateLocale } from './format'

/** Lo que agrega el titleTemplate de app.vue a todo título. */
export const TITLE_SUFFIX = ' | Cambio Uruguay'
/** Corte del SERP que usa el resto del repo para los títulos. */
export const TITLE_MAX = 60
/** Corte de la descripción: más allá Google la recorta y se pierde la segunda cifra. */
export const DESCRIPTION_MAX = 160

/**
 * La cifra, sin símbolo, con los decimales del idioma. Dos decimales; cuatro si el valor es menor
 * que 1 (guaraní, peso chileno o colombiano: 0,0056 con dos sería "0,01"); `digits` lo fuerza (el
 * gramo de oro va sin decimales: son miles de pesos).
 */
export function seoRate(value: number, locale: string, digits?: number): string {
  const small = value !== 0 && Math.abs(value) < 1
  const max = digits ?? (small ? 4 : 2)
  return value.toLocaleString(dateLocale(locale), {
    minimumFractionDigits: digits ?? 2,
    maximumFractionDigits: max,
  })
}

/** Entra en el SERP con la marca que agrega el titleTemplate. */
export function titleFits(title: string): boolean {
  return (title + TITLE_SUFFIX).length <= TITLE_MAX
}

/** El primer candidato que entra, o `fallback`. Un candidato vacío (sin lectura) no cuenta. */
export function pickTitle(candidates: readonly (string | null | undefined)[], fallback: string) {
  return candidates.find((c): c is string => Boolean(c) && titleFits(c as string)) ?? fallback
}

/** La descripción viva si entra; si no, la traducida. */
export function pickDescription(live: string | null | undefined, fallback: string): string {
  return live && live.length <= DESCRIPTION_MAX ? live : fallback
}

export interface BuySell {
  buy: number | null
  sell: number | null
}

/**
 * El mínimo de venta, el máximo de compra y cuántas casas publican venta, sobre filas de
 * casas distintas. Ignora lo que no es un número positivo (una casa sin pizarra no es un cero).
 */
export function bestOf(rows: readonly BuySell[]): {
  sell: number | null
  buy: number | null
  count: number
} {
  const sells = rows.map(r => r.sell).filter((v): v is number => typeof v === 'number' && v > 0)
  const buys = rows.map(r => r.buy).filter((v): v is number => typeof v === 'number' && v > 0)
  return {
    sell: sells.length ? Math.min(...sells) : null,
    buy: buys.length ? Math.max(...buys) : null,
    count: sells.length,
  }
}
