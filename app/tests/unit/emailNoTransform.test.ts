import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasVisibleEmail, withNoTransform } from '../../server/utils/emailNoTransform'

// Cloudflare reescribía los emails visibles y Vue no hidrataba el texto que había renderizado
// (17 plantillas, 2026-09-19). Ver server/utils/emailNoTransform.ts.
describe('qué respuesta sale con no-transform', () => {
  it('una página con un email en el texto o en un mailto', () => {
    expect(hasVisibleEmail('<p>ante la DNA (info@aduanas.gub.uy, 2915 0007)</p>')).toBe(true)
    expect(hasVisibleEmail('<a href="mailto:contacto@cambio-uruguay.com">escribinos</a>')).toBe(
      true
    )
  })

  it('no por lo que viaja en scripts: el DSN de Sentry del payload marcaría todas las páginas', () => {
    const html =
      '<p>Cotizaciones</p><script>window.__NUXT__={dsn:"https://abc@o450.ingest.sentry.io/1"}</script>' +
      '<style>.a{background:url(x@2x.png)}</style>'
    expect(hasVisibleEmail(html)).toBe(false)
  })

  it('no por un @ que no es un email', () => {
    expect(hasVisibleEmail('<p>seguinos en @cambiouruguay</p><img srcset="logo@2x.png 2x">')).toBe(
      false
    )
  })

  it('suma la directiva sin pisar la caché que ya había', () => {
    expect(withNoTransform('public, max-age=0, must-revalidate')).toBe(
      'public, max-age=0, must-revalidate, no-transform'
    )
    expect(withNoTransform(undefined)).toBe('no-transform')
    expect(withNoTransform('no-transform')).toBe('no-transform')
    expect(withNoTransform('max-age=0, no-transform')).toBe('max-age=0, no-transform')
  })

  it('el plugin lo aplica en render:response', () => {
    const source = readFileSync(
      join(__dirname, '..', '..', 'server', 'plugins', 'email-no-transform.ts'),
      'utf8'
    )
    expect(source).toMatch(/hook\('render:response'/)
    expect(source).toMatch(/hasVisibleEmail\(response\.body\)/)
  })
})
