import { describe, expect, it } from 'vitest'
import { projectBasket, projectBasketCost } from '../../server/utils/basketProjection'

// El documento tal como lo sirve GET /precios/basket, medido en produccion el
// 2026-09-08.
const REAL = {
  day: '2026-09-08',
  basketVersion: 1,
  basketItems: 33,
  qualifiedStores: 356,
  nationalRatio: 0.9985008629486388,
  nationalCost: {
    food: 7737.5,
    nonFood: 1548.4,
    total: 9285.9,
    itemsPriced: 33,
    foodItems: 26,
    nonFoodItems: 7,
    items: 33,
  },
  cheapestStores: [{ storeId: 852, storeName: 'X' }],
  shelfVerdicts: [],
}

describe('projectBasket', () => {
  it('conserva el costo nacional, que es el campo que la pagina necesita', () => {
    // La regresion que motivo este archivo: el campo existia en el backend y en
    // el tipo de la pagina, y la proyeccion de la ruta lo dejaba afuera. El
    // bloque no renderizaba, sin error y sin test rojo.
    const out = projectBasket(REAL)
    expect(out?.nationalCost).not.toBeNull()
    expect(out?.nationalCost?.food).toBe(7737.5)
    expect(out?.nationalCost?.foodItems).toBe(26)
    expect(out?.nationalCost?.nonFoodItems).toBe(7)
  })

  it('conserva el resto de lo que la pagina usa', () => {
    const out = projectBasket(REAL)
    expect(out).toMatchObject({
      day: '2026-09-08',
      basketVersion: 1,
      basketItems: 33,
      qualifiedStores: 356,
    })
  })

  it('NO reenvia lo que la pagina no usa', () => {
    // cheapestStores y shelfVerdicts son decenas de filas por visita.
    const out = projectBasket(REAL) as Record<string, unknown>
    expect(out.cheapestStores).toBeUndefined()
    expect(out.shelfVerdicts).toBeUndefined()
  })

  it('devuelve null sin lectura usable', () => {
    expect(projectBasket(null)).toBeNull()
    expect(projectBasket({})).toBeNull()
    expect(projectBasket({ day: '' })).toBeNull()
    expect(projectBasket('no es un objeto')).toBeNull()
  })

  it('un documento viejo sin nationalCost proyecta null, no ceros', () => {
    const { nationalCost, ...old } = REAL
    void nationalCost
    const out = projectBasket(old)
    expect(out?.day).toBe('2026-09-08')
    expect(out?.nationalCost).toBeNull()
  })
})

describe('projectBasketCost', () => {
  it('completa el total cuando falta, sumando las dos mitades', () => {
    const out = projectBasketCost({ food: 100, nonFood: 20, itemsPriced: 5 })
    expect(out?.total).toBe(120)
  })

  it('rechaza un costo sin articulos valuados', () => {
    expect(projectBasketCost({ food: 100, nonFood: 20, itemsPriced: 0 })).toBeNull()
    expect(projectBasketCost({ nonFood: 20, itemsPriced: 5 })).toBeNull()
  })
})
