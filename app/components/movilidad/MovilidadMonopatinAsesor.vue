<!--
  "¿Cuál te conviene?" — el asesor de /monopatines-electricos-uruguay.

  Corre en el navegador sobre el snapshot de currency-movilidad-specs (sólo avisos con ficha propia
  leída): los controles cambian la respuesta en el acto. No hay puntaje oculto: los requisitos se
  escriben arriba de la respuesta y las reglas, completas, en "Cómo elegimos". Ver
  utils/monopatinAsesor.ts.
-->
<template>
  <div class="asesor">
    <div class="asesor__grid">
      <form class="asesor__controls" aria-label="Cómo lo vas a usar" @submit.prevent>
        <div class="asesor__field">
          <label :for="`${uid}-km`" class="asesor__label">
            Kilómetros por día <span class="asesor__hint">ida y vuelta</span>
          </label>
          <VSlider
            :id="`${uid}-km`"
            v-model="input.kmDia"
            name="Kilómetros por día"
            :min="2"
            :max="40"
            :step="1"
            color="primary"
            hide-details
            thumb-label
          >
            <template #append>
              <output class="asesor__value">{{ input.kmDia }} km</output>
            </template>
          </VSlider>
        </div>
        <div class="asesor__field">
          <label :for="`${uid}-peso`" class="asesor__label">Tu peso</label>
          <VSlider
            :id="`${uid}-peso`"
            v-model="input.pesoKg"
            name="Tu peso"
            :min="40"
            :max="140"
            :step="5"
            color="primary"
            hide-details
            thumb-label
          >
            <template #append>
              <output class="asesor__value">{{ input.pesoKg }} kg</output>
            </template>
          </VSlider>
        </div>
        <div class="asesor__field">
          <span :id="`${uid}-terreno`" class="asesor__label">Subidas en el trayecto</span>
          <VBtnToggle
            v-model="input.terreno"
            mandatory
            density="comfortable"
            variant="outlined"
            divided
            class="asesor__toggle"
            :aria-labelledby="`${uid}-terreno`"
          >
            <VBtn value="llano">Ninguna</VBtn>
            <VBtn value="algunas">Algunas</VBtn>
            <VBtn value="muchas">Muchas</VBtn>
          </VBtnToggle>
        </div>
        <VSelect
          v-model="input.presupuesto"
          :items="PRESUPUESTOS"
          label="Presupuesto"
          density="comfortable"
          variant="outlined"
          hide-details
        />
        <div class="asesor__switches">
          <VSwitch
            v-model="input.loCarga"
            label="Lo voy a cargar (escaleras, ómnibus)"
            color="primary"
            density="compact"
            hide-details
            inset
          />
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
          Buscamos al menos <strong>{{ requisitos.autonomiaDeclaradaMin }} km</strong> de autonomía
          declarada (≈ {{ input.kmDia }} km reales), que soporte
          <strong>{{ requisitos.cargaMin }} kg</strong>
          <template v-if="requisitos.potenciaMin">
            y con <strong>{{ requisitos.potenciaMin }} W</strong> o más</template
          ><template v-if="input.presupuesto">
            , por hasta <strong>{{ equiparMoneyNbsp(input.presupuesto) }}</strong></template
          >.
        </p>

        <p v-if="loading" class="asesor__state">Buscando entre los monopatines con ficha…</p>
        <p v-else-if="error || !candidatos.length" class="asesor__state">
          El asesor se está actualizando: todavía no tenemos fichas técnicas leídas. Mientras tanto,
          el directorio de abajo filtra por precio, tipo y marca.
        </p>

        <template v-else>
          <ol v-if="resultado.picks.length" class="asesor__picks">
            <li v-for="pick in resultado.picks" :key="pick.kind" class="asesor__pick">
              <MovilidadVariantThumb
                :src="pick.candidato.image"
                :alt="pick.candidato.title"
                icon="mdi-scooter-electric"
              />
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
                    }}{{ sellerOf(pick.candidato) }}</span
                  >
                </p>
                <ul class="asesor__why">
                  <li v-for="line in pick.porque" :key="line">{{ line }}</li>
                </ul>
                <NuxtLink
                  v-if="pick.candidato.modelSlug"
                  :to="`/monopatines-electricos-uruguay/${pick.candidato.modelSlug}`"
                  class="asesor__model"
                >
                  Ver el modelo en todos los vendedores
                </NuxtLink>
              </div>
            </li>
          </ol>

          <div v-else class="asesor__none">
            <p>
              Ninguno de los {{ resultado.universo.toLocaleString('es-UY') }} monopatines con ficha
              cumple todo a la vez.
              <template v-if="resultado.aflojar">{{
                asesorConsejo(resultado.aflojar, input)
              }}</template>
            </p>
            <ul class="asesor__reqs" aria-label="Cuántos cumplen cada requisito">
              <li v-for="req in requisitoLineas" :key="req.key">
                {{ req.label }}: <strong>{{ req.count.toLocaleString('es-UY') }}</strong>
              </li>
            </ul>
          </div>

          <!-- Sólo el resumen se anuncia: si la zona viva fuera el bloque entero, el lector de
               pantalla releería las tres elecciones a cada paso del slider. -->
          <p class="asesor__count" aria-live="polite">
            {{ cumplenTexto }}
            <template v-if="resultado.descartes.sinDato">
              {{ resultado.descartes.sinDato.toLocaleString('es-UY') }} no declaran alguno de los
              datos y quedan afuera.
            </template>
          </p>
          <VBtn
            v-if="resultado.cumplen.length"
            color="primary"
            variant="tonal"
            prepend-icon="mdi-filter-variant"
            data-testid="monopatin-asesor-ver"
            @click="verEnDirectorio"
          >
            Ver {{ resultado.cumplen.length === 1 ? 'el que cumple' : 'los que cumplen' }} en el
            directorio
          </VBtn>
        </template>
      </div>
    </div>

    <details class="asesor__rules">
      <summary>Cómo elegimos</summary>
      <ul>
        <li>
          <strong>Autonomía real:</strong> contamos el
          {{ Math.round(MONOPATIN_AUTONOMIA_REAL * 100) }} % de la que declara el vendedor ({{
            Math.round(MONOPATIN_AUTONOMIA_REAL_PESADO * 100)
          }}
          % si pesás más de {{ MONOPATIN_PESADO_KG }} kg). Los fabricantes la miden en llano, con
          alrededor de 75 kg y a velocidad baja; el frío, el viento y las subidas la bajan.
        </li>
        <li>
          <strong>Peso:</strong> el monopatín tiene que declarar que soporta tu peso más
          {{ MONOPATIN_MARGEN_CARGA_KG }} kg de mochila.
        </li>
        <li>
          <strong>Subidas:</strong> pedimos {{ MONOPATIN_POTENCIA_SUBIDAS.algunas }} W o más con
          algunas subidas y {{ MONOPATIN_POTENCIA_SUBIDAS.muchas }} W o más con muchas. Es la
          potencia que declara el vendedor, una referencia y no una garantía.
        </li>
        <li>
          <strong>Las tres elecciones:</strong> la más barata que cumple todo; la que da más
          kilómetros de autonomía por tu plata; y la más liviana (si lo vas a cargar o no hay
          subidas) o la más potente (si hay subidas).
        </li>
        <li>
          Sólo entran avisos de tiendas y de Mercado Libre con ficha técnica leída, nunca de
          Facebook, y nunca uno con precio dudoso. Confirmá los datos en el aviso antes de comprar.
        </li>
      </ul>
    </details>
  </div>
</template>

<script setup lang="ts">
import {
  MONOPATIN_ASESOR_DEFAULT,
  MONOPATIN_AUTONOMIA_REAL,
  MONOPATIN_AUTONOMIA_REAL_PESADO,
  MONOPATIN_MARGEN_CARGA_KG,
  MONOPATIN_PESADO_KG,
  MONOPATIN_POTENCIA_SUBIDAS,
  asesorConsejo,
  asesorQueryFicha,
  asesorRequisitos,
  recomendarMonopatines,
  type AsesorInput,
  type AsesorRequisito,
  type MonopatinCandidato,
} from '~/utils/monopatinAsesor'
import { equiparMoneyNbsp, equiparProductoPrecio } from '~/utils/equiparProductos'
import { movilidadSellerLabel } from '~/utils/movilidad'
import type { MovilidadFichaQuery } from '~/utils/monopatinFicha'

const emit = defineEmits<{
  ver: [patch: { ficha: MovilidadFichaQuery; precioMax: number | null; condicion: '' | 'nuevo' }]
}>()

const uid = useId()

const PRESUPUESTOS = [
  { title: 'Sin tope', value: null },
  ...[15_000, 25_000, 40_000, 60_000, 90_000].map(value => ({
    title: `Hasta ${equiparMoneyNbsp(value)}`,
    value,
  })),
]

const input = reactive<AsesorInput>({ ...MONOPATIN_ASESOR_DEFAULT })

// Sólo en el navegador: la lista no hace falta en el HTML (no es contenido para el buscador) y
// pesa más que el resto de la página junta.
const { data, status, error } = useFetch<{ candidates: MonopatinCandidato[] }>(
  '/api/movilidad/monopatin-asesor',
  { key: 'monopatin-asesor', server: false, lazy: true }
)

// En Nuxt 4 `pending` es falso mientras el pedido todavía no arrancó (`idle`): el HTML del servidor
// y el primer cuadro del navegador dirían "se está actualizando" antes de preguntar nada.
const loading = computed(() => status.value === 'idle' || status.value === 'pending')
const candidatos = computed(() => data.value?.candidates ?? [])
const requisitos = computed(() => asesorRequisitos(input))
const resultado = computed(() => recomendarMonopatines(candidatos.value, input))

/** Cuántos cumplen cada requisito por separado, cuando ninguno cumple todos. */
const requisitoLineas = computed(() => {
  const r = resultado.value
  const lines: Array<{ key: AsesorRequisito; label: string; count: number }> = [
    {
      key: 'autonomia',
      label: `Llegan a ${r.requisitos.autonomiaDeclaradaMin} km de autonomía`,
      count: r.porRequisito.autonomia,
    },
    { key: 'carga', label: `Soportan ${r.requisitos.cargaMin} kg`, count: r.porRequisito.carga },
  ]
  if (r.requisitos.potenciaMin)
    lines.push({
      key: 'potencia',
      label: `Tienen ${r.requisitos.potenciaMin} W o más`,
      count: r.porRequisito.potencia,
    })
  if (input.presupuesto)
    lines.push({
      key: 'presupuesto',
      label: 'Entran en el presupuesto',
      count: r.porRequisito.presupuesto,
    })
  return lines
})

const cumplenTexto = computed(() => {
  const count = resultado.value.cumplen.length
  const total = resultado.value.universo
  if (!count) return ''
  return `${count.toLocaleString('es-UY')} de ${total.toLocaleString('es-UY')} monopatines con ficha cumplen todo.`
})

const sellerOf = (candidato: MonopatinCandidato) =>
  movilidadSellerLabel(candidato.sellerName, candidato.source)

function verEnDirectorio() {
  emit('ver', asesorQueryFicha(requisitos.value, input))
}
</script>

<style scoped>
.asesor {
  margin-top: 18px;
}
.asesor__grid {
  display: grid;
  gap: 24px;
}
@media (min-width: 960px) {
  .asesor__grid {
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    gap: 32px;
    align-items: start;
  }
  /* Los controles acompañan a la lista de elecciones mientras se lee: se mueve uno y se ve el cambio. */
  .asesor__controls {
    position: sticky;
    top: 80px;
  }
}
.asesor__controls {
  display: grid;
  gap: 20px;
  padding: 20px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.asesor__field {
  display: grid;
  gap: 4px;
}
.asesor__label {
  font-size: 0.875rem;
  font-weight: 700;
}
.asesor__hint {
  font-weight: 400;
  opacity: 0.75;
}
.asesor__value {
  min-width: 4.5ch;
  font-size: 0.875rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}
.asesor__toggle {
  width: 100%;
}
.asesor__toggle :deep(.v-btn) {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 8px;
  font-size: 0.75rem;
  text-transform: none;
  letter-spacing: 0;
}
.asesor__switches {
  display: grid;
  gap: 0;
}
.asesor__results {
  min-width: 0;
}
.asesor__needs {
  margin: 0;
  max-width: 62ch;
  font-size: 1rem;
  line-height: 1.6;
}
.asesor__state {
  margin: 16px 0 0;
  padding: 16px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  font-size: 0.95rem;
}
.asesor__picks {
  display: grid;
  gap: 0;
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
}
.asesor__pick {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 16px;
  padding: 16px 0;
  border-top: 1px solid rgba(var(--v-border-color), 0.2);
}
.asesor__pick:first-child {
  border-top: 0;
  padding-top: 8px;
}
.asesor__pick-body {
  min-width: 0;
}
.asesor__kind {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-link));
}
.asesor__name {
  margin: 2px 0 0;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
}
.asesor__name a {
  color: inherit;
  text-decoration: none;
}
.asesor__name a:hover,
.asesor__name a:focus-visible {
  text-decoration: underline;
}
.asesor__price {
  margin: 4px 0 0;
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.asesor__approx {
  font-size: 0.875rem;
  font-weight: 400;
}
.asesor__seller {
  font-size: 0.8rem;
  font-weight: 400;
  opacity: 0.8;
}
.asesor__why {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 0.875rem;
  line-height: 1.5;
}
.asesor__model {
  display: inline-block;
  margin-top: 8px;
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  font-size: 0.875rem;
}
.asesor__why li + li {
  margin-top: 2px;
}
.asesor__reqs {
  margin: 8px 0 0;
  padding-left: 18px;
  font-size: 0.875rem;
  line-height: 1.5;
}
.asesor__none p {
  margin: 16px 0 0;
  max-width: 62ch;
}
.asesor__count {
  margin: 12px 0;
  font-size: 0.875rem;
  opacity: 0.85;
}
.asesor__rules {
  margin-top: 20px;
  max-width: 75ch;
  font-size: 0.875rem;
}
.asesor__rules summary {
  cursor: pointer;
  font-weight: 700;
  color: rgb(var(--v-theme-link));
}
.asesor__rules ul {
  margin: 8px 0 0;
  padding-left: 20px;
}
.asesor__rules li + li {
  margin-top: 6px;
}
</style>
