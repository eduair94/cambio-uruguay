<template>
  <ToolShell
    slug="costo-real-de-invertir-afuera"
    content-layout="below"
    :faq="faq"
    :sources="sources"
  >
    <VCard class="pa-4 pa-sm-6">
      <!-- ── La operación ──────────────────────────────────────────────────── -->
      <h2 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-cash-multiple</VIcon>
        Tu operación
      </h2>
      <VRow class="g-input">
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model.number="amountSent"
            type="number"
            min="0"
            label="Cuánto mandás"
            prefix="US$"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="monto"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model.number="holdingYears"
            type="number"
            min="0"
            step="0.5"
            label="Cuántos años lo dejás"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="plazo"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model.number="totalReturnPct"
            type="number"
            step="1"
            label="Rendimiento de precio (todo el período)"
            suffix="%"
            variant="outlined"
            density="comfortable"
            hide-details
            hint="El 10% del ejemplo: cuánto sube la cuotaparte, sin contar dividendos"
            persistent-hint
            data-testid="rendimiento"
          />
        </VCol>
        <VCol cols="12" sm="6" md="3">
          <VTextField
            v-model.number="dividendYieldPct"
            type="number"
            min="0"
            step="0.1"
            label="Dividendos anuales (bruto en la fuente)"
            suffix="%"
            variant="outlined"
            density="comfortable"
            hide-details
            :hint="dividendHint"
            persistent-hint
            data-testid="dividendos"
          />
        </VCol>
      </VRow>

      <!-- El dato que NO inventamos. Sin él, la única fuga anual real queda invisible. -->
      <VAlert
        v-if="!dividendYieldPct"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-water-off-outline"
        data-testid="falta-dividendos"
      >
        <strong
          >No cargaste el rendimiento por dividendos, y ahí está la fuga que se repite.</strong
        >
        No lo ponemos por defecto porque cambia todos los años y no lo verificamos en la ficha del
        emisor: cualquier número que pusiéramos sería inventado. Buscalo en la página del fondo
        (para el SPY,
        <a
          href="https://www.ssga.com/us/en/intermediary/etfs/spdr-sp-500-etf-trust-spy"
          target="_blank"
          rel="noopener noreferrer"
          class="tool-link"
          >la ficha de State Street</a
        >) y cargalo acá. Mientras esté en cero, la retención del exterior no aparece en la cuenta.
      </VAlert>

      <VDivider class="my-6" />

      <!-- ── La plataforma ─────────────────────────────────────────────────── -->
      <h2 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-bank-transfer</VIcon>
        La plataforma y el domicilio del fondo
      </h2>
      <VRow class="g-input">
        <VCol cols="12" md="6">
          <VSelect
            v-model="brokerId"
            :items="brokerItems"
            item-title="label"
            item-value="key"
            label="Dónde comprás"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="broker"
          />
        </VCol>
        <VCol cols="12" md="6">
          <VSelect
            v-model="domicile"
            :items="domicileItems"
            item-title="label"
            item-value="key"
            label="Domicilio del fondo"
            variant="outlined"
            density="comfortable"
            hide-details
            hint="No es dónde invierte: un UCITS irlandés puede ser 100% S&P 500"
            persistent-hint
            data-testid="domicilio"
          />
        </VCol>
        <VCol cols="12" sm="6" md="4">
          <VSelect
            v-model="route"
            :items="routeItems"
            item-title="label"
            item-value="key"
            label="Cómo llega la plata a la plataforma"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="ruta"
          />
        </VCol>
        <VCol v-if="route === 'internacional'" cols="12" sm="6" md="4">
          <VSelect
            v-model="bankId"
            :items="bankItems"
            item-title="label"
            item-value="key"
            label="Tu banco uruguayo"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="banco"
          />
        </VCol>
        <VCol v-if="route === 'internacional'" cols="12" sm="6" md="4">
          <VSelect
            v-model="correspondentBearer"
            :items="bearerItems"
            item-title="label"
            item-value="key"
            label="¿Quién paga los corresponsales?"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="corresponsales"
          />
        </VCol>
        <template v-else>
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model.number="localOut"
              type="number"
              min="0"
              label="Transferencia local de ida"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model.number="localIn"
              type="number"
              min="0"
              label="Transferencia local de vuelta"
              prefix="US$"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
        </template>
        <VCol cols="12" sm="6" md="4">
          <VTextField
            v-model.number="sharePrice"
            type="number"
            min="0"
            label="Precio de la cuotaparte (opcional)"
            prefix="US$"
            variant="outlined"
            density="comfortable"
            hide-details
            hint="Sólo hace falta si el bróker cobra por acción"
            persistent-hint
          />
        </VCol>
        <VCol cols="12" sm="6" md="4">
          <VTextField
            v-model.number="aumPct"
            type="number"
            min="0"
            step="0.05"
            label="Comisión anual sobre el saldo (AuM)"
            suffix="%"
            variant="outlined"
            density="comfortable"
            hide-details
            hint="La que se cobra todos los meses sobre lo que tenés, además de las operaciones"
            persistent-hint
            data-testid="aum"
          />
        </VCol>
      </VRow>

      <p class="text-caption tool-muted mt-3 mb-0" data-testid="broker-fuente">
        {{ broker.plan }} · precio comercial leído el {{ readOnLabel
        }}<template v-if="broker.publishedVersion"> · {{ broker.publishedVersion }} </template>·
        <a
          :href="broker.sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="tool-link"
          data-testid="broker-tarifario"
          >ver el tarifario</a
        >
      </p>
      <p v-if="broker.note" class="text-caption tool-muted mt-1 mb-0">{{ broker.note }}</p>

      <!-- Los aranceles son PRECIO COMERCIAL: el preset es un default fechado, no un dato. -->
      <VExpansionPanels v-if="route === 'internacional'" variant="accordion" class="mt-4">
        <VExpansionPanel data-testid="ajustar-aranceles">
          <VExpansionPanelTitle>
            <VIcon start size="small">mdi-pencil-outline</VIcon>
            Ajustar los aranceles a lo que te cobran de verdad
          </VExpansionPanelTitle>
          <template #text>
            <p class="text-body-2 tool-muted mb-4">
              Los tarifarios cambian sin aviso. Lo que trae la calculadora es el valor que leímos el
              {{ readOnLabel }} en el tarifario publicado de cada banco, no una tabla comparativa:
              confirmá el tuyo antes de ordenar el giro y, si te cobraron otra cosa, cargala acá.
            </p>
            <VRow class="g-input">
              <VCol cols="12" sm="6" md="3">
                <VTextField
                  v-model.number="outboundOverride"
                  type="number"
                  min="0"
                  label="Comisión de salida"
                  prefix="US$"
                  variant="outlined"
                  density="compact"
                  clearable
                  :placeholder="defaultLabel(defaults.outbound)"
                  persistent-placeholder
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <VTextField
                  v-model.number="corrOutOverride"
                  type="number"
                  min="0"
                  label="Corresponsales (ida)"
                  prefix="US$"
                  variant="outlined"
                  density="compact"
                  clearable
                  :placeholder="defaultLabel(defaults.corrOut)"
                  persistent-placeholder
                  hide-details
                  data-testid="override-corr-ida"
                />
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <VTextField
                  v-model.number="corrInOverride"
                  type="number"
                  min="0"
                  label="Corresponsales (vuelta)"
                  prefix="US$"
                  variant="outlined"
                  density="compact"
                  clearable
                  :placeholder="defaultLabel(defaults.corrIn)"
                  persistent-placeholder
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="6" md="3">
                <VTextField
                  v-model.number="inboundOverride"
                  type="number"
                  min="0"
                  label="Comisión de entrada"
                  prefix="US$"
                  variant="outlined"
                  density="compact"
                  clearable
                  :placeholder="defaultLabel(defaults.inbound)"
                  persistent-placeholder
                  hide-details
                />
              </VCol>
            </VRow>
            <p class="text-caption tool-muted mt-3 mb-0">
              {{ bank.bank }} — {{ bank.channel }} ·
              <a
                :href="bank.outbound.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="tool-link"
                >tarifario de salida</a
              >
              ·
              <a
                :href="bank.inbound.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="tool-link"
                >tarifario de entrada</a
              ><template v-if="bank.outbound.publishedVersion">
                · {{ bank.outbound.publishedVersion }}</template
              >
            </p>
            <p v-if="bank.note" class="text-caption tool-muted mt-1 mb-0">{{ bank.note }}</p>
          </template>
        </VExpansionPanel>
      </VExpansionPanels>

      <VDivider class="my-6" />

      <!-- ── El impuesto uruguayo ──────────────────────────────────────────── -->
      <h2 class="text-subtitle-1 font-weight-bold mb-3">
        <VIcon start size="small" color="primary">mdi-file-document-outline</VIcon>
        Tu IRPF
      </h2>
      <VRow class="g-input">
        <VCol cols="12" md="5">
          <VSelect
            v-model="withholdingAgent"
            :items="agentItems"
            item-title="label"
            item-value="key"
            label="¿Quién opera tu inversión?"
            variant="outlined"
            density="comfortable"
            hide-details
            data-testid="agente"
          />
        </VCol>
        <VCol cols="12" md="4">
          <VSelect
            v-model="gainMethod"
            :items="gainMethodItems"
            item-title="label"
            item-value="key"
            label="Base de la ganancia"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol
          v-if="withholdingAgent === 'custodio-local'"
          cols="12"
          md="3"
          class="d-flex align-center"
        >
          <VCheckbox
            v-model="definitiveWithholding"
            label="Opto por la retención definitiva (8%)"
            density="comfortable"
            hide-details
            data-testid="definitiva"
          />
        </VCol>
      </VRow>

      <VDivider class="my-6" />

      <!-- ── El resultado ──────────────────────────────────────────────────── -->
      <div class="result-grid">
        <div class="result-box">
          <div class="text-overline text-grey">Llega a tu cuenta del banco</div>
          <div class="text-h5 font-weight-bold text-primary" data-testid="resultado-llega">
            {{ usd(result.totals.creditedToLocalAccountUsd) }}
          </div>
          <div class="text-caption tool-muted">
            De los {{ usd(result.totals.finalPortfolioValueUsd) }} que valía la cartera
          </div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Te queda, después del IRPF</div>
          <div class="text-h5 font-weight-bold text-success" data-testid="resultado-neto">
            {{ usd(result.totals.netToYouUsd) }}
          </div>
          <div class="text-caption tool-muted">
            El IRPF se paga aparte: no te lo descuentan del giro
          </div>
        </div>
        <div class="result-box">
          <!-- Nominal y efectivo, juntos y en la misma unidad: es la comparación que el post pide
               y la única forma de que el número grande no engañe por sí solo. -->
          <div class="text-overline text-grey">Rendimiento efectivo</div>
          <div class="text-h5 font-weight-bold" data-testid="resultado-efectivo">
            {{ pct(result.yields.effectiveReturnPct) }}
          </div>
          <div class="text-caption tool-muted">
            contra <strong>{{ pct(result.yields.nominalReturnPct) }}</strong> nominal ·
            {{ pct(result.yields.effectiveAnnualReturnPct) }} anual
          </div>
        </div>
        <div class="result-box">
          <div class="text-overline text-grey">Se van en costos e impuestos</div>
          <div class="text-h5 font-weight-bold" data-testid="resultado-fuga">
            {{
              result.yields.costShareOfGrossGainPct === null
                ? '—'
                : pct(result.yields.costShareOfGrossGainPct)
            }}
          </div>
          <div class="text-caption tool-muted">
            de la ganancia bruta ({{ usd(result.totals.totalCostsUsd) }} de costos +
            {{ usd(result.totals.totalTaxesUsd) }} de impuestos)
          </div>
        </div>
      </div>

      <VAlert
        v-if="result.incomplete"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-help-circle-outline"
        data-testid="cuenta-incompleta"
      >
        <strong>Esta cuenta está incompleta y el resultado es un piso, no el costo real.</strong>
        Hay al menos un eslabón de la cadena que tu banco no publica (van marcados abajo). Si ya
        hiciste el giro, cargá en «Ajustar los aranceles» lo que te cobraron de verdad.
      </VAlert>

      <VAlert
        v-for="(w, i) in result.warnings"
        :key="i"
        type="info"
        variant="tonal"
        density="comfortable"
        class="mt-3"
        icon="mdi-information-outline"
        data-testid="aviso"
      >
        {{ w }}
      </VAlert>

      <!-- El desglose: la gracia es ver DÓNDE se va la plata, no el total. -->
      <VTable density="comfortable" class="mt-5 breakdown-table cu-mobile-cards">
        <caption class="text-caption tool-muted text-left pb-2">
          Cada eslabón de la cadena, en el orden en que ocurre:
        </caption>
        <thead>
          <tr>
            <th>Etapa</th>
            <th>Concepto</th>
            <th class="text-right">Costo</th>
            <th class="text-right">Qué es</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="line in result.lines" :key="line.id" data-testid="linea-desglose">
            <td data-label="Etapa" class="text-caption">{{ stageLabel(line.stage) }}</td>
            <td data-label="Concepto">
              {{ line.label }}
              <span v-if="line.isFloor" class="text-caption tool-muted"> (piso, no exacto)</span>
              <span v-if="line.overridden" class="text-caption tool-muted"> (lo cargaste vos)</span>
              <div v-if="line.detail" class="text-caption tool-muted mt-1">{{ line.detail }}</div>
            </td>
            <td class="text-right font-weight-medium" data-label="Costo">
              <template v-if="line.unpublished">
                <span class="text-warning">no publicado</span>
              </template>
              <template v-else>{{ usd(line.amountUsd) }}</template>
            </td>
            <td class="text-right text-caption" data-label="Qué es">
              <VChip
                size="x-small"
                :color="line.nature === 'alicuota-legal' ? 'primary' : 'default'"
                variant="tonal"
              >
                {{ line.nature === 'alicuota-legal' ? 'alícuota legal' : 'precio comercial' }}
              </VChip>
            </td>
          </tr>
          <tr class="total-row">
            <td data-label="Etapa" />
            <td class="font-weight-bold" data-label="Concepto">Total</td>
            <td class="text-right font-weight-bold" data-label="Costo">
              {{ usd(result.totals.totalCostsUsd + result.totals.totalTaxesUsd) }}
            </td>
            <td data-label="Qué es" />
          </tr>
        </tbody>
      </VTable>

      <!-- Las dos rentas, en filas separadas. Es la corrección que evita que el exceso de
           crédito del dividendo tape el impuesto de la ganancia. -->
      <VCard variant="flat" class="tool-info-box mt-5 pa-4">
        <h3 class="text-subtitle-2 font-weight-bold mb-2">
          <VIcon start size="small" color="primary">mdi-table-split-cell</VIcon>
          Tu IRPF, renta por renta
        </h3>
        <p class="text-body-2 tool-muted mb-3">
          Los dividendos y la ganancia por vender son <strong>dos rentas distintas</strong>, y el
          crédito por el impuesto pagado afuera se imputa «respecto de la misma renta»: lo que sobra
          de una <strong>no baja</strong> el impuesto de la otra ni se arrastra al año que viene.
        </p>
        <VTable density="comfortable" class="breakdown-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Renta</th>
              <th class="text-right">Base</th>
              <th class="text-right">Tasa</th>
              <th class="text-right">Crédito usado</th>
              <th class="text-right">Crédito perdido</th>
              <th class="text-right">IRPF a pagar</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in result.taxRows" :key="row.label" data-testid="fila-renta">
              <td data-label="Renta">{{ row.label }}</td>
              <td class="text-right" data-label="Base">{{ usd(row.baseUsd) }}</td>
              <td class="text-right" data-label="Tasa">{{ pct(row.ratePct) }}</td>
              <td class="text-right" data-label="Crédito usado">
                {{ usd(row.creditAppliedUsd) }}
              </td>
              <td
                class="text-right"
                :class="{ 'text-warning font-weight-bold': row.creditLostUsd > 0 }"
                data-label="Crédito perdido"
              >
                {{ usd(row.creditLostUsd) }}
              </td>
              <td class="text-right font-weight-bold" data-label="IRPF a pagar">
                {{ usd(row.dueUsd) }}
              </td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-caption tool-muted mt-3 mb-0">
          Todo el cálculo va en dólares, y no es una simplificación: el costo fiscal se toma «en la
          moneda en que se realizó la inversión, valuada a la cotización del día anterior al de la
          enajenación» (Decreto 148/007), así que costo y precio se convierten con el mismo tipo de
          cambio y <strong>la devaluación del peso no genera renta gravada</strong>.
        </p>
      </VCard>

      <!-- El estate tax: el riesgo más grande y menos mencionado, y no depende de hacer nada mal. -->
      <VAlert
        :type="result.estateTax.crossesThreshold ? 'warning' : 'info'"
        variant="tonal"
        density="comfortable"
        class="mt-5"
        icon="mdi-scale-balance"
        data-testid="estate-tax"
      >
        <p class="mb-1 font-weight-bold">
          <template v-if="result.estateTax.inScope">
            Estate tax de EE.UU.: el umbral es {{ usd(result.estateTax.thresholdUsd, 0) }}, y tu
            cartera vale {{ usd(result.totals.finalPortfolioValueUsd) }}.
          </template>
          <template v-else>
            Estate tax de EE.UU.: un fondo irlandés queda fuera del alcance, valga lo que valga.
          </template>
        </p>
        <p class="mb-0">{{ result.estateTax.note }}</p>
      </VAlert>
    </VCard>

    <!-- ── Las secciones de hechos ─────────────────────────────────────────── -->
    <template #content>
      <h2>La respuesta corta</h2>
      <p>
        Con un ETF domiciliado en Estados Unidos, un residente uruguayo paga
        <strong>cero</strong> impuesto estadounidense por la ganancia al vender, y
        <strong>30% todos los años</strong> sobre los dividendos. El costo que se repite no es el de
        repatriar: es la retención sobre el dividendo. Traer la plata cuesta plata, sí, pero es un
        costo de una sola vez y del orden de una décima parte de lo que el post teme.
      </p>

      <h2>
        ¿La comisión es por el monto o por la transacción? Depende, y son estructuras opuestas
      </h2>
      <p>
        Ésta es la pregunta textual del post, y no tiene una sola respuesta porque conviven dos
        modelos:
      </p>
      <ul>
        <li>
          <strong>Por operación, sin importar el monto.</strong> Interactive Brokers cobra
          <strong>por acción</strong> con un mínimo por orden y un tope del 1% del valor operado.
          Como USD 20.000 compran pocas acciones de un ETF caro, la comisión calculada queda por
          debajo del mínimo y se paga el mínimo: comprar y después vender cuesta un puñado de
          dólares, y el doble de plata cuesta lo mismo.
        </li>
        <li>
          <strong>Por el monto.</strong> Los corredores locales y las billeteras cobran un
          porcentaje de lo operado. Ahí sí el costo escala: sobre USD 20.000, un 0,75% son USD 150
          por punta, y un 2% son USD 400.
        </li>
        <li>
          <strong>Por el saldo, todos los meses.</strong> La tercera, la que casi nadie menciona y
          la que más pesa en un <em>buy-and-hold</em>: una comisión anual sobre los activos bajo
          administración, cobrada mensualmente y <em>además</em> de los costos por operación. Un
          1,5% anual sobre USD 20.000 son USD 300 <strong>por año</strong> — más que todo el viaje
          de ida y vuelta de los giros, y repetido.
        </li>
      </ul>
      <p>
        Por eso la calculadora no corona un ganador: el cruce depende del monto y de cuántas veces
        movés la plata. Para <em>un</em> viaje de ida y vuelta de USD 20.000, un corredor local
        puede salir más caro que un bróker extranjero más toda la cadena de giros; si dejás la plata
        quieta muchos años, la comisión anual sobre el saldo se come la diferencia.
      </p>

      <h2>Por qué llega menos de lo que mandaste</h2>
      <p>
        No es una comisión oculta: es una opción que nadie eligió. Los gastos de la cadena de bancos
        corresponsales se descuentan <strong>del monto girado</strong>, y el ordenante puede pedir
        asumirlos — pero <strong>por defecto se le cobran al beneficiario</strong>. Está escrito
        así, en esas palabras, en el tarifario publicado de uno de los bancos de plaza.
      </p>
      <p>
        Ojo con una trampa de vocabulario: el «corresponsal» de un giro internacional es un
        <em>banco intermediario</em> de la cadena SWIFT que se queda con parte del monto. No tiene
        nada que ver con los «corresponsales financieros» de Abitab o Redpagos donde cobrás o
        depositás.
      </p>
      <p>
        Las modalidades OUR / SHA / BEN, que definen quién paga esos gastos,
        <strong>no salen de ninguna norma uruguaya</strong>: son un campo del estándar de mensajería
        SWIFT. Lo único que el BCU exige es que la institución te informe el costo <em>antes</em> de
        que ordenes la transferencia.
      </p>

      <h2>Qué NO te cobra Estados Unidos</h2>
      <ul>
        <li>
          <strong>La ganancia de capital.</strong> Un no residente que estuvo
          <strong>menos de {{ US_PRESENCE_DAYS_THRESHOLD }} días</strong> en EE.UU. durante el año
          fiscal no paga impuesto estadounidense por vender acciones o ETFs. Y lo importante para un
          uruguayo: la exención <strong>no viene de un tratado</strong>, viene del propio estatuto,
          así que la tenés igual aunque Uruguay no tenga convenio. La regla se da vuelta si
          estuviste 183 días o más: ahí tu ganancia neta paga {{ US_CAPITAL_GAIN_PCT_IF_PRESENT }}%,
          y aplica aun por operaciones hechas estando fuera del país. Es una regla de
          <strong>presencia física</strong>, no de residencia fiscal ni de monto: no hay mínimo no
          imponible ni escalones.
        </li>
        <li>
          <strong>Ningún impuesto por sacar la plata.</strong> El capital que vuelve no es renta.
          Existe desde el 1 de enero de 2026 un impuesto federal del {{ US_REMITTANCE_TAX_PCT }}% a
          las remesas, y por eso vale nombrarlo: el propio artículo lo limita a las transferencias
          en las que el remitente <strong>entrega efectivo</strong>, giro postal o cheque de caja.
          Un wire debitado de una cuenta de bróker o de banco no encaja. Sí le puede pegar a quien
          mande plata a Uruguay desde un local de remesas pagando en efectivo.
        </li>
      </ul>

      <h2>Qué SÍ te cobra Estados Unidos</h2>
      <ul>
        <li>
          <strong
            >{{ US_DIVIDEND_WITHHOLDING_PCT }}% sobre los dividendos, del bruto y en la
            fuente.</strong
          >
          Es una retención definitiva: no se descuentan gastos ni costo, no hay mínimo no imponible
          y no se recupera declarando. Y, a diferencia de la ganancia, pega
          <strong>todos los años</strong>.
        </li>
        <li>
          <strong>Uruguay no tiene tratado de doble imposición con EE.UU.</strong> Ésta es la
          corrección más importante de todo el frente, porque el error típico es asumir que todos
          los países tienen tratado. La lista oficial del IRS salta directo de United Kingdom a
          Venezuela. Consecuencia: no hay forma de bajar el 30%, no existe el formulario mágico, y
          la Parte II del W-8BEN (la de los beneficios del convenio) te queda
          <strong>vacía</strong>.
        </li>
        <li>
          <strong>El W-8BEN igual hay que tenerlo, y vence.</strong> No sirve para invocar un
          tratado que no existe, pero sí acredita que sos persona extranjera y reclama la excepción
          al <em>backup withholding</em> sobre el producido de la venta. Vale desde la firma hasta
          el <strong>último día del tercer año calendario siguiente</strong>, y hay que presentar
          uno nuevo dentro de los 30 días de cualquier cambio de circunstancias. Si se te vence
          mientras «dejás la plata un tiempo», el bróker pasa a retenerte por defecto.
        </li>
        <li>
          <strong>Sin W-8BEN vigente, la retención muerde el bruto.</strong> El
          <em>backup withholding</em> es un {{ US_BACKUP_WITHHOLDING_PCT }}% fijo y no se aplica
          sobre la ganancia sino sobre el <strong>producido bruto de la venta</strong>: al vender
          USD 22.000 te pueden retener sobre los 22.000 enteros y no sobre los 2.000 de ganancia.
          Recuperarlo exige presentar un Form 1040-NR al año siguiente y esperar el reembolso.
        </li>
      </ul>

      <h2>
        El estate tax: {{ usd(US_ESTATE_TAX_THRESHOLD_USD, 0) }}, y no depende de que hagas nada mal
      </h2>
      <p>
        Si el titular fallece, los activos con <em>situs</em> estadounidense por encima de
        <strong>USD 60.000</strong> quedan alcanzados por una escala que trepa hasta el
        <strong>{{ US_ESTATE_TAX_TOP_RATE_PCT }}%</strong>, el albacea debe presentar el Form 706-NA
        y el bróker congela la cuenta hasta que salga el <em>transfer certificate</em>. Compará ese
        umbral con el de un residente estadounidense, que está en varios millones.
      </p>
      <p>
        El número no se indexa por inflación, y hay una razón: la ley no dice «exento hasta 60.000»,
        dice que el crédito unificado del no residente es de
        <strong>USD {{ formatInt(US_NRA_UNIFIED_CREDIT_USD) }}</strong
        >, que es exactamente el impuesto que la escala genera sobre 60.000. Uruguay tampoco tiene
        tratado sucesorio con EE.UU., así que ese umbral <strong>no se puede ampliar</strong>.
      </p>
      <p>
        Con USD 20.000 estás debajo. Pero el umbral se mide sobre el valor
        <strong>a la fecha de fallecimiento</strong>, no sobre lo aportado: lo cruzás a las tres
        veces que repitas el aporte, y la sola revalorización puede cruzarlo sola.
      </p>

      <h2>La vía irlandesa: por qué el domicilio del fondo cambia las dos cosas</h2>
      <p>
        Un UCITS domiciliado en Irlanda que invierte en las mismas acciones estadounidenses soporta
        <strong>{{ IRISH_UCITS_US_WITHHOLDING_PCT }}%</strong> de retención en vez de 30%. Prestá
        atención al nivel en el que ocurre: <strong>la sufre el fondo</strong>, no vos. Al inversor
        uruguayo le llega ya neteada dentro del valor cuota, sin reclamar ni llenar nada. Por eso un
        uruguayo <em>sin</em> tratado propio igual accede al 15%: usa el tratado de Irlanda, no el
        suyo.
      </p>
      <p>
        Y no muda el problema a Dublín. Irlanda no le retiene nada al inversor no residente, ni
        sobre las distribuciones ni al vender, por dos caminos independientes: las cuotapartes
        mantenidas en un sistema de compensación reconocido (el caso de un ETF que se compra y vende
        en bolsa) no requieren deducción de <em>exit tax</em>, y tampoco se deduce respecto de
        inversores no residentes de un fondo constituido a partir del 1 de abril de 2000. Tampoco
        cobra impuesto a la herencia sobre esas cuotapartes cuando ni el causante ni el beneficiario
        son residentes irlandeses. Sumado a que Uruguay no tiene impuesto sucesorio, una herencia
        así no paga impuesto sucesorio en ninguna de las tres jurisdicciones.
      </p>
      <p>
        Sobre el estate tax, el mecanismo es el mismo artículo que hace todo el trabajo: las
        acciones son bien situado en EE.UU. <strong>únicamente</strong> si las emitió una sociedad
        doméstica, y la ley no habilita mirar a través hacia lo que el fondo tiene adentro. El mismo
        S&amp;P 500 comprado vía Dublín no cuenta contra los USD 60.000.
      </p>

      <h2>Lo que no publicamos, y por qué</h2>
      <ul>
        <li v-for="f in unresolvedFacts" :key="f.id">
          <strong>{{ f.title }}.</strong> {{ f.law }} —
          <a :href="f.sourceUrl" target="_blank" rel="noopener noreferrer">ver la fuente</a>.
        </li>
        <li>
          <strong>El rendimiento por dividendos del fondo.</strong> Cambia todos los años y no lo
          verificamos en la ficha del emisor, así que es un campo que llenás vos. Sin ese dato, la
          diferencia entre 30% y 15% no se puede expresar en dólares — sólo la mecánica.
        </li>
        <li>
          <strong
            >El IVA sobre la comisión que te cobra el banco por acreditar la transferencia.</strong
          >
          No lo verificamos en fuente primaria, así que no lo sumamos. Si tu banco te lo cobra,
          cargalo dentro de la comisión de entrada.
        </li>
      </ul>

      <h2>El lado uruguayo: traer la plata no es el hecho generador</h2>
      <p>
        Uruguay no tiene base de remesa. Los dividendos se gravan por lo
        <strong>devengado</strong>, los cobres o no los traigas; la ganancia se imputa al momento de
        la <strong>enajenación</strong>. Cuando «traés la guita de vuelta», el impuesto ya se
        devengó antes: la transferencia en sí no genera nada. Si dejás la plata en el bróker, igual
        debés. Y no es que la transferencia esté «exonerada»: es que ya no queda nada que gravar
        sobre el capital.
      </p>
      <p>
        Los USD 10.000 tampoco son un límite para transferencias: ese umbral es para el
        <strong>transporte físico</strong> de efectivo o instrumentos monetarios cruzando la
        frontera. Traer USD 22.000 por SWIFT no lo dispara; traerlos en el bolso sin declarar sí, y
        cuesta una multa. Lo que el banco sí va a hacer es debida diligencia: identificarte, conocer
        el propósito de la operación y, cuando corresponda, pedirte el origen de los fondos.
      </p>
      <p>
        Un detalle operativo que arruina planes: los brókers rechazan por regla los depósitos de
        terceros, y en algún banco el giro de salida es
        <strong>exclusivamente por sucursal</strong>. El camino real es cuenta a nombre propio →
        sucursal o canal digital → wire. No sirve mandarlo desde la cuenta de un familiar.
      </p>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-3">
        Las alícuotas uruguayas, el crédito por impuesto pagado en el exterior, los anticipos
        semestrales y el <em>step-up</em> al 31/12/2025 están explicados en
        <NuxtLink :to="localePath('/impuestos-inversiones-uruguay')">
          la guía del IRPF Categoría I</NuxtLink
        >, y la comparación de plataformas disponibles en Uruguay, en
        <NuxtLink :to="localePath('/inversiones-uruguay')">dónde invertir en Uruguay</NuxtLink>.
      </VAlert>
    </template>

    <template #disclaimer>
      Estimación de referencia, no asesoramiento tributario ni financiero. Las
      <strong>alícuotas</strong> salen de la norma y llevan su artículo; los
      <strong>precios comerciales</strong> (comisiones de bróker y aranceles de banco) son valores
      por defecto <strong>editables</strong>, leídos el {{ readOnLabel }} en el tarifario publicado
      de cada institución, que cambia sin aviso: confirmalos antes de operar. Tu caso concreto
      depende de tu residencia fiscal, del domicilio del fondo, de los días que pasaste en EE.UU. y
      de si tenés o no agente de retención uruguayo. Consultá un contador antes de declarar.
    </template>
  </ToolShell>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BANK_WIRE_PRESETS,
  BROKER_PRESETS,
  bankPresetById,
  brokerPresetById,
  feeFor,
  FOREIGN_INVESTING_VERIFIED_ON,
  foreignInvestingRoundTrip,
  IRISH_UCITS_US_WITHHOLDING_PCT,
  STAGE_LABELS,
  US_BACKUP_WITHHOLDING_PCT,
  US_CAPITAL_GAIN_PCT_IF_PRESENT,
  US_DIVIDEND_WITHHOLDING_PCT,
  US_ESTATE_TAX_THRESHOLD_USD,
  US_ESTATE_TAX_TOP_RATE_PCT,
  US_FACTS,
  US_NRA_UNIFIED_CREDIT_USD,
  US_PRESENCE_DAYS_THRESHOLD,
  US_REMITTANCE_TAX_PCT,
  type CostStage,
  type FundDomicile,
  type TransferRoute,
} from '~/utils/foreignInvestingCost'
import { formatUSD } from '~/utils/format'
import type { WithholdingAgent } from '~/utils/capitalTax'

const localePath = useLocalePath()

// ── Formato ──────────────────────────────────────────────────────────────────
const usd = (v: number, decimals = 2) => formatUSD(v, decimals)
const pct = (n: number) => `${n.toLocaleString('es-UY', { maximumFractionDigits: 2 })}%`
const formatInt = (n: number) => n.toLocaleString('es-UY')
const stageLabel = (s: CostStage) => STAGE_LABELS[s]
const readOnLabel = new Date(`${FOREIGN_INVESTING_VERIFIED_ON}T00:00:00`).toLocaleDateString(
  'es-UY',
  { day: 'numeric', month: 'long', year: 'numeric' }
)

/** Números no negativos y finitos, o 0: nada llega al módulo sin pasar por acá. */
const safe = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(v, 0) : 0
/** Igual, pero admite negativos: el rendimiento puede serlo. */
const safeSigned = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
/** Un override vacío tiene que llegar como `null`, no como 0: 0 es «gratis», null es «usá el default». */
const optional = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(v, 0) : null

// ── Estado ───────────────────────────────────────────────────────────────────
// Los defaults reproducen el caso textual del post: USD 20.000, un año, +10%.
const amountSent = ref(20_000)
const holdingYears = ref(1)
const totalReturnPct = ref(10)
/** Deliberadamente 0: el yield del fondo es un dato del emisor, no lo inventamos. */
const dividendYieldPct = ref(0)
const domicile = ref<FundDomicile>('eeuu')
const route = ref<TransferRoute>('internacional')
const bankId = ref('itau-link')
const brokerId = ref('ibkr-pro-fixed')
const correspondentBearer = ref<'ordenante' | 'beneficiario'>('beneficiario')
const localOut = ref(5)
const localIn = ref(0)
const sharePrice = ref<number | null>(null)
const aumPct = ref(0)
const gainMethod = ref<'real' | 'ficto20'>('real')
const withholdingAgent = ref<WithholdingAgent>('ninguno')
const definitiveWithholding = ref(false)
const outboundOverride = ref<number | null>(null)
const corrOutOverride = ref<number | null>(null)
const corrInOverride = ref<number | null>(null)
const inboundOverride = ref<number | null>(null)

const bank = computed(() => bankPresetById(bankId.value) ?? BANK_WIRE_PRESETS[0])
const broker = computed(() => brokerPresetById(brokerId.value) ?? BROKER_PRESETS[0])

// ── Selectores ───────────────────────────────────────────────────────────────
// El orden NO es un ranking. Los presets se listan como vienen del módulo (alfabético) y la
// página no marca ninguno como «el más barato»: el ganador cambia con el monto y el plazo.
const bankItems = BANK_WIRE_PRESETS.map(b => ({ key: b.id, label: `${b.bank} — ${b.channel}` }))
const brokerItems = BROKER_PRESETS.map(b => ({ key: b.id, label: `${b.name} — ${b.plan}` }))

const domicileItems: Array<{ key: FundDomicile; label: string }> = [
  { key: 'eeuu', label: 'Estados Unidos (SPY, VOO, VTI…)' },
  { key: 'irlanda', label: 'Irlanda (UCITS: CSPX, VUAA, VWCE…)' },
]

const routeItems: Array<{ key: TransferRoute; label: string }> = [
  { key: 'internacional', label: 'Giro internacional desde mi banco' },
  { key: 'local', label: 'Transferencia local a un corredor uruguayo' },
]

const bearerItems: Array<{ key: 'ordenante' | 'beneficiario'; label: string }> = [
  // El default documentado es «beneficiario»: por eso va primero y es el valor inicial.
  { key: 'beneficiario', label: 'El beneficiario (por defecto: se descuenta del giro)' },
  { key: 'ordenante', label: 'Yo, el ordenante (modalidad «OUR»)' },
]

const agentItems: Array<{ key: WithholdingAgent; label: string }> = [
  { key: 'ninguno', label: 'Ningún agente uruguayo (cuenta directa en el exterior)' },
  { key: 'custodio-local', label: 'Un bróker uruguayo que además ejerce la custodia' },
  { key: 'otro-agente', label: 'Otro agente local sin custodia (banco, corredor, fondo)' },
]

const gainMethodItems: Array<{ key: 'real' | 'ficto20'; label: string }> = [
  { key: 'real', label: 'Real: precio − costo fiscal (la regla general)' },
  { key: 'ficto20', label: 'Ficta: 20% del precio de venta (opción anual)' },
]

const dividendHint = computed(() =>
  domicile.value === 'irlanda'
    ? 'El bruto en la fuente: el fondo le descuenta el 15% antes de distribuir'
    : 'El bruto: sobre eso cae la retención del 30%'
)

// ── Cálculo ──────────────────────────────────────────────────────────────────
const result = computed(() =>
  foreignInvestingRoundTrip({
    amountSentUsd: safe(amountSent.value),
    holdingYears: safe(holdingYears.value),
    totalReturnPct: safeSigned(totalReturnPct.value),
    grossDividendYieldPct: safe(dividendYieldPct.value),
    domicile: domicile.value,
    route: route.value,
    bank: route.value === 'internacional' ? bank.value : null,
    correspondentBearer: correspondentBearer.value,
    localTransferOutUsd: optional(localOut.value),
    localTransferInUsd: optional(localIn.value),
    broker: broker.value,
    sharePriceUsd: optional(sharePrice.value),
    annualAumFeePctOverride: safe(aumPct.value),
    gainMethod: gainMethod.value,
    withholdingAgent: withholdingAgent.value,
    definitiveWithholding: definitiveWithholding.value,
    outboundBankFeeOverrideUsd: optional(outboundOverride.value),
    correspondentOutOverrideUsd: optional(corrOutOverride.value),
    correspondentInOverrideUsd: optional(corrInOverride.value),
    inboundBankFeeOverrideUsd: optional(inboundOverride.value),
  })
)

/** Lo que dice el tarifario para el monto de hoy, como placeholder de los campos editables. */
const defaults = computed(() => {
  const amount = safe(amountSent.value)
  const back = result.value.totals.wiredHomeUsd
  return {
    outbound: feeFor(amount, bank.value.outbound),
    corrOut: feeFor(amount, bank.value.correspondentOut),
    corrIn: feeFor(back, bank.value.correspondentIn),
    inbound: feeFor(back, bank.value.inbound),
  }
})
const defaultLabel = (v: number | null) => (v === null ? 'no publicado' : usd(v))

const unresolvedFacts = US_FACTS.filter(f => f.confidence === 'no-resuelto')

// ── ToolShell ────────────────────────────────────────────────────────────────
const sources = [
  {
    label: 'IRS — Publication 519, U.S. Tax Guide for Aliens',
    url: 'https://www.irs.gov/pub/irs-pdf/p519.pdf',
  },
  {
    label: 'IRC 871 — impuesto a los extranjeros no residentes',
    url: 'https://www.law.cornell.edu/uscode/text/26/871',
  },
  {
    label: 'IRS — Table 3, List of Tax Treaties (Uruguay no está)',
    url: 'https://www.irs.gov/pub/irs-lbi/table-3-list-of-tax-treaties.pdf',
  },
  {
    label: 'IRS — instrucciones del Form W-8BEN',
    url: 'https://www.irs.gov/pub/irs-pdf/iw8ben.pdf',
  },
  {
    label: 'IRS — instrucciones del Form 706-NA (estate tax del no residente)',
    url: 'https://www.irs.gov/pub/irs-pdf/i706na.pdf',
  },
  {
    label: 'IRC 2104 — qué es un bien situado en Estados Unidos',
    url: 'https://www.law.cornell.edu/uscode/text/26/2104',
  },
  {
    label: 'IRC 4475 — impuesto a las remesas (limitado a efectivo)',
    url: 'https://www.law.cornell.edu/uscode/text/26/4475',
  },
  {
    label: 'IRS — tratado Estados Unidos–Irlanda',
    url: 'https://www.irs.gov/pub/irs-trty/ireland.pdf',
  },
  {
    label: 'Revenue (Irlanda) — Investment Undertakings, exit tax',
    url: 'https://www.revenue.ie/en/tax-professionals/tdm/income-tax-capital-gains-tax-corporation-tax/part-27/27-01a-02.pdf',
  },
  {
    label: 'IMPO — Texto Ordenado, Título 7 (IRPF)',
    url: 'https://www.impo.com.uy/bases/todgi-2023/7-2024',
  },
  {
    label: 'IMPO — Decreto 148/007 (costo fiscal, ficto, crédito por impuesto del exterior)',
    url: 'https://www.impo.com.uy/bases/decretos/148-2007',
  },
  {
    label: 'IMPO — Resolución DGI 1517/2026 (anticipos semestrales y retenciones)',
    url: 'https://www.impo.com.uy/bases/resoluciones-dgi/1517-2026',
  },
  {
    label: 'BCU — costos de transferencias y giros (portal del usuario financiero)',
    url: 'https://usuariofinanciero.bcu.gub.uy/medios-de-pago/tipos-de-medios-de-pago/',
  },
]

const faq = [
  {
    q: 'Si invierto en el SPY desde Uruguay, ¿Estados Unidos me cobra por la ganancia?',
    a: 'No, si estuviste menos de 183 días en Estados Unidos durante el año fiscal. Un no residente no paga impuesto estadounidense a la ganancia de capital por vender acciones o ETFs, y la exención no viene de un tratado sino del propio estatuto, así que un uruguayo la tiene igual pese a no tener convenio con EE.UU. Es una regla de presencia física, no de residencia fiscal ni de monto: no hay mínimo no imponible ni escalones. Si estuviste 183 días o más, en cambio, tu ganancia neta paga 30% y se declara en el Schedule NEC del Form 1040-NR, aun por operaciones hechas estando fuera del país.',
  },
  {
    q: '¿Cuánto me retienen por los dividendos y se puede bajar?',
    a: 'Un 30% sobre el monto bruto, retenido en la fuente, y con un ETF domiciliado en Estados Unidos no se puede bajar: Uruguay no tiene tratado de doble imposición en renta con EE.UU., así que la Parte II del W-8BEN (la de los beneficios del convenio) te queda vacía. La única vía documentada es el domicilio del fondo: un UCITS irlandés que invierte en las mismas acciones estadounidenses habitualmente soporta 15% en vez de 30%, y esa retención la sufre el fondo, no vos: te llega ya neteada dentro del valor cuota. Es el tratado de Irlanda haciendo el trabajo, no el tuyo.',
  },
  {
    q: 'Si traigo la plata de vuelta a Uruguay, ¿qué me cobran?',
    a: 'Ningún impuesto por traerla: el capital que vuelve no es renta y el impuesto uruguayo ya se devengó antes (los dividendos por lo devengado, la ganancia al momento de la enajenación). Lo que sí te cobran son precios comerciales: el cargo del bróker por retirar, la cadena de bancos corresponsales —que por defecto se descuenta del monto girado y la paga el beneficiario— y la comisión del banco uruguayo por acreditar. Con los tarifarios publicados, ese viaje de ida y vuelta ronda entre USD 95 y USD 215 según el banco y el canal, contra unos pocos dólares de comisión del bróker. El impuesto uruguayo se paga aparte: no te lo descuentan del giro.',
  },
  {
    q: '¿La comisión es por el monto o por la transacción?',
    a: 'Conviven tres estructuras opuestas. Interactive Brokers cobra por acción con un mínimo por orden y un tope del 1% del valor operado: con USD 20.000 en un ETF caro manda el mínimo, y el doble de plata cuesta lo mismo. Los corredores locales y las billeteras cobran un porcentaje del monto operado, así que el costo escala. Y hay una tercera que casi nadie menciona: una comisión anual sobre el saldo, cobrada mensualmente y además de las de operación, que en un buy-and-hold es la que más pesa. Cuál conviene depende del monto y de cuántas veces movés la plata: por eso la calculadora te deja variar todo en vez de coronar un ganador.',
  },
  {
    q: '¿Qué es el estate tax y por qué me importa si invierto en un ETF de Estados Unidos?',
    a: 'Es el impuesto a la herencia estadounidense. Para un no residente, el mínimo no imponible sobre activos con situs estadounidense es de USD 60.000 —contra varios millones para un residente— y la escala trepa hasta 40%. Uruguay tampoco tiene tratado sucesorio con EE.UU., así que ese umbral no se puede ampliar. El umbral se mide sobre el valor a la fecha de fallecimiento, no sobre lo aportado, y el bróker congela la cuenta hasta que el albacea tramite el Form 706-NA y el transfer certificate. Un fondo domiciliado en Irlanda queda fuera: las acciones son bien situado en EE.UU. únicamente si las emitió una sociedad doméstica, y la ley no habilita mirar a través hacia lo que el fondo tiene adentro.',
  },
  {
    q: '¿Por qué me llegó menos plata de la que mandé?',
    a: 'Por la cadena de bancos corresponsales. No es una comisión oculta: los tarifarios publicados dicen que ese costo se descuenta del monto transferido y que el beneficiario recibe neto, salvo que el ordenante pida expresamente asumirlo — y por defecto se le cobra al beneficiario. Es una opción que nadie eligió. Ojo con el vocabulario: el "corresponsal" de un giro internacional es un banco intermediario de la cadena SWIFT, no tiene nada que ver con los corresponsales financieros de Abitab o Redpagos.',
  },
  {
    q: '¿El impuesto del 1% a las remesas de Estados Unidos me pega?',
    a: 'A un giro debitado de tu cuenta de bróker o de banco, no. El impuesto federal a los remittance transfers rige desde el 1 de enero de 2026, pero el propio artículo se titula "Tax limited to cash and similar instruments" y lo limita a las transferencias en las que el remitente entrega efectivo, giro postal, cheque de caja u otro instrumento físico similar. Un wire no encaja. Sí le puede pegar a quien mande plata a Uruguay desde un local de remesas pagando en efectivo.',
  },
  {
    q: '¿El 30% que me retuvieron en Estados Unidos me lo descuentan del IRPF uruguayo?',
    a: 'Sí, pero sólo contra el impuesto de esa misma renta y sin devolución ni arrastre. El crédito por impuesto pagado en el exterior existe como norma expresa y no exige tratado. El detalle que cambia la cuenta: se imputa "respecto de la misma renta" y topea en el IRPF de esa renta. Si EE.UU. te retiene 30% sobre los dividendos y Uruguay cobra 12% sobre esos mismos dividendos, el IRPF de los dividendos queda en cero pero los 18 puntos de exceso se pierden: no bajan el 12% de la ganancia de capital ni se arrastran al año siguiente. Por eso esta calculadora liquida las dos rentas en filas separadas.',
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
</style>
