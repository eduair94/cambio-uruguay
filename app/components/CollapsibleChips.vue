<template>
  <div class="collapsible-chips">
    <div class="chips-container">
      <!-- Always visible chips -->
      <v-chip
        v-for="item in visibleItems"
        :key="item"
        :size="size"
        :color="color"
        variant="flat"
        :text-color="textColor"
        :class="chipClass"
        link
        :to="localePath(`/?location=${item}`)"
      >
        <v-icon v-if="icon" start :size="iconSize">{{ icon }}</v-icon>
        {{ item }}
      </v-chip>

      <!-- Collapsed chips (hidden) -->
      <div v-if="showExpanded" class="expanded-chips">
        <v-chip
          v-for="item in hiddenItems"
          :key="item"
          :size="size"
          :color="color"
          variant="flat"
          :text-color="textColor"
          :class="chipClass"
          link
          :to="localePath(`/?location=${item}`)"
        >
          <v-icon v-if="icon" start :size="iconSize">{{ icon }}</v-icon>
          {{ item }}
        </v-chip>
      </div>

      <!-- Show more/less button -->
      <v-chip
        v-if="hasHiddenItems"
        :size="size"
        color="grey lighten-3"
        variant="flat"
        :text-color="textColor || 'white'"
        :class="['toggle-chip', chipClass]"
        style="cursor: pointer"
        @click="toggleExpanded"
      >
        <v-icon start :size="iconSize">
          {{ showExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
        </v-icon>
        {{
          showExpanded ? $t('verMenos') : `+${hiddenItems.length} ${$t('mas')}`
        }}
      </v-chip>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  items: string[]
  maxVisible?: number
  size?: 'x-small' | 'small' | 'default' | 'large' | 'x-large'
  color?: string
  textColor?: string
  chipClass?: string
  icon?: string
  iconSize?: string | number
}

const props = withDefaults(defineProps<Props>(), {
  maxVisible: 3,
  size: 'small',
  color: 'primary',
  textColor: 'white',
  chipClass: 'me-1 mb-1',
  icon: '',
  iconSize: 16,
})

const localePath = useLocalePath()

// Reactive state
const showExpanded = ref(false)

// Computed properties
const visibleItems = computed(() => {
  return props.items.slice(0, props.maxVisible)
})

const hiddenItems = computed(() => {
  return props.items.slice(props.maxVisible)
})

const hasHiddenItems = computed(() => {
  return props.items.length > props.maxVisible
})

// Methods
const toggleExpanded = () => {
  showExpanded.value = !showExpanded.value
}
</script>

<style scoped>
.collapsible-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.chips-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: flex-start;
}

.expanded-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 4px;
  animation: fadeIn 0.3s ease-in-out;
}

.toggle-chip {
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.2s ease;
}

.toggle-chip:hover {
  background: rgba(255, 255, 255, 0.4) !important;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Glassmorphism effect for chips */
:deep(.v-chip) {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.15) !important;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: all 0.2s ease;
}

:deep(.v-chip:hover) {
  background: rgba(255, 255, 255, 0.25) !important;
  transform: translateY(-1px);
}
</style>
