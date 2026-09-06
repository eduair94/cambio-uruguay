import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'
import { compileScript, parse } from '@vue/compiler-sfc'
import ts from 'typescript'
import * as vue from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Run the actual component setup, including any lifecycle callbacks, with a
// visible first-visit document and no consent overlay. No browser/network needed.
const filename = resolve(__dirname, '../../components/SiteTour.vue')
const { descriptor } = parse(readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'site-tour-test' })
const { outputText } = ts.transpileModule(script.content.replaceAll('import.meta.client', 'true'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
})

function mountTour() {
  const mounted: Array<() => void> = []
  const drive = vi.fn()
  const driver = vi.fn(() => ({ drive }))
  const imports = vi.fn()
  const track = vi.fn()
  const storage = { getItem: vi.fn(() => null), setItem: vi.fn() }
  const browser = Object.assign(new EventTarget(), {
    localStorage: storage,
    matchMedia: () => ({ matches: false }),
    setTimeout,
    clearTimeout,
  })
  const context = {
    exports: {} as {
      default: {
        setup: (
          props: object,
          ctx: { expose: () => void }
        ) => {
          start: (trigger: 'button') => Promise<void>
        }
      }
    },
    require: (name: string) => {
      if (name === 'vue') return vue
      imports(name)
      if (name === 'driver.js') return { driver }
      if (name === 'driver.js/dist/driver.css') return {}
      throw new Error(`Unexpected import: ${name}`)
    },
    window: browser,
    document: { visibilityState: 'visible', querySelector: () => null },
    onMounted: (callback: () => void) => mounted.push(callback),
    useI18n: () => ({ t: (key: string) => key }),
    useTrack: () => track,
  }
  runInNewContext(outputText, context)
  const component = context.exports.default.setup({}, { expose: () => {} })
  mounted.forEach(callback => callback())
  return { component, browser, imports, driver, drive, track, storage }
}

afterEach(() => vi.useRealTimers())

describe('guided tour requires an explicit request', () => {
  it('does not load or start on first visit, gestures, or idle without a cookie banner', async () => {
    vi.useFakeTimers()
    const tour = mountTour()
    tour.browser.dispatchEvent(new Event('pointerdown'))
    tour.browser.dispatchEvent(new Event('keydown'))
    tour.browser.dispatchEvent(new Event('scroll'))
    await vi.advanceTimersByTimeAsync(85000)
    expect(tour.imports).not.toHaveBeenCalled()
    expect(tour.driver).not.toHaveBeenCalled()
    expect(tour.drive).not.toHaveBeenCalled()
    expect(tour.track).not.toHaveBeenCalled()
    expect(tour.storage.setItem).not.toHaveBeenCalled()
  })

  it('retains the explicit start button and starts the lazy tour when requested', async () => {
    expect(descriptor.template?.content).toContain('@click="start(\'button\')"')
    const tour = mountTour()
    await tour.component.start('button')
    expect(tour.imports.mock.calls.map(([name]) => name)).toEqual([
      'driver.js',
      'driver.js/dist/driver.css',
    ])
    expect(tour.drive).toHaveBeenCalledTimes(1)
    expect(tour.track).toHaveBeenCalledWith('tour_start', { tour_trigger: 'button', steps: 2 })
  })
})
