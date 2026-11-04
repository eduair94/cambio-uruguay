<!--
  THESIS: Alguien busca "bicicleta eléctrica uruguay" para saber cuánto sale hoy y cuál le sirve, no
  cuál es "la mejor". Contestar con la banda de precio por tipo, nuevo y usado, un asesor con reglas
  a la vista, los modelos juntando a todos los vendedores, lo que declara la ficha técnica de cada
  aviso (rodado, autonomía, potencia, batería removible), las ofertas más baratas con su fecha y la
  normativa departamental con su fuente — nunca un ranking de marca.
  OWN-WORLD: Mismas superficies, tipografía y azul de enlace que /monopatines-electricos-uruguay,
  con quien comparte maquinaria y componente de normativa.
  FAMILY: Sólo español (como comparativas, sucursal y tiendas-online-uruguay): el canonical es
  literal, sin prefijo de idioma, aunque la ruta exista bajo /en/ y /pt/ por la estrategia
  `prefix_except_default`.
-->
<template>
  <VContainer class="movilidad-page py-6 py-md-10">
    <VBreadcrumbs class="px-0 pb-2" :items="crumbs" />

    <header class="movilidad-header">
      <h1>Precio de bicicletas eléctricas en Uruguay</h1>
      <p class="lead">{{ intro }}</p>
      <p v-if="asOf" class="as-of">Actualizado el {{ movilidadLongDate(asOf) }}.</p>
    </header>

    <!-- ── Cuánto sale, por tipo ─────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="variantes-title">
      <h2 id="variantes-title">Cuánto sale hoy, por tipo</h2>
      <p v-if="!variants.length" class="empty-note">
        Todavía no tenemos avisos recientes de bicicletas eléctricas. La página se completa sola con
        la próxima lectura de tiendas y Mercado Libre.
      </p>

      <div v-else class="variant-grid">
        <article v-for="item in variants" :key="item.key" class="variant-card">
          <div class="variant-head">
            <MovilidadVariantThumb
              :src="item.image ?? null"
              :alt="`Bicicleta eléctrica ${item.variantLabel.toLowerCase()}`"
              icon="mdi-bicycle-electric"
            />
            <h3>{{ item.variantLabel }}</h3>
          </div>

          <template v-if="item.newBand">
            <p class="variant-median">
              <span class="amount">{{ movilidadMoney(item.newBand.median) }}</span>
              <span class="variant-tag">mediana nuevo</span>
            </p>
            <p class="variant-band">
              La mitad de los avisos entre {{ movilidadMoney(item.newBand.p25) }} y
              {{ movilidadMoney(item.newBand.p75) }} ({{ item.newBand.n }} avisos nuevos).
            </p>
          </template>
          <p v-else class="muted">Nuevo: sin datos suficientes.</p>

          <p v-if="item.usedBand" class="variant-used">
            Usado: mediana {{ movilidadMoney(item.usedBand.median) }} ({{
              item.usedBand.n
            }}
            avisos)<span v-if="item.usedSavingPct" class="saving">
              , alrededor de {{ Math.round(item.usedSavingPct) }} % menos que la mediana nueva</span
            >.
          </p>
          <p v-else class="variant-used muted">Usado: sin datos suficientes.</p>
        </article>
      </div>
    </section>

    <!-- ── Asesor ────────────────────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="asesor-title">
      <h2 id="asesor-title">¿Cuál te conviene?</h2>
      <p class="section-intro">
        Contanos cómo la vas a usar y elegimos entre las bicicletas con ficha técnica leída: la más
        barata que cumple, la que da más kilómetros por tu plata y la más fácil de subir o la más
        potente. Las reglas están a la vista, abajo.
      </p>
      <MovilidadBicicletaAsesor @ver="verDesdeAsesor" />
    </section>

    <!-- ── Modelos ───────────────────────────────────────────────────────── -->
    <!-- Desde el 4/11/2026 los avisos del mismo modelo se juntan entre vendedores
         (classes/movilidad/models/, `category: bicicleta-electrica`). Sin catálogo, no hay tabla. -->
    <section v-if="modelRows.length" class="movilidad-section" aria-labelledby="modelos-title">
      <h2 id="modelos-title">Modelos y sus mejores ofertas</h2>
      <p class="section-intro">
        Juntamos los avisos del mismo modelo de todos los vendedores: {{ modelRows.length }} modelos
        con dos avisos o más. Cada uno tiene su página con todas las ofertas y la ficha técnica.
        Marcá hasta {{ MONOPATIN_COMPARE_MAX }} para compararlos lado a lado.
      </p>
      <VTable class="cu-mobile-cards products-table" density="compact">
        <thead>
          <tr>
            <th scope="col">Modelo</th>
            <th scope="col">Ficha técnica</th>
            <th scope="col" class="text-right">Vendedores</th>
            <th scope="col" class="text-right">Desde</th>
            <th scope="col"><span class="d-sr-only">Comparar</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(model, index) in modelRows"
            v-show="showAllModels || index < MODELS_SHOWN"
            :key="model.slug"
          >
            <td data-label="">
              <div class="product-cell">
                <MovilidadVariantThumb
                  :src="model.image ?? null"
                  :alt="model.name"
                  icon="mdi-bicycle-electric"
                />
                <span class="product-cell__text">
                  <NuxtLink :to="`/bicicletas-electricas-uruguay/${model.slug}`" class="cat-link">
                    <strong>{{ model.name }}</strong>
                  </NuxtLink>
                  <span class="cu-cell-note">
                    {{ variantLabelOf(model.variant) }} · {{ model.listings }} avisos
                  </span>
                </span>
              </div>
            </td>
            <td data-label="Ficha técnica">
              <MovilidadSpecStrip
                v-if="model.specs"
                :specs="{ ...model.specs, fromFicha: true }"
                categoria="bicicleta-electrica"
                compact
              />
              <span v-else class="muted" aria-label="Sin ficha técnica leída">—</span>
            </td>
            <td data-label="Vendedores" class="text-right">{{ model.sellers }}</td>
            <td data-label="Desde" class="text-right price">
              <template v-if="model.newMin">{{ movilidadMoney(model.newMin) }}</template>
              <template v-else-if="model.usedMin">
                {{ movilidadMoney(model.usedMin) }} <span class="cu-cell-note">usada</span>
              </template>
            </td>
            <td data-label="Comparar">
              <VCheckbox
                :model-value="isCompared(model.slug)"
                :disabled="!isCompared(model.slug) && compare.length >= MONOPATIN_COMPARE_MAX"
                :aria-label="`Comparar ${model.name}`"
                label="Comparar"
                density="compact"
                hide-details
                @update:model-value="toggleCompare(model)"
              />
            </td>
          </tr>
        </tbody>
      </VTable>
      <VBtn
        v-if="modelRows.length > MODELS_SHOWN && !showAllModels"
        class="mt-3"
        variant="tonal"
        @click="showAllModels = true"
      >
        Ver los {{ modelRows.length }} modelos
      </VBtn>
    </section>

    <!-- ── Los más baratos ───────────────────────────────────────────────── -->
    <AssistantCta topic="bicicletas" class="movilidad-cta" />
    <section
      v-if="cheapestNew.length || cheapestUsed.length"
      class="movilidad-section"
      aria-labelledby="baratos-title"
    >
      <h2 id="baratos-title">Las ofertas más baratas</h2>
      <p class="section-intro">
        Las ofertas más baratas de la última lectura, con quién la publica y la fecha en que la
        vimos. El precio cambia todos los días: confirmalo en el aviso antes de comprar.
        <template v-if="suspectDropped">
          Dejamos afuera {{ suspectDropped }} {{ suspectDropped === 1 ? 'aviso' : 'avisos' }} con
          precios muy por debajo del resto de su tipo: no entran en las medianas ni en esta lista.
        </template>
      </p>

      <div class="cheap-grid">
        <div v-if="cheapestNew.length">
          <h3 class="cheap-title">Nuevas</h3>
          <div class="offer-grid">
            <MovilidadOfferCard
              v-for="row in cheapestNew"
              :key="row.key"
              :offer="row.offer"
              :variant-label="row.variantLabel"
              categoria="bicicleta-electrica"
            />
          </div>
        </div>
        <div v-if="cheapestUsed.length">
          <h3 class="cheap-title">Usadas</h3>
          <div class="offer-grid">
            <MovilidadOfferCard
              v-for="row in cheapestUsed"
              :key="row.key"
              :offer="row.offer"
              :variant-label="row.variantLabel"
              categoria="bicicleta-electrica"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- ── Directorio con filtros ────────────────────────────────────────── -->
    <section v-if="hasDirectorio" class="movilidad-section" aria-labelledby="directorio-title">
      <h2 id="directorio-title">Todas las bicicletas eléctricas en venta</h2>
      <p class="section-intro">
        Todos los avisos vigentes, con foto y filtros por tipo, condición, marca, vendedor, precio y
        ficha técnica (rodado, autonomía, potencia, peso, batería removible, acelerador). Es la
        misma lectura que arma las medianas de arriba: un aviso que la banda descartó por precio
        dudoso, o un accesorio que nombra la bici a la que va, tampoco aparece acá.
      </p>
      <EquiparDirectorio
        :query="dirQuery"
        :data="dirData"
        :error="dirError"
        :facets="dirFacets"
        :chips="dirChips"
        fixed-categoria="bicicleta-electrica"
        hide-list
        hide-category
        vertical="movilidad"
        anchor-id="movilidad-resultados"
        class="movilidad-directorio"
        @update="dirUpdate"
        @remove="dirRemove"
        @clear="dirClear"
      />
    </section>

    <!-- ── Qué esperar de cada tipo ──────────────────────────────────────── -->
    <section v-if="specRows.length" class="movilidad-section" aria-labelledby="tipos-title">
      <h2 id="tipos-title">Qué esperar de cada tipo</h2>
      <p class="section-intro">
        La mediana de lo que declaran las fichas técnicas de {{ fmt(specStats!.withFicha) }} de las
        {{ fmt(specStats!.total) }} bicicletas a la venta. La mitad declara más y la mitad menos: es
        lo típico, no un mínimo.
      </p>
      <VTable class="cu-mobile-cards cu-roomy spec-table" density="compact">
        <thead>
          <tr>
            <th scope="col">Tipo</th>
            <th scope="col" class="text-right">Rodado</th>
            <th scope="col" class="text-right">Autonomía</th>
            <th scope="col" class="text-right">Potencia</th>
            <th scope="col" class="text-right">Peso</th>
            <th scope="col" class="text-right">Soporta</th>
            <th scope="col" class="text-right">Carga completa</th>
            <th scope="col" class="text-right">Una carga cuesta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in specRows" :key="row.variant">
            <td data-label="">
              <strong>{{ row.label }}</strong>
              <span class="cu-cell-note">{{ fmt(row.n) }} avisos</span>
            </td>
            <td data-label="Rodado" class="text-right num">{{ unit(row.wheelInches, '″') }}</td>
            <td data-label="Autonomía" class="text-right num">{{ unit(row.rangeKm, 'km') }}</td>
            <td data-label="Potencia" class="text-right num">{{ unit(row.motorW, 'W') }}</td>
            <td data-label="Peso" class="text-right num">{{ unit(row.weightKg, 'kg') }}</td>
            <td data-label="Soporta" class="text-right num">{{ unit(row.maxLoadKg, 'kg') }}</td>
            <td data-label="Carga completa" class="text-right num">
              {{ unit(row.chargeHours, 'h') }}
            </td>
            <td data-label="Una carga cuesta" class="text-right num">
              {{ chargeCost(row.batteryWh) }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="section-intro">
        "Una carga cuesta" es la batería mediana (V × Ah) a {{ kwhLabel }} el kWh — UTE, tarifa
        residencial simple, escalón de 101 a 600 kWh, con IVA — más un
        {{ Math.round(MONOPATIN_CHARGER_LOSS * 100) }} % que se pierde en el cargador. Con
        asistencia media y alguna cuesta, una bici rinde alrededor del
        {{ Math.round(BICICLETA_AUTONOMIA_REAL * 100) }} % de la autonomía que declara.
      </p>
    </section>

    <!-- ── Normativa ─────────────────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="normativa-title">
      <h2 id="normativa-title">Normativa por departamento</h2>
      <MovilidadNormativaTable />
    </section>

    <!-- ── Cómo elegir ───────────────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="elegir-title">
      <h2 id="elegir-title">Cómo elegir una bicicleta eléctrica</h2>
      <p class="section-intro">
        No recomendamos marcas ni modelos: esto es lo que suele diferenciar una bicicleta eléctrica
        de otra y vale la pena mirar en la ficha del producto antes de comprar.
      </p>
      <ul class="guide-list">
        <li>
          <strong>Rodado.</strong> El tamaño de la rueda decide qué bici es: 12 a 16″ son las de
          equilibrio y las plegables más compactas, 20″ las plegables y las fat, 26 a 29″ las de
          paseo y de montaña.<template v-if="medianWheel">
            La mediana de las fichas a la venta es rodado {{ medianWheel }}.</template
          >
        </li>
        <li>
          <strong>Autonomía.</strong> Los kilómetros que declara el vendedor por carga completa de
          batería, medidos con la asistencia más baja. Con asistencia media y alguna cuesta, contá
          con alrededor del {{ Math.round(BICICLETA_AUTONOMIA_REAL * 100) }} %; el frío y el peso la
          bajan más.<template v-if="allStats?.rangeKm">
            La mediana declarada hoy es {{ unit(allStats.rangeKm, 'km') }}.</template
          >
        </li>
        <li>
          <strong>Peso y batería removible.</strong> El motor y la batería suman peso a una
          bicicleta común: más de {{ BICICLETA_LIVIANA_KG }} kg se siente en una escalera. Si la
          bici queda abajo, una batería que se saca se carga adentro.
        </li>
        <li>
          <strong>Potencia del motor.</strong> Los vatios (W) que declara el vendedor son una
          referencia de cuánta asistencia da en subida, no una garantía de rendimiento: con 250 W en
          una cuesta larga se pedalea casi todo, y un motor central sube mejor que uno en la rueda
          con la misma potencia.
        </li>
        <li>
          <strong>Freno.</strong> Doble freno (delantero y trasero), preferentemente a disco: el
          peso extra del motor y la batería exige más al frenar.
        </li>
        <li>
          <strong>Garantía.</strong> Cuántos meses cubre el vendedor sobre el conjunto motor y
          batería, que suele ser la parte más cara de reponer.
        </li>
      </ul>
    </section>

    <!-- ── Si se rompe ───────────────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="garantia-title">
      <h2 id="garantia-title">Si se rompe</h2>
      <p class="section-intro">
        Comprada en una tienda o a un vendedor habilitado en Uruguay, una bicicleta eléctrica tiene
        la garantía legal de la Ley 17.250 de Defensa del Consumidor: si llega con un defecto de
        fabricación tenés derecho a la reparación, el cambio o la devolución del dinero. Guardá la
        factura o el comprobante de la compra.
      </p>
      <p class="section-intro">
        <NuxtLink :to="localePath('/derechos-consumidor-compras-online')" class="cat-link">
          Qué hacer si compraste online y no te entregan o el producto llega roto
        </NuxtLink>
      </p>
    </section>

    <!-- `:ad="false"`: la segunda unidad de la página ya la pone el directorio, en la grilla
         (components/feed/Ad.vue). Con las dos, la página pasaría el tope de maxAdSlots. -->
    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" :ad="false" />

    <!-- ── Otras páginas ─────────────────────────────────────────────────── -->
    <section class="movilidad-section related" aria-labelledby="related-title">
      <h2 id="related-title">Seguí leyendo</h2>
      <ul class="related-list">
        <li>
          <NuxtLink :to="localePath('/monopatines-electricos-uruguay')" class="cat-link">
            Precio de monopatines eléctricos en Uruguay
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/equipar-casa-uruguay')" class="cat-link">
            Equipar una casa vacía: qué comprar y cuánto sale
          </NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/ciberlunes-y-black-friday-uruguay')" class="cat-link">
            CyberLunes y Black Friday: si el descuento es real
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- ── Método ────────────────────────────────────────────────────────── -->
    <section class="movilidad-section" aria-labelledby="metodo-title">
      <h2 id="metodo-title">De dónde salen estos precios</h2>
      <p class="section-intro">
        Relevamos avisos de tiendas online uruguayas y Mercado Libre. Nuevo y usado son dos mercados
        y nunca se promedian: cada uno tiene su propia mediana, y un tipo con pocos avisos dice "sin
        datos suficientes" en vez de inventar un número. Sólo publicamos lo visto en los últimos 4
        días.
      </p>
      <p class="section-intro">
        La ficha técnica es la que declara cada vendedor en la página propia de su aviso (la tabla
        de Mercado Libre o el texto de la tienda), leída una vez por aviso y releída cada 45 días.
        Un valor que no puede ser el de una bicicleta (un rodado 40, una bici de 90 kg) se descarta
        en vez de corregirse, y de Facebook Marketplace sólo usamos lo que dice el título.
      </p>
    </section>

    <MovilidadCompareTray
      :items="compare"
      compare-path="/bicicletas-electricas-uruguay/comparar"
      label="Comparar bicicletas"
      @remove="slug => (compare = compare.filter(item => item.slug !== slug))"
      @clear="compare = []"
    />
  </VContainer>
</template>

<script setup lang="ts">
import {
  movilidadCheapestOffers,
  movilidadLongDate,
  movilidadMoney,
  movilidadPrecioTipicoAnswer,
  movilidadUsadoAnswer,
  type MonopatinSpecStatsRow,
  type MovilidadCategoryResponse,
  type MovilidadItemDoc,
} from '~/utils/movilidad'
import { DIRECTORIOS_HUB, directoriosHubListItem } from '~/utils/directorios'
import {
  MONOPATIN_CHARGER_LOSS,
  MONOPATIN_KWH_UYU,
  monopatinChargeCostUyu,
  type MovilidadFichaQuery,
} from '~/utils/monopatinFicha'
import {
  MONOPATIN_COMPARE_MAX,
  type MonopatinModelListResponse,
  type MonopatinModelSummary,
} from '~/utils/monopatinModelos'
import { BICICLETA_AUTONOMIA_REAL, BICICLETA_LIVIANA_KG } from '~/utils/bicicletaAsesor'

const localePath = useLocalePath()

// Server-rendered: las medianas tienen que estar en el HTML que lee el buscador. `bicicleta-electrica`
// es régimen `commodity` (classes/movilidad/registry.ts): la banda no identifica productos, así que
// esta página no pide `products`. Los modelos vienen de otro lado: el catálogo que arma
// currency-movilidad-specs juntando vendedores (`/api/movilidad/modelos?categoria=bicicleta-electrica`).
const { data } = await useFetch('/api/movilidad/bicicleta-electrica', {
  key: 'movilidad-bicicleta',
  transform: (response: MovilidadCategoryResponse): MovilidadCategoryResponse => ({
    ...response,
    items: (response?.items ?? []).map(item => ({ ...item, products: [] })),
  }),
})

// El directorio con filtros de abajo: misma maquinaria que /equipar-casa-uruguay/productos sobre
// `movilidadlistings` (una fila por aviso que la banda aceptó). La clave de `useAsyncData` es propia
// por vertical: dos páginas con la misma se pisan la respuesta.
const {
  query: dirQuery,
  data: dirData,
  error: dirError,
  facets: dirFacets,
  chips: dirChips,
  filtered: dirFiltered,
  update: dirUpdate,
  remove: dirRemove,
  clear: dirClear,
} = await useEquiparProductosDirectorio('bicicleta-electrica', {
  apiPath: '/api/movilidad/productos',
  vertical: 'movilidad',
  key: 'movilidad-productos-bicicleta',
})

/**
 * El directorio sólo se dibuja cuando hay avisos que mostrar, o cuando el lector puso un filtro
 * (ahí tiene que poder sacarlo aunque el resultado sea cero). Sin esto, una base todavía sin
 * escribir —el job publica esta colección desde el 22/9/2026— abriría una sección vacía diciendo
 * "probá sacar la marca" cuando el lector no filtró nada.
 */
const hasDirectorio = computed(() => (dirData.value?.total ?? 0) > 0 || dirFiltered.value)

const items = computed<MovilidadItemDoc[]>(() => data.value?.items ?? [])
const asOf = computed(() => data.value?.generatedAt ?? null)

// ── Ficha técnica ────────────────────────────────────────────────────────
// Las medianas por tipo vienen del snapshot que deja currency-movilidad-specs cada hora
// (classes/movilidad/specs/snapshot.ts, `key: bicicleta-electrica`): esta página no agrega nada.
const specStats = computed(() => data.value?.specStats ?? null)
const allStats = computed(() => specStats.value?.all ?? null)
const hasStat = (row: MonopatinSpecStatsRow) =>
  [row.rangeKm, row.motorW, row.weightKg, row.maxLoadKg, row.chargeHours, row.wheelInches].some(
    value => value !== null
  )
const VARIANT_ORDER: Record<string, number> = {
  infantil: 0,
  plegable: 1,
  urbana: 2,
  montana: 3,
  carga: 4,
}
const specRows = computed(() => {
  const stats = specStats.value
  if (!stats) return []
  const rows = [...stats.byVariant]
    .filter(hasStat)
    .sort((a, b) => (VARIANT_ORDER[a.variant] ?? 9) - (VARIANT_ORDER[b.variant] ?? 9))
  return rows.length && hasStat(stats.all) ? [...rows, { ...stats.all, label: 'Todas' }] : rows
})
const fmt = (value: number) => value.toLocaleString('es-UY')
/** Espacio duro: "45 km" y "$ 5" nunca se parten entre dos líneas en un teléfono. */
const NB = String.fromCharCode(160)
const unit = (value: number | null | undefined, suffix: string) =>
  typeof value === 'number'
    ? `${value.toLocaleString('es-UY', { maximumFractionDigits: 1 })}${suffix === '″' ? '' : NB}${suffix}`
    : '—'
const money = (value: number) => `$${NB}${fmt(value)}`
const chargeCost = (wh: number | null) => {
  const cost = monopatinChargeCostUyu(wh)
  return cost === null ? '—' : money(cost)
}
const kwhLabel = `$${NB}${MONOPATIN_KWH_UYU.toLocaleString('es-UY', { minimumFractionDigits: 2 })}`
const medianWheel = computed(() =>
  allStats.value?.wheelInches
    ? allStats.value.wheelInches.toLocaleString('es-UY', { maximumFractionDigits: 1 })
    : null
)

/** El botón del asesor: sus requisitos pasan a ser los filtros del directorio de abajo. */
async function verDesdeAsesor(patch: {
  ficha: MovilidadFichaQuery
  precioMax: number | null
  condicion: '' | 'nuevo'
}) {
  dirUpdate({
    ...dirQuery.value,
    ficha: patch.ficha,
    precioMax: patch.precioMax,
    precioMin: null,
    condicion: patch.condicion,
    orden: 'precio_asc',
    page: 1,
  })
  await nextTick()
  scrollToPageTop('movilidad-resultados')
}

// ── Modelos agrupados ────────────────────────────────────────────────────
// Server-rendered: los enlaces a las páginas de modelo tienen que estar en el HTML que lee el
// buscador. Sin catálogo todavía, o con la base caída, la sección no aparece.
const { data: modelsData } = await useFetch<MonopatinModelListResponse>('/api/movilidad/modelos', {
  key: 'bicicleta-modelos',
  query: { categoria: 'bicicleta-electrica' },
})
const modelRows = computed<MonopatinModelSummary[]>(() => modelsData.value?.models ?? [])
/** Los primeros 15 a la vista; el resto queda en el HTML (v-show) para que sus enlaces se rastreen. */
const MODELS_SHOWN = 15
const showAllModels = ref(false)
const variantLabelOf = (variant: string) =>
  items.value.find(item => item.variant === variant)?.variantLabel ?? ''

/** La lista de modelos del JSON-LD: sólo los indexables, cada uno a su página (el Product con su
 * AggregateOffer vive en esa página, no acá). */
const modelsLd = computed(() =>
  modelRows.value
    .filter(model => model.indexable)
    .map((model, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: model.name,
      url: `https://cambio-uruguay.com/bicicletas-electricas-uruguay/${model.slug}`,
    }))
)

const compare = ref<Array<{ slug: string; name: string }>>([])
const isCompared = (slug: string) => compare.value.some(item => item.slug === slug)
function toggleCompare(model: MonopatinModelSummary) {
  if (isCompared(model.slug)) compare.value = compare.value.filter(item => item.slug !== model.slug)
  else if (compare.value.length < MONOPATIN_COMPARE_MAX)
    compare.value = [...compare.value, { slug: model.slug, name: model.name }]
}

const variants = computed(() =>
  [...items.value].sort((a, b) => (a.variantRank ?? 1) - (b.variantRank ?? 1))
)

const cheapestNew = computed(() => movilidadCheapestOffers(variants.value, 'new', 8))
const cheapestUsed = computed(() => movilidadCheapestOffers(variants.value, 'used', 6))
const suspectDropped = computed(() =>
  items.value.reduce((sum, item) => sum + (item.suspectDropped ?? 0), 0)
)

const intro =
  'Relevamos precios de bicicletas eléctricas en tiendas online uruguayas y Mercado Libre: la ' +
  'banda de precio por tipo, nuevo y usado, las ofertas más baratas con su fecha, cada modelo en ' +
  'todos sus vendedores y la ficha técnica de cada aviso (rodado, autonomía, potencia, peso). No ' +
  'es un ranking de "la mejor bici eléctrica": es lo que efectivamente se está vendiendo hoy, con ' +
  'un asesor para elegir según tu trayecto.'

const crumbs = [
  { title: 'Inicio', to: localePath('/') },
  { title: DIRECTORIOS_HUB.label, to: localePath(DIRECTORIOS_HUB.path) },
  { title: 'Bicicletas eléctricas', disabled: true },
]

// ── FAQ ──────────────────────────────────────────────────────────────────
const faqItems = computed(() => [
  {
    id: 'movilidad-bicicleta-precio',
    question: '¿Cuánto sale una bicicleta eléctrica en Uruguay?',
    answer: movilidadPrecioTipicoAnswer(variants.value, 'bicicletas eléctricas', asOf.value),
  },
  {
    id: 'movilidad-bicicleta-licencia',
    question: '¿Necesito licencia o registro para andar en bicicleta eléctrica?',
    answer:
      'Depende del departamento y de si tu bicicleta entra en la definición local de "vehículo ' +
      'de movilidad personal". En Montevideo y San José hay normas específicas para vehículos de ' +
      'movilidad personal eléctricos, con edad mínima y algunos requisitos; la mayoría de los ' +
      'departamentos no tiene una norma propia que hayamos encontrado. Mirá la tabla de normativa ' +
      'de arriba para el tuyo.',
  },
  {
    id: 'movilidad-bicicleta-donde',
    question: '¿Por dónde puedo circular?',
    answer:
      'Depende del departamento: en Montevideo, la calzada, salvo donde haya infraestructura ' +
      'para bicicletas (ahí es obligatorio usarla); en San José está prohibido circular por ' +
      'veredas, espacios peatonales y rutas nacionales. Donde no encontramos una norma ' +
      'departamental no podemos afirmar una regla.',
  },
  {
    id: 'movilidad-bicicleta-autonomia',
    question: '¿Cuánta autonomía tiene una bicicleta eléctrica?',
    answer: allStats.value?.rangeKm
      ? `La mediana de lo que declaran las fichas de las bicicletas a la venta en Uruguay es ${unit(allStats.value.rangeKm, 'km')} por carga. ` +
        `El fabricante la mide con la asistencia más baja: con asistencia media y alguna cuesta contá con alrededor del ${Math.round(BICICLETA_AUTONOMIA_REAL * 100)} %, y menos con frío o más peso.`
      : `Depende del modelo y de la asistencia: el fabricante la mide con la más baja. Con asistencia media y alguna cuesta contá con alrededor del ${Math.round(BICICLETA_AUTONOMIA_REAL * 100)} % de lo que declara.`,
  },
  {
    id: 'movilidad-bicicleta-carga',
    question: '¿Cuánto cuesta cargar una bicicleta eléctrica?',
    answer: (() => {
      const cost = monopatinChargeCostUyu(allStats.value?.batteryWh ?? null)
      const battery = allStats.value?.batteryWh
      return cost !== null && battery
        ? `Con la batería mediana de las fichas (${unit(battery, 'Wh')}), una carga completa cuesta unos ${money(cost)} con la tarifa residencial de UTE, contando lo que se pierde en el cargador.` +
            (allStats.value?.chargeHours
              ? ` La carga completa tarda unas ${unit(allStats.value.chargeHours, 'h')}.`
              : '')
        : 'Muy poco: una batería típica de bici (entre 360 y 500 Wh) se carga con menos de medio kWh, unos pocos pesos con la tarifa residencial de UTE.'
    })(),
  },
  {
    id: 'movilidad-bicicleta-usado',
    question: '¿Conviene comprarla usada?',
    answer: movilidadUsadoAnswer(
      variants.value,
      true,
      'Pedí la fecha y los ciclos de carga de la batería: es la pieza que decide si el precio es ' +
        'bueno.'
    ),
  },
])

// ── SEO ──────────────────────────────────────────────────────────────────
// Absoluto y LITERAL, nunca construido con `localePath` — mismo patrón que
// monopatines-electricos-uruguay.vue y tiendas-online-uruguay/index.vue.
const CANONICAL = 'https://cambio-uruguay.com/bicicletas-electricas-uruguay'

defineOgImageComponent('Cambio', {
  title: 'Precio de bicicletas eléctricas en Uruguay',
  subtitle: 'Nuevo, usado y normativa por departamento',
  tag: 'PRECIOS',
})

const seoTitle = 'Precio de bicicletas eléctricas en Uruguay | Cambio Uruguay'
const seoDescription =
  'Bicicletas eléctricas en Uruguay, nuevas y usadas: cada modelo en todos sus vendedores, ' +
  'filtros por rodado y autonomía, y un asesor para elegir.'

useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: 'Precio de bicicletas eléctricas en Uruguay',
  ogDescription: seoDescription,
  ogType: 'website',
  ogUrl: CANONICAL,
  twitterCard: 'summary_large_image',
  twitterTitle: 'Precio de bicicletas eléctricas en Uruguay',
  twitterDescription: seoDescription,
  // Cada combinación de filtros del directorio es una copia delgada de esta página: sólo la URL
  // limpia se indexa (mismo criterio que /equipar-casa-uruguay/productos).
  robots: () => (dirFiltered.value ? 'noindex, follow' : 'index, follow'),
})

// FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com/',
              },
              directoriosHubListItem(2),
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Bicicletas eléctricas',
                item: CANONICAL,
              },
            ],
          },
          ...(modelsLd.value.length
            ? [
                {
                  '@type': 'ItemList',
                  name: 'Modelos de bicicletas eléctricas a la venta en Uruguay',
                  numberOfItems: modelsLd.value.length,
                  itemListElement: modelsLd.value,
                },
              ]
            : []),
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.movilidad-page {
  max-width: 1120px;
}
.products-table {
  margin-top: 16px;
}
.spec-table {
  margin-top: 16px;
}
.num {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.price {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}
.cu-cell-note {
  display: block;
  font-size: 0.75rem;
  opacity: 0.7;
}
.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.product-cell__text {
  display: block;
  min-width: 0;
}
.movilidad-page p {
  margin: 12px 0 0;
}
.movilidad-header h1 {
  margin: 0;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  line-height: 1.2;
  text-wrap: balance;
}
.lead {
  max-width: 68ch;
  font-size: 1.075rem;
}
.as-of {
  font-size: 0.875rem;
  opacity: 0.7;
}
.movilidad-section {
  margin-top: 40px;
}
.movilidad-section h2 {
  margin: 0;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.25;
}
.movilidad-section h3 {
  margin: 0;
  font-size: 1.05rem;
}
.section-intro {
  max-width: 70ch;
  font-size: 0.95rem;
  opacity: 0.88;
}
.empty-note {
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.95rem;
}
.cat-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}

/* Tarjetas por tipo */
.variant-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.variant-card {
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.variant-median {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
}
.variant-median .amount {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.variant-tag {
  font-size: 0.8rem;
  opacity: 0.7;
}
.variant-band,
.variant-used {
  font-size: 0.875rem;
}
.saving {
  font-weight: 700;
  color: rgb(var(--v-theme-success));
}
.muted {
  opacity: 0.66;
  font-size: 0.875rem;
}

/* Más baratos */
.cheap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px 32px;
  margin-top: 18px;
}

/* Guía */
.guide-list {
  max-width: 70ch;
  margin: 12px 0 0;
  padding-left: 22px;
  font-size: 0.95rem;
}
.guide-list li {
  padding: 4px 0;
}

.related-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px 20px;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}

/* El bloque del asistente es una sección más: sin esto quedaba pegado a la grilla de tipos. */
.movilidad-cta {
  margin-top: 40px;
}
.variant-head {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.cheap-title {
  margin-bottom: 12px;
}
.offer-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
@media (min-width: 600px) {
  .offer-grid {
    grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
    gap: 16px;
  }
}
.movilidad-directorio {
  margin-top: 24px;
}
</style>
