import { describe, expect, it } from 'vitest'
// Vive en la suite del APP a propósito (ver usefulAppsCatalogParity.test.ts): el app puede importar
// la raíz, la raíz no puede cargar app/. El job asigna la zona de cada armador con
// classes/armadores/zones.ts y la página filtra con su espejo: si divergen, un filtro de zona
// esconde a quien el job ubicó ahí.
import { METRO_LOCALITIES, ZONE_BARRIOS } from '../../../classes/armadores/zones'
import { ARMADOR_METRO_LOCALITIES, ARMADOR_ZONE_BARRIOS } from '../../utils/armadores'

describe('las zonas de la página son las del job', () => {
  it('mismos barrios por zona y mismas localidades metropolitanas', () => {
    expect(ARMADOR_ZONE_BARRIOS).toEqual(ZONE_BARRIOS)
    expect(ARMADOR_METRO_LOCALITIES).toEqual(METRO_LOCALITIES)
  })
})
