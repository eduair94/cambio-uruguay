<template>
  <VContainer class="rc-page pb-8">
    <div class="mb-3">
      <VBtn
        :to="localePath('/alquilar-en-uruguay')"
        variant="text"
        size="small"
        class="cu-btn-flush"
      >
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Guía para alquilar
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Vivienda · Clearing · Verificado en {{ reviewedMonthLabel }}</p>
        <h1 class="hero-title">{{ t('clearing.title') }}</h1>
        <p class="hero-lead">
          “Nunca alquilé y estoy en el clearing por una deuda con la telefónica.” Se puede: lo que
          cambia es <strong>por qué puerta entrás</strong>. El seguro de alquiler es donde llega el
          rechazo (Porto Seguro lo publica como excluyente), pero el depósito, el dueño directo, un
          garante y hasta la garantía del Estado <strong>no dependen de tu clearing</strong> o lo
          toleran, y ANDA y FIDECIU publican que estudian tu caso. Acá está cuál te sirve, con la
          fuente de cada dato.
        </p>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons text="Cómo alquilar estando en el clearing en Uruguay" />
        </div>
      </div>
    </VCard>

    <ContentTaskLinks
      class="mb-5"
      :label="t('clearing.navigation')"
      :items="[
        { label: t('clearing.matcher'), to: '#opciones-de-garantia' },
        { label: t('clearing.guarantees'), to: '#requisitos-de-garantias' },
        { label: t('clearing.listings'), to: localePath('/alquileres-uruguay') },
      ]"
    />

    <!-- The short answer, derived from the same data as the table and the cards below -->
    <section class="mb-8" aria-labelledby="respuesta-corta">
      <h2 id="respuesta-corta" class="section-heading mb-3 clearing-entry-anchor">
        La respuesta corta: quién te acepta estando en el clearing
      </h2>
      <div class="answer-grid">
        <div
          v-for="group in answerGroups"
          :key="group.id"
          class="answer-group"
          :class="`answer-group--${group.id}`"
        >
          <h3 class="answer-title">{{ group.title }}</h3>
          <ul class="answer-list">
            <li v-for="route in group.routes" :key="route.id">
              <a :href="`#garantia-${route.id}`" class="answer-link">{{ route.name }}</a
              >: {{ route.verdictLine }}
            </li>
            <li v-if="group.id === 'rechazan'">
              <a href="#aseguradoras" class="answer-link">{{ otherInsurersNames }}</a
              >: ninguna publica que acepte personas en el Clearing.
            </li>
          </ul>
        </div>
      </div>
      <p class="text-body-2 text-medium-emphasis mt-3 mb-0">
        Leído en el sitio de cada una el {{ lastReviewedLabel }}.
        <NuxtLink :to="localePath('/garantia-de-alquiler-uruguay')" class="answer-link">
          Cuánto cuesta cada garantía y los topes del Estado en pesos
        </NuxtLink>
      </p>
    </section>

    <!-- Where does the debt sit -->
    <h2 class="section-heading mb-1">Primero: ¿dónde figura tu deuda?</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      No es lo mismo deberle a una telefónica que a un banco. Son dos registros distintos, y de eso
      depende qué garantías te van a costar.
    </p>
    <VRow class="mb-4">
      <VCol cols="12" md="6">
        <VCard variant="flat" class="reg-card pa-5 h-100">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon color="warning">mdi-domain</VIcon>
            <h3 class="text-subtitle-1 font-weight-bold mb-0">Clearing de Informes</h3>
            <VChip size="x-small" variant="tonal" color="warning">Privado</VChip>
          </div>
          <p class="text-body-2 mb-2">
            Empresa privada (Equifax). Registra incumplimientos que le reportan comercios,
            financieras y <strong>servicios como Movistar, Antel o UTE</strong>. Es el que consultan
            aseguradoras e inmobiliarias.
          </p>
          <ul class="reg-list">
            <li>Es donde suele caer una deuda de telefonía.</li>
            <li>Caduca a los <strong>5 años</strong> desde que se incorpora el dato.</li>
            <li>Podés ver tu historial <strong>gratis cada 6 meses</strong> (Ley 18.331).</li>
          </ul>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard variant="flat" class="reg-card pa-5 h-100">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon color="primary">mdi-bank</VIcon>
            <h3 class="text-subtitle-1 font-weight-bold mb-0">Central de Riesgos del BCU</h3>
            <VChip size="x-small" variant="tonal" color="primary">Oficial</VChip>
          </div>
          <p class="text-body-2 mb-2">
            El registro del Banco Central. Solo consolida créditos con
            <strong>bancos y financieras reguladas</strong>, con una categoría de 1A a 5. Una deuda
            con una telefónica <strong>no</strong> aparece acá.
          </p>
          <ul class="reg-list">
            <li>
              La categoría <strong>4 o 5</strong> es la que bloquea el Fondo de Garantía de
              Alquiler.
            </li>
            <li>Podés estar en el Clearing y no en el BCU (y al revés).</li>
            <li>La consulta de tu situación es gratis y online.</li>
          </ul>
        </VCard>
      </VCol>
    </VRow>
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-2">
      Si tu deuda es solo con una telefónica, lo más probable es que estés en el Clearing y
      <strong>no</strong> en la Central de Riesgos del BCU. Eso te abre más puertas de las que
      pensás. ¿Querés entender y ordenar tu situación de deuda?
      <div class="mt-2">
        <VBtn :to="localePath('/salir-del-clearing')" size="small" variant="flat" color="primary">
          Ver la guía del clearing
          <VIcon end size="small">mdi-arrow-right</VIcon>
        </VBtn>
      </div>
    </VAlert>

    <!-- Matcher -->
    <h2 id="opciones-de-garantia" class="section-heading mb-1 mt-8 clearing-entry-anchor">
      Tu situación: ¿qué garantía te conviene?
    </h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Respondé seis cosas y te ordenamos las rutas de mejor a peor para tu caso. No promete
      aprobación: te dice dónde tenés más chance y dónde vas a chocar, con el motivo.
    </p>

    <VCard variant="flat" class="section-card matcher pa-4 pa-sm-6 mb-4">
      <VRow>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="form.debt"
            :items="debtOptions"
            label="Mi deuda es sobre todo con…"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="form.income"
            :items="incomeOptions"
            label="Mis ingresos son…"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="form.guarantor"
            :items="guarantorOptions"
            label="¿Tenés un garante con perfil limpio?"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="form.advance"
            :items="advanceOptions"
            label="¿Cuánto podrías adelantar o depositar?"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="form.directOwner"
            :items="directOwnerOptions"
            label="¿Alquilarías a un dueño directo?"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="form.cgn"
            :items="cgnOptions"
            label="¿Funcionario público o jubilado?"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VDivider class="my-5" />

      <div class="text-overline text-medium-emphasis mb-3">Tus rutas, ordenadas</div>
      <TransitionGroup name="rc-list" tag="div" class="route-list">
        <div v-for="(item, i) in ranked" :key="item.route.id" class="route-item">
          <div class="route-rank">{{ i + 1 }}</div>
          <div class="route-body">
            <div class="d-flex align-center flex-wrap ga-2 mb-1">
              <strong class="route-name">{{ item.route.name }}</strong>
              <VChip :color="fitColor(item.fit)" size="x-small" variant="flat" label>
                {{ fitLabel[item.fit] }}
              </VChip>
              <VChip
                :color="checkColor(item.route.checksClearing)"
                size="x-small"
                variant="tonal"
                label
                class="check-chip"
              >
                {{ checkLabel[item.route.checksClearing] }}
              </VChip>
            </div>
            <p class="route-reason mb-0">{{ item.reason }}</p>
          </div>
        </div>
      </TransitionGroup>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        Esto es orientación, no una aprobación. Las condiciones de cada proveedor cambian: confirmá
        tu caso puntual en el enlace oficial antes de pagar afiliaciones o reservar una vivienda.
      </VAlert>
    </VCard>

    <!-- Verdict table -->
    <section class="my-6" aria-labelledby="rental-next-title">
      <h2 id="rental-next-title" class="section-heading mb-2">{{ t('clearing.nextTitle') }}</h2>
      <p class="text-body-2 text-medium-emphasis mb-2">{{ t('clearing.nextLead') }}</p>
      <ContentTaskLinks
        :label="t('clearing.navigation')"
        placement="matcher_results"
        :items="[
          { label: t('clearing.listings'), to: localePath('/alquileres-uruguay') },
          { label: t('clearing.noPayslip'), to: localePath('/alquilar-sin-recibo-de-sueldo') },
        ]"
      />
    </section>

    <h2 id="requisitos-de-garantias" class="section-heading mb-1 mt-8 clearing-entry-anchor">
      Qué mira cada garantía de tu clearing
    </h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      El dato que casi nadie te explica claro: qué proveedor revisa tu historial y cuál ni lo mira.
    </p>
    <VCard variant="flat" class="section-card pa-2 pa-sm-4 mb-4">
      <div class="table-scroll">
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Ruta</th>
              <th>¿Mira tu clearing?</th>
              <th>Qué evalúa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="route in routes" :key="route.id">
              <td class="font-weight-medium" data-label="">{{ route.name }}</td>
              <td data-label="¿Mira tu clearing?">
                <VChip
                  :color="checkColor(route.checksClearing)"
                  size="small"
                  variant="tonal"
                  label
                  class="check-chip"
                >
                  {{ checkLabel[route.checksClearing] }}
                </VChip>
              </td>
              <td class="evaluates-cell cu-cell-prose text-body-2" data-label="Qué evalúa">
                {{ route.evaluates }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VCard>

    <h3 class="text-subtitle-1 font-weight-bold mb-3">Cada garantía, una por una</h3>
    <div class="route-detail-list mb-6">
      <article
        v-for="route in routes"
        :id="`garantia-${route.id}`"
        :key="route.id"
        class="route-detail clearing-entry-anchor"
      >
        <h4 class="route-detail-title">{{ route.name }}</h4>
        <p class="route-detail-summary">{{ route.summary }}</p>
        <VChip
          :color="checkColor(route.checksClearing)"
          size="small"
          variant="tonal"
          label
          class="check-chip"
        >
          {{ checkLabel[route.checksClearing] }}
        </VChip>
        <p class="route-detail-text mt-2">{{ route.forClearing }}</p>
        <p class="route-detail-text"><strong>Ojo:</strong> {{ route.caveat }}</p>
        <p class="route-detail-source mb-0">
          <a
            v-if="route.sourceUrl"
            :href="route.sourceUrl"
            :aria-label="`Fuente: ${route.name}`"
            target="_blank"
            rel="noopener noreferrer"
            >Fuente</a
          >
          <span v-else>Sin fuente oficial: es práctica de mercado.</span>
        </p>
      </article>
    </div>

    <!-- Ley 20.212 -->
    <VCard variant="flat" class="law-card pa-5 pa-sm-6 mb-6">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon color="success">mdi-gavel</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">El Estado no puede negarte por ser deudor</h2>
      </div>
      <p class="text-body-2 mb-2">
        La <strong>Ley 20.212 (art. 631)</strong>, vigente desde 2023, prohíbe a los organismos
        públicos —incluida la
        <strong
          >garantía de alquiler de la Contaduría (CGN) y los programas del MVOT y la ANV</strong
        >— negarte el acceso a sus servicios por el solo hecho de ser deudor o figurar en fuentes de
        datos comerciales.
      </p>
      <p class="text-body-2 mb-0">
        Ojo con el alcance: protege el acceso a servicios <strong>públicos</strong>, no obliga a una
        inmobiliaria ni a una aseguradora privada. Y el Fondo de Garantía de Alquiler igual mira el
        BCU (no podés ser categoría 4 o 5) y pide ingreso formal.
      </p>
    </VCard>

    <!-- Insurers -->
    <h2 id="aseguradoras" class="section-heading mb-1 clearing-entry-anchor">
      Aseguradoras: qué publica cada una sobre el clearing
    </h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Lo que dice cada aseguradora en su propio sitio, con el enlace para que lo confirmes.
    </p>
    <VCard variant="flat" class="section-card pa-2 pa-sm-4 mb-3">
      <div class="table-scroll">
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Aseguradora</th>
              <th>Qué hace</th>
              <th>Qué publica</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="insurer in insurers" :key="insurer.id">
              <td class="font-weight-medium" data-label="">{{ insurer.name }}</td>
              <td data-label="Qué hace">
                <VChip
                  :color="insurerColor(insurer.verdict)"
                  size="small"
                  variant="tonal"
                  label
                  class="check-chip"
                >
                  {{ insurerLabel[insurer.verdict] }}
                </VChip>
              </td>
              <td class="evaluates-cell cu-cell-prose text-body-2" data-label="Qué publica">
                <span>
                  {{ insurer.published }}
                  <a
                    :href="insurer.sourceUrl"
                    :aria-label="`Fuente: ${insurer.name}`"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="source-link"
                    >Fuente</a
                  >
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VCard>
    <p class="text-body-2 text-medium-emphasis mb-6">
      Ninguna de las siete publica que acepte personas en el Clearing. Leído en el sitio de cada una
      el {{ lastReviewedLabel }}.
    </p>

    <!-- What usually happens -->
    <h2 class="section-heading mb-1">Lo que suele pasar</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Patrones que se repiten en quienes alquilan estando en clearing. No son casos concretos ni
      promesas: son la lógica de por qué unas rutas funcionan y otras no.
    </p>
    <div class="pattern-grid mb-6">
      <div v-for="p in patterns" :key="p.title" class="pattern">
        <VIcon :color="p.color" size="20">{{ p.icon }}</VIcon>
        <div>
          <strong>{{ p.title }}</strong>
          <p class="mb-0">{{ p.text }}</p>
        </div>
      </div>
    </div>

    <!-- Script for talking to the owner -->
    <VCard variant="flat" class="section-card pa-5 pa-sm-6 mb-6">
      <h2 class="text-h6 font-weight-bold mb-3">
        <VIcon start color="primary">mdi-message-text-outline</VIcon>
        Cómo hablarlo con el dueño o la inmobiliaria
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Adelantarte y ser claro pesa más que esconder la situación (que igual van a ver si corren un
        informe). La idea: reconocer el clearing y llegar con una propuesta de respaldo.
      </p>
      <ul class="script-list">
        <li v-for="line in script" :key="line">
          <VIcon color="success" size="20">mdi-check-circle-outline</VIcon>
          <span>{{ line }}</span>
        </li>
      </ul>
    </VCard>

    <!-- Scam warning -->
    <VAlert
      type="error"
      variant="tonal"
      density="comfortable"
      class="mb-6"
      icon="mdi-alert-octagon-outline"
    >
      <strong>Nadie te “borra del clearing” por plata.</strong> El plazo de caducidad es legal y
      fijo (Ley 18.331): un dato legítimo no se puede eliminar antes de tiempo. Lo que sí existe es
      corregir errores y esperar la caducidad. Desconfiá de quien te cobre por sacarte o por
      “garantizarte” una garantía estando en clearing.
    </VAlert>

    <!-- La unidad intermedia, antes de las preguntas: mismo corte que FaqSection (ver
         docs/seo/adsense-growth-loop.md, 31/10/2026). Sólo dibuja en densidad normal. -->
    <AdSlot placement="in-article" class="mb-6" />
    <!-- FAQ -->
    <h2 class="section-heading mb-3">Preguntas frecuentes</h2>
    <VExpansionPanels variant="accordion" class="faq-panels mb-6">
      <VExpansionPanel v-for="faq in faqs" :key="faq.q" eager>
        <VExpansionPanelTitle>{{ faq.q }}</VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="mb-0">{{ faq.a }}</p>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Sources -->
    <VCard variant="flat" class="section-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes ({{ lastReviewedLabel }})
      </h2>
      <ul class="sources-list">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span>{{ s.detail }}</span>
        </li>
      </ul>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" class="mb-6">
      Información <strong>general y educativa</strong>, no asesoramiento legal. Las condiciones
      comerciales de cada proveedor cambian: confirmalas en el enlace oficial. Ante una intimación o
      un desalojo, buscá asesoramiento jurídico o un consultorio gratuito.
    </VAlert>

    <!-- Cross-links -->
    <VRow class="my-2">
      <VCol cols="12" md="3">
        <VCard
          :to="localePath('/alquilar-en-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-home-search-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Guía para alquilar</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Búsqueda, costos de entrada, contrato, visita y estafas, paso a paso.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="3">
        <VCard
          :to="localePath('/salir-del-clearing')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-account-alert-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Salir del clearing</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Tus derechos, cómo consultar gratis y un plan para saldar deudas.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="3">
        <VCard
          :to="localePath('/saldar-deudas-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-handshake-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Saldar deudas</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Negociar una quita, prescripción y reconstruir tu historial.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="3">
        <VCard
          :to="localePath({ path: '/alquilar-en-uruguay', hash: '#comunidades' })"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-account-group-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Dónde buscar</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Directorio de grupos y comunidades revisado por reputación: ahí vive la oferta de dueño
            directo, la que negocia la garantía.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CLEARING_CHECK_LABEL,
  FIT_LABEL,
  GUARANTEE_ROUTES,
  INSURER_STANCES,
  INSURER_VERDICT_LABEL,
  RENT_CLEARING_LAST_REVIEWED,
  RENT_CLEARING_SOURCES,
  clearingAnswerGroups,
  matchRentRoutes,
  type AdvanceKind,
  type ClearingCheck,
  type DebtKind,
  type Fit,
  type IncomeKind,
  type InsurerVerdict,
  type YesNoUnknown,
} from '~/utils/rentClearing'
import { growthEntryMessages } from '~/utils/growthEntryMessages'

const localePath = useLocalePath()
const { t } = useI18n({ useScope: 'local', messages: growthEntryMessages })

const routes = GUARANTEE_ROUTES
const sources = RENT_CLEARING_SOURCES
const checkLabel = CLEARING_CHECK_LABEL
const fitLabel = FIT_LABEL
const insurers = INSURER_STANCES
const insurerLabel = INSURER_VERDICT_LABEL
const answerGroups = clearingAnswerGroups()

// The insurers other than the one the "seguro" route already names, for the short answer.
const otherInsurers = INSURER_STANCES.filter(i => i.verdict !== 'rechaza').map(i => i.name)
const otherInsurersNames = `${otherInsurers.slice(0, -1).join(', ')} y ${otherInsurers.at(-1)}`

const form = reactive({
  debt: 'telco-servicios' as DebtKind,
  income: 'formal' as IncomeKind,
  guarantor: 'no-se' as YesNoUnknown,
  advance: 'poco' as AdvanceKind,
  directOwner: 'no-se' as YesNoUnknown,
  cgn: 'no-se' as YesNoUnknown,
})

const debtOptions = [
  { title: 'Telecomunicaciones o servicios (Movistar, Antel, UTE…)', value: 'telco-servicios' },
  { title: 'Tarjeta o crédito de consumo (tienda, financiera)', value: 'tarjeta-consumo' },
  { title: 'Banco o financiera', value: 'banco-financiera' },
  { title: 'No estoy seguro/a', value: 'no-se' },
]
const incomeOptions = [
  { title: 'Sueldo, jubilación o pensión con recibo', value: 'formal' },
  { title: 'Ingresos informales o por mi cuenta', value: 'informal' },
  { title: 'Sin ingresos comprobables ahora', value: 'ninguno' },
]
const guarantorOptions = [
  { title: 'Sí, alguien con perfil limpio', value: 'si' },
  { title: 'No', value: 'no' },
  { title: 'No sé todavía', value: 'no-se' },
]
const advanceOptions = [
  { title: 'No puedo adelantar nada', value: 'no' },
  { title: '1 o 2 meses', value: 'poco' },
  { title: '3 meses o más', value: 'varios' },
]
const directOwnerOptions = [
  { title: 'Sí, o me da igual', value: 'si' },
  { title: 'Prefiero inmobiliaria', value: 'no' },
  { title: 'No sé', value: 'no-se' },
]
const cgnOptions = [
  { title: 'Sí (o pensionista, o mi empresa tiene convenio con la Contaduría)', value: 'si' },
  { title: 'No', value: 'no' },
  { title: 'No sé', value: 'no-se' },
]

const ranked = computed(() => matchRentRoutes({ ...form }))

function fitColor(fit: Fit): string {
  return { alta: 'success', media: 'primary', baja: 'warning', descartada: 'error' }[fit]
}
function checkColor(check: ClearingCheck): string {
  return {
    excluyente: 'error',
    tolerante: 'success',
    'ley-impide-negar': 'success',
    'admite-con-aprobacion': 'success',
    'no-mira-tu-clearing': 'success',
    'no-confirmado': 'grey',
  }[check]
}
function insurerColor(verdict: InsurerVerdict): string {
  return {
    rechaza: 'error',
    'consulta-clearing': 'warning',
    'analisis-crediticio': 'warning',
    'no-publica': 'grey',
  }[verdict]
}

const patterns = [
  {
    icon: 'mdi-cash-lock',
    color: 'success',
    title: 'El depósito y el dueño directo son los que más se usan',
    text: 'Son las vías que no dependen de un informe crediticio. Con dinero de respaldo, el clearing deja de ser el tema.',
  },
  {
    icon: 'mdi-shield-remove-outline',
    color: 'error',
    title: 'El seguro de alquiler es donde llega el rechazo',
    text: 'Porto Seguro publica el clearing como requisito excluyente, y ninguna de las siete aseguradoras que leímos publica que acepte personas en él. No es mala suerte: es su criterio.',
  },
  {
    icon: 'mdi-account-check-outline',
    color: 'primary',
    title: 'Un buen garante cambia el partido',
    text: 'Cuando un tercero con propiedad o buen respaldo firma, la evaluación se corre hacia esa persona y tu historial pesa menos.',
  },
  {
    icon: 'mdi-hand-coin-outline',
    color: 'success',
    title: 'El Fondo de Garantía de Alquiler es más flexible de lo que se cree',
    text: 'Tolera incumplimientos del Clearing con refinanciación y, por ley, no puede negarte por ser deudor; pide ingreso formal.',
  },
]

const script = [
  'Decilo vos primero: “estoy en el clearing por una deuda con una telefónica, no es una deuda bancaria”.',
  'Llegá con una propuesta concreta: depósito, uno o dos meses adelantados, o un garante.',
  'Ofrecé mostrar tus recibos de ingreso y tu informe del Clearing (podés pedirlo gratis cada 6 meses).',
  'Preguntá qué garantía acepta y si consideraría el régimen sin garantía o un depósito en BHU.',
  'No pagues señas ni reservas por apuro: primero verificá el inmueble, la persona y pedí recibo.',
]

const faqs = [
  {
    q: '¿Puedo alquilar estando en el clearing?',
    a: 'Sí. El depósito en garantía, el contrato sin garantía, un garante y el dueño directo no dependen de tu clearing. Si sos funcionario público, jubilado o pensionista, la Contaduría no puede negarte su garantía por figurar en él; el Fondo de Garantía de Alquiler lo tolera hasta 4 incumplimientos con refinanciación, y ANDA y FIDECIU publican que estudian cada caso. La que te rechaza es la aseguradora: Porto Seguro lo declara excluyente.',
  },
  {
    q: '¿ANDA da garantía de alquiler estando en el clearing?',
    a: 'ANDA publica que se puede pedir: en sus preguntas frecuentes para propietarios e inmobiliarias dice “Personas registradas en Clearing de Informes pueden acceder al servicio”, con todos los casos sujetos a su aprobación. Pide ser socio, que el alquiler no pase del 40 % de tu ingreso nominal y 4 meses de antigüedad en la actividad privada, y cuesta el 3 % del alquiler por mes más la cuota social. Su reglamento le permite negar una solicitud sin explicar el motivo: preguntá por tu caso antes de afiliarte.',
  },
  {
    q: '¿Puedo hacerme socio de ANDA estando en el clearing?',
    a: 'Sí. ANDA lo dice en sus preguntas frecuentes de préstamos: “podés afiliarte a ANDA y solicitar tu préstamo estando en el Clearing de Informes”; según el tipo de antecedente puede pedirte una garantía. La cuota social que publica para el Socio Integral es de $ 831.',
  },
  {
    q: 'Soy jubilado o funcionario público y estoy en el clearing, ¿qué garantía me corresponde?',
    a: 'La de la Contaduría General de la Nación (Servicio de Garantía de Alquileres). El artículo 631 de la Ley 20.212 la nombra entre los servicios que no pueden negarse a una persona por figurar en el Clearing. Pide el Informe de Líquido Disponible y la cédula, cuesta el 3 % del alquiler por mes a cada parte y el alquiler se descuenta de tu recibo. El Fondo de Garantía de Alquiler del Ministerio excluye a quienes pueden usar la Contaduría.',
  },
  {
    q: 'Mi deuda es con una telefónica, ¿me deja en el BCU?',
    a: 'No necesariamente. Las deudas de telecomunicaciones y servicios se reportan al Clearing de Informes, que es una base privada de Equifax. La Central de Riesgos del BCU solo consolida créditos con bancos y financieras reguladas, así que una deuda con una telefónica no suele aparecer ahí.',
  },
  {
    q: '¿El seguro de alquiler chequea el clearing?',
    a: 'Sí. Porto Seguro lo publica como excluyente: si alguno de los solicitantes figura en el Clearing rechaza la solicitud, y después de pagar la deuda pide esperar al menos 6 meses. San Cristóbal dice que controla el Clearing y la calificación del BCU; Mapfre, el BSE, SBI y Sancor hacen un análisis crediticio antes de emitir, y SURA no publica el criterio. Ninguna de las siete publica que acepte personas en el Clearing.',
  },
  {
    q: '¿La garantía del Estado me sirve estando en clearing?',
    a: 'El Fondo de Garantía de Alquileres (CGN/MVOT) tolera hasta 4 incumplimientos del Clearing si presentás su refinanciación, y por la Ley 20.212 no puede negarte por ser deudor. Pero exige ingreso formal (15 a 100 UR) y no estar en categoría 4 o 5 de la Central de Riesgos del BCU. Cubre alquileres de hasta 18 UR (21 UR en vivienda promovida). Si sos funcionario público, jubilado o pensionista, la garantía del Estado que te corresponde es la de la Contaduría, que el artículo 631 de esa ley nombra entre los servicios que no pueden negarte por el Clearing.',
  },
  {
    q: 'Pagué la deuda, ¿cuándo me aceptan?',
    a: 'El acreedor tiene 5 días hábiles para avisarle al Clearing que cancelaste y el Clearing 3 días hábiles para actualizar el dato (Ley 18.331, art. 22). La deuda queda registrada como cancelada hasta 5 años, no renovables. Porto Seguro pide esperar al menos 6 meses desde el pago; el Fondo de Garantía de Alquiler acepta hasta 4 incumplimientos si presentás la refinanciación.',
  },
  {
    q: '¿Cuánto tiempo quedo en el clearing?',
    a: 'Por la Ley 18.331, un dato negativo se registra 5 años desde que se incorpora. Si la deuda sigue impaga, puede reinscribirse una sola vez por otros 5 años. Una vez cancelada, queda 5 años no renovables desde la cancelación (Equifax usa 3 para operaciones canceladas con atraso). Las deudas con UTE, OSE y Antel fijo permanecen sólo cinco años.',
  },
  {
    q: '¿Alguien puede borrarme del clearing por plata?',
    a: 'No. El plazo de caducidad es legal y fijo: nadie puede eliminar un dato legítimo antes de tiempo. Lo que existe es corregir errores y esperar la caducidad. Desconfiá de quien te cobre por “borrarte” o por garantizarte una garantía estando en clearing.',
  },
]

function formatReviewedDate(iso: string, withDay = true) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: withDay ? 'numeric' : undefined,
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
const lastReviewedLabel = formatReviewedDate(RENT_CLEARING_LAST_REVIEWED)
const reviewedMonthLabel = formatReviewedDate(RENT_CLEARING_LAST_REVIEWED, false)

const canonicalUrl = 'https://cambio-uruguay.com/alquilar-estando-en-clearing'
const title = computed(() => t('clearing.seoTitle'))
const description = computed(() => t('clearing.description'))

defineOgImageComponent('Cambio', {
  title: 'Alquilar estando en el clearing',
  subtitle: 'Qué garantía te sirve y cuál te rechaza, con fuentes',
  tag: 'VIVIENDA',
})

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
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
        'alquilar estando en clearing, se puede alquilar en el clearing, garantia de alquiler con clearing, seguro de alquiler chequea clearing, alquilar sin garantia uruguay, deposito bhu alquiler, fondo de garantia de alquileres clearing, ley 20212, alquilar dueño directo clearing',
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
                name: 'Alquilar en Uruguay',
                item: 'https://cambio-uruguay.com/alquilar-en-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Alquilar estando en clearing',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title.value,
            description: description.value,
            dateModified: RENT_CLEARING_LAST_REVIEWED,
            mainEntityOfPage: canonicalUrl,
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.clearing-entry-anchor {
  scroll-margin-top: 6rem;
}

.rc-page {
  overflow-x: hidden;
}
.hero {
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(34, 197, 94, 0.28), transparent 55%),
    linear-gradient(135deg, #10233a 0%, #14342b 55%, #3a1220 100%);
}
.hero-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 700;
  color: #a7f3d0;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 780px;
  line-height: 1.65;
  margin-bottom: 0;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}
.section-card,
.reg-card,
.law-card,
.matcher {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 16px;
}
.law-card {
  background: rgba(var(--v-theme-success), 0.06);
  border-color: rgba(var(--v-theme-success), 0.3);
}
.reg-list {
  padding-left: 20px;
  margin: 0;
}
.reg-list li {
  font-size: 0.88rem;
  line-height: 1.6;
  margin-bottom: 6px;
}

/* Matcher output */
.route-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.route-item {
  display: grid;
  grid-template-columns: 34px 1fr;
  gap: 12px;
  align-items: start;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(var(--v-theme-on-surface), 0.02);
}
.route-rank {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.85rem;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
}
.v-theme--light .route-rank {
  color: #0d47a1;
}
.route-name {
  font-size: 0.95rem;
}
.route-reason {
  font-size: 0.86rem;
  line-height: 1.55;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.rc-list-move {
  transition: transform 0.3s ease;
}

/* The clearing labels run to ~45 characters: let them wrap instead of clipping at 320 px. */
.check-chip {
  max-width: 100%;
  height: auto !important;
  min-height: 20px;
  padding-block: 2px;
  white-space: normal;
}

/* Short answer */
.answer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));
  gap: 12px;
}
.answer-group {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-left-width: 4px;
  border-radius: 12px;
  padding: 14px 16px;
  min-width: 0;
}
.answer-group--no-miran,
.answer-group--aceptan {
  border-left-color: rgb(var(--v-theme-success));
}
.answer-group--rechazan {
  border-left-color: rgb(var(--v-theme-error));
}
.answer-title {
  font-size: 0.95rem;
  font-weight: 800;
  margin-bottom: 8px;
}
.answer-list {
  padding-left: 18px;
  margin: 0;
}
.answer-list li {
  font-size: 0.88rem;
  line-height: 1.55;
  margin-bottom: 6px;
  overflow-wrap: anywhere;
}
.answer-link,
.source-link,
.route-detail-source a {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.v-theme--light .answer-link,
.v-theme--light .source-link,
.v-theme--light .route-detail-source a {
  color: #0d47a1;
}

/* One card per guarantee */
.route-detail-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
  gap: 12px;
}
.route-detail {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  padding: 14px 16px;
  min-width: 0;
}
.route-detail-title {
  font-size: 0.98rem;
  font-weight: 800;
  margin-bottom: 2px;
}
.route-detail-summary {
  font-size: 0.83rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.68);
  margin-bottom: 8px;
}
.route-detail-text {
  font-size: 0.86rem;
  line-height: 1.55;
  margin-bottom: 8px;
}
.route-detail-source {
  font-size: 0.83rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.table-scroll {
  overflow-x: auto;
}
.table-scroll th {
  white-space: nowrap;
}
.evaluates-cell {
  min-width: 260px;
}

.pattern-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.pattern {
  display: flex;
  gap: 12px;
  align-items: start;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  padding: 14px 16px;
}
.pattern .v-icon {
  flex: 0 0 auto;
  margin-top: 2px;
}
.pattern strong {
  display: block;
  font-size: 0.92rem;
  margin-bottom: 3px;
}
.pattern p {
  font-size: 0.83rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.script-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}
.script-list li {
  display: flex;
  gap: 10px;
  align-items: start;
  font-size: 0.88rem;
  line-height: 1.55;
}
.script-list .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
}

.faq-panels {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 16px;
  overflow: hidden;
}

.sources-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.sources-list li {
  display: flex;
  flex-direction: column;
  font-size: 0.875rem;
  line-height: 1.45;
}
.sources-list a {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.v-theme--light .sources-list a {
  color: #0d47a1;
}
.sources-list span {
  color: rgba(var(--v-theme-on-surface), 0.62);
}

.cross-link {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease;
}
.cross-link:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.6);
}

@media (max-width: 600px) {
  .pattern-grid {
    grid-template-columns: 1fr;
  }
}
</style>
