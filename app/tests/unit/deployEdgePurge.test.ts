import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

// La purga de la caché de borde que el deploy hace al final, vigilada por su texto (el mismo
// patrón que `htmlCacheControl.test.ts` usa con el middleware): un script de bash no se importa.
//
// POR QUÉ EXISTE. Desde que `routeRules` declara `s-maxage` por familia, Cloudflare guarda HTML
// hasta 24 h, y ese HTML nombra `_nuxt/<hash>.js` que cada deploy renombra. Sin purga, el borde
// reproduce solo el daño de docs/app/LOADING_INCIDENT_2026-09-06.md (45 scripts que 404, la
// pestaña gira). Tres cosas tienen que seguir siendo verdad, y las tres son fáciles de perder en
// un refactor del script:
//
//   1. Se purga DESPUÉS del segundo `wait_healthy`: recién ahí el sitio está confirmado sirviendo
//      el build nuevo con los workers de pm2 y sin huérfanos. Purgar antes repoblaría el borde
//      desde un build que todavía podía no quedar.
//   2. No aborta el deploy (`set -euo pipefail`): a esa altura el sitio ya está arriba; una purga
//      fallida es caché viejo, no un sitio caído.
//   3. El token no se imprime nunca: sólo se loguea el código HTTP.
const source = readFileSync(resolve(__dirname, '../../scripts/deploy.sh'), 'utf-8')

/** Índice de la n-ésima (base 1) aparición de `pattern` en `source`, o -1. */
function nth(pattern: RegExp, n: number): number {
  const matches = [...source.matchAll(new RegExp(pattern.source, pattern.flags + 'g'))]
  return matches[n - 1]?.index ?? -1
}

describe('purga de la caché de borde en deploy.sh', () => {
  it('purga toda la zona (purge_everything, lo que soporta el plan gratuito)', () => {
    expect(source).toContain('purge_everything')
    expect(source).toMatch(/zones\/\$zone\/purge_cache/)
  })

  it('corre después del SEGUNDO wait_healthy, nunca antes', () => {
    // Las llamadas, no la definición (`wait_healthy() {`).
    const secondHealth = nth(/^\s*if ! wait_healthy; then/m, 2)
    expect(secondHealth, 'deploy.sh ya no tiene dos health checks').toBeGreaterThan(-1)
    const call = source.search(/^purge_edge_cache \|\| true$/m)
    expect(call, 'falta la llamada guardada `purge_edge_cache || true`').toBeGreaterThan(-1)
    expect(call).toBeGreaterThan(secondHealth)
    // Y antes del cierre: es parte del deploy, no un detalle de limpieza.
    expect(call).toBeLessThan(source.indexOf('log "Deploy complete'))
  })

  it('no puede abortar el deploy ni quedar corriendo detrás', () => {
    // La LLAMADA, no la definición (`purge_edge_cache() {`, que también abre la línea).
    const line = source.match(/^purge_edge_cache(?:\s.*)?$/m)?.[0] ?? ''
    expect(line).toMatch(/\|\| true$/)
    expect(line).not.toMatch(/&\s*$/)
    // La función sola también devuelve 0 en sus salidas tempranas (sin .env, sin token).
    const fn = source.slice(source.indexOf('purge_edge_cache() {'))
    expect(fn).toMatch(/return 0/)
  })

  it('no imprime el token', () => {
    expect(source).not.toMatch(/^\s*set -x/m)
    const tokenLines = source.split('\n').filter(l => /\$\{?token\b/.test(l))
    expect(tokenLines.length, 'el token se lee y se usa en alguna línea').toBeGreaterThan(0)
    for (const line of tokenLines) {
      expect(line, line).not.toMatch(/\b(echo|printf|log)\b/)
    }
    // Sólo el código HTTP de la respuesta llega al log.
    expect(source).toMatch(/curl [^\n]*-o \/dev\/null[^\n]*-w '%\{http_code\}'/)
  })

  it('lee el token del .env de la raíz y trae la zona de respaldo (no es un secreto)', () => {
    expect(source).toMatch(/CLOUDFLARE_TOKEN/)
    expect(source).toMatch(/\$REPO_DIR\/\.env/)
    expect(source).toContain('fcd8289e0c93d7f889d8cd583929a4e5')
  })
})
