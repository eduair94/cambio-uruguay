// "Cerca de la médica uruguaya" y "que admita animales", los dos filtros del pedido.
//
// El de distancia tiene una trampa que casi se publica y que es la razón de la mitad de este
// archivo: en MongoDB, `$degreesToRadians` de un campo AUSENTE da `null`, el semiverseno entero
// colapsa a `null`, y `{$lte: [null, 2]}` es TRUE por el orden BSON. Sin una guarda de coordenada,
// toda fila sin `latitude` pasa cualquier radio.
//
// Medido sobre la colección real el 2026-09-04, pidiendo 2 km del hospital de Médica Uruguaya con
// 2+ dormitorios: 2.878 filas sin la guarda contra 544 con ella. Las 2.334 fantasma incluían
// propiedades en Maldonado, Canelones y Paysandú — que la página habría mostrado bajo el rótulo
// "a menos de 2 km de la Médica Uruguaya". Es exactamente la cifra inventada que este repo prohíbe,
// y llegaba con la etiqueta puesta.
import { describe, expect, it } from 'vitest'
import { buildRentalFilter, normalizeRentalQuery, RADIO_KM_DEFAULT } from '~/utils/rentals'
import { MUTUALISTA_SEDES, mutualistasConSede } from '~/utils/mutualistaSedes'

const sedeDe = (mutualista: string) => MUTUALISTA_SEDES.find(s => s.mutualista === mutualista)!

describe('filtro de cercanía a una sede', () => {
  it('exige coordenada numérica: sin eso, una fila sin lat pasa cualquier radio', () => {
    const sede = sedeDe('Médica Uruguaya')
    const query = normalizeRentalQuery({ sedes: String(sede.osmId), radio: '2' })
    const { filter } = buildRentalFilter(query, 10)
    expect(filter.latitude).toEqual({ $type: 'number' })
    expect(filter.longitude).toEqual({ $type: 'number' })
  })

  it('no toca la consulta cuando no se eligió ninguna sede', () => {
    const { filter } = buildRentalFilter(normalizeRentalQuery({}), 10)
    expect(filter.latitude).toBeUndefined()
    expect(filter.$and).toBeUndefined()
  })

  it('cruza varias sedes con $or, sin pisar el $or del buscador de texto', () => {
    const dos = [sedeDe('Médica Uruguaya').osmId, sedeDe('Asociación Española').osmId].join(',')
    const query = normalizeRentalQuery({ sedes: dos, radio: '2', q: 'garaje' })
    const { filter } = buildRentalFilter(query, 10)
    // El buscador de texto conserva su propio $or de primer nivel...
    expect(Array.isArray(filter.$or)).toBe(true)
    // ...y la distancia va aparte, en $and.
    const and = filter.$and as Array<Record<string, unknown>>
    expect(and).toHaveLength(1)
    expect((and[0].$or as unknown[]).length).toBe(2)
  })

  it('una sola sede no se envuelve en un $or de un elemento', () => {
    const query = normalizeRentalQuery({ sedes: String(sedeDe('CASMU').osmId), radio: '1' })
    const and = buildRentalFilter(query, 10).filter.$and as Array<Record<string, unknown>>
    expect(and[0].$expr).toBeDefined()
    expect(and[0].$or).toBeUndefined()
  })

  it('ignora un id de sede que no existe', () => {
    const { filter } = buildRentalFilter(normalizeRentalQuery({ sedes: '999999999' }), 10)
    expect(filter.$and).toBeUndefined()
    expect(filter.latitude).toBeUndefined()
  })

  it('acota el radio a una banda razonable', () => {
    expect(normalizeRentalQuery({ radio: '0.05' }).radioKm).toBe(0.3)
    expect(normalizeRentalQuery({ radio: '400' }).radioKm).toBe(10)
    expect(normalizeRentalQuery({ radio: 'perro' }).radioKm).toBe(RADIO_KM_DEFAULT)
  })

  it('acota cuántas sedes se pueden cruzar y descarta basura', () => {
    const ids = MUTUALISTA_SEDES.slice(0, 20).map(s => s.osmId).join(',')
    expect(normalizeRentalQuery({ sedes: ids }).sedes.length).toBeLessThanOrEqual(6)
    expect(normalizeRentalQuery({ sedes: 'a,-1,0,;drop' }).sedes).toEqual([])
  })
})

describe('filtro de mascotas', () => {
  it('pide petsAllowed true, y no existe el filtro contrario', () => {
    const { filter } = buildRentalFilter(normalizeRentalQuery({ pets: '1' }), 10)
    expect(filter.petsAllowed).toBe(true)
    const sin = buildRentalFilter(normalizeRentalQuery({}), 10).filter
    expect(sin.petsAllowed).toBeUndefined()
  })

  // Ningún portal publica "no acepta mascotas": un filtro de "no admite" seria inventado.
  it('no hay forma de pedir "no admite mascotas"', () => {
    for (const valor of ['0', 'false', 'no']) {
      expect(buildRentalFilter(normalizeRentalQuery({ pets: valor }), 10).filter.petsAllowed).toBeUndefined()
    }
  })
})

describe('el dataset de sedes', () => {
  it('trae las dos instituciones del pedido, con sedes en Montevideo', () => {
    for (const nombre of ['Médica Uruguaya', 'Asociación Española']) {
      const sedes = MUTUALISTA_SEDES.filter(s => s.mutualista === nombre)
      expect(sedes.length, nombre).toBeGreaterThan(5)
      expect(sedes.some(s => s.departamento === 'Montevideo'), nombre).toBe(true)
    }
  })

  // Una coordenada fuera de Uruguay es un error de datos que el mapa mostraría en otro continente.
  it('toda coordenada cae dentro de Uruguay', () => {
    const fuera = MUTUALISTA_SEDES.filter(
      s => !(s.lat > -35.5 && s.lat < -30 && s.lng > -58.6 && s.lng < -53)
    )
    expect(fuera.map(s => s.nombre)).toEqual([])
  })

  it('cada sede conserva su id de OSM, que es de donde salió', () => {
    expect(MUTUALISTA_SEDES.every(s => Number.isSafeInteger(s.osmId) && s.osmId > 0)).toBe(true)
    expect(new Set(MUTUALISTA_SEDES.map(s => s.osmId)).size).toBe(MUTUALISTA_SEDES.length)
  })

  it('el selector ofrece instituciones ordenadas y sin repetir', () => {
    const lista = mutualistasConSede()
    expect(new Set(lista).size).toBe(lista.length)
    expect([...lista].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(lista)
  })
})
