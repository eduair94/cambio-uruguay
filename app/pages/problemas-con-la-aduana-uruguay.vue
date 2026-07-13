<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Compras en el exterior · Envíos y aduana</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Problemas con la aduana en Uruguay: qué hacer en cada caso
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Esto no es una clase de derecho aduanero: es un plan de acción. Situaciones típicas — desde
        el paquete retenido hasta el remate — cada una con los pasos exactos, a quién reclamarle y
        qué dice la norma, con la fuente al lado. Y separado, bien separado, lo que la gente cuenta
        que le pasó: eso es información, no es la ley.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        Cada paso de esta guía sale de una norma citada y linkeada, o te decimos explícitamente que
        no la encontramos. Los testimonios de Reddit van aparte, marcados como lo que son.
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-calculator-variant-outline</VIcon>
        ¿Todavía no compraste y querés saber si vas a pagar impuestos?
        <NuxtLink :to="localePath('/franquicia-aduana-uruguay')">
          Anda a la calculadora de franquicia y aduana </NuxtLink
        >.
      </p>
    </header>

    <!-- Diagnóstico -->
    <section class="mb-8" aria-label="¿Qué te está pasando?">
      <h2 class="section-heading mb-1">¿Qué te está pasando?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Elegí tu síntoma. Te mostramos el plan de acción, no la teoría.
      </p>

      <div class="scenarios">
        <button
          v-for="p in problems"
          :key="p.id"
          type="button"
          class="scenario"
          :class="{ 'scenario--on': p.id === selectedSymptomId }"
          @click="selectSymptom(p.id)"
        >
          <VIcon size="20" class="mb-1">{{ PROBLEM_ICON[p.id] }}</VIcon>
          <span class="scenario-label">{{ p.symptom }}</span>
        </button>
      </div>

      <VCard
        v-if="selectedProblem"
        variant="flat"
        class="plan pa-5 pa-sm-6 mt-4"
        data-testid="plan-de-accion"
      >
        <div class="d-flex align-center flex-wrap ga-2 mb-3">
          <VChip color="primary" variant="flat" class="font-weight-bold">
            {{ selectedProblem.title }}
          </VChip>
          <VChip v-if="!selectedProblem.verified" size="small" color="warning" variant="tonal">
            sin verificar contra la norma
          </VChip>
        </div>

        <template v-if="selectedProblem.verified">
          <p class="block-label">Pasos</p>
          <ol class="steps-list mb-3">
            <li v-for="(s, i) in selectedProblem.steps" :key="i">{{ s }}</li>
          </ol>

          <VAlert
            v-if="selectedProblem.deadline"
            type="warning"
            variant="tonal"
            density="comfortable"
            icon="mdi-clock-alert-outline"
            class="mb-3"
          >
            {{ selectedProblem.deadline }}
          </VAlert>

          <p v-if="selectedProblem.claimBody" class="text-body-2 mb-3">
            <VIcon size="16" class="mr-1">mdi-send-outline</VIcon>
            Reclamá: <strong>{{ CLAIM_BODY_LABEL[selectedProblem.claimBody] }}</strong>
          </p>

          <div class="d-flex flex-wrap ga-2">
            <VBtn
              v-if="selectedProblem.claimTemplate"
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-file-document-edit-outline"
              @click="useProblemForClaim(selectedProblem.id)"
            >
              Armar el reclamo
            </VBtn>
            <VBtn
              size="small"
              variant="text"
              append-icon="mdi-arrow-down"
              @click="scrollToProblem(selectedProblem.id)"
            >
              Ver la norma completa y los testimonios
            </VBtn>
          </div>
        </template>

        <VAlert
          v-else
          type="warning"
          variant="tonal"
          density="comfortable"
          icon="mdi-help-circle-outline"
        >
          Todavía no pudimos verificar esta situación contra la norma. Preferimos decírtelo antes
          que inventarte pasos a seguir.
        </VAlert>
      </VCard>
    </section>

    <!-- Verificador de cobro -->
    <section class="mb-8" aria-label="Verificador de cobro">
      <h2 class="section-heading mb-1">¿Ese cobro es de la aduana o del courier?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Cargá lo que te cobraron, concepto por concepto. Te decimos qué es tributo, qué es precio de
        lista del courier y qué no tiene respaldo de ninguno de los dos.
      </p>
      <VCard variant="flat" class="tool-card pa-4 pa-sm-6">
        <VRow>
          <VCol v-for="id in CHARGE_IDS" :key="id" cols="6" sm="4">
            <VTextField
              v-model.number="chargeAmounts[id]"
              type="number"
              min="0"
              :label="CHARGE_LABEL[id]"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              clearable
            />
          </VCol>
        </VRow>

        <div v-if="chargeVerdicts.length" class="verdicts mt-2">
          <div
            v-for="v in chargeVerdicts"
            :key="v.id"
            class="verdict-row"
            :class="`v-${BACKING_TONE[v.backing]}`"
          >
            <div class="d-flex align-center flex-wrap ga-2 mb-1">
              <span class="verdict-charge">{{ CHARGE_LABEL[v.id] }} · US$ {{ v.amountUsd }}</span>
              <VChip size="small" :color="BACKING_TONE[v.backing]" variant="flat">
                {{ BACKING_LABEL[v.backing] }}
              </VChip>
            </div>
            <p class="verdict-explain mb-1">{{ v.explain }}</p>
            <a
              v-if="v.sourceId && sourceById(v.sourceId)"
              :href="sourceById(v.sourceId)!.url"
              target="_blank"
              rel="noopener noreferrer"
              class="verdict-source"
            >
              <VIcon size="13" class="mr-1">mdi-file-document-outline</VIcon
              >{{ sourceById(v.sourceId)!.norm }}
            </a>
            <p
              v-else-if="v.backing === 'norma'"
              class="verdict-source verdict-source--missing mb-0"
            >
              Es un tributo, pero no pudimos linkear la norma que lo respalda.
            </p>
          </div>
        </div>
        <p v-else class="text-caption text-medium-emphasis mb-0">
          Completá al menos un monto para ver el veredicto.
        </p>
      </VCard>
    </section>

    <!-- Contador de franquicias -->
    <section class="mb-8" aria-label="Contador de franquicias">
      <h2 class="section-heading mb-1">¿Cuánto cupo de franquicia me queda?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Cargá tus compras del año, una por una. Te mostramos cuánto usaste, cuánto te queda y qué
        pasa con la próxima.
      </p>
      <VCard variant="flat" class="tool-card pa-4 pa-sm-6">
        <div class="d-flex ga-2 align-center mb-4 flex-wrap">
          <VTextField
            v-model.number="newPurchaseValue"
            type="number"
            min="0"
            label="Valor de la compra"
            prefix="US$"
            variant="outlined"
            density="comfortable"
            hide-details
            class="purchase-input"
            @keyup.enter="addPurchase"
          />
          <VBtn color="primary" variant="tonal" prepend-icon="mdi-plus" @click="addPurchase">
            Agregar compra
          </VBtn>
        </div>

        <ul v-if="purchases.length" class="purchase-list mb-4">
          <li v-for="(p, i) in purchases" :key="i">
            <span>Compra {{ i + 1 }} — US$ {{ p.valueUsd }}</span>
            <button
              type="button"
              class="remove-btn"
              aria-label="Quitar compra"
              @click="removePurchase(i)"
            >
              <VIcon size="16">mdi-close</VIcon>
            </button>
          </li>
        </ul>

        <VAlert
          v-if="franchise.unknown"
          type="warning"
          variant="tonal"
          density="comfortable"
          icon="mdi-help-circle-outline"
        >
          No pudimos calcular tu franquicia con los datos disponibles en este momento. No es que se
          te haya acabado: es que no tenemos el tope o el máximo de envíos para calcularlo. Probá de
          nuevo más tarde.
        </VAlert>

        <template v-else>
          <VRow class="franchise-stats" dense>
            <VCol cols="6" sm="3">
              <div class="stat">
                <span class="stat-label">Usado</span>
                <span class="stat-value">US$ {{ franchise.usedUsd }}</span>
              </div>
            </VCol>
            <VCol cols="6" sm="3">
              <div class="stat">
                <span class="stat-label">Te queda</span>
                <span class="stat-value">US$ {{ franchise.remainingUsd }}</span>
              </div>
            </VCol>
            <VCol cols="6" sm="3">
              <div class="stat">
                <span class="stat-label">Envíos usados</span>
                <span class="stat-value">{{ franchise.shipmentsUsed }}</span>
              </div>
            </VCol>
            <VCol cols="6" sm="3">
              <div class="stat">
                <span class="stat-label">Envíos libres</span>
                <span class="stat-value">{{ franchise.shipmentsLeft }}</span>
              </div>
            </VCol>
          </VRow>

          <VAlert
            v-if="franchise.exhausted"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="mt-3"
            icon="mdi-alert-outline"
          >
            Ya no te queda franquicia disponible este año.
          </VAlert>

          <VAlert
            v-if="franchise.nextPurchaseWarning"
            type="info"
            variant="tonal"
            density="comfortable"
            class="mt-3"
            icon="mdi-information-outline"
          >
            {{ franchise.nextPurchaseWarning }}
          </VAlert>
        </template>
      </VCard>
    </section>

    <!-- Generador de reclamo -->
    <section id="generador-de-reclamo" class="mb-8" aria-label="Generador de reclamo">
      <h2 class="section-heading mb-1">Armá tu reclamo</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Elegí tu situación, completá los datos y armamos el texto.
        <strong>No lo mandamos nosotros</strong>: lo copiás y lo presentás vos, por el canal que
        corresponda.
      </p>
      <VCard variant="flat" class="tool-card pa-4 pa-sm-6">
        <template v-if="claimableProblems.length">
          <VRow>
            <VCol cols="12" sm="6">
              <VSelect
                v-model="claimProblemId"
                :items="claimableProblems.map(p => ({ title: p.title, value: p.id }))"
                label="Tu situación"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField
                v-model="claimTracking"
                label="Número de guía / tracking"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol cols="12" sm="6">
              <VTextField
                v-model="claimDate"
                type="date"
                label="Fecha del hecho"
                variant="outlined"
                density="comfortable"
              />
            </VCol>
            <VCol cols="12">
              <VTextarea
                v-model="claimDescription"
                label="Contá qué pasó, con tus palabras"
                variant="outlined"
                density="comfortable"
                rows="2"
                auto-grow
              />
            </VCol>
          </VRow>

          <VAlert
            v-if="claimError"
            type="error"
            variant="tonal"
            density="comfortable"
            icon="mdi-alert-circle-outline"
            class="mt-2"
          >
            {{ claimError }}
          </VAlert>

          <VTextarea
            :model-value="claimText"
            readonly
            variant="outlined"
            density="comfortable"
            rows="12"
            auto-grow
            class="claim-textarea mt-2"
            label="Tu reclamo"
          />

          <div class="d-flex justify-end mt-2">
            <VBtn
              :color="claimCopied ? 'success' : 'primary'"
              variant="tonal"
              size="small"
              :disabled="!claimText"
              :prepend-icon="claimCopied ? 'mdi-check' : 'mdi-content-copy'"
              @click="copyClaimText"
            >
              {{ claimCopied ? 'Copiado' : 'Copiar el reclamo' }}
            </VBtn>
          </div>
        </template>

        <VAlert
          v-else
          type="info"
          variant="tonal"
          density="comfortable"
          icon="mdi-information-outline"
        >
          Ninguna de las situaciones verificadas contra la norma tiene un reclamo armable todavía.
        </VAlert>
      </VCard>
    </section>

    <!-- Las situaciones, una por una -->
    <section class="mb-8" aria-label="Cada situación, en detalle">
      <h2 class="section-heading mb-1">Cada situación, en detalle</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Para cada una: qué dice la norma, qué hacer, y lo que la gente cuenta — separado, porque una
        cosa no es la otra.
      </p>

      <div class="problems-list">
        <VCard
          v-for="p in problems"
          :id="`problema-${p.id}`"
          :key="p.id"
          variant="flat"
          class="problem-card pa-5 pa-sm-6 mb-6"
        >
          <div class="d-flex align-center flex-wrap ga-2 mb-3">
            <VIcon color="primary">{{ PROBLEM_ICON[p.id] }}</VIcon>
            <h3 class="problem-title">{{ p.title }}</h3>
            <VChip v-if="!p.verified" size="small" color="warning" variant="tonal">
              sin verificar
            </VChip>
          </div>

          <template v-if="p.verified">
            <!-- La norma -->
            <div class="norm-block mb-4">
              <p class="block-label">La norma</p>
              <p class="norm-text">{{ p.norm }}</p>
              <div v-if="problemSources(p).length" class="source-chips">
                <a
                  v-for="s in problemSources(p)"
                  :key="s.id"
                  :href="s.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="source-chip"
                >
                  <VIcon size="12" class="mr-1">mdi-file-pdf-box</VIcon>{{ s.norm }}
                </a>
              </div>
            </div>

            <!-- Qué hacer -->
            <div class="action-block mb-4">
              <p class="block-label">Qué hacer</p>
              <ol class="steps-list">
                <li v-for="(s, i) in p.steps" :key="i">{{ s }}</li>
              </ol>
              <VAlert
                v-if="p.deadline"
                type="warning"
                variant="tonal"
                density="comfortable"
                icon="mdi-clock-alert-outline"
                class="mt-2"
              >
                {{ p.deadline }}
              </VAlert>
              <p v-if="p.claimBody" class="text-body-2 mt-2 mb-0">
                Reclamá: <strong>{{ CLAIM_BODY_LABEL[p.claimBody] }}</strong>
                <VBtn
                  v-if="p.claimTemplate"
                  size="x-small"
                  variant="text"
                  color="primary"
                  class="ml-1"
                  @click="useProblemForClaim(p.id)"
                >
                  armar el reclamo
                </VBtn>
              </p>
            </div>
          </template>

          <VAlert
            v-else
            type="warning"
            variant="tonal"
            density="comfortable"
            icon="mdi-help-circle-outline"
            class="mb-4"
          >
            No pudimos verificar esta situación contra la norma. Preferimos decírtelo antes que
            inventarte una respuesta.
          </VAlert>

          <!-- Lo que cuenta la gente -->
          <div class="testimony-block" data-testid="testimonios">
            <p class="block-label block-label--muted">Lo que cuenta la gente (no es la norma)</p>
            <ul v-if="p.quotes.length" class="quotes-list">
              <li v-for="(q, i) in p.quotes" :key="i">
                <a :href="q.permalink" target="_blank" rel="noopener noreferrer nofollow">
                  “{{ q.text }}”
                  <span class="q-meta">— {{ q.author }} · {{ q.date }} · {{ q.score }} puntos</span>
                </a>
              </li>
            </ul>
            <p v-if="p.reports > 0" class="reports-line">
              <VIcon size="14" class="mr-1">mdi-account-group-outline</VIcon
              >{{ reportsLine(p.reports) }}
            </p>
            <p
              v-if="!p.quotes.length && p.reports === 0"
              class="text-caption text-medium-emphasis mb-0"
            >
              Todavía no juntamos testimonios de r/uruguay para esta situación.
            </p>
          </div>
        </VCard>
      </div>
    </section>

    <!-- Facts appendix -->
    <section class="mb-8" aria-label="Todos los datos citados">
      <VExpansionPanels variant="accordion" class="facts-panels">
        <VExpansionPanel>
          <VExpansionPanelTitle>
            <VIcon size="18" class="mr-2">mdi-database-search-outline</VIcon>
            Todos los datos citados en esta guía ({{ facts.length }})
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <ul class="facts-list">
              <li v-for="f in facts" :key="f.id" class="fact-row">
                <div class="fact-main">
                  <span class="fact-label">{{ f.label }}</span>
                  <span class="fact-value"
                    >{{ f.value }}<template v-if="f.unit"> {{ f.unit }}</template></span
                  >
                  <VChip
                    v-if="isDnaOnly(f)"
                    size="x-small"
                    color="warning"
                    variant="tonal"
                    class="ml-2"
                  >
                    según la DNA, no la ley
                  </VChip>
                  <VChip
                    v-if="pendingReview.includes(f.id)"
                    size="x-small"
                    color="error"
                    variant="tonal"
                    class="ml-2"
                  >
                    control automático en disputa — pendiente de revisión humana
                  </VChip>
                </div>
                <div class="fact-meta">
                  <a
                    v-if="sourceById(f.sourceId)"
                    :href="sourceById(f.sourceId)!.url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ sourceById(f.sourceId)!.norm
                    }}<template v-if="f.article"> — {{ f.article }}</template>
                  </a>
                  <span class="fact-verified"
                    >verificado contra la norma el {{ formatDate(f.verifiedAt) }}</span
                  >
                  <span v-if="f.aiCheckedAt" class="fact-ai-checked">
                    último control automático: {{ formatDate(f.aiCheckedAt) }}
                  </span>
                </div>
              </li>
            </ul>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Cross-links -->
    <section class="mb-8" aria-label="Seguí leyendo">
      <h2 class="section-heading mb-4">Seguí leyendo</h2>
      <VRow>
        <VCol cols="12" sm="6" md="3">
          <NuxtLink :to="localePath('/franquicia-aduana-uruguay')" class="cross-link">
            <VIcon color="primary" class="mb-2">mdi-package-variant-closed-check</VIcon>
            <span class="cross-title">Franquicia y aduana</span>
            <span class="cross-desc">¿Tu compra paga IVA? Calculadora y las reglas.</span>
          </NuxtLink>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <NuxtLink :to="localePath('/couriers-uruguay')" class="cross-link">
            <VIcon color="primary" class="mb-2">mdi-truck-fast-outline</VIcon>
            <span class="cross-title">Couriers en Uruguay</span>
            <span class="cross-desc">Comparalos antes de elegir uno.</span>
          </NuxtLink>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <NuxtLink :to="localePath('/franquicia-viajero-uruguay')" class="cross-link">
            <VIcon color="primary" class="mb-2">mdi-bag-suitcase-outline</VIcon>
            <span class="cross-title">Franquicia de viajero</span>
            <span class="cross-desc">Es otro régimen: lo que traés en la valija.</span>
          </NuxtLink>
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <NuxtLink :to="localePath('/estafas-uruguay')" class="cross-link">
            <VIcon color="primary" class="mb-2">mdi-shield-alert-outline</VIcon>
            <span class="cross-title">Me estafaron</span>
            <span class="cross-desc">Si el problema fue con la plata, no con un paquete.</span>
          </NuxtLink>
        </VCol>
      </VRow>
    </section>

    <!-- Footer note -->
    <VCard variant="flat" class="footer-card pa-5 mb-6">
      <p class="text-caption text-medium-emphasis mb-0">
        <VIcon size="14" class="mr-1">mdi-update</VIcon>
        <template v-if="payload.updatedAt"
          >Actualizado el {{ formatDate(payload.updatedAt) }}.</template
        >
        <template v-else>Todavía no tenemos fecha de la última actualización en vivo.</template>
      </p>
      <p v-if="payload.stale" class="text-caption text-medium-emphasis mt-1 mb-0">
        <VIcon size="14" class="mr-1">mdi-clock-alert-outline</VIcon>
        Estos datos no se actualizan hace más de dos semanas. Puede haber cambios que todavía no
        reflejamos.
      </p>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento profesional. Cada trámite depende
      de su documentación y del funcionario que lo atienda. Si la plata en juego es importante,
      consultá a un despachante de aduana o a un abogado.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import type { AduanaSource } from '~/server/utils/aduanaFallback'
import {
  buildClaim,
  diagnose,
  franchiseStatus,
  verifyCharges,
  type AduanaFact,
  type AduanaProblem,
  type BucketId,
  type Charge,
  type ChargeId,
  type ChargeVerdict,
  type FranchiseStatus,
  type PublicAduanaPayload,
} from '~/utils/aduanaTools'

const localePath = useLocalePath()

// Data: server-cached, cascades live backend -> nitro cache -> the embedded baseline
// (app/server/utils/aduanaFallback.ts). The baseline is a VALUE only on the server: the API route
// (app/server/api/aduana.get.ts) already returns it on any backend error or empty result, so the
// client only ever needs an empty shell here — importing the 80KB+ baseline as a value would ship
// it in the client bundle AND in the hydration payload, twice, for a default that (bar a
// client-navigation network error) never fires.
const EMPTY: PublicAduanaPayload = {
  facts: [],
  problems: [],
  sources: [],
  updatedAt: null,
  stale: true,
  pendingReview: [],
}
const { data } = await useFetch<PublicAduanaPayload>('/api/aduana', {
  default: () => EMPTY,
})
const payload = computed<PublicAduanaPayload>(() => data.value ?? EMPTY)
const facts = computed(() => payload.value.facts)
const problems = computed(() => payload.value.problems)
const sources = computed(() => payload.value.sources)
const pendingReview = computed(() => payload.value.pendingReview ?? [])

function sourceById(id: string): AduanaSource | undefined {
  return sources.value.find(s => s.id === id)
}

function problemSources(p: AduanaProblem): AduanaSource[] {
  return p.sourceIds.map(id => sourceById(id)).filter((s): s is AduanaSource => Boolean(s))
}

/** Facts whose article is a DNA web page, not a located norm — badge them, never dress as statute. */
function isDnaOnly(f: AduanaFact): boolean {
  return Boolean(f.article?.startsWith('página v/'))
}

/** ISO date (or datetime) -> es-UY human date. Never a literal date typed in the template. */
function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso)
  const d = new Date(dateOnly ? `${iso}T00:00:00Z` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...(dateOnly ? { timeZone: 'UTC' } : {}),
  })
}

function reportsLine(n: number): string {
  return n === 1
    ? '1 persona contó algo parecido en r/uruguay'
    : `${n} personas contaron algo parecido en r/uruguay`
}

const PROBLEM_ICON: Record<BucketId, string> = {
  retenido: 'mdi-package-variant-closed-remove',
  'factura-exigida': 'mdi-file-document-alert-outline',
  'roto-o-incompleto': 'mdi-package-variant-closed',
  'cobro-abusivo': 'mdi-cash-remove',
  'franquicia-agotada': 'mdi-counter',
  'supera-monto': 'mdi-cash-multiple',
  'prohibido-o-restringido': 'mdi-alert-octagon-outline',
  'decomiso-subasta': 'mdi-gavel',
  'comercial-vs-personal': 'mdi-store-outline',
  'encomienda-regalo': 'mdi-gift-outline',
  'demora-extrema': 'mdi-clock-alert-outline',
  'mudanza-y-viajero': 'mdi-bag-suitcase-outline',
}

const CLAIM_BODY_LABEL: Record<NonNullable<AduanaProblem['claimBody']>, string> = {
  courier: 'Al courier / operador postal',
  dna: 'A la Dirección Nacional de Aduanas',
  'defensa-consumidor': 'A Defensa del Consumidor',
  ursec: 'A URSEC',
}

// --- Diagnóstico ---------------------------------------------------------------------------

const selectedSymptomId = ref<BucketId | null>(null)
const selectedProblem = computed<AduanaProblem | null>(() =>
  selectedSymptomId.value
    ? (diagnose(selectedSymptomId.value, problems.value) as AduanaProblem | null)
    : null
)
function selectSymptom(id: BucketId) {
  selectedSymptomId.value = id
}
function scrollToProblem(id: BucketId) {
  selectedSymptomId.value = id
  nextTick(() => {
    document
      .getElementById(`problema-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

// --- Verificador de cobro -------------------------------------------------------------------

const CHARGE_IDS: ChargeId[] = [
  'iva',
  'prestacion_unica',
  'gestion_courier',
  'deposito',
  'flete',
  'otro',
]
const CHARGE_LABEL: Record<ChargeId, string> = {
  iva: 'IVA',
  prestacion_unica: 'Prestación única',
  gestion_courier: 'Gestión del courier',
  deposito: 'Depósito / almacenaje',
  flete: 'Flete',
  otro: 'Otro cargo',
}
const chargeAmounts = reactive<Record<ChargeId, number | null>>({
  iva: null,
  prestacion_unica: null,
  gestion_courier: null,
  deposito: null,
  flete: null,
  otro: null,
})
const enteredCharges = computed<Charge[]>(() =>
  CHARGE_IDS.filter(id => Number(chargeAmounts[id]) > 0).map(id => ({
    id,
    amountUsd: Number(chargeAmounts[id]),
  }))
)
const chargeVerdicts = computed<ChargeVerdict[]>(() =>
  enteredCharges.value.length
    ? verifyCharges({ charges: enteredCharges.value, facts: facts.value })
    : []
)
const BACKING_TONE: Record<ChargeVerdict['backing'], string> = {
  norma: 'success',
  contrato: 'warning',
  'sin-respaldo': 'error',
}
const BACKING_LABEL: Record<ChargeVerdict['backing'], string> = {
  norma: 'Lo cobra la norma',
  contrato: 'Lo cobra el courier',
  'sin-respaldo': 'Sin respaldo',
}

// --- Contador de franquicias -----------------------------------------------------------------

const purchases = ref<Array<{ valueUsd: number }>>([])
const newPurchaseValue = ref<number | null>(null)
function addPurchase() {
  const v = Number(newPurchaseValue.value)
  if (!v || v <= 0) return
  purchases.value.push({ valueUsd: v })
  newPurchaseValue.value = null
}
function removePurchase(i: number) {
  purchases.value.splice(i, 1)
}
const franchise = computed<FranchiseStatus>(() =>
  franchiseStatus({ purchases: purchases.value, facts: facts.value })
)

// --- Generador de reclamo -------------------------------------------------------------------

// verified is NOT optional here: an unverified problem's steps are our own guess, and this tool
// hands out a formal letter with a PETITORIO that people file with the DNA/courier/URSEC. Offering
// it for a situation the page itself says it could not confirm against the norm would contradict
// the page's own promise on the same screen.
const claimableProblems = computed(() => problems.value.filter(p => p.claimTemplate && p.verified))
const claimProblemId = ref<BucketId | null>(claimableProblems.value[0]?.id ?? null)
const claimTracking = ref('')
const claimDate = ref(new Date().toISOString().slice(0, 10))
const claimDescription = ref('')

// buildClaim throws by design when a template placeholder is left unresolved, so a claim letter
// never ships with a literal "{{tracking}}" in it. That must be surfaced, not swallowed into a
// silently blank textarea whose copy button would otherwise copy an empty string.
const claimResult = computed<{ text: string; error: string | null }>(() => {
  const problem = claimableProblems.value.find(p => p.id === claimProblemId.value)
  if (!problem) return { text: '', error: null }
  try {
    const text = buildClaim({
      problem,
      tracking: claimTracking.value.trim() || '[NÚMERO DE GUÍA]',
      date: claimDate.value ? formatDate(claimDate.value) : '[FECHA]',
      description: claimDescription.value.trim() || '[DESCRIBÍ QUÉ PASÓ]',
    })
    return { text, error: null }
  } catch {
    return {
      text: '',
      error:
        'No pudimos generar el texto del reclamo para esta situación. Probá de nuevo o cambiá la situación elegida.',
    }
  }
})
const claimText = computed(() => claimResult.value.text)
const claimError = computed(() => claimResult.value.error)

const claimCopied = ref(false)
async function copyClaimText() {
  try {
    await navigator.clipboard.writeText(claimText.value)
    claimCopied.value = true
    setTimeout(() => (claimCopied.value = false), 2000)
  } catch {
    claimCopied.value = false
  }
}

/** Lets the diagnosis view and the per-problem "Qué hacer" block jump straight into the generator. */
function useProblemForClaim(id: BucketId) {
  if (!claimableProblems.value.some(p => p.id === id)) return
  claimProblemId.value = id
  nextTick(() => {
    document
      .getElementById('generador-de-reclamo')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/problemas-con-la-aduana-uruguay'
const title = 'Problemas con la aduana en Uruguay: qué hacer en cada caso'
const description =
  'Paquete retenido, factura exigida, cobro que no entendés, franquicia agotada, decomiso: situaciones típicas con los pasos exactos, a quién reclamarle y la norma citada. Con calculadoras y un generador de reclamo.'

defineOgImageComponent('Cambio', {
  title: 'Problemas con la aduana: qué hacer en cada caso',
  subtitle: 'Situaciones típicas, con la norma citada y el plan de acción',
  tag: 'PROBLEMAS',
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
        'problemas con la aduana uruguay, paquete retenido aduana uruguay, aduana no libera el paquete, me cobran de mas courier, franquicia agotada aduana, reclamo aduana uruguay, decomiso aduana uruguay, courier uruguay demora, abandono aduanero uruguay, ursec reclamo postal',
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
                name: title,
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            // Only verified problems: structured data must never assert to Google what the
            // visible page itself refuses to assert ("no lo pudimos verificar").
            mainEntity: problems.value
              .filter(p => p.verified)
              .map(p => ({
                '@type': 'Question',
                name: p.symptom,
                acceptedAnswer: { '@type': 'Answer', text: p.steps[0] ?? p.norm },
              })),
          },
          {
            '@type': 'HowTo',
            name: 'Cómo resolver un problema con la aduana en Uruguay',
            description,
            step: [
              {
                '@type': 'HowToStep',
                position: 1,
                name: 'Elegí tu síntoma',
                text: 'Encontrá la situación que más se parece a lo que te está pasando.',
              },
              {
                '@type': 'HowToStep',
                position: 2,
                name: 'Seguí el plan de acción',
                text: 'Los pasos numerados, en orden, con el plazo si lo hay y a quién reclamarle.',
              },
              {
                '@type': 'HowToStep',
                position: 3,
                name: 'Armá tu reclamo',
                text: 'Completá los datos y copiá el texto para presentarlo vos mismo.',
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  /* `primary` (Vuetify blue-darken-2, #1976d2) reads at bold 11px but clears AA (4.5:1) in
     neither theme against this page's background (3.75:1 light, 4.18:1 dark — axe-flagged both
     ways). `link` is the token this codebase already carries for exactly this problem: darker in
     light theme (#1565c0, 4.69:1) and lighter in dark theme (#64b5f6, 8.69:1) — see plugins/vuetify.ts. */
  color: rgb(var(--v-theme-link));
  margin-bottom: 4px;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
}
.block-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.6;
  margin-bottom: 6px;
}
.block-label--muted {
  opacity: 0.55;
}
.steps-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}

/* Diagnóstico */
.scenarios {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 10px;
}
.scenario {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 2px;
  padding: 14px;
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}
.scenario:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.scenario--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}
.scenario-label {
  font-size: 0.86rem;
  font-weight: 700;
  line-height: 1.35;
}
.plan,
.tool-card,
.problem-card,
.footer-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}

/* Verificador de cobro */
.verdicts {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.verdict-row {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-left: 3px solid rgba(var(--v-border-color), 0.4);
  border-radius: 10px;
  padding: 12px 14px;
}
.verdict-row.v-success {
  border-left-color: #16a34a;
}
.verdict-row.v-warning {
  border-left-color: #ca8a04;
}
.verdict-row.v-error {
  border-left-color: #dc2626;
}
.verdict-charge {
  font-size: 0.88rem;
  font-weight: 700;
}
.verdict-explain {
  font-size: 0.85rem;
  line-height: 1.55;
  opacity: 0.9;
}
.verdict-source {
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
}
.verdict-source--missing {
  opacity: 0.75;
  font-style: italic;
}

/* Contador de franquicias */
.purchase-input {
  max-width: 220px;
}
.purchase-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.purchase-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.86rem;
  padding: 6px 10px;
  background: rgba(var(--v-border-color), 0.06);
  border-radius: 8px;
}
.remove-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  opacity: 0.6;
}
.remove-btn:hover {
  opacity: 1;
}
.franchise-stats .stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
}
.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
}

/* Generador de reclamo */
.claim-textarea :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  line-height: 1.6;
}

/* Las doce situaciones */
.problem-title {
  font-size: 1.05rem;
  font-weight: 800;
}
.norm-block {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.55);
  padding-left: 14px;
}
.norm-text {
  font-size: 0.88rem;
  line-height: 1.7;
  opacity: 0.92;
}
.source-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.source-chip {
  font-size: 0.74rem;
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.1);
  text-decoration: none;
}
.action-block {
  border-left: 3px solid rgba(22, 163, 74, 0.55);
  padding-left: 14px;
}

/* Testimonios: deliberately NOT a left-border "law" card — dashed top rule + muted background so
   it reads as a different kind of thing, not a paler version of the norm/action blocks. */
.testimony-block {
  border-top: 1px dashed rgba(var(--v-border-color), 0.25);
  padding-top: 14px;
  margin-top: 4px;
  background: rgba(var(--v-border-color), 0.04);
  border-radius: 10px;
  padding: 14px;
}
.quotes-list {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.quotes-list a {
  display: block;
  font-size: 0.82rem;
  font-style: italic;
  line-height: 1.55;
  text-decoration: none;
  border-radius: 8px;
  padding: 8px 10px;
  background: rgba(var(--v-border-color), 0.07);
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.92;
}
.quotes-list a:hover {
  background: rgba(var(--v-theme-primary), 0.08);
}
.q-meta {
  display: block;
  font-size: 0.68rem;
  font-style: normal;
  opacity: 0.65;
  margin-top: 3px;
}
.reports-line {
  font-size: 0.78rem;
  opacity: 0.75;
  margin: 0;
  display: flex;
  align-items: center;
}

/* Facts appendix */
.facts-panels {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  overflow: hidden;
}
.facts-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fact-row {
  border-bottom: 1px dashed rgba(var(--v-border-color), 0.16);
  padding-bottom: 10px;
}
.fact-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.fact-main {
  font-size: 0.85rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}
.fact-label {
  font-weight: 600;
}
.fact-value {
  opacity: 0.8;
}
.fact-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 0.7rem;
  opacity: 0.65;
  margin-top: 2px;
}
/* A human verification and a machine re-read must not read as the same claim: verifiedAt is the
   stronger one (somebody opened the decree), aiCheckedAt is a freshness signal, never a trust
   signal — see the header comment on AduanaFact in app/server/utils/aduanaFallback.ts. */
.fact-verified {
  font-weight: 600;
  opacity: 0.9;
}
.fact-ai-checked {
  font-style: italic;
  opacity: 0.55;
}

/* Cross-links */
.cross-link {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 16px;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease;
}
.cross-link:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.cross-title {
  font-size: 0.92rem;
  font-weight: 700;
}
.cross-desc {
  font-size: 0.78rem;
  opacity: 0.7;
  line-height: 1.4;
}
</style>
