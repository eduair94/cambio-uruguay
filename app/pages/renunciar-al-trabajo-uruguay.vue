<template>
  <VContainer class="renuncia-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SUELDO Y APORTES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Renuncié en Uruguay: qué me tienen que pagar y en qué plazo
      </h1>
      <p class="lead mb-6">
        Renunciar no es irse con las manos vacías. El MTSS dice qué debe abonar la empresa cuando el
        vínculo termina por decisión del trabajador:
        <strong>la licencia no gozada, el salario vacacional y el aguinaldo generado</strong>. Lo
        único que se pierde es la indemnización por despido, porque el despido lo decide el
        empleador. Y hay un plazo: no está escrito en ninguna norma laboral, así que el MTSS remite
        al <strong>artículo 1440 del Código Civil</strong> —exigible a los
        <strong>10 días corridos</strong>— y el artículo 29 de la Ley 18.572 le suma un
        <strong>recargo automático del 10 %</strong> si no la pagan.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-cash-clock" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">El dato que casi nadie usa</div>
            <p class="callout-text mb-0">
              El recargo del 10 % corre <em>automáticamente</em>. El artículo 29 de la Ley 18.572
              dispone que «la omisión de pago de los créditos laborales generará automáticamente,
              desde su exigibilidad, un recargo del 10% sobre el monto del crédito adeudado»: no hay
              que pedirlo, ni probar mala fe, ni esperar una sentencia que lo declare. Se suma por
              el solo hecho de no haber pagado a tiempo, y quien liquida tarde suele no tenerlo
              presente.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Las partidas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Las cuatro partidas, y cuál es la única que perdés
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Creer que renunciar no paga nada sale de confundir la indemnización con toda la liquidación.
        Son cosas distintas: la indemnización es una de cuatro partidas, y las otras tres se cobran
        igual.
      </p>

      <div class="partidas">
        <VCard
          v-for="p in RENUNCIA_PARTIDAS"
          :key="p.key"
          class="partida pa-5"
          :class="p.corresponde ? 'partida--si' : 'partida--no'"
          variant="flat"
        >
          <div class="d-flex align-center mb-3">
            <VIcon
              :icon="p.corresponde ? 'mdi-check-circle-outline' : 'mdi-close-circle-outline'"
              :color="p.corresponde ? 'success' : 'error'"
              class="mr-2"
            />
            <p class="partida__label font-weight-bold mb-0">{{ p.label }}</p>
          </div>
          <p class="partida__detail text-body-2 mb-3">{{ p.detail }}</p>
          <p class="partida__source text-caption text-medium-emphasis mb-0">
            <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />{{ p.source }}
          </p>
        </VCard>
      </div>
    </section>

    <!-- El plazo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Desde cuándo podés reclamar, y qué se le suma</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La pregunta «¿cuánto tienen para pagarme?» no tiene respuesta en la ley laboral, y esa es la
        respuesta honesta. El MTSS resuelve el vacío con el Código Civil, y de ahí salen estas tres
        fechas.
      </p>

      <div class="timeline">
        <div class="milestone">
          <div class="milestone__head">
            <span class="milestone__badge">1</span>
            <div>
              <p class="milestone__label font-weight-bold mb-1">El día del cese</p>
              <p class="milestone__when mb-0">Se cierra el cómputo de todas las partidas</p>
            </div>
          </div>
          <p class="milestone__detail text-body-2 mb-0">
            Ese día quedan fijados los meses de aguinaldo del período en curso y los días de
            licencia generados y no tomados. Todavía no hay nada que reclamar: la deuda existe pero
            no es exigible.
          </p>
        </div>

        <div class="milestone">
          <div class="milestone__head">
            <span class="milestone__badge">2</span>
            <div>
              <p class="milestone__label font-weight-bold mb-1">
                A los {{ PLAZO_EXIGIBILIDAD_DIAS }} días corridos
              </p>
              <p class="milestone__when mb-0">La liquidación se vuelve exigible</p>
            </div>
          </div>
          <p class="milestone__source text-caption text-medium-emphasis mb-2">
            <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />Código Civil, art. 1440, por
            remisión del MTSS
          </p>
          <p class="milestone__detail text-body-2 mb-0">
            Corridos, no hábiles: el artículo 1440 hace exigible «10 días después de la fecha» la
            obligación que no tiene plazo estipulado. Contar hábiles agrega casi una semana que no
            corresponde, y es el error más común al reclamar.
          </p>
        </div>

        <div class="milestone">
          <div class="milestone__head">
            <span class="milestone__badge">3</span>
            <div>
              <p class="milestone__label font-weight-bold mb-1">Desde el día siguiente</p>
              <p class="milestone__when mb-0">Corre el recargo del 10 % sobre lo adeudado</p>
            </div>
          </div>
          <p class="milestone__source text-caption text-medium-emphasis mb-2">
            <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />Ley 18.572, art. 29
          </p>
          <p class="milestone__detail text-body-2 mb-0">
            Sobre el monto del crédito adeudado, de forma automática y desde la exigibilidad. Si te
            liquidan tarde, el número correcto ya no es el de la planilla original.
          </p>
        </div>
      </div>
    </section>

    <!-- Cómo verificar -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cómo revisar si el número que te dieron cierra</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Los divisores con que se liquidan estas partidas son públicos: los publica el MTSS en su
        método de cálculo. Pedí el detalle por rubro y contrastá con estos tres.
      </p>

      <div class="formulas">
        <VCard class="formula pa-5" variant="flat">
          <p class="formula__label text-overline mb-2">Aguinaldo generado</p>
          <p class="formula__math mb-2">sueldo mensual ÷ {{ AGUINALDO_DIVISOR }} × meses</p>
          <p class="formula__note text-body-2 mb-0">
            Una alícuota por cada mes del período de aguinaldo en curso. Irte en mayo o en noviembre
            no lo hace perder: lo hace proporcional.
          </p>
        </VCard>

        <VCard class="formula pa-5" variant="flat">
          <p class="formula__label text-overline mb-2">Licencia no gozada</p>
          <p class="formula__math mb-2">
            sueldo mensual ÷ {{ JORNAL_DIVISOR }} × {{ LICENCIA_DIAS_POR_MES_20 }} × meses
          </p>
          <p class="formula__note text-body-2 mb-0">
            Ese {{ LICENCIA_DIAS_POR_MES_20 }} es el escalón de 20 días al año. Si por antigüedad ya
            generás 21, el multiplicador pasa a {{ LICENCIA_DIAS_POR_MES_21 }} y la diferencia no es
            menor.
          </p>
        </VCard>

        <VCard class="formula pa-5" variant="flat">
          <p class="formula__label text-overline mb-2">Salario vacacional</p>
          <p class="formula__math mb-2">acompaña a la licencia, en la misma proporción</p>
          <p class="formula__note text-body-2 mb-0">
            Es la partida que más se olvida en un egreso, porque quien se va no se está yendo de
            vacaciones. Si no figura en la liquidación, ahí suele estar la diferencia.
          </p>
        </VCard>
      </div>

      <VCard class="warn-card pa-5 pa-md-6 mt-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-gavel" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">
              Un criterio que está en disputa, y conviene saberlo
            </div>
            <p class="callout-text mb-0">
              El propio MTSS señala que, por un decreto del año 2000, «el salario vacacional no
              debería incluirse como alícuota por no tener naturaleza salarial», y aclara en la
              misma página que «la doctrina y jurisprudencia mayoritaria entienden que el salario
              vacacional tiene naturaleza salarial, motivo por el cual correspondería incluirse». No
              es un número que podamos cerrar acá: es un criterio en disputa. Saber que lo está ya
              te cambia la conversación antes de firmar.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Lo que no publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no te va a decir</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Dos preguntas muy buscadas se quedan sin número acá, a propósito. Preferimos decirte que no
        lo encontramos antes que darte una cifra que alguien copió de otro lado.
      </p>

      <div class="omisiones">
        <VCard v-for="o in RENUNCIA_NO_PUBLICADO" :key="o.key" class="omision pa-5" variant="flat">
          <div class="d-flex align-center mb-3">
            <VIcon icon="mdi-help-circle-outline" color="warning" class="mr-2" />
            <p class="omision__label font-weight-bold mb-0">{{ o.label }}</p>
          </div>
          <p class="omision__detail text-body-2 mb-0">{{ o.detail }}</p>
        </VCard>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-5">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion" class="faq">
        <VExpansionPanel v-for="(f, i) in RENUNCIA_FAQ" :key="i">
          <VExpansionPanelTitle class="font-weight-medium">{{ f.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="faq__answer mb-0">{{ f.a }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Fuentes</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Todo lo de arriba sale de estas páginas oficiales, contrastado el {{ verifiedAt }}.
      </p>
      <ul class="sources">
        <li v-for="s in RENUNCIA_SOURCES" :key="s.url" class="source">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>

    <!-- Seguir por acá -->
    <section>
      <h2 class="text-h5 font-weight-bold mb-5">Seguir por acá</h2>
      <div class="related">
        <VCard
          v-for="l in RELATED"
          :key="l.to"
          :to="localePath(l.to)"
          class="related__card pa-4"
          variant="flat"
        >
          <p class="related__label font-weight-bold mb-1">{{ l.label }}</p>
          <p class="related__note text-body-2 text-medium-emphasis mb-0">{{ l.note }}</p>
        </VCard>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  AGUINALDO_DIVISOR,
  JORNAL_DIVISOR,
  LICENCIA_DIAS_POR_MES_20,
  LICENCIA_DIAS_POR_MES_21,
  PLAZO_EXIGIBILIDAD_DIAS,
  RENUNCIA_FAQ,
  RENUNCIA_NO_PUBLICADO,
  RENUNCIA_PARTIDAS,
  RENUNCIA_SOURCES,
  RENUNCIA_VERIFIED_AT,
} from '~/utils/renuncia'

const localePath = useLocalePath()

const verifiedAt = new Date(`${RENUNCIA_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const RELATED = [
  {
    to: '/indemnizacion-por-despido-uruguay',
    label: 'Indemnización por despido',
    note: 'La partida que acá se pierde: cuánto es, sus dos topes y hasta cuándo se reclama.',
  },
  {
    to: '/salario-vacacional-uruguay',
    label: 'Salario vacacional y licencia',
    note: 'Cuántos días generás, cuándo se paga y por qué el importe da menos de lo que esperabas.',
  },
  {
    to: '/cuando-se-cobra-el-aguinaldo-uruguay',
    label: 'Cuándo se cobra el aguinaldo',
    note: 'Qué período está en curso, que es lo que define cuántos meses te llevás al irte.',
  },
  {
    to: '/seguro-de-paro-uruguay',
    label: 'Seguro de paro',
    note: 'Qué cubre el subsidio del BPS y por qué la salida voluntaria no entra.',
  },
  {
    to: '/guias/entender-tu-recibo-de-sueldo-uruguay',
    label: 'Entender tu recibo de sueldo',
    note: 'Cada línea del recibo, para saber qué partidas venías generando.',
  },
  {
    to: '/embargo-de-sueldo-uruguay',
    label: 'Embargo de sueldo',
    note: 'Qué parte del sueldo es inembargable, si arrastrás una deuda al momento de irte.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/renunciar-al-trabajo-uruguay'
const title = 'Renuncié en Uruguay: qué me tienen que pagar y en qué plazo'
const description =
  'Quien renuncia sí cobra: licencia no gozada, salario vacacional y aguinaldo generado (MTSS). Lo único que se pierde es la indemnización por despido. No hay plazo en la norma laboral, así que el MTSS remite al art. 1440 del Código Civil: exigible a los 10 días corridos, y el art. 29 de la Ley 18.572 suma un recargo automático del 10 % si no pagan.'

defineOgImageComponent('Cambio', {
  title: 'Renuncié: qué me tienen que pagar',
  subtitle: 'Tres partidas se cobran igual, y a los 10 días corre un 10 %',
  tag: 'RENUNCIA',
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
        'renuncia uruguay, si renuncio cobro algo, que me corresponde si renuncio, liquidacion por renuncia uruguay, licencia no gozada renuncia, aguinaldo si renuncio, salario vacacional renuncia, plazo pago liquidacion uruguay, recargo 10 por ciento creditos laborales, ley 18572 articulo 29, no me pagan la liquidacion uruguay, renunciar al trabajo uruguay',
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
                name: 'Renunciar al trabajo en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: RENUNCIA_FAQ.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
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
            citation: RENUNCIA_SOURCES.map(s => ({
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
.renuncia-page {
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

.section-intro {
  max-width: 74ch;
  margin-top: 0;
}

.warn-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.06);
}

.callout-text {
  line-height: 1.6;
  max-width: 74ch;
  margin-top: 0;
}

/* Partidas */
.partidas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.partida {
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  height: 100%;
}

.partida--si {
  border-left: 4px solid rgb(var(--v-theme-success));
}

.partida--no {
  border-left: 4px solid rgb(var(--v-theme-error));
}

.partida__label,
.partida__detail,
.partida__source {
  margin-top: 0;
}

.partida__detail {
  line-height: 1.6;
}

/* Timeline */
.timeline {
  display: grid;
  gap: 16px;
}

.milestone {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.4);
  padding: 4px 0 4px 18px;
}

.milestone__head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.milestone__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(var(--v-theme-primary), 0.15);
  color: rgb(var(--v-theme-primary));
  font-weight: 700;
  font-size: 0.85rem;
}

.milestone__label,
.milestone__when,
.milestone__source,
.milestone__detail {
  margin-top: 0;
}

.milestone__when {
  font-size: 0.9rem;
  opacity: 0.75;
}

.milestone__detail {
  line-height: 1.6;
  max-width: 74ch;
}

/* Fórmulas */
.formulas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.formula {
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  height: 100%;
}

.formula__label,
.formula__note {
  margin-top: 0;
}

.formula__math {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
  margin-top: 0;
  line-height: 1.5;
}

.formula__note {
  line-height: 1.55;
}

/* Omisiones */
.omisiones {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.omision {
  border-radius: 12px;
  border: 1px dashed rgba(var(--v-theme-warning), 0.55);
  height: 100%;
}

.omision__label,
.omision__detail {
  margin-top: 0;
}

.omision__detail {
  line-height: 1.6;
}

/* FAQ */
.faq__answer {
  line-height: 1.65;
  max-width: 76ch;
  margin-top: 0;
}

/* Fuentes */
.sources {
  margin-top: 0;
  padding-left: 20px;
}

.source {
  margin-bottom: 10px;
  line-height: 1.55;
}

.source a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.source a:hover {
  text-decoration: underline;
}

/* Relacionadas */
.related {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.related__card {
  border-radius: 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  height: 100%;
}

.related__label,
.related__note {
  margin-top: 0;
}
</style>
