<template>
  <VContainer class="cs-page py-6 py-md-10">
    <header class="hero pa-5 pa-md-8 rounded-lg mb-8">
      <p class="eyebrow mb-2">Tarjetas · Seguridad · {{ reviewedLabel }}</p>
      <h1 class="hero-title mb-3">Cómo clonan una tarjeta en Uruguay</h1>
      <p class="hero-lead text-body-1 mb-4">
        Y sobre todo: qué defensa existe de verdad. El sitio ya publica
        <NuxtLink :to="localePath('/estafas-uruguay')">quién paga cuando ya pasó</NuxtLink>. Esta
        página es lo de antes, con una pregunta que nadie tiene contestada en un cuadro:
        <strong>qué controles te da tu emisor</strong> — si avisa por cada compra, si la apagás
        desde la app, si podés bajar el tope del canal por el que entra el fraude.
      </p>
      <p class="hero-lead text-body-1 mb-0">
        El hallazgo que ordena todo: lo que se roba casi nunca es la tarjeta,
        <strong>es el número</strong>, y viaja sin ella. Por eso el control que más sirve no se
        guarda en la billetera.
      </p>
    </header>

    <!-- La respuesta corta, antes de todo lo demás -->
    <VCard variant="flat" class="answer pa-4 pa-md-6 mb-8">
      <div class="cu-section-title mb-3">La respuesta corta</div>
      <ol class="answer-list text-body-1 mb-0">
        <li v-for="(item, i) in shortAnswer" :key="i" class="mb-2">{{ item }}</li>
      </ol>
    </VCard>

    <!-- De dónde salió -->
    <VCard variant="tonal" color="primary" class="pa-4 pa-md-6 mb-8">
      <div class="cu-section-title mb-2">De dónde salió esto</div>
      <p class="text-body-2 mb-3">
        Un hilo de r/uruguay de setiembre de 2026: alguien va a pedir su primera tarjeta de crédito,
        lee los casos de clonación del propio sub y pregunta tres cosas concretas. ¿Cómo las clonan?
        ¿Le filtraron los sistemas al banco? ¿<strong
          >Sirve ponerle cinta negra arriba de los números</strong
        >? Y una cuarta, que es la que más circula: su tarjeta no tiene Apple Pay, ¿eso lo deja
        expuesto? Las cuatro están contestadas acá abajo, con la fuente de cada afirmación al lado.
      </p>
      <p class="text-body-2 mb-0">
        Y una segunda vuelta: esta página se publicó <em>en</em> ese hilo, y lo que volvió fue una
        corrección.
        <strong>El titular anterior decía que el aviso por compra del BROU era pago</strong>
        y el autor del hilo contestó que su banco le avisa por cada compra sin cobrarle nada. Tenía
        razón en lo que importa. Está corregido arriba y la discusión entera —ocho afirmaciones,
        cada una contra la fuente que la confirma o la desmiente— está
        <a href="#comunidad">más abajo</a>.
      </p>
    </VCard>

    <!-- Vectores -->
    <section id="como-pasa" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-1">Cómo pasa, ordenado por cuánto pasa</h2>
      <p class="text-body-2 text-medium-emphasis mb-4 body-text">
        La columna que decide es la segunda: <strong>qué necesita</strong> quien lo hace. Si lo que
        necesita son datos y no el plástico, entonces nada de lo que hagas con tu billetera física
        lo frena. Ese es el caso de los dos primeros, y son los dos que cuenta la gente acá.
      </p>

      <VCard
        v-for="vector in vectors"
        :key="vector.id"
        variant="flat"
        class="vector pa-4 pa-md-5 mb-3"
      >
        <div class="d-flex align-start ga-3 mb-2">
          <VIcon :icon="vector.icon" size="22" class="mt-1 vector-icon" />
          <div class="flex-grow-1">
            <div class="d-flex align-center flex-wrap ga-2 mb-1">
              <span class="text-subtitle-1 font-weight-bold">{{ vector.label }}</span>
              <VChip size="x-small" :color="WEIGHT_COLOR[vector.weight]" variant="flat">
                {{ WEIGHT_LABEL[vector.weight] }}
              </VChip>
            </div>
            <p class="text-body-2 mb-2 body-text"><strong>Necesita:</strong> {{ vector.needs }}</p>
            <p class="text-body-2 text-medium-emphasis mb-3 body-text">{{ vector.how }}</p>
            <VRow density="comfortable" class="mb-2">
              <VCol cols="12" md="6">
                <div class="panel panel--ok pa-3 h-100">
                  <p class="text-caption font-weight-bold mb-2">Lo frena</p>
                  <ul class="tight-list text-body-2 mb-0">
                    <li v-for="(item, i) in vector.stops" :key="i">{{ item }}</li>
                  </ul>
                </div>
              </VCol>
              <VCol cols="12" md="6">
                <div class="panel panel--bad pa-3 h-100">
                  <p class="text-caption font-weight-bold mb-2">No lo frena, aunque se diga</p>
                  <ul class="tight-list text-body-2 mb-0">
                    <li v-for="(item, i) in vector.doesNotStop" :key="i">{{ item }}</li>
                  </ul>
                </div>
              </VCol>
            </VRow>
            <SourceChips :sources="vector.sources" />
          </div>
        </div>
      </VCard>
    </section>

    <!-- Matriz de controles -->
    <section id="emisores" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-1">Qué control te da cada emisor</h2>
      <p class="text-body-2 text-medium-emphasis mb-4 body-text">
        {{ issuerCount }} emisores uruguayos, {{ controlIds.length }} controles, todo contrastado
        contra la página del propio emisor el {{ reviewedDate }}.
        <strong>«Sin publicar» no es «no tiene»</strong>: es que el emisor no lo documenta, y acá
        una casilla no se rellena con la app de otro país ni con lo que cuenta un usuario. El
        puntaje mide lo publicado, y por eso se muestra al lado cuántas casillas quedaron en blanco.
      </p>

      <VAlert type="info" variant="tonal" density="comfortable" class="mb-4">
        Los pesos están a la vista y no son parejos: el aviso por compra vale
        {{ CONTROL_WEIGHTS.aviso }} y la billetera {{ CONTROL_WEIGHTS.billetera }}. La billetera
        protege la compra presencial, que es justo el canal que menos aparece en el fraude local; el
        aviso es lo único que te avisa <em>mientras pasa</em>.
      </VAlert>

      <VTable density="comfortable" class="cu-mobile-cards mb-3">
        <thead>
          <tr>
            <th>Emisor</th>
            <th v-for="id in controlIds" :key="id" class="text-center">
              {{ CONTROL_LABELS[id] }}
            </th>
            <th class="text-right">Puntaje</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in ranking" :key="row.issuer.id">
            <td data-label="Emisor">
              <button type="button" class="issuer-btn" @click="openIssuer(row.issuer.id)">
                {{ row.issuer.label }}
              </button>
              <span class="cu-hint d-block">{{ KIND_LABEL[row.issuer.kind] }}</span>
            </td>
            <td
              v-for="id in controlIds"
              :key="id"
              :data-label="CONTROL_LABELS[id]"
              class="text-center"
            >
              <VChip
                size="small"
                variant="flat"
                :color="STATE_COLOR[row.issuer.controls[id].state]"
                :class="STATE_TEXT_CLASS[row.issuer.controls[id].state]"
              >
                {{ STATE_LABELS[row.issuer.controls[id].state] }}
              </VChip>
            </td>
            <td data-label="Puntaje" class="text-right num">
              <strong>{{ row.score.score }}</strong>
              <span class="cu-hint d-block">
                {{
                  row.score.unpublished === 0
                    ? 'todo publicado'
                    : `${row.score.unpublished} sin publicar`
                }}
              </span>
            </td>
          </tr>
        </tbody>
      </VTable>

      <p class="text-caption text-medium-emphasis mb-4">
        Tocá el nombre de un emisor para ver qué dice exactamente cada casilla y su fuente.
      </p>

      <!-- Detalle del emisor elegido -->
      <VCard v-if="selected" variant="flat" class="detail pa-4 pa-md-5 mb-4">
        <div class="d-flex align-center flex-wrap ga-2 mb-1">
          <span class="text-h6 font-weight-bold">{{ selected.label }}</span>
          <VChip size="x-small" variant="tonal">{{ KIND_LABEL[selected.kind] }}</VChip>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-4">
          Para bloquear ya: <strong>{{ selected.report }}</strong
          >. <SourceChips :sources="[selected.reportSource]" class="d-inline-flex mt-2" />
        </p>

        <VAlert
          v-if="selected.note"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mb-4"
          icon="mdi-alert-outline"
        >
          <p class="text-body-2 mb-2">{{ selected.note.text }}</p>
          <SourceChips :sources="selected.note.sources" />
        </VAlert>

        <div v-for="id in controlIds" :key="id" class="control-row pb-3 mb-3">
          <div class="d-flex align-center flex-wrap ga-2 mb-1">
            <span class="text-subtitle-2 font-weight-bold">{{ CONTROL_LABELS[id] }}</span>
            <VChip
              size="x-small"
              variant="flat"
              :color="STATE_COLOR[selected.controls[id].state]"
              :class="STATE_TEXT_CLASS[selected.controls[id].state]"
            >
              {{ STATE_LABELS[selected.controls[id].state] }}
            </VChip>
          </div>
          <p class="text-body-2 mb-2 body-text">{{ selected.controls[id].detail }}</p>
          <p v-if="selected.controls[id].quote" class="quote-box pa-3 text-body-2 mb-2">
            {{ selected.controls[id].quote }}
          </p>
          <SourceChips :sources="selected.controls[id].sources" />
        </div>
      </VCard>

      <VAlert type="warning" variant="tonal" density="comfortable">
        El control más escaso del cuadro es el que más sirve contra el vector dominante: topes por
        canal que vos puedas bajar. Lo publica
        <strong>{{ limitsFull }} de {{ issuerCount }}</strong> emisores.
      </VAlert>
    </section>

    <!-- Mitos -->
    <section id="mitos" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-1">Lo que circula, y lo que hace</h2>
      <p class="text-body-2 text-medium-emphasis mb-4 body-text">
        Cada respuesta trae el mecanismo adelante, porque «no sirve» sin explicación se olvida. Y
        ninguna termina en «no hagas nada»: si el miedo es razonable, hay un control que sí aplica.
      </p>

      <VExpansionPanels variant="accordion" class="mb-2">
        <VExpansionPanel v-for="myth in myths" :key="myth.id">
          <VExpansionPanelTitle>
            <div class="d-flex align-center flex-wrap ga-2">
              <VChip size="x-small" variant="flat" :color="MYTH_COLOR[myth.verdict]">
                {{ MYTH_LABELS[myth.verdict] }}
              </VChip>
              <span class="text-body-2 font-weight-medium">{{ myth.claim }}</span>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 mb-3 body-text">{{ myth.why }}</p>
            <p class="text-body-2 font-weight-medium mb-2 body-text">
              En su lugar: {{ myth.instead }}
            </p>
            <SourceChips :sources="myth.sources" />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Lo que discutió la comunidad -->
    <section id="comunidad" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-1">Lo que discutieron en el hilo</h2>
      <p class="text-body-2 text-medium-emphasis mb-4 body-text">
        Esta página se publicó en el hilo que le dio origen y volvió con correcciones. Van todas,
        incluidas las que nos dejaron mal parados, con lo que dice la fuente al lado.
        <strong>«No lo pudimos verificar» también es un resultado</strong>: que algo no se pueda
        contrastar no lo vuelve falso, y borrarlo sería peor que publicarlo con esa etiqueta.
      </p>

      <VCard
        v-for="claim in communityClaims"
        :key="claim.id"
        variant="flat"
        class="claim pa-4 pa-md-5 mb-3"
      >
        <div class="d-flex align-center flex-wrap ga-2 mb-2">
          <VChip
            size="small"
            variant="flat"
            :color="CLAIM_COLOR[claim.verdict]"
            :class="claim.verdict === 'sin-verificar' ? 'text-high-emphasis' : ''"
          >
            {{ CLAIM_VERDICT_LABELS[claim.verdict] }}
          </VChip>
        </div>
        <p class="said-box pa-3 text-body-2 mb-3">{{ claim.said }}</p>
        <p class="text-body-2 mb-3 body-text">{{ claim.found }}</p>
        <SourceChips :sources="claim.sources" />
      </VCard>
    </section>

    <!-- Primera hora -->
    <section id="primera-hora" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-1">Si ya pasó: la primera hora</h2>
      <p class="text-body-2 text-medium-emphasis mb-4 body-text">
        El detalle legal —qué te deben devolver, con el artículo al lado— está en
        <NuxtLink :to="localePath('/estafas-uruguay')">Me estafaron</NuxtLink>. Acá va sólo el
        orden, porque el orden cambia el resultado: hay un instante que parte la responsabilidad en
        dos.
      </p>

      <VCard
        v-for="(step, i) in firstHour"
        :key="step.id"
        variant="flat"
        class="step pa-4 pa-md-5 mb-3"
      >
        <div class="d-flex align-start ga-3">
          <div class="step-num">{{ i + 1 }}</div>
          <div class="flex-grow-1">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ step.title }}</p>
            <p class="text-body-2 text-medium-emphasis mb-2 body-text">{{ step.detail }}</p>
            <SourceChips :sources="step.sources" />
          </div>
        </div>
      </VCard>
    </section>

    <!-- Huecos -->
    <section id="huecos" class="mb-10">
      <h2 class="text-h5 font-weight-bold mb-1">Lo que no sabemos</h2>
      <p class="text-body-2 text-medium-emphasis mb-4 body-text">
        Una página de seguridad que no publica sus huecos está vendiendo una sensación de cobertura
        que no tiene.
      </p>
      <VAlert
        v-for="(gap, i) in gaps"
        :key="i"
        type="info"
        variant="tonal"
        density="comfortable"
        class="mb-2"
        icon="mdi-help-rhombus-outline"
      >
        <span class="text-body-2">{{ gap }}</span>
      </VAlert>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />

    <section aria-label="Seguí leyendo">
      <h2 class="text-h6 font-weight-bold mb-3">Seguí leyendo</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="4">
          <VCard :to="localePath(link.to)" variant="flat" class="pa-4 h-100 related">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.title }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ link.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  CARD_COMMUNITY_CLAIMS,
  CARD_MYTHS,
  CARD_SECURITY_FAQ,
  CARD_SECURITY_GAPS,
  CARD_SECURITY_LAST_REVIEWED,
  CLAIM_VERDICT_LABELS,
  CLONING_VECTORS,
  CONTROL_LABELS,
  CONTROL_WEIGHTS,
  controlCoverage,
  FIRST_HOUR,
  ISSUERS,
  MYTH_LABELS,
  rankIssuers,
  STATE_LABELS,
  type ClaimVerdict,
  type ControlId,
  type ControlState,
  type Issuer,
  type MythVerdict,
  type VectorWeight,
} from '~/utils/cardSecurity'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const vectors = CLONING_VECTORS
const myths = CARD_MYTHS
const firstHour = FIRST_HOUR
const gaps = CARD_SECURITY_GAPS
const communityClaims = CARD_COMMUNITY_CLAIMS

/**
 * Lo primero que se lee, y existe por una devolución concreta: el hilo donde se
 * publicó esta página la despachó como «el análisis masazo de la AI». Un texto
 * largo no es un defecto si la conclusión está arriba; lo era acá, porque había
 * que bajar tres secciones para llegar a qué hacer. Estas tres líneas son la
 * página entera; el resto es la evidencia de por qué.
 */
const shortAnswer = [
  'Casi nunca te clonan el chip: se llevan el número, el vencimiento y el código, y compran por internet. Todo lo que hagas con el plástico en la mano protege el caso que menos pasa.',
  'Prendé el aviso por cada compra antes que nada. Es gratis en casi todos los emisores —en BROU también, aunque haya circulado lo contrario— y es lo único que te entera mientras pasa, no al cierre del mes.',
  'La tarjeta no puede salir de tu vista, y menos si es American Express: ahí el código va al frente y una sola foto alcanza.',
]
const controlIds = Object.keys(CONTROL_WEIGHTS) as ControlId[]
const issuerCount = ISSUERS.length

const WEIGHT_LABEL: Record<VectorWeight, string> = {
  dominante: 'lo más reportado',
  frecuente: 'frecuente',
  residual: 'residual',
  teorico: 'teórico',
}

const WEIGHT_COLOR: Record<VectorWeight, string> = {
  dominante: 'error',
  frecuente: 'warning',
  residual: 'info',
  teorico: 'surface-variant',
}

const STATE_COLOR: Record<ControlState, string> = {
  si: 'success',
  pago: 'warning',
  parcial: 'warning',
  no: 'error',
  'sin-publicar': 'surface-variant',
}

/**
 * Vuetify tonal/flat usa el mismo color para relleno y texto en los chips de
 * `surface-variant`, así que ahí el texto se pide explícito. Sin esto, la casilla
 * "sin publicar" queda ilegible en claro — y es justo la que hay que poder leer.
 */
const STATE_TEXT_CLASS: Record<ControlState, string> = {
  si: '',
  pago: '',
  parcial: '',
  no: '',
  'sin-publicar': 'text-high-emphasis',
}

const MYTH_COLOR: Record<MythVerdict, string> = {
  'no-sirve': 'error',
  'a-medias': 'warning',
  sirve: 'success',
  'al-reves': 'error',
}

/**
 * `sin-verificar` va en `surface-variant` por la misma razón que la casilla
 * "sin publicar" del cuadro: no es ni bueno ni malo, es la ausencia de dato, y
 * pintarlo de gris evita que el lector lo lea como un veredicto.
 */
const CLAIM_COLOR: Record<ClaimVerdict, string> = {
  confirmado: 'success',
  matizado: 'warning',
  desmentido: 'error',
  'sin-verificar': 'surface-variant',
}

const KIND_LABEL: Record<Issuer['kind'], string> = {
  banco: 'banco',
  iede: 'emisora de dinero electrónico',
  administradora: 'administradora de crédito',
}

const ranking = computed(() =>
  rankIssuers().map(score => ({
    score,
    issuer: ISSUERS.find(i => i.id === score.id) as Issuer,
  }))
)

const limitsFull = controlCoverage('limites').full

const selectedId = ref<string | null>(null)
const selected = computed<Issuer | null>(() => ISSUERS.find(i => i.id === selectedId.value) ?? null)
const openIssuer = (id: string) => {
  selectedId.value = selectedId.value === id ? null : id
}

const dateText = (iso: string): string => {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
}

const reviewedDate = dateText(CARD_SECURITY_LAST_REVIEWED)
const reviewedLabel = `relevado al ${reviewedDate}`

const faq: FaqItem[] = CARD_SECURITY_FAQ.map(item => ({ ...item }))

const relatedLinks = [
  {
    to: '/estafas-uruguay',
    title: 'Me estafaron: qué me devuelven',
    body: 'La Ley 19.731 artículo por artículo, y los casos en que nadie te devuelve nada.',
  },
  {
    to: '/me-cobran-algo-que-no-autorice',
    title: 'Me cobran algo que no autoricé',
    body: 'Cómo frenar un débito que no para, y por qué el BCU no puede ordenar la devolución.',
  },
  {
    to: '/tarjetas-de-credito-uruguay',
    title: 'Tarjetas de crédito',
    body: 'Las 25 tarjetas de plaza con su costo y sus beneficios, puntuadas.',
  },
  {
    to: '/tarjetas-de-debito-uruguay',
    title: 'Tarjetas de débito',
    body: 'Qué cobra cada una por comprar en dólares o sacar plata.',
  },
  {
    to: '/mejores-bancos-uruguay',
    title: 'Qué banco conviene',
    body: 'Incluye quién tiene Apple Pay y Google Pay, con fecha.',
  },
  {
    to: '/advertencias-bcu',
    title: 'Advertencias del BCU',
    body: 'Las empresas que el Banco Central señala por operar sin autorización.',
  },
]

// 33 caracteres: con la marca queda en 50 y entra sin recorte en el SERP.
// Ver tests/unit/seoTitleBudget.test.ts.
const title = 'Cómo clonan una tarjeta en Uruguay'
const description =
  'Cómo se clona una tarjeta en Uruguay según lo que realmente se reporta, y qué control te da cada emisor: aviso por compra, bloqueo desde la app, topes por canal y número virtual, con la fuente de cada casilla.'
const canonicalUrl = 'https://cambio-uruguay.com/clonacion-de-tarjetas-uruguay'

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
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        url: canonicalUrl,
        inLanguage: 'es-UY',
        dateModified: CARD_SECURITY_LAST_REVIEWED,
        author: { '@type': 'Organization', name: 'Cambio Uruguay' },
        publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.16),
    rgba(var(--v-theme-primary), 0.04)
  );
  border: 1px solid rgba(var(--v-border-color), 0.16);
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
/* Paso `display` de DESIGN.md, tal cual: el resto de las páginas todavía usa una
 * escala propia, pero acá no hay motivo para salirse de la documentada. */
.hero-title {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.hero-lead {
  max-width: 68ch;
  line-height: 1.6;
}
.body-text {
  max-width: 72ch;
  line-height: 1.6;
}
.cu-section-title {
  font-weight: 700;
}
.cu-hint {
  font-size: 0.75rem;
  opacity: 0.72;
  line-height: 1.35;
  margin-top: 0.15rem;
}
.vector,
.step,
.detail,
.claim,
.related {
  border: 1px solid rgba(var(--v-border-color), 0.16);
}
/* La respuesta corta: destacada sin gritar, con la barra del lado del primer
 * carácter para que se lea como un bloque y no como otra tarjeta más. */
.answer {
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  border-left-width: 4px;
  background: rgba(var(--v-theme-primary), 0.05);
}
.answer-list {
  padding-left: 1.2rem;
}
/* Lo que dijo otra persona, marcado como cita ajena: mismo tratamiento que la
 * cita del emisor, para que el lector distinga de un vistazo lo transcrito de
 * lo que afirmamos nosotros. */
.said-box {
  border: 1px solid rgba(var(--v-border-color), 0.22);
  background: rgba(var(--v-theme-surface-variant), 0.14);
  border-radius: 8px;
  font-style: italic;
}
.vector-icon {
  color: rgb(var(--v-theme-primary));
}
.panel {
  border-radius: 8px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
}
.panel--ok {
  background: rgba(var(--v-theme-success), 0.08);
}
.panel--bad {
  background: rgba(var(--v-theme-error), 0.08);
}
.tight-list {
  padding-left: 1.1rem;
}
.tight-list li + li {
  margin-top: 0.35rem;
}
/*
 * La cita textual del emisor, separada del texto propio SIN barra lateral: lo que
 * marca que es cita son las comillas que trae el propio dato (`quote` siempre viene
 * entrecomillado, y hay test que lo exige) más el fondo y la bajada de tamaño.
 */
.quote-box {
  border: 1px solid rgba(var(--v-border-color), 0.22);
  background: rgba(var(--v-theme-surface-variant), 0.14);
  border-radius: 8px;
  font-style: italic;
}
.step-num {
  width: 28px;
  height: 28px;
  flex: 0 0 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.85rem;
  font-weight: 700;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}
.control-row + .control-row {
  border-top: 1px solid rgba(var(--v-border-color), 0.14);
  padding-top: 0.85rem;
}
.issuer-btn {
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
  cursor: pointer;
  text-align: left;
}
.issuer-btn:hover {
  text-decoration: underline;
}
.num {
  font-variant-numeric: tabular-nums;
}
.related:hover {
  border-color: rgba(var(--v-theme-primary), 0.45);
}
</style>
