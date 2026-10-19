// El catálogo de `/alquiler-de-temporada-uruguay`.
//
// Lo que este archivo vigila no es el formato: es que la página no se desacople de la ley. Las
// cifras que la hacen útil —120 días de plazo, 15 de desalojo, 5 años de conservación de datos—
// viven en constantes, y el título y la descripción son literales dentro del `.vue` porque es la
// única forma que `seoTitleBudget` y `seoDescriptionBudget` saben leer sin ejecutar la app. Esas
// dos formas no se hablan entre sí, así que el día que alguien corrija una constante el snippet se
// queda con el número viejo y nadie se entera: eso es lo que los tres primeros casos impiden.
//
// Y una segunda cosa, que es la regla del sitio: ninguna cifra sin fuente. Cada regla del contrato
// declara el `sourceId` de la fuente que la sostiene y acá se exige que ese id exista.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  SEASONAL_DUTIES,
  SEASONAL_EVICTION_DAYS,
  SEASONAL_FAQ,
  SEASONAL_GUEST_DATA_YEARS,
  SEASONAL_MAX_DAYS,
  SEASONAL_PATH,
  SEASONAL_RULES,
  SEASONAL_SOURCES,
  SEASONAL_UNPUBLISHED,
  SEASONAL_VERIFIED_AT,
} from '../../utils/seasonalRental'

const PAGE = readFileSync(
  join(__dirname, '..', '..', 'pages', 'alquiler-de-temporada-uruguay.vue'),
  'utf8'
)

/** El literal de un `const <name> = '…'` del nivel superior del `<script setup>`. */
function pageLiteral(name: string): string {
  const match = PAGE.match(new RegExp(`\\nconst ${name} =\\s*\\n?\\s*'((?:[^'\\\\]|\\\\.)*)'`))
  if (!match) throw new Error(`no se pudo leer el literal \`${name}\` de la página`)
  return match[1]!
}

const title = pageLiteral('title')
const description = pageLiteral('description')

describe('el snippet no se despega de la ley', () => {
  it('el título imprime el plazo que define el contrato', () => {
    expect(title).toContain(String(SEASONAL_MAX_DAYS))
  })

  it('la descripción imprime el plazo y el desalojo', () => {
    expect(description).toContain(String(SEASONAL_MAX_DAYS))
    expect(description).toContain(String(SEASONAL_EVICTION_DAYS))
    // La norma que da la redacción vigente: si deja de nombrarse, la descripción vuelve a ser una
    // frase que serviría para cualquier página de alquiler.
    expect(description).toContain('20.352')
  })

  it('entra en el SERP con la marca que agrega el titleTemplate', () => {
    expect(`${title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(description.length).toBeLessThanOrEqual(155)
  })

  it('la página se declara en la ruta del catálogo', () => {
    // El canonical se arma con la constante, así que lo que se verifica es eso y no una cadena
    // repetida: un canonical relativo o apuntando a otro host es lo único que Google ignora entero.
    expect(PAGE).toContain('https://cambio-uruguay.com${SEASONAL_PATH}')
    expect(PAGE).toContain("rel: 'canonical'")
    expect(SEASONAL_PATH).toBe('/alquiler-de-temporada-uruguay')
  })
})

describe('las reglas del contrato citan la fuente que las sostiene', () => {
  const ids = new Set(SEASONAL_SOURCES.map(source => source.id))

  it.each(SEASONAL_RULES.map(rule => [rule.id, rule.sourceId] as const))(
    'la regla %s apunta a una fuente que existe',
    (_id, sourceId) => {
      expect(ids.has(sourceId)).toBe(true)
    }
  )

  it('las dos cifras del contrato aparecen escritas en sus reglas', () => {
    const plazo = SEASONAL_RULES.find(rule => rule.id === 'plazo')!
    const desalojo = SEASONAL_RULES.find(rule => rule.id === 'desalojo')!
    expect(plazo.label).toContain(String(SEASONAL_MAX_DAYS))
    expect(plazo.detail).toContain('120 (ciento veinte) días')
    expect(desalojo.label).toContain(String(SEASONAL_EVICTION_DAYS))
    expect(desalojo.detail).toContain('quince días')
  })

  it('toda fuente es oficial: impo.com.uy o gub.uy', () => {
    for (const source of SEASONAL_SOURCES) {
      expect(source.url, source.id).toMatch(
        /^https:\/\/(www\.)?(impo\.com\.uy|gub\.uy)\/|^https:\/\/www\.gub\.uy\//
      )
    }
  })

  it('no hay dos fuentes con el mismo id', () => {
    expect(new Set(SEASONAL_SOURCES.map(s => s.id)).size).toBe(SEASONAL_SOURCES.length)
  })
})

describe('las obligaciones de la Ley 20.352', () => {
  it('cada una declara el artículo del que sale', () => {
    for (const duty of SEASONAL_DUTIES) {
      expect(duty.article, duty.id).toMatch(/^art\. \d+$/)
    }
  })

  it('la conservación de datos de huéspedes usa la constante y no un número suelto', () => {
    const interior = SEASONAL_DUTIES.find(duty => duty.id === 'interior')!
    expect(interior.detail).toContain(`${SEASONAL_GUEST_DATA_YEARS} años`)
  })
})

describe('lo que la página se niega a publicar', () => {
  it('declara los cuatro vacíos con su motivo', () => {
    expect(SEASONAL_UNPUBLISHED.length).toBeGreaterThanOrEqual(4)
    for (const item of SEASONAL_UNPUBLISHED) {
      expect(item.why.length, item.id).toBeGreaterThan(40)
    }
  })

  /**
   * El accidente concreto: alguien lee una nota de prensa sobre el proyecto de decreto y le pone
   * un monto a la multa. La ley no lo fija y no hay decreto publicado, así que el día que aparezca
   * un signo de pesos o una UR en este catálogo la cifra salió de una fuente que no es oficial.
   */
  it('ningún texto del catálogo inventa un monto de multa', () => {
    const textos = [
      ...SEASONAL_UNPUBLISHED.map(item => `${item.label} ${item.why}`),
      ...SEASONAL_DUTIES.map(duty => `${duty.label} ${duty.detail}`),
      ...SEASONAL_FAQ.map(faq => `${faq.question} ${faq.answer}`),
    ].join(' ')
    expect(textos).not.toMatch(/multa[^.]{0,60}(\$|UR\b|UI\b|\d+\s*(pesos|dólares))/i)
  })
})

describe('las preguntas frecuentes contestan con la ley', () => {
  it('ninguna respuesta queda vacía ni se repite la pregunta', () => {
    expect(SEASONAL_FAQ.length).toBeGreaterThanOrEqual(5)
    expect(new Set(SEASONAL_FAQ.map(f => f.question)).size).toBe(SEASONAL_FAQ.length)
    for (const faq of SEASONAL_FAQ) expect(faq.answer.length).toBeGreaterThan(60)
  })

  it('la del plazo trae el número y la del desalojo también', () => {
    const texto = SEASONAL_FAQ.map(f => f.answer).join(' ')
    expect(texto).toContain('120 días')
    expect(texto).toContain('quince días')
  })
})

describe('la fecha de cotejo', () => {
  it('es una fecha ISO y no quedó en el futuro', () => {
    expect(SEASONAL_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(`${SEASONAL_VERIFIED_AT}T00:00:00Z`).getTime()).toBeLessThanOrEqual(Date.now())
  })
})
