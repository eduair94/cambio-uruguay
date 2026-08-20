<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero on-dark mb-8">
      <p class="eyebrow">Actualización de la API pública · {{ RELEASE_LABEL }}</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
        API de cotización y variación intradía
      </h1>
      <p class="hero-lead text-body-1 mb-4">
        Un estudiante de la <strong>Universidad Tecnológica (UTEC)</strong> nos escribió por correo
        pidiendo poder consultar, además de la cotización del día, cuánto se movió dentro del mismo
        día. Lo hicimos: <code>GET /intraday</code> devuelve, para un día calendario de Montevideo,
        la <strong>apertura</strong>, el <strong>último valor</strong>, el <strong>máximo</strong>,
        el <strong>mínimo</strong> y la lista completa de cambios reales de cada casa de cambio.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          color="white"
          variant="flat"
          size="small"
          prepend-icon="mdi-code-json"
          :href="`${API_BASE}/intraday?code=USD`"
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
          prepend-icon="mdi-api"
          :to="localePath('/desarrolladores')"
        >
          Toda la API
        </VBtn>
      </div>
    </header>

    <!-- 1. La solicitud, sin datos personales -->
    <section class="mb-10" aria-labelledby="solicitud">
      <h2 id="solicitud" class="section-heading mb-3">La solicitud, y qué no vas a leer acá</h2>
      <p class="text-body-1 mb-4">
        El pedido llegó por correo electrónico desde una casilla institucional de UTEC. Publicamos
        <strong>qué se pidió</strong> —una funcionalidad de una API pública— y
        <strong>qué hicimos</strong>. No publicamos el nombre, la dirección de correo, la firma, el
        curso, la cátedra ni ningún otro dato que permita identificar a quien escribió, ni acá ni en
        el repositorio, ni en el historial de commits.
      </p>

      <VRow class="mb-2">
        <VCol cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="success">mdi-check-circle-outline</VIcon>
              <span class="text-subtitle-1 font-weight-bold">Lo que sí publicamos</span>
            </div>
            <ul class="text-body-2 tight-list">
              <li>Que el pedido vino de un estudiante de UTEC.</li>
              <li>El contenido funcional del pedido: cotización y variación dentro del día.</li>
              <li>El endpoint, su contrato, sus límites y cómo se calcula cada campo.</li>
              <li>La fecha en que se publicó el cambio.</li>
            </ul>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon color="error">mdi-close-circle-outline</VIcon>
              <span class="text-subtitle-1 font-weight-bold">Lo que no publicamos</span>
            </div>
            <ul class="text-body-2 tight-list">
              <li>Nombre y apellido.</li>
              <li>Dirección de correo electrónico (ni completa ni parcialmente ofuscada).</li>
              <li>Captura, cita textual o reenvío del mensaje.</li>
              <li>Cualquier dato que, cruzado con otro, vuelva determinable a la persona.</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>

      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        icon="mdi-scale-balance"
        class="mt-4"
      >
        <p class="alert-title font-weight-bold mb-1">Por qué, en concreto</p>
        <p class="text-body-2 mb-2">
          Una dirección de correo electrónico es un
          <strong>dato personal</strong> en los términos del artículo 4 literal D de la
          <strong>Ley Nº 18.331</strong> (Protección de Datos Personales y Acción de Habeas Data):
          «información de cualquier tipo referida a personas físicas o jurídicas determinadas o
          determinables». Publicarla sería una <strong>comunicación de datos</strong> (art. 4
          literal B: «toda revelación de datos realizada a una persona distinta del titular»), y el
          artículo 17 sólo la admite con <strong>previo consentimiento del titular</strong>,
          informándole la finalidad e identificando al destinatario. Ese consentimiento no existe:
          nadie escribe un correo con una consulta técnica esperando figurar en una página web.
        </p>
        <p class="text-body-2 mb-0">
          El artículo 9 establece el mismo principio con carácter general —el tratamiento es lícito
          cuando el titular prestó consentimiento «libre, previo, expreso e informado»— y su
          excepción de «fuentes públicas de información» no aplica: un correo dirigido a nosotros no
          es una fuente pública. Además, el mensaje traía la cláusula de confidencialidad
          institucional de UTEC, que limita su uso a su destinatario.
        </p>
      </VAlert>

      <VCard variant="tonal" color="primary" class="pa-4 mt-4">
        <div class="d-flex align-center ga-2 mb-2">
          <VIcon>mdi-account-check-outline</VIcon>
          <span class="text-subtitle-1 font-weight-bold">Tus derechos sobre tus datos</span>
        </div>
        <p class="text-body-2 mb-2">
          Si nos escribiste alguna vez, la Ley 18.331 te da derecho de
          <strong>acceso</strong> (art. 14) y de
          <strong>rectificación, actualización, inclusión o supresión</strong> (art. 15) sobre los
          datos que conservemos, y la <strong>acción de habeas data</strong> (art. 37) si no te
          respondemos. El órgano de control es la
          <strong>Unidad Reguladora y de Control de Datos Personales</strong>, creada por el
          artículo 31 como órgano desconcentrado de AGESIC.
        </p>
        <div class="d-flex flex-wrap ga-2">
          <VBtn
            size="small"
            variant="flat"
            :to="localePath('/contacto')"
            prepend-icon="mdi-email-outline"
          >
            Ejercer estos derechos
          </VBtn>
          <VBtn
            size="small"
            variant="text"
            :to="localePath('/privacidad')"
            prepend-icon="mdi-shield-lock-outline"
          >
            Política de privacidad
          </VBtn>
        </div>
      </VCard>
    </section>

    <!-- 2. El endpoint -->
    <section class="mb-10" aria-labelledby="endpoint">
      <h2 id="endpoint" class="section-heading mb-3">Qué se agregó</h2>
      <p class="text-body-1 mb-4">
        Un endpoint nuevo, público, sin autenticación y sin límite de llamadas declarado. No maneja
        ni devuelve datos de personas: sólo precios que las casas de cambio publican.
      </p>

      <VCard variant="flat" class="endpoint pa-4 pa-sm-5 mb-5">
        <div class="d-flex flex-wrap align-center ga-2 mb-2">
          <VChip size="small" color="success" variant="flat" label>GET</VChip>
          <code class="endpoint-url">{{ API_BASE }}/intraday</code>
        </div>
        <p class="text-body-2 text-medium-emphasis mb-0">
          Devuelve una serie por cotización (casa + moneda + tipo) del día pedido, más el resumen
          del día. Cachea 30 s mientras el día corre y 1 hora una vez cerrado.
        </p>
      </VCard>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">Parámetros</h3>
      <VTable density="comfortable" class="cu-mobile-cards mb-6">
        <thead>
          <tr>
            <th>Parámetro</th>
            <th>Valor por defecto</th>
            <th>Qué hace</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="param in PARAMS" :key="param.name">
            <td data-label="Parámetro">
              <code>{{ param.name }}</code>
            </td>
            <td data-label="Por defecto">
              <span class="text-medium-emphasis">{{ param.def }}</span>
            </td>
            <td data-label="Qué hace">{{ param.what }}</td>
          </tr>
        </tbody>
      </VTable>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">Campos de cada serie</h3>
      <VTable density="comfortable" class="cu-mobile-cards mb-6">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Qué es</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="field in FIELDS" :key="field.name">
            <td data-label="Campo">
              <code>{{ field.name }}</code>
            </td>
            <td data-label="Qué es">{{ field.what }}</td>
          </tr>
        </tbody>
      </VTable>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">Ejemplos</h3>
      <VTabs v-model="exampleTab" density="compact" class="mb-3">
        <VTab v-for="example in EXAMPLES" :key="example.id" :value="example.id">
          {{ example.label }}
        </VTab>
      </VTabs>
      <VWindow v-model="exampleTab">
        <VWindowItem v-for="example in EXAMPLES" :key="example.id" :value="example.id">
          <pre class="code-block"><code>{{ example.code }}</code></pre>
        </VWindowItem>
      </VWindow>
    </section>

    <!-- 3. Demo en vivo -->
    <section class="mb-10" aria-labelledby="vivo">
      <h2 id="vivo" class="section-heading mb-3">El dólar de hoy, movimiento por movimiento</h2>
      <p class="text-body-1 mb-4">
        Esta tabla se arma con la misma llamada que acabás de ver, sin nada agregado. Si una casa no
        tocó el precio en todo el día, su fila muestra cero cambios: eso también es información.
      </p>

      <VAlert
        v-if="!snapshot"
        type="warning"
        variant="tonal"
        density="comfortable"
        icon="mdi-cloud-off-outline"
      >
        No pudimos leer la API en este momento. El endpoint sigue en
        <code>{{ API_BASE }}/intraday</code>; probá de nuevo en un rato.
      </VAlert>

      <template v-else>
        <VRow class="mb-2">
          <VCol v-for="tile in summaryTiles" :key="tile.label" cols="6" md="3">
            <VCard variant="outlined" class="pa-3 h-100">
              <p class="text-caption text-medium-emphasis mb-1">{{ tile.label }}</p>
              <p class="text-h6 font-weight-bold mb-0">{{ tile.value }}</p>
            </VCard>
          </VCol>
        </VRow>

        <VTable density="comfortable" class="cu-mobile-cards">
          <thead>
            <tr>
              <th>Casa</th>
              <th class="text-right">Apertura (venta)</th>
              <th class="text-right">Último (venta)</th>
              <th class="text-right">Mín · Máx</th>
              <th class="text-right">Variación</th>
              <th class="text-right">Cambios</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in movers" :key="`${row.origin}-${row.type}`">
              <td data-label="Casa">
                <span class="font-weight-medium">{{ row.houseName }}</span>
                <span v-if="row.type" class="text-caption text-medium-emphasis">
                  · {{ row.type }}</span
                >
              </td>
              <td data-label="Apertura (venta)" class="text-right">{{ money(row.openSell) }}</td>
              <td data-label="Último (venta)" class="text-right">{{ money(row.lastSell) }}</td>
              <td data-label="Mín · Máx" class="text-right text-no-wrap">
                {{ money(row.lowSell) }} · {{ money(row.highSell) }}
              </td>
              <td data-label="Variación" class="text-right">
                <span :class="deltaClass(row.sellChange)">{{ delta(row.sellChange) }}</span>
              </td>
              <td data-label="Cambios" class="text-right">{{ row.changes }}</td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          Día {{ snapshot.date }} (America/Montevideo) · leído {{ readAt }} ·
          {{ snapshot.series.length }} cotizaciones públicas de {{ snapshot.code
          }}<span v-if="hiddenRows"
            >, de las que la tabla muestra las {{ movers.length }} de mayor movimiento y omite
            {{ hiddenRows }}</span
          >. La llamada devuelve todas. Excluye la referencia oficial del BCU y los tipos
          mayoristas, que no son precios a los que una persona pueda operar.
        </p>
      </template>
    </section>

    <!-- 4. Cómo se calcula la apertura -->
    <section class="mb-10" aria-labelledby="apertura">
      <h2 id="apertura" class="section-heading mb-3">
        De dónde sale la apertura (y por qué cuesta)
      </h2>
      <p class="text-body-1 mb-4">
        La base guarda <strong>una fila por casa y por día</strong>, y cada sync la sobrescribe. Esa
        fila es entonces el <strong>cierre</strong> del día, nunca su apertura: leerla de ahí daría
        siempre variación cero. La apertura se reconstruye con el registro de cambios, que sí guarda
        el valor anterior de cada movimiento. El campo <code>openSource</code> te dice cuál de los
        cuatro caminos se usó, para que no tengas que confiar a ciegas:
      </p>
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>openSource</th>
            <th>Significa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="source in OPEN_SOURCES" :key="source.name">
            <td data-label="openSource">
              <code>{{ source.name }}</code>
            </td>
            <td data-label="Significa">{{ source.what }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-body-2 text-medium-emphasis mt-4 mb-0">
        El registro de cambios sólo escribe cuando compra o venta efectivamente se movieron: una
        verificación que devuelve el mismo precio no genera fila. Por eso
        <code>changes: 0</code> significa «no se movió», no «no lo miramos».
      </p>
    </section>

    <!-- 5. Qué mirar además -->
    <section class="mb-10" aria-labelledby="relacionado">
      <h2 id="relacionado" class="section-heading mb-3">Los otros endpoints del mismo tema</h2>
      <VRow>
        <VCol v-for="item in RELATED" :key="item.path" cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-1">
              <code>{{ item.path }}</code>
            </p>
            <p class="text-body-2 mb-0">{{ item.what }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <FaqSection :items="FAQ" heading="Preguntas frecuentes" :expanded="true" />
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'

interface IntradaySeries {
  origin: string
  houseName: string
  code: string
  type: string
  name: string
  openBuy: number
  openSell: number
  openSource: string
  lastBuy: number
  lastSell: number
  lastAt: string | null
  highBuy: number
  lowBuy: number
  highSell: number
  lowSell: number
  buyChange: number
  buyChangePct: number
  sellChange: number
  sellChangePct: number
  changes: number
  firstChangeAt: string | null
  lastChangeAt: string | null
}

interface IntradayResponse {
  asOf: string
  date: string
  isToday: boolean
  code: string
  totals: {
    quotes: number
    quotesChanged: number
    changes: number
    avgLastSell: number | null
    avgSellChangePct: number | null
  }
  series: IntradaySeries[]
}

const localePath = useLocalePath()

const API_BASE = 'https://api.cambio-uruguay.com'
const RELEASE_LABEL = '20 de agosto de 2026'

// Server-rendered: the table IS the demo, so it has to be in the HTML a crawler (and a reader with
// a slow connection) gets. `default` keeps SSR alive if the API is down — the page then shows the
// warning instead of a 500.
const { data } = await useFetch<IntradayResponse | null>('/api/intraday', {
  query: { code: 'USD' },
  default: () => null,
})
const snapshot = computed(() => (data.value?.series ? data.value : null))

// Movers first: a reader wants to see what moved, and the flat houses are the long tail.
const ranked = computed(() =>
  [...(snapshot.value?.series || [])].sort(
    (a, b) => b.changes - a.changes || Math.abs(b.sellChange) - Math.abs(a.sellChange)
  )
)
// The demo is an illustration, not the market table — 47 rows of mostly-zero would bury the point.
// What is cut is spelled out under the table rather than silently dropped.
const DEMO_ROWS = 20
const movers = computed(() => ranked.value.slice(0, DEMO_ROWS))
const hiddenRows = computed(() => Math.max(0, ranked.value.length - DEMO_ROWS))

const summaryTiles = computed(() => {
  const totals = snapshot.value?.totals
  if (!totals) return []
  return [
    { label: 'Cotizaciones', value: String(totals.quotes) },
    { label: 'Se movieron', value: String(totals.quotesChanged) },
    { label: 'Cambios en el día', value: String(totals.changes) },
    {
      label: 'Venta promedio',
      value: totals.avgLastSell === null ? '—' : money(totals.avgLastSell),
    },
  ]
})

const readAt = computed(() => {
  const asOf = snapshot.value?.asOf
  if (!asOf) return '—'
  return new Date(asOf).toLocaleTimeString('es-UY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Montevideo',
  })
})

function money(value: number): string {
  return value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function delta(value: number): string {
  if (value === 0) return '—'
  const rounded = Math.abs(value).toLocaleString('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value > 0 ? '+' : '−'}${rounded}`
}

function deltaClass(value: number): string {
  if (value > 0) return 'text-success font-weight-medium'
  if (value < 0) return 'text-error font-weight-medium'
  return 'text-medium-emphasis'
}

const PARAMS = [
  {
    name: 'code',
    def: 'USD',
    what: 'Moneda, en ISO de 2 a 5 letras. Las disponibles del día vuelven en availableCurrencies.',
  },
  {
    name: 'date',
    def: 'hoy',
    what: 'Día calendario YYYY-MM-DD en zona America/Montevideo. No se aceptan fechas futuras.',
  },
  {
    name: 'origins',
    def: 'todas',
    what: 'Lista de casas separadas por coma. Los ids válidos están en /parameters/origins.',
  },
  {
    name: 'type',
    def: 'todos',
    what: 'Tipo exacto de cotización. type= (vacío) es la simple; hoy existen además EBROU y TRANSFERENCIA.',
  },
]

const FIELDS = [
  { name: 'openBuy / openSell', what: 'Precio con el que la casa arrancó el día.' },
  {
    name: 'lastBuy / lastSell',
    what: 'Último precio conocido del día (el cierre, si el día ya terminó).',
  },
  { name: 'highBuy / lowBuy', what: 'Máximo y mínimo de compra alcanzados dentro del día.' },
  { name: 'highSell / lowSell', what: 'Máximo y mínimo de venta alcanzados dentro del día.' },
  {
    name: 'buyChange / sellChange',
    what: 'Diferencia absoluta entre el último y la apertura, con signo.',
  },
  {
    name: 'buyChangePct / sellChangePct',
    what: 'La misma diferencia en porcentaje sobre la apertura, con cuatro decimales.',
  },
  { name: 'changes', what: 'Cuántas veces se movió el precio en el día. Cero es un dato válido.' },
  { name: 'points[]', what: 'Cada movimiento: hora exacta, precios nuevos y qué lado cambió.' },
  { name: 'openSource', what: 'Cómo se reconstruyó la apertura (ver más abajo).' },
  {
    name: 'totals',
    what: 'Resumen del día: cotizaciones, cuántas se movieron, cuántos cambios y promedios.',
  },
]

const OPEN_SOURCES = [
  {
    name: 'ledger-previous',
    what: 'Exacto: es el valor anterior del primer cambio del día. Se usa siempre que el día tuvo al menos un movimiento.',
  },
  {
    name: 'ledger-carried',
    what: 'El día no tuvo movimientos, así que arrastra el último estado registrado antes de que empezara.',
  },
  {
    name: 'daily-previous',
    what: 'Tampoco había registro previo: se toma el cierre del día anterior de esa casa.',
  },
  {
    name: 'flat',
    what: 'No hay nada anterior con qué comparar (por ejemplo, el primer día de una casa nueva): apertura y cierre coinciden y la variación es cero por construcción.',
  },
]

const RELATED = [
  { path: 'GET /changes', what: 'El registro crudo de cambios, sin agrupar por día ni por casa.' },
  {
    path: 'GET /market-change',
    what: 'Cuánto se movió el promedio del mercado contra exactamente N horas atrás.',
  },
  {
    path: 'GET /analytics/rates',
    what: 'Series por hora o por día para graficar un rango largo, con los huecos marcados.',
  },
  {
    path: 'GET /evolution/{origin}/{code}',
    what: 'La evolución histórica de una casa en meses, no en horas.',
  },
]

const EXAMPLES = [
  {
    id: 'curl',
    label: 'curl',
    code: `# El dólar de hoy, todas las casas
curl "${API_BASE}/intraday?code=USD"

# Un día cerrado, sólo BROU e Itaú
curl "${API_BASE}/intraday?code=USD&date=2026-08-19&origins=brou,itau"

# Sólo la cotización simple, sin las variantes por canal
curl "${API_BASE}/intraday?code=USD&type="`,
  },
  {
    id: 'js',
    label: 'JavaScript',
    code: `const res = await fetch("${API_BASE}/intraday?code=USD")
const day = await res.json()

for (const s of day.series) {
  if (s.changes === 0) continue
  console.log(
    s.houseName,
    "abrió en", s.openSell,
    "cerró en", s.lastSell,
    \`(\${s.sellChangePct > 0 ? "+" : ""}\${s.sellChangePct}%)\`,
    "en", s.changes, "movimientos"
  )
}`,
  },
  {
    id: 'python',
    label: 'Python',
    code: `import requests

day = requests.get(
    "${API_BASE}/intraday",
    params={"code": "USD", "date": "2026-08-19"},
    timeout=10,
).json()

movers = [s for s in day["series"] if s["changes"] > 0]
movers.sort(key=lambda s: abs(s["sellChange"]), reverse=True)

for s in movers[:5]:
    print(f'{s["houseName"]:<24} {s["openSell"]:>7} -> {s["lastSell"]:>7}  ({s["changes"]} cambios)')`,
  },
  {
    id: 'json',
    label: 'Respuesta',
    code: `{
  "asOf": "2026-08-20T18:42:11.004Z",
  "date": "2026-08-20",
  "dayStart": "2026-08-20T03:00:00.000Z",
  "dayEnd": "2026-08-21T03:00:00.000Z",
  "coverageEnd": "2026-08-20T18:42:11.004Z",
  "isToday": true,
  "code": "USD",
  "totals": {
    "quotes": 46, "quotesChanged": 12, "changes": 19,
    "avgOpenSell": 41.28, "avgLastSell": 41.34, "avgSellChangePct": 0.1453
  },
  "availableCurrencies": ["ARS", "BRL", "EUR", "USD"],
  "series": [
    {
      "origin": "brou", "houseName": "BROU", "code": "USD", "type": "",
      "openBuy": 39.2, "openSell": 41.2, "openSource": "ledger-previous",
      "lastBuy": 39.5, "lastSell": 41.5, "lastAt": "2026-08-20T13:05:02.000Z",
      "highSell": 41.5, "lowSell": 41.2,
      "sellChange": 0.3, "sellChangePct": 0.7282,
      "changes": 1,
      "points": [
        { "at": "2026-08-20T13:05:02.000Z", "buy": 39.5, "sell": 41.5,
          "buyChanged": true, "sellChanged": true }
      ]
    }
  ]
}`,
  },
]

const exampleTab = ref('curl')

const FAQ: FaqItem[] = [
  {
    id: 'intraday-quien-pidio',
    question: '¿Quién pidió este endpoint?',
    answer:
      'Un estudiante de la Universidad Tecnológica (UTEC), por correo electrónico. No publicamos su nombre ni su dirección de correo: son datos personales en los términos del artículo 4 de la Ley 18.331 y no tenemos consentimiento para difundirlos, que es lo que exige el artículo 17 para comunicar datos a un tercero.',
  },
  {
    id: 'intraday-necesito-clave',
    question: '¿Necesito una clave o registrarme para usarlo?',
    answer:
      'No. Es un endpoint público, sin autenticación, sobre HTTPS y con CORS abierto. Tampoco recolecta datos de quien lo llama más allá de los registros técnicos normales de un servidor web.',
  },
  {
    id: 'intraday-cada-cuanto',
    question: '¿Cada cuánto se actualizan los datos?',
    answer:
      'Las casas se consultan cada cinco minutos y sólo se escribe una fila cuando el precio efectivamente cambió. La respuesta se cachea 30 segundos mientras el día corre y una hora una vez que el día cerró, porque un día terminado ya no puede cambiar.',
  },
  {
    id: 'intraday-cuanto-historial',
    question: '¿Hasta qué día para atrás puedo pedir?',
    answer:
      'Podés pedir cualquier día pasado del que haya datos. Ahora bien, el registro de cambios intradía arrancó mucho después que el histórico diario: para los días anteriores a ese arranque vas a ver la apertura reconstruida con openSource daily-previous y cero puntos intradía, porque esos movimientos nunca se registraron.',
  },
  {
    id: 'intraday-bcu',
    question: '¿Por qué no aparece la cotización del BCU?',
    answer:
      'Porque no es un precio al que una persona pueda operar: es la referencia oficial del Banco Central. Por el mismo criterio quedan afuera los tipos mayoristas (INTERBANCARIO, CABLE, PROMED.FONDO). La cotización oficial está en el endpoint /bcu.',
  },
  {
    id: 'intraday-pedir-otra',
    question: 'Necesito otra cosa de la API, ¿cómo la pido?',
    answer:
      'Escribinos desde la página de contacto o abrí un issue en el repositorio de GitHub. Un issue es público y no expone tu correo; si preferís escribir por mail, tu dirección no se publica.',
  },
]

const title = 'API de cotización y variación intradía'
const description =
  'GET /intraday: apertura, último valor, máximo, mínimo y cada movimiento del día de todas las casas de cambio de Uruguay. Endpoint público y gratuito, publicado a pedido de un estudiante de UTEC.'
const canonicalUrl = 'https://cambio-uruguay.com/api-cotizacion-intradia'

defineOgImageComponent('Cambio', {
  title: 'API de cotización intradía',
  subtitle: 'Apertura, máximo, mínimo y cada movimiento del día',
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

// TechArticle (the write-up) + WebAPI (the thing it documents). The FAQPage
// schema is emitted by FaqSection, so it is deliberately not repeated here.
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
            datePublished: '2026-08-20',
            dateModified: '2026-08-20',
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
            about: { '@id': `${canonicalUrl}#api` },
          },
          {
            '@type': 'WebAPI',
            '@id': `${canonicalUrl}#api`,
            name: 'Cambio Uruguay — cotización intradía',
            description:
              'Endpoint REST público que devuelve apertura, último valor, máximo, mínimo y cada movimiento de precio del día para las casas de cambio de Uruguay.',
            documentation: canonicalUrl,
            endpointUrl: `${API_BASE}/intraday`,
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
.alert-title {
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
