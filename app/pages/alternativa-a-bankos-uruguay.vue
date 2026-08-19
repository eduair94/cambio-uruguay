<template>
  <v-container class="py-4">
    <h1 class="text-h5 text-sm-h4 mb-2">
      Alternativa web a Bankos: descuentos con tarjeta sin instalar nada
    </h1>
    <p class="text-body-2 text-medium-emphasis mb-4" style="max-width: 72ch">
      Bankos es la app uruguaya que junta los descuentos de tus tarjetas en un mapa, y es de donde
      salen los datos que ves acá. Nuestro mapa de descuentos hace lo mismo desde el navegador —sin
      instalar, también en la computadora— y le agrega filtro por día, favoritos sincronizados con
      tu cuenta y un análisis de qué banco conviene. Esta página compara ambas con datos
      verificables, incluido lo que Bankos hace mejor.
    </p>

    <div class="d-flex flex-wrap ga-2 mb-5">
      <v-btn color="primary" :to="localePath('/descuentos-con-tarjeta-uruguay')">
        <v-icon start>mdi-map-search-outline</v-icon>Abrir el mapa de descuentos
      </v-btn>
      <v-btn variant="tonal" :to="localePath('/que-banco-tiene-mas-descuentos-uruguay')">
        <v-icon start>mdi-chart-bar</v-icon>Ver el análisis por banco
      </v-btn>
    </div>

    <!-- The comparison -->
    <v-card variant="outlined" class="mb-5">
      <v-card-item class="pb-0">
        <h2 class="text-subtitle-1 font-weight-medium">Comparativa</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Todo lo de la columna Bankos sale de su propia web (bankos.uy) y de la app publicada; lo
          nuestro podés comprobarlo abriendo el mapa.
        </p>
      </v-card-item>
      <v-card-text>
        <v-table density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Qué</th>
              <th>Nuestro mapa (web)</th>
              <th>App Bankos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in COMPARISON" :key="row.what">
              <td data-label="Qué">{{ row.what }}</td>
              <td data-label="Nuestro mapa">
                <v-icon v-if="row.usIcon" :color="row.usIcon.color" size="small" class="mr-1">
                  {{ row.usIcon.icon }}
                </v-icon>
                {{ row.us }}
              </td>
              <td data-label="App Bankos">
                <v-icon v-if="row.themIcon" :color="row.themIcon.color" size="small" class="mr-1">
                  {{ row.themIcon.icon }}
                </v-icon>
                {{ row.them }}
              </td>
            </tr>
          </tbody>
        </v-table>
      </v-card-text>
    </v-card>

    <!-- Why us -->
    <v-row dense class="mb-5">
      <v-col v-for="reason in REASONS" :key="reason.title" cols="12" md="6">
        <v-card variant="tonal" class="h-100">
          <v-card-item class="pb-1">
            <h3 class="text-subtitle-1 font-weight-medium d-flex align-center ga-2">
              <v-icon size="small" color="primary">{{ reason.icon }}</v-icon>
              {{ reason.title }}
            </h3>
          </v-card-item>
          <v-card-text class="text-body-2 pt-0">{{ reason.body }}</v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- What Bankos does better — credibility comes from saying it -->
    <v-card variant="outlined" class="mb-5">
      <v-card-item class="pb-1">
        <h2 class="text-subtitle-1 font-weight-medium d-flex align-center ga-2">
          <v-icon size="small">mdi-scale-balance</v-icon>
          En qué te conviene Bankos
        </h2>
      </v-card-item>
      <v-card-text class="text-body-2" style="max-width: 75ch">
        <ul class="pl-4 mb-2">
          <li class="mb-1">
            <strong>Avisos en el teléfono.</strong> La app puede notificarte cuando aparecen
            descuentos nuevos para tus tarjetas. Nuestro mapa es una página web: no te manda nada.
          </li>
          <li class="mb-1">
            <strong>App nativa.</strong> Instalada, arranca de una en el teléfono y está pensada
            para usarse parado en la puerta del local.
          </li>
          <li class="mb-1">
            <strong>Ellos mantienen los datos.</strong> El relevamiento de comercios y beneficios es
            suyo: sin Bankos, este mapa no existe.
          </li>
          <li class="mb-1">
            <strong>Si tenés un comercio,</strong> ellos tienen el programa para aparecer en la app.
            Nosotros no vendemos nada de eso.
          </li>
        </ul>
        <p class="mb-0">
          Lo honesto es esto: si querés que te avisen, instalá
          <a href="https://bankos.uy" target="_blank" rel="noopener nofollow">Bankos</a>. Si querés
          mirar el mapa ahora mismo desde la computadora, filtrar por el día de hoy o ver con datos
          qué banco cubre más comercios, quedate acá. Las dos cosas se usan juntas.
        </p>
      </v-card-text>
    </v-card>

    <FaqBlock :items="COMPARE_FAQ" heading="Preguntas frecuentes" :expanded="true" />
  </v-container>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

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

// Every "App Bankos" cell states something checkable on bankos.uy or in the published app.
// Where we cannot verify a detail of their app, the cell says so instead of guessing.
const COMPARISON: Row[] = [
  {
    what: 'Cómo se usa',
    us: 'En el navegador, sin instalar',
    them: 'Instalando la app (iOS y Android)',
    usIcon: YES,
    themIcon: PART,
  },
  {
    what: 'En la computadora',
    us: 'Sí, misma página',
    them: 'No: su web es la página de descarga',
    usIcon: YES,
    themIcon: NO,
  },
  { what: 'Precio', us: 'Gratis', them: 'Gratis para usuarios', usIcon: YES, themIcon: YES },
  {
    what: 'Registro',
    us: 'No hace falta; si iniciás sesión, se sincroniza',
    them: 'Sin registro (y sin cuenta: todo queda en el teléfono)',
    usIcon: YES,
    themIcon: YES,
  },
  {
    what: 'Buscador',
    us: 'Nombre, rubro y palabras clave',
    them: 'Nombre del comercio',
    usIcon: YES,
    themIcon: PART,
  },
  {
    what: 'Te dice con qué otra tarjeta hay descuento',
    us: 'Sí, en cada local',
    them: 'Sí, al buscar un comercio que no cubrís',
    usIcon: YES,
    themIcon: YES,
  },
  {
    what: 'Cuántas tarjetas podés elegir',
    us: 'Las 16, sin tope',
    them: 'Hasta 7',
    usIcon: YES,
    themIcon: PART,
  },
  {
    what: 'Reportar un pin incorrecto',
    us: 'No (los datos son de ellos)',
    them: 'Sí, con formularios propios',
    usIcon: NO,
    themIcon: YES,
  },
  {
    what: 'Funciona sin conexión',
    us: 'No',
    them: 'Sí, guarda los descuentos en el teléfono',
    usIcon: NO,
    themIcon: YES,
  },
  {
    what: 'Elegir tus tarjetas',
    us: 'Las 16 tarjetas de los 10 emisores',
    them: 'Sí, es su función principal',
    usIcon: YES,
    themIcon: YES,
  },
  {
    what: 'Filtrar por el día de hoy',
    us: 'Sí: “Hoy” usa los días reales de cada beneficio',
    them: 'No filtra por día',
    usIcon: YES,
    themIcon: NO,
  },
  {
    what: 'Favoritos',
    us: 'Sí, y con tu cuenta te siguen entre dispositivos',
    them: 'Sí, guardados en ese teléfono',
    usIcon: YES,
    themIcon: PART,
  },
  {
    what: 'Análisis de qué banco cubre más',
    us: 'Sí, con gráficas y tabla',
    them: 'No publican un análisis así',
    usIcon: YES,
    themIcon: NO,
  },
  {
    what: 'Avisos de descuentos nuevos',
    us: 'No (es una web)',
    them: 'Sí, notificaciones en el teléfono',
    usIcon: NO,
    themIcon: YES,
  },
  {
    what: 'Origen de los datos',
    us: 'Bankos, citado y enlazado',
    them: 'Relevamiento propio',
    usIcon: PART,
    themIcon: YES,
  },
]

const REASONS = [
  {
    icon: 'mdi-cellphone-off',
    title: 'No tenés que instalar nada',
    body: 'Abrís el link y ya estás viendo el mapa, en el teléfono o en la computadora. Sirve para la consulta rápida antes de salir, sin ocupar espacio ni pedir permisos.',
  },
  {
    icon: 'mdi-calendar-today',
    title: 'Filtro por el día de hoy',
    body: 'Cerca de 200 beneficios corren solo ciertos días (los miércoles, los sábados y domingos, de lunes a jueves). El botón “Hoy” deja únicamente los que podés usar hoy, y cada comercio avisa si su descuento tiene día fijo.',
  },
  {
    icon: 'mdi-star',
    title: 'Favoritos que te siguen',
    body: 'Marcá los locales que te importan. Sin cuenta quedan en ese navegador; si iniciás sesión, aparecen igual en el teléfono y en la computadora.',
  },
  {
    icon: 'mdi-chart-bar',
    title: 'Datos para elegir banco, no solo el mapa',
    body: 'Contamos cuántas marcas y locales cubre cada emisor, en cuántas sirve el débito y qué marcas son exclusivas de cada uno. Sirve para decidir con qué banco te conviene abrir cuenta.',
  },
  {
    icon: 'mdi-magnify',
    title: 'Buscador más amplio',
    body: 'La búsqueda mira el nombre del comercio, su rubro y las palabras clave que trae la fuente, así “farmacia” encuentra cadenas que no llevan esa palabra en el nombre.',
  },
  {
    icon: 'mdi-link-variant',
    title: 'Conectado con el resto del sitio',
    body: 'Al lado del mapa tenés la tier list de bancos, la de tarjetas de crédito y débito y el dólar del día. Es una decisión completa, no una app suelta.',
  },
]

const COMPARE_FAQ: FaqItem[] = [
  {
    id: 'es-lo-mismo',
    question: '¿Es lo mismo que Bankos?',
    answer:
      'Los descuentos son los mismos: los datos vienen de Bankos y así lo decimos en cada página. Lo que cambia es la forma de usarlos: acá es una web (sin instalar, también en la computadora) con filtro por día de hoy, favoritos sincronizados con tu cuenta y un análisis de cobertura por banco.',
  },
  {
    id: 'necesito-la-app',
    question: '¿Necesito instalar la app de Bankos?',
    answer:
      'No para usar este mapa. Sí te conviene instalarla si querés que te avisen al teléfono cuando aparecen descuentos nuevos, que es algo que una página web no hace.',
  },
  {
    id: 'gratis',
    question: '¿Es gratis? ¿Piden registro?',
    answer:
      'Es gratis y no pide registro. Iniciar sesión es opcional y solo sirve para que tus tarjetas y tus favoritos te sigan entre dispositivos.',
  },
  {
    id: 'datos-actualizados',
    question: '¿Los descuentos están actualizados?',
    answer:
      'Se leen en vivo cada vez que abrís el mapa. Si la fuente no responde, mostramos el último respaldo guardado y avisamos que son datos de respaldo, en lugar de dejar la página vacía.',
  },
  {
    id: 'que-bancos',
    question: '¿Qué bancos y tarjetas cubre?',
    answer:
      'Itaú, BROU, Santander, BBVA, Scotiabank, OCA, ANDA, Prex, Mercado Pago y Club El País, con sus tarjetas de crédito y débito según el emisor.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/alternativa-a-bankos-uruguay'
defineOgImageComponent('Cambio', {
  title: 'Alternativa web a Bankos',
  subtitle: 'Descuentos con tarjeta, sin instalar la app',
  tag: 'Comparativa',
})
useSeoMeta({
  title: 'Alternativa web a Bankos: descuentos con tarjeta sin instalar | Cambio Uruguay',
  description:
    'Comparativa honesta entre la app Bankos y nuestro mapa web de descuentos con tarjeta en Uruguay: sin instalar, en la computadora, con filtro por el día de hoy, favoritos sincronizados y análisis por banco. También qué hace mejor Bankos.',
  ogTitle: 'Alternativa web a Bankos: descuentos con tarjeta sin instalar',
  ogDescription:
    'Qué hace mejor cada uno, con datos verificables. Los descuentos son los mismos: los datos vienen de Bankos.',
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
            headline: 'Alternativa web a Bankos: descuentos con tarjeta sin instalar',
            description:
              'Comparativa entre la app Bankos y el mapa web de descuentos con tarjeta de Cambio Uruguay.',
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
                name: 'Descuentos con tarjeta',
                item: 'https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Alternativa a Bankos',
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
