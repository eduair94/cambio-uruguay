<template>
  <VContainer class="py-6 py-md-10">
    <VBreadcrumbs
      :items="[
        { title: 'Alquileres', to: localePath('/alquileres-uruguay') },
        { title: 'Vivir con el salario mínimo' },
      ]"
      class="px-0 mb-2"
    />

    <header class="mb-8 smn-header">
      <h1 class="text-h4 font-weight-bold mb-3">
        Vivir con el salario mínimo en Uruguay: las formas que cierran
      </h1>
      <p class="smn-lead mb-3">
        El salario mínimo es de {{ pesos(SMN_VIGENTE) }} por mes y en la mano quedan
        {{ pesos(LIQUIDO_SMN) }}. Solo y alquilando al promedio de Montevideo ({{
          pesos(alquilerMontevideo)
        }}
        un contrato nuevo) no alcanza: esa cuenta está en
        <NuxtLink :to="localePath('/vivir-con-25000-pesos-uruguay')"
          >¿se puede vivir con 25.000?</NuxtLink
        >. Acá está la otra: las formas en que sí cierra, con los avisos de alquiler que hoy entran.
      </p>
      <p v-if="data" class="text-body-1 mb-0">
        <template v-if="formasQueCierran.length">
          Hoy entran avisos en
          <strong>{{ formasQueCierran.length }} de las {{ FORMAS.length }} formas</strong>, con
          {{ resumenFormas }}. {{ notaCondicionados }}
        </template>
        <template v-else>
          {{ sinNinguna }}
        </template>
      </p>
    </header>

    <section class="mb-10" aria-labelledby="smn-formas">
      <h2 id="smn-formas" class="text-h5 mb-1">Las cuatro formas</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        El techo es lo que queda para la vivienda después de comer, moverse y lo demás, con las
        decisiones que están marcadas en la cuenta del mes.
      </p>
      <div class="smn-formas">
        <article
          v-for="item in FORMAS"
          :key="item.id"
          class="smn-forma"
          :class="{ 'smn-forma--activa': state.forma === item.id }"
        >
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ item.titulo }}</h3>
          <p class="text-body-2 text-medium-emphasis mb-3">{{ item.quien }}</p>
          <p class="smn-forma__techo mb-1">{{ techoTexto(item.id) }}</p>
          <p class="text-body-2 mb-3">{{ techoDe(item.id) }}</p>
          <template v-if="resumenDe(item.id)">
            <p v-if="entran(item.id)" class="text-body-2 mb-1">
              <strong>{{ miles(entran(item.id)) }} avisos entran</strong>, desde
              {{ pesos(resumenDe(item.id)!.desde ?? 0) }}.
              <template v-if="resumenDe(item.id)!.condicionados">
                {{ miles(resumenDe(item.id)!.condicionados) }} con un dato por confirmar.
              </template>
            </p>
            <p v-else class="text-body-2 mb-1"><strong>Hoy no entra ningún aviso.</strong></p>
            <p class="text-body-2 text-medium-emphasis mb-3">
              Sin las decisiones de la cuenta: {{ miles(resumenDe(item.id)!.sinPalancas) }}
              {{ resumenDe(item.id)!.sinPalancas === 1 ? 'aviso' : 'avisos' }}.
            </p>
          </template>
          <VBtn
            :variant="state.forma === item.id ? 'flat' : 'outlined'"
            color="primary"
            size="small"
            :aria-pressed="state.forma === item.id"
            @click="elegirForma(item.id)"
          >
            {{ state.forma === item.id ? 'Mostrando sus avisos' : 'Ver sus avisos' }}
          </VBtn>
        </article>
      </div>
    </section>

    <VRow class="mb-10">
      <VCol cols="12" md="5">
        <section aria-labelledby="smn-cuenta" class="smn-panel">
          <h2 id="smn-cuenta" class="text-h5 mb-1">La cuenta del mes</h2>
          <p class="text-body-2 text-medium-emphasis mb-3">
            Cada decisión sube el techo de esta forma lo que dice al lado.
          </p>
          <div class="smn-palancas">
            <VSwitch
              v-for="id in palancasVisibles"
              :key="id"
              :model-value="state.palancas[id]"
              color="primary"
              density="compact"
              hide-details
              inset
              @update:model-value="value => setPalanca(id, value === true)"
            >
              <template #label>
                <span class="text-body-2">
                  {{ PALANCAS_INFO[id].titulo }}
                  <span class="text-medium-emphasis"> ({{ efectoTexto(id) }}) </span>
                </span>
              </template>
            </VSwitch>
          </div>
          <VSelect
            v-if="forma.id !== 'solo-montevideo'"
            :model-value="state.departamento || null"
            :items="departamentoItems"
            label="Departamento"
            density="comfortable"
            variant="outlined"
            clearable
            hide-details
            class="mt-4"
            @update:model-value="value => setDepartamento(value)"
          />
          <VCheckbox
            v-if="forma.personas === 1 && forma.tipos.includes('apartamento')"
            :model-value="state.joven"
            label="Tengo entre 18 y 29 años (para ver el FGA Jóvenes)"
            density="compact"
            hide-details
            class="mt-2"
            @update:model-value="value => setJoven(value === true)"
          />
        </section>
      </VCol>
      <VCol cols="12" md="7">
        <section aria-label="Detalle de la cuenta" class="smn-cuentas">
          <table v-for="plan in planes" :key="plan.region" class="smn-tabla">
            <caption class="text-subtitle-2 font-weight-bold">
              {{
                forma.titulo
              }}{{
                planes.length > 1 ? ` · ${REGION_LABEL[plan.region]}` : ''
              }}
            </caption>
            <tbody>
              <tr v-for="line in plan.ingresos" :key="line.id">
                <th scope="row">{{ line.label }}</th>
                <td>{{ pesos(line.monto) }}</td>
              </tr>
              <tr v-for="line in plan.gastos" :key="line.id" class="smn-tabla__gasto">
                <th scope="row">{{ line.label }}</th>
                <td>{{ line.monto ? `− ${pesos(line.monto)}` : pesos(0) }}</td>
              </tr>
              <template v-if="!esPieza">
                <tr v-for="line in plan.servicios" :key="line.id" class="smn-tabla__gasto">
                  <th scope="row">{{ line.label }}</th>
                  <td>− {{ pesos(line.monto) }}</td>
                </tr>
              </template>
              <tr class="smn-tabla__total">
                <th scope="row">
                  {{ esPieza ? 'Techo para la pieza' : 'Techo para alquiler y gastos comunes' }}
                </th>
                <td>{{ pesos(esPieza ? plan.techoPieza : plan.techoVivienda) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="text-caption text-medium-emphasis mb-0">
            {{ forma.personas === 2 ? 'Dos sueldos mínimos, dos personas. ' : '' }}Comida, ropa y
            varios en el perfil austero del
            <NuxtLink :to="localePath('/herramientas/costo-de-vida')">costo de vida</NuxtLink>
            del sitio; en el interior la comida sigue la relación entre las canastas del INE y el
            ómnibus se cuenta un 30 % más barato, como en ese modelo (distancias más cortas).
          </p>
        </section>
      </VCol>
    </VRow>

    <section id="avisos" class="mb-10 smn-avisos" aria-labelledby="smn-avisos-titulo">
      <h2 id="smn-avisos-titulo" class="text-h5 mb-1">Los avisos que entran: {{ forma.titulo }}</h2>
      <VAlert v-if="error" type="info" variant="outlined" class="my-4">
        Los avisos se están actualizando. Probá de nuevo en unos minutos, o buscá mientras tanto en
        el <NuxtLink :to="localePath('/alquileres-uruguay')">directorio de alquileres</NuxtLink>.
      </VAlert>
      <template v-else-if="data">
        <p class="text-body-1 mb-4" :class="{ 'smn-cargando': status === 'pending' }">
          <template v-if="data.total">
            <strong>{{ miles(data.avisos) }}</strong>
            {{ data.avisos === 1 ? 'aviso vigente entra' : 'avisos vigentes entran' }} en la
            cuenta{{ state.departamento ? ` en ${state.departamento}` : '' }}. Primero los que
            cierran con todo el dato a la vista, después los que cierran si se confirma lo que
            falta.
          </template>
          <template v-else>
            Hoy ningún aviso vigente entra en esta cuenta{{
              state.departamento ? ` en ${state.departamento}` : ''
            }}. Probá con otro departamento, con otra forma o activando más decisiones.
          </template>
        </p>
        <ul class="smn-lista" :class="{ 'smn-cargando': status === 'pending' }">
          <li v-for="item in data.items" :key="item.key" class="smn-aviso">
            <div class="smn-aviso__cabeza">
              <NuxtLink
                :to="localePath(`/alquileres/${item.key}`)"
                class="text-subtitle-1 font-weight-bold smn-aviso__titulo"
              >
                {{ item.title }}
              </NuxtLink>
              <span class="smn-aviso__precio">{{ pesos(item.alquiler) }}</span>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-2">
              {{ descripcion(item) }}
            </p>
            <p class="text-body-2 mb-2" :class="`smn-veredicto--${item.evaluacion.veredicto}`">
              {{ veredicto(item) }}
            </p>
            <div v-if="marcas(item).length" class="smn-marcas mb-2">
              <VChip v-for="marca in marcas(item)" :key="marca" size="small" variant="outlined">
                {{ marca }}
              </VChip>
            </div>
            <p class="text-body-2 mb-0">
              <span class="font-weight-medium">Cómo entrar:</span>
              {{ puertas(item.puertas) }}
            </p>
          </li>
        </ul>
        <VPagination
          v-if="data.pages > 1"
          :model-value="data.page"
          :length="data.pages"
          :total-visible="7"
          density="comfortable"
          class="mt-4"
          @update:model-value="setPage"
        />
        <div class="smn-acciones mt-4">
          <VBtn
            :to="localePath({ path: '/alquileres-uruguay', query: directorioQuery })"
            variant="outlined"
            size="small"
          >
            Buscar con más filtros en el directorio
          </VBtn>
        </div>
      </template>
    </section>

    <section class="mb-10 smn-prosa" aria-labelledby="smn-decisiones">
      <h2 id="smn-decisiones" class="text-h5 mb-3">Qué hace cada decisión</h2>
      <dl class="smn-definiciones">
        <template v-for="id in PALANCA_IDS" :key="id">
          <dt class="text-subtitle-1 font-weight-bold">{{ PALANCAS_INFO[id].titulo }}</dt>
          <dd class="text-body-1 mb-3">
            {{ PALANCAS_INFO[id].detalle }}
            <a :href="PALANCAS_INFO[id].fuente.url" target="_blank" rel="noopener">Fuente</a>.
          </dd>
        </template>
      </dl>
    </section>

    <section class="mb-10 smn-prosa" aria-labelledby="smn-entrar">
      <h2 id="smn-entrar" class="text-h5 mb-3">Cómo entrar: la garantía</h2>
      <p class="text-body-1 mb-3">
        Con un sueldo mínimo el problema no es sólo el mes: es que te acepten. Estas son las puertas
        que publican una regla, y la cuenta de cada aviso marca las que su alquiler cumple.
      </p>
      <dl class="smn-definiciones">
        <template v-for="(info, id) in PUERTAS_INFO" :key="id">
          <dt class="text-subtitle-1 font-weight-bold">{{ info.titulo }}</dt>
          <dd class="text-body-1 mb-3">
            {{ info.regla }}
            <NuxtLink v-if="info.url.startsWith('/')" :to="localePath(info.url)">Más</NuxtLink>
            <a v-else :href="info.url" target="_blank" rel="noopener">Fuente</a>.
          </dd>
        </template>
      </dl>
      <p class="text-body-2 text-medium-emphasis mb-0">
        Todas las opciones, con su costo mensual y su depósito, en la
        <NuxtLink :to="localePath('/garantia-de-alquiler-uruguay')">guía de garantías</NuxtLink>.
      </p>
    </section>

    <section class="mb-10 smn-prosa" aria-labelledby="smn-limites">
      <h2 id="smn-limites" class="text-h5 mb-3">Lo que esta cuenta no tiene</h2>
      <ul class="text-body-1 pl-5">
        <li class="mb-2">
          <strong>Ahorro.</strong> La cuenta no aparta nada para imprevistos: en una pieza o solo en
          el interior, un remedio o un celular roto rompen el mes. El primer colchón sale de
          apartar, no de lo que sobra.
        </li>
        <li class="mb-2">
          <strong>Comer afuera.</strong> La comida es la del perfil austero del sitio:
          {{ pesos(comidaMontevideo) }} por persona en Montevideo, {{ vecesCba }} veces la canasta
          básica alimentaria del INE. Alcanza cocinando en casa; para organizarlo está el
          <NuxtLink :to="localePath('/meal-prep-uruguay')">planificador de viandas</NuxtLink>.
        </li>
        <li class="mb-2">
          <strong>La mudanza.</strong> El mes adelantado, el depósito si lo piden y lo necesario
          para equipar la vivienda no están en la cuenta, que mide un mes corriente. Lo que sale
          equipar una casa vacía, nuevo y usado, está en
          <NuxtLink :to="localePath('/equipar-casa-uruguay')">equipar la casa</NuxtLink>.
        </li>
        <li class="mb-2">
          <strong>Hijos a cargo.</strong> La cuenta es para personas sin hijos. Con hijos cambian
          los gastos y lo que pone el Estado, y eso se calcula en
          <NuxtLink :to="localePath('/vivir-con-25000-pesos-uruguay')">vivir con 25.000</NuxtLink>.
        </li>
        <li class="mb-2">
          <strong>Precios cerrados.</strong> Son los precios que piden los avisos de los últimos
          diez días, no los que se firman. Un aviso puede estar alquilado y seguir publicado; los
          que dos o más personas reportaron como no disponibles no aparecen.
        </li>
        <li v-if="data?.excluidosPorPrecio">
          <strong>Precios que no pueden ser.</strong> Dejamos afuera
          {{ miles(data.excluidosPorPrecio) }} avisos del directorio cuyo precio es menos del 30 %
          de la mediana de viviendas parecidas (mismo tipo y dormitorios en su departamento, o en el
          país si allí hay pocas): casi siempre es un error de moneda o de período.
        </li>
      </ul>
    </section>

    <FaqSection :items="MINIMUM_WAGE_FAQ" heading="Preguntas frecuentes" :expanded="true" />

    <section class="mt-10 smn-prosa" aria-labelledby="smn-fuentes">
      <h2 id="smn-fuentes" class="text-h6 mb-2">Fuentes</h2>
      <ul class="text-body-2 pl-5">
        <li v-for="fuente in MINIMUM_WAGE_SOURCES" :key="fuente.url">
          <a :href="fuente.url" target="_blank" rel="noopener">{{ fuente.label }}</a>
        </li>
      </ul>
      <p v-if="data" class="text-caption text-medium-emphasis mb-0">
        Avisos del directorio de alquileres, actualizados el {{ fecha(data.generatedAt) }}.
      </p>
    </section>

    <AssistantCta topic="hogar" :filters="assistantFilters" class="mt-8" />
  </VContainer>
</template>

<script setup lang="ts">
import {
  FORMAS,
  LIQUIDO_SMN,
  MINIMUM_WAGE_PATH,
  PALANCA_IDS,
  efectoPalanca,
  formaPorId,
  minimumWageQueryToParams,
  normalizeMinimumWageQuery,
  planDelMes,
  type FormaId,
  type FormaResumen,
  type MinimumWageItem,
  type MinimumWageResponse,
  type Palancas,
  type PuertaId,
  type SmnRegion,
} from '~/utils/minimumWage'
import {
  MINIMUM_WAGE_FAQ,
  MINIMUM_WAGE_SOURCES,
  PALANCAS_INFO,
  PUERTAS_INFO,
  pesos,
} from '~/utils/minimumWageCopy'
import { SMN_VIGENTE, alquilerNuevoRegion } from '~/utils/lowWage'
import { COST_MODEL, INE_PER_CAPITA_LINES } from '~/utils/costOfLiving'
import { RENTAL_SOURCE_LABEL } from '~/utils/rentals'

const route = useRoute()
const localePath = useLocalePath()

// El estado vive en la URL para poder compartirlo, pero se escribe con history.replaceState: un
// router.replace haría saltar la página al tope en cada interruptor (ver usePreciosQuerySync).
const state = reactive(normalizeMinimumWageQuery(route.query as Record<string, unknown>))
const params = computed(() => minimumWageQueryToParams(state))
const paramsKey = computed(() => JSON.stringify(params.value))
usePreciosQuerySync(() => params.value, 0)

const { data, error, status } = await useAsyncData(
  'minimum-wage',
  () => $fetch<MinimumWageResponse>('/api/rentals/salario-minimo', { query: params.value }),
  { watch: [paramsKey] }
)

const REGION_LABEL: Record<SmnRegion, string> = { montevideo: 'Montevideo', interior: 'Interior' }
const REGION_EN: Record<SmnRegion, string> = {
  montevideo: 'en Montevideo',
  interior: 'en el interior',
}
const TIPO_LABEL = { habitacion: 'Habitación', casa: 'Casa', apartamento: 'Apartamento' } as const
const RESTRICCION_LABEL = {
  mujeres: 'Sólo mujeres',
  hombres: 'Sólo hombres',
  estudiantes: 'Se anuncia para estudiantes',
} as const

const alquilerMontevideo = alquilerNuevoRegion('montevideo')
const comidaMontevideo = Math.round(COST_MODEL.foodPerAdult * COST_MODEL.lifestyleFood.austero)
const vecesCba = (comidaMontevideo / INE_PER_CAPITA_LINES.montevideo.cba)
  .toFixed(1)
  .replace('.', ',')

const forma = computed(() => formaPorId(state.forma))
const esPieza = computed(() => forma.value.tipos.includes('habitacion'))
// La cuenta se hace acá también: es pura y así los números no esperan al servidor.
const planes = computed(() =>
  forma.value.regiones.map(region => planDelMes(forma.value.id, region, state.palancas))
)

// Lo que cada interruptor mueve el techo de la forma elegida, por región. Uno que no mueve nada en
// esta forma —internet en una pieza— no se muestra.
const efectos = (id: keyof Palancas): number[] =>
  forma.value.regiones.map(region => efectoPalanca(forma.value.id, region, state.palancas, id))
const palancasVisibles = computed(() => PALANCA_IDS.filter(id => efectos(id).some(v => v > 0)))
// Una cifra si vale lo mismo en las dos regiones; las dos si no (caminar: el boleto del interior).
function efectoTexto(id: keyof Palancas): string {
  const valores = efectos(id)
  return new Set(valores).size > 1
    ? forma.value.regiones
        .map((region, index) => `+${pesos(valores[index]!)} ${REGION_EN[region]}`)
        .join(', ')
    : `+${pesos(valores[0]!)}`
}

const sinNinguna = computed(() =>
  PALANCA_IDS.every(id => state.palancas[id])
    ? 'Hoy ningún aviso vigente entra en ninguna de las cuatro formas.'
    : 'Con las decisiones que marcaste, hoy ningún aviso vigente entra. Probá activar las que están apagadas en la cuenta del mes.'
)

// La mayoría de los avisos no publica sus gastos comunes ni dice si la pieza incluye los
// servicios: el titular lo dice en vez de llamar "cierra" a lo que es condicional.
const notaCondicionados = computed(() => {
  const resumenes = formasQueCierran.value.map(item => resumenDe(item.id)!)
  const condicionados = resumenes.reduce((total, row) => total + row.condicionados, 0)
  const cierran = resumenes.reduce((total, row) => total + row.cierran, 0)
  return condicionados > cierran
    ? 'La mayoría entra si se confirma un dato que el aviso no publica —los gastos comunes o si la pieza incluye luz y agua—: cada aviso dice cuál y hasta cuánto puede costar.'
    : 'Cada aviso dice cuánto sobra por mes.'
})

function techoDe(id: FormaId): string {
  const item = formaPorId(id)
  const pieza = item.tipos.includes('habitacion')
  const partes = item.regiones.map(region => {
    const plan = planDelMes(id, region, state.palancas)
    const techo = pieza ? plan.techoPieza : plan.techoVivienda
    return item.regiones.length > 1 ? `${pesos(techo)} ${REGION_EN[region]}` : pesos(techo)
  })
  return `${partes.join(' · ')} por mes, ${pieza ? 'para la pieza' : 'para alquiler y gastos comunes'}.`
}
const techoTexto = (id: FormaId) =>
  formaPorId(id).personas === 2 ? 'Techo entre los dos' : 'Techo'

const resumenDe = (id: FormaId): FormaResumen | undefined =>
  data.value?.formas.find(item => item.id === id)
const entran = (id: FormaId): number => {
  const resumen = resumenDe(id)
  return resumen ? resumen.cierran + resumen.condicionados : 0
}
const formasQueCierran = computed(() => FORMAS.filter(item => entran(item.id) > 0))

const miles = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')

/** Cómo se nombra lo que entra en cada forma, en singular y en plural. */
const FRASE: Record<FormaId, [string, string]> = {
  pieza: ['pieza', 'piezas'],
  'solo-interior': [
    'vivienda para una persona en el interior',
    'viviendas para una persona en el interior',
  ],
  'dos-sueldos': ['vivienda para dos sueldos mínimos', 'viviendas para dos sueldos mínimos'],
  'solo-montevideo': [
    'vivienda para una persona en Montevideo',
    'viviendas para una persona en Montevideo',
  ],
}

const resumenFormas = computed(() => {
  const partes = formasQueCierran.value.map(item => {
    const n = entran(item.id)
    return `${miles(n)} ${FRASE[item.id][n === 1 ? 0 : 1]}`
  })
  return partes.length > 1
    ? `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`
    : (partes[0] ?? '')
})

const departamentoItems = computed(() => data.value?.departamentos ?? [])

function elegirForma(id: FormaId) {
  if (state.forma === id) return
  const next = formaPorId(id)
  state.forma = id
  state.page = 1
  // Un departamento que no corresponde a la forma dejaría la lista vacía sin decir por qué.
  if (next.id === 'solo-montevideo') state.departamento = ''
  if (next.id === 'solo-interior' && state.departamento.toLowerCase() === 'montevideo')
    state.departamento = ''
  if (next.personas === 2) state.joven = false
}
function setPalanca(id: keyof Palancas, value: boolean) {
  if (state.palancas[id] === value) return
  state.palancas[id] = value
  state.page = 1
}
function setDepartamento(value: unknown) {
  const next = typeof value === 'string' ? value : ''
  if (state.departamento === next) return
  state.departamento = next
  state.page = 1
}
function setJoven(value: boolean) {
  if (state.joven !== value) state.joven = value
}
function setPage(page: number) {
  if (state.page === page) return
  state.page = page
  if (import.meta.client)
    document.getElementById('avisos')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function descripcion(item: MinimumWageItem): string {
  const tipo =
    item.tipo === 'habitacion'
      ? TIPO_LABEL.habitacion
      : item.bedrooms === 0
        ? `${TIPO_LABEL[item.tipo]} monoambiente`
        : item.bedrooms
          ? `${TIPO_LABEL[item.tipo]} de ${item.bedrooms} dormitorio${item.bedrooms === 1 ? '' : 's'}`
          : TIPO_LABEL[item.tipo]
  const lugar = [item.neighborhood, item.department].filter(Boolean).join(', ')
  const gastos =
    item.tipo === 'habitacion'
      ? ''
      : item.gastosComunes === null
        ? ' · gastos comunes sin publicar'
        : item.gastosComunes === 0
          ? ' · sin gastos comunes'
          : ` · gastos comunes ${pesos(item.gastosComunes)}`
  return `${tipo}${lugar ? ` · ${lugar}` : ''}${gastos} · ${RENTAL_SOURCE_LABEL[item.source] ?? item.source}`
}

function veredicto(item: MinimumWageItem): string {
  const { evaluacion } = item
  if (evaluacion.veredicto === 'cierra') {
    return evaluacion.sobra > 0
      ? `Cierra: te sobran ${pesos(evaluacion.sobra)} por mes.`
      : 'Cierra justo, sin un peso de margen.'
  }
  if (evaluacion.falta === 'servicios')
    return `Cierra si lo que te cobren aparte por luz, agua o wifi no pasa de ${pesos(evaluacion.sobra)}: el aviso no dice si van incluidos.`
  return item.tipo === 'casa'
    ? `Cierra si no tiene gastos comunes de más de ${pesos(evaluacion.sobra)}: el aviso no los publica.`
    : `Cierra si los gastos comunes no pasan de ${pesos(evaluacion.sobra)}: el aviso no los publica.`
}

function marcas(item: MinimumWageItem): string[] {
  const out: string[] = []
  if (item.serviciosIncluidos) out.push('Servicios incluidos, según el aviso')
  if (item.piezaCompartida) out.push('Hay piezas compartidas')
  if (item.pension) out.push('Pensión o residencia')
  if (item.restriccion) out.push(RESTRICCION_LABEL[item.restriccion])
  if (item.iguales > 1) out.push(`${item.iguales} avisos iguales`)
  return out
}

function puertas(ids: PuertaId[]): string {
  if (!ids.length) return 'el aviso no dice qué piden: preguntalo antes de ir.'
  return ids
    .map(id =>
      id === 'sin-garantia' ? 'sin garantía, si el dueño acepta' : PUERTAS_INFO[id].titulo
    )
    .join(' · ')
}

// El precio máximo del directorio: el techo más alto de la forma, para no esconder nada que entre.
const directorioQuery = computed(() => {
  const techo = Math.max(
    ...planes.value.map(plan => (esPieza.value ? plan.techoPieza : plan.techoVivienda))
  )
  return {
    types: forma.value.tipos.join(','),
    currency: 'UYU',
    priceMax: String(Math.max(0, techo)),
    sort: 'precio',
    ...(state.departamento
      ? { department: state.departamento }
      : forma.value.id === 'solo-montevideo'
        ? { department: 'Montevideo' }
        : {}),
  }
})

function fecha(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : 'último relevamiento'
}

// La pregunta al asistente lleva la forma y el departamento, nunca un monto.
const assistantFilters = computed(() =>
  [forma.value.titulo.toLowerCase(), state.departamento].filter(Boolean)
)

const canonical = `https://cambio-uruguay.com${MINIMUM_WAGE_PATH}`
const title = 'Cómo vivir con el salario mínimo en Uruguay'
const description = `Con el mínimo quedan ${pesos(LIQUIDO_SMN)} en la mano. Pieza, interior o entre dos sueldos: la cuenta que cierra y los alquileres de hoy que entran.`

defineOgImageComponent('Cambio', {
  title: 'Vivir con el salario mínimo',
  subtitle: 'Las formas que cierran, con los alquileres de hoy',
  tag: 'VIVIENDA',
})

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonical,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  robots: () => (Object.keys(route.query).length ? 'noindex, follow' : 'index, follow'),
})

useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebPage',
            name: title,
            description,
            url: canonical,
            inLanguage: 'es-UY',
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Alquileres',
                item: 'https://cambio-uruguay.com/alquileres-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Vivir con el salario mínimo',
                item: canonical,
              },
            ],
          },
        ],
      }),
    },
  ],
})
</script>

<style scoped>
.smn-header {
  max-width: 820px;
}
.smn-lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
}
.smn-formas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}
.smn-forma,
.smn-panel,
.smn-aviso {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
}
.smn-forma {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.smn-forma .v-btn {
  margin-top: auto;
}
.smn-forma--activa {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.04);
}
.smn-forma__techo {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.smn-palancas {
  display: grid;
  gap: 4px;
}
.smn-cuentas {
  display: grid;
  gap: 16px;
}
.smn-tabla {
  width: 100%;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}
.smn-tabla caption {
  text-align: left;
  padding-bottom: 8px;
}
.smn-tabla th,
.smn-tabla td {
  padding: 4px 0;
  font-size: 0.95rem;
  font-weight: 400;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.smn-tabla td {
  text-align: right;
  white-space: nowrap;
  padding-left: 16px;
}
.smn-tabla th {
  text-align: left;
}
.smn-tabla__gasto td {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}
.smn-tabla__total th,
.smn-tabla__total td {
  font-weight: 700;
  border-bottom: 0;
  padding-top: 8px;
}
.smn-lista {
  list-style: none;
  padding: 0;
  display: grid;
  gap: 16px;
}
.smn-aviso__cabeza {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 4px;
}
.smn-aviso__titulo {
  min-width: 0;
  overflow-wrap: anywhere;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}
.smn-aviso__titulo:hover,
.smn-aviso__titulo:focus-visible {
  text-decoration: underline;
}
.smn-aviso__precio {
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.smn-veredicto--cierra {
  color: rgb(var(--v-theme-success));
  font-weight: 700;
}
.smn-veredicto--cierra-si {
  font-weight: 700;
}
.smn-marcas {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.smn-acciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.smn-cargando {
  opacity: 0.6;
  transition: opacity 0.2s;
}
.smn-prosa {
  max-width: 820px;
}
.smn-avisos :deep(.v-pagination__list) {
  flex-wrap: wrap;
  justify-content: center;
}
@media (max-width: 599.98px) {
  .smn-aviso__cabeza {
    flex-direction: column;
    gap: 4px;
  }
}
.smn-definiciones dt {
  margin-top: 8px;
}
.smn-definiciones dd {
  margin-left: 0;
}
</style>
