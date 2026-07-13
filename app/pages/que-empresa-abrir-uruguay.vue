<template>
  <div class="empresa-page pb-8">
    <div class="mb-3">
      <VBtn :to="localePath('/salud-financiera')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Salud financiera
      </VBtn>
    </div>

    <!-- ══ HERO ══ -->
    <VCard class="overflow-hidden mb-5" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Formalizar tu emprendimiento</p>
        <h1 class="hero-title">¿Qué tipo de empresa me conviene abrir en Uruguay?</h1>
        <p class="hero-lead">
          Monotributo, unipersonal, Literal E, SAS, SRL. La diferencia no es de estilo: cambia
          cuánto pagás, si respondés con tu casa, y si podés volver atrás.
          <strong>Toda cifra de esta página lleva la norma que la respalda</strong>, y donde la ley
          no cierra, lo decimos en vez de inventar.
        </p>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons text="Qué empresa abrir en Uruguay: monotributo, unipersonal, SAS o SRL" />
        </div>
      </div>
    </VCard>

    <!-- ══ 2. WIZARD ══ -->
    <h2 class="section-heading mb-1">Contanos tu caso</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      No es un score ni un ranking de opinión: primero aplicamos las
      <strong>compuertas legales</strong> (un régimen para el que no calificás no es “peor”, es
      ilegal) y recién después comparamos el costo entre los que te quedan.
    </p>

    <VCard variant="flat" class="section-card pa-4 pa-sm-6 mb-6">
      <!-- Facturación -->
      <div class="q-title">1 · ¿Cuánto pensás facturar por año?</div>
      <VRow class="align-center mb-1">
        <VCol cols="12" sm="4" md="3">
          <VBtnToggle
            v-model="currency"
            mandatory
            density="comfortable"
            color="primary"
            class="q-toggle"
          >
            <VBtn value="UYU">Pesos</VBtn>
            <VBtn value="USD">Dólares</VBtn>
          </VBtnToggle>
        </VCol>
        <VCol cols="12" sm="8" md="6">
          <VTextField
            v-model.number="revenue"
            type="number"
            min="0"
            :step="currency === 'USD' ? 1000 : 50000"
            :prefix="currency === 'USD' ? 'US$' : '$'"
            label="Facturación anual estimada"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <p
            v-if="currency === 'USD' && usdRate"
            class="text-caption text-medium-emphasis mt-1 mb-0"
          >
            ≈ {{ money(annualRevenueUyu) }} al año · dólar a {{ money(usdRate) }} (cotización en
            vivo del sitio)
          </p>
          <p v-else-if="currency === 'USD'" class="text-caption text-medium-emphasis mt-1 mb-0">
            No pudimos leer la cotización del dólar ahora mismo. Cargá el monto en pesos.
          </p>
          <p v-else class="text-caption text-medium-emphasis mt-1 mb-0">
            {{ money(annualRevenueUyu / 12) }} por mes, facturando parejo.
          </p>
        </VCol>
      </VRow>

      <!-- Qué vendés -->
      <div class="q-title mt-5">2 · ¿Qué vendés?</div>
      <VBtnToggle
        v-model="sells"
        mandatory
        density="comfortable"
        color="primary"
        class="q-toggle q-toggle--wrap"
      >
        <VBtn value="bienes">Bienes</VBtn>
        <VBtn value="servicios" data-testid="sells-servicios">Servicios personales</VBtn>
        <VBtn value="ambos">Ambos</VBtn>
      </VBtnToggle>
      <p class="q-hint">
        “Servicios personales” es trabajo tuyo fuera de la relación de dependencia: desarrollo,
        diseño, consultoría, un oficio, una profesión. Es la respuesta que más cambia el resultado:
        el monotributo los excluye por ley.
      </p>

      <!-- Clientes -->
      <div class="q-title mt-5">3 · ¿Quiénes te compran?</div>
      <VBtnToggle
        v-model="clients"
        mandatory
        density="comfortable"
        color="primary"
        class="q-toggle q-toggle--wrap"
      >
        <VBtn value="consumidor-final">Consumidor final</VBtn>
        <VBtn value="empresas">Empresas</VBtn>
        <VBtn value="exterior">Exterior</VBtn>
        <VBtn value="mixto">Mixto</VBtn>
      </VBtnToggle>
      <p class="q-hint">
        El monotributo exige vender <strong>exclusivamente</strong> a consumidores finales. Una
        clientela mixta no cumple esa exclusividad, aunque la mayoría de tus ventas sean a
        consumidores.
      </p>

      <!-- Cuántos son -->
      <div class="q-title mt-5">4 · ¿Cuántos son?</div>
      <VBtnToggle
        v-model="people"
        mandatory
        density="comfortable"
        color="primary"
        class="q-toggle q-toggle--wrap"
      >
        <VBtn value="solo">Solo/a</VBtn>
        <VBtn value="conyuge">Con cónyuge o concubino/a</VBtn>
        <VBtn value="socios">2 o más socios</VBtn>
      </VBtnToggle>

      <!-- Socios: sólo si corresponde. Sin estos datos, media página se vuelve "no sabemos". -->
      <VRow v-if="people === 'socios'" class="socios-block mt-3">
        <VCol cols="12" md="4">
          <VSelect
            v-model="sociosCount"
            :items="sociosCountItems"
            label="¿Cuántos socios son en total?"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <p class="text-caption text-medium-emphasis mt-1 mb-0">
            Decide si el monotributo está disponible: la Ley 18.083 art. 70 admite una sociedad de
            hecho de hasta {{ FIGURES.monotributoSociosMaxSinFamilia.value }} socios, o hasta
            {{ FIGURES.monotributoSociosMaxFamilia.value }} si son todos familiares.
          </p>
        </VCol>
        <VCol cols="12" md="4">
          <VSelect
            v-model="sociosActivos"
            :items="sociosActivosItems"
            label="¿Cuántos TRABAJAN en la empresa?"
            variant="outlined"
            density="comfortable"
            hide-details
          />
          <p class="text-caption text-medium-emphasis mt-1 mb-0">
            BPS cobra por cada socio que desarrolla actividad, tenga o no la calidad de
            administrador (Ley 16.713 art. 172) — no por cada dueño. Un socio puramente capitalista
            no aporta por esta vía. Si no nos lo decís, no lo adivinamos.
          </p>
        </VCol>
        <VCol cols="12" md="4" class="d-flex align-center">
          <VSwitch
            v-model="sociosFamiliares"
            color="primary"
            density="comfortable"
            hide-details
            label="Son todos familiares (hasta 4.º grado de consanguinidad o 2.º de afinidad)"
          />
        </VCol>
      </VRow>

      <!-- Empleados -->
      <div class="q-title mt-5">5 · ¿Empleados?</div>
      <VBtnToggle
        v-model="employees"
        mandatory
        density="comfortable"
        color="primary"
        class="q-toggle q-toggle--wrap"
      >
        <VBtn :value="0">Ninguno</VBtn>
        <VBtn :value="1">1</VBtn>
        <VBtn :value="2">2 o más</VBtn>
      </VBtnToggle>

      <!-- Responsabilidad -->
      <div class="q-title mt-5">6 · ¿Necesitás proteger tu patrimonio personal?</div>
      <VSwitch
        v-model="needsLimitedLiability"
        color="primary"
        density="comfortable"
        hide-details
        label="Sí: voy a tomar deuda, contratar empleados, comprar mercadería a crédito, firmar contratos con penalidades, o mi actividad puede dañar a un tercero"
      />

      <!-- ── Ajustes finos ── -->
      <VExpansionPanels class="mt-5 fine-panels">
        <VExpansionPanel>
          <VExpansionPanelTitle>
            <VIcon start size="small" color="primary">mdi-tune-variant</VIcon>
            Ajustes finos — cambian el número, y algunos cambian el veredicto
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <VRow>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="family"
                  :items="familyItems"
                  label="Tu situación familiar"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
                <p class="text-caption text-medium-emphasis mt-1 mb-0">
                  Mueve el FONASA hasta
                  {{
                    money(
                      FIGURES.bpsUnipersonalPlenoConyugeHijos.value -
                        FIGURES.bpsUnipersonalPleno.value
                    )
                  }}
                  por mes, y decide el mano a mano entre monotributo y Literal E.
                </p>
              </VCol>
              <VCol cols="12" md="6">
                <VSelect
                  v-model="yearsOperating"
                  :items="yearsItems"
                  label="¿Hace cuánto operás?"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
                <p class="text-caption text-medium-emphasis mt-1 mb-0">
                  Las rebajas para empresas nuevas (Ley 19.942 en el monotributo, Ley 19.889 en el
                  Literal E) se acaban, y el costo sube solo.
                </p>
              </VCol>

              <VCol cols="12" md="6">
                <VSwitch
                  v-model="cajaProfesional"
                  color="primary"
                  density="comfortable"
                  hide-details
                  label="Tengo un título universitario amparado por la Caja de Profesionales (contador, abogado, arquitecto, ingeniero, médico…) y lo ejerzo"
                />
                <p class="text-caption text-medium-emphasis mt-1 mb-0">
                  Si es tu caso, tu jubilatorio no se rige por la tabla de BPS y la CJPPU no publica
                  su escala: <strong>no te vamos a mostrar un número inventado</strong>. Un
                  desarrollador de software <em>no</em> está en este grupo — BPS define “no
                  profesional” por la actividad, “tengan o no título universitario”.
                </p>
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="otherCompanyRole"
                  color="primary"
                  density="comfortable"
                  hide-details
                  label="Ya soy socio de otra sociedad personal o director de una SA (aunque esté inactiva)"
                />
                <p class="text-caption text-medium-emphasis mt-1 mb-0">
                  Eso solo mata el monotributo (Ley 18.083 art. 72).
                </p>
              </VCol>

              <VCol cols="12" md="6">
                <VSwitch
                  v-model="eFactura"
                  color="primary"
                  density="comfortable"
                  hide-details
                  label="Voy a documentar todo por e-factura (CFE)"
                />
                <p class="text-caption text-medium-emphasis mt-1 mb-0">
                  Destraba el tope del
                  {{ pct(FIGURES.ivaMinimoTopeEfactura.value, 1) }} del IVA mínimo: pagás el menor
                  entre la cuota y ese porcentaje de lo facturado en el mes. Si un mes no facturás,
                  no pagás.
                </p>
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="fonasaFromJob"
                  color="primary"
                  density="comfortable"
                  hide-details
                  label="Ya aporto al FONASA por un empleo en relación de dependencia"
                />
              </VCol>

              <VCol cols="12" md="6">
                <VSwitch
                  v-model="localTooBig"
                  color="primary"
                  density="comfortable"
                  hide-details
                  label="Mi local supera los 15 m², o está dentro de un shopping o centro comercial"
                />
              </VCol>
              <VCol cols="12" md="6">
                <VSwitch
                  v-model="midesEligible"
                  color="primary"
                  density="comfortable"
                  hide-details
                  label="El MIDES calificó a mi hogar (bajo la línea de pobreza o en vulnerabilidad socioeconómica)"
                />
                <p class="text-caption text-medium-emphasis mt-1 mb-0">
                  La calificación es previa y está exclusivamente a cargo del MIDES: sin ella, el
                  Monotributo Social no existe como opción.
                </p>
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="assets"
                  type="number"
                  min="0"
                  prefix="$"
                  label="Activos del negocio (mercadería, equipos, vehículo…)"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
                <p class="text-caption text-medium-emphasis mt-1 mb-0">
                  Por encima de {{ money(FIGURES.topeMonotributoActivosUyu.value) }} quedás fuera
                  del monotributo (Dto. 199/007).
                </p>
              </VCol>
              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="administradoresSas"
                  type="number"
                  min="1"
                  placeholder="Por defecto 1 (Ley 19.820 art. 29)"
                  persistent-placeholder
                  label="Administradores / representantes legales de la SAS"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
                <p class="text-caption text-medium-emphasis mt-1 mb-0">
                  Dejalo vacío y contamos <strong>uno</strong>: no es una suposición nuestra sino la
                  de la propia Ley 19.820 (art. 29), que se lo adjudica todo al representante legal
                  si el estatuto no dice otra cosa. El art. 30 no fija un máximo. Cada administrador
                  paga su propio BPS.
                </p>
              </VCol>

              <VCol cols="12" md="6">
                <VTextField
                  v-model.number="accountant"
                  type="number"
                  min="0"
                  prefix="$"
                  :label="MARKET_ESTIMATES.contadorMensual.label"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
                <VAlert type="info" variant="tonal" density="compact" class="mt-2 est-alert">
                  <strong>No es una cifra oficial.</strong>
                  {{ MARKET_ESTIMATES.contadorMensual.rationale }}
                </VAlert>
              </VCol>
            </VRow>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </VCard>

    <!-- ══ 3. VERDICT ══ -->
    <h2 class="section-heading mb-1">El veredicto</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      El régimen más barato de los que <em>legalmente</em> podés usar y cuyo costo podemos calcular
      entero.
    </p>

    <VCard data-testid="verdict" variant="flat" class="verdict-card pa-5 pa-sm-6 mb-6">
      <!-- 3a. No hay recomendación posible. Es una respuesta, no un error. -->
      <template v-if="verdict.recommended === null || zeroPricedRecommendation">
        <div class="d-flex align-center ga-2 mb-3">
          <VIcon color="warning" size="28">mdi-help-circle-outline</VIcon>
          <h3 class="text-h6 font-weight-bold mb-0">No podemos recomendarte un régimen</h3>
        </div>
        <p class="text-body-2 mb-0">{{ noVerdictText }}</p>
        <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
          Esto <strong>no</strong> es una falla de la herramienta: es el resultado honesto. Darte el
          régimen “más barato” cuando a todos les falta la parte más cara del cálculo sería
          exactamente el error que esta página existe para no cometer. Mirá abajo cada régimen, con
          lo que sí sabemos y lo que no.
        </VAlert>
      </template>

      <!-- 3b. Hay recomendación, y tiene un precio de verdad. -->
      <template v-else-if="recommended && recommended.cost && recommendedPriced">
        <div class="d-flex flex-wrap align-center ga-2 mb-2">
          <VIcon color="primary" size="28">mdi-check-decagram</VIcon>
          <h3 class="text-h5 font-weight-bold mb-0">{{ regimeName(recommended.regime) }}</h3>
          <VChip
            size="small"
            variant="tonal"
            :color="liabilityOf(recommended.regime) === 'limitada' ? 'success' : 'warning'"
          >
            Responsabilidad {{ liabilityOf(recommended.regime) }}
          </VChip>
        </div>
        <p class="text-body-2 mb-4">{{ regimeShort(recommended.regime) }}</p>

        <div class="cost-grid">
          <div class="cost-box">
            <div class="text-overline text-medium-emphasis">Aportes BPS</div>
            <div class="cost-val">{{ bpsValue(recommended.cost) }}</div>
            <div class="text-caption text-medium-emphasis">por mes</div>
          </div>
          <div class="cost-box">
            <div class="text-overline text-medium-emphasis">{{ taxTitle(recommended.regime) }}</div>
            <div class="cost-val">{{ taxValue(recommended.regime, recommended.cost) }}</div>
            <div class="text-caption text-medium-emphasis">por mes</div>
          </div>
          <div class="cost-box">
            <div class="text-overline text-medium-emphasis">Contador</div>
            <div class="cost-val">
              {{
                recommended.cost.accountantMonthly > 0
                  ? money(recommended.cost.accountantMonthly)
                  : 'No lo precisás'
              }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{
                recommended.cost.accountantMonthly > 0
                  ? 'estimación de mercado'
                  : 'por este régimen'
              }}
            </div>
          </div>
          <div v-if="recommended.cost.otherTaxesMonthly > 0" class="cost-box">
            <div class="text-overline text-medium-emphasis">ICOSA</div>
            <div class="cost-val">{{ money(recommended.cost.otherTaxesMonthly) }}</div>
            <div class="text-caption text-medium-emphasis">prorrateado por mes</div>
          </div>
          <div class="cost-box cost-box--main">
            <div class="text-overline">Total mensual</div>
            <div class="cost-total">{{ money(recommended.cost.totalMonthly) }}</div>
            <div class="text-caption">{{ money(recommended.cost.totalAnnual) }} al año</div>
          </div>
        </div>

        <div class="setup-line mt-4">
          <VIcon size="18" color="primary" class="mr-1">mdi-rocket-launch-outline</VIcon>
          <span>
            Abrirla cuesta
            <strong>{{ setupLabel(recommended.cost.setupCost) }}</strong>
            de trámite estatal.
          </span>
        </div>

        <ul v-if="recommended.cost.notes.length" class="notes mt-4">
          <li v-for="(n, i) in recommended.cost.notes" :key="i">{{ n }}</li>
        </ul>
      </template>

      <!-- Warnings — siempre, y cada uno con su norma linkeada. -->
      <div v-if="verdict.warnings.length" class="mt-5">
        <VAlert
          v-for="(w, i) in verdict.warnings"
          :key="i"
          :type="w.kind === 'grey-zone' ? 'info' : 'warning'"
          variant="tonal"
          density="comfortable"
          class="mb-3 warn-alert"
          :data-testid="`warning-${w.kind}`"
        >
          <div class="text-subtitle-2 font-weight-bold mb-1">{{ warningTitle(w) }}</div>
          <p class="mb-2">{{ w.text }}</p>
          <a :href="w.url" target="_blank" rel="noopener noreferrer" class="norm-link">
            {{ w.norm }}
            <VIcon size="12">mdi-open-in-new</VIcon>
          </a>
        </VAlert>
      </div>
    </VCard>

    <!-- ══ 4. POR QUÉ DESCARTAMOS LAS OTRAS ══ -->
    <h2 class="section-heading mb-1">Por qué descartamos las otras</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Esta es la parte auditable de la página, y por eso no la escondemos detrás de un botón. Cada
      exclusión lleva la norma que la impone, con el link a la norma.
    </p>

    <div class="mb-6">
      <VCard
        v-for="r in others"
        :key="r.regime"
        variant="flat"
        class="ruled-card pa-4 pa-sm-5 mb-3"
        :class="`ruled-card--${r.status}`"
        :data-testid="r.status === 'excluido' ? `ruled-out-${r.regime}` : `other-${r.regime}`"
      >
        <div class="d-flex flex-wrap align-center ga-2 mb-2">
          <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ regimeName(r.regime) }}</h3>
          <VChip size="x-small" variant="tonal" :color="statusColor(r.status)">
            {{ statusLabel(r.status) }}
          </VChip>
          <VChip
            v-if="r.status !== 'excluido' && r.comparable && isPrice(r.cost?.totalMonthly)"
            size="x-small"
            variant="tonal"
          >
            {{ money(r.cost?.totalMonthly) }} / mes
          </VChip>
          <VChip v-else-if="r.status !== 'excluido'" size="x-small" variant="tonal" color="warning">
            Sin precio calculable
          </VChip>
        </div>

        <!-- Razones legales, cada una con su norma. -->
        <ul v-if="r.reasons.length" class="reasons">
          <li v-for="(reason, i) in r.reasons" :key="i">
            <VIcon
              size="14"
              :color="reason.status === 'excluido' ? 'error' : 'warning'"
              class="mr-1"
            >
              {{ reason.status === 'excluido' ? 'mdi-close-circle' : 'mdi-alert-circle-outline' }}
            </VIcon>
            <span>{{ reason.text }}</span>
            <a :href="reason.url" target="_blank" rel="noopener noreferrer" class="norm-link ml-1">
              {{ reason.norm }}
              <VIcon size="12">mdi-open-in-new</VIcon>
            </a>
          </li>
        </ul>

        <!-- Costo incompleto: NO hay total. Nunca. -->
        <div v-if="r.cannotCost.length" class="cannot-cost mt-3">
          <div class="text-overline text-medium-emphasis mb-1">
            <VIcon size="14" color="warning" class="mr-1">mdi-help-circle-outline</VIcon>
            Por qué no le ponemos precio
          </div>
          <p v-for="(c, i) in r.cannotCost" :key="i" class="mb-2">{{ c }}</p>
        </div>

        <!-- Elegible y calculable, pero más caro que la recomendación. -->
        <p
          v-else-if="r.status === 'elegible' && r.comparable && extraCost(r) !== null"
          class="text-body-2 text-medium-emphasis mb-0 mt-2"
        >
          Podés usarlo, pero te sale
          <strong>{{ money(extraCost(r)) }} más por mes</strong> que la recomendación.
        </p>
      </VCard>
    </div>

    <!-- ══ 5. TABLA COMPARATIVA ══ -->
    <h2 class="section-heading mb-1">Los nueve regímenes, uno al lado del otro</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      La columna “costo mensual” se recalcula con los datos que cargaste arriba.
    </p>

    <VCard variant="flat" class="section-card mb-6">
      <div class="table-scroll">
        <VTable density="comfortable" class="cmp-table">
          <thead>
            <tr>
              <th>Régimen</th>
              <th>Tope de ingresos</th>
              <th>Costo mensual (tu caso)</th>
              <th>Responsabilidad</th>
              <th>¿Monotributo?</th>
              <th>¿Literal E?</th>
              <th>Dividendos</th>
              <th>Costo de apertura</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparison" :key="row.id">
              <td class="font-weight-bold">{{ row.name }}</td>
              <td>{{ row.tope }}</td>
              <td :class="row.costClass">{{ row.cost }}</td>
              <td>
                <VChip
                  size="x-small"
                  variant="tonal"
                  :color="row.liability === 'limitada' ? 'success' : 'warning'"
                >
                  {{ row.liability }}
                </VChip>
              </td>
              <td>{{ row.mono }}</td>
              <td>{{ row.litE }}</td>
              <td>{{ row.dividendos }}</td>
              <td>{{ row.apertura }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VCard>

    <!-- ══ 6. LOS DOS HALLAZGOS ══ -->
    <h2 class="section-heading mb-1">Dos cosas que casi ninguna guía dice bien</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Si leíste otras páginas sobre esto, es muy probable que te hayan dado mal estos dos números.
    </p>

    <VRow class="mb-6">
      <VCol cols="12" md="6">
        <VCard variant="flat" class="finding-card pa-5 h-100">
          <VChip size="x-small" color="primary" variant="flat" class="mb-2">Hallazgo 1</VChip>
          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            Tu SAS o SRL chica no paga 30,25%. Paga 25%.
          </h3>
          <p class="text-body-2 mb-3">
            Todas las guías repiten “IRAE 25% + 7% de IRPF sobre dividendos = 30,25%”. Es falso para
            la enorme mayoría de las SAS y SRL uruguayas: por debajo de
            <strong>{{ uiLabel(FIGURES.topeIraePreceptivoUi.value) }} UI</strong> de ingresos (≈
            {{ money(topeIraeUyu) }} al año), los dividendos que retirás están
            <strong>EXENTOS de IRPF</strong>.
          </p>
          <VTable density="compact" class="mini-table mb-3">
            <tbody>
              <tr>
                <td>SAS / SRL bajo el tope</td>
                <td class="text-right font-weight-bold">25%</td>
              </tr>
              <tr>
                <td>SAS / SRL sobre el tope</td>
                <td class="text-right">30,25%</td>
              </tr>
              <tr>
                <td>SA — siempre, sin importar el tamaño</td>
                <td class="text-right">30,25%</td>
              </tr>
            </tbody>
          </VTable>
          <p class="text-caption text-medium-emphasis mb-0">
            Base:
            <a
              href="https://www.impo.com.uy/bases/todgi-2023/7-2024"
              target="_blank"
              rel="noopener noreferrer"
              >Título 7 art. 38 lit. C</a
            >, reglamentado por el
            <a
              href="https://www.impo.com.uy/bases/decretos/148-2007"
              target="_blank"
              rel="noopener noreferrer"
              >Dto. 148/007</a
            >, que exonera las utilidades “distribuidas por las sociedades personales cuyos ingresos
            no hayan superado en el ejercicio que dé origen a la distribución el límite establecido
            para liquidar preceptivamente el IRAE en el régimen de contabilidad suficiente” — y ese
            límite (art. 20-TER del mismo decreto) es justamente
            {{ uiLabel(FIGURES.topeIraePreceptivoUi.value) }} UI de ingresos del ejercicio anterior,
            a valores de cierre. Aplica a la SAS porque la
            <a
              href="https://www.impo.com.uy/bases/leyes/19820-2019/42"
              target="_blank"
              rel="noopener noreferrer"
              >Ley 19.820 art. 42</a
            >
            la asimila a las sociedades personales a todos los efectos tributarios, incluida la
            distribución de utilidades — y DGI lo confirmó en la
            <a
              href="https://www.impo.com.uy/bases/consultas-tributarias/6306-2020"
              target="_blank"
              rel="noopener noreferrer"
              >Consulta 6306</a
            >.
          </p>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard variant="flat" class="finding-card pa-5 h-100">
          <VChip size="x-small" color="primary" variant="flat" class="mb-2">Hallazgo 2</VChip>
          <h3 class="text-subtitle-1 font-weight-bold mb-2">
            El director de una SA que no cobra no aporta nada. El administrador de una SAS
            <em>nunca</em> se exonera.
          </h3>
          <p class="text-body-2 mb-3">
            Es el trade-off que nadie cuenta, y es exactamente al revés de lo que uno esperaría de
            la figura “moderna”:
          </p>
          <ul class="finding-list mb-3">
            <li>
              <strong>Director de SA no remunerado:</strong> aporta <strong>cero</strong> (Ley
              16.713 art. 171 lit. A). A cambio, no tiene FONASA.
            </li>
            <li>
              <strong>Administrador de SAS:</strong>
              <strong>{{ money(FIGURES.bpsAdminSas.value) }} por mes</strong> aunque no cobre sueldo
              ni facture un peso, y no puede declararse sin actividad — “en ningún caso regirá la
              exoneración del art. 171”. A cambio, sí obtiene FONASA.
            </li>
            <li>
              El <strong>mero accionista</strong> de una SAS, que no administra ni representa,
              <strong>no aporta a BPS</strong>: el art. 172 no alcanza a las sociedades por
              acciones.
            </li>
          </ul>
          <VAlert type="warning" variant="tonal" density="compact">
            Una SAS unipersonal (accionista único = administrador) paga como mínimo
            <strong>{{ money(FIGURES.bpsAdminSas.value) }} por mes</strong> aunque el negocio no
            arranque. Es el costo real de la figura, y casi nunca aparece en los comparativos.
          </VAlert>
          <p class="text-caption text-medium-emphasis mt-3 mb-0">
            Base:
            <a
              href="https://www.impo.com.uy/bases/leyes/16713-1995/171"
              target="_blank"
              rel="noopener noreferrer"
              >Ley 16.713 art. 171 lit. A</a
            >
            — exentos los Directores “que no perciben remuneración de clase alguna, debiéndose
            probar dicho extremo, mediante certificado notarial o contable” (o sea: la exoneración
            existe, pero hay que probarla) — y
            <a
              href="https://www.impo.com.uy/bases/leyes/19820-2019/43"
              target="_blank"
              rel="noopener noreferrer"
              >Ley 19.820 art. 43</a
            >, que manda al administrador de la SAS al art. 172 de la Ley 16.713 y le cierra esa
            puerta: “en ningún caso regirá la exoneración del artículo 171”.
          </p>
        </VCard>
      </VCol>
    </VRow>

    <!-- ══ 6b. FICHA POR RÉGIMEN ══ -->
    <h2 class="section-heading mb-1">Ficha de cada régimen</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Qué es, con qué respondés, y de dónde salió cada cosa.
    </p>

    <VRow class="mb-6">
      <VCol v-for="reg in REGIMES" :key="reg.id" cols="12" md="6">
        <VCard variant="flat" class="regime-card pa-5 h-100">
          <div class="d-flex flex-wrap align-center ga-2 mb-2">
            <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ reg.name }}</h3>
            <VChip
              size="x-small"
              variant="tonal"
              :color="reg.liability === 'limitada' ? 'success' : 'warning'"
            >
              Resp. {{ reg.liability }}
            </VChip>
          </div>
          <p class="text-body-2 mb-3">{{ reg.short }}</p>

          <div v-if="reg.lockout" class="lockout-box mb-3">
            <div class="text-overline mb-1">
              <VIcon size="14" color="warning" class="mr-1">mdi-lock-clock</VIcon>
              Cerrojo de salida — {{ reg.lockout.years }} años
            </div>
            <p class="text-body-2 mb-1">{{ reg.lockout.text }}</p>
            <a :href="reg.lockout.url" target="_blank" rel="noopener noreferrer" class="norm-link">
              {{ reg.lockout.norm }}
              <VIcon size="12">mdi-open-in-new</VIcon>
            </a>
          </div>

          <div class="text-overline text-medium-emphasis mb-1">Fuentes</div>
          <ul class="sources-list mb-0">
            <li v-for="s in reg.sources" :key="s.url">
              <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
            </li>
          </ul>
        </VCard>
      </VCol>
    </VRow>

    <!-- Escalas -->
    <VRow class="mb-6">
      <VCol cols="12" md="6">
        <VCard variant="flat" class="section-card pa-5 h-100">
          <h3 class="text-subtitle-1 font-weight-bold mb-1">IRPF Categoría II — la escala 2026</h3>
          <p class="text-body-2 text-medium-emphasis mb-3">
            El camino sólido del freelance profesional. Es progresiva, y arranca con un mínimo no
            imponible de
            <strong>{{ money(FIGURES.irpfMinimoNoImponibleMensual.value) }} al mes</strong>: por eso
            al principio suele ganarle al IRAE.
          </p>
          <div class="table-scroll">
            <VTable density="compact" class="mini-table">
              <thead>
                <tr>
                  <th>Renta computable mensual</th>
                  <th class="text-right">Tasa</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(b, i) in IRPF_CAT2.brackets" :key="i">
                  <td>{{ bracketLabel(i, b.upTo, IRPF_CAT2.brackets) }}</td>
                  <td class="text-right font-weight-bold">{{ pct(b.rate) }}</td>
                </tr>
              </tbody>
            </VTable>
          </div>
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            Se deduce un ficto de gastos del {{ pct(FIGURES.irpfFictoGastos.value) }} (no gastos
            reales). ·
            <a :href="IRPF_CAT2.source" target="_blank" rel="noopener noreferrer">
              BPS — escalas IRPF {{ IRPF_CAT2.verifiedAt }}
            </a>
          </p>
        </VCard>
      </VCol>

      <VCol cols="12" md="6">
        <VCard variant="flat" class="section-card pa-5 h-100">
          <h3 class="text-subtitle-1 font-weight-bold mb-1">IRAE ficto — no es un 12% plano</h3>
          <p class="text-body-2 text-medium-emphasis mb-3">
            El Dto. 150/007 art. 64 fija una <strong>escala por tramos</strong> de facturación anual
            en UI, y es <strong>marginal</strong>: cada tramo se aplica solo a la parte de la
            facturación que cae dentro de él (“a las ventas… <em>comprendidas en cada tramo</em>, se
            aplicará el porcentaje correspondiente <em>a dicho tramo</em>”). Sobre esa renta ficta
            se paga el {{ pct(FIGURES.irae.value) }}.
          </p>
          <div class="table-scroll">
            <VTable density="compact" class="mini-table">
              <thead>
                <tr>
                  <th>Tramo de facturación anual</th>
                  <th class="text-right">Renta ficta</th>
                  <th class="text-right">IRAE efectivo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(b, i) in IRAE_FICTO.brackets" :key="i">
                  <td>{{ uiBracketLabel(i, b.upToUi, IRAE_FICTO.brackets) }}</td>
                  <td class="text-right">{{ pct(b.rate) }}</td>
                  <td class="text-right font-weight-bold">
                    {{ pct(b.rate * FIGURES.irae.value, 1) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>
          <VAlert type="warning" variant="tonal" density="compact" class="mt-3">
            <strong>La SA no puede usar el ficto — a ningún nivel de facturación.</strong> El Dto.
            150/007 art. 168 lit. a) la obliga a llevar contabilidad suficiente siempre. Por eso
            esta página <em>nunca</em> le va a poner precio al IRAE de una SA.
          </VAlert>
        </VCard>
      </VCol>
    </VRow>

    <!-- ══ 7. SOCIEDAD DE HECHO ══ -->
    <VCard variant="flat" class="danger-card pa-5 pa-sm-6 mb-6">
      <div class="d-flex align-center ga-2 mb-3">
        <VIcon color="error" size="26">mdi-alert-octagon-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">
          Sociedad de hecho: no hace falta que la quieras crear
        </h2>
      </div>
      <p class="text-body-2 mb-3">
        Se configura <strong>por los hechos</strong>. Dos personas que empiezan a operar juntas ya
        son una (Ley 16.060 art. 36), y se prueba por cualquier medio (art. 41). No hay que firmar
        nada.
      </p>
      <ul class="danger-list">
        <li>
          <strong>Responsabilidad solidaria e ilimitada, sin beneficio de excusión</strong>
          (art. 39): un acreedor puede ir por el <strong>100%</strong> de la deuda contra el socio
          que tenga bienes, <strong>directamente</strong>, sin pasar antes por la sociedad, y
          <strong>sin importar el porcentaje que hayan pactado</strong>.
        </li>
        <li>Los pactos internos <strong>no son oponibles a terceros</strong> (art. 37).</li>
        <li>
          <strong
            >Art. 43: cualquier socio puede exigir la disolución con solo notificar a los
            demás.</strong
          >
          Tu socio puede volar la empresa un martes cualquiera.
        </li>
        <li>
          Regularizarla después <strong>no limpia la responsabilidad anterior</strong> (art. 42).
        </li>
      </ul>
      <p class="text-body-2 mt-3 mb-0">
        Es barata solo hasta el día que algo sale mal. Si van a tomar deuda, contratar gente o
        firmar contratos con penalidades, la SAS cuesta
        {{ money(FIGURES.setupSas.value) }} y separa los patrimonios.
      </p>
      <div class="mt-3">
        <a
          href="https://www.impo.com.uy/bases/leyes/16060-1989"
          target="_blank"
          rel="noopener noreferrer"
          class="norm-link"
        >
          Ley 16.060 arts. 36-43
          <VIcon size="12">mdi-open-in-new</VIcon>
        </a>
      </div>
    </VCard>

    <!-- ══ 8. TRÁMITES ══ -->
    <h2 class="section-heading mb-1">Trámites: qué es obligatorio y qué no</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Sin empleados, la lista es mucho más corta de lo que te van a decir.
    </p>

    <VCard variant="flat" class="section-card mb-4">
      <div class="table-scroll">
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>Organismo</th>
              <th>¿Obligatorio?</th>
              <th>¿Cuándo?</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in tramites" :key="t.org">
              <td class="font-weight-bold">{{ t.org }}</td>
              <td>
                <VChip size="x-small" variant="tonal" :color="t.always ? 'error' : 'primary'">
                  {{ t.always ? 'SIEMPRE' : 'Condicional' }}
                </VChip>
              </td>
              <td>{{ t.when }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VCard>

    <VCard variant="flat" class="myths-card pa-5 pa-sm-6 mb-6">
      <h3 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon start color="error">mdi-close-octagon-outline</VIcon>
        Las tres cosas que los blogs uruguayos dicen mal
      </h3>
      <div v-for="(m, i) in myths" :key="i" class="myth">
        <div class="myth-claim">
          <VIcon size="16" color="error" class="mr-1">mdi-close</VIcon>
          <span>“{{ m.claim }}”</span>
        </div>
        <p class="myth-truth mb-0">
          <strong>{{ m.verdict }}</strong> {{ m.why }}
        </p>
      </div>
    </VCard>

    <!-- ══ 9. APOYOS ══ -->
    <h2 class="section-heading mb-1">Apoyos que existen de verdad</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Con la fecha real de cierre. No publicamos ninguna tasa de BROU para empresas:
      <strong>BROU no las publica</strong>, y cualquier cifra que circule es inventada.
    </p>

    <VCard variant="flat" class="section-card mb-3">
      <div class="table-scroll">
        <VTable density="comfortable">
          <thead>
            <tr>
              <th>Programa</th>
              <th>Qué da</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in apoyos" :key="a.name">
              <td class="font-weight-bold">{{ a.name }}</td>
              <td>{{ a.gives }}</td>
              <td>
                <VChip size="x-small" variant="tonal" :color="a.color">{{ a.status }}</VChip>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
    </VCard>

    <VAlert type="info" variant="tonal" density="comfortable" class="mb-6">
      <p class="mb-1">
        <strong>Dos números que casi todo el mundo copia mal:</strong>
      </p>
      <ul class="apoyo-notes mb-2">
        <li>
          Los porcentajes de INEFOP <strong>80/70/50</strong> que repiten las consultoras son de un
          PDF de 2019. Los vigentes son <strong>85/75/60/40/50</strong> — cinco tramos, no tres (85%
          micro, 75% pequeña, 60% mediana, y dos tramos más en la grilla vigente). Confirmá cuál te
          toca antes de presupuestar la capacitación.
        </li>
        <li>
          ANDE Semilla exige facturación ≤ $2.000.000 en 6 meses; ANII exige ≤ $2.400.000.
          <strong>No son el mismo número.</strong>
        </li>
      </ul>
      <p class="text-caption mb-0">
        Cifras y fechas de los apoyos verificadas contra la web del organismo el
        {{ APOYOS_VERIFIED_AT }} (los apoyos tienen su propia fecha: no son cifras legales y no se
        mueven con ellas). Los llamados cambian: confirmá en la web del organismo (<a
          href="https://www.ande.org.uy/"
          target="_blank"
          rel="noopener noreferrer"
          >ANDE</a
        >, <a href="https://www.anii.org.uy/" target="_blank" rel="noopener noreferrer">ANII</a>,
        <a href="https://www.inefop.org.uy/" target="_blank" rel="noopener noreferrer">INEFOP</a>)
        antes de postularte.
      </p>
    </VAlert>

    <!-- ══ 10. LO QUE NO PODEMOS AFIRMAR ══ -->
    <VCard variant="flat" class="honest-card pa-5 pa-sm-6 mb-6">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon color="primary" size="26">mdi-scale-balance</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">Lo que no podemos afirmar</h2>
      </div>
      <p class="text-body-2 mb-4">
        Es la sección más valiosa de esta página, y la que ninguna content farm escribe. Acá termina
        lo que se puede verificar contra una fuente primaria. Lo que sigue no lo sabemos —
        <strong>y por eso no lo inventamos</strong>.
      </p>
      <div v-for="(u, i) in unknowns" :key="i" class="unknown">
        <div class="unknown-q">
          <VIcon size="16" color="primary" class="mr-1">mdi-help-circle-outline</VIcon>
          <span>{{ u.q }}</span>
        </div>
        <p class="unknown-a mb-0">{{ u.a }}</p>
      </div>
    </VCard>

    <!-- ══ 11. FAQ ══ -->
    <h2 class="section-heading mb-3">Preguntas frecuentes</h2>
    <VExpansionPanels class="mb-6 faq-panels">
      <VExpansionPanel v-for="(f, i) in faq" :key="i">
        <VExpansionPanelTitle>{{ f.q }}</VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="text-body-2 mb-0">{{ f.a }}</p>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- ══ 12. FUENTES ══ -->
    <VCard variant="flat" class="section-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-1">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes primarias
      </h2>
      <p class="text-caption text-medium-emphasis mb-3">
        {{ sources.length }} fuentes, todas oficiales (BPS, DGI, IMPO, gub.uy). Ninguna cifra legal
        de esta página —topes, aportes, tasas— se publica sin una de ellas; los montos de los apoyos
        llevan su propia fecha de verificación contra la web de cada organismo. Última verificación:
        <strong>{{ verifiedAt }}</strong
        >.
      </p>
      <ul class="sources-list">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.org }}</a>
          <span class="src-items"> — {{ s.items.join(' · ') }}</span>
          <span class="src-date"> · verificado {{ s.verifiedAt }}</span>
        </li>
      </ul>
    </VCard>

    <!-- ══ 13. DISCLAIMER ══ -->
    <VAlert type="warning" variant="tonal" density="comfortable" class="mb-6">
      Esta página es información general, no asesoramiento legal ni contable. Las cifras se
      verifican contra BPS, DGI e IMPO, pero cambian por decreto. Antes de decidir, confirmá con un
      contador o escribano.
    </VAlert>

    <!-- ══ 14. CROSS-LINKS ══ -->
    <VRow class="my-6">
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/herramientas/calculadora-irpf')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-calculator-variant-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Calculadora de IRPF</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Si vas por IRPF Cat. II, mirá cuánto te toca de impuesto en serio.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/salud-financiera')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Salud financiera</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Antes de formalizar: fondo de emergencia, presupuesto y deuda.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/inversiones-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-chart-line</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Invertir en Uruguay</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Qué hacer con la plata que la empresa empieza a dejar.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import {
  FIGURES,
  IRAE_FICTO,
  IRPF_CAT2,
  MARKET_ESTIMATES,
  REGIMES,
  evaluate,
  type CostBreakdown,
  type Eligibility,
  type RankedRegime,
  type RegimeId,
  type Warning,
  type WizardInput,
} from '~/utils/companyTypes'
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()

// ── formatters ────────────────────────────────────────────────────────────────
const money = (n: number | null | undefined) => formatUYU(n, 0)
const pct = (n: number, decimals = 0) =>
  n.toLocaleString('es-UY', { style: 'percent', maximumFractionDigits: decimals })
const uiLabel = (n: number) => n.toLocaleString('es-UY')

/** Every FIGURE shares one verification date; read it from the data, don't retype it. */
const verifiedAt = FIGURES.bpc.verifiedAt

/**
 * The art. 168 tope in pesos, valued at the UI de CIERRE — the date the norm itself names.
 * Same conversion `companyTypes` uses; never today's UI, which moves daily.
 */
const topeIraeUyu = FIGURES.topeIraePreceptivoUi.value * FIGURES.uiCierre2025.value

// ── wizard state ──────────────────────────────────────────────────────────────
const currency = ref<'UYU' | 'USD'>('UYU')
const revenue = ref(600_000)
const sells = ref<WizardInput['sells']>('bienes')
const clients = ref<WizardInput['clients']>('consumidor-final')
const people = ref<WizardInput['people']>('solo')
const employees = ref(0)
const needsLimitedLiability = ref(false)

// Socios. `null` means "we were never told" — which is NOT the same as a measured 0, and the
// engine treats the two differently on purpose (an unknown must never become a measurement).
const sociosCount = ref<number | null>(null)
const sociosActivos = ref<number | null>(null)
const sociosFamiliares = ref(false)

// Ajustes finos.
const otherCompanyRole = ref(false)
const cajaProfesional = ref(false)
const family = ref<NonNullable<WizardInput['family']>>('solo')
const eFactura = ref(false)
const yearsOperating = ref(0)
const fonasaFromJob = ref(false)
const localTooBig = ref(false)
const midesEligible = ref(false)
const assets = ref<number | null>(null)
/**
 * IMPORTANT 3 — this used to be `ref(1)`, and the input was clamped with `Math.max(1, …)`, so the
 * engine NEVER saw `undefined`. That killed the one branch that had a law behind it: Ley 19.820
 * art. 29 supplies the default itself ("salvo que otra cosa se dispusiera en los estatutos, la
 * totalidad de las funciones … le corresponderán AL REPRESENTANTE LEGAL"), and the engine
 * discloses exactly that when it is not told a number. What rendered instead was "Nombraste 1
 * administradores" — a claim about something the visitor never said, with the citation that
 * justified it thrown away. `null` = we were never told. The engine's `?? 1` and its art. 29 note
 * do the rest.
 */
const administradoresSas = ref<number | null>(null)
const accountant = ref(MARKET_ESTIMATES.contadorMensual.value)

const sociosCountItems = [
  { title: 'No lo sé todavía', value: null },
  { title: '2 socios', value: 2 },
  { title: '3 socios', value: 3 },
  { title: '4 socios', value: 4 },
  { title: '5 socios', value: 5 },
  { title: '6 socios o más', value: 6 },
]
const sociosActivosItems = [
  { title: 'No lo sé todavía', value: null },
  { title: 'Ninguno (la maneja un gerente contratado)', value: 0 },
  { title: '1 socio trabaja', value: 1 },
  { title: '2 socios trabajan', value: 2 },
  { title: '3 socios trabajan', value: 3 },
  { title: '4 socios trabajan', value: 4 },
  { title: '5 socios o más', value: 5 },
]
const familyItems = [
  { title: 'Solo/a, sin hijos a cargo', value: 'solo' },
  { title: 'Con hijos a cargo', value: 'con-hijos' },
  { title: 'Con cónyuge o concubino/a', value: 'con-conyuge' },
  { title: 'Con cónyuge e hijos a cargo', value: 'con-conyuge-e-hijos' },
]
/**
 * MINOR 5 — there used to be a fifth option, `{ title: 'Cuarto año o más (régimen pleno)', value:
 * 4 }`, and it produced output IDENTICAL to `value: 3`: every ramp in the engine is at most 3
 * long, so anything past its end lands on the pleno figure. It was also off by one — 4 FULL years
 * of activity is your fifth year, not your fourth. One option per distinct answer.
 */
const yearsItems = [
  { title: 'Recién arranco (año 1)', value: 0 },
  { title: 'Segundo año', value: 1 },
  { title: 'Tercer año', value: 2 },
  { title: 'Cuarto año o más (régimen pleno)', value: 3 },
]

// ── live USD, for the revenue toggle ──────────────────────────────────────────
const { bestBuy } = useExchangeRates()
const usdRate = computed(() => bestBuy('USD'))
const annualRevenueUyu = computed(() => {
  const v = Number(revenue.value) || 0
  return currency.value === 'USD' && usdRate.value ? Math.round(v * usdRate.value) : v
})

const accountantFee = computed(() => {
  const v = Number(accountant.value)
  return Number.isFinite(v) && v >= 0 ? v : MARKET_ESTIMATES.contadorMensual.value
})

/**
 * What the visitor actually TOLD us about the número de administradores — `undefined` when they
 * did not, which is the default and the normal case.
 *
 * A blank, a zero or a negative is NOT a measured zero: Ley 19.820 arts. 29 y 30 put the
 * administración "a cargo de UNA O MÁS personas", so a SAS with zero administradores does not
 * exist and "0" can only be an empty or mistyped field. It goes back to `undefined`, and the
 * engine answers with the statutory one — citing art. 29 for it.
 */
const administradoresSasInput = computed<number | undefined>(() => {
  const v = Math.floor(Number(administradoresSas.value))
  return Number.isFinite(v) && v >= 1 ? v : undefined
})

/**
 * Q4 "Con cónyuge o concubino/a" (a unipersonal con cónyuge colaborador, Ley 18.083
 * art. 70 lit. A) must actually move the FONASA column, not just sit there. So when
 * the headline question says there is a spouse, fold that into `family` — upgrading
 * whatever the fine-adjust says to its con-cónyuge variant — instead of leaving the
 * choice inert until the user also opens Ajustes finos.
 */
const effectiveFamily = computed<NonNullable<WizardInput['family']>>(() => {
  if (people.value !== 'conyuge') return family.value
  return family.value === 'con-hijos' || family.value === 'con-conyuge-e-hijos'
    ? 'con-conyuge-e-hijos'
    : 'con-conyuge'
})

const input = computed<WizardInput>(() => {
  const socios = people.value === 'socios'
  return {
    annualRevenueUyu: annualRevenueUyu.value,
    sells: sells.value,
    clients: clients.value,
    people: people.value,
    employees: Number(employees.value) || 0,
    needsLimitedLiability: needsLimitedLiability.value,
    otherCompanyRole: otherCompanyRole.value,
    // `?? undefined` — never `?? 0`, never `?? 1`. An unasked question stays unasked.
    sociosCount: socios ? (sociosCount.value ?? undefined) : undefined,
    sociosActivos: socios ? (sociosActivos.value ?? undefined) : undefined,
    sociosFamiliares: socios ? sociosFamiliares.value : undefined,
    // Never `?? 1`: Ley 19.820 art. 29 already supplies the residual, and the engine applies it
    // WITH the citation. An unasked question stays unasked (IMPORTANT 3).
    administradoresSas: administradoresSasInput.value,
    cajaProfesional: cajaProfesional.value,
    family: effectiveFamily.value,
    eFactura: eFactura.value,
    yearsOperating: Number(yearsOperating.value) || 0,
    fonasaFromJob: fonasaFromJob.value,
    localTooBig: localTooBig.value,
    midesEligible: midesEligible.value,
    assetsUyu: assets.value ?? undefined,
  }
})

const verdict = computed(() => evaluate(input.value, accountantFee.value))

// ── regime lookups ────────────────────────────────────────────────────────────
const regimeOf = (id: RegimeId) => REGIMES.find(r => r.id === id)
const regimeName = (id: RegimeId) => regimeOf(id)?.name ?? id
const regimeShort = (id: RegimeId) => regimeOf(id)?.short ?? ''
const liabilityOf = (id: RegimeId) => regimeOf(id)?.liability ?? 'ilimitada'

const recommended = computed<RankedRegime | null>(
  () => verdict.value.ranked.find(r => r.regime === verdict.value.recommended) ?? null
)

/**
 * IS THIS A PRICE? — the guard the renderer did not have.
 *
 * It guarded `null` (`bpsValue`/`taxValue` → "No calculable") and never guarded a ZERO, so a
 * regime whose components had quietly collapsed to nothing printed "$ 0 / mes" as a price, in the
 * verdict card and in the comparison table, ranked first. The engine bug that produced it is
 * fixed — but "$0 as a price" is a CLASS of bug, and the class is what has to become
 * unshippable: every regime on this page charges the owner something, so a zero can only ever
 * mean a component went missing on the way here. It is never news the visitor can act on, and it
 * is always the cheapest-looking number on the screen.
 *
 * Rounded, because the page renders rounded pesos: $0,40 must not print as "$ 0" either.
 */
const isPrice = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && Math.round(n) > 0

/** Only a regime with a REAL price may be presented as the recommendation. */
const recommendedPriced = computed(
  () => recommended.value !== null && isPrice(recommended.value.cost?.totalMonthly)
)

/** True when the engine picked a regime but its total is not a price. Then we show no verdict. */
const zeroPricedRecommendation = computed(
  () => verdict.value.recommended !== null && !recommendedPriced.value
)

const noVerdictText = computed(
  () =>
    verdict.value.noRecommendation ??
    'Con los datos que nos diste, el régimen más barato de los que podrías usar da un costo mensual de CERO — y cero no es un precio: es la señal de que falta un componente. Puede ser un dato del formulario que se contradice con otro (por ejemplo, que nadie trabaje en la empresa y tampoco haya empleados), unos honorarios de contador puestos en cero, o una facturación en cero. Preferimos decírtelo antes que mostrarte un $0 que no vas a pagar: revisá la facturación, los honorarios y cuántos socios trabajan en la empresa.'
)

/** Everything we did NOT present as the verdict — so nothing ever disappears from the page. */
const others = computed(() =>
  verdict.value.ranked.filter(
    r => !recommendedPriced.value || r.regime !== verdict.value.recommended
  )
)

/** How much MORE per month than the recommendation. `null` when either side has no price. */
function extraCost(r: RankedRegime): number | null {
  const mine = r.cost?.totalMonthly
  const best = recommended.value?.cost?.totalMonthly
  // Both sides must be REAL prices: comparing against a recommendation we are not even showing
  // (because its total is not a price) would quote a difference from nothing.
  if (!recommendedPriced.value || !isPrice(mine) || !isPrice(best)) return null
  const diff = Math.round(mine - best)
  return diff > 0 ? diff : null
}

const statusLabel = (s: Eligibility) =>
  s === 'excluido' ? 'No podés usarlo' : s === 'dudoso' ? 'Zona gris' : 'Elegible'
const statusColor = (s: Eligibility) =>
  s === 'excluido' ? 'error' : s === 'dudoso' ? 'warning' : 'success'

const warningTitle = (w: Warning) =>
  w.kind === 'lockout'
    ? 'Cerrojo de salida'
    : w.kind === 'liability'
      ? 'Respondés con tu patrimonio personal'
      : 'Hay un camino más barato, y no te lo recomendamos'

/**
 * The BPS line's value. `null` is NOT zero — that exact `?? 0` is the bug that once told a CJPPU
 * professional the freelance path was free. A recommended regime is always `comparable`, so this
 * can only take the `money` branch there; the guard exists so it stays true if it is ever reused.
 */
function bpsValue(cost: CostBreakdown): string {
  if (cost.bpsUnknown || cost.bpsMonthly === null) return 'No calculable'
  // A MEASURED zero (an SRL whose socios are purely capitalist: Ley 16.713 art. 172 charges only
  // the socio "que desarrolle actividad"). It is a real fact, and it is still not a price — so it
  // is said in words, not printed as "$ 0" next to numbers that are.
  if (Math.round(cost.bpsMonthly) <= 0) return 'Nadie aporta'
  return money(cost.bpsMonthly)
}

/** The tax line's name, per regime. */
function taxTitle(id: RegimeId): string {
  switch (id) {
    case 'monotributo':
    case 'monotributo-social':
      return 'Impuestos'
    case 'unipersonal-literal-e':
      return 'IVA mínimo'
    case 'irpf-servicios':
      return 'IRPF Cat. II'
    default:
      return 'IRAE (ficto)'
  }
}

/**
 * The tax line's VALUE. A `null` tax is NEVER a zero, and the monotributo's genuine zero is not a
 * price at all — it is a substitution, and saying "$0" instead of saying so is how a reader ends
 * up believing the regime has no tax rather than that its tax is inside the pago único.
 */
function taxValue(id: RegimeId, cost: CostBreakdown): string {
  if (cost.taxUnknown || cost.taxMonthly === null) return 'No calculable'
  if (Math.round(cost.taxMonthly) <= 0) {
    // The monotributo's zero is a SUBSTITUTION, not an absence — saying "$0" is how a reader ends
    // up believing the regime has no tax rather than that its tax is inside the pago único. The
    // other regimes' zero is a real exemption (bajo el mínimo no imponible del IRPF, o sin
    // facturación). Neither is a price.
    return id === 'monotributo' || id === 'monotributo-social' ? 'En el pago único' : 'No pagás'
  }
  return money(cost.taxMonthly)
}

/** A setup cost of zero is a real fact (a sociedad de hecho forms itself), not a missing number. */
const setupLabel = (n: number) => (n > 0 ? money(n) : 'sin costo estatal')

// ── comparison table ──────────────────────────────────────────────────────────
const topeMonotributoLabel = computed(() =>
  people.value === 'socios'
    ? money(FIGURES.topeMonotributoSociedadUyu.value)
    : money(FIGURES.topeMonotributoUnipersonalUyu.value)
)
/**
 * Two different rules that share a number, and used to share a sentence — which is how the IRPF
 * row ended up asserting the IRAE ficto's rule (art. 168 lit. b, about an IRAE taxpayer's books)
 * as if it governed a persona física in Categoría II. It does not: what closes the IRPF path is
 * the inclusión preceptiva of Dto. 150/007 art. 7, measured on the rentas of the CURRENT ejercicio
 * and biting from the first month of the NEXT one.
 */
const sinTopeIrae = computed(
  () =>
    `Sin tope propio; sobre ${uiLabel(FIGURES.topeIraePreceptivoUi.value)} UI (ingresos del ejercicio anterior) la contabilidad suficiente es preceptiva y el IRAE pasa a ser real`
)
const sinTopeIrpf = computed(
  () =>
    `Sin tope propio, pero sobre ${uiLabel(FIGURES.topeIrpfIraePreceptivoUi.value)} UI de rentas del ejercicio el IRAE es PRECEPTIVO desde el primer mes del ejercicio siguiente (Dto. 150/007 art. 7): este régimen se termina`
)

interface CmpRow {
  id: RegimeId
  name: string
  tope: string
  cost: string
  costClass: string
  liability: string
  mono: string
  litE: string
  dividendos: string
  apertura: string
}

const dividendosSocietarios = computed(
  () =>
    `0% de IRPF bajo ${uiLabel(FIGURES.topeIraePreceptivoUi.value)} UI → 25% total; por encima, 30,25%`
)

const comparison = computed<CmpRow[]>(() =>
  REGIMES.map(reg => {
    const r = verdict.value.ranked.find(x => x.regime === reg.id)
    // `isPrice`, not `!== null`: a zero is not a price here either (CRITICAL 1, page half).
    const priced = r?.comparable === true && isPrice(r.cost?.totalMonthly)
    const cost =
      r === undefined
        ? '—'
        : r.status === 'excluido'
          ? 'No podés usarlo'
          : priced
            ? `${money(r.cost?.totalMonthly)} / mes`
            : 'No calculable'
    const costClass = r?.status === 'excluido' ? 'cell-out' : priced ? 'cell-price' : 'cell-unknown'

    const base = { id: reg.id, name: reg.name, cost, costClass, liability: reg.liability }

    switch (reg.id) {
      case 'monotributo-social':
        return {
          ...base,
          tope: topeMonotributoLabel.value,
          mono: 'Es el régimen (variante MIDES)',
          litE: 'No — son regímenes excluyentes',
          dividendos: '—',
          apertura: 'Sin costo',
        }
      case 'monotributo':
        return {
          ...base,
          tope: topeMonotributoLabel.value,
          mono: 'Es el régimen',
          litE: 'No — son regímenes excluyentes',
          dividendos: '—',
          apertura: money(FIGURES.setupUnipersonal.value),
        }
      case 'unipersonal-literal-e':
        return {
          ...base,
          tope: money(FIGURES.topeLiteralEUyu.value),
          mono: 'No',
          litE: 'Es el régimen',
          dividendos: '—',
          apertura: money(FIGURES.setupUnipersonal.value),
        }
      case 'irpf-servicios':
        return {
          ...base,
          tope: sinTopeIrpf.value,
          mono: 'No — Ley 18.083 art. 72 lit. C',
          litE: 'Zona gris (Consulta DGI 4761)',
          dividendos: '—',
          apertura: money(FIGURES.setupUnipersonal.value),
        }
      case 'unipersonal-irae':
        return {
          ...base,
          tope: 'Sin tope',
          mono: 'No',
          litE: 'No — al optar por IRAE quedás fuera',
          dividendos: '—',
          apertura: money(FIGURES.setupUnipersonal.value),
        }
      case 'sociedad-hecho':
        return {
          ...base,
          tope: sinTopeIrae.value,
          mono: `Sí — hasta ${FIGURES.monotributoSociosMaxSinFamilia.value} socios (${FIGURES.monotributoSociosMaxFamilia.value} si son familiares)`,
          litE: 'Sí',
          dividendos: '—',
          apertura: 'Sin costo (se configura sola)',
        }
      case 'srl':
        return {
          ...base,
          tope: sinTopeIrae.value,
          mono: 'No — Ley 18.083 art. 70 es taxativo',
          litE: 'Sí',
          dividendos: dividendosSocietarios.value,
          apertura: `${money(FIGURES.setupSrl.value)} + escribano y publicaciones (a cotización)`,
        }
      case 'sas':
        return {
          ...base,
          tope: sinTopeIrae.value,
          mono: 'No — Ley 18.083 art. 70 es taxativo',
          litE: 'Sí',
          dividendos: dividendosSocietarios.value,
          apertura: `${money(FIGURES.setupSas.value)} (sin escribano, 100% digital)`,
        }
      case 'sa':
      default:
        return {
          ...base,
          tope: 'Sin tope',
          mono: 'No — Ley 18.083 art. 70 es taxativo',
          litE: 'No hallamos la exclusión en norma vigente → ver "Lo que no podemos afirmar"',
          dividendos: '7% siempre → 30,25% total',
          apertura: `${money(FIGURES.icosaConstitucion.value)} de ICOSA + escribano y publicaciones (a cotización)`,
        }
    }
  })
)

/** `hasta 7 BPC` → readable range labels, derived from the bracket table itself. */
function bracketLabel(
  i: number,
  upTo: number | null,
  brackets: ReadonlyArray<{ upTo: number | null }>
): string {
  const prev = i === 0 ? 0 : (brackets[i - 1]?.upTo ?? 0)
  if (upTo === null) return `Más de ${money(prev)}`
  if (i === 0) return `Hasta ${money(upTo)}`
  return `${money(prev)} a ${money(upTo)}`
}
function uiBracketLabel(
  i: number,
  upToUi: number | null,
  brackets: ReadonlyArray<{ upToUi: number | null }>
): string {
  const prev = i === 0 ? 0 : (brackets[i - 1]?.upToUi ?? 0)
  if (upToUi === null) return `Más de UI ${uiLabel(prev)}`
  if (i === 0) return `Hasta UI ${uiLabel(upToUi)}`
  return `UI ${uiLabel(prev)} a UI ${uiLabel(upToUi)}`
}

// ── static content (spec §§6-9) ───────────────────────────────────────────────
const tramites = [
  {
    org: 'DGI (RUT) + BPS',
    always: true,
    when: 'Al iniciar actividad. Es un solo trámite: formulario 0351 conjunto.',
  },
  {
    org: 'Aportes BPS del titular',
    always: true,
    when: 'Todos los meses. Tener cero empleados NO exime al dueño de aportar por sí mismo.',
  },
  {
    org: 'MTSS (planilla de trabajo)',
    always: false,
    when: 'Solo con 1 o más dependientes. Hoy se genera de los datos de BPS: no es un trámite aparte.',
  },
  { org: 'BSE (seguro de accidentes)', always: false, when: 'Solo con 1 o más dependientes.' },
  {
    org: 'Intendencia (habilitación)',
    always: false,
    when: 'Solo si tenés local comercial o industrial.',
  },
  { org: 'Bomberos', always: false, when: 'Construcciones no destinadas a vivienda.' },
  { org: 'Bromatología / RUNAEV', always: false, when: 'Rubro alimentos (4 UR por local).' },
  {
    org: 'Carné de salud',
    always: false,
    when: 'Para quien trabaja. Es gratis en tu prestador y vale 2 años.',
  },
]

const myths = [
  {
    claim: 'El BSE es obligatorio siempre.',
    verdict: 'Falso sin empleados.',
    why: 'La Ley 16.074 obliga al patrono, definido como quien "utilice el trabajo de otra" (art. 3), y la sanción del art. 56 castiga a quien no aseguró "a su personal". Sin personal dependiente no hay obligación — el BSE vende un seguro voluntario justamente para eso. (Novedad 2025: la Ley 20.396 art. 17 sí cubre a los autónomos de plataformas digitales, con la plataforma como patrono.)',
  },
  {
    claim: 'Hay que presentar la planilla de trabajo del MTSS.',
    verdict: 'Falso sin empleados.',
    why: 'El Decreto 278/017 —que derogó el 108/007, el que muchos blogs siguen citando— ata la obligación al empleador "que tenga personal dependiente". Y hoy la planilla es un reporte que se genera de los datos de BPS, no un trámite aparte.',
  },
  {
    claim: 'Abrí tu unipersonal con "Empresa en el Día".',
    verdict: 'No aplica.',
    why: '"Empresa en el Día" es para constituir personas jurídicas (SRL, SA). Una unipersonal se abre con el formulario 0351 conjunto de DGI y BPS, online, y no necesita nada de eso.',
  },
]

/**
 * MINOR 6 — the apoyos block used to read its date from `FIGURES.bpc.verifiedAt`, so bumping the
 * BPC (a BPS figure, refreshed every January) silently re-dated every ANDE / ANII / INEFOP claim
 * on the page. They are not the same fact and they do not move together: a llamado closes when it
 * closes. Their own date, checked against the organismo's own site.
 */
const APOYOS_VERIFIED_AT = '2026-07-13'

const apoyos = [
  {
    name: 'ANDE Semilla 2026',
    gives:
      'Hasta $1.000.000 no reembolsable (hasta $400.000 sin rendición). Exige facturación ≤ $2.000.000 en 6 meses.',
    status: 'Abierta — cierra 06/10/2026',
    color: 'success',
  },
  {
    name: 'Validación de Ideas (VIN) 2026',
    gives: 'Hasta $200.000 no reembolsable, 90% adelantado.',
    status: 'Abierta — cierra 21/07/2026',
    color: 'warning',
  },
  {
    name: 'ANII — Emprendimientos Innovadores',
    gives: 'Hasta el 80% del proyecto, tope $3.000.000. Exige facturación ≤ $2.400.000.',
    status: 'Ventanilla permanente',
    color: 'primary',
  },
  {
    name: 'SiGa (garantía)',
    gives: 'Cubre hasta el 70% del crédito. Se pide EN EL BANCO, no en SiGa.',
    status: 'Permanente',
    color: 'primary',
  },
  {
    name: 'INEFOP — Capacitación Estándar',
    gives:
      'Subsidio del 85% (micro), 75% (pequeña) o 60% (mediana) — la grilla vigente tiene cinco tramos: 85/75/60/40/50. Requiere Certificado PYME.',
    status: 'Permanente',
    color: 'primary',
  },
  {
    name: 'Certificado PYME (DINAPYME)',
    gives: 'Gratis. Destraba INEFOP, Prodiseño y PIADE.',
    status: 'Permanente',
    color: 'primary',
  },
  {
    name: 'Compras públicas MiPyme',
    gives: 'Margen de preferencia del 8-16% y reserva del 10% del llamado.',
    status: 'Permanente',
    color: 'primary',
  },
]

const unknowns = [
  {
    q: '¿Puede un freelance de servicios puros estar en Literal E?',
    a: 'No lo sabemos. La norma excluye las rentas NO empresariales, y los servicios personales puros son renta de trabajo; la Consulta DGI 4761 apunta en contra. En la práctica se hace masivamente. Por eso lo marcamos "zona gris" y nunca te lo recomendamos, por más barato que salga: el camino sólido y verificado es IRPF Cat. II + IVA en régimen general. Consultá un contador.',
  },
  {
    q: '¿Un profesional con Caja (CJPPU) que factura por una unipersonal aporta a BPS, a la Caja, o a las dos?',
    a: 'Es la incógnita más cara de la página, y no la podemos cerrar. La unipersonal no es una persona jurídica distinta de vos, así que seguís facturando "en nombre propio" — el supuesto del art. 43 de la Ley 17.738. Pero el mismo artículo dice que eso rige "sin perjuicio de las afiliaciones a otros institutos de seguridad social que pudieran corresponder", sin decir cuándo corresponden. Ninguna norma resuelve el choque y la CJPPU no publica su escala. Por eso, si marcás esa casilla, NO te damos un total en NINGÚN régimen: un número inventado en cualquiera de las dos direcciones sería peor que no darte ninguno.',
  },
  {
    q: '¿Qué títulos ampara exactamente la Caja de Profesionales?',
    a: 'El listado no está en la ley. La Ley 17.738 art. 42 remite a las profesiones del régimen anterior (Ley 12.997, de pago en IMPO) más las que incorpore el Directorio de la Caja, y la Ley 20.410 (2025) no las enumera. No existe una lista oficial en bps.gub.uy, dgi.gub.uy, gub.uy ni impo.com.uy. Sí podemos afirmar que el desarrollador de software SIN un título amparado aporta a BPS: BPS define "no profesional" por la actividad, "tengan o no título universitario".',
  },
  {
    q: '¿La SA está excluida del Literal E?',
    a: 'Muchos estudios lo afirman. No encontramos esa exclusión en norma vigente: las exclusiones del Literal E son cuatro y ninguna es por forma jurídica, y DGI describe el régimen como aplicable a "pequeños contribuyentes de cualquier forma jurídica". Es bastante académico —la SA paga ICOSA igual— pero no vamos a repetir una afirmación que no pudimos verificar.',
  },
  {
    q: '¿Sigue existiendo "Empresa en el Día"?',
    a: 'No lo afirmamos ni en un sentido ni en el otro. Las páginas de catálogo están despublicadas (HTTP 403) y la aplicación sigue viva, sin ningún anuncio oficial de discontinuación.',
  },
  {
    q: '¿Cuánto sale un escribano llave en mano, o una "SA ya hecha"?',
    a: 'Nadie publica precio. Los honorarios de escribano, el precio de una sociedad anónima ya constituida, las tasas de BROU a empresas y el costo de la segunda publicación en un diario privado son todos a cotización. No inventamos ninguno, y por eso el "costo de apertura" de la SRL y la SA que ves arriba es solo la parte estatal.',
  },
  {
    q: '¿Cuánto aporta de jubilatorio un servicios-personales que esté en Literal E?',
    a: 'BPS deja esa celda literalmente vacía en la Categoría 1.ª de su tabla de aportación gradual. Podríamos calcularla, pero no la publica y no la inventamos. Por eso presentamos el camino IRPF Cat. II sin gradualidad, que es lo verificado: el descuento de los primeros 3 años (Ley 19.889) es un beneficio del Literal E y del monotributo, y cesa al entrar al régimen general de IVA.',
  },
  {
    q: '¿Y el FONASA del socio de una sociedad de hecho?',
    a: 'La tabla de BPS para esta figura publica un único importe por socio, SIN columna de FONASA: lo que mostramos es jubilatorio + FRL. No sabemos si el socio puede optar por la cobertura ni cuánto le costaría, así que avisamos que, si le corresponde, el aporte real es MAYOR que el que ves.',
  },
  {
    q: '¿El IRAE y el IRPF que muestran son exactos?',
    a: 'No: son un TECHO, a propósito. Al IRAE ficto no le descontamos los sueldos de dueños o socios que el art. 64 admite restar, porque no te preguntamos si te pagás sueldo. Al IRPF no le restamos el crédito por deducciones (aportes, hijos a cargo), que se descuenta a una tasa del 14% o del 8%. En los dos casos, lo que realmente pagarías es MENOS que lo que mostramos — nunca más. Preferimos errar para el lado que no te deja mal parado.',
  },
  {
    q: `El tope de ${uiLabel(FIGURES.topeIraePreceptivoUi.value)} UI, ¿se mide sobre lo que facturás este año o el anterior?`,
    a: 'Sobre el ejercicio ANTERIOR. La contabilidad suficiente se vuelve preceptiva "cuando los ingresos del ejercicio anterior superen" el tope, así que el régimen de este año depende de lo que facturaste el pasado. El formulario solo conoce tu facturación estimada de hoy, no la del año que cerró: cerca del tope, tomá el resultado como una señal para confirmar tu situación real con un contador, no como un veredicto.',
  },
  {
    q: '¿Cuántos administradores puede tener una SAS?',
    a: 'No hay máximo legal. La Ley 19.820 art. 30 pone la representación "a cargo de una o más personas", sin techo, y el estatuto lo define. Por defecto asumimos 1 (el residual del art. 29), pero cada administrador con actividad aporta a BPS: si vas a nombrar varios, decínoslo en los ajustes finos, porque cambia el costo.',
  },
  {
    q: '¿Hay condiciones del monotributo que el recomendador no chequea?',
    a: 'Sí, tres, porque no te las preguntamos y no inventamos una compuerta sin el dato: no verificamos si tenés más de un puesto o local a la vez (Ley 18.083 art. 71 lit. B), ni si tenés otra actividad con aporte patronal (art. 71 lit. C), ni —en el monotributo social— si tu giro es servicio doméstico o construcción, que están excluidos (Decreto 220/012 art. 2). Si alguno es tu caso, el monotributo puede no corresponderte aunque el recomendador no lo marque: confirmalo con BPS o un contador.',
  },
]

const faq = [
  {
    q: '¿Monotributo o unipersonal? ¿Cuál me conviene?',
    a: `Si vendés bienes exclusivamente a consumidores finales, no superás ${money(FIGURES.topeMonotributoUnipersonalUyu.value)} al año, tenés como máximo 1 dependiente y un local de hasta ${FIGURES.topeLocalM2.value} m², el monotributo es claramente más barato. Pero si prestás servicios personales fuera de la relación de dependencia, la Ley 18.083 art. 72 lit. C te deja afuera: no es una opción que puedas elegir, es una puerta cerrada.`,
  },
  {
    q: 'Soy freelance de software. ¿Puedo estar en Literal E?',
    a: 'Es una zona gris real y no la vamos a resolver por vos. El Literal E excluye a quien obtiene rentas NO empresariales, y los servicios personales puros son renta de trabajo; la Consulta DGI 4761 apunta en contra. En la práctica se hace mucho. Nosotros recomendamos el camino verificado —IRPF Cat. II + IVA en régimen general— y te mostramos el Literal E igual, con su precio y su motivo, para que decidas con tu contador.',
  },
  {
    q: '¿Cuánto cuesta abrir una SAS?',
    a: `El trámite estatal cuesta ${money(FIGURES.setupSas.value)} e incluye el registro, el RUT de DGI y el número de empresa de BPS. No necesitás escribano ni publicaciones: se hace 100% online con firma electrónica avanzada. El costo real no es ese: es que cada administrador paga ${money(FIGURES.bpsAdminSas.value)} de BPS por mes aunque no facture un peso.`,
  },
  {
    q: '¿Es verdad que una SAS paga 30,25% de impuestos?',
    a: `No, y es el error más repetido del tema. Por debajo de ${uiLabel(FIGURES.topeIraePreceptivoUi.value)} UI de ingresos (≈ ${money(topeIraeUyu)} al año), los dividendos que retirás de una SAS o una SRL están EXENTOS de IRPF: la carga total es 25%, no 30,25%. El 30,25% es correcto para la SA siempre, y para la SAS/SRL solo por encima de ese tope.`,
  },
  {
    q: 'No tengo empleados. ¿Igual tengo que contratar el BSE y presentar la planilla del MTSS?',
    a: 'No. La Ley 16.074 obliga al patrono —quien "utilice el trabajo de otra"— y el Decreto 278/017 ata la planilla al empleador "que tenga personal dependiente". Sin personal dependiente, ninguna de las dos obligaciones existe. Lo que sí es obligatorio siempre es inscribirte en DGI+BPS y pagar TU propio aporte mensual como titular.',
  },
  {
    q: '¿Qué pasa si me paso del tope del monotributo?',
    a: 'Salís de pleno derecho e inmediato, no "el año que viene". Y no podés volver hasta que termine el TERCER año civil posterior al de la exclusión (Dto. 199/007 arts. 13 y 14). El cerrojo se dispara igual si te vas por tu propia voluntad. Por eso, si esperás crecer rápido, entrar al monotributo para salir en un año puede costarte más caro que arrancar directamente en el régimen siguiente.',
  },
  {
    q: '¿Cuánto tarda realmente tener una SAS operativa?',
    a: 'La sociedad puede nacer en 5 a 15 días hábiles, pero eso no es lo que te frena. El cuello de botella real es bancario: el RUT tarda 15 a 20 días y la cuenta bancaria entre 30 y 40. Ninguna norma regula al banco. Esa es la diferencia entre las "24 horas" del marketing y los ~2 meses hasta que podés cobrarle a un cliente.',
  },
  {
    q: '¿Una SRL o una SAS pueden ser monotributistas?',
    a: 'No. La Ley 18.083 art. 70 es taxativa: el monotributo es solo para la empresa unipersonal y la sociedad de hecho. Ninguna forma societaria puede acogerse, por chica que sea.',
  },
  {
    q: 'Empezamos dos amigos sin firmar nada. ¿Qué somos?',
    a: 'Una sociedad de hecho, y no hizo falta que la quisieran crear: se configura por los hechos (Ley 16.060 art. 36). El problema es que respondés en forma solidaria e ILIMITADA, sin beneficio de excusión: un acreedor puede ir por el 100% de la deuda contra el socio que tenga bienes, sin importar el porcentaje que hayan pactado. Y cualquiera de los dos puede exigir la disolución con solo notificar al otro (art. 43).',
  },
  {
    q: '¿Necesito contador desde el primer día?',
    a: `Depende del régimen. El monotributo y el Literal E son justamente los regímenes pensados para no necesitarlo: el monotributo es un pago único y el Literal E no liquida IRAE. En cambio, una SAS, una SRL, una SA o una unipersonal en IRAE sí lo requieren en la práctica. La cifra de honorarios que usamos por defecto (${money(MARKET_ESTIMATES.contadorMensual.value)}) es una estimación de mercado, no un arancel oficial: ninguna repartición publica uno.`,
  },
]

// ── fuentes, construidas DESDE los datos ──────────────────────────────────────
function sourceOrg(url: string): string {
  let host = ''
  let path = ''
  try {
    const u = new URL(url)
    host = u.hostname.replace(/^www\d*\./, '')
    path = u.pathname
  } catch {
    return url
  }
  if (host.endsWith('bps.gub.uy')) return 'BPS'
  if (host.endsWith('impo.com.uy')) return 'IMPO — normativa'
  if (host.endsWith('bcu.gub.uy')) return 'BCU'
  if (host.endsWith('ine.gub.uy')) return 'INE'
  if (host.endsWith('gub.uy')) {
    if (path.includes('direccion-general-impositiva')) return 'DGI'
    if (path.startsWith('/tramites')) return 'gub.uy — Trámites'
    return 'gub.uy'
  }
  return host
}

interface SourceEntry {
  url: string
  org: string
  items: string[]
  verifiedAt: string
}

const sources = computed<SourceEntry[]>(() => {
  const map = new Map<string, SourceEntry>()
  const add = (url: string, item: string, when: string) => {
    const e = map.get(url)
    if (e) {
      if (!e.items.includes(item)) e.items.push(item)
      return
    }
    map.set(url, { url, org: sourceOrg(url), items: [item], verifiedAt: when })
  }

  for (const f of Object.values(FIGURES)) add(f.source, f.label, f.verifiedAt)
  add(IRPF_CAT2.source, 'Escala del IRPF Cat. II 2026', IRPF_CAT2.verifiedAt)
  add(IRAE_FICTO.source, 'Escala del IRAE ficto (Dto. 150/007 art. 64)', IRAE_FICTO.verifiedAt)
  for (const reg of REGIMES) {
    for (const s of reg.sources) add(s.url, s.label, verifiedAt)
  }

  return [...map.values()].sort((a, b) => a.org.localeCompare(b.org, 'es'))
})

// ── SEO ───────────────────────────────────────────────────────────────────────
const canonicalUrl = 'https://cambio-uruguay.com/que-empresa-abrir-uruguay'
const title = 'Qué empresa abrir en Uruguay: monotributo, unipersonal, SAS o SRL'
const description =
  'Descubrí qué figura legal te conviene según lo que facturás: monotributo, unipersonal Literal E, IRPF, SAS o SRL. Costos reales 2026, topes y responsabilidad, con la norma citada.'

defineOgImageComponent('Cambio', {
  title: 'Qué empresa abrir en Uruguay',
  subtitle: 'Monotributo, unipersonal, SAS o SRL — según lo que facturás',
  tag: 'GUÍA',
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
        'que empresa abrir uruguay, monotributo o unipersonal, conviene sas o unipersonal, abrir sas uruguay, literal e uruguay, formalizar emprendimiento uruguay, monotributo uruguay 2026, srl o sas, costo abrir empresa uruguay, irpf categoria ii',
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
                name: 'Qué empresa abrir en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faq.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
          {
            '@type': 'HowTo',
            name: 'Cómo formalizar tu emprendimiento en Uruguay',
            description:
              'Los pasos para pasar de la informalidad a una empresa registrada en Uruguay, con el régimen tributario que te corresponda.',
            totalTime: 'P15D',
            step: [
              {
                '@type': 'HowToStep',
                position: 1,
                name: 'Inscribirte en DGI y BPS',
                text: 'Es un solo trámite: el formulario 0351 conjunto de DGI y BPS. Para una unipersonal se hace online y no necesitás escribano ni "Empresa en el Día", que es para constituir personas jurídicas.',
              },
              {
                '@type': 'HowToStep',
                position: 2,
                name: 'Elegir el régimen tributario',
                text: 'Monotributo si vendés bienes exclusivamente a consumidor final y estás bajo el tope; Literal E si sos pequeña empresa; IRPF Categoría II si prestás servicios personales; IRAE si superás los topes. Las compuertas son legales, no de preferencia: hay regímenes que directamente no podés usar.',
              },
              {
                '@type': 'HowToStep',
                position: 3,
                name: 'Habilitarte como emisor de factura electrónica',
                text: 'Desde el 01/01/2025 todo contribuyente de IVA, incluido el Literal E, debe ser emisor electrónico desde que se inscribe. El monotributo y el monotributo social están expresamente exceptuados. Con e-factura, el IVA mínimo pasa a ser el menor entre la cuota y el 3,3% de lo facturado en el mes.',
              },
              {
                '@type': 'HowToStep',
                position: 4,
                name: 'Sacar las habilitaciones que correspondan',
                text: 'Intendencia si tenés local comercial, Bomberos en construcciones no destinadas a vivienda, Bromatología si tu rubro es alimentos. Sin empleados NO necesitás BSE ni presentar la planilla del MTSS.',
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
.empresa-page {
  overflow-x: hidden;
}

/* ── Hero (siempre oscuro, texto blanco: no depende del tema) ── */
.hero {
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(56, 189, 248, 0.28), transparent 55%),
    linear-gradient(135deg, #10233a 0%, #123044 55%, #0b3b2e 100%);
}
.hero-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 700;
  color: #7dd3fc;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.5rem, 4.2vw, 2.4rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 780px;
  line-height: 1.65;
  margin-bottom: 0;
}

/* ── Estructura ── */
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}
.section-card,
.regime-card,
.finding-card,
.myths-card,
.ruled-card,
.cross-link {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 16px;
}

/* ── Wizard ── */
.q-title {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 8px;
}
.v-theme--light .q-title {
  color: #0d47a1;
}
.q-toggle {
  flex-wrap: wrap;
  height: auto !important;
}
.q-toggle--wrap :deep(.v-btn) {
  height: 40px;
}
.q-hint {
  font-size: 0.82rem;
  line-height: 1.55;
  opacity: 0.8;
  margin: 8px 0 0;
  max-width: 780px;
}
.socios-block {
  border: 1px dashed rgba(var(--v-theme-primary), 0.4);
  border-radius: 14px;
  background: rgba(var(--v-theme-primary), 0.04);
  margin-inline: 0;
  padding: 8px 4px 14px;
}
.fine-panels {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 14px;
  overflow: hidden;
}
.est-alert {
  font-size: 0.78rem;
  line-height: 1.5;
}

/* ── Veredicto ── */
.verdict-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  border-radius: 18px;
  background: rgba(var(--v-theme-primary), 0.05);
}
.cost-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
@media (min-width: 760px) {
  .cost-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  }
}
.cost-box {
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 14px;
  padding: 12px 14px;
  text-align: center;
  background: rgb(var(--v-theme-surface));
}
.cost-box--main {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
}
.v-theme--light .cost-box--main {
  color: #0d47a1;
}
.cost-val {
  font-size: 1.05rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}
.cost-total {
  font-size: 1.6rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  line-height: 1.2;
}
.setup-line {
  font-size: 0.9rem;
  display: flex;
  align-items: center;
}
.notes {
  padding-left: 18px;
  margin: 0;
}
.notes li {
  font-size: 0.84rem;
  line-height: 1.6;
  margin-bottom: 7px;
  opacity: 0.9;
}
.warn-alert :deep(p) {
  font-size: 0.88rem;
  line-height: 1.6;
}

/* ── Descartes ── */
.ruled-card--excluido {
  opacity: 0.92;
  border-left: 3px solid rgb(var(--v-theme-error));
}
.ruled-card--dudoso {
  border-left: 3px solid rgb(var(--v-theme-warning));
}
.ruled-card--elegible {
  border-left: 3px solid rgb(var(--v-theme-success));
}
.reasons {
  list-style: none;
  padding: 0;
  margin: 0;
}
.reasons li {
  font-size: 0.86rem;
  line-height: 1.65;
  margin-bottom: 8px;
}
.cannot-cost p {
  font-size: 0.83rem;
  line-height: 1.6;
  opacity: 0.9;
}
.norm-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  font-size: 0.8rem;
  white-space: nowrap;
  text-decoration: none;
}
.norm-link:hover {
  text-decoration: underline;
}
.v-theme--light .norm-link {
  color: #0d47a1;
}

/* ── Tablas ── */
.table-scroll {
  overflow-x: auto;
}
.cmp-table {
  min-width: 1050px;
}
.cmp-table th {
  font-size: 0.72rem !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 800 !important;
  white-space: nowrap;
}
.cmp-table td {
  font-size: 0.82rem;
  line-height: 1.5;
  vertical-align: top;
  padding-top: 10px !important;
  padding-bottom: 10px !important;
}
.cell-price {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  color: rgb(var(--v-theme-primary));
}
.v-theme--light .cell-price {
  color: #0d47a1;
}
.cell-unknown {
  color: rgb(var(--v-theme-warning));
  font-weight: 600;
}
.cell-out {
  opacity: 0.65;
}
.mini-table td,
.mini-table th {
  font-size: 0.8rem;
}

/* ── Hallazgos ── */
.finding-card {
  background: rgba(var(--v-theme-primary), 0.05);
  border-color: rgba(var(--v-theme-primary), 0.3);
}
.finding-list {
  padding-left: 18px;
  margin: 0;
}
.finding-list li {
  font-size: 0.86rem;
  line-height: 1.6;
  margin-bottom: 8px;
}

/* ── Régimen ── */
.lockout-box {
  border-left: 3px solid rgba(var(--v-theme-warning), 0.8);
  background: rgba(var(--v-theme-warning), 0.08);
  border-radius: 0 8px 8px 0;
  padding: 10px 12px;
}
.lockout-box .text-body-2 {
  font-size: 0.83rem;
  line-height: 1.55;
}

/* ── Sociedad de hecho ── */
.danger-card {
  border: 1px solid rgba(var(--v-theme-error), 0.35);
  border-radius: 16px;
  background: rgba(var(--v-theme-error), 0.05);
}
.danger-list {
  padding-left: 20px;
  margin: 0;
}
.danger-list li {
  font-size: 0.88rem;
  line-height: 1.65;
  margin-bottom: 8px;
}

/* ── Mitos ── */
.myth {
  padding: 12px 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), 0.2);
}
.myth:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.myth-claim {
  font-weight: 700;
  font-size: 0.9rem;
  text-decoration: line-through;
  opacity: 0.75;
  margin-bottom: 4px;
}
.myth-truth {
  font-size: 0.85rem;
  line-height: 1.65;
}
.apoyo-notes {
  padding-left: 18px;
  margin: 0;
}
.apoyo-notes li {
  font-size: 0.85rem;
  line-height: 1.6;
  margin-bottom: 4px;
}

/* ── Lo que no podemos afirmar ── */
.honest-card {
  border: 2px dashed rgba(var(--v-theme-primary), 0.45);
  border-radius: 18px;
  background: rgba(var(--v-theme-primary), 0.04);
}
.unknown {
  padding: 12px 0;
  border-bottom: 1px dashed rgba(var(--v-border-color), 0.2);
}
.unknown:last-child {
  border-bottom: none;
  padding-bottom: 0;
}
.unknown-q {
  font-weight: 700;
  font-size: 0.9rem;
  margin-bottom: 4px;
}
.unknown-a {
  font-size: 0.85rem;
  line-height: 1.65;
  opacity: 0.9;
}

/* ── FAQ / fuentes / cross-links ── */
.faq-panels {
  border-radius: 14px;
  overflow: hidden;
}
.sources-list {
  padding-left: 18px;
  margin: 0;
}
.sources-list li {
  font-size: 0.82rem;
  line-height: 1.6;
  margin-bottom: 6px;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}
.v-theme--light .sources-list a,
.v-theme--light .apoyo-notes a,
.v-theme--light .finding-card a {
  color: #0d47a1;
}
.src-items,
.src-date {
  opacity: 0.75;
}
.src-date {
  font-variant-numeric: tabular-nums;
}
.cross-link {
  transition:
    transform 0.16s ease,
    border-color 0.16s ease;
}
.cross-link:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.6);
}
</style>
