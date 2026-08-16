<template>
  <div class="branches-index">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-store-marker</VIcon>
              Directorio
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Sucursales de casas de cambio y bancos en Uruguay
            </h1>
            <p class="text-body-1 branches-lead">
              Cada mostrador con su dirección, teléfono y horario tal como figuran en el registro
              del Banco Central, más la cotización que publica esa casa hoy. Son
              {{ total }} sucursales en {{ groups.length }} departamentos.
            </p>
          </header>

          <VTextField
            v-model="query"
            class="mb-6"
            density="comfortable"
            variant="outlined"
            hide-details
            clearable
            placeholder="Buscar por casa, calle o departamento"
            prepend-inner-icon="mdi-magnify"
          />

          <VAlert v-if="!total" type="info" variant="tonal" class="mb-6">
            No pudimos leer el registro de sucursales en este momento. Probá de nuevo en unos
            minutos.
          </VAlert>

          <section v-for="group in visibleGroups" :key="group.key" class="mb-8">
            <div class="d-flex align-center flex-wrap ga-2 mb-3">
              <h2 class="text-h5 font-weight-bold mb-0">{{ group.label }}</h2>
              <VChip size="x-small" variant="tonal" color="primary">
                {{ group.branches.length }}
              </VChip>
              <VSpacer />
              <NuxtLink :to="localePath(`/dolar/${group.slug}`)" class="branches-link">
                Dólar en {{ group.label }}
              </NuxtLink>
            </div>
            <VRow dense>
              <VCol v-for="item in group.branches" :key="item.slug" cols="12" sm="6" lg="4">
                <NuxtLink :to="localePath(`/sucursal/${item.slug}`)" class="branch-tile">
                  <span class="branch-tile-casa">{{ item.casaName }}</span>
                  <span class="branch-tile-address">{{ item.addressLabel }}</span>
                  <span v-if="item.phoneLabel" class="branch-tile-meta">{{ item.phoneLabel }}</span>
                </NuxtLink>
              </VCol>
            </VRow>
          </section>

          <p v-if="query && !visibleGroups.length" class="text-body-2 text-medium-emphasis">
            Ninguna sucursal coincide con «{{ query }}».
          </p>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { groupByDepartment, type BranchPage } from '~/utils/branches'
import { fold } from '~/utils/siteNav'

interface BranchDirectory {
  branches: BranchPage[]
  casas: Record<string, { name: string }>
}

const localePath = useLocalePath()
const query = ref('')

const { data } = await useAsyncData('branch-directory', () =>
  $fetch<BranchDirectory>('/api/branches')
)

const branches = computed<BranchPage[]>(() => data.value?.branches ?? [])
const total = computed(() => branches.value.length)
const groups = computed(() => groupByDepartment(branches.value))

const visibleGroups = computed(() => {
  const needle = fold(query.value ?? '')
  if (!needle) return groups.value
  return groups.value
    .map(group => ({
      ...group,
      branches: group.branches.filter(item =>
        fold(`${item.casaName} ${item.addressLabel} ${item.deptLabel}`).includes(needle)
      ),
    }))
    .filter(group => group.branches.length)
})

const canonicalUrl = 'https://cambio-uruguay.com/sucursal'
const title = 'Sucursales de casas de cambio y bancos en Uruguay'
const description =
  'Directorio de sucursales de casas de cambio y bancos en Uruguay: dirección, teléfono y horario de cada mostrador, con la cotización del dólar que publica esa casa hoy.'

defineOgImageComponent('Cambio', { title, subtitle: description, tag: 'SUCURSALES' })

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Cambio Uruguay',
            item: 'https://cambio-uruguay.com',
          },
          { '@type': 'ListItem', position: 2, name: 'Sucursales', item: canonicalUrl },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.branches-lead {
  line-height: 1.7;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.branches-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
  font-size: 0.9rem;
}
.branches-link:hover {
  text-decoration: underline;
}

.branch-tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.03);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease;
}
.branch-tile:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.branch-tile-casa {
  font-weight: 700;
  font-size: 0.95rem;
}
.branch-tile-address {
  font-size: 0.88rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.branch-tile-meta {
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
</style>
