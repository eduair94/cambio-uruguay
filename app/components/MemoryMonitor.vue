<template>
  <div v-if="showMonitor" class="memory-monitor">
    <div class="monitor-content">
      <div class="memory-stats">
        <div class="stat">
          <span class="label">Used:</span>
          <span class="value" :class="{ warning: memoryUsage > 50, critical: memoryUsage > 80 }">
            {{ formatBytes(usedJSHeapSize) }}
          </span>
        </div>
        <div class="stat">
          <span class="label">Total:</span>
          <span class="value">{{ formatBytes(totalJSHeapSize) }}</span>
        </div>
        <div class="stat">
          <span class="label">Limit:</span>
          <span class="value">{{ formatBytes(jsHeapSizeLimit) }}</span>
        </div>
        <div class="stat">
          <span class="label">Usage:</span>
          <span class="value" :class="{ warning: memoryUsage > 50, critical: memoryUsage > 80 }">
            {{ memoryUsage.toFixed(1) }}%
          </span>
        </div>
      </div>
      <button class="gc-button" title="Force Garbage Collection" @click="forceGarbageCollection">
        🗑️ GC
      </button>
      <button class="close-button" title="Hide Monitor" @click="showMonitor = false">
        ✕
      </button>
    </div>
  </div>
  <button
v-else
class="show-monitor-button"
title="Show Memory Monitor"
@click="showMonitor = true">
    📊
  </button>
</template>

<script setup lang="ts">
const showMonitor = ref(false)
const usedJSHeapSize = ref(0)
const totalJSHeapSize = ref(0)
const jsHeapSizeLimit = ref(0)

const memoryUsage = computed(() => {
  return jsHeapSizeLimit.value > 0 ? (usedJSHeapSize.value / jsHeapSizeLimit.value) * 100 : 0
})

let intervalId: NodeJS.Timeout | null = null

const updateMemoryStats = () => {
  if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (performance as any)) {
    const memory = (performance as any).memory
    usedJSHeapSize.value = memory.usedJSHeapSize
    totalJSHeapSize.value = memory.totalJSHeapSize
    jsHeapSizeLimit.value = memory.jsHeapSizeLimit
  }
}

const forceGarbageCollection = () => {
  // Clear various caches and force garbage collection
  if (typeof window !== 'undefined') {
    // Clear any global caches
    if ((window as any).__vuePluginCleanup) {
      (window as any).__vuePluginCleanup()
    }
    if ((window as any).__loadingCleanup) {
      (window as any).__loadingCleanup()
    }
    
    // Force garbage collection if available (only in development with --js-flags="--expose-gc")
    if ('gc' in window) {
      (window as any).gc()
    }
    
    // Update stats immediately
    setTimeout(updateMemoryStats, 100)
    
    console.log('Manual garbage collection attempt completed')
  }
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

watch(showMonitor, (show) => {
  if (show) {
    updateMemoryStats()
    intervalId = setInterval(updateMemoryStats, 1000)
  } else {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }
})

onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
})

// Only show in development or with debug flag
const isDevelopment = process.env.NODE_ENV === 'development' || 
                    (typeof window !== 'undefined' && window.location.search.includes('debug=memory'))

// Auto-hide if memory is not available
onMounted(() => {
  if (!isDevelopment || typeof window === 'undefined' || 
      !('performance' in window) || !('memory' in (performance as any))) {
    showMonitor.value = false
  }
})
</script>

<style scoped>
.memory-monitor {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px;
  border-radius: 8px;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 12px;
  z-index: 10000;
  min-width: 200px;
  backdrop-filter: blur(10px);
}

.monitor-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-stats {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-weight: bold;
  margin-right: 8px;
}

.value {
  color: #4CAF50;
}

.value.warning {
  color: #FF9800;
}

.value.critical {
  color: #F44336;
  font-weight: bold;
}

.gc-button,
.close-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  transition: background 0.2s;
}

.gc-button:hover,
.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
}

.show-monitor-button {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  color: white;
  padding: 8px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 16px;
  z-index: 10000;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.show-monitor-button:hover {
  background: rgba(0, 0, 0, 0.9);
}
</style>
