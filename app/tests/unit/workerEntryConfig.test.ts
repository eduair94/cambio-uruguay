import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

// Evaluate the actual configuration with only its data imports supplied.
const filename = new URL('../../nuxt.config.ts', import.meta.url)
const source = readFileSync(filename, 'utf8')
  .replace(/^import .*$/gm, '')
  .replace('export default defineNuxtConfig(', 'globalThis.captured = defineNuxtConfig(')
  .replaceAll('import.meta.url', JSON.stringify(filename.href))
const context: Record<string, any> = {
  process: { env: {} },
  fileURLToPath,
  URL,
  CONSENT_STRICT_REGIONS: [],
  defineNuxtConfig: (config: unknown) => config,
}
runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText,
  context
)

describe('worker entry selection', () => {
  it('leaves the development worker entry and HMR transport to Nitro', () => {
    const config = { dev: true, entry: 'nitro-dev-entry' }
    context.captured.hooks['nitro:config'](config)
    expect(config.entry).toBe('nitro-dev-entry')
    expect(context.captured.nitro.entry).toBeUndefined()
  })
  it('warms the production worker before it joins the PM2 shared socket', () => {
    const config = { dev: false, entry: 'node-server-entry' }
    context.captured.hooks['nitro:config'](config)
    expect(config.entry).toBe(fileURLToPath(new URL('../../server/entry.ts', import.meta.url)))
  })
})
