<template>
  <div class="debit-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/mejores-bancos-uruguay')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Mejores bancos
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5 hero-card on-dark" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Comprar en dólares · Julio 2026</p>
        <h1 class="hero-title">
          Tarjetas de débito y prepagas para comprar en dólares
          <span class="hero-title-accent">(y por qué un ítem de USD 49,99 te sale más)</span>
        </h1>
        <p class="hero-lead">
          Pagaste un ítem de juego de <strong>USD 49,99</strong> y te descontaron
          <strong>~$2.168</strong>. No es un solo cobro: son
          <strong>dos costos que se apilan</strong> —la comisión por compra en el exterior y el
          margen al pasar tus pesos a dólares—. Acá los separamos, te dejamos una calculadora y
          rankeamos {{ ranked.length }} tarjetas de débito, prepagas y fintech según cuánto te
          cuesta comprar afuera.
        </p>
        <div class="hero-meta">
          <span class="hero-spoiler">
            <VIcon size="16" class="mr-2">mdi-information-outline</VIcon>
            <span>Datos con fuente donde existe; las estimaciones van rotuladas.</span>
          </span>
        </div>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons
            text="Cuánto te cobran de verdad al comprar en dólares con Prex, OCA y otras"
          />
        </div>
      </div>
    </VCard>

    <!-- Calculator -->
    <VCard id="calculadora" variant="flat" class="calc-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-1">
        <VIcon size="20" color="primary">mdi-calculator-variant-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">¿Cuánto me sale de verdad?</h2>
      </div>
      <p class="text-caption text-medium-emphasis mb-4">
        Elegí una tarjeta y el monto en dólares. Te mostramos el desglose real: comisión, cargo
        fijo, IVA y —si lo activás— el spread de cambio frente al dólar mayorista.
      </p>

      <VRow dense>
        <VCol cols="12" sm="6" md="4">
          <VSelect
            v-model="selectedId"
            :items="cardSelectItems"
            label="Tarjeta"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3" md="3">
          <VTextField
            v-model.number="montoUsd"
            type="number"
            min="0"
            step="0.01"
            label="Monto (USD)"
            prefix="US$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3" md="3">
          <VTextField
            v-model.number="fxVenta"
            type="number"
            min="0"
            step="0.1"
            label="Dólar del emisor"
            suffix="$/US$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="2" class="d-flex align-center">
          <VBtn variant="tonal" size="small" block @click="loadPrexCase">
            <VIcon start size="small">mdi-history</VIcon>Caso Prex
          </VBtn>
        </VCol>
      </VRow>

      <div class="d-flex flex-wrap align-center ga-3 mt-3">
        <VSwitch
          v-model="includeSpread"
          color="primary"
          density="compact"
          hide-details
          label="Incluir spread de cambio (comparar con el dólar mayorista)"
        />
        <VTextField
          v-if="includeSpread"
          v-model.number="fxMid"
          type="number"
          min="0"
          step="0.1"
          label="Dólar mayorista / BCU"
          suffix="$/US$"
          density="compact"
          variant="outlined"
          hide-details
          style="max-width: 220px"
        />
      </div>

      <!-- Result -->
      <div v-if="selectedCard" class="calc-result mt-4">
        <div v-if="selectedCard.comisionExteriorPct === null" class="calc-warn mb-3">
          <VIcon size="16" class="mr-1">mdi-alert-outline</VIcon>
          No hay una comisión oficial publicada para {{ selectedCard.name }}; el desglose asume
          comisión 0 y sólo refleja el cambio. Ver la nota de la tarjeta más abajo.
        </div>
        <table class="breakdown">
          <tbody>
            <tr>
              <td>Precio del ítem</td>
              <td class="num">US$ {{ fmtUsd(cost.purchaseUsd) }}</td>
            </tr>
            <tr>
              <td>
                Comisión exterior
                <span v-if="selectedCard.comisionExteriorPct !== null" class="muted">
                  ({{ fmtNum(selectedCard.comisionExteriorPct) }}%{{
                    selectedCard.cargoFijoUsd
                      ? ` + US$ ${fmtUsd(selectedCard.cargoFijoUsd)} fijo`
                      : ''
                  }})
                </span>
              </td>
              <td class="num">US$ {{ fmtUsd(cost.comisionUsd) }}</td>
            </tr>
            <tr v-if="selectedCard.ivaSobreComision">
              <td>IVA 22% sobre la comisión</td>
              <td class="num">US$ {{ fmtUsd(cost.ivaUsd) }}</td>
            </tr>
            <tr class="subtotal">
              <td>Subtotal en dólares</td>
              <td class="num">US$ {{ fmtUsd(cost.subtotalUsd) }}</td>
            </tr>
            <tr v-if="includeSpread && cost.spreadPesos !== null">
              <td>
                Spread de cambio
                <span class="muted"
                  >(venta {{ fmtNum(fxVenta) }} vs mayorista {{ fmtNum(fxMid) }})</span
                >
              </td>
              <td class="num">$ {{ fmtPesos(cost.spreadPesos) }}</td>
            </tr>
            <tr class="total">
              <td>Total que te descuentan</td>
              <td class="num">$ {{ fmtPesos(cost.totalPesos) }}</td>
            </tr>
          </tbody>
        </table>
        <div class="calc-headline mt-3">
          <div class="calc-pill">
            <span class="calc-pill-num">{{ fmtNum(cost.costoEfectivoPct) }}%</span>
            <span class="calc-pill-lbl">
              de sobreprecio {{ includeSpread ? '(comisión + spread)' : '(sólo comisión)' }}
            </span>
          </div>
          <p class="text-caption text-medium-emphasis mb-0">
            {{
              includeSpread
                ? 'Frente a comprar los mismos dólares al mayorista. Captura la comisión y el margen de cambio juntos.'
                : 'Frente al propio dólar del emisor. El margen de cambio queda "escondido" en el tipo de cambio: activá el spread para verlo.'
            }}
          </p>
        </div>
      </div>
      <p class="text-caption text-disabled mt-3 mb-0">
        Estimación educativa. El tipo de cambio del emisor y las comisiones cambian; verificá con tu
        tarjeta. No es asesoramiento financiero.
      </p>
    </VCard>

    <!-- Explainer: the two costs -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">¿Por qué una compra de USD 49,99 salió $2.168?</h2>
      <p class="text-body-2 mb-4">
        La cuenta que hiciste en el post está bien encaminada: no te cobraron “una” comisión del 6,8
        %, te cobraron <strong>dos cosas que se suman</strong>.
      </p>
      <div class="cost-grid">
        <div class="cost-box">
          <div class="cost-tag cost-tag--a">Costo 1</div>
          <h3 class="cost-title">Comisión por compra en el exterior</h3>
          <p class="text-body-2 mb-0">
            El emisor cobra un <strong>porcentaje</strong> sobre la compra internacional, a veces
            con un <strong>cargo fijo</strong> por transacción, y encima aplica
            <strong>IVA sobre esa comisión</strong>. En un ítem de USD 50 con la estructura típica
            de Prex (2,5 % + US$ 0,50 + IVA) son ~US$ 2,1 ≈ <strong>4,3 %</strong>. El cargo fijo
            pega fuerte en compras chicas: en un ítem de US$ 5 ese medio dólar solo ya es 10 %.
          </p>
        </div>
        <div class="cost-box">
          <div class="cost-tag cost-tag--b">Costo 2</div>
          <h3 class="cost-title">Pasar tus pesos a dólares</h3>
          <p class="text-body-2 mb-0">
            Como tu billetera estaba <strong>en pesos</strong> y el ítem se cobra en dólares, el
            emisor convierte a su <strong>tipo de cambio venta</strong>, que trae un
            <strong>margen (spread)</strong> sobre el dólar mayorista. Ese margen no aparece como
            línea aparte: viene <em>escondido</em> en el tipo de cambio. Sí:
            <strong>te cobran por pasar de pesos a dólares</strong>. Sumado a la comisión, el
            sobreprecio total termina cerca del <strong>6–7 %</strong> que sentiste.
          </p>
        </div>
      </div>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4" border="start">
        <strong>¿Se puede evitar el Costo 2?</strong> En parte. Si la tarjeta te deja
        <strong>mantener saldo en dólares</strong> y la cargás en USD, salteás la conversión (y su
        spread). Seguís pagando la comisión internacional, pero te ahorrás el margen de cambio. En
        el ranking marcamos cuáles permiten saldo en dólares.
      </VAlert>
    </VCard>

    <!-- Ranking methodology -->
    <VExpansionPanels variant="accordion" class="mb-5">
      <VExpansionPanel>
        <VExpansionPanelTitle>
          <VIcon start size="small" color="primary">mdi-scale-balance</VIcon>
          Cómo armamos el ranking (rúbrica transparente)
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="text-body-2 mb-3">
            Cada tarjeta se puntúa 0–100 en seis dimensiones y el puntaje final es un
            <strong>promedio ponderado calculado en código</strong> (no lo escribimos a mano). Pesa
            más lo que de verdad te cuesta al comprar afuera.
          </p>
          <div class="rubric-grid">
            <div v-for="dim in DEBIT_RUBRIC" :key="dim.id" class="rubric-item">
              <div class="rubric-head">
                <VIcon size="18" color="primary">{{ dim.icon }}</VIcon>
                <span class="rubric-label">{{ dim.label }}</span>
                <span class="rubric-weight">{{ dim.weight }}</span>
              </div>
              <p class="rubric-what">{{ dim.what }}</p>
            </div>
          </div>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Podium -->
    <section v-if="podium.length" class="mb-6" aria-label="Podio de tarjetas">
      <h2 class="text-h6 font-weight-bold mb-3">El podio para comprar en dólares</h2>
      <VRow dense>
        <VCol v-for="r in podium" :key="r.id" cols="12" sm="4">
          <VCard variant="tonal" class="podium-card h-100 pa-4" :class="`podium--${r.rank}`">
            <div class="d-flex align-center ga-2 mb-2">
              <span class="podium-medal">{{ medalFor(r.rank) }}</span>
              <div>
                <div class="font-weight-bold">{{ r.name }}</div>
                <div class="text-caption text-medium-emphasis">{{ KIND_LABELS[r.kind] }}</div>
              </div>
              <VSpacer />
              <span class="podium-score">{{ r.overall }}</span>
            </div>
            <p class="text-body-2 mb-0">{{ r.bestFor }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Kind filter -->
    <div class="d-flex flex-wrap align-center ga-2 mb-3">
      <span class="text-caption text-medium-emphasis mr-1">Mostrar:</span>
      <button
        v-for="opt in kindOptions"
        :key="opt.value"
        type="button"
        class="kind-chip"
        :class="{ 'kind-chip--on': kindFilter === opt.value }"
        @click="kindFilter = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- Full ranking -->
    <section class="mb-8" aria-label="Ranking de tarjetas">
      <VCard v-for="r in visibleRanked" :key="r.id" variant="outlined" class="rank-card mb-3 pa-4">
        <div class="d-flex align-start ga-3">
          <div class="rank-badge">
            <span v-if="medalFor(r.rank)">{{ medalFor(r.rank) }}</span>
            <span v-else>#{{ r.rank }}</span>
          </div>
          <div class="flex-grow-1 rank-body">
            <div class="d-flex flex-wrap align-center ga-2">
              <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ r.name }}</h3>
              <VChip size="x-small" variant="tonal">{{ KIND_LABELS[r.kind] }}</VChip>
              <VChip
                v-if="r.fundeaEnUsd"
                size="x-small"
                color="success"
                variant="tonal"
                prepend-icon="mdi-cash-multiple"
              >
                Saldo en USD
              </VChip>
              <VChip
                v-if="r.estimate"
                size="x-small"
                color="warning"
                variant="tonal"
                prepend-icon="mdi-alert-outline"
              >
                Cifra estimada
              </VChip>
              <VChip
                v-else-if="r.verified"
                size="x-small"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-check-decagram"
              >
                Verificado
              </VChip>
              <VSpacer />
              <div class="rank-score">
                <span class="rank-score-num">{{ r.overall }}</span
                ><span class="rank-score-den">/100</span>
              </div>
            </div>

            <p class="text-body-2 mt-2 mb-2">{{ r.verdict }}</p>

            <div class="fee-line">
              <VIcon size="15" color="primary">mdi-percent-outline</VIcon>
              <span>{{ r.feeNote }}</span>
            </div>
            <div class="fee-line">
              <VIcon size="15" color="primary">mdi-swap-horizontal</VIcon>
              <span>{{ r.fxSpreadNote }}</span>
            </div>

            <div v-if="r.signals.length" class="d-flex flex-wrap ga-2 mt-2">
              <VChip
                v-for="(s, i) in r.signals"
                :key="i"
                size="small"
                variant="tonal"
                label
                :color="signalColor(s.tone)"
                class="signal-chip"
              >
                <strong class="mr-1">{{ s.label }}:</strong> {{ s.value }}
              </VChip>
            </div>

            <VRow class="mt-1" dense>
              <VCol cols="12" sm="6">
                <ul class="pros">
                  <li v-for="(p, i) in r.pros" :key="i">
                    <VIcon size="14" color="success">mdi-check</VIcon>{{ p }}
                  </li>
                </ul>
              </VCol>
              <VCol cols="12" sm="6">
                <ul class="cons">
                  <li v-for="(c, i) in r.cons" :key="i">
                    <VIcon size="14" color="error">mdi-close</VIcon>{{ c }}
                  </li>
                </ul>
              </VCol>
            </VRow>

            <div v-if="r.sources.length" class="mt-1">
              <a
                v-for="(s, i) in r.sources"
                :key="i"
                :href="s.url"
                target="_blank"
                rel="noopener noreferrer"
                class="src-link"
              >
                <VIcon size="12">mdi-open-in-new</VIcon>{{ s.publisher }}
              </a>
            </div>

            <!-- What Uruguayans say about this issuer on Reddit (daily snapshot) -->
            <RedditEntityBlock
              :entity-id="DEBIT_REDDIT_ENTITY[r.id]"
              note="Comentarios reales de uruguayos sobre el emisor, no editados. Reddit se queja más de lo que elogia: es una señal, no el veredicto — no toca el puntaje de arriba."
            />
          </div>
        </div>
      </VCard>
    </section>

    <!-- What Reddit says about these issuers -->
    <RedditSentimentSection :ids="DEBIT_REDDIT_IDS" class="mb-8">
      <template #intro>
        Los puntajes de arriba son nuestro criterio. Esto es el contrapeso: lo que dicen los
        uruguayos en Reddit sobre <strong>los emisores</strong> de estas tarjetas. Ojo con la
        diferencia: Reddit opina del emisor (la app, la atención, los problemas), no de la comisión
        de una tarjeta puntual —para eso están los números y las fuentes de arriba.
      </template>
    </RedditSentimentSection>

    <!-- Head-to-head -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-1">Comparativa: un ítem de USD 50, lado a lado</h2>
      <p class="text-caption text-medium-emphasis mb-3">
        Costo estimado de comprar un ítem de <strong>US$ 50</strong> pagando con saldo en pesos,
        convertido a <strong>${{ fmtNum(tableFxVenta) }}/US$</strong> (venta) frente a un mayorista
        de <strong>${{ fmtNum(tableFxMid) }}</strong
        >. Ordenado del más barato al más caro.
      </p>
      <div class="table-scroll">
        <table class="h2h cu-mobile-cards">
          <thead>
            <tr>
              <th>Tarjeta</th>
              <th class="num">Comisión</th>
              <th class="num">Total (pesos)</th>
              <th class="num">Sobreprecio</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in h2hRows" :key="row.id">
              <td data-label="Tarjeta">
                {{ row.name }}
                <span v-if="row.estimate" class="muted">· est.</span>
                <span v-if="row.noOfficial" class="muted">· sin comisión oficial</span>
              </td>
              <td class="num" data-label="Comisión">
                <template v-if="row.noOfficial">—</template>
                <template v-else>US$ {{ fmtUsd(row.comisionUsd) }}</template>
              </td>
              <td class="num" data-label="Total (pesos)">$ {{ fmtPesos(row.totalPesos) }}</td>
              <td class="num" data-label="Sobreprecio">{{ fmtNum(row.pct) }}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="text-caption text-disabled mt-2 mb-0">
        Sobreprecio = cuánto pagás de más frente a comprar esos US$ 50 al mayorista (incluye
        comisión + spread). Los tipos de cambio son un supuesto común para comparar; en la práctica
        cada emisor usa el suyo.
      </p>
    </VCard>

    <!-- Tips -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">Cómo pagar menos al comprar en dólares</h2>
      <ul class="tips">
        <li v-for="(t, i) in tips" :key="i">
          <VIcon size="18" color="primary" class="mr-2">{{ t.icon }}</VIcon>
          <span
            ><strong>{{ t.title }}.</strong> {{ t.body }}</span
          >
        </li>
      </ul>
    </VCard>

    <!-- FAQ -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-h6 font-weight-bold mb-3">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="(f, i) in faqs" :key="i">
          <VExpansionPanelTitle>{{ f.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <p class="text-body-2 mb-0" v-html="f.a" />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCard>

    <!-- Related -->
    <VCard variant="flat" class="pa-4 pa-sm-5 mb-5">
      <h2 class="text-subtitle-1 font-weight-bold mb-3">Seguí leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/mejores-bancos-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-bank-outline</VIcon>Mejores bancos (tier list)
        </VBtn>
        <VBtn :to="localePath('/tarjetas-de-credito-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-credit-card-multiple-outline</VIcon>Tarjetas de crédito
        </VBtn>
        <VBtn :to="localePath('/herramientas/calculadora-spread')" variant="tonal" size="small">
          <VIcon start size="small">mdi-calculator</VIcon>Calculadora de spread
        </VBtn>
        <VBtn :to="localePath('/casas-de-cambio')" variant="tonal" size="small">
          <VIcon start size="small">mdi-cash-multiple</VIcon>Casas de cambio
        </VBtn>
        <VBtn :to="localePath('/apps-economia-uruguay')" variant="tonal" size="small">
          <VIcon start size="small">mdi-cellphone</VIcon>Apps de dinero
        </VBtn>
      </div>
    </VCard>

    <!-- Sources -->
    <VCard variant="flat" class="pa-4 pa-sm-5">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon size="18" color="primary">mdi-book-open-variant</VIcon>
        <h2 class="text-subtitle-1 font-weight-bold mb-0">Fuentes y referencias</h2>
      </div>
      <p class="text-caption text-medium-emphasis mb-3">
        Verificado por última vez: {{ DEBIT_CARDS_LAST_REVIEWED }}. Las comisiones y tipos de cambio
        cambian; confirmá siempre con tu emisor.
      </p>
      <ul class="sources">
        <li v-for="(s, i) in DEBIT_SOURCES" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span class="muted"> — {{ s.publisher }}</span>
        </li>
      </ul>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import {
  DEBIT_CARDS,
  DEBIT_CARDS_LAST_REVIEWED,
  DEBIT_REDDIT_ENTITY,
  DEBIT_REDDIT_IDS,
  DEBIT_RUBRIC,
  DEBIT_SOURCES,
  KIND_LABELS,
  PREX_CASE,
  estimateIntlCost,
  getDebitCard,
  medalFor,
  rankedCards,
  type CardKind,
} from '~/utils/debitCards'

const localePath = useLocalePath()

// ── Ranking ──
const ranked = rankedCards()
const podium = ranked.slice(0, 3)

type KindFilter = 'todas' | CardKind
const kindFilter = ref<KindFilter>('todas')
const kindOptions: { value: KindFilter; label: string }[] = [
  { value: 'todas', label: 'Todas' },
  { value: 'prepaga', label: 'Prepagas' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'banco', label: 'Débito bancario' },
]
const visibleRanked = computed(() =>
  kindFilter.value === 'todas' ? ranked : ranked.filter(r => r.kind === kindFilter.value)
)

// ── Calculator ──
const selectedId = ref<string>(getDebitCard('prex') ? 'prex' : (DEBIT_CARDS[0]?.id ?? ''))
const montoUsd = ref<number>(PREX_CASE.purchaseUsd)
const fxVenta = ref<number>(PREX_CASE.fxVenta)
const fxMid = ref<number>(PREX_CASE.fxMid)
const includeSpread = ref<boolean>(true)

const cardSelectItems = computed(() =>
  ranked.map(c => ({ title: `${c.name} · ${KIND_LABELS[c.kind]}`, value: c.id }))
)
const selectedCard = computed(() => getDebitCard(selectedId.value) ?? DEBIT_CARDS[0])

const cost = computed(() =>
  estimateIntlCost({
    purchaseUsd: montoUsd.value || 0,
    card: selectedCard.value ?? {
      comisionExteriorPct: 0,
      cargoFijoUsd: 0,
      ivaSobreComision: false,
    },
    fxVenta: fxVenta.value || 0,
    fxMid: includeSpread.value ? fxMid.value || 0 : undefined,
  })
)

function loadPrexCase() {
  if (getDebitCard('prex')) selectedId.value = 'prex'
  montoUsd.value = PREX_CASE.purchaseUsd
  fxVenta.value = PREX_CASE.fxVenta
  fxMid.value = PREX_CASE.fxMid
  includeSpread.value = true
}

// ── Head-to-head (fixed assumptions) ──
const tableFxVenta = 41.6
const tableFxMid = 40.5
const h2hRows = computed(() =>
  ranked
    .map(c => {
      const r = estimateIntlCost({
        purchaseUsd: 50,
        card: c,
        fxVenta: tableFxVenta,
        fxMid: tableFxMid,
      })
      return {
        id: c.id,
        name: c.name,
        estimate: c.estimate,
        noOfficial: c.comisionExteriorPct === null,
        comisionUsd: r.comisionUsd,
        totalPesos: r.totalPesos,
        pct: r.costoEfectivoPct,
      }
    })
    .sort((a, b) => a.totalPesos - b.totalPesos)
)

function signalColor(tone: 'pos' | 'neg' | 'neutral'): string | undefined {
  return tone === 'pos' ? 'success' : tone === 'neg' ? 'error' : undefined
}

// ── Static content ──
const tips = [
  {
    icon: 'mdi-cash-multiple',
    title: 'Fondeá en dólares si podés',
    body: 'Con una tarjeta que mantiene saldo en USD y cargándola en dólares, salteás la conversión pesos→dólar y su spread. Seguís pagando la comisión internacional, pero te ahorrás el margen de cambio.',
  },
  {
    icon: 'mdi-numeric-5-box-outline',
    title: 'Ojo con el cargo fijo en compras chicas',
    body: 'Un cargo fijo de US$ 0,50 es 1 % en un ítem de US$ 50, pero 10 % en uno de US$ 5. Para micro-compras conviene juntar y comprar una recarga más grande de una vez.',
  },
  {
    icon: 'mdi-storefront-outline',
    title: 'Elegí bien la moneda de la tienda',
    body: 'Steam, PlayStation o Google Play a veces te dejan pagar en pesos uruguayos o en dólares. Si la tienda ya te convierte a pesos, sumás su conversión a la de tu tarjeta: doble spread. Comparar conviene.',
  },
  {
    icon: 'mdi-shield-check-outline',
    title: 'Confirmá que funcione en la tienda',
    body: 'Algunas prepagas fallan en compras internacionales o piden 3-D Secure. Antes de una compra grande, probá con un monto chico y verificá que la tarjeta sea Visa/Mastercard aceptada por esa tienda.',
  },
  {
    icon: 'mdi-eye-outline',
    title: 'Mirá el tipo de cambio aplicado, no solo la comisión',
    body: 'La comisión aparece como línea; el spread de cambio no. Compará el tipo que te aplicaron contra el dólar del día: ahí está el costo “escondido”.',
  },
]

const faqs = [
  {
    q: '¿Es cierto que Prex me cobró casi 7 % por comprar un ítem de USD 49,99?',
    a: 'Sí, pero no es una sola comisión. Son dos costos: la <strong>comisión por compra en el exterior</strong> (con la estructura típica de 2,5 % + US$ 0,50 fijo + IVA, ~4,3 % en un ítem de US$ 50) más el <strong>spread</strong> al pasar tus pesos a dólares (~1–3 % sobre el mayorista). Juntos dan ese ~6–7 % que notaste. La calculadora de arriba lo reconstruye.',
  },
  {
    q: '¿Me cobraron por pasar de pesos a dólares?',
    a: 'Sí. Como tu billetera estaba en pesos y el ítem se cobra en dólares, el emisor convirtió a su <strong>tipo de cambio venta</strong>, que incluye un margen sobre el dólar mayorista. Ese margen no figura como línea aparte: viene dentro del tipo de cambio. Si podés cargar la tarjeta directamente en dólares, evitás ese tramo.',
  },
  {
    q: '¿Cómo le va a OCA y otras frente a Prex?',
    a: 'Depende de la comisión internacional y de si te dejan tener saldo en dólares. En el ranking y en la comparativa “un ítem de USD 50” de arriba están lado a lado, con la fuente de cada comisión (o el rótulo de estimación cuando el emisor no publica el número).',
  },
  {
    q: '¿Hay algún impuesto uruguayo tipo “impuesto al dólar” argentino?',
    a: 'No como en Argentina. En Uruguay el costo de una compra internacional con tarjeta es la <strong>comisión del emisor + IVA sobre esa comisión</strong> y el <strong>spread de cambio</strong>. No hay un impuesto-país que recargue el dólar tarjeta.',
  },
  {
    q: '¿Conviene tarjeta de débito bancaria o prepaga para comprar en dólares?',
    a: 'Para compras chicas en tiendas de juegos, muchas prepagas/fintech son más ágiles y algunas permiten saldo en dólares. El débito bancario sirve, pero suele cobrar comisión por compra en el exterior y convierte desde tu cuenta en pesos. La mejor opción es la que combine baja comisión y, si podés, saldo en USD.',
  },
  {
    q: '¿Cómo evito pagar de más?',
    a: 'Fondeá en dólares cuando la tarjeta lo permita, evitá tickets muy chicos si hay cargo fijo, elegí bien la moneda de la tienda para no pagar doble conversión, y compará el tipo de cambio que te aplican contra el dólar del día.',
  },
]

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/tarjetas-de-debito-uruguay'
const title =
  'Tarjetas de débito y prepagas para comprar en dólares (Uruguay 2026): comisiones reales'
const description =
  'Cuánto te cobran de verdad al comprar en dólares o ítems de juegos con Prex, OCA, MiDinero, AstroPay, Mercado Pago y débito de BROU, Itaú, Santander y más. Calculadora del caso real (USD 49,99 → ~$2.168), ranking con datos y las dos comisiones que se apilan: la del exterior y el spread al pasar pesos a dólares.'

defineOgImageComponent('Cambio', {
  title: 'Comprar en dólares en Uruguay',
  subtitle: 'Comisiones reales de débito, prepagas y fintech',
  tag: 'RANKING + CALCULADORA',
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
        'tarjetas de debito uruguay, comprar en dolares uruguay, prex comision, prex compra exterior, oca comision dolares, pagar juegos online uruguay, comprar en steam uruguay, comision compra internacional, tarjeta prepaga dolares, astropay comision, spread de cambio uruguay',
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
                name: 'Tarjetas de débito para comprar en dólares',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Tarjetas de débito, prepagas y fintech para comprar en dólares en Uruguay',
            itemListElement: ranked.map((r, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${r.name} — ${r.overall}/100`,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
            })),
          },
        ],
      }),
    },
  ],
}))

// ── Formatting ──
function fmtNum(n: number): string {
  return (Math.round(n * 100) / 100).toString().replace('.', ',')
}
function fmtUsd(n: number): string {
  return n.toFixed(2).replace('.', ',')
}
function fmtPesos(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
</script>

<style scoped>
.debit-page {
  overflow-x: hidden;
}

/* Hero */
.hero-card {
  border-radius: 18px;
}
.hero {
  position: relative;
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(5, 150, 105, 0.35), transparent 55%),
    radial-gradient(120% 160% at 0% 100%, rgba(37, 99, 235, 0.3), transparent 55%),
    linear-gradient(135deg, #0b3b2e 0%, #10233a 55%, #0b1f3a 100%);
}
.hero-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 700;
  color: #9ff2c9;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.5rem, 4.4vw, 2.5rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-title-accent {
  display: block;
  font-size: 0.6em;
  font-weight: 600;
  color: #cfe9ff;
  margin-top: 0.2rem;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 760px;
  line-height: 1.6;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-top: 12px;
}
.hero-spoiler {
  display: inline-flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.82rem;
}

/* Calculator */
.calc-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 16px;
}
.calc-warn {
  font-size: 0.85rem;
  color: rgb(var(--v-theme-warning));
  display: flex;
  align-items: flex-start;
}
.breakdown {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.breakdown td {
  padding: 7px 4px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
}
.breakdown td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.breakdown .muted,
.muted {
  color: rgba(var(--v-theme-on-surface), 0.55);
  font-weight: 400;
}
.breakdown tr.subtotal td {
  font-weight: 600;
}
.breakdown tr.total td {
  font-weight: 800;
  font-size: 1.02rem;
  border-bottom: none;
}
.calc-headline {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}
.calc-pill {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.12);
  min-width: 120px;
}
.calc-pill-num {
  font-size: 1.5rem;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
  line-height: 1;
}
.calc-pill-lbl {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.6);
  text-align: center;
}

/* Two-costs grid */
.cost-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
@media (max-width: 640px) {
  .cost-grid {
    grid-template-columns: 1fr;
  }
}
.cost-box {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  padding: 16px;
  position: relative;
}
.cost-tag {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 2px 8px;
  border-radius: 999px;
  margin-bottom: 8px;
}
.cost-tag--a {
  background: rgba(37, 99, 235, 0.14);
  color: #2563eb;
}
.cost-tag--b {
  background: rgba(5, 150, 105, 0.16);
  color: #059669;
}
.cost-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 6px;
}

/* Rubric */
.rubric-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
@media (max-width: 640px) {
  .rubric-grid {
    grid-template-columns: 1fr;
  }
}
.rubric-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.rubric-label {
  font-weight: 600;
  font-size: 0.9rem;
}
.rubric-weight {
  margin-left: auto;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
}
.rubric-what {
  font-size: 0.82rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 4px 0 0;
}

/* Podium */
.podium-medal {
  font-size: 1.6rem;
  line-height: 1;
}
.podium-score {
  font-size: 1.4rem;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
}
.podium--1 {
  outline: 2px solid rgba(255, 193, 7, 0.5);
}

/* Kind chips */
.kind-chip {
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.82rem;
  background: transparent;
  cursor: pointer;
  transition: all 0.15s;
}
.kind-chip--on {
  background: rgb(var(--v-theme-primary));
  color: white;
  border-color: rgb(var(--v-theme-primary));
}

/* Rank card */
/* Let the text column shrink inside the flex row so long notes/chips wrap
   instead of forcing horizontal overflow (flex items default to min-width:auto). */
.rank-body {
  min-width: 0;
}
.rank-badge {
  flex: 0 0 auto;
  min-width: 42px;
  height: 42px;
  border-radius: 10px;
  background: rgba(var(--v-theme-primary), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 1.1rem;
}
.rank-score {
  white-space: nowrap;
}
.rank-score-num {
  font-size: 1.3rem;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
}
.rank-score-den {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.55);
}
.fee-line {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.85rem;
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.85);
}
.fee-line > span {
  min-width: 0;
  overflow-wrap: anywhere;
}
.fee-line :deep(.v-icon) {
  flex: 0 0 auto;
  margin-top: 2px;
}
/* Signal chips: allow the label to wrap so a long value never overflows the card. */
.signal-chip {
  height: auto;
  min-height: 26px;
  max-width: 100%;
}
.signal-chip :deep(.v-chip__content) {
  white-space: normal;
  padding-block: 4px;
  line-height: 1.3;
}
.pros,
.cons {
  list-style: none;
  padding: 0;
  margin: 0;
}
.pros li,
.cons li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.84rem;
  margin-bottom: 3px;
}
.src-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 0.75rem;
  margin-right: 12px;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

/* Head-to-head table */
.table-scroll {
  overflow-x: auto;
}
.h2h {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.h2h th,
.h2h td {
  padding: 8px 10px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  text-align: left;
}
.h2h th.num,
.h2h td.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.h2h thead th {
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* Tips / sources */
.tips {
  list-style: none;
  padding: 0;
  margin: 0;
}
.tips li {
  display: flex;
  align-items: flex-start;
  margin-bottom: 12px;
  font-size: 0.92rem;
  line-height: 1.5;
}
.sources {
  padding-left: 1.1rem;
  margin: 0;
}
.sources li {
  font-size: 0.85rem;
  margin-bottom: 6px;
}
.sources a {
  color: rgb(var(--v-theme-primary));
}
</style>
