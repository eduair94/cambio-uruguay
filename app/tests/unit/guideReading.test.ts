import { describe, expect, it } from 'vitest'
import { guides, type Guide } from '../../utils/guides'
import { guideNextSteps, guideSectionIds } from '../../utils/guideReading'

const sample: Guide = {
  slug: 'tema-legal',
  title: 'Una guía legal',
  description: 'Ejemplo',
  tag: 'GUÍA',
  updatedAt: '2026-10-23',
  sections: [{ heading: 'Documentos', body: 'Documentos necesarios.' }],
}

describe('guide reading navigation', () => {
  it('keeps repeated, accented and punctuation-only headings addressable', () => {
    const headings = [
      '¿Qué documentación?',
      'Qué documentación',
      'Qué documentación 2',
      '!!!',
      '!!!',
    ]
    const ids = guideSectionIds(headings.map(heading => ({ heading })))
    expect(ids).toEqual([
      'guia-que-documentacion',
      'guia-que-documentacion-2',
      'guia-que-documentacion-2-2',
      'guia-seccion',
      'guia-seccion-2',
    ])
  })

  it('gives every published guide unique valid fragment IDs', () => {
    for (const guide of guides) {
      const ids = guideSectionIds(guide.sections)
      expect(new Set(ids).size, guide.slug).toBe(guide.sections.length)
      expect(
        ids.every(id => /^guia-[a-z0-9-]+$/.test(id)),
        guide.slug
      ).toBe(true)
    }
  })

  it('preserves all authored next steps and their order without duplicate or self links', () => {
    const related = ['/reclamo', '/consulta', '/tramite', '/documentos'].map(to => ({
      to,
      label: to,
    }))
    const result = guideNextSteps({
      ...sample,
      related: [
        ...related,
        { to: '/reclamo#pasos', label: 'Repetido' },
        { to: '/guias/tema-legal', label: 'La misma guía' },
      ],
    })
    expect(result).toEqual(related)
  })

  it('uses contextual destinations before resources from the same topic', () => {
    const contextual = { to: '/consulta', label: 'Hacer una consulta' }
    const result = guideNextSteps(
      { ...sample, sections: [{ ...sample.sections[0]!, links: [contextual] }] },
      [
        contextual,
        { to: '/reclamo', label: 'Reclamar' },
        { to: '/tramite', label: 'Trámite' },
        { to: '/documentos', label: 'Documentos' },
      ]
    )
    expect(result.map(link => link.to)).toEqual(['/consulta', '/reclamo', '/tramite'])
  })

  it('does not invent unrelated currency destinations or accept external links', () => {
    expect(guideNextSteps(sample)).toEqual([])
    expect(
      guideNextSteps({
        ...sample,
        related: [
          { to: 'https://example.com', label: 'External' },
          { to: '//example.com', label: 'External' },
        ],
      })
    ).toEqual([])
  })
})
