<template>
  <VContainer class="py-4 benefits-page">
    <h1 class="text-h5 text-sm-h4 mb-2">
      Apps y programas de beneficios en Uruguay: descuentos, puntos y clubes
    </h1>
    <p class="text-body-2 text-medium-emphasis mb-4 benefits-intro">
      Los descuentos de tu banco ya los tenés en
      <NuxtLink :to="localePath('/descuentos-con-tarjeta-uruguay')">el mapa</NuxtLink>. Esta página
      es la otra mitad: los programas del comercio —supermercado, farmacia, estación de servicio,
      diario, telco— que suman aunque pagues en efectivo. {{ BENEFIT_PROGRAMS.length }} programas
      uruguayos, con las reglas leídas de las bases oficiales y una pregunta que casi nadie
      contesta: <strong>cuánto te devuelven de verdad</strong>.
    </p>

    <div class="d-flex flex-wrap ga-2 mb-6">
      <VBtn color="primary" variant="flat" href="#retorno">
        <VIcon start>mdi-percent-outline</VIcon>Cuánto devuelve cada uno
      </VBtn>
      <VBtn variant="tonal" :to="localePath('/descuentos-con-tarjeta-uruguay')">
        <VIcon start>mdi-map-search-outline</VIcon>Mapa de descuentos con tarjeta
      </VBtn>
      <VBtn variant="text" :to="localePath('/apps-economia-uruguay')">
        <VIcon start>mdi-cellphone-cog</VIcon>Apps para manejar tu plata
      </VBtn>
    </div>

    <!-- The three findings that change a decision -->
    <VRow dense class="mb-6">
      <VCol v-for="finding in FINDINGS" :key="finding.title" cols="12" md="4">
        <VCard variant="tonal" class="h-100">
          <VCardItem class="pb-1">
            <h2 class="text-subtitle-1 font-weight-medium d-flex align-center ga-2">
              <VIcon size="small" color="primary">{{ finding.icon }}</VIcon>
              {{ finding.title }}
            </h2>
          </VCardItem>
          <VCardText class="text-body-2 pt-0">{{ finding.body }}</VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- The comparison table: what each program actually returns -->
    <section id="retorno" class="mb-8">
      <h2 class="text-h6 font-weight-medium mb-1">Cuánto devuelve cada programa</h2>
      <p class="text-body-2 text-medium-emphasis mb-3 benefits-intro">
        Para saber el retorno hacen falta dos datos: cuántos puntos deja cada peso y cuánto vale un
        punto. De {{ BENEFIT_PROGRAMS.length }} programas,
        <strong>{{ measurable.length }} publica las dos cosas</strong>. En el resto la casilla dice
        “no calculable”, y eso también es información: entrás sin poder comparar.
      </p>

      <VTable density="comfortable" class="cu-mobile-cards cu-roomy">
        <thead>
          <tr>
            <th>Programa</th>
            <th>Cómo se gana</th>
            <th>Valor del punto</th>
            <th class="text-end">Retorno</th>
            <th>Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in returnRows" :key="row.id">
            <td data-label="Programa">
              <a :href="`#${row.id}`" class="benefits-anchor">{{ row.name }}</a>
              <div class="text-caption text-medium-emphasis">{{ row.operator }}</div>
            </td>
            <td data-label="Cómo se gana">{{ row.earn }}</td>
            <td data-label="Valor del punto">{{ row.pointValue }}</td>
            <td data-label="Retorno" class="text-end">
              <strong v-if="row.returnPct !== undefined" class="text-success">
                {{ formatPct(row.returnPct) }}
              </strong>
              <span v-else class="text-medium-emphasis">No calculable</span>
            </td>
            <td data-label="Vencimiento">{{ row.expiry }}</td>
          </tr>
        </tbody>
      </VTable>

      <!-- Tiny calculator over the only measurable program(s) -->
      <VCard variant="outlined" class="mt-4">
        <VCardItem class="pb-1">
          <h3 class="text-subtitle-1 font-weight-medium d-flex align-center ga-2">
            <VIcon size="small">mdi-calculator-variant-outline</VIcon>
            ¿Cuánto es eso al año?
          </h3>
        </VCardItem>
        <VCardText>
          <VRow align="center" dense>
            <VCol cols="12" sm="5" md="4">
              <VTextField
                v-model.number="monthlySpend"
                type="number"
                min="0"
                step="500"
                density="comfortable"
                variant="outlined"
                hide-details
                label="Gasto por mes en esa cadena"
                prefix="$"
              />
            </VCol>
            <VCol cols="12" sm="7" md="8">
              <ul class="pl-4 mb-0">
                <li v-for="row in yearlyRows" :key="row.id" class="text-body-2 mb-1">
                  <strong>{{ row.name }}</strong> ({{ row.operator }}):
                  <strong class="text-success">{{ row.yearly }}</strong> al año, a
                  {{ formatPct(row.returnPct) }} del gasto.
                </li>
              </ul>
              <p class="text-caption text-medium-emphasis mb-0 mt-2">
                Cuenta directa sobre las bases publicadas, sin descuentos ni promociones puntuales.
                Los programas que no publican el valor del punto no entran acá porque su resultado
                sería una invención.
              </p>
            </VCol>
          </VRow>
        </VCardText>
      </VCard>
    </section>

    <!-- Program cards, grouped by category -->
    <section v-for="category in categories" :key="category" class="mb-8">
      <h2 class="text-h6 font-weight-medium mb-3 d-flex align-center ga-2">
        <VIcon size="small" color="primary">{{ BENEFIT_CATEGORY_ICONS[category] }}</VIcon>
        {{ BENEFIT_CATEGORIES[category] }}
      </h2>

      <VRow>
        <VCol
          v-for="program in programsByCategory(category)"
          :key="program.id"
          cols="12"
          :lg="programsByCategory(category).length > 1 ? 6 : 12"
        >
          <VCard :id="program.id" variant="outlined" class="h-100 d-flex flex-column">
            <VCardItem class="pb-1">
              <div class="d-flex align-start justify-space-between ga-2 flex-wrap">
                <div>
                  <h3 class="text-subtitle-1 font-weight-bold">{{ program.name }}</h3>
                  <p class="text-caption text-medium-emphasis mb-0">{{ program.operator }}</p>
                </div>
                <div class="d-flex flex-column align-end ga-1">
                  <VChip :color="costColor(program.cost.kind)" size="small" variant="flat">
                    {{ costLabel(program.cost) }}
                  </VChip>
                  <VChip v-if="program.verified" size="x-small" color="success" variant="tonal">
                    <VIcon start size="11">mdi-check-decagram-outline</VIcon>
                    Reglas verificadas
                  </VChip>
                  <VChip v-else size="x-small" color="warning" variant="tonal">
                    <VIcon start size="11">mdi-help-circle-outline</VIcon>
                    Reglas sin publicar
                  </VChip>
                </div>
              </div>
            </VCardItem>

            <VCardText class="pt-2 d-flex flex-column flex-grow-1">
              <p class="text-body-2 mb-3">{{ program.tagline }}</p>

              <div class="d-flex flex-wrap ga-1 mb-3">
                <VChip
                  v-for="channel in program.channels"
                  :key="channel"
                  size="x-small"
                  variant="outlined"
                >
                  <VIcon start size="12">{{ CHANNEL_META[channel].icon }}</VIcon>
                  {{ CHANNEL_META[channel].label }}
                </VChip>
              </div>

              <dl class="benefits-facts mb-3">
                <div v-for="fact in program.facts" :key="fact.label" class="benefits-fact">
                  <dt class="text-caption text-medium-emphasis">
                    {{ fact.label }}
                    <span class="benefits-source" :class="`benefits-source--${fact.source}`">
                      {{ SOURCE_LABELS[fact.source] }}
                    </span>
                  </dt>
                  <dd class="text-body-2">{{ fact.value }}</dd>
                </div>
              </dl>

              <p class="text-body-2 mb-2"><strong>Cómo se usa.</strong> {{ program.how }}</p>
              <p class="text-body-2 mb-2"><strong>Cómo entrás.</strong> {{ program.join }}</p>
              <p class="text-body-2 mb-3">
                <strong>Retorno.</strong>
                {{ program.returnNote }}
              </p>

              <p class="text-caption text-medium-emphasis mb-1">Dónde sirve</p>
              <div class="d-flex flex-wrap ga-1 mb-3">
                <VChip v-for="place in program.worksAt" :key="place" size="x-small" variant="tonal">
                  {{ place }}
                </VChip>
              </div>

              <p class="text-caption text-medium-emphasis mb-1">Lo que hay que saber antes</p>
              <ul class="pl-4 mb-3">
                <li v-for="caveat in program.caveats" :key="caveat" class="text-body-2 mb-1">
                  {{ caveat }}
                </li>
              </ul>

              <div class="mt-auto d-flex flex-wrap ga-2 pt-1">
                <VBtn
                  :href="program.siteUrl"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  size="small"
                  variant="tonal"
                  color="primary"
                >
                  <VIcon start size="16">mdi-open-in-new</VIcon>
                  Sitio oficial
                </VBtn>
                <VBtn
                  v-if="program.rulesUrl"
                  :href="program.rulesUrl"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  size="small"
                  variant="text"
                >
                  <VIcon start size="16">mdi-file-document-outline</VIcon>
                  Bases
                </VBtn>
                <VBtn
                  v-if="program.androidUrl"
                  :href="program.androidUrl"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  size="small"
                  variant="text"
                >
                  <VIcon start size="16">mdi-google-play</VIcon>
                  Play
                </VBtn>
                <VBtn
                  v-if="program.iosUrl"
                  :href="program.iosUrl"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  size="small"
                  variant="text"
                >
                  <VIcon start size="16">mdi-apple</VIcon>
                  App Store
                </VBtn>
              </div>
            </VCardText>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- How to judge a loyalty programme -->
    <VCard variant="outlined" class="mb-8">
      <VCardItem class="pb-1">
        <h2 class="text-subtitle-1 font-weight-medium d-flex align-center ga-2">
          <VIcon size="small">mdi-clipboard-check-outline</VIcon>
          Cómo mirar un programa de fidelidad en 30 segundos
        </h2>
      </VCardItem>
      <VCardText class="text-body-2 benefits-intro">
        <ol class="pl-4 mb-0">
          <li v-for="rule in RULES" :key="rule.title" class="mb-2">
            <strong>{{ rule.title }}</strong> {{ rule.body }}
          </li>
        </ol>
      </VCardText>
    </VCard>

    <!-- The third-party finders live in one component, shared with the card pages -->
    <section class="mb-8">
      <h2 class="text-h6 font-weight-medium mb-1">
        Buscadores de descuentos: la app para saber dónde tenés beneficio hoy
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3 benefits-intro">
        Los programas de arriba son del comercio. Estas herramientas resuelven lo otro: qué
        descuento tenés hoy con las tarjetas que ya llevás en el bolsillo.
      </p>
      <DiscountFinders />
    </section>

    <!-- Cross-links -->
    <VRow class="mb-6">
      <VCol v-for="link in CROSS_LINKS" :key="link.to" cols="12" md="4">
        <VCard :to="localePath(link.to)" class="pa-4 h-100" hover variant="tonal">
          <VIcon color="primary" class="mb-2">{{ link.icon }}</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ link.title }}</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">{{ link.body }}</p>
        </VCard>
      </VCol>
    </VRow>

    <FaqSection :items="FAQ" heading="Preguntas frecuentes" :expanded="true" />

    <!-- Sources -->
    <VCard variant="outlined" class="mt-6">
      <VCardItem class="pb-1">
        <h2 class="text-subtitle-1 font-weight-medium d-flex align-center ga-2">
          <VIcon size="small">mdi-link-variant</VIcon>
          Fuentes
        </h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Datos verificados el {{ reviewedLabel }}. Los precios, las tasas de acumulación y los
          vencimientos los cambia cada empresa cuando quiere: ante una diferencia, mandan las bases
          del programa.
        </p>
      </VCardItem>
      <VCardText>
        <ul class="pl-4 mb-0">
          <li v-for="source in BENEFIT_SOURCES" :key="source.url" class="text-body-2 mb-1">
            <a :href="source.url" target="_blank" rel="noopener noreferrer nofollow">
              {{ source.label }}
            </a>
            <span class="text-medium-emphasis"> — {{ source.publisher }}</span>
          </li>
        </ul>
      </VCardText>
    </VCard>

    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-information-outline"
    >
      No tenemos afiliación, acuerdo ni links de referido con ninguno de estos programas, y no
      cobramos por figurar. Esta página es informativa: antes de asociarte a algo con cuota o
      permanencia, leé las bases del propio programa.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BENEFIT_CATEGORIES,
  BENEFIT_CATEGORY_ICONS,
  BENEFIT_PROGRAMS,
  BENEFIT_PROGRAMS_LAST_REVIEWED,
  BENEFIT_SOURCES,
  CHANNEL_META,
  activeCategories,
  measurablePrograms,
  programsByCategory,
  yearlyReturn,
  type BenefitProgram,
  type ProgramCost,
  type ProgramSourceKind,
} from '~/utils/benefitPrograms'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const categories = activeCategories()
const measurable = measurablePrograms()

/**
 * El orden de la tabla pone primero lo que se puede medir. No es cosmético: la
 * conclusión de la página es que casi ningún programa publica lo necesario, y
 * mezclarlos alfabéticamente escondería exactamente eso.
 */
const returnRows = computed(() =>
  [...BENEFIT_PROGRAMS]
    .sort((a, b) => (b.returnPct ?? -1) - (a.returnPct ?? -1))
    .map(program => ({
      id: program.id,
      name: program.name,
      operator: program.operator,
      earn: factValue(program, 'Cómo se gana') ?? '—',
      pointValue: factValue(program, 'Valor del punto') ?? 'Sin puntos: es otro formato',
      returnPct: program.returnPct,
      expiry: program.expiry ?? 'Sin vencimiento publicado',
    }))
)

const monthlySpend = ref(12000)

const yearlyRows = computed(() =>
  measurable.map(program => ({
    id: program.id,
    name: program.name,
    operator: program.operator,
    returnPct: program.returnPct as number,
    yearly: formatMoney(yearlyReturn(program, monthlySpend.value) ?? 0),
  }))
)

function factValue(program: BenefitProgram, label: string): string | undefined {
  return program.facts.find(fact => fact.label === label)?.value
}

const SOURCE_LABELS: Record<ProgramSourceKind, string> = {
  oficial: 'bases oficiales',
  prensa: 'prensa',
  tienda: 'tienda de apps',
  autodeclarado: 'autodeclarado',
  calculado: 'cuenta nuestra',
}

function costLabel(cost: ProgramCost): string {
  if (cost.kind === 'gratis') return 'Sin costo'
  return cost.detail
}

function costColor(kind: ProgramCost['kind']): string {
  if (kind === 'gratis') return 'success'
  if (kind === 'atado') return 'info'
  return 'warning'
}

function formatPct(value: number): string {
  return `${value.toFixed(2).replace('.', ',')} %`
}

function formatMoney(value: number): string {
  return `$ ${Math.round(value).toLocaleString('es-UY')}`
}

const reviewedLabel = new Date(`${BENEFIT_PROGRAMS_LAST_REVIEWED}T00:00:00Z`).toLocaleDateString(
  'es-UY',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
)

const FINDINGS = [
  {
    icon: 'mdi-percent-outline',
    title: 'Casi ninguno dice cuánto rinde',
    body: `De ${BENEFIT_PROGRAMS.length} programas, ${measurable.length} publica a la vez cuántos puntos da cada peso y cuánto vale un punto. El resto te pide fidelidad sin decirte el precio de la fidelidad.`,
  },
  {
    icon: 'mdi-timer-sand',
    title: 'Los puntos se vencen antes de lo que creés',
    body: 'En Ta-Ta caducan a los tres meses sin comprar, y en Tienda Inglesa a los seis (24 si el documento es extranjero, y ahí no se renuevan). El saldo que guardás “para más adelante” es el que se pierde.',
  },
  {
    icon: 'mdi-cash-remove',
    title: 'Hay beneficios que ya tenés y estás pagando aparte',
    body: 'El 2x1 de cine todos los días viene sin costo por ser cliente de Antel y con medios de pago del BROU. Si te asociás a un club solo por el cine, estás pagando algo que ya tenías.',
  },
]

const RULES = [
  {
    title: 'Despejá el porcentaje.',
    body: 'Puntos por peso × valor del punto = retorno. Si te falta cualquiera de los dos datos, el programa no es comparable y conviene tratarlo como cero hasta que te muestren las bases.',
  },
  {
    title: 'Mirá el vencimiento antes que el premio.',
    body: 'Un 2 % que caduca a los tres meses rinde menos que un 1 % que no caduca, salvo que compres ahí todas las semanas.',
  },
  {
    title: 'Fijate dónde se canjea.',
    body: 'No es lo mismo descontar en la caja que canjear por catálogo. El catálogo fija el precio en puntos sin referencia en pesos, y en algunos programas los puntos ganados online solo se gastan en el local.',
  },
  {
    title: 'Sumá la cuota y la permanencia.',
    body: 'Una tarjeta “gratis” atada a una suscripción paga no es gratis, y tres meses de permanencia prepagos son un costo hundido si te arrepentís al mes.',
  },
]

const CROSS_LINKS = [
  {
    to: '/descuentos-con-tarjeta-uruguay',
    icon: 'mdi-map-search-outline',
    title: 'Mapa de descuentos con tarjeta',
    body: 'Qué comercio tiene descuento hoy con las tarjetas que ya tenés, filtrado por día y por rubro.',
  },
  {
    to: '/tarjetas-de-credito-uruguay',
    icon: 'mdi-credit-card-multiple-outline',
    title: 'Programas de puntos de las tarjetas',
    body: 'El otro lado: cuánto acumula, cuánto cuesta y qué canjea cada tarjeta de crédito uruguaya.',
  },
  {
    to: '/apps-economia-uruguay',
    icon: 'mdi-cellphone-cog',
    title: 'Apps para manejar tu plata',
    body: 'Directorio de apps de bancos, billeteras, inversión, trámites y herramientas del día a día.',
  },
]

const FAQ: FaqItem[] = [
  {
    id: 'mejor-programa-fidelidad-uruguay',
    question: '¿Cuál es el programa de fidelidad que más devuelve en Uruguay?',
    answer:
      'De los programas de comercio con reglas publicadas, el que se puede medir es el Programa Puntos de Tienda Inglesa: 15 puntos cada $ 900 de compra y cada punto vale $ 1, o sea 1,67 % del gasto, que sube a 3,33 % pagando con Scotiabank ClubCard. Los demás no publican a la vez la tasa de acumulación y el valor del punto, así que no se pueden ordenar por retorno sin inventar el número.',
  },
  {
    id: 'puntos-supermercado-vencen',
    question: '¿Se vencen los puntos de los supermercados uruguayos?',
    answer:
      'Sí, y rápido. En el programa PLUS de Ta-Ta los puntos caducan tras tres meses consecutivos sin actividad. En Tienda Inglesa duran 6 meses y se renuevan con cada compra si tenés documento uruguayo; con documento extranjero son 24 meses sin renovación. En Club Movistar los Movis valen dos años desde que se generan.',
  },
  {
    id: 'programa-fidelidad-gratis',
    question: '¿Los clubes de beneficios son gratis?',
    answer:
      'Hay tres casos distintos. Gratis de verdad: los programas de puntos del supermercado, la farmacia y las estaciones ANCAP. Sin cuota pero atados a ser cliente: Beneficios Antel y Club Movistar. Con costo: PedidosYa Plus ($ 349 por mes), Socio Espectacular (desde $ 500 por mes con tres meses de mínimo) y Club El País, donde la tarjeta es gratis pero exige una suscripción paga al diario.',
  },
  {
    id: 'descuento-cine-uruguay-gratis',
    question: '¿Cómo consigo 2x1 en el cine en Uruguay sin pagar una cuota?',
    answer:
      'Siendo cliente de Antel: pedís el código en la app Mi Antel o marcando *789*1#, te llega un SMS con seis dígitos y con eso tenés 2x1 en entradas 2D y 3D todos los días en Grupocine, Life Cinemas, Movie, Cinemateca y Cines del Este. Los medios de pago del BROU también dan 2x1 en Life y Grupocine, y con ANCAPuntos se canjean entradas de cine desde la app.',
  },
  {
    id: 'puntos-o-descuento-tarjeta',
    question: '¿Conviene más el programa del comercio o el descuento del banco?',
    answer:
      'Se acumulan: son cosas distintas. El descuento del banco se aplica en el momento y suele ser de dos dígitos pero solo un día de la semana; el programa del comercio devuelve un porcentaje bajo pero en todas las compras, incluso pagando en efectivo. Lo eficiente es comprar el día del descuento bancario y dar igual el documento o la tarjeta de puntos del comercio.',
  },
  {
    id: 'abono-cultural-bps',
    question: '¿Los jubilados pagan lo mismo por Socio Espectacular?',
    answer:
      'No. Quien cobra del BPS una jubilación o pensión de hasta 8 BPC puede acceder a la misma tarjeta por el Abono Cultural, que cubre un año entero en vez de una cuota mensual, con la posibilidad de descontarlo del recibo en 6 o 12 cuotas. Hay un conflicto entre dos fuentes oficiales sobre el importe —Socio Espectacular publica $ 1.580 al contado y el BPS sigue mostrando $ 1.525—, así que conviene confirmar el monto en la ventanilla; el trámite es presencial.',
  },
  {
    id: 'app-descuentos-uruguay',
    question: '¿Hay una app que junte todos los descuentos en un solo lugar?',
    answer:
      'Para los descuentos de las tarjetas sí: Bankos los reúne en un mapa, y nuestro mapa de descuentos hace lo mismo desde el navegador. Para los programas de fidelidad del comercio no existe un agregador: cada programa vive en su propia app o en la caja, y por eso hay que mirar las bases uno por uno.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/apps-de-beneficios-uruguay'

useSeoMeta({
  title:
    'Apps y programas de beneficios en Uruguay: descuentos, puntos y clubes (2026) | Cambio Uruguay',
  description:
    'Guía de los programas de fidelidad y clubes de beneficios uruguayos: Ta-Ta PLUS, Puntos de Tienda Inglesa, Tarjeta Más, Farmacard, ANCAPuntos, PedidosYa Plus, Socio Espectacular, Club Movistar, Beneficios Antel y Club El País. Cuánto devuelve cada uno, cuándo vencen los puntos y qué cuesta cada club.',
  ogTitle: 'Apps y programas de beneficios en Uruguay: cuánto devuelve cada uno',
  ogDescription:
    'Puntos de supermercado, farmacia, combustible y clubes con cuota, con las reglas leídas de las bases oficiales.',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: 'Apps y programas de beneficios en Uruguay',
            description:
              'Programas de fidelidad y clubes de beneficios uruguayos, con el retorno efectivo calculado de las bases oficiales.',
            mainEntityOfPage: canonicalUrl,
            dateModified: BENEFIT_PROGRAMS_LAST_REVIEWED,
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
          },
          {
            '@type': 'ItemList',
            name: 'Programas de fidelidad y clubes de beneficios en Uruguay',
            numberOfItems: BENEFIT_PROGRAMS.length,
            itemListElement: BENEFIT_PROGRAMS.map((program, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: `${program.name} — ${program.operator}`,
              url: `${canonicalUrl}#${program.id}`,
            })),
          },
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
                name: 'Apps y programas de beneficios en Uruguay',
                item: canonicalUrl,
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
.benefits-intro {
  max-width: 78ch;
}

/* Las fichas repiten dato/valor muchas veces: sin la grilla, cada par ocupa dos
   líneas y la tarjeta se vuelve una columna de texto imposible de escanear. */
.benefits-facts {
  display: grid;
  gap: 8px 16px;
  margin: 0;
}

@media (min-width: 600px) {
  .benefits-facts {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.benefits-fact dd {
  margin-inline-start: 0;
}

.benefits-source {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 1px 6px;
  border-radius: 999px;
  margin-inline-start: 4px;
  white-space: nowrap;
  border: 1px solid currentcolor;
  opacity: 0.85;
}

/* El origen del dato se lee de un vistazo: lo que sale de las bases no vale lo
   mismo que lo que la empresa dice de sí misma, y menos que una cuenta nuestra. */
.benefits-source--oficial {
  color: rgb(var(--v-theme-success));
}

.benefits-source--prensa,
.benefits-source--tienda {
  color: rgb(var(--v-theme-info));
}

.benefits-source--autodeclarado {
  color: rgb(var(--v-theme-warning));
}

.benefits-source--calculado {
  color: rgb(var(--v-theme-primary));
}

.benefits-anchor {
  color: inherit;
  font-weight: 600;
  text-decoration: none;
}

.benefits-anchor:hover {
  text-decoration: underline;
}
</style>
