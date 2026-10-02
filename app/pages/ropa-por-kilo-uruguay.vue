<template>
  <VContainer class="ropa-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">EMPRENDER</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Ropa por kilo y fardos en Uruguay: cuánto se gana y qué es legal
      </h1>
      <p class="lead mb-6">
        Revender ropa barata es uno de los negocios más viejos de las ferias uruguayas, y desde que
        en Argentina se volvió a permitir la ropa usada importada se vende en redes como «fardos de
        ropa americana». Acá está lo que pudimos verificar: de dónde sacan la ropa los feriantes de
        Montevideo, cuánto deja un lote según cuánto se venda, qué dice la norma y por qué traer un
        fardo por courier casi nunca cierra. Cada cifra tiene su fuente al pie.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <p class="warn-title mb-2">En Uruguay, «fardo» no es lo que ves en TikTok</p>
            <p class="mb-0">
              Los videos de fardos de 45 kg a precio por kilo son de Chile y Argentina. Chile
              importó <strong>{{ tonnes(chile.tonnes) }}</strong> de ropa usada en 2024; a Uruguay,
              según lo que declaran los países que la mandan, llegaron
              <strong>{{ tonnes(uruguay.tonnes) }}</strong
              >. Lo que acá se vende como «fardo» es casi siempre un
              <strong>lote cerrado de 10 a 100 prendas</strong> a precio fijo, de ropa nueva o
              local. Si llegaste con el precio por kilo chileno en la cabeza, la cuenta de esta
              página es otra.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Respuesta corta -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-5">La respuesta corta</h2>
      <VRow>
        <VCol v-for="fact in shortFacts" :key="fact.title" cols="12" sm="6">
          <VCard class="fact-card pa-5 h-100" variant="flat">
            <div class="d-flex align-center mb-2">
              <VIcon :icon="fact.icon" :color="fact.color" class="mr-2" />
              <p class="fact-title mb-0">{{ fact.title }}</p>
            </div>
            <p class="mb-0 text-body-2">{{ fact.body }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Calculadora de lote -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto deja un lote</h2>
      <p class="section-intro mb-5">
        Elegí un lote real —con el precio que tenía publicado— o cargá el tuyo. El número que más
        mueve el resultado no es el precio del lote: es <strong>qué parte se vende</strong>. Las
        prendas que quedan sin vender las pagan las que sí se venden.
      </p>

      <div class="d-flex flex-wrap ga-2 mb-5" role="group" aria-label="Lotes de ejemplo">
        <VChip
          v-for="lot in LOCAL_LOTS"
          :key="lot.id"
          :color="selectedLot === lot.id ? 'primary' : undefined"
          :variant="selectedLot === lot.id ? 'flat' : 'outlined'"
          @click="applyLot(lot.id)"
          >{{ lot.label }}</VChip
        >
      </div>

      <VRow>
        <VCol cols="12" md="5">
          <VTextField
            v-model.number="lotCost"
            type="number"
            min="0"
            step="500"
            label="Lo que pagás por el lote ($)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hide-details
          />
          <VTextField
            v-model.number="garments"
            type="number"
            min="1"
            step="1"
            label="Prendas en el lote"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hide-details
          />
          <VTextField
            v-model.number="avgPrice"
            type="number"
            min="0"
            step="50"
            label="Precio promedio de venta por prenda ($)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hide-details
          />
          <VSelect
            v-model="channel"
            :items="channelItems"
            label="Dónde lo vendés"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hide-details
          />
          <VTextField
            v-model.number="otherCosts"
            type="number"
            min="0"
            step="100"
            label="Otros costos: puesto, traslado, bolsas ($)"
            prefix="$"
            variant="outlined"
            density="comfortable"
            class="mb-4"
            hide-details
          />
          <p class="text-body-2 mb-1">
            Se vende el <strong>{{ sellable }} %</strong> del lote
          </p>
          <VSlider
            v-model="sellable"
            :min="20"
            :max="100"
            :step="5"
            color="primary"
            hide-details
            aria-label="Porcentaje del lote que se vende"
          />
          <p class="text-caption text-medium-emphasis mt-2 mb-0">
            Arranca en {{ DEFAULT_SELLABLE_PCT }} % porque es lo único medido sobre fardos: en
            Kantamanto (Ghana) el 40 % de la ropa sale del mercado como residuo. Un lote de prendas
            elegidas una por una se vende mejor; un lote «sin elegir» suele venderse peor.
          </p>
        </VCol>

        <VCol cols="12" md="7">
          <VCard class="verdict-card pa-5 h-100" variant="flat">
            <p class="verdict-label mb-1">
              {{ lot.profitUyu >= 0 ? 'Te queda' : 'Perdés' }}
            </p>
            <p class="verdict-amount mb-1" :class="lot.profitUyu < 0 ? 'text-error' : ''">
              {{ pesos(Math.abs(lot.profitUyu)) }}
            </p>
            <p class="text-body-2 text-medium-emphasis mb-4">
              Vendiendo {{ lot.sold }} de {{ Math.floor(garments || 0) }} prendas a
              {{ pesos(avgPrice || 0) }}: entran {{ pesos(lot.revenueUyu)
              }}<template v-if="lot.feesUyu > 0"
                >, el canal se queda {{ pesos(lot.feesUyu) }}</template
              >.
            </p>
            <div class="verdict-grid">
              <div>
                <span class="vg-label">Margen sobre lo vendido</span>
                <span class="vg-value">{{
                  lot.marginPct === null ? '—' : pct(lot.marginPct)
                }}</span>
              </div>
              <div>
                <span class="vg-label">Retorno sobre lo invertido</span>
                <span class="vg-value">{{
                  lot.returnPct === null ? '—' : pct(lot.returnPct)
                }}</span>
              </div>
              <div>
                <span class="vg-label">Costo por prenda del lote</span>
                <span class="vg-value">{{ pesos(lot.costPerGarmentUyu) }}</span>
              </div>
              <div>
                <span class="vg-label">Costo por prenda vendida</span>
                <span class="vg-value">{{
                  lot.costPerSoldUyu === null ? '—' : pesos(lot.costPerSoldUyu)
                }}</span>
              </div>
              <div>
                <span class="vg-label">Prendas para recuperar la inversión</span>
                <span class="vg-value">{{
                  lot.breakEvenUnits === null ? 'Nunca, a ese precio' : lot.breakEvenUnits
                }}</span>
              </div>
              <div>
                <span class="vg-label">Precio mínimo para no perder</span>
                <span class="vg-value">{{
                  lot.breakEvenPriceUyu === null ? '—' : pesos(lot.breakEvenPriceUyu)
                }}</span>
              </div>
            </div>
            <VAlert
              v-if="lot.breakEvenUnits !== null && lot.breakEvenUnits > lot.sold"
              type="warning"
              variant="tonal"
              density="compact"
              class="mt-4 mb-0"
            >
              Para recuperar lo invertido tenés que vender {{ lot.breakEvenUnits }} prendas, y el
              lote sólo da {{ lot.sold }} vendibles. Hace falta subir el precio a
              {{ lot.breakEvenPriceUyu === null ? '—' : pesos(lot.breakEvenPriceUyu) }} o pagar
              menos por el lote.
            </VAlert>
          </VCard>
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mt-4 mb-0">
        En Mercado Libre se toma el tope de su comisión ({{ ML_COMMISSION_MAX_PCT }} %) más el cargo
        fijo por unidad, porque la tasa exacta de la categoría Ropa sólo se ve con sesión iniciada.
        En consignación se usa la de Era Mío: 48 % más IVA, o sea que a quien trae la prenda le
        queda el {{ pct(CONSIGNMENT_KEEP_PCT) }}. No se descuentan impuestos sobre la ganancia:
        dependen de cómo estés inscripto.
      </p>
    </section>

    <!-- Fardo por courier -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Y si traigo un fardo yo?</h2>
      <p class="section-intro mb-5">
        La vía legal más corta para una persona es un envío por courier bajo la
        <strong>prestación única</strong>: {{ SIMPLIFIED_RATE_PCT }} % del valor de factura, con un
        mínimo de US$ {{ SIMPLIFIED_MIN_USD }} por envío, hasta {{ POSTAL_MAX_WEIGHT_KG }} kg y US$
        {{ POSTAL_MAX_INVOICE_USD }}. La DNA dice que vale «con o sin fines comerciales». El
        problema no es el impuesto: es el flete. La cuenta arranca con el courier más barato que el
        sitio tiene relevado, que es el caso más favorable al fardo.
      </p>
      <VRow>
        <VCol cols="12" md="5">
          <VTextField
            v-model.number="baleKg"
            type="number"
            min="1"
            :max="POSTAL_MAX_WEIGHT_KG"
            step="1"
            label="Kilos del envío"
            suffix="kg"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hide-details
          />
          <VTextField
            v-model.number="baleUsdPerKg"
            type="number"
            min="0"
            step="0.1"
            label="Precio de la ropa en origen (US$ por kilo)"
            prefix="US$"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hide-details
          />
          <VSelect
            v-model="courierId"
            :items="courierItems"
            label="Courier"
            variant="outlined"
            density="comfortable"
            class="mb-3"
            hide-details
          />
          <p class="text-caption text-medium-emphasis mb-0">
            US$ {{ usd2(US_EXPORT_USD_PER_KG_2024) }} el kilo es el precio medio al que exportó ropa
            usada Estados Unidos en 2024. Un fardo «de primera» en Chile se vende entre US$ 2 y US$
            9 el kilo según la categoría. Las tarifas de courier se verificaron el
            {{ courierRatesDate }}; el dólar es {{ usdSourceLabel }}.
          </p>
        </VCol>
        <VCol cols="12" md="7">
          <VCard v-if="bale" class="verdict-card pa-5 h-100" variant="flat">
            <p class="verdict-label mb-1">El kilo puesto en tu casa</p>
            <p class="verdict-amount mb-1">{{ pesos(bale.perKgUyu) }}</p>
            <p class="text-body-2 text-medium-emphasis mb-4">
              US$ {{ usd2(bale.perKgUsd) }} por kilo · envío de {{ bale.kg }} kg por US$
              {{ usd2(bale.totalUsd) }} en total
            </p>
            <div class="bale-bar mb-2" role="img" :aria-label="baleBarLabel">
              <span
                v-for="part in baleParts"
                :key="part.label"
                class="bale-seg"
                :style="{ width: part.pct + '%', background: part.color }"
              />
            </div>
            <ul class="bale-legend mb-4">
              <li v-for="part in baleParts" :key="part.label">
                <span class="dot" :style="{ background: part.color }" />{{ part.label }}: US$
                {{ usd2(part.usd) }} ({{ pct(part.pct) }})
              </li>
            </ul>
            <p class="text-body-2 mb-0">
              Con {{ GARMENTS_PER_KG }} prendas por kilo, cada prenda llega a
              <strong>{{ pesos(bale.perKgUyu / GARMENTS_PER_KG) }}</strong> antes de clasificar; si
              se vende el {{ DEFAULT_SELLABLE_PCT }} %, cada prenda vendida carga
              <strong>{{
                pesos(bale.perKgUyu / GARMENTS_PER_KG / (DEFAULT_SELLABLE_PCT / 100))
              }}</strong
              >. Era Mío vende al público el kilo a $ 590–790, y en las tiendas de segunda mano los
              básicos se venden a $ 200–250 (Retroka, 2023).
            </p>
            <VAlert
              v-if="bale.overWeight || bale.overValue"
              type="error"
              variant="tonal"
              density="compact"
              class="mt-4 mb-0"
            >
              Ese envío no entra en la prestación única: pasa
              {{ bale.overWeight ? `los ${POSTAL_MAX_WEIGHT_KG} kg` : ''
              }}{{ bale.overWeight && bale.overValue ? ' y ' : ''
              }}{{ bale.overValue ? `los US$ ${POSTAL_MAX_INVOICE_USD} de factura` : '' }}. Va por
              régimen general, con despachante.
            </VAlert>
            <VAlert
              v-else-if="!bale.freightComplete"
              type="info"
              variant="tonal"
              density="compact"
              class="mt-4 mb-0"
            >
              Ese courier publica cargos que dependen del envío: el flete de arriba es un piso.
            </VAlert>
          </VCard>
        </VCol>
      </VRow>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-5" icon="mdi-ferry">
        <strong>Los importadores de verdad traen contenedores por barco</strong>, por régimen
        general: arancel (el perfil de la OMC da 20 % de máximo para textiles y prendas), tasa
        consular del 5 %, IVA del 22 % y sus anticipos, más despachante. Una persona física puede
        hacer sólo {{ PERSONA_FISICA_MAX_DUA_PER_YEAR }} DUA por año; para más hace falta empresa.
        No hacemos esa cuenta porque el flete marítimo y el despacho cambian con cada operación y no
        hay una tarifa pública que sirva de ejemplo.
      </VAlert>
    </section>

    <!-- Abastecimiento -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">De dónde sacan la ropa los feriantes</h2>
      <p class="section-intro mb-5">
        No hay un estudio uruguayo que lo mida. Esto es lo que se puede documentar, de la fuente más
        grande a la más chica.
      </p>
      <VList class="supply-list" density="comfortable" bg-color="transparent">
        <VListItem v-for="item in supply" :key="item.title" class="px-0">
          <template #prepend>
            <VIcon :icon="item.icon" color="primary" class="mr-1" />
          </template>
          <VListItemTitle class="text-wrap font-weight-bold mb-1">{{ item.title }}</VListItemTitle>
          <p class="text-body-2 mb-0">{{ item.body }}</p>
        </VListItem>
      </VList>

      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-3">Lotes con precio publicado</h3>
      <VTable density="comfortable" class="ropa-table cu-mobile-cards">
        <thead>
          <tr>
            <th>Lote</th>
            <th>Tipo</th>
            <th class="text-right">Precio</th>
            <th class="text-right">Por prenda</th>
            <th>Visto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in LOCAL_LOTS" :key="row.id">
            <td data-label="Lote">
              <a
                :href="ROPA_SOURCES[row.source].url"
                target="_blank"
                rel="noopener noreferrer"
                class="cu-link"
                >{{ row.label }}</a
              >
              <div class="text-caption text-medium-emphasis">{{ row.detail }}</div>
            </td>
            <td data-label="Tipo">{{ row.condition === 'usada' ? 'Usada' : 'Nueva' }}</td>
            <td class="text-right" data-label="Precio">{{ pesos(row.priceUyu) }}</td>
            <td class="text-right font-weight-bold" data-label="Por prenda">
              {{ pesos(perGarmentUyu(row)) }}
            </td>
            <td data-label="Visto">{{ shortDate(row.seenOn) }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        En la venta por kilo se cuentan {{ GARMENTS_PER_KG }} prendas por kilo, la referencia de una
        tienda mendocina de ropa traída de EE.UU. («entre 5 y 6 remeras, 3 o 4 pantalones»). Los
        precios son de vidriera: no son un relevamiento, cambian todas las semanas.
      </p>
    </section>

    <!-- Canales -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Por dónde se vende y cuánto se queda cada canal</h2>
      <p class="section-intro mb-5">
        La ropa de lote se vende barata —en la feria, «todo a partir de 100 pesos»; en una tienda de
        segunda mano, los básicos a $ 200–250 (Retroka, 2023)—, y a ese precio el canal pesa mucho.
      </p>
      <VTable density="comfortable" class="ropa-table cu-mobile-cards">
        <thead>
          <tr>
            <th>Canal</th>
            <th>Lo que se queda</th>
            <th class="text-right">De una prenda de $ 250, te quedan</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in channelRows" :key="row.label">
            <td data-label="Canal">{{ row.label }}</td>
            <td data-label="Lo que se queda">{{ row.fee }}</td>
            <td class="text-right font-weight-bold" data-label="De una prenda de $ 250, te quedan">
              {{ row.keep }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Vopero publica ejemplos en vez de una tasa: de una prenda vendida a $ 250 paga $ 50, y de
        una de $ 2.500, $ 1.275. Paga a los 30 días y rebaja lo que no se vende hasta 70 % desde el
        día 61. La consignación sirve para ropa buena; para ropa de lote es el canal que peor paga.
      </p>
    </section>

    <!-- Legal -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que dice la norma</h2>
      <p class="section-intro mb-5">
        Leído en IMPO y en las páginas de la DNA el {{ verifiedAt }}. Lo que circula en internet
        sobre Uruguay suele ser la norma argentina —el certificado de desinfección de los fardos,
        por ejemplo, es de allá—.
      </p>
      <VExpansionPanels variant="accordion" class="legal-panels">
        <VExpansionPanel v-for="rule in legal" :key="rule.title">
          <VExpansionPanelTitle>
            <div class="d-flex align-center">
              <VChip :color="rule.color" size="x-small" variant="flat" class="mr-3">{{
                rule.verdict
              }}</VChip>
              <span class="font-weight-bold">{{ rule.title }}</span>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-body-2 mb-2">{{ rule.body }}</p>
            <p class="text-caption mb-0">
              <a
                v-for="(src, i) in rule.sources"
                :key="src"
                :href="ROPA_SOURCES[src].url"
                target="_blank"
                rel="noopener noreferrer"
                class="cu-link"
                >{{ i > 0 ? ' · ' : '' }}{{ ROPA_SOURCES[src].label }}</a
              >
            </p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Estadísticas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El negocio en números</h2>
      <p class="section-intro mb-5">
        El comercio mundial de ropa usada según BACI (CEPII), que reconcilia lo que declara el país
        que exporta con lo que declara el que importa. El precio por kilo no está en la fuente: lo
        calcula esta página dividiendo valor por peso.
      </p>

      <VRow>
        <VCol cols="12" md="6">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">El mundo, por año</h3>
          <VTable density="comfortable" class="ropa-table cu-mobile-cards">
            <thead>
              <tr>
                <th>Año</th>
                <th class="text-right">Valor</th>
                <th class="text-right">Toneladas</th>
                <th class="text-right">US$/kg</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in WORLD_BY_YEAR" :key="row.label">
                <td data-label="Año">{{ row.label }}</td>
                <td class="text-right" data-label="Valor">{{ usdShort(row.valueUsd) }}</td>
                <td class="text-right" data-label="Toneladas">{{ int(row.tonnes) }}</td>
                <td class="text-right font-weight-bold" data-label="US$/kg">{{ perKg(row) }}</td>
              </tr>
            </tbody>
          </VTable>
        </VCol>
        <VCol cols="12" md="6">
          <h3 class="text-subtitle-1 font-weight-bold mb-3">Quién la manda (2024)</h3>
          <VTable density="comfortable" class="ropa-table cu-mobile-cards">
            <thead>
              <tr>
                <th>País</th>
                <th class="text-right">Valor</th>
                <th class="text-right">Toneladas</th>
                <th class="text-right">US$/kg</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in TOP_EXPORTERS_2024" :key="row.label">
                <td data-label="País">{{ row.label }}</td>
                <td class="text-right" data-label="Valor">{{ usdShort(row.valueUsd) }}</td>
                <td class="text-right" data-label="Toneladas">{{ int(row.tonnes) }}</td>
                <td class="text-right font-weight-bold" data-label="US$/kg">{{ perKg(row) }}</td>
              </tr>
            </tbody>
          </VTable>
        </VCol>
      </VRow>

      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-3">La región (importaciones 2024)</h3>
      <VTable density="comfortable" class="ropa-table cu-mobile-cards">
        <thead>
          <tr>
            <th>País</th>
            <th class="text-right">Valor</th>
            <th class="text-right">Toneladas</th>
            <th class="text-right">US$/kg</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in regionRows" :key="row.label">
            <td data-label="País">{{ row.label }}</td>
            <td class="text-right" data-label="Valor">{{ usdShort(row.valueUsd) }}</td>
            <td class="text-right" data-label="Toneladas">{{ int(row.tonnes) }}</td>
            <td class="text-right font-weight-bold" data-label="US$/kg">{{ perKg(row) }}</td>
          </tr>
        </tbody>
      </VTable>

      <VList class="facts-list mt-5" density="comfortable" bg-color="transparent">
        <VListItem v-for="item in statFacts" :key="item.text" class="px-0">
          <template #prepend>
            <VIcon icon="mdi-chart-box-outline" color="primary" size="small" class="mr-1" />
          </template>
          <p class="text-body-2 mb-0">
            {{ item.text }}
            <a
              :href="ROPA_SOURCES[item.source].url"
              target="_blank"
              rel="noopener noreferrer"
              class="cu-link"
              >Fuente</a
            >
          </p>
        </VListItem>
      </VList>

      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-3">Cuánto de la ropa no se vende</h3>
      <VTable density="comfortable" class="ropa-table cu-mobile-cards">
        <thead>
          <tr>
            <th>Dónde</th>
            <th>Qué se midió</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in UNSELLABLE_EVIDENCE" :key="row.where">
            <td data-label="Dónde">
              <a
                :href="ROPA_SOURCES[row.source].url"
                target="_blank"
                rel="noopener noreferrer"
                class="cu-link"
                >{{ row.where }}</a
              >
            </td>
            <td data-label="Qué se midió">{{ row.finding }}</td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <FaqSection :items="faqItems" heading="Preguntas frecuentes" :expanded="true" />

    <!-- Lo que no publicamos -->
    <section class="mb-12 mt-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que esta página no te va a decir</h2>
      <p class="section-intro mb-5">
        Datos que buscamos y no encontramos en una fuente que se pueda citar. Preferimos el hueco a
        una cifra inventada.
      </p>
      <VList class="unpublished" density="comfortable" bg-color="transparent">
        <VListItem v-for="item in ROPA_UNPUBLISHED" :key="item">
          <template #prepend>
            <VIcon icon="mdi-minus-circle-outline" color="medium-emphasis" size="small" />
          </template>
          <VListItemTitle class="text-wrap text-body-2">{{ item }}</VListItemTitle>
        </VListItem>
      </VList>
    </section>

    <!-- Fuentes -->
    <section class="mb-4">
      <h2 class="text-h5 font-weight-bold mb-2">Fuentes</h2>
      <p class="section-intro mb-4">
        Consultadas el {{ verifiedAt }}, salvo que la línea diga otra fecha. Los precios de lotes y
        tiendas son de vidriera y cambian; las normas, confirmalas antes de comprar.
      </p>
      <ul class="sources mb-6">
        <li v-for="source in sourceList" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">{{
            source.label
          }}</a>
        </li>
      </ul>

      <h3 class="text-subtitle-1 font-weight-bold mb-3">Seguir por acá</h3>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="link in related"
          :key="link.to"
          :to="localePath(link.to)"
          variant="tonal"
          size="small"
          >{{ link.label }}</VBtn
        >
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  PERSONA_FISICA_MAX_DUA_PER_YEAR,
  POSTAL_MAX_INVOICE_USD,
  POSTAL_MAX_WEIGHT_KG,
  SIMPLIFIED_MIN_USD,
  SIMPLIFIED_RATE_PCT,
} from '~/utils/commercialImport'
import { COURIER_RATES_VERIFIED_AT, ESTIMATOR_COURIERS, getCourier } from '~/utils/courierShipping'
import { MONO_APORTES_2026 } from '~/utils/monotributoInvoicing'
import {
  channelFeeUyu,
  type ChannelId,
  cheapestCourierFor,
  CONSIGNMENT_KEEP_PCT,
  courierBale,
  DEFAULT_SELLABLE_PCT,
  FALLBACK_USD_UYU,
  GARMENTS_PER_KG,
  LOCAL_LOTS,
  lotEconomics,
  ML_COMMISSION_MAX_PCT,
  ML_COMMISSION_MIN_PCT,
  perGarmentUyu,
  REGION_2024,
  ROPA_FAQ,
  ROPA_KILO_VERIFIED_AT,
  ROPA_SOURCES,
  type RopaSourceId,
  ROPA_UNPUBLISHED,
  TOP_EXPORTERS_2024,
  type TradeRow,
  UNSELLABLE_EVIDENCE,
  URUGUAY_IMPORTS,
  US_EXPORT_USD_PER_KG_2024,
  usdPerKg,
  WORLD_BY_YEAR,
} from '~/utils/ropaPorKilo'

const localePath = useLocalePath()

// --- formato ---
const nf0 = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 })
const nf2 = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pesos = (n: number) => `$ ${nf0.format(Math.round(n))}`
const usd2 = (n: number) => nf2.format(n)
const int = (n: number) => nf0.format(n)
const pct = (n: number) => `${n.toLocaleString('es-UY', { maximumFractionDigits: 1 })} %`
const tonnes = (t: number) => `${nf0.format(t)} toneladas`
const usdShort = (n: number) =>
  n >= 1e9
    ? `US$ ${(n / 1e9).toLocaleString('es-UY', { maximumFractionDigits: 2 })} mil M`
    : n >= 1e6
      ? `US$ ${(n / 1e6).toLocaleString('es-UY', { maximumFractionDigits: 1 })} M`
      : `US$ ${nf0.format(n)}`
const perKg = (row: TradeRow) => {
  const v = usdPerKg(row)
  return v === null ? '—' : usd2(v)
}
const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
const verifiedAt = longDate(ROPA_KILO_VERIFIED_AT)
const courierRatesDate = longDate(COURIER_RATES_VERIFIED_AT)

const chile = REGION_2024.find(r => r.label === 'Chile')!
const uruguay = REGION_2024.find(r => r.label === 'Uruguay')!

// --- calculadora de lote ---
const firstLot = LOCAL_LOTS[0]!
const selectedLot = ref<string | null>(firstLot.id)
const lotCost = ref(firstLot.priceUyu)
const garments = ref(firstLot.garments)
const avgPrice = ref(250)
const sellable = ref(DEFAULT_SELLABLE_PCT)
const channel = ref<ChannelId>('feria')
const otherCosts = ref(0)

function applyLot(id: string) {
  const found = LOCAL_LOTS.find(l => l.id === id)
  if (!found) return
  selectedLot.value = id
  lotCost.value = found.priceUyu
  garments.value = found.garments
}
// Si el usuario edita el lote a mano, deja de ser el ejemplo publicado.
watch([lotCost, garments], ([cost, count]) => {
  const current = LOCAL_LOTS.find(l => l.id === selectedLot.value)
  if (current && (current.priceUyu !== cost || current.garments !== count)) selectedLot.value = null
})

const channelItems: { title: string; value: ChannelId }[] = [
  { title: 'Feria o venta directa', value: 'feria' },
  { title: 'Mercado Libre', value: 'mercadolibre' },
  { title: 'Consignación en tienda de segunda mano', value: 'consignacion' },
]

const lot = computed(() =>
  lotEconomics({
    lotCostUyu: Number(lotCost.value),
    garments: Number(garments.value),
    sellablePct: Number(sellable.value),
    avgPriceUyu: Number(avgPrice.value),
    channel: channel.value,
    otherCostsUyu: Number(otherCosts.value),
  })
)

// --- fardo por courier ---
const { data: rate } = await useFetch<{ buy: number | null; sell: number | null }>('/api/og-rate', {
  key: 'og-rate-ropa-por-kilo',
  default: () => ({ buy: null, sell: null }),
})
const liveUsd = computed(() => {
  const sell = rate.value?.sell
  return typeof sell === 'number' && sell > 0 ? sell : null
})
const usdUyu = computed(() => liveUsd.value ?? FALLBACK_USD_UYU)
const usdSourceLabel = computed(() =>
  liveUsd.value
    ? `la mejor venta de hoy en las casas de cambio ($ ${usd2(liveUsd.value)})`
    : `el de mercado del ${verifiedAt} ($ ${usd2(FALLBACK_USD_UYU)}), porque la cotización en vivo no respondió`
)

const baleKg = ref(POSTAL_MAX_WEIGHT_KG)
const baleUsdPerKg = ref(Math.round(US_EXPORT_USD_PER_KG_2024 * 100) / 100)
const courierId = ref(cheapestCourierFor(POSTAL_MAX_WEIGHT_KG)?.id ?? ESTIMATOR_COURIERS[0]!.id)
const courierItems = ESTIMATOR_COURIERS.map(c => ({
  title: `${c.name} — US$ ${usd2(c.perKgUsd!)}/kg`,
  value: c.id,
}))

const bale = computed(() =>
  courierBale({
    kg: Number(baleKg.value),
    goodsUsdPerKg: Number(baleUsdPerKg.value),
    courier: getCourier(courierId.value),
    usdUyu: usdUyu.value,
  })
)
const baleParts = computed(() => {
  const b = bale.value
  if (!b || b.totalUsd <= 0) return []
  return [
    { label: 'Ropa', usd: b.goodsUsd, color: 'rgb(var(--v-theme-success))' },
    { label: 'Flete', usd: b.freightUsd, color: 'rgb(var(--v-theme-warning))' },
    { label: 'Prestación única', usd: b.taxUsd, color: 'rgb(var(--v-theme-info))' },
  ].map(p => ({ ...p, pct: (p.usd / b.totalUsd) * 100 }))
})
const baleBarLabel = computed(() => baleParts.value.map(p => `${p.label} ${pct(p.pct)}`).join(', '))

// --- contenido ---
const monoFirstYear = MONO_APORTES_2026.ley19942.primerAnio.sinFonasa

const shortFacts = [
  {
    icon: 'mdi-scale-balance',
    color: 'success',
    title: 'Importar ropa usada no está prohibido',
    body: 'No encontramos ninguna norma que lo prohíba: las prohibiciones de la DNA son de vehículos usados. Venderla sin poder probar que pagó tributos sí es contrabando (Código Aduanero, art. 212).',
  },
  {
    icon: 'mdi-airplane',
    color: 'error',
    title: 'Por courier casi nunca cierra',
    body: 'El flete aéreo cuesta más de doce veces lo que vale el kilo de ropa usada. Un fardo de 20 kg llega más caro por kilo que lo que una tienda de segunda mano de Montevideo le cobra al público por kilo cuando llevás 5 kg.',
  },
  {
    icon: 'mdi-store-outline',
    color: 'primary',
    title: 'Los feriantes compran acá',
    body: 'Mayoristas del Barrio de los Judíos, la feria de Piedras Blancas, lotes cerrados en Mercado Libre y redes, y ventas por kilo de tiendas de segunda mano. Un mercado de fardos importados como el chileno no existe.',
  },
  {
    icon: 'mdi-percent-outline',
    color: 'warning',
    title: 'El margen lo decide lo que no se vende',
    body: 'En el mayor mercado de fardos del mundo el 40 % de la ropa termina como residuo. Un lote de 100 prendas a $ 12.000 vendido al 60 % a $ 200 la prenda no deja nada; a $ 250, deja $ 3.000.',
  },
]

const supply = [
  {
    icon: 'mdi-warehouse',
    title: 'Mayoristas del Barrio de los Judíos (Villa Muñoz)',
    body: 'Sobre Arenal Grande y alrededores: es donde viajan a abastecerse comerciantes del interior (Universidad ORT) y lo primero que se contesta en r/uruguay a «¿dónde compro fardos?». Venden ropa nueva, de fabricación propia o importada de China; también hay fábricas que venden por mayor fuera del barrio, como Natasha Mayorista en Reus (pedido mínimo de 6 prendas, remeras a $ 190) o Ropa por Mayor en Domingo Aramburú.',
  },
  {
    icon: 'mdi-tent',
    title: 'La propia feria: Piedras Blancas',
    body: 'Jueves y domingos en Gral. Flores y Belloni. En r/uruguay se la señala como «donde compran todos los revendedores», que después venden lo mismo en redes. Investigadores de OsloMet que recorrieron Montevideo en 2022 vieron ropa comprada en la feria revendida en tiendas de segunda mano, y anotaron que Uruguay no tiene recolección pública de textiles.',
  },
  {
    icon: 'mdi-package-variant-closed',
    title: 'Lotes cerrados en Mercado Libre y redes',
    body: 'Lo que en Uruguay se llama «fardo»: 10 a 100 prendas a precio fijo, sin elegir qué viene. En Mercado Libre, la búsqueda «lote ropa usada» daba 624 resultados el 2/10/2026; «fardo ropa» no devolvía ni una prenda.',
  },
  {
    icon: 'mdi-scale',
    title: 'Ventas por kilo de tiendas de segunda mano',
    body: 'Era Mío vende por kilo en promociones de fin de semana ($ 790 el kilo, $ 590 desde 5 kg). Es venta al público, pero sirve de techo: un lote mayorista que sale más caro que eso no tiene sentido.',
  },
  {
    icon: 'mdi-airplane-takeoff',
    title: '«Ropa americana» que no es usada',
    body: 'Varias cuentas que venden «ropa americana» traen ropa NUEVA de outlet desde Miami por courier. Es otro negocio, con otra cuenta: la de la prestación única sobre prendas nuevas y la licencia textil.',
  },
  {
    icon: 'mdi-alert-octagon-outline',
    title: 'Contrabando por la frontera',
    body: 'El que existe y se persigue: en septiembre de 2026 se incautaron en Río Branco más de 1.500 prendas y 2.500 pares de championes por $ 10,9 millones, con tres condenados; en diciembre de 2025, más de 700 prendas en el puente de Fray Bentos. Comprar esa mercadería para revender es contrabando aunque no la hayas cruzado vos.',
  },
]

const channelFeeLabel = (id: ChannelId) =>
  id === 'feria'
    ? 'Nada de comisión; pagás el puesto y el traslado'
    : id === 'mercadolibre'
      ? `Entre ${ML_COMMISSION_MIN_PCT} % y ${ML_COMMISSION_MAX_PCT} % según la categoría, más $ 15 por unidad debajo de $ 500 ($ 25 hasta $ 750, $ 40 hasta $ 1.000)`
      : '48 % más IVA (Era Mío); paga del 10 al 17 de cada mes'
const channelRows = channelItems.map(item => ({
  label: item.title,
  fee: channelFeeLabel(item.value),
  keep: pesos(250 - channelFeeUyu(item.value, 250)),
}))

interface LegalRule {
  title: string
  verdict: string
  color: string
  body: string
  sources: RopaSourceId[]
}
const legal: LegalRule[] = [
  {
    title: 'Importar ropa usada',
    verdict: 'Permitido',
    color: 'success',
    body: 'La lista de prohibiciones de importación de la DNA son doce decretos, todos de vehículos usados y autopartes. La única norma que nombra la partida de la ropa usada (6309.00.10.00) es el Decreto 432/012, que la exime de licencia cuando son donaciones a organismos públicos: una facilidad, no una prohibición. Y desde 2022 la licencia textil (Decreto 8/022) cubre los capítulos 61 y 62 —ropa nueva— pero no la 6309. La ausencia de prohibición se prueba por ausencia: si vas a importar un volumen grande, confirmalo con un despachante.',
    sources: ['dnaProhibiciones', 'decreto432', 'decreto8'],
  },
  {
    title: 'Importar ropa nueva para vender',
    verdict: 'Con licencia',
    color: 'warning',
    body: 'Las prendas de los capítulos 61 y 62 necesitan una solicitud de importación ante la Dirección Nacional de Industrias (licencia automática, cuesta 0,2 UR y exige registro de etiquetado). El arancel máximo de Uruguay para prendas es 20 % según la OMC —el 35 % que circula es el de Argentina y Brasil—, más tasa consular del 5 % (3 % con origen Mercosur) e IVA del 22 % con sus anticipos.',
    sources: ['decreto8', 'licenciaTextil', 'omcAranceles', 'tasaConsular'],
  },
  {
    title: 'Traerla por courier para revender',
    verdict: 'Prestación única',
    color: 'info',
    body: `Personas físicas o jurídicas pueden optar por pagar el ${SIMPLIFIED_RATE_PCT} % del valor de factura (mínimo US$ ${SIMPLIFIED_MIN_USD} por envío) en envíos de hasta ${POSTAL_MAX_WEIGHT_KG} kg y US$ ${POSTAL_MAX_INVOICE_USD}, «con o sin fines comerciales» y sin límite de veces. Una salvedad para la ropa NUEVA: el art. 7 excluye la mercadería que requiere autorización y no la tiene, y la licencia textil no prevé excepción postal. La ropa usada no tiene ese problema.`,
    sources: ['decreto50art2', 'dnaPrestacionUnica', 'decreto50art7'],
  },
  {
    title: 'La franquicia para revender',
    verdict: 'No',
    color: 'error',
    body: 'Los US$ 800 y tres envíos al año de la franquicia son «para uso personal y sin fines comerciales». Usarla para traer mercadería de reventa es declarar algo falso.',
    sources: ['decreto50art3'],
  },
  {
    title: 'Régimen general (contenedor)',
    verdict: 'Con despachante',
    color: 'info',
    body: `Arriba de los topes postales va por régimen general, con despachante obligatorio. Una persona física puede hacer sólo ${PERSONA_FISICA_MAX_DUA_PER_YEAR} DUA por año: un negocio que importa seguido necesita empresa.`,
    sources: ['dnaDua'],
  },
  {
    title: 'Comprar ropa de contrabando para revender',
    verdict: 'Infracción',
    color: 'error',
    body: 'El art. 212 del Código Aduanero aplica las sanciones del contrabando a quien adquiera o posea mercadería para comercializarla «sabiendo o debiendo saber» que entró de contrabando, y presume que lo sabía si no tiene comprobante de pago de tributos, de fabricación nacional o de compra en plaza. Las sanciones incluyen el comiso, el doble de los tributos y una multa del 20 % del valor; con montos grandes hay además delito penal. Pedí factura o boleta al mayorista.',
    sources: ['codigoAduanero'],
  },
  {
    title: 'Vender ropa usada en la calle o en una feria',
    verdict: 'En zonas fijadas',
    color: 'warning',
    body: 'El Digesto de Montevideo permite a los periferiantes vender ropa y calzado nuevos, nacionales o importados (art. D.1887), y artículos usados sólo «en zonas preestablecidas» (art. D.1888). Los derechos de piso se cobran por metro. Las ferias especiales piden además estar inscripto: la de fin de año del Municipio G cobraba un sticker de $ 768 por un puesto precario y revocable.',
    sources: ['digestoIm', 'feriaMunicipioG'],
  },
  {
    title: 'Formalizarse como feriante',
    verdict: 'Monotributo',
    color: 'success',
    body: `El monotributo admite a quien explota un solo puesto o un pequeño local y vende sólo a consumidores finales (Ley 18.083, art. 71). La cuota de 2026 arranca en $ ${nf0.format(monoFirstYear)} por mes el primer año sin FONASA. No reemplaza los tributos de importación: si importás, esos se pagan aparte.`,
    sources: ['ley18083', 'bpsMonotributo'],
  },
]

const regionRows: TradeRow[] = [
  ...REGION_2024,
  {
    label: URUGUAY_IMPORTS.declared2024.label,
    valueUsd: URUGUAY_IMPORTS.declared2024.valueUsd,
    tonnes: URUGUAY_IMPORTS.declared2024.tonnes,
  },
]

const statFacts: { text: string; source: RopaSourceId }[] = [
  {
    text: 'Uruguay declara haber importado mucho menos de lo que sus socios dicen haberle mandado: 129 toneladas contra 428 en 2024. Las dos cifras miden cosas distintas y no lo resolvemos; puede ser mercadería en tránsito o ropa nueva declarada como usada en origen.',
    source: 'witsUy2024',
  },
  {
    text: 'Argentina pasó de 78 toneladas en 2024 a 4,6 millones de kilos en 2025, cuando venció su prohibición: el 84 % entró por la Aduana de Jujuy, casi todo desde Chile.',
    source: 'todoJujuy',
  },
  {
    text: 'En la zona franca de Iquique, un fardo «premium» de 45 a 50 kg con 50 a 60 jeans de primera se vende entre US$ 300 y US$ 400.',
    source: 'laTercera',
  },
  {
    text: 'Chile importa unas 123 mil toneladas de ropa usada por año, y unas 39 mil terminan descartadas, muchas en basurales del desierto de Atacama.',
    source: 'bbcAtacama',
  },
  {
    text: 'El mercado mundial de ropa de segunda mano podría llegar a US$ 367 mil millones en 2029, según el informe anual de ThredUp.',
    source: 'thredup',
  },
  {
    text: 'Cada segundo, el equivalente a un camión de basura lleno de ropa se quema o va a un vertedero, y la moda produce hasta el 8 % de los gases de efecto invernadero del mundo.',
    source: 'onu',
  },
]

const faqItems = computed(() => [...ROPA_FAQ])
const sourceList = Object.values(ROPA_SOURCES)

const related = [
  { to: '/importar-para-revender-uruguay', label: 'Importar para revender' },
  { to: '/facturar-en-monotributo-uruguay', label: 'Facturar en monotributo' },
  { to: '/que-empresa-abrir-uruguay', label: 'Qué empresa abrir' },
  { to: '/envio-directo-o-casillero-uruguay', label: '¿Envío directo o casillero?' },
  { to: '/herramientas/carrito-importacion', label: 'Carrito de importación' },
  { to: '/franquicia-aduana-uruguay', label: 'Franquicia de aduana' },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/ropa-por-kilo-uruguay'
const title = 'Ropa por kilo y fardos: cuánto se gana'
const description =
  'De dónde sacan la ropa los feriantes, cuánto deja un lote según lo que se vende, qué dice la aduana y por qué un fardo por courier casi nunca cierra.'

defineOgImageComponent('Cambio', {
  title: 'Ropa por kilo y fardos',
  subtitle: 'Cuánto deja un lote y qué es legal en Uruguay',
  tag: 'EMPRENDER',
})

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
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
        'ropa por kilo uruguay, fardos de ropa uruguay, fardos de ropa americana uruguay, importar ropa usada uruguay, ropa usada por kilo montevideo, mayorista de ropa montevideo, donde compran los feriantes, lote de ropa usada, negocio de ropa usada, revender ropa uruguay',
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
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              { '@type': 'ListItem', position: 2, name: title, item: canonicalUrl },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: ROPA_KILO_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: sourceList.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.lead {
  font-size: 1.05rem;
  line-height: 1.65;
  margin-top: 0;
}
.section-intro {
  margin-top: 0;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface-variant));
}
.warn-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  background: rgba(var(--v-theme-warning), 0.07);
}
.warn-title,
.fact-title {
  margin-top: 0;
  font-weight: 700;
}
.fact-card,
.verdict-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.verdict-label {
  margin-top: 0;
  font-size: 0.85rem;
  color: rgb(var(--v-theme-on-surface-variant));
}
.verdict-amount {
  margin-top: 0;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.verdict-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.verdict-grid > div {
  display: flex;
  flex-direction: column;
}
.vg-label {
  font-size: 0.78rem;
  color: rgb(var(--v-theme-on-surface-variant));
}
.vg-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.bale-bar {
  display: flex;
  height: 14px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}
.bale-seg {
  display: block;
  height: 100%;
}
.bale-legend {
  margin-top: 0;
  padding-left: 0;
  list-style: none;
  font-size: 0.88rem;
}
.bale-legend li {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}
.dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 8px;
  flex-shrink: 0;
}
.supply-list :deep(.v-list-item__prepend),
.facts-list :deep(.v-list-item__prepend),
.unpublished :deep(.v-list-item__prepend) {
  align-self: start;
  margin-top: 4px;
}
.ropa-table :deep(th) {
  white-space: nowrap;
}
.sources {
  margin-top: 0;
  padding-left: 1.1rem;
  font-size: 0.92rem;
}
.sources li {
  margin-bottom: 6px;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
</style>
