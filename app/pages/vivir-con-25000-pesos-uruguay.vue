<template>
  <VContainer class="lowwage-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">SUELDO</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Se puede vivir con 25.000 o 30.000 pesos por 9 horas?
      </h1>
      <p class="lead mb-6">
        La pregunta se hace todo el tiempo y casi siempre se contesta con anécdotas. Acá va con
        números: qué dice el decreto del mínimo, qué dice la ley de la jornada, qué encontramos
        cuando nos pusimos a leer los avisos uno por uno, y —porque quedarse en «no se puede» no le
        sirve a nadie— qué ingreso le corresponde de verdad a ese hogar y por qué puerta se pide.
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

      <div class="d-flex flex-wrap ga-2 mt-4">
        <VBtn color="primary" variant="flat" size="small" href="#apoyos">
          Qué te corresponde del Estado
        </VBtn>
        <VBtn variant="tonal" size="small" href="#arreglos">Con quién vivís cambia la cuenta</VBtn>
      </div>
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
        <VTable class="cu-mobile-cards cu-roomy" density="comfortable">
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
              <!-- data-label="" makes this the card's heading on a phone: the puesto is the
                   row's name, not one more «campo: valor». -->
              <td data-label="">
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
                <!-- El aviso que no declara jornada no se puede acusar de nada: 25.000 por media
                     jornada no incumple el mínimo. El chip lo dice en condicional.
                     Va envuelto porque «bajo el mínimo si es completa» es más ancho que cualquier
                     importe de la columna: suelto, es el chip el que decide el ancho de la columna
                     y el número deja de mandar. -->
                <div v-if="e.nominal < SMN_VIGENTE" class="chip-line">
                  <VChip size="x-small" color="warning" variant="tonal">
                    {{
                      declaraJornadaCompleta(e) ? 'bajo el mínimo' : 'bajo el mínimo si es completa'
                    }}
                  </VChip>
                </div>
              </td>
              <td data-label="Jornada declarada" class="cu-cell-prose">
                <span v-if="e.jornada" class="quote">«{{ e.jornada }}»</span>
                <span v-else class="text-medium-emphasis">El aviso no declara horario.</span>
                <div v-if="e.ventana" class="text-caption text-medium-emphasis mt-1">
                  Ventana: {{ formatHoras(e.ventana) }}
                </div>
              </td>
              <td data-label="Qué enseña" class="cu-cell-prose text-medium-emphasis">
                {{ e.lectura }}
              </td>
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
    </section>

    <!-- ── 6. Los arreglos ───────────────────────────────────────────────── -->
    <section id="arreglos" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Con quién vivís cambia más que cuánto ganás</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Vivir solo y alquilando es lo más caro que se puede hacer con este sueldo y, justamente por
        eso, es lo que menos gente de esta banda hace. Acá están los {{ cuantosArreglos }} arreglos
        que aparecen de verdad —pensión, habitación compartida, pareja con dos sueldos, pareja o
        hijo con uno solo, casa de la familia, interior— con la misma cuenta completa: vivienda,
        comida, servicios, boletos, salud y lo que queda para vivir. Se mueve con lo que pongas en
        la calculadora de arriba: hoy estás mirando
        <strong>{{ uyu(vida.liquido) }}</strong> líquidos por sueldo.
      </p>

      <VCard variant="flat" class="results-card pa-0 mb-4">
        <VTable class="cu-mobile-cards cu-roomy arreglos-table" density="comfortable">
          <thead>
            <tr>
              <th>Arreglo</th>
              <th class="text-right">Vivienda</th>
              <th class="text-right">Comida</th>
              <th class="text-right">Servicios</th>
              <th class="text-right">Total del mes</th>
              <th class="text-right">Te queda</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in arreglos" :key="a.arreglo.id">
              <td data-label="">
                <div class="arreglo-title">{{ a.arreglo.titulo }}</div>
                <div class="cu-cell-note text-medium-emphasis">{{ a.arreglo.quienes }}</div>
              </td>
              <td data-label="Vivienda" class="text-right num">
                {{ uyu(a.vivienda) }}
                <div class="cu-cell-note text-medium-emphasis">
                  {{
                    a.vivienda
                      ? `${Math.round(a.viviendaPctIngreso)} % del líquido`
                      : 'sin alquiler'
                  }}
                </div>
              </td>
              <td data-label="Comida" class="text-right num">{{ uyu(a.comida) }}</td>
              <td data-label="Servicios" class="text-right num">{{ uyu(a.servicios) }}</td>
              <td data-label="Total del mes" class="text-right num">
                {{ uyu(a.total) }}
                <div v-if="a.cargas > 1" class="cu-cell-note text-medium-emphasis">
                  para {{ a.cargas }} personas
                </div>
              </td>
              <td data-label="Te queda" class="text-right num">
                <div class="queda" :class="a.cierra ? 'text-success' : 'money-neg'">
                  {{ a.cierra ? uyu(a.sobra) : `− ${uyu(Math.abs(a.sobra))}` }}
                </div>
                <div class="cu-cell-note text-medium-emphasis">{{ sobraEnCosas(a) }}</div>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <!-- Lo que era idéntico en las ocho filas sale de la tabla y se dice una vez. -->
      <VCard variant="flat" class="fijos-card pa-5 pa-md-6 mb-4">
        <div class="text-overline mb-3">Lo mismo en todas las filas</div>
        <ul class="fijos-list mb-3">
          <li v-for="f in fijosComunes" :key="f.label">
            <span class="fijos-label">{{ f.label }}</span>
            <span class="fijos-value">{{ f.value }}</span>
          </li>
        </ul>
        <p class="fijos-note mb-0 text-medium-emphasis">
          Están sumados dentro de cada «total del mes», y en los hogares de dos con un solo ingreso
          la comida, la salud y los varios se cuentan dos veces; el boleto no, porque lo gasta quien
          va a trabajar. Salían de la tabla porque no cambiaban de fila en fila: repetirlos ocho
          veces ocupaba la columna más ancha para no decir nada.
        </p>
      </VCard>

      <VRow class="mb-2">
        <VCol cols="12" md="6">
          <VCard variant="flat" class="mech-card pa-5 h-100">
            <div class="text-overline mb-2">Lo que la tabla contesta</div>
            <p class="mb-3">{{ lecturaArreglos }}</p>
            <p class="mb-0 text-medium-emphasis">
              La segunda vara es del INE y mide otra cosa: el ingreso del hogar contra su línea de
              pobreza. Pasarla no quiere decir que alcance —es el umbral para no ser contado como
              pobre en una estadística—, y por eso las dos van juntas y separadas.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="mech-card pa-5 h-100">
            <div class="text-overline mb-2">La línea del INE, arreglo por arreglo</div>
            <ul class="linea-list mb-0">
              <li v-for="a in arreglos" :key="a.arreglo.id">
                <span class="linea-label">{{ a.arreglo.titulo }}</span>
                <span class="linea-value" :class="a.sobreLaLinea ? 'text-success' : 'money-neg'">
                  {{ uyu(a.ingresoHogar) }} / {{ uyu(a.lineaPobrezaHogar) }}
                </span>
              </li>
            </ul>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="sentinel-card pa-5 pa-md-6 mb-4">
        <div class="text-overline mb-2">Cuánto sale una pieza: lo medimos</div>
        <p class="mb-3">
          El alquiler de una vivienda entera lo publica el INE; el de una pieza no lo publica nadie,
          y es la vivienda real de esta banda. Así que leímos los avisos:
          {{ ROOM_MARKET.avisosUnicos }} avisos únicos de pensiones y habitaciones en alquiler en
          Montevideo, en
          <a :href="ROOM_MARKET.url" target="_blank" rel="noopener noreferrer">
            {{ ROOM_MARKET.fuente.split('—')[0].trim() }} </a
          >, el {{ roomMarketDate }}. Quedaron {{ ROOM_MARKET.muestra }} con un precio mensual
          legible en pesos.
        </p>
        <VRow class="mb-1">
          <VCol v-for="s in roomStats" :key="s.label" cols="6" md="3">
            <VCard variant="flat" class="stat-card pa-4 h-100">
              <div class="stat-value">{{ s.value }}</div>
              <div class="stat-label">{{ s.label }}</div>
            </VCard>
          </VCol>
        </VRow>
        <p class="mb-0 text-medium-emphasis">
          Los límites, como siempre al lado del número: son precios <em>pedidos</em>, no cerrados;
          es un portal, un día y una ciudad; y {{ ROOM_MARKET.residenciaEstudiantil }} de los
          {{ ROOM_MARKET.avisosEnPesos }} avisos en pesos se anuncian como residencia o pensión
          estudiantil, concentrados en {{ ROOM_MARKET.barriosMasFrecuentes.join(', ') }}. Sólo
          {{ ROOM_MARKET.aclaranServicios }} aclaran en el título si los servicios van incluidos:
          preguntá qué entra en el precio antes de firmar, que entre «todo incluido» y «más gastos»
          hay miles de pesos.
        </p>
      </VCard>

      <VExpansionPanels variant="accordion" class="supuestos-panel">
        <VExpansionPanel>
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">De dónde sale cada número de la tabla</div>
              <div class="text-caption text-medium-emphasis">
                Tres orígenes distintos, sin mezclarlos: datos publicados, medición propia y el
                modelo de referencia del sitio.
              </div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <ul class="supuestos-list">
              <li v-for="s in supuestos" :key="s.label">
                <strong>{{ s.label }}:</strong> {{ s.detalle }}
              </li>
            </ul>
            <p class="text-caption text-medium-emphasis mt-3 mb-0">
              Usamos el perfil <strong>austero</strong> del modelo a propósito: es el escenario más
              favorable a la respuesta «sí se puede». Si la cuenta no cierra ahí, no cierra.
            </p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>

      <p class="text-caption text-medium-emphasis mt-4 mb-0">
        Líneas de pobreza del hogar: INE, valores de {{ SURVIVAL_PERIODS.lineas }}. Alquiler
        promedio de contratos nuevos: INE, {{ SURVIVAL_PERIODS.alquiler }}. Mediana del ingreso per
        cápita del país ({{ SURVIVAL_PERIODS.ingresos }}):
        {{ uyu(INGRESO_PERCAPITA_MEDIANA.pais) }}. La línea de pobreza no es «lo que cuesta vivir
        bien»: es el umbral por debajo del cual el INE cuenta a un hogar como pobre.
      </p>
    </section>

    <!-- ── 7. Lo que pone el Estado ──────────────────────────────────────── -->
    <section id="apoyos" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que el Estado pone, y casi nadie pide</h2>
      <p class="section-intro text-medium-emphasis mb-5">
        Hasta acá la cuenta miró el sueldo solo, y así no cierra. Pero el sueldo no es todo el
        ingreso al que ese hogar tiene derecho: hay transferencias con ley y monto publicado, y
        tarifas sociales que bajan la factura sin trámite. Poné cómo es tu hogar y mirá qué te
        corresponde, cuánto es, y por qué puerta se pide. Todos los montos que siguen están
        publicados por BPS, MIDES, UTE u OSE, con su fecha de vigencia.
      </p>

      <VCard variant="flat" class="calc-card pa-5 pa-md-6 mb-6">
        <VRow dense>
          <VCol cols="6" md="3">
            <VSelect
              v-model.number="menores"
              :items="rango(0, 6)"
              label="Menores a cargo"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VSelect
              v-model.number="menoresEnMedia"
              :items="rango(0, menores)"
              label="De ésos, en liceo o UTU"
              density="comfortable"
              variant="outlined"
              hide-details
              :disabled="menores === 0"
            />
          </VCol>
          <VCol cols="6" md="3">
            <VSelect
              v-model.number="menores03"
              :items="rango(0, menores)"
              label="De ésos, de 0 a 3 años"
              density="comfortable"
              variant="outlined"
              hide-details
              :disabled="menores === 0"
            />
          </VCol>
          <VCol cols="6" md="3">
            <VSelect
              v-model.number="personasHogar"
              :items="rango(1, 8)"
              label="Personas en el hogar"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VSelect
              v-model.number="sueldosEnElHogar"
              :items="rango(1, 3)"
              label="Sueldos como ese"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="6" md="3">
            <VTextField
              v-model.number="facturaLuz"
              type="number"
              min="0"
              label="Luz por mes (opcional)"
              prefix="$"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" md="6" class="d-flex flex-column justify-center">
            <VSwitch
              v-model="calificaMides"
              color="primary"
              density="compact"
              hide-details
              label="El MIDES ya evaluó al hogar (cobrás TUS o AFAM del Plan de Equidad)"
            />
            <VSwitch
              v-if="calificaMides"
              v-model="tusDuplicada"
              color="primary"
              density="compact"
              hide-details
              label="La TUS es duplicada"
            />
          </VCol>
        </VRow>
      </VCard>

      <VRow class="mb-2">
        <VCol cols="12" md="5">
          <VCard variant="flat" class="math-card pa-5 pa-md-6 h-100 on-dark">
            <div class="text-overline mb-3">Por mes, además del sueldo</div>
            <p class="text-h4 font-weight-bold num mb-1">{{ uyu(plan.transferencias) }}</p>
            <p class="mb-4 text-medium-emphasis">
              {{
                plan.transferencias > 0
                  ? 'de plata en la mano: asignaciones y tarjeta, sin contar descuentos de tarifa.'
                  : 'no hay transferencias que este hogar pueda cobrar hoy. Abajo está por qué, y qué sí hay.'
              }}
            </p>
            <ul class="math-list mb-0">
              <li v-for="(l, i) in planLineas" :key="i">
                <span class="math-label">{{ l.label }}</span>
                <span class="math-value" :class="l.tone">{{ l.value }}</span>
              </li>
            </ul>
          </VCard>
        </VCol>
        <VCol cols="12" md="7">
          <VCard variant="flat" class="mech-card pa-5 pa-md-6 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">La misma resta, con los apoyos</h3>
            <p class="mb-3 text-medium-emphasis">{{ lecturaApoyos }}</p>
            <VAlert
              v-for="(a, i) in avisosApoyos"
              :key="i"
              :type="a.type"
              variant="tonal"
              density="comfortable"
              class="mb-2"
            >
              {{ a.text }}
            </VAlert>
          </VCard>
        </VCol>
      </VRow>

      <div v-for="grupo in apoyosAgrupados" :key="grupo.estado" class="mb-5">
        <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ grupo.titulo }}</h3>
        <p class="text-body-2 text-medium-emphasis mb-3">{{ grupo.bajada }}</p>
        <VExpansionPanels variant="accordion">
          <VExpansionPanel v-for="it in grupo.items" :key="it.apoyo.id">
            <VExpansionPanelTitle>
              <div class="w-100">
                <div class="d-flex flex-wrap align-center ga-2 mb-1">
                  <span class="font-weight-medium">{{ it.apoyo.nombre }}</span>
                  <VChip size="x-small" variant="tonal">{{ it.apoyo.organismo }}</VChip>
                  <VChip v-if="it.apoyo.automatico" size="x-small" color="success" variant="tonal">
                    sin trámite
                  </VChip>
                  <VChip v-if="it.monto > 0" size="x-small" color="primary" variant="flat">
                    {{ uyu(it.monto) }} / mes
                  </VChip>
                  <VChip v-if="it.apoyo.alerta" size="x-small" color="warning" variant="tonal">
                    con letra chica
                  </VChip>
                </div>
                <div class="text-caption text-medium-emphasis">{{ it.porQue }}</div>
              </div>
            </VExpansionPanelTitle>
            <VExpansionPanelText>
              <p class="mb-2"><strong>Qué da.</strong> {{ it.apoyo.da }}</p>
              <p class="mb-2"><strong>Quién califica.</strong> {{ it.apoyo.quien }}</p>
              <p class="mb-2"><strong>Cómo se pide.</strong> {{ it.apoyo.como }}</p>
              <p v-if="it.apoyo.alerta" class="mb-2 text-warning">
                <strong>Ojo.</strong> {{ it.apoyo.alerta }}
              </p>
              <a :href="it.apoyo.url" target="_blank" rel="noopener noreferrer">
                Ver la fuente oficial
              </a>
            </VExpansionPanelText>
          </VExpansionPanel>
        </VExpansionPanels>
      </div>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Dónde se toca el timbre</h3>
      <VRow>
        <VCol v-for="p in PUERTAS" :key="p.organismo" cols="12" md="6">
          <VCard variant="flat" class="mech-card pa-5 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <h4 class="text-subtitle-2 font-weight-bold mb-0">{{ p.organismo }}</h4>
              <VBtn
                :href="p.url"
                target="_blank"
                rel="noopener noreferrer"
                variant="text"
                size="x-small"
                class="px-1"
              >
                sitio oficial
              </VBtn>
            </div>
            <p class="mb-2 text-medium-emphasis">{{ p.para }}</p>
            <p class="mb-0 text-body-2">{{ p.como }}</p>
          </VCard>
        </VCol>
      </VRow>

      <p class="text-caption text-medium-emphasis mt-4 mb-0">
        Montos y requisitos contrastados el {{ apoyosVerifiedAt }}. Lo que esta calculadora no puede
        hacer, y ninguna puede: decirte si el MIDES va a calificar a tu hogar. Eso se resuelve con
        el Índice de Carencias Críticas, que pondera ingresos, vivienda, entorno, composición del
        hogar y situación sanitaria (Ley 18.227, artículo 2), y se mide en una visita. Por eso los
        programas que dependen de esa evaluación aparecen como «hay que pedir la evaluación» y no
        como un sí o un no.
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
        <VExpansionPanel v-for="f in FAQ_COMPLETA" :key="f.question">
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
        Normas y montos del sueldo y la jornada, contrastados el {{ verifiedAt }}; los de las
        prestaciones y tarifas sociales, el {{ apoyosVerifiedAt }}. El Salario Mínimo Nacional se
        ajusta por decreto, los laudos cambian en cada ronda de Consejos de Salarios y las
        prestaciones del BPS y del MIDES se actualizan cada enero: si estás leyendo esto mucho
        después, contrastá el monto antes de usarlo.
      </p>
      <ul class="sources-list">
        <li v-for="s in FUENTES_COMPLETAS" :key="s.url">
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
  BOLETO_STM,
  DESCANSO_INTERMEDIO,
  HORA_EXTRA,
  INGRESO_PERCAPITA_MEDIANA,
  LOWWAGE_FAQ,
  LOWWAGE_SOURCES,
  LOWWAGE_VERIFIED_AT,
  MECANISMOS,
  PRESUPUESTO_SUPUESTOS,
  QUE_HACER,
  ROOM_MARKET,
  SMN_HORA,
  SMN_VIGENTE,
  SURVIVAL_PERIODS,
  TRANSPORTE_MES,
  compararArreglos,
  declaraJornadaCompleta,
  equivalenciasOcio,
  esJornadaCompleta,
  fijosDelMes,
  jornadaBreakdown,
  smnCheck,
  survivalCheck,
  type ArregloCosto,
  type Rama,
} from '~/utils/lowWage'
import {
  APOYOS_FAQ,
  PUERTAS,
  STATE_SUPPORT_SOURCES,
  STATE_SUPPORT_VERIFIED_AT,
  conApoyos,
  planDeApoyos,
  type ApoyoResuelto,
  type EstadoApoyo,
} from '~/utils/stateSupport'

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

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

// ── Estado de la calculadora de apoyos. Arranca en el hogar que más aparece en la pregunta:
// una persona sola sin hijos, que es justamente el que el sistema casi no ve.
const menores = ref(0)
const menoresEnMedia = ref(0)
const menores03 = ref(0)
const personasHogar = ref(1)
const sueldosEnElHogar = ref(1)
const facturaLuz = ref(0)
const calificaMides = ref(false)
const tusDuplicada = ref(false)

const rango = (desde: number, hasta: number) =>
  Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, i) => desde + i)

// Los subconjuntos no pueden pasarse del total: si baja la cantidad de menores, bajan con ella.
watch(menores, n => {
  if (menoresEnMedia.value > n) menoresEnMedia.value = n
  if (menores03.value > n) menores03.value = n
  if (personasHogar.value < n + 1) personasHogar.value = n + 1
})

const plan = computed(() =>
  planDeApoyos({
    ingresoSalarialHogar: (nominal.value || 0) * sueldosEnElHogar.value,
    liquidoHogar: vida.value.liquido * sueldosEnElHogar.value,
    personasHogar: personasHogar.value,
    menores: menores.value,
    menoresEnMedia: menoresEnMedia.value,
    menores03: menores03.value,
    menoresConDiscapacidad: 0,
    embarazos: 0,
    calificaMides: calificaMides.value,
    tusDuplicada: tusDuplicada.value,
    facturaLuz: facturaLuz.value || 0,
  })
)

/** La misma cuenta de la sección anterior, pero con el hogar que se declaró acá. */
const vidaHogar = computed(() =>
  survivalCheck({
    nominal: nominal.value || 0,
    region: 'montevideo',
    personas: Math.min(Math.max(personasHogar.value, 1), 3) as 1 | 2 | 3,
    inquilino: true,
    ingresos: sueldosEnElHogar.value,
  })
)

const restaConApoyos = computed(() =>
  conApoyos(
    vidaHogar.value.ingresoHogar,
    vidaHogar.value.lineaPobreza,
    plan.value.transferencias + plan.value.ahorroTarifas
  )
)

const planLineas = computed(() => {
  const p = plan.value
  const out: { label: string; value: string; tone: string }[] = []
  const asignacion = calificaMides.value ? p.asignacion.monto : p.asignacion.contributiva.total
  out.push({
    label:
      p.asignacion.elegido === 'plan-equidad' && calificaMides.value
        ? 'Asignación familiar del Plan de Equidad'
        : 'Asignación familiar (la del trabajo)',
    value: asignacion > 0 ? uyu(asignacion) : '—',
    tone: asignacion > 0 ? 'strong' : '',
  })
  out.push({
    label: 'Tarjeta Uruguay Social',
    value: p.tus > 0 ? uyu(p.tus) : calificaMides.value ? '—' : 'hay que pedir la evaluación',
    tone: p.tus > 0 ? 'strong' : '',
  })
  out.push({
    label: 'Descuento de UTE (Bono Social)',
    value:
      p.descuentoUte > 0
        ? `− ${uyu(p.descuentoUte)}`
        : calificaMides.value
          ? 'poné tu factura'
          : 'no aplica sin MIDES',
    tone: p.descuentoUte > 0 ? 'strong' : '',
  })
  out.push({
    label: 'Total por mes',
    value: uyu(p.total),
    tone: p.total > 0 ? 'strong' : 'bad',
  })
  return out
})

const lecturaApoyos = computed(() => {
  const p = plan.value
  const r = restaConApoyos.value
  const hogar = `${personasHogar.value === 1 ? 'una persona' : `${personasHogar.value} personas`}${menores.value ? ` (${menores.value} ${menores.value === 1 ? 'menor' : 'menores'})` : ''}`
  const sueldos = sueldosEnElHogar.value === 1 ? 'un sueldo' : `${sueldosEnElHogar.value} sueldos`
  if (p.total <= 0) {
    return `Con ${hogar} en el hogar y ${sueldos} como ése, la red de transferencias no suma nada: el ingreso del hogar sigue en ${uyu(r.antes)} contra una línea de pobreza de ${uyu(r.lineaPobreza)} para ese hogar inquilino en Montevideo. No es un error del formulario: casi toda la red se abre por hijos a cargo o por la evaluación del MIDES.`
  }
  if (r.cruzaLaLinea) {
    return `Con ${hogar} en el hogar, los apoyos suman ${uyu(p.total)} por mes y el ingreso pasa de ${uyu(r.antes)} a ${uyu(r.despues)}: cruza la línea de pobreza que el INE publica para ese hogar (${uyu(r.lineaPobreza)}). Es exactamente la diferencia entre pedirlos y no pedirlos.`
  }
  if (r.yaEstaba) {
    return `Con ${hogar} en el hogar, los apoyos suman ${uyu(p.total)} por mes sobre un ingreso que ya estaba por encima de la línea del INE (${uyu(r.lineaPobreza)}): el margen pasa de ${uyu(r.margenAntes)} a ${uyu(r.margenDespues)}.`
  }
  return `Con ${hogar} en el hogar, los apoyos suman ${uyu(p.total)} por mes. El ingreso pasa de ${uyu(r.antes)} a ${uyu(r.despues)} y sigue por debajo de la línea de pobreza del INE para ese hogar (${uyu(r.lineaPobreza)}): acorta la distancia, no la cierra.`
})

const avisosApoyos = computed(() => {
  const p = plan.value
  const out: { type: 'error' | 'warning' | 'success' | 'info'; text: string }[] = []

  if (menores.value > 0 && !calificaMides.value) {
    out.push({
      type: 'info',
      text: `Con hijos a cargo, la asignación del BPS ya te corresponde por trabajar en la actividad privada, pero no llega sola: hay que solicitarla. Y si el hogar además califica por el Índice de Carencias Críticas, la del Plan de Equidad pagaría ${uyu(p.asignacion.planEquidad.total)} por mes en vez de ${uyu(p.asignacion.contributiva.total)}: son incompatibles, y el artículo 9 de la Ley 18.227 deja optar por la más alta en cualquier momento.`,
    })
  }

  if (menores.value > 0 && sueldosEnElHogar.value > 1 && p.asignacion.contributiva.franja === 2) {
    out.push({
      type: 'warning',
      text: `Ojo con el tope: la asignación contributiva mira la SUMA de los ingresos salariales del hogar. Con ${sueldos(sueldosEnElHogar.value)} de ${uyu(nominal.value || 0)} el hogar pasa los $ 50.502 del primer tramo y cada hijo cobra $ 674 en vez de $ 1.347.`,
    })
  }

  if (calificaMides.value && facturaLuz.value <= 0) {
    out.push({
      type: 'info',
      text: 'Poné lo que pagás de luz y la cuenta te dice cuánto es el Bono Social en pesos. No lo estimamos por vos: no hay factura promedio publicada que podamos usar sin inventarla.',
    })
  }

  const fga = p.items.find(i => i.apoyo.id === 'fga')
  if (fga?.estado === 'no-califica') {
    out.push({ type: 'warning', text: fga.porQue })
  }

  if (menores.value === 0 && !calificaMides.value) {
    out.push({
      type: 'info',
      text: 'Sin hijos a cargo y sin evaluación del MIDES queda el piso, que no es nada: carné de salud gratis en ASSE, cursos del INEFOP, licencia por estudio, y la consulta gratuita al MTSS por el laudo de tu categoría, que en esta banda es lo que más plata mueve.',
    })
  }

  return out
})

function sueldos(n: number): string {
  return n === 1 ? 'un sueldo' : `${n} sueldos`
}

const ESTADOS: { estado: EstadoApoyo; titulo: string; bajada: string }[] = [
  {
    estado: 'corresponde',
    titulo: 'Te corresponde',
    bajada:
      'Con lo que declaraste, esto sale de una norma vigente. Algunos se aplican solos; los demás hay que ir a pedirlos.',
  },
  {
    estado: 'evaluar',
    titulo: 'Hay que pedir la evaluación',
    bajada:
      'Depende de una medición que hace el organismo y que no se puede anticipar desde afuera. Lo honesto acá no es un número: es la puerta.',
  },
  {
    estado: 'no-califica',
    titulo: 'Hoy no',
    bajada: 'Queda afuera por un requisito concreto. Va con el motivo, que a veces cambia solo.',
  },
]

const apoyosAgrupados = computed(() =>
  ESTADOS.map(e => ({
    ...e,
    items: plan.value.items.filter((i: ApoyoResuelto) => i.estado === e.estado),
  })).filter(g => g.items.length > 0)
)

const apoyosVerifiedAt = fmtDate(STATE_SUPPORT_VERIFIED_AT)

/** Las preguntas de las dos secciones viajan juntas: una sola lista y un solo bloque de FAQ. */
const FAQ_COMPLETA = [...LOWWAGE_FAQ, ...APOYOS_FAQ]

const FUENTES_COMPLETAS = [...LOWWAGE_SOURCES, ...STATE_SUPPORT_SOURCES]

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

// ── Los arreglos, resueltos con el líquido que sale de la calculadora de arriba.
const arreglos = computed(() => compararArreglos(vida.value.liquido))

/** Cuántos son, dicho en letras. Se deriva del catálogo para que no vuelva a desfasarse. */
const cuantosArreglos = computed(() => {
  const n = arreglos.value.length
  const letras = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve']
  return letras[n] ?? String(n)
})

/**
 * Los importes que no cambian de una fila a otra. Salieron de la tabla porque repetirlos ocho veces
 * ocupaba la columna más ancha sin informar nada: el boleto toma dos valores en todo el cuadro y
 * salud y varios toman uno solo.
 */
const fijosComunes = computed(() => {
  const mvd = fijosDelMes('montevideo')
  const int = fijosDelMes('interior')
  return [
    {
      label: 'Boletos',
      value: `${uyu(mvd.transporte)} · en el interior ${uyu(int.transporte)}`,
    },
    { label: 'Salud (copagos)', value: uyu(mvd.salud) },
    { label: 'Higiene, limpieza y ropa básica', value: uyu(mvd.varios) },
    {
      label: 'Comer al piso del INE, en vez del presupuesto austero',
      value: `${uyu(mvd.comidaPisoINE)} · en el interior ${uyu(int.comidaPisoINE)}`,
    },
  ]
})

/** Lo que sobra (o falta) dicho en cosas que tienen precio publicado. */
function sobraEnCosas(a: ArregloCosto): string {
  const eq = equivalenciasOcio(a.sobra, a.arreglo.region)
  if (a.cierra) {
    return eq.boletos > 0
      ? `${eq.boletos} boletos, o ${eq.diasDeComida} días de comida`
      : 'no queda nada'
  }
  return `faltan ${eq.diasDeComida} días de comida`
}

const lecturaArreglos = computed(() => {
  const cierran = arreglos.value.filter(a => a.cierra)
  const masBarato = arreglos.value[arreglos.value.length - 1]
  if (!cierran.length) {
    return `Con ${uyu(vida.value.liquido)} en la mano no cierra ninguno de los ${cuantosArreglos.value}, ni el más barato (${masBarato?.arreglo.titulo.toLowerCase()}, ${uyu(masBarato?.total ?? 0)} por mes). Eso es la resta, no una opinión: para que cierre tiene que entrar otro ingreso al hogar, desaparecer el alquiler, o subir el sueldo.`
  }
  const nombres = cierran.map(a => a.arreglo.titulo.toLowerCase()).join(' y ')
  return `Con ${uyu(vida.value.liquido)} en la mano cierra ${cierran.length === 1 ? 'un solo arreglo' : `${cierran.length} de los ${cuantosArreglos.value}`}: ${nombres}. En los demás la resta da negativa, y la diferencia entre uno y otro es casi toda vivienda: es el gasto que se puede partir con alguien, y el único que se puede llevar a cero.`
})

const roomMarketDate = fmtDate(ROOM_MARKET.fecha)

const roomStats = [
  { value: uyu(ROOM_MARKET.pension.mediana), label: 'mediana de una pensión' },
  { value: uyu(ROOM_MARKET.habitacion.mediana), label: 'mediana de una habitación' },
  {
    value: `${uyu(ROOM_MARKET.p25)} – ${uyu(ROOM_MARKET.p75)}`,
    label: 'mitad del mercado (p25 a p75)',
  },
  { value: String(ROOM_MARKET.muestra), label: 'avisos con precio legible' },
]

const supuestos = [
  {
    label: 'Vivienda',
    detalle: `Cada arreglo trae el suyo y dice de dónde sale: el promedio de contratos nuevos del INE (${SURVIVAL_PERIODS.alquiler}) para una vivienda entera, y nuestra medición de avisos del ${roomMarketDate} para la pieza y la pensión.`,
  },
  {
    label: 'Comida',
    detalle: `${uyu(Math.round(PRESUPUESTO_SUPUESTOS.comidaPorAdulto * PRESUPUESTO_SUPUESTOS.factorComida))} por persona, que es el perfil austero del modelo de referencia del sitio. El piso publicado es otra cosa: la Canasta Básica Alimentaria del INE, ${uyu(PRESUPUESTO_SUPUESTOS.comidaPisoINE)} per cápita en Montevideo (${PRESUPUESTO_SUPUESTOS.periodoCanastas}), que es la línea de indigencia, no un presupuesto.`,
  },
  {
    label: 'Servicios',
    detalle: `Luz, agua, internet, celular y parte de gastos comunes: ${uyu(PRESUPUESTO_SUPUESTOS.serviciosBase)} por vivienda. Qué fracción te toca depende del arreglo y es un supuesto nuestro, escrito en cada fila.`,
  },
  {
    label: 'Transporte',
    detalle: `${uyu(TRANSPORTE_MES)}: ${BOLETO_STM.viajesPorDia} boletos por día, ${BOLETO_STM.diasPorMes} días, a ${uyu(BOLETO_STM.conTarjeta)} el boleto de una hora con tarjeta STM (Intendencia de Montevideo, vigente desde el 5 de enero de 2026). Sin tarjeta son ${uyu(BOLETO_STM.enEfectivo)} y el mes sale ${uyu(BOLETO_STM.enEfectivo * BOLETO_STM.viajesPorDia * BOLETO_STM.diasPorMes)}.`,
  },
  {
    label: 'Salud y limpieza',
    detalle: `${uyu(PRESUPUESTO_SUPUESTOS.saludPorPersona)} de copagos —el FONASA ya te descuenta la cuota del sueldo— y ${uyu(Math.round(PRESUPUESTO_SUPUESTOS.variosPorPersona * PRESUPUESTO_SUPUESTOS.factorVarios))} de higiene, limpieza y ropa básica.`,
  },
  {
    label: 'Lo que NO está',
    detalle:
      'Deudas, mascotas, mudanza, depósito y garantía de alquiler, ropa de trabajo, estudio, y cualquier gasto de salir. El hogar de dos con un solo ingreso sí está, pero contando al segundo integrante como un adulto más: no tenemos una equivalencia publicada que distinga a un chico. Las asignaciones familiares y las tarifas sociales tampoco están sumadas acá: viven en la sección siguiente, porque dependen de cuántos menores hay y de si el MIDES evaluó al hogar, y meterlas en esta tabla sería promediar dos hogares distintos. Es un presupuesto de sobrevivir, no de vivir: por eso la última columna se llama «te queda» y no «ahorro».',
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

const verifiedAt = fmtDate(LOWWAGE_VERIFIED_AT)
const censusDate = fmtDate(BOARD_CENSUS.fecha)

const canonicalUrl = 'https://cambio-uruguay.com/vivir-con-25000-pesos-uruguay'
const title =
  'Cómo vivir con 25.000 o 30.000 pesos en Uruguay: la cuenta y las ayudas que te corresponden'
const description = `Guía para vivir con un sueldo de 25.000 a 30.000 pesos en Uruguay. Qué dice la ley de la jornada y del mínimo (${SMN_VIGENTE} pesos desde julio de 2026), cuánto queda líquido, cuánto sale una pensión o una habitación, y sobre todo qué ingreso le corresponde a ese hogar además del sueldo: asignación familiar del BPS y del Plan de Equidad, Tarjeta Uruguay Social, el Bono Social de UTE que descuenta hasta el 90 % de la luz, la tarifa social de OSE y los comedores del INDA, con montos oficiales y cómo se piden.`

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
        'se puede vivir con 25000 pesos uruguay, como vivir con el salario minimo uruguay, sueldo 25000 uruguay, 30000 pesos por 9 horas, salario minimo nacional 2026, ayudas del mides para trabajadores, asignaciones familiares bps monto 2026, plan de equidad monto 2026, tarjeta uruguay social requisitos, bono social ute descuento luz, tarifa social ose, comedores inda, jornada de 9 horas uruguay, cuanto queda liquido de 25000',
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
            mainEntity: FAQ_COMPLETA.map(f => ({
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
  border-radius: 12px;
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
  font-size: 1.25rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  margin-top: 0.25rem;
}
/* El ámbar de `warning` es un color de RELLENO: como texto sobre blanco mide 2,3:1 y no llega a
   AA. Sobre las superficies normales, en tema claro, se usa el rojo del tema (#bf360c, ~6,4:1);
   en oscuro el ámbar sí pasa y se queda. La cifra del math-card queda afuera a propósito: ese
   bloque es `.on-dark`, o sea que su fondo NO se aclara con el tema. */
.metric-value.bad,
.money-neg {
  color: rgb(var(--v-theme-warning));
}
.v-theme--light .metric-value.bad,
.v-theme--light .money-neg {
  color: rgb(var(--v-theme-error));
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
  border-bottom: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity, 0.14));
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
/* El desglose de una celda numérica sí envuelve: es texto, no un número. El ritmo vertical y la
   alineación de estas notas los pone `cu-roomy` en assets/css/responsive-tables.css, que es una
   regla compartida: cualquier tabla densa la hereda agregando la clase. */
.num .text-caption,
.num .cu-cell-note {
  white-space: normal;
}
.cu-cell-note {
  font-size: 0.8rem;
  line-height: 1.45;
}
/* El chip cuelga del número en su propia línea y con su propio ancho, para que la etiqueta larga
   no estire la columna. `white-space: normal` porque .num la fija en nowrap. */
.chip-line {
  margin-top: 0.35rem;
  white-space: normal;
}
.chip-line :deep(.v-chip) {
  height: auto;
  min-height: 20px;
  padding-block: 2px;
}

/* La primera columna es el nombre de la fila: manda, y necesita medida propia para no partir
   «En pareja o con un hijo, trabajando uno solo» en cinco líneas. Abajo de 600px las filas ya son
   tarjetas (cu-mobile-cards), así que un ancho mínimo ahí sólo podría desbordar un teléfono. */
@media (min-width: 600px) {
  .arreglos-table :deep(th:first-child),
  .arreglos-table :deep(td:first-child) {
    min-width: 250px;
    max-width: 34ch;
  }
}
.arreglo-title {
  font-weight: 600;
  line-height: 1.35;
  text-wrap: pretty;
}
/* El final de la lectura de cada fila. Respira y se lee sin buscarlo:
   DESIGN.md, The Number Breathes Rule. */
.queda {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.25;
}

.fijos-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .fijos-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
/* Dos columnas y no tres: con `minmax(280px, …)` entraban tres y el cuarto ítem —el de etiqueta
   más larga— quedaba huérfano en una fila para él solo. A 400px la grilla se resuelve en 2×2 en
   desktop y en una sola columna abajo de ~880px. */
.fijos-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.15rem 2.5rem;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
}
.fijos-list li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  min-width: 0;
  padding: 0.55rem 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity, 0.14));
}
.fijos-label {
  min-width: 0;
  opacity: 0.85;
  line-height: 1.35;
}
.fijos-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}
.fijos-note {
  margin-top: 1rem;
  max-width: 72ch;
  font-size: 0.95rem;
  line-height: 1.6;
}

.linea-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.linea-list li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: 0.4rem 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity, 0.14));
}
.linea-list li:last-child {
  border-bottom: none;
}
.linea-label {
  min-width: 0;
  opacity: 0.85;
  line-height: 1.35;
}
.linea-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}

.supuestos-list {
  padding-left: 1.1rem;
  margin: 0;
  line-height: 1.6;
}
.supuestos-list li + li {
  margin-top: 0.6rem;
}
.quote {
  font-style: italic;
  opacity: 0.9;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.875rem;
  line-height: 1.8;
}
</style>
