<!--
THESIS: "Hasta 70 % OFF" en CyberLunes y Black Friday es fácil de anunciar y difícil de comprobar. Esta
página no lo cree ni lo desmiente en general: mide, oferta por oferta, contra el propio historial de
precios de las tiendas que ya relevamos para /equipar-casa-uruguay y /sillas-escritorio-uruguay.
OWN-WORLD: hereda tipografía, superficies y azules semánticos del resto del sitio.
STORY: primero cuándo es (con fuente), después la regla ("cómo medimos"), después los datos de hoy
—bajas reales primero, tachados por encima después, siempre con la salvedad de que sólo vemos lo que
relevamos—, la serie de 30 días, y por último el marco legal real (sin la regla europea de 30 días que
no rige acá) y el FAQ.
FIRST VIEWPORT: título, bajada y bloque de fechas, todo texto plano server-rendered.
FORM: página de lectura; sin calculadora ni estado que el visitante edite.
-->
<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">CyberLunes y Black Friday · Uruguay</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        CyberLunes y Black Friday en Uruguay: ¿el descuento es real?
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-2">
        "Hasta 70 % OFF" es fácil de anunciar. Acá no lo damos por sentado en general: comparamos,
        oferta por oferta, el precio de hoy contra el propio historial de precios de las tiendas que
        ya relevamos todos los días para
        <NuxtLink :to="localePath('/equipar-casa-uruguay')">/equipar-casa-uruguay</NuxtLink>
        y
        <NuxtLink :to="localePath('/sillas-escritorio-uruguay')"
          >/sillas-escritorio-uruguay</NuxtLink
        >.
      </p>
      <p v-if="current?.generatedAt" class="as-of text-caption text-medium-emphasis">
        Actualizado el {{ priceEventFormatDate(current.generatedAt) }}.
      </p>
    </header>

    <!-- ── Fechas ────────────────────────────────────────────────────────── -->
    <section class="page-section" aria-labelledby="fechas-title">
      <h2 id="fechas-title" class="section-heading mb-3">Cuándo es</h2>

      <VCard v-if="countdown" variant="flat" class="countdown-card pa-4 pa-sm-5 mb-4">
        <p class="countdown-headline mb-1">{{ priceEventCountdownHeadline(countdown) }}</p>
        <p
          v-if="countdown.status === 'upcoming' || countdown.status === 'first-day'"
          class="text-body-2 text-medium-emphasis mb-2"
        >
          {{ priceEventDateRangeLabel(countdown.event) }}
        </p>
        <p
          v-else-if="countdown.status === 'undated' && countdown.event.note"
          class="text-body-2 text-medium-emphasis mb-2"
        >
          {{ countdown.event.note }}
        </p>
        <a
          v-if="countdown.event?.source"
          :href="countdown.event.source"
          target="_blank"
          rel="noopener noreferrer"
          class="source-link"
        >
          Fuente
        </a>
        <p
          v-else-if="
            countdown.status !== 'undated' && countdown.status !== 'none' && countdown.event?.note
          "
          class="text-caption text-medium-emphasis mb-0"
        >
          {{ countdown.event?.note }}
        </p>
      </VCard>

      <!--
        La edición sin fecha nunca desaparece sólo porque OTRO evento (con fecha ya conocida) haya
        ganado el titular de arriba: Black Friday tiene fecha fija y CyberLunes noviembre no, así que
        si el titular eligió a Black Friday, esta línea es la única mención de que CyberLunes también
        viene — "a confirmar por la CEDU" tiene que quedar visible, no perderse detrás del otro evento.
      -->
      <p v-if="otherUnconfirmedEvent" class="text-body-2 text-medium-emphasis mb-4">
        {{ otherUnconfirmedEvent.label }}: a confirmar por la CEDU.
        <a
          v-if="otherUnconfirmedEvent.source"
          :href="otherUnconfirmedEvent.source"
          target="_blank"
          rel="noopener noreferrer"
          class="source-link"
        >
          Fuente
        </a>
      </p>

      <div v-if="pastEditions.length" class="past-editions">
        <p class="text-subtitle-2 font-weight-bold mb-2">Ediciones anteriores</p>
        <ul class="past-list">
          <li v-for="edition in pastEditions" :key="edition.key">
            <span class="past-label">{{ edition.label }}</span>
            <span class="past-dates">{{ priceEventDateRangeLabel(edition) }}</span>
            <a
              v-if="edition.source"
              :href="edition.source"
              target="_blank"
              rel="noopener noreferrer"
              class="source-link"
            >
              Fuente
            </a>
            <span v-else-if="edition.note" class="past-note">{{ edition.note }}</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- ── Cómo medimos ─────────────────────────────────────────────────── -->
    <section class="page-section" aria-labelledby="metodo-title">
      <h2 id="metodo-title" class="section-heading mb-3">Cómo medimos</h2>
      <p class="text-body-2 mb-3">
        Todos los días guardamos un precio por oferta (no por producto): la misma heladera en la
        misma tienda, con su precio de venta y —cuando la tienda lo muestra— su precio de lista
        tachado al lado. Con ese historial propio comparamos el precio de HOY contra los últimos 60
        días de esa misma oferta, nunca contra otra tienda:
      </p>
      <ul class="method-list mb-3">
        <li>
          <strong>Baja real:</strong> el precio de venta de hoy es al menos 10 % más bajo que el
          mínimo que registramos para esa misma oferta.
        </li>
        <li>
          <strong>Tachado por encima del historial:</strong> el precio de lista (tachado) de hoy es
          al menos 10 % más alto que el máximo que registramos para esa misma oferta.
        </li>
      </ul>
      <p class="text-body-2 mb-3">
        Una oferta recién entra a esta comparación cuando lleva al menos 21 días en nuestro
        historial y tiene al menos 10 días con precio dentro de esos 60. Y una salvedad que vale
        para toda la página: <strong>sólo vemos las tiendas que relevamos</strong> para {{ ' '
        }}<NuxtLink :to="localePath('/equipar-casa-uruguay')">/equipar-casa-uruguay</NuxtLink>
        y
        <NuxtLink :to="localePath('/sillas-escritorio-uruguay')"
          >/sillas-escritorio-uruguay</NuxtLink
        >; una tienda fuera de esa lista puede tener una baja real o un precio tachado por encima de
        su historial y esta página no lo va a mostrar, simplemente porque no lo medimos.
      </p>
      <p v-if="current" class="text-body-2 text-medium-emphasis mb-0">
        {{ isToday ? 'Hoy' : `El ${snapshotDayLabel}` }} revisamos
        {{ current.analyzed.toLocaleString('es-UY') }}
        {{ priceEventPlural(current.analyzed, 'oferta', 'ofertas') }}; de esas,
        {{ current.eligible.toLocaleString('es-UY') }}
        {{ priceEventPlural(current.eligible, 'tenía', 'tenían') }} historial suficiente para
        clasificarse.
        <span v-if="verticalStats.length">
          Por rubro:
          <template v-for="(stat, index) in verticalStats" :key="stat.vertical">
            {{ index > 0 ? '; ' : '' }}{{ stat.label }} {{ stat.eligible.toLocaleString('es-UY') }}
            {{ priceEventPlural(stat.eligible, 'oferta', 'ofertas') }} ({{ stat.drops }}
            {{ priceEventPlural(stat.drops, 'baja', 'bajas') }},
            {{ stat.inflated }}
            {{
              priceEventPlural(stat.inflated, 'tachado por encima', 'tachados por encima')
            }})</template
          >.
        </span>
        <span v-if="mlSharePct !== null">
          Alrededor de {{ priceEventPct(mlSharePct) }} de esas ofertas vienen de MercadoLibre; el
          resto son tiendas propias.
        </span>
      </p>
    </section>

    <!-- ── Sin datos suficientes todavía ────────────────────────────────── -->
    <section v-if="!hasData" class="page-section" aria-labelledby="vacio-title">
      <h2 id="vacio-title" class="section-heading mb-3">Bajas y tachados de hoy</h2>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-database-clock-outline">
        {{ emptyStateMessage }}
      </VAlert>
    </section>

    <template v-else>
      <!-- ── Bajas reales de hoy (o del día del snapshot, si quedó viejo) ─── -->
      <section class="page-section" aria-labelledby="bajas-title">
        <h2 id="bajas-title" class="section-heading mb-1">
          Bajas reales {{ isToday ? 'de hoy' : `del ${snapshotDayLabel}` }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ todayDropsCount.toLocaleString('es-UY') }}
          {{ priceEventPlural(todayDropsCount, 'oferta bajó', 'ofertas bajaron') }} al menos 10 %
          contra su propio mínimo. Mostramos hasta 50, con un máximo de 3 bajas por vendedor para
          que ninguno domine la lista.
        </p>
        <p v-if="!dropRows.length" class="empty-note">
          {{ isToday ? 'Hoy' : `El ${snapshotDayLabel}` }} no encontramos ninguna baja real.
        </p>
        <VTable v-else class="cu-mobile-cards drops-table" density="compact">
          <thead>
            <tr>
              <th scope="col">Producto</th>
              <th scope="col">Tienda</th>
              <th scope="col" class="text-right">
                Precio {{ isToday ? 'de hoy' : `del ${snapshotDayLabel}` }}
              </th>
              <th scope="col" class="text-right">Mínimo registrado</th>
              <th scope="col" class="text-right">Baja</th>
              <th scope="col">Enlace</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in dropRows" :key="row.listingId">
              <td data-label="Producto">{{ row.title }}</td>
              <td data-label="Tienda">{{ row.sellerName }}</td>
              <td
                :data-label="isToday ? 'Precio de hoy' : `Precio del ${snapshotDayLabel}`"
                class="text-right price"
              >
                {{ formatCurrency(row.price, row.currency, 0) }}
              </td>
              <td data-label="Mínimo registrado" class="text-right price">
                {{ formatCurrency(row.priorMin, row.currency, 0) }}
              </td>
              <td data-label="Baja" class="text-right drop-pct">
                <span v-if="row.dropPct !== null">−{{ priceEventPct(row.dropPct) }}</span>
              </td>
              <!--
                Final review M6: cuando hay ficha propia, mostramos LAS DOS — la ficha (para quedarse
                en el sitio) Y la oferta externa (la prueba concreta del precio de hoy), no una en vez
                de la otra. F2 (hallazgo 1): el flex va en un <span> ADENTRO de la celda, nunca en el
                <td> mismo — un <td> con display:flex deja de comportarse como celda de tabla.
              -->
              <td data-label="Enlace">
                <span class="drop-links">
                  <NuxtLink v-if="row.internalHref" :to="localePath(row.internalHref)">
                    Ficha
                  </NuxtLink>
                  <!-- Oferta de un tercero: nunca le pasamos "voto" de enlace, como equipar/sillas. -->
                  <a :href="row.url" target="_blank" rel="nofollow noopener">Ver oferta</a>
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </section>

      <!-- ── Tachados por encima del historial ────────────────────────────── -->
      <section class="page-section" aria-labelledby="tachados-title">
        <!--
          I1 (final review): la primera versión ("Tiendas con precio tachado por encima de lo
          registrado") sonaba a lista de sospechosas incluso para una tienda con un 0 limpio. El
          título nuevo describe la MEDIDA ("cuántos quedan por encima"), no una acusación, y la bajada
          dice explícito que un 0 es un 0.
        -->
        <h2 id="tachados-title" class="section-heading mb-1">
          Precios tachados por tienda: cuántos quedan por encima de lo que registramos
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Para cada tienda con al menos 5 ofertas que pudimos clasificar con precio tachado
          {{ isToday ? 'hoy' : `el ${snapshotDayLabel}` }}, contamos cuántas de esas muestran un
          precio de lista al menos 10 % por encima del máximo que registramos en los 60 días
          anteriores (con al menos 10 días de datos). <strong>Un 0 es un 0</strong>: significa que
          ninguno de sus tachados quedó al menos 10 % por encima de ese máximo, no que la tienda no
          tenga descuentos. Es un conteo y una proporción contra nuestro propio historial, no una
          acusación: puede haber una explicación que no medimos, y esto no prueba que un precio
          anterior no haya existido.
        </p>
        <p v-if="!sellerRows.length" class="empty-note">
          {{ isToday ? 'Hoy' : `El ${snapshotDayLabel}` }} ninguna tienda llegó a las 5 ofertas con
          precio tachado.
        </p>
        <VTable v-else class="cu-mobile-cards sellers-table" density="compact">
          <thead>
            <tr>
              <th scope="col">Tienda</th>
              <th scope="col" class="text-right">Con precio tachado</th>
              <th scope="col" class="text-right">Por encima del historial</th>
              <th scope="col" class="text-right">Proporción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="seller in sellerRows" :key="seller.sellerKey">
              <td data-label="Tienda">{{ seller.sellerName }}</td>
              <td data-label="Con precio tachado" class="text-right">{{ seller.withListPrice }}</td>
              <td data-label="Por encima del historial" class="text-right">
                {{ seller.inflated }}
              </td>
              <td data-label="Proporción" class="text-right">{{ priceEventPct(seller.share) }}</td>
            </tr>
          </tbody>
        </VTable>
      </section>

      <!-- ── Serie de 30 días ─────────────────────────────────────────────── -->
      <section v-if="chart" class="page-section" aria-labelledby="serie-title">
        <h2 id="serie-title" class="section-heading mb-1">Los últimos 30 días</h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Bajas reales y precios tachados por encima del historial, contados por día.
        </p>
        <div class="chart-wrap">
          <ClientOnly>
            <ChartsLineChart
              :chart-data="chart.data"
              :options="chartOptions"
              :aria-label="chart.label"
            />
            <template #fallback>
              <VSkeletonLoader type="image" />
            </template>
          </ClientOnly>
        </div>
      </section>
    </template>

    <!-- ── Qué dice la ley ──────────────────────────────────────────────── -->
    <section v-if="legalScenario" class="page-section" aria-labelledby="ley-title">
      <h2 id="ley-title" class="section-heading mb-3">Qué dice la ley</h2>
      <!-- M10 (final review): sin esta línea, la cita legal justo debajo de la tabla de tiendas lee
           como un veredicto sobre ellas. Es el marco general, no una imputación. -->
      <p class="text-body-2 text-medium-emphasis mb-2">
        Esto es lo que dice la ley en general; la tabla de arriba no afirma que ninguna tienda la
        haya incumplido.
      </p>
      <p class="text-body-2 mb-3">{{ legalScenario.answer }}</p>
      <ul class="articles mb-3">
        <li v-for="(article, index) in legalScenario.articles" :key="index">{{ article }}</li>
      </ul>
      <p class="text-body-2">
        Guía completa, con plantilla de reclamo:
        <NuxtLink :to="localePath('/derechos-consumidor-compras-online')"
          >derechos del consumidor en compras online</NuxtLink
        >.
      </p>
    </section>

    <!-- ── Enlaces relacionados ─────────────────────────────────────────── -->
    <section class="page-section" aria-labelledby="relacionados-title">
      <h2 id="relacionados-title" class="section-heading mb-3">Seguí comparando</h2>
      <ul class="related-list">
        <li>
          <NuxtLink :to="localePath('/descuentos-con-tarjeta-uruguay')"
            >Descuentos con tarjeta</NuxtLink
          >
          <span>El mapa de promociones bancarias vigentes, no sólo en fechas de campaña.</span>
        </li>
        <li>
          <NuxtLink :to="localePath('/equipar-casa-uruguay')">Equipar una casa</NuxtLink>
          <span>Cuánto sale amueblar una casa vacía, con la mediana relevada por categoría.</span>
        </li>
        <li>
          <NuxtLink :to="localePath('/sillas-escritorio-uruguay')">Sillas de escritorio</NuxtLink>
          <span>Precios y tier list de sillas de oficina en Uruguay.</span>
        </li>
        <li>
          <NuxtLink :to="localePath('/derechos-consumidor-compras-online')"
            >Derechos del consumidor</NuxtLink
          >
          <span>Qué podés exigir si una compra online sale mal, con plantilla de reclamo.</span>
        </li>
      </ul>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />
  </VContainer>
</template>

<script setup lang="ts">
import { scenarioById } from '~/utils/consumerRights'
import { formatCurrency } from '~/utils/format'
import {
  priceEventCountdown,
  priceEventCountdownHeadline,
  priceEventDayLabel,
  priceEventDropRows,
  priceEventFaq,
  priceEventFormatDate,
  priceEventMlSharePct,
  priceEventMontevideoToday,
  priceEventOtherUnconfirmed,
  priceEventPastEditions,
  priceEventPct,
  priceEventPlural,
  type PriceEventApiResponse,
  type PriceEventCalendarEntry,
  type PriceEventDayPoint,
  type PriceEventDropRowFields,
  type PriceEventSellerStat,
  type PriceEventVerticalStats,
} from '~/utils/priceEvents'

const localePath = useLocalePath()

// Calculado UNA vez por request (`useState` hidrata el mismo valor del servidor en el cliente): el
// countdown de fechas nunca puede tickear en vivo, o SSR y cliente calculan un `today` distinto y
// Vue reporta un mismatch de hidratación en el primer render. Final review M4: "hoy" acá es la fecha
// CALENDARIO en América/Montevideo, no la fecha UTC del servidor — a la 01:30 UTC del 27 de
// noviembre en Montevideo todavía es 26.
const today = useState('ciberlunes-today', () => priceEventMontevideoToday())

// Final review M7: el `transform` recorta la respuesta cruda a sólo lo que esta página pinta ANTES de
// guardarla en el estado reactivo — `topDrops` completo trae `listPrice`/`priorMax`/`priorMedian`/
// `priorPoints`/`classes`, que ninguna fila de la tabla muestra (ver `PriceEventDropRowFields` en
// `utils/priceEvents.ts`). El recorte corre tanto en SSR como en el cliente, así que también reduce
// lo que queda embebido en el payload hidratado, no sólo lo que se pide de nuevo en el cliente.
interface PriceEventPageCurrent {
  day: string
  generatedAt: string
  trackingSince: string | null
  analyzed: number
  eligible: number
  byVertical: Record<string, PriceEventVerticalStats>
  dropsCount: number
  inflatedCount: number
  bySource: Record<string, number>
  topDrops: PriceEventDropRowFields[]
  sellers: PriceEventSellerStat[]
}
interface PriceEventPageData {
  current: PriceEventPageCurrent | null
  days: PriceEventDayPoint[]
}

const { data } = await useFetch('/api/price-events', {
  key: 'price-events',
  transform: (raw: PriceEventApiResponse): PriceEventPageData => ({
    current: raw.current
      ? {
          day: raw.current.day,
          generatedAt: raw.current.generatedAt,
          trackingSince: raw.current.trackingSince,
          analyzed: raw.current.analyzed,
          eligible: raw.current.eligible,
          byVertical: raw.current.byVertical,
          dropsCount: raw.current.dropsCount,
          inflatedCount: raw.current.inflatedCount,
          bySource: raw.current.bySource,
          sellers: raw.current.sellers,
          topDrops: raw.current.topDrops.map(d => ({
            listingId: d.listingId,
            vertical: d.vertical,
            category: d.category,
            productKey: d.productKey,
            sellerKey: d.sellerKey,
            sellerName: d.sellerName,
            title: d.title,
            url: d.url,
            currency: d.currency,
            price: d.price,
            priorMin: d.priorMin,
            dropPct: d.dropPct,
          })),
        }
      : null,
    days: raw.days,
  }),
})

const current = computed(() => data.value?.current ?? null)
const days = computed(() => data.value?.days ?? [])

const hasData = computed(() => !!current.value && current.value.eligible > 0)

// Final review M2: un snapshot viejo (una corrida flaca conservó el anterior, una caída del cron)
// nunca debe seguir diciendo "hoy" una vez que el calendario avanzó — las secciones de abajo usan
// `isToday`/`snapshotDayLabel` en vez del literal "hoy".
const snapshotDayLabel = computed(() =>
  current.value ? priceEventDayLabel(current.value.day, today.value) : 'hoy'
)
const isToday = computed(() => snapshotDayLabel.value === 'hoy')

// Final review M5: medido de `bySource`, nunca un porcentaje hardcodeado.
const mlSharePct = computed(() => priceEventMlSharePct(current.value))

const emptyStateMessage = computed(() => {
  if (current.value?.trackingSince) {
    return (
      `Todavía no tenemos historial suficiente: empezamos a guardar precios el ` +
      `${priceEventFormatDate(current.value.trackingSince)} y la regla pide al menos 21 días de ` +
      'historial propio antes de clasificar una oferta.'
    )
  }
  return (
    'Todavía no generamos ningún reporte para esta página: estamos empezando a guardar un precio ' +
    'diario por oferta en las tiendas que relevamos. Volvé a mirar más adelante.'
  )
})

const countdown = computed(() => priceEventCountdown(today.value))
const pastEditions = computed(() => priceEventPastEditions(today.value))

// La decisión de "¿hay una edición sin fecha que además haya que mostrar?" es pura y vive en
// priceEvents.ts (priceEventOtherUnconfirmed), probada ahí con sus ramas — acá sólo se llama.
const otherUnconfirmedEvent = computed(() => priceEventOtherUnconfirmed(today.value))

/** "Del 3 de noviembre de 2025 al 5 de noviembre de 2025." Se llama para un `countdown.event` con
 * `status` `upcoming`/`first-day` o para una edición de `pastEditions` — en la práctica siempre con
 * `start`/`end` no nulos (sólo la edición sin fecha confirmada los tiene en `null`, y esa nunca entra
 * acá) — pero el tipo sigue siendo `string | null`, así que esta función vive en el script (con un
 * `if` real) en vez de un `!` en el template. */
function priceEventDateRangeLabel(entry: PriceEventCalendarEntry | null): string {
  if (!entry?.start || !entry.end) return ''
  return `Del ${priceEventFormatDate(entry.start)} al ${priceEventFormatDate(entry.end)}.`
}

const todayDropsCount = computed(() => current.value?.dropsCount ?? 0)

const dropRows = computed(() => priceEventDropRows(current.value))
const sellerRows = computed(() => current.value?.sellers ?? [])
const faqItems = computed(() => priceEventFaq(current.value))
const legalScenario = scenarioById('precio-inflado-antes-de-la-oferta')

const PRICE_EVENT_VERTICAL_LABELS: Record<string, string> = {
  equipar: 'equipar una casa',
  sillas: 'sillas de escritorio',
  celulares: 'celulares',
}
const verticalStats = computed(() =>
  Object.entries(current.value?.byVertical ?? {}).map(([vertical, stats]) => ({
    vertical,
    label: PRICE_EVENT_VERTICAL_LABELS[vertical] ?? vertical,
    ...stats,
  }))
)

// ── Gráfico de 30 días ───────────────────────────────────────────────────
const chart = computed(() => {
  if (days.value.length < 2) return null
  const labels = days.value.map(d => `${d.day.slice(8, 10)}/${d.day.slice(5, 7)}`)
  return {
    data: {
      labels,
      datasets: [
        {
          label: 'Bajas reales',
          data: days.value.map(d => d.drops),
          borderColor: '#1565c0',
          backgroundColor: '#1565c0',
          tension: 0.2,
        },
        {
          label: 'Tachados por encima',
          data: days.value.map(d => d.inflated),
          borderColor: '#c62828',
          backgroundColor: '#c62828',
          tension: 0.2,
        },
      ],
    },
    label: `Bajas reales y precios tachados por encima del historial, por día, del ${priceEventFormatDate(days.value[0]!.day)} al ${priceEventFormatDate(days.value[days.value.length - 1]!.day)}`,
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: {
    x: { ticks: { maxRotation: 0, autoSkipPadding: 12 } },
    y: { ticks: { precision: 0 } },
  },
}

// ── SEO ────────────────────────────────────────────────────────────────────
const canonicalUrl = 'https://cambio-uruguay.com/ciberlunes-y-black-friday-uruguay'
// 43 caracteres: con " | Cambio Uruguay" (17) entra justo en el presupuesto de 60 del SERP que
// vigila `tests/unit/seoTitleBudget.test.ts`. El H1 sí puede ser más largo y explícito.
const title = 'CyberLunes y Black Friday: ¿descuento real?'
const description =
  'Bajas reales y precios tachados por encima del historial propio en CyberLunes y Black Friday ' +
  'Uruguay: qué tiendas relevamos, desde cuándo, y qué dice la Ley 17.250 sobre el precio tachado.'

defineOgImageComponent('Cambio', {
  title: 'CyberLunes y Black Friday',
  subtitle: '¿El descuento es real?',
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
        'ciberlunes uruguay, black friday uruguay, es real el descuento, precio tachado uruguay, ' +
        'ciberlunes 2026, black friday 2026 uruguay, ofertas infladas antes del descuento, cedu ciberlunes',
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
          {
            '@type': 'ListItem',
            position: 2,
            name: 'CyberLunes y Black Friday en Uruguay',
            item: canonicalUrl,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
}
.page-section {
  margin-bottom: 32px;
}

.countdown-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  border-left: 3px solid rgb(var(--v-theme-primary));
}
.countdown-headline {
  font-size: 1.05rem;
  font-weight: 700;
}
.source-link {
  color: rgb(var(--v-theme-link));
  font-size: 0.8rem;
  text-decoration: underline;
}

.past-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.past-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  font-size: 0.86rem;
}
.past-label {
  font-weight: 700;
}
.past-dates,
.past-note {
  opacity: 0.75;
}

.method-list {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.empty-note {
  opacity: 0.7;
  font-size: 0.88rem;
}

/* F2 (hallazgo 1): esta clase vive en un <span> DENTRO de la celda de "Enlace", nunca en el <td>
   mismo — display:flex en el <td> le hacía perder su comportamiento de celda de tabla. */
.drop-links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.drops-table .price,
.drops-table .drop-pct,
.sellers-table td.text-right {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.chart-wrap {
  position: relative;
  height: clamp(240px, 44vw, 360px);
  margin-top: 12px;
}

.articles {
  margin: 0;
  padding-left: 18px;
  font-size: 0.8rem;
  opacity: 0.75;
  line-height: 1.6;
}

.related-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.related-list li {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 14px;
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
}
.related-list a {
  font-weight: 700;
}
.related-list span {
  font-size: 0.8rem;
  opacity: 0.75;
}
</style>
