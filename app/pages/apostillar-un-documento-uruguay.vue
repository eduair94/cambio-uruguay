<template>
  <div class="apo-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-stamper</VIcon>
              TRÁMITE
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Apostillar un documento en Uruguay: cuánto sale y en qué orden
            </h1>
            <p class="text-body-1 apo-lead">
              La apostilla sale <strong>{{ formatPesos(apostilla.pesos) }}</strong> y la
              legalización <strong>{{ formatPesos(legalizacion.pesos) }}</strong
              >, importes que Cancillería publica para {{ feeYear }}. Pero ese es el arancel del
              <em>último</em> paso: la apostilla autentica una firma que ya tiene que estar
              registrada ante el Ministerio, así que según quién haya firmado tu documento hay otro
              organismo antes, con su propio arancel y su propia agenda.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Apostillar un documento en Uruguay"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Aranceles verificados contra su fuente el {{ verifiedDisplay }}. Apostilla y legaliza
              el {{ organismo }}.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. Cuál de los dos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Apostilla o legalización: cuál te toca</h2>
            <p class="text-body-1 apo-prose mb-4">
              No lo elegís vos. Lo decide el país donde vas a presentar el documento: si ratificó el
              Convenio sobre la Apostilla va apostilla, y si no lo ratificó va legalización y
              después el consulado de ese país. La lista de quiénes lo ratificaron la mantiene la
              Conferencia de La Haya y es la única que manda.
            </p>
            <div class="table-scroll">
              <table class="apo-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Trámite</th>
                    <th>Arancel</th>
                    <th>Cuándo corresponde</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="fee in fees" :key="fee.key">
                    <td data-label="Trámite">
                      <strong>{{ fee.label }}</strong>
                    </td>
                    <td data-label="Arancel">{{ formatPesos(fee.pesos) }}</td>
                    <td data-label="Cuándo corresponde">{{ fee.when }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-caption text-medium-emphasis apo-note">
              Se paga siempre en pesos uruguayos, en línea o por Abitab, y antes de poder agendar la
              cita.
            </p>
          </section>

          <!-- 2. El corazón de la página: el paso previo -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Qué paso va antes, según quién firmó tu documento
            </h2>
            <p class="text-body-1 apo-prose mb-4">
              Esta es la parte que nadie pone junta, y la que decide cuánto vas a terminar pagando.
              Cancillería sólo apostilla firmas que ya están registradas ante ella: todo lo demás
              pasa antes por el organismo que puede certificar esa firma.
              <template v-if="urValue">
                El arancel del MSP se publica en UR, así que abajo va convertido con la UR de hoy
                ({{ formatPesos(urValue, 2) }}).
              </template>
              <template v-else>
                El arancel del MSP se publica en UR y ahora mismo no tenemos su valor del día, así
                que queda en UR sin convertir.
              </template>
            </p>
            <div class="table-scroll">
              <table class="apo-table cu-mobile-cards">
                <thead>
                  <tr>
                    <th>Lo firmó…</th>
                    <th>Paso previo</th>
                    <th>Cuesta</th>
                    <th>Total con apostilla</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in rows" :key="row.key">
                    <td data-label="Lo firmó…">
                      <strong>{{ row.signedBy }}</strong>
                      <span class="d-block text-caption text-medium-emphasis apo-row-note">
                        {{ row.note }}
                      </span>
                    </td>
                    <td data-label="Paso previo">
                      <template v-if="row.organismo">
                        <a
                          v-if="row.sourceUrl"
                          :href="row.sourceUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          >{{ row.organismo }}</a
                        >
                        <template v-else>{{ row.organismo }}</template>
                      </template>
                      <span v-else class="text-medium-emphasis">Ninguno: va directo al MRREE</span>
                    </td>
                    <td data-label="Cuesta">{{ row.costLabel }}</td>
                    <td data-label="Total con apostilla">
                      <strong>{{ formatPesos(row.total.total) }}</strong>
                      <span
                        v-if="row.total.partial"
                        class="d-block text-caption text-medium-emphasis apo-row-note"
                      >
                        Es un piso: no incluye {{ row.total.missing.join(' ni ') }}.
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-caption text-medium-emphasis apo-note">
              Los totales que dicen «es un piso» son sumas incompletas a propósito: preferimos que
              el número diga qué le falta antes que mostrar un total más barato que la realidad.
              Para una legalización, restá la diferencia entre los dos aranceles del MRREE.
            </p>
          </section>

          <!-- 3. El orden, que es lo que rompe los planes -->
          <section class="mb-8">
            <VAlert type="info" variant="tonal" border="start" class="apo-alert">
              <p class="text-subtitle-1 font-weight-bold apo-alert-title">
                Primero se paga, después se agenda
              </p>
              <p class="text-body-2 apo-alert-body">
                El cupo de la agenda recién se ve una vez que el trámite está pagado. Es el detalle
                que conviene saber antes de comprometer una fecha o sacar un pasaje, porque hasta
                pagar no sabés para cuándo te van a dar la cita, y la ficha oficial no publica ni el
                plazo de entrega ni cuántos días de cupo hay.
              </p>
            </VAlert>
          </section>

          <!-- 4. Cómo se hace -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cómo se tramita</h2>
            <ol class="apo-list">
              <li v-for="etapa in etapas" :key="etapa.title">
                <strong>{{ etapa.title }}</strong> — {{ etapa.body }}
              </li>
            </ol>
            <p class="text-body-2 apo-prose apo-note">
              Se atiende en {{ contacto.direccion }}. {{ contacto.horario }}. Consultas al
              {{ contacto.telefono }} o a
              <a :href="`mailto:${contacto.email}`">{{ contacto.email }}</a
              >.
            </p>
          </section>

          <!-- 5. Exoneraciones -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Los casos que no se pagan</h2>
            <p class="text-body-1 apo-prose mb-4">
              La ficha del MRREE lista cuatro exoneraciones. Ninguna se pide en el formulario: como
              el sistema habilita la agenda recién después del pago, hay que comunicarlas antes al
              correo de Cancillería.
            </p>
            <ul class="apo-list">
              <li v-for="item in exoneraciones" :key="item">{{ item }}</li>
            </ul>
          </section>

          <!-- 6. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.question" :title="faq.question">
                <template #text>
                  <p class="text-body-2 apo-prose">{{ faq.answer }}</p>
                </template>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 7. Lo que no contestamos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Lo que esta página no contesta</h2>
            <p class="text-body-1 apo-prose mb-4">
              Son preguntas reales que las fichas oficiales no responden. Preferimos decir que no
              las sabemos antes que copiar un número de un blog.
            </p>
            <div v-for="item in unpublished" :key="item.question" class="apo-unpublished mb-3">
              <p class="text-subtitle-2 font-weight-bold apo-unpublished-q">{{ item.question }}</p>
              <p class="text-body-2 apo-prose apo-unpublished-a">{{ item.answer }}</p>
            </div>
          </section>

          <!-- 8. Seguir por acá -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Seguir por acá</h2>
            <ul class="apo-list">
              <li>
                <NuxtLink :to="localePath('/cuanto-sale-la-partida-de-nacimiento-uruguay')">
                  Cuánto sale la partida de nacimiento </NuxtLink
                >— el documento que más se apostilla, con su propio arancel.
              </li>
              <li>
                <NuxtLink :to="localePath('/certificado-de-antecedentes-judiciales-uruguay')">
                  Certificado de antecedentes judiciales </NuxtLink
                >— se cobra en UI y se puede apostillar con sólo el ticket.
              </li>
              <li>
                <NuxtLink :to="localePath('/indicadores/unidad-reajustable')">
                  Valor de la UR hoy </NuxtLink
                >— la unidad en la que el MSP cobra su constancia.
              </li>
            </ul>
          </section>

          <!-- 9. Fuentes -->
          <VCard variant="flat" class="apo-sources pa-5 mb-6">
            <p class="text-subtitle-1 font-weight-bold apo-sources-title">Fuentes</p>
            <ul class="apo-sources-list">
              <li v-for="source in sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
              </li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { indicatorFromSlug, liveIndicatorReading } from '~/utils/indicators'
import {
  APOSTILLE_CONTACT,
  APOSTILLE_ETAPAS,
  APOSTILLE_EXONERACIONES,
  APOSTILLE_FAQS,
  APOSTILLE_FEES,
  APOSTILLE_FEE_YEAR,
  APOSTILLE_ORGANISMO,
  APOSTILLE_PATH,
  APOSTILLE_PRE_STEPS,
  APOSTILLE_SOURCES,
  APOSTILLE_UNPUBLISHED,
  APOSTILLE_VERIFIED_AT,
  feeFor,
  pesosForUr,
  totalFor,
} from '~/utils/apostille'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

const fees = APOSTILLE_FEES
const faqs = APOSTILLE_FAQS
const sources = APOSTILLE_SOURCES
const unpublished = APOSTILLE_UNPUBLISHED
const etapas = APOSTILLE_ETAPAS
const exoneraciones = APOSTILLE_EXONERACIONES
const contacto = APOSTILLE_CONTACT
const organismo = APOSTILLE_ORGANISMO
const feeYear = APOSTILLE_FEE_YEAR

const apostilla = feeFor('apostilla')!
const legalizacion = feeFor('legalizacion')!

// El arancel del MSP se publica en UR, así que la conversión necesita el valor del
// día. Se lee con `liveIndicatorReading` y NO con `currentIndicatorValue`: el
// segundo cae al valor de referencia del catálogo cuando la API falla, y esta
// página IMPRIME el número como el de hoy. Si no hay lectura viva, `urValue` queda
// en null y la tabla muestra «1 UR» sin convertir: nunca un peso inventado.
const urIndicator = indicatorFromSlug('unidad-reajustable')
const { data: urValue } = await useAsyncData('apostille-ur-value', async () => {
  if (!urIndicator) return null
  try {
    const result = await getProcessedExchangeData('')
    const rows = (result?.exchangeData ?? []) as ExchangeRate[]
    return liveIndicatorReading(rows, urIndicator)?.value ?? null
  } catch {
    return null
  }
})

const formatPesos = (n: number, decimals = 0): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

/** Lo que cuesta un paso previo, en texto: nunca un cero donde falta un dato. */
const costLabelFor = (step: (typeof APOSTILLE_PRE_STEPS)[number]): string => {
  switch (step.cost.kind) {
    case 'none':
      return 'Nada extra'
    case 'pesos':
      return `${formatPesos(step.cost.pesos)} por documento`
    case 'ur': {
      const pesos = pesosForUr(step.cost.ur, urValue.value)
      return pesos === null
        ? `${step.cost.ur} UR`
        : `${step.cost.ur} UR (${formatPesos(pesos)} hoy)`
    }
    case 'unpublished':
      return 'No lo publica'
  }
}

const rows = computed(() =>
  APOSTILLE_PRE_STEPS.map(step => ({
    key: step.key,
    signedBy: step.signedBy,
    organismo: step.organismo,
    sourceUrl: step.sourceUrl,
    note: step.note,
    costLabel: costLabelFor(step),
    total: totalFor(step, 'apostilla', urValue.value),
  }))
)

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = computed(() => displayDate(APOSTILLE_VERIFIED_AT))

const canonicalUrl = `https://cambio-uruguay.com${APOSTILLE_PATH}`

// El título se queda con el verbo por el que se busca («apostillar») y el país, que
// es lo que desambigua: la apostilla existe en cien países y el arancel es de éste.
// Las cifras van en la descripción, que es donde se miden.
const title = 'Apostillar un documento en Uruguay'
const description =
  'Apostilla $777 y legalización $379 (Cancillería, 2026). Casi nunca es el único pago: un título pasa antes por el MEC ($269) y uno médico por el MSP (1 UR).'

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
        'apostillar un documento uruguay, apostilla uruguay, cuanto sale la apostilla, apostilla mrree, legalizacion de documentos uruguay, cancilleria apostilla uruguay, apostilla convenio de la haya uruguay, legalizar documentos para el exterior uruguay',
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
                name: 'Apostillar un documento en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: APOSTILLE_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: sources.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.apo-page {
  max-width: 1180px;
}

.apo-lead {
  margin-top: 0;
  line-height: 1.65;
}

.apo-prose {
  margin-top: 0;
  line-height: 1.7;
}

.apo-note {
  margin-top: 12px;
  line-height: 1.6;
}

.apo-row-note {
  margin-top: 4px;
  line-height: 1.5;
}

.apo-alert-title {
  margin-top: 0;
}

.apo-alert-body {
  margin-top: 6px;
  line-height: 1.65;
}

.table-scroll {
  overflow-x: auto;
}

.apo-table {
  width: 100%;
  border-collapse: collapse;
}

.apo-table th,
.apo-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  vertical-align: top;
}

.apo-table th {
  font-weight: 700;
  white-space: nowrap;
}

.apo-list {
  margin-top: 0;
  padding-left: 1.2rem;
}

.apo-list li {
  margin-top: 8px;
  line-height: 1.65;
}

.apo-unpublished-q {
  margin-top: 0;
}

.apo-unpublished-a {
  margin-top: 4px;
}

.apo-sources-title {
  margin-top: 0;
}

.apo-sources-list {
  margin-top: 10px;
  padding-left: 1.2rem;
}

.apo-sources-list li {
  margin-top: 8px;
  line-height: 1.55;
}

.apo-sources-list a {
  text-decoration: none;
}

.apo-sources-list a:hover {
  text-decoration: underline;
}
</style>
