<template>
  <VContainer class="page py-6" style="max-width: 1100px">
    <VBtn :to="localePath('/salud-financiera')" variant="text" size="small" class="px-1 mb-2">
      <VIcon start icon="mdi-arrow-left" /> Salud financiera
    </VBtn>

    <VCard class="hero pa-6 pa-md-8 mb-6" rounded="xl">
      <div class="eyebrow mb-2">Guía práctica · Uruguay</div>
      <h1 class="hero-title mb-3">
        Saldar deudas en Uruguay: cómo negociar, y si conviene ChauDeudas o MiDeuda
      </h1>
      <p class="hero-lead mb-4">
        Conseguiste trabajo y querés ponerte al día para mejorar tu historial. Esta guía te muestra
        qué hacer gratis primero, cómo negociar una quita vos mismo, y qué son realmente las
        plataformas de "solución de deudas" — con datos, no promesas.
      </p>
      <ShareButtons text="Saldar deudas en Uruguay: guía y comparativa de servicios" />
    </VCard>

    <!-- TL;DR -->
    <VCard variant="tonal" color="primary" class="pa-5 mb-6" rounded="lg">
      <h2 class="text-h6 font-weight-bold mb-2">La respuesta corta</h2>
      <p class="mb-2">
        ChauDeudas y MiDeuda no son estafa, pero rara vez son tu mejor opción: son plataformas de
        empresas de cobranza que te cobran gratis a vos porque le cobran al acreedor. Hacen —a
        cambio de tus datos— algo que podés hacer solo y gratis.
      </p>
      <p class="mb-0">
        <strong>Hacé esto primero, gratis:</strong> consultá tu situación en la Central de Riesgos
        del BCU (<a
          href="https://consultadeuda.bcu.gub.uy/consultadeuda/"
          target="_blank"
          rel="noopener"
          >consultadeuda.bcu.gub.uy</a
        >) y pedí tu informe de Clearing, que te toca gratis cada 6 meses. Recién ahí decidí.
      </p>
    </VCard>

    <!-- 4 verdades / myths -->
    <h2 class="section-heading">Antes de pagar un peso: 4 verdades que te ahorran plata</h2>
    <VRow>
      <VCol v-for="m in DEBT_MYTHS" :key="m.myth" cols="12" md="6">
        <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
          <div class="text-medium-emphasis mb-1">{{ m.myth }}</div>
          <p class="mb-2">{{ m.truth }}</p>
          <div class="text-caption text-medium-emphasis">{{ m.norma }}</div>
        </VCard>
      </VCol>
    </VRow>

    <!-- Prescription tool -->
    <h2 class="section-heading">¿Tu deuda pudo prescribir?</h2>
    <VCard variant="outlined" class="pa-4 mb-2" rounded="lg">
      <VRow align="center">
        <VCol cols="12" md="6">
          <VSelect
            v-model="presType"
            :items="PRESCRIPTION_TYPES.map(t => ({ title: t.label, value: t.id }))"
            label="Tipo de deuda"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="6">
          <VTextField
            v-model="presDate"
            type="date"
            label="Fecha del último pago o vencimiento"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>

      <VAlert
        v-if="presResult"
        :type="presResult.mayHaveExpired ? 'success' : 'info'"
        variant="tonal"
        class="mt-4"
      >
        <div class="font-weight-bold mb-1">
          Plazo legal: {{ yearsMonths(presResult.months) }} · {{ presResult.norma }}
        </div>
        <div v-if="presResult.mayHaveExpired" class="mb-2">
          Pasaron {{ yearsMonths(presResult.monthsElapsed) }}: el plazo legal de cobro
          <strong>pudo</strong> haberse cumplido.
        </div>
        <div v-else class="mb-2">
          Pasaron {{ yearsMonths(presResult.monthsElapsed) }}; faltarían
          {{ yearsMonths(presResult.monthsRemaining) }} para cumplir el plazo.
        </div>
        <div class="text-body-2">{{ presResult.caveat }}</div>
      </VAlert>
    </VCard>

    <!-- Negotiation playbook -->
    <h2 class="section-heading">Cómo negociar una quita vos mismo</h2>
    <VExpansionPanels variant="accordion" class="mb-2">
      <VExpansionPanel v-for="(s, i) in NEGOTIATION_STEPS" :key="s.title">
        <VExpansionPanelTitle>
          <span class="font-weight-bold mr-2">{{ i + 1 }}.</span> {{ s.title }}
        </VExpansionPanelTitle>
        <VExpansionPanelText>{{ s.detail }}</VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>
    <p class="text-caption text-medium-emphasis">
      Cifras de quita reportadas por usuarios de
      <!-- eslint-disable-next-line vue/max-attributes-per-line -->
      <a href="https://reddit.com/r/uruguay/comments/1dhwy89" target="_blank" rel="noopener"
        >r/uruguay</a
      >; no son garantía. ¿Varias deudas? Ordénalas con el
      <NuxtLink :to="localePath('/salir-del-clearing')">simulador de pago</NuxtLink>.
    </p>

    <!-- Live usury caps note -->
    <VAlert v-if="live" type="info" variant="text" density="compact" class="mb-6 text-caption">
      Topes de usura vigentes: {{ live.period }}. Sin descuento &lt; 10.000 UI, tope
      {{ formatNumber(live.usuryCaps[1]?.topeTasa ?? 0, 2) }}%. Si tu tasa real supera el tope,
      podés reclamar.
    </VAlert>

    <!-- Comparison table (computed rubric) -->
    <h2 class="section-heading">Las plataformas, comparadas</h2>
    <p class="mb-3 text-body-2 text-medium-emphasis">
      Puntaje 0–100 calculado con una rúbrica ponderada ({{
        RELIEF_RUBRIC.map(d => `${d.label} ${d.weight}%`).join(' · ')
      }}). La línea base "negociar directo" es el patrón contra el que se miden las plataformas.
    </p>
    <div style="overflow-x: auto">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>#</th>
            <th>Servicio</th>
            <th>Quién está detrás</th>
            <th>¿Quién paga?</th>
            <th>¿BCU?</th>
            <th class="text-right">Puntaje</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in ranked" :key="s.id">
            <td data-label="#">{{ medal(s.rank) || s.rank }}</td>
            <td class="font-weight-medium" data-label="">{{ s.name }}</td>
            <td class="text-caption" data-label="Quién está detrás">{{ s.operador }}</td>
            <td class="text-caption" data-label="¿Quién paga?">{{ s.quienPaga }}</td>
            <td data-label="¿BCU?">{{ s.bcuRegulado ? 'Sí' : 'No' }}</td>
            <td class="text-right font-weight-bold" data-label="Puntaje">{{ s.overall }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>
    <VExpansionPanels variant="accordion" class="mt-3 mb-2">
      <VExpansionPanel v-for="s in ranked" :key="s.id">
        <VExpansionPanelTitle
          >{{ medal(s.rank) || `${s.rank}.` }} {{ s.name }} —
          {{ s.overall }}/100</VExpansionPanelTitle
        >
        <VExpansionPanelText>
          <p class="mb-2">{{ s.transparencia }}</p>
          <div class="text-caption text-medium-emphasis mb-2">Qué documenta: {{ s.documenta }}</div>
          <div class="text-caption">
            Fuentes:
            <a
              v-for="src in s.sources"
              :key="src.url"
              :href="src.url"
              target="_blank"
              rel="noopener"
              class="mr-2"
              >{{ src.label }}</a
            >
          </div>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Verdict by case -->
    <h2 class="section-heading">Veredicto honesto, según tu caso</h2>
    <VRow>
      <VCol v-for="v in VERDICT_CASES" :key="v.situation" cols="12" md="6">
        <VAlert :type="verdictColor(v.tone)" variant="tonal" class="h-100" density="comfortable">
          <div class="font-weight-bold mb-1">{{ v.situation }}</div>
          <div>{{ v.advice }}</div>
        </VAlert>
      </VCol>
    </VRow>

    <!-- Credit rebuild -->
    <h2 class="section-heading">Reconstruir tu historial crediticio</h2>
    <VRow>
      <VCol v-for="s in CREDIT_REBUILD_STEPS" :key="s.title" cols="12" md="6">
        <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
          <div class="font-weight-bold mb-1">{{ s.title }}</div>
          <p class="mb-0">{{ s.detail }}</p>
        </VCard>
      </VCol>
    </VRow>
    <p class="mt-3">
      ¿Necesitás consolidar? Compará opciones de refinanciación en
      <NuxtLink :to="localePath('/prestamos-uruguay')">préstamos en Uruguay</NuxtLink>.
    </p>
    <VTable density="comfortable" class="mt-2 cu-mobile-cards">
      <thead>
        <tr>
          <th>Institución</th>
          <th>Producto</th>
          <th>Tasa</th>
          <th>Nota</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="r in DEBT_RELIEF_BASELINE.refiRates" :key="r.institucion + r.producto">
          <td class="font-weight-medium" data-label="">{{ r.institucion }}</td>
          <td data-label="Producto">{{ r.producto }}</td>
          <td data-label="Tasa">{{ r.tasa }}</td>
          <td class="text-caption" data-label="Nota">{{ r.nota }}</td>
        </tr>
      </tbody>
    </VTable>

    <!-- Rights -->
    <h2 class="section-heading">Tus derechos y dónde denunciar</h2>
    <VRow>
      <VCol cols="12" md="4">
        <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
          <div class="font-weight-bold mb-1">Usura (Ley 18.212)</div>
          <p class="mb-0 text-body-2">
            Se compara la tasa real (TIR), no la nominal. El tope es la tasa media del BCU + 55% (o
            + 80% en mora) para créditos chicos. Si te cobraron de más, caduca el derecho a cobrarte
            intereses y el juez lo releva de oficio.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
          <div class="font-weight-bold mb-1">Cobranza abusiva</div>
          <p class="mb-0 text-body-2">
            No pueden contarle tu deuda a tu empleador ni a tu familia (Ley 18.331 art. 11), ni
            amenazarte con cárcel. Denunciá en Defensa del Consumidor: 0800 7005.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard class="pa-4 h-100" variant="outlined" rounded="lg">
          <div class="font-weight-bold mb-1">Datos y Clearing</div>
          <p class="mb-0 text-body-2">
            Si figura un dato caduco o erróneo, pedí su rectificación o supresión. Si no cumplen,
            denunciá ante la URCDP.
          </p>
        </VCard>
      </VCol>
    </VRow>

    <!-- Sources + cross-links -->
    <h2 class="section-heading">Fuentes</h2>
    <VCard variant="outlined" class="pa-4 mb-6" rounded="lg">
      <ul class="mb-0">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener">{{ s.label }}</a>
        </li>
      </ul>
    </VCard>

    <VRow>
      <VCol cols="12" md="4">
        <NuxtLink :to="localePath('/salir-del-clearing')" class="cross-link pa-4 h-100">
          <div class="font-weight-bold mb-1">Salir del Clearing</div>
          <div class="text-body-2 text-medium-emphasis">
            Simulador de pago de deudas y calculadora de la tasa real que te cobran.
          </div>
        </NuxtLink>
      </VCol>
      <VCol cols="12" md="4">
        <NuxtLink :to="localePath('/prestamos-uruguay')" class="cross-link pa-4 h-100">
          <div class="font-weight-bold mb-1">Préstamos en Uruguay</div>
          <div class="text-body-2 text-medium-emphasis">
            Compará tasas para refinanciar o consolidar deudas.
          </div>
        </NuxtLink>
      </VCol>
      <VCol cols="12" md="4">
        <NuxtLink :to="localePath('/salud-financiera')" class="cross-link pa-4 h-100">
          <div class="font-weight-bold mb-1">Salud financiera</div>
          <div class="text-body-2 text-medium-emphasis">
            Medí tu situación y armá un presupuesto que aguante.
          </div>
        </NuxtLink>
      </VCol>
    </VRow>

    <VAlert type="info" variant="tonal" class="mt-8" density="comfortable">
      Información con fines educativos, no asesoramiento financiero ni legal. Cada caso concreto
      requiere un abogado. Verificá siempre los datos en la fuente oficial.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  DEBT_MYTHS,
  NEGOTIATION_STEPS,
  VERDICT_CASES,
  CREDIT_REBUILD_STEPS,
  DEBT_RELIEF_BASELINE,
  PRESCRIPTION_TYPES,
  checkPrescription,
  RELIEF_RUBRIC,
  rankedServices,
  type LiveDebtRelief,
} from '~/utils/debtRelief'
import { formatNumber } from '~/utils/format'

const localePath = useLocalePath()

const verdictColor = (tone: 'good' | 'neutral' | 'warn') =>
  tone === 'good' ? 'success' : tone === 'warn' ? 'warning' : 'info'

// --- Prescription tool state ---
const presType = ref(PRESCRIPTION_TYPES[0].id)
const presDate = ref('') // yyyy-mm-dd from <input type="date">
const presResult = computed(() => {
  if (!presDate.value) return null
  const today = new Date().toISOString().slice(0, 10)
  return checkPrescription(presType.value, presDate.value, today)
})
const yearsMonths = (months: number) => {
  const y = Math.floor(months / 12)
  const m = months % 12
  return (
    [y ? `${y} año${y === 1 ? '' : 's'}` : '', m ? `${m} mes${m === 1 ? '' : 'es'}` : '']
      .filter(Boolean)
      .join(' y ') || '0 meses'
  )
}

// --- Ranked services (computed from the rubric) ---
const ranked = rankedServices()
const medal = (rank: number) => (rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '')

// --- Live usury caps (non-blocking) ---
// Do NOT await: awaiting makes this an async component (Suspense) and triggers the
// known first-click hydration bug. useLazyFetch is non-blocking by design.
const { data: live } = useLazyFetch<LiveDebtRelief>('/api/debt-relief', { server: false })

const sources = [
  {
    label: 'BCU — Consulta de deuda (Central de Riesgos)',
    url: 'https://consultadeuda.bcu.gub.uy/consultadeuda/',
  },
  {
    label: 'BCU — Tasas medias / topes de usura (Ley 18.212)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Tasas-Medias.aspx',
  },
  {
    label: 'Ley 18.331 (Protección de Datos) art. 22 — IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008/22',
  },
  {
    label: 'Equifax Uruguay — informe personal gratis',
    url: 'https://www.equifax.uy/personales/faqs/',
  },
  {
    label: 'Ley 17.829 (retenciones sobre el sueldo) — IMPO',
    url: 'https://www.impo.com.uy/bases/leyes/17829-2004/3',
  },
  {
    label: 'Defensa del Consumidor (MEF) — 0800 7005',
    url: 'https://www.gub.uy/tramites/consulta-reclamo-yo-denuncia-materia-defensa-consumidor',
  },
  {
    label: 'URCDP — denuncias de datos personales',
    url: 'https://www.gub.uy/tramites/denuncias-unidad-reguladora-control-datos-personales-urcdp',
  },
]

const title = 'Saldar deudas en Uruguay: cómo negociar y si conviene ChauDeudas o MiDeuda'
const description =
  'Guía para saldar deudas viejas en Uruguay: verificá prescripción, negociá una quita vos mismo, comparativa honesta de ChauDeudas, MiDeuda y otras, y cómo reconstruir tu historial crediticio.'
const canonicalUrl = 'https://cambio-uruguay.com/saldar-deudas-uruguay'

defineOgImageComponent('Cambio', {
  title: 'Saldar deudas en Uruguay',
  subtitle: 'Negociar, comparar servicios y reconstruir tu historial',
  tag: 'Guía',
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
        'saldar deudas uruguay, chaudeudas opiniones, mideuda vale la pena, negociar deuda uruguay, quita de deuda, salir de deudas uruguay, prescripción deuda, clearing',
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
              { '@type': 'ListItem', position: 2, name: 'Saldar deudas', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              ...DEBT_MYTHS.map(m => ({
                '@type': 'Question',
                name: m.myth,
                acceptedAnswer: { '@type': 'Answer', text: m.truth },
              })),
              ...VERDICT_CASES.map(v => ({
                '@type': 'Question',
                name: v.situation,
                acceptedAnswer: { '@type': 'Answer', text: v.advice },
              })),
            ],
          },
        ],
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
.hero-title {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 800;
  line-height: 1.15;
}
.hero-lead {
  font-size: 1.05rem;
  opacity: 0.9;
  max-width: 60ch;
}
.section-heading {
  font-size: 1.35rem;
  font-weight: 750;
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 0.6rem;
  margin: 2rem 0 1rem;
}
.cross-link {
  display: block;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 14px;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}
.cross-link:hover {
  transform: translateY(-2px);
  border-color: rgb(var(--v-theme-primary));
}
</style>
