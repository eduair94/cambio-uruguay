<template>
  <ToolShell
    slug="calculadora-iva"
    :faq="faq"
    :sources="sources"
    :seo-title="snippet.title"
    :seo-description="snippet.description"
    content-layout="below"
    hide-disclaimer
  >
    <VCard class="pa-4 pa-sm-6">
      <div class="text-overline text-grey mb-2">Operación</div>
      <VBtnToggle
        v-model="mode"
        color="primary"
        mandatory
        divided
        variant="outlined"
        class="seg-toggle mb-6"
      >
        <VBtn value="add" class="seg-btn">
          <VIcon start>mdi-plus</VIcon>
          Agregar IVA
        </VBtn>
        <VBtn value="remove" class="seg-btn">
          <VIcon start>mdi-minus</VIcon>
          Quitar IVA
        </VBtn>
      </VBtnToggle>

      <VRow class="g-input" align="center">
        <VCol cols="12" sm="7">
          <VTextField
            v-model.number="amount"
            type="number"
            min="0"
            :label="mode === 'add' ? 'Importe sin IVA' : 'Importe con IVA'"
            prefix="$"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="5">
          <VSelect
            v-model.number="rate"
            :items="rateItems"
            label="Tasa de IVA"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Importe sin IVA</div>
          <div class="text-h5 font-weight-bold">{{ formatUYU(r.net) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">IVA ({{ rate }}%)</div>
          <div class="text-h5 font-weight-bold text-primary">{{ formatUYU(r.iva) }}</div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Total con IVA</div>
          <div class="text-h5 font-weight-bold text-success">{{ formatUYU(r.gross) }}</div>
        </div>
      </div>
    </VCard>

    <template #content>
      <h2 class="mt-0">Cuánto es el IVA en Uruguay</h2>
      <p>
        El IVA tiene dos tasas, fijadas en el artículo 34 del Título 10 del Texto Ordenado 2023: la
        <strong>básica, de {{ IVA_TASA_BASICA }} %</strong>, que es la de casi todo, y la
        <strong>mínima, de {{ IVA_TASA_MINIMA }} %</strong>.
      </p>
      <p>
        La mínima es una lista cerrada (artículo 36): pan blanco común, carne y pescado frescos,
        congelados o enfriados, arroz, fideos, aceite, azúcar, yerba, café y té, medicamentos, el
        hospedaje en hoteles y los servicios de salud que se prestan fuera de relación de
        dependencia, entre otros. Como lo resume la DGI, en principio todo paga el
        {{ IVA_TASA_BASICA }} %, salvo que esté exonerado (artículo 38) o en la lista de la mínima.
        Tasas del texto vigente en IMPO, consultado el {{ verifiedLabel }}.
      </p>
      <p>
        Pagar con tarjeta baja la tasa en algunos casos: con débito o dinero electrónico, la básica
        pasa de {{ IVA_TASA_BASICA }} % a {{ IVA_TASA_BASICA - debitPoints }} %; en gastronomía y
        turismo, también con crédito, a {{ IVA_TASA_BASICA - gastroPoints }} % hasta el
        {{ gastroLastDay }}. Lo explicamos en
        <NuxtLink :to="localePath('/descuento-de-iva-con-tarjeta-uruguay')"
          >descuento de IVA con tarjeta</NuxtLink
        >.
      </p>

      <h2 id="tabla-mas-iva">Cuánto es cada monto más IVA</h2>
      <p>
        Si el importe todavía no tiene IVA, buscalo en la primera columna: al lado está el IVA al
        {{ IVA_TASA_BASICA }} % y el total a cada tasa. Para otro monto, usá la calculadora de
        arriba.
      </p>
      <div
        class="table-scroll table-scroll--tall mb-6"
        tabindex="0"
        role="region"
        aria-label="Tabla de montos más IVA"
      >
        <VTable density="compact" class="iva-table iva-table--sticky" data-testid="iva-tabla-sumar">
          <thead>
            <tr>
              <th scope="col" class="text-right">Importe sin IVA</th>
              <th scope="col" class="text-right">IVA {{ IVA_TASA_BASICA }} %</th>
              <th scope="col" class="text-right">Total con IVA {{ IVA_TASA_BASICA }} %</th>
              <th scope="col" class="text-right">Total con IVA {{ IVA_TASA_MINIMA }} %</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in addRows" :key="row.net">
              <td class="text-right">{{ ivaMoney(row.net) }}</td>
              <td class="text-right">{{ ivaMoney(row.ivaBasica) }}</td>
              <td class="text-right font-weight-bold">{{ ivaMoney(row.grossBasica) }}</td>
              <td class="text-right">{{ ivaMoney(row.grossMinima) }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <h2 id="tabla-sin-iva">Cuánto es un precio sin IVA</h2>
      <p>
        Del precio final, el IVA es el {{ shareBasica }} % a tasa básica y el {{ shareMinima }} % a
        la mínima. Si el precio ya incluye el impuesto, esto es lo que queda sin él.
      </p>
      <div
        class="table-scroll mb-6"
        tabindex="0"
        role="region"
        aria-label="Tabla de precios sin IVA"
      >
        <VTable density="compact" class="iva-table" data-testid="iva-tabla-quitar">
          <thead>
            <tr>
              <th scope="col" class="text-right">Precio con IVA</th>
              <th scope="col" class="text-right">Sin IVA ({{ IVA_TASA_BASICA }} %)</th>
              <th scope="col" class="text-right">IVA incluido ({{ IVA_TASA_BASICA }} %)</th>
              <th scope="col" class="text-right">Sin IVA ({{ IVA_TASA_MINIMA }} %)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in removeRows" :key="row.gross">
              <td class="text-right">{{ ivaMoney(row.gross) }}</td>
              <td class="text-right font-weight-bold">{{ ivaMoney(row.netBasica) }}</td>
              <td class="text-right">{{ ivaMoney(row.ivaBasica) }}</td>
              <td class="text-right">{{ ivaMoney(row.netMinima) }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>

      <div class="tool-article-grid iva-article-grid">
        <section>
          <h2>Cómo sumarle el IVA a un precio</h2>
          <p>
            Multiplicá el importe por {{ factorBasica }} (tasa básica) o por {{ factorMinima }}
            (mínima).
            {{ ivaMoney(exAdd.net) }} + IVA son <strong>{{ ivaMoney(exAdd.grossBasica) }}</strong
            >: {{ ivaMoney(exAdd.ivaBasica) }} de impuesto. A la tasa mínima, el mismo importe queda
            en {{ ivaMoney(exAdd.grossMinima) }}.
          </p>
        </section>
        <section>
          <h2>Cómo sacarle el IVA a un precio</h2>
          <p>
            Dividí el precio final entre {{ factorBasica }} (o entre {{ factorMinima }} a la tasa
            mínima). De {{ ivaMoney(exRemove.gross) }} con IVA,
            <strong>{{ ivaMoney(exRemove.netBasica) }}</strong> son el precio y
            {{ ivaMoney(exRemove.ivaBasica) }} el impuesto; a la mínima, el precio sin IVA es
            {{ ivaMoney(exRemove.netMinima) }}.
          </p>
          <p>
            Restarle el {{ IVA_TASA_BASICA }} % da mal: {{ ivaMoney(exWrong.gross) }} menos
            {{ IVA_TASA_BASICA }} % son {{ ivaMoney(exWrong.wrong) }}, y el precio sin IVA es
            {{ ivaMoney(exWrong.right) }}. El impuesto se calcula sobre el precio sin IVA, así que
            del precio final es el {{ shareBasica }} %.
          </p>
        </section>
        <section>
          <h2>Qué paga el {{ IVA_TASA_MINIMA }} %</h2>
          <p>La tasa mínima es una lista cerrada (artículo 36 del Título 10):</p>
          <ul>
            <li v-for="item in IVA_MINIMA_ITEMS" :key="item.ref">
              <strong>{{ ivaLegalRef(item.ref) }}.</strong> {{ item.text }}
            </li>
          </ul>
        </section>
        <section>
          <h2>Qué no paga IVA</h2>
          <p>Están exonerados, entre otros (artículo 38 del Título 10):</p>
          <ul>
            <li v-for="item in IVA_EXONERADOS" :key="item.ref">
              <strong>{{ ivaLegalRef(item.ref) }}.</strong> {{ item.text }}
            </li>
          </ul>
          <p>{{ IVA_INTEREST_NOTE }}</p>
        </section>
        <section>
          <h2>Cuando un presupuesto dice «más IVA»</h2>
          <p>
            Quiere decir que el impuesto todavía no está sumado: «{{ ivaMoney(exBudget.net) }} +
            IVA» son <strong>{{ ivaMoney(exBudget.grossBasica) }}</strong> a la tasa básica. Al
            consumidor, en cambio, el comercio le tiene que informar el precio con los impuestos
            incluidos (Ley 17.250, artículo 15, literal A).
          </p>
          <p>
            Si querés repasar cómo funciona el impuesto, mirá
            <NuxtLink :to="localePath('/glosario/iva')">qué es el IVA</NuxtLink>.
          </p>
        </section>
      </div>
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { addIva, removeIva } from '~/utils/calculators'
import { formatUYU } from '~/utils/format'
import {
  IVA_EXAMPLE_ADD,
  IVA_EXAMPLE_BUDGET,
  IVA_EXAMPLE_FAQ,
  IVA_EXAMPLE_REMOVE,
  IVA_EXONERADOS,
  IVA_INTEREST_NOTE,
  IVA_MINIMA_ITEMS,
  IVA_TABLE_SOURCES,
  ivaAddRows,
  ivaFactor,
  ivaLegalRef,
  ivaMoney,
  ivaPct,
  ivaRemoveRows,
  ivaShareOfGross,
  ivaVerifiedLabel,
  wrongStrip,
} from '~/utils/ivaTable'
import {
  IVA_NINE_POINTS_LAST_DAY,
  IVA_REGIMES,
  IVA_TASA_BASICA,
  IVA_TASA_MINIMA,
} from '~/utils/ivaTarjeta'
import { TOOL_SNIPPET_IVA_SOURCES, toolSnippetIva } from '~/utils/toolSnippets'

const localePath = useLocalePath()

// Título y descripción que contestan primero ("cuánto es el IVA en Uruguay") con las tasas del
// T.O. 2023 y un ejemplo; ver `utils/toolSnippets.ts`.
const snippet = toolSnippetIva()
const sources = [...TOOL_SNIPPET_IVA_SOURCES, ...IVA_TABLE_SOURCES]

// Las tablas y los ejemplos del texto salen de `addIva` / `removeIva` (utils/ivaTable.ts): son
// estáticos, así que el HTML del servidor ya trae todos los montos.
const addRows = ivaAddRows()
const removeRows = ivaRemoveRows()
const exAdd = ivaAddRows([IVA_EXAMPLE_ADD])[0]!
const exBudget = ivaAddRows([IVA_EXAMPLE_BUDGET])[0]!
const exFaq = ivaAddRows([IVA_EXAMPLE_FAQ])[0]!
const exRemove = ivaRemoveRows([IVA_EXAMPLE_REMOVE])[0]!
const exWrong = {
  gross: exFaq.grossBasica,
  wrong: wrongStrip(exFaq.grossBasica, IVA_TASA_BASICA),
  right: removeIva(exFaq.grossBasica, IVA_TASA_BASICA).net,
}
const shareBasica = ivaPct(ivaShareOfGross(IVA_TASA_BASICA))
const shareMinima = ivaPct(ivaShareOfGross(IVA_TASA_MINIMA))
const factorBasica = ivaFactor(IVA_TASA_BASICA)
const factorMinima = ivaFactor(IVA_TASA_MINIMA)
const verifiedLabel = ivaVerifiedLabel()

// Las rebajas por pagar con tarjeta, de los datos ya verificados de /descuento-de-iva-con-tarjeta.
// Los dos regímenes existen en `IVA_REGIMES` (lo vigila tests/unit/ivaTable.test.ts): mejor que el
// render falle a que la página imprima una rebaja inventada.
const debitPoints = IVA_REGIMES.find(x => x.id === 'general')!.points
const gastroPoints = IVA_REGIMES.find(x => x.id === 'gastronomia')!.points

// La respuesta de «¿Qué no paga IVA?» sale de la misma lista que el cuerpo, para que no se separen.
const exoneradosFaq = `Están exonerados, entre otros, estos casos del artículo 38 del Título 10 (Texto Ordenado 2023). ${IVA_EXONERADOS.map(i => i.text).join(' ')} ${IVA_INTEREST_NOTE}`
const gastroLastDay = ivaVerifiedLabel(IVA_NINE_POINTS_LAST_DAY)

const mode = ref<'add' | 'remove'>('add')
const amount = ref(1000)
const rate = ref(22)
const rateItems = [
  { title: 'Básica (22%)', value: 22 },
  { title: 'Mínima (10%)', value: 10 },
]

const r = computed(() =>
  mode.value === 'add'
    ? addIva(amount.value || 0, rate.value)
    : removeIva(amount.value || 0, rate.value)
)

const faq = [
  {
    q: '¿Cuánto es el IVA en Uruguay?',
    a: `La tasa básica del IVA es ${IVA_TASA_BASICA} % y la mínima ${IVA_TASA_MINIMA} % (Texto Ordenado 2023, Título 10, artículo 34). Casi todo paga la básica; la mínima es una lista cerrada que incluye pan blanco común, carne y pescado frescos, congelados o enfriados, medicamentos y el hospedaje en hoteles, entre otros.`,
  },
  {
    q: '¿Cómo saco el IVA de un precio?',
    a: `Si el precio ya incluye IVA al ${IVA_TASA_BASICA} %, dividís el importe entre ${factorBasica} para obtener el valor sin IVA; la diferencia es el impuesto. Para la tasa mínima dividís entre ${factorMinima}.`,
  },
  {
    q: `¿Cuánto es ${ivaMoney(exFaq.net)} más IVA?`,
    a: `${ivaMoney(exFaq.net)} más IVA son ${ivaMoney(exFaq.grossBasica)} a la tasa básica del ${IVA_TASA_BASICA} % (${ivaMoney(exFaq.ivaBasica)} de impuesto) y ${ivaMoney(exFaq.grossMinima)} a la mínima del ${IVA_TASA_MINIMA} %.`,
  },
  {
    q: '¿Qué porcentaje de un precio final es IVA?',
    a: `El ${shareBasica} % a la tasa básica y el ${shareMinima} % a la mínima, porque el impuesto se calcula sobre el precio sin IVA. Por eso restarle el ${IVA_TASA_BASICA} % a un precio con IVA da de menos: ${ivaMoney(exWrong.gross)} menos ${IVA_TASA_BASICA} % son ${ivaMoney(exWrong.wrong)}, y el precio sin IVA es ${ivaMoney(exWrong.right)}.`,
  },
  {
    q: '¿Qué no paga IVA en Uruguay?',
    a: exoneradosFaq,
  },
  {
    q: '¿El precio que veo ya tiene el IVA?',
    a: `Al consumidor, el comercio le tiene que informar el precio con los impuestos incluidos (Ley 17.250, artículo 15, literal A). Cuando un presupuesto dice «más IVA», el impuesto todavía no está sumado: ${ivaMoney(exBudget.net)} + IVA son ${ivaMoney(exBudget.grossBasica)} a la tasa básica.`,
  },
]
</script>

<style scoped>
/* El que se desplaza es este contenedor, que tiene tabindex y nombre: así se llega con el teclado.
   El envoltorio interno de VTable no se desplaza (si no, sería un área sin foco). */
.table-scroll {
  overflow-x: auto;
  max-width: 100%;
}

.table-scroll--tall {
  max-height: 420px;
  overflow-y: auto;
}

.table-scroll:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.iva-table :deep(.v-table__wrapper) {
  overflow: visible;
}

.iva-table--sticky :deep(thead th) {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgb(var(--v-theme-surface));
}

.iva-table {
  font-variant-numeric: tabular-nums;
}

/* ToolShell arma la grilla con `minmax(280px, 1fr)`: a 320 px la columna es más ancha que la
   tarjeta y el texto queda cortado. `min(280px, 100%)` la deja en una columna del ancho disponible.
   El !important gana a la regla de ToolShell, que tiene más especificidad. */
.iva-article-grid {
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)) !important;
}

.iva-table td {
  white-space: nowrap;
}

@media (max-width: 599px) {
  .iva-table :deep(th),
  .iva-table :deep(td) {
    padding-left: 8px !important;
    padding-right: 8px !important;
  }
}
</style>

<!-- Layout primitives shared from ToolShell (.tool-page namespace). -->
