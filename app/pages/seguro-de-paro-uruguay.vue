<template>
  <VContainer class="paro-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">TRABAJO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Seguro de paro: cuánto cobrás, cuántos meses y por qué baja
      </h1>
      <p class="lead mb-6">
        La pregunta que más se repite no es cuánto cobro: es
        <strong>por qué cada mes me pagan menos</strong>. La respuesta es que la causal despido es
        decreciente por diseño —del 66 % al 40 % del promedio— y que además
        <strong>cada mes tiene su propio tope</strong>, que también baja. Las otras dos causales no
        funcionan así: suspensión total y trabajo reducido van al 50 % fijo. Acá está la cuenta con
        los porcentajes y los topes {{ capsYear }} que publica BPS.
      </p>

      <VCard class="mechanism-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-3">Las tres causales</div>
        <div class="causal-grid">
          <div v-for="c in CAUSALES" :key="c.id" class="causal-item">
            <div class="causal-h">{{ c.label }}</div>
            <div class="causal-n">{{ c.months }} meses</div>
            <p class="mb-0">{{ c.what }}</p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Calculator -->
    <section id="calculadora" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Calculá lo tuyo</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Se calcula sobre el promedio mensual de tus remuneraciones
        <strong>nominales</strong> de los últimos seis meses, no sobre el líquido.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="form.averageNominal"
              type="number"
              label="Promedio nominal de los últimos 6 meses"
              prefix="$"
              min="0"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VSelect
              v-model="form.causal"
              :items="causalItems"
              item-title="label"
              item-value="id"
              label="Causal"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VTextField
              v-if="form.causal === 'reduccion'"
              v-model.number="form.reducedIncome"
              type="number"
              label="Lo que seguís cobrando de la empresa por mes"
              prefix="$"
              min="0"
              density="comfortable"
              variant="outlined"
              hint="Se cobra la diferencia contra el 50 % del promedio, no contra el 66 %."
              persistent-hint
              class="mb-4"
            />
            <VTextField
              v-model.number="form.age"
              type="number"
              label="Edad al configurarse la causal"
              min="14"
              max="99"
              density="comfortable"
              variant="outlined"
              hint="Con 50 o más se extiende 6 meses, pero sólo en la causal despido (art. 6.3)."
              persistent-hint
              class="mb-4"
            />
            <VSwitch
              v-model="form.hasDependants"
              color="primary"
              density="comfortable"
              hide-details
              :label="`Tengo cargas familiares (complemento del ${FAMILY_COMPLEMENT_PCT} %)`"
            />
            <p class="text-caption text-medium-emphasis mb-0 mt-2">
              Cónyuge, concubino, hijos menores o personas a cargo con ingresos de hasta 1 BPC ({{
                formatUYU(bpc)
              }}). Se pide en BPS: no sale solo.
            </p>
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard variant="flat" class="verdict-card pa-5 mb-4">
            <div class="text-overline mb-2">Tu estimación</div>
            <p class="text-h6 font-weight-bold mb-2">
              {{ formatUYU(result.months[0]?.amount ?? 0) }} el primer mes,
              {{ formatUYU(result.months[result.months.length - 1]?.amount ?? 0) }} el último.
            </p>
            <p class="mb-0 text-medium-emphasis">
              {{ result.totalMonths }} meses en total · {{ formatUYU(result.total) }} sumando todo
              el período. Son importes <strong>nominales</strong>: sobre eso todavía se aporta al
              FONASA.
            </p>
          </VCard>

          <VCard variant="flat" class="results-card pa-0">
            <VTable class="cu-mobile-cards" density="comfortable">
              <thead>
                <tr>
                  <th>Mes</th>
                  <th class="text-right">%</th>
                  <th class="text-right">Tope {{ capsYear }}</th>
                  <th class="text-right">Cobrás</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="m in result.months"
                  :key="m.month"
                  :class="{ 'is-extension': m.isExtension }"
                >
                  <td data-label="Mes">
                    {{ m.month }}
                    <VChip v-if="m.isExtension" size="x-small" variant="tonal" color="info">
                      extensión 50+
                    </VChip>
                  </td>
                  <td data-label="%" class="text-right">{{ m.percentage }} %</td>
                  <td data-label="Tope" class="text-right">
                    <span :class="m.cappedByLimit ? 'text-warning font-weight-medium' : ''">
                      {{ m.cap === null ? '—' : formatUYU(m.cap) }}
                    </span>
                  </td>
                  <td data-label="Cobrás" class="text-right">
                    <strong>{{ formatUYU(m.amount) }}</strong>
                    <div v-if="m.raisedToFloor" class="text-caption text-medium-emphasis">
                      levantado hasta el mínimo de {{ formatUYU(m.floor ?? 0) }}
                    </div>
                    <div v-if="m.complement > 0" class="text-caption text-medium-emphasis">
                      incluye {{ formatUYU(m.complement) }} de complemento
                    </div>
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>

          <VAlert
            v-for="(n, i) in result.notes"
            :key="i"
            type="info"
            variant="tonal"
            density="comfortable"
            class="mt-3"
          >
            {{ n }}
          </VAlert>
        </VCol>
      </VRow>
    </section>

    <!-- Requirements -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué tenés que tener aportado</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        En industria y comercio se miran los <strong>12 meses anteriores</strong> a que se configure
        la causal, y ahí la palabra clave es que
        <strong>los requisitos son acumulativos, no alternativas</strong>: tener los 150 jornales
        sin los 180 días en planilla no alcanza. En el rural y en el servicio doméstico no traslades
        esos números: <strong>cambia el período y cambian también las cantidades</strong> —al rural
        mensual BPS le pide 270 días, no 180—, y el jornalero rural tiene un solo requisito, los 225
        jornales.
      </p>
      <VRow>
        <VCol v-for="r in REQUIREMENTS" :key="r.label" cols="12" md="6" lg="4">
          <VCard variant="flat" class="req-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ r.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ r.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Exit rules -->
    <section id="como-terminaste" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cómo terminó el vínculo</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Es lo primero que mira BPS y lo último que pregunta el trabajador. Lo que decide no es si te
        pagaron la indemnización: es si la desocupación fue
        <strong>forzosa y no imputable a tu voluntad</strong>, como pide el artículo 2 del
        Decreto-Ley 15.180.
      </p>

      <div class="rule-list">
        <VCard
          v-for="r in EXIT_RULES"
          :key="r.situation"
          variant="flat"
          class="rule-card pa-5"
          :class="r.gives ? 'is-yes' : 'is-no'"
        >
          <div class="rule-head mb-2">
            <VChip :color="r.gives ? 'success' : 'error'" size="small" variant="tonal" label>
              {{ r.gives ? 'Da derecho' : 'No da derecho' }}
            </VChip>
            <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ r.situation }}</h3>
          </div>
          <p class="mb-0 text-medium-emphasis">{{ r.detail }}</p>
        </VCard>
      </div>

      <VCard variant="flat" class="req-card pa-5 mt-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">
          Si la causal que declararon no es la real
        </h3>
        <p class="text-medium-emphasis mb-3">
          BPS no discute el fondo en la ventanilla. Para pelear la causal pide uno de estos dos
          papeles, y nada más:
        </p>
        <ul class="mb-3 pl-4">
          <li v-for="(p, i) in CAUSAL_DISPUTE_PROOF" :key="i" class="mb-1">{{ p }}</li>
        </ul>
        <p class="mb-0 text-medium-emphasis">
          Conseguirlos lleva meses, así que reservá el derecho en plazo mientras tanto: son trámites
          separados.
        </p>
      </VCard>
    </section>

    <!-- Partial unemployment: suspension and reduced schedule -->
    <section id="paro-parcial" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Paro parcial: reducción de jornada o suspensión</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        BPS junta estas dos causales en una sola página y un solo trámite: te suspendieron —no
        trabajás ni cobrás sueldo, pero seguís siendo empleado— o te bajaron la jornada
        <strong>al menos un 25 %</strong>. En las dos rige el 50 % fijo del artículo 7.2, no la
        escala decreciente del despido.
      </p>

      <VRow class="mb-5">
        <VCol cols="12" md="6">
          <VCard variant="flat" class="req-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Cuánto se cobra</h3>
            <p class="mb-0 text-medium-emphasis">
              Mensuales y destajistas: <strong>50 % del promedio</strong> de los últimos seis meses
              enteros. Jornaleros: <strong>12 jornales por mes</strong>, calculados con esos mismos
              seis meses. En reducción se liquida por el período de la reducción, en proporción a
              los días desocupados, y el destajista tiene subsidio parcial recién cuando la
              reducción supera el 25 %.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="req-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">El trámite</h3>
            <p class="mb-0 text-medium-emphasis">
              La empresa tiene que ingresar la solicitud en línea dentro de los
              <strong>10 días hábiles</strong> desde que se configura la causal. Si se niega a
              hacerlo, el trabajador puede presentarse en las oficinas de BPS dentro de los
              <strong>30 días corridos</strong> para reservar el derecho mientras se resuelve.
            </p>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Situación</th>
              <th scope="col">Cuánto cobrás</th>
              <th scope="col" class="text-right">Tope</th>
              <th scope="col">Duración</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in partialTable" :key="row.situation">
              <td data-label="Situación">{{ row.situation }}</td>
              <td data-label="Cuánto cobrás">{{ row.amount }}</td>
              <td data-label="Tope" class="text-right">{{ formatUYU(row.cap) }}</td>
              <td data-label="Duración">{{ row.duration }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        El mínimo, {{ formatUYU(BENEFIT_FLOOR) }}, y el complemento del
        {{ FAMILY_COMPLEMENT_PCT }} % por cónyuge, hijos o personas a cargo con ingresos de hasta 1
        BPC ({{ formatUYU(bpc) }}) son los mismos que en la causal despido, y alcanzan a la
        suspensión total (el trabajo reducido no lleva mínimo). Fuente:
        <a
          href="https://www.bps.gub.uy/18239/subsidio-por-desempleo-por-suspension.html"
          target="_blank"
          rel="noopener noreferrer"
          >BPS — Subsidio por desempleo por suspensión</a
        >.
      </p>
    </section>

    <!-- Coverage -->
    <section id="a-quien-ampara" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">A quién ampara</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        El caso base son los empleados de la actividad privada. Todo lo demás entra porque una norma
        lo incorporó y BPS lo enumera por su nombre o por su vínculo funcional. Esto reproduce esa
        enumeración: es un mapa para buscar tu caso, no una lista clausurada.
        <strong>Si no encontrás el tuyo, preguntalo por escrito en BPS</strong> en vez de deducir
        que estás afuera.
      </p>

      <div class="rule-list">
        <VCard
          v-for="c in COVERAGE_RULES"
          :key="c.label"
          variant="flat"
          class="rule-card pa-5"
          :class="c.covered ? 'is-yes' : 'is-no'"
        >
          <div class="rule-head mb-2">
            <VChip :color="c.covered ? 'success' : 'error'" size="small" variant="tonal" label>
              {{ c.covered ? 'En la lista' : 'Restricción' }}
            </VChip>
            <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ c.label }}</h3>
          </div>
          <p class="mb-0 text-medium-emphasis">{{ c.detail }}</p>
        </VCard>
      </div>
    </section>

    <!-- Termination -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué te corta el subsidio</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Es la parte que más sorpresas da, y la causa más común de que después BPS reclame que
        devuelvas lo cobrado. Cada corte va con las condiciones que le pone la norma: sin ellas,
        asusta a gente que no está en esa situación.
      </p>
      <VCard variant="flat" class="warn-card pa-5">
        <ul class="mb-0 pl-4">
          <li v-for="(c, i) in TERMINATION_CAUSES" :key="i" class="mb-2">{{ c }}</li>
        </ul>
      </VCard>
    </section>

    <!-- Unipersonal -->
    <section id="unipersonal" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Y si abro una unipersonal mientras cobro?</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">
        Acá no vas a encontrar la respuesta que querés escuchar, porque
        <strong>no existe fuente oficial que la diga</strong>. Lo que sí se puede publicar es la
        tensión real entre lo que dice la norma y lo que dice la restricción de BPS.
      </p>
      <VCard variant="flat" class="warn-card pa-5">
        <ul class="mb-0 pl-4">
          <li v-for="(u, i) in UNIPERSONAL_WHILE_ON_BENEFIT" :key="i" class="mb-2">{{ u }}</li>
        </ul>
      </VCard>
    </section>

    <!-- Procedure -->
    <section id="tramite" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El trámite</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Lo arranca la empresa, así que el trabajador se entera de que no se ingresó cuando ya pasó
        el plazo. Por eso el paso que importa no es «solicitar» sino
        <strong>«reservar el derecho»</strong>: es lo único que se puede hacer sin que la empresa
        colabore.
      </p>

      <div class="step-list">
        <VCard
          v-for="s in PROCEDURE_STEPS"
          :key="s.n"
          variant="flat"
          class="rule-card step-card pa-5"
        >
          <div class="rule-head mb-2">
            <span class="step-n" aria-hidden="true">{{ s.n }}</span>
            <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ s.title }}</h3>
          </div>
          <p class="mb-0 text-medium-emphasis">{{ s.detail }}</p>
        </VCard>
      </div>

      <VCard variant="flat" class="req-card pa-5 mt-4">
        <h3 class="text-subtitle-1 font-weight-bold mb-2">Cuando se te agota</h3>
        <p class="mb-0 text-medium-emphasis">
          El artículo 6.4 pide dos cosas, y la segunda es la que se suele omitir: que hayan pasado
          <strong>{{ repeatAfterMonths }} meses</strong> desde la última prestación,
          <strong>{{ repeatContributionMonths }} de ellos de aportación efectiva</strong>, y que
          vuelvas a reunir «las restantes condiciones requeridas». No alcanza con dejar correr el
          año: hay que haber vuelto a aportar medio.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in UNEMPLOYMENT_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ f.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Cifras contrastadas el {{ verifiedAt }}. Los topes los actualiza BPS: esta página es
        informativa y la resolución de BPS es la que vale.
      </p>
      <ul class="sources-list">
        <li v-for="s in UNEMPLOYMENT_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { URUGUAY } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'
import {
  BENEFIT_FLOOR,
  CAUSAL_DISPUTE_PROOF,
  CAUSALES,
  COVERAGE_RULES,
  EXIT_RULES,
  FAMILY_COMPLEMENT_PCT,
  PROCEDURE_STEPS,
  REPEAT_AFTER_MONTHS,
  REPEAT_CONTRIBUTION_MONTHS,
  REQUIREMENTS,
  SUSPENSION_CAP,
  SUSPENSION_PERCENTAGE,
  TERMINATION_CAUSES,
  UNEMPLOYMENT_CAPS_YEAR,
  UNEMPLOYMENT_FAQ,
  UNEMPLOYMENT_SOURCES,
  UNEMPLOYMENT_VERIFIED_AT,
  UNIPERSONAL_WHILE_ON_BENEFIT,
  estimateUnemploymentBenefit,
  type BenefitInput,
} from '~/utils/unemploymentBenefit'

const form = reactive<BenefitInput>({
  averageNominal: 60000,
  causal: 'despido',
  age: 35,
  hasDependants: false,
  reducedIncome: 0,
})

/** Un campo numérico vacío es NaN, no 0: el motor nunca debe recibirlo. */
const sane = computed<BenefitInput>(() => ({
  averageNominal: Number.isFinite(form.averageNominal) ? Math.max(0, form.averageNominal) : 0,
  causal: form.causal,
  age: Number.isFinite(form.age) ? form.age : 0,
  hasDependants: form.hasDependants,
  reducedIncome: Number.isFinite(form.reducedIncome ?? 0)
    ? Math.max(0, form.reducedIncome ?? 0)
    : 0,
}))

const result = computed(() => estimateUnemploymentBenefit(sane.value))
const causalItems = CAUSALES.map(c => ({ id: c.id, label: c.label }))
const bpc = URUGUAY.bpc
const capsYear = UNEMPLOYMENT_CAPS_YEAR
const repeatAfterMonths = REPEAT_AFTER_MONTHS
const repeatContributionMonths = REPEAT_CONTRIBUTION_MONTHS

/** Tabla chica de "Paro parcial": arma el texto sobre los datos ya publicados por el motor, sin
 * duplicar ningún importe (SUSPENSION_CAP, SUSPENSION_PERCENTAGE, meses/jornales de CAUSALES).
 * OJO CON LA DURACIÓN DE "REDUCCIÓN": BPS sólo publica "72 jornales" para esa causal (no un
 * equivalente en meses, a diferencia de la suspensión total, que sí trae "4 meses o 48
 * jornales"). `CAUSALES.reduccion.months` existe para la extensión por 50 años y el motor de
 * cálculo (ver el test que fija "dura 6 meses o 72 jornales, como dice el artículo 6.1"), pero acá
 * no se muestra: mostrar "6 meses" en esta tabla sería publicar un dato que BPS no publica para
 * esta causal. */
const suspensionCausal = CAUSALES.find(c => c.id === 'suspension')!
const reduccionCausal = CAUSALES.find(c => c.id === 'reduccion')!
const partialTable = [
  {
    situation: 'Suspensión total',
    amount: `${SUSPENSION_PERCENTAGE} % del promedio (12 jornales por mes si cobrás por jornal)`,
    cap: SUSPENSION_CAP,
    duration: `${suspensionCausal.months} meses o ${suspensionCausal.jornales} jornales`,
  },
  {
    situation: 'Reducción de jornada (≥25 %)',
    amount: `Diferencia entre el ${SUSPENSION_PERCENTAGE} % del promedio y lo que seguís cobrando`,
    cap: SUSPENSION_CAP,
    duration: `${reduccionCausal.jornales} jornales`,
  },
]

const verifiedAt = new Date(UNEMPLOYMENT_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/seguro-de-paro-uruguay'
const title = 'Seguro de paro por despido: 66 % a 40 %'
const description =
  'Por despido cobrás 66 % a 40 % del promedio, con topes de $ 93.155 a $ 50.802 en 2026; por suspensión o reducción, 50 % fijo. Calculadora y requisitos.'

defineOgImageComponent('Cambio', {
  title: 'Seguro de paro: cuánto cobrás',
  subtitle: 'Porcentajes y topes 2026 de BPS',
  tag: 'TRABAJO',
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
        'seguro de paro uruguay, cuanto cobro seguro de paro, subsidio por desempleo bps, seguro de paro cuantos meses, por que baja el seguro de paro, tope seguro de paro 2026, seguro de paro suspension, trabajo reducido bps, complemento 20 cargas familiares, seguro de paro 50 años, requisitos seguro de paro, seguro de paro parcial, paro parcial, cuanto se cobra en el seguro de paro, seguro de paro reduccion de jornada',
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
              { '@type': 'ListItem', position: 2, name: 'Seguro de paro', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: UNEMPLOYMENT_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.paro-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .lead {
  color: rgba(0, 0, 0, 0.76);
}

.mechanism-card,
.form-card,
.verdict-card,
.results-card,
.req-card,
.warn-card,
.rule-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .mechanism-card,
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .results-card,
.v-theme--light .req-card,
.v-theme--light .warn-card,
.v-theme--light .rule-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
/* El acento va en el borde COMPLETO, no en un tab lateral: estas tarjetas ya traen borde propio
   y superponerle una barra de color gruesa de un lado las despega del resto del sitio. */
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.45);
}

.rule-list,
.step-list {
  display: grid;
  gap: 0.85rem;
}
.rule-card.is-yes {
  border-color: rgba(var(--v-theme-success), 0.4);
}
.rule-card.is-no {
  border-color: rgba(var(--v-theme-error), 0.4);
}
.step-card {
  border-color: rgba(var(--v-theme-primary), 0.3);
}
.rule-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}
.step-n {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  font-weight: 700;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
}

.causal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.25rem;
}
/* Marcador de lista, no tab de tarjeta: estos ítems no tienen fondo ni borde propio. Y como el
   color es el mismo en las tres causales, no codifica nada — así que va fino y atenuado. */
.causal-item {
  padding-left: 0.9rem;
  border-left: 2px solid rgba(var(--v-theme-primary), 0.45);
}
.causal-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}
.causal-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.3;
}

.results-card :deep(tr.is-extension) {
  background: rgba(var(--v-theme-info), 0.07);
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
