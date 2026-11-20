import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LINK_AREAS, measurementLinkArea } from '../../utils/engagementMeasurement'
import { createHelpfulExposure, HELPFUL_VIEW_RATIO } from '../../utils/helpfulExposure'
import { RECOMMENDATION_AREAS, recommendationArea } from '../../utils/recommendationExposure'

const read = (file: string) => readFileSync(join(__dirname, '..', '..', file), 'utf8')

// `helpful_view` se mandaba al montar el widget, a 13–58 pantallas del lector: 3.241 vistas contra
// 3 respuestas, cuando el alcance real medido es 2–8 % de las vistas (informe del 20/11/2026).
describe('helpful_view cuenta lo que se vio, no lo que se montó', () => {
  it('exige la mitad del bloque a la vista con la pestaña visible, una vez por página', () => {
    const exposure = createHelpfulExposure()
    expect(HELPFUL_VIEW_RATIO).toBe(0.5)
    expect(exposure.observe('/dolar-hoy', 0.49, true)).toBeNull()
    expect(exposure.observe('/dolar-hoy', 1, false)).toBeNull()
    expect(exposure.observe('/dolar-hoy', NaN, true)).toBeNull()
    expect(exposure.observe('/dolar-hoy', 1.5, true)).toBeNull()
    expect(exposure.observe('', 1, true)).toBeNull()
    expect(exposure.seen('/dolar-hoy')).toBe(false)
    expect(exposure.observe('/dolar-hoy', 0.5, true)).toEqual({ content_path: '/dolar-hoy' })
    expect(exposure.seen('/dolar-hoy')).toBe(true)
    expect(exposure.observe('/dolar-hoy', 1, true)).toBeNull()
  })

  it('conserva el dedupe de antes: sólo contra la última página contada', () => {
    const exposure = createHelpfulExposure()
    expect(exposure.observe('/a', 1, true)).not.toBeNull()
    expect(exposure.observe('/b', 1, true)).toEqual({ content_path: '/b' })
    // Volver a /a es otra visita, igual que con el watch(visible) anterior.
    expect(exposure.observe('/a', 1, true)).toEqual({ content_path: '/a' })
  })

  it('el componente ya no lo manda al montar sino desde un IntersectionObserver', () => {
    const src = read('components/feedback/PageHelpful.vue')
    expect(src).not.toMatch(/watch\(visible/)
    expect(src).toMatch(/new IntersectionObserver\(/)
    expect(src).toContain('threshold: [HELPFUL_VIEW_RATIO]')
    expect(src).toMatch(/<aside\s[^>]*ref="root"/)
    // Una sola llamada, con el mismo nombre y el mismo parámetro (la ruta literal).
    expect(src.match(/track\('helpful_view'/g)).toHaveLength(1)
    expect(src).toContain("track('helpful_view', mark)")
  })

  // Con el mismo componente de página (/cotizacion/usd → /eur, /sucursal/a → /b) Nuxt cambia
  // useRoute() en router.afterEach mientras Suspense todavía muestra la página VIEJA en su scroll
  // viejo, que es el final, justo donde el lector tocó un enlace encima de este bloque. Sin estas
  // guardas el bloque viejo se le acreditaría a la ruta nueva y la vista real ya no contaría.
  it('no arma sobre la página vieja: espera page:loading:end y el scroll restaurado', () => {
    const src = read('components/feedback/PageHelpful.vue')
    // Navegación confirmada → desarmado y sin asentar.
    expect(src).toMatch(
      /useRouter\(\)\.afterEach\(\(to, from, failure\) => \{\s*if \(!failure && to\.path !== from\.path\) \{\s*settled = false\s*disarm\(\)/
    )
    // Página nueva adentro → asentada y armada.
    expect(src).toMatch(
      /useNuxtApp\(\)\.hook\('page:loading:end', \(\) => \{\s*settled = true\s*arm\(\)/
    )
    // arm() no hace nada sin asentar.
    expect(src).toMatch(/function arm\(\) \{[\s\S]*?if \(!settled \|\|/)
    // Dos frames: Nuxt aplica el scroll en el rAF que encola en page:loading:end, detrás del
    // primero nuestro; el segundo es el primer frame con el scroll de la página nueva.
    expect(src).toMatch(
      /requestAnimationFrame\(\(\) => \{\s*frame = requestAnimationFrame\(\(\) => \{/
    )
    // El callback descarta un observador viejo o una ruta que ya cambió.
    expect(src).toContain('if (observer !== current || route.path !== path) return')
    // Pestaña oculta al cruzar el 50 %: al volver se observa de nuevo.
    expect(src).toMatch(/addEventListener\('visibilitychange', onVisibility\)/)
    expect(src).toMatch(/removeEventListener\('visibilitychange', onVisibility\)/)
    expect(src).toMatch(/removeRouteHook\(\)/)
    expect(src).toMatch(/removePageHook\(\)/)
  })
})

// "Más sobre este tema" y la barra de familia tenían clics (related_click) y ninguna exposición.
describe('TemaVecinos y FamiliaNav tienen exposición y área de clic propias', () => {
  it('son vocabulario medido en los dos lados del cociente', () => {
    for (const area of ['topic_neighbours', 'family_nav'] as const) {
      expect(recommendationArea(area)).toBe(area)
      expect(RECOMMENDATION_AREAS).toContain(area)
      expect(LINK_AREAS).toContain(area)
      expect(measurementLinkArea(area)).toBe(area)
    }
  })

  it('la raíz de cada bloque lleva su data-link-area', () => {
    expect(read('components/TemaVecinos.vue')).toMatch(
      /<nav\s[^>]*data-link-area="topic_neighbours"/
    )
    expect(read('components/FamiliaNav.vue')).toMatch(/<nav\s[^>]*data-link-area="family_nav"/)
  })
})
