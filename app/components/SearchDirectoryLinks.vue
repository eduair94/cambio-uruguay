<template>
  <ul
    v-if="links.length"
    class="search-directory-links"
    :class="`search-directory-links--${variant}`"
  >
    <li v-for="link in links" :key="link.id">
      <NuxtLink
        :to="localePath(link.path) + link.search"
        class="search-directory-links__link"
        data-cta="search-directory"
        @click="emit('navigate', link)"
      >
        <VIcon size="small">mdi-magnify</VIcon>
        <span>{{ label(link) }}</span>
        <VIcon size="small" class="search-directory-links__arrow">mdi-arrow-right</VIcon>
      </NuxtLink>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { directorySearchLinks, type DirectoryLink } from '~/utils/searchDirectories'

const props = withDefaults(
  defineProps<{
    /** The query that found nothing in the site index. */
    q: string
    /** The route the search was opened on: a dead end on a car page belongs to the car directory. */
    fromPath?: string
    variant?: 'palette' | 'page'
  }>(),
  { fromPath: undefined, variant: 'palette' }
)

const emit = defineEmits<{ navigate: [link: DirectoryLink] }>()

const localePath = useLocalePath()
const { t } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      query: 'Buscar «{q}» en {where}',
      brand: 'Ver {brand} en {where}',
      browse: 'Ver {where}',
      autos: 'autos usados',
      motos: 'motos usadas',
      celulares: 'celulares',
      alquileres: 'alquileres',
      equipar: 'productos para la casa',
    },
    en: {
      query: 'Search “{q}” in {where}',
      brand: 'See {brand} in {where}',
      browse: 'See {where}',
      autos: 'used cars',
      motos: 'used motorbikes',
      celulares: 'phones',
      alquileres: 'rentals',
      equipar: 'home products',
    },
    pt: {
      query: 'Buscar “{q}” em {where}',
      brand: 'Ver {brand} em {where}',
      browse: 'Ver {where}',
      autos: 'carros usados',
      motos: 'motos usadas',
      celulares: 'celulares',
      alquileres: 'aluguéis',
      equipar: 'produtos para a casa',
    },
  },
})

// Pure and deterministic, so /buscar renders the same links on the server and the client.
const links = computed(() => directorySearchLinks(props.q, props.fromPath))

function label(link: DirectoryLink): string {
  const where = t(link.id)
  if (link.kind === 'query') return t('query', { q: link.q, where })
  if (link.kind === 'brand') return t('brand', { brand: link.brandLabel ?? '', where })
  return t('browse', { where })
}
</script>

<style scoped lang="scss">
.search-directory-links {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  margin: 0;
  padding: 0;
  list-style: none;
}

.search-directory-links__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  // The theme's link token clears AA in both modes; `info` (teal #00897b) is 4.3:1 on white.
  color: rgb(var(--v-theme-link));
  font-size: 0.85rem;
  text-decoration: none;
  overflow-wrap: anywhere;

  &:hover {
    text-decoration: underline;
  }
}

.search-directory-links__arrow {
  opacity: 0.7;
}

.search-directory-links--palette {
  align-items: center;
  margin-bottom: 4px;

  .search-directory-links__link {
    justify-content: center;
    padding: 4px 12px;
  }
}

.search-directory-links--page {
  align-items: center;
  margin-bottom: 16px;

  .search-directory-links__link {
    font-size: 1rem;
    padding: 4px 0;
  }
}
</style>
