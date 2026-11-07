import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { rentalAlertButtonMessages } from '../../utils/rentalAlertButtonMessages'
import { rentalAlertMessages } from '../../utils/rentalAlertMessages'

// The "Avisarme" button sits on every directory page (autos, motos, ventas, alquileres…). Its
// static imports used to carry every rental and opportunity message plus the filter rules of
// every alert kind, ~150 KB, for a button that shows three texts. These keep it light.
const ROOT = join(__dirname, '..', '..')
const read = (path: string) =>
  readFileSync(join(ROOT, path), 'utf8').replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, '')

/** Static value imports (not `import type`, not `import()`) of a file. */
function valueImports(path: string): string[] {
  const out: string[] = []
  for (const m of read(path).matchAll(/^\s*import(?!\s+type\b)\s[^'"]*['"]([^'"]+)['"]/gm))
    out.push(m[1]!)
  return out
}

describe('the alert button stays light', () => {
  it('the button imports only its own three texts, not the dialog catalogue', () => {
    const imports = valueImports('components/rentals/RentalAlertButton.vue')
    expect(imports).toContain('~/utils/rentalAlertButtonMessages')
    expect(imports.filter(i => /rentalAlertMessages|rentalMessages|Opportunity/.test(i))).toEqual(
      []
    )
  })

  it('useRentalAlerts loads the per-kind filter rules on demand', () => {
    const imports = valueImports('composables/useRentalAlerts.ts')
    expect(imports.filter(i => /rentalAlerts$|listingAlerts$|rentals$/.test(i))).toEqual([])
    const source = read('composables/useRentalAlerts.ts')
    expect(source).toContain("import('~/utils/rentalAlerts')")
    expect(source).toContain("import('~/utils/listingAlerts')")
  })

  it('the dialog catalogue still carries the button texts, unchanged', () => {
    for (const locale of ['es', 'en', 'pt'] as const) {
      expect(rentalAlertMessages[locale]).toMatchObject(rentalAlertButtonMessages[locale])
    }
  })
})
