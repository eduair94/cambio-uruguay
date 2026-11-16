// La recirculación vivía al final de la página y casi nadie llegaba. Medido el 16/11/2026 (Uruguay,
// 28 días, teléfono de 390 px): en una guía la lista "Para seguir con este tema" cae en la pantalla
// 17 y "Seguí leyendo" en la 19; la primera rinde 17 % de clics por exposición pero se vio 196
// veces, la segunda sumó 34 clics sobre 14.175 vistas, y el 72 % de la navegación interna sale de
// enlaces DENTRO del contenido. Las guías se leen (18 % de rebote, 107 s) y se dejan (1,22 páginas
// por sesión); una calculadora, 1,03–1,30. Mismos destinos, al lado de la respuesta.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LINK_AREAS, measurementLinkArea } from '../../utils/engagementMeasurement'
import {
  INLINE_NEXT_AFTER_SECTION,
  INLINE_NEXT_LIMIT,
  INLINE_NEXT_MIN_SECTIONS,
  guideInlineNext,
} from '../../utils/guideReading'
import { RECOMMENDATION_AREAS, recommendationArea } from '../../utils/recommendationExposure'
import { RELATED_INLINE_LIMIT, relatedInlineRoutes } from '../../utils/relatedInline'

const APP = join(__dirname, '..', '..')
const read = (path: string): string => readFileSync(join(APP, path), 'utf8')

const link = (to: string) => ({ to, label: to })
const sections = (count: number, links: Record<number, string[]> = {}) =>
  Array.from({ length: count }, (_, i) => ({
    heading: `Sección ${i + 1}`,
    body: 'texto',
    ...(links[i] ? { links: links[i]!.map(link) } : {}),
  }))

describe('las primeras recomendaciones de la guía, adentro del artículo', () => {
  const next = [link('/a'), link('/b'), link('/c')]

  it('una guía corta no lleva nada: su lista del final ya está cerca', () => {
    expect(guideInlineNext({ sections: sections(INLINE_NEXT_MIN_SECTIONS - 1) }, next)).toBeNull()
  })

  it('una guía larga las lleva después de la segunda sección, y sólo las primeras', () => {
    const inline = guideInlineNext({ sections: sections(INLINE_NEXT_MIN_SECTIONS) }, next)
    expect(inline?.afterSection).toBe(INLINE_NEXT_AFTER_SECTION)
    expect(inline?.links.map(l => l.to)).toEqual(['/a', '/b'])
    expect(inline?.links).toHaveLength(INLINE_NEXT_LIMIT)
  })

  it('no repite un enlace que el lector acaba de ver como chip de las primeras secciones', () => {
    const guide = { sections: sections(6, { 0: ['/a'], 1: ['/b'], 4: ['/c'] }) }
    expect(guideInlineNext(guide, next)?.links.map(l => l.to)).toEqual(['/c'])
  })

  it('sin recomendaciones propias no inventa un bloque vacío', () => {
    expect(guideInlineNext({ sections: sections(8) }, [])).toBeNull()
    expect(guideInlineNext({ sections: sections(8, { 0: ['/a'] }) }, [link('/a')])).toBeNull()
  })

  it('la plantilla lo pinta en el servidor, con su área propia', () => {
    const page = read('pages/guias/[slug].vue')
    expect(page).toContain('v-if="inlineNext && i === inlineNext.afterSection"')
    expect(page).toContain('data-link-area="guide_inline_next"')
    // La lista del final sigue donde estaba: esto la adelanta, no la reemplaza.
    expect(page).toContain('data-link-area="guide_next_steps"')
  })
})

describe('qué hacer con el resultado, al lado del resultado', () => {
  it('el cascarón de las calculadoras lo pone después de la calculadora en sus dos diseños', () => {
    const shell = read('components/ToolShell.vue')
    expect(shell.match(/<RelatedInline \/>/g)).toHaveLength(2)
    // Antes de la unidad publicitaria de la herramienta, no después del artículo.
    expect(shell.indexOf('<RelatedInline />')).toBeLessThan(shell.indexOf('placement="after-tool"'))
  })

  it('la página de indicadores lo pone entre el conversor y las tablas', () => {
    const page = read('pages/indicadores/[indicador].vue')
    const at = page.indexOf('<RelatedInline />')
    expect(at).toBeGreaterThan(page.indexOf('data-testid="indicador-pesos-input"'))
    expect(at).toBeLessThan(page.indexOf('data-testid="indicador-equivalences"'))
  })

  it('son tres, de la misma lista que el bloque del pie', () => {
    expect(RELATED_INLINE_LIMIT).toBe(3)
    const inline = read('components/RelatedInline.vue')
    expect(inline).toContain('relatedFor(route.path, RELATED_INLINE_LIMIT')
    expect(inline).toContain('data-link-area="related_inline"')
    expect(inline).not.toContain('<ClientOnly')
  })

  it('el bloque del pie no repite lo que ya se mostró arriba EN ESA página', () => {
    const state = { path: '/herramientas/calculadora-iva', routes: ['/a', '/b'] }
    expect(relatedInlineRoutes(state, '/herramientas/calculadora-iva')).toEqual(['/a', '/b'])
    // El estado de la página anterior no vale para la siguiente.
    expect(relatedInlineRoutes(state, '/guias/otra')).toEqual([])
    expect(relatedInlineRoutes(null, '/x')).toEqual([])
    expect(read('components/RelatedPages.vue')).toContain(
      '...relatedInlineRoutes(inlineShown.value, route.path),'
    )
  })
})

describe('la medición distingue arriba de abajo', () => {
  it('las áreas nuevas son vocabulario medido, no caen en `content`', () => {
    for (const area of ['guide_inline_next', 'related_inline'] as const) {
      expect(LINK_AREAS).toContain(area)
      expect(measurementLinkArea(area)).toBe(area)
      expect(recommendationArea(area)).toBe(area)
    }
  })

  it('"Seguí leyendo" ahora tiene exposición: 34 clics no decían si alguien lo vio', () => {
    expect(RECOMMENDATION_AREAS).toContain('related_pages')
    expect(read('components/RelatedPages.vue')).toContain('data-link-area="related_pages"')
  })

  it('toda área con exposición es un área de clic: si no, el cociente no tiene numerador', () => {
    for (const area of RECOMMENDATION_AREAS) expect(LINK_AREAS).toContain(area)
  })
})
