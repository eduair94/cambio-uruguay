<template>
  <VContainer class="parental-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SUELDO Y APORTES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Licencia por maternidad y paternidad en Uruguay: días, fechas y quién paga
      </h1>
      <p class="lead mb-6">
        La licencia por paternidad es de
        <strong>{{ PATERNIDAD_DIAS_TOTAL }} días corridos</strong> desde el {{ vigenteDesde }}: al
        dependiente le pagan <strong>{{ PATERNIDAD_DIAS_EMPRESA }} la empresa</strong> y
        <strong>{{ PATERNIDAD_DIAS_BPS_DEPENDIENTE }} el BPS</strong>. La maternal son
        <strong>{{ MATERNIDAD_DIAS_TOTAL }} días</strong> —{{ MATERNIDAD_DIAS_PREPARTO }} antes del
        parto y {{ MATERNIDAD_DIAS_POSPARTO }} después—, y el medio horario por cuidados se corta a
        los <strong>{{ MEDIO_HORARIO_HASTA_MESES }} meses</strong> del bebé, no al año.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-alert" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Ojo con lo que leas afuera: el número cambió</div>
            <p class="callout-text mb-0">
              La Ley 20.312 subió la licencia por paternidad de forma escalonada y el
              <strong>último escalón entró en vigencia el {{ vigenteDesde }}</strong
              >. Casi todo lo publicado antes de esa fecha sigue diciendo 13 o 14 días. Hoy son
              {{ PATERNIDAD_DIAS_TOTAL }}, y esa diferencia es una semana entera de licencia que
              alguien puede no pedir por leer una nota vieja.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Paternidad -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Paternidad: los mismos 20 días, dos pagadores</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El total no depende de si sos dependiente o trabajás por tu cuenta: son
        {{ PATERNIDAD_DIAS_TOTAL }} días continuos que arrancan el día del parto. Lo que cambia es
        de dónde sale la plata, y por eso el dependiente ve el período partido en dos liquidaciones.
      </p>

      <VTable class="pat-table cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th>Quién sos</th>
            <th>Paga la empresa</th>
            <th>Paga el BPS</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in PATERNIDAD_DESGLOSE" :key="d.tipo">
            <td data-label="Quién sos">
              <span class="font-weight-medium">{{ d.label }}</span>
              <p class="row-detail text-caption text-medium-emphasis mb-0">{{ d.detail }}</p>
            </td>
            <td data-label="Empresa" class="text-no-wrap">
              <VChip v-if="d.empresa" color="warning" size="small" variant="tonal">
                {{ d.empresa }} días
              </VChip>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            <td data-label="BPS" class="text-no-wrap">
              <VChip color="primary" size="small" variant="tonal">{{ d.bps }} días</VChip>
            </td>
            <td data-label="Total" class="text-no-wrap font-weight-bold">{{ d.total }} días</td>
          </tr>
        </tbody>
      </VTable>

      <VCard variant="flat" class="note-card pa-5 mt-6">
        <p class="note-text mb-0">
          <VIcon icon="mdi-scale-balance" color="warning" size="18" class="mr-1" />
          Los {{ PATERNIDAD_DIAS_EMPRESA }} días de la empresa salen de la
          <strong>Ley 18.345</strong> y los {{ PATERNIDAD_DIAS_BPS_DEPENDIENTE }} del BPS del
          artículo 8 de la <strong>Ley 19.161</strong> en la redacción que le dio la
          <strong>Ley 20.312</strong>. Son dos normas distintas para un mismo período continuo: no
          se piden por separado ni se toman en semanas distintas.
        </p>
      </VCard>
    </section>

    <!-- Maternidad + calendario -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Maternidad: en qué días concretos cae</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        {{ MATERNIDAD_DIAS_PREPARTO }} días antes de la fecha presunta de parto y
        {{ MATERNIDAD_DIAS_POSPARTO }} después: {{ MATERNIDAD_DIAS_TOTAL }} días en total, las
        catorce semanas del artículo 2 de la Ley 19.161. Poné tu fecha probable de parto y mirá
        dónde caen.
      </p>

      <VCard variant="flat" class="calc-card pa-5 pa-md-6">
        <VTextField
          v-model="fpp"
          type="date"
          label="Fecha probable de parto"
          density="comfortable"
          variant="outlined"
          class="fpp-field"
          hide-details
        />

        <div v-if="calendario" class="calendario mt-5">
          <div class="hito">
            <div class="hito__label">Empieza la licencia</div>
            <div class="hito__date">{{ fmt(calendario.inicioPreparto) }}</div>
            <p class="hito__note mb-0">
              {{ calendario.diasPreparto }} días de preparto, contados hacia atrás desde la fecha
              probable.
            </p>
          </div>
          <div class="hito is-birth">
            <div class="hito__label">Fecha probable de parto</div>
            <div class="hito__date">{{ fmt(calendario.fechaPresunta) }}</div>
            <p class="hito__note mb-0">
              Desde acá corren los {{ calendario.diasPosparto }} días de posparto.
            </p>
          </div>
          <div class="hito">
            <div class="hito__label">Último día de licencia</div>
            <div class="hito__date">{{ fmt(calendario.finPosparto) }}</div>
            <p class="hito__note mb-0">
              {{ calendario.diasTotal }} días en total. Después arranca —si querés— el medio
              horario.
            </p>
          </div>
          <div class="hito is-muted">
            <div class="hito__label">Se termina el medio horario</div>
            <div class="hito__date">{{ fmt(calendario.finMedioHorario) }}</div>
            <p class="hito__note mb-0">
              Los {{ MEDIO_HORARIO_HASTA_MESES }} meses del bebé, si nace en la fecha probable.
            </p>
          </div>
        </div>

        <VAlert
          v-if="calendario"
          type="info"
          variant="tonal"
          density="comfortable"
          class="mt-5"
          icon="mdi-information-outline"
        >
          Es una <strong>proyección</strong>, no una liquidación. El tramo de preparto se cuenta
          desde la fecha <em>probable</em>, pero los {{ MATERNIDAD_DIAS_POSPARTO }} días de posparto
          corren desde el parto <strong>real</strong>: si el bebé se adelanta o se atrasa, el último
          día se mueve con él.
        </VAlert>
      </VCard>
    </section>

    <!-- Medio horario -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El medio horario se corta a los 6 meses</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Es la confusión más cara de esta familia de trámites: mucha gente planifica la vuelta al
        trabajo creyendo que la media jornada llega al año. Llega a los
        {{ MEDIO_HORARIO_HASTA_MESES }} meses del hijo —{{ MEDIO_HORARIO_HASTA_MESES_EXTENDIDO }} si
        la licencia se extendió por los casos de la Ley 20.000— y ahí se termina.
      </p>

      <VRow>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="fact-card pa-5 h-100">
            <div class="fact-num">{{ MEDIO_HORARIO_HORAS_MAX }} h</div>
            <p class="fact-text mb-0">
              El tope diario. En cada empresa la jornada no puede exceder la mitad del horario
              habitual <em>ni</em> las {{ MEDIO_HORARIO_HORAS_MAX }} horas: mandan las dos
              condiciones, no la más conveniente.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="fact-card pa-5 h-100">
            <div class="fact-num">{{ MEDIO_HORARIO_PORCENTAJE }} %</div>
            <p class="fact-text mb-0">
              Lo que paga el BPS por las horas que no trabajás: el
              {{ MEDIO_HORARIO_PORCENTAJE }} % del jornal con el que se liquidó tu subsidio maternal
              o tu licencia paternal, por la cantidad de días.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="fact-card pa-5 h-100">
            <div class="fact-num">2</div>
            <p class="fact-text mb-0">
              Lo pueden usar madre y padre, y pueden <strong>alternarlo</strong>: no es un beneficio
              exclusivo de quien tuvo la licencia maternal.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Casos especiales -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuando el parto no viene como estaba previsto</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La Ley 20.000 y el artículo 2-BIS de la Ley 19.161 alargan los períodos en cuatro
        situaciones. Ninguna se pide «de más»: se activan con la indicación médica.
      </p>

      <div class="casos">
        <div v-for="c in LICENCIA_PARENTAL_CASOS" :key="c.key" class="caso">
          <p class="caso__label font-weight-bold mb-1">{{ c.label }}</p>
          <p class="caso__efecto text-body-2 mb-2">{{ c.efecto }}</p>
          <p class="caso__source text-caption text-medium-emphasis mb-0">
            <VIcon icon="mdi-scale-balance" size="14" class="mr-1" />{{ c.source }}
          </p>
        </div>
      </div>
    </section>

    <!-- Monto -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto se cobra, y por qué acá no hay un número</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El subsidio no es «tu sueldo»: es un promedio, y eso puede jugarte a favor o en contra según
        cómo hayan venido los últimos meses.
      </p>

      <VCard variant="flat" class="formula-card pa-5 pa-md-6 mb-6">
        <div class="formula">
          <span class="term"
            >promedio de las remuneraciones de los últimos
            {{ PROMEDIO_MESES_DEPENDIENTE }} meses</span
          >
          <span class="op">+</span>
          <span class="term">cuota parte de licencia, aguinaldo y salario vacacional</span>
          <span class="op">=</span>
          <span class="term is-result">100 % del subsidio</span>
        </div>
        <p class="formula-note text-body-2 text-medium-emphasis mb-0">
          Para empresarios unipersonales el promedio se toma sobre los últimos
          {{ PROMEDIO_MESES_NO_DEPENDIENTE }} meses de asignaciones computables. Si en esos meses
          hubo horas extra o comisiones que no se repitieron, el promedio no va a coincidir con tu
          último recibo — y ahí está la sorpresa. Para ver de dónde salen los descuentos de un
          sueldo normal, la
          <NuxtLink :to="localePath('/herramientas/calculadora-sueldo-liquido')"
            >calculadora de sueldo líquido</NuxtLink
          >
          lo desglosa; y el
          <NuxtLink :to="localePath('/salario-vacacional-uruguay')">salario vacacional</NuxtLink>
          que integra este promedio tiene su propia página.
        </p>
      </VCard>

      <VCard variant="flat" class="note-card pa-5">
        <p class="note-text mb-0">
          <VIcon icon="mdi-currency-usd-off" color="warning" size="18" class="mr-1" />
          <strong>Por qué esta página no publica un monto.</strong> Porque no existe uno: el
          subsidio es el 100 % del promedio de <em>tu</em> historia laboral, así que cualquier cifra
          en pesos que leas como «lo que se cobra de licencia» es el caso de otra persona. Lo que sí
          es público es la fórmula, y está arriba. El trámite y el monto exacto se consultan en el
          BPS (*1997 desde celular, 0800 1997 desde fijo).
        </p>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in LICENCIA_PARENTAL_FAQ" :key="f.question">
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
        <VBtn :to="localePath('/salario-vacacional-uruguay')" variant="tonal" size="small">
          Salario vacacional y licencia
        </VBtn>
        <VBtn
          :to="localePath('/cuando-se-cobra-el-aguinaldo-uruguay')"
          variant="tonal"
          size="small"
        >
          Cuándo se cobra el aguinaldo
        </VBtn>
        <VBtn :to="localePath('/seguro-de-paro-uruguay')" variant="tonal" size="small">
          Seguro de paro
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
        <VBtn :to="localePath('/accidente-de-trabajo-uruguay')" variant="tonal" size="small">
          Accidente de trabajo
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="sources-note text-body-2 text-medium-emphasis mb-3">
        Contrastado contra la normativa en IMPO y las páginas oficiales del BPS y del Sistema de
        Cuidados el {{ verifiedAt }}. Esta página cubre el régimen que paga el BPS: la actividad
        pública se rige además por el estatuto de cada organismo, y un convenio colectivo de tu rama
        puede darte más que el mínimo legal, nunca menos.
      </p>
      <ul class="sources-list">
        <li v-for="s in LICENCIA_PARENTAL_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  LICENCIA_PARENTAL_CASOS,
  LICENCIA_PARENTAL_FAQ,
  LICENCIA_PARENTAL_SOURCES,
  LICENCIA_PARENTAL_VERIFIED_AT,
  MATERNIDAD_DIAS_POSPARTO,
  MATERNIDAD_DIAS_PREPARTO,
  MATERNIDAD_DIAS_TOTAL,
  MEDIO_HORARIO_HASTA_MESES,
  MEDIO_HORARIO_HASTA_MESES_EXTENDIDO,
  MEDIO_HORARIO_HORAS_MAX,
  MEDIO_HORARIO_PORCENTAJE,
  PATERNIDAD_DESGLOSE,
  PATERNIDAD_DIAS_BPS_DEPENDIENTE,
  PATERNIDAD_DIAS_EMPRESA,
  PATERNIDAD_DIAS_TOTAL,
  PATERNIDAD_VIGENTE_DESDE,
  PROMEDIO_MESES_DEPENDIENTE,
  PROMEDIO_MESES_NO_DEPENDIENTE,
  calendarioMaternidad,
} from '~/utils/licenciaParental'

const localePath = useLocalePath()

/** `yyyy-mm-dd` en una fecha larga en español, sin que la zona horaria corra el día. */
const fmt = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = fmt(LICENCIA_PARENTAL_VERIFIED_AT)
const vigenteDesde = fmt(PATERNIDAD_VIGENTE_DESDE)

// yyyy-mm-dd que devuelve <input type="date">; vacío hasta que la persona elija una fecha.
const fpp = ref('')
const calendario = computed(() => (fpp.value ? calendarioMaternidad(fpp.value) : null))

const canonicalUrl = 'https://cambio-uruguay.com/licencia-por-maternidad-y-paternidad-uruguay'
const title = 'Licencia por maternidad y paternidad en Uruguay: días y quién paga'
const description = `Desde el 1 de enero de 2026 la licencia por paternidad es de ${PATERNIDAD_DIAS_TOTAL} días corridos: ${PATERNIDAD_DIAS_EMPRESA} los paga la empresa (Ley 18.345) y ${PATERNIDAD_DIAS_BPS_DEPENDIENTE} el BPS (Ley 20.312). La maternal son ${MATERNIDAD_DIAS_TOTAL} días, ${MATERNIDAD_DIAS_PREPARTO} antes del parto y ${MATERNIDAD_DIAS_POSPARTO} después, y el medio horario se corta a los ${MEDIO_HORARIO_HASTA_MESES} meses del bebé. Poné tu fecha probable de parto y mirá en qué días cae.`

defineOgImageComponent('Cambio', {
  title: 'Licencia por maternidad y paternidad',
  subtitle: `${PATERNIDAD_DIAS_TOTAL} días de paternidad desde 2026 · ${MATERNIDAD_DIAS_TOTAL} días de maternidad`,
  tag: 'LICENCIA',
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
        'licencia por paternidad uruguay, cuantos dias de licencia por paternidad, licencia por maternidad uruguay, subsidio por maternidad bps, subsidio por paternidad bps, ley 20312, ley 19161, medio horario por cuidados, subsidio parental para cuidados, cuanto dura la licencia maternal, licencia paternidad 2026',
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
                name: 'Licencia por maternidad y paternidad en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: LICENCIA_PARENTAL_FAQ.map(f => ({
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
            dateModified: LICENCIA_PARENTAL_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: LICENCIA_PARENTAL_SOURCES.map(s => ({
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
.parental-page {
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
.note-text,
.fact-text,
.row-detail,
.hito__note,
.caso__efecto,
.caso__source {
  margin-top: 0;
}

.warn-card,
.note-card,
.calc-card,
.formula-card,
.fact-card,
.caso {
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

.pat-table :deep(th) {
  white-space: nowrap;
}
.row-detail {
  max-width: 52ch;
  line-height: 1.5;
}

.fpp-field {
  max-width: 320px;
}

.calendario {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}
.hito {
  padding: 16px 18px;
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-border-color), 0.14);
}
.hito.is-birth {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.35);
}
.hito.is-muted {
  opacity: 0.8;
}
.hito__label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
}
.hito__date {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 4px 0 6px;
}
.hito__note {
  font-size: 0.83rem;
  line-height: 1.5;
  opacity: 0.85;
}

.fact-num {
  font-size: 1.9rem;
  font-weight: 800;
  color: rgb(var(--v-theme-primary));
  line-height: 1.1;
  margin-bottom: 8px;
}
.fact-text {
  font-size: 0.9rem;
  line-height: 1.6;
}

.casos {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.caso {
  padding: 18px 20px;
}
.caso__label {
  line-height: 1.4;
  margin-top: 0;
}
.caso__efecto {
  line-height: 1.55;
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
.formula .term.is-result {
  background: rgba(22, 199, 132, 0.16);
  font-weight: 600;
}
.formula .op {
  opacity: 0.6;
}
.formula-note :deep(a),
.formula-note a {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  text-decoration: none;
}
.formula-note :deep(a:hover),
.formula-note a:hover {
  text-decoration: underline;
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
