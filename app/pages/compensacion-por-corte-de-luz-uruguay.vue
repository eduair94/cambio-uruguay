<!--
THESIS: después de un corte largo la gente busca «cómo reclamar la compensación a UTE», y la
respuesta real es que esa compensación NO se reclama: URSEA la calcula al cierre del semestre y
viaja como descuento en la factura. Decir eso primero es lo más útil que la página puede hacer, y
deja lugar para el reclamo que sí existe —el del problema concreto— con el único porcentaje que la
norma fija: 30 % de la facturación diaria por cada día que UTE se atrasa en contestar.
OWN-WORLD: el mecanismo paso a paso con el artículo impreso al lado de cada afirmación, la lista de
cortes que NO cuentan (la mitad que nadie cuenta) y un bloque explícito con lo que la página no
publica y por qué.
STORY: primero el no; después qué se mide y cada cuánto; después qué cortes quedan afuera; después
el reclamo que sí se hace, con sus plazos; después lo que no publicamos; y al final las fuentes.
FIRST VIEWPORT: el no, y los dos números verificados (30 % por día, 15 días hábiles).
FORM: página de derechos, hermana de /a-quien-le-reclamo-uruguay. Sin estado que el visitante edite.
-->
<template>
  <div class="outage-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-flash-alert-outline</VIcon>
              Derechos
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Compensación por corte de luz: cuándo UTE tiene que pagarte
            </h1>
            <p class="text-body-1 outage-lead">
              Empecemos por lo que más viaje ahorra: la compensación por los cortes
              <strong>no se pide</strong>. URSEA calcula los indicadores de calidad al cierre de
              cada semestre y, si UTE superó las metas, la compensación llega
              <strong>como descuento en tu factura</strong>. Son palabras de URSEA: no es necesario
              que el usuario realice trámite alguno para recibirla.
            </p>
            <p class="text-body-1 outage-lead mt-3">
              El reclamo que sí se hace es otro: el del problema concreto, y arranca en UTE. Ése
              tiene su propia compensación por demora, que es el único porcentaje que la norma
              escribe como número: si UTE no contesta en plazo, debe
              <strong>{{ retrasoPct }} % de tu facturación promedio diaria</strong> de los últimos
              {{ promedioMeses }} meses <strong>por cada día de atraso</strong>. Y pasados
              <strong>{{ esperaDias }} días hábiles</strong> el reclamo se puede llevar a URSEA.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Compensación por corte de luz en Uruguay: no se pide, se descuenta de la factura"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Artículos y plazos cotejados contra el texto del Reglamento en IMPO y las fichas de
              URSEA en gub.uy el {{ verifiedDisplay }}. El Reglamento está vigente desde 2003 y en
              aplicación desde 2006.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. Cómo llega la plata -->
          <section class="mb-8" aria-labelledby="mecanismo-title">
            <h2 id="mecanismo-title" class="text-h5 font-weight-bold mb-3">
              Cómo llega la compensación
            </h2>
            <p class="text-body-1 outage-prose mb-4">
              Las metas de calidad no se miden corte por corte: se miden por semestre y por grupo de
              suministros. Eso explica las dos cosas que más desconciertan —que un apagón largo
              puede no generar nada y que un descuento puede aparecer sin que lo hayas pedido—.
            </p>
            <ol class="outage-steps">
              <li v-for="paso in mecanismo" :key="paso.title">
                <p class="step-title">{{ paso.title }}</p>
                <p class="step-body">{{ paso.body }}</p>
                <p class="step-basis">{{ paso.basis }}</p>
              </li>
            </ol>
          </section>

          <!-- 2. Lo que no cuenta -->
          <section class="mb-8" aria-labelledby="excluidos-title">
            <h2 id="excluidos-title" class="text-h5 font-weight-bold mb-3">
              Los cortes que no cuentan
            </h2>
            <p class="text-body-1 outage-prose mb-4">
              Es la mitad que casi nunca se cuenta, y la que explica por qué después de un temporal
              con media ciudad a oscuras puede no haber compensación. Ojo con la segunda: la fuerza
              mayor no es automática para UTE, hay que declararla.
            </p>
            <VTable class="cu-mobile-cards" density="comfortable">
              <thead>
                <tr>
                  <th scope="col">Caso</th>
                  <th scope="col">Qué dice la norma</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in excluidos" :key="item.label">
                  <th scope="row" data-label="Caso">{{ item.label }}</th>
                  <td data-label="Qué dice la norma">{{ item.detail }}</td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-caption text-medium-emphasis mt-3">
              Reglamento de Calidad del Servicio de Distribución de Energía Eléctrica, arts. 13 y
              14.
            </p>
          </section>

          <!-- 3. El reclamo que sí se hace -->
          <section class="mb-8" aria-labelledby="reclamo-title">
            <h2 id="reclamo-title" class="text-h5 font-weight-bold mb-3">
              El reclamo que sí se hace, paso por paso
            </h2>
            <p class="text-body-1 outage-prose mb-4">
              Este es el camino del problema concreto: el corte que se repite, la factura que no
              cierra, el artefacto que se quemó. El orden no es decorativo —si te salteás a UTE,
              URSEA archiva la solicitud—.
            </p>
            <ol class="outage-steps">
              <li v-for="paso in reclamo" :key="paso.title">
                <p class="step-title">{{ paso.title }}</p>
                <p class="step-body">{{ paso.body }}</p>
                <p class="step-basis">{{ paso.basis }}</p>
              </li>
            </ol>
            <VAlert type="info" variant="tonal" class="mt-4">
              <p class="alert-body">
                ¿Querés saber cuánto estuvo sin luz tu barrio? El sitio integra cada 10 minutos el
                mapa público de UTE y publica los minutos sin luz por barrio, que es el dato que
                nadie más guarda:
                <NuxtLink :to="localePath('/cortes-de-luz-por-barrio-uruguay')" class="cu-link">
                  cortes de luz por barrio </NuxtLink
                >. Es nuestra medición, no la de URSEA: no sustituye el cómputo oficial del
                semestre, pero sirve para saber si lo que te pasa es tu casa o tu zona.
              </p>
            </VAlert>
          </section>

          <!-- 4. Lo que esta página no publica -->
          <section class="mb-8" aria-labelledby="no-publicado-title">
            <h2 id="no-publicado-title" class="text-h5 font-weight-bold mb-3">
              Lo que esta página no publica, y por qué
            </h2>
            <p class="text-body-1 outage-prose mb-4">
              Tres datos que mucha gente viene a buscar y que acá no vas a encontrar. No es un
              olvido: es que no los podemos sostener con una fuente vigente, y un número vencido
              sobre esto hace desistir a alguien que sí tiene derecho.
            </p>
            <ul class="outage-list">
              <li v-for="item in noPublicado" :key="item.label">
                <strong>{{ item.label }}.</strong> {{ item.detail }}
              </li>
            </ul>
          </section>

          <!-- El `FAQPage` lo arma el `@graph` de esta página, así que el componente no lo repite. -->
          <FaqSection
            :items="faqs"
            heading="Preguntas frecuentes"
            :expanded="true"
            :emit-schema="false"
          />

          <!-- 5. Fuentes -->
          <section class="mt-8" aria-labelledby="fuentes-title">
            <h2 id="fuentes-title" class="text-h5 font-weight-bold mb-3">Fuentes</h2>
            <ul class="outage-list">
              <li v-for="source in sources" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">
                  {{ source.label }}
                </a>
              </li>
            </ul>
          </section>

          <!-- 6. Seguir -->
          <section class="mt-8" aria-labelledby="seguir-title">
            <h2 id="seguir-title" class="text-h5 font-weight-bold mb-3">Para seguir</h2>
            <ul class="outage-list">
              <li>
                A qué organismo va cada problema y con qué plazo:
                <NuxtLink :to="localePath('/a-quien-le-reclamo-uruguay')" class="cu-link">
                  ¿a quién le reclamo? </NuxtLink
                >.
              </li>
              <li>
                Qué puede hacer por vos y qué no:
                <NuxtLink :to="localePath('/defensa-al-consumidor-uruguay')" class="cu-link">
                  Defensa del Consumidor </NuxtLink
                >.
              </li>
            </ul>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import {
  CORTE_LUZ_EXCLUIDOS,
  CORTE_LUZ_FAQ,
  CORTE_LUZ_MECANISMO,
  CORTE_LUZ_NO_PUBLICADO,
  CORTE_LUZ_PATH,
  CORTE_LUZ_RECLAMO,
  CORTE_LUZ_SOURCES,
  CORTE_LUZ_TITLE,
  CORTE_LUZ_VERIFIED_AT,
  ESPERA_ANTES_DE_URSEA_DIAS_HABILES,
  RETRASO_PROMEDIO_MESES,
  RETRASO_RESPUESTA_PCT_DIARIO,
  corteDeLuzDescription,
} from '~/utils/corteDeLuzCompensacion'

const localePath = useLocalePath()

const faqs = CORTE_LUZ_FAQ
const sources = CORTE_LUZ_SOURCES
const mecanismo = CORTE_LUZ_MECANISMO
const excluidos = CORTE_LUZ_EXCLUIDOS
const reclamo = CORTE_LUZ_RECLAMO
const noPublicado = CORTE_LUZ_NO_PUBLICADO
const retrasoPct = RETRASO_RESPUESTA_PCT_DIARIO
const promedioMeses = RETRASO_PROMEDIO_MESES
const esperaDias = ESPERA_ANTES_DE_URSEA_DIAS_HABILES

const verifiedDisplay = new Date(`${CORTE_LUZ_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = `https://cambio-uruguay.com${CORTE_LUZ_PATH}`

const title = CORTE_LUZ_TITLE
const description = corteDeLuzDescription()

defineOgImageComponent('Cambio', {
  title: 'Compensación por corte de luz',
  subtitle: 'No se pide: se descuenta de la factura',
  tag: 'DERECHOS',
})

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'compensacion por corte de luz uruguay, reclamo por corte de luz ute, ute me tiene que compensar, descuento en la factura por cortes, reclamo ursea ute, cuanto compensa ute por corte, se me quemo un artefacto por un corte, calidad del servicio electrico uruguay',
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
                name: 'Derechos y reclamos en Uruguay',
                item: 'https://cambio-uruguay.com/temas/derechos-y-reclamos-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Compensación por corte de luz',
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
            dateModified: CORTE_LUZ_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: sources.map(source => ({
              '@type': 'WebPage',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.outage-lead,
.outage-prose {
  max-width: 68ch;
}
.outage-list {
  padding-left: 1.1rem;
  max-width: 72ch;
}
.outage-list li {
  margin-top: 0.6rem;
}
.outage-steps {
  padding-left: 1.1rem;
  max-width: 72ch;
}
.outage-steps li {
  margin-top: 1.1rem;
}
.step-title {
  margin-top: 0;
  font-weight: 700;
}
.step-body {
  margin-top: 0.35rem;
}
.step-basis {
  margin-top: 0.35rem;
  font-size: 0.78rem;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.68;
}
.alert-body {
  margin-top: 0;
}
</style>
