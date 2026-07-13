import { readFileSync } from 'node:fs'
import * as ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  FIGURES,
  IRPF_CAT2,
  REGIMES,
  applyGates,
  type Figure,
  type WizardInput,
} from '../../utils/companyTypes'

const isFigure = (v: unknown): v is Figure =>
  typeof v === 'object' &&
  v !== null &&
  typeof (v as Figure).value === 'number' &&
  typeof (v as Figure).label === 'string' &&
  typeof (v as Figure).source === 'string' &&
  typeof (v as Figure).verifiedAt === 'string'

describe('FIGURES', () => {
  it('exposes every numeric constant as a sourced Figure', () => {
    const entries = Object.entries(FIGURES)
    // There are 53 verified figures as of the 2026-07-13 audit. This must be a floor,
    // not just "some" — a regression that silently drops figures should fail loudly.
    expect(entries.length).toBeGreaterThanOrEqual(53)
    for (const [key, value] of entries) {
      expect(isFigure(value), `FIGURES.${key} is not a Figure`).toBe(true)
    }
  })

  it('sources every figure to a primary domain with an ISO verification date', () => {
    const PRIMARY = [
      'bps.gub.uy',
      'dgi.gub.uy',
      'gub.uy',
      'impo.com.uy',
      'ine.gub.uy',
      'bcu.gub.uy',
    ]
    for (const [key, f] of Object.entries(FIGURES)) {
      expect(f.source, `FIGURES.${key} has no URL`).toMatch(/^https:\/\//)
      expect(
        PRIMARY.some(d => f.source.includes(d)),
        `FIGURES.${key} is not sourced to a primary domain: ${f.source}`
      ).toBe(true)
      expect(f.verifiedAt, `FIGURES.${key} has a bad date`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('does not recompute the peso ceilings from the live UI value', () => {
    // The ceilings are annual constants published by BPS/DGI, fixed with the UI at
    // the close of the PREVIOUS ejercicio. Recomputing them with today's UI is wrong.
    expect(FIGURES.topeMonotributoUnipersonalUyu.value).toBe(1_175_537)
    expect(FIGURES.topeLiteralEUyu.value).toBe(1_959_229)
    const wrong = FIGURES.topeMonotributoUnipersonalUi.value * FIGURES.uiHoy.value
    expect(FIGURES.topeMonotributoUnipersonalUyu.value).not.toBe(Math.round(wrong))
  })
})

describe('IRPF_CAT2', () => {
  it('carries its own provenance', () => {
    expect(IRPF_CAT2.source).toMatch(/^https:\/\//)
    expect(IRPF_CAT2.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('has strictly ascending upTo and non-decreasing rate, with the top bracket open-ended', () => {
    const { brackets } = IRPF_CAT2
    expect(brackets.length).toBeGreaterThan(1)
    for (let i = 1; i < brackets.length; i++) {
      const prev = brackets[i - 1]!
      const curr = brackets[i]!
      // Every bracket but the last must have a numeric ceiling, strictly greater
      // than the previous one — otherwise a slice of income falls through the scale.
      expect(prev.upTo, `bracket ${i - 1} is not the last but has upTo: null`).not.toBeNull()
      if (prev.upTo !== null) {
        const currCeiling = curr.upTo ?? Infinity
        expect(
          currCeiling,
          `bracket ${i} upTo (${String(curr.upTo)}) is not strictly greater than bracket ${i - 1} upTo (${prev.upTo})`
        ).toBeGreaterThan(prev.upTo)
      }
      expect(
        curr.rate,
        `bracket ${i} rate (${curr.rate}) is lower than bracket ${i - 1} rate (${prev.rate})`
      ).toBeGreaterThanOrEqual(prev.rate)
    }
    expect(brackets[brackets.length - 1]!.upTo).toBeNull()
  })
})

describe('REGIMES', () => {
  it('has a unique id, a name and at least one source per regime', () => {
    const ids = REGIMES.map(r => r.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const r of REGIMES) {
      expect(r.name.length).toBeGreaterThan(0)
      expect(r.sources.length).toBeGreaterThan(0)
      expect(['ilimitada', 'limitada']).toContain(r.liability)
    }
  })

  it('marks every simplified regime that has an exit lockout', () => {
    // All three simplified regimes (monotributo social, monotributo, Literal E) carry a
    // 3-year re-entry lockout if you're forced out. Check all three, not just two of them.
    const lockoutIds = ['monotributo-social', 'monotributo', 'unipersonal-literal-e'] as const
    for (const id of lockoutIds) {
      const regime = REGIMES.find(r => r.id === id)!
      expect(regime.lockout?.years, `${id} should have a 3-year lockout`).toBe(3)
      expect(regime.lockout?.url, `${id} lockout should cite a norm URL`).toContain('impo.com.uy')
      expect(regime.lockout?.norm.length ?? 0, `${id} lockout should cite a norm`).toBeGreaterThan(
        0
      )
    }
  })
})

describe('no-unsourced-number guard', () => {
  // This is the enforcement mechanism for the file's own header comment: "EVERY numeric
  // constant is a `Figure` ... Nothing numeric may live outside this object." Iterating
  // `Object.entries(FIGURES)` only proves FIGURES itself is well-formed — it says nothing
  // about numbers that live OUTSIDE FIGURES (a stray `export const TOPE = 9_999_999`, a
  // magic number buried in a helper function, etc.). This test reads the module's own
  // source text and walks its AST looking for exactly that.
  const sourcePath = new URL('../../utils/companyTypes.ts', import.meta.url)
  const source = readFileSync(sourcePath, 'utf8')
  const sourceFile = ts.createSourceFile(
    'companyTypes.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )

  /** Is `node` (anywhere in its ancestor chain) an argument of a call to `fig(...)`? */
  const isInsideFigCall = (node: ts.Node): boolean => {
    for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
      if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === 'fig') {
        return true
      }
    }
    return false
  }

  /** Is `node` used as an array index, e.g. the `0` in `arr[0]`? */
  const isArrayIndex = (node: ts.Node): boolean => {
    const p = node.parent
    return !!p && ts.isElementAccessExpression(p) && p.argumentExpression === node
  }

  /**
   * Is `node` inside the `brackets` property value of the `IRPF_CAT2` declaration
   * specifically — NOT anywhere under the declaration. Walking up looking only for
   * `VariableDeclaration IRPF_CAT2` (the previous version of this check) exempted the
   * ENTIRE object literal, so a sibling of `source`/`verifiedAt`/`brackets` (e.g. a
   * smuggled `sneakyUnsourcedFicto: 0.42`) rode along for free. Requiring the node to
   * also be nested inside a `PropertyAssignment` named `brackets` closes that: only
   * literals inside the array assigned to `brackets:` are exempt.
   */
  const isInsideIrpfCat2Brackets = (node: ts.Node): boolean => {
    let insideBracketsProp = false
    for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
      if (
        !insideBracketsProp &&
        ts.isPropertyAssignment(p) &&
        ts.isIdentifier(p.name) &&
        p.name.text === 'brackets'
      ) {
        insideBracketsProp = true
      }
      if (
        insideBracketsProp &&
        ts.isVariableDeclaration(p) &&
        ts.isIdentifier(p.name) &&
        p.name.text === 'IRPF_CAT2'
      ) {
        return true
      }
    }
    return false
  }

  /**
   * Is `node` the `years` value of a `Lockout` object literal that is itself bound to a
   * `lockout:` property (as every `Regime.lockout` is)? Matching on sibling `norm`/`url`
   * property *names* alone (the previous version of this check) let a decoy object
   * anywhere in the file — e.g. `{ years: 8675309, norm: '...', url: '...' }`, never
   * assigned to `lockout:` — through on shape alone. Requiring the object literal's own
   * parent to be a `PropertyAssignment` named `lockout` binds the exemption to the real
   * `Regime.lockout` structure, not merely a similarly-shaped object. The norm/url pair
   * right next to `years` IS its source — the same role `Figure.source` plays for FIGURES
   * — so it doesn't need to move into FIGURES.
   */
  const isLockoutYears = (node: ts.Node): boolean => {
    const propAssign = node.parent
    if (!propAssign || !ts.isPropertyAssignment(propAssign)) return false
    if (!ts.isIdentifier(propAssign.name) || propAssign.name.text !== 'years') return false
    const obj = propAssign.parent
    if (!obj || !ts.isObjectLiteralExpression(obj)) return false
    const lockoutPropAssign = obj.parent
    if (!lockoutPropAssign || !ts.isPropertyAssignment(lockoutPropAssign)) return false
    if (!ts.isIdentifier(lockoutPropAssign.name) || lockoutPropAssign.name.text !== 'lockout') {
      return false
    }
    const siblingNames = obj.properties
      .filter(ts.isPropertyAssignment)
      .map(p => (ts.isIdentifier(p.name) ? p.name.text : ''))
    return siblingNames.includes('norm') && siblingNames.includes('url')
  }

  // Small, individually-justified allowlist of bare structural numbers that are facts of
  // arithmetic/the calendar, not verified legal/financial figures. KEEP THIS SHORT: every
  // entry re-opens the hole this test exists to close. A bare rate or ceiling (e.g. 0.12,
  // 4321) must NOT be added here — it belongs in FIGURES with a primary source.
  //
  // '100' (percentage-to-fraction conversion divisor) was deliberately REMOVED: paired
  // with the allowlisted '12', it let an unsourced rate through disguised as arithmetic —
  // `x * (12 / 100)` is `x * 0.12`, the exact bare rate this guard exists to reject, and it
  // produced zero guard failures. Nothing in the current file needs a bare 100, and with it
  // gone there is no way to compose a disguised percentage from what remains ({0, 1, 12}):
  // every combination of those three is either trivial (0, 1, 12, 12±0, 12±1, 12*0, 12*1)
  // or the reciprocal of the legitimate monthly-conversion itself (1/12). Do not re-add
  // '100' (or any other divisor) without re-solving this problem, not just re-hiding it.
  const STRUCTURAL_ALLOWLIST: Record<string, string> = {
    '0': 'neutral/identity value (baseline, "no lockout", loop start)',
    '1': 'neutral/identity value (single unit, multiplier of one)',
    '12': 'months per year — a calendar fact, not a verified figure',
  }

  const isApproved = (node: ts.NumericLiteral): boolean =>
    isInsideFigCall(node) ||
    isArrayIndex(node) ||
    isInsideIrpfCat2Brackets(node) ||
    isLockoutYears(node) ||
    node.text in STRUCTURAL_ALLOWLIST

  it('has no numeric literal outside FIGURES, IRPF_CAT2, or the structural allowlist', () => {
    const offenders: string[] = []
    const visit = (node: ts.Node) => {
      if (ts.isNumericLiteral(node) && !isApproved(node)) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        offenders.push(`  line ${line + 1}: ${node.getText(sourceFile)}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(sourceFile)

    expect(
      offenders,
      `Found ${offenders.length} unsourced numeric literal(s) in companyTypes.ts:\n${offenders.join('\n')}\n` +
        `Move each one into FIGURES with a primary source (fig(value, label, source)), or — if it ` +
        `is genuinely structural (like the calendar/percentage constants already allowlisted above) ` +
        `— add it to STRUCTURAL_ALLOWLIST in this test with a one-line justification.`
    ).toEqual([])
  })
})

const base: WizardInput = {
  annualRevenueUyu: 600_000,
  sells: 'bienes',
  clients: 'consumidor-final',
  people: 'solo',
  employees: 0,
  needsLimitedLiability: false,
  otherCompanyRole: false,
}

const statusOf = (input: WizardInput, id: string) =>
  applyGates(input).find(g => g.regime === id)!.status

describe('applyGates', () => {
  it('lets a small shop selling to consumers keep monotributo', () => {
    expect(statusOf(base, 'monotributo')).toBe('elegible')
  })

  it('bars servicios personales from monotributo (Ley 18.083 art. 72 lit. C)', () => {
    const g = applyGates({ ...base, sells: 'servicios' }).find(x => x.regime === 'monotributo')!
    expect(g.status).toBe('excluido')
    expect(g.reasons[0]!.norm).toContain('72')
    expect(g.reasons[0]!.url).toMatch(/^https:\/\//)
  })

  it('flags Literal E as DUDOSO — not excluded — for pure servicios personales', () => {
    const g = applyGates({ ...base, sells: 'servicios' }).find(
      x => x.regime === 'unipersonal-literal-e'
    )!
    expect(g.status).toBe('dudoso')
    expect(g.reasons[0]!.url).toContain('4761')
  })

  it('bars monotributo when the client is a company (art. 71 lit. D)', () => {
    expect(statusOf({ ...base, clients: 'empresas' }, 'monotributo')).toBe('excluido')
  })

  it('bars monotributo with more than one employee', () => {
    expect(statusOf({ ...base, employees: 2 }, 'monotributo')).toBe('excluido')
  })

  it('bars monotributo for a director of another company, even a dormant one', () => {
    expect(statusOf({ ...base, otherCompanyRole: true }, 'monotributo')).toBe('excluido')
  })

  it('bars monotributo above the unipersonal ceiling', () => {
    expect(statusOf({ ...base, annualRevenueUyu: 1_200_000 }, 'monotributo')).toBe('excluido')
  })

  it('bars Literal E above its ceiling but leaves IRAE open', () => {
    const input = { ...base, annualRevenueUyu: 2_500_000 }
    expect(statusOf(input, 'unipersonal-literal-e')).toBe('excluido')
    expect(statusOf(input, 'unipersonal-irae')).toBe('elegible')
  })

  it('bars SRL for a single founder (Ley 16.060 needs 2 socios) but allows SAS', () => {
    expect(statusOf(base, 'srl')).toBe('excluido')
    expect(statusOf(base, 'sas')).toBe('elegible')
  })

  it('bars every unlimited-liability regime when limited liability is required', () => {
    const out = applyGates({ ...base, needsLimitedLiability: true })
    for (const id of ['monotributo', 'unipersonal-literal-e', 'sociedad-hecho'] as const) {
      expect(out.find(g => g.regime === id)!.status).toBe('excluido')
    }
    expect(out.find(g => g.regime === 'sas')!.status).toBe('elegible')
  })

  it('bars unipersonal regimes when there are 2+ socios', () => {
    expect(statusOf({ ...base, people: 'socios' }, 'monotributo')).toBe('excluido')
    expect(statusOf({ ...base, people: 'socios' }, 'unipersonal-literal-e')).toBe('excluido')
    expect(statusOf({ ...base, people: 'socios' }, 'srl')).toBe('elegible')
  })

  it('cites a norm and a URL on every exclusion', () => {
    const out = applyGates({
      ...base,
      sells: 'servicios',
      employees: 2,
      needsLimitedLiability: true,
    })
    for (const g of out) {
      for (const r of g.reasons) {
        expect(r.norm.length).toBeGreaterThan(0)
        expect(r.url).toMatch(/^https:\/\//)
        expect(r.text.length).toBeGreaterThan(0)
      }
    }
  })
})
