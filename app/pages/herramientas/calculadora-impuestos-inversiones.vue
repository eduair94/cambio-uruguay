<template>
  <ToolShell slug="calculadora-impuestos-inversiones" :faq="faq" :sources="sources">
    <VCard class="pa-4 pa-sm-6">
      <VTabs v-model="tab" class="mb-4" grow>
        <VTab value="instrumento" data-testid="tab-instrumento">
          <VIcon start size="small">mdi-finance</VIcon>
          Por instrumento
        </VTab>
        <VTab value="anual" data-testid="tab-anual">
          <VIcon start size="small">mdi-file-document-edit-outline</VIcon>
          Declaración anual
        </VTab>
      </VTabs>

      <VTabsWindow v-model="tab">
        <!-- ── Tab 1: por instrumento ──────────────────────────────────────── -->
        <VTabsWindowItem value="instrumento">
          <VRow class="g-input">
            <VCol cols="12">
              <VSelect
                v-model="instrument"
                :items="instrumentItems"
                item-title="label"
                item-value="key"
                label="Instrumento"
                variant="outlined"
                density="comfortable"
                hide-details
                data-testid="instrumento"
              />
            </VCol>
          </VRow>

          <!-- Cripto: NO number. Not the result block, not a rate, nothing. -->
          <VAlert
            v-if="isCrypto"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="mt-4"
            icon="mdi-help-circle-outline"
            data-testid="cripto-no-resuelto"
          >
            <p class="mb-2 font-weight-bold">{{ CRYPTO_RULE.label }}</p>
            <p class="mb-2">
              No te mostramos ningún número porque <strong>la ley no fija ninguno</strong>. No hay
              norma tributaria específica para criptomonedas: la única posición oficial conocida es
              la Consulta DGI Nº 6.419 (2021) —que la trataría como bien mueble incorporal— y la
              citamos según fuentes secundarias, porque no accedimos a su texto primario. La Ley
              20.345 regula a los proveedores de servicios de activos virtuales, no la tributación.
              Después de la reforma de 2026, la <strong>fuente</strong> de la renta sigue sin
              definirse: ni el Decreto 95/026 ni la Resolución DGI 1517/2026 mencionan cripto.
            </p>
            <p class="mb-0">
              <strong>Consultá un contador antes de declarar cripto.</strong> Cualquier porcentaje
              que veas por ahí como «la tasa de cripto en Uruguay» es una interpretación, no una
              tasa legal.
            </p>
          </VAlert>
          <p v-if="isCrypto" class="text-caption tool-muted mt-3 mb-0" data-testid="cripto-fuente">
            Estado: <strong>{{ CRYPTO_RULE.confidence }}</strong> · {{ CRYPTO_RULE.law }} ·
            verificado el {{ verifiedOnLabel }} ·
            <a
              :href="CRYPTO_RULE.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="tool-link"
              >Decreto 95/026</a
            >
          </p>

          <template v-else>
            <!-- Inputs: depósitos y deuda pública -->
            <VRow v-if="isYieldInstrument" class="g-input mt-1">
              <VCol cols="12" sm="4">
                <VTextField
                  v-model.number="principal"
                  type="number"
                  min="0"
                  label="Capital"
                  :prefix="currencyPrefix"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VTextField
                  v-model.number="annualRatePct"
                  type="number"
                  min="0"
                  step="0.1"
                  label="Tasa nominal anual"
                  suffix="%"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VTextField
                  v-model.number="termMonths"
                  type="number"
                  min="1"
                  label="Plazo (meses)"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  :hint="termLabel"
                  persistent-hint
                />
              </VCol>
            </VRow>

            <!-- Inputs: dividendo. The 7% is Uruguayan-source only — the alert below
                 sends foreign dividends to the instrument that actually taxes them. -->
            <template v-else-if="instrument === 'dividendo'">
              <VRow class="g-input mt-1">
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model.number="dividendAmount"
                    type="number"
                    min="0"
                    label="Dividendo bruto distribuido por una empresa uruguaya"
                    prefix="$"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    hint="El 7% es solo para dividendos de contribuyentes de IRAE (empresas uruguayas)"
                    persistent-hint
                  />
                </VCol>
              </VRow>

              <VAlert
                type="warning"
                variant="tonal"
                density="comfortable"
                class="mt-5"
                icon="mdi-earth"
                data-testid="dividendo-exterior"
              >
                <strong>¿Dividendos de una empresa del exterior (IBKR, eToro, DriveWealth)?</strong>
                Esos <strong>no van acá</strong>: son renta de fuente extranjera y pagan
                <strong>{{ pct(FOREIGN_GENERAL_PCT) }}</strong
                >, no {{ pct(DIVIDEND_RULE.rate) }}. Elegí
                <strong>«Cuenta en un bróker del exterior»</strong> en el selector de arriba (o
                «Rentas del exterior» en la declaración anual).
              </VAlert>
            </template>

            <!-- Inputs: alquiler -->
            <VRow v-else-if="instrument === 'alquiler'" class="g-input mt-1">
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="rentGross"
                  type="number"
                  min="0"
                  label="Alquiler bruto (en el año)"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="rentDeductions"
                  type="number"
                  min="0"
                  label="Deducciones admitidas"
                  prefix="$"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  hint="Administradora, honorarios del contrato y su IVA, Contribución Inmobiliaria, Primaria, incobrables"
                  persistent-hint
                />
              </VCol>
            </VRow>

            <!-- Inputs: venta de acciones / ETF (local) -->
            <template v-else-if="instrument === 'ganancia_local'">
              <VRow class="g-input mt-1">
                <VCol cols="12" sm="6">
                  <VSelect
                    v-model="gainMethod"
                    :items="instrumentGainMethodItems"
                    item-title="label"
                    item-value="key"
                    label="Cómo determinás la base"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    data-testid="metodo-ganancia"
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model.number="salePrice"
                    type="number"
                    min="0"
                    label="Precio de venta"
                    prefix="$"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                  />
                </VCol>
                <VCol v-if="gainMethod === 'real'" cols="12" sm="6">
                  <VTextField
                    v-model.number="gainCost"
                    type="number"
                    min="0"
                    label="Costo fiscal actualizado"
                    prefix="$"
                    variant="outlined"
                    density="comfortable"
                    :error="costMissing"
                    hide-details
                    hint="Obligatorio en el régimen real: sin costo, o con uno negativo, el impuesto se calcularía sobre la venta entera"
                    persistent-hint
                    data-testid="costo-fiscal"
                  />
                </VCol>
              </VRow>

              <!-- Trap: with `real` and no cost — or a negative one — the tax would land on
                   the FULL sale price. We block the result instead of publishing that number. -->
              <VAlert
                v-if="costMissing"
                type="warning"
                variant="tonal"
                density="compact"
                class="mt-4"
                icon="mdi-alert-outline"
                data-testid="falta-costo"
              >
                <strong>Falta el costo fiscal.</strong> En el régimen real la base es
                <em>precio de venta − costo fiscal actualizado</em>. Si lo dejamos vacío o en
                negativo, el cálculo gravaría toda la venta como si fuera ganancia, y ese número
                sería falso. Ingresá el costo (0 o más), o cambiá a una base ficta si no lo podés
                probar.
              </VAlert>
            </template>

            <!-- Inputs: bróker del exterior -->
            <VRow v-else-if="instrument === 'exterior'" class="g-input mt-1">
              <VCol cols="12" sm="4">
                <VTextField
                  v-model.number="foreignAmount"
                  type="number"
                  min="0"
                  label="Renta obtenida en el exterior"
                  prefix="US$"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  hint="Intereses, dividendos o la ganancia por vender acciones, ETFs o bonos"
                  persistent-hint
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VSelect
                  v-model="foreignAgent"
                  :items="agentItems"
                  item-title="label"
                  item-value="key"
                  label="¿Quién opera tu inversión?"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="4">
                <VTextField
                  v-model.number="foreignTaxPaid"
                  type="number"
                  min="0"
                  label="Impuesto ya pagado en el exterior"
                  prefix="US$"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  hint="Se acredita, con tope en el IRPF de esas mismas rentas"
                  persistent-hint
                />
              </VCol>
            </VRow>

            <VDivider class="my-6" />

            <!-- Result -->
            <div v-if="result" class="result-grid">
              <div class="result-box">
                <div class="text-overline text-grey">IRPF a pagar</div>
                <div class="text-h5 font-weight-bold text-primary" data-testid="resultado-impuesto">
                  {{ fmt(result.tax) }}
                </div>
              </div>
              <!-- THE RATE IS THE LAW'S RATE. Never a derived ratio: see the invariant
                   on `InstrumentResult`. The overline comes from the result, not from
                   the template, so no instrument can be labelled with someone else's rate. -->
              <div class="result-box">
                <div class="text-overline text-grey">{{ result.rateLabel }}</div>
                <div class="text-h5 font-weight-bold" data-testid="resultado-tasa">
                  {{ pct(result.ratePct) }}
                </div>
                <div class="text-caption tool-muted">{{ result.rateNote }}</div>
              </div>
              <div class="result-box">
                <div class="text-overline text-grey">{{ result.netLabel }}</div>
                <div class="text-h5 font-weight-bold text-success" data-testid="resultado-neto">
                  {{ fmt(result.net) }}
                </div>
              </div>
            </div>

            <!-- Provenance: the article, the source and the date we checked it. -->
            <p
              v-if="result"
              class="text-caption tool-muted mt-3 mb-0"
              data-testid="resultado-fuente"
            >
              {{ result.rule.label }} — <strong>{{ result.rule.law }}</strong> · verificado el
              {{ verifiedOnLabel }} ·
              <a
                :href="result.rule.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="tool-link"
                >ver la fuente</a
              >
            </p>

            <!-- Deposits: the whole point of the tool. A 0,5% deposit can beat a
                 higher nominal one after tax, and a Letra is exempt. -->
            <template v-if="isDeposit && depositResult">
              <VCard variant="flat" class="tool-info-box mt-5 pa-4">
                <h3 class="text-subtitle-2 font-weight-bold mb-2">
                  <VIcon start size="small" color="primary">mdi-scale-balance</VIcon>
                  Contra una Letra del BCU (exenta)
                </h3>
                <VRow v-if="letraComparable" class="g-input">
                  <VCol cols="12" sm="6">
                    <VTextField
                      v-model.number="letraRatePct"
                      type="number"
                      min="0"
                      step="0.1"
                      label="Tasa nominal de la Letra que te ofrecen"
                      suffix="%"
                      variant="outlined"
                      density="comfortable"
                      hide-details
                      hint="Supuesto tuyo: no publicamos tasas de mercado"
                      persistent-hint
                    />
                  </VCol>
                </VRow>
                <p class="text-body-2 mt-4 mb-2">
                  Tu depósito paga <strong>{{ pct(depositResult.rule.rate) }}</strong> de IRPF sobre
                  los intereses, así que su tasa {{ rateKindLabel }} de
                  <strong>{{ pct(safe(annualRatePct)) }}</strong> queda en
                  <strong>{{ pct(depositResult.netAnnualRatePct) }}</strong> neta. La deuda pública
                  uruguaya está <strong>exenta</strong> (Título 7, art. 38 lit. A): su tasa neta es
                  igual a su nominal.
                </p>
                <!-- The verdict only renders for a PESO-NOMINAL deposit: a Letra's rate is a
                     peso-nominal rate, and a 3% REAL (UI) or a dollar rate is a different
                     unit. Declaring a winner across units would be a false statement. -->
                <VAlert
                  v-if="letraComparable"
                  :type="letraWins ? 'info' : 'success'"
                  variant="tonal"
                  density="compact"
                  class="mb-0"
                  :icon="letraWins ? 'mdi-file-certificate-outline' : 'mdi-bank-outline'"
                  data-testid="comparacion-letra"
                >
                  <strong>{{ pct(depositResult.netAnnualRatePct) }} neto</strong> (tu depósito)
                  <strong>vs {{ pct(safe(letraRatePct)) }} neto</strong> (la Letra, exenta).
                  {{ letraVerdict }}
                </VAlert>
                <VAlert
                  v-else
                  type="info"
                  variant="tonal"
                  density="comfortable"
                  class="mb-0"
                  icon="mdi-swap-horizontal"
                  data-testid="comparacion-letra-moneda"
                >
                  <strong>Acá no comparamos contra una Letra.</strong> {{ letraCurrencyCaveat }} Lo
                  único que sí vale para cualquier moneda: la deuda pública uruguaya está
                  <strong>exenta</strong> de IRPF (Título 7, art. 38 lit. A), mientras que tu
                  depósito paga <strong>{{ pct(depositResult.rule.rate) }}</strong> sobre los
                  intereses.
                </VAlert>
              </VCard>

              <!-- The same deposit at each legal term bucket: this is where the
                   0,5% of the >3-year peso deposit becomes visible. -->
              <VTable density="comfortable" class="mt-4 breakdown-table">
                <caption class="text-caption tool-muted text-left pb-2">
                  La misma tasa
                  {{
                    rateKindLabel
                  }}
                  de
                  {{
                    pct(safe(annualRatePct))
                  }}, a cada plazo legal:
                </caption>
                <thead>
                  <tr>
                    <th>Plazo</th>
                    <th class="text-right">IRPF sobre los intereses</th>
                    <th class="text-right">Tasa neta anual</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in termComparison"
                    :key="row.key"
                    :class="{ 'current-term': row.key === depositResult.term }"
                  >
                    <td>{{ row.label }}</td>
                    <td class="text-right">{{ pct(row.rate) }}</td>
                    <td class="text-right font-weight-bold">{{ pct(row.netAnnualRatePct) }}</td>
                  </tr>
                </tbody>
              </VTable>
            </template>

            <!-- Rent: the 10,5% is the withholding, not the rate. -->
            <VAlert
              v-if="instrument === 'alquiler' && rentResult"
              type="info"
              variant="tonal"
              density="comfortable"
              class="mt-5"
              icon="mdi-home-city-outline"
              data-testid="alquiler-retencion"
            >
              La tasa es <strong>12% sobre la renta neta</strong> ({{ fmt(rentResult.netRent) }}
              después de tus deducciones). El
              <strong>{{ pct(RENT_WITHHOLDING_PCT) }} es la RETENCIÓN</strong> que aplica la
              administradora sobre el bruto: {{ fmt(rentResult.withholding) }}. Podés dejarla como
              definitiva o liquidar por lo real.
              {{
                rentResult.realBeatsWithholding
                  ? 'Con estos números te conviene liquidar por lo real: pagás menos que la retención.'
                  : 'Con estos números la retención ya te alcanza: liquidar por lo real no te baja el impuesto.'
              }}
            </VAlert>

            <!-- Local capital gain: the exemption is expressed in UI, so it moves. -->
            <VAlert
              v-if="instrument === 'ganancia_local' && gainMaybeExempt"
              type="success"
              variant="tonal"
              density="comfortable"
              class="mt-5"
              icon="mdi-check-decagram"
              data-testid="ganancia-exenta"
            >
              <strong>Esta operación podría estar exenta.</strong> El art. 38 lit. I exonera las
              operaciones de hasta {{ formatInt(EXEMPT_PER_OPERATION_UI) }} UI ({{
                formatUYU(uiToPesos(EXEMPT_PER_OPERATION_UI), 0)
              }}
              con la UI de hoy) <strong>siempre que</strong> la suma anual de esas operaciones quede
              por debajo de {{ formatInt(EXEMPT_ANNUAL_UI) }} UI ({{
                formatUYU(uiToPesos(EXEMPT_ANNUAL_UI), 0)
              }}). Se tienen que cumplir las dos condiciones: si en el año hacés varias, mirá el
              total.
            </VAlert>

            <!-- Foreign income: 12% is the rate; 8% is a withholding a custodian applies. -->
            <template v-if="instrument === 'exterior' && foreignResult">
              <VAlert
                type="info"
                variant="tonal"
                density="comfortable"
                class="mt-5"
                icon="mdi-percent-outline"
                data-testid="exterior-retencion"
              >
                <p class="mb-2">
                  <strong>La tasa es {{ pct(FOREIGN_GENERAL_PCT) }}</strong> (Ley 20.446, vigente
                  desde el 1/1/2026). Lo que cambia según quién opera tu inversión es
                  <strong>la retención</strong>, no la tasa.
                </p>
                <p class="mb-0">{{ agentExplanation }}</p>
              </VAlert>

              <VAlert
                v-if="foreignResult.requiresAnticipos"
                type="warning"
                variant="tonal"
                density="comfortable"
                class="mt-3"
                icon="mdi-calendar-clock"
                data-testid="exterior-anticipos"
              >
                <strong>No tenés agente de retención uruguayo.</strong> Te corresponden
                <strong>anticipos semestrales</strong> al {{ pct(FOREIGN_GENERAL_PCT) }} (Decreto
                95/026, arts. 44 duodecies y terdecies). Pueden hacerse definitivos y liberarte de
                la declaración jurada.
              </VAlert>

              <VAlert
                v-if="foreignResult.foreignCreditApplied > 0"
                type="success"
                variant="tonal"
                density="compact"
                class="mt-3"
                icon="mdi-earth"
                data-testid="exterior-credito"
              >
                Se te acreditan <strong>{{ fmt(foreignResult.foreignCreditApplied) }}</strong> del
                impuesto que ya pagaste en el exterior (Título 7, art. 25). El crédito tiene tope en
                el IRPF de esas mismas rentas: nunca genera devolución.
              </VAlert>

              <VAlert
                type="success"
                variant="tonal"
                density="compact"
                class="mt-3"
                icon="mdi-stairs-up"
              >
                <strong>Si compraste antes del 31/12/2025, mirá el step-up.</strong> Para activos
                que coticen en bolsas de reconocido prestigio, el costo fiscal es la cotización al
                31/12/2025 (Título 7, art. 32 + Dec. 95/026 art. 18): toda la apreciación anterior a
                2026 queda fuera del impuesto. Ingresá acá solo la renta posterior a ese costo.
              </VAlert>
            </template>
          </template>
        </VTabsWindowItem>

        <!-- ── Tab 2: declaración anual ────────────────────────────────────── -->
        <VTabsWindowItem value="anual">
          <p class="text-body-2 tool-muted mb-4">
            Cargá las rentas de capital del año (Formulario 1101) y mirá el IRPF Categoría I total.
            <strong>Todos los importes van en pesos</strong>: convertí lo del exterior al tipo de
            cambio<template v-if="usdRate">
              (hoy, la mejor venta del dólar es {{ formatUYU(usdRate, 2) }})</template
            >.
          </p>

          <VCard
            v-for="(row, i) in rows"
            :key="row.id"
            variant="flat"
            class="tool-info-row pa-4 mb-3"
            data-testid="anual-fila"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-overline text-grey">Renta {{ i + 1 }}</span>
              <VBtn
                icon="mdi-close"
                variant="text"
                size="x-small"
                :disabled="rows.length === 1"
                aria-label="Quitar esta renta"
                @click="removeRow(row.id)"
              />
            </div>

            <VRow class="g-input">
              <VCol cols="12" sm="6">
                <VSelect
                  v-model="row.kind"
                  :items="kindItems"
                  item-title="label"
                  item-value="key"
                  label="Tipo de renta"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="row.amount"
                  type="number"
                  min="0"
                  :label="amountLabel(row.kind)"
                  prefix="$"
                  variant="outlined"
                  density="compact"
                  hide-details
                  data-testid="anual-monto"
                />
              </VCol>

              <template v-if="row.kind === 'deposito'">
                <VCol cols="12" sm="6">
                  <VSelect
                    v-model="row.currency"
                    :items="currencyItems"
                    item-title="label"
                    item-value="key"
                    label="Moneda del depósito"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model.number="row.termMonths"
                    type="number"
                    min="1"
                    label="Plazo (meses)"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
              </template>

              <VCol v-else-if="row.kind === 'alquiler'" cols="12" sm="6">
                <VTextField
                  v-model.number="row.deductions"
                  type="number"
                  min="0"
                  label="Deducciones admitidas"
                  prefix="$"
                  variant="outlined"
                  density="compact"
                  hide-details
                />
              </VCol>

              <template v-else-if="row.kind === 'ganancia_local'">
                <VCol cols="12" sm="6">
                  <VSelect
                    v-model="row.method"
                    :items="gainMethodItems"
                    item-title="label"
                    item-value="key"
                    label="Base imponible"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
                <VCol v-if="row.method === 'real'" cols="12" sm="6">
                  <VTextField
                    v-model.number="row.cost"
                    type="number"
                    min="0"
                    label="Costo fiscal actualizado"
                    prefix="$"
                    variant="outlined"
                    density="compact"
                    :error="rowIncomplete(row)"
                    hide-details
                  />
                </VCol>
              </template>

              <!-- Same trap as tab 1: a foreign dividend pays 12%, not 7%. Steer it to the
                   row that taxes it correctly instead of letting the user under-declare. -->
              <VCol v-else-if="row.kind === 'dividendo'" cols="12">
                <p class="text-caption tool-muted mb-0" data-testid="anual-dividendo-exterior">
                  <VIcon size="x-small" class="mr-1">mdi-earth</VIcon>
                  Solo dividendos de <strong>empresas uruguayas</strong> (contribuyentes de IRAE),
                  que pagan {{ pct(DIVIDEND_RULE.rate) }}. Si son de una empresa del exterior (IBKR,
                  eToro), cargalos como <strong>«Rentas del exterior»</strong>: pagan
                  {{ pct(FOREIGN_GENERAL_PCT) }}.
                </p>
              </VCol>

              <template v-else-if="row.kind === 'exterior'">
                <VCol cols="12" sm="6">
                  <VSelect
                    v-model="row.withholdingAgent"
                    :items="agentItems"
                    item-title="label"
                    item-value="key"
                    label="¿Quién opera tu inversión?"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model.number="row.foreignTaxPaid"
                    type="number"
                    min="0"
                    label="Impuesto pagado en el exterior"
                    prefix="$"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </VCol>
              </template>
            </VRow>
          </VCard>

          <VBtn
            variant="tonal"
            color="primary"
            size="small"
            class="mb-4"
            data-testid="agregar-renta"
            @click="addRow"
          >
            <VIcon start size="small">mdi-plus</VIcon>
            Agregar una renta
          </VBtn>

          <VAlert
            v-if="incompleteRows.length"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
            icon="mdi-alert-outline"
            data-testid="anual-incompletas"
          >
            <strong
              >Dejamos fuera del total {{ incompleteRows.length }}
              {{ incompleteRows.length === 1 ? 'renta' : 'rentas' }}</strong
            >
            ({{ incompleteRows.map(n => `renta ${n}`).join(', ') }}): elegiste el régimen real para
            una venta y falta el costo fiscal. Sin el costo, el cálculo gravaría toda la venta como
            si fuera ganancia.
          </VAlert>

          <VDivider class="my-6" />

          <div class="result-grid">
            <div class="result-box">
              <div class="text-overline text-grey">IRPF Categoría I del año</div>
              <div class="text-h5 font-weight-bold text-primary" data-testid="anual-total">
                {{ formatUYU(annual.totalTax) }}
              </div>
            </div>
            <div class="result-box">
              <div class="text-overline text-grey">Crédito por impuesto del exterior</div>
              <div class="text-h5 font-weight-bold" data-testid="anual-credito">
                {{ formatUYU(annual.foreignCreditApplied) }}
              </div>
              <div class="text-caption tool-muted">
                Ya descontado del total. Tope: el IRPF de esas mismas rentas.
              </div>
            </div>
            <div class="result-box">
              <div class="text-overline text-grey">Rentas declaradas</div>
              <div class="text-h5 font-weight-bold">{{ annual.byItem.length }}</div>
              <div class="text-caption tool-muted">
                BPC {{ formatUYU(bpc, 0) }} · UI {{ formatUYU(ui, 4) }}
              </div>
            </div>
          </div>

          <VTable density="comfortable" class="mt-4 breakdown-table">
            <thead>
              <tr>
                <th>Renta</th>
                <th class="text-right">Monto</th>
                <th class="text-right">IRPF</th>
                <th>Norma</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in annual.byItem" :key="i">
                <td class="font-weight-medium">{{ kindLabel(item.kind) }}</td>
                <td class="text-right">{{ formatUYU(item.amount, 0) }}</td>
                <td class="text-right font-weight-medium">
                  <!-- Crypto has no rate: it must never show a number here either. -->
                  <template v-if="item.kind === 'cripto'">—</template>
                  <template v-else>{{ formatUYU(item.tax) }}</template>
                </td>
                <td class="text-caption">{{ item.rule.law }}</td>
              </tr>
              <tr class="total-row">
                <td class="font-weight-bold">Total</td>
                <td />
                <td class="text-right font-weight-bold">{{ formatUYU(annual.totalTax) }}</td>
                <td />
              </tr>
            </tbody>
          </VTable>

          <VAlert
            v-if="annual.requiresAnticipos"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="mt-4"
            icon="mdi-calendar-clock"
            data-testid="anual-anticipos"
          >
            <strong>No tenés agente de retención por tus rentas del exterior:</strong> desde 2026 te
            corresponden <strong>anticipos semestrales</strong> al {{ pct(FOREIGN_GENERAL_PCT) }}
            (Decreto 95/026, arts. 44 duodecies y terdecies). Pueden hacerse definitivos y liberarte
            de la declaración jurada.
          </VAlert>

          <VAlert
            v-if="annual.unresolved.length"
            type="warning"
            variant="tonal"
            density="comfortable"
            class="mt-4"
            icon="mdi-help-circle-outline"
            data-testid="anual-no-resuelto"
          >
            <strong
              >Cargaste una renta que la ley no resuelve ({{ annual.unresolved.join(', ') }}), y por
              eso NO está en el total.</strong
            >
            {{ CRYPTO_RULE.label }}. No le asignamos ningún porcentaje: el total de arriba está
            calculado sin ella. Consultá un contador antes de declararla.
          </VAlert>

          <!-- Provenance: the article is in the "Norma" column of every row above, and
               the primary sources are linked in the "Fuentes y referencias" block below. -->
          <p class="text-caption tool-muted mt-4 mb-0">
            IRPF Categoría I — Formulario 1101. Cada renta lleva arriba el artículo del que sale su
            tasa; las tasas se verificaron el {{ verifiedOnLabel }} contra el Título 7 del Texto
            Ordenado y la publicación de la DGI (los enlaces están en «Fuentes y referencias»). La
            campaña 2026 (ejercicio 2025) va del 29 de junio al 31 de agosto de 2026, en ventana
            única.
          </p>
        </VTabsWindowItem>
      </VTabsWindow>
    </VCard>

    <template #content>
      <h2>Qué calcula</h2>
      <p>
        En Uruguay no existe el «impuesto a las ganancias». Las rentas de tus inversiones las grava
        el <strong>IRPF Categoría I</strong> (rentas de capital) si sos residente fiscal. La tasa
        general es <strong>12%</strong>, pero hay tasas reducidas por instrumento y plazo, y varias
        exoneraciones.
      </p>
      <p>
        Por eso el número que importa no es la tasa nominal que te ofrecen, sino el
        <strong>rendimiento neto después de impuestos</strong>: un plazo fijo en pesos a más de 3
        años paga <strong>0,5%</strong> de IRPF y puede ganarle a uno con tasa nominal más alta a
        plazo corto. Y una <strong>Letra del BCU está exenta</strong>, así que su tasa neta es igual
        a su nominal.
      </p>
      <h2>El 8% no es la tasa</h2>
      <p>
        Sobre las rentas del exterior, la tasa es <strong>12%</strong>. El
        <strong>8% es una retención reducida</strong> que solo puede aplicar un bróker uruguayo que
        <strong>además ejerza la custodia</strong> de los activos, y es definitiva solo si vos optás
        por tomarla así. Si no hay agente de retención uruguayo, corresponden anticipos semestrales.
      </p>
      <h2>Cripto: sin número</h2>
      <p>
        No publicamos un porcentaje para cripto porque <strong>la ley no fija ninguno</strong>. Si
        elegís cripto, la calculadora te lo dice y no calcula nada.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-3">
        Cada tasa sale de la norma y lleva su artículo.
        <NuxtLink :to="localePath('/impuestos-inversiones-uruguay')">
          La guía completa del IRPF Categoría I
        </NuxtLink>
        explica la matriz de depósitos, la reforma 2026, la residencia fiscal y el Impuesto al
        Patrimonio.
      </VAlert>
      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-3">
        La
        <NuxtLink :to="localePath('/herramientas/calculadora-irpf')">calculadora de IRPF</NuxtLink>
        y la
        <NuxtLink :to="localePath('/herramientas/calculadora-sueldo-liquido')">
          de sueldo líquido
        </NuxtLink>
        son de <strong>Categoría II</strong> (rentas del trabajo). Esta es la
        <strong>Categoría I</strong>: son dos liquidaciones distintas.
      </VAlert>
    </template>

    <template #disclaimer>
      Estimación de referencia, no asesoramiento tributario. Las tasas salen de la norma y llevan su
      artículo y su fecha de verificación ({{ verifiedOnLabel }}), pero tu caso concreto depende de
      tu residencia fiscal, del instrumento, del plazo, de la fuente de la renta y de si tenés o no
      agente de retención. Los intereses se calculan con interés simple, como referencia para
      comparar instrumentos. Para <strong>criptomonedas</strong> la ley no fija tasa: cualquier
      número que veas por ahí es una interpretación. Consultá un contador antes de declarar.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  annualIrpfCatI,
  capitalGainTax,
  CRYPTO_RULE,
  depositReturn,
  DIVIDEND_RULE,
  EXEMPT_ANNUAL_UI,
  EXEMPT_PER_OPERATION_UI,
  FICTO_BASE_PCT,
  FOREIGN_GENERAL_PCT,
  foreignIncomeTax,
  GENERAL_RULE,
  isCapitalGainExempt,
  PUBLIC_DEBT_RULE,
  RENT_WITHHOLDING_PCT,
  rentTax,
  termFromMonths,
  VERIFIED_ON,
  type AnnualIncomeItem,
  type CapitalGainMethod,
  type Currency,
  type DepositTerm,
  type TaxRule,
  type WithholdingAgent,
} from '~/utils/capitalTax'
import { formatUSD, formatUYU } from '~/utils/format'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
import type { ExchangeRate } from '~/types/api'

const localePath = useLocalePath()

// ── Live BPC and UI ──────────────────────────────────────────────────────────
// The legal thresholds are expressed in BPC / UI by the norms themselves, so the
// peso equivalents are derived from the live values, never hardcoded. Same two
// fetches as the guide page (`/impuestos-inversiones-uruguay`).
const BPC_FALLBACK = 6864
const UI_FALLBACK = 6.6142

const { data: figures } = await useFetch<{ bpc: number; asOf: string | null }>('/api/uy-figures', {
  key: 'uy-figures',
  default: () => ({ bpc: BPC_FALLBACK, asOf: null }),
})
const bpc = computed(() => {
  const v = figures.value?.bpc
  return typeof v === 'number' && v > 0 ? v : BPC_FALLBACK
})

const { rows: rateRows, bestSell } = useExchangeRates()
const ui = computed(() => {
  // An empty row set is the only reliable signal that the rates API is down:
  // `currentIndicatorValue` falls back to the indicator's static reference value
  // instead of returning null, so check the rows FIRST.
  if (!rateRows.value?.length) return UI_FALLBACK
  const ind = indicatorFromSlug('unidad-indexada')
  if (!ind) return UI_FALLBACK
  return currentIndicatorValue(rateRows.value as ExchangeRate[], ind)
})
const usdRate = computed(() => bestSell('USD'))
const uiToPesos = (units: number) => units * ui.value

const T7_URL = 'https://www.impo.com.uy/bases/todgi-2023/7-2024'
const DGI_URL =
  'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario'

const verifiedOnLabel = new Date(`${VERIFIED_ON}T00:00:00`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

// ── Formatting ───────────────────────────────────────────────────────────────
/** Non-negative finite number, or 0. Guards every value fed to the tax module. */
const safe = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(v, 0) : 0
/** `5.5` -> `'5,5%'`. `null` never reaches here for a rate we display. */
const pct = (n: number | null | undefined) =>
  typeof n === 'number' ? `${n.toLocaleString('es-UY', { maximumFractionDigits: 2 })}%` : '—'
const formatInt = (n: number) => n.toLocaleString('es-UY')

const tab = ref<'instrumento' | 'anual'>('instrumento')

// ── Tab 1: por instrumento ───────────────────────────────────────────────────
type InstrumentKey =
  | 'pf_uyu'
  | 'pf_ui'
  | 'pf_usd'
  | 'deuda_publica'
  | 'dividendo'
  | 'alquiler'
  | 'ganancia_local'
  | 'exterior'
  | 'cripto'

const instrumentItems: Array<{ key: InstrumentKey; label: string }> = [
  { key: 'pf_uyu', label: 'Plazo fijo en pesos (tasa fija nominal)' },
  { key: 'pf_ui', label: 'Plazo fijo en pesos con reajuste (UI)' },
  { key: 'pf_usd', label: 'Plazo fijo en dólares' },
  { key: 'deuda_publica', label: 'Letra o bono del Estado (deuda pública uruguaya)' },
  // The 7% is Uruguayan-source ONLY. Naming this option "Dividendo o utilidad distribuida"
  // let a holder of IBKR/eToro stock pick it and read a bold "7%" — 5 points under the 12%
  // the law charges on a foreign dividend. The label now says whose dividend it is.
  { key: 'dividendo', label: 'Dividendo de una empresa uruguaya (contribuyente de IRAE)' },
  { key: 'alquiler', label: 'Alquiler de un inmueble en Uruguay' },
  { key: 'ganancia_local', label: 'Venta de acciones o ETF (local)' },
  { key: 'exterior', label: 'Cuenta en un bróker del exterior' },
  { key: 'cripto', label: 'Criptomonedas' },
]

const instrument = ref<InstrumentKey>('pf_uyu')
const isCrypto = computed(() => instrument.value === 'cripto')
const isDeposit = computed(() =>
  (['pf_uyu', 'pf_ui', 'pf_usd'] as InstrumentKey[]).includes(instrument.value)
)
/** Deposits and public debt share the capital + rate + term inputs. */
const isYieldInstrument = computed(() => isDeposit.value || instrument.value === 'deuda_publica')

const principal = ref(100_000)
const annualRatePct = ref(8)
const termMonths = ref(12)
const letraRatePct = ref(8)
const dividendAmount = ref(100_000)
const rentGross = ref(300_000)
const rentDeductions = ref(30_000)
const salePrice = ref(500_000)
/** Deliberately empty: without a cost the `real` method would tax the FULL sale price, so
 *  `capitalGainTax` now THROWS instead of guessing. We block the result until the user gives
 *  us a cost — the page must never reach the module in that state. */
const gainCost = ref<number | null>(null)
const gainMethod = ref<CapitalGainMethod>('real')
const foreignAmount = ref(5_000)
const foreignAgent = ref<WithholdingAgent>('ninguno')
const foreignTaxPaid = ref(0)

/** Every base the law admits. Used by the ANNUAL tab, whose row is the broad
 *  "Venta de valores o bienes (local)" — a property sale can legitimately land there. */
const gainMethodItems: Array<{ key: CapitalGainMethod; label: string }> = [
  { key: 'real', label: 'Real: precio − costo fiscal (la regla general)' },
  { key: 'ficto20', label: 'Ficta 20% del precio (obligatoria si no podés probar el costo)' },
  { key: 'ficto15', label: 'Ficta 15% del precio (inmuebles no rurales pre-1/7/2007)' },
]

/** Tab 1's instrument is "Venta de acciones o ETF (local)". The 15% ficto is a base for
 *  PRE-2007 NON-RURAL PROPERTY (spec: "Incrementos patrimoniales" table) — the law does not
 *  admit it for securities, and offering it here would let a user declare 1,8% of the price
 *  on a share sale, i.e. UNDER-declare. Only the two bases that can apply to a security. */
const instrumentGainMethodItems = gainMethodItems.filter(m => m.key !== 'ficto15')

const agentItems: Array<{ key: WithholdingAgent; label: string }> = [
  { key: 'custodio-local', label: 'Un bróker uruguayo que además ejerce la custodia' },
  { key: 'otro-agente', label: 'Otro agente local sin custodia (banco, corredor, fondo)' },
  { key: 'ninguno', label: 'Ningún agente uruguayo (cuenta directa en el exterior)' },
]

const currencyItems: Array<{ key: Currency; label: string }> = [
  { key: 'UYU', label: 'Pesos, tasa fija nominal' },
  { key: 'UYU_UI', label: 'Pesos con reajuste (UI)' },
  { key: 'USD', label: 'Moneda extranjera (USD)' },
]

const depositCurrency = computed<Currency>(() =>
  instrument.value === 'pf_ui' ? 'UYU_UI' : instrument.value === 'pf_usd' ? 'USD' : 'UYU'
)
/**
 * A UI-indexed deposit quotes a REAL rate (above inflation); UYU and USD deposits quote a
 * NOMINAL one. `letraCurrencyCaveat` below already says this explicitly for the UI case —
 * calling the same rate "nominal" here would contradict it.
 */
const rateKindLabel = computed(() => (depositCurrency.value === 'UYU_UI' ? 'real' : 'nominal'))
/** Which currency the instrument's figures are in — drives the input prefixes and the output format. */
const isUsdInstrument = computed(
  () => instrument.value === 'pf_usd' || instrument.value === 'exterior'
)
const currencyPrefix = computed(() => (isUsdInstrument.value ? 'US$' : '$'))
const fmt = (v: number) => (isUsdInstrument.value ? formatUSD(v) : formatUYU(v))

const termLabel = computed(() => {
  const term = termFromMonths(safe(termMonths.value))
  return term === 'hasta_1a'
    ? 'Hasta 1 año'
    : term === 'de_1a_3a'
      ? 'De 1 a 3 años'
      : 'Más de 3 años'
})

const depositResult = computed(() =>
  isDeposit.value
    ? depositReturn({
        principal: safe(principal.value),
        annualRatePct: safe(annualRatePct.value),
        termMonths: safe(termMonths.value),
        currency: depositCurrency.value,
      })
    : null
)

const rentResult = computed(() =>
  instrument.value === 'alquiler'
    ? rentTax({ grossRent: safe(rentGross.value), deductions: safe(rentDeductions.value) })
    : null
)

const foreignResult = computed(() =>
  instrument.value === 'exterior'
    ? foreignIncomeTax({
        amount: safe(foreignAmount.value),
        withholdingAgent: foreignAgent.value,
        foreignTaxPaid: safe(foreignTaxPaid.value),
      })
    : null
)

/**
 * The `real` method with no cost — or a negative one — would tax the entire sale price:
 * `capitalGainTax` throws for both, but we must catch it here, before the call, so the page
 * blocks with a message instead of crashing on the module's TypeError.
 */
const costMissing = computed(
  () =>
    instrument.value === 'ganancia_local' &&
    gainMethod.value === 'real' &&
    !(typeof gainCost.value === 'number' && Number.isFinite(gainCost.value) && gainCost.value >= 0)
)

const gainMaybeExempt = computed(
  () =>
    instrument.value === 'ganancia_local' &&
    isCapitalGainExempt({
      operationAmountUyu: safe(salePrice.value),
      yearSubThresholdTotalUyu: 0,
      uiValue: ui.value,
    })
)

/**
 * What the result tiles render.
 *
 * INVARIANT — the one this whole page exists to protect:
 * NEVER RENDER A PERCENTAGE BELOW THE STATUTORY RATE UNDER A LABEL CONTAINING THE WORD
 * "TASA". `ratePct` is therefore ALWAYS the rate the law sets for the applied rule —
 * never `tax / income`, never `tax / salePrice`.
 *
 * Why: the two myths this tool corrects are numbers that a derived ratio manufactures
 * on its own. Divide tax-after-foreign-credit by income and you land on 8% (the
 * retención, not the rate) — or on 7% / 6% / 2,4%, every one of them a real Uruguayan
 * rate for some other income. Divide 12%-of-the-real-gain by the sale price and a
 * 500.000/400.000 sale prints "2,4%", the exact ficto the spec says is NOT the default.
 * A caption cannot undo a bold headline: the reader keeps the number.
 *
 * Anything derived (the ficto's 2,4% of the price, the credit already applied) goes in
 * `rateNote`, subordinate to the statutory figure and named as what it is.
 */
interface InstrumentResult {
  tax: number
  /** The STATUTORY rate of `rule`, in percentage points. Never a derived ratio. */
  ratePct: number
  /** Overline of the rate tile. Result-driven so it can never mislabel the figure. */
  rateLabel: string
  rateNote: string
  net: number
  netLabel: string
  rule: TaxRule
}

const RATE_LABEL = 'Tasa de IRPF'

/** `null` = nothing to show (crypto, or a blocked calculation). The template must
 *  not render the result block at all in that case. */
const result = computed<InstrumentResult | null>(() => {
  if (isCrypto.value) return null

  if (depositResult.value) {
    const d = depositResult.value
    return {
      tax: d.tax,
      ratePct: d.rule.rate ?? 0,
      rateLabel: RATE_LABEL,
      // The only instrument where the statutory rate and the effective rate coincide:
      // the law taxes the interest, and this IS the rate on the interest.
      rateNote: 'sobre los intereses',
      net: d.netInterest,
      netLabel: 'Interés neto después de IRPF',
      rule: d.rule,
    }
  }

  if (instrument.value === 'deuda_publica') {
    // Exempt: art. 38 lit. A covers the interest AND the capital gain on transfer.
    const gross =
      safe(principal.value) * (safe(annualRatePct.value) / 100) * (safe(termMonths.value) / 12)
    return {
      tax: 0,
      ratePct: PUBLIC_DEBT_RULE.rate ?? 0,
      rateLabel: RATE_LABEL,
      rateNote: 'exenta: la deuda pública uruguaya no paga IRPF',
      net: gross,
      netLabel: 'Interés neto (no paga IRPF)',
      rule: PUBLIC_DEBT_RULE,
    }
  }

  if (instrument.value === 'dividendo') {
    const amount = safe(dividendAmount.value)
    const rate = DIVIDEND_RULE.rate ?? 0
    const tax = amount * (rate / 100)
    return {
      tax,
      ratePct: rate,
      rateLabel: RATE_LABEL,
      rateNote: 'sobre el dividendo bruto',
      net: amount - tax,
      netLabel: 'Dividendo neto',
      rule: DIVIDEND_RULE,
    }
  }

  if (rentResult.value) {
    const r = rentResult.value
    // Tax / gross rent lands BELOW 12% — and with ~12,5% of deductions it lands on
    // exactly 10,5%, which is the retención, i.e. the other myth. Show the 12%.
    return {
      tax: r.tax,
      ratePct: GENERAL_RULE.rate ?? 12,
      rateLabel: RATE_LABEL,
      rateNote: `sobre la renta neta (${fmt(r.netRent)}, después de tus deducciones)`,
      net: safe(rentGross.value) - r.tax,
      netLabel: 'Alquiler neto después de IRPF',
      rule: GENERAL_RULE,
    }
  }

  if (instrument.value === 'ganancia_local') {
    if (costMissing.value) return null
    const price = safe(salePrice.value)
    const cost = safe(gainCost.value)
    const method = gainMethod.value
    const g = capitalGainTax({ salePrice: price, cost, method })
    return {
      tax: g.tax,
      // 12% either way. What the ficto changes is the BASE, not the rate: it is the
      // base that is 20% of the price, and only that makes the tax 2,4% of the price.
      ratePct: GENERAL_RULE.rate ?? 12,
      rateLabel: RATE_LABEL,
      rateNote:
        method === 'real'
          ? 'sobre la ganancia real: precio de venta − costo fiscal actualizado'
          : `sobre la base ficta (${pct(FICTO_BASE_PCT[method])} del precio), o sea ${pct(g.effectiveRatePct)} del precio de venta`,
      net: method === 'real' ? Math.max(price - cost, 0) - g.tax : price - g.tax,
      netLabel: method === 'real' ? 'Ganancia neta después de IRPF' : 'Producido neto de la venta',
      rule: g.rule,
    }
  }

  if (foreignResult.value) {
    const f = foreignResult.value
    const amount = safe(foreignAmount.value)
    return {
      tax: f.taxDue,
      // NOT `taxDue / amount`: a credit worth 4% of the income would print "8%" — the
      // exact figure this page exists to stop people calling "the rate". The credit is
      // a subtraction from the tax, not a discount on the rate; it belongs in the note.
      ratePct: FOREIGN_GENERAL_PCT,
      rateLabel: `${RATE_LABEL} (Ley 20.446)`,
      rateNote:
        f.foreignCreditApplied > 0
          ? `sobre la renta del exterior. Al impuesto ya le restamos ${fmt(f.foreignCreditApplied)} de crédito por lo que pagaste afuera: eso baja el impuesto, no la tasa.`
          : 'sobre la renta del exterior',
      net: amount - f.taxDue,
      netLabel: 'Renta neta después de IRPF',
      rule: f.rule,
    }
  }

  return null
})

/** What the agent actually withholds — the 8% is a withholding, never "the rate". */
const agentExplanation = computed(() => {
  switch (foreignAgent.value) {
    case 'custodio-local':
      return 'Un bróker uruguayo con custodia puede retenerte el 8%: es una RETENCIÓN reducida (Título 7, art. 52 lit. A), y solo queda como definitiva si vos optás por tomarla así, liberándote de la declaración jurada. Si no optás, liquidás al 12% y esa retención es un pago a cuenta.'
    case 'otro-agente':
      return 'Un agente local sin custodia (un banco, un corredor de bolsa, un fondo o un fideicomiso que actúa por cuenta y orden de terceros, art. 44 quater) retiene el 12%, y solo sobre los incrementos patrimoniales: no es una retención sobre todas tus rentas del exterior.'
    default:
      return 'Un bróker del exterior no retiene nada en Uruguay: la obligación de pagar es tuya, vía anticipos semestrales o declaración jurada.'
  }
})

/**
 * The Letra's rate is a PESO-NOMINAL rate, so the only deposit it can be compared with is a
 * peso-nominal one. A UI deposit quotes a REAL rate (3% real is not beaten by 8% nominal) and a
 * dollar deposit quotes a rate in another currency: asserting a winner across units would be a
 * false statement, not a rounding issue. Outside `UYU` we drop the verdict and say why.
 */
const letraComparable = computed(() => depositCurrency.value === 'UYU')

const letraCurrencyCaveat = computed(() =>
  depositCurrency.value === 'UYU_UI'
    ? 'Tu depósito está en pesos con reajuste por UI: su tasa es REAL, por encima de la inflación. La de una Letra en pesos es NOMINAL. Un 3% real y un 8% nominal no son la misma unidad, así que compararlos de frente da un resultado falso.'
    : 'Tu depósito está en dólares y la tasa de una Letra en pesos es nominal, en otra moneda. Compararlas exigiría suponer un tipo de cambio futuro, y no publicamos supuestos de tipo de cambio.'
)

const letraWins = computed(
  () => safe(letraRatePct.value) > (depositResult.value?.netAnnualRatePct ?? 0)
)

/**
 * The Letra can win on the NET rate while its nominal is equal to or higher than the
 * deposit's — with the shipped defaults (8% / 12 meses / pesos → 7,56% neto vs una Letra
 * al 8%) the two nominals are exactly equal. Claiming "aun con una tasa nominal más baja"
 * unconditionally states a falsehood on first paint, so the clause is gated on the nominal
 * actually being lower.
 */
const letraVerdict = computed(() => {
  if (!letraWins.value) return 'Tu depósito te deja más, incluso después del IRPF.'
  return safe(letraRatePct.value) < safe(annualRatePct.value)
    ? 'La Letra te deja más, aun con una tasa nominal más baja: no paga IRPF.'
    : 'La Letra te deja más: no paga IRPF.'
})

/** The same capital and nominal rate across the three legal term buckets. This is
 *  where the 0,5% of a >3-year peso deposit becomes visible. */
const termComparison = computed(() => {
  const buckets: Array<{ key: DepositTerm; label: string; months: number }> = [
    { key: 'hasta_1a', label: 'Hasta 1 año', months: 12 },
    { key: 'de_1a_3a', label: 'De 1 a 3 años', months: 24 },
    { key: 'mas_3a', label: 'Más de 3 años', months: 48 },
  ]
  return buckets.map(b => {
    const r = depositReturn({
      principal: safe(principal.value),
      annualRatePct: safe(annualRatePct.value),
      termMonths: b.months,
      currency: depositCurrency.value,
    })
    return {
      key: b.key,
      label: b.label,
      rate: r.rule.rate,
      netAnnualRatePct: r.netAnnualRatePct,
    }
  })
})

// ── Tab 2: declaración anual ─────────────────────────────────────────────────
type RowKind = AnnualIncomeItem['kind']

interface IncomeRow {
  id: number
  kind: RowKind
  amount: number | null
  currency: Currency
  termMonths: number
  deductions: number | null
  cost: number | null
  method: CapitalGainMethod
  withholdingAgent: WithholdingAgent
  foreignTaxPaid: number | null
}

const kindItems: Array<{ key: RowKind; label: string }> = [
  { key: 'deposito', label: 'Intereses de un depósito u ON' },
  // Uruguayan-source only, same reason as the instrument tab: a foreign dividend is
  // "Rentas del exterior" (12%), never this row (7%).
  { key: 'dividendo', label: 'Dividendos de una empresa uruguaya (contribuyente de IRAE)' },
  { key: 'deuda_publica', label: 'Deuda pública uruguaya (exenta)' },
  { key: 'alquiler', label: 'Alquiler de un inmueble' },
  { key: 'ganancia_local', label: 'Venta de valores o bienes (local)' },
  { key: 'exterior', label: 'Rentas del exterior' },
  { key: 'cripto', label: 'Criptomonedas' },
]
const kindLabel = (kind: RowKind) => kindItems.find(k => k.key === kind)?.label ?? kind

const amountLabel = (kind: RowKind) => {
  switch (kind) {
    case 'deposito':
      return 'Intereses ganados en el año'
    case 'ganancia_local':
      return 'Precio de venta'
    case 'alquiler':
      return 'Alquiler bruto del año'
    case 'exterior':
      return 'Renta del exterior (en pesos)'
    default:
      return 'Monto del año'
  }
}

let nextId = 2
const rows = ref<IncomeRow[]>([
  {
    id: 1,
    kind: 'deposito',
    amount: 100_000,
    currency: 'UYU',
    termMonths: 12,
    deductions: null,
    cost: null,
    method: 'real',
    withholdingAgent: 'ninguno',
    foreignTaxPaid: null,
  },
])

function addRow() {
  rows.value.push({
    id: nextId++,
    kind: 'dividendo',
    amount: null,
    currency: 'UYU',
    termMonths: 12,
    deductions: null,
    cost: null,
    method: 'real',
    withholdingAgent: 'ninguno',
    foreignTaxPaid: null,
  })
}

function removeRow(id: number) {
  if (rows.value.length === 1) return
  rows.value = rows.value.filter(r => r.id !== id)
}

/** Same trap as the instrument tab: `real` without a cost taxes the whole sale price. */
const rowIncomplete = (row: IncomeRow) =>
  row.kind === 'ganancia_local' &&
  row.method === 'real' &&
  !(typeof row.cost === 'number' && Number.isFinite(row.cost))

/** 1-based positions of the rows we are leaving out of the total. */
const incompleteRows = computed(() =>
  rows.value.map((row, i) => (rowIncomplete(row) ? i + 1 : 0)).filter(n => n > 0)
)

/** Every amount is clamped at 0 before it reaches the module: its `deposito` and
 *  `dividendo` branches have no negative guard, and a negative would produce a
 *  negative "tax" that silently offsets the rest of the year. */
const items = computed<AnnualIncomeItem[]>(() =>
  rows.value
    .filter(row => !rowIncomplete(row))
    .map<AnnualIncomeItem>(row => {
      const amount = safe(row.amount)
      switch (row.kind) {
        case 'deposito':
          return {
            kind: 'deposito',
            amount,
            currency: row.currency,
            termMonths: Math.max(safe(row.termMonths), 1),
          }
        case 'alquiler':
          return { kind: 'alquiler', amount, deductions: safe(row.deductions) }
        case 'ganancia_local':
          return { kind: 'ganancia_local', amount, cost: safe(row.cost), method: row.method }
        case 'exterior':
          return {
            kind: 'exterior',
            amount,
            foreignTaxPaid: safe(row.foreignTaxPaid),
            withholdingAgent: row.withholdingAgent,
          }
        case 'deuda_publica':
          return { kind: 'deuda_publica', amount }
        case 'cripto':
          return { kind: 'cripto', amount }
        default:
          return { kind: 'dividendo', amount }
      }
    })
)

// `bpc` and `uiValue` are part of the contract even though the current
// implementation does not read them: pass the live values, not a hardcoded pair.
const annual = computed(() => annualIrpfCatI(items.value, { bpc: bpc.value, uiValue: ui.value }))

// ── ToolShell content ────────────────────────────────────────────────────────
const sources = [
  {
    label: 'IMPO — Texto Ordenado, Título 7 (IRPF)',
    url: T7_URL,
  },
  {
    label: 'DGI — IRPF, rendimientos de capital mobiliario (matriz de tasas de depósitos)',
    url: DGI_URL,
  },
  {
    label: 'IMPO — Decreto 95/026 (rentas de fuente extranjera desde 2026)',
    url: 'https://www.impo.com.uy/bases/decretos-originales/95-2026',
  },
]

const faq = [
  {
    q: '¿Cuánto IRPF paga un plazo fijo en Uruguay?',
    a: 'Depende de la moneda y del plazo: son nueve celdas (Título 7, art. 37 lit. A). En pesos con tasa fija nominal: 5,5% hasta 1 año, 2,5% de 1 a 3 años y 0,5% a más de 3 años. En pesos con reajuste por UI: 10%, 7% y 5%. En moneda extranjera: 12% hasta 1 año, 12% de 1 a 3 años y 7% a más de 3 años. Ojo con la celda de dólares a 1–3 años: paga 12%, no está exenta.',
  },
  {
    q: '¿Conviene un plazo fijo a más de 3 años?',
    a: 'Después de impuestos, muchas veces sí. Un plazo fijo en pesos a más de 3 años paga 0,5% de IRPF sobre los intereses, mientras que uno a menos de 1 año paga 5,5%: con la misma tasa nominal, el largo te deja más neto. La comparación honesta es contra una Letra o un bono del Estado, que están exentos (art. 38 lit. A): ahí la tasa neta es igual a la nominal. Esta calculadora hace las dos cuentas.',
  },
  {
    q: '¿Pago IRPF por mi cuenta en un bróker del exterior?',
    a: 'Sí, desde el 1 de enero de 2026. La Ley 20.446 extendió el IRPF a todos los rendimientos de capital del exterior y, por primera vez, a los incrementos patrimoniales (vender acciones, ETFs o bonos extranjeros). La tasa es 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar un bróker uruguayo que además ejerza la custodia de los activos, y es definitiva solo si vos optás por tomarla así. Sin agente de retención uruguayo corresponden anticipos semestrales al 12%. Además, para los activos que coticen en bolsas de reconocido prestigio y hayas comprado antes del 31/12/2025, el costo fiscal es la cotización a esa fecha: la apreciación anterior a 2026 queda fuera del impuesto.',
  },
  {
    q: '¿Cuánto se paga por vender acciones o un ETF?',
    a: 'La regla general es la real: (precio de venta − costo fiscal actualizado) × 12%. La base ficta del 20% del precio, que equivale a una tasa efectiva de 2,4%, NO es el régimen por defecto: es obligatoria solo cuando no podés probar el costo, y una opción en otros casos. Además, están exentas las operaciones de hasta 30.000 UI cada una cuya suma anual quede por debajo de 90.000 UI, y las acciones y obligaciones negociables con oferta pública y cotización bursátil.',
  },
  {
    q: '¿Cuánto paga la cripto?',
    a: 'No está resuelto y por eso no publicamos ningún número. No hay norma tributaria específica para criptomonedas: la única posición oficial conocida es la Consulta DGI Nº 6.419 (2021), que la trataría como bien mueble incorporal, y la citamos según fuentes secundarias porque no accedimos a su texto primario. La Ley 20.345 regula a los proveedores de servicios de activos virtuales, no la tributación. Tras la reforma de 2026 la fuente de la renta sigue sin definirse: ni el Decreto 95/026 ni la Resolución DGI 1517/2026 mencionan cripto. Consultá un contador.',
  },
  {
    q: '¿El alquiler paga 10,5%?',
    a: 'No: el 10,5% es la RETENCIÓN que aplica la administradora sobre el alquiler bruto (Dec. 148/007 art. 37). La tasa es 12% sobre la renta NETA, después de las deducciones admitidas (comisión de la administradora, honorarios del contrato y su IVA, Contribución Inmobiliaria, Impuesto de Enseñanza Primaria, incobrables). Podés dejar la retención como definitiva o liquidar por lo real si tus gastos reales son mayores.',
  },
  {
    q: '¿Dónde se declara todo esto?',
    a: 'El IRPF Categoría I se declara con el Formulario 1101 (el 1102 y el 1103 son de Categoría II, rentas del trabajo). La campaña 2026, por el ejercicio 2025, va del 29 de junio al 31 de agosto de 2026, en ventana única: no hay escalonamiento por terminación de cédula o RUT para la declaración anual. Si tuviste retención automática (bancos, sujetos pasivos de IRAE, organismos públicos) podés darle carácter definitivo y quedar liberado de la declaración.',
  },
]
</script>

<style scoped>
.tool-muted {
  color: rgba(255, 255, 255, 0.7);
}
.v-theme--light .tool-muted {
  color: rgba(0, 0, 0, 0.7);
}

/* Highlight the term bucket the user actually picked. */
.current-term td {
  background: rgba(47, 129, 247, 0.1);
}
</style>
