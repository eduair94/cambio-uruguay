<!--
THESIS: «¿Cuánto sale una notebook usada?» se contesta con medianas por lo que de verdad mueve el
precio —marca, procesador, generación, RAM, placa, el chip de una MacBook— y cada una con cuántos
avisos la sostienen. Sale de los mismos avisos del directorio de computadoras usadas, y cada fila
lleva a ellos.
OWN-WORLD: La estructura de /mercado-de-autos-usados-uruguay (seis números, lo que dicen los datos,
franjas, tablas por dimensión, presupuestos, cómo usarlo, método y límites).
FAMILY: Sólo español, como el directorio: el canonical es literal.
-->
<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Computadoras usadas', to: localePath(COMPUTADORAS_PATH) },
        { title: 'Precios de notebooks' },
      ]"
      class="px-0 pb-2"
    />

    <header class="mb-6">
      <h1 class="pc-title">Precios de notebooks usadas en Uruguay</h1>
      <p class="lead">
        Cuánto se pide hoy por una notebook usada según la marca, el procesador, su generación, la
        RAM y la placa de video, la escalera de precios de las MacBook por año y por chip, y qué se
        consigue con cada presupuesto.
        <template v-if="report">
          Sale de <strong>{{ report.total.toLocaleString('es-UY') }} notebooks</strong> publicadas
          en Facebook Marketplace y Mercado Libre, sin fallas declaradas{{
            readAt ? `, leídas el ${readAt}` : ''
          }}.
        </template>
      </p>
      <VAlert type="info" variant="outlined" density="comfortable">
        <strong>Son precios pedidos en avisos, no precios de venta.</strong> Nadie publica cuánto se
        pagó por una notebook usada en Uruguay: lo que se puede medir es la oferta, y cada cifra va
        con la cantidad de avisos que la sostiene.
      </VAlert>
    </header>

    <VAlert
      v-if="payload.status === 'preparing'"
      type="info"
      variant="tonal"
      density="comfortable"
      icon="mdi-progress-clock"
      class="mb-6"
    >
      <strong>El informe se está calculando.</strong> Sale de la corrida diaria del
      <NuxtLink :to="localePath(COMPUTADORAS_PATH)">directorio de computadoras usadas</NuxtLink>:
      volvé en unas horas.
    </VAlert>
    <VAlert
      v-else-if="payload.status === 'unavailable'"
      type="warning"
      variant="tonal"
      density="comfortable"
      icon="mdi-database-off-outline"
      class="mb-6"
    >
      No pudimos leer el informe en este momento. Probá de nuevo en unos minutos.
    </VAlert>

    <template v-if="report">
      <section class="pc-section" aria-labelledby="nb-numeros">
        <h2 id="nb-numeros">Las notebooks usadas en seis números</h2>
        <div class="nb-cards">
          <div v-for="card in headline" :key="card.label" class="nb-card">
            <p class="nb-card__label">{{ card.label }}</p>
            <p class="nb-card__value">{{ card.value }}</p>
            <p class="nb-card__note">{{ card.note }}</p>
          </div>
        </div>
      </section>

      <section v-if="findings.length" class="pc-section" aria-labelledby="nb-datos">
        <h2 id="nb-datos">Lo que dicen los datos</h2>
        <ul class="nb-findings">
          <li v-for="finding in findings" :key="finding">{{ finding }}</li>
        </ul>
      </section>

      <section v-if="report.priceBands.length" class="pc-section" aria-labelledby="nb-franjas">
        <h2 id="nb-franjas">Cuántas hay en cada franja de precio</h2>
        <div class="pc-scroll">
          <table class="pc-table">
            <thead>
              <tr>
                <th scope="col">Franja</th>
                <th scope="col" class="num">Avisos</th>
                <th scope="col" class="num">Parte</th>
                <th scope="col" class="nb-bar-col"><span class="sr-only">Proporción</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="band in report.priceBands" :key="band.id">
                <th scope="row">
                  <NuxtLink :to="localePath(bandLink(band.minUsd, band.maxUsd))">
                    {{ band.label || computerBandLabel(band.minUsd, band.maxUsd) }}
                  </NuxtLink>
                </th>
                <td class="num">{{ band.n.toLocaleString('es-UY') }}</td>
                <td class="num">{{ computerPercent(band.n / report.total) }}</td>
                <td class="nb-bar-col">
                  <span class="nb-bar" :style="{ width: `${(band.n / maxBand) * 100}%` }" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="report.brands.length" class="pc-section" aria-labelledby="nb-marcas">
        <h2 id="nb-marcas">Por marca</h2>
        <p class="section-note">
          La marca arrastra la línea y el procesador: una Apple y una Lenovo no se comparan por la
          marca sola. Sirve para saber dónde está cada una, no para elegir.
        </p>
        <ComputadorasReportTable
          :rows="report.brands"
          first-column="Marca"
          :link="cell => computerNotebookLink({ marcaEquipo: cell.label })"
        />
      </section>

      <section v-if="report.families.length" class="pc-section" aria-labelledby="nb-familias">
        <h2 id="nb-familias">Por familia de procesador</h2>
        <p class="section-note">
          Un Core i5 de 2014 y uno de 2023 comparten nombre y no rendimiento: la tabla de abajo los
          separa por generación.
        </p>
        <ComputadorasReportTable
          :rows="report.families"
          first-column="Procesador"
          :link="cell => computerNotebookLink({ familia: cell.id })"
        />
      </section>

      <section v-if="report.generations.length" class="pc-section" aria-labelledby="nb-generacion">
        <h2 id="nb-generacion">Core i5 y Core i7 por generación</h2>
        <p class="section-note">
          La generación sale del modelo exacto del procesador, y el año es el de la serie (cuándo
          salió), no el de la notebook. Con {{ report.ladderSample }} avisos o más por celda.
        </p>
        <ComputadorasReportTable
          :rows="generationRows"
          first-column="Procesador"
          :link="cell => computerNotebookLink({ familia: cell.family })"
        />
      </section>

      <section v-if="macLines.length" class="pc-section" aria-labelledby="nb-mac">
        <h2 id="nb-mac">La escalera de las MacBook</h2>
        <p class="section-note">
          Primero las Intel por año (el que dice el título), después los chips de Apple. En una Mac
          el chip dice más que el año: una M1 de 2020 pide más que cualquier Intel.
        </p>
        <div v-for="ladder in macLines" :key="ladder.line" class="mb-6">
          <h3 class="nb-subtitle">{{ ladder.label }}</h3>
          <ComputadorasReportTable
            :rows="ladder.rows"
            first-column="Año o chip"
            :link="() => computerNotebookLink({ marcaEquipo: 'Apple', linea: ladder.line })"
          />
        </div>
      </section>

      <section v-if="report.ram.length" class="pc-section" aria-labelledby="nb-ram">
        <h2 id="nb-ram">Por memoria RAM</h2>
        <ComputadorasReportTable
          :rows="ramRows"
          first-column="RAM"
          :link="cell => computerNotebookLink({ ramMin: cell.gb })"
        />
      </section>

      <section v-if="report.gpus.length" class="pc-section" aria-labelledby="nb-placas">
        <h2 id="nb-placas">Con placa de video dedicada</h2>
        <p class="section-note">
          El {{ computerPercent(report.headline.dedicatedShare) }} de las notebooks declara una
          placa dedicada: son las que se buscan para jugar, diseñar o editar video.
        </p>
        <ComputadorasReportTable
          :rows="report.gpus"
          first-column="Placa"
          :link="cell => computerNotebookLink({ dedicada: 1, q: computerGpuSearch(cell.label) })"
        />
      </section>

      <section v-if="report.models.length" class="pc-section" aria-labelledby="nb-modelos">
        <h2 id="nb-modelos">Los modelos con más oferta</h2>
        <p class="section-note">
          Son los que más avisos tienen, no los más vendidos. Un modelo con muchos avisos es fácil
          de comparar y de revender.
        </p>
        <ComputadorasReportTable
          :rows="report.models"
          first-column="Modelo"
          :link="cell => computerNotebookLink({ linea: cell.line, q: cell.label })"
        />
      </section>

      <!-- Con una sola fila no es una comparación: es una anécdota con forma de tabla. -->
      <section v-if="report.usedVsNew.length >= 2" class="pc-section" aria-labelledby="nb-nueva">
        <h2 id="nb-nueva">La usada contra la nueva</h2>
        <p class="section-note">
          La misma notebook (mismo procesador) usada y nueva en Mercado Libre. Cuanto más cerca del
          100 %, menos conviene la usada: la nueva trae garantía y batería sin uso.
        </p>
        <div class="pc-scroll">
          <table class="pc-table">
            <thead>
              <tr>
                <th scope="col">Procesador</th>
                <th scope="col" class="num">Usada</th>
                <th scope="col" class="num">Nueva</th>
                <th scope="col">La usada pide</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in report.usedVsNew" :key="row.id">
                <th scope="row">{{ row.label }}</th>
                <td class="num">
                  {{ computerUsd(row.usedUsd) }}
                  <span class="pc-table__detail">{{ row.usedN }} avisos</span>
                </td>
                <td class="num">
                  {{ computerUsd(row.newUsd) }}
                  <span class="pc-table__detail">{{ row.newN }} ofertas</span>
                </td>
                <td>el {{ computerPercent(row.share) }} de la nueva</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="report.budgets.length" class="pc-section" aria-labelledby="nb-presupuesto">
        <h2 id="nb-presupuesto">Qué conseguís con cada presupuesto</h2>
        <div class="nb-budgets">
          <article v-for="budget in report.budgets" :key="budget.id" class="nb-budget">
            <h3>
              <NuxtLink :to="localePath(bandLink(budget.minUsd, budget.maxUsd))">
                {{ budget.label || computerBandLabel(budget.minUsd, budget.maxUsd) }}
              </NuxtLink>
            </h3>
            <p class="nb-budget__n">{{ budget.n.toLocaleString('es-UY') }} avisos</p>
            <ul>
              <li v-if="budget.ramGb && budget.ramShare != null">
                La RAM más común: {{ budget.ramGb }} GB ({{ computerPercent(budget.ramShare) }})
              </li>
              <li v-if="budget.ssdShare != null">
                Con SSD: {{ computerPercent(budget.ssdShare) }} de las que dicen el disco
              </li>
              <li>Con placa dedicada: {{ computerPercent(budget.dedicatedShare) }}</li>
              <li v-if="budget.families.length">
                Procesadores:
                {{ budget.families.map(row => `${row.label} (${row.n})`).join(', ') }}
              </li>
              <li v-if="budget.lines.length">
                Líneas: {{ budget.lines.map(row => `${row.label} (${row.n})`).join(', ') }}
              </li>
            </ul>
          </article>
        </div>
      </section>

      <section class="pc-section" aria-labelledby="nb-elegir">
        <h2 id="nb-elegir">Cómo usar esto para elegir</h2>
        <ol class="guide-list">
          <li>
            <strong>Mirá la generación antes que el «i5» o el «i7».</strong> Un i5 nuevo rinde más
            que un i7 de hace diez años y pide más por eso. Si el aviso no dice el modelo exacto,
            preguntalo.
          </li>
          <li>
            <strong>Con 8 GB de RAM y SSD, una notebook de oficina anda bien.</strong> Menos que eso
            se nota todos los días; más que eso sólo hace falta para jugar, diseñar o programar
            pesado.
          </li>
          <li>
            <strong>En una MacBook, el chip manda.</strong> Las M1 en adelante son otra máquina que
            las Intel: compará contra la escalera de arriba, no contra el año.
          </li>
          <li>
            <strong>Compará la usada con la nueva.</strong> Si la usada pide más del 80 % de lo que
            sale nueva, la nueva con garantía suele convenir.
          </li>
          <li>
            <strong>Antes de pagar, probala.</strong> Pedí que la prendan, mirá cuánto aguanta la
            batería, probá el teclado y la pantalla, y no mandes seña antes de verla. Las que piden
            bastante menos que sus iguales están en
            <NuxtLink :to="localePath(COMPUTER_OPPORTUNITIES_PATH)">oportunidades</NuxtLink>.
          </li>
        </ol>
      </section>

      <section class="pc-section" aria-labelledby="nb-metodo">
        <h2 id="nb-metodo">Método y límites</h2>
        <ul class="guide-list">
          <li>
            Son <strong>precios pedidos en avisos</strong>, no precios de venta cerrados ni
            tasaciones. Los avisos en pesos se convierten a dólares con la cotización de la corrida.
          </li>
          <li>
            Una mediana se publica con {{ report.minSample }} avisos o más; en la escalera de las
            MacBook y en las generaciones, con {{ report.ladderSample }}. Debajo de eso es una
            anécdota, y la fila no aparece.
          </li>
          <li>
            Quedan afuera los avisos que declaran una falla («no enciende», «para repuesto») y
            aquellos cuya moneda dedujimos nosotros: Facebook marca todo en pesos por defecto.
          </li>
          <li>
            <strong>Casi la mitad de los avisos no dice el procesador.</strong> Entran en el total,
            en las franjas y en la marca, pero no en las tablas por procesador ni por generación.
          </li>
          <li>Las especificaciones son lo que escribió el vendedor: no las verificamos.</li>
        </ul>
      </section>

      <section class="pc-section">
        <h2>Seguí con el detalle</h2>
        <VRow dense>
          <VCol cols="12" md="4">
            <VCard variant="outlined" :to="localePath(computerNotebookLink({}))" class="pa-4 h-100">
              <p class="card-title">Las notebooks usadas publicadas</p>
              <p class="card-text">
                Los avisos de hoy, con filtros por marca, línea, procesador, RAM y pantalla.
              </p>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard
              variant="outlined"
              :to="localePath(COMPUTER_OPPORTUNITIES_PATH)"
              class="pa-4 h-100"
            >
              <p class="card-title">Oportunidades</p>
              <p class="card-text">Las que piden bastante menos que sus iguales o sus piezas.</p>
            </VCard>
          </VCol>
          <VCol cols="12" md="4">
            <VCard variant="outlined" :to="localePath(COMPUTER_COMPONENTS_PATH)" class="pa-4 h-100">
              <p class="card-title">Precios de componentes de PC</p>
              <p class="card-text">Procesadores, placas, RAM y discos, nuevos y usados, hoy.</p>
            </VCard>
          </VCol>
        </VRow>
      </section>

      <FaqSection v-if="faq.length" :items="faq" heading="Preguntas frecuentes" :expanded="true" />
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'
import {
  COMPUTADORAS_PATH,
  COMPUTER_COMPONENTS_PATH,
  COMPUTER_NOTEBOOKS_PATH,
  COMPUTER_OPPORTUNITIES_PATH,
  computerBandLabel,
  computerLongDate,
  computerNotebookFaq,
  computerNotebookFindings,
  computerNotebookLink,
  computerPercent,
  computerUsd,
  type ComputerNotebookReportResponse,
} from '~/utils/computadoras'

const localePath = useLocalePath()

// Server-rendered: las medianas tienen que estar en el HTML que lee el buscador.
const { data } = await useAsyncData('computadoras-notebooks', () =>
  $fetch<ComputerNotebookReportResponse>('/api/computadoras/notebooks')
)
/** Con la forma vacía como piso: la página se dibuja aunque el informe no exista todavía. */
const payload = computed<ComputerNotebookReportResponse>(
  () => data.value ?? { status: 'unavailable', generatedAt: '', report: null }
)
// Un informe sin notebooks no es un informe: se trata como «todavía no hay».
const report = computed(() =>
  payload.value.report && payload.value.report.total > 0 ? payload.value.report : null
)
const readAt = computed(() => computerLongDate(payload.value.generatedAt || null))
const findings = computed(() => (report.value ? computerNotebookFindings(report.value) : []))
const faq = computed<FaqItem[]>(() => computerNotebookFaq(report.value))
const maxBand = computed(() => Math.max(1, ...(report.value?.priceBands ?? []).map(b => b.n)))

const headline = computed(() => {
  const value = report.value
  if (!value) return []
  const h = value.headline
  return [
    {
      label: 'Notebooks publicadas',
      value: value.total.toLocaleString('es-UY'),
      note: 'sin fallas declaradas',
    },
    { label: 'Precio mediano', value: computerUsd(h.medianUsd), note: 'la mitad pide menos' },
    {
      label: 'La mitad del medio',
      // Compacto para que entre en una tarjeta angosta: «US$ 239–800».
      value: `${computerUsd(h.p25Usd)}–${Math.round(h.p75Usd).toLocaleString('es-UY')}`,
      note: 'del cuarto más barato al más caro',
    },
    { label: 'Son Apple', value: computerPercent(h.appleShare), note: 'MacBook Air y Pro' },
    {
      label: 'Con placa dedicada',
      value: computerPercent(h.dedicatedShare),
      note: 'NVIDIA o AMD declarada',
    },
    {
      label: `Menos de ${computerUsd(300)}`,
      value: computerPercent(h.under300Share),
      note: 'de todas las publicadas',
    },
  ]
})

const generationRows = computed(() =>
  (report.value?.generations ?? []).map(cell => ({
    ...cell,
    label: `${cell.label}${cell.year ? ` (serie ~${cell.year})` : ''}`,
  }))
)
const ramRows = computed(() =>
  (report.value?.ram ?? []).map(cell => ({ ...cell, label: cell.label || `${cell.gb} GB` }))
)
/** La escalera de cada línea, en el orden que fija el job (años y después chips). */
const macLines = computed(() => {
  const cells = report.value?.macLadder ?? []
  return ['macbook-air', 'macbook-pro']
    .map(line => ({
      line,
      label: line === 'macbook-air' ? 'MacBook Air' : 'MacBook Pro',
      rows: cells.filter(cell => cell.line === line).sort((a, b) => a.order - b.order),
    }))
    .filter(ladder => ladder.rows.length)
})
/**
 * La placa de una notebook no tiene identidad de pieza (una RTX 3050 de notebook no es la de
 * escritorio, y el job no le pone `gpuSlug`), así que el enlace busca su nombre en el título, sin la
 * marca: los avisos escriben «Rtx 3050», casi nunca «NVIDIA».
 */
const computerGpuSearch = (label: string) => label.replace(/^(?:nvidia|amd|intel)\s+/i, '')
/** Una franja de precio, como enlace al directorio de notebooks con ese rango. */
const bandLink = (minUsd: number, maxUsd: number | null) =>
  computerNotebookLink({ precioMinUsd: minUsd || null, precioMaxUsd: maxUsd })

// ── SEO ────────────────────────────────────────────────────────────────────
const CANONICAL = `https://cambio-uruguay.com${COMPUTER_NOTEBOOKS_PATH}`
const TITLE = 'Precios de notebooks usadas en Uruguay'
const DESCRIPTION =
  'Cuánto se pide por una notebook usada según marca, procesador, generación y RAM, la escalera de las MacBook y qué compra cada presupuesto.'

defineOgImageComponent('Cambio', {
  title: TITLE,
  subtitle: 'Por marca, procesador, RAM y chip de Mac',
  tag: 'NOTEBOOKS · PRECIOS',
})

useSeoMeta({
  title: `${TITLE} | Cambio Uruguay`,
  description: DESCRIPTION,
  ogTitle: TITLE,
  ogDescription: DESCRIPTION,
  ogUrl: CANONICAL,
  ogType: 'article',
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: TITLE,
            description: DESCRIPTION,
            url: CANONICAL,
            datePublished: '2026-11-24',
            dateModified: (payload.value.generatedAt || '2026-11-24').slice(0, 10),
          },
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
              { '@type': 'ListItem', position: 3, name: 'Precios de notebooks', item: CANONICAL },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Rol Display de DESIGN.md (el idiom .hero-title). */
.pc-title {
  margin: 0 0 8px;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
/* El reset de Vuetify 4 no cero-ea el margen de bloque del texto (app/AGENTS.md). */
.lead {
  max-width: 72ch;
  margin: 0 0 12px;
}
.pc-section {
  margin-top: 40px;
}
.pc-section h2 {
  margin: 0 0 12px;
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  line-height: 1.2;
  font-weight: 700;
}
.section-note {
  margin: 0 0 12px;
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.nb-subtitle {
  margin: 0 0 8px;
  font-size: 1.1rem;
  font-weight: 700;
}
.nb-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
  gap: 12px;
}
.nb-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 12px 14px;
  background: rgb(var(--v-theme-surface));
}
.nb-card__label,
.nb-card__note {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.nb-card__value {
  margin: 4px 0;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.nb-findings {
  margin: 0;
  padding-left: 20px;
  max-width: 76ch;
}
.nb-findings li {
  margin-top: 8px;
}
.pc-scroll {
  /* El texto para lectores de pantalla va en posición absoluta: sin este ancla se ubica contra
     la página entera, se escapa del scroll y la ensancha (medido: 461 px en un celular de 400). */
  position: relative;
  overflow-x: auto;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.pc-table {
  width: 100%;
  min-width: 480px;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.pc-table th,
.pc-table td {
  padding: 8px 12px;
  text-align: left;
  vertical-align: middle;
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.pc-table thead th {
  border-top: 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.pc-table tbody th {
  font-weight: 600;
}
.pc-table .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.pc-table__detail {
  display: block;
  font-size: 0.75rem;
  font-weight: 400;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.nb-bar-col {
  width: 40%;
}
.nb-bar {
  display: block;
  height: 10px;
  min-width: 2px;
  border-radius: 8px;
  background: rgb(var(--v-theme-primary));
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.nb-budgets {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: 16px;
}
.nb-budget {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 14px 16px;
  background: rgb(var(--v-theme-surface));
}
.nb-budget h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}
.nb-budget__n {
  margin: 2px 0 8px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.nb-budget ul {
  margin: 0;
  padding-left: 18px;
  font-size: 0.875rem;
}
.nb-budget li {
  margin-top: 4px;
}
.guide-list {
  margin: 0;
  padding-left: 20px;
  max-width: 76ch;
}
.guide-list li {
  margin-top: 8px;
}
.card-title {
  margin: 0;
  font-weight: 700;
}
.card-text {
  margin: 6px 0 0;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
</style>
