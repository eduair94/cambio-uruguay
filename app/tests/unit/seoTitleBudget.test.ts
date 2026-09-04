import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'
import { currencyDisplayName } from '../../utils/currencyPages'
import { FRONTERA_ROUTES } from '../../utils/frontera'

/**
 * El presupuesto de caracteres de los títulos que llevan datos adentro.
 *
 * Google corta el `<title>` cerca de los 600 px —unos 60 caracteres— y lo reemplaza por
 * lo que él quiera. Un título que se pasa no es un título largo: es un título que no se
 * publicó. Estas tres claves son las que arman su texto en tiempo de render (la cifra del
 * día en la home, el departamento en /dolar/*, la moneda + el departamento en /frontera/*),
 * así que la única forma de saber si entran es medirlas con los valores reales.
 *
 * SE MIDE CON LA MARCA PUESTA. El `titleTemplate` de app.vue agrega " | Cambio Uruguay"
 * cuando el título no la trae, y ese sufijo se lleva 17 de los 60. Medir el mensaje solo
 * daría siempre verde y dejaría pasar exactamente el título que se corta en el SERP.
 * `withBrand()` repite esa regla acá porque app.vue no se puede importar en el entorno
 * node de vitest; si alguna vez cambia allá, este test miente y hay que actualizarlo.
 */
const MAX_TITLE = 60

/** Espejo del titleTemplate de app.vue: la marca se agrega sólo si no está ya. */
function withBrand(title: string): string {
  return /cambio uruguay/i.test(title) ? title : `${title} | Cambio Uruguay`
}

const LOCALES = [
  ['es', es],
  ['en', en],
  ['pt', pt],
] as const

function translator(code: 'es' | 'en' | 'pt', messages: unknown) {
  const i18n = createI18n({
    legacy: false,
    locale: code,
    messages: { [code]: messages as Record<string, unknown> },
    missingWarn: false,
    fallbackWarn: false,
  })
  return i18n.global.t as (key: string, params?: Record<string, unknown>) => string
}

/**
 * Cotizaciones de prueba con TRES dígitos enteros, no dos. El dólar cotiza hoy cerca de
 * 40, pero un título que sólo entra mientras el peso aguante no es un título que entre:
 * el presupuesto se mide contra el peor caso plausible, que es el día en que la cifra
 * crece un dígito. Van sin el "$": el símbolo lo pone el propio mensaje, como en
 * `seo.historicalDetailDescriptionLive`.
 */
const SAMPLE_SELL = '140,65'
const SAMPLE_BUY = '140,00'

/**
 * Los departamentos más largos del país. La lista viva sale del payload de casas
 * (`utils/departments.ts` la deriva de localData), así que acá van a mano los tres peores
 * casos de los 19: si entran estos, entran todos.
 */
const LONGEST_DEPARTMENTS = ['Treinta y Tres', 'Cerro Largo', 'Montevideo']

describe('los títulos con datos adentro entran en el SERP', () => {
  for (const [code, messages] of LOCALES) {
    const t = translator(code, messages)

    it(`${code}: la home cabe con y sin la cifra del día`, () => {
      const fallback = withBrand(t('seo.homeTitle'))
      const live = withBrand(t('seo.homeTitleLive', { sell: SAMPLE_SELL, buy: SAMPLE_BUY }))

      expect(fallback.length, fallback).toBeLessThanOrEqual(MAX_TITLE)
      expect(live.length, live).toBeLessThanOrEqual(MAX_TITLE)

      // VA LA CIFRA DE VENTA Y NO LA DE COMPRA, y es a propósito. Las dos juntas se leen como la
      // pizarra de UNA casa, y no lo son: son el mínimo de venta y el máximo de compra de ~40 casas
      // distintas. Los calificadores que lo aclaran ("desde", "hasta") son los que dice la
      // descripción y no entran acá; sin ellos el par puede salir cruzado —el que vende más barato
      // no tiene por qué ser el que compra más caro— y quedar absurdo en el SERP.
      expect(live).toContain(SAMPLE_SELL)
      expect(live).not.toContain(SAMPLE_BUY)
    })

    it(`${code}: /dolar/<departamento> cabe con el departamento más largo`, () => {
      for (const department of LONGEST_DEPARTMENTS) {
        const title = withBrand(t('dolarDepto.metaTitle', { department }))
        expect(title.length, title).toBeLessThanOrEqual(MAX_TITLE)
      }
    })

    it(`${code}: /frontera/<ruta> cabe en las ocho rutas reales`, () => {
      for (const route of FRONTERA_ROUTES) {
        const title = withBrand(
          t('frontera.metaTitle', {
            currency: currencyDisplayName(route.code, code),
            department: route.departmentName,
          })
        )
        expect(title.length, `${route.slug}: ${title}`).toBeLessThanOrEqual(MAX_TITLE)
      }
    })
  }
})

/**
 * El título tiene que contestar la consulta que lo trae. La home vive de "dolar hoy"
 * (de 2.652 a 31.786 impresiones en dos meses), y sin la palabra del día el título es
 * genérico por más cifra que lleve.
 */
describe('los títulos de la home dicen "hoy"', () => {
  const TODAY_WORD = { es: 'hoy', en: 'today', pt: 'hoje' } as const

  for (const [code, messages] of LOCALES) {
    it(`${code}: la palabra del día está en las dos variantes`, () => {
      const t = translator(code, messages)
      const word = TODAY_WORD[code]
      expect(t('seo.homeTitle').toLowerCase()).toContain(word)
      expect(
        t('seo.homeTitleLive', { sell: SAMPLE_SELL, buy: SAMPLE_BUY }).toLowerCase()
      ).toContain(word)
    })
  }
})
