// Tripwire estático sobre scripts/deploy.sh, el mismo tipo de guarda que la raíz usa sobre
// deploy-backend.sh (tests/sync/pm2_registration.test.ts): el paso de IndexNow tiene que estar
// (a) DESPUÉS del segundo wait_healthy — anunciar antes es anunciar URLs que todavía sirve el build
// viejo —, (b) guardado con `|| log` — bajo `set -e`, un 4xx de api.indexnow.org pondría en rojo un
// deploy ya swapeado y sano — y (c) con el fd 9 cerrado — el hijo heredaría el flock del deploy y
// el siguiente abortaría con "another deploy holds the lock", que ya pasó dos veces con otros hijos.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const deploySh = readFileSync(resolve(__dirname, '../../scripts/deploy.sh'), 'utf8')

const SECOND_HEALTH_OK = "Still answering 200 with only pm2's own workers."
const DEPLOY_COMPLETE = 'log "Deploy complete:'

function indexNowLine(): string {
  const line = deploySh
    .split('\n')
    .find(candidate => /^\s*node\s.*scripts\/indexnow\.mjs/.test(candidate))
  expect(
    line,
    'deploy.sh must invoke scripts/indexnow.mjs (see integration/T6-geo.md)'
  ).toBeDefined()
  return line!
}

describe('deploy.sh runs IndexNow after the deploy is proven healthy', () => {
  it('invokes the submitter once, after the second wait_healthy and before "Deploy complete"', () => {
    const line = indexNowLine()
    const invocations = deploySh
      .split('\n')
      .filter(candidate => /scripts\/indexnow\.mjs/.test(candidate) && !/^\s*#/.test(candidate))
    expect(invocations).toHaveLength(1)
    const at = deploySh.indexOf(line)
    const secondHealth = deploySh.indexOf(SECOND_HEALTH_OK)
    const complete = deploySh.indexOf(DEPLOY_COMPLETE)
    expect(secondHealth).toBeGreaterThan(-1)
    expect(complete).toBeGreaterThan(-1)
    expect(at).toBeGreaterThan(secondHealth)
    expect(at).toBeLessThan(complete)
    // Y después de los DOS wait_healthy, no sólo del primero.
    const healthChecks = [...deploySh.matchAll(/^if ! wait_healthy; then/gm)].map(
      match => match.index!
    )
    expect(healthChecks.length).toBeGreaterThanOrEqual(2)
    expect(at).toBeGreaterThan(healthChecks[1])
  })

  it('cannot fail the deploy: guarded with || log', () => {
    expect(indexNowLine()).toMatch(/\|\|\s*log\b/)
  })

  it('closes the flock fd for the child (9>&-)', () => {
    expect(indexNowLine()).toContain('9>&-')
  })

  it('runs the script from the app dir so it finds scripts/lib and .env', () => {
    expect(indexNowLine()).toMatch(/"\$APP_DIR\/scripts\/indexnow\.mjs"/)
  })
})
