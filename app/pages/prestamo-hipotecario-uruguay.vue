<template>
  <VContainer class="mortgage py-6" style="max-width: 960px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Préstamo hipotecario', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Préstamo hipotecario en Uruguay: por qué la cuota va en UI o UR
    </h1>

    <p class="intro text-body-1 mb-4" style="max-width: 68ch">
      Un crédito para comprar vivienda en Uruguay casi nunca se firma en pesos y nunca en dólares:
      va en <strong>Unidades Indexadas</strong> o en <strong>Unidades Reajustables</strong>. Eso
      cambia lo único que importa —cuánto pagás cada mes— sin que el banco toque nada. Y los
      requisitos del fondo que habilita la mayoría de estos préstamos están escritos en UR, que acá
      van convertidos a pesos con la UR de hoy.
    </p>

    <!-- El techo de ingreso en pesos: el número que la ANV publica sólo en UR -->
    <VCard variant="flat" class="benchmark-card pa-5 pa-md-6 mb-6">
      <div class="d-flex align-center ga-3 mb-1">
        <VIcon icon="mdi-home-percent-outline" color="primary" size="32" />
        <div class="text-subtitle-1 font-weight-bold">
          Hasta cuánto podés ganar y seguir entrando
        </div>
      </div>
      <p v-if="urKnown" class="callout-body text-body-2 text-medium-emphasis mb-4">
        Calculado con
        <NuxtLink :to="localePath('/indicadores/unidad-reajustable')" class="cu-link">
          la UR del día
        </NuxtLink>
        . La ANV publica este techo sólo en unidades.
      </p>
      <p v-else class="callout-body text-body-2 text-medium-emphasis mb-4">
        Hoy no tenemos la UR en vivo, así que el techo va sólo en unidades: la ANV lo publica así y
        acá no se inventa un peso.
      </p>

      <VRow dense>
        <VCol cols="12" sm="6">
          <div class="benchmark pa-4">
            <div class="text-caption text-medium-emphasis">Ingreso líquido del núcleo familiar</div>
            <div class="text-h6 font-weight-bold">
              {{ urKnown ? incomeCapText : `UR ${FGCH_MAX_HOUSEHOLD_INCOME_UR}` }}
            </div>
            <div class="benchmark-note text-caption text-medium-emphasis">
              UR {{ FGCH_MAX_HOUSEHOLD_INCOME_UR }} como máximo, no un mínimo
            </div>
          </div>
        </VCol>
        <VCol cols="12" sm="6">
          <div class="benchmark pa-4">
            <div class="text-caption text-medium-emphasis">Cuota máxima con ese ingreso</div>
            <div class="text-h6 font-weight-bold">{{ urKnown ? maxPaymentText : '35 %' }}</div>
            <div class="benchmark-note text-caption text-medium-emphasis">
              Tiene que quedar por debajo del 35 % del ingreso
            </div>
          </div>
        </VCol>
      </VRow>
    </VCard>

    <!-- Las dos unidades -->
    <h2 class="section-heading text-h6 font-weight-bold mb-2">UI o UR: qué mueve tu cuota</h2>
    <p class="body text-body-2 text-medium-emphasis mb-4" style="max-width: 68ch">
      Las dos son unidades de cuenta que se actualizan solas. La diferencia no es cosmética: define
      contra qué corre tu cuota durante los próximos veinte años.
    </p>

    <VRow dense class="mb-6">
      <VCol v-for="unit in MORTGAGE_UNITS" :key="unit.code" cols="12" md="6">
        <VCard variant="outlined" rounded="lg" class="pa-4 h-100">
          <div class="d-flex align-center ga-2 mb-2">
            <VChip size="small" color="primary" variant="tonal" label>{{ unit.code }}</VChip>
            <span class="font-weight-bold">{{ unit.name }}</span>
          </div>
          <p class="unit-line text-body-2 mb-1"><strong>Sigue</strong> {{ unit.follows }}.</p>
          <p class="unit-line text-body-2 mb-1">
            <strong>Se actualiza</strong> {{ unit.cadence }}.
          </p>
          <p class="unit-line text-body-2 mb-2">{{ unit.meaning }}</p>
          <NuxtLink :to="localePath(`/indicadores/${unit.slug}`)" class="cu-link text-body-2">
            Ver su valor de hoy
          </NuxtLink>
        </VCard>
      </VCol>
    </VRow>

    <!-- FGCH -->
    <h2 class="section-heading text-h6 font-weight-bold mb-2">
      El Fondo de Garantía de Créditos Hipotecarios, límite por límite
    </h2>
    <p class="body text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Es el fondo de la ANV que permite financiar una parte del precio que el banco por sí solo no
      presta. Cada fila va con la frase publicada por la ANV, para que se pueda verificar sin
      creernos.
    </p>

    <div class="table-wrap mb-2">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Qué</th>
            <th>Cuánto</th>
            <th>Lo que publica la ANV</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="limit in FGCH_LIMITS" :key="limit.id">
            <td data-label="Qué" class="font-weight-medium">{{ limit.label }}</td>
            <td data-label="Cuánto">{{ limit.value }}</td>
            <td data-label="Lo que publica la ANV" class="text-medium-emphasis">
              «{{ limit.quote }}»
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>
    <p class="note text-caption text-medium-emphasis mb-6">
      Ojo con el ahorro previo: la ANV escribe «entre el 5 % y el 25 %», no «5 %». Cuál te toca lo
      define el banco con tu caso, así que el piso del rango no es una promesa.
    </p>

    <!-- IRPF -->
    <h2 class="section-heading text-h6 font-weight-bold mb-2">Qué parte baja del IRPF</h2>
    <p class="body text-body-1 mb-3" style="max-width: 68ch">
      Las cuotas del hipotecario son deducción admitida, con dos condiciones y un tope. Tiene que
      ser tu <strong>vivienda única y permanente</strong>, y la DGI exige que «el costo de la
      vivienda no haya superado UI 1:000.000». El tope anual son
      <strong>{{ MORTGAGE_DEDUCTION_BPC }} BPC</strong>, que con la BPC vigente son
      <strong>{{ money(deductionCap) }}</strong> al año.
    </p>
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-3">
      <p class="alert-title font-weight-bold mb-1">No te lo descuenta el empleador</p>
      <p class="alert-body mb-0 text-body-2">
        La deducción no baja la retención de cada mes: entra presentando la declaración jurada
        anual, formulario 1102 o 1103. Si hay dos o más titulares se reparte de común acuerdo y, si
        no lo hay, en partes iguales.
      </p>
    </VAlert>
    <p class="body text-body-2 mb-2" style="max-width: 68ch">La DGI admite las cuotas de:</p>
    <ul class="req-list mb-2">
      <li v-for="lender in DEDUCTIBLE_LENDERS" :key="lender">{{ lender }}</li>
    </ul>
    <p class="note text-caption text-medium-emphasis mb-6">
      La DGI publicó este tope en pesos para el ejercicio {{ DGI_PUBLISHED_DEDUCTION.year }}:
      {{ money(DGI_PUBLISHED_DEDUCTION.amountUyu) }}. El monto sube cada enero con la BPC, así que
      el de arriba se calcula y no se copia. Mirá también la
      <NuxtLink :to="localePath('/declaracion-de-irpf-uruguay')" class="cu-link">
        declaración de IRPF
      </NuxtLink>
      y la
      <NuxtLink :to="localePath('/herramientas/calculadora-irpf')" class="cu-link">
        calculadora de IRPF
      </NuxtLink>
      .
    </p>

    <!-- Plan UR -->
    <h2 class="section-heading text-h6 font-weight-bold mb-2">
      Si arrastrás un crédito viejo en UR
    </h2>
    <p class="body text-body-1 mb-3" style="max-width: 68ch">
      No es lo mismo pedir un préstamo hoy que deber uno de los noventa. El Plan UR de la ANV rebaja
      la tasa de créditos en Unidades Reajustables ya otorgados, siempre que el monto original no
      haya superado los <strong>USD {{ PLAN_UR_MAX_ORIGINAL_USD.toLocaleString('es-UY') }}</strong>
      a la fecha de otorgamiento y que el crédito haya sido para vivienda propia.
    </p>
    <ul class="req-list mb-6">
      <li v-for="benefit in PLAN_UR_BENEFITS" :key="benefit.id">
        Créditos {{ benefit.window }}: quedan a <strong>{{ benefit.rate }}</strong
        >.
      </li>
    </ul>

    <!-- Lo que no está acá -->
    <h2 class="section-heading text-h6 font-weight-bold mb-2">Lo que esta página no publica</h2>
    <p class="body text-body-1 mb-6" style="max-width: 68ch">
      <strong>Ninguna tasa de interés.</strong> Cada prestamista fija la suya y la mueve, y una tasa
      copiada acá envejece sin avisar: la que decide tu cuota es la del contrato que te ofrecen. Las
      condiciones propias del BHU tampoco están: su sitio rechaza toda lectura automatizada, así que
      no pudimos leerlas de la fuente, y una cifra que no se puede verificar no se publica. Lo que
      sí podés comparar antes de entrar a un mostrador es la unidad, el plazo y qué porcentaje del
      ingreso se lleva la cuota, que es lo que está acá con su fuente.
    </p>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="section-heading text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="body text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Cada cifra de esta página está leída de la fuente oficial del programa. Última lectura:
      {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in MORTGAGE_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="section-heading text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/comprar-o-alquilar-uruguay')" class="cu-link">
        ¿Comprar o alquilar?
      </NuxtLink>
      <NuxtLink :to="localePath('/venta-viviendas-uruguay')" class="cu-link">
        Viviendas en venta
      </NuxtLink>
      <NuxtLink :to="localePath('/evolucion-precio-viviendas-uruguay')" class="cu-link">
        Evolución del precio de las viviendas
      </NuxtLink>
      <NuxtLink :to="localePath('/herramientas/conversor-unidad-indexada')" class="cu-link">
        Conversor de Unidad Indexada
      </NuxtLink>
      <NuxtLink :to="localePath('/mejores-prestamos-uruguay')" class="cu-link">
        Comparativa de préstamos
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExchangeRate } from '~/types/api'
import type { FaqItem } from '~/utils/faqAnswers'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
import {
  DEDUCTIBLE_LENDERS,
  DGI_PUBLISHED_DEDUCTION,
  FGCH_LIMITS,
  FGCH_MAX_HOUSEHOLD_INCOME_UR,
  MORTGAGE_DEDUCTION_BPC,
  MORTGAGE_FAQ,
  MORTGAGE_SOURCES,
  MORTGAGE_UNITS,
  MORTGAGE_VERIFIED_AT,
  PLAN_UR_BENEFITS,
  PLAN_UR_MAX_ORIGINAL_USD,
  deductionCapUyu,
  maxPaymentFromIncome,
  urToPesos,
} from '~/utils/mortgageLoan'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()
const ur = indicatorFromSlug('unidad-reajustable')!

// Mismo recaudo que /garantia-de-alquiler-uruguay: `currentIndicatorValue` nunca devuelve null
// (cae al `referenceValue` estático del catálogo), así que la guarda de "vino viva" se hace ACÁ,
// mirando las filas crudas. Sin UR viva la página muestra el techo sólo en UR y lo dice.
const { data: urValue } = await useAsyncData('prestamo-hipotecario-ur', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  const live = rows.some(
    r =>
      r.code === ur.code &&
      ((typeof r.sell === 'number' && r.sell > 0) || (typeof r.buy === 'number' && r.buy > 0))
  )
  return live ? currentIndicatorValue(rows, ur) : null
})

const urKnown = computed(() => urValue.value != null)

const money = (n: number | null) =>
  n == null
    ? '—'
    : n.toLocaleString('es-UY', { style: 'currency', currency: 'UYU', maximumFractionDigits: 0 })

const incomeCapUyu = computed(() => urToPesos(FGCH_MAX_HOUSEHOLD_INCOME_UR, urValue.value))
const incomeCapText = computed(() => money(incomeCapUyu.value))
const maxPaymentText = computed(() =>
  incomeCapUyu.value == null ? '35 %' : money(maxPaymentFromIncome(incomeCapUyu.value))
)

// El tope del IRPF con la BPC del año: la DGI sólo publicó el monto del ejercicio 2025.
const deductionCap = deductionCapUyu()

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = longDate(MORTGAGE_VERIFIED_AT)
const faq = MORTGAGE_FAQ as FaqItem[]

const canonicalUrl = 'https://cambio-uruguay.com/prestamo-hipotecario-uruguay'
// 57 caracteres con la marca puesta, dentro de los 60 que publica Google (`seoTitleBudget`).
const title = 'Préstamo hipotecario en Uruguay: UI o UR'
// El número del día en el snippet: el techo de ingreso del FGCH en pesos con la UR viva. Sin UR se
// cae al techo en UR, que sigue siendo un dato concreto. ≤ 155 caracteres para que no se corte.
const description = computed(() => {
  const cap = incomeCapUyu.value
  const capText = cap == null ? 'UR 100' : `UR 100 (hoy ${money(cap)})`
  return `El FGCH financia hasta el 95 % de la vivienda, con cuota bajo el 35 % del ingreso y techo de ${capText}. Y 36 BPC al año bajan del IRPF.`
})

defineOgImageComponent('Cambio', {
  title: 'Préstamo hipotecario en Uruguay',
  subtitle: 'La cuota va en UI o UR · 95 % del valor · 25 años',
  tag: 'Vivienda',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'prestamo hipotecario uruguay, prestamo hipotecario bhu, prestamo hipotecario anv, fondo de garantia de creditos hipotecarios, credito hipotecario en unidades indexadas, cuota en ui o ur, deduccion irpf prestamo hipotecario, plan ur anv, cuanto me prestan para comprar casa uruguay',
    },
  ],
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
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Préstamo hipotecario',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: MORTGAGE_FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: 'Préstamo hipotecario en Uruguay: por qué la cuota va en UI o UR',
            mainEntityOfPage: canonicalUrl,
            citation: MORTGAGE_SOURCES.map(src => ({
              '@type': 'CreativeWork',
              name: src.label,
              url: src.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
/* Vuetify 4 no anula el margin-block del UA, y un párrafo que sigue a un hermano lo reimpone: cada
   bloque de texto declara el margen superior que le importa (DESIGN.md). */
.intro {
  margin-top: 0;
}
.body {
  margin-top: 0;
}
.note {
  margin-top: 4px;
}
.callout-body {
  margin-top: 4px;
}
.alert-title {
  margin-top: 0;
}
.alert-body {
  margin-top: 2px;
}
.unit-line {
  margin-top: 0;
}
.section-heading {
  margin-top: 0;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-bottom: 4px;
}
.req-list {
  padding-left: 1.1rem;
  margin: 0;
}
.req-list li {
  font-size: 0.9rem;
  margin-bottom: 4px;
}
.benchmark-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 1);
}
.benchmark {
  border: 1px solid rgba(var(--v-border-color), 0.12);
  border-radius: 10px;
  height: 100%;
}
.benchmark-note {
  margin-top: 2px;
}
</style>
