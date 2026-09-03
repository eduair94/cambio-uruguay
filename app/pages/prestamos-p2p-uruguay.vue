<template>
  <VContainer class="p2p-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">CRÉDITO · URUGUAY</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Préstamos entre personas en Uruguay: qué se puede y qué se pierde
      </h1>
      <p class="lead mb-6">
        En agosto de 2026 apareció la primera plataforma de préstamos peer to peer inscripta en el
        Banco Central, ocho años después de que se creara la licencia. Toda la cobertura contó
        cuánto se puede ganar. Ninguna contó lo que la propia norma obliga a advertir:
        <strong>si el deudor no paga, la pérdida es entera del que prestó</strong>, y armar un fondo
        de garantía para repartirla está expresamente prohibido.
      </p>

      <VCard class="plain-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-2">Cómo leer esta página</div>
        <p class="mb-3">
          El régimen se cita del texto vigente de la Recopilación de Normas de Regulación y Control
          del Sistema Financiero (última circular Nº 2.506, del 23 de junio de 2026), no del
          proyecto que el BCU puso a consulta en 2018, que decía otra cosa en puntos importantes.
        </p>
        <p class="mb-0">
          Y hay dos hechos que no se funden en uno: el Banco Central publicó una inscripción a
          nombre de una sociedad, y la prensa publicó el nombre comercial de una plataforma.
          Vincularlos es lectura de terceros, no del BCU. El verbo exacto tampoco es «autorizar»: la
          ficha oficial de requisitos dice que estas empresas
          <em
            >«no requieren autorización previa para funcionar, pero sí requieren Inscripción en el
            Registro»</em
          >.
        </p>
      </VCard>

      <p class="text-caption text-medium-emphasis mt-4 mb-0">
        Datos verificados el {{ verifiedLabel }} · UI de {{ uiLabel }} · inflación de referencia
        {{ INFLATION_YOY_PCT }}% ({{ INFLATION_PERIOD }})
      </p>

      <div class="d-flex justify-start mt-4">
        <ShareButtons
          text="Préstamos peer to peer en Uruguay: qué dice la norma, qué pasó con los intentos anteriores y cuánto queda después de la mora"
        />
      </div>
    </header>

    <!-- Lo que pasó -->
    <section id="que-paso" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Qué pasó, exactamente</h2>
      <VRow>
        <VCol cols="12" md="7">
          <VCard class="plain-card pa-5" variant="flat">
            <p class="mb-3">
              <strong>Lo que dice el Banco Central.</strong> El 29 de junio de 2026 la
              Superintendencia de Servicios Financieros resolvió inscribir a
              <strong>{{ EAPPP_REGISTRATION.company }}</strong> en el Registro de Empresas
              Administradoras de Plataformas para Préstamos entre Personas (resolución
              {{ EAPPP_REGISTRATION.resolution }}, expediente {{ EAPPP_REGISTRATION.file }}) y lo
              comunicó al mercado al día siguiente. La resolución deja constancia de que la empresa
              constituyó el depósito mínimo del artículo 248.1, no dice que sea la primera y no
              menciona ninguna marca comercial.
            </p>
            <p class="mb-3">
              <strong>Lo que dice la prensa.</strong> El 5 de agosto de 2026 El Observador informó
              que <strong>Prestapagos</strong>, fundada por Indro Montanelli, obtuvo el aval para
              operar como la primera Empresa Administradora de Plataformas de Préstamos entre
              Personas del país, tras un trámite que le llevó un año y medio cuando esperaba seis
              meses, y que empezaría a funcionar «en los próximos 10 días».
            </p>
            <p class="mb-3">
              Según esa nota: se presta desde $ 1.000, el prestamista elige la tasa dentro de una
              banda de 50% a 130% de tasa efectiva anual, el préstamo promedio esperado es de $
              25.000 (unos US$ 500), los plazos típicos son de tres a seis meses con un máximo de un
              año, los solicitantes se clasifican en platino, oro, plata y bronce, y no se cobra
              comisión durante los primeros seis meses.
            </p>
            <p class="mb-0">
              Al {{ verifiedLabel }}, el sitio de la plataforma anuncia su aplicación como
              «Próximamente» y declara que
              <em
                >«no garantiza el pago de los préstamos, no administra los fondos de los usuarios ni
                realiza el cobro de forma directa»</em
              >. No publica razón social, RUT ni número de inscripción.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="5">
          <VCard class="verdict-card pa-5" variant="flat">
            <div class="text-overline mb-2">De dónde sale ese 50%–130%</div>
            <p class="mb-3">
              No es una banda inventada por la plataforma ni un producto especial: son los topes de
              usura que publica el BCU para el crédito al consumo en pesos sin autorización de
              descuento, vigentes desde el {{ vigenteDesdeLabel }}.
            </p>
            <div class="stat-line">
              <span class="big-n">{{ topeChicoLabel }}</span>
              <span class="stat-cap">tope para créditos de menos de UI 10.000 (unos $ 66.350)</span>
            </div>
            <div class="stat-line mt-4">
              <span class="big-n">{{ topeGrandeLabel }}</span>
              <span class="stat-cap">tope desde UI 10.000, hasta 366 días</span>
            </div>
            <p class="text-caption text-medium-emphasis mt-4 mb-0">
              El préstamo promedio anunciado, $ 25.000, queda del lado caro de ese umbral.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Calculadora -->
    <section id="calculadora" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué queda de la tasa que te ofrecen</h2>
      <p class="text-medium-emphasis mb-5 measure">
        La tasa pactada es el techo, no el rendimiento. De ahí salen los créditos que no pagan, la
        comisión de la plataforma y el IRPF. Poné tus números por cada 100 pesos colocados durante
        un año.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <div class="text-overline mb-3">Los supuestos</div>
            <VTextField
              v-model.number="form.teaPct"
              type="number"
              label="Tasa efectiva anual pactada (%)"
              min="0"
              max="200"
              density="comfortable"
              variant="outlined"
              class="mb-3"
              hide-details
            />
            <VTextField
              v-model.number="form.platformFeePct"
              type="number"
              label="Comisión anual de la plataforma (%)"
              min="0"
              max="50"
              density="comfortable"
              variant="outlined"
              class="mb-3"
              hide-details
            />
            <VTextField
              v-model.number="form.defaultPct"
              type="number"
              label="Parte de la cartera que no paga (%)"
              min="0"
              max="100"
              density="comfortable"
              variant="outlined"
              class="mb-3"
              hide-details
            />
            <VTextField
              v-model.number="form.recoveryPct"
              type="number"
              label="Cuánto recuperás de lo que no paga (%)"
              min="0"
              max="100"
              density="comfortable"
              variant="outlined"
              class="mb-3"
              hide-details
            />
            <VRow dense>
              <VCol cols="6">
                <VTextField
                  v-model.number="form.taxPct"
                  type="number"
                  label="IRPF (%)"
                  min="0"
                  max="50"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
              </VCol>
              <VCol cols="6">
                <VTextField
                  v-model.number="form.inflationPct"
                  type="number"
                  label="Inflación (%)"
                  min="0"
                  max="100"
                  density="comfortable"
                  variant="outlined"
                  hide-details
                />
              </VCol>
            </VRow>
            <p class="text-caption text-medium-emphasis mt-4 mb-0">
              No hay dato uruguayo publicado de mora en préstamos entre personas: la plataforma está
              obligada a publicar su morosidad promedio mensual (art. 484.1), y ese es el número que
              hay que poner acá cuando exista.
            </p>
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard variant="flat" class="verdict-card pa-5 mb-4">
            <div class="text-overline mb-3">Por cada 100 pesos prestados durante un año</div>
            <VTable density="comfortable" class="calc-table">
              <tbody>
                <tr>
                  <td>Interés cobrado (los créditos caídos no pagan interés)</td>
                  <td class="text-right pos">+{{ money(result.interestCollected) }}</td>
                </tr>
                <tr>
                  <td>Capital perdido, ya neto de recupero</td>
                  <td class="text-right neg">−{{ money(result.capitalLost) }}</td>
                </tr>
                <tr>
                  <td>Comisión de la plataforma</td>
                  <td class="text-right neg">−{{ money(result.fee) }}</td>
                </tr>
                <tr>
                  <td>IRPF sobre el interés cobrado</td>
                  <td class="text-right neg">−{{ money(result.tax) }}</td>
                </tr>
                <tr class="total-row">
                  <td class="font-weight-bold">Te queda</td>
                  <td
                    class="text-right font-weight-bold"
                    :class="result.netNominalPct >= 0 ? 'pos' : 'neg'"
                  >
                    {{ money(result.netNominalPct) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>

          <VRow dense>
            <VCol cols="12" sm="6">
              <VCard variant="flat" class="plain-card pa-5 h-100">
                <div class="text-overline mb-2">Rendimiento neto</div>
                <div class="big-n" :class="result.netNominalPct >= 0 ? '' : 'neg'">
                  {{ pct(result.netNominalPct) }}
                </div>
                <p class="stat-cap mt-2 mb-3">nominal anual</p>
                <div class="big-n" :class="result.netRealPct >= 0 ? '' : 'neg'">
                  {{ pct(result.netRealPct) }}
                </div>
                <p class="stat-cap mt-2 mb-0">real, descontada la inflación</p>
              </VCard>
            </VCol>
            <VCol cols="12" sm="6">
              <VCard variant="flat" class="plain-card pa-5 h-100">
                <div class="text-overline mb-2">Punto de equilibrio</div>
                <div class="big-n">
                  {{ result.breakEvenDefaultPct === null ? '—' : pct(result.breakEvenDefaultPct) }}
                </div>
                <p class="stat-cap mt-2 mb-3">
                  de mora deja el resultado en cero, con esta tasa, esta comisión y este recupero
                </p>
                <p class="text-body-2 mb-0">
                  Frente a una Nota del Tesoro en UI, que rindió
                  <strong>2,98% real y exenta de IRPF</strong> en la licitación del 4 de agosto de
                  2026, tu ventaja real hoy es de
                  <strong :class="edgeVsSovereign >= 0 ? 'pos' : 'neg'">{{
                    pct(edgeVsSovereign)
                  }}</strong>
                  anual.
                </p>
              </VCard>
            </VCol>
          </VRow>

          <VAlert
            :type="result.netRealPct >= 2.98 ? 'info' : 'warning'"
            variant="tonal"
            density="comfortable"
            class="mt-4"
            icon="mdi-scale-balance"
          >
            <span v-if="result.netRealPct >= 2.98">
              Con estos supuestos el préstamo entre personas le gana al piso sin riesgo. Lo único
              que no sabés es la mora real: te separan
              <strong>{{
                pctPoints(Math.max(0, (result.breakEvenDefaultPct ?? 0) - form.defaultPct))
              }}</strong>
              del punto en el que empezás a perder plata.
            </span>
            <span v-else>
              Con estos supuestos estás tomando riesgo de crédito directo para quedar por debajo de
              lo que paga el Tesoro uruguayo en UI sin riesgo de contraparte y sin impuesto.
            </span>
          </VAlert>

          <p class="text-caption text-medium-emphasis mt-3 mb-0">
            El modelo supone que un crédito en default no paga ningún interés y que el IRPF grava el
            interés cobrado sin compensarse con la pérdida de capital, que es el tratamiento
            aplicable a una persona física en la Categoría I. Es una simplificación declarada, no
            una liquidación de impuestos.
          </p>
        </VCol>
      </VRow>
    </section>

    <!-- La norma -->
    <section id="norma" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El régimen, artículo por artículo</h2>
      <p class="text-medium-emphasis mb-5 measure">
        Todo lo que sigue está en la Recopilación vigente, con la Circular 2.307 al pie de cada
        artículo (resolución del 21 de noviembre de 2018, vigencia con la publicación en el Diario
        Oficial del 28 de noviembre de 2018).
      </p>

      <VExpansionPanels variant="accordion" class="rules-panels">
        <VExpansionPanel v-for="(rule, i) in P2P_RULES" :key="i">
          <VExpansionPanelTitle>
            <div class="d-flex align-center ga-3 flex-wrap">
              <VChip size="small" variant="tonal" color="primary" class="art-chip">
                Art. {{ rule.article }}
              </VChip>
              <span class="font-weight-medium">{{ rule.title }}</span>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="rule-says mb-3">{{ rule.says }}</p>
            <blockquote v-if="rule.quote" class="rule-quote mb-3">«{{ rule.quote }}»</blockquote>
            <p class="rule-meaning mb-0">
              <strong>Qué significa:</strong>
              {{ rule.meaning }}
            </p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>

      <VRow class="mt-6">
        <VCol cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <div class="text-overline mb-3">Los topes, en UI y en pesos</div>
            <VTable density="comfortable" class="cu-mobile-cards cu-roomy limits-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th class="text-right">Límite</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="limit in P2P_LIMITS" :key="limit.concept">
                  <td data-label="Concepto" class="cu-cell-prose">{{ limit.concept }}</td>
                  <td data-label="Límite" class="text-right">
                    <template v-if="limit.pctNote">{{ limit.pctNote }}</template>
                    <template v-else>
                      UI {{ int(limit.ui) }}
                      <span class="d-block text-caption text-medium-emphasis"
                        >≈ $ {{ int(uiToPesos(limit.ui)) }}</span
                      >
                    </template>
                  </td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-caption text-medium-emphasis mt-3 mb-0">
              La norma fija los límites en UI; el equivalente en pesos usa la UI del
              {{ uiLabel }} y se mueve todos los días. Para agotar el tope de inversión hay que
              repartir entre al menos {{ minBorrowersToUseCap() }} deudores distintos.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <div class="text-overline mb-3">Topes de usura ({{ usuryPeriod }})</div>
            <VTable density="comfortable" class="cu-mobile-cards cu-roomy usury-table">
              <thead>
                <tr>
                  <th>Segmento</th>
                  <th class="text-right">Media</th>
                  <th class="text-right">Tope</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="cap in usuryRows" :key="cap.segment">
                  <td data-label="Segmento" class="cu-cell-prose">
                    {{ cap.segment }}
                    <span v-if="cap.note" class="d-block text-caption text-medium-emphasis">{{
                      cap.note
                    }}</span>
                  </td>
                  <td data-label="Media" class="text-right">{{ pct(cap.meanPct) }}</td>
                  <td data-label="Tope" class="text-right font-weight-medium">
                    {{ pct(cap.capPct) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
            <p v-if="hasStaleRows" class="text-caption text-medium-emphasis mt-3 mb-0">
              Las filas de autorización de descuento y retención de haberes no vienen en la tabla
              que se lee a diario: son del {{ USURY_PERIOD }}. El resto es lo que el BCU publica
              hoy.
            </p>
            <p class="text-caption text-medium-emphasis mt-3 mb-0">
              Pasarse del tope no es sólo una multa: caduca el derecho a cobrar intereses,
              comisiones y gastos (art. 21 de la Ley 18.212) y el delito de usura tiene pena de seis
              meses a cuatro años.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Historia -->
    <section id="historia" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Ocho años de licencia sin usar: la historia uruguaya
      </h2>
      <p class="text-medium-emphasis mb-5 measure">
        La figura no se inventó en 2026. Existe desde noviembre de 2018, y antes de eso ya había
        cuatro plataformas operando sin regulación específica.
      </p>

      <ol class="timeline">
        <li v-for="(ev, i) in P2P_TIMELINE" :key="i" class="tl-item" :class="`tone-${ev.tone}`">
          <div class="tl-dot" aria-hidden="true" />
          <div class="tl-body">
            <div class="tl-date">{{ ev.date }}</div>
            <div class="tl-label">{{ ev.label }}</div>
            <p class="tl-detail mb-0">
              {{ ev.detail }}
              <template v-if="ev.source">
                <a :href="ev.source" target="_blank" rel="noopener" class="tl-src">fuente</a>
              </template>
            </p>
          </div>
        </li>
      </ol>
    </section>

    <!-- Casos uruguayos -->
    <section id="casos" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que sí salió mal en Uruguay</h2>
      <VAlert type="info" variant="tonal" density="comfortable" class="mb-5" icon="mdi-tag-outline">
        <strong
          >Ninguno de estos casos fue una plataforma de préstamos entre personas inscripta.</strong
        >
        Vendían cesiones de crédito, capitalización ganadera, obligaciones negociables o cheques
        descontados. Están acá porque son los antecedentes reales del «poné plata que te la devuelvo
        con renta» en Uruguay, y porque explican por qué la desconfianza local es alta.
      </VAlert>

      <VRow>
        <VCol v-for="c in UY_CASES" :key="c.id" cols="12" md="6">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <div class="d-flex align-center justify-space-between ga-2 flex-wrap mb-2">
              <h3 class="text-h6 font-weight-bold mb-0">{{ c.name }}</h3>
              <VChip size="x-small" variant="tonal" color="warning">{{
                KIND_LABELS[c.kind]
              }}</VChip>
            </div>
            <div class="text-caption text-medium-emphasis mb-3">{{ c.years }}</div>
            <p class="case-p mb-2"><strong>Qué vendían:</strong> {{ c.pitch }}</p>
            <p class="case-p mb-2"><strong>Cómo terminó:</strong> {{ c.outcome }}</p>
            <p class="case-p mb-3"><strong>Números:</strong> {{ c.numbers }}</p>
            <a :href="c.source" target="_blank" rel="noopener" class="src-link">{{
              c.sourceLabel
            }}</a>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="plain-card pa-5 mt-4">
        <p class="mb-0">
          Antes de darle plata a cualquiera de estas figuras conviene pasar el nombre por la lista
          de advertencias del Banco Central, que reúne a las empresas que —según el propio BCU— no
          están inscriptas ni habilitadas.
          <NuxtLink :to="linkAdvertencias" class="in-link">Está buscable acá</NuxtLink>. Y desde
          junio de 2026 el BCU exige declaración jurada a cualquiera que convoque a invertir aunque
          no emita valores, aclarando que presentarla
          <em>«no implica la inscripción en ningún Registro»</em>.
        </p>
      </VCard>
    </section>

    <!-- Mundo -->
    <section id="mundo" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        El préstamo entre personas ya se probó en el mundo, y casi siempre se replegó
      </h2>
      <p class="text-medium-emphasis mb-5 measure">
        No es un modelo nuevo. Es un modelo con veinte años de historia, y la historia no es buena
        para el inversor minorista.
      </p>

      <VRow>
        <VCol v-for="(w, i) in WORLD_CASES" :key="i" cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <div class="text-overline mb-2">{{ w.country }}</div>
            <p class="font-weight-medium mb-2">{{ w.what }}</p>
            <p class="case-p mb-3">{{ w.numbers }}</p>
            <a :href="w.source" target="_blank" rel="noopener" class="src-link">{{
              w.sourceLabel
            }}</a>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="plain-card pa-5 mt-4">
        <div class="text-overline mb-1">
          Rendimiento neto realizado de Mintos, el mayor marketplace europeo
        </div>
        <p class="text-caption text-medium-emphasis mb-4">
          Es el mejor ejemplo documentado de la brecha entre la tasa del aviso y lo que queda en el
          bolsillo: la tasa promedio ofrecida ronda el 10%, pero el rendimiento realizado se hundió
          en los años de estrés.
        </p>
        <div class="mintos-grid">
          <div v-for="row in MINTOS_NET_RETURNS" :key="row.year" class="mintos-cell">
            <div class="mintos-bar-wrap">
              <div
                class="mintos-bar"
                :class="row.pct < 0 ? 'is-neg' : ''"
                :style="{ height: barHeight(row.pct) }"
              />
            </div>
            <div class="mintos-val" :class="row.pct < 0 ? 'neg' : ''">{{ pct(row.pct) }}</div>
            <div class="mintos-year">{{ row.year }}</div>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Comparativa prestamista -->
    <section id="alternativas-prestar" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si querés poner plata: contra qué compite</h2>
      <p class="text-medium-emphasis mb-5 measure">
        El piso sin riesgo en Uruguay hoy está entre 2,3% y 3,0% real anual en Notas del Tesoro en
        UI, exentas de IRPF. Todo lo que supere eso es el precio del riesgo que estás tomando.
      </p>

      <VCard variant="flat" class="plain-card pa-2 pa-md-4">
        <VTable density="comfortable" class="cu-mobile-cards cu-roomy alt-table">
          <thead>
            <tr>
              <th>Dónde</th>
              <th>Rinde</th>
              <th>Riesgo de perder capital</th>
              <th>Liquidez</th>
              <th>Seguro de depósitos</th>
              <th>Impuesto</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="alt in LENDER_ALTERNATIVES"
              :key="alt.id"
              :class="alt.id === 'p2p' ? 'row-hl' : ''"
            >
              <td data-label="Dónde" class="cu-cell-prose">
                <span class="font-weight-medium">{{ alt.name }}</span>
                <a
                  :href="alt.source"
                  target="_blank"
                  rel="noopener"
                  class="src-link d-block mt-1"
                  >{{ alt.sourceLabel }}</a
                >
              </td>
              <td data-label="Rinde" class="cell-num cu-cell-prose">
                {{ alt.yieldLabel }}
                <span v-if="alt.note" class="d-block text-caption text-medium-emphasis">{{
                  alt.note
                }}</span>
              </td>
              <td data-label="Riesgo" class="cu-cell-prose">{{ alt.risk }}</td>
              <td data-label="Liquidez" class="cu-cell-prose">{{ alt.liquidity }}</td>
              <td data-label="Seguro de depósitos">
                <VChip
                  size="x-small"
                  :color="alt.copab === 'sí' ? 'success' : 'error'"
                  variant="tonal"
                >
                  {{ alt.copab === 'sí' ? 'Sí' : 'No' }}
                </VChip>
              </td>
              <td data-label="Impuesto" class="cu-cell-prose">{{ alt.taxLabel }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        El seguro del COPAB cubre hasta UI 250.000 en moneda nacional y US$ 10.000 en moneda
        extranjera, por persona y por institución, y sólo alcanza a depósitos en bancos y
        cooperativas de intermediación financiera. Un préstamo no es un depósito.
      </p>
    </section>

    <!-- Comparativa tomador -->
    <section id="alternativas-pedir" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si necesitás pedir: contra qué compite</h2>
      <p class="text-medium-emphasis mb-5 measure">
        En Uruguay el precio del crédito no lo define la urgencia sino el requisito que podés
        cumplir. Cada escalón de tasa compra un requisito menos.
      </p>

      <VCard variant="flat" class="plain-card pa-2 pa-md-4">
        <VTable density="comfortable" class="cu-mobile-cards cu-roomy alt-table">
          <thead>
            <tr>
              <th>Dónde</th>
              <th>Tasa efectiva anual</th>
              <th>Qué te piden</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="alt in BORROWER_ALTERNATIVES"
              :key="alt.id"
              :class="alt.id === 'p2p' ? 'row-hl' : ''"
            >
              <td data-label="Dónde" class="cu-cell-prose">
                <span class="font-weight-medium">{{ alt.name }}</span>
                <a
                  :href="alt.source"
                  target="_blank"
                  rel="noopener"
                  class="src-link d-block mt-1"
                  >{{ alt.sourceLabel }}</a
                >
              </td>
              <td data-label="Tasa" class="cell-num cu-cell-prose">
                {{ alt.teaLabel }}
                <span v-if="alt.plusIva" class="cell-note">+ IVA sobre los intereses</span>
              </td>
              <td data-label="Qué te piden" class="cu-cell-prose">{{ alt.requirement }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Las tasas «+ IVA» no son comparables de frente con las que ya lo incluyen: para una persona
        física no contribuyente de IRAE hay que multiplicarlas por 1,22 aproximadamente. Ver también
        la comparativa completa de
        <NuxtLink :to="linkPrestamos" class="in-link">dónde pedir un préstamo</NuxtLink>.
      </p>
    </section>

    <!-- Checklists -->
    <section id="checklist" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-5">Antes de entrar</h2>
      <VRow>
        <VCol cols="12" md="7">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <div class="text-overline mb-4">Si vas a prestar</div>
            <div v-for="(item, i) in LENDER_CHECKLIST" :key="i" class="check-item">
              <VIcon size="18" color="primary" class="check-icon">mdi-check-circle-outline</VIcon>
              <div>
                <div class="font-weight-medium">{{ item.title }}</div>
                <p class="check-detail mb-0">{{ item.detail }}</p>
              </div>
            </div>
          </VCard>
        </VCol>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <div class="text-overline mb-4">Si vas a pedir</div>
            <div v-for="(item, i) in borrowerChecklist" :key="i" class="check-item">
              <VIcon size="18" color="secondary" class="check-icon">mdi-check-circle-outline</VIcon>
              <div>
                <div class="font-weight-medium">{{ item.title }}</div>
                <p class="check-detail mb-0">{{ item.detail }}</p>
              </div>
            </div>
            <p class="text-caption text-medium-emphasis mt-4 mb-0">
              Si ya estás con deudas atrasadas, primero conviene ordenar eso:
              <NuxtLink :to="linkClearing" class="in-link">salir del clearing</NuxtLink>
              y
              <NuxtLink :to="linkSaldar" class="in-link">negociar lo que debés</NuxtLink>.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section id="preguntas" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-5">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="(f, i) in faq" :key="i">
          <VExpansionPanelTitle class="font-weight-medium">{{ f.question }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="faq-answer mb-0">{{ f.answer }}</p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section id="fuentes" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-4">Fuentes</h2>
      <VCard variant="flat" class="plain-card pa-5">
        <ul class="src-list">
          <li v-for="(s, i) in P2P_SOURCES" :key="i">
            <VChip size="x-small" variant="tonal" class="mr-2 src-kind">{{ s.kind }}</VChip>
            <a :href="s.url" target="_blank" rel="noopener">{{ s.label }}</a>
          </li>
        </ul>
        <p class="text-caption text-medium-emphasis mt-4 mb-0">
          Contenido informativo, no asesoramiento financiero ni jurídico. Las tasas, los topes y el
          valor de la UI cambian: verificá contra la fuente antes de decidir.
        </p>
      </VCard>
    </section>

    <div class="d-flex justify-center">
      <ShareButtons
        text="Préstamos peer to peer en Uruguay: qué dice la norma, qué pasó con los intentos anteriores y cuánto queda después de la mora"
      />
    </div>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BORROWER_ALTERNATIVES,
  buildBorrowerChecklist,
  EAPPP_REGISTRATION,
  INFLATION_PERIOD,
  INFLATION_YOY_PCT,
  KIND_LABELS,
  LENDER_ALTERNATIVES,
  LENDER_CHECKLIST,
  MINTOS_NET_RETURNS,
  P2P_CALC_DEFAULTS,
  buildP2pFaq,
  P2P_LIMITS,
  P2P_RULES,
  P2P_SOURCES,
  P2P_TIMELINE,
  P2P_VERIFIED_AT,
  UI_VALUE_DATE,
  USURY_CAPS,
  USURY_PERIOD,
  UY_CASES,
  WORLD_CASES,
  computeP2PReturn,
  minBorrowersToUseCap,
  uiToPesos,
  type P2PReturnInput,
} from '~/utils/p2pLending'
import type { BcuCapRow } from '~/utils/cashAdvance'

const localePath = useLocalePath()

// ── Los topes, del BCU de hoy y no de cuando se escribió la página ──
//
// El BCU republica esta tabla TODOS LOS MESES sobre una ventana trimestral móvil. Hasta el
// 2026-09-03 esta página publicaba 130,93 % como "vigente" mientras /ley-de-usura-uruguay mostraba
// 133,49 % leído esa misma mañana: el sitio se contradecía a sí mismo en la cifra que decide si un
// préstamo es legal. Misma clave de fetch que /adelanto-de-efectivo-tarjeta-de-credito, así que las
// dos páginas comparten la respuesta.
const { data: liveCaps } = await useFetch<{
  periodo: string
  vigenteDesde: string
  rows: BcuCapRow[]
  live: boolean
}>('/api/bcu-rates', { key: 'bcu-rates', server: true, default: () => null })

const usuryRows = computed(() => mergeUsuryCaps(USURY_CAPS, liveCaps.value?.rows))
const usuryPeriod = computed(() => liveCaps.value?.periodo || USURY_PERIOD)
/** Las dos filas que el parser del BCU no trae quedan con la lectura vieja, y hay que decirlo. */
const hasStaleRows = computed(() => usuryRows.value.some(row => !row.live))

const topeChico = computed(() => usuryCapOf(usuryRows.value, 'menor10kUI|corto|UYU'))
const topeGrande = computed(() => usuryCapOf(usuryRows.value, 'mayor10kUI|corto|UYU'))
const topeChicoLabel = computed(() => usuryPct(topeChico.value ?? 0))
const topeGrandeLabel = computed(() => usuryPct(topeGrande.value ?? 0))

const vigenteDesdeLabel = computed(() => {
  const iso = liveCaps.value?.vigenteDesde
  if (!iso) return '1º de agosto de 2026'
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
})

const faq = computed(() => buildP2pFaq(topeChicoLabel.value, topeGrandeLabel.value))
const borrowerChecklist = computed(() =>
  buildBorrowerChecklist(topeChicoLabel.value, topeGrandeLabel.value)
)

const linkAdvertencias = localePath('/advertencias-bcu')
const linkPrestamos = localePath('/prestamos-uruguay')
const linkClearing = localePath('/salir-del-clearing')
const linkSaldar = localePath('/saldar-deudas-uruguay')

const form = reactive<P2PReturnInput>({ ...P2P_CALC_DEFAULTS })

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

const result = computed(() =>
  computeP2PReturn({
    teaPct: num(form.teaPct),
    platformFeePct: num(form.platformFeePct),
    defaultPct: num(form.defaultPct),
    recoveryPct: num(form.recoveryPct),
    taxPct: num(form.taxPct),
    inflationPct: num(form.inflationPct),
  })
)

/** Rendimiento real de la Nota del Tesoro en UI adjudicada el 04/08/2026, exenta de IRPF. */
const SOVEREIGN_REAL_PCT = 2.98
const edgeVsSovereign = computed(() => result.value.netRealPct - SOVEREIGN_REAL_PCT)

const fmt = (n: number, digits: number): string =>
  n.toLocaleString('es-UY', { minimumFractionDigits: digits, maximumFractionDigits: digits })

const money = (n: number): string => fmt(n, 2)
const pct = (n: number): string => `${fmt(n, 2)}%`
const int = (n: number): string => fmt(Math.round(n), 0)
const pctPoints = (n: number): string => `${fmt(n, 1)} puntos`

const maxMintos = Math.max(...MINTOS_NET_RETURNS.map(r => Math.abs(r.pct)))
const barHeight = (v: number): string => `${Math.max(4, (Math.abs(v) / maxMintos) * 100)}%`

const dateLabel = (iso: string): string =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedLabel = dateLabel(P2P_VERIFIED_AT)
const uiLabel = dateLabel(UI_VALUE_DATE)

const canonicalUrl = 'https://cambio-uruguay.com/prestamos-p2p-uruguay'
const title = 'Préstamos peer to peer en Uruguay: cómo funcionan y qué riesgo tienen'
const description =
  'Guía de los préstamos entre personas regulados por el BCU: qué dice la Circular 2.307 artículo por artículo, los topes de UI 100.000 y UI 25.000, quién asume la mora, cuánto queda después de comisiones e IRPF, la historia de las plataformas uruguayas que no prosperaron y la comparación con plazo fijo, Notas del Tesoro, bancos y financieras.'

defineOgImageComponent('Cambio', {
  title: 'Préstamos peer to peer',
  subtitle: 'Si el deudor no paga, la pérdida es tuya',
  tag: 'CRÉDITO',
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
        'prestamos peer to peer uruguay, p2p lending uruguay, prestamos entre personas bcu, circular 2307, eappp, prestapagos, crowdlending uruguay, prestar plata con interes uruguay, invertir prestando dinero, tope de usura uruguay',
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
                name: 'Préstamos peer to peer',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faq.value.map(f => ({
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
/* Esta página declara sus propios márgenes: ver DESIGN.md, "The Text Block Owns Its Top Margin". */
.p2p-page :is(p, h1, h2, h3, ul, ol, blockquote) {
  margin-top: 0;
}

.p2p-page {
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
.measure {
  max-width: 72ch;
}

.plain-card,
.form-card,
.verdict-card,
.case-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .plain-card,
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .case-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.verdict-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.big-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.15;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}
.big-n.neg {
  color: rgb(var(--v-theme-error));
}
.stat-cap {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.65);
}
.stat-line .big-n {
  display: block;
}

.pos {
  color: rgb(var(--v-theme-success));
}
.neg {
  color: rgb(var(--v-theme-error));
}

.calc-table :deep(td) {
  font-size: 0.9rem;
}
.calc-table :deep(td.text-right) {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.calc-table :deep(.total-row td) {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.rules-panels {
  border-radius: 12px;
  overflow: hidden;
}
.art-chip {
  font-variant-numeric: tabular-nums;
}
.rule-says,
.rule-meaning,
.faq-answer,
.case-p,
.check-detail {
  font-size: 0.95rem;
  line-height: 1.6;
  max-width: 78ch;
}
.rule-quote {
  border-left: 2px solid rgba(var(--v-theme-primary), 0.5);
  padding-left: 0.9rem;
  font-style: italic;
  color: rgba(var(--v-theme-on-surface), 0.75);
  max-width: 72ch;
}

.limits-table :deep(td),
.usury-table :deep(td) {
  font-size: 0.875rem;
}
.limits-table :deep(td.text-right),
.usury-table :deep(td.text-right) {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.alt-table :deep(td) {
  font-size: 0.875rem;
  min-width: 0;
}
.cell-note {
  display: block;
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}
.alt-table :deep(.cell-num) {
  font-variant-numeric: tabular-nums;
}
.alt-table :deep(.row-hl) {
  background: rgba(var(--v-theme-primary), 0.07);
}

.src-link {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.src-link:hover {
  text-decoration: underline;
}
.in-link {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.in-link:hover {
  text-decoration: underline;
}

/* Línea de tiempo */
.timeline {
  list-style: none;
  padding: 0;
  margin: 0;
  position: relative;
}
.tl-item {
  position: relative;
  padding-left: 2rem;
  padding-bottom: 1.5rem;
  min-width: 0;
}
.tl-item::before {
  content: '';
  position: absolute;
  left: 6px;
  top: 0.4rem;
  bottom: 0;
  width: 1px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}
.tl-item:last-child::before {
  display: none;
}
.tl-dot {
  position: absolute;
  left: 0;
  top: 0.3rem;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgba(var(--v-theme-on-surface), 0.35);
}
.tone-good .tl-dot {
  border-color: rgb(var(--v-theme-success));
}
.tone-bad .tl-dot {
  border-color: rgb(var(--v-theme-error));
}
.tl-date {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgb(var(--v-theme-link));
}
.tl-label {
  font-weight: 600;
  margin-top: 2px;
}
.tl-detail {
  font-size: 0.9rem;
  line-height: 1.6;
  margin-top: 4px;
  max-width: 78ch;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.tl-src {
  font-size: 0.75rem;
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  white-space: nowrap;
}
.tl-src:hover {
  text-decoration: underline;
}

/* Mintos */
.mintos-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 0.4rem;
  align-items: end;
}
@media (max-width: 600px) {
  .mintos-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
.mintos-cell {
  min-width: 0;
  text-align: center;
}
.mintos-bar-wrap {
  height: 90px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.mintos-bar {
  width: 60%;
  min-height: 3px;
  border-radius: 4px 4px 0 0;
  background: rgba(var(--v-theme-primary), 0.75);
}
.mintos-bar.is-neg {
  background: rgb(var(--v-theme-error));
}
.mintos-val {
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
}
.mintos-year {
  font-size: 0.7rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
}

/* Checklists */
.check-item {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  margin-bottom: 1.25rem;
  min-width: 0;
}
.check-item:last-child {
  margin-bottom: 0;
}
.check-icon {
  margin-top: 3px;
  flex: 0 0 auto;
}
.check-detail {
  margin-top: 4px;
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.src-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.src-list li {
  margin-bottom: 0.7rem;
  font-size: 0.875rem;
  line-height: 1.5;
}
.src-list a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.src-list a:hover {
  text-decoration: underline;
}
.src-kind {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
