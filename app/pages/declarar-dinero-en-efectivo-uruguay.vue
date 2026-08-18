<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Transporte de valores · Ley 20.469, marzo de 2026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        ¿Cuánta plata podés entrar o sacar de Uruguay sin declarar?
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Hasta <strong>US$ 10.000</strong> no declarás nada. Por encima de esa cifra tenés que
        declararlo en la Aduana — no es un impuesto ni un tope: llevar plata es legal y no paga
        nada, lo que se castiga es no avisar. Desde marzo de 2026 la multa por callarse dejó de ser
        discrecional y pasó a ser <strong>30 % del excedente</strong>.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        Todo lo de esta página sale del <strong>artículo 29 de la Ley 19.574</strong> en su
        redacción vigente (dada por la <strong>Ley 20.469 del 19/03/2026</strong>) y del
        <strong>Decreto 255/006</strong>. Si algo no está en una norma, lo decimos.
      </VAlert>
    </header>

    <!-- The calculator -->
    <section class="mb-8" aria-label="Calculadora: ¿tenés que declarar el efectivo?">
      <h2 class="section-heading mb-4">Contame cuánto llevás</h2>

      <VCard variant="flat" class="calc pa-4 pa-sm-6">
        <VRow>
          <VCol cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">Efectivo que cruza con vos</div>
            <VTextField
              v-model.number="amountUsd"
              type="number"
              min="0"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Contá también euros, reales o pesos: la ley dice «o su equivalente en otras monedas»"
              persistent-hint
            />
          </VCol>

          <VCol cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">¿Es la primera vez?</div>
            <VBtnToggle
              v-model="repeatOffence"
              color="primary"
              mandatory
              divided
              variant="outlined"
              class="w-100 mb-4"
            >
              <VBtn :value="false" class="flex-grow-1">
                <VIcon start>mdi-numeric-1-circle-outline</VIcon>
                Primera omisión
              </VBtn>
              <VBtn :value="true" class="flex-grow-1">
                <VIcon start>mdi-repeat</VIcon>
                Reincidencia
              </VBtn>
            </VBtnToggle>
          </VCol>
        </VRow>

        <VAlert :type="verdictTone" variant="tonal" class="mt-4" :icon="verdictIcon" border="start">
          <p class="text-subtitle-1 font-weight-bold mb-1">{{ verdictTitle }}</p>
          <p class="mb-0 text-body-2">
            <template v-if="decision.mustDeclare">
              Excedente sobre US$ 10.000: <strong>US$ {{ money(decision.excessUsd) }}</strong
              >. Si cruzás sin declararlo, la multa es del {{ decision.fineRatePct }} %
              {{ decision.fineOnTotal ? 'del total transportado' : 'de ese excedente' }}:
              <strong>US$ {{ money(decision.fineUsd) }}</strong
              >.
            </template>
            <template v-else>
              Estás en o por debajo del umbral: la ley obliga a declarar sólo por un monto
              <em>superior</em> a US$ 10.000, así que exactamente 10.000 no dispara nada.
            </template>
          </p>
        </VAlert>

        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          <VIcon size="14" class="mr-1">mdi-information-outline</VIcon>
          Declarar no cuesta plata y no hay límite máximo: podés llevar US$ 200.000 si los declarás.
          El umbral es por persona y por cruce, en cualquiera de los dos sentidos.
        </p>
      </VCard>
    </section>

    <!-- How it works in practice -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Cómo funciona en la práctica</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Quién declara ante quién, en qué papel, y qué pasa con la plata si te agarran sin declarar.
      </p>

      <VCard variant="flat" class="practica pa-5">
        <ul class="practica-list">
          <li>
            <strong>No todos declaran en el mismo lugar.</strong> Bancos, casas de cambio y demás
            sujetos bajo control del BCU le <em>comunican</em> el transporte al Banco Central.
            Cualquier otra persona —o sea, vos— lo <em>declara</em> ante la Dirección Nacional de
            Aduanas.
          </li>
          <li>
            <strong>En qué papel.</strong> Si va en tu equipaje, en el Formulario de Declaración de
            Equipaje Acompañado; si viaja como carga, en las guías o documentación de carga (Decreto
            255/006, art. 1).
          </li>
          <li>
            <strong>No es sólo el aeropuerto.</strong> Desde 2026 el artículo alcanza el cruce por
            la frontera, la zona primaria aduanera y la zona de vigilancia aduanera especial — o
            sea, también los pasos terrestres de Rivera, Chuy, Salto o Fray Bentos.
          </li>
          <li>
            <strong>No es sólo efectivo.</strong> La norma dice «dinero en efectivo, metales
            preciosos u otros instrumentos monetarios»: el oro y los instrumentos al portador
            cuentan igual.
          </li>
          <li>
            <strong>Si te agarran sin declarar</strong>, la autoridad detiene los fondos y los
            remite a la Aduana, que hace el avalúo, determina la multa y retiene la suma equivalente
            depositándola en la cuenta del Tesoro Nacional como garantía. Su resolución es título
            ejecutivo.
          </li>
          <li>
            <strong>Si además hay sospecha de origen delictivo</strong>, se pide orden judicial de
            incautación. Probar un origen distinto determina la devolución; pasados
            {{ FORFEITURE_MONTHS }} meses sin esa prueba, la fiscalía pide el decomiso de pleno
            derecho.
          </li>
        </ul>
      </VCard>
    </section>

    <!-- What changed in 2026 -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Qué cambió en marzo de 2026</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        La Ley 20.469 reescribió el artículo 29 entero. Estas son las cuatro diferencias que le
        importan a alguien que cruza con plata.
      </p>

      <div class="table-wrap">
        <table class="cu-mobile-cards changes-table">
          <thead>
            <tr>
              <th scope="col">Qué</th>
              <th scope="col">Antes (texto de 2017)</th>
              <th scope="col">Ahora (texto vigente)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="change in CHANGES_2026" :key="change.aspect">
              <td data-label="Qué" class="font-weight-bold">{{ change.aspect }}</td>
              <td data-label="Antes">{{ change.before }}</td>
              <td data-label="Ahora">{{ change.after }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mb-8">
      <h2 class="section-heading mb-4">Preguntas que se repiten</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="(faq, i) in faqs" :key="i" :title="faq.q">
          <template #text>
            <p class="text-body-2 mb-0" v-text="faq.a" />
          </template>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Internal links -->
    <section class="mb-8">
      <h2 class="section-heading mb-4">Si estás armando el viaje</h2>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6">
          <VCard :to="localePath(link.to)" variant="flat" class="related-card pa-4 h-100">
            <div class="d-flex align-start ga-3">
              <VIcon color="primary">{{ link.icon }}</VIcon>
              <div>
                <p class="text-subtitle-2 font-weight-bold mb-1">{{ link.title }}</p>
                <p class="text-body-2 text-medium-emphasis mb-0">{{ link.blurb }}</p>
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Las normas, sin intermediarios
      </h2>
      <ul class="sources-list">
        <li v-for="source in CASH_RULE_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Verificado contra fuente primaria el {{ lastResearchedLabel }}. Ojo con dos fuentes que
        siguen desactualizadas: la página de normativa de aduanas.gub.uy todavía cita el art. 19 de
        la Ley 17.835 como norma de base —hoy el régimen corre por el art. 29 de la Ley 19.574— y el
        art. 2 del Decreto 255/006 conserva una banda de multa de 1.000 a 20.000.000 UI que la ley
        vigente reemplazó por los porcentajes de arriba. No publicamos esa banda como si fuera lo
        que se paga hoy.
      </p>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento profesional. Esta página cubre la
      obligación uruguaya: el país al que entrás o del que salís tiene la suya propia, con su propio
      umbral, y las dos se aplican por separado en el mismo viaje. Para montos grandes o transporte
      por cuenta de terceros, consultá antes con la Dirección Nacional de Aduanas.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CASH_RULE_SOURCES,
  CHANGES_2026,
  DECLARATION_THRESHOLD_USD,
  FORFEITURE_MONTHS,
  LAST_RESEARCHED,
  resolveCashDeclaration,
} from '~/utils/cashDeclarationRules'

const localePath = useLocalePath()

const amountUsd = ref(15000)
const repeatOffence = ref(false)

const decision = computed(() =>
  resolveCashDeclaration({
    amountUsd: amountUsd.value || 0,
    repeatOffence: repeatOffence.value,
  })
)

const verdictTone = computed(() => (decision.value.mustDeclare ? 'info' : 'success'))
const verdictIcon = computed(() =>
  decision.value.mustDeclare ? 'mdi-file-document-edit-outline' : 'mdi-check-circle-outline'
)
const verdictTitle = computed(() =>
  decision.value.mustDeclare ? 'Tenés que declararlo ante la Aduana' : 'No tenés que declarar nada'
)

function money(value: number): string {
  return new Intl.NumberFormat('es-UY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

const lastResearchedLabel = new Date(`${LAST_RESEARCHED}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const relatedLinks = [
  {
    to: '/franquicia-viajero-uruguay',
    icon: 'mdi-bag-suitcase-outline',
    title: 'Franquicia de equipaje de viajero',
    blurb:
      'Lo que llevás en la valija sí paga impuesto pasado cierto valor. Otro régimen, otra ley.',
  },
  {
    to: '/herramientas/conversor-de-monedas',
    icon: 'mdi-swap-horizontal',
    title: 'Conversor de monedas',
    blurb: 'El umbral es en dólares: pasá acá tus euros, reales o pesos para saber si lo cruzás.',
  },
  {
    to: '/mejor-casa-de-cambio',
    icon: 'mdi-store-outline',
    title: 'Dónde comprar los dólares',
    blurb: 'Qué casa está pagando mejor hoy, antes de salir con el efectivo encima.',
  },
  {
    to: '/preguntas-frecuentes-aduana-uruguay',
    icon: 'mdi-help-circle-outline',
    title: 'Preguntas de aduana',
    blurb: 'Compras, envíos retenidos y los trámites que aparecen del otro lado del mostrador.',
  },
]

const faqs = [
  {
    q: '¿Puedo llevar más de US$ 10.000 si los declaro?',
    a: 'Sí. No hay tope: la ley no limita cuánto podés transportar, sólo te obliga a declararlo cuando el monto supera los US$ 10.000. Declarar no paga impuesto ni tasa; lo que tiene consecuencia es cruzar sin declarar.',
  },
  {
    q: '¿Los US$ 10.000 son por persona o por familia?',
    a: 'El artículo 29 le impone la obligación a cada persona que transporta, así que el umbral se mide por persona y por cruce. Repartir el mismo dinero entre varios acompañantes para quedar todos por debajo del umbral es exactamente la conducta que el registro de omisiones y la agravante por reiteración apuntan a desalentar; no es un atajo que la norma contemple.',
  },
  {
    q: '¿Cuenta si llevo euros, reales o pesos en vez de dólares?',
    a: 'Sí. La norma dice «US$ 10.000 o su equivalente en otras monedas», y además alcanza metales preciosos y otros instrumentos monetarios. La moneda en la que va la plata no cambia la obligación.',
  },
  {
    q: '¿Aplica sólo en el aeropuerto?',
    a: 'No. Desde la redacción de 2026 el artículo alcanza el transporte a través de la frontera, la zona primaria aduanera y la zona de vigilancia aduanera especial. Un cruce terrestre por Rivera, Chuy, Salto o Fray Bentos está adentro igual que Carrasco.',
  },
  {
    q: '¿Cuánto es la multa si no declaro?',
    a: 'El 30 % del excedente de US$ 10.000. En caso de reiteración, sube al 60 % del total transportado —no del excedente— y la Dirección Nacional de Aduanas lleva un registro de quienes omiten declarar. Hasta marzo de 2026 la ley no fijaba un porcentaje: hablaba de una multa «cuyo máximo podrá ascender hasta el monto de la cuantía no declarada», a criterio del Poder Ejecutivo.',
  },
  {
    q: '¿Me pueden quedar con la plata?',
    a: 'Constatada la infracción, la Aduana retiene la suma equivalente a la multa y la deposita en la cuenta del Tesoro Nacional como garantía, y su resolución es título ejecutivo. Si además hay sospechas fundadas de que los fondos vienen de un delito, se pide la orden judicial de incautación: probar un origen distinto determina la devolución, y pasados seis meses sin esa prueba la fiscalía pide el decomiso de pleno derecho.',
  },
  {
    q: '¿Y qué pide el país al que viajo?',
    a: 'Es una obligación separada, con su propio umbral y su propio formulario, y se aplica además de la uruguaya en el mismo viaje. Esta página sólo cubre lo que exige Uruguay: para lo que exige el otro país, la fuente es su aduana, no la nuestra.',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/declarar-dinero-en-efectivo-uruguay'
const title = `Declarar efectivo en Uruguay: hasta US$ ${DECLARATION_THRESHOLD_USD.toLocaleString('es-UY')} no declarás nada`
const description =
  'Podés entrar o sacar hasta US$ 10.000 sin declarar; por encima de eso se declara en la Aduana. Desde marzo de 2026 la multa por no hacerlo es 30 % del excedente y 60 % del total si reincidís (Ley 19.574 art. 29).'

defineOgImageComponent('Cambio', {
  title: '¿Cuánta plata podés sacar de Uruguay sin declarar?',
  subtitle: 'US$ 10.000, la Aduana y la multa nueva de 2026',
  tag: 'EFECTIVO',
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
        'cuanto dinero puedo sacar de uruguay, declarar efectivo uruguay, declarar dolares aeropuerto uruguay, transporte de valores aduana uruguay, 10000 dolares frontera uruguay, ley 19574 articulo 29, multa por no declarar dinero uruguay, sacar dolares del pais uruguay',
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
                name: 'Declarar efectivo al entrar o salir de Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
}
.calc,
.practica,
.sources-card,
.related-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
}
.practica-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}
.table-wrap {
  overflow-x: auto;
}
.changes-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.changes-table th,
.changes-table td {
  text-align: left;
  vertical-align: top;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
}
.changes-table th {
  font-weight: 800;
  white-space: nowrap;
}
.faq-panels {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  overflow: hidden;
}
.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}
</style>
