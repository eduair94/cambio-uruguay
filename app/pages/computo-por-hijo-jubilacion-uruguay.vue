<template>
  <div class="cch-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-account-child-outline</VIcon>
              Jubilación
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Cómputo por hijo: un año de servicios por cada uno, hasta cinco
            </h1>
            <p class="text-body-1 cch-lead">
              Las madres suman <strong>un año de servicios por cada hijo</strong> nacido con vida o
              adoptado siendo menor o persona con discapacidad, con un
              <strong>máximo total de cinco años</strong>. Si el hijo está en situación de
              discapacidad severa, el cómputo agrega <strong>dos años más por ese hijo</strong>, y
              esos dos años <strong>no entran en el tope de cinco</strong>. Lo dice el artículo 43
              de la Ley 20.130.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Cuántos años de servicios suma cada hijo para la jubilación, según el artículo que rige hoy"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Los artículos y las dos páginas del BPS que sostienen esta página se abrieron uno por
              uno el {{ verifiedDisplay }}. No hay ninguna cifra calculada por nosotros: los años
              salen del propio artículo y los montos de la pasividad no se publican acá, porque
              dependen de la historia laboral de cada persona.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. La cuenta del propio artículo, con los hijos de quien lee -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Cuántos años te suma</h2>
            <VCard variant="tonal" class="pa-4">
              <VRow dense>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="childrenInput"
                    label="Hijos nacidos con vida o adoptados"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    max="20"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="severeInput"
                    label="De esos, con discapacidad severa"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    max="20"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
              </VRow>
              <p v-if="credit.totalYears > 0" class="cch-result text-body-1 mt-4 mb-0">
                Se suman <strong>{{ yearsLabel(credit.totalYears) }}</strong> de servicios a la
                historia laboral: <strong>{{ yearsLabel(credit.baseYears) }}</strong> por el numeral
                1<span v-if="credit.extraYears > 0">
                  y <strong>{{ yearsLabel(credit.extraYears) }}</strong> de adicional por
                  discapacidad severa, que quedan fuera del tope de cinco</span
                >.
              </p>
              <p v-else class="cch-result text-body-2 text-medium-emphasis mt-4 mb-0">
                Escribí cuántos hijos nacidos con vida o adoptados tenés.
              </p>
              <p v-if="credit.cappedBase" class="cch-note text-body-2 mb-0">
                Con {{ childrenValue }} hijos el numeral 1 ya llegó al tope de cinco años: un hijo
                más no suma por esa vía, aunque sí sumaría el adicional si estuviera en situación de
                discapacidad severa.
              </p>
              <p class="text-caption text-medium-emphasis mt-3 mb-0">
                Son los años de servicios que manda sumar el artículo 43, nada más. Cuánto cambia la
                pasividad depende del sueldo básico jubilatorio y de la tasa de reemplazo, que se
                calculan sobre la historia laboral de cada persona: ningún importe de eso se publica
                acá porque no se puede saber sin esos datos.
              </p>
            </VCard>
          </section>

          <!-- 2. El ángulo de la página: la norma que casi todos citan no es la que rige -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              Casi todo lo que vas a leer cita un artículo derogado
            </h2>
            <VCard variant="outlined" class="pa-4">
              <p class="text-body-1 cch-prose">
                El cómputo por hijo nació en el <strong>artículo 14 de la Ley 18.395</strong>, y ése
                es el artículo que siguen citando los resúmenes. En IMPO ese artículo aparece hoy
                <strong>derogado</strong>, y lo derogó el último inciso del mismo artículo que lo
                reemplazó: el <strong>artículo 43 de la Ley 20.130</strong>, del 2 de mayo de 2023.
              </p>
              <p class="text-body-1 cch-prose">
                Citar el viejo no cambia el número más conocido —el año por hijo con tope de cinco
                sigue igual— y por eso el error no se nota. Se nota en todo lo demás, que es nuevo:
                los dos años adicionales por hijo con discapacidad severa sin tope, la posibilidad
                de dividirlos entre los padres, el caso del padre cuando fallece la madre y, sobre
                todo,
                <strong>qué cajas quedan comprendidas y qué cajas apenas pueden optar</strong>. Si
                la respuesta que te dieron sólo nombra al BPS y a la Ley 18.395, está contestando
                con el régimen anterior.
              </p>
            </VCard>
          </section>

          <!-- 3. Quién puede usarlo -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Quién lo puede computar</h2>
            <ul class="cch-list">
              <li>
                <strong>Las madres</strong>, por cada hijo nacido con vida o adoptado siendo menor o
                persona con discapacidad: un año, hasta cinco en total (numeral 1).
              </li>
              <li>
                <strong>Los padres, si fallece la madre</strong>, siempre que al momento del
                fallecimiento existieran hijos menores o incapaces a cargo y convivan o pasen a
                convivir con el padre (numeral 3).
              </li>
              <li>
                <strong>Los dos, repartido</strong>, para el adicional por discapacidad severa:
                «siempre que medie acuerdo entre los padres, podrá dividirse este cómputo en la
                forma que decidan en períodos no menores de {{ MIN_SPLIT_MONTHS }} meses» (numeral
                2). El BPS agrega en su página que, si no hay acuerdo, los adicionales
                <strong>se reservan para la madre</strong>, y que cuando el hijo está en situación
                de discapacidad severa la convivencia no es un requisito.
              </li>
            </ul>
            <p class="text-body-1 cch-prose">
              El numeral 4 pone el límite que conviene saber antes de hacer cuentas: los servicios
              fictos de este artículo <strong>se consideran ordinarios y fraccionables</strong>,
              pero
              <strong>no pueden usarse para reformar una cédula jubilatoria ya otorgada</strong>. Es
              decir que sirven para configurar o mejorar la causal antes de jubilarse, no para
              recalcular una pasividad que ya se está cobrando.
            </p>
          </section>

          <!-- 4. El dato que ningún resumen trae: a qué caja alcanza -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              En qué cajas rige, y en cuáles hay que preguntar
            </h2>
            <p class="text-body-1 cch-prose">
              El artículo 43 no alcanza a todas las cajas del mismo modo, y esto es lo que más
              cambia la respuesta según dónde aportes. En tres rige por la ley; en las otras tres es
              una
              <strong>facultad</strong> de cada caja, que además debe informar al Poder Ejecutivo
              los fundamentos de lo que resuelva.
            </p>
            <VTable class="cu-mobile-cards cch-table" density="comfortable">
              <thead>
                <tr>
                  <th>Caja</th>
                  <th>Cómo la alcanza el artículo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="scheme in CREDIT_SCHEMES" :key="scheme.id">
                  <td data-label="Caja">
                    <strong>{{ scheme.name }}</strong>
                    <VChip
                      class="ml-2"
                      size="x-small"
                      variant="tonal"
                      :color="scheme.status === 'comprendida' ? 'success' : 'warning'"
                    >
                      {{ scheme.status === 'comprendida' ? 'Comprendida' : 'Puede optar' }}
                    </VChip>
                  </td>
                  <td data-label="Cómo la alcanza el artículo">{{ scheme.detail }}</td>
                </tr>
              </tbody>
            </VTable>
          </section>

          <!-- 5. El segundo beneficio, que es el que casi nadie pide -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">
              El otro beneficio del mismo paquete: acortar los veinte años del promedio
            </h2>
            <VCard variant="outlined" class="pa-4">
              <p class="text-body-1 cch-prose">
                El sueldo básico jubilatorio se calcula, por el artículo 44, como el promedio de las
                asignaciones computables actualizadas de los
                <strong>veinte años</strong> anteriores. Para una madre eso arrastra hacia abajo los
                meses de maternidad, cuando el ingreso computable cae. El
                <strong>artículo 45</strong> permite sacar esos meses del promedio:
              </p>
              <ul class="cch-list">
                <li>
                  la ventana del promedio «podrá reducirse a razón de
                  <strong>hasta dos años continuos por cada hijo</strong>»;
                </li>
                <li>
                  el período excluido <strong>no puede empezar antes de seis meses</strong> de la
                  fecha de nacimiento del hijo <strong>ni después de tres meses</strong> de la
                  misma;
                </li>
                <li>
                  el total que puede excluirse es de <strong>cinco años como máximo</strong>, y sólo
                  si la ventana a considerar, antes de la reducción, incluye
                  <strong>veinte años como mínimo</strong>;
                </li>
                <li>
                  la reducción se aplica <strong>sólo si resulta más conveniente</strong>: primero
                  se calcula el sueldo básico jubilatorio y después se compara.
                </li>
              </ul>
              <p class="text-body-1 cch-prose">
                El BPS lo dice en términos de trámite: quienes cesen o configuren causal después del
                <strong>1.º de diciembre de 2023</strong> y usen el cómputo por hijo tienen un
                cálculo adicional que excluye las remuneraciones del período de maternidad, y
                <strong>si ese cálculo es más beneficioso se otorga automáticamente</strong>. O sea
                que acá no hay nada que pedir; lo que hay que saber es que existe, para poder
                reclamar si no apareció.
              </p>
            </VCard>
          </section>

          <!-- 6. Desde cuándo -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">Desde cuándo rige cada cosa</h2>
            <p class="text-body-1 cch-prose">
              Las dos reglas no empezaron el mismo día, porque el artículo 6 de la Ley 20.130 le da
              a cada disposición su propia fecha. El cómputo del artículo 43 rige desde la fecha del
              numeral 1 de ese artículo —el primer día del tercer mes siguiente al de la publicación
              de la ley en el Diario Oficial—, que el informe del BPS a un año de la ley ubica en
              <strong>agosto de 2023</strong>. El recálculo del artículo 45 rige desde la fecha del
              numeral 4 —el primer día del mes siguiente a los ciento ochenta días de la
              publicación—, y el BPS la escribe como el <strong>1.º de diciembre de 2023</strong> en
              su página del cómputo ficto por cuidados.
            </p>
            <p class="text-body-2 text-medium-emphasis cch-prose">
              Esta página explica qué dice la norma y cómo la aplica el BPS; no es asesoramiento
              previsional ni una liquidación. Un caso concreto —multiempleo, servicios bonificados,
              convergencia de regímenes o una caja de las que «pueden optar»— se consulta en el
              organismo donde aportás.
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
            <ul class="cch-list">
              <li v-for="source in CHILD_CREDIT_SOURCES" :key="source.url">
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.label
                }}</a>
              </li>
            </ul>
          </section>

          <VDivider class="mb-4" />

          <section>
            <h2 class="text-h6 font-weight-bold mb-3">Seguí por acá</h2>
            <ul class="cch-list">
              <li>
                <NuxtLink :to="localePath('/cuando-me-puedo-jubilar-uruguay')">
                  Cuándo me puedo jubilar
                </NuxtLink>
                — la edad y los años de servicios que piden las causales, donde este cómputo se
                suma.
              </li>
              <li>
                <NuxtLink :to="localePath('/reconocer-anos-trabajados-uruguay')">
                  Reconocer años trabajados
                </NuxtLink>
                — qué hacer si la historia laboral no tiene todos tus períodos.
              </li>
              <li>
                <NuxtLink :to="localePath('/guias/jubilacion-parcial-uruguay')">
                  Jubilación parcial
                </NuxtLink>
                — cobrar media jubilación y seguir trabajando medio horario.
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
  CHILD_CREDIT_PATH,
  CHILD_CREDIT_SOURCES,
  CHILD_CREDIT_VERIFIED_AT,
  CREDIT_SCHEMES,
  MIN_SPLIT_MONTHS,
  childServiceCredit,
} from '~/utils/childServiceCredit'

const localePath = useLocalePath()

const childrenInput = ref('')
const severeInput = ref('')

const childrenValue = computed(() => Number(childrenInput.value))
const credit = computed(() =>
  childServiceCredit({
    children: Number(childrenInput.value),
    severeDisability: Number(severeInput.value),
  })
)

const yearsLabel = (years: number): string => (years === 1 ? '1 año' : `${years} años`)

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = displayDate(CHILD_CREDIT_VERIFIED_AT)

const faqs = [
  {
    question: '¿Los hijos suman años para la jubilación en Uruguay?',
    answer:
      'Sí. El artículo 43 de la Ley 20.130 da a las madres un año de servicios por cada hijo nacido con vida o adoptado siendo menor o persona con discapacidad, con un máximo total de cinco años. Si el hijo está en situación de discapacidad severa se agregan dos años más por ese hijo, y esos dos años no cuentan para el tope de cinco.',
  },
  {
    question: '¿Sigue vigente el artículo 14 de la Ley 18.395?',
    answer:
      'No. IMPO lo muestra derogado por el artículo 43 de la Ley 20.130, del 2 de mayo de 2023, que es el mismo artículo que lo reemplazó. El año por hijo con tope de cinco no cambió, pero el adicional por discapacidad severa, la división entre padres y el alcance a otras cajas son del artículo nuevo.',
  },
  {
    question: '¿El padre puede usar el cómputo por hijo?',
    answer:
      'El numeral 3 del artículo 43 lo habilita cuando fallece la madre, siempre que al momento del fallecimiento existieran hijos menores o incapaces a cargo y convivan o pasen a convivir con el padre. Además, el adicional por hijo con discapacidad severa puede dividirse entre los padres si media acuerdo, en períodos no menores de seis meses; el BPS aclara que sin acuerdo esos adicionales se reservan para la madre.',
  },
  {
    question: '¿Sirve para recalcular una jubilación que ya cobro?',
    answer:
      'No. El numeral 4 del artículo 43 dice que esos servicios fictos se consideran ordinarios y fraccionables pero no pueden utilizarse para reformar cédula jubilatoria alguna. Sirven para configurar o mejorar la causal antes de jubilarse.',
  },
  {
    question: '¿Vale en la Caja Bancaria, la Notarial o la de Profesionales?',
    answer:
      'No por la ley. El artículo 43 alcanza por sí mismo al BPS, al Servicio de Retiros y Pensiones de las Fuerzas Armadas y a la Dirección Nacional de Asistencia y Seguridad Social Policial. A la Caja Bancaria, la Notarial y la de Profesionales Universitarios les da la facultad de aplicarlo en forma total o parcial, informando al Poder Ejecutivo los fundamentos, así que hay que preguntar en cada una.',
  },
  {
    question: '¿Hay que pedir el recálculo del sueldo básico jubilatorio por maternidad?',
    answer:
      'El BPS dice que para quienes cesen o configuren causal después del 1.º de diciembre de 2023 el cálculo adicional que excluye las remuneraciones del período de maternidad se otorga automáticamente si resulta más beneficioso. El artículo 45 fija los límites: hasta dos años continuos por hijo, cinco en total como máximo, y sólo si la ventana del promedio incluye al menos veinte años.',
  },
]

const canonicalUrl = `https://cambio-uruguay.com${CHILD_CREDIT_PATH}`

// El título y la descripción van como literales EN LA PÁGINA, que es la forma que leen
// `seoTitleBudget.test.ts` y `seoDescriptionBudget.test.ts` sin ejecutar la app: armados desde el
// catálogo saldrían del control de los 60 y los 155 caracteres. Que no se despeguen de las dos
// constantes del artículo lo vigila `childServiceCredit.test.ts`.
const title = 'Cómputo por hijo: 1 año cada uno, hasta 5'
const description =
  'Cada hijo suma un año de servicios para la jubilación, con tope de cinco, y dos más sin tope si tiene discapacidad severa. Ley 20.130, art. 43: qué cajas.'

defineOgImageComponent('Cambio', {
  title: 'Cómputo por hijo',
  subtitle: 'Un año de servicios por hijo, hasta cinco',
  tag: 'JUBILACIÓN',
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
        'computo por hijo jubilacion, anos por hijo jubilacion uruguay, computo ficto por cuidados, ley 20130 articulo 43, jubilacion de la mujer uruguay, cinco anos por hijos bps',
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
                name: 'Finanzas personales y jubilación',
                item: 'https://cambio-uruguay.com/temas/finanzas-personales-y-jubilacion-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Cómputo por hijo para la jubilación',
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
.cch-lead {
  margin-top: 0;
  margin-bottom: 0;
}

.cch-prose {
  margin-top: 1rem;
  margin-bottom: 0;
}

.cch-result {
  margin-bottom: 0;
}

.cch-note {
  margin-top: 0.75rem;
}

.cch-list {
  margin-top: 1rem;
  margin-bottom: 0;
  padding-left: 1.25rem;
}

.cch-list li {
  margin-top: 0.5rem;
}

.cch-table {
  margin-top: 1rem;
}
</style>
