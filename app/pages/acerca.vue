<template>
  <div class="about-page">
    <VContainer>
      <!-- Header -->
      <header class="text-center py-8 py-md-12">
        <VChip class="mb-4" color="primary" size="small" variant="tonal">
          <VIcon start size="small">mdi-information-outline</VIcon>
          {{ t('acerca.tag') }}
        </VChip>
        <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">{{ t('acerca.h1') }}</h1>
        <p class="text-body-1 text-grey-lighten-1 mx-auto about-intro">{{ t('acerca.intro') }}</p>
        <p class="text-caption text-grey-darken-1 mt-4">
          {{ t('acerca.lastUpdated', { date: lastUpdatedDisplay }) }}
        </p>
      </header>

      <VRow justify="center">
        <VCol cols="12" md="9" lg="8">
          <!-- ¿Qué es Cambio Uruguay? -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('acerca.whatTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 about-prose">
              Cambio Uruguay es una plataforma independiente y gratuita para comparar la cotización
              del dólar y otras divisas en más de 40 casas de cambio de Uruguay, en un solo lugar y
              en tiempo casi real. Nuestro objetivo es simple: que cualquier persona pueda ver, en
              segundos, dónde conviene comprar o vender divisas, sin recorrer sitio por sitio ni
              depender del primer lugar que tenga a mano.
            </p>
            <p class="text-body-1 text-grey-lighten-1 about-prose mt-3">
              Reunimos los precios de compra y de venta de cada casa, calculamos el spread y te
              mostramos quién ofrece la mejor cotización para tu operación. Toda la información se
              presenta de forma transparente, con su fuente y su fecha de actualización a la vista.
            </p>
          </section>

          <!-- Cómo obtenemos los datos -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('acerca.dataTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 about-prose">
              Los datos provienen del Banco Central del Uruguay (BCU), la autoridad que regula y
              publica la información del mercado cambiario, complementados con las cotizaciones que
              cada casa de cambio difunde. Procesamos esa información para más de 40 casas de cambio
              y la normalizamos para que puedas compararlas entre sí de forma justa.
            </p>
            <p class="text-body-1 text-grey-lighten-1 about-prose mt-3">
              No fijamos ni modificamos precios: solo los recopilamos, ordenamos y presentamos. Cada
              cotización refleja lo que la fuente publica en ese momento.
            </p>

            <h3 class="text-h6 font-weight-bold mt-5 mb-2">{{ t('acerca.typesTitle') }}</h3>
            <p class="text-body-1 text-grey-lighten-1 about-prose mb-3">
              El dólar no tiene un único precio: depende de cómo se mueve el dinero. Estos son los
              tipos que vas a encontrar:
            </p>
            <VList class="bg-transparent pa-0" density="comfortable">
              <VListItem
                v-for="row in rateTypes"
                :key="row.code"
                class="px-0 about-type-item"
                lines="two"
              >
                <template #prepend>
                  <VChip color="primary" variant="tonal" size="small" class="mr-3 font-weight-bold">
                    {{ row.code }}
                  </VChip>
                </template>
                <VListItemTitle class="text-body-1 text-grey-lighten-1 about-type-desc">
                  {{ row.desc }}
                </VListItemTitle>
              </VListItem>
            </VList>
            <VAlert type="info" variant="tonal" density="comfortable" class="mt-3">
              {{ t('acerca.interbankNote') }}
            </VAlert>
          </section>

          <!-- Frecuencia de actualización -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('acerca.freqTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 about-prose">
              Las cotizaciones se actualizan aproximadamente cada 10 minutos durante el horario de
              actividad del mercado. Eso significa que la foto que ves es muy cercana al mercado en
              vivo, sin ser una cotización en tiempo real al segundo. Fuera del horario hábil, en
              fines de semana o feriados, los precios reflejan la última referencia disponible,
              porque el mercado cambiario opera principalmente en días hábiles.
            </p>
          </section>

          <!-- Fuentes -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('acerca.sourcesTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 about-prose mb-3">
              Trabajamos con fuentes oficiales y públicas del mercado uruguayo:
            </p>
            <ul class="about-list text-body-1 text-grey-lighten-1">
              <li>
                <strong>Banco Central del Uruguay (BCU):</strong> regulador y fuente de referencia
                del mercado cambiario.
              </li>
              <li>
                <strong>Casas de cambio:</strong> más de 40 entidades autorizadas, cada una con sus
                cotizaciones publicadas de compra y venta.
              </li>
              <li>
                <strong>Bancos y plataformas digitales:</strong> incluidas opciones como eBROU,
                cuando difunden cotizaciones para el público.
              </li>
            </ul>
          </section>

          <!-- Quién está detrás -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('acerca.authorTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 about-prose">
              Cambio Uruguay fue creado y es mantenido por
              <a
                class="about-link"
                href="https://www.linkedin.com/in/eduardo-airaudo/"
                target="_blank"
                rel="noopener noreferrer"
                >Eduardo Airaudo</a
              >, desarrollador uruguayo, junto a un equipo que cuida que la información sea clara,
              precisa y útil. El proyecto nació de una necesidad concreta: comparar cotizaciones sin
              perder tiempo ni pagar de más. Si querés conocer al autor o ponerte en contacto, podés
              hacerlo a través de su perfil profesional.
            </p>
          </section>

          <!-- Independencia y gratuidad -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('acerca.independenceTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 about-prose">
              Cambio Uruguay es independiente y gratuito. No cobramos por mostrar las cotizaciones
              ni priorizamos a ninguna casa de cambio a cambio de dinero: el orden lo determina
              siempre el precio. No somos una casa de cambio, no operamos divisas y no recibimos
              comisiones por las operaciones que hagas. Nuestro compromiso es con la información
              transparente, para que decidas con datos y no con corazonadas.
            </p>
          </section>

          <!-- Insertá el widget (embeddable iframe -> backlinks) -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('acerca.embedTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 about-prose mb-4">
              {{ t('acerca.embedText') }}
            </p>
            <div class="embed-snippet">
              <VTextarea
                :model-value="embedSnippet"
                readonly
                variant="solo-filled"
                rows="3"
                auto-grow
                hide-details
                class="embed-code"
                :aria-label="t('acerca.embedTitle')"
              />
              <VBtn
                color="primary"
                variant="tonal"
                class="mt-2"
                :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
                @click="copyEmbed"
              >
                {{ copied ? t('acerca.embedCopied') : t('acerca.embedCopy') }}
              </VBtn>
            </div>
          </section>

          <!-- MCP server / AI assistants (open-source, npm) -->
          <section class="mb-8">
            <h2 class="text-h5 font-weight-bold mb-3">{{ t('acerca.mcpTitle') }}</h2>
            <p class="text-body-1 text-grey-lighten-1 about-prose mb-4">
              {{ t('acerca.mcpText') }}
            </p>
            <div class="d-flex flex-wrap ga-2 mb-4">
              <VBtn
                href="https://www.npmjs.com/package/cambio-uruguay-mcp"
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-npm"
              >
                {{ t('acerca.mcpNpm') }}
              </VBtn>
              <VBtn
                href="https://github.com/eduair94/cambio-uruguay/tree/main/mcp"
                target="_blank"
                rel="noopener noreferrer"
                color="primary"
                variant="text"
                prepend-icon="mdi-github"
              >
                {{ t('acerca.mcpSource') }}
              </VBtn>
            </div>
            <div class="embed-snippet">
              <VTextarea
                :model-value="mcpConfig"
                readonly
                variant="solo-filled"
                rows="5"
                auto-grow
                hide-details
                class="embed-code"
                :aria-label="t('acerca.mcpTitle')"
              />
              <VBtn
                color="primary"
                variant="tonal"
                class="mt-2"
                :prepend-icon="copiedMcp ? 'mdi-check' : 'mdi-content-copy'"
                @click="copyMcp"
              >
                {{ copiedMcp ? t('acerca.embedCopied') : t('acerca.embedCopy') }}
              </VBtn>
            </div>
          </section>

          <!-- Disclaimer -->
          <VAlert type="warning" variant="tonal" class="mb-8" :title="t('acerca.disclaimerTitle')">
            {{ t('acerca.disclaimerText') }}
          </VAlert>

          <!-- CTA + internal links -->
          <VCard class="cta-about pa-6 text-center" variant="flat">
            <h2 class="text-h6 font-weight-bold mb-2 text-white">{{ t('acerca.ctaTitle') }}</h2>
            <p class="text-body-2 text-grey-lighten-1 mb-4">{{ t('acerca.ctaText') }}</p>
            <div class="d-flex flex-wrap justify-center ga-2">
              <VBtn :to="localePath('/')" color="primary" variant="elevated">
                <VIcon start>mdi-chart-line</VIcon>
                {{ t('acerca.ctaButton') }}
              </VBtn>
              <VBtn :to="localePath('/guias')" color="primary" variant="tonal">
                <VIcon start>mdi-book-open-variant</VIcon>
                {{ t('guias.nav') }}
              </VBtn>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

// Date of the last methodology review. Kept in one place so meta + JSON-LD agree.
const LAST_REVIEWED = '2026-06-16'

const lastUpdatedDisplay = computed(() =>
  new Date(LAST_REVIEWED).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
)

// The four rate types explained, sourced from i18n so chrome stays translatable.
interface RateTypeRow {
  code: string
  desc: string
}
const rateTypes = computed<RateTypeRow[]>(() => [
  { code: 'BILLETE', desc: t('acerca.typeBillete') },
  { code: 'CABLE', desc: t('acerca.typeCable') },
  { code: 'TRANSFERENCIA', desc: t('acerca.typeTransferencia') },
  { code: 'INTERBANCARIO', desc: t('acerca.typeInterbancario') },
])

// Copy-paste iframe snippet for the embeddable live-rate widget. Sites that
// embed it link back to cambio-uruguay.com (the backlink lives inside /widget).
const embedSnippet =
  '<iframe src="https://cambio-uruguay.com/widget" width="320" height="180" frameborder="0" title="Cotización del dólar en Uruguay"></iframe>'

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null
const copyEmbed = async () => {
  try {
    await navigator.clipboard.writeText(embedSnippet)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    // Clipboard API unavailable (insecure context / denied): the textarea is
    // selectable so the user can still copy manually.
  }
}

// MCP client config for AI assistants (Claude Desktop, Cursor, …). Points at the
// hosted Streamable-HTTP endpoint; the package is also on npm (cambio-uruguay-mcp).
const mcpConfig = JSON.stringify(
  { mcpServers: { 'cambio-uruguay': { url: 'https://mcp.cambio-uruguay.com/mcp' } } },
  null,
  2
)
const copiedMcp = ref(false)
let copiedMcpTimer: ReturnType<typeof setTimeout> | null = null
const copyMcp = async () => {
  try {
    await navigator.clipboard.writeText(mcpConfig)
    copiedMcp.value = true
    if (copiedMcpTimer) clearTimeout(copiedMcpTimer)
    copiedMcpTimer = setTimeout(() => {
      copiedMcp.value = false
    }, 2000)
  } catch {
    // Clipboard unavailable; the textarea stays selectable for manual copy.
  }
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
  if (copiedMcpTimer) clearTimeout(copiedMcpTimer)
})

const canonicalUrl = 'https://cambio-uruguay.com/acerca'

// Branded OG image for the about/methodology page.
defineOgImageComponent('Cambio', {
  title: 'Sobre Cambio Uruguay',
  subtitle: 'Metodología y fuentes de datos',
  tag: 'ACERCA',
})

// SEO meta.
useSeoMeta({
  title: () => t('acerca.metaTitle'),
  description: () => t('acerca.metaDescription'),
  ogTitle: () => t('acerca.metaTitle'),
  ogDescription: () => t('acerca.metaDescription'),
  ogType: 'website',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: () => t('acerca.metaTitle'),
  twitterDescription: () => t('acerca.metaDescription'),
})

// AboutPage + Organization JSON-LD with author/founder for E-E-A-T.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'AboutPage',
            url: canonicalUrl,
            name: 'Sobre Cambio Uruguay',
            description:
              'Metodología, fuentes de datos y equipo detrás de Cambio Uruguay, el comparador de cotizaciones del dólar en Uruguay.',
            dateModified: LAST_REVIEWED,
            inLanguage: 'es-UY',
            isPartOf: {
              '@type': 'WebSite',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
          },
          {
            '@type': 'Organization',
            name: 'Cambio Uruguay',
            url: 'https://cambio-uruguay.com',
            logo: 'https://cambio-uruguay.com/img/logo.png',
            description:
              'Plataforma independiente y gratuita para comparar la cotización del dólar y otras divisas en más de 40 casas de cambio de Uruguay, con datos del Banco Central del Uruguay (BCU).',
            founder: {
              '@type': 'Person',
              name: 'Eduardo Airaudo',
              url: 'https://www.linkedin.com/in/eduardo-airaudo/',
              jobTitle: 'Founder & Developer',
            },
            author: {
              '@type': 'Person',
              name: 'Eduardo Airaudo',
              url: 'https://www.linkedin.com/in/eduardo-airaudo/',
            },
            sameAs: [
              'https://twitter.com/cambio_uruguay',
              'https://www.linkedin.com/company/cambio-uruguay/',
              'https://github.com/eduair94/cambio-uruguay',
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.about-intro {
  max-width: 720px;
  line-height: 1.7;
}

.about-prose {
  line-height: 1.75;
}

.about-list {
  line-height: 1.8;
  padding-left: 1.2rem;
}

.about-list li {
  margin: 0.4rem 0;
}

.about-type-item :deep(.v-list-item__prepend) {
  align-self: flex-start;
  margin-top: 2px;
}

.about-type-desc {
  white-space: normal;
  line-height: 1.6;
}

.about-link {
  color: #64b5f6;
  text-decoration: none;
  font-weight: 600;
}

.about-link:hover {
  text-decoration: underline;
}

.embed-code :deep(textarea) {
  font-family: 'Courier New', ui-monospace, monospace;
  font-size: 0.8rem;
  line-height: 1.5;
}

/* Readable CTA on dark theme (avoid Vuetify outlined color tinting the text) */
.cta-about {
  background: rgba(33, 150, 243, 0.1);
  border: 1px solid rgba(33, 150, 243, 0.28);
  border-radius: 12px;
}
</style>
