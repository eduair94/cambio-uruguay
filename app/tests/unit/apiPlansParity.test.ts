import { describe, expect, it } from 'vitest'
// Vive en la suite del APP a propósito: la raíz no puede importar app/ (ver storeConstantsParity).
import { DEFAULT_PLAN_LIMITS } from '../../../classes/apikeys/plans'
import { FIELD_LIMITS as API_FIELD_LIMITS, MAX_ACTIVE_PER_OWNER } from '../../../classes/apikeys/validate'
import { API_PLAN_LIMITS, FIELD_LIMITS, MAX_KEYS_PER_ACCOUNT } from '../../utils/apiKeys'

// /empresas y el formulario de alta muestran estos números; la API es la que los aplica. Si
// cambian de un lado y no del otro, la página promete una cuota que la API no da.
describe('planes de la API: la página y la API dicen lo mismo', () => {
  it('los techos de cada plan', () => {
    for (const plan of ['anonymous', 'free', 'business'] as const) {
      expect(API_PLAN_LIMITS[plan], plan).toEqual({ ...DEFAULT_PLAN_LIMITS[plan] })
    }
  })

  it('el tope de claves y los largos del formulario', () => {
    expect(MAX_KEYS_PER_ACCOUNT).toBe(MAX_ACTIVE_PER_OWNER)
    for (const field of ['label', 'company', 'useCase', 'website'] as const) {
      expect(FIELD_LIMITS[field], field).toEqual({ ...API_FIELD_LIMITS[field] })
    }
  })
})
