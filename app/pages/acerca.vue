<template>
  <div class="about-page">
    <VContainer class="about-container">
      <!-- Header -->
      <header class="about-header">
        <p class="about-eyebrow">{{ t('acerca.tag') }}</p>
        <h1>{{ t('acerca.h1') }}</h1>
        <p class="about-intro">{{ t('acerca.intro') }}</p>
        <p class="about-updated">
          {{ t('acerca.lastUpdated', { date: lastUpdatedDisplay }) }}
        </p>
        <nav class="about-nav" :aria-label="t('acerca.tag')">
          <a href="#fuentes">{{ t('acerca.sourcesTitle') }}</a>
          <a href="#autor">{{ t('acerca.authorTitle') }}</a>
          <a href="#widget">{{ t('acerca.embedTitle') }}</a>
        </nav>
      </header>

      <article class="about-content">
        <!-- ¿Qué es Cambio Uruguay? -->
        <section class="about-section">
          <h2>{{ t('acerca.whatTitle') }}</h2>
          <p class="about-prose">
            Cambio Uruguay es una plataforma independiente y gratuita para comparar la cotización
            del dólar y otras divisas en más de 40 casas de cambio de Uruguay, en un solo lugar y en
            tiempo casi real. Nuestro objetivo es simple: que cualquier persona pueda ver, en
            segundos, dónde conviene comprar o vender divisas, sin recorrer sitio por sitio ni
            depender del primer lugar que tenga a mano.
          </p>
          <p class="about-prose">
            Reunimos los precios de compra y de venta de cada casa, calculamos el spread y te
            mostramos quién ofrece la mejor cotización para tu operación. Toda la información se
            presenta de forma transparente, con su fuente y su fecha de actualización a la vista.
          </p>
        </section>

        <!-- Cómo obtenemos los datos -->
        <section class="about-section">
          <h2>{{ t('acerca.dataTitle') }}</h2>
          <p class="about-prose">
            Los datos provienen del Banco Central del Uruguay (BCU), la autoridad que regula y
            publica la información del mercado cambiario, complementados con las cotizaciones que
            cada casa de cambio difunde. Procesamos esa información para más de 40 casas de cambio y
            la normalizamos para que puedas compararlas entre sí de forma justa.
          </p>
          <p class="about-prose">
            No fijamos ni modificamos precios: solo los recopilamos, ordenamos y presentamos. Cada
            cotización refleja lo que la fuente publica en ese momento.
          </p>

          <h3>{{ t('acerca.typesTitle') }}</h3>
          <p class="about-prose">
            El dólar no tiene un único precio: depende de cómo se mueve el dinero. Estos son los
            tipos que vas a encontrar:
          </p>
          <dl class="about-types">
            <div v-for="row in rateTypes" :key="row.code" class="about-type">
              <dt>{{ row.code }}</dt>
              <dd>{{ row.desc.replace(/^[^:]+:\s*/, '') }}</dd>
            </div>
          </dl>
          <VAlert type="info" variant="tonal" density="comfortable" class="mt-3">
            {{ t('acerca.interbankNote') }}
          </VAlert>
        </section>

        <!-- Frecuencia de actualización -->
        <section class="about-section">
          <h2>{{ t('acerca.freqTitle') }}</h2>
          <p class="about-prose">
            Las cotizaciones se actualizan aproximadamente cada 10 minutos durante el horario de
            actividad del mercado. Eso significa que la foto que ves es muy cercana al mercado en
            vivo, sin ser una cotización en tiempo real al segundo. Fuera del horario hábil, en
            fines de semana o feriados, los precios reflejan la última referencia disponible, porque
            el mercado cambiario opera principalmente en días hábiles.
          </p>
        </section>

        <!-- Fuentes -->
        <section id="fuentes" class="about-section">
          <h2>{{ t('acerca.sourcesTitle') }}</h2>
          <p class="about-prose">
            Trabajamos con fuentes oficiales y públicas del mercado uruguayo:
          </p>
          <ul class="about-list">
            <li>
              <strong>Banco Central del Uruguay (BCU):</strong> regulador y fuente de referencia del
              mercado cambiario.
            </li>
            <li>
              <strong>Casas de cambio:</strong> más de 40 entidades autorizadas, cada una con sus
              cotizaciones publicadas de compra y venta.
            </li>
            <li>
              <strong>Bancos y plataformas digitales:</strong> incluidas opciones como eBROU, cuando
              difunden cotizaciones para el público.
            </li>
          </ul>
        </section>

        <!-- Quién está detrás -->
        <section id="autor" class="about-section">
          <h2>{{ t('acerca.authorTitle') }}</h2>
          <p class="about-prose">
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
            hacerlo a través de su perfil profesional o de su
            <a
              class="about-link"
              href="https://github.com/eduair94"
              target="_blank"
              rel="noopener noreferrer"
              >perfil en GitHub</a
            >, donde el código del sitio es público.
          </p>
        </section>

        <!-- Independencia y gratuidad -->
        <section class="about-section">
          <h2>{{ t('acerca.independenceTitle') }}</h2>
          <p class="about-prose">
            Cambio Uruguay es independiente y gratuito. No cobramos por mostrar las cotizaciones ni
            priorizamos a ninguna casa de cambio a cambio de dinero: el orden lo determina siempre
            el precio. No somos una casa de cambio, no operamos divisas y no recibimos comisiones
            por las operaciones que hagas. Nuestro compromiso es con la información transparente,
            para que decidas con datos y no con corazonadas.
          </p>
          <p class="about-prose">
            El sitio se financia con publicidad etiquetada como tal: un espacio patrocinado es un
            bloque aparte, nunca una posición en el ranking. Las condiciones completas, y lo que no
            está en venta, están en la página de
            <NuxtLink :to="localePath('/publicidad')" class="about-link">publicidad</NuxtLink>.
          </p>
        </section>

        <!-- Insertá el widget (embeddable iframe -> backlinks) -->
        <section id="widget" class="about-section">
          <h2>{{ t('acerca.embedTitle') }}</h2>
          <p class="about-prose">
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
        <section class="about-section">
          <McpConfigCard />
          <VBtn
            :to="localePath('/datos-abiertos-uruguay')"
            variant="tonal"
            color="primary"
            class="mt-3"
            prepend-icon="mdi-database-export-outline"
          >
            {{ t('openData.nav') }}
          </VBtn>
        </section>

        <!-- Quién nos cita (medios, catálogos): sólo en castellano, el bloque no está traducido. -->
        <PressMentions
          v-if="locale === 'es'"
          page="/acerca"
          title="Quién nos cita"
          intro="Medios, catálogos y personas que publicaron o usaron nuestros datos, con el enlace al original y lo que agregamos nosotros."
        />

        <!-- Disclaimer -->
        <aside class="about-disclaimer" aria-labelledby="about-disclaimer-title">
          <h2 id="about-disclaimer-title">{{ t('acerca.disclaimerTitle') }}</h2>
          <p>{{ t('acerca.disclaimerText') }}</p>
        </aside>

        <!-- CTA + internal links -->
        <section class="about-cta">
          <h2>{{ t('acerca.ctaTitle') }}</h2>
          <p>{{ t('acerca.ctaText') }}</p>
          <div class="about-actions">
            <VBtn :to="localePath('/')" color="primary" variant="elevated">
              <VIcon start>mdi-chart-line</VIcon>
              {{ t('acerca.ctaButton') }}
            </VBtn>
            <VBtn :to="localePath('/guias')" color="primary" variant="tonal">
              <VIcon start>mdi-book-open-variant</VIcon>
              {{ t('guias.nav') }}
            </VBtn>
          </div>
        </section>
      </article>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { ORGANIZATION_ID, authorPersonNode, authorReference } from '~/utils/authorEntity'

const { t, locale } = useI18n()
const localePath = useLocalePath()

// Date of the last methodology review. Kept in one place so meta + JSON-LD agree.
// 2026-09-22: la entidad del autor pasó a tener @id, y la política de publicidad se enlaza.
const LAST_REVIEWED = '2026-09-22'

const lastUpdatedDisplay = computed(() =>
  new Date(LAST_REVIEWED).toLocaleDateString(dateLocale(locale.value), {
    timeZone: siteTimeZone(LAST_REVIEWED),
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

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})

const canonicalUrl = 'https://cambio-uruguay.com/acerca'

// Branded OG image for the about/methodology page.
defineOgImageComponent('Cambio', {
  title: () =>
    ({ es: 'Sobre Cambio Uruguay', en: 'About Cambio Uruguay', pt: 'Sobre o Cambio Uruguay' })[
      locale.value as 'es' | 'en' | 'pt'
    ],
  subtitle: () =>
    ({
      es: 'Metodología y fuentes de datos',
      en: 'Methodology and data sources',
      pt: 'Metodologia e fontes de dados',
    })[locale.value as 'es' | 'en' | 'pt'],
  tag: 'ACERCA',
  locale: locale.value as 'es' | 'en' | 'pt',
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

// AboutPage + Organization + Person JSON-LD for E-E-A-T.
//
// Esta página es la ÚNICA que emite el nodo Person completo del autor (con @id, sameAs y
// worksFor): el resto del sitio (layout, guías, long-form) lo referencia por @id y JSON-LD los
// fusiona. Hasta el 2026-09-22 acá había DOS Person inline —`founder` y un `author` que
// Organization ni siquiera admite— y una segunda Organization sin @id que competía con la
// #identity del layout. Ahora la Organization lleva el mismo @id, así que se fusiona con la del
// layout en vez de duplicarla, y sólo agrega lo que esta página sabe: quién la fundó.
useHead({
  link: [{ rel: 'canonical', href: canonicalUrl }],
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
                name: 'Sobre Cambio Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'AboutPage',
            url: canonicalUrl,
            name: 'Sobre Cambio Uruguay',
            description:
              'Metodología, fuentes de datos y equipo detrás de Cambio Uruguay, el comparador de cotizaciones del dólar en Uruguay.',
            dateModified: LAST_REVIEWED,
            inLanguage: 'es-UY',
            isPartOf: { '@id': 'https://cambio-uruguay.com/#website' },
            mainEntity: { '@id': ORGANIZATION_ID },
            about: [{ '@id': ORGANIZATION_ID }, { '@id': authorReference()['@id'] }],
          },
          {
            '@type': 'Organization',
            '@id': ORGANIZATION_ID,
            name: 'Cambio Uruguay',
            url: 'https://cambio-uruguay.com',
            founder: authorReference(),
          },
          authorPersonNode(),
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.about-page {
  min-width: 0;
  container-type: inline-size;
  color: rgb(var(--v-theme-on-surface));
}

.about-container {
  max-width: 78ch;
}

.about-page :where(h1, h2, h3, p, ul, dl, dd) {
  margin: 0;
}

.about-header {
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.14);
}

.about-eyebrow {
  color: rgb(var(--v-theme-link));
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  line-height: 1.4;
}

.about-header h1 {
  margin-top: 16px;
  max-width: 28ch;
  font-size: clamp(1.75rem, 5cqi, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}

.about-intro {
  margin-top: 24px;
  font-size: 1.075rem;
  line-height: 1.65;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.about-updated {
  margin-top: 16px;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.about-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0 24px;
  margin-top: 16px;
}

.about-nav a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  font-size: 0.875rem;
  font-weight: 600;
}

.about-content {
  display: grid;
  gap: 40px;
  padding-top: 40px;
  min-width: 0;
}

.about-content > * {
  min-width: 0;
}

.about-section {
  scroll-margin-top: 96px;
}

.about-content h2 {
  margin-bottom: 16px;
  font-size: clamp(1.35rem, 3cqi, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  text-wrap: balance;
}

.about-content h3 {
  margin-top: 24px;
  margin-bottom: 8px;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.6;
}

.about-prose {
  line-height: 1.75;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.about-prose + .about-prose {
  margin-top: 16px;
}

.about-list {
  margin-top: 16px;
  line-height: 1.75;
  padding-left: 1.2rem;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.about-list li + li {
  margin-top: 16px;
}

.about-types {
  margin-top: 16px;
}

.about-type {
  display: grid;
  grid-template-columns: 10rem minmax(0, 1fr);
  gap: 8px 24px;
  padding-block: 16px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.14);
}

.about-type dt {
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.8;
}

.about-type dd {
  min-width: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.about-link,
.about-nav a {
  color: rgb(var(--v-theme-link));
  text-decoration: underline;
  text-decoration-color: rgba(var(--v-theme-link), 0.4);
  text-underline-offset: 4px;
  font-weight: 600;
}

.about-link:hover,
.about-nav a:hover {
  text-decoration-color: currentColor;
}

.about-link:focus-visible,
.about-nav a:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 4px;
  border-radius: 4px;
}

.embed-snippet {
  margin-top: 16px;
}

.embed-code :deep(textarea) {
  font-family: 'Courier New', ui-monospace, monospace;
  font-size: 0.8rem;
  line-height: 1.5;
}

.about-disclaimer {
  padding-top: 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.14);
}

.about-disclaimer h2 {
  margin-bottom: 8px;
  font-size: 1rem;
}

.about-disclaimer p,
.about-cta p {
  color: rgba(var(--v-theme-on-surface), 0.82);
  line-height: 1.65;
}

.about-disclaimer p {
  font-size: 0.875rem;
}

.about-cta {
  padding-block: 24px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.14);
}

.about-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}

.about-actions .v-btn {
  min-height: 44px;
}

@container (max-width: 600px) {
  .about-type {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
