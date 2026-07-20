<template>
  <VContainer class="cuotas-page py-8 py-md-12">
    <!-- Verdict -->
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">ANÁLISIS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        ¿Conviene comprar en 24 cuotas e invertir el efectivo?
      </h1>
      <p class="lead mb-6">
        Es una discusión vieja y la respuesta no es sí ni no: depende de un solo número que los
        comercios casi nunca te dicen. Acá lo calculamos, y de paso mostramos por qué la jugada gana
        mucho menos de lo que casi todos creen — incluso cuando las cuotas son
        <em>de verdad</em> sin recargo.
      </p>

      <VCard class="verdict-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-3">El veredicto, en tres casos</div>
        <div class="verdict-grid">
          <div class="verdict-item is-bad">
            <div class="verdict-h">Cuotas con recargo</div>
            <div class="verdict-n">Contado</div>
            <p>
              Es el caso de la financiación en la factura de Antel (<strong>23,97% anual</strong>) y
              de cualquier tarjeta financiando saldo (56% a 120%). Ningún instrumento seguro en
              Uruguay paga eso. El mejor rendimiento seguro y verificable es
              <strong>~5,4% anual</strong>. No hay discusión.
            </p>
          </div>
          <div class="verdict-item is-mid">
            <div class="verdict-h">Cuotas sin recargo real (0%)</div>
            <div class="verdict-n">Empate</div>
            <p>
              Acá está la sorpresa. Sobre el papel ganás ~$2.000 en un celular de $46.000. Pero el
              <strong>seguro sobre saldo deudor</strong> y la
              <strong>rebaja de IVA que perdés</strong> por pagar con crédito en vez de débito se lo
              comen casi entero. No es "la mejor jugada": es empatar tomando riesgo.
            </p>
          </div>
          <div class="verdict-item is-good">
            <div class="verdict-h">Cuándo gana de verdad</div>
            <div class="verdict-n">Cuotas</div>
            <p>
              0% real <em>y</em> tu tarjeta no cobra seguro sobre saldo deudor <em>y</em> ya tenías
              la tarjeta <em>y</em> no vas a gastar la plata. Ahí sí ganás — entre $1.000 y $2.000
              en dos años. Que es, más o menos, una pizza por mes de recompensa por dos años de
              disciplina.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- The rule -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">La pregunta correcta no es "¿cuotas o contado?"</h2>
      <p class="mb-4">
        Es <strong>"¿cuál es la tasa implícita?"</strong>. Y no te la van a decir: en Uruguay el
        vendedor está obligado a informarte el precio contado, el total financiado y la cantidad de
        cuotas — pero la tasa solo la deben publicar las instituciones financieras. Una telco que
        financia en su propia factura queda afuera. Te dan los ingredientes y no el número.
      </p>
      <p class="mb-4">Sacarlo es una cuenta, y es la que hace esta página. La regla es simple:</p>
      <VCard variant="flat" class="rule-card pa-5 mb-4">
        <p class="mb-2">
          Financiar conviene <strong>si y solo si</strong> la tasa implícita del plan es
          <strong>menor</strong> que lo que podés ganar con la plata, neto de comisiones e
          impuestos.
        </p>
        <p class="mb-0 text-medium-emphasis">
          El punto de equilibrio <em>es</em> la tasa implícita. No es una coincidencia: es lo que
          significa una tasa.
        </p>
      </VCard>
      <p class="mb-0">
        Con la Tasa de Política Monetaria del BCU en <strong>{{ rates.tpm }}%</strong> y la
        inflación en <strong>{{ rates.inflacion }}%</strong>, lo mejor que podés conseguir sin
        correr riesgo son <strong>~5,4% al año</strong>. Ese es el número a batir. Todo lo demás es
        aritmética.
      </p>
    </section>

    <!-- Calculator -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Calculalo con tu caso</h2>
      <p class="text-medium-emphasis mb-5">
        Sirve para cualquier compra grande, no solo un celular: heladera, tele, moto, lo que sea.
      </p>

      <VCard class="pa-4 pa-sm-6 calc-card">
        <VRow>
          <VCol cols="12" md="7">
            <div class="text-overline mb-3">La compra</div>
            <VRow dense>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="form.precioContado"
                  label="Precio al contado"
                  prefix="$"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="input-contado"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="form.cuota"
                  label="Valor de cada cuota"
                  prefix="$"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                  data-testid="input-cuota"
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="form.cuotas"
                  label="Cantidad de cuotas"
                  type="number"
                  variant="outlined"
                  density="comfortable"
                  hide-details
                />
              </VCol>
              <VCol cols="12" sm="6">
                <VTextField
                  v-model.number="form.rendimientoAnualNeto"
                  label="Rendimiento neto anual"
                  suffix="%"
                  type="number"
                  step="0.1"
                  variant="outlined"
                  density="comfortable"
                  hint="Neto de comisión e IRPF"
                  persistent-hint
                />
              </VCol>
            </VRow>

            <div class="text-overline mt-6 mb-2">Si pagaras al contado, ¿con qué?</div>
            <VBtnToggle
              v-model="form.contadoMedio"
              mandatory
              density="comfortable"
              color="primary"
              class="seg-toggle mb-2"
            >
              <VBtn value="debito" class="seg-btn">Débito</VBtn>
              <VBtn value="credito" class="seg-btn">Crédito</VBtn>
              <VBtn value="efectivo" class="seg-btn">Efectivo</VBtn>
            </VBtnToggle>
            <p class="text-caption text-medium-emphasis mb-4">
              No es un detalle: el débito te da 2 puntos de IVA que el crédito
              <strong>no</strong> tiene — y el efectivo tampoco.
            </p>

            <div class="text-overline mb-2">Las cuotas, ¿dónde?</div>
            <VBtnToggle
              v-model="form.financiacion"
              mandatory
              density="comfortable"
              color="primary"
              class="seg-toggle mb-4"
            >
              <VBtn value="tarjeta" class="seg-btn">Tarjeta de crédito</VBtn>
              <VBtn value="factura" class="seg-btn">Factura del comercio</VBtn>
            </VBtnToggle>

            <VExpansionPanels variant="accordion" class="mt-2">
              <VExpansionPanel>
                <VExpansionPanelTitle>Supuestos (podés cambiarlos)</VExpansionPanelTitle>
                <VExpansionPanelText>
                  <VRow dense>
                    <VCol cols="12" sm="6">
                      <VTextField
                        v-model.number="form.seguroSaldoPermil"
                        label="Seguro sobre saldo deudor"
                        suffix="‰/mes"
                        type="number"
                        step="0.5"
                        variant="outlined"
                        density="compact"
                        hint="Santander e Itaú cobran 3‰. Poné 0 si tu tarjeta no lo cobra."
                        persistent-hint
                        data-testid="input-seguro"
                      />
                    </VCol>
                    <VCol cols="12" sm="6">
                      <VTextField
                        v-model.number="form.costoAnualTarjeta"
                        label="Costo anual de la tarjeta"
                        prefix="$"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hint="0 si ya la tenías: ese costo es hundido."
                        persistent-hint
                      />
                    </VCol>
                    <VCol cols="12" sm="6">
                      <VTextField
                        v-model.number="form.puntosCreditoPct"
                        label="Puntos con crédito"
                        suffix="%"
                        type="number"
                        step="0.01"
                        variant="outlined"
                        density="compact"
                        hint="BROU Recompensa crédito: 1,00%"
                        persistent-hint
                      />
                    </VCol>
                    <VCol cols="12" sm="6">
                      <VTextField
                        v-model.number="form.puntosDebitoPct"
                        label="Puntos con débito"
                        suffix="%"
                        type="number"
                        step="0.01"
                        variant="outlined"
                        density="compact"
                        hint="BROU Recompensa débito: 0,33%"
                        persistent-hint
                      />
                    </VCol>
                  </VRow>
                </VExpansionPanelText>
              </VExpansionPanel>
            </VExpansionPanels>

            <div class="text-overline mt-6 mb-2">Casos reales, ya cargados</div>
            <div class="d-flex flex-wrap ga-2">
              <VChip
                v-for="c in CASOS"
                :key="c.id"
                link
                size="small"
                variant="tonal"
                :color="c.destacado ? 'primary' : undefined"
                @click="cargarCaso(c)"
              >
                {{ c.vendedor }}
              </VChip>
            </div>
          </VCol>

          <VCol cols="12" md="5">
            <div class="result-panel pa-4 pa-sm-5">
              <div class="text-overline mb-1">Tasa implícita del plan</div>
              <div class="tea" :class="teaClass" data-testid="tea">
                {{ result.tasaImplicitaTEA.toFixed(2).replace('.', ',') }}%
                <span class="tea-sub">anual</span>
              </div>
              <p class="text-caption text-medium-emphasis mb-4">
                <template v-if="result.tasaImplicitaTEA === 0">
                  Sin recargo: {{ form.cuotas }} cuotas × {{ money(form.cuota) }} =
                  {{ money(result.totalCuotas) }}, el mismo precio contado.
                </template>
                <template v-else>
                  Pagás {{ money(result.totalCuotas) }} por algo que cuesta
                  {{ money(form.precioContado) }}. Recargo: {{ money(result.recargoNominal) }}.
                </template>
              </p>

              <VDivider class="mb-4" />

              <div class="breakdown">
                <div class="bd-row">
                  <span>Ganancia por financiar e invertir</span>
                  <strong :class="signClass(result.ventajaBruta)">{{
                    money(result.ventajaBruta, true)
                  }}</strong>
                </div>
                <div v-for="e in result.extras" :key="e.concepto" class="bd-row is-extra">
                  <span>
                    {{ e.concepto }}
                    <VTooltip :text="e.detalle" location="top" max-width="280">
                      <template #activator="{ props: tp }">
                        <VIcon v-bind="tp" icon="mdi-information-outline" size="14" class="ml-1" />
                      </template>
                    </VTooltip>
                  </span>
                  <strong :class="signClass(e.monto)">{{ money(e.monto, true) }}</strong>
                </div>
                <VDivider class="my-3" />
                <div class="bd-row is-total">
                  <span>Resultado</span>
                  <strong :class="signClass(result.ventajaNeta)" data-testid="veredicto-monto">{{
                    money(result.ventajaNeta, true)
                  }}</strong>
                </div>
              </div>

              <VAlert
                :type="alertType"
                variant="tonal"
                density="comfortable"
                class="mt-4"
                data-testid="veredicto"
              >
                <strong>{{ veredictoTitulo }}</strong>
                <div class="text-body-2 mt-1">{{ veredictoTexto }}</div>
              </VAlert>
            </div>
          </VCol>
        </VRow>
      </VCard>
    </section>

    <!-- Monte Carlo -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Y si tenés suerte?</h2>
      <p class="mb-5">
        El rendimiento del fondo no lo sabés de antemano, y tampoco sabés si vas a poder pagar las
        24 cuotas sin fallar una. Así que en vez de un número único, simulamos
        <strong>{{ mc.paths.toLocaleString('es-UY') }} escenarios</strong>: variamos el rendimiento
        y dejamos que, con probabilidad {{ mcOpts.probMora }}%, se te atrase una cuota.
      </p>

      <VCard class="pa-4 pa-sm-6">
        <VRow>
          <VCol cols="12" md="5">
            <div class="mc-headline" data-testid="mc-prob">{{ fmtPct(mc.probGanaCuotas) }}</div>
            <p class="text-body-2 mb-5">
              de los escenarios en que financiar te deja
              <strong>algo que valga la pena</strong> (más de 1% del precio).
            </p>
            <div class="mc-stats">
              <div class="mc-stat">
                <span>Pierde plata</span><strong>{{ fmtPct(mc.probPierde) }}</strong>
              </div>
              <div class="mc-stat">
                <span>Resultado típico</span><strong>{{ money(mc.mediana, true) }}</strong>
              </div>
              <div class="mc-stat">
                <span>Buen escenario (p95)</span><strong>{{ money(mc.p95, true) }}</strong>
              </div>
              <div class="mc-stat is-bad">
                <span>Peor escenario</span><strong>{{ money(mc.peor, true) }}</strong>
              </div>
            </div>
            <VAlert type="info" variant="tonal" density="comfortable" class="mt-5">
              Mirá la asimetría: lo que podés ganar tiene techo, y lo que podés perder no. Una sola
              cuota atrasada paga <strong>81% anual</strong> de mora y se lleva de un saque varios
              años de rendimiento. Y eso <em>sin</em> contar el clearing, que puede quedarte 5 a 10
              años y no se borra por pagar.
            </VAlert>
          </VCol>
          <VCol cols="12" md="7">
            <div class="chart-wrap">
              <ClientOnly>
                <BarChart
                  :key="chartKey"
                  :chart-data="chartData"
                  :options="chartOptions"
                  aria-label="Distribución de resultados simulados"
                />
                <template #fallback>
                  <div class="d-flex align-center justify-center fill-height">
                    <VProgressCircular indeterminate color="primary" />
                  </div>
                </template>
              </ClientOnly>
            </div>
            <p class="text-caption text-medium-emphasis mt-2 mb-0">
              Cada barra es la cantidad de escenarios que terminaron con ese resultado. A la
              izquierda de cero, financiar te salió caro.
            </p>
          </VCol>
        </VRow>
      </VCard>
    </section>

    <!-- Debunk -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-5">Tres cosas que casi todos calculan mal</h2>

      <div class="myth mb-5">
        <div class="myth-h">
          <VIcon icon="mdi-close-circle-outline" color="error" class="mr-2" />
          "La compra se licúa con la inflación <em>y</em> el fondo crece"
        </div>
        <p>
          Es el argumento más votado del hilo de Reddit que originó esta página, y cuenta dos veces
          lo mismo. El rendimiento <strong>nominal</strong> del fondo <em>ya contiene</em> la
          inflación: no podés sumarle la licuación arriba. Si lo hacés, te estás cobrando el mismo
          beneficio dos veces.
        </p>
        <p class="mb-0">
          ¿Cuánto vale la licuación en realidad? Con inflación de 4,5%, las 24 cuotas fijas valen en
          promedio <strong>95,6%</strong> de su valor nominal. O sea:
          <strong>~4,5% del precio, en dos años</strong>. Cualquier recargo por encima de 5% ya se
          comió todo el beneficio. Con inflación de un dígito, licuar deuda no te hace rico.
        </p>
      </div>

      <div class="myth mb-5">
        <div class="myth-h">
          <VIcon icon="mdi-close-circle-outline" color="error" class="mr-2" />
          "El celular va a estar más caro si espero"
        </div>
        <p class="mb-0">
          No. La inflación general es {{ rates.inflacion }}%, pero la empujan los combustibles y los
          servicios. Un celular es un <strong>bien transable</strong>, y los transables corren a
          <strong>{{ MACRO.inflacionTransables.value }}% anual</strong>. En dólares, la electrónica
          <em>baja</em> de precio con el tiempo. Apurar la compra "antes de que suba" no tiene
          sustento en los datos.
        </p>
      </div>

      <div class="myth">
        <div class="myth-h">
          <VIcon icon="mdi-close-circle-outline" color="error" class="mr-2" />
          "¿Y si el dólar se dispara?"
        </div>
        <p class="mb-0">
          Si la deuda es en pesos y el fondo es en pesos,
          <strong>tu exposición al dólar es cero</strong>: activo y pasivo están en la misma moneda.
          El tipo de cambio solo entra si guardás la plata en dólares — y ahí no estás invirtiendo,
          estás apostando a que el peso se devalúe. Puede salir bien: en los últimos 15 años el peso
          se devaluó en el 71% de las ventanas de 24 meses. Pero en 2025 el peso se
          <strong>apreció 11,5%</strong>, y el que hizo esa apuesta perdió.
        </p>
      </div>
    </section>

    <!-- The 1% question -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">
        El 1% de BROU Recompensa: sí existe, y no cambia nada
      </h2>
      <p class="mb-4">
        Es cierto: la tarjeta de <strong>crédito</strong> BROU Recompensa da 1 punto cada $100, y
        cada punto vale $1. Es exactamente <strong>1,00%</strong>. En un celular de $46.000 son $462
        de vuelta.
      </p>
      <VAlert type="warning" variant="tonal" class="mb-4">
        Pero los términos de BROU dicen, textual, que
        <em
          >"los puntos correspondientes a compras en cuotas se acreditan en una única vez por el
          valor total de la compra, en la fecha de presentación al cobro de la primera cuota"</em
        >. Traducido: <strong>cobrás el mismo 1% pagando en 1 cuota o en 24.</strong>
        No es un argumento ni a favor ni en contra de financiar. Se cancela.
      </VAlert>
      <p class="mb-4">
        Y hay una trampa: la versión <strong>débito</strong> de la misma tarjeta paga
        <strong>0,33%</strong>, no 1% (1 punto cada $300).
      </p>
      <p class="mb-0">
        Lo contraintuitivo es lo que pasa cuando sumás el IVA. Pagando
        <strong>contado con débito</strong> te llevás
        <strong>1,64% de IVA + 0,33% de puntos = ~1,97%</strong>. Pagando con la tarjeta de
        <strong>crédito</strong> te llevás <strong>1,00% y nada de IVA</strong>. Es decir:
        <strong>pagar en efectivo con débito le gana a pagar con la tarjeta de premios</strong>, y
        por casi el doble. Casi nadie cuenta la rebaja de IVA, y es el "premio" más grande de toda
        la comparación.
      </p>
    </section>

    <!-- What to ask -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">La pregunta que tenés que hacer en el local</h2>
      <p class="mb-4">
        Antel publicita <strong>24 cuotas sin recargo</strong> con tarjeta Visa Itaú, solo en
        locales físicos. Pero <strong>no aclara</strong> si ese 0% se aplica sobre el precio contado
        o sobre el precio financiado, que ya viene con 24% adentro. Es la única ambigüedad que
        decide cuál es el mejor negocio del mercado, y no la pudimos cerrar. Así que te dejamos el
        test:
      </p>
      <div class="ask-grid">
        <VCard variant="flat" class="ask-card is-good pa-5">
          <div class="ask-q">Si la cuota es de $1.925</div>
          <p class="mb-0">
            Es 46.190 ÷ 24. El 0% va sobre el precio contado: es <strong>real</strong>, y es el
            mejor deal disponible. Tomalo.
          </p>
        </VCard>
        <VCard variant="flat" class="ask-card is-bad pa-5">
          <div class="ask-q">Si la cuota es de $2.389</div>
          <p class="mb-0">
            Es el PTF dividido 24. El "sin recargo" está montado sobre un precio ya recargado 24%.
            El 0% es <strong>una ficción</strong>: estás pagando la tasa igual.
          </p>
        </VCard>
      </div>
      <p class="text-medium-emphasis mt-4 mb-0">
        La regla general: pedí siempre el <strong>precio contado</strong> y el
        <strong>valor de la cuota</strong>, y metelos en la calculadora de arriba. Si el vendedor no
        te da el precio contado, ya sabés algo.
      </p>
    </section>

    <!-- Market -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El mismo celular, cuatro tasas distintas</h2>
      <p class="text-medium-emphasis mb-5">
        Precios verificados el 12 de julio de 2026. Las promos en Uruguay rotan todas las semanas:
        verificá antes de comprar.
      </p>
      <div class="table-scroll">
        <table class="market-table">
          <thead>
            <tr>
              <th>Dónde</th>
              <th class="num">Contado</th>
              <th class="num">Plan</th>
              <th class="num">Tasa implícita</th>
              <th>Qué significa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in CASOS" :key="c.id" :class="{ 'is-featured': c.destacado }">
              <td>
                <strong>{{ c.vendedor }}</strong>
                <div class="text-caption text-medium-emphasis">{{ c.producto }}</div>
              </td>
              <td class="num">{{ money(c.precioContado) }}</td>
              <td class="num">{{ c.cuotas }} × {{ money(c.cuota) }}</td>
              <td class="num">
                <span class="rate-pill" :class="ratePillClass(casoTea(c))">
                  {{ casoTea(c).toFixed(2).replace('.', ',') }}%
                </span>
              </td>
              <td class="text-caption">{{ c.nota }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- What actually matters -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que sí te mueve la aguja</h2>
      <p class="mb-5">
        Toda la discusión de cuotas se juega por unos $2.000 en dos años. Estas dos cosas valen
        entre cinco y veinte veces más, y nadie las discute.
      </p>

      <VCard variant="flat" class="matters-card pa-5 mb-5">
        <div class="matters-h">1. El descuento del comercio</div>
        <p class="mb-2">
          El 20% de OCA en Claro vale <strong>$13.200</strong> sobre un celular de $66.000. Eso es
          <strong>seis veces</strong> todo lo que se gana o se pierde eligiendo cuotas.
        </p>
        <p class="mb-0 text-medium-emphasis">
          Y ojo con la intuición argentina: acá el descuento grande está atado a
          <strong>una tarjeta</strong>, no al efectivo. Desde 2020 es legal cobrar distinto según el
          medio de pago, y el que paga cash normalmente <strong>pierde</strong> el descuento en vez
          de ganarlo.
        </p>
      </VCard>

      <VCard variant="flat" class="matters-card pa-5">
        <div class="matters-h">2. El plan de Antel es un subsidio, no un descuento</div>
        <p class="mb-4">
          Cuanto más caro el plan, más "barato" el celular. Pero el celular más barato viene con el
          plan más caro, y a 24 meses lo pagás con creces. Mirá el total real:
        </p>
        <div class="table-scroll">
          <table class="plan-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th class="num">Celular</th>
                <th class="num">Plan × 24</th>
                <th class="num">Total 24 meses</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in PLANES_ANTEL"
                :key="p.plan"
                :class="{
                  'is-best': p.total === mejorPlanTotal,
                  'is-worst': p.total === peorPlanTotal,
                }"
              >
                <td>{{ p.plan }}</td>
                <td class="num">{{ money(p.equipo) }}</td>
                <td class="num">{{ money(p.mensual * 24) }}</td>
                <td class="num">
                  <strong>{{ money(p.total) }}</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="mt-4 mb-0">
          El plan de 40 GB tiene el celular <strong>más caro</strong> y el total
          <strong>más barato</strong>. Entretenimiento Plus tiene el celular más barato y te sale
          <strong>{{ money(peorPlanTotal - mejorPlanTotal) }} más</strong> en dos años. Optimizar
          por el precio del equipo te lleva derecho al peor negocio.
        </p>
      </VCard>
    </section>

    <!-- Where to park -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        ¿Dónde poner la plata, si igual la vas a invertir?
      </h2>
      <p class="text-medium-emphasis mb-5">
        Rendimientos para ~$50.000 a 24 meses. El "neto" ya descuenta comisión e IRPF.
      </p>
      <div class="table-scroll">
        <table class="inv-table">
          <thead>
            <tr>
              <th>Instrumento</th>
              <th class="num">Bruto</th>
              <th class="num">IRPF</th>
              <th class="num">Neto</th>
              <th>Liquidez</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in rates.instrumentos" :key="i.id">
              <td>
                <strong>{{ i.nombre }}</strong>
                <div v-if="i.nota" class="text-caption text-medium-emphasis">{{ i.nota }}</div>
              </td>
              <td class="num">{{ i.bruto.toFixed(2).replace('.', ',') }}%</td>
              <td class="num">{{ i.irpf }}%</td>
              <td class="num">
                <strong>{{ i.neto.toFixed(2).replace('.', ',') }}%</strong>
              </td>
              <td class="text-caption">{{ i.liquidez }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <VAlert type="warning" variant="tonal" class="mt-5">
        <strong>La trampa que arruina el plan.</strong> Si tenés justo la plata del celular, vas a
        tener que ir sacándola del fondo para pagar cada cuota. Tu saldo invertido promedio termina
        siendo la <strong>mitad</strong> del capital — y no podés usar el plazo fijo de 5,50%,
        porque queda inmovilizado 24 meses. Quedás obligado al fondo de liquidez diaria, que rinde
        menos. La jugada solo cierra si podés pagar las cuotas con tu sueldo y dejar la plata quieta
        de verdad.
      </VAlert>
    </section>

    <!-- Bad numbers -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Números que vas a encontrar y están mal</h2>
      <p class="text-medium-emphasis mb-5">
        Los buscamos y los verificamos uno por uno. Estos son los que más aparecen y los que más
        daño hacen, porque todos empujan la decisión para el <strong>mismo lado equivocado</strong>.
      </p>
      <div class="bad-list">
        <div v-for="b in BAD_NUMBERS" :key="b.dato" class="bad-item">
          <div class="bad-h">
            <VIcon icon="mdi-alert-outline" size="18" class="mr-2" />{{ b.dato }}
          </div>
          <div class="text-caption text-medium-emphasis mb-1">{{ b.donde }}</div>
          <p class="mb-0 text-body-2">{{ b.porQueEsFalso }}</p>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in faq" :key="f.q" :title="f.q" :text="f.a" />
      </VExpansionPanels>
    </section>

    <!-- Links -->
    <section class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-4">Seguir leyendo</h2>
      <VRow dense>
        <VCol v-for="l in enlaces" :key="l.to" cols="12" sm="6" md="4">
          <VBtn :to="localePath(l.to)" variant="tonal" color="primary" block class="justify-start">
            <VIcon :icon="l.icon" start />{{ l.label }}
          </VBtn>
        </VCol>
      </VRow>
    </section>

    <VAlert type="info" variant="tonal" density="comfortable">
      Esto es información, no asesoramiento financiero. Los precios y las promociones cambian todas
      las semanas; las tasas del BCU y de los bancos, todos los meses. Verificá antes de firmar.
      <template v-if="rates.asOf">
        <br /><span class="text-caption">Tasas actualizadas: {{ fechaAsOf }}.</span>
      </template>
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import BarChart from '~/components/charts/BarChart.vue'
import {
  DEFAULTS,
  compare,
  monteCarlo,
  tasaImplicita,
  MC_DEFAULTS,
  type CompareInput,
} from '~/utils/cuotasVsContado'
import {
  BAD_NUMBERS,
  CASOS,
  INSTRUMENTOS,
  MACRO,
  PLANES_ANTEL,
  RENDIMIENTO_DEFAULT,
  type CasoMercado,
} from '~/utils/financingData'
import { formatUYU } from '~/utils/format'

const localePath = useLocalePath()

// Live rates, with the verified baseline as the fallback. `server: false` so a slow refresh
// never blocks SSR — the page renders off the baseline and swaps in the live figures.
const { data: live } = await useLazyFetch('/api/financing-rates', { server: false })

const rates = computed(() => ({
  tpm: live.value?.tpm ?? MACRO.tpm.value,
  inflacion: live.value?.inflacion ?? MACRO.inflacion.value,
  instrumentos: live.value?.instrumentos ?? INSTRUMENTOS,
  asOf: live.value?.asOf ?? null,
}))

const form = reactive<CompareInput>({
  ...DEFAULTS,
  precioContado: 46190,
  cuota: 2389,
  cuotas: 24,
  rendimientoAnualNeto: RENDIMIENTO_DEFAULT,
  financiacion: 'factura',
})

const result = computed(() => compare(sane(form)))

const mcOpts = MC_DEFAULTS

/**
 * The simulation is 4.000 full comparisons and it remounts the chart, so it is settled rather
 * than run on every keystroke. Without this, typing a price re-creates the chart on each digit
 * and chart.js paints onto a canvas the previous instance has already torn down.
 */
const settled = ref<CompareInput>({ ...form })
let settleTimer: ReturnType<typeof setTimeout> | undefined
watch(
  () => ({ ...form }),
  next => {
    clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      settled.value = next
    }, 350)
  },
  { deep: true }
)
onBeforeUnmount(() => clearTimeout(settleTimer))

const mc = computed(() => monteCarlo(sane(settled.value), { paths: 4000 }))

/** Guard the engine against half-typed inputs — a blank field is NaN, not zero. */
function sane(f: CompareInput): CompareInput {
  const n = (v: number, d: number) => (Number.isFinite(v) && v > 0 ? v : d)
  return {
    ...f,
    precioContado: n(f.precioContado, 1),
    cuota: n(f.cuota, 1),
    cuotas: Math.max(1, Math.min(120, Math.floor(n(f.cuotas, 1)))),
    rendimientoAnualNeto: Number.isFinite(f.rendimientoAnualNeto)
      ? Math.max(0, Math.min(50, f.rendimientoAnualNeto))
      : 0,
    seguroSaldoPermil: Number.isFinite(f.seguroSaldoPermil) ? Math.max(0, f.seguroSaldoPermil) : 0,
    costoAnualTarjeta: Number.isFinite(f.costoAnualTarjeta) ? Math.max(0, f.costoAnualTarjeta) : 0,
    puntosCreditoPct: Number.isFinite(f.puntosCreditoPct) ? Math.max(0, f.puntosCreditoPct) : 0,
    puntosDebitoPct: Number.isFinite(f.puntosDebitoPct) ? Math.max(0, f.puntosDebitoPct) : 0,
  }
}

function cargarCaso(c: CasoMercado) {
  form.precioContado = c.precioContado
  form.cuota = c.cuota
  form.cuotas = c.cuotas
  form.financiacion = c.financiacion
}

const casoTea = (c: CasoMercado) => tasaImplicita(c.precioContado, c.cuota, c.cuotas).tea

const money = (n: number, signed = false) => {
  const s = formatUYU(Math.abs(n))
  if (!signed) return s
  if (n > 0) return `+${s}`
  if (n < 0) return `−${s}`
  return s
}
const fmtPct = (n: number) => `${n.toFixed(1).replace('.', ',')}%`
const signClass = (n: number) => (n > 0 ? 'is-pos' : n < 0 ? 'is-neg' : '')

const teaClass = computed(() => {
  const t = result.value.tasaImplicitaTEA
  if (t === 0) return 'is-zero'
  if (t < rates.value.tpm) return 'is-low'
  if (t < 30) return 'is-high'
  return 'is-brutal'
})

const ratePillClass = (t: number) => (t === 0 ? 'is-zero' : t < 30 ? 'is-high' : 'is-brutal')

const alertType = computed(() =>
  result.value.gana === 'cuotas' ? 'success' : result.value.gana === 'contado' ? 'error' : 'warning'
)
const veredictoTitulo = computed(
  () =>
    ({
      cuotas: 'Conviene financiar',
      contado: 'Conviene pagar al contado',
      empate: 'Empate técnico',
    })[result.value.gana]
)
const veredictoTexto = computed(() => {
  const r = result.value
  if (r.gana === 'contado')
    return `La tasa del plan (${r.tasaImplicitaTEA.toFixed(2).replace('.', ',')}%) es más alta que lo que podés ganar con la plata. Financiar te cuesta ${money(Math.abs(r.ventajaNeta))} de más.`
  if (r.gana === 'cuotas')
    return `Financiar te deja ${money(r.ventajaNeta)} — siempre que pagues las 24 cuotas sin fallar ninguna.`
  return `La diferencia (${money(r.ventajaNeta, true)}) es menor al 1% del precio: es ruido frente a los supuestos. No hay jugada acá, y financiar te agrega riesgo de mora.`
})

const mejorPlanTotal = Math.min(...PLANES_ANTEL.map(p => p.total))
const peorPlanTotal = Math.max(...PLANES_ANTEL.map(p => p.total))

const fechaAsOf = computed(() =>
  rates.value.asOf
    ? new Date(rates.value.asOf).toLocaleDateString('es-UY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''
)

/**
 * Force a fresh chart on every recomputation instead of letting BarChart mutate `chart.data`
 * in place: chart.js keeps cached scale metadata on the old dataset, and swapping the data
 * under it throws `Cannot read properties of undefined (reading 'axis')`. `comparar.vue` keys
 * its chart for the same reason.
 */
const chartKey = computed(() => {
  const s = settled.value
  return `${s.precioContado}-${s.cuota}-${s.cuotas}-${s.rendimientoAnualNeto}-${s.contadoMedio}-${s.financiacion}-${s.seguroSaldoPermil}-${s.costoAnualTarjeta}`
})

const chartData = computed(() => ({
  // Labels are pre-formatted here rather than in a tick callback: this is a CATEGORY scale, so
  // a callback receives the bucket INDEX, not the peso value — formatting that gave an axis
  // reading "$0 … $21" on a chart whose real range was −$20.312 to −$8.799.
  labels: mc.value.histograma.map(b => formatUYU(Math.round((b.desde + b.hasta) / 2))),
  datasets: [
    {
      label: 'Escenarios',
      data: mc.value.histograma.map(b => b.n),
      backgroundColor: mc.value.histograma.map(b =>
        (b.desde + b.hasta) / 2 < 0 ? 'rgba(239, 83, 80, 0.8)' : 'rgba(76, 175, 80, 0.8)'
      ),
      borderWidth: 0,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  // The chart is re-created on every settled input (see chartKey), and chart.js's entry
  // animation runs on a rAF that can fire after the old canvas is gone — which throws inside
  // its draw call. There is nothing to animate on a histogram anyway.
  animation: false as const,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        // `label` is already the formatted peso amount (see chartData).
        title: (items: { label: string }[]) => `Resultado: ${items[0]?.label ?? ''}`,
        label: (ctx: { parsed: { y: number } }) => `${ctx.parsed.y} escenarios`,
      },
    },
  },
  scales: {
    x: {
      title: { display: true, text: 'Resultado de financiar, en pesos' },
      ticks: { maxTicksLimit: 8, autoSkip: true, maxRotation: 0 },
      grid: { display: false },
    },
    y: { title: { display: true, text: 'Escenarios' }, beginAtZero: true },
  },
}

const enlaces = [
  {
    to: '/herramientas/calculadora-prestamo',
    label: 'Calculadora de préstamos',
    icon: 'mdi-calculator',
  },
  {
    to: '/herramientas/calculadora-plazo-fijo',
    label: 'Calculadora de plazo fijo',
    icon: 'mdi-piggy-bank-outline',
  },
  { to: '/inversiones-uruguay', label: 'Dónde invertir en Uruguay', icon: 'mdi-chart-line' },
  {
    to: '/tarjetas-de-credito-uruguay',
    label: 'Ranking de tarjetas',
    icon: 'mdi-credit-card-outline',
  },
  { to: '/prestamos-uruguay', label: 'Préstamos y tasas', icon: 'mdi-cash-multiple' },
  { to: '/salir-del-clearing', label: 'Salir del clearing', icon: 'mdi-account-alert-outline' },
]

const faq = [
  {
    q: '¿Conviene comprar en cuotas si las cuotas son sin interés?',
    a: 'Sobre el papel sí, pero mucho menos de lo que parece. En un celular de $46.000 a 24 cuotas sin recargo, invertir la plata al 4,5% te deja unos $2.000 en dos años. Ahora restá el seguro sobre saldo deudor (unos $1.700) y la rebaja de 2 puntos de IVA que perdés por pagar con crédito en vez de débito (unos $760): el resultado queda en cero. Solo gana si tu tarjeta no cobra seguro sobre saldo deudor.',
  },
  {
    q: '¿Cuál es la tasa real de financiar el celular con Antel?',
    a: 'El 23,97% efectivo anual. Antel publica el precio contado ($46.190) y el precio total financiado ($57.339) pero no la tasa; sale de resolver la TIR de 24 cuotas de $2.389. El factor es el mismo en los 11 planes y a 6, 12, 18 o 24 cuotas, así que no hay un plazo más barato.',
  },
  {
    q: '¿Qué rendimiento puedo conseguir en pesos uruguayos hoy?',
    a: 'Con la Tasa de Política Monetaria del BCU en 5,75%, lo mejor seguro y verificable es un plazo fijo del BROU por e-BROU a 24 meses: 5,50% bruto, 5,37% neto de IRPF. Un fondo de dinero en pesos rinde 4,2%–4,5% neto y está exento de IRPF, pero es el único que te deja sacar plata todos los meses para pagar la cuota. Si leés que algo en pesos paga 15% o 20%, es de Argentina.',
  },
  {
    q: '¿La devolución del 1% de BROU Recompensa cambia la cuenta?',
    a: 'No. Es real (1 punto cada $100, y cada punto vale $1), pero los términos de BROU dicen que en una compra en cuotas los puntos se acreditan de una sola vez por el valor total en la primera cuota. Cobrás el mismo 1% pagando en 1 cuota o en 24, así que se cancela de los dos lados de la comparación. Ojo: la versión débito de esa tarjeta paga 0,33%, no 1%.',
  },
  {
    q: '¿Pagar con débito es más barato que con crédito?',
    a: 'Sí, y casi nadie lo cuenta. La Ley 19.210 le saca 2 puntos de IVA a las compras con débito o dinero electrónico (del 22% al 20%), que sobre el precio con IVA es un 1,64% de descuento. La tarjeta de crédito no lo tiene, ni pagando en 1 cuota ni en 24. El efectivo tampoco. Por eso pagar contado con débito (1,64% de IVA + 0,33% de puntos) le gana a pagar con la tarjeta de crédito de premios (1,00%).',
  },
  {
    q: '¿Y si me atraso en una cuota?',
    a: 'Ahí se termina la jugada. La mora en tarjeta en pesos es del 81% efectivo anual y el tope legal llega a 144,25%. Una sola cuota atrasada se lleva varios años de rendimiento del fondo. Y si la deuda cae en el clearing, queda registrada 5 años, renovables a 10 — y pagarla no te borra: pasa a figurar como "cancelada" hasta 5 años más.',
  },
  {
    q: '¿Y la inflación no me licúa la deuda?',
    a: 'Sí, pero mucho menos de lo que se cree, y no se suma al rendimiento del fondo (el rendimiento nominal ya contiene la inflación: contarlo dos veces es el error más común). Con inflación de 4,5%, las 24 cuotas fijas valen en promedio el 95,6% de su valor nominal: la licuación total vale ~4,5% del precio, en dos años. Cualquier recargo mayor a 5% ya se la comió entera.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/conviene-comprar-en-cuotas'
const title = '¿Conviene comprar en 24 cuotas e invertir el efectivo, o pagar contado?'
const description =
  'La cuenta completa, con datos de 2026: cómo sacar la tasa implícita que el comercio no te dice, cuánto rinde de verdad la plata en Uruguay (5,4% anual como máximo seguro), y por qué la jugada de financiar sin recargo e invertir da empate una vez que contás el seguro sobre saldo deudor y la rebaja de IVA del débito. Con calculadora y simulación.'

defineOgImageComponent('Cambio', {
  title: '¿Cuotas o contado?',
  subtitle: 'La cuenta que el comercio no te hace',
  tag: 'ANÁLISIS',
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
        'conviene comprar en cuotas, cuotas o contado, 24 cuotas sin recargo, cuotas sin interes conviene, financiar celular uruguay, precio contado vs financiado, tasa implicita cuotas, antel pce ptf, brou recompensa, rebaja iva debito, invertir en vez de pagar contado',
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
              { '@type': 'ListItem', position: 2, name: '¿Cuotas o contado?', item: canonicalUrl },
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
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.cuotas-page {
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

/* Verdict */
.verdict-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .verdict-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.verdict-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.25rem;
}
.verdict-item {
  padding-left: 0.9rem;
  border-left: 3px solid transparent;
}
.verdict-item.is-bad {
  border-color: rgb(var(--v-theme-error));
}
.verdict-item.is-mid {
  border-color: rgb(var(--v-theme-warning));
}
.verdict-item.is-good {
  border-color: rgb(var(--v-theme-success));
}
.verdict-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
  margin-bottom: 0.15rem;
}
.verdict-n {
  font-size: 1.35rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.verdict-item p {
  font-size: 0.9rem;
  line-height: 1.55;
  margin: 0;
  opacity: 0.85;
}

.rule-card {
  background: rgba(var(--v-theme-primary), 0.07);
  border-left: 3px solid rgb(var(--v-theme-primary));
  border-radius: 8px;
}

/* Calculator */
.calc-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.v-theme--light .calc-card {
  border-color: rgba(0, 0, 0, 0.1);
}
.result-panel {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  height: 100%;
}
.v-theme--light .result-panel {
  background: rgba(0, 0, 0, 0.03);
}
.tea {
  font-size: 2.4rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}
.tea-sub {
  font-size: 0.9rem;
  font-weight: 500;
  opacity: 0.6;
}
.tea.is-zero {
  color: rgb(var(--v-theme-success));
}
.tea.is-low {
  color: rgb(var(--v-theme-success));
}
.tea.is-high {
  color: rgb(var(--v-theme-warning));
}
.tea.is-brutal {
  color: rgb(var(--v-theme-error));
}

.breakdown {
  font-size: 0.9rem;
}
.bd-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  padding: 0.35rem 0;
}
.bd-row.is-extra {
  opacity: 0.85;
  font-size: 0.85rem;
}
.bd-row.is-total {
  font-size: 1.05rem;
  font-weight: 700;
}
.is-pos {
  color: rgb(var(--v-theme-success));
}
.is-neg {
  color: rgb(var(--v-theme-error));
}

/* Monte Carlo */
.mc-headline {
  font-size: 3rem;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.03em;
  color: rgb(var(--v-theme-primary));
}
.mc-stats {
  display: grid;
  gap: 0.5rem;
}
.mc-stat {
  display: flex;
  justify-content: space-between;
  padding: 0.55rem 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  font-size: 0.9rem;
}
.v-theme--light .mc-stat {
  background: rgba(0, 0, 0, 0.03);
}
.mc-stat.is-bad strong {
  color: rgb(var(--v-theme-error));
}
.chart-wrap {
  height: 320px;
  position: relative;
}

/* Myths */
.myth {
  padding: 1.25rem 1.4rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.v-theme--light .myth {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.09);
}
.myth-h {
  display: flex;
  align-items: center;
  font-weight: 700;
  font-size: 1.02rem;
  margin-bottom: 0.6rem;
}
.myth p {
  margin-bottom: 0.75rem;
  line-height: 1.6;
}

/* Ask */
.ask-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}
.ask-card {
  border-radius: 12px;
  border: 1px solid;
}
.ask-card.is-good {
  background: rgba(var(--v-theme-success), 0.08);
  border-color: rgba(var(--v-theme-success), 0.35);
}
.ask-card.is-bad {
  background: rgba(var(--v-theme-error), 0.08);
  border-color: rgba(var(--v-theme-error), 0.35);
}
.ask-q {
  font-weight: 800;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

/* Tables */
.table-scroll {
  overflow-x: auto;
}
.market-table,
.plan-table,
.inv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  min-width: 620px;
}
.market-table th,
.plan-table th,
.inv-table th {
  text-align: left;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.6;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.14);
}
.v-theme--light .market-table th,
.v-theme--light .plan-table th,
.v-theme--light .inv-table th {
  border-bottom-color: rgba(0, 0, 0, 0.16);
}
.market-table td,
.plan-table td,
.inv-table td {
  padding: 0.7rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  vertical-align: top;
}
.v-theme--light .market-table td,
.v-theme--light .plan-table td,
.v-theme--light .inv-table td {
  border-bottom-color: rgba(0, 0, 0, 0.07);
}
.num {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.market-table tr.is-featured {
  background: rgba(var(--v-theme-primary), 0.06);
}
.plan-table tr.is-best {
  background: rgba(var(--v-theme-success), 0.09);
}
.plan-table tr.is-worst {
  background: rgba(var(--v-theme-error), 0.09);
}
.rate-pill {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.85rem;
}
.rate-pill.is-zero {
  background: rgba(var(--v-theme-success), 0.16);
  color: rgb(var(--v-theme-success));
}
.rate-pill.is-high {
  background: rgba(var(--v-theme-warning), 0.16);
  color: rgb(var(--v-theme-warning));
}
.rate-pill.is-brutal {
  background: rgba(var(--v-theme-error), 0.16);
  color: rgb(var(--v-theme-error));
}

.matters-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.v-theme--light .matters-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.matters-h {
  font-weight: 700;
  font-size: 1.08rem;
  margin-bottom: 0.6rem;
}

/* Bad numbers */
.bad-list {
  display: grid;
  gap: 0.85rem;
}
.bad-item {
  padding: 1rem 1.2rem;
  border-left: 3px solid rgb(var(--v-theme-warning));
  background: rgba(var(--v-theme-warning), 0.05);
  border-radius: 0 8px 8px 0;
}
.bad-h {
  display: flex;
  align-items: center;
  font-weight: 700;
  color: rgb(var(--v-theme-warning));
}
</style>
