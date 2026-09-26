import { describe, expect, it } from 'vitest'
import {
  buildMinimumWageDataset,
  cohortMedians,
  plausibleRent,
  queryMinimumWage,
  roomTextFlags,
  rowsFromBudgetProperties,
  rowsFromRoomProperties,
  type MinimumWageRow,
} from '../../server/utils/minimumWageRentals'
import { PALANCAS_TODAS, planDelMes } from '../../utils/minimumWage'

const row = (changes: Partial<MinimumWageRow> = {}): MinimumWageRow => ({
  key: 'k1',
  title: 'Aviso',
  tipo: 'habitacion',
  department: 'Montevideo',
  neighborhood: 'Centro',
  bedrooms: null,
  area: null,
  alquiler: 8000,
  gastosComunes: null,
  source: 'facebook',
  image: null,
  lastSeen: '2026-09-26',
  serviciosIncluidos: true,
  piezaCompartida: false,
  pension: true,
  restriccion: null,
  advertId: 'rent:facebook:1',
  ...changes,
})

describe('roomTextFlags', () => {
  it('lee servicios incluidos en sus formas frecuentes', () => {
    expect(
      roomTextFlags('Alquilo habitaciónes con luz agua y wifi incluidos', '').serviciosIncluidos
    ).toBe(true)
    expect(roomTextFlags('Residencia', 'Todo incluido en el precio.').serviciosIncluidos).toBe(true)
    expect(roomTextFlags('Pieza', 'con gastos incluidos, a sr mayor solo').serviciosIncluidos).toBe(
      true
    )
    expect(roomTextFlags('Pieza', 'Luz y wifi en el precio').serviciosIncluidos).toBe(true)
    expect(roomTextFlags('Pieza', 'Servicios no incluidos.').serviciosIncluidos).toBe(false)
    expect(roomTextFlags('Pieza', 'No incluye luz ni agua').serviciosIncluidos).toBe(false)
    expect(roomTextFlags('Pieza', 'Alquilo pieza en Unión').serviciosIncluidos).toBe(false)
  })
  it('baño o cocina compartida no es pieza compartida', () => {
    expect(
      roomTextFlags('Habitación individual', 'baño compartido, cocina compartida').piezaCompartida
    ).toBe(false)
    expect(
      roomTextFlags('Alquilo Habitaciones Compartidas A Media Cuadra De 18 De Julio', '')
        .piezaCompartida
    ).toBe(true)
    expect(roomTextFlags('Residencia', 'camas en habitación de 4, cuchetas').piezaCompartida).toBe(
      true
    )
  })
  it('pensión o residencia en el título', () => {
    expect(roomTextFlags('Residencia Estudiantil Femenina', '').pension).toBe(true)
    expect(roomTextFlags('Habitación en alquiler en pensión centro', '').pension).toBe(true)
    expect(roomTextFlags('Alquiler habitación en apto compartido', '').pension).toBe(false)
    expect(roomTextFlags('Alquiler+de+habitación+', '').pension).toBe(false)
  })
  it('restricciones: sólo lo que el aviso dice, y "chicos y chicas" no restringe', () => {
    expect(roomTextFlags('Residencia Estudiantil Femenina', '').restriccion).toBe('mujeres')
    expect(roomTextFlags('Habitación en alquiler ( para hombre )', '').restriccion).toBe('hombres')
    expect(roomTextFlags('Residencia Masculina A Dos Cuadras De 18', '').restriccion).toBe(
      'hombres'
    )
    expect(roomTextFlags('Residencia Estudiantil En El Centro', '').restriccion).toBe('estudiantes')
    expect(roomTextFlags('Residencia', 'para chicos y chicas del interior').restriccion).toBe(null)
    expect(roomTextFlags('Alquilo habitación', 'zona centro').restriccion).toBe(null)
  })
})

describe('plausibilidad por cohorte', () => {
  const cohort = (department: string, type: string, bedrooms: number | null, prices: number[]) =>
    prices.map(price => ({ department, type, bedrooms, price }))
  const medians = cohortMedians([
    ...cohort(
      'Maldonado',
      'apartamento',
      3,
      [40000, 40000, 38000, 45000, 41000, 39000, 50000, 36000]
    ),
    ...cohort(
      'Montevideo',
      'apartamento',
      1,
      [27500, 27500, 26000, 29000, 30000, 25000, 27000, 28000]
    ),
    ...cohort('Colonia', 'casa', 1, [14200, 14200, 13000, 15000, 16000, 12000, 14000, 14500]),
  ])
  it('saca el 3 dormitorios de Maldonado a $ 3.500 y deja los baratos reales', () => {
    expect(
      plausibleRent(
        { department: 'Maldonado', type: 'apartamento', bedrooms: 3, price: 3500 },
        medians
      )
    ).toBe(false)
    expect(
      plausibleRent(
        { department: 'Montevideo', type: 'apartamento', bedrooms: 1, price: 10500 },
        medians
      )
    ).toBe(true)
    expect(
      plausibleRent({ department: 'Colonia', type: 'casa', bedrooms: 1, price: 6500 }, medians)
    ).toBe(true)
  })
  it('cae a departamento×tipo y a tipo nacional; sin cohorte, se abstiene y deja pasar', () => {
    expect(
      plausibleRent(
        { department: 'Maldonado', type: 'apartamento', bedrooms: 2, price: 3500 },
        medians
      )
    ).toBe(false)
    expect(
      plausibleRent({ department: 'Rocha', type: 'apartamento', bedrooms: 1, price: 3500 }, medians)
    ).toBe(false)
    expect(
      plausibleRent(
        { department: 'Rocha', type: 'habitacion', bedrooms: null, price: 3500 },
        medians
      )
    ).toBe(true)
  })
  it('una cohorte de menos de 8 no decide', () => {
    const chica = cohortMedians(cohort('Flores', 'casa', 1, [20000, 20000, 20000]))
    expect(
      plausibleRent({ department: 'Flores', type: 'casa', bedrooms: 1, price: 3000 }, chica)
    ).toBe(true)
  })
})

describe('filas', () => {
  it('casas y apartamentos: la oferta más barata, con sus gastos comunes propios', () => {
    const rows = rowsFromBudgetProperties(
      [
        {
          key: 'p1',
          title: 'Casa',
          propertyType: 'casa',
          department: 'Colonia',
          neighborhood: 'Carmelo',
          bedrooms: 1,
          area: 40,
          lastSeen: '2026-09-26',
          offers: [
            {
              source: 'infocasas',
              listingId: '9',
              title: 'Casa en Carmelo',
              price: 7000,
              priceUyu: 7000,
              currency: 'UYU',
              commonExpenses: null,
              commonExpensesCurrency: null,
              image: null,
              lastSeen: '2026-09-26',
            },
            {
              source: 'elpais',
              listingId: '8',
              title: 'Casa en Carmelo',
              price: 6500,
              priceUyu: 6500,
              currency: 'UYU',
              commonExpenses: 0,
              commonExpensesCurrency: 'UYU',
              image: 'x.jpg',
              lastSeen: '2026-09-26',
            },
          ],
        },
      ] as never,
      41.5
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      key: 'p1',
      tipo: 'casa',
      alquiler: 6500,
      gastosComunes: 0,
      source: 'elpais',
      advertId: 'rent:elpais:8',
      pension: false,
    })
  })
  it('habitaciones: descarta dólares, menos de $ 3.000 y estadías cortas; marca desde el texto propio', () => {
    const base = {
      key: 'h1',
      title: 'Pieza',
      propertyType: 'habitacion',
      department: 'Montevideo',
      neighborhood: 'Cordón',
      bedrooms: null,
      area: null,
      lastSeen: '2026-09-26',
    }
    const offer = (changes: Record<string, unknown>) => ({
      source: 'mercadolibre',
      listingId: 'MLU1',
      title: 'Residencia Estudiantil Femenina',
      price: 9000,
      priceUyu: 9000,
      currency: 'UYU',
      commonExpenses: null,
      commonExpensesCurrency: null,
      image: null,
      lastSeen: '2026-09-26',
      details: { description: 'luz, agua y wifi incluidos' },
      ...changes,
    })
    const rows = rowsFromRoomProperties([
      { ...base, offers: [offer({})] },
      { ...base, key: 'h2', offers: [offer({ currency: 'USD', price: 300 })] },
      { ...base, key: 'h3', offers: [offer({ price: 2500, priceUyu: 2500 })] },
      {
        ...base,
        key: 'h4',
        offers: [
          offer({ title: 'Habitación por día', details: { description: '$ 900 por noche' } }),
        ],
      },
    ] as never)
    expect(rows.map(r => r.key)).toEqual(['h1'])
    expect(rows[0]).toMatchObject({
      serviciosIncluidos: true,
      pension: true,
      restriccion: 'mujeres',
      alquiler: 9000,
    })
    expect(JSON.stringify(rows[0])).not.toContain('incluidos')
  })
})

describe('queryMinimumWage', () => {
  const pieza = planDelMes('pieza', 'montevideo', PALANCAS_TODAS)
  const dataset = buildMinimumWageDataset({
    generatedAt: '2026-09-26T00:00:00Z',
    analysisAt: '2026-09-19T00:00:00Z',
    budget: [
      row({
        key: 'c1',
        tipo: 'casa',
        department: 'Colonia',
        alquiler: 6500,
        gastosComunes: 0,
        pension: false,
        advertId: 'rent:elpais:8',
        bedrooms: 1,
      }),
      row({
        key: 'c2',
        tipo: 'apartamento',
        department: 'Maldonado',
        alquiler: 3500,
        pension: false,
        advertId: 'rent:infocasas:2',
        bedrooms: 3,
      }),
      row({
        key: 'c3',
        tipo: 'apartamento',
        department: 'Montevideo',
        alquiler: 24000,
        pension: false,
        advertId: 'rent:infocasas:3',
        bedrooms: 1,
      }),
    ],
    rooms: [
      row({ key: 'r1', alquiler: 7500 }),
      row({ key: 'r2', alquiler: pieza.techoPieza + 1, advertId: 'rent:facebook:2' }),
      row({ key: 'r3', alquiler: 9000, serviciosIncluidos: false, advertId: 'rent:facebook:3' }),
    ],
    analysisListings: [
      ...Array.from({ length: 8 }, () => ({
        department: 'Maldonado',
        type: 'apartamento',
        bedrooms: 3,
        price: 40000,
      })),
      ...Array.from({ length: 8 }, () => ({
        department: 'Colonia',
        type: 'casa',
        bedrooms: 1,
        price: 14200,
      })),
    ],
  })
  const none = () => false

  it('excluye por precio imposible y lo cuenta', () => {
    expect(dataset.excluidosPorPrecio).toBe(1)
    expect(dataset.rows.map(r => r.key)).not.toContain('c2')
  })
  it('pieza: las que entran, primero las que cierran sin dato faltante', () => {
    const response = queryMinimumWage(dataset, {}, none)
    expect(response.items.map(i => i.key)).toEqual(['r1', 'r3'])
    expect(response.items[1]!.evaluacion.veredicto).toBe('cierra-si')
    expect(response.items[0]!.puertas).toEqual(['hospedaje'])
    expect(response.items[0]).not.toHaveProperty('advertId')
    const resumen = response.formas.find(f => f.id === 'pieza')!
    expect(resumen).toMatchObject({ cierran: 1, condicionados: 1, desde: 7500 })
    expect(resumen.sinPalancas).toBe(0)
    expect(response.planes.map(p => p.region)).toEqual(['montevideo', 'interior'])
  })
  it('solo en el interior encuentra la casa de Colonia; solo en Montevideo, ninguna', () => {
    const interior = queryMinimumWage(dataset, { forma: 'solo-interior' }, none)
    expect(interior.items.map(i => i.key)).toEqual(['c1'])
    expect(interior.planes.map(p => p.region)).toEqual(['interior'])
    expect(interior.formas.find(f => f.id === 'solo-montevideo')!.cierran).toBe(0)
  })
  it('un departamento que no corresponde a la forma da cero sin romper', () => {
    const response = queryMinimumWage(
      dataset,
      { forma: 'solo-montevideo', departamento: 'Salto' },
      none
    )
    expect(response.total).toBe(0)
    expect(response.items).toEqual([])
    expect(response.page).toBe(1)
  })
  it('un aviso reportado como no disponible no se muestra', () => {
    const response = queryMinimumWage(dataset, {}, id => id === 'rent:facebook:1')
    expect(response.items.map(i => i.key)).toEqual(['r3'])
  })
  it('lista los departamentos con avisos de los tipos de la forma', () => {
    expect(queryMinimumWage(dataset, { forma: 'dos-sueldos' }, none).departamentos).toEqual([
      'Colonia',
      'Montevideo',
    ])
  })
})
