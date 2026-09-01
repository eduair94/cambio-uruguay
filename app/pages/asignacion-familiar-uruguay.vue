<template>
  <VContainer class="afam-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">BPS Y PRESTACIONES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Asignación familiar en Uruguay: cuánto es y quién la cobra
      </h1>
      <p class="lead mb-6">
        Hay <strong>dos prestaciones distintas con el mismo nombre</strong>. La contributiva
        (Decreto Ley 15.084) paga <strong>$ 1.347</strong> o <strong>$ 674</strong> por mes por hijo
        según los ingresos del hogar, y se deposita cada dos meses. La del
        <strong>Plan de Equidad</strong> (Ley 18.227) paga <strong>$ 2.686,51</strong> por mes por
        el primer hijo, todos los meses. Son incompatibles: se cobra una o la otra. Importes de BPS
        con vigencia {{ ASIGNACION_FAMILIAR_VIGENCIA }}.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-swap-horizontal-bold" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que casi nadie menciona</div>
            <p class="callout-text mb-0">
              El art. 9 de la Ley 18.227 no solo declara incompatibles las dos asignaciones: agrega
              que <strong>«se podrá optar en todo momento»</strong> por la del Plan de Equidad, y
              que esa tiene <strong>preferencia en caso de controversia</strong>. Como por el primer
              hijo el Plan de Equidad paga casi el doble que la franja más alta de la contributiva,
              para un hogar que califique en los dos la opción no es neutra. Quién califica lo
              resuelve BPS, pero la puerta a pedirlo está abierta todo el tiempo.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Comparación -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las dos asignaciones, lado a lado</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La contributiva se genera por trabajar (o por haber trabajado); la del Plan de Equidad, por
        la situación del hogar. Cambian el monto, la frecuencia del pago y hasta quién decide si te
        corresponde.
      </p>

      <VTable class="comp-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th />
            <th>Contributiva (Decreto Ley 15.084)</th>
            <th>Plan de Equidad (Ley 18.227)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in COMPARACION" :key="f.key">
            <td data-label="Concepto" class="font-weight-medium text-no-wrap">{{ f.label }}</td>
            <td data-label="Contributiva" class="text-body-2">{{ f.contributiva }}</td>
            <td data-label="Plan de Equidad" class="text-body-2">{{ f.equidad }}</td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Contributiva -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Cuánto paga la contributiva, y hasta qué ingreso
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Dos franjas, y por encima de la segunda no corresponde nada. Los topes son de los
        <strong>ingresos nominales sumados del hogar</strong>, y valen para hogares de hasta dos
        beneficiarios.
      </p>

      <VTable class="franja-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Si los ingresos del hogar no superan</th>
            <th>Se cobra por mes, por hijo</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in FRANJAS_CONTRIBUTIVAS" :key="f.topeIngresos">
            <td data-label="Tope de ingresos" class="text-no-wrap font-weight-medium">
              {{ pesos(f.topeIngresos) }}
            </td>
            <td data-label="Monto" class="text-no-wrap">
              <VChip color="primary" size="small" variant="tonal">{{
                pesos(f.montoMensual)
              }}</VChip>
            </td>
            <td data-label="Detalle" class="text-caption text-medium-emphasis">{{ f.detail }}</td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-calendar-sync-outline" color="warning" size="18" class="mr-1" />
          <strong>El depósito viene cada dos meses.</strong> BPS define esta prestación como
          «bimestral», pero publica el monto <em>por mes</em>. Por eso el importe que llega a la
          cuenta es el doble del de la tabla, y no es un pago de más. Con tres hijos o más, además,
          el tope sube <strong>1,2338 BPC</strong> —{{
            pesos(TOPE_INCREMENTO_POR_BENEFICIARIO)
          }}
          con vigencia {{ ASIGNACION_FAMILIAR_VIGENCIA }}— por cada hijo adicional: queda en
          {{ pesos(topeDeIngresos(FRANJAS_CONTRIBUTIVAS[1]!.topeIngresos, 3)) }} con tres,
          {{ pesos(topeDeIngresos(FRANJAS_CONTRIBUTIVAS[1]!.topeIngresos, 4)) }} con cuatro y
          {{ pesos(topeDeIngresos(FRANJAS_CONTRIBUTIVAS[1]!.topeIngresos, 5)) }} con cinco. En esos
          casos el monto que corresponde es el de la segunda franja.
        </p>
      </VCard>
    </section>

    <!-- La fórmula -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Por qué en el Plan de Equidad cada hijo cobra menos que el anterior
      </h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Porque el art. 4 de la Ley 18.227 no fija un monto por hijo. Multiplica el monto base por la
        cantidad de beneficiarios <strong>elevada al exponente 0,6</strong> y recién después divide
        el resultado entre esa misma cantidad. El hogar cobra más con cada hijo; cada hijo, menos.
      </p>

      <VCard variant="flat" class="formula-card pa-5 pa-md-6 mb-6">
        <div class="formula">
          <span class="term is-law">{{ pesos(EQUIDAD_BASE) }}</span>
          <span class="op">×</span>
          <span class="term">(cantidad de hijos)<sup>0,6</sup></span>
          <span class="op">=</span>
          <span class="term is-result">lo que cobra el hogar por mes</span>
        </div>
        <div class="formula">
          <span class="term is-result">lo que cobra el hogar</span>
          <span class="op">÷</span>
          <span class="term">cantidad de hijos</span>
          <span class="op">=</span>
          <span class="term is-law">lo que le toca a cada uno</span>
        </div>
        <p class="formula-note text-body-2 text-medium-emphasis mb-0">
          El monto base es el «$ 700 de enero de 2008» del literal A), ajustado por IPC hasta
          {{ ASIGNACION_FAMILIAR_VIGENCIA }}. Los beneficiarios con discapacidad quedan fuera de
          esta escala: cobran {{ pesos(EQUIDAD_DISCAPACIDAD) }} fijos, que no bajan porque haya más
          hijos. Quien cursa nivel intermedio suma un complemento de
          {{ pesos(EQUIDAD_COMPLEMENTO_MEDIA) }} por el primer beneficiario.
        </p>
      </VCard>

      <VTable class="escala-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Hijos en el hogar</th>
            <th>Cobra cada uno, por mes</th>
            <th>Entra al hogar, por mes</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in EQUIDAD_ESCALA" :key="e.beneficiarios">
            <td data-label="Hijos" class="font-weight-medium">
              {{ e.beneficiarios }} {{ e.beneficiarios === 1 ? 'hijo' : 'hijos' }}
            </td>
            <td data-label="Cada uno" class="text-no-wrap">{{ pesos(e.porBeneficiario) }}</td>
            <td data-label="Total del hogar" class="text-no-wrap">
              <VChip color="primary" size="small" variant="tonal">{{ pesos(e.totalHogar) }}</VChip>
            </td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-information-outline" color="warning" size="18" class="mr-1" />
          Esta tabla es la aritmética del art. 4 aplicada al valor base que publica BPS, no una
          tabla oficial de importes: el redondeo con el que BPS liquida cada hogar es suyo, y el
          monto final depende además del nivel educativo de cada beneficiario. Sirve para entender
          la forma de la escala y para detectar un pago que se salga mucho de ella.
        </p>
      </VCard>
    </section>

    <!-- Lo que no publicamos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no te va a decir</h2>
      <VCard variant="flat" class="warn-card pa-5 pa-md-6">
        <p class="callout-text mb-0">
          <strong>A partir de qué ingreso se considera «vulnerable» un hogar.</strong> El art. 2 de
          la Ley 18.227 no fija un número: manda determinarlo «conforme a criterios estadísticos»,
          pesando ingresos, condiciones de la vivienda y del entorno, composición del hogar,
          características de sus integrantes y situación sanitaria, y remite a la reglamentación. El
          índice concreto con el que BPS puntúa cada hogar no es un dato publicado, así que
          cualquier umbral que pusiéramos acá sería inventado. La única forma de saberlo es
          solicitarlo y que BPS evalúe.
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in ASIGNACION_FAMILIAR_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ f.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          :to="localePath('/licencia-por-maternidad-y-paternidad-uruguay')"
          variant="tonal"
          size="small"
        >
          Licencia por maternidad y paternidad
        </VBtn>
        <VBtn :to="localePath('/salario-vacacional-uruguay')" variant="tonal" size="small">
          Salario vacacional y licencia
        </VBtn>
        <VBtn :to="localePath('/embargo-de-sueldo-uruguay')" variant="tonal" size="small">
          Embargo de sueldo
        </VBtn>
        <VBtn :to="localePath('/denunciar-trabajo-en-negro-uruguay')" variant="tonal" size="small">
          Denunciar trabajo en negro
        </VBtn>
        <VBtn :to="localePath('/indicadores')" variant="tonal" size="small">
          Valor de la BPC y la UI
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado contra las páginas oficiales del BPS y el texto de la Ley 18.227 en IMPO el
        {{ verifiedAt }}. Todos los importes en pesos son los de la vigencia
        {{ ASIGNACION_FAMILIAR_VIGENCIA }} y se ajustan por IPC en las mismas oportunidades en que
        se ajustan las remuneraciones de la Administración Central (Ley 18.227, art. 10): si estás
        leyendo esto después de un ajuste, el número de BPS manda sobre el de acá. Esta página es
        informativa; quien resuelve cada caso es el BPS.
      </p>
      <ul class="sources-list">
        <li v-for="s in ASIGNACION_FAMILIAR_SOURCES" :key="s.label">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  ASIGNACION_FAMILIAR_FAQ,
  ASIGNACION_FAMILIAR_SOURCES,
  ASIGNACION_FAMILIAR_VERIFIED_AT,
  ASIGNACION_FAMILIAR_VIGENCIA,
  COMPARACION,
  EQUIDAD_BASE,
  EQUIDAD_COMPLEMENTO_MEDIA,
  EQUIDAD_DISCAPACIDAD,
  EQUIDAD_ESCALA,
  FRANJAS_CONTRIBUTIVAS,
  TOPE_INCREMENTO_POR_BENEFICIARIO,
  topeDeIngresos,
} from '~/utils/asignacionFamiliar'

const localePath = useLocalePath()

/** Pesos uruguayos, sin centavos cuando el importe es redondo. */
function pesos(value: number): string {
  const decimals = Number.isInteger(value) ? 0 : 2
  return `$ ${value.toLocaleString('es-UY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`
}

const verifiedAt = new Date(`${ASIGNACION_FAMILIAR_VERIFIED_AT}T12:00:00Z`).toLocaleDateString(
  'es-UY',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
)

const canonicalUrl = 'https://cambio-uruguay.com/asignacion-familiar-uruguay'
const title = 'Asignación familiar en Uruguay: cuánto es y quién la cobra'
const description =
  'Son dos prestaciones distintas. La contributiva paga $ 1.347 o $ 674 por mes por hijo según el ingreso del hogar; el Plan de Equidad, $ 2.686,51 por el primero. Son incompatibles. Valores BPS 1/2026.'

defineOgImageComponent('Cambio', {
  title: 'Asignación familiar en Uruguay',
  subtitle: '$ 1.347, $ 674 o $ 2.686,51 por mes: cuál te toca',
  tag: 'BPS',
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
        'asignacion familiar uruguay, asignaciones familiares bps, cuanto es la asignacion familiar, plan de equidad bps, asignacion familiar plan de equidad, ley 18227, decreto ley 15084, tope de ingresos asignacion familiar, cada cuanto se cobra la asignacion familiar, asignacion familiar hasta que edad, como pedir la asignacion familiar',
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
                name: 'Asignación familiar en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: ASIGNACION_FAMILIAR_FAQ.map(f => ({
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
            citation: ASIGNACION_FAMILIAR_SOURCES.map(s => ({
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
.afam-page {
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
.formula-note,
.sources-note {
  max-width: 72ch;
  margin-top: 0;
}
.callout-text,
.note-text {
  margin-top: 0;
}

.warn-card,
.formula-card,
.note-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  background: rgba(var(--v-theme-surface), 1);
}
.warn-card {
  background: rgba(var(--v-theme-primary), 0.06);
}
.note-card {
  background: rgba(var(--v-theme-warning), 0.06);
}

.formula {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  margin-bottom: 12px;
}
.formula .term {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.formula .term.is-law {
  background: rgba(var(--v-theme-primary), 0.16);
  font-weight: 600;
}
.formula .term.is-result {
  background: rgba(22, 199, 132, 0.16);
  font-weight: 600;
}
.formula .op {
  opacity: 0.6;
}

.comp-table :deep(th),
.franja-table :deep(th),
.escala-table :deep(th) {
  white-space: nowrap;
}
.comp-table :deep(td) {
  line-height: 1.5;
  padding-top: 10px;
  padding-bottom: 10px;
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
