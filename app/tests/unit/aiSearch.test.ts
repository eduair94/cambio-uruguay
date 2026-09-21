import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NAV_SECTIONS } from '../../utils/siteNav'
import {
  AI_CONNECTORS,
  AI_PROMPT_EXAMPLES,
  AI_TOOLSETS,
  MCP_ENDPOINT,
  SKILL_ZIP_PATH,
} from '../../utils/aiSearch'

const appRoot = resolve(__dirname, '../..')
const registerDir = resolve(appRoot, '../mcp/src/register')

/** `export const RENTAL_TOOLS = ["a", "b"] as const` → ["a", "b"] */
function registeredTools(file: string, constant: string): string[] {
  const source = readFileSync(resolve(registerDir, file), 'utf8')
  const match = new RegExp(String.raw`export const ${constant} = \[([^\]]+)\]`).exec(source)
  return match ? [...match[1]!.matchAll(/"([a-z_]+)"/g)].map(m => m[1]!) : []
}

const REGISTERED: Record<string, string[]> = {
  alquileres: registeredTools('rentals.ts', 'RENTAL_TOOLS'),
  autos: registeredTools('cars.ts', 'CAR_TOOLS'),
  productos: registeredTools('products.ts', 'PRODUCT_TOOLS'),
  cambio: registeredTools('exchange.ts', 'EXCHANGE_TOOLS'),
}

describe('/buscar-con-ia', () => {
  it('lists exactly the tools the MCP registers, per toolset', () => {
    for (const set of AI_TOOLSETS) {
      expect(REGISTERED[set.id], set.id).not.toHaveLength(0)
      expect(set.tools.map(tool => tool.name).sort(), set.id).toEqual(
        [...REGISTERED[set.id]!].sort()
      )
      expect(set.url).toBe(`${MCP_ENDPOINT}/${set.id}`)
    }
  })

  it('ships the downloadable skill zip', () => {
    expect(existsSync(resolve(appRoot, 'public', SKILL_ZIP_PATH.slice(1)))).toBe(true)
  })

  it('has examples for every search vertical and a snippet for every client', () => {
    for (const vertical of ['alquileres', 'autos', 'productos'])
      expect(AI_PROMPT_EXAMPLES.some(example => example.vertical === vertical)).toBe(true)
    for (const client of AI_CONNECTORS) expect(client.steps.length).toBeGreaterThan(0)
    expect(AI_CONNECTORS.filter(client => client.snippet?.includes(MCP_ENDPOINT))).toHaveLength(
      AI_CONNECTORS.length
    )
  })

  it('is reachable from the site navigation', () => {
    const routes = NAV_SECTIONS.flatMap(section => section.entries.map(entry => entry.to))
    expect(routes).toContain('/buscar-con-ia')
    expect(routes).toContain('/asistente-ia')
  })
})

describe('Antigravity CLI', () => {
  it('uses serverUrl, the only remote field Antigravity accepts', () => {
    const client = AI_CONNECTORS.find(c => c.id === 'antigravity')!
    expect(JSON.parse(client.snippet!)).toEqual({
      mcpServers: { 'cambio-uruguay': { serverUrl: MCP_ENDPOINT } },
    })
  })
})
