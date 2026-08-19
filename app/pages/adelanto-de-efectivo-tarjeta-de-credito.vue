<template>
  <div class="adv-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn
        :to="localePath('/tarjetas-de-credito-uruguay')"
        variant="text"
        size="small"
        class="px-1"
      >
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Tarjetas de crédito
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5 hero-card on-dark" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Sacar plata con la tarjeta · Agosto 2026</p>
        <h1 class="hero-title">
          Adelanto de efectivo con tarjeta de crédito en Uruguay
          <span class="hero-title-accent">
            La comisión es cero. La tasa, no: es otra, y corre desde el día 1.
          </span>
        </h1>
        <p class="hero-lead">
          Buscaste la comisión en el tarifario y no estaba, o decía <strong>$0</strong>, y quedaste
          tranquilo. El costo no está ahí. Está en que el adelanto tiene
          <strong>su propia tasa</strong> —más alta que la de una compra financiada—, en que
          <strong>no hay período sin intereses</strong>, y en que la tasa publicada
          <strong>no incluye IVA</strong>. Acá está todo con la fuente al lado, y una comparación
          honesta contra la ruta “compro cripto y la vendo en Binance”.
        </p>
        <div class="hero-meta">
          <span class="hero-spoiler">
            <VIcon size="16" class="mr-2">mdi-file-document-check-outline</VIcon>
            <span>
              {{ ISSUERS.length }} emisores, cifras de tarifarios oficiales con fecha de vigencia.
              Lo que no se pudo confirmar está publicado como tal.
            </span>
          </span>
        </div>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons
            text="Cuánto cuesta de verdad sacar efectivo con la tarjeta de crédito en Uruguay"
          />
        </div>
      </div>
    </VCard>

    <!-- Answer up front -->
    <VCard variant="flat" class="answer-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-3">
        <VIcon size="20" color="primary">mdi-lightbulb-on-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">La respuesta corta</h2>
      </div>
      <ul class="answer-list">
        <li>
          <strong>OCA es el único que publica una tasa propia del adelanto</strong>, y por eso es el
          único donde se ve el mecanismo: <strong>80 % TEA</strong> para financiar un adelanto en
          efectivo, contra <strong>63 %</strong> para financiar un saldo común. Diecisiete puntos de
          castigo por el solo hecho de que la plata salga en efectivo.
        </li>
        <li>
          <strong
            >Itaú y Scotiabank no publican un número: publican “tasa máxima permitida”.</strong
          >
          Eso es el tope de la Ley 18.212. BROU publica una sola tasa de tarjeta (80 %) sin separar
          el adelanto, BBVA lo publica en TNA (54,32 %) y Santander no lo publica: lo informa en
          cada estado de cuenta. Hoy, para un adelanto de menos de 10.000 UI a devolver dentro del
          año, ese tope es <strong>{{ pct(capChico.tope) }} TEA</strong>.
        </li>
        <li>
          <strong>Todas esas tasas van sin IVA.</strong> Y el IVA sobre intereses de tarjeta no
          tiene exoneración posible en Uruguay: el 80 % de OCA se paga como
          <strong>{{ pct(teaConIva(0.8)) }}</strong
          >, y el tope legal como <strong>{{ pct(teaConIva(capChico.tope)) }}</strong
          >.
        </li>
        <li>
          <strong>No hay período de gracia.</strong> Una compra no paga interés hasta el
          vencimiento; el adelanto devenga desde la fecha de la transacción. Itaú lo escribe así:
          <em>“entre la fecha de la transacción y el vencimiento del E/C”</em>.
        </li>
        <li>
          <strong>La ruta cripto casi nunca gana.</strong> Mastercard exige codificar las compras de
          cripto como <strong>MCC 6051 (quasi-cash)</strong>, y el propio Binance avisa que algunos
          bancos las tratan como adelanto. Si te la marcan, pagás las dos cosas: el recargo por
          compra en el exterior <em>y</em> el interés de adelanto desde el día 1.
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mb-0 mt-3">
        Datos verificados al {{ fmtDate(CASH_ADVANCE_LAST_REVIEWED) }}. Es información, no
        asesoramiento financiero.
      </p>
    </VCard>

    <AdSlot v-if="adsOn" class="mb-5" />

    <!-- ── Calculator ── -->
    <VCard id="calculadora" variant="flat" class="calc-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-1">
        <VIcon size="20" color="primary">mdi-calculator-variant-outline</VIcon>
        <h2 class="text-h6 font-weight-bold mb-0">¿Cuánto me sale sacar la plata?</h2>
      </div>
      <p class="text-caption text-medium-emphasis mb-4">
        Elegí el emisor, cuánto querés sacar y en cuántos días vas a pagar el estado de cuenta.
        Separamos cada capa: comisión, IVA de la comisión, interés e IVA del interés.
      </p>

      <VRow dense>
        <VCol cols="12" sm="6" md="4">
          <VSelect
            v-model="issuerId"
            :items="issuerSelectItems"
            label="Emisor"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3" md="3">
          <VTextField
            v-model.number="monto"
            type="number"
            min="0"
            step="1000"
            label="Cuánto sacás"
            prefix="$"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="6" sm="3" md="3">
          <VTextField
            v-model.number="dias"
            type="number"
            min="1"
            step="1"
            label="Días hasta que pagás"
            suffix="días"
            density="comfortable"
            variant="outlined"
            hide-details
          />
        </VCol>
        <VCol cols="12" md="2" class="d-flex align-center">
          <VBtn variant="tonal" size="small" block @click="resetCalc">
            <VIcon start size="small">mdi-restore</VIcon>Reiniciar
          </VBtn>
        </VCol>
      </VRow>

      <VAlert
        v-if="teaInfo.fuente === 'tope-bcu'"
        type="info"
        variant="tonal"
        density="compact"
        class="mt-4 mb-0 text-body-2"
      >
        {{ selectedIssuer.teaNota }} Estamos usando el tope del BCU que corresponde a este monto —
        <strong>{{ pct(teaInfo.tea) }} TEA</strong> — que es el techo legal, no necesariamente lo
        que efectivamente te cobran. Preguntá tu tasa en tu estado de cuenta.
      </VAlert>

      <VDivider class="my-4" />

      <VRow dense>
        <VCol cols="12" md="7">
          <VTable class="cu-mobile-cards breakdown-table" density="comfortable">
            <thead>
              <tr>
                <th>Concepto</th>
                <th class="text-right">Pesos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td data-label="Concepto">Plata que te llevás</td>
                <td data-label="Pesos" class="text-right">${{ fmtPesos(advance.montoPesos) }}</td>
              </tr>
              <tr v-if="advance.comisionSinIva > 0">
                <td data-label="Concepto">Comisión por el adelanto</td>
                <td data-label="Pesos" class="text-right">
                  ${{ fmtPesos(advance.comisionSinIva) }}
                </td>
              </tr>
              <tr v-if="advance.ivaComision > 0">
                <td data-label="Concepto">IVA sobre la comisión (22 %)</td>
                <td data-label="Pesos" class="text-right">${{ fmtPesos(advance.ivaComision) }}</td>
              </tr>
              <tr>
                <td data-label="Concepto">
                  Interés por {{ dias }} días al {{ pct(teaInfo.tea) }} TEA
                </td>
                <td data-label="Pesos" class="text-right">
                  ${{ fmtPesos(advance.interesSinIva) }}
                </td>
              </tr>
              <tr>
                <td data-label="Concepto">
                  IVA sobre el interés (22 %)
                  <VTooltip
                    text="Título 10 T.O. 2023, art. 38, num. 2 lit. E): los intereses de tarjetas de crédito están gravados en todos los casos."
                  >
                    <template #activator="{ props }">
                      <VIcon v-bind="props" size="14" class="ml-1">mdi-information-outline</VIcon>
                    </template>
                  </VTooltip>
                </td>
                <td data-label="Pesos" class="text-right">${{ fmtPesos(advance.ivaInteres) }}</td>
              </tr>
              <tr v-if="advance.seguro > 0">
                <td data-label="Concepto">Seguro sobre saldos</td>
                <td data-label="Pesos" class="text-right">${{ fmtPesos(advance.seguro) }}</td>
              </tr>
              <tr class="total-row">
                <td data-label="Concepto"><strong>Total a pagar</strong></td>
                <td data-label="Pesos" class="text-right">
                  <strong>${{ fmtPesos(advance.totalAPagar) }}</strong>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCol>

        <VCol cols="12" md="5">
          <div class="result-box pa-4">
            <p class="result-eyebrow">Te cuesta</p>
            <p class="result-big">${{ fmtPesos(advance.costoTotal) }}</p>
            <p class="result-sub">
              {{ pct(advance.costoPct) }} de lo que sacaste, en {{ dias }} días
            </p>
            <VDivider class="my-3" />
            <p class="result-eyebrow">Equivale a</p>
            <p class="result-mid">{{ pct(advance.costoAnualizado) }}</p>
            <p class="result-sub">
              de costo anual efectivo, con IVA incluido. Así se compara contra la TEA de un
              préstamo.
            </p>
            <VAlert
              v-if="advance.costoAnualizado > teaConIva(capChico.tope)"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-3 mb-0 text-caption"
            >
              Ojo: por encima del tope legal con IVA. Revisá los supuestos.
            </VAlert>
          </div>
        </VCol>
      </VRow>

      <p class="text-caption text-medium-emphasis mb-0 mt-3">
        <VIcon size="14" class="mr-1">mdi-information-outline</VIcon>
        El interés se prorratea capitalizando —(1 + TEA)<sup>días/365</sup> − 1—, no dividiendo la
        TEA entre 12. Dividir subestima el costo de los plazos cortos. No incluimos el seguro sobre
        saldos que cobran algunos emisores (OCA y Scotiabank, 0,4 %): se cobra sobre todo el saldo
        de la tarjeta, no sobre el adelanto, así que sumarlo acá inflaría la comparación.
      </p>
    </VCard>

    <!-- ── The three layers ── -->
    <section class="mb-6">
      <h2 class="section-title">Cómo se arma el costo real</h2>
      <p class="section-lead">
        Nadie te cobra “el adelanto”. Te cobran tres cosas separadas que aparecen en renglones
        distintos del estado de cuenta, y la primera —la única que la gente mira— suele ser cero.
      </p>
      <VRow dense>
        <VCol v-for="layer in LAYERS" :key="layer.id" cols="12" md="4">
          <VCard variant="tonal" class="layer-card pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-2">
              <VIcon :color="layer.color" size="22">{{ layer.icon }}</VIcon>
              <span class="layer-num">{{ layer.num }}</span>
            </div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ layer.title }}</h3>
            <p class="text-body-2 mb-0" v-html="layer.body" />
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- ── Issuer table ── -->
    <section id="emisores" class="mb-6">
      <h2 class="section-title">Qué publica cada emisor</h2>
      <p class="section-lead">
        Una fila por emisor, con lo que dice su propio documento y la fecha que ese documento
        declara. Donde no publican, dice “no publicado” — no estimamos.
      </p>

      <VCard variant="flat" class="table-card">
        <VTable class="cu-mobile-cards cu-roomy issuers-table" density="comfortable">
          <thead>
            <tr>
              <th>Emisor</th>
              <th>Comisión en Uruguay</th>
              <th>Tasa del adelanto (sin IVA)</th>
              <th>¿Período sin intereses?</th>
              <th>Fuente</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in issuerRows" :key="row.id">
              <td data-label="Emisor">
                <strong>{{ row.name }}</strong>
                <div class="text-caption text-medium-emphasis">{{ row.kindLabel }}</div>
              </td>
              <td data-label="Comisión en Uruguay">
                <span v-if="row.comisionLabel === '$0'" class="chip-good">$0</span>
                <span v-else-if="row.comisionLabel === 'no publicado'" class="text-medium-emphasis">
                  no publicado
                </span>
                <span v-else>{{ row.comisionLabel }}</span>
              </td>
              <td data-label="Tasa del adelanto (sin IVA)">
                <template v-if="row.teaKind === 'tea-adelanto' && row.tea !== null">
                  <strong>{{ pct(row.tea) }} TEA</strong>
                  <div class="text-caption text-medium-emphasis">
                    {{ pct(teaConIva(row.tea)) }} con IVA · tasa propia del adelanto
                  </div>
                </template>
                <template v-else-if="row.teaKind === 'tna-adelanto' && row.tna !== null">
                  <strong>{{ pct(row.tna) }} TNA</strong>
                  <div class="text-caption text-medium-emphasis">
                    ≈ {{ pct(tnaToTea(row.tna)) }} TEA (cálculo nuestro, capitalización mensual)
                  </div>
                </template>
                <template v-else-if="row.teaKind === 'tea-tarjeta' && row.tea !== null">
                  <strong>{{ pct(row.tea) }} TEA</strong>
                  <div class="text-caption text-medium-emphasis">
                    {{ pct(teaConIva(row.tea)) }} con IVA · tasa única de tarjeta, no separa el
                    adelanto
                  </div>
                </template>
                <template v-else-if="row.teaKind === 'tope-legal'">
                  <span class="chip-warn">tasa máxima permitida</span>
                  <div class="text-caption text-medium-emphasis">
                    hoy {{ pct(capChico.tope) }} para menos de 10.000 UI
                  </div>
                </template>
                <template v-else>
                  <span class="text-medium-emphasis">no publicada</span>
                  <div class="text-caption text-medium-emphasis">
                    se informa en cada estado de cuenta
                  </div>
                </template>
              </td>
              <td data-label="¿Período sin intereses?">
                <span class="chip-bad">No</span>
              </td>
              <td data-label="Fuente">
                <a
                  :href="row.source.url"
                  target="_blank"
                  rel="noopener nofollow"
                  class="src-link"
                  >{{ row.source.label }}</a
                >
                <div class="text-caption text-medium-emphasis">{{ row.source.date }}</div>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <!-- Per-issuer detail -->
      <VExpansionPanels variant="accordion" class="mt-4">
        <VExpansionPanel v-for="issuer in ISSUERS" :key="issuer.id" :value="issuer.id">
          <VExpansionPanelTitle>
            <span class="font-weight-bold">{{ issuer.name }}</span>
            <span class="text-caption text-medium-emphasis ml-3 d-none d-sm-inline">
              {{ teaHeadline(issuer) }}
            </span>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 mb-3">
              <em>{{ issuer.lectura }}</em>
            </p>
            <dl class="detail-list">
              <dt>Qué publica como tasa</dt>
              <dd>{{ issuer.teaNota }}</dd>
            </dl>
            <dl class="detail-list">
              <dt>Adelanto en Uruguay</dt>
              <dd>{{ issuer.comisionUyuNota }}</dd>
              <dt>Adelanto en el exterior</dt>
              <dd>{{ issuer.comisionExteriorNota }}</dd>
              <dt v-if="issuer.recargoExteriorNota">Compras en el exterior</dt>
              <dd v-if="issuer.recargoExteriorNota">{{ issuer.recargoExteriorNota }}</dd>
              <dt v-if="issuer.adicionalTipoCambio !== null">Adicional por tipo de cambio</dt>
              <dd v-if="issuer.adicionalTipoCambio !== null">
                {{ issuer.adicionalTipoCambioNota }}
              </dd>
            </dl>
            <ul v-if="issuer.extras.length" class="extras-list">
              <li v-for="(x, i) in issuer.extras" :key="i">{{ x }}</li>
            </ul>
            <div class="mt-3">
              <a
                v-for="s in issuer.sources"
                :key="s.url"
                :href="s.url"
                target="_blank"
                rel="noopener nofollow"
                class="src-chip"
              >
                <VIcon size="14" start>mdi-open-in-new</VIcon>{{ s.label }} · {{ s.date }}
              </a>
            </div>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- ── The 10.000 UI cliff ── -->
    <section class="mb-6">
      <h2 class="section-title">El escalón de las 10.000 UI</h2>
      <VCard variant="tonal" color="warning" class="pa-4 pa-sm-5 cliff-card">
        <p class="text-body-1 mb-3">
          La rareza más cara del sistema uruguayo, y la que explica por qué “tasa máxima permitida”
          no es un solo número: la Ley 18.212 parte las tasas medias del BCU según el tamaño del
          crédito, con el corte en <strong>10.000 UI</strong> —hoy
          <strong>${{ fmtPesos(BRACKET_PESOS) }}</strong
          >—.
        </p>
        <VTable class="cu-mobile-cards cliff-table" density="comfortable">
          <thead>
            <tr>
              <th>Monto del adelanto</th>
              <th class="text-right">Tasa media BCU</th>
              <th class="text-right">Tope legal (TEA)</th>
              <th class="text-right">Tope con IVA</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Monto del adelanto">Menos de ${{ fmtPesos(BRACKET_PESOS) }}</td>
              <td data-label="Tasa media BCU" class="text-right">{{ pct(capChico.media) }}</td>
              <td data-label="Tope legal (TEA)" class="text-right">
                <strong>{{ pct(capChico.tope) }}</strong>
              </td>
              <td data-label="Tope con IVA" class="text-right">
                {{ pct(teaConIva(capChico.tope)) }}
              </td>
            </tr>
            <tr>
              <td data-label="Monto del adelanto">${{ fmtPesos(BRACKET_PESOS) }} o más</td>
              <td data-label="Tasa media BCU" class="text-right">{{ pct(capGrande.media) }}</td>
              <td data-label="Tope legal (TEA)" class="text-right">
                <strong>{{ pct(capGrande.tope) }}</strong>
              </td>
              <td data-label="Tope con IVA" class="text-right">
                {{ pct(teaConIva(capGrande.tope)) }}
              </td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-body-2 mt-3 mb-0">
          El mismo emisor, la misma tarjeta, el mismo día: al emisor que cobra “el máximo
          permitido”, el adelanto chico le puede costar <strong>más del doble</strong> de tasa que
          el grande. Tabla de tasas medias del período {{ capPeriodo }}, vigente desde el
          {{ fmtDate(capVigenteDesde) }}.
        </p>
      </VCard>
    </section>

    <AdSlot v-if="adsOn" class="mb-6" />

    <!-- ── Crypto route ── -->
    <section id="cripto" class="mb-6">
      <h2 class="section-title">¿Y comprar cripto con la tarjeta y venderla en Binance?</h2>
      <p class="section-lead">
        Es la pregunta que sigue naturalmente, y la respuesta depende de una sola cosa que
        <strong>vos no controlás</strong>: si tu emisor marca la compra como quasi-cash.
      </p>

      <VCard variant="tonal" color="error" class="pa-4 pa-sm-5 mb-4 mcc-card">
        <div class="d-flex align-start ga-3">
          <VIcon size="26">mdi-alert-octagon-outline</VIcon>
          <div>
            <h3 class="text-subtitle-1 font-weight-bold mb-2">El problema del MCC 6051</h3>
            <p class="text-body-2 mb-2">
              Desde 2018 las redes clasifican la compra de criptomonedas como
              <strong>quasi-cash</strong> bajo el código de comercio <strong>6051</strong>. Cuando
              el emisor ve ese código, aplica las reglas del adelanto de efectivo en vez de las de
              una compra: sin período de gracia, con la tasa cara, y a veces con comisión.
            </p>
            <p class="text-body-2 mb-0">
              No es una teoría de foro: el propio soporte de Binance lo advierte —
              <em
                >“algunos bancos pueden clasificar las transacciones de cripto como pagos
                quasi-cash, lo que genera comisiones adicionales”</em
              >— y agrega que algunos bancos directamente restringen estas operaciones.
            </p>
          </div>
        </div>
      </VCard>

      <VCard variant="flat" class="calc-card pa-4 pa-sm-5 mb-4">
        <div class="d-flex align-center ga-2 mb-1">
          <VIcon size="20" color="primary">mdi-swap-horizontal-bold</VIcon>
          <h3 class="text-h6 font-weight-bold mb-0">Comparador: ruta directa vs. ruta cripto</h3>
        </div>
        <p class="text-caption text-medium-emphasis mb-4">
          Las dos rutas te dejan los mismos <strong>${{ fmtPesos(monto) }}</strong> en la mano.
          Cambia cuánto te va a pedir el estado de cuenta.
        </p>

        <VRow dense class="mb-2">
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="recargoExteriorPct"
              type="number"
              min="0"
              step="0.5"
              label="Recargo compra exterior"
              suffix="%"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="adicionalFxPct"
              type="number"
              min="0"
              step="0.5"
              label="Adicional tipo de cambio"
              suffix="%"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="comisionCriptoPct"
              type="number"
              min="0"
              step="0.1"
              label="Comisión de compra en la plataforma"
              suffix="%"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="spreadPct"
              type="number"
              min="0"
              step="0.1"
              label="Spread compra → venta"
              suffix="%"
              density="comfortable"
              variant="outlined"
              hide-details
            />
          </VCol>
        </VRow>

        <VSwitch
          v-model="quasiCash"
          color="error"
          density="compact"
          hide-details
          :label="`El emisor la marca como quasi-cash (MCC 6051) y le aplica la tasa de adelanto`"
        />

        <VDivider class="my-4" />

        <VRow dense>
          <VCol cols="12" md="6">
            <div class="route-box route-direct pa-4 h-100">
              <p class="route-eyebrow">Ruta directa · cajero</p>
              <p class="route-big">${{ fmtPesos(advance.totalAPagar) }}</p>
              <p class="route-sub">te va a pedir el estado de cuenta</p>
              <p class="route-cost">
                Costo: <strong>${{ fmtPesos(advance.costoTotal) }}</strong> ({{
                  pct(advance.costoPct)
                }})
              </p>
            </div>
          </VCol>
          <VCol cols="12" md="6">
            <div class="route-box route-crypto pa-4 h-100">
              <p class="route-eyebrow">
                Ruta cripto · tarjeta → USDT → P2P
                <span v-if="quasiCash" class="route-flag">marcada quasi-cash</span>
              </p>
              <p class="route-big">${{ fmtPesos(crypto.deudaTarjeta) }}</p>
              <p class="route-sub">te va a pedir el estado de cuenta</p>
              <p class="route-cost">
                Costo: <strong>${{ fmtPesos(crypto.costoTotal) }}</strong> ({{
                  pct(crypto.costoPct)
                }})
              </p>
            </div>
          </VCol>
        </VRow>

        <VAlert
          :type="verdict.type"
          variant="tonal"
          density="comfortable"
          class="mt-4 mb-0 text-body-2"
        >
          <span v-html="verdict.text" />
        </VAlert>

        <h4 class="text-subtitle-2 font-weight-bold mt-4 mb-2">
          Las capas de costo de la ruta cripto
        </h4>
        <VTable class="cu-mobile-cards breakdown-table" density="compact">
          <thead>
            <tr>
              <th>Capa</th>
              <th class="text-right">Pesos</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="capa in crypto.capas" :key="capa.id">
              <td data-label="Capa">{{ capa.label }}</td>
              <td data-label="Pesos" class="text-right">${{ fmtPesos(capa.pesos) }}</td>
            </tr>
            <tr class="total-row">
              <td data-label="Capa"><strong>Total</strong></td>
              <td data-label="Pesos" class="text-right">
                <strong>${{ fmtPesos(crypto.costoTotal) }}</strong>
              </td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          Valores por defecto: recargo 3 % + IVA (el más común en Uruguay), hasta 2 % de comisión de
          compra con tarjeta según Binance, 0,25 % de comisión maker al vender en P2P y 1 % de
          spread ida y vuelta. Poné los que veas vos: el precio del USDT en el P2P uruguayo cambia
          hora a hora.
        </p>
      </VCard>

      <VRow dense>
        <VCol cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">
              <VIcon size="20" color="warning" class="mr-1">mdi-scale-balance</VIcon>
              Lo legal y lo fiscal
            </h3>
            <ul class="plain-list">
              <li>
                Operar con activos virtuales no está prohibido. Lo que cambió es el marco: la
                <strong>Ley 20.345</strong> facultó al BCU a regular a los proveedores de servicios
                de activos virtuales, y la <strong>Circular 2507</strong> (16/07/2026) incorporó el
                régimen a la Recopilación de Normas del Mercado de Valores, con autorización previa
                obligatoria de la Superintendencia de Servicios Financieros.
              </li>
              <li>
                Verificá si la plataforma que vas a usar está autorizada. Si no lo está, no tenés
                detrás ninguna de las protecciones del sistema regulado.
              </li>
              <li>
                Cuando entra plata desde un exchange, tu banco puede pedirte justificación de origen
                de fondos. Scotiabank además publica
                <strong>3 % de comisión por créditos recibidos del exterior</strong> de empresas de
                servicios de pago y cobranzas: una capa más en la pata de vuelta.
              </li>
            </ul>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">
              <VIcon size="20" color="error" class="mr-1">mdi-shield-alert-outline</VIcon>
              Los riesgos que no aparecen en la cuenta
            </h3>
            <ul class="plain-list">
              <li>
                <strong>Sin contracargo.</strong> Si la contraparte del P2P no paga o el pago se
                revierte, no tenés el derecho a desconocer el consumo que sí tendrías en una compra
                normal.
              </li>
              <li>
                <strong>La pasarela puede rechazarte.</strong> Es un problema real y recurrente en
                Uruguay: tarjetas que funcionaban dejan de ser aceptadas al cambiar el procesador.
              </li>
              <li>
                <strong>Riesgo de precio.</strong> Entre que comprás y vendés pasa tiempo. Con una
                stablecoin es chico, pero no es cero.
              </li>
              <li>
                <strong>Cuenta bancaria bloqueada.</strong> Movimientos frecuentes de P2P sin
                actividad declarada son exactamente el patrón que dispara controles.
              </li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- ── Alternatives ── -->
    <section class="mb-6">
      <h2 class="section-title">Qué sale más barato</h2>
      <p class="section-lead">
        Todas las tasas de abajo están publicadas sin IVA, igual que las de los emisores, así que se
        comparan de frente.
      </p>
      <VCard variant="flat" class="table-card">
        <VTable class="cu-mobile-cards cu-roomy" density="comfortable">
          <thead>
            <tr>
              <th>Alternativa</th>
              <th class="text-right">TEA (sin IVA)</th>
              <th>Cuándo conviene</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="alt in ALTERNATIVES" :key="alt.id">
              <td data-label="Alternativa">
                <VIcon :color="toneColor(alt.tono)" size="18" class="mr-1">
                  {{ toneIcon(alt.tono) }}
                </VIcon>
                {{ alt.label }}
              </td>
              <td data-label="TEA (sin IVA)" class="text-right">
                <strong v-if="alt.tea !== null">{{ pct(alt.tea) }}</strong>
                <span v-else class="text-medium-emphasis">varía</span>
              </td>
              <td data-label="Cuándo conviene">
                {{ alt.cuando }}
                <a
                  v-if="alt.fuente"
                  :href="alt.fuente.url"
                  target="_blank"
                  rel="noopener nofollow"
                  class="src-link d-block text-caption mt-1"
                  >{{ alt.fuente.label }}</a
                >
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- ── Pros / cons ── -->
    <section class="mb-6">
      <h2 class="section-title">Pros y contras, sin adornos</h2>
      <VRow dense>
        <VCol cols="12" md="6">
          <VCard variant="tonal" color="success" class="pa-4 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon size="20" class="mr-1">mdi-thumb-up-outline</VIcon>A favor
            </h3>
            <div v-for="(p, i) in PROS" :key="i" class="procon">
              <p class="procon-title">{{ p.text }}</p>
              <p class="procon-detail">{{ p.detail }}</p>
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="tonal" color="error" class="pa-4 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-3">
              <VIcon size="20" class="mr-1">mdi-thumb-down-outline</VIcon>En contra
            </h3>
            <div v-for="(c, i) in CONS" :key="i" class="procon">
              <p class="procon-title">{{ c.text }}</p>
              <p class="procon-detail">{{ c.detail }}</p>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- ── FAQ ── -->
    <section id="faq" class="mb-6">
      <h2 class="section-title">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="(f, i) in FAQS" :key="i">
          <VExpansionPanelTitle>{{ f.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 mb-0" v-html="f.a" />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- ── Gaps ── -->
    <section class="mb-6">
      <VCard variant="outlined" class="pa-4 pa-sm-5 gaps-card">
        <h2 class="text-h6 font-weight-bold mb-2">
          <VIcon size="20" class="mr-1">mdi-help-circle-outline</VIcon>
          Lo que no pudimos confirmar
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-3">
          Esta página trata de plata que te van a cobrar, así que preferimos dejar un hueco antes
          que poner un número inventado. Estos son los huecos.
        </p>
        <ul class="plain-list">
          <li v-for="(g, i) in GAPS" :key="i">{{ g }}</li>
        </ul>
      </VCard>
    </section>

    <!-- ── Sources ── -->
    <section class="mb-4">
      <h2 class="section-title">Fuentes</h2>
      <VCard variant="flat" class="table-card pa-4">
        <ol class="sources-list">
          <li v-for="(s, i) in ADVANCE_SOURCES" :key="i">
            <a :href="s.url" target="_blank" rel="noopener nofollow">{{ s.label }}</a>
            <span class="text-medium-emphasis"> — {{ s.date }}</span>
          </li>
        </ol>
      </VCard>
    </section>

    <NewsletterCapture v-if="adsOn" class="mt-6" />
  </div>
</template>

<script setup lang="ts">
import {
  ALTERNATIVES,
  BBVA_TNA_ADELANTO_UYU,
  BCU_CAPS,
  BCU_IN_FORCE_SINCE,
  BCU_PERIOD,
  BRACKET_PESOS,
  CASH_ADVANCE_LAST_REVIEWED,
  CONS,
  CRYPTO_DEFAULTS,
  FAQS,
  GAPS,
  ISSUERS,
  PROS,
  ADVANCE_SOURCES,
  capFor,
  getIssuer,
  resolveTea,
  simulateAdvance,
  simulateCrypto,
  teaConIva,
  tnaToTea,
  type BcuCapRow,
} from '~/utils/cashAdvance'
import { adDensityForPath } from '~/utils/ads'

const localePath = useLocalePath()
const route = useRoute()
const adsOn = computed(() => adDensityForPath(route.path) !== 'none')

// ── Caps ──
//
// The BCU republishes this table EVERY MONTH on a rolling three-month window, so a hardcoded
// snapshot goes stale within weeks. `/api/bcu-rates` serves the daily-refreshed grid (pm2
// `currency-bcu-rates`), already proven against Ley 18.212 arithmetic on both the backend and the
// proxy; the built-in table in cashAdvance.ts is the fallback when the fetch fails.
const { data: liveCaps } = await useFetch<{
  periodo: string
  vigenteDesde: string
  rows: BcuCapRow[]
  asOf: string | null
  live: boolean
}>('/api/bcu-rates', { key: 'bcu-rates', server: true, default: () => null })

const capRows = computed<readonly BcuCapRow[]>(() =>
  liveCaps.value?.rows?.length ? liveCaps.value.rows : BCU_CAPS
)
const capPeriodo = computed(() => liveCaps.value?.periodo || BCU_PERIOD)
const capVigenteDesde = computed(() => liveCaps.value?.vigenteDesde || BCU_IN_FORCE_SINCE)

function pickCap(bracket: 'menor10kUI' | 'mayor10kUI'): BcuCapRow {
  const row = capRows.value.find(r => r.bracket === bracket && r.cortoPlazo && r.currency === 'UYU')
  return row ?? capFor(bracket === 'menor10kUI' ? 20_000 : BRACKET_PESOS + 1)
}
const capChico = computed(() => pickCap('menor10kUI'))
const capGrande = computed(() => pickCap('mayor10kUI'))

// ── Calculator state ──
const issuerId = ref('oca')
const monto = ref(20_000)
const dias = ref(30)

const issuerSelectItems = ISSUERS.map(i => ({ title: i.name, value: i.id }))
const selectedIssuer = computed(
  () => getIssuer(issuerId.value) ?? (ISSUERS[0] as (typeof ISSUERS)[number])
)

/**
 * BBVA is the odd one out: it publishes a TNA, not a TEA. Converting it here —
 * rather than in the data file — keeps the stored figure exactly as published.
 */
const teaInfo = computed(() => {
  const issuer = selectedIssuer.value
  if (issuer.id === 'bbva') {
    return { tea: tnaToTea(BBVA_TNA_ADELANTO_UYU), fuente: 'publicada' as const }
  }
  if (issuer.id === 'brou' && issuer.teaSaldos !== null) {
    return { tea: issuer.teaSaldos, fuente: 'publicada' as const }
  }
  const r = resolveTea(issuer, monto.value || 0)
  if (r.fuente !== 'tope-bcu') return r
  // Resolve the legal ceiling against the LIVE table: this is the number the page tells a reader
  // Itaú or Scotiabank will charge them, so it must not be a frozen snapshot.
  const bracket = (monto.value || 0) < BRACKET_PESOS ? 'menor10kUI' : 'mayor10kUI'
  return { tea: pickCap(bracket).tope, fuente: 'tope-bcu' as const }
})

/**
 * Deliberately WITHOUT the balance insurance some issuers charge (OCA's 0,4 %
 * monthly, Scotia's 0,4 %): it rides on the whole card balance, not on the
 * advance, so it lands identically on both sides of the crypto head-to-head and
 * would only make the direct route look worse than it is. It is documented in
 * each issuer's detail panel instead.
 */
const advance = computed(() =>
  simulateAdvance({
    montoPesos: monto.value || 0,
    dias: dias.value || 0,
    comisionFija: selectedIssuer.value.comisionUyuFija ?? 0,
    comisionPct: selectedIssuer.value.comisionUyuPct,
    tea: teaInfo.value.tea,
  })
)

function resetCalc() {
  issuerId.value = 'oca'
  monto.value = 20_000
  dias.value = 30
}

// ── Crypto comparator state ──
const recargoExteriorPct = ref(CRYPTO_DEFAULTS.recargoExterior * 100)
const adicionalFxPct = ref(CRYPTO_DEFAULTS.adicionalTipoCambio * 100)
const comisionCriptoPct = ref(CRYPTO_DEFAULTS.comisionCompraCripto * 100)
const spreadPct = ref(CRYPTO_DEFAULTS.spreadCompraVenta * 100)
const quasiCash = ref(false)

const crypto = computed(() =>
  simulateCrypto({
    montoPesos: monto.value || 0,
    dias: dias.value || 0,
    recargoExterior: (recargoExteriorPct.value || 0) / 100,
    adicionalTipoCambio: (adicionalFxPct.value || 0) / 100,
    comisionCompraCripto: (comisionCriptoPct.value || 0) / 100,
    comisionVentaP2p: CRYPTO_DEFAULTS.comisionVentaP2p,
    spreadCompraVenta: (spreadPct.value || 0) / 100,
    tratadoComoAdelanto: quasiCash.value,
    tea: teaInfo.value.tea,
    comisionFija: selectedIssuer.value.comisionUyuFija ?? 0,
  })
)

const verdict = computed(() => {
  // Subtract the ROUNDED figures the two boxes show, so the verdict can never
  // claim a gap of $215 while the numbers above it differ by $214.
  const diff = Math.round(crypto.value.costoTotal) - Math.round(advance.value.costoTotal)
  if (quasiCash.value) {
    return {
      type: 'error' as const,
      text: `Marcada como quasi-cash, la ruta cripto sale <strong>$${fmtPesos(Math.abs(diff))} más cara</strong>: pagás el recargo por compra en el exterior <em>y</em> el interés de adelanto desde el día 1. Es estrictamente peor que caminar hasta el cajero.`,
    }
  }
  if (diff > 0) {
    return {
      type: 'warning' as const,
      text: `Con estos supuestos la ruta cripto sale <strong>$${fmtPesos(diff)} más cara</strong> que sacar la plata directo, y encima le agregás riesgo de contraparte y cero derecho a contracargo.`,
    }
  }
  return {
    type: 'info' as const,
    text: `Con estos supuestos la ruta cripto sale <strong>$${fmtPesos(Math.abs(diff))} más barata</strong> — pero sólo mientras el emisor no la marque como quasi-cash, algo que no controlás y que puede cambiar de un mes al otro. Probá el interruptor de arriba para ver el otro escenario.`,
  }
})

// ── Static content ──
const LAYERS = [
  {
    id: 'comision',
    num: '01',
    icon: 'mdi-cash-remove',
    color: 'success',
    title: 'La comisión (la que mirás)',
    body: 'En Uruguay suele ser <strong>cero</strong>: Itaú publica $0 por adelanto en el país y OCA cobra 0 en sucursales y cajeros. Por eso el tarifario “no dice nada”. Aparece cuando sacás fuera de tu red o en el exterior: BROU cobra U$S 1,75 + IVA + 0,33 %, OCA U$S 2,459 + IVA.',
  },
  {
    id: 'tasa',
    num: '02',
    icon: 'mdi-percent-outline',
    color: 'warning',
    title: 'La tasa (la que paga)',
    body: 'No es la tasa de tu tarjeta: es <strong>otra tasa, más alta</strong>, y corre <strong>desde el día que sacaste la plata</strong>, sin período de gracia. OCA la publica: 80 % TEA contra 63 % de la financiación común. Itaú y Scotiabank dicen “tasa máxima permitida”.',
  },
  {
    id: 'iva',
    num: '03',
    icon: 'mdi-receipt-text-outline',
    color: 'error',
    title: 'El IVA (la que nadie cuenta)',
    body: 'Todas las tasas se publican <strong>sin IVA</strong>. Y no hay salida: el Título 10 del T.O. 2023 dice que los intereses de tarjetas de crédito “estarán gravados <strong>en todos los casos</strong>”. Multiplicá por 1,22 cualquier tasa que leas.',
  },
]

function toneColor(tono: string): string {
  return tono === 'mejor' ? 'success' : tono === 'peor' ? 'error' : 'warning'
}
function toneIcon(tono: string): string {
  return tono === 'mejor'
    ? 'mdi-arrow-down-bold-circle-outline'
    : tono === 'peor'
      ? 'mdi-arrow-up-bold-circle-outline'
      : 'mdi-approximately-equal'
}

const KIND_LABEL: Record<string, string> = {
  banco: 'Banco',
  emisora: 'Emisora de crédito',
}

const issuerRows = computed(() =>
  ISSUERS.map(i => ({
    id: i.id,
    name: i.name,
    kindLabel: KIND_LABEL[i.kind] ?? i.kind,
    comisionLabel:
      i.comisionUyuFija === null
        ? 'no publicado'
        : i.comisionUyuFija === 0 && i.comisionUyuPct === 0
          ? '$0'
          : `$${fmtPesos(i.comisionUyuFija)}`,
    teaKind: i.teaKind,
    teaNota: i.teaNota,
    // The rate to show, by what the issuer actually publishes. Never inferred
    // from a null: BBVA and BROU publish numbers, just not per-advance ones.
    tea:
      i.teaKind === 'tea-adelanto'
        ? i.teaAdelanto
        : i.teaKind === 'tea-tarjeta'
          ? i.teaSaldos
          : null,
    tna: i.teaKind === 'tna-adelanto' ? BBVA_TNA_ADELANTO_UYU : null,
    source: i.sources[0] as (typeof i.sources)[number],
  }))
)

/** Short chip under an issuer's name in the accordion header. */
function teaHeadline(issuer: (typeof ISSUERS)[number]): string {
  switch (issuer.teaKind) {
    case 'tea-adelanto':
      return `${pct(issuer.teaAdelanto ?? 0)} TEA propia del adelanto`
    case 'tna-adelanto':
      return `${pct(BBVA_TNA_ADELANTO_UYU)} TNA propia del adelanto`
    case 'tea-tarjeta':
      return `${pct(issuer.teaSaldos ?? 0)} TEA de tarjeta, sin separar el adelanto`
    case 'tope-legal':
      return 'remite al tope legal'
    default:
      return 'no publica una tasa fija'
  }
}

// ── SEO ──
const canonicalUrl = 'https://cambio-uruguay.com/adelanto-de-efectivo-tarjeta-de-credito'
const title =
  'Adelanto de efectivo con tarjeta de crédito en Uruguay (2026): tasas reales, comisiones y fuentes'
const description =
  'Cuánto cuesta de verdad sacar efectivo con tarjeta de crédito en Uruguay: la tasa del adelanto es distinta y más alta, corre desde el día 1 y no incluye IVA. Tarifarios de OCA, Itaú, BBVA, BROU, Scotiabank y Santander, tope legal del BCU y comparación con comprar cripto y venderla en Binance.'

defineOgImageComponent('Cambio', {
  title: 'Adelanto de efectivo con tarjeta',
  subtitle: 'La comisión es $0. La tasa corre desde el día 1.',
  tag: 'TASAS + CALCULADORA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
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
        'adelanto de efectivo uruguay, retiro de efectivo tarjeta de credito, avance de efectivo uruguay, tasa adelanto efectivo, sacar plata con tarjeta de credito uruguay, tasa maxima permitida bcu, ley 18212 usura, tope de tasas uruguay, oca 80 tea adelanto, itau adelanto de efectivo, comprar cripto con tarjeta uruguay, binance p2p uruguay, mcc 6051 quasi cash',
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
                name: 'Adelanto de efectivo con tarjeta de crédito',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQS.map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
            })),
          },
        ],
      }),
    },
  ],
}))

// ── Formatting ──
function fmtPesos(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}
function pct(n: number): string {
  return `${(n * 100).toFixed(2).replace('.', ',')} %`
}
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}
</script>

<style scoped>
.adv-page {
  overflow-x: hidden;
}

/* Hero */
.hero-card {
  border-radius: 16px;
}
.hero {
  position: relative;
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(220, 38, 38, 0.32), transparent 55%),
    radial-gradient(120% 160% at 0% 100%, rgba(217, 119, 6, 0.28), transparent 55%),
    linear-gradient(135deg, #2a1005 0%, #24131f 55%, #12111f 100%);
}
.hero-eyebrow {
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 700;
  color: #ffc9a3;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-size: clamp(1.5rem, 4.4vw, 2.5rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-title-accent {
  display: block;
  font-size: 0.55em;
  font-weight: 600;
  color: #ffd9c2;
  margin-top: 0.35rem;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 780px;
  line-height: 1.6;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-top: 12px;
}
.hero-spoiler {
  display: inline-flex;
  align-items: flex-start;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.82rem;
  line-height: 1.5;
}

/* Answer */
.answer-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 16px;
}
.answer-list {
  margin: 0;
  padding-left: 1.15rem;
}
.answer-list li {
  margin-bottom: 0.65rem;
  line-height: 1.6;
}
.answer-list li:last-child {
  margin-bottom: 0;
}

/* Sections */
.section-title {
  font-size: clamp(1.15rem, 2.6vw, 1.5rem);
  font-weight: 800;
  letter-spacing: -0.01em;
  margin-bottom: 0.4rem;
}
.section-lead {
  color: rgba(var(--v-theme-on-surface), 0.72);
  line-height: 1.6;
  margin-bottom: 1rem;
  max-width: 820px;
}

/* Calculator */
.calc-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 16px;
}
.breakdown-table :deep(td),
.breakdown-table :deep(th) {
  white-space: nowrap;
}
.total-row {
  border-top: 2px solid rgba(var(--v-border-color), 0.3);
}
.result-box {
  border-radius: 14px;
  background: rgba(var(--v-theme-primary), 0.07);
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  height: 100%;
}
.result-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-weight: 700;
  opacity: 0.7;
  margin-bottom: 0.15rem;
}
.result-big {
  font-size: clamp(1.6rem, 5vw, 2.1rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 0.2rem;
}
.result-mid {
  font-size: clamp(1.3rem, 4vw, 1.7rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 0.2rem;
}
.result-sub {
  font-size: 0.85rem;
  opacity: 0.75;
  margin-bottom: 0;
  line-height: 1.45;
}

/* Layers */
.layer-card {
  border-radius: 14px;
}
.layer-num {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  opacity: 0.6;
}

/* Tables */
.table-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 16px;
  overflow: hidden;
}
.issuers-table :deep(td) {
  vertical-align: top;
}
.chip-good,
.chip-warn,
.chip-bad {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}
.chip-good {
  background: rgba(var(--v-theme-success), 0.16);
  color: rgb(var(--v-theme-success));
}
.chip-warn {
  background: rgba(var(--v-theme-warning), 0.18);
  color: rgb(var(--v-theme-warning));
}
.chip-bad {
  background: rgba(var(--v-theme-error), 0.16);
  color: rgb(var(--v-theme-error));
}
.src-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-size: 0.82rem;
}
.src-link:hover {
  text-decoration: underline;
}
.src-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 8px 8px 0;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-border-color), 0.24);
  font-size: 0.76rem;
  text-decoration: none;
  color: inherit;
}
.src-chip:hover {
  border-color: rgb(var(--v-theme-primary));
}

/* Issuer detail */
.detail-list {
  margin: 0 0 0.75rem;
}
.detail-list dt {
  font-weight: 700;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.65;
  margin-top: 0.6rem;
}
.detail-list dd {
  margin: 0.15rem 0 0;
  line-height: 1.55;
  font-size: 0.92rem;
}
.extras-list,
.plain-list {
  margin: 0.5rem 0 0;
  padding-left: 1.15rem;
}
.extras-list li,
.plain-list li {
  margin-bottom: 0.45rem;
  line-height: 1.55;
  font-size: 0.92rem;
}

/* Cliff */
.cliff-card {
  border-radius: 16px;
}
.cliff-table {
  background: transparent;
}

/* Crypto */
.mcc-card {
  border-radius: 16px;
}
.route-box {
  border-radius: 14px;
  height: 100%;
  border: 1px solid rgba(var(--v-border-color), 0.2);
}
.route-direct {
  background: rgba(var(--v-theme-success), 0.08);
  border-color: rgba(var(--v-theme-success), 0.28);
}
.route-crypto {
  background: rgba(var(--v-theme-warning), 0.08);
  border-color: rgba(var(--v-theme-warning), 0.28);
}
.route-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  opacity: 0.75;
  margin-bottom: 0.3rem;
}
.route-flag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(var(--v-theme-error), 0.18);
  color: rgb(var(--v-theme-error));
  letter-spacing: 0.04em;
}
.route-big {
  font-size: clamp(1.5rem, 4.6vw, 2rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 0.15rem;
}
.route-sub {
  font-size: 0.82rem;
  opacity: 0.72;
  margin-bottom: 0.5rem;
}
.route-cost {
  font-size: 0.92rem;
  margin-bottom: 0;
}

/* Pros / cons */
.procon {
  margin-bottom: 0.85rem;
}
.procon:last-child {
  margin-bottom: 0;
}
.procon-title {
  font-weight: 700;
  margin-bottom: 0.15rem;
  line-height: 1.4;
}
.procon-detail {
  font-size: 0.88rem;
  opacity: 0.85;
  line-height: 1.5;
  margin-bottom: 0;
}

/* Gaps + sources */
.gaps-card {
  border-radius: 16px;
}
.sources-list {
  margin: 0;
  padding-left: 1.3rem;
}
.sources-list li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.sources-list a:hover {
  text-decoration: underline;
}
</style>
