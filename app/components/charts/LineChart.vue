<template>
  <div class="chart-container" role="img" :aria-label="ariaLabel">
    <canvas ref="chartCanvas" />
  </div>
</template>

<script>
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  LineController,
  Title,
  Tooltip,
  Legend,
  Filler
)

export default {
  name: 'LineChart',
  props: {
    chartData: {
      type: Object,
      required: true,
    },
    options: {
      type: Object,
      default: () => ({}),
    },
    ariaLabel: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      chart: null,
    }
  },
  watch: {
    chartData: {
      deep: true,
      handler() {
        this.updateChart()
      },
    },
    // Removed options watcher to prevent infinite loop
  },
  mounted() {
    this.createChart()
  },
  beforeUnmount() {
    this.destroyChart()
  },
  unmounted() {
    // Fallback cleanup
    this.destroyChart()
  },
  methods: {
    destroyChart() {
      if (this.chart) {
        this.chart.destroy()
        this.chart = null
      }
    },
    createChart() {
      this.destroyChart() // Ensure cleanup before creating new chart

      // Canvas can be gone if the component unmounted between tick and render
      // (e.g. a dev HMR reload, or a fast key change). Bail instead of throwing.
      const canvas = this.$refs.chartCanvas
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      this.chart = new ChartJS(ctx, {
        type: 'line',
        data: this.chartData,
        options: this.options,
      })
    },
    updateChart() {
      // Skip if the chart was torn down (or its canvas context is gone): drawing
      // against a destroyed chart dereferences a null ctx and throws.
      if (this.chart && this.chart.ctx) {
        // Update data without triggering watchers
        this.chart.data = this.chartData
        this.chart.update('none') // Use 'none' mode to prevent animations and reduce triggers
      }
    },
  },
}
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
