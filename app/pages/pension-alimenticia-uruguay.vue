<template>
  <VContainer class="support-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">FAMILIA Y DINERO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Pensión alimenticia en Uruguay: cuánto es y cómo se fija
      </h1>
      <p class="lead mb-6">
        No hay porcentaje. El artículo 46 del Código de la Niñez y la Adolescencia manda que la
        prestación sea
        <strong
          >proporcional a las posibilidades del obligado y a las necesidades del
          beneficiario</strong
        >, y eso lo resuelve el juez expediente por expediente. La ley uruguaya escribe un solo
        número, y es un piso para un caso puntual:
        <strong>{{ UNIVERSAL_FLOOR_BPC }} BPC ({{ money(floorUyu) }}) por núcleo familiar</strong>
        cuando el tribunal no tiene información sobre los ingresos del obligado.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-scale-balance" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que casi todo el mundo viene a buscar</div>
            <p class="callout-text mb-0">
              «El 30 % del sueldo», «un tercio», «20 % por hijo»: ninguna de esas cifras está en
              ninguna norma uruguaya. Buscarlas y no encontrarlas <em>es</em> el dato, porque la
              cuota no sale de una tabla sino de contrastar dos cosas —lo que el obligado puede y lo
              que el beneficiario necesita— que cambian en cada caso. Lo que sí está escrito, y con
              artículo al lado, es todo lo demás de esta página.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- El piso del art. 46 -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El único número que la ley escribe</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Es reciente y casi nadie lo cita: lo agregó la Ley 20.212 de noviembre de 2023 al final del
        artículo 46. Cuando el tribunal no cuenta con información sobre los ingresos del obligado
        alimentario, no puede quedarse sin fijar nada: debe fijar de todas formas una prestación
        alimenticia universal mínima.
      </p>

      <VCard variant="flat" class="floor-card pa-5 pa-md-6">
        <div class="floor-figure">
          <span class="floor-value">{{ money(floorUyu) }}</span>
          <span class="floor-unit">= {{ UNIVERSAL_FLOOR_BPC }} BPC por núcleo familiar</span>
        </div>
        <p class="floor-note text-body-2 text-medium-emphasis">
          Con la BPC vigente de {{ money(bpc) }}. El valor de la BPC se fija por decreto una vez al
          año, así que el piso se actualiza solo: podés verlo en
          <NuxtLink :to="localePath('/indicadores/bpc')">la ficha de la BPC</NuxtLink>.
        </p>
        <VAlert type="warning" variant="tonal" density="comfortable" class="floor-alert mb-0">
          No lo leas al revés. No es «lo que corresponde por hijo» ni un tope: es el piso de lo que
          un juez puede fijar a ciegas. Con ingresos conocidos rige la proporcionalidad del inciso
          3.º, y la cuota puede ser —y normalmente es— muy superior.
        </VAlert>
      </VCard>
    </section>

    <!-- Qué cubre -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué es «alimentos» para la ley</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La palabra engaña: suena a comida y el artículo 46 enumera siete conceptos. Sirve para
        discutir una cuota, porque una prestación que sólo cubre el supermercado no está cubriendo
        lo que la norma llama alimentos.
      </p>

      <VRow dense>
        <VCol v-for="item in SUPPORT_COVERS" :key="item.key" cols="12" sm="6" md="4">
          <VCard variant="flat" class="item-card pa-4 h-100">
            <p class="item-label font-weight-medium mb-2">{{ item.label }}</p>
            <p class="item-detail text-body-2 text-medium-emphasis mb-0">{{ item.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Quién la debe -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Quién la debe, y en qué orden</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El artículo 51 arma una escalera. Sólo se baja un escalón cuando el anterior es imposible o
        insuficiente: los abuelos no deben nada mientras el padre o la madre puedan. Si hay varios
        obligados del mismo grado, la obligación se divide en proporción a la capacidad económica de
        cada uno.
      </p>

      <ul class="order-list">
        <li v-for="o in OBLIGOR_ORDER" :key="o.rank" class="order-item">
          <span class="order-badge" :class="{ 'is-primary': o.rank === 0 }">
            {{ o.rank === 0 ? '1.º' : `${o.rank + 1}.º` }}
          </span>
          <div class="order-label">
            <span class="font-weight-medium">{{ o.label }}</span>
            <span class="text-medium-emphasis"> — {{ o.detail }}</span>
          </div>
        </li>
      </ul>

      <VCard variant="flat" class="age-card pa-5 mt-6">
        <div class="text-overline mb-2">Hasta cuándo se debe</div>
        <p class="age-text mb-0">
          Son acreedores los niños y adolescentes, y también los
          <strong>mayores de dieciocho y menores de veintiún años</strong> que no dispongan de
          medios de vida propios y suficientes para su congrua y decente sustentación. Está en el
          artículo 50, que tomó su redacción actual de la Ley 19.788 de 2019.
        </p>
      </VCard>
    </section>

    <!-- Caracteres -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cinco reglas que sorprenden</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Las cuatro primeras salen de los artículos 52 y 53, y la última del 47. La cuarta es la que
        más se olvida: los caracteres del artículo 52 valen hacia adelante, y para las cuotas ya
        vencidas el artículo 53 dice exactamente lo contrario.
      </p>

      <VTable class="trait-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Regla</th>
            <th>Qué significa</th>
            <th>Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in SUPPORT_TRAITS" :key="t.key">
            <td data-label="Regla">
              <span class="font-weight-medium">{{ t.label }}</span>
            </td>
            <td data-label="Qué significa" class="text-body-2">{{ t.detail }}</td>
            <td data-label="Norma" class="text-caption text-medium-emphasis text-no-wrap">
              {{ t.article }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Si no pagan -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si no la pagan: las tres palancas de dinero</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Las tres son independientes y pueden correr a la vez. Ninguna se activa sola: las tres salen
        de una resolución judicial.
      </p>

      <VRow dense>
        <VCol v-for="lever in NON_PAYMENT_LEVERS" :key="lever.key" cols="12" md="4">
          <VCard variant="flat" class="lever-card pa-5 h-100 d-flex flex-column">
            <div class="text-overline mb-2">{{ lever.norm }}</div>
            <p class="lever-label font-weight-medium mb-2">{{ lever.label }}</p>
            <p class="lever-detail text-body-2 text-medium-emphasis mb-4">{{ lever.detail }}</p>
            <VBtn
              v-if="lever.to"
              :to="localePath(lever.to)"
              variant="tonal"
              size="small"
              class="mt-auto align-self-start"
            >
              Ver los topes del embargo
            </VBtn>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Registro -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El registro de deudores alimentarios morosos</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Es la palanca menos conocida y la más concreta en plata: la morosidad alimentaria se
        convierte en una inhabilitación bancaria. Vive en la Sección Interdicciones del Registro
        Nacional de Actos Personales, la crea la Ley 17.957 y la consecuencia la manda la Ley
        18.244.
      </p>

      <VTable class="registry-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Paso</th>
            <th>Qué dice</th>
            <th>Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in REGISTRY_RULES" :key="r.key">
            <td data-label="Paso">
              <span class="font-weight-medium">{{ r.label }}</span>
            </td>
            <td data-label="Qué dice" class="text-body-2">{{ r.detail }}</td>
            <td data-label="Norma" class="text-caption text-medium-emphasis">{{ r.article }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="warn-card pa-5 pa-md-6 mt-6">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">No lo confundas con el Clearing</div>
            <p class="callout-text mb-0">
              El Clearing de Informes es una base de datos <strong>privada</strong>, regida por la
              Ley 18.331: informa antecedentes y ninguna ley obliga a nadie a negarte nada por estar
              ahí. El registro de deudores alimentarios morosos es
              <strong>público y sí inhabilita</strong>: recibida la comunicación, las instituciones
              de intermediación financiera no pueden otorgar ni renovar créditos, abrir cuentas ni
              emitir o renovar tarjetas.
              <NuxtLink :to="localePath('/salir-del-clearing')">
                La diferencia con el Clearing, en detalle</NuxtLink
              >.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Lo que no publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no publica, y por qué</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Tres datos que se buscan mucho y que acá no vas a encontrar. En una negociación real un
        número inventado funciona como ancla, así que es preferible el hueco.
      </p>

      <ul class="withheld-list">
        <li v-for="w in CHILD_SUPPORT_NOT_PUBLISHED" :key="w.key" class="withheld-item">
          <p class="withheld-claim font-weight-medium mb-1">{{ w.claim }}</p>
          <p class="withheld-why text-body-2 text-medium-emphasis mb-0">{{ w.why }}</p>
        </li>
      </ul>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in CHILD_SUPPORT_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <span class="font-weight-medium">{{ f.question }}</span>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/embargo-de-sueldo-uruguay')" variant="tonal" size="small">
          Embargo de sueldo
        </VBtn>
        <VBtn :to="localePath('/salir-del-clearing')" variant="tonal" size="small">
          Salir del Clearing
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
        <VBtn :to="localePath('/indicadores/bpc')" variant="tonal" size="small">
          Cuánto vale la BPC
        </VBtn>
        <VBtn :to="localePath('/a-quien-le-reclamo-uruguay')" variant="tonal" size="small">
          A quién le reclamo
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado artículo por artículo contra el texto vigente en impo.com.uy el
        {{ verifiedAt }}. Esta página es informativa y no sustituye el asesoramiento de un abogado:
        lo que vale en un expediente es lo que resuelve el juez.
      </p>
      <ul class="sources-list">
        <li v-for="s in CHILD_SUPPORT_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { URUGUAY } from '~/utils/calculators'
import {
  CHILD_SUPPORT_FAQ,
  CHILD_SUPPORT_NOT_PUBLISHED,
  CHILD_SUPPORT_SOURCES,
  CHILD_SUPPORT_VERIFIED_AT,
  NON_PAYMENT_LEVERS,
  OBLIGOR_ORDER,
  REGISTRY_RULES,
  REGISTRY_OVERDUE_INSTALMENTS,
  REGISTRY_YEARS,
  SUPPORT_COVERS,
  SUPPORT_TRAITS,
  UNIVERSAL_FLOOR_BPC,
  universalFloorUyu,
} from '~/utils/childSupport'

const localePath = useLocalePath()

const bpc = URUGUAY.bpc
const floorUyu = universalFloorUyu()

const moneyFmt = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 })
const money = (n: number) => `$${moneyFmt.format(Math.round(n))}`

const verifiedAt = new Date(`${CHILD_SUPPORT_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/pension-alimenticia-uruguay'
const title = 'Pensión alimenticia en Uruguay: cuánto es'
const description = `La ley uruguaya no fija ningún porcentaje del sueldo: el juez la calcula por proporcionalidad (CNA art. 46). El único número escrito es el piso de ${UNIVERSAL_FLOOR_BPC} BPC (${money(floorUyu)}) por núcleo familiar cuando no se conocen los ingresos, y adeudar más de ${REGISTRY_OVERDUE_INSTALMENTS} cuotas cierra el crédito bancario por ${REGISTRY_YEARS} años.`

defineOgImageComponent('Cambio', {
  title: 'Pensión alimenticia en Uruguay',
  subtitle: 'Sin porcentaje legal: el piso, el orden y las tres palancas de cobro',
  tag: 'FAMILIA Y DINERO',
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
        'pension alimenticia uruguay, cuanto es la pension alimenticia, que porcentaje del sueldo es la pension alimenticia, pension alimenticia hasta que edad uruguay, articulo 46 codigo de la ninez, deudor alimentario moroso uruguay, registro de deudores alimentarios, ley 17957, ley 18244, no me pasa la pension alimenticia',
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
                name: 'Pensión alimenticia en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: CHILD_SUPPORT_FAQ.map(f => ({
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
            citation: CHILD_SUPPORT_SOURCES.map(s => ({
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
.support-page {
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
.sources-note {
  max-width: 72ch;
  margin-top: 0;
}
.callout-text,
.item-label,
.item-detail,
.lever-label,
.age-text,
.withheld-claim {
  margin-top: 0;
}
.lever-detail,
.floor-note,
.withheld-why {
  margin-top: 8px;
}

.warn-card,
.item-card,
.lever-card,
.floor-card,
.age-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.warn-card {
  background: rgba(var(--v-theme-primary), 0.06);
}

.floor-figure {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
}
.floor-value {
  font-size: 2rem;
  font-weight: 700;
  line-height: 1.1;
}
.floor-unit {
  font-size: 0.95rem;
  opacity: 0.72;
}
.floor-note {
  max-width: 72ch;
}
.floor-alert {
  margin-top: 16px;
}

.trait-table :deep(th),
.registry-table :deep(th) {
  white-space: nowrap;
}

.order-list {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
}
.order-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
}
.order-item:last-child {
  border-bottom: none;
}
.order-badge {
  flex: 0 0 auto;
  min-width: 34px;
  height: 26px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.78rem;
  background: rgba(var(--v-theme-on-surface), 0.08);
}
.order-badge.is-primary {
  background: rgba(var(--v-theme-primary), 0.16);
}
.order-label {
  line-height: 1.5;
}

.withheld-list {
  list-style: none;
  padding-left: 0;
  margin-top: 0;
}
.withheld-item {
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.1);
  max-width: 78ch;
}
.withheld-item:last-child {
  border-bottom: none;
}

.sources-list {
  padding-left: 18px;
  margin-top: 0;
}
.sources-list li {
  margin-top: 6px;
  line-height: 1.5;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
}
</style>
