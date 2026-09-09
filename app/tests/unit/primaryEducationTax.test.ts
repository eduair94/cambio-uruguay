// El catálogo de /impuesto-de-primaria-uruguay son cifras oficiales copiadas a mano, así que lo
// que este test cuida no es una fórmula: es que las cifras sigan siendo COHERENTES entre ellas.
// Una escala con un hueco entre tramos, un monto exonerado que baja de un año al siguiente o un
// primer tramo que no arranca en el exonerado del propio decreto son todos síntomas de lo mismo —
// un dígito mal transcripto— y ninguno se ve leyendo la página.
//
// El bloque del final es el que importa de verdad: la regla de la casa es que ninguna cifra se
// publica sin una URL oficial que la sostenga, y acá eso deja de ser una costumbre.

import { describe, expect, it } from 'vitest'

import {
  CANALES_DE_PAGO,
  CONTRIBUYENTES,
  CUOTAS_ANUALES,
  ESCALA,
  EXONERACIONES,
  IEP_EJERCICIO_VIGENTE,
  IEP_ESCALA_EJERCICIO,
  IEP_FAQ,
  IEP_SOURCES,
  IEP_VERIFIED_AT,
  MONTOS_EXONERADOS,
  MONTO_EXONERADO_VIGENTE,
  tramoParaValor,
} from '../../utils/primaryEducationTax'

describe('el monto exonerado por ejercicio', () => {
  it('cubre todos los años sin saltos, de 2015 al ejercicio vigente', () => {
    const years = MONTOS_EXONERADOS.map(m => m.ejercicio)
    expect(years[0]).toBe(2015)
    expect(years.at(-1)).toBe(IEP_EJERCICIO_VIGENTE)
    for (let i = 1; i < years.length; i++) expect(years[i]).toBe(years[i - 1]! + 1)
  })

  it('sube todos los años: el ajuste es por inflación y nunca fue a la baja', () => {
    for (let i = 1; i < MONTOS_EXONERADOS.length; i++) {
      expect(MONTOS_EXONERADOS[i]!.pesos).toBeGreaterThan(MONTOS_EXONERADOS[i - 1]!.pesos)
    }
  })

  it('publica el valor del ejercicio 2026 que fija la DGI', () => {
    expect(MONTO_EXONERADO_VIGENTE).toBe(282_612)
  })

  it('trae el exonerado del decreto que fija la escala publicada', () => {
    const delDecreto = MONTOS_EXONERADOS.find(m => m.ejercicio === IEP_ESCALA_EJERCICIO)
    expect(delDecreto?.pesos).toBe(271_091)
  })
})

describe('la escala del Decreto 140/025', () => {
  it('arranca exactamente en el monto exonerado de su propio ejercicio', () => {
    const delDecreto = MONTOS_EXONERADOS.find(m => m.ejercicio === IEP_ESCALA_EJERCICIO)
    expect(ESCALA[0]!.desde).toBe(delDecreto!.pesos)
  })

  it('no deja huecos ni superposiciones entre tramos', () => {
    for (let i = 1; i < ESCALA.length; i++) {
      expect(ESCALA[i]!.desde).toBe(ESCALA[i - 1]!.hasta! + 1)
    }
  })

  it('sube la alícuota tramo a tramo y sólo el último queda abierto', () => {
    for (let i = 1; i < ESCALA.length; i++) {
      expect(ESCALA[i]!.alicuota).toBeGreaterThan(ESCALA[i - 1]!.alicuota)
    }
    expect(ESCALA.filter(t => t.hasta === null)).toHaveLength(1)
    expect(ESCALA.at(-1)!.hasta).toBeNull()
  })

  it('reexpresa las cuatro alícuotas por mil del Título 13, art. 4', () => {
    expect(ESCALA.map(t => t.alicuota * 1000)).toEqual([1.5, 2, 2.5, 3])
  })
})

describe('tramoParaValor', () => {
  it('no devuelve tramo por debajo del piso de la escala', () => {
    expect(tramoParaValor(ESCALA[0]!.desde - 1)).toBeNull()
    expect(tramoParaValor(1)).toBeNull()
  })

  it('acierta el tramo en los dos bordes de cada escalón', () => {
    for (const tramo of ESCALA) {
      expect(tramoParaValor(tramo.desde)).toEqual(tramo)
      if (tramo.hasta !== null) expect(tramoParaValor(tramo.hasta)).toEqual(tramo)
    }
  })

  it('manda todo lo que pasa el último borde al tramo abierto', () => {
    const ultimo = ESCALA.at(-1)!
    expect(tramoParaValor(ultimo.desde)).toEqual(ultimo)
    expect(tramoParaValor(50_000_000)).toEqual(ultimo)
  })

  it('trata la entrada inválida como sin tramo, no como cero pesos', () => {
    expect(tramoParaValor(0)).toBeNull()
    expect(tramoParaValor(-1)).toBeNull()
    expect(tramoParaValor(Number.NaN)).toBeNull()
    expect(tramoParaValor(Number.POSITIVE_INFINITY)).toBeNull()
  })
})

describe('el contenido que va a la página', () => {
  it('nombra las cuatro figuras del art. 2 y las siete exoneraciones del art. 5', () => {
    expect(CONTRIBUYENTES).toHaveLength(4)
    expect(EXONERACIONES.map(e => e.literal)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g'])
  })

  it('mantiene las tres cuotas y al menos un canal de pago', () => {
    expect(CUOTAS_ANUALES).toBe(3)
    expect(CANALES_DE_PAGO.length).toBeGreaterThan(0)
  })

  it('no repite preguntas ni ids en el FAQ', () => {
    expect(new Set(IEP_FAQ.map(f => f.id)).size).toBe(IEP_FAQ.length)
    expect(new Set(IEP_FAQ.map(f => f.question)).size).toBe(IEP_FAQ.length)
    for (const item of IEP_FAQ) expect(item.answer.length).toBeGreaterThan(80)
  })
})

describe('toda cifra publicada tiene una fuente oficial detrás', () => {
  // Los dominios donde vive la normativa uruguaya. Si una fuente nueva no está acá, o es una nota
  // de prensa o es un blog: en cualquiera de los dos casos no alcanza para publicar un importe.
  const OFICIALES = ['impo.com.uy', 'gub.uy', 'dgi.gub.uy']

  it('cita al menos el Texto Ordenado y el decreto de la escala', () => {
    const urls = IEP_SOURCES.map(s => s.url)
    expect(urls).toContain('https://www.impo.com.uy/bases/todgi-2023/13-2024/13')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos-originales/140-2025')
  })

  it('sirve todas las fuentes por https y desde un dominio del Estado uruguayo', () => {
    for (const source of IEP_SOURCES) {
      expect(source.label.length).toBeGreaterThan(10)
      const { protocol, hostname } = new URL(source.url)
      expect(protocol).toBe('https:')
      expect(OFICIALES.some(d => hostname === d || hostname.endsWith(`.${d}`))).toBe(true)
    }
  })

  it('deja fechada la verificación', () => {
    expect(IEP_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
