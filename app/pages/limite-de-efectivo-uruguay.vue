<template>
  <VContainer class="efectivo-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">MEDIOS DE PAGO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Límite de efectivo en Uruguay: hasta cuánto podés pagar en billetes
      </h1>
      <p class="lead mb-6">
        La Ley de Inclusión Financiera le pone un techo al efectivo en
        <strong>cualquier</strong> operación, no sólo en las grandes: podés pagar en efectivo hasta
        <strong>200.000 UI</strong>, o hasta el
        <strong>5 % del valor total de la operación</strong> si ese 5 % da más, con un máximo de
        <strong>450.000 UI</strong>. Vale la condición que más te convenga; lo que sobre va sí o sí
        por otro medio de pago.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-currency-usd" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Los dólares billete también cuentan</div>
            <p class="callout-text mb-0">
              Es el malentendido más caro de este tema. El artículo 35 define el medio de pago en
              efectivo como «el papel moneda y la moneda metálica
              <strong>sean nacionales o extranjeros</strong>»: pagar en dólares no esquiva el
              límite. Un auto pagado con un fajo de verdes está exactamente igual de alcanzado que
              uno pagado en pesos.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- La cuenta, en vivo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto es hoy, en pesos</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Los topes están escritos en Unidades Indexadas, así que en pesos se mueven todos los meses.
        Con la UI en
        <strong>{{ formatUi(valorUi) }}</strong>
        —el valor que sirve nuestra página de
        <NuxtLink :to="localePath('/indicadores/unidad-indexada')">la Unidad Indexada</NuxtLink>—
        las 200.000 UI del tope fijo son
        <strong>{{ formatPesos(uiAPesos(TOPE_FIJO_UI, valorUi)) }}</strong>
        y el techo de 450.000 UI son
        <strong>{{ formatPesos(uiAPesos(TOPE_PORCENTAJE_MAXIMO_UI, valorUi)) }}</strong
        >.
      </p>

      <VCard variant="flat" class="calc-card pa-5 pa-md-6">
        <label class="calc-label d-block mb-2" for="operacion">
          Valor total de la operación, en pesos
        </label>
        <VTextField
          id="operacion"
          v-model="operacionInput"
          type="number"
          min="0"
          step="10000"
          density="comfortable"
          variant="outlined"
          prefix="$"
          hide-details
          class="mb-5"
        />

        <div class="calc-grid">
          <div class="calc-cell">
            <p class="calc-cell__label mb-1">Podés pagar en efectivo</p>
            <p class="calc-cell__value is-cash mb-0">{{ formatPesos(resultado.efectivo) }}</p>
          </div>
          <div class="calc-cell">
            <p class="calc-cell__label mb-1">Tiene que ir por otro medio</p>
            <p class="calc-cell__value mb-0">{{ formatPesos(resultado.saldo) }}</p>
          </div>
        </div>

        <p class="calc-note text-caption text-medium-emphasis mb-0">
          <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />{{ resultado.explicacion }}
        </p>
      </VCard>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-calendar-alert" color="warning" size="18" class="mr-1" />
          <strong>Ojo con qué UI se usa.</strong> No es la del día en que firmás. El artículo 35
          cierra diciendo que los valores en unidades indexadas «se convertirán considerando la
          cotización al <strong>primer día de cada mes</strong>»: durante todo el mes el techo en
          pesos es uno solo y quedó fijado el día 1. El número de arriba usa la UI de hoy, que sirve
          para orientarte; para una operación concreta, tomá la del día 1 del mes en curso.
        </p>
      </VCard>
    </section>

    <!-- Los dos quiebres -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Por qué el tope no crece indefinidamente</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Como se aplica la condición más favorable de las dos, la curva tiene dos quiebres que casi
        nadie menciona. Hasta los 4.000.000 UI de operación manda siempre el tope fijo, porque el 5
        % todavía no llega a las 200.000 UI. Y desde los 9.000.000 UI el techo se congela: el 5 % ya
        tocó su máximo de 450.000 UI y por más que la operación siga creciendo, el efectivo
        permitido no sube un peso más.
      </p>

      <VTable class="quiebres-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Valor de la operación</th>
            <th>Efectivo permitido</th>
            <th>Qué literal manda</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in tabla" :key="fila.operacionUi">
            <td data-label="Operación" class="text-no-wrap">
              {{ formatUiCantidad(fila.operacionUi) }} UI
            </td>
            <td data-label="Efectivo" class="text-no-wrap">
              <VChip color="primary" size="small" variant="tonal">
                {{ formatUiCantidad(fila.efectivoUi) }} UI
              </VChip>
            </td>
            <td data-label="Literal" class="text-caption text-medium-emphasis">
              {{ fila.literalLabel }}
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-content-cut" color="warning" size="18" class="mr-1" />
          <strong>Fraccionar no sirve.</strong> El artículo 37 es explícito: para determinar los
          montos «se sumarán los importes de todos los pagos en que se haya fraccionado la operación
          o negocio jurídico». Lo que se mira es la operación entera, no cada entrega por separado.
        </p>
      </VCard>
    </section>

    <!-- Los artículos derogados -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Si leíste que los autos y las casas tienen su propia regla, está viejo
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La Ley 19.210 original traía regímenes separados para vender bienes, autos e inmuebles. La
        LUC los borró de un saque en 2020 y casi nadie actualizó lo que había escrito: hoy hay
        <strong>un solo artículo</strong>, el 35, y vale para todo por igual.
      </p>

      <div class="derogados">
        <div v-for="art in ARTICULOS_DEROGADOS" :key="art.articulo" class="derogado">
          <p class="derogado__head mb-1">
            <VIcon icon="mdi-close-circle-outline" size="16" class="mr-1" />
            <strong>{{ art.articulo }}</strong> — {{ art.trataba }}
          </p>
          <p class="derogado__note text-caption text-medium-emphasis mb-0">
            Derogado por {{ art.derogadoPor }}.
            <a :href="art.url" target="_blank" rel="noopener nofollow">Ver en IMPO</a>
          </p>
        </div>
      </div>
    </section>

    <!-- Excepciones -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuándo el tope no aplica</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El artículo 38 deja fuera las operaciones en las que una de las partes es una entidad
        financiera regulada por el Banco Central. Para este sitio importa una en particular:
        <strong>cambiar dólares en una casa de cambio no está alcanzado por el tope</strong>.
      </p>

      <ul class="excepciones">
        <li v-for="(exc, i) in EXCEPCIONES" :key="i">
          <VIcon icon="mdi-shield-check-outline" size="16" color="primary" class="mr-1" />{{ exc }}
        </li>
      </ul>

      <p class="section-intro text-medium-emphasis mt-5 mb-0">
        Eso no vuelve invisible la operación: las casas de cambio tienen sus propias obligaciones de
        registro y de prevención de lavado. Sólo significa que el techo del artículo 35 no es lo que
        te limita ahí. Mirá también
        <NuxtLink :to="localePath('/casas-de-cambio')">las casas de cambio de Uruguay</NuxtLink> y
        <NuxtLink :to="localePath('/guias/documentos-para-cambiar-dolares-uruguay')"
          >qué documentos te piden para cambiar</NuxtLink
        >.
      </p>
    </section>

    <!-- Multa -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué pasa si se incumple</h2>
      <VCard variant="flat" class="formula-card pa-5 pa-md-6">
        <div class="formula mb-3">
          <span class="term is-law">25 % del monto mal pagado</span>
          <span class="op">o</span>
          <span class="term is-law">10.000 UI</span>
          <span class="op">→</span>
          <span class="term is-result">el mayor de los dos</span>
        </div>
        <p class="formula-note mb-3">
          Es una multa <em>máxima</em>: el artículo 46 dice que «podrá alcanzar al mayor» de esos
          dos valores, y lo que se aplique en cada caso lo fija la reglamentación. Con la UI de hoy,
          el piso de 10.000 UI equivale a
          <strong>{{ formatPesos(uiAPesos(MULTA_PISO_UI, valorUi)) }}</strong
          >.
        </p>
        <p class="formula-note mb-0">
          <strong>Responden los dos lados.</strong> El mismo artículo hace responsables «en forma
          solidaria tanto quienes paguen como quienes reciban dichos pagos». La única excepción son
          los honorarios profesionales y los pagos a trabajadores fuera de la relación de
          dependencia, donde responde únicamente quien cobra. Controla la Administración Tributaria
          y las infracciones prescriben a los {{ PRESCRIPCION_ANIOS }} años.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-5">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in CASH_LIMIT_FAQ" :key="f.question" :title="f.question">
          <template #text>
            <p class="faq-answer mb-0">{{ f.answer }}</p>
          </template>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-2">Fuentes</h2>
      <p class="sources-note text-caption text-medium-emphasis mb-3">
        Todo lo de esta página sale del texto vigente en IMPO, verificado el
        {{ CASH_LIMIT_VERIFIED_AT }}. Es información general y no asesoramiento para tu caso.
      </p>
      <ul class="sources-list text-caption text-medium-emphasis">
        <li v-for="s in CASH_LIMIT_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener nofollow">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import type { ExchangeRate } from '~/types/api'
import {
  ARTICULOS_DEROGADOS,
  CASH_LIMIT_FAQ,
  CASH_LIMIT_SOURCES,
  CASH_LIMIT_VERIFIED_AT,
  EXCEPCIONES,
  MULTA_PISO_UI,
  PRESCRIPCION_ANIOS,
  TOPE_FIJO_UI,
  TOPE_PORCENTAJE_MAXIMO_UI,
  topeEfectivo,
  uiAPesos,
} from '~/utils/cashLimit'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const uiIndicator = indicatorFromSlug('unidad-indexada')!

// Mismo origen que /indicadores: la fila del BCU manda y, si la API no contesta, cae al valor de
// referencia del catálogo. Nunca queda en 0, así que las conversiones de la página no muestran $ 0.
const { data: uiValue } = await useAsyncData('limite-efectivo-ui', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return currentIndicatorValue(rows, uiIndicator)
})

const valorUi = computed(() => uiValue.value ?? uiIndicator.referenceValue)

const operacionInput = ref('1500000')

const resultado = computed(() => {
  const pesos = Number(operacionInput.value)
  const operacionPesos = Number.isFinite(pesos) && pesos > 0 ? pesos : 0
  const operacionUi = valorUi.value > 0 ? operacionPesos / valorUi.value : 0
  const tope = topeEfectivo(operacionUi)

  const explicacion =
    operacionUi <= 0
      ? 'Escribí el valor de la operación para ver cuánto podés entregar en billetes.'
      : tope.literal === 'fijo'
        ? 'Manda el literal a: las 200.000 UI fijas, porque el 5 % de esta operación queda por debajo.'
        : tope.literal === 'porcentaje'
          ? 'Manda el literal b: el 5 % de la operación supera las 200.000 UI y todavía no llegó al techo.'
          : 'Manda el literal b topeado: el 5 % pasó las 450.000 UI, así que el efectivo permitido quedó congelado ahí.'

  return {
    efectivo: uiAPesos(tope.efectivoUi, valorUi.value),
    saldo: uiAPesos(tope.saldoUi, valorUi.value),
    explicacion,
  }
})

/** Las cuatro filas que muestran los dos quiebres de la curva, calculadas y no escritas a mano. */
const tabla = computed(() =>
  [500_000, 4_000_000, 6_000_000, 12_000_000].map(operacionUi => {
    const tope = topeEfectivo(operacionUi)
    return {
      operacionUi,
      efectivoUi: tope.efectivoUi,
      literalLabel:
        tope.literal === 'fijo'
          ? 'a) el tope fijo de 200.000 UI'
          : tope.literal === 'porcentaje'
            ? 'b) el 5 % de la operación'
            : 'b) el 5 %, ya topeado en 450.000 UI',
    }
  })
)

const formatPesos = (n: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const formatUi = (n: number): string =>
  n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const formatUiCantidad = (n: number): string => n.toLocaleString('es-UY')

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/limite-de-efectivo-uruguay'
const title = 'Límite de efectivo en Uruguay: hasta cuánto podés pagar en billetes'
const description =
  'Podés pagar en efectivo hasta 200.000 UI, o el 5 % de la operación si da más, con tope de 450.000 UI (Ley 19.210 art. 35, redacción de la Ley 20.469 de 2026). Los dólares billete cuentan, el excedente va sí o sí por otro medio, y la multa alcanza el 25 % o 10.000 UI.'

defineOgImageComponent('Cambio', {
  title: 'Límite de efectivo en Uruguay',
  subtitle: '200.000 UI, o el 5 % con techo de 450.000 UI',
  tag: 'MEDIOS DE PAGO',
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
        'limite de efectivo uruguay, hasta cuanto puedo pagar en efectivo uruguay, ley de inclusion financiera efectivo, ley 19210 articulo 35, pagar un auto en efectivo uruguay, comprar una casa en efectivo uruguay, tope efectivo 200000 UI, ley 20469, multa pagar en efectivo uruguay, dolares en efectivo limite uruguay',
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
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Límite de efectivo en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: CASH_LIMIT_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: CASH_LIMIT_SOURCES.map(s => ({
              '@type': 'CreativeWork',
              name: s.label,
              url: s.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.efectivo-page {
  max-width: 1180px;
}

/* Vuetify 4 no cero los márgenes de los bloques de texto, y un <p> que sigue a un hermano se come
   cualquier separación menor a 1em: por eso cada uno declara el suyo. Ver app/AGENTS.md. */
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  margin-top: 0;
}
.section-intro,
.formula-note,
.sources-note,
.callout-text,
.note-text,
.faq-answer,
.calc-note {
  max-width: 72ch;
  margin-top: 0;
}

.warn-card,
.formula-card,
.note-card,
.calc-card,
.derogado {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.warn-card {
  background: rgba(var(--v-theme-primary), 0.06);
}
.note-card {
  background: rgba(var(--v-theme-warning), 0.06);
}

.calc-label {
  font-size: 0.9rem;
  font-weight: 600;
}
.calc-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.calc-cell {
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.05);
}
.calc-cell__label {
  font-size: 0.85rem;
  opacity: 0.75;
  margin-top: 0;
}
.calc-cell__value {
  font-size: 1.35rem;
  font-weight: 700;
  margin-top: 0;
}
.calc-cell__value.is-cash {
  color: rgb(var(--v-theme-primary));
}

.quiebres-table :deep(th) {
  white-space: nowrap;
}

.derogados {
  display: grid;
  gap: 12px;
}
.derogado {
  padding: 14px 16px;
}
.derogado__head {
  margin-top: 0;
}
.derogado__note {
  margin-top: 0;
}
.derogado__note a {
  color: rgb(var(--v-theme-primary));
}

.excepciones {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
  display: grid;
  gap: 10px;
  max-width: 78ch;
}
.excepciones li {
  line-height: 1.55;
}

.formula {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  margin-bottom: 12px;
}
.formula .term {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.formula .term.is-law {
  background: rgba(var(--v-theme-primary), 0.16);
  font-weight: 600;
}
.formula .term.is-result {
  background: rgba(22, 199, 132, 0.16);
  font-weight: 600;
}
.formula .op {
  opacity: 0.6;
}

.sources-list {
  padding-left: 1.1rem;
  margin-top: 0;
}
.sources-list li {
  margin-bottom: 6px;
  line-height: 1.5;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
}
</style>
