<!--
THESIS: El sitio tiene trece directorios —casas de cambio, alquileres, autos, celulares, sillas,
tiendas…— y un lector que llegó por una sola ficha no se entera de los otros doce. Esta página los
junta, dice qué compara cada uno y cuántas entidades tiene HOY, con la fecha de esa cifra.
OWN-WORLD: Mismas superficies, tipografía y azul de enlace que /celulares-uruguay y
/equipar-casa-uruguay; las tarjetas son las de un índice, no las de un producto.
FIRST VIEWPORT: Migas, H1, una línea de qué es esto, y la primera familia (Vivienda) empezando.

Qué NO hace: no rankea directorios entre sí, no dice cuál es "el mejor" y no publica un cero. Una
tarjeta cuya cifra no se pudo leer sale sin número (ver `directorioCifra`), porque ninguno de estos
directorios está vacío de verdad y un cero diría algo falso sobre él.
-->
<template>
  <VContainer class="directorios-hub py-6 py-md-10">
    <VBreadcrumbs
      :items="[{ title: 'Inicio', to: localePath('/') }, { title: 'Directorios' }]"
      class="px-0 mb-2"
    />

    <header class="mb-8">
      <h1 class="text-h4 font-weight-bold mb-2">Directorios: todo lo que comparamos en Uruguay</h1>
      <p class="text-body-1 lead">
        {{ DIRECTORIOS.length }} directorios que armamos leyendo tiendas, portales y fuentes
        oficiales: casas de cambio, viviendas, autos, celulares, tiendas online y más. Cada cifra
        cuenta lo que vas a encontrar al entrar, y lleva la fecha del dato del que sale.
      </p>
    </header>

    <section
      v-for="group in grupos"
      :key="group.familia"
      class="familia mb-10"
      :aria-labelledby="`familia-${group.familia}`"
    >
      <h2 :id="`familia-${group.familia}`" class="text-h6 font-weight-bold mb-4">
        {{ group.label }}
      </h2>
      <p v-if="group.compartidos.length" class="familia__analisis" data-testid="familia-analisis">
        <span class="familia__analisis-label"
          >Análisis con datos de varios de estos directorios:</span
        >
        <template v-for="(to, index) in group.compartidos" :key="to">
          <NuxtLink :to="localePath(to)" class="directorio-link">{{ analisisLabel(to) }}</NuxtLink
          ><span v-if="index < group.compartidos.length - 1" aria-hidden="true"> · </span>
        </template>
      </p>

      <div class="directorio-grid">
        <article
          v-for="entry in group.entries"
          :key="entry.id"
          class="directorio-card"
          :data-directorio="entry.id"
        >
          <div class="directorio-card__head">
            <VIcon class="directorio-card__icon" size="24" aria-hidden="true">{{
              entry.icon
            }}</VIcon>
            <h3 class="directorio-card__title">
              <NuxtLink :to="localePath(entry.to)" class="directorio-link">{{
                entry.titulo
              }}</NuxtLink>
            </h3>
          </div>

          <p class="directorio-card__what">{{ entry.queCompara }}</p>

          <p v-if="entry.cifra" class="directorio-card__cifra">
            <strong>{{ entry.cifra.count }}</strong> {{ entry.unidad }}
            <span v-if="entry.cifra.asOf" class="directorio-card__asof">
              · {{ entry.cifra.asOf }}
            </span>
          </p>

          <ul v-if="entry.tambien?.length" class="directorio-card__also">
            <li v-for="link in entry.tambien" :key="link.to">
              <NuxtLink :to="localePath(link.to)" class="directorio-link">{{
                link.label
              }}</NuxtLink>
            </li>
          </ul>

          <div
            v-if="entry.analisisPropios.length"
            class="directorio-card__analisis"
            data-testid="directorio-card-analisis"
          >
            <span class="directorio-card__analisis-label">Análisis y estadísticas</span>
            <ul class="directorio-card__also">
              <li v-for="to in entry.analisisPropios" :key="to">
                <NuxtLink :to="localePath(to)" class="directorio-link">{{
                  analisisLabel(to)
                }}</NuxtLink>
              </li>
            </ul>
          </div>
        </article>
      </div>
    </section>

    <section class="como-leer" aria-labelledby="como-leer">
      <h2 id="como-leer" class="text-h6 font-weight-bold mb-3">Cómo leer las cifras</h2>
      <p class="text-body-2 lead mb-2">
        Hay dos tipos de directorio. Los que <strong>relevamos</strong> se recalculan solos, casi
        todos una vez por día: la fecha es la de la última lectura. Los que
        <strong>mantenemos a mano</strong> —casas de cambio, couriers y tarjetas— cambian cuando
        revisamos la lista, y la fecha es la de esa revisión.
      </p>
      <p class="text-body-2 lead mb-2">
        Cada cifra es la misma que vas a ver al entrar, con la misma palabra: no todas cuentan lo
        mismo, y una propiedad publicada en tres portales es una propiedad y tres avisos. Si una
        tarjeta que suele tener número sale sin él, es que esta vez no pudimos leerlo, no que el
        directorio esté vacío.
      </p>
      <p v-if="sinCifraTexto" class="text-body-2 lead mb-0">{{ sinCifraTexto }}</p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { analisisDeFamilia, navEntryForPath } from '~/utils/directorioAnalisis'
import { dateLocale } from '~/utils/format'
import {
  DIRECTORIOS,
  directorioCifra,
  directoriosPorFamilia,
  type DirectorioCifra,
  type DirectorioEntry,
} from '~/utils/directorios'

const localePath = useLocalePath()
const { t } = useI18n()

/**
 * La etiqueta de un análisis es la de su entrada del menú, en español: esta página está escrita en
 * español en todos los idiomas, y una etiqueta en inglés en medio de las tarjetas se leería como un
 * error. El español es el `fallbackLocale`, así que sus mensajes siempre están cargados.
 */
function analisisLabel(to: string): string {
  const nav = navEntryForPath(to)
  return nav ? t(nav.labelKey, {}, { locale: 'es' }) : to
}

// Server-rendered: las cifras tienen que estar en el HTML, no llegar después. Un fallo de la ruta
// deja todas las tarjetas sin número, que es exactamente lo que la página promete en ese caso.
const { data } = await useFetch<{ cifras: Record<string, DirectorioCifra> }>('/api/directorios', {
  key: 'directorios-hub',
  default: () => ({ cifras: {} }),
})

const COUNT_FORMAT = new Intl.NumberFormat('es-UY')

/** La cifra de una tarjeta ya en texto, o `null` para dibujarla sin número. */
function cifraTexto(entry: DirectorioEntry): { count: string; asOf: string } | null {
  const cifra = directorioCifra(data.value?.cifras, entry.id)
  if (!cifra || cifra.count == null) return null
  return {
    count: COUNT_FORMAT.format(cifra.count),
    asOf: cifra.asOf ? asOfLabel(entry, cifra.asOf) : '',
  }
}

// Sale del registro, no de una lista escrita acá: si un directorio empieza a publicar su total, la
// frase deja de nombrarlo sola.
// Entre comillas porque los títulos ya traen su propia "y" ("Monopatines y bicicletas eléctricas").
const sinCifraTexto = (() => {
  const titulos = DIRECTORIOS.filter(entry => entry.fuente === 'sin-cifra').map(
    entry => `“${entry.titulo}”`
  )
  if (!titulos.length) return ''
  if (titulos.length === 1)
    return `${titulos[0]} no lleva número: su página no publica un total —habla por categoría o por tipo—, y acá no inventamos uno.`
  const lista = `${titulos.slice(0, -1).join(', ')} y ${titulos[titulos.length - 1]}`
  return `${lista} no llevan número: sus páginas no publican un total —hablan por categoría o por tipo—, y acá no inventamos uno.`
})()

const grupos = computed(() =>
  directoriosPorFamilia().map(group => {
    // Un análisis que sale de dos o más directorios de la familia (CyberLunes, de cuatro de
    // Compras) se dice una vez sobre la familia y no en cada tarjeta.
    const { compartidos, propios } = analisisDeFamilia(group.entries)
    return {
      ...group,
      compartidos,
      entries: group.entries.map(entry => ({
        ...entry,
        cifra: cifraTexto(entry),
        analisisPropios: propios[entry.id] ?? [],
      })),
    }
  })
)

function longDate(iso: string): string {
  const time = Date.parse(`${iso}T12:00:00Z`)
  if (Number.isNaN(time)) return ''
  return new Date(time).toLocaleDateString(dateLocale('es'), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  })
}

/** "datos al 18 de setiembre de 2026" o, para una lista curada, "lista revisada el …". */
function asOfLabel(entry: DirectorioEntry, iso: string): string {
  const date = longDate(iso)
  if (!date) return ''
  return entry.fuente === 'curado' ? `lista revisada el ${date}` : `datos al ${date}`
}

// ── SEO ────────────────────────────────────────────────────────────────────
const CANONICAL = 'https://cambio-uruguay.com/directorios-uruguay'
const TITLE = 'Directorios: lo que comparamos en Uruguay'
const DESCRIPTION =
  'Casas de cambio, alquileres, autos usados, celulares, sillas, tiendas online y precios de supermercado: cuántos hay en cada directorio y la fecha del dato.'

defineOgImageComponent('Cambio', {
  title: 'Directorios',
  subtitle: 'Todo lo que comparamos en Uruguay',
  tag: 'DIRECTORIOS',
})

useSeoMeta({
  title: `${TITLE} | Cambio Uruguay`,
  description: DESCRIPTION,
  ogTitle: TITLE,
  ogDescription: DESCRIPTION,
  ogType: 'website',
  ogUrl: CANONICAL,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
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
              { '@type': 'ListItem', position: 2, name: 'Directorios', item: CANONICAL },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Directorios de Cambio Uruguay',
            numberOfItems: DIRECTORIOS.length,
            itemListElement: DIRECTORIOS.map((entry, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: entry.titulo,
              url: `https://cambio-uruguay.com${entry.to}`,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.directorios-hub {
  max-width: 1120px;
}
.lead {
  max-width: 68ch;
}
.directorio-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  gap: 16px;
}
.directorio-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.directorio-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.directorio-card__icon {
  color: rgb(var(--v-theme-primary));
  flex: none;
}
.directorio-card__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.3;
}
.directorio-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.directorio-card__title .directorio-link {
  font-weight: 700;
}
.directorio-card__what {
  margin: 0 !important;
  font-size: 0.9rem;
  opacity: 0.85;
}
.directorio-card__cifra {
  margin: auto 0 0 !important;
  font-size: 0.9rem;
}
.directorio-card__cifra strong {
  font-size: 1.05rem;
}
.directorio-card__asof {
  opacity: 0.7;
}
.familia__analisis {
  margin: -6px 0 16px !important;
  font-size: 0.875rem;
}
.familia__analisis-label {
  margin-right: 6px;
  opacity: 0.85;
}
.directorio-card__analisis {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-border-color), 0.15);
}
.directorio-card__analisis-label {
  /* Label (DESIGN.md): metadata. */
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  opacity: 0.8;
}
.directorio-card__also {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 0.85rem;
}
.como-leer {
  padding-top: 8px;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
}
</style>
