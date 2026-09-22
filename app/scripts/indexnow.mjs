// Avisa a IndexNow (Bing/Yandex y los motores que comparten el protocolo; Google no lo lee) que
// las URLs del sitemap en español cambiaron. Lo llama `scripts/deploy.sh` después del segundo
// health check, cuando el build nuevo ya es el que contesta.
//
// Inerte hasta INDEXNOW_ENABLED=1 (en el entorno o en app/.env). Nunca sale distinto de 0: el
// deploy ya está hecho cuando esto corre y un tercero caído no puede ponerlo en rojo.
//
// Usage (desde app/):
//   node scripts/indexnow.mjs              # no-op salvo INDEXNOW_ENABLED=1
//   node scripts/indexnow.mjs --dry-run    # lista lo que enviaría, sin POST
//
// La clave se descubre en public/<hex>.txt (único archivo así, contenido = su nombre). La lógica
// vive en scripts/lib/indexnow.mjs (pura, con tests en tests/unit/indexnow.test.ts).
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

import { resolveIndexNowKey, runIndexNow } from './lib/indexnow.mjs'

let dotenvText = ''
try {
  dotenvText = readFileSync(new URL('../.env', import.meta.url), 'utf8')
} catch {
  // Sin .env no hay bandera: el gate de runIndexNow lo trata como apagado.
}

const publicDir = new URL('../public/', import.meta.url)
let key
try {
  const resolved = resolveIndexNowKey({
    fileNames: readdirSync(publicDir),
    readFile: name => readFileSync(new URL(name, publicDir), 'utf8'),
  })
  if (resolved.ok) key = resolved.key
  else console.log(`indexnow: ${resolved.reason}`)
} catch (error) {
  console.log(`indexnow: cannot list public/: ${String(error?.message || error)}`)
}

// Lo ya anunciado vive en app/.data/ (gitignored, fuera de .output: sobrevive el swap del deploy).
// Sin este archivo cada deploy re-anunciaba el sitemap entero y api.indexnow.org contestaba 429.
const stateUrl = new URL('../.data/indexnow-announced.json', import.meta.url)
const state = {
  read: () => {
    try {
      return readFileSync(stateUrl, 'utf8')
    } catch {
      return null
    }
  },
  write: text => {
    mkdirSync(new URL('../.data/', import.meta.url), { recursive: true })
    writeFileSync(stateUrl, text)
  },
}

const result = await runIndexNow({
  fetch: globalThis.fetch,
  env: process.env,
  argv: process.argv.slice(2),
  dotenvText,
  key,
  state,
  log: message => console.log(message),
})

console.log(`indexnow: ${result.status} (${result.urls} URLs, ${result.chunks} POST(s)).`)
process.exitCode = 0
