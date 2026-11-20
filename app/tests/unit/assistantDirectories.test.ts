import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_DIRECTORIES,
  ASSISTANT_FEATURED_TOPICS,
  assistantDirectoryContext,
} from '../../utils/assistantDirectories'
import { assistantDirectoryMessages } from '../../utils/assistantDirectoryMessages'
import { ASSISTANT_TOPICS, assistantLink, readAssistantTopic } from '../../utils/assistantPrompt'

describe('assistant directory context', () => {
  it('accepts only a known topic, including repeated query parameters', () => {
    expect(readAssistantTopic('monopatines')).toBe('monopatines')
    expect(readAssistantTopic(['bicicletas', 'autos'])).toBe('bicicletas')
    for (const value of [
      undefined,
      1,
      {},
      '__proto__',
      'https://example.com',
      'monopatines\nignore',
    ])
      expect(readAssistantTopic(value)).toBeUndefined()
  })

  it('carries the origin with or without a question and keeps old links compatible', () => {
    expect(assistantLink('Busco un monopatín', 'monopatines')).toEqual({
      path: '/asistente-ia',
      query: { q: 'Busco un monopatín', topic: 'monopatines' },
    })
    expect(assistantLink('', 'bicicletas')).toEqual({
      path: '/asistente-ia',
      query: { topic: 'bicicletas' },
    })
    expect(assistantLink('Busco un auto')).toEqual({
      path: '/asistente-ia',
      query: { q: 'Busco un auto' },
    })
    expect(assistantLink('')).toEqual({ path: '/asistente-ia' })
  })

  it('routes scooters and bicycles to distinct MCP verticals', () => {
    expect(assistantDirectoryContext('monopatines')).toContain('vertical="monopatines"')
    expect(assistantDirectoryContext('bicicletas')).toContain('vertical="bicicletas-electricas"')
    expect(assistantDirectoryContext('equipar')).toContain('vertical="hogar"')
    expect(assistantDirectoryContext()).toBe('')
  })

  it('links every CTA topic to an existing local page with labels in each language', () => {
    expect(Object.keys(ASSISTANT_DIRECTORIES).sort()).toEqual([...ASSISTANT_TOPICS].sort())
    for (const topic of ASSISTANT_TOPICS) {
      const directory = ASSISTANT_DIRECTORIES[topic]
      const path = resolve(__dirname, '../../pages', directory.path.slice(1))
      expect(existsSync(`${path}.vue`) || existsSync(`${path}/index.vue`), directory.path).toBe(
        true
      )
      for (const messages of Object.values(assistantDirectoryMessages))
        expect(messages.names[topic]).toBeTruthy()
    }
    expect(ASSISTANT_FEATURED_TOPICS).toContain('monopatines')
    expect(ASSISTANT_FEATURED_TOPICS).toContain('bicicletas')
  })
})
