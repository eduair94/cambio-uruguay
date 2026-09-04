<template>
  <div class="tarjetas-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/salud-financiera')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Salud financiera
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-tarjetas pa-6 on-dark">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-trophy-outline</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Ranking de tarjetas de crédito en Uruguay: puntos y beneficios
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 tarjetas-intro">
              Comparamos {{ ranked.length }} programas de puntos y beneficios de tarjetas uruguayas
              y los rankeamos con una rúbrica transparente y ponderada. Cada puntaje está a la
              vista: podés recalcular con tu propio criterio.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons text="Ranking de tarjetas de crédito en Uruguay: puntos y beneficios" />
        </div>
      </div>
    </VCard>

    <!-- Methodology -->
    <VExpansionPanels class="mb-6 method-panels">
      <VExpansionPanel>
        <VExpansionPanelTitle>
          <VIcon start color="primary" size="small">mdi-scale-balance</VIcon>
          <span class="font-weight-bold">Cómo armamos el ranking (metodología)</span>
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="text-body-2 mb-4">
            El puntaje general de cada tarjeta se <strong>calcula</strong> a partir de seis
            dimensiones, cada una puntuada de 0 a 100 según la evidencia disponible, y ponderada por
            el peso de abajo. No hay puntaje "a dedo": si cambiás el criterio, cambia el ranking.
            Cuando un dato no está publicado, puntuamos conservador y lo aclaramos.
          </p>
          <div v-for="dim in rubric" :key="dim.id" class="method-dim">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="font-weight-bold text-body-2">{{ dim.label }}</span>
              <VChip size="x-small" color="primary" variant="tonal">{{ dim.weight }}%</VChip>
            </div>
            <p class="text-caption text-grey-lighten-1 mb-3">{{ dim.what }}</p>
          </div>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Tier list: shared score bands keep this top comparable with the debit-card page. -->
    <section class="mb-8" aria-labelledby="credit-tier-title">
      <h2 id="credit-tier-title" class="text-h6 font-weight-bold mb-1">
        Tier list de tarjetas y programas disponibles en Uruguay
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Es una lectura rápida del mismo puntaje ponderado. Los tiers se calculan; no reemplazan el
        detalle de acumulación, costo y canje que aparece debajo.
      </p>
      <RankingTierBoard
        :items="tierItems"
        aria-label="Tier list de tarjetas de crédito y programas disponibles en Uruguay"
      />
    </section>

    <!-- Issuer filter -->
    <div class="d-flex flex-wrap align-center ga-2 mb-4">
      <span class="text-caption text-grey-lighten-1 mr-1">Filtrar por emisor:</span>
      <VChip
        :color="selectedType === 'all' ? 'primary' : undefined"
        :variant="selectedType === 'all' ? 'flat' : 'outlined'"
        size="small"
        @click="selectedType = 'all'"
      >
        Todos
      </VChip>
      <VChip
        v-for="t in issuerTypes"
        :key="t"
        :color="selectedType === t ? 'primary' : undefined"
        :variant="selectedType === t ? 'flat' : 'outlined'"
        size="small"
        @click="selectedType = t"
      >
        {{ ISSUER_TYPE_LABELS[t] }}
      </VChip>
    </div>

    <!-- Full ranking -->
    <div v-for="p in visible" :id="`programa-${p.id}`" :key="p.id" class="rank-card mb-3">
      <div class="rank-head pa-4 pa-sm-5">
        <div class="d-flex align-start ga-3">
          <div class="rank-badge" :class="rankTone(p.rank)">
            <span v-if="medalFor(p.rank)" class="rank-medal">{{ medalFor(p.rank) }}</span>
            <span v-else class="rank-num">{{ p.rank }}</span>
          </div>
          <div class="flex-grow-1">
            <div class="d-flex align-center ga-2 flex-wrap mb-1">
              <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ p.name }}</h3>
              <VChip
                v-if="p.verified"
                size="x-small"
                color="success"
                variant="tonal"
                class="font-weight-medium"
              >
                <VIcon start size="11">mdi-check-decagram-outline</VIcon>
                Verificado
              </VChip>
            </div>
            <div class="d-flex align-center ga-2 flex-wrap mb-1">
              <span class="text-caption text-grey-lighten-1">{{ p.issuer }}</span>
              <VChip size="x-small" variant="tonal">{{ ISSUER_TYPE_LABELS[p.issuerType] }}</VChip>
              <VChip v-for="n in p.networks" :key="n" size="x-small" variant="outlined">
                {{ NETWORK_LABELS[n] }}
              </VChip>
            </div>
          </div>
          <div class="rank-overall text-center flex-shrink-0">
            <div class="rank-overall-num" :style="{ color: scoreColor(p.overall) }">
              {{ p.overall }}
            </div>
            <div class="text-caption text-grey-lighten-1">/ 100</div>
          </div>
        </div>

        <!-- Score bars -->
        <div class="score-bars mt-4">
          <div v-for="dim in rubric" :key="dim.id" class="score-row">
            <span class="score-dim">{{ dim.label }}</span>
            <div class="score-track">
              <div
                class="score-fill"
                :style="{ width: p.scores[dim.id] + '%', background: scoreColor(p.scores[dim.id]) }"
              />
            </div>
            <span class="score-val">{{ p.scores[dim.id] }}</span>
          </div>
        </div>
      </div>

      <!-- Details (expandable). `eager` so the rich content ships in the SSR HTML
           (indexable + accessible) even while visually collapsed. -->
      <VExpansionPanels flat class="rank-details">
        <VExpansionPanel eager>
          <VExpansionPanelTitle class="rank-details-title">
            <span class="text-body-2">Ver acumulación, canje, descuentos, pros y contras</span>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p v-if="p.rationale" class="rank-rationale text-body-2 mb-4">
              <VIcon size="14" color="primary" class="mr-1">mdi-gavel</VIcon>
              {{ p.rationale }}
            </p>

            <dl class="rank-facts">
              <div>
                <dt>Programa</dt>
                <dd>{{ p.pointsProgramName }}</dd>
              </div>
              <div>
                <dt>Acumulación</dt>
                <dd>{{ p.earnRateNote }}</dd>
              </div>
              <div v-if="p.pointValueNote">
                <dt>Valor del punto</dt>
                <dd>{{ p.pointValueNote }}</dd>
              </div>
              <div>
                <dt>Canje</dt>
                <dd>{{ p.redemptionNote }}</dd>
              </div>
              <div>
                <dt>Descuentos y beneficios</dt>
                <dd>
                  {{ p.discountNote }}
                  <!-- El texto describe la promo; estas dos salidas dicen DÓNDE cae. El mapa
                       entra con el banco y el tipo ya preseleccionados; la guía es la lista
                       completa por rubro, con el texto de cada tramo de descuento. -->
                  <span v-if="mapaDescuentos(p.id)" class="d-block mt-1">
                    <NuxtLink :to="mapaDescuentos(p.id)" class="rank-map-link">
                      <VIcon size="14" class="mr-1">mdi-map-marker-radius-outline</VIcon>
                      Ver en el mapa
                    </NuxtLink>
                    <span class="mx-2 text-disabled">·</span>
                    <NuxtLink :to="guiaDescuentos(p.id)" class="rank-map-link">
                      <VIcon size="14" class="mr-1">mdi-tag-multiple-outline</VIcon>
                      Todos los comercios con descuento {{ mapaDescuentosLabel(p.id) }}
                    </NuxtLink>
                  </span>
                </dd>
              </div>
              <div>
                <dt>Costo</dt>
                <dd>{{ p.feeNote }}</dd>
              </div>
              <div v-if="p.note">
                <dt>Nota</dt>
                <dd>{{ p.note }}</dd>
              </div>
            </dl>

            <VRow class="mt-1">
              <VCol cols="12" sm="6">
                <p class="rank-plabel rank-plabel-pro">A favor</p>
                <ul class="rank-list rank-pro">
                  <li v-for="(x, i) in p.pros" :key="i">{{ x }}</li>
                </ul>
              </VCol>
              <VCol cols="12" sm="6">
                <p class="rank-plabel rank-plabel-con">En contra</p>
                <ul class="rank-list rank-con">
                  <li v-for="(x, i) in p.cons" :key="i">{{ x }}</li>
                </ul>
              </VCol>
            </VRow>
            <p class="text-caption text-grey-lighten-1 mb-0 mt-2">
              <VIcon size="13">mdi-account-check-outline</VIcon>
              Ideal para: {{ p.bestFor }}
            </p>

            <!-- What Uruguayans say about this issuer on Reddit (daily snapshot) -->
            <RedditEntityBlock
              :entity-id="PROGRAM_REDDIT_ENTITY[p.id]"
              note="Comentarios reales de uruguayos sobre el emisor, no editados. Reddit se queja más de lo que elogia: es una señal, no el veredicto — no toca el puntaje de arriba."
            />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </div>

    <!-- Where this ranking got used as evidence, and what we answered -->
    <PressMentions page="/tarjetas-de-credito-uruguay" class="mt-8" />

    <!-- The other half of the saving: knowing where today's discount is -->
    <DiscountFinders context="credito" />

    <!-- What Reddit says about these issuers -->
    <RedditSentimentSection :ids="PROGRAM_REDDIT_IDS" class="mt-8">
      <template #intro>
        El ranking de arriba mide el programa de puntos con una rúbrica fija. Esto es otra cosa: lo
        que dicen los uruguayos en Reddit sobre <strong>los emisores</strong>. Un programa puede
        acumular muy bien y aun así tener una app o una atención que la gente sufre —conviene leer
        las dos cosas antes de pedir una tarjeta.
      </template>
    </RedditSentimentSection>

    <!-- Transversal benefits -->
    <VCard variant="flat" class="tarjetas-section mt-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 tarjetas-section-title">
        <VIcon start size="small" color="primary">mdi-shield-star-outline</VIcon>
        Beneficios que no dependen de la tarjeta
      </h2>
      <p class="text-body-2 mb-3">
        Además del programa de cada emisor, hay beneficios que vienen por la <strong>red</strong>:
        <strong>Visa Uruguay</strong> y <strong>Mastercard Uruguay</strong> ofrecen promociones,
        cuotas sin recargo y seguros de compra/viaje según el nivel de la tarjeta (Gold, Platinum,
        Black/Signature). No son un programa de puntos propio, pero suman valor real y aplican sobre
        cualquier tarjeta de esa red.
      </p>
      <p class="text-body-2 mb-0">
        Para viajeros, varios bancos (BROU, Santander, Scotiabank) permiten
        <strong>transferir o acreditar millas a Smiles</strong>, e Itaú tiene su línea
        <strong>LATAM Pass</strong>. Las millas rinden más canjeándolas en pasajes que en catálogo,
        pero su valor es variable: conviene comparar contra el ~1% líquido de un programa que
        devuelve "puntos = dinero".
      </p>
    </VCard>

    <!-- Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-alert-outline"
    >
      Comparación <strong>informativa</strong>, no asesoramiento financiero; no tenemos afiliación
      con los emisores. Las tasas de acumulación, valores de canje, descuentos y costos
      <strong>cambian seguido</strong> y varían por categoría de tarjeta y campaña vigente. Los
      puntajes reflejan nuestro mejor criterio con la información pública disponible al
      {{ CARD_REWARDS_LAST_REVIEWED }}; verificá siempre la letra chica actual en el sitio del
      emisor antes de decidir.
    </VAlert>

    <!-- Dated macro facts that cut across every card, so no single ficha owns them -->
    <VCard variant="flat" class="tarjetas-section mt-4 pa-5 pa-sm-6">
      <h2 class="text-subtitle-1 font-weight-bold mb-3 tarjetas-section-title">
        <VIcon start size="small" color="primary">mdi-calendar-alert</VIcon>
        Dos beneficios que no dependen del emisor (y uno cambia el 1º de octubre)
      </h2>
      <p class="text-body-2 mb-3">
        Buena parte de lo que se publicita como "beneficio de la tarjeta" en realidad lo da la ley y
        lo tenés con cualquier medio de pago electrónico:
      </p>
      <ul class="tarjetas-macro">
        <li>
          <strong>2 puntos menos de IVA</strong> pagando con débito, dinero electrónico o
          instrumentos análogos (Ley 19.210). No aplica a tarjeta de crédito. En comercios de IVA
          mínimo o Monotributo el beneficio se expresa como 1,64% o 1,82% del monto.
        </li>
        <li>
          <strong>9 puntos menos de IVA en gastronomía</strong> pagando con tarjeta o dinero
          electrónico (Ley 17.934) —hoy vigentes por el Decreto 83/026—, pero
          <strong>desde el 1º de octubre de 2026 la reducción baja a 5 puntos</strong> (4,1% de
          descuento para contribuyentes de IVA Mínimo, según DGI). Cualquier tarjeta que hoy
          promocione "9% de IVA en restaurantes" queda desactualizada esa semana.
        </li>
        <li>
          <strong>Devolución de IMESI en combustible</strong>: no es un beneficio de emisor sino un
          régimen fiscal de frontera. Desde el 1/7/2026 es 22% en pasos con Argentina y 34% en pasos
          con Brasil, dentro de los 20 km; la mitad entre 20 y 60 km. Tope de 600 UI por persona y
          por mes, pagando de forma presencial con débito, crédito o dinero electrónico emitido en
          Uruguay.
        </li>
      </ul>
    </VCard>

    <!-- Sources -->
    <VCard variant="flat" class="tarjetas-section mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes
      </h2>
      <ul class="tarjetas-sources">
        <li v-for="(s, i) in sources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </VCard>

    <!-- Cross-links -->
    <VRow class="my-6">
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/descuentos-con-tarjeta-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-map-marker-radius-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Mapa de descuentos por banco</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Elegí las tarjetas que ya tenés y mirá qué comercios cerca tuyo tienen descuento hoy.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/pagar-cuentas-con-tarjeta')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-credit-card-check-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Pagar cuentas con tarjeta</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            ¿Suma puntos pagar UTE o la patente por Totalnet? Guía + calculadora de conveniencia.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/salud-financiera')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Salud financiera</h3>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Los puntos son un extra: primero ordená tu presupuesto y tus deudas.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import {
  CARD_REWARDS_LAST_REVIEWED,
  rankedPrograms,
  REWARD_RUBRIC,
  ISSUER_TYPE_LABELS,
  NETWORK_LABELS,
  PROGRAM_REDDIT_ENTITY,
  PROGRAM_REDDIT_IDS,
  medalFor,
  type IssuerType,
} from '~/utils/cardRewards'
import { BANKOS_BANK_BY_CREDIT_PROGRAM, bankosBankName, bankosMapPath } from '~/utils/bankos'
import { bankPageForBankId } from '~/utils/bankosPages'

const localePath = useLocalePath()

/**
 * Link al mapa de descuentos con las tarjetas de crédito de ese emisor ya elegidas.
 *
 * Vacío cuando Bankos no cubre al emisor (Pronto!, Creditel, Passcard, Cabal, Líder, BTG y el
 * programa de Puntos de Tienda Inglesa, que no es una tarjeta bancaria): mejor sin link que
 * mandando a un mapa vacío.
 */
function mapaDescuentos(programId: string): string {
  const bankId = BANKOS_BANK_BY_CREDIT_PROGRAM[programId]
  return bankId ? localePath(bankosMapPath(bankId, 'credit')) : ''
}
function mapaDescuentosLabel(programId: string): string {
  const bankId = BANKOS_BANK_BY_CREDIT_PROGRAM[programId]
  return bankId ? `de ${bankosBankName(bankId)}` : ''
}

/** La guía de descuentos de ese emisor: la lista completa por rubro, indexable. */
function guiaDescuentos(programId: string): string {
  const bankId = BANKOS_BANK_BY_CREDIT_PROGRAM[programId]
  const bankPage = bankId ? bankPageForBankId(bankId) : undefined
  return bankPage ? localePath(`/descuentos-con-tarjeta-uruguay/${bankPage.slug}`) : ''
}

const rubric = REWARD_RUBRIC
const ranked = rankedPrograms()
const tierItems = ranked.map(program => ({
  id: program.id,
  name: program.name,
  score: program.overall,
  href: `#programa-${program.id}`,
  brandId: PROGRAM_REDDIT_ENTITY[program.id],
}))

const selectedType = ref<IssuerType | 'all'>('all')
const issuerTypes = computed(() => {
  const present = new Set(ranked.map(p => p.issuerType))
  return (Object.keys(ISSUER_TYPE_LABELS) as IssuerType[]).filter(t => present.has(t))
})
const visible = computed(() =>
  selectedType.value === 'all' ? ranked : ranked.filter(p => p.issuerType === selectedType.value)
)

/** Green → amber → red gradient by score. */
function scoreColor(score: number): string {
  if (score >= 78) return '#16a34a'
  if (score >= 65) return '#65a30d'
  if (score >= 52) return '#d97706'
  if (score >= 40) return '#ea580c'
  return '#dc2626'
}
function rankTone(rank: number): string {
  return rank === 1
    ? 'tone-gold'
    : rank === 2
      ? 'tone-silver'
      : rank === 3
        ? 'tone-bronze'
        : 'tone-plain'
}

const sources = [
  {
    label: 'Itaú — Programa Volar (millas)',
    url: 'https://www.itau.com.uy/inst/millasItauVolar.html',
  },
  { label: 'Santander — Soy Santander Puntos', url: 'https://www.santander.com.uy/' },
  {
    label: 'BBVA Uruguay — Puntos BBVA',
    url: 'https://www.bbva.com.uy/personas/productos/tarjetas.html',
  },
  {
    label: 'Scotiabank — Scotia Puntos',
    url: 'https://www.scotiabank.com.uy/Personas/Tarjetas/Programas-de-premios',
  },
  {
    label: 'Scotiabank — Club Card Tienda Inglesa',
    url: 'https://www.scotiabank.com.uy/Personas/Tarjetas/Programas-de-premios/club-card',
  },
  { label: 'BROU — Tarjeta Recompensa', url: 'https://www.brou.com.uy/' },
  {
    label: 'OCA — Programa Metraje (Bases y Condiciones)',
    url: 'https://metraje.oca.com.uy/files/terminos_y_condicionesB.pdf',
  },
  {
    label: 'Pronto! — Términos y condiciones de tarjeta (tarifario, vigencia agosto 2026)',
    url: 'https://www.pronto.com.uy/terminos-y-condiciones-de-tarjeta/',
  },
  {
    label: 'PassCard — Bases y condiciones de la Tienda Passcard',
    url: 'https://www.passcard.com.uy/descargar/Bases%20y%20condiciones%20Tienda%20Passcard',
  },
  {
    label: 'Tienda Inglesa — Bases del Programa Puntos (vigentes desde el 1/1/2026)',
    url: 'https://www.tiendainglesa.com.uy/supermercado/landing/bases-y-condiciones-programa-puntos/349',
  },
  {
    label: 'Scotiabank — Cartilla Tarjetas de Crédito Personas Físicas (F.2540, 20/03/2026)',
    url: 'https://www.scotiabank.com.uy/Personas/ScotiaPuntos/home',
  },
  {
    label: 'BROU — Costos y exoneraciones de tarjetas de crédito',
    url: 'https://www.brou.com.uy/personas/tarjetas/costos-y-exoneraciones-visa-y-master/credito',
  },
  {
    label: 'Itaú — Tarifario oficial (versión 1 de agosto de 2026)',
    url: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
  },
  {
    label: 'ANDA — Programa de puntos Dale',
    url: 'https://anda.com.uy/programa-de-puntos-dale/',
  },
  {
    label: 'OCA — Preguntas frecuentes del Metraje (tabla de canje)',
    url: 'https://metraje.oca.com.uy/site/view-preguntas-frecuentes',
  },
  {
    label: 'BTG Pactual — Tarifas y cartillas (cartilla de tarjetas, julio 2026)',
    url: 'https://www.btgpactual.uy/tarifas-y-cartillas',
  },
  {
    label: 'INE — Valor de la Unidad Indexada (agosto 2026)',
    url: 'https://www5.ine.gub.uy/web/guest/unidad-indexada',
  },
  {
    label: 'DGI — Reducción de 9 puntos de IVA en gastronomía (baja a 5 el 1/10/2026)',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/reduccion-9-puntos-iva-determinados-servicios-siempre-sean-abonados',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/tarjetas-de-credito-uruguay'
const title = 'Ranking de tarjetas de crédito en Uruguay'
const description =
  'Comparación y ranking objetivo de los programas de puntos y beneficios de las tarjetas de crédito uruguayas (Itaú Volar, Santander, BBVA, Scotia Puntos, BROU Recompensa, OCA Metraje, Pronto, PassCard, Creditel y más), con una rúbrica transparente y ponderada.'

defineOgImageComponent('Cambio', {
  title: 'Ranking de tarjetas de crédito',
  subtitle: 'Puntos y beneficios comparados en Uruguay',
  tag: 'RANKING',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
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
        'mejores tarjetas de credito uruguay, puntos tarjeta credito uruguay, itau volar, scotia puntos, brou recompensa, puntos bbva, oca metraje, ranking tarjetas uruguay, beneficios tarjetas uruguay',
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
                name: 'Tarjetas de crédito en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Ranking de tarjetas de crédito en Uruguay por puntos y beneficios',
            itemListElement: ranked.map(p => ({
              '@type': 'ListItem',
              position: p.rank,
              name: `${p.name} (${p.issuer})`,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.bg-gradient-tarjetas {
  background: linear-gradient(135deg, #b45309 0%, #7c3aed 100%);
}

.tarjetas-page {
  overflow-x: hidden;
}
.tarjetas-intro {
  max-width: 800px;
  line-height: 1.6;
}

.tarjetas-section-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

.tarjetas-macro {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.6;
}
.tarjetas-macro li {
  margin-bottom: 10px;
}
.tarjetas-macro li:last-child {
  margin-bottom: 0;
}

.method-panels {
  border-radius: 12px;
}
.method-dim:last-child p {
  margin-bottom: 0;
}

/* Podium */
.podium {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 720px) {
  .podium {
    grid-template-columns: repeat(3, 1fr);
    align-items: end;
  }
  .podium-1 {
    order: 2;
    transform: translateY(-12px);
  }
  .podium-2 {
    order: 1;
  }
  .podium-3 {
    order: 3;
  }
}
.podium-card {
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
}
.v-theme--light .podium-card {
  background: rgba(0, 0, 0, 0.02);
}
.podium-1 {
  border-color: rgba(245, 158, 11, 0.55);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.14), rgba(245, 158, 11, 0.03));
}
.podium-2 {
  border-color: rgba(148, 163, 184, 0.5);
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.12), rgba(148, 163, 184, 0.02));
}
.podium-3 {
  border-color: rgba(180, 83, 9, 0.45);
  background: linear-gradient(180deg, rgba(180, 83, 9, 0.12), rgba(180, 83, 9, 0.02));
}
.podium-medal {
  font-size: 2rem;
  line-height: 1;
}
.podium-score {
  font-size: 2.6rem;
  font-weight: 800;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.podium-name {
  line-height: 1.3;
  min-height: 2.6em;
}
.podium-bestfor {
  font-size: 0.82rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.72);
}
.v-theme--light .podium-bestfor {
  color: rgba(0, 0, 0, 0.7);
}

/* Rank card */
.rank-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
}
.v-theme--light .rank-card {
  background: rgba(0, 0, 0, 0.015);
  border-color: rgba(0, 0, 0, 0.08);
}
.rank-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-weight: 800;
  font-size: 1.1rem;
}
.rank-medal {
  font-size: 1.5rem;
}
.tone-gold {
  background: rgba(245, 158, 11, 0.18);
}
.tone-silver {
  background: rgba(148, 163, 184, 0.18);
}
.tone-bronze {
  background: rgba(180, 83, 9, 0.18);
}
.tone-plain {
  background: rgba(124, 58, 237, 0.14);
  color: rgb(var(--v-theme-primary));
}
.rank-overall-num {
  font-size: 1.9rem;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.score-bars {
  display: grid;
  gap: 6px;
}
.score-row {
  display: grid;
  grid-template-columns: 120px 1fr 28px;
  align-items: center;
  gap: 10px;
}
@media (max-width: 599px) {
  .score-row {
    grid-template-columns: 96px 1fr 24px;
    gap: 8px;
  }
}
.score-dim {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  text-align: right;
}
.v-theme--light .score-dim {
  color: rgba(0, 0, 0, 0.65);
}
.score-track {
  height: 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.v-theme--light .score-track {
  background: rgba(0, 0, 0, 0.08);
}
.score-fill {
  height: 100%;
  border-radius: 8px;
  transition: width 0.4s ease;
}
.score-val {
  font-size: 0.78rem;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.85);
}
.v-theme--light .score-val {
  color: rgba(0, 0, 0, 0.75);
}

.rank-details :deep(.v-expansion-panel) {
  background: transparent;
}
.rank-details-title {
  min-height: 44px;
  color: rgb(var(--v-theme-link));
}

.rank-rationale {
  background: rgba(124, 58, 237, 0.08);
  border-left: 3px solid rgba(124, 58, 237, 0.5);
  border-radius: 8px;
  padding: 10px 12px;
  line-height: 1.55;
}

.rank-facts {
  margin: 0;
}
.rank-facts > div {
  padding: 7px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.v-theme--light .rank-facts > div {
  border-bottom-color: rgba(0, 0, 0, 0.06);
}
.rank-facts dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2px;
}
.v-theme--light .rank-facts dt {
  color: rgba(0, 0, 0, 0.5);
}
.rank-facts dd {
  margin: 0;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .rank-facts dd {
  color: rgba(0, 0, 0, 0.78);
}
/* El link al mapa vive dentro del <dd>, que baja el contraste del texto: se pinta con el token
   de link (no con `primary`, que en oscuro queda en 4:1 sobre la tarjeta y no llega a AA). */
.rank-map-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.rank-map-link:hover,
.rank-map-link:focus-visible {
  text-decoration: underline;
}

.rank-plabel {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 700;
  margin-bottom: 6px;
}
.rank-plabel-pro {
  color: #16a34a;
}
.rank-plabel-con {
  color: #ef4444;
}
.rank-list {
  margin: 0;
  padding-left: 1.1rem;
}
.rank-list li {
  font-size: 0.875rem;
  line-height: 1.45;
  margin-bottom: 0.4rem;
}
.rank-pro li::marker {
  color: #16a34a;
}
.rank-con li::marker {
  color: #ef4444;
}

.tarjetas-section,
.cross-link {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.v-theme--light .tarjetas-section,
.v-theme--light .cross-link {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
.cross-link {
  text-decoration: none;
  transition: transform 0.2s ease;
}
.cross-link:hover {
  transform: translateY(-2px);
}

.tarjetas-sources {
  margin: 0;
  padding-left: 1.1rem;
}
.tarjetas-sources li {
  margin-bottom: 0.4rem;
  font-size: 0.88rem;
  line-height: 1.5;
}
.tarjetas-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.tarjetas-sources a:hover {
  text-decoration: underline;
}
</style>
