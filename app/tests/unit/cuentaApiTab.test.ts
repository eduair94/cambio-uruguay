import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(__dirname, '..', '..')
const read = (p: string) => readFileSync(join(APP, p), 'utf8')

describe('pestaña api de /cuenta', () => {
  const page = read('pages/cuenta/index.vue')

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

  it('el panel de administración se esconde ante 401/403 en vez de mostrar un error', () => {
    const admin = read('components/account/ApiClientsAdminPanel.vue')
    expect(admin).toContain('v-if="!forbidden"')
    expect(admin).toMatch(/status === 403 \|\| status === 401/)
  })
})
