<template>
  <VContainer class="lowwage-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SUELDO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Se puede vivir con 25.000 o 30.000 pesos por 9 horas?
      </h1>
      <p class="lead mb-6">
        La pregunta se hace todo el tiempo y casi siempre se contesta con anécdotas. Acá va con
        números: qué dice el decreto del mínimo, qué dice la ley de la jornada, y qué encontramos
        cuando nos pusimos a leer los avisos uno por uno.
      </p>

      <VRow class="mb-2">
        <VCol v-for="a in RESPUESTA_CORTA" :key="a.titulo" cols="12" md="4">
          <VCard variant="flat" class="answer-card pa-5 h-100">
            <div class="text-overline mb-2">{{ a.kicker }}</div>
            <p class="answer-title font-weight-bold mb-2">{{ a.titulo }}</p>
            <p class="mb-0 text-medium-emphasis">{{ a.detalle }}</p>
          </VCard>
        </VCol>
      </VRow>
    </header>

    <!-- ── 1. La calculadora ─────────────────────────────────────────────── -->
    <section id="calculadora" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Poné la oferta que te hicieron</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La ventana horaria de un aviso no dice cuántas horas vas a trabajar: eso lo decide el corte
        del medio, que casi nunca está escrito. Poné lo que te dijeron y mirá qué sale.
      </p>

      <VCard variant="flat" class="calc-card pa-5 pa-md-6">
        <VRow>
          <VCol cols="6" md="3">
            <VSelect
              v-model.number="entrada"
              :items="horasDelDia"
              label="Entrada"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VSelect
              v-model.number="salida"
              :items="horasDelDia"
              label="Salida"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VSelect
              v-model.number="corteMin"
              :items="opcionesCorte"
              label="Corte del medio"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VSelect
              v-model.number="diasPorSemana"
              :items="[4, 5, 6]"
              label="Días por semana"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" md="6">
            <VTextField
              v-model.number="nominal"
              type="number"
              label="Sueldo nominal ofrecido (por mes)"
              prefix="$"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" md="6">
            <VBtnToggle
              v-model="rama"
              mandatory
              divided
              density="comfortable"
              class="rama-toggle w-100"
            >
              <VBtn value="comercio" class="flex-grow-1">Comercio y servicios</VBtn>
              <VBtn value="industria" class="flex-grow-1">Industria</VBtn>
            </VBtnToggle>
          </VCol>
        </VRow>

        <VDivider class="my-6" />

        <VRow>
          <VCol v-for="m in metricas" :key="m.label" cols="6" md="3">
            <div class="metric">
              <div class="metric-label">{{ m.label }}</div>
              <div class="metric-value" :class="m.tone">{{ m.value }}</div>
              <div v-if="m.hint" class="metric-hint">{{ m.hint }}</div>
            </div>
          </VCol>
        </VRow>

        <VAlert
          v-for="v in veredictos"
          :key="v.text"
          :type="v.type"
          variant="tonal"
          density="comfortable"
          class="mt-4"
        >
          <p class="mb-0">{{ v.text }}</p>
        </VAlert>

        <p class="text-caption text-medium-emphasis mt-5 mb-0">
          La hora simple se calcula dividiendo el nominal entre 200, que es el divisor que fija el
          propio decreto del Salario Mínimo Nacional. Tu recibo o tu laudo pueden usar otro: si no
          coincide, manda el tuyo. Informativo, no asesoramiento legal.
        </p>
      </VCard>
    </section>

    <!-- ── 2. La trampa del doble límite ─────────────────────────────────── -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Nueve horas no es ilegal. Depende del corte</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        El tope de trabajo efectivo es de 8 horas por día. Que el aviso diga «de 9 a 18» no dice
        nada todavía, porque lo que decide es qué pasa entre medio — y ahí la regla es
        contraintuitiva: el corte corto se paga y el largo no.
      </p>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="split-card ok pa-5 h-100">
            <div class="text-overline mb-2">Corte de 1 hora — jornada discontinua</div>
            <p class="split-lead font-weight-bold mb-3">9 horas de ventana = 8 trabajadas</p>
            <p class="mb-3">
              El corte de la jornada discontinua va de 2 a 2 horas y media y no se computa como
              trabajo. Puede reducirse a una hora, pero no de palabra:
              {{ DESCANSO_INTERMEDIO.requisitoReduccion.toLowerCase() }}
            </p>
            <p class="mb-0 text-medium-emphasis">
              Resultado: 40 horas semanales, dentro del tope diario y del semanal. Sin horas extra.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="split-card warn pa-5 h-100">
            <div class="text-overline mb-2">Corte de 30 minutos — jornada continua</div>
            <p class="split-lead font-weight-bold mb-3">
              9 horas de ventana = 8 y media trabajadas
            </p>
            <p class="mb-3">
              En la jornada continua esa media hora
              <strong>se computa como trabajo efectivo</strong>, o sea que se paga y cuenta para el
              tope. La ventana entera es tiempo de trabajo.
            </p>
            <p class="mb-0 text-medium-emphasis">
              Resultado: 42,5 horas semanales y media hora extra por día, con 100 % de recargo.
            </p>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="trap-card pa-5 pa-md-6 mt-5">
        <div class="text-overline mb-2">El error que sale caro</div>
        <p class="mb-3">
          «Estoy en 42,5 horas semanales, el tope del comercio son 44, entonces no hay hora extra.»
          Falso. La jornada tiene un <strong>doble límite</strong>: no más de 8 horas por día
          <em>y</em> no más de 44 en el comercio o 48 en la industria. Son dos topes autónomos, no
          un promedio semanal. Cada día que pasás de 8 generás hora extra aunque la semana cierre
          por debajo del tope.
        </p>
        <p class="mb-0 text-medium-emphasis">
          La Ley 15.996 define la hora extra como la que excede «el límite horario aplicable», y el
          diario es uno de los aplicables. La misma ley pone un techo de
          {{ HORA_EXTRA.topeSemanal }} horas extra por semana que el empleador puede disponer.
        </p>
      </VCard>
    </section>

    <!-- ── 3. El relevamiento ────────────────────────────────────────────── -->
    <section id="relevamiento" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Es real que las ofertas son así?</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Para no contestar de memoria leímos los avisos. {{ BOARD_CENSUS.avisos }} avisos únicos de
        {{ BOARD_CENSUS.zona }} en {{ BOARD_CENSUS.fuente }}, el {{ censusDate }}, y en
        {{ BOARD_HOURS.avisosLeidos }} de ellos abrimos la ficha completa para anotar la franja
        horaria declarada.
      </p>

      <VRow class="mb-4">
        <VCol v-for="s in censusStats" :key="s.label" cols="6" md="3">
          <VCard variant="flat" class="stat-card pa-4 h-100">
            <div class="stat-value">{{ s.value }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="finding-card pa-5 pa-md-6 mb-5">
        <div class="text-overline mb-2">El hallazgo</div>
        <p class="finding-lead font-weight-bold mb-3">
          La ventana de nueve horas es la más declarada de todas. Más frecuente que la de ocho.
        </p>
        <p class="mb-3">
          De los {{ BOARD_HOURS.avisosLeidos }} avisos abiertos,
          {{ BOARD_HOURS.conVentanaHoraria }} declaran una franja horaria concreta. De ésos,
          {{ BOARD_HOURS.nueveOMas }} —algo más de la mitad— declaran una ventana de nueve horas o
          más, con {{ BOARD_HOURS.nueveExactas }} avisos en nueve horas exactas contra
          {{ BOARD_HOURS.ocho }} en ocho.
        </p>
        <p class="mb-0 text-medium-emphasis">
          O sea que la impresión de quien recibe las llamadas no es un sesgo suyo. Ahora: es una
          foto de un día, un portal y una ciudad. No mide el mercado laboral del país y no
          pretendemos que lo haga.
        </p>
      </VCard>

      <VCard variant="flat" class="sentinel-card pa-5 pa-md-6">
        <div class="text-overline mb-2">Por qué la mediana de los avisos engaña</div>
        <p class="mb-3">
          {{ BOARD_CENSUS.conSalarioMensual }} de los {{ BOARD_CENSUS.avisos }} avisos traían un
          salario mensual. Pero {{ BOARD_CENSUS.centinela111111 }} de ésos declaran
          <strong>$ 111.111</strong> o $ 111.110: no es un sueldo, es relleno para pasar un campo
          obligatorio, y lo usan {{ BOARD_CENSUS.centinelaEmpresas }} empresas distintas de la
          muestra. Aparece en puestos donde el número es imposible.
        </p>
        <p class="mb-3">
          Limpiando eso quedan {{ BOARD_CENSUS.muestraLimpia }} avisos con un monto legible: el
          {{ BOARD_CENSUS.pctConSueldoUtil }} % del total, uno de cada siete. Entre ellos la mediana
          es {{ uyu(BOARD_CENSUS.mediana) }} y el primer cuartil {{ uyu(BOARD_CENSUS.p25) }}.
        </p>
        <p class="mb-0 text-medium-emphasis">
          Esa mediana hay que leerla con pinzas: publicar el sueldo es una herramienta de
          reclutamiento, así que los avisos que lo muestran no son una muestra al azar de los que
          existen. Es razonable que la banda de 25.000 a 30.000 esté sobrerrepresentada entre los
          que <em>no</em> lo dicen — y por eso te enterás recién en la llamada.
        </p>
      </VCard>
    </section>

    <!-- ── 4. Ejemplos ───────────────────────────────────────────────────── -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Los avisos, transcriptos</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Salen del mismo relevamiento, ordenados por monto. Van sin nombre de empresa a propósito: lo
        que prueba el ejemplo es el par monto + jornada declarada, y ponerle nombre propio a una
        lectura automática de un aviso es una acusación que no corresponde hacer desde acá.
      </p>

      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Puesto</th>
              <th class="text-right">Nominal</th>
              <th>Jornada declarada</th>
              <th>Qué enseña</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in BOARD_EXAMPLES" :key="e.puesto">
              <td data-label="Puesto">
                <div class="font-weight-medium">{{ e.puesto }}</div>
                <div v-if="e.contrato" class="text-caption text-medium-emphasis">
                  {{ e.contrato }}
                </div>
              </td>
              <td data-label="Nominal" class="text-right num">
                {{ uyu(e.nominal) }}
                <div v-if="e.comisiones" class="text-caption text-medium-emphasis">
                  + comisiones
                </div>
                <VChip
                  v-if="e.nominal < SMN_VIGENTE"
                  size="x-small"
                  color="warning"
                  variant="tonal"
                  class="mt-1"
                >
                  bajo el mínimo
                </VChip>
              </td>
              <td data-label="Jornada declarada">
                <span v-if="e.jornada" class="quote">«{{ e.jornada }}»</span>
                <span v-else class="text-medium-emphasis">El aviso no declara horario.</span>
                <div v-if="e.ventana" class="text-caption text-medium-emphasis mt-1">
                  Ventana: {{ formatHoras(e.ventana) }}
                </div>
              </td>
              <td data-label="Qué enseña" class="text-medium-emphasis">{{ e.lectura }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- ── 5. ¿Cómo hacen? ───────────────────────────────────────────────── -->
    <section id="como-hacen" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Entonces, ¿cómo hacen para vivir así?</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        La respuesta honesta es aritmética y es incómoda. Estos números salen del INE y del cálculo
        de aportes que usa la calculadora de sueldo líquido del sitio.
      </p>

      <VCard variant="flat" class="math-card pa-5 pa-md-6 mb-5 on-dark">
        <div class="text-overline mb-3">La cuenta, paso a paso</div>
        <ul class="math-list mb-4">
          <li v-for="(l, i) in cuentaMinima" :key="i">
            <span class="math-label">{{ l.label }}</span>
            <span class="math-value" :class="l.tone">{{ l.value }}</span>
          </li>
        </ul>
        <p class="mb-0">
          Con el mínimo nacional completo, solo y alquilando en Montevideo, la cuenta no cierra: el
          sueldo entero no paga el alquiler promedio de un contrato nuevo, y todavía falta comer.
          Eso no es una opinión sobre si «se puede vivir»: es la resta.
        </p>
      </VCard>

      <VRow>
        <VCol v-for="m in MECANISMOS" :key="m.titulo" cols="12" md="6">
          <VCard variant="flat" class="mech-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ m.titulo }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ m.detalle }}</p>
          </VCard>
        </VCol>
      </VRow>

      <p class="text-caption text-medium-emphasis mt-4 mb-0">
        Líneas de pobreza del hogar: INE, valores de {{ SURVIVAL_PERIODS.lineas }}. Alquiler
        promedio de contratos nuevos: INE, {{ SURVIVAL_PERIODS.alquiler }}. Mediana del ingreso per
        cápita del país ({{ SURVIVAL_PERIODS.ingresos }}):
        {{ uyu(INGRESO_PERCAPITA_MEDIANA.pais) }}. La línea de pobreza no es «lo que cuesta vivir
        bien»: es el umbral por debajo del cual el INE cuenta a un hogar como pobre.
      </p>
    </section>

    <!-- ── 6. Qué hacer ──────────────────────────────────────────────────── -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si te acaban de hacer una oferta así</h2>
      <VRow>
        <VCol v-for="(q, i) in QUE_HACER" :key="q.titulo" cols="12" md="4">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <div class="step-n">{{ i + 1 }}</div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ q.titulo }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ q.detalle }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- ── 7. FAQ ────────────────────────────────────────────────────────── -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in LOWWAGE_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ f.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- ── 8. Relacionadas ───────────────────────────────────────────────── -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/cuanto-me-tienen-que-pagar-uruguay')" variant="tonal" size="small">
          Cuál es tu mínimo real (el laudo)
        </VBtn>
        <VBtn
          :to="localePath('/herramientas/calculadora-sueldo-liquido')"
          variant="tonal"
          size="small"
        >
          Calculadora de sueldo líquido
        </VBtn>
        <VBtn :to="localePath('/herramientas/costo-de-vida')" variant="tonal" size="small">
          Cuánto cuesta vivir acá
        </VBtn>
        <VBtn :to="localePath('/salud-financiera')" variant="tonal" size="small">
          Salud financiera
        </VBtn>
      </div>
    </section>

    <!-- ── 9. Fuentes ────────────────────────────────────────────────────── -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Normas y montos contrastados el {{ verifiedAt }}. El Salario Mínimo Nacional se ajusta por
        decreto y los laudos cambian en cada ronda de Consejos de Salarios: si estás leyendo esto
        mucho después, contrastá el monto antes de usarlo.
      </p>
      <ul class="sources-list">
        <li v-for="s in LOWWAGE_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BOARD_CENSUS,
  BOARD_EXAMPLES,
  BOARD_HOURS,
  DESCANSO_INTERMEDIO,
  HORA_EXTRA,
  INGRESO_PERCAPITA_MEDIANA,
  LOWWAGE_FAQ,
  LOWWAGE_SOURCES,
  LOWWAGE_VERIFIED_AT,
  MECANISMOS,
  QUE_HACER,
  SMN_HORA,
  SMN_VIGENTE,
  SURVIVAL_PERIODS,
  esJornadaCompleta,
  jornadaBreakdown,
  smnCheck,
  survivalCheck,
  type Rama,
} from '~/utils/lowWage'

const localePath = useLocalePath()

// ── Estado de la calculadora. Arranca en la oferta exacta de la pregunta:
// nueve horas de ventana, cinco días, 25.000 nominal.
const entrada = ref(9)
const salida = ref(18)
const corteMin = ref(60)
const diasPorSemana = ref(5)
const nominal = ref(25000)
const rama = ref<Rama>('comercio')

const horasDelDia = Array.from({ length: 25 }, (_, i) => i)
const opcionesCorte = [
  { title: 'Sin corte', value: 0 },
  { title: '30 minutos (se paga)', value: 30 },
  { title: '45 minutos', value: 45 },
  { title: '1 hora', value: 60 },
  { title: '2 horas', value: 120 },
]

const uyu = (n: number) =>
  `$ ${Math.round(n).toLocaleString('es-UY', { maximumFractionDigits: 0 })}`

const formatHoras = (h: number) => {
  const horas = Math.floor(h)
  const min = Math.round((h - horas) * 60)
  return min ? `${horas} h ${min} min` : `${horas} h`
}

const jornada = computed(() =>
  jornadaBreakdown({
    entrada: entrada.value,
    salida: salida.value,
    corteMin: corteMin.value,
    diasPorSemana: diasPorSemana.value,
    rama: rama.value,
    nominal: nominal.value || 0,
  })
)

const piso = computed(() =>
  smnCheck(
    nominal.value || 0,
    jornada.value.horasMes,
    esJornadaCompleta(jornada.value.horasDia, diasPorSemana.value)
  )
)

const vida = computed(() =>
  survivalCheck({
    nominal: nominal.value || 0,
    region: 'montevideo',
    personas: 1,
    inquilino: true,
    ingresos: 1,
  })
)

const metricas = computed(() => [
  {
    label: 'Horas trabajadas por día',
    value: formatHoras(jornada.value.horasDia),
    tone: jornada.value.excedeTopeDiario ? 'bad' : 'good',
    hint: jornada.value.corteEsPago
      ? 'El corte de hasta 30 min se computa como trabajo'
      : 'El corte no se computa',
  },
  {
    label: 'Horas por semana',
    value: formatHoras(jornada.value.horasSemana),
    tone: jornada.value.excedeTopeSemanal ? 'bad' : 'good',
    hint: `Tope de la rama: ${jornada.value.topeSemanal} h`,
  },
  {
    label: 'Horas extra al mes',
    value: jornada.value.extrasMes ? formatHoras(jornada.value.extrasMes) : 'ninguna',
    tone: jornada.value.extrasMes ? 'bad' : 'good',
    hint: jornada.value.extrasMes
      ? `Deberían sumar ${uyu(jornada.value.deudaExtrasMes)}`
      : 'Dentro de los dos topes',
  },
  {
    label: 'Te queda en la mano',
    value: uyu(vida.value.liquido),
    tone: 'neutral',
    hint: `Nominal ${uyu(nominal.value || 0)}, hora ${uyu(jornada.value.valorHora)}`,
  },
])

// De dónde sale el piso que se le está aplicando a esta oferta. Cambia según la jornada, y decirlo
// importa: el prorrateo por horas sólo vale para la jornada reducida.
function pisoExplicacion(
  p: ReturnType<typeof smnCheck>,
  j: ReturnType<typeof jornadaBreakdown>
): string {
  return p.jornadaCompleta
    ? `Con ${formatHoras(j.horasDia)} por día y ${diasPorSemana.value} días por semana es jornada completa, así que el piso es el Salario Mínimo Nacional entero: ${uyu(p.piso)}.`
    : `Es jornada reducida (${formatHoras(j.horasMes)} al mes), así que el piso se calcula por hora: ${formatHoras(j.horasMes)} × ${uyu(SMN_HORA)} = ${uyu(p.piso)}.`
}

const veredictos = computed(() => {
  const out: { type: 'error' | 'warning' | 'success' | 'info'; text: string }[] = []
  const j = jornada.value
  const p = piso.value

  if (p.bajoElMinimo) {
    out.push({
      type: 'error',
      text:
        `Ese nominal está por debajo del piso legal. ${pisoExplicacion(p, j)} Te ofrecen ` +
        `${uyu(nominal.value || 0)}: faltan ${uyu(Math.abs(p.diferencia))}.` +
        (p.esElMinimoDeEnero
          ? ` Además es, peso por peso, el Salario Mínimo Nacional que rigió hasta el 30 de junio: no lo eligieron, lo copiaron sin actualizar.`
          : ''),
    })
  } else {
    out.push({
      type: 'success',
      text:
        `Pasa el piso nacional. ${pisoExplicacion(p, j)} Ojo, eso no quiere decir que esté bien ` +
        `pago: el Salario Mínimo Nacional casi nunca es tu mínimo, lo fija el laudo de tu grupo y ` +
        `categoría.`,
    })
  }

  if (j.excedeTopeDiario) {
    out.push({
      type: 'warning',
      text:
        `Pasás el tope diario de 8 horas: trabajás ${formatHoras(j.horasDia)}. Eso genera ` +
        `${formatHoras(j.extrasSemana)} extra por semana con 100 % de recargo, aunque la semana ` +
        `cierre en ${formatHoras(j.horasSemana)} y el tope de tu rama sea de ${j.topeSemanal} h.`,
    })
  }

  if (j.superaTopeExtras) {
    out.push({
      type: 'error',
      text:
        `Son más de ${HORA_EXTRA.topeSemanal} horas extra por semana, que es el máximo que el ` +
        `empleador puede disponer según el artículo 5 de la Ley 15.996. Por encima de eso hace ` +
        `falta una autorización del Poder Ejecutivo.`,
    })
  }

  if (j.corteAnomalo) {
    out.push({
      type: 'warning',
      text:
        `Un corte de ${corteMin.value} minutos no encaja en ninguna de las dos figuras: pasa los ` +
        `30 de la jornada continua y no llega a la hora del corte discontinuo reducido. Conviene ` +
        `preguntar por escrito cómo se computa y si se paga.`,
    })
  }

  if (vida.value.restaTrasAlquiler < 0) {
    out.push({
      type: 'info',
      text:
        `Con ${uyu(vida.value.liquido)} en la mano y el alquiler promedio de un contrato nuevo en ` +
        `Montevideo (${uyu(vida.value.alquilerNuevo)}, INE ${SURVIVAL_PERIODS.alquiler}), el ` +
        `sueldo entero no cubre el alquiler: faltan ${uyu(Math.abs(vida.value.restaTrasAlquiler))} ` +
        `antes de comer.`,
    })
  }

  return out
})

// ── Bloques estáticos derivados de los datos.
// El caso de referencia de toda la página: el mínimo nacional completo, una persona sola,
// inquilina, en Montevideo. Es el escenario donde la resta da negativa.
const smnSolo = survivalCheck({
  nominal: SMN_VIGENTE,
  region: 'montevideo',
  personas: 1,
  inquilino: true,
  ingresos: 1,
})

const RESPUESTA_CORTA = [
  {
    kicker: '¿Es real?',
    titulo: 'Sí, y es medible',
    detalle: `De ${BOARD_HOURS.conVentanaHoraria} avisos que declaran horario, ${BOARD_HOURS.nueveOMas} piden una ventana de nueve horas o más. Es la más frecuente de todas, por encima de la de ocho.`,
  },
  {
    kicker: '¿Es legal?',
    titulo: '25.000 por jornada completa, no',
    detalle: `El mínimo es ${uyu(SMN_VIGENTE)} desde el 1.º de julio de 2026. Las nueve horas sí pueden serlo, pero sólo si una de ellas es corte no pago.`,
  },
  {
    kicker: '¿Alcanza?',
    titulo: 'Solo y alquilando, no',
    detalle: `El líquido del mínimo completo son ${uyu(smnSolo.liquido)}, y el alquiler promedio de un contrato nuevo en Montevideo ${uyu(smnSolo.alquilerNuevo)}. La resta da negativa.`,
  },
]

const cuentaMinima = [
  { label: 'Salario Mínimo Nacional (nominal, desde julio)', value: uyu(SMN_VIGENTE), tone: '' },
  {
    label: 'Menos aportes personales (19,6 %)',
    value: `− ${uyu(SMN_VIGENTE - smnSolo.liquido)}`,
    tone: '',
  },
  { label: 'Te queda en la mano', value: uyu(smnSolo.liquido), tone: 'strong' },
  {
    label: `Alquiler promedio, contrato nuevo en Montevideo (INE, ${SURVIVAL_PERIODS.alquiler})`,
    value: `− ${uyu(smnSolo.alquilerNuevo)}`,
    tone: '',
  },
  { label: 'Queda para todo lo demás', value: uyu(smnSolo.restaTrasAlquiler), tone: 'bad' },
  {
    label: `Línea de pobreza del INE, hogar de 1 persona inquilina en Montevideo (${SURVIVAL_PERIODS.lineas})`,
    value: uyu(smnSolo.lineaPobreza),
    tone: '',
  },
]

const censusStats = [
  { value: String(BOARD_CENSUS.avisos), label: 'avisos relevados' },
  {
    value: `${BOARD_CENSUS.pctConSueldoUtil} %`,
    label: 'publica un sueldo que se pueda leer',
  },
  { value: uyu(BOARD_CENSUS.mediana), label: 'mediana de los que sí lo dicen' },
  {
    value: `${BOARD_HOURS.nueveOMas} de ${BOARD_HOURS.conVentanaHoraria}`,
    label: 'piden 9 h o más',
  },
]

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = fmtDate(LOWWAGE_VERIFIED_AT)
const censusDate = fmtDate(BOARD_CENSUS.fecha)

const canonicalUrl = 'https://cambio-uruguay.com/vivir-con-25000-pesos-uruguay'
const title = '¿Se puede vivir con 25.000 o 30.000 pesos por 9 horas en Uruguay?'
const description = `Las ofertas de 25.000 a 30.000 pesos por nueve horas existen y son medibles: en un relevamiento de ${BOARD_CENSUS.avisos} avisos de Montevideo, la ventana de nueve horas resultó la más declarada. Qué dice la ley (tope de 8 horas diarias y 44 o 48 semanales, y la media hora de corte que se computa como trabajo), por qué 25.000 por jornada completa está por debajo del mínimo de ${SMN_VIGENTE} pesos, cuánto queda líquido y por qué no alcanza para alquilar solo en Montevideo.`

defineOgImageComponent('Cambio', {
  title: '¿Se puede vivir con 25.000 por 9 horas?',
  subtitle: `El mínimo es $ ${SMN_VIGENTE.toLocaleString('es-UY')} y la ventana de 9 h es la más pedida`,
  tag: 'SUELDO',
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
  meta: [
    {
      name: 'keywords',
      content:
        'se puede vivir con 25000 pesos uruguay, sueldo 25000 uruguay, 30000 pesos por 9 horas, salario minimo nacional 2026, jornada de 9 horas uruguay, tope de 8 horas diarias, horas extra 100 por ciento recargo, descanso intermedio media hora, cuanto queda liquido de 25000, ofertas de trabajo mal pagas uruguay',
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
                name: 'Vivir con 25.000 pesos',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: LOWWAGE_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.lowwage-page {
  max-width: 1180px;
}
.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .lead {
  color: rgba(0, 0, 0, 0.76);
}
.section-intro {
  max-width: 72ch;
  margin-top: 0;
}

.answer-card,
.calc-card,
.split-card,
.trap-card,
.stat-card,
.finding-card,
.sentinel-card,
.results-card,
.mech-card,
.step-card,
.math-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .answer-card,
.v-theme--light .calc-card,
.v-theme--light .split-card,
.v-theme--light .trap-card,
.v-theme--light .stat-card,
.v-theme--light .finding-card,
.v-theme--light .sentinel-card,
.v-theme--light .results-card,
.v-theme--light .mech-card,
.v-theme--light .step-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}

.answer-title {
  font-size: 1.05rem;
  margin-top: 0;
}
.split-lead,
.finding-lead {
  font-size: 1.05rem;
  margin-top: 0;
}
.split-card.ok {
  border-color: rgba(var(--v-theme-success), 0.45);
}
.split-card.warn,
.trap-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}
.finding-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.rama-toggle {
  height: 48px;
}

.metric-label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  opacity: 0.7;
  line-height: 1.3;
}
.metric-value {
  font-size: 1.35rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-top: 0.25rem;
}
.metric-value.bad {
  color: rgb(var(--v-theme-warning));
}
.metric-value.good {
  color: rgb(var(--v-theme-success));
}
.metric-hint {
  font-size: 0.75rem;
  opacity: 0.65;
  margin-top: 0.2rem;
  line-height: 1.35;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgb(var(--v-theme-primary));
  line-height: 1.2;
}
.stat-label {
  font-size: 0.82rem;
  opacity: 0.75;
  margin-top: 0.3rem;
  line-height: 1.35;
}

.math-card {
  background: rgba(var(--v-theme-primary), 0.09);
  border-color: rgba(var(--v-theme-primary), 0.35);
}
.math-list {
  list-style: none;
  padding: 0;
  margin: 0 0 1rem;
}
.math-list li {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 0.55rem 0;
  border-bottom: 1px dashed rgba(255, 255, 255, 0.14);
}
.v-theme--light .math-list li {
  border-bottom-color: rgba(0, 0, 0, 0.12);
}
.math-list li:last-child {
  border-bottom: none;
}
.math-label {
  opacity: 0.85;
  line-height: 1.4;
}
.math-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
.math-value.strong {
  font-size: 1.1rem;
}
.math-value.bad {
  color: rgb(var(--v-theme-warning));
  font-size: 1.1rem;
}

.step-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.num {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.quote {
  font-style: italic;
  opacity: 0.9;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
