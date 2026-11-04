import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  EQUIPAR_FICHA_CATEGORIAS,
  EQUIPAR_FICHA_FILTROS,
  EQUIPAR_FICHA_KEYS,
  equiparFichaChips,
  equiparFichaMatch,
  equiparFichaNormalize,
  equiparFichaParams,
  equiparFichaPublic,
  equiparFichaStrip,
  equiparFichaWithout,
} from '../../utils/equiparFicha'
import { equiparProductosNormalize, equiparProductosWithout } from '../../utils/equiparProductos'
import {
  equiparFichaFacetPlan,
  equiparFichaFacetasFrom,
} from '../../server/utils/equiparFichaFacets'
import {
  equiparAsesorQuery,
  equiparAsesorRequisito,
  recomendarEquipar,
  EQUIPAR_ASESOR_DEFAULT,
  type EquiparAsesorCandidato,
} from '../../utils/equiparAsesor'

describe('paridad con el backend (classes/equipar/specs/fields.ts)', () => {
  it('mismas categorías y mismas claves por categoría', () => {
    const backend = readFileSync(
      join(__dirname, '..', '..', '..', 'classes', 'equipar', 'specs', 'fields.ts'),
      'utf8'
    )
    for (const categoria of EQUIPAR_FICHA_CATEGORIAS) {
      const block = backend.slice(
        backend.indexOf(`${categoria.includes('-') ? `"${categoria}"` : categoria}: [`)
      )
      const keys = [...block.slice(0, block.indexOf('],')).matchAll(/key: "([a-zA-Z]+)"/g)].map(
        m => m[1]
      )
      expect(keys, categoria).toEqual([...EQUIPAR_FICHA_KEYS[categoria]])
    }
  })

  it('cada filtro mira un campo que existe', () => {
    for (const categoria of EQUIPAR_FICHA_CATEGORIAS) {
      for (const grupo of EQUIPAR_FICHA_FILTROS[categoria]) {
        const fields = grupo.multi ? grupo.opciones.map(o => o.field!) : [grupo.field]
        for (const field of fields) expect(EQUIPAR_FICHA_KEYS[categoria], field).toContain(field)
      }
    }
  })
})

describe('equiparFichaPublic', () => {
  it('sólo las claves de la categoría, y si salió de la ficha', () => {
    const ficha = equiparFichaPublic(
      {
        values: { capacidadL: 245, noFrost: true, inventado: 'x', eficiencia: 'A' },
        from: { capacidadL: 'ficha' },
      },
      'heladera'
    )!
    expect(ficha.values).not.toHaveProperty('inventado')
    expect(ficha).toMatchObject({
      values: { capacidadL: 245, noFrost: true, eficiencia: 'A' },
      fromFicha: true,
    })
    expect(equiparFichaPublic({ values: { capacidadL: 245 } }, 'olla')).toBeNull()
    expect(equiparFichaPublic({ values: {} }, 'heladera')).toBeNull()
  })
})

describe('filtros de ficha de equipar', () => {
  it('normaliza sólo opciones de la categoría y vuelve a la URL igual', () => {
    const query = equiparFichaNormalize(
      { capacidad: '251-350', rasgos: 'no-frost,inventado,inverter', pulgadas: '50-55' },
      'heladera'
    )!
    expect(query).toEqual({ capacidad: '251-350', rasgos: ['no-frost', 'inverter'] })
    expect(equiparFichaParams(query)).toEqual({ capacidad: '251-350', rasgos: 'no-frost,inverter' })
    expect(equiparFichaNormalize({ capacidad: '251-350' }, 'olla')).toBeUndefined()
  })

  it('arma el $match sobre ficha.values, y sin el grupo o el rasgo que se ignora', () => {
    const query = { capacidad: '251-350', rasgos: ['no-frost'] }
    expect(equiparFichaMatch(query, 'heladera')).toEqual({
      'ficha.values.capacidadL': { $gt: 250, $lte: 350 },
      'ficha.values.noFrost': true,
    })
    expect(equiparFichaMatch(query, 'heladera', ['eqficha.capacidad'])).toEqual({
      'ficha.values.noFrost': true,
    })
    expect(equiparFichaMatch({ carga: 'frontal' }, 'lavarropas')).toEqual({
      'ficha.values.carga': 'frontal',
    })
  })

  it('cada chip saca lo suyo', () => {
    const query = { capacidad: '251-350', rasgos: ['no-frost', 'inverter'] }
    const chips = equiparFichaChips(query, 'heladera')
    expect(chips.map(c => c.label)).toEqual(['Capacidad: de 251 a 350 l', 'No frost', 'Inverter'])
    expect(equiparFichaWithout(query, ['eqficha.rasgos.no-frost'])).toEqual({
      capacidad: '251-350',
      rasgos: ['inverter'],
    })
    expect(equiparFichaWithout(query, ['eqficha.capacidad'])).toEqual({
      capacidad: '',
      rasgos: ['no-frost', 'inverter'],
    })
  })

  it('en la consulta del directorio: sólo en equipar y en categorías con ficha', () => {
    const q = equiparProductosNormalize({ categoria: 'tv', pulgadas: '50-55', resolucion: '4k' })
    expect(q.eqficha).toEqual({ pulgadas: '50-55', resolucion: '4k', rasgos: [] })
    expect(
      equiparProductosNormalize({ categoria: 'olla', pulgadas: '50-55' }).eqficha
    ).toBeUndefined()
    expect(
      equiparProductosNormalize(
        { categoria: 'bicicleta-electrica', rasgos: 'acelerador' },
        'movilidad'
      ).eqficha
    ).toBeUndefined()
    expect(equiparProductosWithout(q, ['eqficha.pulgadas']).eqficha).toMatchObject({
      pulgadas: '',
      resolucion: '4k',
    })
  })
})

describe('facetas de ficha de equipar', () => {
  it('un paso por grupo sin su propio filtro, y el de conFicha', () => {
    const query = equiparProductosNormalize({
      categoria: 'lavarropas',
      capacidad: '10-12',
      carga: 'frontal',
    })
    const plan = equiparFichaFacetPlan(query, '2026-11-01')
    expect(plan.map(step => step.key)).toEqual(['capacidad', 'carga', 'rasgos', 'conFicha'])
    expect(plan[0]!.match).not.toHaveProperty('ficha.values.capacidadKg')
    expect(plan[0]!.match).toMatchObject({ 'ficha.values.carga': 'frontal' })
    // Una condición numérica exige `$isNumber`: si no, null "cumple" hasta 7 kg.
    expect(JSON.stringify(plan[0]!.group)).toContain('$isNumber')
  })

  it('una opción sin avisos no se ofrece salvo que esté puesta', () => {
    const query = equiparProductosNormalize({ categoria: 'tv', resolucion: '8k' })
    const facetas = equiparFichaFacetasFrom(
      {
        pulgadas: { 'hasta-32': 4, '50-55': 0 },
        resolucion: { '4k': 9, '8k': 0 },
        rasgos: { smart: 3 },
        conFicha: { conFicha: 12 },
      },
      query
    )!
    const resolucion = facetas.grupos.find(g => g.key === 'resolucion')!
    expect(resolucion.opciones.map(o => o.slug)).toEqual(['4k', '8k'])
    expect(facetas.grupos.find(g => g.key === 'pulgadas')!.opciones.map(o => o.slug)).toEqual([
      'hasta-32',
    ])
    expect(facetas.conFicha).toBe(12)
  })
})

describe('franja de la tarjeta', () => {
  it('lo principal de cada categoría', () => {
    expect(
      equiparFichaStrip(
        {
          values: { capacidadL: 245, noFrost: true, inverter: true, eficiencia: 'A' },
          fromFicha: true,
        },
        'heladera'
      ).main
    ).toEqual(['245 L', 'No frost', 'Inverter', 'eficiencia A'])
    expect(
      equiparFichaStrip(
        {
          values: { btu: 12000, frigorias: 3024, inverter: false, frioCalor: true },
          fromFicha: true,
        },
        'aire-acondicionado'
      ).main
    ).toEqual(['12.000 BTU', '3.024 fg', 'On/off', 'Frío/calor'])
  })
})

const cand = (
  id: string,
  priceUyu: number,
  values: Record<string, unknown>,
  condition: 'new' | 'used' = 'new'
): EquiparAsesorCandidato => ({
  id,
  title: id,
  url: `https://x/${id}`,
  image: null,
  price: priceUyu,
  currency: 'UYU',
  priceUyu,
  condition,
  source: 'mercadolibre',
  sellerName: 'V',
  brand: 'M',
  values: values as EquiparAsesorCandidato['values'],
})

describe('asesor de tamaño', () => {
  it('las reglas escritas', () => {
    expect(
      equiparAsesorRequisito('heladera', { ...EQUIPAR_ASESOR_DEFAULT, personas: 4 })
    ).toMatchObject({ field: 'capacidadL', min: 390 })
    expect(
      equiparAsesorRequisito('lavarropas', { ...EQUIPAR_ASESOR_DEFAULT, personas: 9 }).min
    ).toBe(12)
    expect(
      equiparAsesorRequisito('tv', { ...EQUIPAR_ASESOR_DEFAULT, distancia: 2.5 })
    ).toMatchObject({ min: 45, idealMax: 63 })
    // 20 m² × 115 = 2.300 frigorías = 9.126 BTU → el tamaño comercial de 9.000 (con 5 % de margen).
    const aire = equiparAsesorRequisito('aire-acondicionado', { ...EQUIPAR_ASESOR_DEFAULT, m2: 20 })
    expect(aire).toMatchObject({ field: 'btu', min: 8550, frigorias: 2300 })
    expect(aire.label).toContain('9.000 BTU')
    // Con sol y último piso el mismo ambiente pasa a 12.000.
    expect(
      equiparAsesorRequisito('aire-acondicionado', {
        ...EQUIPAR_ASESOR_DEFAULT,
        m2: 20,
        sol: true,
        ultimoPiso: true,
      }).label
    ).toContain('12.000 BTU')
  })

  it('heladera: la más barata que cumple, la inverter y la que rinde, sin repetir', () => {
    const r = recomendarEquipar(
      'heladera',
      [
        cand('chica', 15_000, { capacidadL: 200 }),
        cand('barata', 25_000, { capacidadL: 280 }),
        cand('inverter', 32_000, { capacidadL: 300, inverter: true }),
        cand('grande', 34_000, { capacidadL: 450 }),
        cand('sinDato', 10_000, {}),
        cand('usada', 9_000, { capacidadL: 300 }, 'used'),
      ],
      { ...EQUIPAR_ASESOR_DEFAULT, personas: 2 }
    )
    expect(r.picks.map(p => [p.kind, p.candidato.id])).toEqual([
      ['barato', 'barata'],
      ['inverter', 'inverter'],
      ['rinde', 'grande'],
    ])
    expect(r.sinDato).toBe(1)
    expect(r.cumplen.some(c => c.id === 'usada')).toBe(false)
  })

  it('tv: no recomienda una pantalla más grande de la que se aprovecha', () => {
    const r = recomendarEquipar(
      'tv',
      [
        cand('32', 8_000, { pulgadas: 32 }),
        cand('50', 15_000, { pulgadas: 50, resolucion: '4k' }),
        cand('85', 60_000, { pulgadas: 85 }),
      ],
      { ...EQUIPAR_ASESOR_DEFAULT, distancia: 2.5 }
    )
    expect(r.cumplen.map(c => c.id)).toEqual(['50'])
  })

  it('lleva los requisitos al directorio como sus filtros', () => {
    const input = { ...EQUIPAR_ASESOR_DEFAULT, personas: 3, noFrost: true, presupuesto: 40_000 }
    expect(
      equiparAsesorQuery('heladera', input, equiparAsesorRequisito('heladera', input))
    ).toEqual({
      condicion: 'nuevo',
      precioMax: '40000',
      capacidad: '251-350',
      rasgos: 'no-frost',
    })
  })
})
