import { describe, expect, it } from 'vitest'
// Vive en la suite del APP a propósito (ver storeConstantsParity.test.ts): la raíz no puede cargar
// app/, y el app sí puede importar la raíz. El job semanal lee sus fichas de
// classes/usefulapps/catalog.ts; este test es lo único que impide que el job mida otra app que la
// que la página muestra.
import { USEFUL_APP_STORE_IDS } from '../../../classes/usefulapps/catalog'
import { USEFUL_APPS } from '../../utils/usefulAppsCatalog'

describe('las fichas del job son las de la página', () => {
  it('mismos ids, mismos paquetes, mismos ids de App Store y mismos desarrolladores', () => {
    const fromApp = USEFUL_APPS.map(a => ({
      id: a.id,
      android: a.android?.id,
      ios: a.ios?.id,
      androidDeveloper: a.android?.developer,
      iosDeveloper: a.ios?.developer,
    }))
    const fromRoot = USEFUL_APP_STORE_IDS.map(s => ({
      id: s.id,
      android: s.android,
      ios: s.ios,
      androidDeveloper: s.androidDeveloper,
      iosDeveloper: s.iosDeveloper,
    }))
    expect(fromRoot).toEqual(fromApp)
  })
})
