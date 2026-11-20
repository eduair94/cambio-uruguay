import { describe, expect, it } from 'vitest'
import {
  BASKET_VERSION,
  MIN_COVERAGE,
  MIN_QUALIFIED_STORES,
  NON_FOOD_NEEDS,
} from '../../../classes/precios/basket'
import { BASKET_V1, BASKET_V1_PINNED_AT } from '../../../classes/precios/basket_v1'
import {
  PRECIOS_BASKET_ITEMS,
  PRECIOS_BASKET_PINNED_AT,
  PRECIOS_BASKET_VERSION,
} from '../../utils/preciosBasket'
import { PRECIOS_MIN_COVERAGE, PRECIOS_MIN_STORES_PER_SCOPE } from '../../utils/preciosSummary'

// `app/utils/preciosBasket.ts` es una copia a mano de la canasta del backend: el app no puede
// importar `classes/` al compilar, vitest sí. Sin este test la copia podía quedar vieja con todo
// en verde, y la guarda de la página (que la suma coincida con `nationalCost`) sólo escondería la
// tabla sin decir por qué.
describe('la canasta del app es la del backend', () => {
  it('misma versión y misma fecha de fijación', () => {
    expect(PRECIOS_BASKET_VERSION).toBe(BASKET_VERSION)
    expect(PRECIOS_BASKET_PINNED_AT).toBe(BASKET_V1_PINNED_AT)
  })

  it('mismos artículos, en el mismo orden, con la misma cantidad y necesidad', () => {
    expect(
      PRECIOS_BASKET_ITEMS.map(({ articleId, qty, need }) => ({ articleId, qty, need }))
    ).toEqual(BASKET_V1.map(({ articleId, qty, need }) => ({ articleId, qty, need })))
  })

  it('lo que no es comida es exactamente NON_FOOD_NEEDS', () => {
    for (const item of PRECIOS_BASKET_ITEMS) {
      expect(item.food, item.need).toBe(!NON_FOOD_NEEDS.has(item.need))
    }
    expect(
      PRECIOS_BASKET_ITEMS.filter(item => !item.food)
        .map(item => item.need)
        .sort()
    ).toEqual([...NON_FOOD_NEEDS].sort())
  })

  it('los umbrales que el resumen nombra son los del backend', () => {
    expect(PRECIOS_MIN_COVERAGE).toBe(MIN_COVERAGE)
    expect(PRECIOS_MIN_STORES_PER_SCOPE).toBe(MIN_QUALIFIED_STORES)
  })
})
