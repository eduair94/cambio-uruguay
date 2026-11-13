<template>
  <VContainer class="page py-6 py-md-10">
    <header class="hero on-dark mb-8">
      <p class="eyebrow">API pública · sin clave · CC BY 4.0</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
        Datos abiertos de Uruguay: alquileres, viviendas y autos usados
      </h1>
      <p class="hero-lead text-body-1 mb-4">
        Los mismos números que publica el sitio, en JSON y gratis: cuánto se pide por un alquiler o
        una vivienda en cada departamento y barrio, cuánto vale cada modelo de auto usado y cómo se
        movieron esos precios día a día. Más una búsqueda de avisos vigentes y un
        <strong>servidor MCP</strong> para que un asistente de IA consulte todo eso solo. Sin
        registro, sin clave y con CORS abierto.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          color="white"
          variant="flat"
          size="small"
          prepend-icon="mdi-code-json"
          :href="`${SITE}${OPEN_DATA_ENDPOINTS[0]!.ejemplo}`"
          target="_blank"
          rel="noopener noreferrer"
        >
          Probar la API
        </VBtn>
        <VBtn
          variant="outlined"
          size="small"
          prepend-icon="mdi-file-document-outline"
          :href="`${SITE}/api/datos/openapi.json`"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenAPI
        </VBtn>
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-robot-happy-outline"
          :to="localePath('/buscar-con-ia')"
        >
          Servidor MCP
        </VBtn>
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-api"
          :to="localePath('/desarrolladores')"
        >
          API de cotizaciones
        </VBtn>
      </div>
    </header>

    <!-- Quién ya usa los datos: lo primero que ve el que llega a evaluar si sirve. -->
    <section class="mb-10" aria-labelledby="ya-los-usan">
      <h2 id="ya-los-usan" class="section-heading mb-3">Ya los usan</h2>
      <SurfaceCard class="used-by mb-4">
        <div class="d-flex flex-column flex-md-row ga-4 align-md-center">
          <div class="flex-grow-1">
            <p class="text-overline mb-1">Diario NORTE · Rivera</p>
            <p class="text-body-1 mb-2">
              El recuadro <strong>«Cotización del día»</strong> que Diario NORTE muestra en su
              portada y al costado de cada nota sale de nuestros datos, y lo dice al pie:
            </p>
            <blockquote class="used-by-quote mb-2">
              “Fuente: Banco República (datos vía Cambio-Uruguay.com)”
            </blockquote>
            <p class="text-body-2 text-medium-emphasis mb-0">
              Es exactamente el uso para el que existe esta página: un medio que publica todos los
              días un dato confiable sin tener que ir a buscarlo. Gracias a Diario NORTE y a cada
              sitio que nos cita como fuente.
            </p>
          </div>
          <VBtn
            :href="DIARIO_NORTE_URL"
            target="_blank"
            rel="noopener"
            variant="tonal"
            color="primary"
            prepend-icon="mdi-newspaper-variant-outline"
          >
            Ver en Diario NORTE
          </VBtn>
        </div>
      </SurfaceCard>
      <p class="text-body-2 mb-0">
        ¿Usás nuestros datos en tu medio, tu tesis o tu aplicación?
        <NuxtLink :to="localePath('/contacto')">Contanos</NuxtLink> y lo sumamos acá, con el enlace
        a tu publicación.
      </p>
    </section>

    <!-- Muestra en vivo: la página también es la tabla que se cita. -->
    <section class="mb-10" aria-labelledby="muestra">
      <h2 id="muestra" class="section-heading mb-1">
        Ejemplo en vivo: alquiler de un apartamento de 2 dormitorios en Montevideo
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Precio pedido mediano por barrio, en pesos, del último día medido
        <template v-if="sample?.actualizado">({{ dayLabel(sample.actualizado) }})</template>. Sale
        de <code>{{ OPEN_DATA_ENDPOINTS[0]!.ejemplo }}</code
        >.
      </p>
      <div v-if="sampleRows.length" class="table-wrap">
        <VTable density="compact" class="sample-table">
          <thead>
            <tr>
              <th scope="col">Barrio</th>
              <th scope="col" class="text-right">Mediana</th>
              <th scope="col" class="text-right">p25 – p75</th>
              <th scope="col" class="text-right">Avisos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sampleRows" :key="row.clave">
              <td>
                <a :href="row.url">{{ row.barrio ?? row.etiqueta }}</a>
              </td>
              <td class="text-right">{{ money(row.ultimo.mediana) }}</td>
              <td class="text-right text-medium-emphasis">
                {{ money(row.ultimo.p25) }} – {{ money(row.ultimo.p75) }}
              </td>
              <td class="text-right">{{ row.ultimo.avisos }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <VAlert v-else type="info" variant="tonal" density="compact">
        La muestra no cargó ahora; la API responde igual en
        <code>{{ OPEN_DATA_ENDPOINTS[0]!.ejemplo }}</code
        >.
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-2 mb-0">
        Precios <strong>pedidos</strong> en avisos, no de cierre. Una cohorte necesita al menos 8
        avisos para tener mediana. Cómo se mide:
        <NuxtLink :to="localePath('/evolucion-precio-alquileres-uruguay')">
          evolución del precio de los alquileres
        </NuxtLink>
        .
      </p>
    </section>

    <!-- Las rutas -->
    <section class="mb-10" aria-labelledby="rutas">
      <h2 id="rutas" class="section-heading mb-1">Las rutas</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Todas responden <code>GET</code> con un sobre JSON: <code>fuente</code> (quién, licencia y
        cómo citarnos), <code>actualizado</code> y los <code>datos</code>. El catálogo entero está
        en <a :href="`${SITE}/api/datos`" target="_blank" rel="noopener">/api/datos</a>.
      </p>
      <SurfaceCard v-for="endpoint in OPEN_DATA_ENDPOINTS" :key="endpoint.id" class="mb-4">
        <div class="d-flex flex-wrap align-center ga-2 mb-2">
          <VChip size="small" color="indigo" variant="flat" label>GET</VChip>
          <code class="endpoint-path">{{ endpoint.ruta }}</code>
          <VChip
            size="x-small"
            :color="endpoint.licencia ? 'teal' : 'grey'"
            variant="tonal"
            class="ml-auto"
          >
            {{ endpoint.licencia ? 'CC BY 4.0' : 'avisos de terceros' }}
          </VChip>
        </div>
        <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ endpoint.titulo }}</h3>
        <p class="text-body-2 mb-3">{{ endpoint.descripcion }}</p>
        <details class="params mb-3">
          <summary class="text-body-2 font-weight-medium">
            Parámetros ({{ endpoint.parametros.length }})
          </summary>
          <ul class="tight-list text-body-2 mt-2">
            <li v-for="param in endpoint.parametros" :key="param.nombre">
              <code>{{ param.nombre }}</code> — {{ param.descripcion
              }}<template v-if="param.valores">: {{ param.valores.join(', ') }}</template
              ><template v-else-if="param.ejemplo">
                (p. ej. <code>{{ param.ejemplo }}</code
                >)</template
              >
            </li>
          </ul>
        </details>
        <pre class="codeblock"><code>curl "{{ SITE }}{{ endpoint.ejemplo }}"</code></pre>
        <div class="d-flex flex-wrap ga-2 mt-2">
          <VBtn
            size="small"
            variant="tonal"
            prepend-icon="mdi-open-in-new"
            :href="`${SITE}${endpoint.ejemplo}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir el ejemplo
          </VBtn>
          <VBtn
            size="small"
            variant="text"
            :prepend-icon="copied === endpoint.id ? 'mdi-check' : 'mdi-content-copy'"
            @click="copy(`${SITE}${endpoint.ejemplo}`, endpoint.id)"
          >
            {{ copied === endpoint.id ? 'Copiado' : 'Copiar URL' }}
          </VBtn>
        </div>
      </SurfaceCard>
    </section>

    <!-- MCP -->
    <section class="mb-10" aria-labelledby="mcp">
      <h2 id="mcp" class="section-heading mb-3">Para asistentes de IA: el servidor MCP</h2>
      <p class="text-body-1 mb-3">
        El mismo contenido, pero para que lo use un asistente (Claude, ChatGPT, Cursor, VS Code…):
        <strong>29 herramientas</strong> que buscan alquileres con filtros y cercanía, ordenan
        viviendas según el hogar, comparan autos usados contra su mercado, leen cotizaciones y
        responden con cualquier página del sitio. Es público y no pide clave.
      </p>
      <pre class="codeblock mb-3"><code>{{ OPEN_DATA_MCP }}            todo
{{ OPEN_DATA_MCP }}/alquileres alquileres y barrios
{{ OPEN_DATA_MCP }}/autos      autos usados
{{ OPEN_DATA_MCP }}/cambio     cotizaciones
{{ OPEN_DATA_MCP }}/sitio      todo el sitio</code></pre>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          :to="localePath('/buscar-con-ia')"
          color="deep-purple"
          variant="tonal"
          prepend-icon="mdi-book-open-variant"
        >
          Cómo conectarlo
        </VBtn>
        <VBtn
          :to="localePath('/asistente-ia')"
          variant="text"
          prepend-icon="mdi-chat-processing-outline"
        >
          Probarlo en el navegador
        </VBtn>
        <VBtn
          href="https://github.com/eduair94/cambio-uruguay/tree/main/mcp"
          target="_blank"
          rel="noopener noreferrer"
          variant="text"
          prepend-icon="mdi-github"
        >
          Código abierto
        </VBtn>
      </div>
    </section>

    <!-- Licencia y cómo citar -->
    <section class="mb-10" aria-labelledby="licencia">
      <h2 id="licencia" class="section-heading mb-3">Licencia y cómo citarnos</h2>
      <p class="text-body-1 mb-3">
        Las <strong>estadísticas</strong> (medianas, cuartiles, variaciones y conteos de
        <code>/api/datos/mercado/*</code>) son elaboración propia y van con licencia
        <a :href="OPEN_DATA_LICENSE.url" target="_blank" rel="noopener noreferrer">
          Creative Commons Atribución 4.0 </a
        >: podés usarlas, publicarlas y combinarlas, también con fines comerciales, citando la
        fuente. Si lo publicás en la web, el crédito con enlace es la forma de cumplir:
      </p>
      <pre class="codeblock mb-2"><code>{{ OPEN_DATA_ATTRIBUTION.html }}</code></pre>
      <VBtn
        size="small"
        variant="tonal"
        :prepend-icon="copied === 'cita' ? 'mdi-check' : 'mdi-content-copy'"
        class="mb-4"
        @click="copy(OPEN_DATA_ATTRIBUTION.html, 'cita')"
      >
        {{ copied === 'cita' ? 'Copiado' : 'Copiar el crédito' }}
      </VBtn>
      <p class="text-body-1 mb-0">
        Los <strong>avisos</strong> de <code>/api/datos/alquileres</code> y
        <code>/api/datos/autos</code> no son nuestros: son de sus anunciantes y de los portales
        donde se publicaron. Por eso la API devuelve una ficha mínima con el enlace a la ficha del
        sitio —sin fotos, sin contactos y sin coordenadas— para buscar y enlazar, no para republicar
        el directorio.
      </p>
    </section>

    <section class="mb-10" aria-labelledby="otras">
      <h2 id="otras" class="section-heading mb-3">Las otras APIs del sitio</h2>
      <ul class="tight-list text-body-1">
        <li>
          <NuxtLink :to="localePath('/desarrolladores')">Cotizaciones</NuxtLink> de más de 40 casas
          de cambio y bancos, con histórico (<code>api.cambio-uruguay.com</code>).
        </li>
        <li>
          <NuxtLink :to="localePath('/api-cotizacion-intradia')">Variación intradía</NuxtLink>:
          apertura, máximo, mínimo y cada movimiento del día.
        </li>
        <li>
          <NuxtLink :to="localePath('/api-cotizaciones-regionales')">
            Cotizaciones de la región
          </NuxtLink>
          : Argentina, Brasil, Paraguay, Chile y Bolivia.
        </li>
        <li>
          <NuxtLink :to="localePath('/empresas')">Planes para empresas</NuxtLink>, si necesitás
          volumen o un monitor de competencia.
        </li>
      </ul>
    </section>

    <PressMentions
      page="/datos-abiertos-uruguay"
      title="Quién nos cita"
      intro="Medios y catálogos que publican o describen nuestros datos, con el enlace al original y lo que agregamos nosotros."
    />

    <FaqSection :items="FAQ" heading="Preguntas frecuentes" :expanded="true" />
  </VContainer>
</template>

<script setup lang="ts">
import type { FaqItem } from '~/utils/faqAnswers'
import {
  OPEN_DATA_ATTRIBUTION,
  OPEN_DATA_ENDPOINTS,
  OPEN_DATA_LICENSE,
  OPEN_DATA_MCP,
  OPEN_DATA_PAGE,
  OPEN_DATA_SITE,
  type OpenDataEnvelope,
  type OpenMarketRow,
} from '~/utils/openData'
import { getPressMention } from '~/utils/pressMentions'

const SITE = OPEN_DATA_SITE
const localePath = useLocalePath()
const DIARIO_NORTE_URL =
  getPressMention('diario-norte-cotizacion-del-dia-2026-11')?.url ?? 'https://diarionorte.com.uy/'

type Snapshot = OpenDataEnvelope<{ mercado: string; filas: number; cohortes: OpenMarketRow[] }>

const { data: sample } = await useFetch<Snapshot>('/api/datos/mercado/actual', {
  key: 'datos-abiertos-muestra',
  query: { mercado: 'alquiler', tipo: 'apartamento', dormitorios: '2', departamento: 'montevideo' },
  default: () => null as unknown as Snapshot,
})

const sampleRows = computed(() =>
  (sample.value?.datos?.cohortes ?? [])
    .filter(row => row.ambito === 'neighborhood' && typeof row.ultimo.mediana === 'number')
    .slice(0, 12)
)

const money = (value: number | null): string =>
  typeof value === 'number' ? `$ ${Math.round(value).toLocaleString('es-UY')}` : '—'

const dayLabel = (day: string): string =>
  `${Number(day.slice(8, 10))}/${Number(day.slice(5, 7))}/${day.slice(0, 4)}`

const copied = ref<string | null>(null)
async function copy(text: string, id: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = id
    setTimeout(() => (copied.value = null), 1800)
  } catch {
    // Sin permiso de portapapeles: el texto sigue a la vista para copiarlo a mano.
  }
}

const FAQ: FaqItem[] = [
  {
    id: 'datos-abiertos-clave',
    question: '¿Necesito una clave o registrarme?',
    answer:
      'No. Las rutas de /api/datos son públicas, sin autenticación y con CORS abierto, así que se pueden llamar desde el navegador. Las estadísticas se cachean una hora porque cambian una vez por día; la búsqueda de avisos, quince minutos.',
  },
  {
    id: 'datos-abiertos-licencia',
    question: '¿Puedo publicar los datos en mi medio o en mi aplicación?',
    answer:
      'Sí. Las estadísticas van con licencia Creative Commons Atribución 4.0: podés publicarlas, combinarlas y usarlas con fines comerciales, citando «Fuente: Cambio Uruguay» con un enlace a cambio-uruguay.com. Los avisos individuales no se licencian, porque son de sus anunciantes.',
  },
  {
    id: 'datos-abiertos-que-mide',
    question: '¿Qué mide exactamente la mediana?',
    answer:
      'El precio PEDIDO en los avisos vigentes ese día, no el precio al que se cerró el contrato o la venta, que en Uruguay no se publica. Cada cohorte (mercado, moneda, tipo, dormitorios y lugar, o modelo de auto) necesita al menos 8 avisos para tener mediana, y las monedas nunca se convierten: un aviso en dólares no se mezcla con uno en pesos.',
  },
  {
    id: 'datos-abiertos-variacion',
    question: '¿Qué diferencia hay entre la mediana y la variación?',
    answer:
      'La mediana es el nivel: se mueve cuando cambian los precios y también cuando cambia qué avisos hay publicados. La variación de 7, 30 y 90 días compara cada aviso contra su propio precio de antes (la misma oferta), así que mide si los que ya estaban subieron o bajaron. Es la cifra para decir «los alquileres subieron».',
  },
  {
    id: 'datos-abiertos-desde-cuando',
    question: '¿Desde cuándo hay datos?',
    answer:
      'Las series diarias arrancaron el 18 de septiembre de 2026 y no se reconstruyen hacia atrás: un dato que no se midió ese día no se inventa. El campo medidoDesde de /api/datos/mercado lo dice para cada mercado.',
  },
  {
    id: 'datos-abiertos-pedir',
    question: 'Necesito otro dato, ¿cómo lo pido?',
    answer:
      'Escribinos desde la página de contacto o abrí un issue en el repositorio de GitHub del proyecto. Varias rutas de la API existen porque alguien las pidió.',
  },
]

const title = 'Datos abiertos: alquileres y autos usados'
const description =
  'API gratis y sin clave: precio mediano de alquileres, viviendas y autos usados de Uruguay por barrio y modelo, series diarias, avisos y un servidor MCP.'

defineOgImageComponent('Cambio', {
  title: 'Datos abiertos de Uruguay',
  subtitle: 'Alquileres, viviendas y autos usados en JSON, sin clave',
  tag: 'API PÚBLICA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: OPEN_DATA_PAGE,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: OPEN_DATA_PAGE }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Cambio Uruguay', item: SITE },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Desarrolladores',
                item: `${SITE}/desarrolladores`,
              },
              { '@type': 'ListItem', position: 3, name: 'Datos abiertos', item: OPEN_DATA_PAGE },
            ],
          },
          {
            '@type': 'Dataset',
            '@id': `${OPEN_DATA_PAGE}#dataset`,
            name: 'Precios pedidos de alquileres, viviendas y autos usados en Uruguay',
            description:
              'Series diarias del precio pedido (p25, mediana, p75 y variación de la misma oferta) de alquileres y viviendas en venta por departamento, barrio, tipo y dormitorios, y de autos usados por modelo y año, medidas sobre los avisos vigentes de los principales portales de Uruguay.',
            url: OPEN_DATA_PAGE,
            license: OPEN_DATA_LICENSE.url,
            isAccessibleForFree: true,
            inLanguage: 'es-UY',
            temporalCoverage: '2026-09-18/..',
            spatialCoverage: { '@type': 'Place', name: 'Uruguay' },
            creator: { '@type': 'Organization', name: 'Cambio Uruguay', url: SITE },
            keywords: [
              'alquileres Uruguay',
              'precio de alquiler por barrio',
              'precio de viviendas',
              'autos usados',
              'datos abiertos',
            ],
            distribution: [
              {
                '@type': 'DataDownload',
                encodingFormat: 'application/json',
                contentUrl: `${SITE}/api/datos/mercado/actual?mercado=alquiler`,
              },
              {
                '@type': 'DataDownload',
                encodingFormat: 'application/json',
                contentUrl: `${SITE}/api/datos/mercado/actual?mercado=autos`,
              },
            ],
          },
          {
            '@type': 'WebAPI',
            '@id': `${OPEN_DATA_PAGE}#api`,
            name: 'Cambio Uruguay — datos abiertos',
            description,
            documentation: OPEN_DATA_PAGE,
            endpointUrl: `${SITE}/api/datos`,
            provider: { '@type': 'Organization', name: 'Cambio Uruguay' },
            termsOfService: `${SITE}/terminos`,
            isAccessibleForFree: true,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  position: relative;
  isolation: isolate;
  border-radius: 16px;
  padding: 28px 24px;
  background:
    radial-gradient(circle at 82% 16%, rgba(94, 154, 255, 0.24), transparent 34%),
    linear-gradient(135deg, #121b2e 0%, #17324f 58%, #123f52 100%);
  color: #f4f8ff;
}
.hero-lead {
  max-width: 74ch;
  margin-top: 0;
  color: rgba(244, 248, 255, 0.88);
}
.eyebrow {
  display: inline-flex;
  align-items: center;
  margin-top: 0;
  margin-bottom: 12px;
  padding: 4px 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  color: #bcd8ff;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.section-heading {
  margin-top: 0;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
}
.used-by-quote {
  margin-left: 0;
  margin-right: 0;
  border: 1px solid rgba(var(--v-theme-primary), 0.3);
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.06);
  padding: 10px 14px;
  font-style: italic;
}
.table-wrap {
  overflow-x: auto;
}
.sample-table {
  max-width: 640px;
}
/* Las URLs de ejemplo son largas: en un teléfono parten donde haga falta en vez de ensanchar la página. */
p code,
li code,
.v-alert code {
  overflow-wrap: anywhere;
}
.endpoint-path {
  font-size: 0.95rem;
  word-break: break-all;
}
.params summary {
  cursor: pointer;
}
.tight-list {
  margin-top: 0;
  padding-left: 1.15rem;
}
.tight-list li + li {
  margin-top: 6px;
}
.codeblock {
  margin: 0;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.12);
  font-size: 0.85rem;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre;
}
</style>
