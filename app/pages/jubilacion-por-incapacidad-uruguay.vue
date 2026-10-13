<template>
  <div class="inc-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-wheelchair-accessibility</VIcon>
              BPS
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Jubilación por incapacidad y subsidio transitorio: qué paga el BPS si no podés
              trabajar
            </h1>
            <p class="text-body-1 inc-lead">
              Son <strong>dos prestaciones distintas</strong> y la diferencia no es el porcentaje:
              es el grado de incapacidad que dictaminan los médicos del BPS. Si no podés hacer
              <strong>tu</strong> trabajo, el subsidio transitorio se paga
              <strong>hasta {{ maxYears }} años</strong> y la ley le pone un piso de
              <strong>{{ floorLabel }}</strong
              >. Si no podés hacer <strong>ninguno</strong>, la jubilación por incapacidad total es
              vitalicia y no tiene mínimo escrito.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Jubilación por incapacidad y subsidio transitorio del BPS"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Datos cotejados contra las fichas del BPS y el texto vigente en impo.com.uy el
              {{ verifiedDisplay }}.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. Las dos prestaciones, una al lado de la otra -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Las dos prestaciones</h2>
            <p class="text-body-1 inc-prose mb-4">
              El dictamen médico del BPS decide cuál te toca, y esa decisión se revisa: un subsidio
              transitorio puede terminar convertido en jubilación por incapacidad total sin que
              vuelvas a empezar el trámite.
            </p>
            <VCard
              v-for="benefit in benefits"
              :key="benefit.id"
              variant="outlined"
              class="inc-card pa-4 mb-4"
            >
              <p class="text-subtitle-1 font-weight-bold inc-card-title">{{ benefit.label }}</p>
              <dl class="inc-dl">
                <dt>Qué incapacidad</dt>
                <dd>{{ benefit.degree }}</dd>
                <dt>Cuánto dura</dt>
                <dd>{{ benefit.duration }}</dd>
                <dt>Cómo se calcula</dt>
                <dd>{{ benefit.amount }}</dd>
                <dt>Piso legal</dt>
                <dd>{{ benefit.floor ?? 'No tiene un mínimo escrito en su artículo.' }}</dd>
              </dl>
            </VCard>
          </section>

          <!-- 2. La regla que decide si la página te sirve -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">No es una forma de jubilarse antes</h2>
            <VAlert type="warning" variant="tonal" density="comfortable" class="mb-4">
              <p class="text-body-2 inc-alert">
                La causal por incapacidad «opera exclusivamente en aquellos casos en que la persona
                afiliada no reúna los requisitos de edad y tiempo de servicios necesarios para
                configurar otra causal jubilatoria» (Ley 20.130, art. 41), y el subsidio transitorio
                se sirve hasta que esos requisitos se reúnan (art. 49). Es el primer requisito que
                lista la ficha del BPS.
              </p>
            </VAlert>
            <p class="text-body-1 inc-prose">
              O sea que si ya tenés la edad y los años para la
              <NuxtLink :to="localePath('/cuando-me-puedo-jubilar-uruguay')" class="cu-link">
                causal común </NuxtLink
              >, el camino es ése y no éste. Y si te incapacitaste pero no llegás a ninguno de los
              mínimos de abajo, la puerta que queda es la
              <NuxtLink :to="localePath('/pension-a-la-vejez-uruguay')" class="cu-link">
                pensión por invalidez no contributiva </NuxtLink
              >, que el BPS liquida en la misma fila que la pensión a la vejez.
            </p>
          </section>

          <!-- 3. Los mínimos de actividad -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuántos años de aportes piden</h2>
            <ul class="inc-list mb-4">
              <li v-for="rule in serviceRules" :key="rule.id">
                <strong>{{ rule.label }}</strong> — {{ rule.detail }}
              </li>
            </ul>
            <p class="text-body-2 inc-note">
              El corte de los seis meses va por edad cumplida: con 25 justos todavía son seis meses;
              desde los 26, dos años.
            </p>
          </section>

          <!-- 4. Cuánto se paga -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cómo se calcula el monto</h2>
            <p class="text-body-1 inc-prose mb-4">
              No es un porcentaje fijo del sueldo. El BPS toma tu sueldo básico jubilatorio y le
              aplica la tasa de adquisición de derechos que te habría correspondido
              <em>si hubieras podido seguir trabajando</em> hasta configurar causal, proyectando los
              años que te faltan. Y manda considerar una edad mínima de 65 años incluso si la edad
              normal que te toca fuera menor (Ley 20.130, art. 48), que es la tasa de
              <strong>{{ rateAt65 }} % por año computado</strong> de la tabla del art. 46.
            </p>
            <VAlert type="info" variant="tonal" density="comfortable" class="mb-4">
              <p class="text-body-2 inc-alert">
                <strong>El promedio no es el de veinte años.</strong> La jubilación común promedia
                «los veinte años de mayores asignaciones computables» (art. 44, num. 1). En la
                jubilación por incapacidad total se toma «el promedio actualizado del período
                computable efectivamente registrado en la historia laboral» (art. 44, num. 6): a
                quien se incapacita a los 30 no se le exige un promedio de veinte años que no pudo
                tener.
              </p>
            </VAlert>
            <p class="text-body-1 inc-prose mb-4">
              Si los años a computar —incluidos los fictos— no llegan a los mínimos del art. 35, el
              propio art. 48 fija la salida: la tasa de los 70 años, que es
              {{ rateAt70 }} %, con {{ fallbackYears }} años de servicios. Multiplicados, los dos
              números que el artículo nombra dan el <strong>{{ fallbackShare }} %</strong> del
              sueldo básico jubilatorio.
            </p>
            <p class="text-subtitle-2 font-weight-bold inc-sub">Los complementos que se suman</p>
            <ul class="inc-list mb-3">
              <li v-for="complement in complements" :key="complement.id">
                <strong>+{{ complement.percent }} %</strong> — {{ complement.label }}
              </li>
            </ul>
            <p class="text-body-2 inc-note mb-2">
              Un hijo cuenta para el 20 % si cumple alguna de estas cuatro condiciones:
            </p>
            <ul class="inc-list mb-0">
              <li v-for="condition in childConditions" :key="condition">{{ condition }}</li>
            </ul>
          </section>

          <!-- 5. El piso, y la asimetría -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">El piso lo tiene una sola de las dos</h2>
            <p class="text-body-1 inc-prose mb-4">
              El art. 50 le da al subsidio transitorio un «monto mínimo igual a la prestación no
              contributiva por invalidez y vejez». La ley le puso a esa prestación un valor inicial
              de $ {{ floorLawAmount }} en {{ floorLawYear }} y la ajusta por el artículo 67 de la
              Constitución; el valor corriente lo publica el BPS en su tabla de montos, en la fila
              «Pensión vejez e invalidez»: <strong>{{ floorLabel }}</strong
              >.
            </p>
            <p class="text-body-1 inc-prose">
              El art. 48, que fija la jubilación por incapacidad total, no escribe ningún mínimo. Lo
              que nombra al lado es el
              <NuxtLink :to="localePath('/suplemento-solidario-bps')" class="cu-link">
                suplemento solidario </NuxtLink
              >, que es otra prestación, tiene sus propias condiciones y se pide aparte.
            </p>
          </section>

          <!-- 6. El trámite -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">El trámite empieza por el médico</h2>
            <p class="text-body-1 inc-prose mb-4">
              Las dos prestaciones cuelgan de un dictamen, así que el primer paso no es pedir la
              prestación: es la <strong>evaluación de incapacidad</strong>. Es presencial y lo que
              pide es esto:
            </p>
            <ul class="inc-list mb-4">
              <li v-for="doc in evaluationDocs" :key="doc">{{ doc }}</li>
            </ul>
            <p class="text-body-1 inc-prose">
              La revisión de un subsidio ya en curso se pide
              <strong>desde {{ reviewLeadDays }} días antes de que venza</strong> la prestación: es
              el único plazo que el BPS publica en todo el trámite, y se pierde por no mirar el
              calendario. Los certificados y constancias del organismo se piden por las vías de
              <NuxtLink :to="localePath('/certificados-bps-uruguay')" class="cu-link">
                certificados del BPS </NuxtLink
              >.
            </p>
          </section>

          <!-- 7. Mientras se resuelve -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Qué se cobra mientras se resuelve</h2>
            <p class="text-body-1 inc-prose mb-4">
              Entre la
              <NuxtLink
                :to="localePath('/guias/me-certifique-subsidio-por-enfermedad-uruguay')"
                class="cu-link"
              >
                licencia médica </NuxtLink
              >y la prestación por incapacidad hay un puente que casi nadie nombra. Si la Junta
              Médica del Servicio de Certificaciones Médicas de ASSE declara a la persona
              imposibilitada para su empleo, ASSE sigue pagando el subsidio por
              <strong>hasta {{ prejubilatorioDays }} días</strong> contados desde ese dictamen, con
              carácter prejubilatorio (Decreto-Ley 14.407, art. 17).
            </p>
            <p class="text-body-1 inc-prose">
              Ese adelanto no es un regalo: se descuenta de la primera liquidación jubilatoria y, si
              queda saldo, se cobra en cuotas mensuales que no pueden pasar del
              <strong>{{ prejubilatorioCapPct }} %</strong> del valor nominal del beneficio. Dentro
              de esos {{ prejubilatorioDays }} días tienen que examinarte los servicios médicos del
              BPS, y si los dos dictámenes no coinciden decide, en forma definitiva e irrecurrible,
              un tribunal médico con un médico de ASSE, uno del BPS y uno del Ministerio de Salud
              Pública como presidente.
            </p>
          </section>

          <!-- 8. Los controles -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Los controles no terminan con el alta</h2>
            <ul class="inc-list mb-0">
              <li v-for="control in controls" :key="control">{{ control }}</li>
            </ul>
          </section>

          <!-- 9. Qué régimen rige -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Acá el régimen no lo decide tu año de nacimiento
            </h2>
            <p class="text-body-1 inc-prose mb-4">
              En la jubilación común la Ley 20.130 parte la tabla por año de nacimiento. En estas
              dos prestaciones dice lo contrario: «El régimen aplicable se determinará en función de
              la fecha en que sea solicitada la cobertura cualquiera fuera la oportunidad de ingreso
              al mercado de trabajo» (art. 6, num. 3). La ficha del BPS lo resume en una línea:
              alcanza a los afiliados de cualquier régimen que soliciten amparo después del
              {{ regimeStartDisplay }}.
            </p>
            <p class="text-body-1 inc-prose">
              Y un dato que vale para quien cobra del Banco de Seguros: las rentas por incapacidad
              permanente o muerte de la Ley 16.074 —las del
              <NuxtLink :to="localePath('/accidente-de-trabajo-uruguay')" class="cu-link">
                seguro de accidentes de trabajo </NuxtLink
              >— son «íntegramente compatibles» con las jubilaciones y pensiones de la seguridad
              social (art. 41, último inciso).
            </p>
          </section>

          <!-- 10. FAQ -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.id" :title="faq.question">
                <template #text>
                  <p class="text-body-2 inc-prose">{{ faq.answer }}</p>
                </template>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 11. Lo que no publicamos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Lo que esta página no publica</h2>
            <p class="text-body-1 inc-prose mb-4">
              Cinco datos que los resúmenes de este tema publican y acá no van, con el motivo al
              lado. El primero es el más repetido de todos.
            </p>
            <div v-for="item in unpublished" :key="item.id" class="inc-unpublished mb-3">
              <p class="text-subtitle-2 font-weight-bold inc-unpublished-q">{{ item.what }}</p>
              <p class="text-body-2 inc-prose inc-unpublished-a">{{ item.why }}</p>
            </div>
          </section>

          <!-- 12. Seguir por acá -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Seguir por acá</h2>
            <ul class="inc-list">
              <li>
                <NuxtLink :to="localePath('/pension-a-la-vejez-uruguay')">
                  Pensión a la vejez e invalidez </NuxtLink
                >— la prestación no contributiva, que es la puerta de quien no llega a los mínimos
                de esta página.
              </li>
              <li>
                <NuxtLink :to="localePath('/suplemento-solidario-bps')">
                  Suplemento solidario </NuxtLink
                >— lo que la ley nombra al lado de la jubilación por incapacidad y se pide aparte.
              </li>
              <li>
                <NuxtLink :to="localePath('/accidente-de-trabajo-uruguay')">
                  Accidente de trabajo </NuxtLink
                >— la renta del Banco de Seguros, compatible con esta jubilación.
              </li>
              <li>
                <NuxtLink :to="localePath('/pension-por-sobrevivencia-uruguay')">
                  Pensión por sobrevivencia </NuxtLink
                >— la del grupo familiar cuando el trabajador fallece.
              </li>
              <li>
                <NuxtLink :to="localePath('/fecha-de-cobro-bps-uruguay')">
                  Fecha de cobro del BPS </NuxtLink
                >— cuándo y dónde se cobra una prestación en curso.
              </li>
              <li>
                <NuxtLink :to="localePath('/iass-uruguay')"> IASS </NuxtLink>— el impuesto que grava
                las pasividades, que es lo que pasa a ser la jubilación por incapacidad.
              </li>
            </ul>
          </section>

          <!-- 13. Fuentes -->
          <VCard variant="flat" class="inc-sources pa-5 mb-6">
            <p class="text-subtitle-1 font-weight-bold inc-sources-title">Fuentes</p>
            <ul class="inc-sources-list">
              <li v-for="source in sources" :key="source.id">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
                <span v-if="source.updatedAt" class="text-caption text-medium-emphasis">
                  — última actualización {{ displayDate(source.updatedAt) }}
                </span>
              </li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import {
  INCAPACITY_BENEFITS,
  INCAPACITY_CHILD_CONDITIONS,
  INCAPACITY_COMPLEMENTS,
  INCAPACITY_CONTROLS,
  INCAPACITY_EVALUATION_DOCS,
  INCAPACITY_FALLBACK_YEARS,
  INCAPACITY_FAQ,
  INCAPACITY_FLOOR_LAW_AMOUNT,
  INCAPACITY_FLOOR_LAW_YEAR,
  INCAPACITY_PATH,
  INCAPACITY_PREJUBILATORIO,
  INCAPACITY_RATE_AT_65_PCT,
  INCAPACITY_RATE_AT_70_PCT,
  INCAPACITY_REGIME_START,
  INCAPACITY_REVIEW_LEAD_DAYS,
  INCAPACITY_SERVICE_RULES,
  INCAPACITY_SOURCES,
  INCAPACITY_SUBSIDY_FLOOR,
  INCAPACITY_SUBSIDY_MAX_YEARS,
  INCAPACITY_UNPUBLISHED,
  INCAPACITY_VERIFIED_AT,
  incapacityFallbackShare,
} from '~/utils/incapacityPension'

const localePath = useLocalePath()

const benefits = INCAPACITY_BENEFITS
const serviceRules = INCAPACITY_SERVICE_RULES
const complements = INCAPACITY_COMPLEMENTS
const childConditions = INCAPACITY_CHILD_CONDITIONS
const evaluationDocs = INCAPACITY_EVALUATION_DOCS
const controls = INCAPACITY_CONTROLS
const unpublished = INCAPACITY_UNPUBLISHED
const faqs = INCAPACITY_FAQ
const sources = INCAPACITY_SOURCES

const maxYears = INCAPACITY_SUBSIDY_MAX_YEARS
const reviewLeadDays = INCAPACITY_REVIEW_LEAD_DAYS
const prejubilatorioDays = INCAPACITY_PREJUBILATORIO.days
const prejubilatorioCapPct = INCAPACITY_PREJUBILATORIO.maxMonthlyDeductionPct
const fallbackYears = INCAPACITY_FALLBACK_YEARS

const numberEsUy = (value: number): string => value.toLocaleString('es-UY')

const rateAt65 = numberEsUy(INCAPACITY_RATE_AT_65_PCT)
const rateAt70 = numberEsUy(INCAPACITY_RATE_AT_70_PCT)
const fallbackShare = numberEsUy(incapacityFallbackShare())
const floorLawAmount = numberEsUy(INCAPACITY_FLOOR_LAW_AMOUNT)
const floorLawYear = INCAPACITY_FLOOR_LAW_YEAR

/**
 * El piso del subsidio, en pesos.
 *
 * Es un monto PUBLICADO por el BPS, no una lectura viva de la API: sale de la tabla de montos de
 * pasividades, que se reajusta una vez al año. Por eso va con su fecha en la lista de fuentes y la
 * misma cifra queda fijada en `incapacityPension.test.ts` contra la constante compartida.
 */
const floorLabel = `$ ${numberEsUy(INCAPACITY_SUBSIDY_FLOOR)}`

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = displayDate(INCAPACITY_VERIFIED_AT)
const regimeStartDisplay = displayDate(INCAPACITY_REGIME_START)

const canonicalUrl = `https://cambio-uruguay.com${INCAPACITY_PATH}`

// 41 caracteres, 58 con la marca: entra en los 60 que publica Google (`seoTitleBudget`). Nombra
// las dos prestaciones porque son dos familias de consulta distintas («jubilacion por incapacidad
// bps» y «subsidio transitorio por incapacidad parcial») y ninguna página del sitio reclamaba
// ninguna de las dos.
const title = 'Jubilación por incapacidad y subsidio BPS'
// La regla de oro medida en este sitio: una descripción con el número del día corre a ~1,4 % de
// CTR y una genérica a 0,03–0,2 % desde la misma posición. Las tres cifras que entran son las que
// deciden la lectura: el plazo, el piso y que la otra prestación es vitalicia. 154 caracteres.
// El literal se mide en `seoDescriptionBudget` y el importe queda atado a la constante compartida
// por `incapacityPension.test.ts`, así que un reajuste del BPS no puede dejarlo viejo en silencio.
const description =
  'El subsidio transitorio por incapacidad parcial se paga hasta 3 años con piso de $ 18.575; ' +
  'la jubilación por incapacidad total es vitalicia. Piden 2 años.'

defineOgImageComponent('Cambio', {
  title: 'Jubilación por incapacidad del BPS',
  subtitle: `Subsidio transitorio hasta 3 años · piso de ${floorLabel}`,
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
        'jubilacion por incapacidad total bps, subsidio transitorio por incapacidad parcial, pension por invalidez bps, incapacidad laboral uruguay, junta medica bps, evaluacion de incapacidad bps, ley 20130 incapacidad, cuanto se cobra por incapacidad uruguay',
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
                name: 'Jubilación por incapacidad y subsidio transitorio',
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
            dateModified: INCAPACITY_VERIFIED_AT,
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
/* Vuetify 4 no anula el margen de los bloques de texto y éste no colapsa dentro de una tarjeta ni
   de un item de flex: cada bloque declara el suyo (DESIGN.md → "The Text Block Owns Its Top
   Margin Rule"). */
.inc-lead,
.inc-prose,
.inc-note,
.inc-alert {
  margin-top: 0;
}

.inc-lead {
  font-size: 1.0625rem;
  line-height: 1.7;
}

.inc-prose {
  line-height: 1.7;
}

.inc-note {
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.74;
}

.inc-sub {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.inc-card-title {
  margin-top: 0;
  margin-bottom: 0.75rem;
}

.inc-dl {
  display: grid;
  grid-template-columns: minmax(8rem, 10rem) 1fr;
  gap: 0.35rem 1rem;
  margin: 0;
}

.inc-dl dt {
  font-weight: 600;
  opacity: 0.8;
}

.inc-dl dd {
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 599px) {
  .inc-dl {
    grid-template-columns: 1fr;
    gap: 0.15rem;
  }

  .inc-dl dd {
    margin-bottom: 0.6rem;
  }
}

.inc-list {
  margin-top: 0;
  padding-left: 1.25rem;
  line-height: 1.7;
}

.inc-list li + li {
  margin-top: 0.5rem;
}

.inc-unpublished {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 0.9rem;
}

.inc-unpublished-q,
.inc-unpublished-a {
  margin-top: 0;
}

.inc-unpublished-q {
  margin-bottom: 0.25rem;
}

.inc-sources-title {
  margin-top: 0;
  margin-bottom: 0.75rem;
}

.inc-sources {
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.inc-sources-list {
  margin-top: 0;
  padding-left: 1.25rem;
  line-height: 1.7;
}
</style>
