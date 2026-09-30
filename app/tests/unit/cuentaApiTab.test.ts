import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')
const read = (p: string) => readFileSync(join(APP, p), 'utf8')

describe('pestaña api de /cuenta', () => {
  const page = read('pages/cuenta/index.vue')

  it('la pestaña api monta el monitor de competencia entre las claves y la administración', () => {
    const tab = page.slice(page.indexOf('<VTabsWindowItem value="api">'))
    const keys = tab.indexOf('<AccountApiKeysPanel />')
    const monitor = tab.indexOf('<AccountCompetitorMonitorPanel />')
    const admin = tab.indexOf('<AccountApiClientsAdminPanel />')
    expect(keys).toBeGreaterThan(-1)
    expect(monitor).toBeGreaterThan(keys)
    expect(admin).toBeGreaterThan(monitor)
  })

  it('el monitor ofrece vincular Telegram y muestra el estado de la prueba', () => {
    const panel = read('components/account/CompetitorMonitorPanel.vue')
    expect(panel).toContain('<AccountTelegramLink')
    expect(panel).toContain("'/api/me/monitor'")
    expect(panel).toContain('TRIAL_DAYS')
    expect(panel).toContain('daysLeft')
  })

  it('el panel de administración lista los monitores', () => {
    expect(read('components/account/ApiClientsAdminPanel.vue')).toContain("'/api/admin/monitors'")
  })

  it('acepta ?tab=api y monta los dos paneles', () => {
    expect(page).toContain("['saved', 'favorites', 'alerts', 'api']")
    expect(page).toContain('<VTab value="api">API</VTab>')
    expect(page).toContain('<AccountApiKeysPanel />')
    expect(page).toContain('<AccountApiClientsAdminPanel />')
  })

  it('la clave nueva se muestra una vez y nunca se guarda en el navegador', () => {
    const panel = read('components/account/ApiKeysPanel.vue')
    expect(panel).toContain('no se vuelve a mostrar')
    expect(panel).not.toMatch(/localStorage|sessionStorage/)
    expect(panel).toContain("'/api/me/api-keys'")
  })

  it('explica por qué un invitado o un correo sin verificar no puede crear claves', () => {
    const panel = read('components/account/ApiKeysPanel.vue')
    expect(panel).toContain('correo verificado')
    expect(panel).toContain('emailVerified')
  })

  it('cada clave muestra su cuota y el administrador ve el uso por día', () => {
    expect(read('components/account/ApiKeysPanel.vue')).toContain('quotaText(k)')
    expect(read('components/account/ApiClientsAdminPanel.vue')).toContain('dailyText(')
  })

  it('el panel de administración se esconde ante 401/403 en vez de mostrar un error', () => {
    const admin = read('components/account/ApiClientsAdminPanel.vue')
    expect(admin).toContain('v-if="!forbidden"')
    expect(admin).toMatch(/status === 403 \|\| status === 401/)
  })
})
