<template>
  <VContainer class="temu-page py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Impuesto Temu', disabled: true },
      ]"
    />

    <div class="text-overline text-medium-emphasis mb-2">Importación · Envíos postales</div>
    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Impuesto Temu: cuánto pagás realmente por una compra en Temu, Shein o AliExpress
    </h1>

    <p class="text-body-1 mb-6" style="max-width: 68ch">
      No existe ningún impuesto que se llame así ni que grave a Temu en particular. «Impuesto Temu»
      es como se le terminó diciendo al régimen de envíos postales internacionales que rige desde el
      1.º de mayo de 2026, y se aplica igual a cualquier plataforma del exterior. Lo que cambió no
      es una tasa nueva: es que el IVA se cobra en el despacho y que la franquicia pasó a ser un
      cupo anual.
    </p>

    <VAlert type="info" variant="tonal" class="mb-6 on-dark" density="comfortable">
      <p class="text-body-2 mb-0">
        El caso que más sorprende es el paquete barato: una compra de
        <strong>US$ {{ smallParcel.valueUsd }}</strong> paga
        <strong>US$ {{ smallParcel.taxUsd }}</strong> de impuesto —más que la compra misma— porque
        la ley fija un mínimo de US$ {{ POSTAL_IVA_MIN_USD }} de IVA por envío postal. Partir una
        compra en varios paquetes chicos multiplica ese mínimo.
      </p>
    </VAlert>

    <!-- La regla, que es lo único que no envejece -->
    <h2 class="text-h6 font-weight-bold mb-2">Las tres reglas que deciden todo</h2>
    <VRow class="mb-6">
      <VCol v-for="rule in RULES" :key="rule.title" cols="12" md="4">
        <VCard variant="flat" class="rule-card pa-4 h-100">
          <div class="text-subtitle-2 font-weight-bold mb-1">{{ rule.title }}</div>
          <p class="text-body-2 text-medium-emphasis mb-0">{{ rule.detail }}</p>
        </VCard>
      </VCol>
    </VRow>

    <!-- Los ejemplos, calculados por el mismo motor que la calculadora del sitio -->
    <h2 class="text-h6 font-weight-bold mb-2">Cuatro compras y lo que paga cada una</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      Calculado sobre una factura emitida fuera de EE.UU., que es el caso de las tres plataformas.
      El valor es el total de la factura, incluido el envío que cobre el propio vendedor.
    </p>
    <div class="table-wrap mb-2">
      <table class="cu-table cu-mobile-cards">
        <thead>
          <tr>
            <th>Compra</th>
            <th>Régimen</th>
            <th>Impuesto</th>
            <th>Sobre el valor</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="example in examples" :key="example.id">
            <td data-label="Compra">{{ example.label }}</td>
            <td data-label="Régimen">{{ REGIME_LABEL[example.regime] ?? example.regime }}</td>
            <td data-label="Impuesto">
              <strong>US$ {{ example.taxUsd }}</strong>
            </td>
            <td data-label="Sobre el valor">
              {{ example.effectiveRatePct === null ? '—' : `${example.effectiveRatePct}%` }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-caption text-medium-emphasis mb-6">
      No incluye el cargo que el courier o el Correo cobran por gestionar la declaración: es una
      tarifa del operador, no un tributo.
      <NuxtLink :to="localePath('/herramientas/calculadora-impuestos-importacion')" class="cu-link">
        Calculá tu caso exacto
      </NuxtLink>
      .
    </p>

    <!-- El contraste que explica por qué la gente siente que "antes no pagaba" -->
    <h2 class="text-h6 font-weight-bold mb-2">Por qué una compra en EE.UU. no paga y ésta sí</h2>
    <p class="text-body-2 mb-6" style="max-width: 68ch">
      Por el acuerdo TIFA: una factura emitida en EE.UU. de hasta US$
      {{ USA_IVA_EXEMPTION_USD }} está exonerada de IVA, así que esos mismos US$
      {{ usaContrast.valueUsd }} pagarían <strong>US$ {{ usaContrast.taxUsd }}</strong
      >. Temu, Shein y AliExpress no facturan en EE.UU. y por eso nunca alcanzan esa exoneración.
      Además es todo o nada: un dólar por encima de US$ {{ USA_IVA_EXEMPTION_USD }} y el envío paga
      IVA sobre el total.
    </p>

    <h2 class="text-h6 font-weight-bold mb-2">Plataforma por plataforma</h2>
    <VRow class="mb-6">
      <VCol v-for="platform in platforms" :key="platform.id" cols="12" md="4">
        <VCard variant="flat" class="rule-card pa-4 h-100">
          <div class="text-subtitle-2 font-weight-bold mb-1">{{ platform.name }}</div>
          <div class="text-caption text-medium-emphasis mb-2">
            Factura: {{ platform.invoicedFrom }}
          </div>
          <p class="text-body-2 text-medium-emphasis mb-0">{{ platform.note }}</p>
        </VCard>
      </VCol>
    </VRow>

    <h2 class="text-h6 font-weight-bold mb-2">Lo que todavía no está claro</h2>
    <p class="text-body-2 text-medium-emphasis mb-6" style="max-width: 68ch">
      El mínimo de US$ {{ POSTAL_IVA_MIN_USD }} de IVA por envío está en la ley, pero ninguna página
      oficial dirigida al público lo menciona al explicar la franquicia: las preguntas frecuentes
      del MEF y de la Aduana citan ese mínimo sólo para el régimen del {{ SIMPLIFIED_RATE_PCT }} %,
      y no hay un ejemplo oficial de un envío con franquicia que pague IVA. La norma es clara; la
      comunicación no. Preferimos decirlo antes que presentar una certeza sobre lo que va a pasar en
      el mostrador.
    </p>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Cada importe de esta página se apoya en una norma publicada, no en la prensa que bautizó el
      nombre. Última verificación contra fuente primaria: {{ verifiedAt }}.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in TEMU_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink :to="localePath('/franquicia-aduana-uruguay')" class="cu-link">
        Franquicia y aduana: el régimen completo
      </NuxtLink>
      <NuxtLink :to="localePath('/problemas-con-la-aduana-uruguay')" class="cu-link">
        Problemas con la aduana
      </NuxtLink>
      <NuxtLink :to="localePath('/donde-te-entregan-el-paquete-uruguay')" class="cu-link">
        Dónde te entregan el paquete
      </NuxtLink>
      <NuxtLink :to="localePath('/declarar-compra-exterior-uruguay')" class="cu-link">
        Cómo declarar la compra
      </NuxtLink>
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'
import {
  FRANCHISE_ANNUAL_USD,
  FRANCHISE_MAX_SHIPMENTS,
  POSTAL_IVA_MIN_USD,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
  USA_IVA_EXEMPTION_USD,
} from '~/utils/importRules'
import {
  TEMU_EXAMPLES,
  TEMU_FAQ,
  TEMU_PLATFORMS,
  TEMU_SMALL_PARCEL,
  TEMU_SOURCES,
  TEMU_USA_CONTRAST,
  TEMU_VERIFIED_AT,
} from '~/utils/temuTax'

const localePath = useLocalePath()

const examples = TEMU_EXAMPLES
const platforms = TEMU_PLATFORMS
const smallParcel = TEMU_SMALL_PARCEL
const usaContrast = TEMU_USA_CONTRAST
const faq = TEMU_FAQ as FaqItem[]

const REGIME_LABEL: Record<string, string> = {
  franquicia: 'Franquicia + IVA',
  simplificado: `Prestación única (${SIMPLIFIED_RATE_PCT} %)`,
}

/** El mecanismo: lo único de esta página que sigue siendo cierto el año que viene. */
const RULES = [
  {
    title: `Cupo anual de US$ ${FRANCHISE_ANNUAL_USD}`,
    detail: `No es un tope por compra sino un saldo que se gasta: hasta ${FRANCHISE_MAX_SHIPMENTS} envíos por año civil y entre todos no pueden pasar de US$ ${FRANCHISE_ANNUAL_USD}.`,
  },
  {
    title: 'La franquicia no exonera el IVA',
    detail:
      'Saca los aranceles, pero el IVA se liquida igual sobre el valor de la factura, y lo cobra el courier o el Correo antes de entregarte el paquete.',
  },
  {
    title: `Sin cupo, ${SIMPLIFIED_RATE_PCT} % del valor`,
    detail: `Agotado el cupo, el envío pasa a la prestación única: ${SIMPLIFIED_RATE_PCT} % de la factura con un mínimo de US$ ${SIMPLIFIED_MIN_USD}. O una o la otra, nunca las dos.`,
  },
]

const verifiedAt = new Date(`${TEMU_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const canonicalUrl = 'https://cambio-uruguay.com/impuesto-temu-uruguay'
const title = 'Impuesto Temu: cuánto pagás en Uruguay'
const description = `Un paquete de US$ ${TEMU_SMALL_PARCEL.valueUsd} de Temu paga US$ ${TEMU_SMALL_PARCEL.taxUsd}: hay un mínimo legal de US$ ${POSTAL_IVA_MIN_USD} de IVA por envío. Cupo anual de US$ ${FRANCHISE_ANNUAL_USD} en ${FRANCHISE_MAX_SHIPMENTS} envíos, y ${SIMPLIFIED_RATE_PCT} % después.`

defineOgImageComponent('Cambio', {
  title: 'Impuesto Temu',
  subtitle: `US$ ${TEMU_SMALL_PARCEL.valueUsd} de compra, US$ ${TEMU_SMALL_PARCEL.taxUsd} de impuesto`,
  tag: 'Importación',
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
        'impuesto temu, impuesto temu uruguay, temu impuestos, comprar en temu uruguay, shein uruguay impuestos, aliexpress uruguay aduana, iva compras exterior uruguay, franquicia 800 dolares',
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
                name: 'Impuesto Temu',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: TEMU_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: TEMU_SOURCES.map(source => ({
              '@type': 'WebPage',
              name: source.label,
              url: source.url,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: TEMU_FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
.rule-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-bottom: 4px;
}
</style>
