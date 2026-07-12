<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Equipaje de viajero · Julio 2026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        ¿Tu equipaje paga impuesto al entrar a Uruguay?
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Esto es sobre lo que <strong>cargás físicamente</strong> al entrar por Carrasco (u otro paso
        fronterizo) — no sobre una compra online. Si lo que buscás es si tu compra por courier paga
        IVA, es otro régimen:
        <NuxtLink :to="localePath('/franquicia-aduana-uruguay')">
          ver franquicia y aduana para compras del exterior </NuxtLink
        >.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
        Todo lo de esta página sale del <strong>Código Aduanero (Ley 19.276)</strong>, el
        <strong>Decreto 139/014</strong> y su modificación, el <strong>Decreto 43/019</strong>. Si
        algo no está en una norma, lo decimos.
      </VAlert>
    </header>

    <!-- The calculator -->
    <section class="mb-8" aria-label="Calculadora: ¿tu equipaje paga impuesto?">
      <h2 class="section-heading mb-4">Contame tu viaje</h2>

      <VCard variant="flat" class="calc pa-4 pa-sm-6">
        <VRow>
          <VCol cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">¿Por dónde entrás?</div>
            <VBtnToggle
              v-model="entryMode"
              color="primary"
              mandatory
              divided
              variant="outlined"
              class="w-100 mb-4"
            >
              <VBtn value="air-sea" class="flex-grow-1">
                <VIcon start>mdi-airplane</VIcon>
                Aéreo / marítimo
              </VBtn>
              <VBtn value="land" class="flex-grow-1">
                <VIcon start>mdi-bus</VIcon>
                Frontera terrestre
              </VBtn>
            </VBtnToggle>
          </VCol>

          <VCol cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">Valor de lo que traés</div>
            <VTextField
              v-model.number="valueUsd"
              type="number"
              min="0"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Lo que excede tu equipaje personal (ropa, artículos de uso propio no cuentan)"
              persistent-hint
            />
          </VCol>
        </VRow>

        <VAlert :type="verdictTone" variant="tonal" class="mt-4" :icon="verdictIcon" border="start">
          <p class="text-subtitle-1 font-weight-bold mb-1">{{ verdictTitle }}</p>
          <p class="mb-0 text-body-2">
            Franquicia: <strong>US$ {{ decision.franchiseUsd }}</strong>
            <template v-if="!decision.withinFranchise">
              — excedente: <strong>US$ {{ decision.excessUsd.toFixed(2) }}</strong
              >, impuesto estimado (50%): <strong>US$ {{ decision.taxUsd.toFixed(2) }}</strong>
            </template>
          </p>
        </VAlert>

        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          <VIcon size="14" class="mr-1">mdi-information-outline</VIcon>
          Es igual seas residente que retornás o turista: la franquicia
          <strong>no distingue por nacionalidad ni residencia</strong>.
        </p>
      </VCard>
    </section>

    <!-- How it works in practice -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Cómo funciona en la práctica</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Responde directo la pregunta que más se repite: ¿podés pagar ahí mismo y llevarte tus cosas?
      </p>

      <VCard variant="flat" class="practica pa-5">
        <ul class="practica-list">
          <li>
            <strong>Sí, se paga en el momento.</strong> Declarás el excedente con una
            <strong>Declaración Jurada de equipaje</strong> y las facturas de compra ítem por ítem;
            en Carrasco se paga con tarjeta
            <strong>Visa (débito o crédito) o American Express (crédito)</strong>.
          </li>
          <li>
            <strong>No hace falta despachante de aduana.</strong> La Ley 19.276 exime explícitamente
            "Equipajes de viajero" de esa exigencia — la parte formal está resuelta.
          </li>
          <li>
            <strong>Si no pagás</strong>, te retienen el excedente hasta que lo hagas. No
            encontramos una fuente primaria que confirme un plazo exacto de abandono o remate — así
            que no te inventamos un número.
          </li>
          <li>
            <strong>La franquicia se usa una vez por mes</strong> (Decreto 139/014 art. 9), no una
            vez por año — así lo dice la norma desde 2014 y no cambió con la actualización de 2019.
          </li>
        </ul>
      </VCard>

      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-bag-suitcase-outline"
      >
        Además de esta franquicia, si comprás en <strong>Tiendas Libres</strong> de llegada tenés
        una franquicia adicional de <strong>US$ 850</strong> (Decreto 376/022, art. 1) — no se
        mezcla con la de equipaje.
      </VAlert>
    </section>

    <!-- FAQ -->
    <section class="mb-8" aria-label="Preguntas frecuentes">
      <h2 class="section-heading mb-4">Lo que realmente preguntan</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="f in faqs" :key="f.q">
          <VExpansionPanelTitle>{{ f.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="mb-0" v-html="f.a" />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Las normas, sin intermediarios
      </h2>
      <ul class="sources-list">
        <li v-for="(s, i) in sources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Verificado contra fuente primaria el {{ LAST_RESEARCHED_LABEL }}. Ojo: varias páginas de
        aduanas.gub.uy son de 2014 y todavía muestran la franja vieja por país de origen (300/500)
        en vez del USD 500 plano vigente — y una cita "Decreto 49/019" para este régimen, que es un
        error: ese decreto es sobre compensaciones de peaje de Vialidad, sin relación con aduana.
      </p>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento profesional. Qué cuenta como "uso
      personal" tiene un test legal (cantidad, naturaleza y variedad — no una cifra), pero aplicarlo
      caso a caso queda a criterio del funcionario de Aduana en el momento de la inspección. Para
      equipaje de alto valor o de tu emprendimiento, consultá directo con la Dirección Nacional de
      Aduanas antes de viajar.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { LAST_RESEARCHED, resolveBaggageTax, type EntryMode } from '~/utils/travelerBaggageRules'

const localePath = useLocalePath()

const entryMode = ref<EntryMode>('air-sea')
const valueUsd = ref(650)

const decision = computed(() =>
  resolveBaggageTax({ entryMode: entryMode.value, valueUsd: valueUsd.value || 0 })
)

const verdictTone = computed(() => (decision.value.withinFranchise ? 'success' : 'info'))
const verdictIcon = computed(() =>
  decision.value.withinFranchise ? 'mdi-check-circle-outline' : 'mdi-cash'
)
const verdictTitle = computed(() =>
  decision.value.withinFranchise
    ? 'Dentro de la franquicia: no pagás nada'
    : 'Pagás el 50% sobre el excedente'
)

const LAST_RESEARCHED_LABEL = formatDate(LAST_RESEARCHED)

function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return d.toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

const faqs = [
  {
    q: '¿Puedo pagar el impuesto en el momento y llevarme mis cosas?',
    a: 'Sí. En Carrasco se paga ahí mismo con tarjeta Visa (débito o crédito) o American Express (crédito) — no hace falta despachante de aduana, la Ley 19.276 los exime explícitamente para equipaje de viajero. Declarás el excedente con una Declaración Jurada y las facturas de compra, pagás el 50% sobre lo que excede la franquicia, y te llevás el equipaje.',
  },
  {
    q: '¿Qué pasa si no declaro y me agarran?',
    a: 'Depende de si ocultaste el bien o no. Si lo llevás a la vista y no completaste la declaración, lo normal es que te retengan el excedente hasta que pagues el 50%; no encontramos una fuente primaria que confirme un plazo exacto de abandono o remate, así que no te damos un número que no podemos respaldar. Si en cambio lo ocultaste activamente (doble fondo, entre la ropa), es <strong>contrabando</strong>: el art. 211 del Código Aduanero aplica sanciones acumulativas — comiso del bien, comiso del medio de transporte, el doble de los tributos que correspondían, y una multa del 20% del valor en aduana.',
  },
  {
    q: '¿Es lo mismo si soy residente que si soy turista?',
    a: 'Sí — la franquicia no distingue. Un uruguayo que vuelve de viaje y un turista extranjero tienen la misma franquicia: US$ 500 por vía aérea o marítima, US$ 300 por frontera terrestre. Varias páginas viejas de la propia Aduana (de 2014) muestran una franja distinta por país de origen — está derogada desde el Decreto 43/019 de 2019.',
  },
  {
    q: '¿Necesito un despachante de aduana para traer equipamiento de mi emprendimiento?',
    a: 'No — la Ley 19.276 exime explícitamente "Equipajes de viajero" de la intervención obligatoria de un despachante. Eso resuelve la parte formal. Lo que importa es si Aduana lo va a considerar equipaje o importación comercial — ver las dos preguntas siguientes.',
  },
  {
    q: '¿Puedo declarar que lo traigo para mi emprendimiento o actividad profesional?',
    a: 'Sí, y no hace falta esconderlo: el propio Decreto 139/014 (art. 3°) contempla expresamente que tu declaración de equipaje incluya "bienes relacionados al ejercicio de una actividad profesional o estudio". Decir la verdad sobre que es para tu negocio no te saca automáticamente del régimen de equipaje — lo que importa es si, por cantidad, naturaleza o variedad, se parece a inventario para vender (importación comercial) o a herramienta de trabajo para tu propio uso (ver la pregunta siguiente). Una notebook de diseño, una cámara profesional o un set de herramientas de tu oficio entran en esa lógica; 20 unidades iguales del mismo producto, no.',
  },
  {
    q: '¿Qué es "uso personal" y por qué es zona gris?',
    a: 'Sí hay un test en la norma, pero no es un número: el Decreto 139/014 (art. 1°) define "equipaje" como lo que un viajero puede destinar a uso o consumo personal "siempre que por su cantidad, naturaleza o variedad no permitieren presumir que se importan... con fines comerciales o industriales". No dice "hasta 3 unidades" ni "hasta USD X" — es un estándar cualitativo, y aplicarlo caso a caso queda en manos del funcionario en el momento de la inspección. Cuanto más se parezca lo que traés a inventario de negocio (varias unidades iguales, embalaje comercial, valor alto concentrado en un solo rubro), mayor el riesgo de que lo traten como importación y no como equipaje, aunque pagues el 50%.',
  },
  {
    q: '¿Y si el equipo llega por separado, no en la valija?',
    a: 'Eso es "equipaje no acompañado" (art. 133 lit. B del Código Aduanero) y no encontramos una fuente primaria que confirme si aplica la misma franquicia de US$ 500 o un régimen distinto — no inventamos una cifra acá. Si tu equipamiento no entra en la valija, consultá directo con la Aduana antes de viajar.',
  },
]

const sources = [
  {
    label: 'Ley 19.276 (Código Aduanero), arts. 132-133 — declaración y definición de equipaje',
    url: 'https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/133',
  },
  {
    label: 'Ley 19.276 (Código Aduanero), art. 211 — sanciones al contrabando',
    url: 'https://www.impo.com.uy/bases/codigo-aduanero/19276-2014/211',
  },
  {
    label:
      'Decreto 139/014 — régimen de equipaje del MERCOSUR, arts. 1 (definición: cantidad/naturaleza/variedad no comercial), 3 (bienes de actividad profesional), 9 (franquicia y uso mensual) y 13 (50% sobre el excedente)',
    url: 'https://www.impo.com.uy/bases/decretos-internacional/139-2014/1',
  },
  {
    label:
      'Decreto 43/019 — modificación del régimen de equipaje del MERCOSUR (franquicia a US$ 500)',
    url: 'https://www.impo.com.uy/bases/decretos/43-2019',
  },
  {
    label: 'Decreto 376/022, art. 1 — franquicia adicional de Tiendas Libres (US$ 850)',
    url: 'https://www.impo.com.uy/bases/decretos/376-2022',
  },
  {
    label: 'gub.uy — trámite "Equipaje de viajeros: gestión de la franquicia de equipaje"',
    url: 'https://www.gub.uy/tramites/equipaje-viajeros-gestion-franquicia-equipaje',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/franquicia-viajero-uruguay'
const title =
  'Franquicia de equipaje de viajero en Uruguay 2026: ¿pagás impuesto al entrar por Carrasco?'
const description =
  'US$ 500 de franquicia por vía aérea o marítima (US$ 300 terrestre), 50% de impuesto sobre el excedente, sin despachante de aduana. Qué pasa si no declarás, qué es "uso personal" y por qué es zona gris — con la ley y el decreto linkeados.'

defineOgImageComponent('Cambio', {
  title: '¿Tu equipaje paga impuesto al entrar a Uruguay?',
  subtitle: 'Franquicia de viajero, Carrasco y el 50% sobre el excedente',
  tag: 'VIAJERO',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'franquicia equipaje viajero uruguay, franquicia aeropuerto carrasco, cuanto puedo traer sin pagar impuesto uruguay, canal rojo aeropuerto uruguay, declaracion jurada equipaje, equipaje aduana uruguay, uso personal aduana, traer equipamiento emprendimiento uruguay, equipaje uso comercial aduana',
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
                name: 'Franquicia de equipaje de viajero',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
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
  font-size: 0.72rem;
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
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
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
.faq-panels {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
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
