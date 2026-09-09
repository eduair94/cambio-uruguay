<template>
  <VContainer class="primaria py-6" style="max-width: 940px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Impuesto de Primaria', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Impuesto de Primaria en Uruguay: quién lo paga y cuánto es
    </h1>

    <p class="lead mb-5">
      Es un impuesto <strong>anual</strong> sobre los inmuebles urbanos, suburbanos y rurales, lo
      cobra la DGI en <strong>{{ CUOTAS_ANUALES }} cuotas</strong> y lo paga
      <strong>quien tiene el derecho sobre el padrón</strong>, no quien vive adentro. En el
      ejercicio {{ IEP_EJERCICIO_VIGENTE }} queda exonerado el padrón cuyo valor imponible sea menor
      a <strong>{{ pesos(MONTO_EXONERADO_VIGENTE) }}</strong
      >.
    </p>

    <VCard variant="flat" class="note-card pa-4 pa-md-5 mb-8">
      <div class="d-flex align-start">
        <VIcon icon="mdi-home-city-outline" color="primary" class="mr-3 mt-1" />
        <div>
          <div class="text-overline mb-2">No es el impuesto del que vive en la casa</div>
          <p class="note-text mb-0">
            Primaria no es un tributo domiciliario como UTE o OSE, que se pagan por lo que consumís.
            El contribuyente es el propietario, el poseedor, el promitente comprador o el
            usufructuario del padrón. Si alquilás y el contrato pretende trasladártelo, es una
            cláusula para discutir <em>antes</em> de firmar: mirá
            <NuxtLink :to="localePath('/primer-alquiler-uruguay')"
              >qué revisar en el contrato</NuxtLink
            >.
          </p>
        </div>
      </div>
    </VCard>

    <!-- Quiénes -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Quiénes son contribuyentes</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        El Texto Ordenado de la DGI, Título 13, artículo 2, nombra cuatro figuras. Con que se dé una
        alcanza:
      </p>
      <ul class="plain-list mb-4">
        <li v-for="quien in CONTRIBUYENTES" :key="quien">{{ quien }}</li>
      </ul>
      <p class="note-text mb-0">
        Si comprás, pasás a ser contribuyente <strong>el año civil siguiente</strong> al de la
        compra: quien escritura en febrero empieza a pagar el 1.º de enero del año que viene. Y en
        el otro sentido, no se puede escriturar una transmisión sin acreditar que el padrón está al
        día o exonerado.
      </p>
    </section>

    <!-- Cuánto -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Cuánto es: la escala publicada</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        La base de cálculo es el <strong>valor imponible</strong> que fija la Dirección Nacional de
        Catastro, no lo que vale la casa en el mercado ni lo que pagaste por ella. Lo tenés en la
        cédula catastral y arriba a la derecha de la propia factura del impuesto, con ese nombre.
      </p>

      <VTable density="comfortable" class="cu-mobile-cards data-table mb-3">
        <thead>
          <tr>
            <th>Valor imponible</th>
            <th class="text-right">Alícuota</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tramo in ESCALA" :key="tramo.desde">
            <td data-label="Valor imponible">
              {{
                tramo.hasta === null
                  ? `${pesos(tramo.desde)} en adelante`
                  : `${pesos(tramo.desde)} a ${pesos(tramo.hasta)}`
              }}
            </td>
            <td data-label="Alícuota" class="text-right font-weight-bold">
              {{ porcentaje(tramo.alicuota) }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="table-note text-medium-emphasis mb-4">
        Decreto 140/025, artículo 4, a valores del 1.º de enero de 2025. Son las mismas cuatro
        alícuotas que el Texto Ordenado, Título 13, artículo 4, expresa en «por mil» (1,5 · 2 · 2,5
        · 3) sobre valores de 1991; el decreto anual es el que las reexpresa en pesos de hoy.
      </p>

      <VCard variant="flat" class="gap-card pa-4 pa-md-5">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-circle-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que acá no vas a encontrar</div>
            <p class="note-text mb-2">
              <strong>Una escala {{ IEP_EJERCICIO_VIGENTE }}.</strong> La DGI ya publicó el monto
              exonerado del ejercicio nuevo, pero el decreto que reajusta los tramos sigue siendo el
              del ejercicio {{ IEP_ESCALA_EJERCICIO }}. Multiplicar los tramos por lo mismo que
              subió el exonerado daría una tabla verosímil y sería un número nuestro, no de la DGI.
            </p>
            <p class="note-text mb-0">
              <strong>Una calculadora del importe.</strong> El decreto da la alícuota de cada tramo
              pero no dice si se aplica sobre el valor entero o por escalones, y las dos lecturas
              dan cifras distintas para el mismo padrón. El importe lo liquida la DGI:
              <a
                href="https://servicios.dgi.gub.uy/serviciosenlinea/impuesto-primaria/dgi--servicios-en-linea--primaria-consulte-su-deuda"
                target="_blank"
                rel="noopener noreferrer"
                >consultalo por padrón en su servicio en línea</a
              >.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- El piso, año por año -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">El piso, ejercicio por ejercicio</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        La pregunta que llega cuando la factura aparece sin haber comprado nada: el monto exonerado
        sube todos los años, pero el valor imponible del padrón también, y en algunos barrios más
        rápido. Un padrón puede cruzar el piso sin que su dueño haya hecho nada.
      </p>
      <VTable density="compact" class="cu-mobile-cards data-table mb-3">
        <thead>
          <tr>
            <th>Ejercicio</th>
            <th class="text-right">Exonerado por debajo de</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="monto in montosDescendentes" :key="monto.ejercicio">
            <td data-label="Ejercicio">{{ monto.ejercicio }}</td>
            <td data-label="Exonerado por debajo de" class="text-right">
              {{ pesos(monto.pesos) }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="table-note text-medium-emphasis mb-0">
        Serie publicada por la DGI. Entre {{ MONTOS_EXONERADOS[0]!.ejercicio }} y
        {{ IEP_EJERCICIO_VIGENTE }} el piso pasó de {{ pesos(MONTOS_EXONERADOS[0]!.pesos) }} a
        {{ pesos(MONTO_EXONERADO_VIGENTE) }}.
      </p>
    </section>

    <!-- Exoneraciones -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Quiénes están exonerados</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        Además del piso por valor, el artículo 5 del Título 13 exonera por la condición del padrón o
        de su dueño:
      </p>
      <ul class="plain-list mb-4">
        <li v-for="exo in EXONERACIONES" :key="exo.literal">
          <strong>{{ exo.literal }})</strong> {{ exo.texto }}
        </li>
      </ul>
      <p class="note-text mb-0">
        La del literal f es la única que no se aplica sola: hay que presentar una declaración jurada
        ante la DGI dentro del plazo del ejercicio. Si todos los padrones ya están por debajo del
        monto exonerado, la propia DGI aclara que no corresponde presentarla.
      </p>
    </section>

    <!-- Cómo se paga -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Cómo y dónde se paga</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        Son {{ CUOTAS_ANUALES }} cuotas al año. La DGI expone la factura en su web durante los 20
        días previos a cada vencimiento.
      </p>
      <ul class="plain-list mb-4">
        <li v-for="canal in CANALES_DE_PAGO" :key="canal">{{ canal }}</li>
      </ul>
      <p class="note-text mb-0">
        Si sos propietario y alquilás, el impuesto es un
        <strong>gasto deducible</strong> al liquidar el IRPF por el arrendamiento, junto con la
        Contribución Inmobiliaria y la comisión de la administradora: la cuenta está en
        <NuxtLink :to="localePath('/impuestos-inversiones-uruguay')"
          >impuestos sobre inversiones y rentas</NuxtLink
        >. Y si la deuda ya viene de años, mirá
        <NuxtLink :to="localePath('/prescripcion-de-deudas-con-el-estado-uruguay')"
          >cómo prescriben las deudas con el Estado</NuxtLink
        >.
      </p>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <section class="mt-10">
      <h2 class="text-h6 font-weight-bold mb-2">Fuentes</h2>
      <p class="sources-note text-medium-emphasis mb-3">
        Todo lo de arriba sale de estas páginas, contrastadas el {{ verifiedAt }}. Ninguna cifra de
        esta página es una estimación propia.
      </p>
      <ul class="plain-list mb-0">
        <li v-for="source in IEP_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CANALES_DE_PAGO,
  CONTRIBUYENTES,
  CUOTAS_ANUALES,
  ESCALA,
  EXONERACIONES,
  IEP_EJERCICIO_VIGENTE,
  IEP_ESCALA_EJERCICIO,
  IEP_FAQ,
  IEP_SOURCES,
  IEP_VERIFIED_AT,
  MONTOS_EXONERADOS,
  MONTO_EXONERADO_VIGENTE,
} from '~/utils/primaryEducationTax'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const faq = IEP_FAQ as unknown as FaqItem[]

/** El año en curso primero: es el que se viene a buscar. */
const montosDescendentes = [...MONTOS_EXONERADOS].reverse()

const pesos = (n: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const porcentaje = (n: number): string =>
  `${(n * 100).toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`

const verifiedAt = new Date(`${IEP_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/impuesto-de-primaria-uruguay'
const title = 'Impuesto de Primaria 2026: quién paga'
const description =
  'Lo pagan propietarios, poseedores, promitentes compradores y usufructuarios, en 3 cuotas al año. En 2026 queda exonerado el padrón con valor imponible menor a $ 282.612. La escala publicada es la del Decreto 140/025: 0,15 %, 0,20 %, 0,25 % y 0,30 %. Si alquilás, no es tuyo: lo paga el propietario.'

defineOgImageComponent('Cambio', {
  title: 'Impuesto de Primaria',
  subtitle: 'Quién lo paga, desde cuándo y qué padrón queda afuera',
  tag: 'IMPUESTOS',
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
        'impuesto de primaria uruguay, impuesto de primaria 2026, quien paga el impuesto de primaria, monto exonerado impuesto de primaria, escala impuesto de primaria, decreto 140/025, consultar deuda impuesto de primaria, impuesto de primaria alquiler, exoneracion impuesto de primaria campo, valor imponible catastro uruguay',
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
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Impuesto de Primaria en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: IEP_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: IEP_SOURCES.map(s => ({
              '@type': 'Legislation',
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
/* Vuetify 4 no cero los márgenes de los bloques de texto, y un <p> que sigue a un hermano se come
   cualquier separación menor a 1em: por eso cada bloque declara el suyo. Ver app/AGENTS.md. */
.lead {
  font-size: 1.075rem;
  line-height: 1.6;
  max-width: 72ch;
  margin-top: 0;
}
.section-intro,
.note-text,
.table-note,
.sources-note {
  max-width: 76ch;
  margin-top: 0;
}
.table-note,
.sources-note {
  font-size: 0.85rem;
  line-height: 1.5;
}
.plain-list {
  margin-top: 0;
  padding-left: 1.25rem;
}
.plain-list li {
  margin-bottom: 0.5rem;
  line-height: 1.55;
  max-width: 76ch;
}
.note-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  border-radius: 12px;
}
.gap-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  border-radius: 12px;
}
.data-table {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
</style>
