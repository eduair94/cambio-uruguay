// app/tests/unit/bcuWarnings.test.ts
//
// Parsed against a real capture of the BCU listing (2026-07-11). These tests exist because the
// page NAMES COMPANIES: a parsing slip here is not a rendering bug, it is an accusation pointed
// at the wrong company.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  BCU_WARNINGS_URL,
  parseBcuWarnings,
  searchWarnings,
  sourceLink,
} from '../../utils/bcuWarnings'

const here = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(join(here, '../fixtures/bcu-advertencias.html'), 'utf8')
const rows = parseBcuWarnings(html)

describe('parseBcuWarnings', () => {
  it('keeps only the dated advertencias, not the recommendation cards', () => {
    // The fixture has 61 `.reporte_anual` anchors; only 56 are dated entries. The other 5 are
    // prevention/news cards and an empty href="#" — publishing those as "advertencias" would
    // brand the BCU's own advice as a warning about a company.
    expect(rows).toHaveLength(56)
    for (const r of rows) expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('sorts newest first', () => {
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i - 1]!.date >= rows[i]!.date).toBe(true)
    }
  })

  it('reads the newest entry exactly as the BCU wrote it', () => {
    const newest = rows[0]!
    expect(newest.date).toBe('2026-06-23')
    expect(newest.entities).toMatch(/MERCADOS INVEST/)
    // The BCU says "no registrada" here, not "no autorizada". We must not upgrade its wording.
    expect(newest.title).toMatch(/ADVERTENCIA/i)
  })

  it('handles all three href shapes and forces https', () => {
    const shapes = {
      seggco: rows.filter(r => /\/Comunicados\/seggco.*\.pdf$/i.test(r.url)).length,
      resolucion: rows.filter(r => /RR-SSF/i.test(r.url)).length,
      noticia: rows.filter(r => /Detalle-Noticia/i.test(r.url)).length,
    }
    expect(shapes.seggco).toBe(41)
    expect(shapes.resolucion).toBe(12)
    expect(shapes.noticia).toBe(3)
    expect(shapes.seggco + shapes.resolucion + shapes.noticia).toBe(rows.length)
    for (const r of rows) expect(r.url.startsWith('https://')).toBe(true)
  })

  it('classifies advertencias and ceses', () => {
    expect(rows.filter(r => r.kind === 'advertencia').length).toBeGreaterThan(30)
    expect(rows.every(r => ['advertencia', 'cese', 'otro'].includes(r.kind))).toBe(true)
  })
})

describe("the BCU's own data bug", () => {
  it('flags the comunicado that two different entries point at', () => {
    // Kredimio (29/07/2024) and Remesas Tres Cruces (19/11/2024) both link seggco24223.pdf,
    // which only discusses one of them.
    const shared = rows.filter(r => r.sharedSource)
    expect(shared.length).toBe(2)
    expect(new Set(shared.map(r => r.url)).size).toBe(1)
    expect(shared[0]!.url).toMatch(/seggco24223\.pdf/)
  })

  it('sends a flagged entry to the BCU index instead of to a document that may not name it', () => {
    const shared = rows.find(r => r.sharedSource)!
    const clean = rows.find(r => !r.sharedSource)!
    expect(sourceLink(shared)).toBe(BCU_WARNINGS_URL)
    expect(sourceLink(clean)).toBe(clean.url)
  })
})

describe('searchWarnings', () => {
  it('finds an entity by name, ignoring accents and case', () => {
    expect(searchWarnings(rows, 'urucash').length).toBeGreaterThan(0)
    expect(searchWarnings(rows, 'URUCASH').length).toBeGreaterThan(0)
  })

  it('returns everything for an empty query', () => {
    expect(searchWarnings(rows, '  ')).toHaveLength(rows.length)
  })

  it('returns nothing for an entity the BCU never warned about', () => {
    // The absence of a company from this list means NOTHING — it is not a clean bill of health.
    // The page must say so; the function just returns no rows.
    expect(searchWarnings(rows, 'banco itau')).toHaveLength(0)
  })
})
