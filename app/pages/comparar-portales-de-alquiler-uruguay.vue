<!--
TESIS: los portales de alquiler uruguayos casi no se pisan, así que mirar uno solo deja afuera la
mayor parte de lo publicado. Esta página lo demuestra con el propio catálogo, en vivo, y dice
también qué hace mejor cada portal.

Las cifras NO se escriben a mano: salen de /api/rentals/portales, que cuenta con la misma ventana
de vigencia que la búsqueda. Si la lectura falla, el bloque no se muestra — nunca se rellena.
-->
<template>
  <VContainer class="py-4">
    <h1 class="text-h5 text-sm-h4 mb-2">
      Dónde buscar alquiler en Uruguay: los portales, comparados
    </h1>
    <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 72ch">
      En Uruguay los alquileres se publican en varios portales a la vez, y no en todos los mismos.
      Leemos cinco —Mercado Libre, InfoCasas, Inmuebles El País, Casasweb y Facebook Marketplace— y
      los mostramos en una sola lista con un solo juego de filtros. Esta página compara qué hace
      cada uno, con las cifras de nuestro propio catálogo y sin esconder en qué te conviene ir
      directo al portal.
    </p>

    <div class="d-flex flex-wrap ga-2 mb-6">
      <VBtn color="primary" :to="localePath('/alquileres-uruguay')">
        <VIcon start>mdi-home-search-outline</VIcon>Buscar en los cinco a la vez
      </VBtn>
      <VBtn variant="tonal" :to="localePath('/analisis-alquileres-uruguay')">
        <VIcon start>mdi-chart-line</VIcon>Ver precios por barrio
      </VBtn>
    </div>

    <!-- El bloque en vivo. Es el argumento entero de la página, así que va antes de la tabla. -->
    <VCard v-if="stats" variant="outlined" class="mb-6">
      <VCardItem class="pb-0">
        <h2 class="text-subtitle-1 font-weight-medium">Cuánto ve cada portal</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Viviendas con avisos vigentes ahora mismo, contadas sobre el mismo catálogo que sirve la
          búsqueda. Lectura del {{ readAt }}.
        </p>
      </VCardItem>
      <VCardText>
        <p class="text-h6 mb-4">
          {{ numberFormat(stats.total) }} viviendas publicadas, repartidas así:
        </p>
        <ul class="portal-bars">
          <li v-for="row in shares" :key="row.source">
            <div class="portal-bars__head">
              <strong>{{ row.label }}</strong>
              <span
                >{{ numberFormat(row.count) }}
                <span class="text-medium-emphasis">({{ row.pct }} %)</span></span
              >
            </div>
            <div class="portal-bars__track">
              <div class="portal-bars__fill" :style="{ width: `${row.pct}%` }" />
            </div>
            <p class="portal-bars__miss">
              Buscando sólo acá te perdés {{ numberFormat(stats.total - row.count) }} viviendas ({{
                100 - row.pct
              }}
              %).
            </p>
          </li>
        </ul>
        <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
          <p class="mb-1">
            <strong>Los portales casi no se superponen.</strong> Si publicaran el mismo inventario,
            estos cinco números sumarían mucho más que el total. Suman
            {{ numberFormat(sourceSum) }} contra {{ numberFormat(stats.total) }}: sólo
            {{ numberFormat(stats.multiPortal) }}
            {{ stats.multiPortal === 1 ? 'vivienda aparece' : 'viviendas aparecen' }} en más de un
            portal.
          </p>
          <p class="text-caption mb-0">
            Una vivienda unida cuenta en cada portal donde está publicada, por eso las partes suman
            más que el total. Unimos dos avisos sólo con dirección exacta e identificador de unidad
            coincidentes: preferimos mostrar dos tarjetas antes que afirmar que son la misma casa
            sin poder probarlo.
          </p>
        </VAlert>
      </VCardText>
    </VCard>

    <!-- La comparativa. Filas estructurales, no auditoría de interfaces ajenas. -->
    <VCard variant="outlined" class="mb-6">
      <VCardItem class="pb-0">
        <h2 class="text-subtitle-1 font-weight-medium">Comparativa</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Cada fila compara algo estructural —qué inventario alcanza cada uno, quién puede contactar
          al anunciante, dónde se publica un aviso—, no una lista de botones. Los portales cambian
          su interfaz seguido; lo de acá se puede comprobar abriendo cualquiera de los dos lados.
        </p>
      </VCardItem>
      <VCardText>
        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Qué</th>
              <th>Acá</th>
              <th>Un portal</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in COMPARISON" :key="row.what">
              <td data-label="Qué">{{ row.what }}</td>
              <td data-label="Acá">
                <VIcon v-if="row.usIcon" :color="row.usIcon.color" size="small" class="mr-1">
                  {{ row.usIcon.icon }}
                </VIcon>
                {{ row.us }}
              </td>
              <td data-label="Un portal">
                <VIcon v-if="row.themIcon" :color="row.themIcon.color" size="small" class="mr-1">
                  {{ row.themIcon.icon }}
                </VIcon>
                {{ row.them }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCardText>
    </VCard>

    <VRow dense class="mb-6">
      <VCol v-for="reason in REASONS" :key="reason.title" cols="12" md="6">
        <VCard variant="tonal" class="h-100">
          <VCardItem class="pb-1">
            <h3 class="text-subtitle-1 font-weight-medium d-flex align-center ga-2">
              <VIcon size="small" color="primary">{{ reason.icon }}</VIcon>
              {{ reason.title }}
            </h3>
          </VCardItem>
          <VCardText class="text-body-2 pt-0">
            {{ reason.body }}
            <div v-if="reason.to" class="mt-2">
              <NuxtLink :to="localePath(reason.to)">{{ reason.linkText }}</NuxtLink>
            </div>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>

    <!-- La credibilidad sale de decir esto, no de omitirlo. -->
    <VCard variant="outlined" class="mb-6">
      <VCardItem class="pb-1">
        <h2 class="text-subtitle-1 font-weight-medium d-flex align-center ga-2">
          <VIcon size="small">mdi-scale-balance</VIcon>
          En qué te conviene ir al portal
        </h2>
      </VCardItem>
      <VCardText class="text-body-2" style="max-width: 75ch">
        <ul class="pl-4 mb-2">
          <li class="mb-1">
            <strong>Para contactar al anunciante.</strong> El teléfono, el chat y el formulario
            viven en el portal. Acá cada ficha enlaza al aviso original y ahí termina nuestro
            trabajo: no mediamos, no mandamos mensajes y no copiamos datos de contacto ocultos.
          </li>
          <li class="mb-1">
            <strong>Para publicar un alquiler.</strong> El portal tiene el plan de publicación y la
            cuenta de inmobiliaria. Acá no se puede publicar nada, y no vendemos destaques.
          </li>
          <li class="mb-1">
            <strong>El aviso completo es del portal.</strong> Todas las fotos, la descripción entera
            y las condiciones al día están en el original, que es la fuente. Nosotros mostramos lo
            que el aviso publica y enlazamos de vuelta.
          </li>
          <li class="mb-1">
            <strong>Novedades del minuto.</strong> Leemos los portales por tandas, no en tiempo
            real: un aviso puede estar publicado un rato antes de aparecer acá, y uno dado de baja
            puede seguir visible hasta la próxima lectura.
          </li>
        </ul>
        <p class="mb-0">
          Lo honesto es esto: para <em>encontrar</em> conviene mirar los cinco de una vez, y para
          <em>cerrar</em> hay que ir al aviso original. Las dos cosas se usan juntas.
        </p>
      </VCardText>
    </VCard>

    <VCard variant="outlined" class="mb-6">
      <VCardItem class="pb-1">
        <h2 class="text-subtitle-1 font-weight-medium d-flex align-center ga-2">
          <VIcon size="small">mdi-eye-off-outline</VIcon>
          Lo que no cubrimos
        </h2>
      </VCardItem>
      <VCardText class="text-body-2" style="max-width: 75ch">
        <p>
          La cobertura es parcial y conviene decirlo con nombre y apellido. No leemos Gallito ni las
          webs propias de cada inmobiliaria, ni los grupos de WhatsApp y los avisos de vidriera, que
          en el interior siguen moviendo alquileres. Dentro de los cinco portales que sí leemos
          tampoco garantizamos el catálogo completo: hay categorías que se recorren por tandas y
          fuentes que pueden dejar de responder durante una corrida.
        </p>
        <p class="mb-0">
          Los límites medidos de cada fuente se publican junto a la búsqueda, en
          <NuxtLink :to="{ path: localePath('/alquileres-uruguay'), hash: '#rental-coverage' }"
            >la nota de cobertura</NuxtLink
          >.
        </p>
      </VCardText>
    </VCard>

    <FaqSection :items="COMPARE_FAQ" heading="Preguntas frecuentes" :expanded="true" />
  </VContainer>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'
import { RENTAL_SOURCE_LABEL, type RentalSource } from '~/utils/rentals'
import type { RentalPortalStats } from '~/server/api/rentals/portales.get'

const localePath = useLocalePath()
const { locale } = useI18n()

const { data: stats } = await useFetch<RentalPortalStats>('/api/rentals/portales', {
  key: 'rental-portal-stats',
  // Una comparativa sin cifras sigue siendo una comparativa; una con cifras inventadas, no.
  default: () => null,
})

const numberFormat = (value: number) => new Intl.NumberFormat(locale.value).format(value)

const readAt = computed(() => {
  const value = stats.value?.generatedAt
  if (!value) return ''
  return new Intl.DateTimeFormat(locale.value, { dateStyle: 'long' }).format(new Date(value))
})

const shares = computed(() => {
  const total = stats.value?.total || 0
  if (!total) return []
  return (stats.value?.sources || []).map(row => ({
    source: row.source,
    label: RENTAL_SOURCE_LABEL[row.source as RentalSource] ?? row.source,
    count: row.count,
    pct: Math.round((row.count / total) * 100),
  }))
})

const sourceSum = computed(() =>
  (stats.value?.sources || []).reduce((sum, row) => sum + row.count, 0)
)

const YES = { icon: 'mdi-check-circle', color: 'success' }
const NO = { icon: 'mdi-close-circle', color: 'error' }
const PART = { icon: 'mdi-circle-half-full', color: 'warning' }

interface Row {
  what: string
  us: string
  them: string
  usIcon?: { icon: string; color: string }
  themIcon?: { icon: string; color: string }
}

const COMPARISON: Row[] = [
  {
    what: 'Cuántos portales mirás de una vez',
    us: 'Cinco, en una sola lista',
    them: 'El suyo',
    usIcon: YES,
    themIcon: PART,
  },
  {
    what: 'Dueño del aviso y del contacto',
    us: 'No: enlazamos al original',
    them: 'Sí, el anunciante está ahí',
    usIcon: NO,
    themIcon: YES,
  },
  {
    what: 'Publicar un alquiler',
    us: 'No se puede',
    them: 'Sí, es su negocio',
    usIcon: NO,
    themIcon: YES,
  },
  {
    what: 'Un filtro que vale para todos los portales',
    us: 'Sí: mismos filtros sobre las cinco fuentes',
    them: 'Sólo sobre su propio inventario',
    usIcon: YES,
    themIcon: PART,
  },
  {
    what: 'Cuánto lleva publicado el aviso',
    us: 'Sí, en la tarjeta y en la ficha',
    them: 'No lo muestran en el listado',
    usIcon: YES,
    themIcon: NO,
  },
  {
    what: 'Filtrar por garantía aceptada',
    us: 'Sí, cuando el aviso la declara',
    them: 'Suele estar en el texto del aviso',
    usIcon: YES,
    themIcon: PART,
  },
  {
    what: 'Servicios cercanos a la vivienda',
    us: 'Sí, desde OpenStreetMap',
    them: 'No es parte del aviso',
    usIcon: YES,
    themIcon: NO,
  },
  {
    what: 'Comparar barrios entre sí',
    us: 'Sí, con precios y equipamiento por zona',
    them: 'No',
    usIcon: YES,
    themIcon: NO,
  },
  {
    what: 'Ordenar por el costo mensual real',
    us: 'Sí: alquiler + gastos comunes del mismo aviso',
    them: 'Ordenan por el alquiler',
    usIcon: YES,
    themIcon: PART,
  },
  {
    what: 'Avisos nuevos por correo o notificación',
    us: 'Sí, con tus filtros sobre las cinco fuentes',
    them: 'Sí, con los suyos',
    usIcon: YES,
    themIcon: YES,
  },
  {
    what: 'Cuenta obligatoria para buscar',
    us: 'No',
    them: 'No para buscar',
    usIcon: YES,
    themIcon: YES,
  },
  {
    what: 'Precio del servicio',
    us: 'Gratis',
    them: 'Gratis para quien busca',
    usIcon: YES,
    themIcon: YES,
  },
  {
    what: 'Catálogo completo del país',
    us: 'No: cinco portales, cobertura parcial',
    them: 'No: sólo lo suyo',
    usIcon: PART,
    themIcon: PART,
  },
]

const REASONS = [
  {
    icon: 'mdi-magnify',
    title: 'Un filtro, cinco inventarios',
    body: 'Barrio, dormitorios, precio, garantía, mascotas y estacionamiento se aplican de una vez sobre las cinco fuentes. No hay que repetir la búsqueda cinco veces ni acordarse de qué filtro se puso en cada portal.',
    to: '/alquileres-uruguay',
    linkText: 'Abrir la búsqueda',
  },
  {
    icon: 'mdi-calendar-clock',
    title: 'Cuánto lleva publicado',
    body: 'Cada vivienda muestra desde cuándo circula el aviso. Un alquiler que lleva dos meses sin colocarse no está en la misma posición para negociar que uno de ayer, y ningún portal lo pone en su listado.',
  },
  {
    icon: 'mdi-cash-multiple',
    title: 'El costo mensual, no el titular',
    body: 'Los gastos comunes cambian el total y viajan en el mismo aviso que el alquiler. Se puede ordenar por alquiler más gastos, y cuando el aviso no publica los gastos se dice que no se saben en vez de contarlos como cero.',
  },
  {
    icon: 'mdi-map-marker-radius',
    title: 'Qué hay alrededor',
    body: 'Sobre un extracto público de OpenStreetMap se muestran policlínicas, escuelas, farmacias y comercios cerca de la vivienda, y se puede ordenar por distancia a un punto que elijas: el trabajo, el estudio, la casa de tu familia.',
  },
  {
    icon: 'mdi-home-analytics',
    title: 'El barrio, con números',
    body: 'Precio por dormitorio y por metro cuadrado, equipamiento y comparación entre zonas, calculados sobre los avisos vigentes. Sirve para saber si un precio es normal en ese barrio antes de ir a verlo.',
    to: '/barrios-alquileres-uruguay',
    linkText: 'Comparar barrios',
  },
  {
    icon: 'mdi-bell-outline',
    title: 'Que te avisen, con tus filtros',
    body: 'Se puede guardar una búsqueda y recibir las novedades por correo o notificación, sobre las cinco fuentes a la vez. Se activa a mano, canal por canal, y se corta desde el mismo correo.',
    to: '/alquiler-ideal-uruguay',
    linkText: 'Planificar el alquiler del hogar',
  },
]

const COMPARE_FAQ: FaqItem[] = [
  {
    id: 'que-portales',
    question: '¿Qué portales de alquiler leen?',
    answer:
      'Mercado Libre, InfoCasas, Inmuebles El País, Casasweb y Facebook Marketplace. Cada vivienda enlaza al aviso original en su portal, que es siempre la fuente y donde está el contacto del anunciante.',
  },
  {
    id: 'mejor-portal',
    question: '¿Cuál es el mejor portal para buscar alquiler en Uruguay?',
    answer:
      'Depende de qué busques, y por eso la pregunta se contesta mal con un solo nombre: los inventarios casi no se superponen. Mercado Libre es el más grande e InfoCasas el segundo, pero El País, Casasweb y Marketplace publican viviendas que no están en los otros dos. Mirar uno solo deja afuera la mayor parte de lo publicado.',
  },
  {
    id: 'reemplaza',
    question: '¿Esto reemplaza a los portales?',
    answer:
      'No. Sirve para encontrar y comparar en un solo lugar; para contactar al anunciante, ver el aviso completo y cerrar el alquiler hay que ir al original, que enlazamos en cada ficha. Tampoco se puede publicar un aviso acá.',
  },
  {
    id: 'gratis',
    question: '¿Es gratis? ¿Hay que registrarse?',
    answer:
      'Buscar es gratis y no pide cuenta. Iniciar sesión sólo sirve para guardar favoritos y búsquedas y para recibir alertas de avisos nuevos.',
  },
  {
    id: 'actualizacion',
    question: '¿Cada cuánto se actualizan los avisos?',
    answer:
      'Hay una lectura completa por día y repasos cada hora para novedades. Un aviso publicado recién puede tardar en aparecer, y uno dado de baja puede seguir visible hasta la siguiente lectura: la ficha muestra cuándo se lo vio por última vez.',
  },
  {
    id: 'gallito',
    question: '¿Por qué no está Gallito?',
    answer:
      'No está entre las fuentes que leemos. Tampoco leemos las webs propias de cada inmobiliaria ni los grupos de WhatsApp. La cobertura es parcial y sus límites se publican junto a la búsqueda.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/comparar-portales-de-alquiler-uruguay'
defineOgImageComponent('Cambio', {
  title: 'Portales de alquiler en Uruguay',
  subtitle: 'Cinco portales, comparados con datos',
  tag: 'Comparativa',
})
useSeoMeta({
  title: 'Portales de alquiler en Uruguay comparados',
  description:
    'Comparativa de los portales de alquiler uruguayos (Mercado Libre, InfoCasas, Inmuebles El País, Casasweb y Facebook Marketplace) con cifras del catálogo en vivo: cuánto ve cada uno, qué hacen mejor y qué agrega buscarlos juntos.',
  ogTitle: 'Dónde buscar alquiler en Uruguay: los portales, comparados',
  ogDescription:
    'Los inventarios casi no se superponen: buscar en un solo portal deja afuera la mayor parte de lo publicado. Las cifras salen del catálogo en vivo.',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})
useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            headline: 'Dónde buscar alquiler en Uruguay: los portales, comparados',
            description:
              'Comparativa de los cinco portales de alquiler que lee Cambio Uruguay, con cifras del catálogo vigente.',
            mainEntityOfPage: canonicalUrl,
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
          },
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
                name: 'Alquileres',
                item: 'https://cambio-uruguay.com/alquileres-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Comparativa de portales',
                item: canonicalUrl,
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.portal-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
  list-style: none;
  padding: 0;
}
.portal-bars__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
}
.portal-bars__track {
  background: rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 4px;
  height: 10px;
  margin-top: 6px;
  overflow: hidden;
}
.portal-bars__fill {
  background: rgb(var(--v-theme-primary));
  height: 100%;
}
.portal-bars__miss {
  font-size: 0.8rem;
  margin: 6px 0 0;
  opacity: 0.75;
}
</style>
