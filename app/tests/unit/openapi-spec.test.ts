import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'

// The public OpenAPI document is the single source of truth rendered by Scalar
// on /desarrolladores and imported by external tools. These tests guard it
// against drift/typos: it must stay valid OpenAPI 3.1 and keep documenting the
// public endpoints with their tags and a 200 response.
const specPath = fileURLToPath(new URL('../../public/openapi.json', import.meta.url))
const spec = JSON.parse(readFileSync(specPath, 'utf-8'))

// Every endpoint the developer portal promises to document.
const EXPECTED: Array<[string, 'get' | 'post']> = [
  ['/', 'get'],
  ['/exchange/{origin}/{code}', 'get'],
  ['/evolution/{origin}/{code}', 'get'],
  ['/bcu', 'get'],
  ['/bcu/{origin}', 'get'],
  ['/localData', 'get'],
  ['/locations', 'get'],
  ['/parameters/origins', 'get'],
  ['/parameters/currencies', 'get'],
  ['/parameters/types', 'get'],
  ['/parameters/locations', 'get'],
  ['/parameters/all', 'get'],
  ['/ai/insights', 'post'],
  ['/ai/status', 'get'],
  ['/ping', 'get'],
  ['/health', 'get'],
]

describe('public/openapi.json', () => {
  it('is a valid OpenAPI 3.1 document with the production server', () => {
    expect(spec.openapi).toBe('3.1.0')
    expect(spec.info?.title).toBeTruthy()
    expect(spec.info?.version).toBeTruthy()
    expect(spec.servers?.[0]?.url).toBe('https://api.cambio-uruguay.com')
  })

  it('documents every expected endpoint with an operationId and a 200', () => {
    for (const [path, method] of EXPECTED) {
      const op = spec.paths?.[path]?.[method]
      expect(op, `${method.toUpperCase()} ${path} should be documented`).toBeTruthy()
      expect(op.operationId, `${method.toUpperCase()} ${path} needs an operationId`).toBeTruthy()
      expect(
        op.responses?.['200'],
        `${method.toUpperCase()} ${path} needs a 200 response`
      ).toBeTruthy()
      expect(Array.isArray(op.tags) && op.tags.length > 0, `${path} needs a tag`).toBe(true)
    }
  })

  it('has no duplicate operationIds', () => {
    const ids: string[] = []
    for (const methods of Object.values(spec.paths) as Record<string, { operationId?: string }>[]) {
      for (const op of Object.values(methods)) {
        if (op.operationId) ids.push(op.operationId)
      }
    }
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only references component schemas/params/responses that exist', () => {
    const refs: string[] = []
    const walk = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(walk)
      if (node && typeof node === 'object') {
        for (const [k, v] of Object.entries(node)) {
          if (k === '$ref' && typeof v === 'string') refs.push(v)
          else walk(v)
        }
      }
    }
    walk(spec)
    for (const ref of refs) {
      expect(ref.startsWith('#/'), `external $ref not allowed: ${ref}`).toBe(true)
      const target = ref
        .replace(/^#\//, '')
        .split('/')
        .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], spec)
      expect(target, `dangling $ref: ${ref}`).toBeTruthy()
    }
  })

  it('every tag used by an operation is declared', () => {
    const declared = new Set((spec.tags ?? []).map((t: { name: string }) => t.name))
    for (const methods of Object.values(spec.paths) as Record<string, { tags?: string[] }>[]) {
      for (const op of Object.values(methods)) {
        for (const tag of op.tags ?? []) {
          expect(declared.has(tag), `tag "${tag}" used but not declared`).toBe(true)
        }
      }
    }
  })
})
