// Las auditorías del propio sitio se contaban como lectores. Medido el 16/11/2026: 388 de las
// 1.190 sesiones "directas" de Uruguay en 28 días duraron cero segundos, con la misma firma de
// dispositivo sobre la misma URL — Playwright contra producción.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MEASURE_AUTOMATION_KEY, isAutomatedClient } from '../../utils/automatedClient'

const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

describe('un navegador manejado por un programa no es una visita', () => {
  it('lo dice la bandera estándar de WebDriver, con cualquier User-Agent', () => {
    expect(isAutomatedClient({ webdriver: true, userAgent: CHROME })).toBe(true)
  })

  it('y el User-Agent de las herramientas propias, aunque apaguen la bandera', () => {
    expect(isAutomatedClient({ webdriver: false, userAgent: `${CHROME} cu-seo-audit` })).toBe(true)
    expect(
      isAutomatedClient({
        userAgent: 'Mozilla/5.0 (Linux; Android 14) Chrome/130 Mobile cambio-uruguay-audit',
      })
    ).toBe(true)
    expect(isAutomatedClient({ userAgent: CHROME.replace('Chrome/', 'HeadlessChrome/') })).toBe(
      true
    )
  })

  it('un lector nunca: ni Chrome, ni Safari, ni un navegador que no declara la bandera', () => {
    expect(isAutomatedClient({ webdriver: false, userAgent: CHROME })).toBe(false)
    expect(isAutomatedClient({ userAgent: CHROME })).toBe(false)
    expect(
      isAutomatedClient({
        webdriver: false,
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
      })
    ).toBe(false)
    // Sin `navigator` (un entorno raro) no se afirma nada: se mide.
    expect(isAutomatedClient(undefined)).toBe(false)
    expect(isAutomatedClient(null)).toBe(false)
  })

  it('Lighthouse y PageSpeed se siguen midiendo: sin el tag, el laboratorio no sería la página real', () => {
    expect(
      isAutomatedClient({
        webdriver: false,
        userAgent:
          'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse',
      })
    ).toBe(false)
  })

  it('una prueba que necesita ver salir los hits lo pide, y entonces se mide', () => {
    expect(isAutomatedClient({ webdriver: true, userAgent: CHROME }, true)).toBe(false)
    expect(MEASURE_AUTOMATION_KEY).toBe('cu_measure_automation')
  })

  it('el plugin lo decide antes de iniciar GA, en cualquier ruta', () => {
    const plugin = readFileSync(join(__dirname, '..', '..', 'plugins/gtag-init.client.ts'), 'utf8')
    const guard = plugin.indexOf(
      'if (isAutomatedClient(window.navigator, measureAutomation)) return'
    )
    expect(guard).toBeGreaterThan(-1)
    expect(guard).toBeLessThan(plugin.indexOf('const { initialize } = useGtag()'))
  })
})
