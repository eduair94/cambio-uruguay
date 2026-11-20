// app/utils/ivaTable.ts
// Las tablas y las listas de /herramientas/calculadora-iva: cuánto es cada monto más IVA, cuánto
// es un precio final sin IVA, qué va a la tasa mínima y qué está exonerado.
//
// POR QUÉ EXISTE. Casi la mitad de las consultas con que Search Console muestra la página traen un
// MONTO («1500 mas iva cuanto es», «cuanto es el iva de 3000 pesos», «1200 menos iva»): más de cien
// montos distintos, de una a cuatro impresiones por consulta, en posición ~7 (2026-10-21..11-17). La
// página tenía un solo monto resuelto ($ 1.000 → $ 1.220) y ninguna tabla. Es la misma lección de
// `EQUIVALENCE_AMOUNTS` en `indicators.ts`: el monto es la pregunta, y una tabla que lo saltea
// manda a hacer la cuenta a otro lado.
//
// Toda cifra sale de `addIva` / `removeIva`, las mismas funciones de la calculadora: la tabla no
// puede decir algo distinto de lo que da la herramienta de arriba.
//
// FUENTES PRIMARIAS (leídas el IVA_TABLE_VERIFIED_AT):
//   - IMPO, T.O. 2023, Título 10, art. 34 (las tasas) y art. 36 (la mínima), ya en
//     TOOL_SNIPPET_IVA_SOURCES.
//   - IMPO, T.O. 2023, Título 10, art. 38: las exoneraciones. Sólo se publican las que rigen por la
//     ley misma; las que dicen «regirá cuando lo disponga el Poder Ejecutivo» quedan afuera.
//   - IMPO, Ley 17.250 art. 15 lit. A: el precio al consumidor se informa con los impuestos.
//   - Ley 20.531 (rige desde el 1/1/2027) agrega el art. 70 BIS al Título 10 y un inciso al lit. H
//     del art. 36; no toca el art. 34, así que las tasas siguen en 22 % y 10 %.

import { addIva, removeIva, round } from './calculators'
import { formatUYU } from './format'
import { IVA_TASA_BASICA, IVA_TASA_MINIMA } from './ivaTarjeta'

export interface IvaTableSource {
  readonly label: string
  readonly url: string
}

/** Día en que se releyeron en IMPO los artículos 34, 36 y 38 del Título 10 y la Ley 17.250. */
export const IVA_TABLE_VERIFIED_AT = '2026-11-20'

/** `2026-11-20` → `20/11/2026`, sin pasar por `Date` (que corre la fecha según la zona). */
export function ivaVerifiedLabel(iso: string = IVA_TABLE_VERIFIED_AT): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Montos de la tabla «más IVA». Search Console 2026-10-21..11-17: todo monto escrito en una
 * consulta de la página con 3 impresiones o más, más los escalones redondos entre ellos para que
 * la tabla no tenga huecos raros. El monto es lo que la gente escribe; la tasa la da la tabla.
 */
export const IVA_ADD_AMOUNTS: readonly number[] = Object.freeze([
  100, 150, 180, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 1000,
  1100, 1200, 1300, 1500, 1600, 1700, 1800, 1900, 2000, 2200, 2300, 2500, 3000, 3500, 4000, 4500,
  5000, 5500, 6000, 7000, 7500, 8000, 9000, 10000, 12000, 15000, 18000, 20000, 25000, 30000, 35000,
  40000, 50000, 60000, 100000,
])

/** Montos de la tabla inversa (precio con IVA → sin IVA): los de «N menos IVA / sin IVA» y los redondos. */
export const IVA_REMOVE_AMOUNTS: readonly number[] = Object.freeze([
  100, 200, 250, 300, 500, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 4500, 5000, 6000, 7000, 10000,
  15000, 20000, 25000, 30000, 50000, 100000,
])

export interface IvaAddRow {
  readonly net: number
  readonly ivaBasica: number
  readonly grossBasica: number
  readonly ivaMinima: number
  readonly grossMinima: number
}

export interface IvaRemoveRow {
  readonly gross: number
  readonly netBasica: number
  readonly ivaBasica: number
  readonly netMinima: number
  readonly ivaMinima: number
}

export function ivaAddRows(amounts: readonly number[] = IVA_ADD_AMOUNTS): IvaAddRow[] {
  return amounts.map(n => {
    const basica = addIva(n, IVA_TASA_BASICA)
    const minima = addIva(n, IVA_TASA_MINIMA)
    return {
      net: basica.net,
      ivaBasica: basica.iva,
      grossBasica: basica.gross,
      ivaMinima: minima.iva,
      grossMinima: minima.gross,
    }
  })
}

export function ivaRemoveRows(amounts: readonly number[] = IVA_REMOVE_AMOUNTS): IvaRemoveRow[] {
  return amounts.map(n => {
    const basica = removeIva(n, IVA_TASA_BASICA)
    const minima = removeIva(n, IVA_TASA_MINIMA)
    return {
      gross: basica.gross,
      netBasica: basica.net,
      ivaBasica: basica.iva,
      netMinima: minima.net,
      ivaMinima: minima.iva,
    }
  })
}

/** Qué porcentaje del precio FINAL es IVA: `tasa / (100 + tasa)`. 22 → 18,03; 10 → 9,09. */
export function ivaShareOfGross(rate: number): number {
  return round((rate / (100 + rate)) * 100)
}

/** El error común: restarle la tasa al precio con IVA. $ 1.220 − 22 % = $ 951,60, no $ 1.000. */
export function wrongStrip(gross: number, rate: number): number {
  return round(gross * (1 - rate / 100))
}

/** Pesos sin decimales cuando el monto es entero; con dos cuando no (180 + IVA → IVA $ 39,60). */
export function ivaMoney(n: number): string {
  return formatUYU(n, Number.isInteger(n) ? 0 : 2)
}

/** El multiplicador de una tasa, con coma decimal: 22 → «1,22»; 10 → «1,10». */
export function ivaFactor(rate: number): string {
  return round(1 + rate / 100).toLocaleString('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Porcentaje con coma decimal: 18.03 → «18,03». */
export function ivaPct(n: number): string {
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Los montos de los ejemplos del texto, elegidos entre los más buscados. */
export const IVA_EXAMPLE_ADD = 1500
export const IVA_EXAMPLE_REMOVE = 3000
export const IVA_EXAMPLE_BUDGET = 2300
export const IVA_EXAMPLE_FAQ = 1000

export interface IvaListItem {
  /** Literal (o numeral-literal) del artículo de la ley. */
  readonly ref: string
  readonly text: string
}

/**
 * Tasa mínima (T.O. 2023, Título 10, art. 36). Redacción pegada a la de la ley, con su calificativo:
 * la carne y el pescado van a la mínima «frescos, congelados o enfriados», así que un fiambre o un
 * chorizo no están en la lista y pagan la básica. Los literales E, F e I van en el último renglón
 * porque son casos puntuales (paquetes turísticos locales, alumbrado público, primera venta de
 * inmuebles por empresas). El J (seguros de vida) queda afuera a propósito: dice «Esta disposición
 * regirá cuando lo disponga el Poder Ejecutivo», la misma regla que la lista de exonerados.
 */
export const IVA_MINIMA_ITEMS: readonly IvaListItem[] = Object.freeze([
  {
    ref: 'A',
    text: 'Pan blanco común y galleta de campaña; pescado, carne y menudencias frescos, congelados o enfriados; aceites comestibles; arroz; harina de cereales; pastas y fideos; sal para uso doméstico; azúcar; yerba; café; té; jabón común; grasas comestibles.',
  },
  {
    ref: 'L',
    text: 'Carne avícola, porcina y de conejo y sus menudencias, frescas, congeladas o enfriadas.',
  },
  {
    ref: 'K',
    text: 'Frutas, flores y hortalizas en su estado natural, vendidas a consumidores finales.',
  },
  { ref: 'B', text: 'Medicamentos y especialidades farmacéuticas.' },
  {
    ref: 'D',
    text: 'Servicios de salud prestados fuera de la relación de dependencia, y el transporte en ambulancia.',
  },
  { ref: 'C', text: 'Hospedaje en hoteles.' },
  { ref: 'H', text: 'Transporte terrestre de pasajeros.' },
  { ref: 'G', text: 'Gasoil.' },
  { ref: 'E, F, I', text: 'Otros casos puntuales que el artículo enumera.' },
])

/**
 * Exoneraciones (T.O. 2023, Título 10, art. 38) que rigen por la ley misma. Afuera a propósito las
 * que esperan una decisión del Poder Ejecutivo (máquinas agrícolas, carne ovina, pescado, leña,
 * carne de ave y de cerdo) y las de un público específico (productores, loterías, aeroaplicación).
 */
export const IVA_EXONERADOS: readonly IvaListItem[] = Object.freeze([
  {
    ref: '1-A',
    text: 'Moneda extranjera, metales preciosos, títulos y valores: comprar dólares no paga IVA.',
  },
  {
    ref: '1-B',
    text: 'Inmuebles, salvo la primera venta que hace una empresa como parte de su actividad (va a la tasa mínima); los terrenos sin mejoras están exonerados siempre.',
  },
  { ref: '1-E', text: 'Combustibles derivados del petróleo, salvo el fueloil y el gasoil.' },
  {
    ref: '1-F',
    text: 'Leche pasterizada, ultrapasterizada, vitaminizada, descremada y en polvo; no la saborizada ni la UHT.',
  },
  {
    ref: '1-H',
    text: 'Diarios, periódicos, revistas, libros y folletos, y el material educativo.',
  },
  {
    ref: '1-I',
    text: 'El agua para el consumo familiar básico, dentro de los límites que fija el Poder Ejecutivo.',
  },
  { ref: '2-A', text: 'Intereses de valores y de depósitos bancarios.' },
  { ref: '2-C', text: 'Alquiler de inmuebles.' },
])

/** Cómo se imprime la cita de cada renglón: `A` → «Lit. A»; `1-A` → «Num. 1, lit. A». */
export function ivaLegalRef(ref: string): string {
  const m = /^(\d+)-(.+)$/.exec(ref)
  return m ? `Num. ${m[1]}, lit. ${m[2]}` : `Lit. ${ref}`
}

/** Art. 38 num. 2 lit. E, en una línea: qué intereses sí pagan IVA. */
export const IVA_INTEREST_NOTE =
  'Los intereses de préstamos a personas físicas que no tributan IRAE ni IMEBA y los de tarjeta de crédito sí pagan IVA; los de préstamos para vivienda en pesos, UI o UR, no.'

export const IVA_TABLE_SOURCES: readonly IvaTableSource[] = Object.freeze([
  {
    label: 'IMPO — Texto Ordenado 2023, Título 10, art. 38: exoneraciones del IVA',
    url: 'https://www.impo.com.uy/bases/todgi2023/101-2024/38_T10',
  },
  {
    label: 'IMPO — Ley 17.250, art. 15: el precio se informa con los impuestos incluidos',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000/15',
  },
])
