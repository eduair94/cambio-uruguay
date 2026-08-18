<template>
  <VContainer class="page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">IMESI a autos eléctricos e híbridos · Decreto 147/026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Desde el 1° de enero de 2027, el IMESI de los autos eléctricos e híbridos deja de ser plano
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Hoy los eléctricos pagan 0 % sin importar el precio. Desde 2027 van a pagar
        <strong>0, 5 o 9 %</strong> según el <strong>valor en aduana</strong> de la unidad importada
        —no el precio de venta—, con el corte en <strong>US$ 19.000</strong> y
        <strong>US$ 27.000</strong>. Para los híbridos de valor en aduana bajo (hasta US$ 19.000) no
        cambia absolutamente nada: siguen con la misma tasa de hoy.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-gavel">
        Fuente: <strong>Decreto 147/026</strong> (Diario Oficial Nº 31.948, 03/07/2026), que
        modifica el art. 35 del Decreto 96/990 en la redacción del Decreto 390/021. Rige desde el
        <strong>1° de enero de 2027</strong>. Las tasas de este decreto no están en el HTML de IMPO
        — sólo en la imagen del Diario Oficial— y fueron transcritas de ahí.
      </VAlert>
    </header>

    <!-- Calculator -->
    <section class="mb-8" aria-label="Calculadora: tasa hoy vs. tasa 2027">
      <h2 class="section-heading mb-4">Tu caso: tasa hoy vs. tasa 2027</h2>

      <VCard variant="flat" class="calc pa-4 pa-sm-6">
        <div class="text-overline text-medium-emphasis mb-2">Propulsión</div>
        <VBtnToggle
          v-model="propulsionChoice"
          color="primary"
          mandatory
          divided
          variant="outlined"
          class="w-100 mb-5 toggle-wrap"
        >
          <VBtn value="electric" class="flex-grow-1">Eléctrico puro</VBtn>
          <VBtn value="hybrid-a" class="flex-grow-1">Híbrido enchufable</VBtn>
          <VBtn value="hybrid-b" class="flex-grow-1">Híbrido sin enchufe</VBtn>
          <VBtn value="hybrid-c" class="flex-grow-1">Mild hybrid</VBtn>
        </VBtnToggle>

        <VRow>
          <VCol cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">
              Valor en aduana (no el de vidriera)
            </div>
            <VTextField
              v-model.number="customsValueUsd"
              type="number"
              min="0"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hint="Es el valor puesto en aduana al importar, no lo que ves en la vidriera de la agencia."
              persistent-hint
            />
          </VCol>
          <VCol v-if="!isElectric" cols="12" sm="6">
            <div class="text-overline text-medium-emphasis mb-2">Cilindrada del motor térmico</div>
            <VTextField
              v-model.number="engineCc"
              type="number"
              min="0"
              suffix="cc"
              variant="outlined"
              density="comfortable"
              :hint="`Cae en la fila ${decision.engineRow ?? ''} del decreto (${engineRowLabel}).`"
              persistent-hint
            />
          </VCol>
        </VRow>

        <VAlert
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mt-4"
          icon="mdi-alert-outline"
        >
          El valor en aduana <strong>no es</strong> el precio de venta al público. Nadie publica el
          valor en aduana por modelo: esta página no estima uno, y ninguna tabla "modelo → precio
          final" es confiable si no dice de dónde sacó ese número.
        </VAlert>

        <VAlert :type="verdictTone" variant="tonal" class="mt-4" :icon="verdictIcon" border="start">
          <p class="text-subtitle-1 font-weight-bold mb-1">{{ verdictTitle }}</p>
          <p class="mb-0 text-body-2">
            Tramo de valor en aduana: <strong>{{ bracketLabel }}</strong
            >. Tasa vigente hoy: <strong>{{ pct(decision.rateTodayPct) }}</strong
            >. Tasa desde el 1°/1/2027: <strong>{{ pct(decision.rate2027Pct) }}</strong
            >.
            <template v-if="decision.diffPct > 0">
              Sube <strong>{{ pct(decision.diffPct) }}</strong> puntos de IMESI.
            </template>
            <template v-else> No hay cambio para este caso. </template>
          </p>
        </VAlert>

        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          <VIcon size="14" class="mr-1">mdi-information-outline</VIcon>
          Esto es la tasa de IMESI, no el aumento del precio final del auto: ver la sección "por qué
          9 % de IMESI no es 9 % más caro" más abajo.
        </p>
      </VCard>
    </section>

    <!-- The full matrix -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">La matriz completa del Decreto 147/026</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Ningún medio uruguayo publicó esta tabla entera. Son tres tramos de valor en aduana, y en
        cada uno la tasa depende de si el vehículo es eléctrico puro o híbrido, y de la subcategoría
        y cilindrada del híbrido.
      </p>

      <VCard
        v-for="table in bracketTables"
        :key="table.bracket"
        variant="flat"
        class="matrix-card pa-4 pa-sm-5 mb-4"
      >
        <p class="text-subtitle-1 font-weight-bold mb-3">
          Literal {{ table.bracket }}) — valor en aduana {{ table.label }}
        </p>
        <div class="table-wrap">
          <table class="cu-mobile-cards matrix-table">
            <thead>
              <tr>
                <th scope="col">Fila</th>
                <th scope="col">Eléctrico</th>
                <th scope="col">Híbrido a) enchufable</th>
                <th scope="col">Híbrido b) sin enchufe</th>
                <th scope="col">Híbrido c) mild hybrid</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in table.rows" :key="row.label">
                <td data-label="Fila" class="font-weight-bold">{{ row.label }}</td>
                <td data-label="Eléctrico">{{ row.electric }}</td>
                <td data-label="Híbrido a) enchufable">{{ row.a }}</td>
                <td data-label="Híbrido b) sin enchufe">{{ row.b }}</td>
                <td data-label="Híbrido c) mild hybrid">{{ row.c }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCard>
    </section>

    <!-- Comparison with today -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Lo vigente hoy, y el hallazgo</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Hasta el 31/12/2026 rige el Decreto 390/021, que NO distingue por valor en aduana: es una
        sola tabla para todos.
      </p>

      <VCard variant="flat" class="matrix-card pa-4 pa-sm-5 mb-4">
        <div class="table-wrap">
          <table class="cu-mobile-cards matrix-table">
            <thead>
              <tr>
                <th scope="col">Fila</th>
                <th scope="col">Eléctrico</th>
                <th scope="col">Híbrido a) enchufable</th>
                <th scope="col">Híbrido b) sin enchufe</th>
                <th scope="col">Híbrido c) mild hybrid</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in todayRows" :key="row.label">
                <td data-label="Fila" class="font-weight-bold">{{ row.label }}</td>
                <td data-label="Eléctrico">{{ row.electric }}</td>
                <td data-label="Híbrido a) enchufable">{{ row.a }}</td>
                <td data-label="Híbrido b) sin enchufe">{{ row.b }}</td>
                <td data-label="Híbrido c) mild hybrid">{{ row.c }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </VCard>

      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-lightbulb-on-outline">
        Comparando las dos tablas: en el tramo de hasta US$ 19.000, las tasas de
        <strong>híbridos</strong> del decreto nuevo son <strong>idénticas</strong> a las de hoy — no
        cambia nada. El 0 % del tramo bajo (hasta US$ 19.000) es exclusivo de los
        <strong>eléctricos puros</strong>, que pasan a pagar 5 % o 9 % recién por encima de ese
        umbral. Para los híbridos, lo que cambia empieza en US$ 19.001: ahí un enchufable de hasta
        2.500 cc pasa de 2 % a 7 %, y por encima de US$ 27.000 a 11 %.
      </VAlert>
    </section>

    <!-- Definitions -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Qué subcategoría de híbrido tenés</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Decreto 96/990, art. 35. Es lo que decide qué columna de la matriz te toca.
      </p>
      <VRow>
        <VCol v-for="def in HYBRID_SUBCATEGORY_DEFINITIONS" :key="def.id" cols="12" md="4">
          <VCard variant="flat" class="def-card pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ def.label }}</p>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ def.description }}</p>
          </VCard>
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        <VIcon size="14" class="mr-1">mdi-information-outline</VIcon>
        Un auto que sólo tiene start/stop (apaga el motor al frenar y lo reenciende al acelerar) NO
        es mild hybrid para este decreto: la norma lo excluye expresamente.
      </p>
    </section>

    <!-- Why 9% IMESI isn't 9% more expensive -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Por qué "9 % de IMESI" no es "el auto sube 9 %"</h2>
      <VCard variant="flat" class="practica pa-5">
        <ul class="practica-list">
          <li>
            <strong>El hecho generador no sos vos.</strong> El Título 11 del Texto Ordenado 2023
            grava "la primera enajenación" de estos bienes, y los contribuyentes son "los
            fabricantes y los importadores". El impuesto nace cuando el importador le vende al
            distribuidor, no cuando vos comprás el auto en la agencia.
          </li>
          <li>
            <strong>Se paga un anticipo al importar</strong>, con la alícuota vigente en la fecha de
            la importación (Decreto 520/007 art. 5), aplicada sobre el valor en aduana más el
            arancel.
          </li>
          <li>
            <strong>La base imponible es el precio real</strong>, no uno inflado ni duplicado: el
            Decreto 520/007 art. 1 la define como "precio de venta sin impuestos del fabricante o
            importador al distribuidor". En ventas directas del importador al consumidor final se
            aplica un factor <strong>0,90</strong> que reduce esa base, no la multiplica.
          </li>
          <li>
            <strong>El "doble IMESI" o "factor 2" que circula NO es una regla legal.</strong> No
            existe un precio ficto que duplique la base del numeral 11). Lo que la gente llama
            "pagar el doble" es la carga total —arancel, IMESI, IVA y márgenes— sobre el valor
            puesto en puerto, no un multiplicador fijado por norma.
          </li>
          <li>
            <strong>El IVA se calcula sobre una base que ya incluye el IMESI.</strong> El Título 10
            (IVA), art. 12, dice que la base "incluirá el monto de otros gravámenes que afecten la
            operación". Por eso un punto de IMESI no se traslada uno a uno al precio final: se
            traslada amplificado por el IVA que se calcula encima.
          </li>
        </ul>
      </VCard>
    </section>

    <!-- Customs value vs. sticker price -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Valor en aduana vs. precio de vidriera</h2>
      <VCard variant="flat" class="practica pa-5">
        <p class="text-body-2 mb-3">
          El decreto habla siempre de "valor en aduana en ocasión de la importación", nunca de
          precio de venta. Según <strong>Martín Vallcorba</strong>, subsecretario del MEF
          (1°/7/2026), US$ 19.000 de valor en aduana "equivale a un precio de venta al público de
          entre 29.000 y 30.000 dólares, dependiendo del modelo", con precios finales "un 50 % o 60
          % mayores" al valor en aduana. Pero el propio Vallcorba aclaró el límite de esa
          equivalencia: <strong>"no hay una regla única"</strong> para convertir el valor de aduana
          en el precio que le llega al consumidor.
        </p>
        <p class="text-body-2 mb-0">
          Por eso algunos medios titularon con "US$ 30.000 de precio de venta al público": no es una
          invención de la prensa, es la traducción que dio el propio subsecretario. Pero la regla
          del decreto sigue siendo el valor en aduana, y ese valor por modelo
          <strong>no es público</strong>: no existe un canal donde un comprador pueda consultarlo.
          Por eso esta página no publica una tabla "modelo → precio final": cualquiera que la
          publique está estimando, no citando una fuente oficial.
        </p>
      </VCard>
    </section>

    <!-- The window until 31/12/2026 and the honest gap -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">
        La ventana hasta el 31/12/2026 (y lo que no está resuelto)
      </h2>
      <VCard variant="flat" class="practica pa-5">
        <p class="text-body-2 mb-3">
          El Decreto 147/026 <strong>no tiene artículo transitorio</strong>: el art. 2 dice sólo
          "Comuníquese y archívese". Combinando eso con las dos normas que sí rigen la liquidación:
        </p>
        <ul class="practica-list mb-3">
          <li>
            El anticipo del IMESI al importar se paga "a las alícuotas vigentes al momento de la
            importación" (Decreto 520/007 art. 5).
          </li>
          <li>
            El hecho generador del impuesto es la primera enajenación, hecha por el importador
            (Título 11 T.O. 2023, art. 1).
          </li>
        </ul>
        <p class="text-body-2 mb-3">
          Lo que queda <strong>sin resolver por norma expresa</strong> es qué pasa con una unidad
          importada en 2026 —con su anticipo pagado a la tasa de hoy— cuya primera enajenación (la
          venta al distribuidor o a vos) ocurre ya en 2027. No hay norma publicada que lo aclare.
        </p>
        <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-account-voice">
          Dato de campo, sin corroborar: en el foro r/monte_video un usuario contó sobre una
          preventa de Tesla que, según su relato, "si te entregan el año que viene te suben el
          precio". Es un solo reporte, sin contrato ni confirmación del importador — se cita como
          testimonio, no como hecho verificado.
        </VAlert>
        <p class="text-body-2 mt-3 mb-0">
          Consejo operativo, no jurídico: si estás reservando ahora un auto que se entrega después
          del 1°/1/2027, pedí que la
          <strong>fecha de entrega y el precio queden por escrito</strong>
          en la reserva. Ante un vacío normativo, un papel firmado vale más que una promesa verbal.
        </p>
      </VCard>
    </section>

    <!-- How many cars this reaches -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Cuánto alcanza este cambio</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Dos funcionarios dieron cifras que no coinciden porque miden universos distintos. Ninguno
        publicó el dataset detrás.
      </p>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="def-card pa-4 h-100">
            <p class="text-overline text-medium-emphasis mb-1">
              MEF · Martín Vallcorba (1°/7/2026)
            </p>
            <p class="text-body-2 mb-0">
              "Para casi el 70 % de los autos eléctricos e híbridos no hay ningún cambio"; ubica en
              esa franja "aproximadamente las 2/3 partes del total" de eléctricos e híbridos
              vendidos. Universo: <strong>eléctricos + híbridos combinados</strong>.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="def-card pa-4 h-100">
            <p class="text-overline text-medium-emphasis mb-1">MIEM · Fernanda Cardona</p>
            <p class="text-body-2 mb-0">
              Considerando las importaciones de los últimos seis meses, el
              <strong>75 % de los eléctricos puros</strong> sigue con exoneración total. Universo:
              <strong>sólo eléctricos puros</strong>, período de seis meses.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12">
          <VCard variant="flat" class="def-card pa-4">
            <p class="text-overline text-medium-emphasis mb-1">
              El Observador (2/7/2026), con datos de ACAU
            </p>
            <p class="text-body-2 mb-0">
              De los 10 modelos eléctricos más vendidos de 2026, sólo 2 tributarían con el decreto
              nuevo. En 2026 hasta julio se vendieron 9.526 eléctricos, de 132 modelos y 40 marcas;
              la mayoría se vende "en torno a los US$ 28.000 y US$ 30.000". El propio artículo
              advierte que ese cruce se hizo con <strong>precios de vidriera de julio</strong>, no
              con valores de aduana.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- What the decree doesn't touch -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Lo que este decreto no toca</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Dos beneficios de los eléctricos siguen intactos. Los dos números de abajo
        <strong>no se reverificaron en esta pasada</strong> contra su fuente primaria: se citan tal
        como están en el resto del sitio.
      </p>
      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="def-card pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-2">Patente (SUCIVE 2026)</p>
            <p class="text-body-2 mb-0">
              0 km a nafta o diésel: 5 % del valor de mercado sin IVA; usados, 4,5 %. Eléctricos: 3
              % (0 km) y 2,25 % (usados). El texto ordenado de SUCIVE anota la fila de usados
              eléctricos como "Vehículos eléctricos usados (hasta 31/12/25)", así que ese corte de
              fecha hay que respetarlo al leerla.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="def-card pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-2">Carga eléctrica (UTE, pliego 2026)</p>
            <p class="text-body-2 mb-0">
              No hay tarifa específica de movilidad eléctrica: se carga con la tarifa Triple Horario
              general — valle $ 2,443/kWh, llano $ 5,172/kWh, punta $ 12,034/kWh (sin IVA), más un
              cargo por potencia contratada de $ 83,2 + IVA por kW al mes.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- What to ask, and where to keep reading -->
    <section class="mb-8">
      <h2 class="section-heading mb-1">Qué preguntar antes de firmar</h2>
      <VCard variant="flat" class="practica pa-5 mb-4">
        <ul class="practica-list">
          <li>
            <strong>El valor en aduana declarado de esa unidad.</strong> Es el único número que
            decide el tramo. No sirve el precio de lista ni el precio bonificado.
          </li>
          <li>
            <strong>La subcategoría exacta del híbrido.</strong> Enchufable, sin enchufe o mild
            hybrid cambian la tasa varias veces; el folleto rara vez lo dice con esas palabras.
          </li>
          <li>
            <strong>La cilindrada del motor térmico</strong>, si es híbrido: define la fila F1-F6.
          </li>
          <li>
            <strong>Fecha de entrega y precio, por escrito en la reserva</strong>, si la entrega cae
            después del 1°/1/2027.
          </li>
        </ul>
      </VCard>

      <p class="text-body-2 text-medium-emphasis mb-2">Para seguir la cuenta completa:</p>
      <ul class="practica-list">
        <li>
          <NuxtLink to="/guias/costos-de-tener-auto-uruguay">Cuánto cuesta tener un auto</NuxtLink>
          — el gasto mensual, más allá del precio de compra.
        </li>
        <li>
          <NuxtLink to="/multas-de-transito-y-patente-uruguay">Patente y multas</NuxtLink> — las
          alícuotas de patente que este decreto no toca.
        </li>
        <li>
          <NuxtLink to="/comprar-auto-con-deuda-uruguay">Comprar un auto con deuda</NuxtLink> — qué
          bloquea una transferencia.
        </li>
        <li>
          <NuxtLink to="/herramientas/calculadora-prestamo">Calculadora de préstamo</NuxtLink> — si
          la compra se financia.
        </li>
        <li>
          <NuxtLink to="/pizarra">La pizarra del dólar</NuxtLink> — los umbrales están fijados en
          dólares y el auto se paga en pesos.
        </li>
      </ul>
    </section>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Las normas, sin intermediarios
      </h2>
      <ul class="sources-list">
        <li v-for="source in ELECTRIC_VEHICLE_TAX_SOURCES" :key="source.label">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Verificado contra fuente primaria el {{ lastResearchedLabel }}. Las tasas de la matriz salen
        de la imagen del Diario Oficial, no del HTML de IMPO (que deja las celdas vacías). Los datos
        de patente y de tarifa eléctrica de UTE, citados arriba, no se reverificaron en esta pasada.
      </p>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento profesional ni tributario. El
      valor en aduana de un vehículo concreto no es un dato público: para saber cuál te corresponde
      a vos, consultá con el importador o con un despachante de aduana.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CUSTOMS_VALUE_THRESHOLD_HIGH_USD,
  CUSTOMS_VALUE_THRESHOLD_LOW_USD,
  DECREE_147_2026_MATRIX,
  DECREE_390_2021_CURRENT_RATES,
  ELECTRIC_VEHICLE_TAX_SOURCES,
  ENGINE_ROWS,
  ENGINE_ROW_RANGES,
  HYBRID_SUBCATEGORY_DEFINITIONS,
  LAST_RESEARCHED,
  resolveVehicleTax,
  type CustomsBracket,
  type HybridSubcategory,
} from '~/utils/electricVehicleTax'

type PropulsionChoice = 'electric' | 'hybrid-a' | 'hybrid-b' | 'hybrid-c'

const propulsionChoice = ref<PropulsionChoice>('electric')
const customsValueUsd = ref(15_000)
const engineCc = ref(1_500)

const isElectric = computed(() => propulsionChoice.value === 'electric')

const decision = computed(() => {
  if (propulsionChoice.value === 'electric') {
    return resolveVehicleTax({
      customsValueUsd: customsValueUsd.value || 0,
      propulsion: 'electric',
    })
  }
  const hybridSubcategory = propulsionChoice.value.split('-')[1] as HybridSubcategory
  return resolveVehicleTax({
    customsValueUsd: customsValueUsd.value || 0,
    propulsion: 'hybrid',
    hybridSubcategory,
    engineCc: engineCc.value || 0,
  })
})

const BRACKET_LABELS: Record<CustomsBracket, string> = {
  a: `hasta US$ ${CUSTOMS_VALUE_THRESHOLD_LOW_USD.toLocaleString('es-UY')}`,
  b: `de US$ ${(CUSTOMS_VALUE_THRESHOLD_LOW_USD + 1).toLocaleString('es-UY')} a US$ ${CUSTOMS_VALUE_THRESHOLD_HIGH_USD.toLocaleString('es-UY')}`,
  c: `más de US$ ${CUSTOMS_VALUE_THRESHOLD_HIGH_USD.toLocaleString('es-UY')}`,
}

const bracketLabel = computed(() => `literal ${decision.value.customsBracket})`)

const engineRowLabel = computed(() => {
  const range = ENGINE_ROW_RANGES.find(r => r.row === decision.value.engineRow)
  return range?.label ?? ''
})

const verdictTone = computed(() => (decision.value.diffPct > 0 ? 'warning' : 'success'))
const verdictIcon = computed(() =>
  decision.value.diffPct > 0 ? 'mdi-trending-up' : 'mdi-check-circle-outline'
)
const verdictTitle = computed(() =>
  decision.value.diffPct > 0 ? 'Este caso paga más IMESI desde 2027' : 'Este caso no cambia en 2027'
)

function pct(value: number): string {
  return `${value.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} %`
}

function rangeLabel(row: (typeof ENGINE_ROWS)[number]): string {
  return ENGINE_ROW_RANGES.find(r => r.row === row)?.label ?? row
}

interface MatrixRow {
  label: string
  electric: string
  a: string
  b: string
  c: string
}

function buildBracketRows(bracket: CustomsBracket): MatrixRow[] {
  const m = DECREE_147_2026_MATRIX[bracket]
  return [
    {
      label: 'F — el vehículo (sin distinguir cilindrada)',
      electric: pct(m.electric),
      a: 'según fila F1-F6',
      b: 'según fila F1-F6',
      c: 'según fila F1-F6',
    },
    ...ENGINE_ROWS.map(row => ({
      label: `${row} · ${rangeLabel(row)}`,
      electric: 'No aplica',
      a: pct(m.hybrid.a[row]),
      b: pct(m.hybrid.b[row]),
      c: pct(m.hybrid.c[row]),
    })),
  ]
}

const bracketTables = (['a', 'b', 'c'] as CustomsBracket[]).map(bracket => ({
  bracket,
  label: BRACKET_LABELS[bracket],
  rows: buildBracketRows(bracket),
}))

const todayRows: MatrixRow[] = [
  {
    label: 'F — el vehículo (sin distinguir cilindrada)',
    electric: pct(DECREE_390_2021_CURRENT_RATES.electric),
    a: 'según fila F1-F6',
    b: 'según fila F1-F6',
    c: 'según fila F1-F6',
  },
  ...ENGINE_ROWS.map(row => ({
    label: `${row} · ${rangeLabel(row)}`,
    electric: 'No aplica',
    a: pct(DECREE_390_2021_CURRENT_RATES.hybrid.a[row]),
    b: pct(DECREE_390_2021_CURRENT_RATES.hybrid.b[row]),
    c: pct(DECREE_390_2021_CURRENT_RATES.hybrid.c[row]),
  })),
]

const lastResearchedLabel = new Date(`${LAST_RESEARCHED}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/impuesto-autos-electricos-uruguay'
const title =
  'IMESI a autos eléctricos e híbridos en Uruguay 2027: la matriz completa del Decreto 147/026'
const description =
  'Desde el 1°/1/2027 los eléctricos pagan 0, 5 o 9 % de IMESI según el valor en aduana (corte en US$ 19.000 y US$ 27.000). Para híbridos de valor bajo no cambia nada. Matriz completa del Decreto 147/026, con fuentes primarias.'

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
  meta: [
    {
      name: 'keywords',
      content:
        'imesi autos electricos uruguay, impuesto autos hibridos uruguay 2027, decreto 147/026, valor en aduana auto electrico uruguay, imesi vehiculos electricos, tasa autos hibridos uruguay, impuesto autos electricos 2027',
    },
  ],
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
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'IMESI a autos eléctricos e híbridos en Uruguay',
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
.eyebrow {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
}
.calc,
.practica,
.sources-card,
.matrix-card,
.def-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
}
.toggle-wrap {
  flex-wrap: wrap;
  height: auto;
}
.practica-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
  line-height: 1.6;
}
.table-wrap {
  overflow-x: auto;
}
.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.matrix-table th,
.matrix-table td {
  text-align: left;
  vertical-align: top;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.14);
}
.matrix-table th {
  font-weight: 800;
  white-space: nowrap;
}
.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}

/* Mobile card layout for wide tables, matching the site's cu-mobile-cards pattern */
@media (max-width: 599px) {
  .cu-mobile-cards thead {
    display: none;
  }
  .cu-mobile-cards tbody tr {
    display: block;
    border: 1px solid rgba(var(--v-border-color), 0.14);
    border-radius: 10px;
    margin-bottom: 10px;
    padding: 4px 0;
  }
  .cu-mobile-cards tbody td {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    border-bottom: 1px solid rgba(var(--v-border-color), 0.08);
  }
  .cu-mobile-cards tbody td:last-child {
    border-bottom: none;
  }
  .cu-mobile-cards tbody td::before {
    content: attr(data-label);
    font-weight: 700;
    color: rgba(var(--v-theme-on-surface), 0.6);
  }
}
</style>
