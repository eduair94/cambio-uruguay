import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSISTANT_CTA_GROUP,
  ASSISTANT_FILTER_TOPICS,
  assistantCtaMessages,
} from '../../utils/assistantCtaMessages'
import {
  ASSISTANT_PATH,
  ASSISTANT_PROMPT_MAX,
  ASSISTANT_TOPICS,
  assistantFilterList,
  assistantLink,
  readAssistantPrompt,
} from '../../utils/assistantPrompt'

const read = (file: string) => readFileSync(resolve(__dirname, '../..', file), 'utf8')

describe('readAssistantPrompt', () => {
  it('keeps a plain question and collapses whitespace', () => {
    expect(readAssistantPrompt('  Busco   alquiler\nen Pocitos  ')).toBe(
      'Busco alquiler en Pocitos'
    )
  })

  it('takes the first value of a repeated query parameter', () => {
    expect(readAssistantPrompt(['Busco auto', 'otra'])).toBe('Busco auto')
  })

  it('drops control and format characters', () => {
    const zeroWidth = String.fromCharCode(0x200b)
    expect(readAssistantPrompt(`Busco\u0000 alquiler${zeroWidth} hoy`)).toBe('Busco alquiler hoy')
  })

  it('rejects what is not a usable question', () => {
    expect(readAssistantPrompt(undefined)).toBe('')
    expect(readAssistantPrompt(42)).toBe('')
    expect(readAssistantPrompt('  ok ')).toBe('')
  })

  it('bounds the length', () => {
    expect(readAssistantPrompt('a'.repeat(2000))).toHaveLength(ASSISTANT_PROMPT_MAX)
  })
})

describe('assistantFilterList', () => {
  it('joins labels, drops empties and caps the list', () => {
    expect(assistantFilterList(['Montevideo', ' ', 'Pocitos'])).toBe('Montevideo · Pocitos')
    expect(assistantFilterList(['a', 'b', 'c'], 2)).toBe('a · b')
  })
})

describe('assistantLink', () => {
  it('carries the question only when there is one', () => {
    expect(assistantLink('Busco alquiler')).toEqual({
      path: ASSISTANT_PATH,
      query: { q: 'Busco alquiler' },
    })
    expect(assistantLink('')).toEqual({ path: ASSISTANT_PATH })
  })
})

describe('assistant call copy', () => {
  const locales = ['es', 'en', 'pt'] as const

  it('has a group for every topic', () => {
    expect(Object.keys(ASSISTANT_CTA_GROUP).sort()).toEqual([...ASSISTANT_TOPICS].sort())
  })

  it('has every question, title and text in every language', () => {
    for (const locale of locales) {
      const m = assistantCtaMessages[locale]
      for (const topic of ASSISTANT_TOPICS) {
        expect(m.q[topic as keyof typeof m.q], `${locale} q.${topic}`).toBeTruthy()
        const group = ASSISTANT_CTA_GROUP[topic]
        expect(m.title[group], `${locale} title.${group}`).toBeTruthy()
        expect(m.text[group], `${locale} text.${group}`).toBeTruthy()
      }
      for (const topic of ASSISTANT_FILTER_TOPICS)
        expect(m.qf[topic as keyof typeof m.qf], `${locale} qf.${topic}`).toContain('{filters}')
    }
  })

  it('has no vue-i18n syntax that would cut or rewrite a message', () => {
    const leaves = (value: unknown): string[] =>
      typeof value === 'string' ? [value] : Object.values(value as object).flatMap(leaves)
    for (const text of leaves(assistantCtaMessages)) {
      expect(text).not.toMatch(/[|@]/)
      expect(text.replace(/\{filters\}/g, '')).not.toMatch(/[{}]/)
    }
  })

  it('fits a heavily filtered question inside the URL budget', () => {
    const labels = Array.from({ length: 20 }, (_, i) => `Filtro número ${i}`)
    const question = assistantCtaMessages.es.qf.alquiler.replace(
      '{filters}',
      assistantFilterList(labels)
    )
    expect(question.length).toBeLessThanOrEqual(ASSISTANT_PROMPT_MAX)
  })
})

describe('where the call lives', () => {
  const pages: Array<[string, string]> = [
    ['pages/alquileres-uruguay.vue', 'alquiler'],
    ['pages/alquiler-ideal-uruguay.vue', 'hogar'],
    ['pages/oportunidades-inmobiliarias-uruguay.vue', 'oportunidadesVenta'],
    ['pages/autos-usados-uruguay/index.vue', 'autos'],
    ['pages/oportunidades-autos-usados-uruguay.vue', 'oportunidadesAutos'],
    ['pages/equipar-casa-uruguay/index.vue', 'equipar'],
    ['pages/celulares-uruguay/index.vue', 'celulares'],
    ['pages/sillas-escritorio-uruguay/index.vue', 'sillas'],
    ['pages/monopatines-electricos-uruguay.vue', 'monopatines'],
    ['pages/bicicletas-electricas-uruguay.vue', 'bicicletas'],
    ['pages/precios-de-supermercado-uruguay.vue', 'super'],
  ]

  it.each(pages)('%s links to the assistant with its topic', (file, topic) => {
    const source = read(file)
    expect(source).toMatch(/<AssistantCta\b/)
    expect(source).toMatch(new RegExp(`topic="${topic}"|'${topic}'`))
  })

  it('the rental call carries the filter chips and never the reference address', () => {
    const source = read('pages/alquileres-uruguay.vue')
    const call = source.slice(
      source.indexOf('<AssistantCta'),
      source.indexOf('/>', source.indexOf('<AssistantCta'))
    )
    expect(call).toContain('filterChips')
    expect(call).not.toMatch(/ref(Label|Lat|Lng)|referencePoint/)
  })

  it('the assistant page reads the question and hands it to the chat', () => {
    const source = read('pages/asistente-ia.vue')
    expect(source).toContain('readAssistantPrompt(')
    expect(source).toContain(':initial-prompt="initialPrompt"')
  })
})
