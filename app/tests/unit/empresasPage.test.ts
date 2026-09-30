import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NAV_SECTIONS } from '../../utils/siteNav'
import es from '../../i18n/locales/json/es.json'
import en from '../../i18n/locales/json/en.json'
import pt from '../../i18n/locales/json/pt.json'

const APP = join(__dirname, '..', '..')
const page = readFileSync(join(APP, 'pages/empresas.vue'), 'utf8')

describe('/empresas', () => {
  it('el monitoreo de competencia dice que se prueba gratis, con la constante', () => {
    expect(page).toContain('TRIAL_DAYS')
    expect(page).toContain('Monitoreo de competencia')
  })

  it('está en la navegación con su etiqueta en los tres idiomas', () => {
    const entry = NAV_SECTIONS.flatMap(s => s.entries).find(i => i.to === '/empresas')
    expect(entry?.labelKey).toBe('empresas.nav')
    for (const locale of [es, en, pt] as any[]) expect(locale.empresas?.nav).toBeTruthy()
  })

  it('los techos salen de la constante, no de un número escrito a mano', () => {
    expect(page).toContain('API_PLAN_LIMITS')
    expect(page).not.toMatch(/20\.000|500\.000|3\.000 pedidos/)
  })

  it('no publica precios y deja el contacto', () => {
    expect(page).not.toMatch(/US\$|USD \d|\$ ?\d/)
    expect(page).toContain('API_CONTACT_EMAIL')
  })

  it('una sesión de invitado no cuenta como cuenta para crear una clave', () => {
    expect(page).toMatch(/auth\.user\?\.email/)
  })

  it('tiene condiciones con ancla y el botón lleva a la pestaña de claves', () => {
    expect(page).toContain('id="condiciones"')
    expect(page).toContain("query: { tab: 'api' }")
    expect(page).toContain('openDialog()')
  })

  it('las tarjetas de /desarrolladores y /publicidad enlazan a /empresas', () => {
    expect(readFileSync(join(APP, 'pages/desarrolladores.vue'), 'utf8')).toContain(
      "localePath('/empresas')"
    )
    expect(readFileSync(join(APP, 'pages/publicidad.vue'), 'utf8')).toContain(
      "localePath('/empresas')"
    )
  })

  it('la referencia pública declara la clave como opcional', () => {
    const spec = JSON.parse(readFileSync(join(APP, 'public/openapi.json'), 'utf8'))
    expect(spec.components.securitySchemes.ApiKeyAuth).toMatchObject({
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    })
    expect(spec.security).toEqual([{}, { ApiKeyAuth: [] }])
    expect(spec.paths['/usage']).toBeTruthy()
  })
})
