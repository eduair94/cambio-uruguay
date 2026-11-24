<!--
THESIS: La ficha de UN aviso de computadora o pieza usada: lo que dice el aviso, de dónde salió cada
dato, lo que sale hoy cada pieza nueva y usada, y cómo está el precio contra eso y contra avisos
iguales. Es la página de decidir, no la de buscar: noindex, como la de autos y motos, porque un
aviso de Marketplace vence en días.
OWN-WORLD: La forma de /motos-usadas-uruguay/aviso/<key> (foto a la izquierda, datos a la derecha,
después el desglose, la comparación y las parecidas).
-->
<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs :items="breadcrumbs" class="px-0 mb-2" />

    <template v-if="!data || !computer">
      <h1 class="text-h5 font-weight-bold mb-3">
        {{
          failureCode === 404
            ? 'Este aviso ya no está en el directorio'
            : 'No pudimos cargar el aviso'
        }}
      </h1>
      <p class="text-body-1 mb-4">
        {{
          failureCode === 404
            ? 'Los avisos de computadoras usadas vencen o se venden rápido. Buscá otras parecidas en el directorio.'
            : 'Probá de nuevo en unos minutos.'
        }}
      </p>
      <VBtn color="primary" :to="localePath(COMPUTADORAS_PATH)">Ir al directorio</VBtn>
    </template>

    <template v-else>
      <VRow>
        <VCol cols="12" md="5">
          <div class="pc-photo">
            <img
              v-if="computer.image && !photoFailed"
              :src="computer.image"
              :alt="computer.title"
              width="720"
              height="480"
              fetchpriority="high"
              decoding="async"
              referrerpolicy="no-referrer"
              @error="photoFailed = true"
            />
            <VIcon v-else icon="mdi-laptop" size="64" />
          </div>
        </VCol>
        <VCol cols="12" md="7">
          <p class="pc-kind">{{ kindLine }}</p>
          <h1 class="text-h5 font-weight-bold mb-2 pc-heading">{{ computer.title }}</h1>
          <p class="text-h4 font-weight-bold mb-1">{{ price.main }}</p>
          <p v-if="price.usd" class="text-body-2 text-medium-emphasis mb-1">
            {{ price.usd }} a la cotización de la corrida
          </p>
          <VAlert
            v-if="computer.currencyInferred"
            type="info"
            variant="outlined"
            density="compact"
            class="my-3"
            data-testid="pc-currency-inferred"
          >
            Precio leído en dólares: Facebook marca los precios en pesos por defecto, y este monto
            sólo cierra en dólares. Por eso este aviso no entra en ninguna comparación.
          </VAlert>
          <div v-if="verdict || faults" class="d-flex flex-wrap ga-2 my-3">
            <ComputadorasVerdictBadge v-if="verdict" :listing="computer" />
            <span v-if="faults" class="pc-flag" data-testid="pc-faults">{{ faults }}</span>
          </div>
          <p v-if="ratioText" class="text-body-1 mb-3" data-testid="pc-ratio">{{ ratioText }}</p>

          <div class="d-flex flex-wrap ga-2 mb-4">
            <VBtn
              v-if="safePermalink"
              color="primary"
              :href="safePermalink"
              target="_blank"
              rel="nofollow noopener"
              append-icon="mdi-open-in-new"
            >
              Ver en {{ COMPUTER_SOURCE_LABEL[computer.source] }}
            </VBtn>
            <VBtn variant="outlined" :to="localePath(COMPUTADORAS_PATH)">Volver al directorio</VBtn>
          </div>

          <dl class="pc-facts">
            <div>
              <dt>Publicado</dt>
              <dd>{{ computerLongDate(computer.publishedAt) || '—' }}</dd>
            </div>
            <div>
              <dt>Última lectura</dt>
              <dd>{{ computerLongDate(computer.lastSeen) || '—' }}</dd>
            </div>
            <div v-if="place">
              <dt>Ubicación</dt>
              <dd>{{ place }}</dd>
            </div>
            <div>
              <dt>Fuente</dt>
              <dd>{{ COMPUTER_SOURCE_LABEL[computer.source] }}</dd>
            </div>
          </dl>
        </VCol>
      </VRow>

      <!-- La unidad intermedia, en el primer corte después de lo que la persona vino a ver (foto,
           precio, datos), como en la ficha de motos. -->
      <AdSlot placement="in-article" />

      <!-- ── Lo que dice el aviso ─────────────────────────────────────────── -->
      <section class="mt-8" data-testid="pc-specs">
        <h2 class="text-h6 mb-1">Lo que dice el aviso</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Leído {{ computer.detailRead ? 'del título y de la descripción' : 'del título' }} del
          aviso. Es lo que escribió el vendedor: no lo verificamos.
        </p>
        <div v-if="specRows.length" class="pc-scroll">
          <table class="pc-table">
            <tbody>
              <tr v-for="row in specRows" :key="row.label">
                <th scope="row">{{ row.label }}</th>
                <td>
                  {{ row.value }}
                  <span v-if="row.detail" class="pc-table__detail">{{ row.detail }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-body-1">
          El aviso no dice qué tiene adentro: ni procesador, ni memoria, ni disco. Preguntalo antes
          de comparar el precio.
        </p>
      </section>

      <!-- ── Lo que sale cada pieza ───────────────────────────────────────── -->
      <section
        v-if="computer.kind === 'desktop' && computer.valuation?.parts?.length"
        class="mt-8"
        data-testid="pc-valuation-section"
      >
        <h2 class="text-h6 mb-1">¿Cuánto saldría armarla hoy?</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Cada pieza que se leyó del aviso, con lo que sale hoy nueva y usada. Tocá una pieza para
          verla en la tabla de componentes.
        </p>
        <ComputadorasPartsBreakdown :valuation="computer.valuation" :parts="data.parts" />
      </section>
      <section
        v-else-if="computer.kindGroup === 'part' && computer.valuation?.parts?.length"
        class="mt-8"
        data-testid="pc-valuation-section"
      >
        <h2 class="text-h6 mb-1">¿Cuánto sale esta pieza hoy?</h2>
        <p class="text-body-2 text-medium-emphasis mb-4">
          La misma pieza, nueva y usada, en lo que se publicó hoy en Uruguay.
        </p>
        <ComputadorasPartsBreakdown
          :valuation="computer.valuation"
          :parts="data.parts"
          :totals="false"
          caption="Lo que sale hoy la misma pieza"
        />
      </section>

      <!-- ── Cómo está el precio ──────────────────────────────────────────── -->
      <section class="mt-8" data-testid="pc-price-position">
        <h2 class="text-h6 mb-2">¿Cómo está el precio?</h2>
        <!-- La oportunidad va primero: es la conclusión más fuerte que la página hace de un aviso,
             y por eso viene con su referencia en números y con el enlace a cómo se decide. -->
        <div v-if="deal" class="pc-deal mb-4" data-testid="pc-opportunity-detail">
          <p class="mb-1">
            <strong>Oportunidad: {{ deal.text }}</strong>
            <span class="text-medium-emphasis"> · {{ deal.tier }}</span>
          </p>
          <p v-if="dealDetail" class="text-body-2 mb-1">{{ dealDetail }}</p>
          <p class="text-body-2 mb-0">
            No es una tasación: probala antes de pagar.
            <NuxtLink :to="localePath(COMPUTER_OPPORTUNITIES_PATH)">
              Cómo se eligen las oportunidades
            </NuxtLink>
          </p>
        </div>
        <p v-if="verdict && ratioText" class="text-body-1">
          <strong>{{ verdict }}.</strong> {{ ratioText }}
          {{ verdictNote }}
        </p>
        <!-- Contra las piezas NUEVAS hay cociente pero no veredicto (24/11/2026): una PC usada casi
             siempre pide menos que armarla nueva, así que decirlo como veredicto sería decir lo obvio
             con tono de hallazgo. Se publica la cifra y se dice por qué no hay más. -->
        <p v-else-if="ratioText" class="text-body-1" data-testid="pc-ratio-new">
          {{ ratioText }} Sin veredicto: a alguna pieza le falta el precio usado, y contra piezas
          nuevas una usada casi siempre sale más barata.
        </p>
        <p v-else-if="computer.currencyInferred" class="text-body-1">
          No lo comparamos: la moneda del precio la dedujimos nosotros y podría no ser la del
          vendedor.
        </p>
        <p v-else-if="computer.faults?.length" class="text-body-1">
          No lo comparamos: el aviso declara una falla, y una máquina que no anda no se compara
          contra piezas que sí.
        </p>
        <p v-else class="text-body-1">
          Todavía no podemos compararlo: a alguna pieza le falta precio o identidad exacta (un total
          con piezas de menos daría un número más bajo que el real), o no hay suficientes avisos
          iguales para una mediana.
        </p>
        <p
          v-if="comparablesText && !comparablesIsReference"
          class="text-body-1"
          data-testid="pc-comparables"
        >
          {{ comparablesText }}.
          <span class="text-medium-emphasis">
            Son precios pedidos en otros avisos vigentes, sin contar los de moneda deducida.
          </span>
        </p>
        <p v-if="sameNewText" class="text-body-1" data-testid="pc-same-new">{{ sameNewText }}.</p>
      </section>

      <section v-if="data.similar.length" class="mt-8">
        <h2 class="text-h6 mb-3">{{ similarTitle }}</h2>
        <div class="pc-grid">
          <ComputadorasListingCard
            v-for="other in data.similar"
            :key="other.slug"
            :computer="other"
          />
        </div>
      </section>

      <p class="text-body-2 text-medium-emphasis mt-8" data-testid="pc-method-note">
        Los precios de las piezas son medianas: nuevas, de las ofertas de Mercado Libre Uruguay y de
        tiendas de informática uruguayas; usadas, de los avisos de piezas sueltas de Facebook
        Marketplace y Mercado Libre, leídos el
        {{ readAt || 'día de la última corrida' }}. Las especificaciones son lo que dice el aviso,
        no las verificamos. Es un precio pedido, no una tasación: pedí ver la máquina encendida
        antes de pagar.
      </p>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import {
  COMPUTADORAS_PATH,
  COMPUTER_OPPORTUNITIES_PATH,
  COMPUTER_BASIS_LABEL,
  COMPUTER_CONDITION_LABEL,
  COMPUTER_KIND_LABEL,
  COMPUTER_KIND_PLURAL,
  COMPUTER_SOURCE_LABEL,
  computerAvisoPath,
  computerComparablesText,
  computerCpuFamilyLabel,
  computerFaultsLine,
  computerIdentityLine,
  computerOpportunityDetail,
  computerOpportunityLine,
  computerGpuLabel,
  computerIncludesText,
  computerLongDate,
  computerPlace,
  computerPriceLine,
  computerRamLabel,
  computerRatioText,
  computerReferenceOf,
  computerSafePermalink,
  computerSameNewText,
  computerScreenLabel,
  computerSeriesYearText,
  computerStorageLabel,
  computerVerdictLabel,
  type ComputerAvisoResponse,
} from '~/utils/computadoras'

// Un slug con forma imposible es un 404 ANTES de tocar la base. La macro sólo ve imports, nunca
// constantes del `<script setup>` (la trampa que documenta `carKeyValid`).
definePageMeta({
  validate: async route => {
    const computadoras = await import('~/utils/computadoras')
    return computadoras.computerAvisoSlugValid(String(route.params.slug ?? ''))
  },
})

const route = useRoute()
const localePath = useLocalePath()
const slug = computed(() => String(route.params.slug || ''))
const { data, error } = await useAsyncData<ComputerAvisoResponse>(
  () => `computadora-aviso-${slug.value}`,
  () => $fetch<ComputerAvisoResponse>(`/api/computadoras/aviso/${encodeURIComponent(slug.value)}`)
)
const failureCode = computed(() => {
  const failure = error.value as { statusCode?: number; data?: { statusCode?: number } } | null
  return failure?.statusCode === 404 || failure?.data?.statusCode === 404 ? 404 : 503
})
if (import.meta.server && (error.value || !data.value)) {
  const event = useRequestEvent()
  if (event) {
    setResponseStatus(event, failureCode.value)
    useResponseHeader('cache-control').value = 'no-store, max-age=0'
  }
}

// Todo lo que cuelga del aviso sigue vivo con `computer === null` (aviso vencido): una lectura
// ansiosa adentro de setup convierte el 404 en un 500 (medido en autos el 22/9/2026).
const computer = computed(() => data.value?.computer ?? null)
const photoFailed = ref(false)
const price = computed(() =>
  computer.value
    ? computerPriceLine(computer.value)
    : { main: '', usd: null as string | null, inferred: null as string | null }
)
const verdict = computed(() => (computer.value ? computerVerdictLabel(computer.value) : null))
const ratioText = computed(() => (computer.value ? computerRatioText(computer.value) : null))
const faults = computed(() => computerFaultsLine(computer.value?.faults ?? []))
// `?? null`: una fila escrita antes del 24/11/2026 no trae la oportunidad.
const deal = computed(() => computerOpportunityLine(computer.value?.opportunity ?? null))
const dealDetail = computed(() =>
  computer.value ? computerOpportunityDetail(computer.value) : null
)
const place = computed(() => (computer.value ? computerPlace(computer.value) : ''))
const comparablesText = computed(() => computerComparablesText(computer.value?.comparables))
const sameNewText = computed(() => computerSameNewText(computer.value?.valuation))
const readAt = computed(() => computerLongDate(data.value?.generatedAt || null))
/** El enlace al aviso original, sólo si es de una fuente conocida (Marketplace o ML Uruguay). */
const safePermalink = computed(() => computerSafePermalink(computer.value?.url))

const kindLine = computed(() => {
  const item = computer.value
  if (!item) return ''
  return [
    COMPUTER_KIND_LABEL[item.kind] ?? item.kind,
    item.brand,
    item.condition ? COMPUTER_CONDITION_LABEL[item.condition] : null,
  ]
    .filter(Boolean)
    .join(' · ')
})

/** Qué quiere decir el veredicto, sin decir que convenga: eso depende de lo que el aviso no dice. */
const verdictNote = computed(() => {
  const item = computer.value
  const tone = item?.valuation?.verdict
  if (tone === 'muy-por-debajo' || tone === 'por-debajo')
    return 'Un precio bajo puede ser una buena compra o una máquina con algo que el aviso no cuenta: pedí verla encendida.'
  if (tone === 'por-encima')
    return item?.kind === 'desktop'
      ? 'Pagar más que las piezas puede tener sentido si viene armada, probada o con garantía; si no, armarla sale menos.'
      : 'Pedir más puede tener sentido si está en mejor estado o trae garantía: preguntalo antes de ofertar.'
  return ''
})
/** Si el veredicto ya se midió contra las iguales, el párrafo de comparables repetiría la cifra. */
const comparablesIsReference = computed(() =>
  computer.value
    ? computerReferenceOf(computer.value, computer.value.valuation?.reference) === 'comparables' &&
      !!ratioText.value
    : false
)

/**
 * La tabla de lo que dice el aviso. Cada dato del procesador y de la placa dice de dónde salió
 * (`basis`); lo derivado (socket, tipo de RAM, año de la serie) se dice como derivado. Un dato que
 * el aviso no trae no aparece: «no informado» en cada fila sería ruido.
 */
const specRows = computed(() => {
  const item = computer.value
  if (!item) return []
  const rows: Array<{ label: string; value: string; detail?: string }> = []
  if (item.cpu) {
    const derived = [
      item.cpu.model ? null : `${computerCpuFamilyLabel(item.cpu.family)} sin modelo exacto`,
      item.cpu.generation ? `${item.cpu.generation}.ª generación` : null,
      item.cpu.socket ? `socket ${item.cpu.socket}` : null,
      item.cpu.ramType ? `usa ${item.cpu.ramType.toUpperCase()}` : null,
      item.cpu.mobile ? 'procesador de notebook' : null,
      computerSeriesYearText(item.cpu.year),
    ].filter(Boolean)
    rows.push({
      label: 'Procesador',
      value: item.cpu.label,
      detail: [COMPUTER_BASIS_LABEL[item.cpu.basis], derived.join(' · ')]
        .filter(Boolean)
        .join('. '),
    })
  }
  const gpu = computerGpuLabel(item)
  if (gpu && item.gpu) {
    rows.push({
      label: 'Placa de video',
      value: gpu,
      detail: [COMPUTER_BASIS_LABEL[item.gpu.basis], computerSeriesYearText(item.gpu.year)]
        .filter(Boolean)
        .join('. '),
    })
  }
  const ram = computerRamLabel(item)
  if (ram) rows.push({ label: 'Memoria RAM', value: ram })
  const storage = computerStorageLabel(item.storage)
  if (storage) rows.push({ label: 'Almacenamiento', value: storage })
  const screen = computerScreenLabel(item.screenInches)
  if (screen) rows.push({ label: 'Pantalla', value: screen.replace('Pantalla de ', '') })
  if (item.chipset) rows.push({ label: 'Mother (chipset)', value: item.chipset.toUpperCase() })
  if (item.psuWatts) rows.push({ label: 'Fuente', value: `${item.psuWatts} W` })
  const includes = computerIncludesText(item.includes)
  if (includes) rows.push({ label: 'Qué trae', value: includes })
  if (item.condition)
    rows.push({ label: 'Estado declarado', value: COMPUTER_CONDITION_LABEL[item.condition] })
  // La línea y el modelo van primero: es lo que se busca («una ThinkPad T490»).
  const identity = computerIdentityLine(item)
  if (identity)
    rows.unshift({ label: 'Línea y modelo', value: identity, detail: 'Según el título' })
  return rows
})

const similarTitle = computed(() => {
  const item = computer.value
  if (!item) return ''
  const kind = COMPUTER_KIND_PLURAL[item.kind] ?? item.kind
  return item.cpuFamily
    ? `Otras ${kind} con ${computerCpuFamilyLabel(item.cpuFamily)}`
    : `Otras ${kind} publicadas`
})

const breadcrumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Computadoras usadas', to: localePath(COMPUTADORAS_PATH) },
  { title: computer.value ? (COMPUTER_KIND_LABEL[computer.value.kind] ?? 'Aviso') : 'Aviso' },
])

const canonical = computed(() => `https://cambio-uruguay.com${computerAvisoPath(slug.value)}`)
const title = computed(() =>
  computer.value ? computer.value.title.slice(0, 55).trim() : 'Aviso de computadora usada'
)
const description = computed(() =>
  computer.value
    ? `${computer.value.title.slice(0, 80)}: ${price.value.main}. Lo que dice el aviso y cuánto salen hoy sus piezas en Uruguay.`
    : 'Aviso de computadora usada en Uruguay.'
)
useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  // Un aviso vence en días: la página ayuda a decidir, no pertenece al índice.
  robots: 'noindex, follow',
})
// Una tarjeta estática para todos los avisos, como autos y motos: dibujar una por aviso y por idioma
// es el costo a evitar en páginas noindex que vencen en días.
defineOgImage({ url: '/img/og.png', width: 1536, height: 1024 })
useHead(() => ({
  link: [{ rel: 'canonical', href: canonical.value }],
  script: computer.value
    ? [
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
                    name: 'Inicio',
                    item: 'https://cambio-uruguay.com/',
                  },
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: 'Computadoras usadas',
                    item: `https://cambio-uruguay.com${COMPUTADORAS_PATH}`,
                  },
                  {
                    '@type': 'ListItem',
                    position: 3,
                    name: computer.value.title,
                    item: canonical.value,
                  },
                ],
              },
            ],
          }),
        },
      ]
    : [],
}))
</script>

<style scoped>
.pc-photo {
  aspect-ratio: 3 / 2;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.pc-photo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.pc-kind {
  margin: 0 0 4px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-heading {
  overflow-wrap: anywhere;
}
.pc-deal {
  border: 1px solid rgba(var(--v-theme-success), 0.4);
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-success), 0.06);
  max-width: 76ch;
}
.pc-flag {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1.3;
  border-radius: 8px;
  padding: 3px 10px;
  border: 1px solid currentColor;
  color: rgb(var(--v-theme-warning));
}
.v-theme--light .pc-flag {
  color: #9a5800;
}
.pc-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px 16px;
  margin: 0;
}
.pc-facts dt {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-facts dd {
  margin: 0;
  font-weight: 500;
}
.pc-scroll {
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  max-width: 760px;
}
.pc-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.pc-table th,
.pc-table td {
  padding: 8px 12px;
  text-align: left;
  vertical-align: top;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pc-table tr:first-child th,
.pc-table tr:first-child td {
  border-top: 0;
}
.pc-table th {
  width: 34%;
  font-weight: 600;
}
.pc-table__detail {
  display: block;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}
@media (min-width: 600px) {
  .pc-grid {
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 16px;
  }
}
</style>
