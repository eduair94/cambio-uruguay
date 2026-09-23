<!--
  THESIS: Alguien que hoy va al trabajo en ómnibus quiere saber si le conviene comprar un monopatín,
  una bici eléctrica, una moto o un auto usado. Ninguna página uruguaya junta las dos mitades: el
  precio real de cada vehículo HOY y el costo de TENERLO, contra lo que sale el boleto. Se contesta
  con el costo acumulado mes a mes —donde se ve el cruce— y, cuando no hay cruce, con la única cifra
  honesta que queda: cuánto sale la hora que ganás.
  OWN-WORLD: Mismas superficies que /conviene-comprar-en-cuotas y /plan-de-vida-uruguay — veredicto
  arriba, calculadora, desglose firmado, tabla de cifras con fuente y fecha.
  FAMILY: Sólo español (ómnibus, STM, patente y SUCIVE son realidades uruguayas): el canonical es
  literal, sin prefijo de idioma, aunque la ruta exista bajo /en/ y /pt/ por `prefix_except_default`.
-->
<template>
  <VContainer class="transporte-page py-6 py-md-10">
    <header class="tp-header">
      <h1>¿Conviene comprar un auto, una moto o seguir en ómnibus?</h1>
      <p class="lead">
        La cuenta completa de moverte todos los días en Montevideo: ómnibus, a pie, monopatín
        eléctrico, bicicleta eléctrica, moto y auto usado. Precio de compra, seguro, patente,
        energía, mantenimiento, lluvia y robo, contra lo que sale el boleto — y el tiempo puerta a
        puerta de cada uno.
      </p>
      <p v-if="builtAtLabel" class="as-of">
        Precios relevados el {{ builtAtLabel }}. Los supuestos curados están abajo, cada uno con su
        fecha y su fuente.
      </p>
    </header>

    <!-- ── El veredicto, antes de cualquier control ───────────────────────── -->
    <section class="tp-section" aria-labelledby="veredicto-title">
      <h2 id="veredicto-title">El veredicto, con tu trayecto</h2>
      <VCard class="verdict-card pa-4 pa-sm-6" variant="outlined">
        <p class="verdict-kicker">
          Con {{ formatNumber(effectiveScenario.distanceKm, 1) }} km de ida,
          {{ effectiveScenario.daysPerWeek }}
          {{ effectiveScenario.daysPerWeek === 1 ? 'día' : 'días' }} por semana y un horizonte de
          {{ effectiveScenario.horizonMonths }} meses:
        </p>

        <div class="verdict-grid">
          <article
            v-for="cell in headlineVerdicts"
            :key="cell.mode"
            class="verdict-cell"
            :data-testid="`veredicto-${cell.mode}`"
          >
            <div class="vc-top">
              <VIcon :icon="cell.icon" size="20" />
              <span class="vc-mode">{{ cell.label }}</span>
            </div>
            <!-- El estado va como punto + palabra, nunca sólo como color: un tono no se lee, y en
                 modo oscuro o con daltonismo deja de existir. -->
            <p class="vc-headline">
              <span class="vc-dot" :class="`is-${cell.tone}`" aria-hidden="true" />{{
                cell.headline
              }}
            </p>
            <p class="vc-figure">{{ cell.figure ?? '—' }}</p>
            <p class="vc-detail">{{ cell.detail }}</p>
          </article>
        </div>

        <VAlert
          v-if="busFareMissing"
          type="warning"
          variant="tonal"
          density="comfortable"
          class="mt-4"
        >
          Sin el precio del boleto no hay contra qué comparar: se publican los costos de cada modo,
          pero no el veredicto.
        </VAlert>
        <VAlert v-if="data.notice" type="info" variant="tonal" density="comfortable" class="mt-4">
          {{ data.notice }}
        </VAlert>
      </VCard>
    </section>

    <!-- ── La regla, en prosa ─────────────────────────────────────────────── -->
    <section class="tp-section" aria-labelledby="regla-title">
      <h2 id="regla-title">Qué se está comparando</h2>
      <p class="tp-p">
        El costo de un vehículo no es una cuota mensual. Es plata que ponés adelante, plata que
        pagás todos los meses, y valor que recuperás cuando lo vendés. Por eso acá todo se calcula
        como
        <strong>costo acumulado mes a mes, ya descontado lo que el vehículo todavía vale</strong>, y
        el «costo por mes» es ese acumulado dividido por el horizonte que elijas. Es lo único que
        permite compararlo contra el ómnibus, que no tiene ni inversión ni reventa.
      </p>
      <p class="tp-p">
        El ómnibus es la referencia porque es el único modo que ya tenés disponible sin poner un
        peso. Si un modo cruza por debajo de su curva, hay <strong>punto de equilibrio</strong> y se
        publica en meses. Si no la cruza nunca —el caso del auto, casi siempre— la respuesta
        correcta no es «no conviene» sino <strong>cuánto te sale la hora que ganás</strong>:
        comparala contra lo que ganás vos por hora. Y si un modo es más caro <em>y</em> más lento,
        lo decimos sin vueltas y no calculamos ninguna de las dos.
      </p>
    </section>

    <!-- ── La calculadora ─────────────────────────────────────────────────── -->
    <section class="tp-section" aria-labelledby="calc-title">
      <h2 id="calc-title">Tu trayecto</h2>

      <VCard class="pa-4 pa-sm-6" variant="outlined">
        <VRow>
          <VCol cols="12" md="7">
            <div class="field-group">
              <span class="cv-label">¿Cómo querés declarar el trayecto?</span>
              <VBtnToggle
                v-model="trayecto"
                mandatory
                density="comfortable"
                color="primary"
                class="seg-toggle"
                data-testid="modo-trayecto"
              >
                <VBtn value="barrio" class="seg-btn">Elegir barrios</VBtn>
                <VBtn value="km" class="seg-btn">Escribir los km</VBtn>
                <VBtn value="direccion" class="seg-btn">Direcciones exactas</VBtn>
              </VBtnToggle>
            </div>

            <!-- Barrios del relevamiento -->
            <template v-if="trayecto === 'barrio'">
              <VRow v-if="zoneItems.length" dense>
                <VCol cols="12" sm="6">
                  <VAutocomplete
                    v-model="desde"
                    :items="zoneItems"
                    label="Desde"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    data-testid="zona-desde"
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VAutocomplete
                    v-model="hasta"
                    :items="zoneItems"
                    label="Hasta"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    data-testid="zona-hasta"
                  />
                </VCol>
              </VRow>
              <VAlert v-else type="info" variant="tonal" density="comfortable" class="mt-2">
                Todavía no relevamos rutas entre barrios. Escribí los kilómetros a mano: la
                comparación se hace igual.
              </VAlert>
              <p v-if="pairMissingLabel" class="field-note">{{ pairMissingLabel }}</p>
            </template>

            <!-- Kilómetros a mano -->
            <template v-else-if="trayecto === 'km'">
              <VTextField
                v-model.number="scenario.distanceKm"
                label="Kilómetros de ida"
                type="number"
                step="0.5"
                suffix="km"
                variant="outlined"
                density="comfortable"
                hint="Los tiempos salen de la velocidad de crucero declarada de cada modo, no de una ruta medida."
                persistent-hint
                data-testid="input-km"
              />
            </template>

            <!-- Direcciones exactas -->
            <template v-else>
              <VRow dense>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="direccionDesde"
                    label="Dirección de origen"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    data-testid="direccion-desde"
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model="direccionHasta"
                    label="Dirección de destino"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    data-testid="direccion-hasta"
                  />
                </VCol>
              </VRow>
              <div class="d-flex align-center ga-3 mt-3 flex-wrap">
                <VBtn
                  color="primary"
                  variant="flat"
                  :loading="rutaCargando"
                  data-testid="calcular-ruta"
                  @click="calcularRuta"
                >
                  Calcular la ruta
                </VBtn>
                <span v-if="ruta?.ok" class="field-note">
                  {{ ruta.from?.label }} → {{ ruta.to?.label }}
                </span>
              </div>
              <VAlert
                v-if="ruta && !ruta.ok && ruta.reason"
                type="warning"
                variant="tonal"
                density="comfortable"
                class="mt-3"
              >
                {{ ruta.reason }}
              </VAlert>
              <p class="field-note">
                Es la única consulta que esta página le hace a un servicio externo en el momento. El
                tiempo del ómnibus no sale de acá: se arma con los horarios del STM, que son por
                parada y no por dirección.
              </p>
            </template>

            <VDivider class="my-5" />

            <div class="field-group">
              <span class="cv-label"> Días por semana: {{ scenario.daysPerWeek }} </span>
              <VSlider
                v-model="scenario.daysPerWeek"
                :min="1"
                :max="7"
                :step="1"
                thumb-label
                color="primary"
                density="compact"
                hide-details
                data-testid="input-dias"
              />
            </div>

            <div class="field-group">
              <span class="cv-label">Viajes por día</span>
              <VBtnToggle
                v-model="scenario.tripsPerDay"
                mandatory
                density="comfortable"
                color="primary"
                class="seg-toggle"
              >
                <VBtn :value="2" class="seg-btn">Ida y vuelta</VBtn>
                <VBtn :value="4" class="seg-btn">Vuelvo a almorzar</VBtn>
              </VBtnToggle>
            </div>

            <div class="field-group">
              <span class="cv-label">
                Horizonte de la comparación: {{ scenario.horizonMonths }} meses
              </span>
              <VSlider
                v-model="scenario.horizonMonths"
                :min="TRANSPORT_SCENARIO_LIMITS.horizonMonths.min"
                :max="TRANSPORT_SCENARIO_LIMITS.horizonMonths.max"
                :step="6"
                thumb-label
                color="primary"
                density="compact"
                hide-details
                data-testid="input-horizonte"
              />
            </div>

            <div class="field-group">
              <span class="cv-label">¿Cómo lo pagarías?</span>
              <VBtnToggle
                v-model="scenario.financing"
                mandatory
                density="comfortable"
                color="primary"
                class="seg-toggle"
              >
                <VBtn value="contado" class="seg-btn">Contado</VBtn>
                <VBtn value="cuotas" class="seg-btn">En cuotas</VBtn>
              </VBtnToggle>
              <VTextField
                v-if="scenario.financing === 'cuotas'"
                v-model.number="scenario.financingMonths"
                label="Cantidad de cuotas"
                type="number"
                step="1"
                variant="outlined"
                density="comfortable"
                class="mt-3"
                :hint="teaHint"
                persistent-hint
              />
            </div>

            <div class="field-group">
              <VTextField
                v-model.number="wageInput"
                label="Lo que ganás por hora (opcional)"
                prefix="$"
                type="number"
                step="10"
                variant="outlined"
                density="comfortable"
                hint="Sólo para traducir a plata las horas que ganás o perdés. Apagado por defecto: la página no le pone precio a tu tiempo sin que vos lo digas."
                persistent-hint
                data-testid="input-sueldo"
              />
            </div>

            <div class="switch-grid">
              <VSwitch
                v-model="scenario.alreadyOwned"
                color="primary"
                density="compact"
                hide-details
                label="Ya tengo el vehículo"
              />
              <VSwitch
                v-model="scenario.parkingPaid"
                color="primary"
                density="compact"
                hide-details
                label="El destino está en zona tarifada"
              />
              <VSwitch
                v-model="scenario.includeDepreciation"
                color="primary"
                density="compact"
                hide-details
                label="Contar la pérdida de valor"
              />
              <VSwitch
                v-model="scenario.includeTheftRisk"
                color="primary"
                density="compact"
                hide-details
                label="Contar el riesgo de robo"
              />
              <VSwitch
                v-model="scenario.includeRain"
                color="primary"
                density="compact"
                hide-details
                label="Contar los días de lluvia"
              />
            </div>

            <div class="preset-row">
              <span class="cv-label">Casos típicos</span>
              <div class="preset-chips">
                <VChip
                  v-for="preset in TRANSPORT_SCENARIO_PRESETS"
                  :key="preset.slug"
                  link
                  size="small"
                  variant="tonal"
                  class="mr-2 mb-2"
                  @click="aplicarPreset(preset.slug)"
                >
                  {{ preset.label }}
                </VChip>
              </div>
            </div>
          </VCol>

          <!-- Panel de resultado -->
          <VCol cols="12" md="5">
            <div class="result-panel">
              <p class="rp-title">Costo por mes, de menor a mayor</p>
              <ul class="rp-list">
                <li v-for="row in sortedModes" :key="row.mode" class="rp-row">
                  <VIcon :icon="TRANSPORT_VIEW_MODE_ICONS[row.mode]" size="18" class="rp-icon" />
                  <span class="rp-label">{{ row.label }}</span>
                  <span v-if="row.available" class="rp-value">
                    {{ transportViewMoney(row.monthlyAverageUyu) }}
                  </span>
                  <span v-else class="rp-empty">sin datos</span>
                </li>
              </ul>
              <p class="rp-foot">
                {{ formatNumber(result.tripsPerMonth, 0) }} viajes por mes ·
                {{ formatNumber(result.kmPerMonth, 0) }} km por mes.
              </p>
              <VBtn v-if="hasOverrides" size="small" variant="text" @click="resetOverrides">
                Volver a los supuestos publicados
              </VBtn>
            </div>
          </VCol>
        </VRow>
      </VCard>
    </section>

    <!-- ── El gráfico del cruce ───────────────────────────────────────────── -->
    <section class="tp-section" aria-labelledby="grafico-title">
      <h2 id="grafico-title">Cuánto llevás gastado, mes a mes</h2>
      <p class="section-intro">
        Cada línea es la plata acumulada de ese modo, ya descontado lo que el vehículo todavía vale.
        Donde una línea cruza por debajo de la del ómnibus, ese modo se pagó. Si nunca la cruza,
        nunca se paga: lo que compra es tiempo.
      </p>
      <div v-if="chart" class="chart-wrap">
        <ClientOnly>
          <ChartsLineChart
            :key="chartKey"
            :chart-data="chart"
            :options="chartOptions"
            aria-label="Costo acumulado por modo de transporte, mes a mes"
          />
          <template #fallback>
            <VSkeletonLoader type="image" />
          </template>
        </ClientOnly>
      </div>
      <p v-else class="empty-note">
        Hace falta al menos un modo con precio relevado, además del ómnibus, para dibujar el cruce.
      </p>
    </section>

    <!-- ── La comparativa completa ────────────────────────────────────────── -->
    <section class="tp-section" aria-labelledby="tabla-title">
      <h2 id="tabla-title">Modo por modo</h2>
      <VTable class="cu-mobile-cards compare-table" density="compact">
        <thead>
          <tr>
            <th>Modo</th>
            <th class="text-right">Por mes</th>
            <th class="text-right">Por viaje</th>
            <th class="text-right">Por km</th>
            <th class="text-right">Puerta a puerta</th>
            <th class="text-right">Contra el ómnibus</th>
            <th>Veredicto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in sortedModes" :key="row.mode">
            <td data-label="Modo">
              <VIcon :icon="TRANSPORT_VIEW_MODE_ICONS[row.mode]" size="18" class="mr-1" />
              {{ row.label }}
            </td>
            <template v-if="row.available">
              <td data-label="Por mes" class="text-right money">
                {{ transportViewMoney(row.monthlyAverageUyu) }}
              </td>
              <td data-label="Por viaje" class="text-right">
                {{ transportViewMoney(row.perTripUyu, 1) }}
              </td>
              <td data-label="Por km" class="text-right">
                {{ transportViewMoney(row.perKmUyu, 2) }}
              </td>
              <td data-label="Puerta a puerta" class="text-right">
                {{ transportViewMinutes(row.doorToDoorMinutes) }}
                <span v-if="row.mode === 'moto'" class="td-note">ruta de auto</span>
              </td>
              <td data-label="Contra el ómnibus" class="text-right">
                <template v-if="row.mode === 'omnibus'">referencia</template>
                <template v-else>{{ transportViewHoursPerYear(row.hoursPerYearVsBus) }}</template>
              </td>
              <td data-label="Veredicto">
                {{ transportViewVerdict(row, effectiveScenario, referenceMonthly).headline }}
              </td>
            </template>
            <template v-else>
              <td data-label="Estado" colspan="6" class="empty-cell">
                {{ row.unavailableReason }}
              </td>
            </template>
          </tr>
        </tbody>
      </VTable>
      <p v-if="timeIsEstimated" class="field-note">
        {{ timeIsEstimated }}
      </p>
      <p v-for="source in attribution" :key="source.url" class="field-note">
        <a :href="source.url" target="_blank" rel="noopener">{{ source.label }}</a>
      </p>
    </section>

    <!-- ── El desglose firmado ────────────────────────────────────────────── -->
    <section class="tp-section" aria-labelledby="desglose-title">
      <h2 id="desglose-title">De dónde sale cada peso</h2>
      <VExpansionPanels variant="accordion" multiple>
        <VExpansionPanel v-for="row in availableModes" :key="row.mode">
          <VExpansionPanelTitle>
            {{ row.label }} — {{ transportViewMoney(row.monthlyAverageUyu) }} por mes
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <VTable class="cu-mobile-cards bd-table" density="compact">
              <tbody>
                <tr
                  v-for="line in transportViewMonthlyRows(row, effectiveScenario)"
                  :key="line.id"
                  :class="`is-${line.kind}`"
                >
                  <td data-label="Concepto">
                    <VTooltip :text="line.hint" location="top" max-width="340">
                      <template #activator="{ props: tip }">
                        <span v-bind="tip" class="bd-label">{{ line.label }}</span>
                      </template>
                    </VTooltip>
                  </td>
                  <td data-label="Por mes" class="text-right money">
                    {{ transportViewMoney(line.value) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
            <p v-if="row.price" class="field-note">
              Precio de referencia: {{ transportViewMoney(row.price.referenceUyu) }} ({{
                row.price.condition
              }}, {{ row.price.offers }} avisos relevados<template v-if="row.price.asOf">
                al {{ transportViewDate(row.price.asOf) }}</template
              >). Banda del catálogo: {{ transportViewMoney(row.price.p25Uyu) }} a
              {{ transportViewMoney(row.price.p75Uyu) }}.
            </p>
            <p v-for="warning in row.warnings" :key="warning" class="field-note is-warning">
              {{ warning }}
            </p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- ── La siniestralidad, como eje propio ─────────────────────────────── -->
    <section class="tp-section" aria-labelledby="riesgo-title">
      <h2 id="riesgo-title">El riesgo vial no se convierte a pesos</h2>
      <p class="tp-p">
        Es la única fricción que cuantificamos y <strong>no sumamos</strong>. Ponerle precio a tu
        vida para que cierre la cuenta de la moto es indefendible, y una cifra inventada ahí
        contaminaría todo lo demás. Van los fallecidos que publica UNASEV y, donde existe parque
        publicado, la tasa por cada 100.000 vehículos — que es un <strong>cruce nuestro</strong> y
        no una cifra oficial: ninguna de las dos fuentes publica el cociente.
      </p>
      <VTable class="cu-mobile-cards risk-table" density="compact">
        <thead>
          <tr>
            <th>Modo</th>
            <th class="text-right">Fallecidos en 2025</th>
            <th class="text-right">Cada 100.000 vehículos</th>
            <th>Cómo leerlo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in safetyRows" :key="row.mode">
            <td data-label="Modo">{{ row.label }}</td>
            <td data-label="Fallecidos en 2025" class="text-right">
              {{ row.fatalities == null ? 'sin desagregar' : formatNumber(row.fatalities, 0) }}
            </td>
            <td data-label="Cada 100.000 vehículos" class="text-right">
              {{ row.per100k == null ? 'sin tasa' : formatNumber(row.per100k, 1) }}
            </td>
            <td data-label="Cómo leerlo" class="risk-note">{{ row.note }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="field-note">
        {{ transportViewFigureCaption(TRANSPORT_ASSUMPTIONS.byMode.moto.fatalities) }} ·
        {{ formatNumber(TRANSPORT_CONTEXT_FIGURES.lesionadosGravesMoto.value, 0) }} lesionados
        graves en 2025, de los cuales el 75 % iban en moto.
      </p>
    </section>

    <!-- ── Los supuestos, visibles y editables ────────────────────────────── -->
    <section class="tp-section" aria-labelledby="supuestos-title">
      <h2 id="supuestos-title">Los supuestos (podés cambiarlos)</h2>
      <p class="section-intro">
        Todo lo que no publica ningún catálogo del sitio está acá, con su valor, su fecha y el
        enlace a quien lo publica. Si cambiás uno, la cuenta de arriba se rehace y la cifra pasa a
        figurar como tuya. Lo que el sitio declara como «no existe» no se puede completar desde acá:
        no hay tabla nacional de patente para una moto de menos de 500 cc, así que la moto va sin
        patente en la cuenta y el importe se consulta por matrícula.
      </p>

      <VExpansionPanels variant="accordion" multiple>
        <VExpansionPanel v-for="grupo in assumptionGroups" :key="grupo.id">
          <VExpansionPanelTitle>{{ grupo.label }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <div v-for="row in grupo.rows" :key="row.path" class="as-row">
              <VTextField
                v-model="assumptionInput[row.path]"
                :label="row.label"
                :suffix="row.unit"
                type="number"
                :step="row.step"
                variant="outlined"
                density="compact"
                hide-details
              />
              <p class="as-source">
                {{ row.caption }} —
                <a :href="row.url" target="_blank" rel="noopener">ver la fuente</a>
              </p>
              <p v-if="row.note" class="as-note">{{ row.note }}</p>
            </div>
            <VAlert
              v-if="grupo.id === 'moto'"
              type="warning"
              variant="tonal"
              density="comfortable"
              class="mt-4"
            >
              Sin patente en la cuenta: el Texto Ordenado del SUCIVE manda las motos de menos de 500
              cc a «la patente de 2025 ajustada por IPC», que fija la intendencia del primer
              empadronamiento. No hay tabla nacional, así que cualquier número acá sería inventado —
              <a :href="SUCIVE_URL" target="_blank" rel="noopener">consultalo en SUCIVE</a>.
            </VAlert>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- ── Las cifras vivas ───────────────────────────────────────────────── -->
    <section class="tp-section" aria-labelledby="cifras-title">
      <h2 id="cifras-title">Las cifras que usa la cuenta</h2>
      <VTable class="cu-mobile-cards figures-table" density="compact">
        <thead>
          <tr>
            <th>Concepto</th>
            <th class="text-right">Valor</th>
            <th>De dónde sale</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in liveFigureRows" :key="row.id">
            <td data-label="Concepto">{{ row.label }}</td>
            <td data-label="Valor" class="text-right money">{{ row.value }}</td>
            <td data-label="De dónde sale">{{ row.source }}</td>
          </tr>
        </tbody>
      </VTable>
      <p v-if="data.pricesAreBaseline" class="field-note is-warning">
        Estos precios son la tabla horneada y verificada a mano, no la lectura de hoy: la marcamos
        en vez de sustituirla en silencio.
      </p>
    </section>

    <!-- ── Lo que esta página no puede afirmar ────────────────────────────── -->
    <section class="tp-section" aria-labelledby="limites-title">
      <h2 id="limites-title">Seis cosas que esta página no puede afirmar</h2>
      <dl class="caveats">
        <div v-for="caveat in TRANSPORT_VIEW_CAVEATS" :key="caveat.id" class="caveat">
          <dt>{{ caveat.label }}</dt>
          <dd>{{ caveat.text }}</dd>
        </div>
      </dl>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" class="mb-8" />

    <section class="tp-section" aria-labelledby="seguir-title">
      <h2 id="seguir-title">Seguí con el detalle</h2>
      <VRow dense>
        <VCol v-for="link in enlaces" :key="link.to" cols="12" sm="6" md="4">
          <VCard variant="outlined" class="pa-4 h-100" :to="localePath(link.to)">
            <VIcon :icon="link.icon" size="20" class="mb-2" />
            <p class="link-title">{{ link.label }}</p>
            <p class="link-note">{{ link.note }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance" class="mt-6">
      Esto es aritmética sobre precios relevados y cifras públicas fechadas, no una recomendación de
      compra ni una tasación. Un modo puede ser más caro y más rápido a la vez: la página publica
      las dos cosas y el precio de la hora ganada, y no elige por vos.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import type { FaqItem } from '~/utils/faqAnswers'
import { formatNumber } from '~/utils/format'
import { TRANSPORT_ASSUMPTIONS, TRANSPORT_CONTEXT_FIGURES } from '~/utils/transportAssumptions'
import {
  TRANSPORT_VEHICLE_MODES,
  transportCompare,
  type TransportCompareResult,
  type TransportFigure,
  type TransportMode,
  type TransportModeAssumptions,
  type TransportPrices,
  type TransportScenario,
  type TransportTiming,
} from '~/utils/transportModel'
import {
  TRANSPORT_SCENARIO_LIMITS,
  TRANSPORT_SCENARIO_PRESETS,
  transportScenarioFromQuery,
  transportScenarioNormalize,
  transportScenarioToQuery,
} from '~/utils/transportScenario'
import {
  TRANSPORT_VIEW_CAVEATS,
  TRANSPORT_VIEW_EDITABLE_FIELDS,
  TRANSPORT_VIEW_EDITABLE_GLOBAL,
  TRANSPORT_VIEW_MODE_ICONS,
  transportViewApplyOverrides,
  transportViewChart,
  transportViewDate,
  transportViewFigureCaption,
  transportViewHoursPerYear,
  transportViewMinutes,
  transportViewMoney,
  transportViewMonthlyRows,
  transportViewSafetyRows,
  transportViewSortModes,
  transportViewVerdict,
} from '~/utils/transportView'
import type { TransportComparadorResponse } from '~/server/utils/transportSnapshot'
import type { TransportRutaResponse } from '~/server/api/transporte/ruta.get'

const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const SUCIVE_URL = 'https://www.sucive.gub.uy/'

// ── El escenario ───────────────────────────────────────────────────────────
// Sale de la URL para que la comparación se pueda compartir con los números puestos: una página de
// calculadora que no se puede enlazar así no se enlaza nunca.
const scenario = reactive<TransportScenario>(transportScenarioFromQuery(route.query))
const trayecto = ref<'barrio' | 'km' | 'direccion'>(
  typeof route.query.zd === 'string' && typeof route.query.zh === 'string' ? 'barrio' : 'km'
)
const desde = ref(typeof route.query.zd === 'string' ? route.query.zd : '')
const hasta = ref(typeof route.query.zh === 'string' ? route.query.zh : '')

// El sueldo por hora se edita como número suelto y se apaga con cero o vacío: `null` significa "no
// traduzcas horas a plata" y un cero significaría que toda hora ganada vale exactamente nada, que es
// afirmar algo que el visitante no dijo.
const wageInput = ref<number | null>(scenario.wageHourlyUyu)
watch(wageInput, value => {
  scenario.wageHourlyUyu =
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
})

// ── Los insumos ────────────────────────────────────────────────────────────
// Server-rendered: la comparación ES la página, así que los precios tienen que estar en el HTML que
// lee el buscador. `default` sólo existe hasta que resuelve el fetch — el endpoint nunca tira: ante
// un fallo de base contesta la forma vacía con las tarifas públicas horneadas.
const EMPTY_PRICES: TransportPrices = {
  usdUyu: 0,
  busFareUyu: 0,
  busTransferWindowMin: 60,
  busMonthlyPassUyu: null,
  naftaSuper95PerLitreUyu: 0,
  gasoilPerLitreUyu: 0,
  kwhUyu: 0,
  vehiclePriceUyu: {},
  financingTea: null,
  usuryCapTea: null,
}

const { data } = await useFetch<TransportComparadorResponse>('/api/transporte/comparador', {
  key: 'transporte-comparador',
  query: computed(() =>
    trayecto.value === 'barrio' && desde.value && hasta.value
      ? { desde: desde.value, hasta: hasta.value }
      : {}
  ),
  default: (): TransportComparadorResponse => ({
    surveyed: false,
    notice: null,
    builtAt: null,
    prices: EMPTY_PRICES,
    pricesAreBaseline: true,
    priceSources: [],
    zones: [],
    pair: null,
    coverage: null,
    attribution: [],
  }),
})

// ── La ruta viva por dirección ─────────────────────────────────────────────
const direccionDesde = ref('')
const direccionHasta = ref('')
const ruta = ref<TransportRutaResponse | null>(null)
const rutaCargando = ref(false)

async function calcularRuta(): Promise<void> {
  if (!direccionDesde.value || !direccionHasta.value) return
  rutaCargando.value = true
  try {
    ruta.value = await $fetch<TransportRutaResponse>('/api/transporte/ruta', {
      query: { desde: direccionDesde.value, hasta: direccionHasta.value },
    })
  } catch {
    // El endpoint ya devuelve su propio motivo en español; un fallo de red se cuenta igual en vez de
    // dejar el botón girando sin explicación.
    ruta.value = {
      ok: false,
      reason: 'No pudimos calcular la ruta ahora mismo. Probá de nuevo, o escribí los kilómetros.',
      from: null,
      to: null,
      timing: {},
      missing: [],
      attribution: [],
    }
  } finally {
    rutaCargando.value = false
  }
}

// ── Los tiempos que entran al modelo ───────────────────────────────────────
const timing = computed<Partial<Record<TransportMode, TransportTiming>>>(() => {
  if (trayecto.value === 'barrio') return data.value.pair?.timing ?? {}
  if (trayecto.value === 'direccion' && ruta.value?.ok) return ruta.value.timing
  // "Escribir los km" no consulta a nadie: cada modo usa su velocidad de crucero declarada, que es
  // un supuesto visible y editable, no una ruta medida.
  return {}
})

/** Los kilómetros medidos mandan sobre los escritos a mano: son la misma calle, no una estimación. */
const measuredKm = computed<number | null>(() => {
  const source = timing.value
  const km = source.auto?.routeKm ?? source.bici?.routeKm ?? source.omnibus?.routeKm ?? null
  return km && km > 0 ? km : null
})

// ── Los supuestos editables ────────────────────────────────────────────────
// Los campos guardan TEXTO y no número, y no es un detalle: con un número controlado, escribir
// "0,25" pasa por "0." —que parsea a 0—, el valor vuelve al input y se come el punto. El texto se
// convierte a número recién acá, y sólo cuenta como override si de verdad difiere de lo publicado:
// si no, la página diría "valor que pusiste vos" sobre cifras que nadie tocó.
function figureOf(
  mode: TransportMode,
  field: keyof TransportModeAssumptions
): TransportFigure | null {
  const value = TRANSPORT_ASSUMPTIONS.byMode[mode][field]
  return value && typeof value === 'object' && 'value' in value ? (value as TransportFigure) : null
}

/** Sólo se ofrece lo que YA tiene cifra publicada: lo que el sitio declara `null` no se completa acá. */
function editableFor(mode: TransportMode) {
  return TRANSPORT_VIEW_EDITABLE_FIELDS.filter(entry => figureOf(mode, entry.field) != null)
}

const publishedByPath = new Map<string, number>()
for (const entry of TRANSPORT_VIEW_EDITABLE_GLOBAL) {
  publishedByPath.set(`global.${entry.field}`, TRANSPORT_ASSUMPTIONS.global[entry.field].value)
}
for (const mode of TRANSPORT_VEHICLE_MODES) {
  for (const entry of editableFor(mode)) {
    publishedByPath.set(`${mode}.${entry.field}`, figureOf(mode, entry.field)!.value)
  }
}

const assumptionInput = reactive<Record<string, string>>(
  Object.fromEntries([...publishedByPath].map(([path, value]) => [path, String(value)]))
)

const overrides = computed<Record<string, number>>(() => {
  const out: Record<string, number> = {}
  for (const [path, raw] of Object.entries(assumptionInput)) {
    const value = Number(String(raw).replace(',', '.'))
    if (!String(raw).trim() || !Number.isFinite(value) || value < 0) continue
    const published = publishedByPath.get(path)
    // Un campo vacío o igual a lo publicado no es un override: vuelve a la cifra con su fuente.
    if (published != null && Math.abs(published - value) < 1e-9) continue
    out[path] = value
  }
  return out
})

const hasOverrides = computed(() => Object.keys(overrides.value).length > 0)

/** Un panel por grupo, con la fuente y la nota ya resueltas: la plantilla no vuelve a buscar nada. */
const assumptionGroups = computed(() => {
  const rowOf = (
    path: string,
    entry: { label: string; unit: string; step: number },
    figure: TransportFigure
  ) => ({
    path,
    label: entry.label,
    unit: entry.unit,
    step: entry.step,
    caption: transportViewFigureCaption(figure),
    url: figure.sourceUrl,
    note: figure.note ?? '',
  })
  return [
    {
      id: 'global',
      label: 'Supuestos que no dependen del modo',
      rows: TRANSPORT_VIEW_EDITABLE_GLOBAL.map(entry =>
        rowOf(`global.${entry.field}`, entry, TRANSPORT_ASSUMPTIONS.global[entry.field])
      ),
    },
    ...TRANSPORT_VEHICLE_MODES.map(mode => ({
      id: mode,
      label: TRANSPORT_ASSUMPTIONS.byMode[mode].label,
      rows: editableFor(mode).map(entry =>
        rowOf(`${mode}.${entry.field}`, entry, figureOf(mode, entry.field)!)
      ),
    })),
  ]
})

function resetOverrides(): void {
  for (const [path, value] of publishedByPath) assumptionInput[path] = String(value)
}

const assumptions = computed(() =>
  transportViewApplyOverrides(TRANSPORT_ASSUMPTIONS, overrides.value)
)

const effectiveScenario = computed<TransportScenario>(() => {
  const base = transportScenarioNormalize({ ...scenario })
  return measuredKm.value ? { ...base, distanceKm: measuredKm.value } : base
})

const result = computed<TransportCompareResult>(() =>
  transportCompare({
    scenario: effectiveScenario.value,
    prices: data.value.prices,
    assumptions: assumptions.value,
    timing: timing.value,
  })
)

const sortedModes = computed(() => transportViewSortModes(result.value))
// El costo del ómnibus, que el veredicto necesita para no confundir «más barato y más lento»
// con «más caro y más lento»: caminar sale cero y tarda el triple, y son dos cosas distintas.
const referenceMonthly = computed(
  () => result.value.modes.find(row => row.mode === result.value.reference)?.monthlyAverageUyu ?? 0
)
const availableModes = computed(() => sortedModes.value.filter(row => row.available))
// Las cuatro tarjetas de arriba son los modos que se COMPRAN: el ómnibus es la referencia y caminar
// no es una decisión de compra. El veredicto se resuelve una vez por modo y no cuatro veces por
// tarjeta desde la plantilla.
const headlineVerdicts = computed(() =>
  sortedModes.value
    .filter(row => row.mode !== 'omnibus' && row.mode !== 'pie')
    .map(row => ({
      mode: row.mode,
      label: row.label,
      icon: TRANSPORT_VIEW_MODE_ICONS[row.mode],
      ...transportViewVerdict(row, effectiveScenario.value, referenceMonthly.value),
    }))
)
const safetyRows = computed(() => transportViewSafetyRows(assumptions.value))
const busFareMissing = computed(() => !(data.value.prices.busFareUyu > 0))
const attribution = computed(() =>
  trayecto.value === 'direccion' ? (ruta.value?.attribution ?? []) : data.value.attribution
)

const builtAtLabel = computed(() =>
  data.value.builtAt ? transportViewDate(data.value.builtAt) : ''
)

const zoneItems = computed(() =>
  data.value.zones.map(zone => ({
    title: zone.department === 'Montevideo' ? zone.name : `${zone.name} (${zone.department})`,
    value: zone.slug,
  }))
)

/** Qué modos del par elegido no tienen ruta relevada. Se declara: no se estima en silencio. */
const pairMissingLabel = computed(() => {
  const pair = data.value.pair
  if (!pair || !pair.missing.length) return ''
  const labels = pair.missing.map(mode => assumptions.value.byMode[mode]?.label ?? mode)
  return `Sin recorrido relevado entre estos dos barrios para: ${labels.join(', ')}. Para esos modos el tiempo sale de la velocidad de crucero declarada abajo, no de una ruta medida.`
})

const timeIsEstimated = computed(() => {
  if (timing.value.omnibus) return ''
  return 'Sin recorrido del STM para este trayecto, el tiempo del ómnibus sale de su velocidad comercial promedio y NO incluye la caminata hasta la parada ni la espera: es un piso, no el viaje real.'
})

const teaHint = computed(() => {
  const tea = data.value.prices.financingTea
  if (!tea)
    return 'Sin tasa relevada hoy: las cuotas se reparten sin interés, que es un piso y no un precio.'
  const cap = data.value.prices.usuryCapTea
  return `Tasa efectiva anual de referencia: ${formatNumber(tea * 100, 1)} %${cap ? `. Tope de usura vigente: ${formatNumber(cap * 100, 1)} %` : ''}.`
})

// ── La tabla de cifras vivas ───────────────────────────────────────────────
const liveFigureRows = computed(() => {
  const prices = data.value.prices
  const sourceOf = (id: string): string => {
    const found = data.value.priceSources.find(entry => entry.id === id)
    if (!found) return 'sin fuente declarada'
    return found.asOf ? `${found.label} · ${transportViewDate(found.asOf)}` : found.label
  }
  const rows = [
    {
      id: 'boleto',
      label: 'Boleto del STM (1 hora, con tarjeta)',
      value: transportViewMoney(prices.busFareUyu),
      source: sourceOf('boleto'),
    },
    {
      id: 'nafta',
      label: 'Nafta súper 95, por litro',
      value: transportViewMoney(prices.naftaSuper95PerLitreUyu, 2),
      source: sourceOf('combustible'),
    },
    {
      id: 'kwh',
      label: 'kWh residencial (escalón 101-600, con IVA)',
      value: transportViewMoney(prices.kwhUyu, 2),
      source: sourceOf('energia'),
    },
  ]
  if (prices.financingTea) {
    rows.push({
      id: 'tea',
      label: 'Tasa efectiva anual para las cuotas',
      value: `${formatNumber(prices.financingTea * 100, 1)} %`,
      source: sourceOf('financiacion'),
    })
  }
  for (const mode of TRANSPORT_VEHICLE_MODES) {
    const price = prices.vehiclePriceUyu[mode]
    const label = `Precio de referencia — ${TRANSPORT_ASSUMPTIONS.byMode[mode].label}`
    rows.push({
      id: `precio-${mode}`,
      label,
      // La ausencia se declara. Un guion acá sería un cero en la cuenta de arriba.
      value: price ? transportViewMoney(price.referenceUyu) : 'sin datos relevados',
      source: price
        ? `Catálogo propio (${price.source}), ${price.offers} avisos${price.asOf ? ` · ${transportViewDate(price.asOf)}` : ''}`
        : 'Todavía no relevamos precios de este modo',
    })
  }
  rows.push({
    id: 'licencia',
    label: 'Licencia de conducir, primera vez',
    value: transportViewMoney(TRANSPORT_CONTEXT_FIGURES.licenciaPrimeraVez.value),
    source: transportViewFigureCaption(TRANSPORT_CONTEXT_FIGURES.licenciaPrimeraVez),
  })
  return rows
})

function aplicarPreset(slug: string): void {
  const preset = TRANSPORT_SCENARIO_PRESETS.find(entry => entry.slug === slug)
  if (!preset) return
  Object.assign(scenario, transportScenarioNormalize({ ...scenario, ...preset.scenario }))
  // Un preset habla de kilómetros, así que pasa al modo manual: dejarlo en "barrios" mostraría un
  // número que la ruta medida vuelve a pisar en el acto.
  if (preset.scenario.distanceKm != null) trayecto.value = 'km'
}

// ── El gráfico ─────────────────────────────────────────────────────────────
// La cuenta es barata y responde en el acto; el gráfico se asienta 300 ms porque cada cambio
// remonta el canvas, y remontarlo por tecla es trabajo puro sin información.
const settledResult = ref<TransportCompareResult>(result.value)
let settleTimer: ReturnType<typeof setTimeout> | undefined
watch(result, next => {
  clearTimeout(settleTimer)
  settleTimer = setTimeout(() => {
    settledResult.value = next
  }, 300)
})
onBeforeUnmount(() => clearTimeout(settleTimer))

const chart = computed(() =>
  transportViewChart(settledResult.value, effectiveScenario.value.horizonMonths)
)
const chartKey = computed(
  () =>
    `${chart.value?.labels.length ?? 0}-${settledResult.value.modes
      .map(row => Math.round(row.monthlyAverageUyu))
      .join('_')}`
)

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  // La animación de entrada de Chart.js corre en un rAF que puede dispararse después de que el
  // canvas viejo ya no existe, y ahí tira desde adentro de su propio draw.
  animation: false as const,
  interaction: { mode: 'index' as const, intersect: false },
  plugins: {
    legend: { position: 'bottom' as const },
    tooltip: {
      callbacks: {
        label: (item: { dataset: { label?: string }; parsed: { y: number } }) =>
          `${item.dataset.label}: ${transportViewMoney(item.parsed.y)}`,
      },
    },
  },
  scales: {
    x: {
      title: { display: true, text: 'Meses desde la compra' },
      ticks: { maxRotation: 0, autoSkipPadding: 16 },
    },
    // Eje Y lineal: acá el callback SÍ recibe el valor. En el eje X, que es de categoría, recibiría
    // el índice del bucket — por eso las etiquetas de X vienen preformateadas desde `transportView`.
    y: { ticks: { callback: (value: number) => `$ ${Number(value).toLocaleString('es-UY')}` } },
  },
}

// ── El escenario viaja en la URL ───────────────────────────────────────────
// `router.replace` y no `push`: cambiar un slider no es navegar, y llenar el historial con cada
// tecla dejaría el botón "atrás" inservible.
if (import.meta.client) {
  let urlTimer: ReturnType<typeof setTimeout> | undefined
  watch(
    () =>
      [
        transportScenarioToQuery(effectiveScenario.value),
        trayecto.value,
        desde.value,
        hasta.value,
      ] as const,
    ([query, modo, from, to]) => {
      clearTimeout(urlTimer)
      urlTimer = setTimeout(() => {
        const next: Record<string, string> = { ...query }
        if (modo === 'barrio' && from && to) {
          next.zd = from
          next.zh = to
        }
        const current = new URLSearchParams(route.query as Record<string, string>).toString()
        const wanted = new URLSearchParams(next).toString()
        if (current !== wanted) router.replace({ query: next })
      }, 400)
    },
    { deep: true }
  )
  onBeforeUnmount(() => clearTimeout(urlTimer))
}

// ── Enlaces ────────────────────────────────────────────────────────────────
const enlaces = [
  {
    to: '/monopatines-electricos-uruguay',
    icon: 'mdi-scooter-electric',
    label: 'Precio de monopatines eléctricos',
    note: 'La banda p25/mediana/p75 de donde sale el precio que usa esta cuenta.',
  },
  {
    to: '/bicicletas-electricas-uruguay',
    icon: 'mdi-bicycle-electric',
    label: 'Precio de bicicletas eléctricas',
    note: 'Nuevo y usado, con las ofertas y su fecha.',
  },
  {
    to: '/autos-usados-uruguay',
    icon: 'mdi-car-hatchback',
    label: 'Autos usados en Uruguay',
    note: 'El catálogo de donde sale el precio de referencia y la pérdida de valor medida.',
  },
  {
    to: '/precio-de-la-nafta-uruguay',
    icon: 'mdi-gas-station',
    label: 'Precio de la nafta',
    note: 'La tabla de ANCAP vigente, con su histórico.',
  },
  {
    to: '/plan-de-vida-uruguay',
    icon: 'mdi-cart-outline',
    label: 'El orden de cada peso',
    note: 'Dónde entra el transporte dentro del presupuesto del mes.',
  },
  {
    to: '/conviene-comprar-en-cuotas',
    icon: 'mdi-credit-card-outline',
    label: '¿Cuotas o contado?',
    note: 'La tasa implícita que el comercio no te dice, si vas a financiar el vehículo.',
  },
]

// ── FAQ ────────────────────────────────────────────────────────────────────
// Las respuestas se COMPUTAN de los mismos datos que se muestran, así el texto visible y el schema
// no pueden divergir.
const faqItems = computed<FaqItem[]>(() => {
  const auto = result.value.modes.find(row => row.mode === 'auto')
  const monopatin = result.value.modes.find(row => row.mode === 'monopatin')
  const bus = result.value.modes.find(row => row.mode === 'omnibus')
  return [
    {
      id: 'conviene-auto',
      question: '¿Conviene comprar un auto para ir a trabajar en Montevideo?',
      answer:
        auto?.available && bus?.available
          ? auto.breakevenMonths == null && auto.pricePerHourSavedUyu != null
            ? `Contra el ómnibus, un auto usado no se paga nunca: cuesta ${transportViewMoney(auto.monthlyAverageUyu)} por mes contra ${transportViewMoney(bus.monthlyAverageUyu)}. Lo que compra es tiempo — ${transportViewHoursPerYear(auto.hoursPerYearVsBus)} —, a ${transportViewMoney(auto.pricePerHourSavedUyu)} la hora. Comparalo contra lo que ganás vos por hora.`
            : `Con este trayecto, un auto usado cuesta ${transportViewMoney(auto.monthlyAverageUyu)} por mes contra ${transportViewMoney(bus.monthlyAverageUyu)} del ómnibus, contando compra, seguro, patente, nafta, mantenimiento y lo que todavía vale al final.`
          : 'Todavía no relevamos precios de autos usados para este cálculo, así que no publicamos una cuenta estimada.',
    },
    {
      id: 'cuanto-tarda-en-pagarse-un-monopatin',
      question: '¿En cuántos meses se paga un monopatín eléctrico?',
      answer:
        monopatin?.available && monopatin.breakevenMonths != null
          ? `Con ${formatNumber(effectiveScenario.value.distanceKm, 1)} km de ida y ${effectiveScenario.value.daysPerWeek} días por semana, el monopatín cruza por debajo del ómnibus a los ${monopatin.breakevenMonths} meses, ya descontado lo que todavía vale. Cambiá los días y la distancia y el número se mueve.`
          : 'Depende del trayecto: cambiá los kilómetros y los días por semana y la página recalcula el punto de equilibrio. Sin precio relevado de monopatines no publicamos ninguno.',
    },
    {
      id: 'que-incluye-el-costo',
      question: '¿Qué incluye el costo por mes de cada vehículo?',
      answer:
        'Precio de compra o cuota, equipo obligatorio y trámites, seguro obligatorio, patente, mantenimiento por año y por kilómetro, energía (nafta o kWh), estacionamiento tarifado si corresponde, el boleto de los días de lluvia, el costo esperado de robo, y descontado lo que el vehículo todavía vale al final del horizonte. Cada supuesto es visible y editable, con su fecha y su fuente.',
    },
    {
      id: 'patente-moto',
      question: '¿Cuánto paga de patente una moto en Uruguay?',
      answer:
        'No hay tabla nacional para una moto de menos de 500 cc: el Texto Ordenado del SUCIVE manda ese segmento a la patente de 2025 ajustada por IPC, que fija la intendencia del primer empadronamiento. Por eso la moto va sin patente en esta cuenta y el importe exacto se consulta por matrícula en SUCIVE.',
    },
    {
      id: 'riesgo-vial',
      question: '¿Por qué el riesgo de accidente no está en el costo?',
      answer:
        'Porque ponerle precio a una vida para que cierre la cuenta de un vehículo es indefendible, y una cifra inventada ahí contamina todo lo demás. Publicamos los fallecidos por modo que informa UNASEV y, donde existe parque publicado, la tasa por cada 100.000 vehículos como cruce propio, con el denominador declarado.',
    },
    {
      id: 'tiempo-moto',
      question: '¿Por qué la moto tarda lo mismo que el auto?',
      answer:
        'Porque se rutea como un auto. Ningún ruteador público modela lo que de verdad la hace más rápida en ciudad, así que publicamos el tiempo del auto y lo decimos: descontarle minutos por suposición sería decidir el resultado de la comparación con un número inventado.',
    },
  ]
})

// ── SEO ────────────────────────────────────────────────────────────────────
// Absoluto y LITERAL, nunca construido con `localePath`: esta familia es sólo en español y el
// canonical tiene que ser el mismo string también bajo /en/ y /pt/.
const CANONICAL = 'https://cambio-uruguay.com/conviene-auto-moto-o-omnibus-uruguay'
// «en Uruguay» se queda aunque alargue: la consulta que trae a esta página es local, y sin el país
// el título compite con las mismas cuentas hechas para España o México.
const seoTitle = '¿Conviene auto, moto u ómnibus en Uruguay?'
const seoDescription =
  'Cuánto sale por mes moverte en ómnibus, monopatín, bici eléctrica, moto o auto usado: compra, ' +
  'seguro, patente, nafta y mantenimiento contra el boleto.'

defineOgImageComponent('Cambio', {
  title: '¿Auto, moto, bici u ómnibus?',
  subtitle: 'Cuánto sale por mes, y en cuántos meses se paga',
  tag: 'COMPARADOR',
})

useSeoMeta({
  title: `${seoTitle} | Cambio Uruguay`,
  description: seoDescription,
  ogTitle: seoTitle,
  ogDescription: seoDescription,
  ogType: 'article',
  ogUrl: CANONICAL,
  twitterCard: 'summary_large_image',
  twitterTitle: seoTitle,
  twitterDescription: seoDescription,
})

// El FAQPage lo emite FaqSection: no se repite acá.
useHead(() => ({
  link: [{ rel: 'canonical', href: CANONICAL }],
  meta: [
    {
      name: 'keywords',
      content:
        'conviene comprar auto uruguay, moto o omnibus, costo de tener un auto en uruguay, ' +
        'monopatin electrico vs omnibus, cuanto sale mantener una moto uruguay',
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
                item: 'https://cambio-uruguay.com/',
              },
              { '@type': 'ListItem', position: 2, name: '¿Auto, moto u ómnibus?', item: CANONICAL },
            ],
          },
          {
            '@type': 'WebApplication',
            name: 'Comparador de transporte diario en Uruguay',
            url: CANONICAL,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web',
            isAccessibleForFree: true,
            offers: { '@type': 'Offer', price: 0, priceCurrency: 'UYU' },
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Tipografía y radios salen de la escala de DESIGN.md (Display / Headline / Lead / Body y los
   cuatro micro-pasos 0,95 · 0,875 · 0,8 · 0,75). El espaciado va en múltiplos de 4px. Inventar un
   paso para una sola página es exactamente lo que hace que un sitio deje de parecer uno solo. */
.transporte-page {
  max-width: 1120px;
}

.tp-header {
  margin-bottom: 28px;
}

.tp-header h1 {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
  margin-top: 0;
  margin-bottom: 12px;
}

.lead {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.as-of {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.tp-section {
  margin-top: 40px;
}

.tp-section h2 {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
  margin-top: 0;
  margin-bottom: 12px;
}

.tp-p,
.section-intro,
.empty-note {
  margin-top: 0;
  margin-bottom: 12px;
  line-height: 1.5;
  max-width: 72ch;
}

.section-intro,
.empty-note {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.verdict-kicker {
  margin-top: 0;
  margin-bottom: 16px;
  font-weight: 600;
}

.verdict-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(212px, 1fr));
  gap: 16px;
}

.verdict-cell {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
  min-width: 0;
}

.vc-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.vc-mode {
  font-weight: 600;
  font-size: 0.95rem;
}

.vc-headline {
  margin-top: 0;
  margin-bottom: 4px;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* Punto + palabra: el estado nunca viaja sólo en el tono. */
.vc-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
  background: rgba(var(--v-theme-on-surface), 0.32);
}

.vc-dot.is-success {
  background: rgb(var(--v-theme-success));
}

.vc-dot.is-warning {
  background: rgb(var(--v-theme-warning));
}

.vc-dot.is-error {
  background: rgb(var(--v-theme-error));
}

/* El paso «stat» de DESIGN.md: la única medida por encima de Title que no es un encabezado. */
.vc-figure {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 1.5rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}

.vc-detail {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.field-group {
  margin-bottom: 20px;
}

.cv-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.field-note {
  margin-top: 8px;
  margin-bottom: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.field-note.is-warning {
  font-weight: 600;
}

.seg-toggle {
  flex-wrap: wrap;
  height: auto;
}

.seg-btn {
  height: 40px;
}

.switch-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
  column-gap: 16px;
  margin-bottom: 12px;
}

.preset-row {
  margin-top: 12px;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
}

.result-panel {
  position: sticky;
  top: 88px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  padding: 16px;
}

.rp-title {
  margin-top: 0;
  margin-bottom: 12px;
  font-weight: 600;
  font-size: 0.95rem;
}

.rp-list {
  list-style: none;
  padding: 0;
  margin: 0 0 12px;
}

.rp-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-width: 0;
}

.rp-icon {
  flex: 0 0 auto;
}

.rp-label {
  flex: 1 1 auto;
  font-size: 0.95rem;
  min-width: 0;
}

.rp-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rp-empty {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.rp-foot {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

/* Altura declarada y `position: relative`: un canvas de Chart.js dentro de una caja sin altura se
   monta con 0 px y no dibuja nada. */
.chart-wrap {
  position: relative;
  height: clamp(260px, 44vw, 400px);
  margin-top: 12px;
}

.compare-table .money,
.bd-table .money,
.figures-table .money {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.td-note {
  display: block;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.empty-cell {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
  font-size: 0.875rem;
}

.bd-label {
  border-bottom: 1px dotted rgba(var(--v-theme-on-surface), 0.35);
  cursor: help;
}

.bd-table .is-total td {
  font-weight: 700;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.4);
}

.bd-table .is-inversion td {
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.risk-note {
  font-size: 0.8rem;
  line-height: 1.5;
}

.as-row {
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.as-source,
.as-note {
  margin-top: 8px;
  margin-bottom: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.caveats {
  margin: 0;
}

.caveat {
  padding: 12px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.caveat dt {
  font-weight: 600;
  margin-top: 0;
  margin-bottom: 4px;
}

.caveat dd {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.link-title {
  margin-top: 0;
  margin-bottom: 4px;
  font-weight: 600;
}

.link-note {
  margin-top: 0;
  margin-bottom: 0;
  font-size: 0.8rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), var(--v-medium-emphasis-opacity));
}

.tp-section a,
.as-source a,
.as-note a {
  color: rgb(var(--v-theme-link));
}
</style>
