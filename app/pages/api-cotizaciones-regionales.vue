<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero on-dark mb-8">
      <p class="eyebrow">Actualización de la API pública · {{ RELEASE_LABEL }}</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">API de cotizaciones de la región</h1>
      <p class="hero-lead text-body-1 mb-4">
        Un equipo de estudiantes de la <strong>Universidad Tecnológica (UTEC)</strong> nos escribió
        contando que ampliaron el alcance de su proyecto académico a las cotizaciones de la región y
        preguntando si teníamos algo que cubriera divisas regionales. No teníamos: la API era
        uruguaya. Ahora sí — <code>GET /regional</code> devuelve el dólar y los cruces de
        <strong>Argentina, Brasil, Paraguay, Chile, Bolivia y Uruguay</strong> con todos los
        mercados que publica cada país, y <code>GET /regional/history</code> devuelve las series
        diarias: los dólares argentinos desde 2011, la referencia del BCRA desde 1996, el fixing
        brasileño desde el Plano Real y el dólar observado chileno desde 1984. Y
        <code>GET /regional/changes</code> devuelve <strong>cada movimiento de precio</strong>, por
        chico que sea.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          color="white"
          variant="flat"
          size="small"
          prepend-icon="mdi-code-json"
          :href="`${API_BASE}/regional`"
          target="_blank"
          rel="noopener noreferrer"
        >
          Probar el endpoint
        </VBtn>
        <VBtn
          variant="outlined"
          size="small"
          prepend-icon="mdi-file-document-outline"
          :href="`${API_BASE}/api-docs`"
          target="_blank"
          rel="noopener noreferrer"
        >
          Referencia OpenAPI
        </VBtn>
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-earth"
          :to="localePath('/cotizaciones-de-la-region')"
        >
          Ver el tablero
        </VBtn>
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-hand-heart-outline"
          :to="localePath('/hecho-a-pedido')"
        >
          Otras cosas hechas a pedido
        </VBtn>
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-api"
          :to="localePath('/desarrolladores')"
        >
          Toda la API
        </VBtn>
      </div>
    </header>

    <!-- 1. El pedido -->
    <section class="mb-10" aria-labelledby="pedido">
      <h2 id="pedido" class="section-heading mb-3">El pedido, y qué no vas a leer acá</h2>
      <p class="text-body-1 mb-4">
        El mensaje llegó por correo desde casillas institucionales de UTEC. Publicamos
        <strong>qué se pidió</strong> —cobertura de divisas regionales en una API pública— y
        <strong>qué hicimos</strong>. No publicamos nombres, direcciones de correo, la carrera, la
        cátedra ni ningún dato que permita identificar a quienes escribieron: ni acá, ni en el
        repositorio, ni en el historial de commits. Una casilla de correo es un dato personal en los
        términos del artículo 4 de la <strong>Ley Nº 18.331</strong> y difundirla exige un
        consentimiento que nadie da al mandar una consulta técnica. El razonamiento completo, con
        los artículos, está en
        <NuxtLink :to="localePath('/api-cotizacion-intradia')"
          >la página del endpoint intradía</NuxtLink
        >, que salió del mismo modo.
      </p>

      <VCard variant="tonal" color="primary" class="pa-4">
        <div class="d-flex align-center ga-2 mb-2">
          <VIcon>mdi-lightbulb-on-outline</VIcon>
          <span class="text-subtitle-1 font-weight-bold">Por qué el pedido tenía razón</span>
        </div>
        <p class="text-body-2 mb-0">
          Comparar el dólar entre países vecinos parece trivial y no lo es. Argentina publica siete
          precios simultáneos para la misma moneda; Brasil tiene un fixing legal y un precio de
          mostrador que difieren varios puntos; Paraguay publica una planilla oficial y un
          referencial que se recalcula cada media hora; Chile publica el promedio de la rueda
          anterior; Bolivia tiene un oficial que casi nadie usa. Una API que devuelva "el dólar" de
          cada país sin decir cuál de todos ellos es, entrega un número que no se puede comparar con
          nada. Esta devuelve todos, etiquetados.
        </p>
      </VCard>
    </section>

    <!-- 2. Endpoints -->
    <section class="mb-10" aria-labelledby="endpoints">
      <h2 id="endpoints" class="section-heading mb-1">Los ocho endpoints</h2>
      <p class="section-lead text-body-2 mb-4">
        Todos son <strong>GET</strong>, públicos, sin autenticación, sobre HTTPS y con CORS abierto.
        Base: <code>{{ API_BASE }}</code>
      </p>

      <VCard
        v-for="endpoint in ENDPOINTS"
        :key="endpoint.path"
        variant="outlined"
        class="endpoint pa-4 mb-4"
      >
        <div class="d-flex flex-wrap align-center ga-2 mb-2">
          <VChip size="small" color="primary" variant="flat">GET</VChip>
          <span class="endpoint-url font-weight-bold">{{ endpoint.path }}</span>
          <VBtn
            size="x-small"
            variant="text"
            prepend-icon="mdi-open-in-new"
            :href="`${API_BASE}${endpoint.example}`"
            target="_blank"
            rel="noopener noreferrer"
          >
            Probar
          </VBtn>
        </div>
        <p class="text-body-2 mb-3">{{ endpoint.what }}</p>

        <VTable v-if="endpoint.params.length" density="compact" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Parámetro</th>
              <th>Por defecto</th>
              <th>Qué hace</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="param in endpoint.params" :key="param.name">
              <td data-label="Parámetro">
                <code>{{ param.name }}</code>
              </td>
              <td data-label="Por defecto">{{ param.def }}</td>
              <td data-label="Qué hace">{{ param.what }}</td>
            </tr>
          </tbody>
        </VTable>
        <p v-else class="text-body-2 text-medium-emphasis mb-0">Sin parámetros.</p>
      </VCard>
    </section>

    <!-- 3. Ejemplo vivo -->
    <section class="mb-10" aria-labelledby="ejemplo">
      <h2 id="ejemplo" class="section-heading mb-1">Una respuesta de verdad, de hace un rato</h2>
      <p class="section-lead text-body-2 mb-4">
        Esto no es un ejemplo escrito a mano: es una cotización del tablero de este momento ({{
          freshness
        }}), servida por el mismo endpoint.
      </p>

      <VRow class="mb-2">
        <VCol v-for="tile in tiles" :key="tile.label" cols="6" md="3">
          <VCard variant="tonal" class="pa-3 h-100">
            <p class="text-caption text-medium-emphasis mb-1">{{ tile.label }}</p>
            <p class="tile-value text-h6 font-weight-bold mb-0">{{ tile.value }}</p>
          </VCard>
        </VCol>
      </VRow>

      <pre class="code-block"><code>{{ sampleJson }}</code></pre>

      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-tag-outline" class="mt-4">
        <p class="alert-title font-weight-bold mb-1">Los campos que importan y suelen ignorarse</p>
        <ul class="tight-list text-body-2 mb-0">
          <li>
            <code>kind</code> dice qué clase de precio es: <code>official</code>,
            <code>wholesale</code>, <code>parallel</code>, <code>financial</code>,
            <code>card</code>, <code>retail</code> o <code>reference</code>. Comparar un
            <code>official</code> con un <code>parallel</code> sin decirlo es el error clásico.
          </li>
          <li>
            <code>updatedAt</code> es la hora que declara la <em>fuente</em>, no la de nuestra
            lectura. El dólar observado chileno es de la rueda anterior por definición.
          </li>
          <li>
            <code>corroboratedBy</code> y <code>disagreementPct</code>: qué otras fuentes publicaron
            ese mismo mercado y cuánto se alejó la que más se alejó.
          </li>
          <li>
            <code>rejected</code>, en la raíz: lo que el validador descartó y por qué. Sirve para
            detectar que una fuente se rompió el día que se rompe.
          </li>
        </ul>
      </VAlert>
    </section>

    <!-- 4. Series -->
    <section class="mb-10" aria-labelledby="series">
      <h2 id="series" class="section-heading mb-1">Qué historia hay, y desde cuándo</h2>
      <p class="section-lead text-body-2 mb-4">
        Inventario en vivo de <code>GET /regional/series</code>. Las series largas son las que
        publica el propio emisor; las de un solo día empezaron cuando este tablero salió, porque
        nadie publica su historia y la estamos construyendo un día por vez.
      </p>
      <VTable density="compact" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Serie</th>
            <th>País</th>
            <th class="text-right">Días</th>
            <th>Desde</th>
            <th>Hasta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in longSeries" :key="row.key">
            <td data-label="Serie">
              <code>{{ row.key }}</code>
            </td>
            <td data-label="País">{{ row.country }}</td>
            <td data-label="Días" class="text-right">{{ row.days.toLocaleString('es-UY') }}</td>
            <td data-label="Desde">{{ row.from }}</td>
            <td data-label="Hasta">{{ row.to }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-body-2 mt-3 mb-0">
        Hay {{ shortSeriesCount }} series más, todas de mercados que ningún tercero publica en forma
        histórica (Paraguay, Bolivia, el mostrador uruguayo, los cruces). Se pueden listar todas con
        <code>GET /regional/series</code>.
      </p>
    </section>

    <!-- 5. Fuentes -->
    <section class="mb-10" aria-labelledby="fuentes">
      <h2 id="fuentes" class="section-heading mb-1">Las fuentes, y a quién citar</h2>
      <p class="section-lead text-body-2 mb-4">
        Salvo la fila de Uruguay, ningún dato es nuestro: somos un intermediario que normaliza. Si
        publicás un número tomado de acá, <strong>citá a quien lo publica</strong> —el catálogo está
        en <code>GET /regional/sources</code> y trae la URL de cada original—. Si además nos
        mencionás, mejor, pero lo importante es lo primero.
      </p>
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>id</th>
            <th>Fuente</th>
            <th>País</th>
            <th>Acceso</th>
            <th>Qué aporta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="source in catalogue" :key="source.id">
            <td data-label="id">
              <code>{{ source.id }}</code>
            </td>
            <td data-label="Fuente">
              <a :href="source.url" target="_blank" rel="noopener noreferrer nofollow">{{
                source.name
              }}</a>
            </td>
            <td data-label="País">{{ source.global ? 'Global' : source.country }}</td>
            <td data-label="Acceso">{{ source.access === 'api' ? 'API' : 'Scraping' }}</td>
            <td data-label="Qué aporta" class="text-body-2">{{ source.covers }}</td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- 6. Límites -->
    <section class="mb-10" aria-labelledby="limites">
      <h2 id="limites" class="section-heading mb-1">Límites, y qué NO garantiza</h2>
      <VRow>
        <VCol v-for="limit in LIMITS" :key="limit.title" cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-1">
              <VIcon size="small" :color="limit.color">{{ limit.icon }}</VIcon>
              <span class="text-subtitle-2 font-weight-bold">{{ limit.title }}</span>
            </div>
            <p class="text-body-2 mb-0">{{ limit.text }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- 7. Ejemplos de uso -->
    <section class="mb-10" aria-labelledby="usos">
      <h2 id="usos" class="section-heading mb-1">Tres llamadas para empezar</h2>
      <pre class="code-block"><code>{{ CURL_EXAMPLES }}</code></pre>
      <p class="text-body-2 mt-3 mb-0">
        Para series largas conviene filtrar por <code>country</code> + <code>market</code> +
        <code>base</code> + <code>quote</code>: sin filtros el endpoint devuelve todas las series
        mezcladas, que es casi nunca lo que se quiere.
      </p>
    </section>

    <!-- 8. FAQ -->
    <section class="mb-10">
      <FaqSection :items="FAQ" heading="Preguntas frecuentes" :expanded="true" />
    </section>

    <!-- 9. Pedir algo -->
    <section aria-labelledby="pedir">
      <h2 id="pedir" class="section-heading mb-3">¿Necesitás otra cosa?</h2>
      <p class="text-body-1 mb-3">
        Esta página existe porque alguien preguntó. Si te falta una moneda, un país, un campo o un
        formato, escribinos: si es razonable y la fuente es pública, se hace.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          variant="flat"
          color="primary"
          size="small"
          prepend-icon="mdi-email-outline"
          :to="localePath('/contacto')"
        >
          Contacto
        </VBtn>
        <VBtn
          variant="outlined"
          size="small"
          prepend-icon="mdi-github"
          href="https://github.com/eduair94/cambio-uruguay"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir un issue
        </VBtn>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import { regionalAge, regionalRate, type RegionalSnapshot } from '~/utils/regional'
import type { RegionalSeriesRow } from '~/server/api/regional-series.get'

const localePath = useLocalePath()

const API_BASE = 'https://api.cambio-uruguay.com'
const RELEASE_LABEL = '21 de agosto de 2026'

const { data } = await useFetch<RegionalSnapshot | null>('/api/regional', {
  key: 'regional-board-api',
  default: () => null,
})
const { data: seriesData } = await useFetch<{ series: RegionalSeriesRow[] }>(
  '/api/regional-series',
  {
    key: 'regional-series',
    default: () => ({ series: [] }),
  }
)

const snapshot = computed(() => (data.value?.quotes?.length ? data.value : null))
const catalogue = computed(() => snapshot.value?.catalogue ?? [])
const freshness = computed(() => regionalAge(snapshot.value?.generatedAt ?? null))

/** The Argentine blue is the row worth showing: four publishers cover it. */
const sample = computed(
  () =>
    snapshot.value?.quotes.find(quote => quote.id === 'AR:blue:USDARS') ??
    snapshot.value?.quotes[0] ??
    null
)
const sampleJson = computed(() =>
  sample.value
    ? JSON.stringify(sample.value, null, 2)
    : '// el tablero no respondió en este momento'
)

const tiles = computed(() => {
  const board = snapshot.value
  if (!board) return []
  const ok = board.sources.filter(source => source.ok).length
  return [
    { label: 'Cotizaciones', value: String(board.quotes.length) },
    { label: 'Fuentes que respondieron', value: `${ok}/${board.sources.length}` },
    { label: 'Cruces derivados', value: String(board.cross.length) },
    {
      label: 'Dólar blue (ARS)',
      value: regionalRate(
        board.quotes.find(quote => quote.id === 'AR:blue:USDARS')?.sell ?? null,
        'ARS'
      ),
    },
  ]
})

const allSeries = computed(() => seriesData.value?.series ?? [])
/** Series a publisher hands over with real history, longest first. */
const longSeries = computed(() =>
  [...allSeries.value].filter(row => row.days > 30).sort((a, b) => b.days - a.days)
)
const shortSeriesCount = computed(() => allSeries.value.length - longSeries.value.length)

// Built here rather than written inline in the template: a query string full of
// `&market=` reads as an unterminated HTML character reference to the Vue
// template compiler, and the page fails to parse.
const CURL_EXAMPLES = [
  '# El tablero completo de la región',
  `curl -s "${API_BASE}/regional" | jq '.board[] | {country, oficial: .official.avg}'`,
  '',
  '# La serie diaria del dólar blue desde 2011',
  `curl -s "${API_BASE}/regional/history?country=AR&market=blue&base=USD&quote=ARS&from=2011-01-01" \\`,
  "  | jq '.count, .points[0], .points[-1]'",
  '',
  '# Cuántos pesos uruguayos son 10.000 pesos argentinos al blue',
  `curl -s "${API_BASE}/regional/convert?from=ARS&to=UYU&amount=10000&market=blue" | jq`,
].join('\n')

const ENDPOINTS = [
  {
    path: '/regional',
    example: '/regional',
    what: 'El tablero completo: cada cotización con su mercado, su tipo, su fuente y su hora, más el tablero por país, las brechas, la matriz de cruces, la comparación de rutas y lo que el validador descartó.',
    params: [],
  },
  {
    path: '/regional/history',
    example: '/regional/history?country=AR&market=blue&base=USD&quote=ARS&from=2026-01-01',
    what: 'Serie diaria (un punto por día, el cierre) de un mercado. Sin filtros devuelve todas las series mezcladas.',
    params: [
      { name: 'country', def: '—', what: 'AR, BR, CL, PY, BO o UY.' },
      {
        name: 'market',
        def: '—',
        what: 'blue, oficial, ptax, turismo, observado, referencial, casas…',
      },
      { name: 'base', def: '—', what: 'Moneda unidad, normalmente USD.' },
      { name: 'quote', def: '—', what: 'Moneda en la que se expresa el precio (ARS, BRL…).' },
      { name: 'from / to', def: '—', what: 'Rango de días, YYYY-MM-DD.' },
      {
        name: 'limit',
        def: '5000',
        what: 'Máximo de puntos (1 a 20000). Se recortan los más viejos.',
      },
    ],
  },
  {
    path: '/regional/series',
    example: '/regional/series',
    what: 'Inventario de series: clave, país, mercado, par, cantidad de días y rango de fechas. Útil para saber qué pedirle a /regional/history antes de pedírselo.',
    params: [],
  },
  {
    path: '/regional/compare',
    example: '/regional/compare?currency=ARS&amount=50000',
    what: 'La comparación de rutas: comprar la moneda del vecino en Uruguay contra comprar dólares acá y cambiarlos allá, con el costo por unidad de cada una y cuál gana.',
    params: [
      { name: 'currency', def: 'todas', what: 'ARS, BRL, PYG, CLP o BOB.' },
      {
        name: 'amount',
        def: '—',
        what: 'Cantidad de moneda extranjera: agrega el total de cada ruta.',
      },
    ],
  },
  {
    path: '/regional/convert',
    example: '/regional/convert?from=ARS&to=UYU&amount=10000&market=blue',
    what: 'Conversión entre monedas de la región, pasando por el dólar. Devuelve las cotizaciones usadas en legs para que el resultado se pueda rehacer a mano.',
    params: [
      { name: 'from / to', def: 'obligatorios', what: 'Códigos ISO de tres letras.' },
      { name: 'amount', def: '1', what: 'Cantidad a convertir.' },
      {
        name: 'market',
        def: 'el oficial',
        what: 'Fija el mercado del lado de origen: blue, oficial, ptax, turismo…',
      },
    ],
  },
  {
    path: '/regional/sources',
    example: '/regional/sources',
    what: 'Las fuentes con el estado de la última corrida: si respondió, cuánto tardó, qué mercados publica, en cuáles queda corroborando a otra, qué se le descartó y por qué. El resumen trae `singleSourceMarkets`, que es el número a vigilar: los mercados que todavía dependen de una sola lectura.',
    params: [],
  },
  {
    path: '/regional/sources/{id}',
    example: '/regional/sources/py_bcp',
    what: 'La misma ficha, de una sola fuente.',
    params: [
      {
        name: 'id',
        def: 'obligatorio',
        what: 'El id de la fuente, como lo lista /regional/sources.',
      },
    ],
  },
  {
    path: '/regional/changes',
    example: '/regional/changes?country=AR&market=blue',
    what: 'Cada movimiento de precio, sin umbral mínimo: un guaraní o una diezmilésima de peso entran igual. Es la otra mitad de /regional/history, porque la fila diaria se sobrescribe y lo que pasa adentro del día sólo existe acá.',
    params: [
      { name: 'key', def: '—', what: 'Clave exacta del mercado, por ejemplo AR:blue:USDARS.' },
      {
        name: 'country / market / base / quote',
        def: '—',
        what: 'Los mismos filtros que en /regional/history.',
      },
      { name: 'from / to', def: '—', what: 'Rango por fecha y hora (ISO 8601).' },
      { name: 'limit', def: '500', what: 'Máximo de movimientos (1 a 5000).' },
    ],
  },
]

const LIMITS = [
  {
    icon: 'mdi-clock-outline',
    color: 'primary',
    title: 'Se refresca cada 20 minutos',
    text: 'La respuesta se cachea 2 minutos. Pedirlo cada segundo no trae nada nuevo: lo que devuelve es la última corrida, no una consulta en vivo a trece sitios.',
  },
  {
    icon: 'mdi-timer-sand',
    color: 'primary',
    title: 'Frescura ≠ hora de lectura',
    text: 'updatedAt es la hora que declara la fuente. El observado chileno es de la rueda anterior, el PTAX se fija una vez al día y la planilla paraguaya se publica una vez por jornada. oldestQuoteAt, en la raíz, es la más vieja del tablero.',
  },
  {
    icon: 'mdi-alert-outline',
    color: 'warning',
    title: 'Una fuente puede faltar',
    text: 'Veintiuna fuentes en seis países: alguna se cae. El tablero se publica igual y sources dice quién no respondió. Si una corrida trae menos de la mitad de lo guardado, se conserva la anterior antes que publicar un tablero mutilado.',
  },
  {
    icon: 'mdi-scale-balance',
    color: 'warning',
    title: 'No es asesoramiento ni cotización en firme',
    text: 'Son precios publicados por terceros, normalizados. Ninguna casa de cambio está obligada a operar a estos valores y nada de esto es una recomendación financiera.',
  },
  {
    icon: 'mdi-source-branch',
    color: 'primary',
    title: 'Citá a la fuente primaria',
    text: 'Casi nada de esto es nuestro. Cada cotización trae source y sourceUrl; si publicás un número, el crédito va a quien lo publica.',
  },
  {
    icon: 'mdi-history',
    color: 'primary',
    title: 'La historia empieza donde empieza',
    text: 'Las series argentinas arrancan en 2011 y el PTAX brasileño en 1995 porque sus publicadores las dan así. Las de Paraguay, Bolivia, Uruguay y los cruces arrancan el día que salió este tablero: nadie las publica y se están construyendo.',
  },
]

const FAQ: FaqItem[] = [
  {
    id: 'regional-api-clave',
    question: '¿Necesito una clave o registrarme?',
    answer:
      'No. Son endpoints públicos, sin autenticación, sobre HTTPS y con CORS abierto. No se recolecta nada de quien llama más allá de los registros técnicos normales de un servidor web.',
  },
  {
    id: 'regional-api-limite',
    question: '¿Hay límite de llamadas?',
    answer:
      'No hay un límite formal, pero la respuesta se cachea dos minutos y los datos se recalculan cada veinte, así que llamar más seguido que eso no devuelve información nueva. Si necesitás un volumen alto o una descarga masiva, escribinos antes: es más fácil darte los datos de otra forma que aguantar el tráfico.',
  },
  {
    id: 'regional-api-monedas',
    question: '¿Qué monedas cubre exactamente?',
    answer:
      'El dólar contra las seis monedas de la región (ARS, BRL, CLP, PYG, BOB, UYU), el euro donde el país lo publica, y los cruces directos que alguna fuente cotiza: el real en pesos argentinos, el peso argentino en reales y en pesos chilenos, el peso uruguayo en guaraníes y en pesos argentinos, entre otros. Además, la matriz completa de cruces implícitos entre las seis monedas, anclada siempre en cotizaciones oficiales.',
  },
  {
    id: 'regional-api-diferencia',
    question: '¿En qué se diferencia de las APIs de tipo de cambio que ya existen?',
    answer:
      'La mayoría devuelve un número por moneda. Esta devuelve todos los mercados que cada país publica, etiquetados por tipo, con la fuente y la hora de cada uno, y dice cuáles fuentes se corroboran entre sí y cuáles descartó el validador. Para Argentina, "el dólar" son siete precios distintos; una API que devuelve uno solo obliga a adivinar cuál.',
  },
  {
    id: 'regional-api-uruguay',
    question: '¿Y los datos de Uruguay?',
    answer:
      'La fila uruguaya del tablero regional es un resumen: el mejor precio entre las casas que operan cada moneda. El detalle casa por casa vive en los endpoints uruguayos de siempre (GET / para el tablero completo, /intraday para la variación del día, /analytics/rates para series por hora o por día), documentados en la página de desarrolladores.',
  },
  {
    id: 'regional-api-licencia',
    question: '¿Puedo usar esto en un trabajo académico o en un producto?',
    answer:
      'Sí, en los dos casos, gratis y sin permiso previo. Lo único que pedimos es que cites a la fuente primaria de cada dato, que está en el campo sourceUrl de cada cotización y en el catálogo de /regional/sources.',
  },
]

const title = 'API de cotizaciones de la región (Argentina, Brasil, Paraguay, Chile, Bolivia)'
const description =
  'Endpoints públicos y gratuitos con el dólar y los cruces de la región: todos los mercados que publica cada país, series diarias desde 1995 y conversión entre monedas. Sin registro ni clave.'
const canonicalUrl = 'https://cambio-uruguay.com/api-cotizaciones-regionales'

defineOgImageComponent('Cambio', {
  title: 'API de cotizaciones regionales',
  subtitle: 'Argentina, Brasil, Paraguay, Chile, Bolivia y Uruguay',
  tag: 'API PÚBLICA',
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
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'TechArticle',
            headline: title,
            description,
            url: canonicalUrl,
            inLanguage: 'es-UY',
            datePublished: '2026-08-21',
            dateModified: '2026-08-21',
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
            about: { '@id': `${canonicalUrl}#api` },
          },
          {
            '@type': 'WebAPI',
            '@id': `${canonicalUrl}#api`,
            name: 'Cambio Uruguay — cotizaciones regionales',
            description:
              'Endpoints REST públicos con el dólar y los cruces de Argentina, Brasil, Paraguay, Chile, Bolivia y Uruguay, con todos los mercados que publica cada país y series diarias.',
            documentation: canonicalUrl,
            endpointUrl: `${API_BASE}/regional`,
            provider: { '@type': 'Organization', name: 'Cambio Uruguay' },
            termsOfService: 'https://cambio-uruguay.com/terminos',
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
.hero code {
  background: rgba(255, 255, 255, 0.14);
  color: inherit;
}
.section-heading {
  margin-top: 0;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1.3;
}
.section-lead {
  margin-top: 0;
  max-width: 80ch;
}
.alert-title {
  margin-top: 0;
}
.tile-value {
  margin-top: 0;
}
.tight-list {
  margin-top: 0;
  padding-left: 1.15rem;
}
.tight-list li + li {
  margin-top: 6px;
}
.endpoint {
  border: 1px solid rgba(128, 128, 128, 0.28);
  border-radius: 12px;
}
.endpoint-url {
  font-size: 1rem;
  word-break: break-all;
}
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  padding: 1px 5px;
  border-radius: 4px;
  background: rgba(128, 128, 128, 0.16);
}
.code-block {
  margin-top: 0;
  overflow-x: auto;
  padding: 16px;
  border-radius: 10px;
  background: rgba(128, 128, 128, 0.12);
  border: 1px solid rgba(128, 128, 128, 0.22);
  font-size: 0.82rem;
  line-height: 1.55;
}
.code-block code {
  background: none;
  padding: 0;
}
</style>
