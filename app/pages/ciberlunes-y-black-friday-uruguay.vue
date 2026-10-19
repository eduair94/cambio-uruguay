<!--
THESIS: "Hasta 70 % OFF" en CyberLunes y Black Friday es fácil de anunciar y difícil de comprobar. Esta
página no lo cree ni lo desmiente en general: mide, oferta por oferta, contra el propio historial de
precios de las tiendas que ya relevamos para /equipar-casa-uruguay y /sillas-escritorio-uruguay.
OWN-WORLD: hereda tipografía, superficies y azules semánticos del resto del sitio.
STORY: primero cuándo es (todas las ediciones que faltan, con fuente), después cómo usarla antes y
durante el evento, después la regla ("cómo medimos"), después los datos de hoy
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
        CyberLunes y Black Friday 2026 en Uruguay: ¿el descuento es real?
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-2">
        "Hasta 70 % OFF" es fácil de anunciar. Acá no lo damos por sentado en general: comparamos,
        oferta por oferta, el precio de hoy contra el propio historial de precios de las tiendas que
        ya relevamos todos los días para
        <NuxtLink :to="localePath('/equipar-casa-uruguay')">equipar una casa</NuxtLink>,
        <NuxtLink :to="localePath('/sillas-escritorio-uruguay')">sillas de escritorio</NuxtLink>,
        <NuxtLink :to="localePath('/celulares-uruguay')">celulares</NuxtLink>,
        <NuxtLink :to="localePath('/monopatines-electricos-uruguay')">monopatines</NuxtLink> y
        <NuxtLink :to="localePath('/bicicletas-electricas-uruguay')">bicicletas eléctricas</NuxtLink
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
        <p class="countdown-headline mb-0">{{ priceEventCountdownHeadline(countdown) }}</p>
        <!--
          Todas las ediciones confirmadas que faltan, no sólo la del titular: a fines de octubre el
          titular es CyberLunes, pero casi todo el que llega desde Google buscó "cuándo es el Black
          Friday 2026" — su fecha tiene que estar a la vista sin esperar a que pase el CyberLunes.
        -->
        <ul v-if="upcomingEditions.length" class="upcoming-list">
          <li v-for="edition in upcomingEditions" :key="edition.id" class="upcoming-item">
            <p class="upcoming-label">{{ edition.label }}</p>
            <p class="upcoming-dates">{{ priceEventRangeLabel(edition) }}.</p>
            <p v-if="edition.note" class="upcoming-note">{{ edition.note }}</p>
            <a
              v-if="edition.source"
              :href="edition.source"
              target="_blank"
              rel="noopener noreferrer"
              class="source-link"
            >
              Fuente
            </a>
          </li>
        </ul>
        <template v-else-if="countdown.status === 'undated'">
          <p v-if="countdown.event?.note" class="text-body-2 text-medium-emphasis mt-2 mb-2">
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
        </template>
      </VCard>

      <!--
        Una edición sin fecha nunca desaparece sólo porque OTRO evento (con fecha ya conocida) haya
        ganado el titular de arriba: "a confirmar por la CEDU" tiene que quedar visible, no perderse
        detrás del otro evento. Hoy el calendario no tiene ninguna sin fecha (la CEDU fechó noviembre
        de 2026 el 16/9/2026), así que esta línea no se dibuja hasta que se cargue una.
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
          <li v-for="edition in pastEditions" :key="edition.id">
            <span class="past-label">{{ edition.label }}</span>
            <span class="past-dates">{{ priceEventRangeLabel(edition) }}</span>
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

    <!-- ── Cómo usarla ──────────────────────────────────────────────────── -->
    <!--
      Para quien llega desde Google la semana anterior: lo que sirve hacer ANTES (el precio de antes
      sólo se ve antes) y lo que va a encontrar acá esos días. Cada paso enlaza a una herramienta que
      ya existe; ninguno promete algo que el sitio no haga.
    -->
    <section class="page-section" aria-labelledby="uso-title">
      <h2 id="uso-title" class="section-heading mb-3">Cómo usarla antes y durante el evento</h2>
      <p class="text-body-2 mb-3">
        Un descuento sólo se juzga contra el precio de antes, y ese día la tienda te muestra el
        suyo, tachado, no el que cobraba la semana anterior.
      </p>
      <ol class="howto-list">
        <li>
          <strong>Antes, fijate el precio de hoy.</strong> Cada aviso de
          <NuxtLink :to="localePath('/celulares-uruguay')">celulares</NuxtLink>,
          <NuxtLink :to="localePath('/sillas-escritorio-uruguay')">sillas de escritorio</NuxtLink>,
          <NuxtLink :to="localePath('/monopatines-electricos-uruguay')">monopatines</NuxtLink>,
          <NuxtLink :to="localePath('/bicicletas-electricas-uruguay')"
            >bicicletas eléctricas</NuxtLink
          >
          y del
          <NuxtLink :to="localePath(EQUIPAR_PRODUCTOS_PATH)"
            >buscador para equipar la casa</NuxtLink
          >
          dice si su precio subió o bajó desde la primera vez que lo leímos. Y si te preocupa que
          una tienda suba el precio la semana anterior para después «rebajarlo»,
          <NuxtLink :to="localePath('/cambios-de-precio-uruguay')">cambios de precio</NuxtLink>
          publica qué avisos subieron y cuáles bajaron en los últimos días, cada uno contra su
          propio precio anterior.
        </li>
        <li>
          <strong>Si es algo para la casa, guardalo.</strong> «Agregar a mi lista» en ese buscador
          lo lleva a <NuxtLink :to="localePath(EQUIPAR_LISTA_PATH)">tu lista</NuxtLink>; ese día,
          «Actualizar precios» te dice si cambió de precio o si ya no está publicado.
        </li>
        <li>
          <strong>Esos días, volvé acá.</strong> La tabla de bajas reales lista las ofertas que
          quedaron al menos 10 % debajo de su propio mínimo de 60 días, y la de tiendas cuenta
          cuántos precios tachados quedaron por encima de lo que registramos. Además de la corrida
          de todos los días, mientras dura cada edición el cálculo se repite cada hora.
        </li>
        <li>
          <strong>Si vas a pagar con tarjeta,</strong> en
          <NuxtLink :to="localePath('/descuentos-con-tarjeta-uruguay')"
            >descuentos con tarjeta</NuxtLink
          >
          elegís las tuyas y ves las promociones vigentes; con la sesión iniciada, te avisamos
          cuando aparece un descuento nuevo para ellas.
        </li>
      </ol>
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
        }}<NuxtLink :to="localePath('/equipar-casa-uruguay')">equipar una casa</NuxtLink>,
        <NuxtLink :to="localePath('/sillas-escritorio-uruguay')">sillas de escritorio</NuxtLink>,
        <NuxtLink :to="localePath('/celulares-uruguay')">celulares</NuxtLink>,
        <NuxtLink :to="localePath('/monopatines-electricos-uruguay')">monopatines</NuxtLink> y
        <NuxtLink :to="localePath('/bicicletas-electricas-uruguay')">bicicletas eléctricas</NuxtLink
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
          <NuxtLink :to="localePath('/celulares-uruguay')">Celulares</NuxtLink>
          <span
            >Precio de iPhone, Samsung, Motorola y Xiaomi por modelo, con la cuenta de traerlo de
            Estados Unidos.</span
          >
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
import { EQUIPAR_LISTA_PATH, EQUIPAR_PRODUCTOS_PATH } from '~/utils/equiparProductos'
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
  priceEventRangeLabel,
  priceEventUpcomingEditions,
  type PriceEventApiResponse,
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
const upcomingEditions = computed(() => priceEventUpcomingEditions(today.value))
const pastEditions = computed(() => priceEventPastEditions(today.value))

// La decisión de "¿hay una edición sin fecha que además haya que mostrar?" es pura y vive en
// priceEvents.ts (priceEventOtherUnconfirmed), probada ahí con sus ramas — acá sólo se llama.
const otherUnconfirmedEvent = computed(() => priceEventOtherUnconfirmed(today.value))

const todayDropsCount = computed(() => current.value?.dropsCount ?? 0)

const dropRows = computed(() => priceEventDropRows(current.value))
const sellerRows = computed(() => current.value?.sellers ?? [])
const faqItems = computed(() => priceEventFaq(current.value))
const legalScenario = scenarioById('precio-inflado-antes-de-la-oferta')

const PRICE_EVENT_VERTICAL_LABELS: Record<string, string> = {
  equipar: 'equipar una casa',
  sillas: 'sillas de escritorio',
  celulares: 'celulares',
  movilidad: 'monopatines y bicicletas eléctricas',
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
// Las fechas van en el título porque casi todo lo que la página recibe de Google es "cuándo es el
// black friday en uruguay 2026" (Search Console, 20/9–17/10/2026): sin la fecha, el snippet no
// contesta la pregunta que lo trajo. `priceEvents.test.ts` ata estas dos cadenas al calendario.
const title = 'Black Friday 2026: 27/11, CyberLunes 2-4/11'
const description =
  'Black Friday 2026: viernes 27 de noviembre. CyberLunes: del lunes 2 al miércoles 4. Esos días marcamos qué oferta quedó 10 % bajo su mínimo de 60 días.'

defineOgImageComponent('Cambio', {
  title: 'CyberLunes y Black Friday 2026',
  subtitle: 'CyberLunes 2 al 4/11 · Black Friday 27/11',
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

/* Las ediciones que faltan, debajo del titular. Cada <p> declara su propio margen: el reset de
   Vuetify 4 deja el `margin-block: 1em` del navegador (DESIGN.md, "The Text Block Owns Its Top
   Margin Rule"). */
.upcoming-list {
  list-style: none;
  margin: 12px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.upcoming-item {
  padding-top: 12px;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
}
.upcoming-label {
  margin: 0;
  font-weight: 700;
}
.upcoming-dates {
  margin: 2px 0 0;
  font-size: 0.95rem;
}
.upcoming-note {
  margin: 4px 0 0;
  font-size: 0.82rem;
  opacity: 0.75;
}

.howto-list {
  margin: 0;
  padding-left: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 0.9rem;
  line-height: 1.6;
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
