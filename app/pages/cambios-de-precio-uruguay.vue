<!--
THESIS: el sitio mide todos los días el precio de decenas de miles de avisos —autos, alquileres,
viviendas en venta, cosas para la casa, celulares, sillas, monopatines— y hasta hoy esa medición sólo
existía adentro de la base. Esta página la publica: qué avisos bajaron y cuáles subieron en los
últimos días, cada uno contra SU PROPIO precio anterior, nunca contra otro vendedor.
OWN-WORLD: tipografía, superficies y semánticos del resto del sitio; verde para las bajas y rojo para
las subas, con la palabra escrita al lado para que el color no sea la única señal.
STORY: primero qué es un cambio observado y desde cuándo medimos, después los contadores por vertical,
después una tabla por vertical, y al final qué NO dice esta página (si conviene comprar) con el enlace
a las dos páginas que sí contestan esa pregunta.
FIRST VIEWPORT: título, bajada y la fecha de la foto, todo server-rendered.
FORM: página de lectura; sin filtros ni estado que el visitante edite.
-->
<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">Precios · Uruguay</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Qué bajó y qué subió de precio en Uruguay
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-2">
        Seguimos el precio de cada aviso que publicamos —autos usados, alquileres, viviendas en venta,
        cosas para la casa, celulares, sillas y movilidad eléctrica— y anotamos cuánto pide cada día.
        Acá está lo que se movió en los últimos {{ windowDays }} días: cada aviso contra
        <strong>su propio precio anterior</strong>, nunca contra otro vendedor.
      </p>
      <p v-if="snapshot" class="as-of text-caption text-medium-emphasis">
        Foto del {{ priceChangeLongDay(snapshot.day) }}, calculada una vez por día.
      </p>
    </header>

    <VAlert v-if="!snapshot" type="info" variant="tonal" class="mb-6">
      Todavía no hay una foto publicada. El cálculo corre una vez por día; volvé a pasar mañana.
    </VAlert>

    <template v-else>
      <!-- ── Contadores ─────────────────────────────────────────────────── -->
      <section class="page-section" aria-labelledby="resumen-title">
        <h2 id="resumen-title" class="section-heading mb-3">Cuánto se movió</h2>
        <VTable class="cu-mobile-cards" density="compact">
          <thead>
            <tr>
              <th scope="col">Sección</th>
              <th scope="col" class="text-right">Avisos seguidos</th>
              <th scope="col" class="text-right">Bajaron</th>
              <th scope="col" class="text-right">Subieron</th>
              <th scope="col">Medimos desde</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in verticalRows" :key="row.vertical">
              <th scope="row" data-label="Sección">
                <NuxtLink :to="localePath(PRICE_CHANGE_VERTICAL_HOME[row.vertical])">
                  {{ PRICE_CHANGE_VERTICAL_LABEL[row.vertical] }}
                </NuxtLink>
              </th>
              <td data-label="Avisos seguidos" class="text-right">
                {{ row.tracked.toLocaleString('es-UY') }}
              </td>
              <td data-label="Bajaron" class="text-right is-down">{{ row.drops }}</td>
              <td data-label="Subieron" class="text-right is-up">{{ row.rises }}</td>
              <td data-label="Medimos desde">
                {{ row.trackingSince ? priceChangeLongDay(row.trackingSince) : '—' }}
              </td>
            </tr>
          </tbody>
        </VTable>
        <p class="note text-caption text-medium-emphasis mt-2">
          "Avisos seguidos" es cuántos tienen historial propio guardado, no cuántos hay publicados.
          Un aviso entra el día que lo vemos por primera vez: antes de esa fecha no sabemos qué precio
          tenía.
        </p>
      </section>

      <!-- ── Tablas por vertical ────────────────────────────────────────── -->
      <section
        v-for="group in groups"
        :key="group.vertical"
        class="page-section"
        :aria-labelledby="`${group.vertical}-title`"
      >
        <h2 :id="`${group.vertical}-title`" class="section-heading mb-1">
          {{ PRICE_CHANGE_VERTICAL_LABEL[group.vertical] }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ group.rows.length }}
          {{ group.rows.length === 1 ? 'aviso cambió' : 'avisos cambiaron' }} de precio.
          <NuxtLink :to="localePath(PRICE_CHANGE_VERTICAL_HOME[group.vertical])"
            >Ver todos los avisos</NuxtLink
          >.
        </p>
        <VTable class="cu-mobile-cards" density="compact">
          <thead>
            <tr>
              <th scope="col">Aviso</th>
              <th scope="col" class="text-right">Antes</th>
              <th scope="col" class="text-right">Ahora</th>
              <th scope="col" class="text-right">Cambio</th>
              <th scope="col">Cuándo</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in group.rows" :key="`${row.vertical}:${row.id}`">
              <th scope="row" data-label="Aviso" class="cell-title">
                <a
                  v-if="row.external"
                  :href="row.url"
                  target="_blank"
                  rel="nofollow noopener"
                  >{{ row.title }}</a
                >
                <NuxtLink v-else :to="localePath(row.url)">{{ row.title }}</NuxtLink>
                <span v-if="row.sellerName" class="cell-seller">{{ row.sellerName }}</span>
              </th>
              <td data-label="Antes" class="text-right">
                {{ priceChangeMoney(row.from, row.currency) }}
              </td>
              <td data-label="Ahora" class="text-right">
                <strong>{{ priceChangeMoney(row.to, row.currency) }}</strong>
              </td>
              <td
                data-label="Cambio"
                class="text-right"
                :class="row.direction === 'baja' ? 'is-down' : 'is-up'"
              >
                {{ row.direction === 'baja' ? 'bajó' : 'subió' }}
                {{ Math.abs(row.pct).toLocaleString('es-UY', { maximumFractionDigits: 1 }) }} %
              </td>
              <td data-label="Cuándo">{{ priceChangeShortDay(row.at) }}</td>
            </tr>
          </tbody>
        </VTable>
      </section>

      <VAlert v-if="!groups.length" type="info" variant="tonal" class="mb-6">
        Ningún aviso cambió de precio en los últimos {{ windowDays }} días. No es un error: la mayoría
        de los precios se quedan quietos semanas enteras.
      </VAlert>
    </template>

    <!-- ── Cómo se mide ───────────────────────────────────────────────────── -->
    <section class="page-section" aria-labelledby="metodo-title">
      <h2 id="metodo-title" class="section-heading mb-3">Cómo lo medimos</h2>
      <ul class="method-list text-body-2">
        <li>
          <strong>Un cambio es del aviso, no del mercado.</strong> Comparamos el precio de hoy de un
          aviso contra el precio que ese mismo aviso tenía antes. Si una categoría entera baja porque
          entró un vendedor barato, eso no aparece acá: eso lo cuentan las páginas de
          <NuxtLink :to="localePath('/evolucion-precio-alquileres-uruguay')"
            >evolución de precios</NuxtLink
          >.
        </li>
        <li>
          <strong>Las monedas no se mezclan.</strong> Un aviso que pasó de dólares a pesos no bajó un
          4.000 %: cambió de unidad. Esos tramos se cortan y no se publican como cambio.
        </li>
        <li>
          <strong>Sólo lo que vemos.</strong> Cada vertical se releva con su propia frecuencia (autos
          y cosas para la casa, cada hora; alquileres y viviendas en venta, una vez por día), así que
          un cambio que dura unas horas puede no quedar registrado.
        </li>
        <li>
          <strong>Hasta 3 avisos por vendedor.</strong> Una automotora o una tienda que retoca
          cuarenta precios el mismo día no puede ocupar toda la tabla.
        </li>
        <li>
          <strong>No decimos si conviene.</strong> Un precio que baja puede seguir siendo caro. Para
          saber si un descuento es real contra su propio historial de 60 días está
          <NuxtLink :to="localePath('/ciberlunes-y-black-friday-uruguay')"
            >CyberLunes y Black Friday</NuxtLink
          >; para saber si un precio es alto o bajo frente a avisos parecidos, cada ficha lleva su
          comparación.
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  PRICE_CHANGES_PATH,
  PRICE_CHANGE_VERTICAL_HOME,
  PRICE_CHANGE_VERTICAL_LABEL,
  PRICE_CHANGE_VERTICAL_ORDER,
  priceChangeLongDay,
  priceChangeMoney,
  priceChangeShortDay,
  priceChangesOf,
  type PriceChangesResponse,
} from '~/utils/priceChanges'

const localePath = useLocalePath()

// Server-rendered: las tablas son el contenido de la página, así que tienen que estar en el HTML que
// lee un buscador. La foto la calcula un job una vez por día (`currency-price-changes`), no el pedido.
const { data } = await useFetch<PriceChangesResponse>('/api/price-changes', {
  key: 'price-changes',
})

const snapshot = computed(() => data.value?.snapshot ?? null)
const windowDays = computed(() => snapshot.value?.windowDays ?? 7)

const verticalRows = computed(() => {
  const rows = snapshot.value?.verticals ?? []
  return [...rows].sort(
    (a, b) =>
      PRICE_CHANGE_VERTICAL_ORDER.indexOf(a.vertical) -
      PRICE_CHANGE_VERTICAL_ORDER.indexOf(b.vertical)
  )
})

const groups = computed(() =>
  PRICE_CHANGE_VERTICAL_ORDER.map(vertical => ({
    vertical,
    rows: priceChangesOf(snapshot.value?.changes ?? [], vertical),
  })).filter(group => group.rows.length)
)

const title = 'Qué bajó y qué subió de precio en Uruguay'
// <= 155 caracteres: lo que pasa de ahi no se acorta en el SERP, desaparece
// (app/tests/unit/seoDescriptionBudget.test.ts).
const description =
  'Qué avisos bajaron y cuáles subieron de precio en Uruguay: autos, alquileres, viviendas, ' +
  'celulares y más, cada uno contra su propio precio anterior.'
const canonicalUrl = `https://cambio-uruguay.com${PRICE_CHANGES_PATH}`

defineOgImageComponent('Cambio', {
  title: 'Cambios de precio',
  subtitle: 'Qué bajó y qué subió, aviso por aviso',
  tag: 'PRECIOS',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'bajó de precio uruguay, cambios de precio uruguay, bajaron los alquileres, bajaron los autos, ' +
        'subió el precio uruguay, seguimiento de precios uruguay',
    },
  ],
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
            item: 'https://cambio-uruguay.com/',
          },
          { '@type': 'ListItem', position: 2, name: title, item: canonicalUrl },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  opacity: 0.7;
  margin-bottom: 4px;
}
.page-section {
  margin-bottom: 40px;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 700;
}
.cell-title {
  font-weight: 600;
  max-width: 420px;
}
.cell-seller {
  display: block;
  font-weight: 400;
  font-size: 0.78rem;
  opacity: 0.75;
}
.is-down {
  color: rgb(var(--v-theme-success));
  font-weight: 600;
}
.is-up {
  color: rgb(var(--v-theme-error));
  font-weight: 600;
}
.method-list {
  padding-left: 18px;
}
.method-list li {
  margin-bottom: 10px;
  line-height: 1.55;
}
</style>
