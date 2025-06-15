<template>
  <div class="pb-5">
    <!-- Header Section -->
    <v-row>
      <v-col cols="12">
        <v-card class="overflow-hidden" elevation="8">
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 pa-6">
            <v-row align="center" no-gutters>
              <v-col cols="12" md="8">
                <div class="d-flex align-center mb-3">
                  <v-avatar size="56" class="me-4 bg-white d-none d-md-flex">
                    <v-icon size="32" color="primary">mdi-bank-outline</v-icon>
                  </v-avatar>
                  <div>
                    <h1
                      class="text-h5 text-md-h3 font-weight-bold text-white mb-1"
                    >
                      🏦 {{ $t('sucursales.titulo') }}
                    </h1>
                    <p class="text-body-1 text-grey-lighten-2 mb-0">
                      {{ $t('sucursales.descripcion') }}
                    </p>
                  </div>
                </div>
              </v-col>
              <v-col cols="12" md="4" class="text-center text-md-right">
                <v-chip
                  color="rgba(255,255,255,0.2)"
                  text-color="white"
                  size="large"
                  class="me-2 mb-2"
                >
                  <v-icon start>mdi-bank</v-icon>
                  {{ totalOrigins }} {{ $t('sucursales.casasDeCambio') }}
                </v-chip>
                <v-chip
                  color="rgba(255,255,255,0.2)"
                  text-color="white"
                  size="large"
                  class="mb-2"
                >
                  <v-icon start>mdi-map-marker</v-icon>
                  {{ totalLocations }} {{ $t('sucursales.ubicaciones') }}
                </v-chip>
              </v-col>
            </v-row>
          </div>

          <!-- Info Bar -->
          <v-card-text class="bg-grey-lighten-5 pa-4">
            <v-row align="center">
              <v-col cols="12" md="6">
                <div class="d-flex align-center">
                  <v-icon color="success" class="me-2">mdi-check-circle</v-icon>
                  <span class="text-body-2 font-weight-medium">
                    {{ $t('sucursales.datosActualizados') }}
                  </span>
                </div>
              </v-col>
              <v-col cols="12" md="6" class="text-md-right">
                <div class="d-flex align-center justify-center justify-md-end">
                  <v-icon color="info" class="me-2">mdi-information</v-icon>
                  <span class="text-body-2">
                    {{ $t('sucursales.clickParaVer') }}
                  </span>
                </div>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading State -->
    <v-row v-if="pending">
      <v-col cols="12" class="text-center mt-5">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4 text-h6">{{ $t('sucursales.cargandoDatos') }}</p>
      </v-col>
    </v-row>

    <!-- Error State -->
    <v-row v-else-if="error">
      <v-col cols="12">
        <v-alert type="error" prominent class="ma-4">
          <h3>{{ $t('errorCargarDatos') }}</h3>
          <p>{{ error.message || error }}</p>
        </v-alert>
      </v-col>
    </v-row>

    <!-- Main Content -->
    <div v-else>
      <!-- Search and Filters -->
      <v-row class="mb-4">
        <v-col cols="12" md="5">
          <v-text-field
            v-model="searchQuery"
            :label="$t('sucursales.buscar')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
            density="compact"
            clearable
            hide-details
            @keyup.enter="applySearchFilter"
            @input="applySearchFilter"
            @click:clear="applySearchFilter"
          ></v-text-field>
        </v-col>
        <v-col cols="12" md="5">
          <v-autocomplete
            v-model="selectedDepartment"
            :items="departmentOptions"
            :label="$t('sucursales.filtrarPorDepartamento')"
            prepend-inner-icon="mdi-map-marker"
            variant="outlined"
            density="compact"
            clearable
            hide-details
            @click:clear="applySearchFilter"
            @update:model-value="applySearchFilter"
          ></v-autocomplete>
        </v-col>
        <v-col
          cols="12"
          md="2"
          class="d-flex align-center justify-end justify-md-start ga-2"
        >
          <v-tooltip location="top">
            <template v-slot:activator="{ props }">
              <v-btn
                v-bind="props"
                color="grey"
                variant="outlined"
                @click="clearAllFilters"
                class="mt-1"
                icon="mdi-filter-remove"
                :disabled="!searchQuery && !selectedDepartment"
                size="small"
              ></v-btn>
            </template>
            <span>{{ $t('sucursales.limpiarFiltros') }}</span>
          </v-tooltip>
        </v-col>
      </v-row>

      <!-- Exchange Houses Grid -->
      <v-row>
        <v-col cols="12">
          <h2 class="text-h5 mb-4 d-flex align-center">
            <v-icon start color="primary">mdi-bank</v-icon>
            {{ $t('sucursales.casasDeCambio') }}
          </h2>

          <v-row>
            <v-col
              v-for="origin in filteredOrigins"
              :key="origin.name"
              cols="12"
              sm="6"
              md="4"
              lg="3"
            >
              <v-card
                class="exchange-house-card"
                elevation="4"
                hover
                @click="navigateToOrigin(origin.name)"
                style="cursor: pointer"
              >
                <v-card-text class="pa-4">
                  <div class="d-flex align-center mb-3">
                    <v-avatar
                      size="40"
                      class="me-3"
                      :color="getAvatarColor(origin.name)"
                    >
                      <v-icon color="white">mdi-bank</v-icon>
                    </v-avatar>
                    <div class="flex-grow-1">
                      <h3 class="text-h6 font-weight-bold mb-0">
                        {{
                          origin.localData?.name ||
                          formatOriginName(origin.name)
                        }}
                      </h3>
                      <p class="text-caption text-grey mb-0">
                        {{ origin.departments?.length || 0 }} departamentos
                      </p>
                    </div>
                  </div>

                  <!-- Departments chips -->
                  <div class="mb-3">
                    <v-chip
                      v-for="dept in origin.departments?.slice(0, 3)"
                      :key="dept"
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      class="me-1 mb-1"
                    >
                      {{ dept }}
                    </v-chip>
                    <v-chip
                      v-if="origin.departments && origin.departments.length > 3"
                      size="x-small"
                      color="grey"
                      variant="tonal"
                      class="mb-1"
                    >
                      +{{ origin.departments.length - 3 }} más
                    </v-chip>
                  </div>

                  <!-- Action buttons -->
                  <div class="d-flex ga-2">
                    <v-btn size="small" color="primary" variant="tonal" block>
                      <v-icon start size="small">mdi-eye</v-icon>
                      {{ $t('sucursales.verSucursales') }}
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </div>
  </div>
</template>

<script setup lang="ts">
// Composables
const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const route = useRoute()
// Reactive data
const searchQuery = ref('')
const selectedDepartment = ref('')

// Initialize selectedDepartment from query parameter
if (route.query.location && typeof route.query.location === 'string') {
  selectedDepartment.value = decodeURIComponent(route.query.location)
}

// Initialize searchQuery from query parameter
if (route.query.search && typeof route.query.search === 'string') {
  searchQuery.value = decodeURIComponent(route.query.search)
}

const { getProcessedExchangeData } = useApiService()

// Server-side data fetching with better error handling
const {
  data: exchangeInfo,
  pending,
  error,
} = await useLazyAsyncData(
  'sucursales-index',
  async () => {
    try {
      // Helper functions with proper memoization
      const deduplicatedOrigins = (exchangeData: any[]) => {
        try {
          if (!exchangeData) return []

          const uniqueOrigins = new Map<string, any>()

          exchangeData.forEach((origin: any) => {
            const originName = origin.origin
            if (!originName) return // Skip invalid entries

            if (!uniqueOrigins.has(originName)) {
              uniqueOrigins.set(originName, { ...origin }) // Deep copy to prevent mutations
            } else {
              // If we already have this origin, merge the departments
              const existing = uniqueOrigins.get(originName)!
              if (
                origin.localData?.departments &&
                existing.localData?.departments
              ) {
                const combinedDepts = new Set([
                  ...existing.localData.departments,
                  ...origin.localData.departments,
                ])
                existing.localData.departments = Array.from(combinedDepts)
              }
            }
          })

          return Array.from(uniqueOrigins.values())
        } catch (error) {
          console.error('Error deduplicating origins:', error)
          return []
        }
      }

      const result = await getProcessedExchangeData('')
      // Validate the data structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid data structure received')
      }
      if (result.exchangeData) {
        // Process and deduplicate origins
        result.exchangeData = deduplicatedOrigins(result.exchangeData)
      } else {
        result.exchangeData = []
      }
      return result
    } catch (err) {
      console.error('Error fetching exchange data:', err)
      // Return empty structure instead of throwing to prevent complete failure
      return {
        exchangeData: [],
        locations: [],
        localData: {},
      }
    }
  },
  {
    server: true, // Enable server-side rendering
    default: () => ({
      exchangeData: [],
      locations: [],
      localData: {},
    }),
  },
)

// Computed properties
const totalOrigins = computed(() => {
  return exchangeInfo.value.exchangeData.length
})

const totalLocations = computed(() => {
  return exchangeInfo.value?.locations?.length || 0
})

const departmentOptions = computed(() => {
  try {
    const departments = new Set<string>()

    exchangeInfo.value.exchangeData.forEach((origin: any) => {
      if (origin.localData?.departments) {
        origin.localData.departments.forEach((dept: string) =>
          departments.add(dept),
        )
      }
    })

    return Array.from(departments).sort()
  } catch (error) {
    console.error('Error computing department options:', error)
    return []
  }
})

const filteredOrigins = computed(() => {
  try {
    const deduplicated = exchangeInfo.value.exchangeData
    if (!deduplicated || deduplicated.length === 0) return []

    const department = route.query.location as string
    const searchQuery = route.query.search as string

    let filtered = deduplicated.filter((origin: any) => {
      // Apply search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase()
        const name = (
          origin.localData?.name ||
          origin.origin ||
          ''
        ).toLowerCase()
        if (!name.includes(search)) return false
      }

      // Apply department filter
      if (department) {
        if (
          !origin.localData?.departments?.includes(
            department.toUpperCase().trim(),
          )
        ) {
          return false
        }
      }

      return true
    })

    // Return pre-computed structure to avoid mutation
    return filtered.map((origin: any) => ({
      ...origin,
      name: origin.origin,
      departments: origin.localData?.departments || [],
    }))
  } catch (error) {
    console.error('Error filtering origins:', error)
    return []
  }
})

const formatOriginName = (origin: string): string => {
  if (!origin || typeof origin !== 'string') return ''
  return origin
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

// Memoized avatar color function
const avatarColorCache = new Map<string, string>()
const getAvatarColor = (origin: string): string => {
  if (!origin || typeof origin !== 'string') return 'primary'

  if (avatarColorCache.has(origin)) {
    return avatarColorCache.get(origin)!
  }

  const colors = [
    'primary',
    'secondary',
    'accent',
    'info',
    'success',
    'warning',
  ]
  const index = origin.length % colors.length
  const color = colors[index]

  avatarColorCache.set(origin, color)
  return color
}

// Navigation functions with throttling
let navigationThrottle = false

const navigateToOrigin = (origin: string) => {
  if (navigationThrottle) return
  navigationThrottle = true

  try {
    let url = `/sucursales/${origin}`
    if (route.query.location) {
      url += `/${route.query.location}`
    }
    router.push(localePath(url))
  } catch (error) {
    console.error('Error navigating to origin:', error)
  } finally {
    setTimeout(() => {
      navigationThrottle = false
    }, 300) // Prevent rapid navigation
  }
}
// Search and filter functions
const applySearchFilter = (event?: any) => {
  try {
    updateUrlParams()
  } catch (error) {
    console.error('Error applying search filter:', error)
  }
}

const clearAllFilters = () => {
  try {
    searchQuery.value = ''
    selectedDepartment.value = ''
    updateUrlParams()
  } catch (error) {
    console.error('Error clearing filters:', error)
  }
}

const updateUrlParams = () => {
  try {
    const query: Record<string, string | undefined> = {}

    if (searchQuery.value) {
      query.search = searchQuery.value
    } else {
      query.search = undefined
    }

    if (selectedDepartment.value) {
      query.location = selectedDepartment.value
    } else {
      query.location = undefined
    }

    // Preserve other query parameters if they exist
    Object.keys(route.query).forEach((key) => {
      if (key !== 'location' && key !== 'search' && route.query[key]) {
        query[key] = route.query[key] as string
      }
    })

    router.push({
      path: localePath('/sucursales'),
      query: Object.keys(query).length > 0 ? query : undefined,
    })
  } catch (error) {
    console.error('Error updating URL parameters:', error)
  }
}

// SEO Meta
useSeoMeta({
  title: () => t('seo.sucursalesIndexTitle'),
  description: () => t('seo.sucursalesIndexDescription'),
  ogTitle: () => t('seo.sucursalesIndexTitle'),
  ogDescription: () => t('seo.sucursalesIndexDescription'),
  keywords: () => t('seo.sucursalesIndexKeywords'),
})
</script>

<style scoped>
/* Gradient background for header - optimized for performance */
.bg-gradient-to-r {
  background: linear-gradient(135deg, #1976d2 0%, #7b1fa2 100%);
  position: relative;
  overflow: hidden;
  /* Disable animation by default to prevent performance issues */
  /* animation: gradientShift 6s ease infinite; */
}

.bg-gradient-to-r::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(
      circle at 20% 50%,
      rgba(255, 255, 255, 0.1) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 80% 20%,
      rgba(255, 255, 255, 0.1) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 40% 80%,
      rgba(255, 255, 255, 0.05) 0%,
      transparent 50%
    );
  pointer-events: none;
}

/* Animated gradient effect - only enable on non-mobile and when user prefers motion */
@media (min-width: 768px) and (prefers-reduced-motion: no-preference) {
  .bg-gradient-to-r {
    background-size: 400% 400%;
    animation: gradientShift 8s ease infinite;
  }
}

@keyframes gradientShift {
  0% {
    background-position: 0% 50%;
  }
  50% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}

/* Card hover effects - optimized */
.exchange-house-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  will-change: transform, box-shadow;
}

.exchange-house-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15) !important;
}

.location-card {
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  will-change: transform, box-shadow;
}

.location-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.1) !important;
}

/* Glassmorphism effect for chips - simplified for performance */
.v-chip {
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
</style>
