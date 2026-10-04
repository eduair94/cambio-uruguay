// Las tarifas del boleto de Montevideo son cifras oficiales transcritas a mano de una tabla, así
// que lo que hay que vigilar no es la aritmética (hay poca) sino la transcripción: que ningún
// renglón se pierda, que ninguno se invente y que lo único calculado —el sobreprecio de pagar en
// efectivo— se calcule sólo con los dos números publicados de cada renglón.

import { describe, expect, it } from 'vitest'

import {
  BOLETO_FUENTE_ACTUALIZADA,
  BOLETO_SOURCES,
  BOLETO_SOURCE_URL,
  BOLETO_VERIFIED_AT,
  BOLETO_VIGENTE_DESDE,
  COSTO_TARJETAS,
  DEVOLUCION_FRECUENTE,
  DIFERENCIAL_DISCREPANCIA,
  DIAS_POR_MES,
  RECARGA_MINIMA,
  TARIFAS_CON_TARJETA,
  TARIFAS_EN_EFECTIVO,
  TARIFAS_TUS,
  VIAJES_POR_DIA,
  costoMensual,
  sobrepreciosEfectivo,
  soloConTarjeta,
} from '../../utils/boletoMontevideo'

describe('la tabla oficial transcrita', () => {
  it('trae los once renglones con tarjeta y los ocho en efectivo que publica la Intendencia', () => {
    expect(TARIFAS_CON_TARJETA).toHaveLength(11)
    expect(TARIFAS_EN_EFECTIVO).toHaveLength(8)
  })

  it('publica los precios de los boletos por los que más se pregunta', () => {
    const tarjeta = new Map(TARIFAS_CON_TARJETA.map(t => [t.id, t.precio]))
    const efectivo = new Map(TARIFAS_EN_EFECTIVO.map(t => [t.id, t.precio]))
    expect(tarjeta.get('una-hora')).toBe(52)
    expect(tarjeta.get('dos-horas')).toBe(78)
    expect(efectivo.get('una-hora')).toBe(64)
    expect(efectivo.get('dos-horas')).toBe(97)
    // Los centésimos son de la fuente: no se redondean a un peso para que la tabla quede "linda".
    expect(tarjeta.get('estudiante-a')).toBe(28.5)
    expect(tarjeta.get('estudiante-b')).toBe(39.9)
    expect(tarjeta.get('prepago-nominado')).toBe(46.8)
  })

  it('no repite un id dentro de la misma forma de pago', () => {
    for (const tabla of [TARIFAS_CON_TARJETA, TARIFAS_EN_EFECTIVO]) {
      expect(new Set(tabla.map(t => t.id)).size).toBe(tabla.length)
    }
  })

  it('no inventa un renglón en efectivo que la fuente no publica', () => {
    // La tabla de efectivo no trae estudiante ni prepago nominado. Que el id exista en efectivo
    // sin existir con tarjeta sería una tarifa nuestra.
    const conTarjeta = new Set(TARIFAS_CON_TARJETA.map(t => t.id))
    for (const t of TARIFAS_EN_EFECTIVO) expect(conTarjeta.has(t.id)).toBe(true)
    expect(soloConTarjeta().map(t => t.id)).toEqual([
      'estudiante-a',
      'estudiante-b',
      'prepago-nominado',
    ])
  })

  it('da precios positivos y nunca una tarifa de efectivo menor a la de tarjeta', () => {
    const tarjeta = new Map(TARIFAS_CON_TARJETA.map(t => [t.id, t.precio]))
    for (const t of [...TARIFAS_CON_TARJETA, ...TARIFAS_EN_EFECTIVO])
      expect(t.precio).toBeGreaterThan(0)
    for (const t of TARIFAS_EN_EFECTIVO) {
      expect(t.precio).toBeGreaterThanOrEqual(tarjeta.get(t.id)!)
    }
  })
})

describe('el boleto TUS', () => {
  it('transcribe los tres valores publicados y no deriva la devolución', () => {
    expect(TARIFAS_TUS).toHaveLength(5)
    const metropolitano = TARIFAS_TUS.find(t => t.id === 'metropolitano-saliente')!
    // El caso que justifica no calcular: $80 − $59 = $21 cierra, pero la fuente publica los tres
    // y es lo que se muestra. Si algún día no cerraran, la página debe seguir diciendo lo publicado.
    expect(metropolitano.valorABordo).toBe(80)
    expect(metropolitano.valorTus).toBe(59)
    expect(metropolitano.devolucion).toBe(21)
  })

  it('cobra menos al beneficiario que el valor a bordo, en todos los renglones', () => {
    for (const t of TARIFAS_TUS) {
      expect(t.valorTus).toBeLessThan(t.valorABordo)
      expect(t.devolucion).toBeGreaterThan(0)
    }
  })

  it('usa los mismos ids que la tabla general donde el boleto es el mismo', () => {
    const conTarjeta = new Map(TARIFAS_CON_TARJETA.map(t => [t.id, t.precio]))
    for (const t of TARIFAS_TUS) {
      const general = conTarjeta.get(t.id)
      if (general === undefined) continue
      // El "valor a bordo" del TUS es la tarifa electrónica general: si se despegan, una de las
      // dos transcripciones quedó vieja.
      expect(t.valorABordo).toBe(general)
    }
  })
})

describe('sobrepreciosEfectivo', () => {
  const sobreprecios = sobrepreciosEfectivo()

  it('compara sólo los boletos que existen en las dos tablas', () => {
    expect(sobreprecios).toHaveLength(TARIFAS_EN_EFECTIVO.length)
    expect(sobreprecios.map(s => s.id)).not.toContain('estudiante-a')
  })

  it('mide el sobreprecio con los dos números publicados', () => {
    const unaHora = sobreprecios.find(s => s.id === 'una-hora')!
    expect(unaHora.conTarjeta).toBe(52)
    expect(unaHora.enEfectivo).toBe(64)
    expect(unaHora.diferencia).toBe(12)
    expect(unaHora.ratio).toBeCloseTo(12 / 52, 10)
  })

  it('reconoce el único boleto que cuesta lo mismo de las dos formas', () => {
    const metropolitana = sobreprecios.find(s => s.id === 'combinacion-metropolitana')!
    expect(metropolitana.diferencia).toBe(0)
    expect(metropolitana.ratio).toBe(0)
    // Y por eso queda último: el orden es por sobreprecio relativo descendente.
    expect(sobreprecios[sobreprecios.length - 1]!.id).toBe('combinacion-metropolitana')
  })

  it('ordena de mayor a menor sobreprecio relativo, con desempate estable', () => {
    for (let i = 1; i < sobreprecios.length; i++) {
      const prev = sobreprecios[i - 1]!
      const curr = sobreprecios[i]!
      expect(prev.ratio).toBeGreaterThanOrEqual(curr.ratio)
      if (prev.ratio === curr.ratio) expect(prev.id < curr.id).toBe(true)
    }
  })

  it('nunca devuelve un sobreprecio negativo', () => {
    for (const s of sobreprecios) expect(s.diferencia).toBeGreaterThanOrEqual(0)
  })
})

describe('costoMensual', () => {
  it('usa el supuesto declarado: ida y vuelta, veintidós días', () => {
    expect(VIAJES_POR_DIA).toBe(2)
    expect(DIAS_POR_MES).toBe(22)
    expect(costoMensual(52)).toBe(2288)
    expect(costoMensual(64)).toBe(2816)
  })

  it('acepta otros supuestos y redondea a centésimos', () => {
    expect(costoMensual(52, 1, 20)).toBe(1040)
    expect(costoMensual(28.5, 2, 22)).toBe(1254)
    expect(costoMensual(46.8, 2, 21)).toBe(1965.6)
  })
})

describe('las condiciones publicadas junto a la tabla', () => {
  it('conserva la devolución al usuario frecuente y el mínimo de recarga', () => {
    expect(DEVOLUCION_FRECUENTE).toBe(2)
    expect(RECARGA_MINIMA).toBe(100)
  })

  it('describe el costo de la tarjeta en viajes, que es como lo publica la Intendencia', () => {
    expect(COSTO_TARJETAS.corriente[0]!.costo).toBe('Gratuita')
    expect(COSTO_TARJETAS.especiales).toHaveLength(4)
    for (const fila of COSTO_TARJETAS.especiales) {
      expect(fila.costo).toMatch(/viaje/)
    }
  })

  it('deja a la vista que la fuente enumera dos conjuntos de líneas diferenciales', () => {
    expect(DIFERENCIAL_DISCREPANCIA.conTarjeta).not.toBe(DIFERENCIAL_DISCREPANCIA.enEfectivo)
    for (const linea of DIFERENCIAL_DISCREPANCIA.soloEnEfectivo) {
      expect(DIFERENCIAL_DISCREPANCIA.enEfectivo).toContain(linea.replace('D ', ''))
      expect(DIFERENCIAL_DISCREPANCIA.conTarjeta).not.toContain(` ${linea.replace('D ', '')},`)
    }
  })
})

describe('la procedencia', () => {
  it('fecha la verificación, la vigencia y la última actualización de la fuente por separado', () => {
    for (const fecha of [BOLETO_VERIFIED_AT, BOLETO_VIGENTE_DESDE, BOLETO_FUENTE_ACTUALIZADA]) {
      expect(fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
    // La vigencia del ajuste es anterior a la última actualización de la página, y las dos son
    // anteriores al día en que se verificó: si se invirtieran, alguna quedó mal copiada.
    expect(BOLETO_VIGENTE_DESDE < BOLETO_FUENTE_ACTUALIZADA).toBe(true)
    expect(BOLETO_FUENTE_ACTUALIZADA <= BOLETO_VERIFIED_AT).toBe(true)
  })

  it('cita sólo fuentes oficiales de la Intendencia, con URL', () => {
    expect(BOLETO_SOURCES.length).toBeGreaterThan(0)
    for (const source of BOLETO_SOURCES) {
      expect(source.label.length).toBeGreaterThan(10)
      expect(source.url).toMatch(/^https:\/\/([a-z.]+\.)?montevideo\.gub\.uy\//)
    }
    expect(BOLETO_SOURCES.some(s => s.url === BOLETO_SOURCE_URL)).toBe(true)
  })
})
