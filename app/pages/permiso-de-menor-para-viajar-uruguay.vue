<template>
  <VContainer class="permit-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">MIGRACIÓN</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Permiso de menor para salir de Uruguay: cuándo hace falta y cuánto sale
      </h1>
      <p class="lead mb-6">
        El dato que decide el viaje no es el precio: es el documento con el que viaja el chico. Con
        <strong>pasaporte uruguayo común vigente el permiso no se exige</strong> —lo dice la ficha
        de gub.uy y lo exceptúa el artículo 18 del Decreto 394/009—, y tampoco si viaja con sus dos
        padres o con su tutor. En cualquier otro caso hay que tramitarlo antes de viajar, y la ficha
        lo cobra en unidades indexadas: <strong>{{ arancelUi }} por salida y por menor</strong
        ><template v-if="arancelHoy">, que con la UI de hoy son {{ arancelHoy }}</template
        >.
      </p>

      <VCard class="answer-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-airplane-check" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">La respuesta corta</div>
            <p class="callout-text mb-0">
              Viaja con los dos padres o con pasaporte uruguayo vigente:
              <strong>no necesitás permiso</strong>. Viaja solo, con un tercero o con uno solo de
              sus padres y con cédula: <strong>sí</strong>, y tiene que firmarlo el padre que no
              viaja. El trámite es presencial, en Montevideo con agenda previa, y el menor no tiene
              que ir.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Cuándo no hace falta -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los seis casos en que no se exige</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Van primero a propósito: la mitad de las familias que buscan este trámite no lo necesita, y
        averiguarlo antes ahorra la agenda, el arancel y el viaje a la oficina. La lista es la de la
        ficha general del trámite; lo de la derecha es lo que igual hay que poder mostrar.
      </p>

      <VTable class="permit-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>El caso</th>
            <th>Qué hay que probar</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="waiver in PERMIT_WAIVERS" :key="waiver.id">
            <td data-label="El caso">
              <span class="font-weight-medium">{{ waiver.caso }}</span>
            </td>
            <td data-label="Qué hay que probar">{{ waiver.prueba ?? '—' }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="note-card pa-5 mt-6" variant="flat">
        <p class="note-text mb-0">
          <strong>El pasaporte es la vía más barata sólo a veces.</strong> Si el menor ya lo tiene
          vigente, el permiso desaparece del trámite. Si hay que sacarlo, es otro arancel y otra
          agenda: los dos números están en
          <NuxtLink :to="localePath('/cuanto-sale-el-pasaporte-uruguayo')"
            >cuánto sale el pasaporte uruguayo</NuxtLink
          >, y conviene mirarlos juntos antes de elegir. Para un viaje único a la región, el permiso
          suele salir menos; para una familia que viaja seguido, el pasaporte se amortiza.
        </p>
      </VCard>
    </section>

    <!-- El arancel -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto sale</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La ficha publica <strong>{{ arancelUi }}</strong
        >, no un monto en pesos, y eso cambia cómo se lee: la Unidad Indexada se ajusta todos los
        días por inflación, así que el arancel en pesos sube solo sin que nadie firme un decreto
        nuevo. Acá está convertido con el valor que publica el Banco Central<template
          v-if="valorUiDia"
        >
          el {{ valorUiDia }}</template
        >. Se cobra <strong>por cada salida que pidas y por cada menor</strong>.
      </p>

      <VRow v-if="arancelHoy" class="mb-2">
        <VCol cols="12" md="5">
          <VCard class="fee-card pa-5" variant="flat">
            <div class="text-overline mb-1">Una salida, un menor</div>
            <div class="fee-figure">{{ arancelHoy }}</div>
            <p class="note-text mb-0 text-medium-emphasis">
              {{ arancelUi }} × {{ valorUi }} (valor de la UI)
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="7">
          <VTable class="permit-table cu-mobile-cards" density="comfortable">
            <thead>
              <tr>
                <th>Salidas autorizadas</th>
                <th class="text-right">Arancel por menor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tramos" :key="row.trips">
                <td data-label="Salidas autorizadas">
                  {{ row.trips }} {{ row.trips === 1 ? 'salida' : 'salidas' }}
                </td>
                <td data-label="Arancel por menor" class="text-right text-no-wrap">
                  {{ row.pesos }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCol>
      </VRow>

      <p v-else class="note-text mb-0">
        El arancel es de <strong>{{ arancelUi }}</strong> por salida y por menor. El valor de la UI
        del día no llegó en esta carga, así que la conversión a pesos no se muestra: podés hacerla
        en el
        <NuxtLink :to="localePath('/herramientas/conversor-unidad-indexada')"
          >conversor de Unidad Indexada</NuxtLink
        >.
      </p>

      <p class="note-text mt-4 mb-0 text-medium-emphasis">
        La misma cuenta, con cualquier cantidad de UI, está en el
        <NuxtLink :to="localePath('/herramientas/conversor-unidad-indexada')"
          >conversor de Unidad Indexada</NuxtLink
        >. Y si querés entender por qué el Estado cobra en UI y no en pesos, está explicado en
        <NuxtLink :to="localePath('/guias/unidad-indexada-explicada')">la guía de la UI</NuxtLink>.
      </p>
    </section>

    <!-- Quién va -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Quién tiene que ir a firmar</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Es la parte que más viajes arruina, porque se descubre tarde: el permiso lo firma quien se
        queda, no quien viaja.
      </p>

      <VTable class="permit-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>El menor viaja…</th>
            <th>Comparece</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in PERMIT_APPEARANCES" :key="row.viaja">
            <td data-label="El menor viaja…">
              <span class="font-weight-medium">{{ row.viaja }}</span>
            </td>
            <td data-label="Comparece">{{ row.comparece }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard class="note-card pa-5 mt-6" variant="flat">
        <p class="note-text mb-0">
          <strong>El menor no tiene que ir.</strong> La ficha lo dice con esas palabras: no es
          necesario que acompañe a sus padres en la tramitación. Quienes sí tienen que presentarse
          en la fecha y hora agendada son los padres otorgantes. En Montevideo se atiende
          <strong>sólo con agenda previa</strong>, salvo que ya haya pasajes con fecha anterior a la
          primera disponible; en el interior, el trámite va por las Inspectorías de Migración.
        </p>
      </VCard>
    </section>

    <!-- Carta poder -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si uno de los padres no puede firmar en persona</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Hay una variante por carta poder, y su plazo es el detalle que la hace servir o no servir:
        una carta de hace dos meses no se tira, se actualiza.
      </p>

      <VRow>
        <VCol v-for="power in PERMIT_POWERS" :key="power.donde" cols="12" md="6">
          <VCard class="fact-card pa-5 h-100" variant="flat">
            <div class="text-overline mb-1">{{ power.donde }}</div>
            <div class="fee-figure mb-2">{{ power.dias }} días</div>
            <p class="note-text mb-0">{{ power.letraChica }}</p>
          </VCard>
        </VCol>
      </VRow>

      <p class="note-text mt-5 mb-0">
        La carta otorgada afuera hay que legalizarla o apostillarla antes de traerla: cómo se hace y
        cuánto sale está en
        <NuxtLink :to="localePath('/apostillar-un-documento-uruguay')"
          >apostillar un documento</NuxtLink
        >.
      </p>
    </section>

    <!-- Documentos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los papeles, con la letra chica</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La lista corta la sabe todo el mundo; lo que hace volver a casa es el detalle de abajo. Es
        el de la ficha del caso más consultado, el del menor que viaja solo o con un solo padre.
      </p>

      <div v-for="doc in PERMIT_DOCUMENTS" :key="doc.id" class="mb-6">
        <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ doc.nombre }}</h3>
        <p class="note-text mb-0">{{ doc.detalle }}</p>
      </div>

      <p class="note-text mt-2 mb-0">
        La partida tiene que tener menos de un año de expedida, y desde 2022 es digital y gratuita:
        cómo se saca y cuándo sí tiene arancel está en
        <NuxtLink :to="localePath('/cuanto-sale-la-partida-de-nacimiento-uruguay')"
          >cuánto sale la partida de nacimiento</NuxtLink
        >.
      </p>
    </section>

    <!-- Vigencia -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto dura, y qué pasa si te arrepentís</h2>
      <p class="body-text mb-3">
        El permiso vale <strong>hasta {{ PERMIT_MAX_VALIDITY_MONTHS }} meses</strong> —el plazo lo
        fijan los padres dentro de ese techo— y puede cubrir más de un viaje: en el mismo trámite se
        indica cuántas salidas se autorizan y con qué persona mayor de edad. El arancel sube con
        cada salida pedida, no con el plazo.
      </p>
      <VCard class="warn-card pa-5" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-gavel" color="warning" class="mr-3 mt-1" />
          <p class="note-text mb-0">
            <strong>Firmado, no se deshace solo.</strong> La ficha es textual: «{{
              PERMIT_REVOCATION
            }}» Si la relación cambia después de firmar, la vía es judicial, no una gestión en el
            mostrador.
          </p>
        </div>
      </VCard>
    </section>

    <!-- Variantes -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los doce tipos de permiso</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Si tu caso no es el simple, existe una variante con requisitos propios. El buscador oficial
        las muestra de a una; estas son las doce que enumera la ficha general, para que sepas por
        cuál preguntar.
      </p>
      <VRow>
        <VCol v-for="variant in PERMIT_VARIANTS" :key="variant" cols="12" sm="6" md="4">
          <div class="variant-item">
            <VIcon icon="mdi-file-document-outline" size="small" class="mr-2" />{{ variant }}
          </div>
        </VCol>
      </VRow>
    </section>

    <!-- Lo que no publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Dos cifras que acá no vas a encontrar</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Circulan y no las publicamos: la fuente que las daba ya no está en pie o no es la que cobra.
      </p>
      <VCard
        v-for="item in PERMIT_UNPUBLISHED"
        :key="item.dato"
        class="unpublished-card pa-5 mb-4"
        variant="flat"
      >
        <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ item.dato }}</h3>
        <p class="note-text mb-0">{{ item.porQue }}</p>
      </VCard>
    </section>

    <!-- La unidad intermedia, antes de las preguntas: mismo corte que FaqSection (ver
         docs/seo/adsense-growth-loop.md, 31/10/2026). Sólo dibuja en densidad normal. -->
    <AdSlot placement="in-article" class="mb-6" />
    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="faq in faqs" :key="faq.question" :title="faq.question">
          <VExpansionPanelText>{{ faq.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Seguir -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Antes de viajar</h2>
      <div class="d-flex flex-wrap ga-2">
        <VChip
          v-for="link in RELATED"
          :key="link.to"
          :to="localePath(link.to)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">mdi-link-variant</VIcon>{{ link.label }}
        </VChip>
      </div>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-2">Fuentes</h2>
      <p class="sources-note text-medium-emphasis mb-3">
        Todo lo de arriba sale de las fichas oficiales del trámite y de la norma que lo habilita,
        leídas el {{ verificado }}. El arancel está en unidades indexadas: el monto en pesos de esta
        página se calcula con el valor que el sitio lee del Banco Central, no está escrito a mano.
        Si vas a hacer el trámite, confirmá el importe y la agenda en la ficha.
      </p>
      <ul class="sources-list">
        <li v-for="source in PERMIT_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ExchangeRate } from '~/types/api'
import { formatUYU } from '~/utils/format'
import { dayLabelEs, indicatorFromSlug, liveIndicatorReading } from '~/utils/indicators'
import {
  PERMIT_APPEARANCES,
  PERMIT_DOCUMENTS,
  PERMIT_FEE_UI,
  PERMIT_MAX_VALIDITY_MONTHS,
  PERMIT_POWERS,
  PERMIT_REVOCATION,
  PERMIT_SOURCES,
  PERMIT_TRIP_STEPS,
  PERMIT_UNPUBLISHED,
  PERMIT_VARIANTS,
  PERMIT_VERIFIED_AT,
  PERMIT_WAIVERS,
  permitFaq,
  permitFeeInPesos,
} from '~/utils/minorTravelPermit'

const localePath = useLocalePath()
const { getProcessedExchangeData } = useApiService()

// Misma lectura que /herramientas/conversor-unidad-indexada y /indicadores/unidad-indexada: el
// arancel oficial está en UI, así que el peso del día sale del BCU y nunca de este archivo.
const indicator = indicatorFromSlug('unidad-indexada')!
const { data: live } = await useAsyncData('permiso-menor-ui', async () => {
  const result = await getProcessedExchangeData('')
  const rows = (result?.exchangeData ?? []) as ExchangeRate[]
  return liveIndicatorReading(rows, indicator)
})

const arancelUi = `${PERMIT_FEE_UI.toLocaleString('es-UY')} UI`
const valorUi = computed(() => (live.value ? formatUYU(live.value.value, 4) : null))
const valorUiDia = computed(() => (live.value?.date ? dayLabelEs(live.value.date) : null))

/** El arancel de una salida, en pesos de hoy. `null` si la UI no llegó: no se publica un cero. */
const arancelHoy = computed(() => {
  const amount = permitFeeInPesos(live.value?.value, 1)
  return amount === null ? null : formatUYU(amount, 2)
})

const tramos = computed(() =>
  PERMIT_TRIP_STEPS.map(trips => {
    const amount = permitFeeInPesos(live.value?.value, trips)
    return { trips, pesos: amount === null ? '—' : formatUYU(amount, 2) }
  })
)

const faqs = computed(() => permitFaq(arancelHoy.value))

const FECHA = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const verificado = FECHA.format(new Date(`${PERMIT_VERIFIED_AT}T00:00:00Z`))

const RELATED = [
  { to: '/cuanto-sale-el-pasaporte-uruguayo', label: 'Cuánto sale el pasaporte' },
  { to: '/cuanto-sale-la-partida-de-nacimiento-uruguay', label: 'Cuánto sale la partida' },
  { to: '/apostillar-un-documento-uruguay', label: 'Apostillar un documento' },
  { to: '/llevar-el-auto-a-brasil-o-argentina', label: 'Llevar el auto al exterior' },
  { to: '/declarar-dinero-en-efectivo-uruguay', label: 'Declarar efectivo' },
  { to: '/herramientas/calculadora-presupuesto-viaje', label: 'Presupuesto del viaje' },
]

const canonicalUrl = 'https://cambio-uruguay.com/permiso-de-menor-para-viajar-uruguay'
// 58 caracteres con el sufijo de marca que agrega `titleTemplate`, dentro de los ~60 que publica
// Google: la respuesta («con pasaporte uruguayo no hace falta») no entra en el título sin pasarse,
// así que el título se queda con la consulta y la pregunta por la plata, y la respuesta abre la
// descripción, que es el otro renglón del snippet y el que decide el clic.
const title = 'Permiso de menor para viajar: cuánto sale'
// La descripción arranca por el dato que cambia la decisión y cierra con el número del día, que es
// lo que la regla medida de este sitio pide: una cifra concreta y no una promesa de explicar algo.
const description = computed(
  () =>
    `Con pasaporte uruguayo vigente, o viajando con ambos padres, el menor no necesita permiso. En los demás casos sale ${arancelUi} por salida${
      arancelHoy.value ? ` (${arancelHoy.value} hoy)` : ''
    } y lo firma el padre que no viaja.`
)

defineOgImageComponent('Cambio', {
  title: 'Permiso de menor para salir del país',
  subtitle: `Con pasaporte uruguayo no se exige · ${arancelUi} por salida`,
  tag: 'MIGRACIÓN',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: title,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: () => description.value,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'permiso de menor uruguay, permiso para viajar con menores uruguay, cuanto sale el permiso de menor, permiso de menor migracion uruguay, menor viaja con un solo padre uruguay, carta poder permiso de menor, permiso de menor pasaporte uruguayo, salida del pais menores uruguay, dnm permiso menor, permiso de menor agenda',
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
                name: 'Trámites y documentos',
                item: 'https://cambio-uruguay.com/temas/tramites-y-documentos-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Permiso de menor para viajar',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.value.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: PERMIT_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: PERMIT_SOURCES.map(source => ({
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
.permit-page {
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
.body-text,
.callout-text,
.note-text {
  margin-top: 0;
  line-height: 1.6;
  max-width: 72ch;
}
.fee-figure {
  margin-top: 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.25;
  color: rgb(var(--v-theme-primary));
}

.answer-card,
.note-card,
.warn-card,
.fact-card,
.fee-card,
.unpublished-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.answer-card,
.fee-card {
  background: rgba(var(--v-theme-primary), 0.06);
}
.note-card {
  background: rgba(var(--v-theme-info), 0.06);
}
.warn-card {
  background: rgba(var(--v-theme-warning), 0.06);
}

.variant-item {
  display: flex;
  align-items: flex-start;
  line-height: 1.5;
  padding: 0.5rem 0;
}

.permit-table :deep(th) {
  white-space: nowrap;
}
.permit-table :deep(td) {
  vertical-align: top;
}

.sources-list {
  margin-top: 0;
  padding-left: 1.2rem;
  max-width: 80ch;
}
.sources-list li {
  margin-bottom: 0.6rem;
  line-height: 1.5;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.sources-list a:hover {
  text-decoration: underline;
}

.faq-panels {
  border-radius: 14px;
  overflow: hidden;
}
</style>
