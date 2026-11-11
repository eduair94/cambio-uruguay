<template>
  <div class="trm-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-trademark</VIcon>
              Emprender
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Registrar una marca en Uruguay: la tasa va por clase
            </h1>
            <p class="text-body-1 trm-lead">
              No hay un precio del trámite. La DNPI cobra
              <strong>una tasa por cada clase</strong> de la Clasificación de Niza que se
              reivindique, y la tasa unitaria cambia según la marca sea
              <strong>denominativa</strong> (sólo el nombre) o
              <strong>emblemática o mixta</strong> (con logo). Una clase denominativa sale
              <strong>{{ money(feeUyu('solicitud-denominativa')) }}</strong> y la misma marca con
              logo <strong>{{ money(feeUyu('solicitud-mixta')) }}</strong
              >, que son exactamente un 40 % más.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Cuánto sale registrar una marca en Uruguay, con la tabla de tasas de la DNPI y los plazos de la ley"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Las cifras en UI son las del artículo 99 de la Ley 17.011, en la redacción del
              artículo 392 de la Ley 18.719. Los pesos son la conversión que la propia DNPI publica
              con el valor de la UI del {{ uiDateDisplay }} ({{ uiValueDisplay }}), así que cambian
              el primer día de cada mes. Las fuentes se abrieron una por una el
              {{ verifiedDisplay }}.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. La cuenta, con las clases de quien lee -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuánto suman las tasas de tu registro</h2>
            <VCard variant="tonal" class="pa-4">
              <VRow dense>
                <VCol cols="12" sm="6">
                  <VSelect
                    v-model="kind"
                    :items="kindItems"
                    label="Tipo de marca"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="classesInput"
                    label="Clases de Niza que reivindicás"
                    type="number"
                    inputmode="numeric"
                    min="1"
                    max="45"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
              </VRow>
              <VRow dense class="mt-1">
                <VCol cols="12" sm="6">
                  <VSwitch
                    v-model="withTitle"
                    color="primary"
                    density="comfortable"
                    hide-details
                    label="Sumar la tasa del título"
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VSwitch
                    v-model="pyme"
                    color="primary"
                    density="comfortable"
                    hide-details
                    label="Tengo certificado Pyme vigente"
                  />
                </VCol>
              </VRow>
              <p class="trm-result text-body-1 mt-4 mb-0">
                Las tasas suman <strong>{{ money(quote.totalUyu) }}</strong> ({{
                  uiLabel(quote.totalUi)
                }}): {{ money(uiToUyu(quote.firstClassUi)) }} la primera clase<span
                  v-if="quote.extraClassesUi > 0"
                >
                  más {{ money(uiToUyu(quote.extraClassesUi)) }} por las
                  {{ quote.classes - 1 }} clases adicionales</span
                ><span v-if="quote.titleUi > 0">
                  más {{ money(uiToUyu(quote.titleUi)) }} del título</span
                ><span v-if="quote.pymeDiscountUi > 0">
                  y menos {{ money(uiToUyu(quote.pymeDiscountUi)) }} del descuento Pyme</span
                >.
              </p>
              <p class="trm-note text-body-2 text-medium-emphasis mb-0">
                Es una suma de tasas publicadas, no un presupuesto: no incluye el honorario de un
                agente de la propiedad industrial ni de un abogado, que no son tasas y que ningún
                organismo publica.
              </p>
            </VCard>
          </section>

          <!-- 2. La tabla -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">La tabla de tasas de marcas</h2>
            <VTable class="trm-table cu-mobile-cards" density="comfortable">
              <thead>
                <tr>
                  <th>Trámite</th>
                  <th class="text-right">UI</th>
                  <th class="text-right">Pesos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="fee in TRADEMARK_FEES" :key="fee.id">
                  <td data-label="Trámite">
                    {{ fee.label }}
                    <span v-if="fee.note" class="d-block text-caption text-medium-emphasis">{{
                      fee.note
                    }}</span>
                  </td>
                  <td data-label="UI" class="text-right">{{ uiFigure(fee.ui) }}</td>
                  <td data-label="Pesos" class="text-right">{{ money(uiToUyu(fee.ui)) }}</td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-body-2 text-medium-emphasis trm-prose">
              La tabla oficial trae además las marcas colectivas, las de certificación o garantía,
              las denominaciones de origen y toda la actuación en patentes, que es otro trámite y
              otra ley (la 17.164). Acá están las filas del registro de una marca común.
            </p>
          </section>

          <!-- 3. Lo que ya no se paga -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Dos tasas que ya no se cobran</h2>
            <p class="text-body-1 trm-lead">
              Es lo que más se publica mal sobre este trámite: los resúmenes siguen listando la
              búsqueda de antecedentes y la publicación en el Boletín como dos costos del registro,
              y la tabla vigente marca una como suprimida y la otra como no cobrada.
            </p>
            <VAlert
              v-for="item in TRADEMARK_NOT_CHARGED"
              :key="item.id"
              class="trm-alert"
              variant="tonal"
              type="success"
              density="comfortable"
            >
              <p class="trm-alert-title font-weight-bold mb-0">{{ item.label }}</p>
              <p class="trm-alert-body text-body-2 mb-0">{{ item.detail }}</p>
            </VAlert>
          </section>

          <!-- 4. Los plazos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Los plazos que fija la ley</h2>
            <ul class="trm-list text-body-1">
              <li>
                <strong>Dura {{ TRADEMARK_TERM_YEARS }} años</strong> y es indefinidamente renovable
                por períodos iguales (Ley 17.011, art. 18).
              </li>
              <li>
                La renovación se pide <strong>dentro de los seis meses previos</strong> al
                vencimiento, y después hay un <strong>plazo de gracia de seis meses</strong> a
                contar del día siguiente (art. 18, redacción del art. 193 de la Ley 18.172). Entrar
                en la gracia <strong>triplica la tasa</strong>:
                {{ money(feeUyu('renovacion-gracia')) }} contra
                {{ money(feeUyu('renovacion-denominativa')) }}.
              </li>
              <li>
                Al renovar, las clases, productos o servicios del registro anterior que
                <strong>no se vuelvan a reivindicar se tienen por renunciados</strong> (art. 18).
              </li>
              <li>
                Un tercero con marca idéntica o semejante tiene
                <strong>{{ TRADEMARK_OPPOSITION_DAYS }} días corridos</strong> para oponerse,
                contados desde el día siguiente a la publicación en el Boletín de la Propiedad
                Industrial (art. 23). Oponerse cuesta {{ money(feeUyu('oposicion')) }} por clase.
              </li>
              <li>
                <strong>El uso de la marca registrada es obligatorio</strong>: el registro puede
                cancelarse si no se usó en los {{ TRADEMARK_NON_USE_YEARS }} años consecutivos
                siguientes a la concesión, o si el uso se interrumpió por más de cinco años seguidos
                (art. 19, redacción del art. 187 de la Ley 19.149). La prueba del uso le corresponde
                al titular, pero <strong>para renovar no se exige prueba de uso</strong>.
              </li>
            </ul>
          </section>

          <!-- 5. Pyme -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">El descuento Pyme</h2>
            <p class="text-body-1 trm-lead">
              La página del trámite declara un
              <strong
                >{{ Math.round(PYME_DISCOUNT * 100) }} % de descuento en las tasas de
                registro</strong
              >
              para quien tenga certificado Pyme, que se consulta en DINAPYME antes de presentar. Con
              ese descuento, una clase denominativa pasa de
              {{ money(feeUyu('solicitud-denominativa')) }} a
              {{ money(uiToUyu(feeUi('solicitud-denominativa') * (1 - PYME_DISCOUNT))) }}.
            </p>
            <p class="text-body-2 text-medium-emphasis trm-prose">
              La fuente dice «tasas de registro» y no nombra ninguna otra fila, así que la cuenta de
              arriba descuenta la solicitud y cobra entero el título y los trámites posteriores.
              Estirar un descuento más allá de lo que dice su fuente es inventar una cifra con forma
              de cita.
            </p>
          </section>

          <!-- 6. Cómo se hace -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cómo se presenta</h2>
            <ul class="trm-list text-body-1">
              <li>
                Es <strong>en línea</strong>, por el sistema de presentación del MIEM, con usuario
                web registrado; la tasa se paga antes de completar el formulario.
              </li>
              <li>
                El titular, uruguayo o extranjero, necesita
                <strong>domicilio constituido en Uruguay</strong>.
              </li>
              <li>
                Hay que saber <strong>qué clase o clases de Niza</strong> se van a proteger. Es la
                única parte donde una equivocación cuesta el registro entero, y acá no se decide por
                nadie.
              </li>
              <li>
                El logo va en jpg, tif, tiff o jpeg, hasta <strong>512 KB</strong>, entre 150 y 300
                dpi y con medidas entre 3×2 y 6×8 cm.
              </li>
              <li>
                Si actúa un representante, hace falta
                <strong>carta poder con certificación notarial</strong> de firmas, salvo que sea
                agente de la propiedad industrial; los poderes del exterior van apostillados o
                legalizados y traducidos si corresponde. No se aceptan poderes para pleitos.
              </li>
              <li>
                La <strong>búsqueda fonética previa</strong> conviene hacerla igual: no cuesta nada
                y es lo que evita presentar contra una marca ya registrada.
              </li>
            </ul>
            <p class="text-body-2 text-medium-emphasis trm-prose">
              Esta página explica qué cobra el Estado y qué plazos fija la ley; no es asesoramiento
              en propiedad industrial. Un caso concreto —una marca parecida ya registrada, una
              oposición recibida, una marca que se usa en varios rubros— se consulta con un agente
              de la propiedad industrial o en la propia DNPI.
            </p>
          </section>

          <!-- 7. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.question">
                <VExpansionPanelTitle>{{ faq.question }}</VExpansionPanelTitle>
                <VExpansionPanelText>{{ faq.answer }}</VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 8. Fuentes -->
          <section class="mb-4">
            <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
            <ul class="trm-list">
              <li v-for="source in TRADEMARK_SOURCES" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
              </li>
            </ul>
          </section>

          <VDivider class="mb-4" />

          <section>
            <h2 class="text-h6 font-weight-bold mb-3">Seguí por acá</h2>
            <ul class="trm-list">
              <li>
                <NuxtLink :to="localePath('/que-empresa-abrir-uruguay')">
                  Qué empresa abrir
                </NuxtLink>
                — la forma jurídica según cuánto facturás, que es el paso de antes.
              </li>
              <li>
                <NuxtLink :to="localePath('/facturar-en-monotributo-uruguay')">
                  Facturar en monotributo
                </NuxtLink>
                — talonario o e-factura, y cuál te obliga la DGI.
              </li>
              <li>
                <NuxtLink :to="localePath('/guias/vender-por-mercado-libre-uruguay')">
                  Vender por Mercado Libre
                </NuxtLink>
                — comisiones y envíos cuando la marca ya tiene con qué venderse.
              </li>
            </ul>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { VTable } from 'vuetify/components'
import {
  PYME_DISCOUNT,
  TRADEMARK_FEES,
  TRADEMARK_NON_USE_YEARS,
  TRADEMARK_NOT_CHARGED,
  TRADEMARK_OPPOSITION_DAYS,
  TRADEMARK_PATH,
  TRADEMARK_SOURCES,
  TRADEMARK_TERM_YEARS,
  TRADEMARK_UI_VALUE,
  TRADEMARK_UI_VALUE_AT,
  TRADEMARK_VERIFIED_AT,
  type TrademarkKind,
  trademarkFeeUi,
  trademarkFeeUyu,
  trademarkQuote,
  uiToUyu,
} from '~/utils/trademarkRegistry'

const localePath = useLocalePath()

const kind = ref<TrademarkKind>('denominativa')
const classesInput = ref('1')
const withTitle = ref(false)
const pyme = ref(false)

const kindItems = [
  { title: 'Denominativa (sólo el nombre)', value: 'denominativa' },
  { title: 'Emblemática o mixta (con logo)', value: 'mixta' },
]

const quote = computed(() =>
  trademarkQuote({
    kind: kind.value,
    classes: Number(classesInput.value),
    withTitle: withTitle.value,
    pyme: pyme.value,
  })
)

const feeUi = trademarkFeeUi
const feeUyu = trademarkFeeUyu

const pesos = new Intl.NumberFormat('es-UY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const money = (value: number): string => `$${pesos.format(value)}`

const uiFmt = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 5 })
const uiFigure = (value: number): string => uiFmt.format(value)
const uiLabel = (value: number): string => `${uiFigure(value)} UI`

const uiValueDisplay = `$${new Intl.NumberFormat('es-UY', { minimumFractionDigits: 3 }).format(
  TRADEMARK_UI_VALUE
)}`

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const uiDateDisplay = displayDate(TRADEMARK_UI_VALUE_AT)
const verifiedDisplay = displayDate(TRADEMARK_VERIFIED_AT)

const faqs = [
  {
    question: '¿Cuánto sale registrar una marca en Uruguay?',
    answer:
      'No hay un precio único: la tasa se cobra por cada clase de la Clasificación de Niza. Con la tabla de la DNPI de noviembre de 2026, una clase de marca denominativa sale $7.494,12 y una de marca emblemática o mixta $10.491,77. Cada clase adicional agrega $4.496,47 en la denominativa y $5.995,30 en la mixta, y el título del registro concedido tiene su propia tasa de $2.997,65.',
  },
  {
    question: '¿Por qué las tasas cambian todos los meses?',
    answer:
      'Porque el artículo 99 de la Ley 17.011, en la redacción del artículo 392 de la Ley 18.719, las fija en Unidades Indexadas y no en pesos. La DNPI publica mes a mes la misma tabla convertida con el valor de la UI del primer día del mes, así que la cifra en UI no se mueve y la cifra en pesos sí.',
  },
  {
    question: '¿Hay que pagar la búsqueda de antecedentes?',
    answer:
      'No. El numeral del artículo 99 que le ponía tasa a la búsqueda quedó suprimido por el artículo 138 de la Ley 19.670, y la página del trámite agrega que desde el 24 de enero de 2024 la búsqueda fonética se hace sólo desde la base pública de marcas. La publicación en el Boletín de la Propiedad Industrial figura en la tabla con precio, pero en la misma fila aclara que no se cobra por la circular 3/2018.',
  },
  {
    question: '¿Cuánto dura una marca registrada?',
    answer:
      'Diez años, indefinidamente renovables por períodos iguales (Ley 17.011, art. 18). La renovación se pide dentro de los seis meses previos al vencimiento y después queda un plazo de gracia de seis meses contados desde el día siguiente. Renovar en la gracia cuesta el triple: $22.482,37 por clase contra $7.494,12.',
  },
  {
    question: '¿Puedo perder la marca si no la uso?',
    answer:
      'Sí. El artículo 19 de la Ley 17.011 dice que el uso de la marca registrada es obligatorio, y el registro puede cancelarse si no se usó en los cinco años consecutivos siguientes a la concesión o si el uso se interrumpió por más de cinco años seguidos. La prueba del uso le corresponde al titular, aunque para renovar no se exige prueba de uso.',
  },
  {
    question: '¿Cuánto tiempo tiene otro para oponerse a mi marca?',
    answer:
      'Treinta días corridos contados desde el día siguiente a la publicación de la solicitud en el Boletín de la Propiedad Industrial (Ley 17.011, art. 23). Presentar una oposición tiene su propia tasa: $10.491,77 por clase con la tabla de noviembre de 2026.',
  },
  {
    question: '¿Las Pymes pagan menos?',
    answer:
      'La página del trámite declara un 80 % de descuento en las tasas de registro para quien tenga certificado Pyme, que se consulta previamente en DINAPYME. Con ese descuento, una clase denominativa pasa de $7.494,12 a $1.498,82.',
  },
]

const canonicalUrl = `https://cambio-uruguay.com${TRADEMARK_PATH}`

// El título y la descripción van como literales EN LA PÁGINA, que es la forma que leen
// `seoTitleBudget.test.ts` y `seoDescriptionBudget.test.ts` sin ejecutar la app. El costo es que las
// dos cifras de la descripción pueden quedar atrás de la tabla, y eso lo vigila
// `trademarkRegistry.test.ts`, que las recalcula desde el catálogo.
const title = 'Registrar una marca: la tasa va por clase'
const description =
  'La DNPI cobra por clase de Niza: $7.494 la marca denominativa y $10.492 la mixta. La búsqueda previa ya no se paga y renovar tarde cuesta el triple.'

defineOgImageComponent('Cambio', {
  title: 'Registrar una marca en Uruguay',
  subtitle: 'La tasa va por clase de Niza, y el logo cuesta 40 % más',
  tag: 'EMPRENDER',
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
        'registrar una marca uruguay, cuanto sale registrar una marca, tasas dnpi marcas, clasificacion de niza uruguay, marca denominativa o mixta, renovar una marca uruguay, oposicion de marca uruguay, ley 17011 marcas',
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
                name: 'Emprender y tener una empresa',
                item: 'https://cambio-uruguay.com/temas/emprender-y-empresa-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Registrar una marca en Uruguay',
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
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Vuetify 4 no anula el margen de los bloques de texto, así que cada párrafo y cada lista declara
   el suyo: dentro de una caja con padding el 1em del navegador no colapsa y se ve como un hueco. */
.trm-lead {
  margin-top: 0;
  margin-bottom: 0;
}

.trm-prose {
  margin-top: 1rem;
  margin-bottom: 0;
}

.trm-result {
  margin-bottom: 0;
}

.trm-note {
  margin-top: 0.75rem;
}

.trm-alert {
  margin-top: 1rem;
}

.trm-alert-title {
  margin-top: 0;
}

.trm-alert-body {
  margin-top: 0.35rem;
}

.trm-list {
  margin-top: 1rem;
  margin-bottom: 0;
  padding-left: 1.25rem;
}

.trm-list li {
  margin-top: 0.5rem;
}

.trm-table {
  margin-top: 1rem;
}
</style>
