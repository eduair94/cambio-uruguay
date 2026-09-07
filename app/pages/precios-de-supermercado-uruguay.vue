<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero on-dark mb-8">
      <p class="eyebrow">Precios de góndola · {{ freshnessLabel }}</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">Precios de supermercado en Uruguay</h1>
      <p class="hero-lead text-body-1 mb-4">
        Los precios que las <strong>{{ storeCount }} bocas</strong> declaran al
        <strong>SIPC</strong>, el sistema oficial del Ministerio de Economía y el Área Defensa del
        Consumidor. {{ articleCount }} artículos, los 19 departamentos, y una cosa que el Estado no
        guarda: <strong>el histórico</strong>. Su API devuelve sólo el precio de hoy y no tiene
        endpoint de serie, así que la evolución empieza el día que este archivo empezó a guardarla.
      </p>
      <p class="hero-lead text-body-2 mb-4">
        Cada precio dice <strong>de qué día es</strong>. Eso importa: el 94 % de las góndolas
        reportan hoy o ayer, pero hay locales que no actualizan desde hace semanas, y como el
        ranking ordena por "más barato" serían justo esos los que encabezarían. No encabezan.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn color="white" variant="flat" size="small" prepend-icon="mdi-magnify" href="#buscador">
          Buscar un producto
        </VBtn>
        <VBtn variant="outlined" size="small" prepend-icon="mdi-basket-outline" href="#canasta">
          La canasta
        </VBtn>
        <VBtn variant="text" size="small" prepend-icon="mdi-scale-balance" href="#metodo">
          Cómo se mide
        </VBtn>
      </div>
    </header>

    <VAlert
      v-if="!hasData"
      type="info"
      variant="tonal"
      density="comfortable"
      icon="mdi-database-clock-outline"
      class="mb-8"
    >
      Todavía no hay una lectura guardada. El barrido corre una vez por día; cuando termine, esta
      página muestra los precios y la canasta.
    </VAlert>

    <template v-else>
      <!-- Buscador -->
      <section id="buscador" class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-2">Buscá un producto</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ articleCount }} artículos con precio mínimo, mediana y máximo del país. La diferencia
          entre el más barato y el más caro del mismo producto llega a
          <strong>{{ maxSpreadLabel }}</strong
          >, así que la mediana dice más que el promedio.
        </p>

        <VTextField
          v-model="search"
          label="Aceite, yerba, pañales, shampoo…"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          density="comfortable"
          clearable
          hide-details
          class="mb-4"
          style="max-width: 520px"
        />

        <div class="table-scroll">
          <VTable density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>Artículo</th>
                <th class="text-right">Más barato</th>
                <th class="text-right">Mediana</th>
                <th class="text-right">Más caro</th>
                <th class="text-right">Se abre</th>
                <th class="text-right">Locales</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in visibleArticles" :key="row.articleId">
                <td data-label="Artículo">
                  <NuxtLink :to="localePath(`/precio/${preciosSlug(row.name)}`)">
                    {{ row.name }}
                  </NuxtLink>
                  <span v-if="row.unitRaw" class="d-block text-caption text-medium-emphasis">
                    {{ row.unitRaw }}
                  </span>
                </td>
                <td data-label="Más barato" class="text-right">{{ money(row.min) }}</td>
                <td data-label="Mediana" class="text-right font-weight-medium">
                  {{ money(row.p50) }}
                </td>
                <td data-label="Más caro" class="text-right">{{ money(row.max) }}</td>
                <td data-label="Se abre" class="text-right">{{ spreadLabel(row) }}</td>
                <td data-label="Locales" class="text-right">{{ row.n }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>

        <p v-if="filteredArticles.length > visibleArticles.length" class="mt-3">
          <VBtn variant="text" size="small" @click="showAll = true">
            Ver los {{ filteredArticles.length }} artículos
          </VBtn>
        </p>
        <p v-if="!filteredArticles.length" class="text-body-2 text-medium-emphasis mt-3">
          Ningún artículo del catálogo oficial coincide con esa búsqueda.
        </p>
      </section>

      <!-- Canasta -->
      <section v-if="basket" id="canasta" class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-2">La canasta, y qué se puede comparar</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Una canasta fija de <strong>{{ basket.basketItems }} artículos</strong> pinneada el
          {{ basket.basketPinnedAt }}. Se calcula sólo con precios observados:
          <strong>{{ basket.qualifiedStores }} locales</strong> declaran al menos el 70 % de ella y
          por eso entran en la comparación; los demás dicen "muestra insuficiente" en lugar de un
          número que parece comparable y no lo es.
        </p>

        <VAlert
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-information-outline"
          class="mb-5"
        >
          <p class="mb-1 font-weight-medium">Por qué no publicamos "la canasta cuesta $X acá"</p>
          <p class="text-body-2 mb-0">
            Ningún local del país declara los {{ basket.basketItems }} artículos. Sumar sólo lo que
            cada uno declara le baja el total al que le <em>faltan</em> productos, no al que es
            barato: medido, la correlación entre cobertura y total crudo es <strong>0,842</strong>,
            y de los diez "más baratos" por total sólo uno sigue estando entre los diez más baratos
            cuando se compara bien. Así que se publica cuánto cobra cada local por
            <strong>los artículos que sí declara</strong>, contra la mediana del país de
            <strong>esos mismos</strong> artículos.
          </p>
        </VAlert>

        <h3 class="text-subtitle-1 font-weight-bold mb-2">Dónde la canasta sale más barata</h3>
        <div class="table-scroll mb-6">
          <VTable density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>Local</th>
                <th>Departamento</th>
                <th class="text-right">Nivel de precios</th>
                <th class="text-right">Cobertura</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="store in basket.cheapestStores.slice(0, 12)" :key="store.storeId">
                <td data-label="Local">{{ store.storeName }}</td>
                <td data-label="Departamento">{{ store.department || '—' }}</td>
                <td data-label="Nivel de precios" class="text-right">
                  <strong>{{ levelLabel(store.ratio) }}</strong>
                </td>
                <td data-label="Cobertura" class="text-right">
                  {{ Math.round(store.coverage * 100) }} %
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>

        <h3 class="text-subtitle-1 font-weight-bold mb-2">Por departamento</h3>
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ rankedDepartments.length }} de 19 departamentos tienen muestra suficiente. Los otros
          {{ unrankedDepartments.length }} no: el catálogo oficial tiene
          {{ thinnestDepartmentNote }}, y con eso no hay ranking honesto.
        </p>
        <div class="table-scroll mb-4">
          <VTable density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>Departamento</th>
                <th class="text-right">Nivel de precios</th>
                <th class="text-right">Locales</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="scope in rankedDepartments" :key="scope.scope">
                <td data-label="Departamento">{{ scopeName(scope.scope) }}</td>
                <td data-label="Nivel de precios" class="text-right">
                  {{ levelLabel(scope.median) }}
                </td>
                <td data-label="Locales" class="text-right">{{ scope.stores }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p v-if="unrankedDepartments.length" class="text-body-2 text-medium-emphasis mb-6">
          Sin muestra suficiente:
          {{ unrankedDepartments.map(s => `${scopeName(s.scope)} (${s.stores})`).join(', ') }}.
        </p>

        <h3 class="text-subtitle-1 font-weight-bold mb-2">Por cadena</h3>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Sólo las cadenas con al menos 5 locales que declaren el 70 % de la canasta. Es un nivel de
          precios sobre esta canasta y este día, no un veredicto sobre la cadena.
        </p>
        <div class="table-scroll">
          <VTable density="comfortable" class="cu-mobile-cards">
            <thead>
              <tr>
                <th>Cadena</th>
                <th class="text-right">Nivel de precios</th>
                <th class="text-right">Locales</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="scope in rankedChains" :key="scope.scope">
                <td data-label="Cadena">{{ scopeName(scope.scope) }}</td>
                <td data-label="Nivel de precios" class="text-right">
                  {{ levelLabel(scope.median) }}
                </td>
                <td data-label="Locales" class="text-right">{{ scope.stores }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </section>

      <!-- Método -->
      <section id="metodo" class="mb-10">
        <h2 class="text-h5 font-weight-bold mb-3">Cómo se mide, y qué se descarta</h2>
        <VRow>
          <VCol v-for="card in methodCards" :key="card.title" cols="12" md="6">
            <VCard variant="outlined" class="pa-4 h-100">
              <p class="text-subtitle-2 font-weight-bold mb-1">{{ card.title }}</p>
              <p class="text-body-2 mb-0" v-html="card.body" />
            </VCard>
          </VCol>
        </VRow>
      </section>

      <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" class="mb-10" />

      <section class="mb-4">
        <h2 class="text-h5 font-weight-bold mb-3">Seguí con el resto del presupuesto</h2>
        <VRow>
          <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="3">
            <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
              <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.title }}</p>
              <p class="text-body-2 text-medium-emphasis mb-0">{{ link.body }}</p>
            </VCard>
          </VCol>
        </VRow>
      </section>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import { preciosSlug, preciosSpread, type PreciosArticleRow } from '~/utils/preciosCatalog'

const localePath = useLocalePath()

// Server-rendered: los números SON la página. Un crawler y alguien con mala
// conexión tienen que recibirlos en el HTML, no después de un round trip.
const { data } = await useFetch<any>('/api/precios', {
  key: 'precios-hub',
  default: () => null,
})

const articles = computed<PreciosArticleRow[]>(() => data.value?.articles ?? [])
const basket = computed<any>(() => data.value?.basket ?? null)
const hasData = computed(() => articles.value.length > 0)

const search = ref('')
const showAll = ref(false)

const articleCount = computed(() => articles.value.length)
const storeCount = computed(() => {
  // Los locales que efectivamente declararon algo, no el tamaño del catálogo.
  const scopes = basket.value?.scopes ?? []
  const depts = scopes.filter((s: any) => s.scope.startsWith('dept:'))
  const counted = depts.reduce((sum: number, s: any) => sum + (s.stores || 0), 0)
  return counted || basket.value?.qualifiedStores || 0
})

const freshnessLabel = computed(() =>
  data.value?.day ? `lectura del ${data.value.day}` : 'sin lectura'
)

const filteredArticles = computed(() => {
  const needle = (search.value || '').trim().toLowerCase()
  if (!needle) return articles.value
  return articles.value.filter(row => row.name.toLowerCase().includes(needle))
})

const visibleArticles = computed(() =>
  showAll.value || search.value ? filteredArticles.value : filteredArticles.value.slice(0, 25)
)

const maxSpreadLabel = computed(() => {
  let best = 0
  for (const row of articles.value) {
    const spread = preciosSpread(row)
    if (spread && spread > best) best = spread
  }
  return best ? `${best.toFixed(1)} veces` : '—'
})

const rankedDepartments = computed(() =>
  (basket.value?.scopes ?? [])
    .filter((s: any) => s.scope.startsWith('dept:') && s.qualified)
    .sort((a: any, b: any) => a.median - b.median)
)
const unrankedDepartments = computed(() =>
  (basket.value?.scopes ?? [])
    .filter((s: any) => s.scope.startsWith('dept:') && !s.qualified)
    .sort((a: any, b: any) => b.stores - a.stores)
)
const rankedChains = computed(() =>
  (basket.value?.scopes ?? [])
    .filter((s: any) => s.scope.startsWith('chain:') && s.qualified)
    .sort((a: any, b: any) => a.median - b.median)
)

const thinnestDepartmentNote = computed(() => {
  const thin = unrankedDepartments.value[unrankedDepartments.value.length - 1]
  if (!thin) return 'pocas bocas en varios de ellos'
  return `${thin.stores} ${thin.stores === 1 ? 'boca' : 'bocas'} con canasta comparable en ${scopeName(thin.scope)}`
})

const money = (value?: number): string =>
  value === undefined || value === null
    ? '—'
    : `$ ${value.toLocaleString('es-UY', { maximumFractionDigits: 2 })}`

const spreadLabel = (row: PreciosArticleRow): string => {
  const spread = preciosSpread(row)
  return spread ? `${spread.toFixed(2)}×` : '—'
}

const scopeName = (scope: string): string => scope.replace(/^(dept|chain):/, '')

/**
 * El nivel de precios en palabras. Se publica el cociente y NO un total
 * completado: escalarlo a la canasta entera daría una cifra linda y comparable
 * pero sería inventar el precio de los artículos que el local no vende.
 */
const levelLabel = (ratio?: number | null): string => {
  if (ratio === undefined || ratio === null || !Number.isFinite(ratio)) return '—'
  const pct = (ratio - 1) * 100
  if (Math.abs(pct) < 1) return 'como la mediana'
  return pct < 0 ? `${Math.abs(pct).toFixed(1)} % más barato` : `${pct.toFixed(1)} % más caro`
}

const methodCards = [
  {
    title: 'La fuente es el Estado, no nosotros',
    body: 'Los precios los declaran los comercios al SIPC (Ministerio de Economía / Área Defensa del Consumidor). <code>precios.gub.uy</code> redirige a <code>precios.uy</code>: es el mismo sistema oficial. Acá no se releva ningún precio a mano.',
  },
  {
    title: 'Una góndola vieja no encabeza',
    body: 'Cada fila trae la fecha que declara el local. Si pasaron más de dos semanas se marca y <strong>no puede ganar el "más barato"</strong>. No se borra: una góndola quieta puede ser un precio real. Pero el titular no se lo lleva.',
  },
  {
    title: 'El precio absurdo se marca, no se borra',
    body: 'La banda se calcula con los percentiles del propio artículo, porque el spread real va de 1,58× a 4,86× según el producto y un factor fijo no sirve para los dos. Lo que queda muy por debajo del resto se muestra marcado y tampoco encabeza.',
  },
  {
    title: 'Las ofertas cuentan',
    body: 'Una de cada diez filas viene declarada como <em>oferta</em>, y es 7,8 % más barata que el precio normal del mismo artículo. Descartarlas empujaría todos los promedios para arriba y borraría del ranking a los locales que están haciendo promoción, así que se leen y se etiquetan.',
  },
  {
    title: 'Lo que no se publica',
    body: 'El comparador oficial completa los huecos de su tabla con un promedio nacional marcado <code>(*)</code>. Para un artículo con 28 precios reales llega a mostrar el mismo número en 722 locales. Nada de eso entra: sin precio propio y sin fecha propia, no es una observación.',
  },
  {
    title: 'Esto no es el IPC',
    body: 'Es una canasta fija propia, con cantidades supuestas, útil para comparar locales entre sí. El índice de precios al consumo lo publica el INE y se calcula de otra manera.',
  },
]

const relatedLinks = [
  {
    to: '/herramientas/costo-de-vida',
    title: 'Costo de vida',
    body: 'Cuánto necesitás por mes según con quién vivís y dónde.',
  },
  {
    to: '/descuentos-con-tarjeta-uruguay',
    title: 'Descuentos con tarjeta',
    body: 'Qué día conviene comprar y con qué tarjeta.',
  },
  {
    to: '/herramientas/calculadora-sueldo-liquido',
    title: 'Sueldo líquido',
    body: 'De lo que dice el contrato a lo que llega a la cuenta.',
  },
  {
    to: '/alquileres-uruguay',
    title: 'Alquileres',
    body: 'La otra mitad grande del presupuesto, aviso por aviso.',
  },
]

const faqItems: FaqItem[] = [
  {
    id: 'fuente',
    question: '¿De dónde salen estos precios?',
    answer:
      'Los declaran los propios comercios al SIPC, el Sistema de Información de Precios al Consumidor del Ministerio de Economía y Finanzas y el Área Defensa del Consumidor. Es información pública y oficial; acá se lee todos los días, se guarda y se compara.',
  },
  {
    id: 'fecha-vieja',
    question: '¿Por qué un local aparece con un precio de la semana pasada?',
    answer:
      'Porque es la fecha que el propio local declaró. El sistema oficial no obliga a actualizar todos los días, así que hay góndolas que quedan quietas. La fecha se muestra siempre, y una fila de más de dos semanas no puede aparecer como el precio más barato.',
  },
  {
    id: 'canasta-completa',
    question: '¿Por qué no dicen cuánto cuesta la canasta completa en cada supermercado?',
    answer:
      'Porque ningún local declara todos los artículos de la canasta, y sumar sólo lo que cada uno declara favorece al que tiene menos productos cargados en lugar de al más barato. En vez de eso se compara cuánto cobra cada local por los artículos que sí declara, contra la mediana del país de esos mismos artículos.',
  },
  {
    id: 'sin-ranking',
    question: '¿Por qué mi departamento no tiene ranking?',
    answer:
      'Porque el catálogo oficial tiene muy pocas bocas ahí. Con dos o tres locales, un "más barato del departamento" diría más sobre quién carga precios que sobre los precios. Cuando no hay muestra suficiente se dice, en vez de publicar el número igual.',
  },
  {
    id: 'no-es-ipc',
    question: '¿Es el mismo dato que el índice de precios del INE?',
    answer:
      'No. El IPC lo calcula el Instituto Nacional de Estadística con su propia canasta y su propia metodología. Lo de esta página es una canasta fija propia, con cantidades supuestas, que sirve para comparar locales entre sí en un mismo día.',
  },
]

// 34 caracteres: con el sufijo del sitio el titulo renderizado queda en 51 y
// entra completo en el SERP. El presupuesto de titulos del repo tolera 33
// pasados de 60 y no hace falta gastar el 34 aca.
const title = 'Precios de supermercado en Uruguay'
const description =
  'Precios de góndola declarados al SIPC (Ministerio de Economía), producto por producto y local por local, con la fecha de cada dato y el histórico que el Estado no guarda.'
const canonicalUrl = 'https://cambio-uruguay.com/precios-de-supermercado-uruguay'

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'Precios de supermercado en Uruguay (SIPC)',
        description,
        url: canonicalUrl,
        inLanguage: 'es-UY',
        isAccessibleForFree: true,
        creator: { '@type': 'Organization', name: 'Cambio Uruguay' },
        distribution: [
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: 'https://api.cambio-uruguay.com/precios/articles',
          },
          {
            '@type': 'DataDownload',
            encodingFormat: 'application/json',
            contentUrl: 'https://api.cambio-uruguay.com/precios/basket',
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-scroll {
  overflow-x: auto;
}
</style>
