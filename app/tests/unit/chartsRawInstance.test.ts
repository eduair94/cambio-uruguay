// The Chart.js instance must never live inside Vue's reactivity.
//
// Found 2026-09-18 on /evolucion-precio-alquileres-uruguay: the first render of a chart worked, and
// the first UPDATE (typing a price recolours the histogram) threw "Maximum call stack size exceeded"
// and "Cannot read properties of undefined (reading 'axis')" from inside Chart.js. The components
// stored `new ChartJS(...)` in `data()`, so Vue returned a deep reactive proxy of the chart and every
// `chart.update()` walked Chart.js's own internals through that proxy. Pages whose data never changes
// after mount (the first consumers) never called `update()`, so nobody saw it.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (name: string) =>
  readFileSync(join(__dirname, '..', '..', 'components', 'charts', name), 'utf8')

describe('chart components keep Chart.js out of reactivity', () => {
  for (const file of ['BarChart.vue', 'LineChart.vue']) {
    it(`${file} wraps the instance in markRaw and hands Chart.js raw data`, () => {
      const source = read(file)
      expect(source).toMatch(/this\.chart = markRaw\(\s*new ChartJS\(/)
      expect(source).toContain('this.chart.data = toRaw(this.chartData)')
    })
  }
})
