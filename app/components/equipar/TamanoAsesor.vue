<!--
  "¿Qué tamaño necesitás?" — el asesor de /equipar-casa-uruguay/<categoria> para heladeras,
  lavarropas, televisores y aires. Corre en el navegador sobre el snapshot de currency-equipar-specs
  (sólo avisos con ficha del vendedor); el tamaño sale de una regla escrita en "Cómo lo calculamos" y
  las tres elecciones tienen nombre. Ver utils/equiparAsesor.ts. Los estilos son los del asesor de
  movilidad (../movilidad/asesor.css), para que los asesores del sitio se lean igual.
-->
<template>
  <div class="asesor">
    <div class="asesor__grid">
      <form class="asesor__controls" aria-label="Tu caso" @submit.prevent>
        <div v-if="categoria === 'heladera' || categoria === 'lavarropas'" class="asesor__field">
          <label :for="`${uid}-personas`" class="asesor__label">Personas en la casa</label>
          <VSlider
            :id="`${uid}-personas`"
            v-model="input.personas"
            name="Personas en la casa"
            :min="1"
            :max="8"
            :step="1"
            color="primary"
            hide-details
            thumb-label
          >
            <template #append>
              <output class="asesor__value">{{ input.personas }}</output>
            </template>
          </VSlider>
        </div>

        <VSelect
          v-if="categoria === 'heladera'"
          v-model="input.anchoMax"
          :items="ANCHOS"
          label="Ancho del hueco"
          density="comfortable"
          variant="outlined"
          hide-details
        />

        <VSelect
          v-if="categoria === 'lavarropas'"
          v-model="input.carga"
          :items="CARGAS"
          label="Tipo de carga"
          density="comfortable"
          variant="outlined"
          hide-details
        />

        <div v-if="categoria === 'tv'" class="asesor__field">
          <label :for="`${uid}-distancia`" class="asesor__label">
            Distancia del sillón a la tele
          </label>
          <VSlider
            :id="`${uid}-distancia`"
            v-model="input.distancia"
            name="Distancia del sillón a la tele"
            :min="1"
            :max="5"
            :step="0.25"
            color="primary"
            hide-details
            thumb-label
          >
            <template #append>
              <output class="asesor__value">{{ fmtDecimal(input.distancia) }} m</output>
            </template>
          </VSlider>
        </div>

        <div v-if="categoria === 'aire-acondicionado'" class="asesor__field">
          <label :for="`${uid}-m2`" class="asesor__label">Superficie del ambiente</label>
          <VSlider
            :id="`${uid}-m2`"
            v-model="input.m2"
            name="Superficie del ambiente"
            :min="8"
            :max="80"
            :step="1"
            color="primary"
            hide-details
            thumb-label
          >
            <template #append>
              <output class="asesor__value">{{ input.m2 }} m²</output>
            </template>
          </VSlider>
        </div>

        <VSelect
          v-model="input.presupuesto"
          :items="presupuestos"
          label="Presupuesto"
          density="comfortable"
          variant="outlined"
          hide-details
        />

        <div class="asesor__switches">
          <VSwitch
            v-if="categoria === 'heladera'"
            v-model="input.noFrost"
            label="No frost (sin escarcha)"
            color="primary"
            density="compact"
            hide-details
            inset
          />
          <VSwitch
            v-if="categoria === 'lavarropas'"
            v-model="input.lavaseca"
            label="Que también seque"
            color="primary"
            density="compact"
            hide-details
            inset
          />
          <template v-if="categoria === 'aire-acondicionado'">
            <VSwitch
              v-model="input.sol"
              label="Le da mucho el sol"
              color="primary"
              density="compact"
              hide-details
              inset
            />
            <VSwitch
              v-model="input.ultimoPiso"
              label="Último piso o techo de chapa"
              color="primary"
              density="compact"
              hide-details
              inset
            />
            <VSwitch
              v-model="input.frioCalor"
              label="Que también caliente"
              color="primary"
              density="compact"
              hide-details
              inset
            />
          </template>
          <VSwitch
            v-model="input.usados"
            label="También usados"
            color="primary"
            density="compact"
            hide-details
            inset
          />
        </div>
      </form>

      <div class="asesor__results">
        <p class="asesor__needs">
          Necesitás <strong>{{ resultado.requisito.label }}</strong
          ><template v-if="input.presupuesto">
            , por hasta <strong>{{ equiparMoneyNbsp(input.presupuesto) }}</strong></template
          >.
        </p>

        <p v-if="loading" class="asesor__state">Buscando entre los avisos con ficha…</p>
        <p v-else-if="error || !candidatos.length" class="asesor__state">
          El asesor se está actualizando: todavía no tenemos fichas técnicas leídas de esta
          categoría. Mientras tanto, el directorio filtra por precio y marca.
        </p>

        <template v-else>
          <ol v-if="resultado.picks.length" class="asesor__picks">
            <li v-for="pick in resultado.picks" :key="pick.kind" class="asesor__pick">
              <span class="eq-asesor__thumb">
                <img
                  v-if="pick.candidato.image"
                  :src="pick.candidato.image"
                  :alt="pick.candidato.title"
                  loading="lazy"
                  width="56"
                  height="56"
                  referrerpolicy="no-referrer"
                />
                <VIcon v-else :icon="icon" size="26" aria-hidden="true" />
              </span>
              <div class="asesor__pick-body">
                <p class="asesor__kind">{{ pick.titulo }}</p>
                <h3 class="asesor__name">
                  <a :href="pick.candidato.url" target="_blank" rel="nofollow noopener">{{
                    pick.candidato.title
                  }}</a>
                </h3>
                <p class="asesor__price">
                  {{ equiparProductoPrecio(pick.candidato) }}
                  <span v-if="pick.candidato.currency === 'USD'" class="asesor__approx">
                    (≈ {{ equiparMoneyNbsp(pick.candidato.priceUyu) }})</span
                  >
                  <span class="asesor__seller">
                    · {{ pick.candidato.condition === 'used' ? 'usado · ' : ''
                    }}{{ pick.candidato.sellerName }}</span
                  >
                </p>
                <ul class="asesor__why">
                  <li
                    v-for="line in equiparAsesorPorque(
                      categoria,
                      pick.candidato,
                      resultado.requisito
                    )"
                    :key="line"
                  >
                    {{ line }}
                  </li>
                </ul>
              </div>
            </li>
          </ol>

          <div v-else class="asesor__none">
            <p>
              Ninguno de los {{ resultado.universo.toLocaleString('es-UY') }} avisos con ficha
              cumple todo a la vez. Probá sacando un requisito
              <template v-if="input.presupuesto">o subiendo el presupuesto</template>.
            </p>
          </div>

          <p class="asesor__count" aria-live="polite">
            <template v-if="resultado.cumplen.length">
              {{ resultado.cumplen.length.toLocaleString('es-UY') }} de
              {{ resultado.universo.toLocaleString('es-UY') }} avisos con ficha cumplen.
            </template>
            <template v-if="resultado.sinDato">
              {{ resultado.sinDato.toLocaleString('es-UY') }} no declaran el tamaño y quedan afuera.
            </template>
          </p>
          <VBtn
            v-if="resultado.cumplen.length"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-filter-variant"
            :to="{ path: equiparProductoPath(categoria), query: directorioQuery }"
          >
            Ver los que cumplen en el directorio
          </VBtn>
        </template>
      </div>
    </div>

    <details class="asesor__rules">
      <summary>Cómo lo calculamos</summary>
      <ul>
        <li v-if="categoria === 'heladera'">
          <strong>Litros:</strong> {{ EQUIPAR_ASESOR_LITROS_BASE }} L más
          {{ EQUIPAR_ASESOR_LITROS_PERSONA }} L por persona. Una pareja anda bien con 260 L; una
          familia de cuatro, con 390 L. Si el hueco es angosto, medilo: muchas heladeras de 300 L o
          más pasan los 60 cm de ancho.
        </li>
        <li v-if="categoria === 'lavarropas'">
          <strong>Kilos:</strong> {{ EQUIPAR_ASESOR_KILOS_BASE }} kg más 1 kg por persona, hasta
          {{ EQUIPAR_ASESOR_KILOS_TOPE }} kg. Es la carga de ropa seca: un acolchado de dos plazas
          pide 8 kg o más.
        </li>
        <li v-if="categoria === 'tv'">
          <strong>Pulgadas:</strong> entre la distancia en centímetros dividida
          {{ fmtDecimal(EQUIPAR_ASESOR_TV_MIN) }} y dividida {{ EQUIPAR_ASESOR_TV_MAX }}. Es la
          franja en que la pantalla ocupa unos 30° de la vista, la que recomienda SMPTE para una
          imagen 4K o Full HD: más chica se pierde detalle, más grande hay que mover la cabeza.
        </li>
        <li v-if="categoria === 'aire-acondicionado'">
          <strong>Frigorías:</strong> {{ EQUIPAR_ASESOR_FG_M2 }} por metro cuadrado, un
          {{ Math.round((EQUIPAR_ASESOR_SOL - 1) * 100) }} % más si le da mucho el sol y un
          {{ Math.round((EQUIPAR_ASESOR_ULTIMO_PISO - 1) * 100) }} % más en un último piso. Una
          frigoría son {{ fmtDecimal(EQUIPAR_ASESOR_BTU_FG) }} BTU, y sugerimos el tamaño comercial
          siguiente (9.000, 12.000, 18.000 o 24.000 BTU). Un portátil declara menos que un split del
          mismo nombre: mirá los BTU de la ficha, no el título.
        </li>
        <li>
          <strong>Las tres elecciones:</strong> la más barata que cumple; la inverter más barata
          (gasta menos luz) o, en televisores, la pantalla más grande que se aprovecha y la 4K más
          barata; y la que da más capacidad por tu plata o la de mejor eficiencia.
        </li>
        <li>
          Sólo entran avisos de Mercado Libre con ficha técnica leída, y nunca uno con precio
          dudoso. La ficha es lo que declara el vendedor: confirmalo en el aviso antes de comprar.
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import {
  EQUIPAR_ASESOR_BTU_FG,
  EQUIPAR_ASESOR_DEFAULT,
  EQUIPAR_ASESOR_FG_M2,
  EQUIPAR_ASESOR_KILOS_BASE,
  EQUIPAR_ASESOR_KILOS_TOPE,
  EQUIPAR_ASESOR_LITROS_BASE,
  EQUIPAR_ASESOR_LITROS_PERSONA,
  EQUIPAR_ASESOR_SOL,
  EQUIPAR_ASESOR_TV_MAX,
  EQUIPAR_ASESOR_TV_MIN,
  EQUIPAR_ASESOR_ULTIMO_PISO,
  equiparAsesorPorque,
  equiparAsesorQuery,
  recomendarEquipar,
  type EquiparAsesorCandidato,
  type EquiparAsesorInput,
} from '~/utils/equiparAsesor'
import type { EquiparFichaCategoria } from '~/utils/equiparFicha'
import {
  equiparMoneyNbsp,
  equiparProductoPath,
  equiparProductoPrecio,
} from '~/utils/equiparProductos'

const props = defineProps<{ categoria: EquiparFichaCategoria; icon: string }>()

const uid = useId()

const PRESUPUESTOS: Readonly<Record<EquiparFichaCategoria, readonly number[]>> = {
  heladera: [20_000, 30_000, 45_000, 60_000, 90_000],
  lavarropas: [15_000, 25_000, 35_000, 50_000, 80_000],
  tv: [10_000, 15_000, 25_000, 40_000, 70_000],
  'aire-acondicionado': [15_000, 25_000, 35_000, 50_000, 80_000],
}
const presupuestos = computed(() => [
  { title: 'Sin tope', value: null },
  ...PRESUPUESTOS[props.categoria].map(value => ({
    title: `Hasta ${equiparMoneyNbsp(value)}`,
    value,
  })),
])
const ANCHOS = [
  { title: 'Sin límite', value: null },
  ...[55, 60, 70, 80, 90].map(value => ({ title: `Hasta ${value} cm`, value })),
]
const CARGAS = [
  { title: 'Indistinta', value: '' },
  { title: 'Frontal', value: 'frontal' },
  { title: 'Superior', value: 'superior' },
]

const input = reactive<EquiparAsesorInput>({ ...EQUIPAR_ASESOR_DEFAULT })

// Sólo en el navegador: la lista no hace falta en el HTML (no es contenido para el buscador).
const { data, status, error } = useFetch<{ candidates: EquiparAsesorCandidato[] }>(
  () => `/api/equipar/asesor/${props.categoria}`,
  { key: `equipar-asesor-${props.categoria}`, server: false, lazy: true }
)
// En Nuxt 4 `pending` es falso mientras el pedido todavía no arrancó (`idle`).
const loading = computed(() => status.value === 'idle' || status.value === 'pending')
const candidatos = computed(() => data.value?.candidates ?? [])
const resultado = computed(() => recomendarEquipar(props.categoria, candidatos.value, input))
const directorioQuery = computed(() =>
  equiparAsesorQuery(props.categoria, input, resultado.value.requisito)
)

const fmtDecimal = (value: number) => value.toLocaleString('es-UY', { maximumFractionDigits: 3 })
</script>

<style scoped src="../movilidad/asesor.css"></style>
<style scoped>
.eq-asesor__thumb {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.06);
}
.eq-asesor__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.eq-asesor__thumb :deep(.v-icon) {
  opacity: 0.5;
}
</style>
