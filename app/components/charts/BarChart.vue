<template>
  <div class="chart-container">
    <canvas ref="chartCanvas" />
  </div>
</template>

<script>
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
)

export default {
  name: 'BarChart',
  props: {
    chartData: {
      type: Object,
      required: true,
    },
    options: {
      type: Object,
      default: () => ({}),
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

      const ctx = this.$refs.chartCanvas.getContext('2d')
      this.chart = new ChartJS(ctx, {
        type: 'bar',
        data: this.chartData,
        options: this.options,
      })
    },
    updateChart() {
      if (this.chart) {
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
