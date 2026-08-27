<template>
  <VContainer class="bcu-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">BANCO CENTRAL</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Cotización del BCU: qué publica y por qué no es la del cambio
      </h1>
      <p class="lead mb-6">
        El Banco Central publica <strong>una sola cotización</strong> por moneda, no dos. Es el
        precio del mercado <strong>mayorista entre instituciones</strong>: el dólar fondo de cierre
        es el <strong>promedio ponderado de las operaciones efectivamente realizadas</strong> en el
        mercado que opera BEVSA. La casa de cambio, en cambio, publica dos precios —uno para
        comprarte y otro para venderte— y la diferencia entre ambos es su margen. Por eso nunca van
        a coincidir: no son el mismo precio.
      </p>

      <VCard class="rule-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-bank-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">La nota al pie que lo explica todo</div>
            <p class="callout-text mb-0">
              «A partir del 2 de enero de 2008, de acuerdo a lo dispuesto por la
              <strong>Comunicación 2008/001</strong>, el tipo de cambio “dólar fondo” de cierre del
              día se calcula como el
              <strong>promedio ponderado de las operaciones efectivamente realizadas</strong> en el
              mercado que opera BEVSA. Para el dólar billete, peso argentino billete y real billete
              se sigue un criterio consistente con el anterior, informando
              <strong>una cotización única</strong>.» — BCU, Área de Estadísticas Económicas.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Qué publica el BCU -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué publica el BCU, exactamente</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Desde enero de 2017 el BCU tiene un sistema de consulta que permite pedir las cotizaciones
        del período que uno quiera, filtrar por moneda y elegir entre
        <strong>cotizaciones interbancarias</strong> o <strong>arbitrajes internacionales</strong>,
        y descargar el resultado en varios formatos. Son las dos familias, y ninguna de las dos es
        un precio de mostrador.
      </p>

      <VTable class="bcu-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Serie</th>
            <th>Qué es</th>
            <th>Cómo se informa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="serie in SERIES_BCU" :key="serie.key">
            <td data-label="Serie">
              <span class="font-weight-medium">{{ serie.nombre }}</span>
            </td>
            <td data-label="Qué es">
              {{ serie.que }}
              <span class="d-block text-caption text-medium-emphasis mt-1">
                {{ serie.detalle }}
              </span>
            </td>
            <td data-label="Cómo se informa">
              <VChip color="info" size="small" variant="tonal">
                {{ serie.puntas === 'una' ? 'Una cotización' : 'Compra y venta' }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- BCU vs mostrador -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">BCU contra mostrador, punto por punto</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Ninguna de las tres diferencias es un defecto de nadie: son precios de mercados distintos,
        con contrapartes distintas y en momentos distintos.
      </p>

      <VTable class="bcu-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th />
            <th>Cotización del BCU</th>
            <th>Casa de cambio o banco</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in BCU_VS_MOSTRADOR" :key="fila.key">
            <td data-label="Eje">
              <span class="font-weight-medium">{{ fila.eje }}</span>
            </td>
            <td data-label="BCU">{{ fila.bcu }}</td>
            <td data-label="Mostrador">{{ fila.mostrador }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-alert-circle-outline" color="warning" size="18" class="mr-1" />
          <strong>El BCU no te vende dólares.</strong> No es una casa de cambio: es la autoridad
          monetaria y el supervisor. Si querés el precio al que sí podés operar hoy, mirá el
          <NuxtLink :to="localePath('/')">comparador de casas de cambio</NuxtLink> o la
          <NuxtLink :to="localePath('/pizarra')">pizarra en vivo</NuxtLink>. Y si lo que buscás es
          saber si una entidad está habilitada, eso está en las
          <NuxtLink :to="localePath('/advertencias-bcu')">advertencias del BCU</NuxtLink>.
        </p>
      </VCard>
    </section>

    <!-- La regla de la DGI -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        La cotización que sí es obligatoria: la que pide la DGI
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Acá la cotización interbancaria deja de ser una referencia y pasa a ser la regla. La DGI lo
        dice en cuatro frases:
      </p>

      <VCard class="rule-card pa-5 pa-md-6 mb-6" variant="flat">
        <ul class="rule-list mb-0">
          <li>«{{ DGI_REGLA.pesos }}»</li>
          <li>«{{ DGI_REGLA.conversion }}»</li>
          <li>«{{ DGI_REGLA.sinCotizacion }}»</li>
          <li>«{{ DGI_REGLA.arbitraje }}»</li>
        </ul>
      </VCard>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        Qué día aplica, según cuándo hiciste la operación
      </h3>
      <p class="section-intro text-medium-emphasis mb-4">
        La regla arranca <strong>siempre</strong> en el día anterior a la operación, nunca en el día
        de la operación, y retrocede mientras ese día no tenga cotización. El caso que más se
        equivoca a mano es el lunes.
      </p>

      <VTable class="bcu-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Operación</th>
            <th>Cotización que aplica</th>
            <th>Por qué</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in ejemplos" :key="fila.operacion">
            <td data-label="Operación" class="text-no-wrap">{{ fila.operacionLabel }}</td>
            <td data-label="Cotización" class="text-no-wrap">
              <span class="font-weight-medium">{{ fila.cotizacionLabel }}</span>
            </td>
            <td data-label="Por qué" class="text-body-2">{{ fila.porque }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-scale-balance" color="warning" size="18" class="mr-1" />
          <strong>Un feriado se comporta igual que un domingo:</strong> no hay cotización, y hay que
          seguir retrocediendo hasta el último día hábil anterior. Cuáles son y cuáles se corren al
          lunes está en
          <NuxtLink :to="localePath('/feriados-que-se-corren-uruguay')">
            qué feriados se corren al lunes
          </NuxtLink>
          — este sitio no publica el calendario completo, así que la tabla de arriba sólo resuelve
          los fines de semana.
        </p>
      </VCard>

      <VCard variant="flat" class="limit-card pa-5 pa-md-6 mt-6">
        <div class="d-flex align-start">
          <VIcon icon="mdi-help-circle-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que no vas a encontrar acá</div>
            <p class="callout-text mb-0">
              <strong>Si va la punta compradora o la vendedora.</strong> El texto de la DGI dice «el
              tipo de cambio interbancario» y no aclara cuál de las dos; la serie que la propia DGI
              publica es la de <em>compra billete</em>. Cuál corresponde a tu caso es una decisión
              contable y no la contestamos: preguntale a tu contador y verificá el número en la
              fuente oficial, que está enlazada abajo.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Preguntas frecuentes -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="faq in BCU_COTIZACION_FAQ" :key="faq.question">
          <VExpansionPanelTitle class="font-weight-medium">
            {{ faq.question }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="faq-answer mb-0">{{ faq.answer }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado contra los documentos del BCU y de la DGI el {{ verifiedAt }}. Esta página no
        publica ninguna cotización del Banco Central: este sitio releva el mostrador de las casas de
        cambio, no la serie del BCU, y presentar un número ajeno como si fuera del BCU sería el
        mismo error que la página explica. Para el valor del día, el enlace va al BCU.
      </p>
      <ul class="sources-list">
        <li v-for="s in BCU_COTIZACION_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span class="text-medium-emphasis"> — {{ s.publisher }}</span>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BCU_COTIZACION_FAQ,
  BCU_COTIZACION_SOURCES,
  BCU_COTIZACION_VERIFIED_AT,
  BCU_VS_MOSTRADOR,
  DGI_REGLA,
  SERIES_BCU,
  diaDeCotizacionDgi,
} from '~/utils/cotizacionBcu'

const localePath = useLocalePath()

const LARGO = new Intl.DateTimeFormat('es-UY', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const formatoLargo = (iso: string) => LARGO.format(new Date(`${iso}T00:00:00Z`))

// Una semana fija de ejemplo, no la semana en curso: la tabla enseña la REGLA, y una fecha estable
// se puede verificar contra un calendario y no cambia el HTML servido todos los días (ni arriesga
// que el servidor y el navegador calculen semanas distintas al cruzar la medianoche).
const SEMANA_EJEMPLO = ['2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25'] as const

const PORQUE: Record<string, string> = {
  '2026-08-22': 'El día anterior es viernes y sí cotiza: la regla termina ahí.',
  '2026-08-23': 'Su día anterior es sábado y no cotiza, así que se retrocede hasta el viernes.',
  '2026-08-24':
    'Su día anterior es domingo. No cotiza, y el sábado tampoco: el último día hábil anterior es el viernes.',
  '2026-08-25': 'El día anterior es lunes y sí cotiza: no hace falta retroceder.',
}

const ejemplos = SEMANA_EJEMPLO.map(operacion => {
  const resultado = diaDeCotizacionDgi(operacion)
  return {
    operacion,
    operacionLabel: formatoLargo(operacion),
    cotizacionLabel: formatoLargo(resultado.iso),
    porque: PORQUE[operacion] ?? '',
  }
})

const verifiedAt = new Date(`${BCU_COTIZACION_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/cotizacion-del-bcu'
const title = 'Cotización del BCU: qué publica y por qué no es la del cambio'
const description =
  'El BCU informa una cotización única por moneda, no compra y venta: el dólar fondo de cierre es el promedio ponderado de las operaciones hechas en BEVSA (Comunicación 2008/001). Es el mayorista entre instituciones, no un precio de mostrador. Y para la DGI se usa el interbancario del día anterior a la operación: un lunes toma el del viernes.'

defineOgImageComponent('Cambio', {
  title: 'Cotización del BCU',
  subtitle: 'Una cotización única, no la del mostrador',
  tag: 'BCU',
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
        'cotizacion bcu, bcu cotizaciones, cotizaciones bcu, cotizacion interbancaria, dolar interbancario uruguay, dolar fondo bcu, arbitrajes bcu, comunicacion 2008/001, tipo de cambio dgi, cotizacion para declarar dgi',
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
                name: 'Cotización del BCU',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: BCU_COTIZACION_FAQ.map(f => ({
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
            citation: BCU_COTIZACION_SOURCES.map(s => ({
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
.bcu-page {
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
.note-text,
.faq-answer {
  margin-top: 0;
  line-height: 1.6;
}

.rule-card,
.note-card,
.limit-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.rule-card {
  background: rgba(var(--v-theme-primary), 0.06);
}
.note-card {
  background: rgba(var(--v-theme-warning), 0.06);
}
.limit-card {
  background: rgba(var(--v-theme-info), 0.06);
}

.rule-list {
  margin-top: 0;
  padding-left: 1.1rem;
  line-height: 1.6;
}
.rule-list li {
  margin-bottom: 8px;
}
.rule-list li:last-child {
  margin-bottom: 0;
}

.bcu-table :deep(th) {
  white-space: nowrap;
}
.bcu-table :deep(td) {
  vertical-align: top;
}

.faq-panels {
  max-width: 900px;
}

.sources-list {
  padding-left: 1.1rem;
  margin-top: 0;
}
.sources-list li {
  margin-bottom: 6px;
  line-height: 1.5;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
}
</style>
