// Las tres señales que una consolidación tiene que decir A LA VEZ.
//
// Cuando dos URLs del sitio sirven la misma intención (`/<x>` y `/guias/<x>`, el defecto que
// `slugCollision.test.ts` documenta), la que cede no se borra: conserva su cuerpo y sus enlaces
// entrantes y le pasa la señal a la que se queda. Eso son tres cosas distintas y ninguna sirve
// sola:
//
//   1. `rel=canonical` apuntando a la página que se queda — es la señal que consolida;
//   2. `noindex, follow` — sin esto la guía sigue siendo candidata a aparecer, y una canónica es
//      una sugerencia que Google puede ignorar cuando la página se declara indexable;
//   3. fuera del sitemap — mandarla igual es pedirle que indexe una URL que ella misma dice que no
//      es la buena, que es la contradicción que más barato sale detectar acá.
//
// Las tres leen el MISMO campo (`Guide.consolidatedInto`), así que lo que este archivo vigila es
// que ninguna de las tres se quede atrás cuando se consolide la próxima: una guía con la canónica
// movida pero todavía en el sitemap es exactamente el estado que la consolidación venía a arreglar.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { guideCanonicalPath, guides, isGuideConsolidated } from '../../utils/guides'

const ROOT = join(__dirname, '..', '..')
const consolidadas = guides.filter(guide => guide.consolidatedInto)

describe('las guías consolidadas ceden su señal entera', () => {
  it('declara el destino como una ruta del sitio, absoluta y sin dominio', () => {
    for (const guide of consolidadas) {
      expect(guide.consolidatedInto, guide.slug).toMatch(/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/)
    }
  })

  // El destino tiene que ser una página que exista, y no la guía misma: una consolidación hacia
  // una ruta inexistente es una canónica a un 404, que es peor que no haber hecho nada.
  it('apunta a una página raíz que existe y no a sí misma', () => {
    for (const guide of consolidadas) {
      const target = guide.consolidatedInto!
      expect(target, guide.slug).not.toBe(`/guias/${guide.slug}`)
      expect(() =>
        readFileSync(join(ROOT, 'pages', `${target.slice(1)}.vue`), 'utf8')
      ).not.toThrow()
    }
  })

  it('canoniza hacia el destino, y las demás hacia sí mismas', () => {
    for (const guide of guides) {
      expect(guideCanonicalPath(guide.slug), guide.slug).toBe(
        guide.consolidatedInto ?? `/guias/${guide.slug}`
      )
      expect(isGuideConsolidated(guide.slug), guide.slug).toBe(Boolean(guide.consolidatedInto))
    }
  })

  // Un slug que no existe no es una guía consolidada: sin esto `guideCanonicalPath` inventaría
  // `/guias/<lo que le pasaron>` y el llamador no se enteraría.
  it('no consolida un slug que no está en el catálogo', () => {
    expect(isGuideConsolidated('no-existe-esta-guia')).toBe(false)
    expect(guideCanonicalPath('no-existe-esta-guia')).toBe('/guias/no-existe-esta-guia')
  })

  it('la página de la guía saca su canónica y su robots del campo, no de la ruta', () => {
    const source = readFileSync(join(ROOT, 'pages', 'guias', '[slug].vue'), 'utf8')
    expect(source).toMatch(/guideCanonicalPath\(slug\.value\)/)
    expect(source).toMatch(/isGuideConsolidated\(slug\.value\)/)
    expect(source).toMatch(/robots:.*'noindex, follow'/)
    // La canónica no puede quedar escrita a mano en paralelo al helper: dos cuentas de lo mismo es
    // cómo se separan en silencio.
    expect(source).not.toMatch(/cambio-uruguay\.com\/guias\/\$\{/)
  })

  it('el sitemap no publica una guía consolidada', () => {
    const source = readFileSync(join(ROOT, 'server', 'api', '__sitemap__', 'urls.get.ts'), 'utf8')
    expect(source).toContain('.filter(guide => !guide.consolidatedInto)')
  })
})
