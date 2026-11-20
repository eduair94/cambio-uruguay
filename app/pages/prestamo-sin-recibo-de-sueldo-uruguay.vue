<!--
  /prestamo-sin-recibo-de-sueldo-uruguay — quién le presta a quien no tiene recibo de sueldo.
  "Préstamo sin recibo de sueldo" subió +300 % en Google Trends en los 90 días al 2026-09-15 y el
  sitio no tenía nada. El SERP uruguayo son nueve landings de prestamistas y un blog de afiliados sin
  una sola tasa. Esta página es un FILTRO sobre el catálogo de /mejores-prestamos-uruguay (misma
  clave de fetch, mismo refresh semanal) más las tres puertas, cada una con citas fechadas de la
  página del propio prestamista. Detalle en utils/loanNoPayslip.ts.
-->
<template>
  <VContainer class="loan-np py-6">
    <!-- Hero -->
    <VCard class="overflow-hidden mb-5" elevation="4">
      <div class="loan-np__hero on-dark pa-6 pa-md-8">
        <p class="loan-np__eyebrow mb-3">Préstamos · Sin recibo de sueldo</p>
        <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-3">
          Préstamos sin recibo de sueldo en Uruguay
        </h1>
        <p class="text-body-1 text-grey-lighten-2 mb-0">
          Sin recibo de sueldo <strong class="text-white">sí te prestan</strong>:
          {{ rows.length }} instituciones lo hacen con un certificado de contador, sólo con la
          cédula o contra una garantía<template v-if="spreadLabel"
            >, con tasas publicadas de {{ spreadLabel }}</template
          >. Con certificado conseguís las tasas bajas; sólo con la cédula, las más caras. Si además
          estás en el clearing, {{ conRecibo }} prestan con recibo de sueldo y {{ sinRecibo }} sin
          recibo: <a href="#clearing" class="text-white">mirá la tabla</a>.
        </p>
      </div>
    </VCard>

    <!-- Las tres puertas -->
    <section class="mb-6" aria-labelledby="puertas-title">
      <h2 id="puertas-title" class="text-h6 font-weight-bold mb-1">
        Las tres formas de conseguirlo
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        De la más barata a la más cara. Lo que dice cada institución está citado de su propia
        página.
      </p>
      <VCard
        v-for="(door, i) in NOPAYSLIP_DOORS"
        :key="door.id"
        variant="outlined"
        class="mb-3 pa-4 door-card"
      >
        <div class="d-flex align-start ga-3 mb-2">
          <VAvatar size="32" color="primary" variant="tonal" class="flex-shrink-0">
            {{ i + 1 }}
          </VAvatar>
          <div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ door.title }}</h3>
            <p class="text-caption text-medium-emphasis mb-0">{{ door.who }}</p>
          </div>
        </div>
        <p class="text-body-2 mb-2">{{ door.body }}</p>
        <blockquote v-for="q in door.quotes" :key="q.lenderId" class="door-quote text-body-2">
          <strong>{{ q.lenderName }}:</strong> {{ q.text }}
          <a :href="q.sourceUrl" target="_blank" rel="noopener noreferrer">Fuente</a>
        </blockquote>
        <p v-if="door.id === 'certificado'" class="text-body-2 mt-2 mb-0 door-links">
          Si todavía cobrás sin facturar, el primer paso es inscribirte:
          <NuxtLink :to="localePath('/que-empresa-abrir-uruguay')">qué empresa abrir</NuxtLink> y
          <NuxtLink :to="localePath('/facturar-en-monotributo-uruguay')"
            >cómo facturar en monotributo</NuxtLink
          >.
        </p>
        <p v-else-if="door.id === 'garantia'" class="text-body-2 mt-2 mb-0 door-links">
          Mirá cómo funciona el
          <NuxtLink :to="localePath('/guias/credito-prendario-auto-uruguay')"
            >crédito prendario con tu auto</NuxtLink
          >.
        </p>
      </VCard>
    </section>

    <!-- Quién presta -->
    <section class="mb-6" aria-labelledby="quien-title">
      <h2 id="quien-title" class="text-h6 font-weight-bold mb-1">
        Quién presta sin recibo de sueldo y a qué tasa
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Tasa efectiva anual publicada por cada institución, de la más barata a la más cara. Es una
        referencia: la que te obliga es el costo total que figura en tu contrato.
        <template v-if="asOfLabel">Tasas revisadas el {{ asOfLabel }}.</template>
      </p>
      <VCard variant="outlined">
        <VTable class="cu-mobile-cards loan-np__table" density="comfortable">
          <thead>
            <tr>
              <th>Institución</th>
              <th>Tipo</th>
              <th class="text-right">TEA publicada</th>
              <th>Clearing</th>
              <th>Banco Central</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td data-label="Institución" class="font-weight-medium">
                <a :href="r.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">{{
                  r.name
                }}</a>
              </td>
              <td data-label="Tipo">{{ r.segmentLabel }}</td>
              <td data-label="TEA publicada" class="text-right text-no-wrap">{{ r.teaLabel }}</td>
              <td data-label="Clearing">{{ r.clearingLabel }}</td>
              <td data-label="Banco Central">{{ r.bcuLabel }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-body-2 mt-3 mb-0">
        El tope legal para un préstamo en pesos de menos de 10.000 UI a menos de un año es
        <strong>{{ capLabel }}</strong
        >, vigente desde el {{ capSince }}. Una tasa por encima de ese tope es usura.
        <NuxtLink :to="localePath('/ley-de-usura-uruguay')">Cómo funcionan los topes</NuxtLink>.
        Para comparar cada institución en detalle —rapidez, montos, letra chica— está el
        <NuxtLink :to="localePath('/mejores-prestamos-uruguay')">ranking de préstamos</NuxtLink>.
      </p>
    </section>

    <!-- Estando en el clearing: con recibo y sin recibo -->
    <section id="clearing" class="mb-6" aria-labelledby="clearing-title">
      <h2 id="clearing-title" class="text-h6 font-weight-bold mb-1">
        Préstamos estando en el clearing: con recibo y sin recibo de sueldo
      </h2>
      <p class="text-body-2 mb-3">
        Estando en el clearing prestan, según su propia página,
        <strong>{{ CLEARING_LENDERS.length }} instituciones</strong>. Con recibo de sueldo:
        <strong>{{ conRecibo }}</strong
        >. Sin recibo: <strong>{{ sinRecibo }}</strong
        >. Ninguna de las {{ CLEARING_LENDERS.length }} es un banco y en todas queda sujeto a
        evaluación. Leído en la página de cada una el {{ fmtDate(CLEARING_REVIEWED) }}.
      </p>
      <VCard variant="outlined" class="mb-3">
        <VTable class="cu-mobile-cards loan-np__table" density="comfortable">
          <thead>
            <tr>
              <th>Institución</th>
              <th>¿Pide recibo?</th>
              <th>Qué dice del clearing</th>
              <th>Qué pide</th>
              <th>Tasa y gastos</th>
              <th>Montos y plazos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in CLEARING_LENDERS" :key="l.name">
              <td data-label="Institución" class="font-weight-medium">
                <a :href="l.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">{{
                  l.name
                }}</a>
              </td>
              <td data-label="¿Pide recibo?" class="text-no-wrap">
                {{ PAYSLIP_LABELS[l.recibo] }}
              </td>
              <td data-label="Qué dice del clearing">{{ l.dice }}</td>
              <td data-label="Qué pide">{{ l.pide }}</td>
              <td data-label="Tasa y gastos">{{ l.tasa }}</td>
              <td data-label="Montos y plazos">{{ l.montos }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-body-2 mb-1">
        Exigen no tener antecedentes, aunque atiendan a quien no tiene recibo:
      </p>
      <ul class="checklist text-body-2 mb-3">
        <li v-for="c in CLEARING_CLOSED" :key="c.name">
          <strong>{{ c.name }}</strong
          >: {{ c.quote }}.
          <a :href="c.sourceUrl" target="_blank" rel="noopener noreferrer">Fuente</a>
        </li>
      </ul>
      <p class="text-body-2 mb-0">
        Lo que cuestan los antecedentes está en la tabla: ANDA puede pedir una garantía y Volvé
        empieza con un préstamo de $ 1.000. En tasas, {{ clearingRates }} Está también el
        <NuxtLink :to="localePath({ path: '/mejores-prestamos-uruguay', hash: '#con-clearing' })"
          >ranking completo de quién presta si estás en el clearing</NuxtLink
        >, y antes de pedir conviene mirar
        <NuxtLink :to="localePath('/salir-del-clearing')">cómo salir del clearing</NuxtLink>,
        <NuxtLink :to="localePath('/saldar-deudas-uruguay')">cómo saldar las deudas</NuxtLink> y, si
        buscás vivienda,
        <NuxtLink :to="localePath('/alquilar-estando-en-clearing')"
          >cómo alquilar estando en el clearing</NuxtLink
        >.
      </p>
    </section>

    <!-- Sólo con cédula: quién presta y a qué tasa -->
    <section class="mb-6" aria-labelledby="cedula-title">
      <h2 id="cedula-title" class="text-h6 font-weight-bold mb-1">
        Sólo con cédula: quién presta y a qué tasa
      </h2>
      <p class="text-body-2 mb-3">
        Sólo con la cédula prestan <strong>{{ soloCedulaNames }}</strong
        >. "Sólo con cédula" quiere decir <strong>sin comprobante de ingresos</strong>, no "sin
        mirar el clearing": son dos requisitos distintos y cada financiera se para en un lugar
        diferente. OCA exige no figurar en el clearing y Crédito de la Casa lo exige hasta para su
        línea chica; de las que anuncian la cédula sola, la que dice prestar estando en el clearing
        es Pronto!; las demás que lo dicen están en <a href="#clearing">la tabla de arriba</a>. Lo
        que sigue está leído de la página de cada institución el
        {{ fmtDate(SOLO_CEDULA_REVIEWED) }} (las filas releídas después llevan su fecha).
      </p>
      <VCard variant="outlined" class="mb-4">
        <VTable class="cu-mobile-cards loan-np__table" density="comfortable">
          <thead>
            <tr>
              <th>Institución</th>
              <th>¿Sólo cédula?</th>
              <th>Qué pide</th>
              <th>Clearing</th>
              <th>Tasa y gastos</th>
              <th>Montos y plazos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in SOLO_CEDULA_LENDERS" :key="l.name">
              <td data-label="Institución" class="font-weight-medium">
                <a :href="l.sourceUrl" target="_blank" rel="noopener noreferrer nofollow">{{
                  l.name
                }}</a>
              </td>
              <td data-label="¿Sólo cédula?" class="text-no-wrap">
                {{ SOLO_CEDULA_LABELS[l.soloCedula] }}
              </td>
              <td data-label="Qué pide">{{ l.pide }}</td>
              <td data-label="Clearing">{{ l.clearing }}</td>
              <td data-label="Tasa y gastos">
                {{ l.tasa }}
                <div v-if="l.readOn" class="text-caption text-medium-emphasis">
                  Releído el {{ fmtDate(l.readOn) }}.
                </div>
              </td>
              <td data-label="Montos y plazos">{{ l.montos }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <h3 class="text-subtitle-1 font-weight-bold mb-1">
        Topes de usura vigentes (Ley 18.212, tabla del BCU)
      </h3>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Tasas medias del período <strong>{{ capsPeriodo }}</strong
        >, vigentes desde el <strong>{{ capSince }}</strong
        >. El BCU republica la tabla todos los meses sobre una ventana móvil de tres meses: las
        cuatro filas de consumo en pesos sin autorización de descuento salen de la grilla que el
        sitio lee del BCU; las de dólares, autorización de descuento, retención de haberes y crédito
        de nómina son una lectura, hecha el {{ fmtDate(BCU_CAPS_READ_ON) }}, de la Comunicación
        {{ BCU_CAPS_COMUNICACION }} del BCU ({{ fmtDate(BCU_CAPS_COMUNICACION_DATE) }}). Tope =
        media más 55 %; con retención de haberes, más 30 %; crédito de nómina, más 20 %; mora, más
        80 %.
      </p>
      <VCard variant="outlined" class="mb-3">
        <VTable class="cu-mobile-cards loan-np__table" density="comfortable">
          <thead>
            <tr>
              <th>Segmento</th>
              <th>Plazo</th>
              <th class="text-right">Tasa media</th>
              <th class="text-right">Tope</th>
              <th class="text-right">Tope de mora</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in caps" :key="c.id">
              <td data-label="Segmento">
                {{ c.segment }}
                <span v-if="!c.live" class="text-caption text-medium-emphasis">
                  (lectura del PDF)</span
                >
              </td>
              <td data-label="Plazo">{{ c.plazo }}</td>
              <td data-label="Tasa media" class="text-right text-no-wrap">
                {{ usuryPct(c.meanPct) }}
              </td>
              <td data-label="Tope" class="text-right text-no-wrap font-weight-medium">
                {{ usuryPct(c.capPct) }}
              </td>
              <td data-label="Tope de mora" class="text-right text-no-wrap">
                {{ c.moraPct != null ? usuryPct(c.moraPct) : '—' }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mb-4">
        Fuente: BCU — Tasas medias de interés,
        <a :href="BCU_CAPS_SOURCE_URL" target="_blank" rel="noopener noreferrer">comunicación</a>
        {{ BCU_CAPS_COMUNICACION }} (PDF), visto el {{ fmtDate(BCU_CAPS_READ_ON) }}. En dólares el
        BCU publica una sola celda de consumo, sin partir por tramo de UI ni por autorización de
        descuento.
      </p>

      <VCard variant="flat" class="pa-4 pa-sm-5 mb-4 door-card">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">
          Lo que puede sumarse a la tasa sin ser usura (Ley 18.212, art. 14)
        </h3>
        <p class="text-body-2 mb-2">
          El tope se mide sobre la tasa implícita, y la ley deja fuera del cálculo algunos gastos
          fijos.
          <template v-if="uiValue && ui120 != null && ui10k != null">
            Con la UI
            {{ uiReading?.date ? `del ${fmtDate(uiReading.date)}` : 'vigente' }}
            ({{ fmtUyu(uiValue, 4) }}), 120 UI son unos {{ fmtUyu(ui120, 0) }}, y el corte de 10.000
            UI que separa las filas de la tabla de topes queda en unos {{ fmtUyu(ui10k, 0) }}.
          </template>
          <template v-else>
            El corte que separa las filas de la tabla de topes es de 10.000 UI.
          </template>
        </p>
        <ul class="checklist text-body-2">
          <li v-for="c in USURY_EXCLUDED_COSTS" :key="c.id">{{ c.text }}</li>
        </ul>
        <p class="text-caption text-medium-emphasis mt-2 mb-0">
          Fuente:
          <a
            href="https://www.impo.com.uy/bases/leyes/18212-2007"
            target="_blank"
            rel="noopener noreferrer"
            >IMPO — Ley 18.212, texto actualizado</a
          >, visto el {{ fmtDate(SOLO_CEDULA_REVIEWED) }}.
        </p>
      </VCard>

      <VCard variant="flat" class="pa-4 pa-sm-5 door-card">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Si sos jubilado o pensionista</h3>
        <ul class="checklist text-body-2">
          <li>
            <strong>BROU con retención</strong> (BPS u organismo con convenio): cédula vigente, a
            sola firma desde el primer mes de cobro, renovación con el 40 % de las cuotas pagas; el
            plazo y la afectación bajan con la edad (hasta 70 años, 60 meses y 35 % del nominal;
            desde 90 años, 12 meses y 20 %). No cobra comisión de concesión ni seguro, pero su
            página de préstamos con convenio prevé una comisión por cancelación anticipada. Tasas
            vigentes desde el {{ fmtDate(BROU_RATES_IN_FORCE_SINCE) }}: de
            {{ brouRange.cheapest }} + IVA (preferencial por eBROU) a {{ brouRange.dearest }} + IVA
            (estándar en sucursal); los calificados 3 en el BCU pagan {{ brouSpreadLabel }} puntos
            más.
            <a
              href="https://www.brou.com.uy/personas/prestamos/prestamo-consumo/prestamos-con-convenio-en-pesos"
              target="_blank"
              rel="noopener noreferrer"
              >Fuente</a
            >
            ·
            <a
              href="https://www.brou.com.uy/documents/20182/22237/TASAS_VIGENTES_PRESTAMOS_PERSONAS.pdf/6ed06833-7c12-4f9f-8001-f7fb52f60a60"
              target="_blank"
              rel="noopener noreferrer"
              >Tasas (PDF del BROU)</a
            >
          </li>
          <li>
            La campaña <strong>Préstamos a Pasivos 2026</strong> del BROU va en noviembre y
            diciembre: por eBROU desde el 9 de noviembre y, si cobrás menos de $ 30.000 nominales,
            por WhatsApp (2 1996 000) del 16 de noviembre al 22 de diciembre. En sucursales atiende
            dos dígitos verificadores de la cédula por día: quien cobra la pasividad en el BROU, del
            16 al 20 de noviembre y del 9 al 15 de diciembre; quien no, del 24 al 30 de noviembre y
            del 16 al 22 de diciembre. Desde el 23 de diciembre, todos los pasivos. Durante la
            campaña no exige un porcentaje mínimo de cuotas pagas para renovar. Leído el
            {{ fmtDate(BROU_PASIVOS_CAMPAIGN.readOn) }} en la
            <a
              :href="BROU_PASIVOS_CAMPAIGN.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              title="BROU — Campaña Préstamos a Pasivos 2026"
              >página de la campaña del BROU</a
            >.
          </li>
          <li>
            <strong>ANDA, nómina para pasivos</strong>: hasta 80 años, cobro por banco o IEDE,
            buenos antecedentes y "Contrato Persona" de BPS firmado; 29,10 % (menos de 10.000 UI) o
            28,30 % (10.000 UI o más) + IVA en noviembre de 2026, leído el
            {{ fmtDate(CLEARING_REVIEWED) }}. <strong>Creditel</strong>: adelanto de jubilación
            hasta $ 40.000 a 30 días (las fuentes de ANDA y Creditel están en la tabla de arriba).
            Por la
            <a
              href="https://www.impo.com.uy/bases/leyes/17829-2004"
              target="_blank"
              rel="noopener noreferrer"
              >Ley 17.829</a
            >
            tenés que cobrar en mano al menos el 35 % del nominal después de impuestos y aportes.
          </li>
        </ul>
        <p class="text-body-2 mt-2 mb-0">
          Todo el detalle —BPS, BROU y cuánto te pueden descontar— está en
          <NuxtLink :to="localePath('/prestamos-para-jubilados-uruguay')"
            >préstamos para jubilados</NuxtLink
          >.
        </p>
      </VCard>
    </section>

    <!-- Antes de firmar -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">Antes de firmar</h2>
      <ul class="checklist text-body-2">
        <li>
          Pedí el <strong>costo total</strong> en pesos para tu monto y plazo, no sólo la cuota:
          <NuxtLink :to="localePath('/guias/entender-tea-tna-y-cft')">TEA, TNA y CFT</NuxtLink>.
        </li>
        <li>
          Si te piden un pago por adelantado para liberar el préstamo, es estafa:
          <NuxtLink :to="localePath('/guias/como-evitar-estafas-financieras-uruguay')"
            >cómo reconocerlas</NuxtLink
          >.
        </li>
        <li>
          Si ya estás atrasado, un préstamo caro para pagar otro suele empeorar las cosas:
          <NuxtLink :to="localePath('/salir-del-clearing')">cómo salir del clearing</NuxtLink>.
        </li>
        <li>
          Hacé la cuenta con la
          <NuxtLink :to="localePath('/herramientas/calculadora-prestamo')"
            >calculadora de préstamo</NuxtLink
          >.
        </li>
      </ul>
    </VCard>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <VCard variant="flat" class="pa-4 pa-sm-5 mt-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">También te puede servir</h2>
      <ul class="related">
        <li>
          <NuxtLink :to="localePath('/alquilar-sin-recibo-de-sueldo')"
            >Alquilar sin recibo de sueldo</NuxtLink
          >
        </li>
        <li>
          <NuxtLink :to="localePath('/guias/prestamo-a-sola-firma-uruguay')"
            >El préstamo a sola firma: cuándo conviene</NuxtLink
          >
        </li>
        <li>
          <NuxtLink :to="localePath('/prestamos-uruguay')">Tasas de préstamos en Uruguay</NuxtLink>
        </li>
        <li>
          <NuxtLink :to="localePath('/prestamos-para-jubilados-uruguay')"
            >Préstamos para jubilados y pensionistas</NuxtLink
          >
        </li>
        <li>
          <NuxtLink :to="localePath('/guias/como-saber-si-tengo-deudas-uruguay')"
            >Cómo saber si tengo deudas</NuxtLink
          >
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Citas de las tres puertas verificadas contra la página de cada institución el
        {{ fmtDate(NOPAYSLIP_LOANS_REVIEWED) }}; la tabla del clearing, el
        {{ fmtDate(CLEARING_REVIEWED) }}; la tabla de "sólo con cédula" y la parte de jubilados, el
        {{ fmtDate(SOLO_CEDULA_REVIEWED) }} (lo releído después lleva su fecha); los topes del BCU,
        el {{ fmtDate(BCU_CAPS_READ_ON) }}. No tenemos acuerdos comerciales con ninguna.
        Informativo, no es asesoramiento financiero.
      </p>
    </VCard>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { BCU_CAPS, BCU_IN_FORCE_SINCE, type BcuCapRow } from '~/utils/cashAdvance'
import { pesosForUi } from '~/utils/criminalRecord'
import type { FaqItem } from '~/utils/faqAnswers'
import { indicatorFromSlug, liveIndicatorReading } from '~/utils/indicators'
import {
  BCU_CAPS_COMUNICACION,
  BCU_CAPS_COMUNICACION_DATE,
  BCU_CAPS_PERIOD,
  BCU_CAPS_READ_ON,
  BCU_CAPS_SOURCE_URL,
  BROU_PASIVOS_CAMPAIGN,
  CLEARING_CLOSED,
  CLEARING_LENDERS,
  CLEARING_REVIEWED,
  NOPAYSLIP_CAPS,
  NOPAYSLIP_DOORS,
  NOPAYSLIP_LOANS_REVIEWED,
  PAYSLIP_LABELS,
  SOLO_CEDULA_LABELS,
  SOLO_CEDULA_LENDERS,
  SOLO_CEDULA_REVIEWED,
  USURY_EXCLUDED_COSTS,
  buildNoPayslipFaq,
  clearingNames,
  clearingRatesSentence,
  mergeNoPayslipCaps,
  noPayslipLenders,
  pctEs,
  teaSpread,
} from '~/utils/loanNoPayslip'
import { LENDER_TIERLIST, mergeLenderFacts, type LoanTierSnapshot } from '~/utils/loanTierlist'
import {
  BROU_PASIVOS,
  BROU_RATES_IN_FORCE_SINCE,
  BROU_SPREAD_CALIFICADOS_3,
} from '~/utils/retireeLoans'
import { usuryPct } from '~/utils/usuryCaps'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const conRecibo = clearingNames('pide')
const sinRecibo = clearingNames('no-pide')

// La tasa del BROU para pasivos y su vigencia salen del mismo PDF que lee
// /prestamos-para-jubilados-uruguay (retireeLoans.ts): no se tipean a mano en dos páginas.
const brouChannelRange = (id: string): string => {
  const rates = BROU_PASIVOS.find(c => c.id === id)?.teaPct ?? []
  if (!rates.length) return ''
  const lo = Math.min(...rates)
  const hi = Math.max(...rates)
  return lo === hi ? pctEs(lo) : `${lo.toLocaleString('es-UY')} % a ${pctEs(hi)}`
}
const brouRange = {
  cheapest: brouChannelRange('preferencial-ebrou'),
  dearest: brouChannelRange('estandar-sucursal'),
}
const brouSpreadLabel = BROU_SPREAD_CALIFICADOS_3.toLocaleString('es-UY')

// Los gastos del art. 14 están en UI: la conversión usa la UI vigente, la misma que lee
// /indicadores/unidad-indexada. Sin lectura viva, sólo se muestran las UI, nunca un peso inventado.
// La fecha impresa es la de la fila leída (puede no ser la de hoy), o "vigente" si no trae una.
const uiIndicator = indicatorFromSlug('unidad-indexada')
const { data: uiReading } = await useAsyncData('npay-ui-reading', async () => {
  if (!uiIndicator) return null
  try {
    const result = await getProcessedExchangeData('')
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]
    const reading = liveIndicatorReading(rows, uiIndicator)
    const value = reading?.value
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null
    const date =
      typeof reading?.date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(reading.date)
        ? reading.date.slice(0, 10)
        : null
    return { value, date }
  } catch {
    return null
  }
})
const uiValue = computed(() => uiReading.value?.value ?? null)
const ui120 = computed(() => pesosForUi(120, uiValue.value))
const ui10k = computed(() => pesosForUi(10_000, uiValue.value))
const fmtUyu = (n: number, decimals: number): string =>
  `$ ${n.toLocaleString('es-UY', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`

// Same weekly-refreshed facts as /mejores-prestamos-uruguay (same key: one response for both).
const { data: snapshot } = await useFetch<LoanTierSnapshot | null>('/api/loan-tiers', {
  key: 'loan-tiers',
  default: () => null,
})

// Same live usury grid as the other three pages that name a cap (memory: un-solo-tope-de-usura).
const { data: liveCaps } = await useFetch<{
  periodo: string
  vigenteDesde: string
  rows: BcuCapRow[]
  live: boolean
}>('/api/bcu-rates', { key: 'bcu-rates', server: true, default: () => null })

const lenders = computed(() => mergeLenderFacts(LENDER_TIERLIST, snapshot.value?.patches))
const rows = computed(() => noPayslipLenders(lenders.value))
const spread = computed(() => teaSpread(lenders.value, rows.value))
const spreadLabel = computed(() =>
  spread.value.min != null && spread.value.max != null
    ? `${pctEs(spread.value.min)} a ${pctEs(spread.value.max)}`
    : ''
)

const fmtDate = (iso: string): string => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      })
}

const asOfLabel = computed(() => (snapshot.value?.asOf ? fmtDate(snapshot.value.asOf) : ''))

const capRow = computed(() => {
  const row = (liveCaps.value?.rows || BCU_CAPS).find(
    r => r.bracket === 'menor10kUI' && r.cortoPlazo && r.currency === 'UYU'
  )
  return row ?? BCU_CAPS[0]!
})
const capLabel = computed(() => usuryPct(capRow.value.tope * 100))
const clearingRates = computed(() => clearingRatesSentence(capLabel.value))
const capSince = computed(() => fmtDate(liveCaps.value?.vigenteDesde || BCU_IN_FORCE_SINCE))

// The full grid for the "sólo con cédula" section: live rows where the BCU feed has them, dated
// PDF readings for the rows it does not carry (marked as such in the table).
const caps = computed(() => mergeNoPayslipCaps(NOPAYSLIP_CAPS, liveCaps.value?.rows))
const capsPeriodo = computed(() => liveCaps.value?.periodo || BCU_CAPS_PERIOD)
const soloCedulaNames = computed(() =>
  SOLO_CEDULA_LENDERS.filter(l => l.soloCedula === 'si')
    .map(l => l.name)
    .join(' y ')
)

const faq = computed<FaqItem[]>(() =>
  buildNoPayslipFaq({
    rows: rows.value,
    spread: spread.value,
    capLabel: capLabel.value,
    capSince: capSince.value,
    clearingReviewedLabel: fmtDate(CLEARING_REVIEWED),
  })
)

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/prestamo-sin-recibo-de-sueldo-uruguay'
const title = 'Préstamos sin recibo de sueldo en Uruguay'
const description = computed(
  () =>
    `${rows.value.length} instituciones prestan sin recibo de sueldo${spreadLabel.value ? `, TEA de ${spreadLabel.value}` : ''}. Con certificado, sólo cédula o garantía: quién mira el clearing y el tope legal.`
)

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: title,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

defineOgImageComponent('Cambio', {
  title: 'Préstamos sin recibo de sueldo',
  subtitle: 'Quién presta, a qué tasa y qué te piden en lugar del recibo',
  tag: 'PRÉSTAMOS',
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
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
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Préstamos',
                item: 'https://cambio-uruguay.com/mejores-prestamos-uruguay',
              },
              { '@type': 'ListItem', position: 3, name: title, item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.loan-np__hero {
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(var(--v-theme-primary), 0.45), transparent 55%),
    linear-gradient(135deg, #0a0e1a 0%, #121a2e 100%);
}
.loan-np__eyebrow {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  opacity: 0.85;
  margin: 0;
}
.door-card {
  border-radius: 12px;
}
.door-quote {
  margin: 0.5rem 0 0;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgba(var(--v-theme-on-surface), 0.03);
  border-radius: 8px;
}
.door-quote a {
  margin-left: 0.25rem;
  font-size: 0.8rem;
}
.loan-np__table {
  font-variant-numeric: tabular-nums;
}
.checklist,
.related {
  margin: 0;
  padding-left: 1.1rem;
  line-height: 1.8;
}
</style>
