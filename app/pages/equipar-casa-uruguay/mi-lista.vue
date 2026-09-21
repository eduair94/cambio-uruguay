<template>
  <VContainer class="py-6 py-md-10 eq-lista">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Equipar una casa', to: localePath('/equipar-casa-uruguay') },
        { title: 'Avisos', to: localePath(EQUIPAR_PRODUCTOS_PATH) },
        { title: 'Mi lista' },
      ]"
      class="px-0 mb-2"
    />
    <header class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-2">Mi lista para equipar la casa</h1>
      <p class="text-body-1 mb-0">
        Los avisos que fuiste guardando, en el orden en que una casa los necesita, con el total en
        pesos y lo imprescindible que todavía falta. Vive en este navegador: no la vemos nosotros ni
        nadie más.
      </p>
    </header>

    <ClientOnly>
      <template #fallback>
        <p class="text-body-2 text-medium-emphasis">Cargando tu lista…</p>
      </template>

      <section v-if="!lista.ready.value" aria-live="polite">
        <p class="text-body-2 text-medium-emphasis">Cargando tu lista…</p>
      </section>

      <section v-else-if="!ordered.length" class="eq-lista__empty" aria-labelledby="vacia-title">
        <h2 id="vacia-title" class="text-h6 mb-2">Todavía no guardaste nada</h2>
        <p class="text-body-1 mb-4">
          Desde cualquier aviso del buscador, «Agregar a mi lista» lo trae acá. Empezá por lo que la
          casa no puede esperar: heladera, colchón, cocina, calefón.
        </p>
        <div class="d-flex flex-wrap ga-2">
          <VBtn color="primary" :to="localePath(EQUIPAR_PRODUCTOS_PATH)" prepend-icon="mdi-magnify">
            Buscar avisos
          </VBtn>
          <VBtn variant="outlined" :to="localePath('/equipar-casa-uruguay')">
            Cuánto sale equipar una casa
          </VBtn>
        </div>
      </section>

      <template v-else>
        <section class="eq-lista__summary" aria-labelledby="total-title">
          <h2 id="total-title" class="eq-lista__total">
            <span class="eq-lista__total-label">Total</span>
            <span class="eq-lista__total-value">{{ equiparMoneyNbsp(total) }}</span>
            <span v-if="usd" class="eq-lista__total-usd">≈ US$&nbsp;{{ usd }}</span>
          </h2>
          <p class="text-body-2 mb-0">
            {{ ordered.length }} {{ ordered.length === 1 ? 'ítem' : 'ítems'
            }}<template v-if="usedCount">
              · {{ usedCount }} {{ usedCount === 1 ? 'usado' : 'usados' }}</template
            ><template v-if="refreshedAt"> · precios verificados hoy</template>
          </p>
          <div class="d-flex flex-wrap ga-2 mt-3">
            <VBtn
              color="primary"
              variant="tonal"
              size="small"
              :loading="refreshing"
              prepend-icon="mdi-refresh"
              @click="refresh"
            >
              Actualizar precios
            </VBtn>
            <VBtn variant="outlined" size="small" prepend-icon="mdi-content-copy" @click="copy">
              {{ copied ? 'Copiado' : 'Copiar como texto' }}
            </VBtn>
            <VBtn variant="text" size="small" prepend-icon="mdi-delete-outline" @click="clearAll">
              Vaciar
            </VBtn>
          </div>
          <p v-if="refreshError" class="text-caption mt-2 mb-0" role="alert">
            No pudimos verificar los precios ahora. Probá de nuevo en unos minutos.
          </p>
          <p v-if="lista.storageFailed.value" class="text-caption mt-2 mb-0" role="alert">
            El navegador no dejó guardar la lista: se pierde al cerrar la pestaña.
          </p>
        </section>

        <section
          v-if="faltantes.length"
          class="eq-lista__missing"
          aria-labelledby="faltan-title"
          data-testid="equipar-lista-faltantes"
        >
          <h2 id="faltan-title" class="text-h6 mb-1">
            Sin esto la casa no funciona, y todavía falta
          </h2>
          <p class="text-body-2 mb-2">
            Las categorías del tier S que tu lista no tiene. Cada una abre su buscador.
          </p>
          <div class="d-flex flex-wrap ga-2">
            <VBtn
              v-for="cat in faltantes"
              :key="cat.key"
              size="small"
              variant="outlined"
              :to="localePath(equiparProductoPath(cat.key))"
            >
              {{ cat.label }}
            </VBtn>
          </div>
        </section>

        <section aria-labelledby="lineas-title">
          <h2 id="lineas-title" class="text-h6 mb-3">Lo que guardaste</h2>
          <ol class="eq-lista__lines">
            <li
              v-for="line in ordered"
              :key="line.listingId"
              class="eq-line"
              :class="`eq-line--${status(line)}`"
            >
              <a
                :href="line.url"
                target="_blank"
                rel="nofollow noopener"
                class="eq-line__photo"
                :aria-label="`${line.title} (abre el aviso)`"
              >
                <img
                  v-if="line.image && !failed.has(line.listingId)"
                  :src="line.image"
                  :alt="line.title"
                  loading="lazy"
                  width="96"
                  height="96"
                  referrerpolicy="no-referrer"
                  @error="failed.add(line.listingId)"
                />
                <span v-else class="eq-line__nophoto">
                  <VIcon icon="mdi-package-variant" size="28" />
                </span>
              </a>
              <div class="eq-line__body">
                <p class="eq-line__cat">
                  <span class="eq-line__tier" :data-tier="line.tier">{{ line.tier }}</span>
                  {{ line.categoryLabel
                  }}<template v-if="line.variantLabel"> · {{ line.variantLabel }}</template>
                  <template v-if="line.condition === 'used'"> · usado</template>
                </p>
                <p class="eq-line__title">
                  <a :href="line.url" target="_blank" rel="nofollow noopener">{{ line.title }}</a>
                </p>
                <p class="eq-line__meta">
                  {{ line.sellerName
                  }}<template v-if="line.source !== 'store'">
                    · {{ EQUIPAR_SOURCE_LABELS[line.source] }}</template
                  >
                  · guardado el {{ shortDate(line.addedAt) }}
                </p>
                <p v-if="status(line) === 'gone'" class="eq-line__status" role="status">
                  Ya no está publicado. Sigue en la lista con el último precio que vimos.
                </p>
                <p v-else-if="status(line) === 'changed'" class="eq-line__status" role="status">
                  Cambió de precio: antes {{ equiparMoneyNbsp(previous.get(line.listingId) ?? 0) }}.
                </p>
              </div>
              <div class="eq-line__side">
                <p class="eq-line__price">{{ equiparMoneyNbsp(line.priceUyu) }}</p>
                <p v-if="line.currency === 'USD'" class="eq-line__orig">
                  US$&nbsp;{{ Math.round(line.price).toLocaleString('es-UY') }}
                </p>
                <VBtn
                  variant="text"
                  size="small"
                  icon="mdi-close"
                  :aria-label="`Quitar ${line.title} de la lista`"
                  @click="lista.remove(line.listingId)"
                />
              </div>
            </li>
          </ol>
        </section>
      </template>
    </ClientOnly>

    <section class="mt-10" aria-labelledby="como-title">
      <h2 id="como-title" class="text-h5 mb-3">Cómo funciona</h2>
      <ul class="text-body-1 pl-5">
        <li>
          La lista se guarda en tu navegador (hasta {{ EQUIPAR_LISTA_MAX }} avisos). Si borrás los
          datos del sitio o cambiás de dispositivo, empieza vacía.
        </li>
        <li>
          Cada línea es una foto del aviso al momento de guardarlo. «Actualizar precios» pregunta
          por cada uno: si sigue publicado, si cambió de precio, o si ya no está.
        </li>
        <li>
          El orden es el de necesidad de
          <NuxtLink :to="localePath('/equipar-casa-uruguay')">equipar una casa</NuxtLink> (tier S
          primero), no el de precio: así se ve enseguida qué imprescindible falta.
        </li>
        <li>Los avisos en dólares se suman en pesos a la cotización del día del relevamiento.</li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { EQUIPAR_CATEGORY_PAGES } from '~/utils/equiparCategoryPages'
import {
  EQUIPAR_LISTA_MAX,
  EQUIPAR_LISTA_PATH,
  EQUIPAR_PRODUCTOS_PATH,
  EQUIPAR_SOURCE_LABELS,
  equiparListaFaltantes,
  equiparListaOrdenar,
  equiparListaTexto,
  equiparListaTotal,
  equiparMoneyNbsp,
  equiparProductoPath,
  type EquiparListaLine,
  type EquiparProductosResponse,
} from '~/utils/equiparProductos'

const localePath = useLocalePath()
const lista = useEquiparLista()

const ordered = computed(() => equiparListaOrdenar(lista.lines.value))
const total = computed(() => equiparListaTotal(ordered.value))
const usedCount = computed(() => ordered.value.filter(line => line.condition === 'used').length)
const faltantes = computed(() => equiparListaFaltantes(ordered.value, EQUIPAR_CATEGORY_PAGES))

// The USD rate comes with the refresh (it is the run's rate); until then the total is pesos only.
const usdUyu = ref<number | null>(null)
const usd = computed(() =>
  usdUyu.value ? Math.round(total.value / usdUyu.value).toLocaleString('es-UY') : ''
)

const failed = reactive(new Set<string>())
const shortDate = (value: string): string => {
  const time = Date.parse(`${value}T12:00:00Z`)
  return Number.isNaN(time)
    ? value
    : new Date(time).toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'numeric',
        timeZone: 'America/Montevideo',
      })
}

// --- refresh ---------------------------------------------------------------------------------
const refreshing = ref(false)
const refreshError = ref(false)
const refreshedAt = ref<string | null>(null)
/** Listing ids the last refresh did NOT return: no longer published (or pruned). */
const gone = reactive(new Set<string>())
/** Previous price per listing whose price changed in the last refresh. */
const previous = reactive(new Map<string, number>())

const status = (line: EquiparListaLine): 'ok' | 'gone' | 'changed' =>
  gone.has(line.listingId) ? 'gone' : previous.has(line.listingId) ? 'changed' : 'ok'

async function refresh() {
  if (refreshing.value || !ordered.value.length) return
  refreshing.value = true
  refreshError.value = false
  try {
    const ids = ordered.value.map(line => line.listingId).join(',')
    const response = await $fetch<EquiparProductosResponse>('/api/equipar/productos', {
      query: { ids },
    })
    usdUyu.value = response.usdUyu
    const fresh = new Map(response.items.map(item => [item.listingId, item]))
    gone.clear()
    previous.clear()
    const next = lista.lines.value.map(line => {
      const item = fresh.get(line.listingId)
      if (!item) {
        gone.add(line.listingId)
        return line
      }
      if (item.priceUyu !== line.priceUyu) previous.set(line.listingId, line.priceUyu)
      return {
        ...line,
        title: item.title,
        priceUyu: item.priceUyu,
        price: item.price,
        currency: item.currency,
        condition: item.condition,
        sellerName: item.sellerName,
        url: item.url,
        image: item.image,
      }
    })
    lista.replace(next)
    refreshedAt.value = new Date().toISOString()
  } catch {
    refreshError.value = true
  } finally {
    refreshing.value = false
  }
}

// --- copy / clear ----------------------------------------------------------------------------
const copied = ref(false)
async function copy() {
  const text = equiparListaTexto(ordered.value, usdUyu.value)
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Without clipboard access the text is still worth having: show it in a prompt to copy by hand.
    window.prompt('Copiá tu lista:', text)
  }
}
function clearAll() {
  if (window.confirm('¿Vaciar la lista? No se puede deshacer.')) lista.clear()
}

// --- SEO: the page is the reader's own; nothing here is for a crawler ---------------------------
const canonical = `https://cambio-uruguay.com${EQUIPAR_LISTA_PATH}`
const title = 'Mi lista para equipar la casa'
useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description:
    'Los avisos que guardaste para equipar tu casa, en orden de necesidad, con el total en pesos y lo imprescindible que falta.',
  robots: 'noindex, nofollow',
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'WebPage', name: title, url: canonical },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Equipar una casa',
                item: 'https://cambio-uruguay.com/equipar-casa-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Avisos',
                item: `https://cambio-uruguay.com${EQUIPAR_PRODUCTOS_PATH}`,
              },
              { '@type': 'ListItem', position: 4, name: 'Mi lista', item: canonical },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.eq-lista__empty,
.eq-lista__summary,
.eq-lista__missing {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  background: rgb(var(--v-theme-surface));
}
.eq-lista__total {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 12px;
  margin: 0 0 4px;
}
.eq-lista__total-label {
  /* Rol Label de DESIGN.md. */
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.eq-lista__total-value {
  /* Rol Stat de DESIGN.md. */
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
}
.eq-lista__total-usd {
  font-size: 0.95rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.eq-lista__lines {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.eq-line {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: start;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 10px;
  background: rgb(var(--v-theme-surface));
}
.eq-line--gone {
  opacity: 0.66;
}
.eq-line__photo {
  display: block;
  aspect-ratio: 1 / 1;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.eq-line__photo img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.eq-line__nophoto {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.eq-line__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.eq-line__cat,
.eq-line__meta,
.eq-line__status,
.eq-line__orig {
  /* Rol Meta de DESIGN.md. */
  font-size: 0.8rem;
  line-height: 1.35;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.eq-line__status {
  color: rgb(var(--v-theme-on-surface));
  font-weight: 600;
}
.eq-line__tier {
  display: inline-block;
  min-width: 1.5em;
  text-align: center;
  font-weight: 700;
  border-radius: 4px;
  padding: 0 4px;
  margin-right: 4px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}
.eq-line__tier[data-tier='S'] {
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
}
.eq-line__title {
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.3;
  margin: 0;
}
.eq-line__title a {
  color: inherit;
  text-decoration: none;
}
.eq-line__title a:hover,
.eq-line__title a:focus-visible {
  text-decoration: underline;
}
.eq-line__side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}
.eq-line__price {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
}
</style>
