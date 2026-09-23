<template>
  <VContainer class="irpf-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">IMPUESTOS</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Declaración de IRPF: ¿tenés que presentarla y cuándo cobrás la devolución?
      </h1>
      <p class="lead mb-6">
        La propia DGI arranca aclarando que
        <strong>la mayoría de las personas no está obligada</strong>. El problema es el borde: si
        tuviste dos empleadores, si no cobraste en diciembre o si facturaste por tu cuenta, sí. Y
        hay una regla de fechas que decide si cobrás la devolución este mes o el que viene.
      </p>

      <VCard class="dates-card pa-5 pa-md-6" variant="flat">
        <div class="text-overline mb-3">
          Campaña {{ IRPF_CAMPAIGN.campaignYear }} · ingresos {{ IRPF_CAMPAIGN.incomeYear }}
        </div>
        <div class="dates-grid">
          <div class="date-item">
            <div class="date-h">Se habilita</div>
            <div class="date-n">{{ fmt(IRPF_CAMPAIGN.opens) }}</div>
            <p class="mb-0">Dependientes desde el {{ fmt(IRPF_CAMPAIGN.opensForDependents) }}.</p>
          </div>
          <div class="date-item is-deadline">
            <div class="date-h">Último día</div>
            <div class="date-n">{{ fmt(IRPF_CAMPAIGN.deadline) }}</div>
            <p class="mb-0">Después de esa fecha entra la multa por mora.</p>
          </div>
          <div class="date-item is-refund">
            <div class="date-h">Devoluciones desde</div>
            <div class="date-n">{{ fmt(IRPF_CAMPAIGN.refundsFrom) }}</div>
            <p class="mb-0">
              Y ahí entra a jugar la regla del día {{ IRPF_CAMPAIGN.refundCutoffDay }}.
            </p>
          </div>
        </div>
      </VCard>

      <!-- Respuesta primero: los tres casos con número, cada uno con su ancla. -->
      <div class="cases-grid mt-6">
        <a href="#cuanto-me-retienen" class="case-link">
          <div class="text-overline">Cuánto me retienen</div>
          <p class="mb-0">
            Nada hasta {{ formatUYU(IRPF_MNI_MONTHLY_2026, 0) }} nominales al mes (7 BPC de
            {{ formatUYU(BPC_2026, 0) }}). Arriba, la escala mensual menos el 14 % de tus aportes.
          </p>
        </a>
        <a href="#sale-negativo" class="case-link">
          <div class="text-overline">Sale negativo</div>
          <p class="mb-0">
            Es crédito a tu favor: DGI lo devuelve por banco o redes según la fecha en que
            presentaste.
          </p>
        </a>
        <a href="#debo-irpf" class="case-link">
          <div class="text-overline">Debo IRPF</div>
          <p class="mb-0">
            Cinco cuotas desde el {{ fmtDay(firstInstalmentDue) }}; vencido, multa de 5, 10 o 20 %
            más recargo mensual, y hay convenio.
          </p>
        </a>
      </div>
    </header>

    <!-- Obligation -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Estás obligado?</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Alcanza con caer en uno de estos casos.
      </p>

      <VCard variant="flat" class="ok-card pa-5 mb-5">
        <div class="d-flex align-start">
          <VIcon icon="mdi-check-circle-outline" color="success" class="mr-3 mt-1" />
          <div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">El caso más común: no</h3>
            <p class="mb-0 text-medium-emphasis">{{ NOT_OBLIGATED }}</p>
          </div>
        </div>
      </VCard>

      <VRow>
        <VCol v-for="(c, i) in OBLIGATION_CASES" :key="i" cols="12" md="6">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <VChip size="x-small" variant="tonal" :color="kindColor(c.kind)" class="mb-2">
              {{ kindLabel(c.kind) }}
            </VChip>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ c.situation }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ c.detail }}</p>
          </VCard>
        </VCol>
      </VRow>

      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        El tope de ingresos de la campaña {{ IRPF_CAMPAIGN.campaignYear }} (ingresos
        {{ IRPF_CAMPAIGN.incomeYear }}) es de {{ formatUYU(IRPF_CAMPAIGN.incomeThreshold) }}
        nominales anuales. DGI lo fija en cada campaña: para otro año, confirmalo en su resolución.
      </p>
    </section>

    <!-- Forms -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Qué formulario te toca</h2>
      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <tbody>
            <tr v-for="f in IRPF_FORMS" :key="f.code">
              <td data-label="Formulario" class="font-weight-medium form-code">{{ f.code }}</td>
              <td data-label="Para qué">{{ f.use }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- Caso 1: cuánto te retienen por mes (2026). Cifras de irpfCasos.ts, con fuente y fecha. -->
    <section id="cuanto-me-retienen" class="mb-12" aria-labelledby="cuanto-me-retienen-title">
      <h2 id="cuanto-me-retienen-title" class="text-h5 font-weight-bold mb-2">
        Cuánto IRPF te retienen por mes en 2026
      </h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        La BPC 2026 vale {{ formatUYU(BPC_2026, 0) }} (Decreto 11/026). Hasta 7 BPC nominales,
        {{ formatUYU(IRPF_MNI_MONTHLY_2026, 0) }} al mes, no hay retención. Por encima, el empleador
        aplica esta escala a la renta del mes y le resta un porcentaje de tus aportes: por eso, en
        la práctica, se empieza a pagar bastante más arriba de los
        {{ formatUYU(IRPF_MNI_MONTHLY_2026, 0) }}.
      </p>

      <VCard variant="flat" class="results-card pa-0 mb-4">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Franja mensual (BPC)</th>
              <th>En pesos de 2026</th>
              <th class="text-right">Tasa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="b in IRPF_MONTHLY_BRACKETS_2026" :key="b.fromBpc">
              <td data-label="Franja (BPC)" class="font-weight-medium">
                {{ b.toBpc === null ? `Más de ${b.fromBpc} BPC` : `${b.fromBpc} a ${b.toBpc} BPC` }}
              </td>
              <td data-label="En pesos de 2026">
                {{
                  b.to === null
                    ? `Más de ${formatUYU(b.from, 0)}`
                    : `${formatUYU(b.from, 0)} a ${formatUYU(b.to, 0)}`
                }}
              </td>
              <td data-label="Tasa" class="text-right">
                <strong>{{ b.rate }} %</strong>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-0 mb-5">
        Es una escala marginal: cada tasa se aplica sólo a la parte del sueldo que cae en su franja.
        Y hay una trampa: si la renta del mes supera {{ IRPF_SURCHARGE.aboveBpc }} BPC ({{
          formatUYU(IRPF_SURCHARGE.above2026, 0)
        }}), se le suma un {{ IRPF_SURCHARGE.pct }} % antes de aplicar la escala (Decreto 148/007,
        art. 63).
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-3">Lo que resta: las deducciones</h3>
      <p class="text-medium-emphasis mt-0 mb-4" style="max-width: 72ch">
        Las deducciones no bajan la base: se suman y sobre esa suma se aplica un
        {{ IRPF_DEDUCTION_RATE.lowPct }} % si tu nominal no supera
        {{ IRPF_DEDUCTION_RATE.thresholdBpcMonthly }} BPC ({{
          formatUYU(IRPF_DEDUCTION_RATE.thresholdMonthly2026, 0)
        }}) u {{ IRPF_DEDUCTION_RATE.highPct }} % si lo supera. Ese resultado se descuenta del
        impuesto.
      </p>
      <VRow class="mb-2">
        <VCol v-for="d in IRPF_DEDUCTIONS" :key="d.id" cols="12" md="6">
          <VCard variant="flat" class="case-card pa-4 h-100">
            <h4 class="text-subtitle-2 font-weight-bold mt-0 mb-1">{{ d.label }}</h4>
            <p class="mt-0 mb-0 text-medium-emphasis">{{ d.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-3">
        {{ IRPF_RENTAL_CREDIT_NOTE }}
      </VAlert>

      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-3">Tres sueldos, con la cuenta hecha</h3>
      <VCard variant="flat" class="results-card pa-0 mb-3">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Caso</th>
              <th class="text-right">Impuesto de escala</th>
              <th class="text-right">Crédito por deducciones</th>
              <th class="text-right">Retención del mes</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ex in examples" :key="ex.id">
              <td data-label="Caso" class="font-weight-medium">{{ ex.label }}</td>
              <td data-label="Impuesto de escala" class="text-right">
                {{ formatUYU(ex.estimate.tax, 0) }}
              </td>
              <td data-label="Crédito por deducciones" class="text-right">
                {{ formatUYU(ex.estimate.deductionsCredit, 0) }}
              </td>
              <td data-label="Retención del mes" class="text-right">
                <strong>{{ formatUYU(ex.estimate.withholding, 0) }}</strong>
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-0 mb-4" style="max-width: 80ch">
        {{ IRPF_EXAMPLE_DISCLAIMER }}
        <a :href="irpfSource('simulador').url" target="_blank" rel="noopener noreferrer">
          Simulador mensual de DGI </a
        >.
      </p>

      <VRow>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">El mes del aguinaldo</h3>
            <p class="mt-0 mb-0 text-medium-emphasis">{{ IRPF_AGUINALDO_RULE }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">El formulario 3100</h3>
            <p class="mt-0 mb-0 text-medium-emphasis">{{ IRPF_FORM_3100_RULE }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">Pedir que no te retengan</h3>
            <p class="mt-0 mb-0 text-medium-emphasis">{{ IRPF_EXCLUSION_2026.rule }}</p>
          </VCard>
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mt-4 mb-0">
        Escalas y parámetros leídos el {{ casosVerifiedAt }} en la planilla oficial de DGI, el
        simulador mensual de febrero de 2026, el Decreto 148/007 y el Comunicado R 5/2026 de BPS.
        Están todos en las fuentes del final.
      </p>
    </section>

    <!-- Refund -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">La regla que decide cuándo cobrás</h2>
      <VCard variant="flat" class="highlight-card pa-5 pa-md-6">
        <p class="text-h6 font-weight-bold mb-2">
          Presentá antes del día {{ IRPF_CAMPAIGN.refundCutoffDay }}.
        </p>
        <p class="mb-0">{{ REFUND_RULE }}</p>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-3 mb-0" style="max-width: 80ch">
        {{ IRPF_REFUND_RULE_CAVEAT }}
      </p>
    </section>

    <!-- Caso 2: sale negativo = crédito. Calendario oficial de devoluciones 2026. -->
    <section id="sale-negativo" class="mb-12" aria-labelledby="sale-negativo-title">
      <h2 id="sale-negativo-title" class="text-h5 font-weight-bold mb-2">
        Si el IRPF sale negativo: es crédito, y así se cobra
      </h2>
      <VCard variant="flat" class="ok-card pa-5 mb-5">
        <div class="d-flex align-start">
          <VIcon icon="mdi-cash-refund" color="success" class="mr-3 mt-1" />
          <p class="mt-0 mb-0">{{ IRPF_NEGATIVE_MEANING }}</p>
        </div>
      </VCard>

      <VRow class="mb-2">
        <VCol cols="12" md="6">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">
              Por qué da a favor o en contra: el ajuste de diciembre
            </h3>
            <p class="mt-0 mb-0 text-medium-emphasis">{{ IRPF_DECEMBER_ADJUSTMENT }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">
              La devolución automática de junio (sin trámite)
            </h3>
            <p class="mt-0 mb-2 text-medium-emphasis">{{ IRPF_AUTO_REFUNDS_2026.who }}</p>
            <p class="mt-0 mb-2 text-medium-emphasis">
              En 2026: consulta desde el {{ fmtDay(IRPF_AUTO_REFUNDS_2026.consultFrom) }}, banco
              desde el {{ fmtDay(IRPF_AUTO_REFUNDS_2026.bankFrom) }}, Abitab y Redpagos desde el
              {{ fmtDay(IRPF_AUTO_REFUNDS_2026.networksFrom) }}.
            </p>
            <p class="mt-0 mb-0 text-medium-emphasis">{{ IRPF_AUTO_REFUNDS_2026.excludes }}</p>
          </VCard>
        </VCol>
      </VRow>

      <h3 class="text-subtitle-1 font-weight-bold mt-5 mb-3">
        Calendario oficial de devoluciones 2026: según cuándo presentaste
      </h3>
      <p v-if="nextWindow" class="text-medium-emphasis mt-0 mb-3" style="max-width: 72ch">
        Si presentás hoy, tu corte es el {{ fmtDay(nextWindow.filedBy) }}: cobrás por banco desde el
        {{ fmtDay(nextWindow.bank) }} y en Abitab o Redpagos desde el
        {{ fmtDay(nextWindow.networks) }}.
      </p>
      <p v-else class="text-medium-emphasis mt-0 mb-3" style="max-width: 72ch">
        La tabla de 2026 terminó; DGI publica la del año siguiente al abrir la campaña.
      </p>
      <VCard variant="flat" class="results-card pa-0 mb-3">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Presentada hasta el</th>
              <th>Banco, desde el</th>
              <th>Abitab / Redpagos, desde el</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in IRPF_REFUND_CALENDAR_2026"
              :key="r.filedBy"
              :class="{ 'is-next': nextWindow && r.filedBy === nextWindow.filedBy }"
            >
              <td data-label="Presentada hasta el" class="font-weight-medium">
                {{ fmtDay(r.filedBy) }}
              </td>
              <td data-label="Banco, desde el">{{ fmtDay(r.bank) }}</td>
              <td data-label="Abitab / Redpagos, desde el">{{ fmtDay(r.networks) }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-0 mb-5">
        Tabla de DGI «Calendario de devoluciones IRPF», leída el {{ casosVerifiedAt }}. Siempre
        después de los controles de DGI, que avisa por SMS.
      </p>

      <VRow>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">Cómo se cobra</h3>
            <p class="mt-0 mb-0 text-medium-emphasis">{{ IRPF_REFUND_HOW }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">Si figura con observaciones</h3>
            <p class="mt-0 mb-2 text-medium-emphasis">{{ IRPF_REFUND_OBSERVATIONS }}</p>
            <p class="mt-0 mb-0 text-medium-emphasis">
              Consultas por WhatsApp de DGI: {{ IRPF_REFUND_WHATSAPP }}.
            </p>
          </VCard>
        </VCol>
        <VCol cols="12" md="4">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">
              Si debés IRPF de otro año, la devolución se traba
            </h3>
            <p class="mt-0 mb-0 text-medium-emphasis">{{ IRPF_COMPENSATION_RULE }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Rental credit: the 8 % everyone thinks is 6 %. -->
    <section id="credito-alquiler" class="mb-12" aria-labelledby="credito-alquiler-title">
      <h2 id="credito-alquiler-title" class="text-h5 font-weight-bold mb-2">
        Si alquilás: el crédito del {{ RENTAL_CREDIT_PCT }} %
      </h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Si sos arrendatario de tu vivienda permanente, podés imputar parte de lo que pagás de
        alquiler contra tu IRPF. El porcentaje que circula en foros y notas viejas es
        {{ RENTAL_CREDIT_PCT_HISTORIC }} %: el vigente es {{ RENTAL_CREDIT_PCT }} %.
        {{ RENTAL_CREDIT_BASIS }}
      </p>

      <VCard variant="flat" class="highlight-card pa-5 pa-md-6 mb-5">
        <p class="text-overline mb-2">Texto Ordenado 2023 de DGI, art. 51 (Título 7)</p>
        <blockquote class="rental-credit-quote mb-0">“{{ RENTAL_CREDIT_QUOTE }}”</blockquote>
      </VCard>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-1">
              ¿Y el {{ RENTAL_CREDIT_PCT_HISTORIC }} % que circula?
            </h3>
            <p class="mb-0 text-medium-emphasis">{{ RENTAL_CREDIT_CONFUSION }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-1">
              Identificar al arrendador no es lo único que hace falta
            </h3>
            <p class="mb-0 text-medium-emphasis">{{ RENTAL_CREDIT_CONDITION }}</p>
          </VCard>
        </VCol>
      </VRow>

      <h3 class="text-subtitle-1 font-weight-bold mt-5 mb-3">
        Quién puede reclamarlo, cómo, el tope y otros detalles confirmados con DGI
      </h3>
      <VCard variant="flat" class="results-card pa-0 mb-3">
        <VTable class="cu-mobile-cards" density="comfortable">
          <tbody>
            <tr v-for="item in RENTAL_CREDIT_FACTS" :key="item.heading">
              <td data-label="Punto" class="font-weight-medium">{{ item.heading }}</td>
              <td data-label="Qué dice DGI">“{{ item.quote }}”</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-0 mb-0">
        Fuente: DGI, «Crédito fiscal por arrendamiento de inmuebles en IRPF».
        <a :href="RENTAL_CREDIT_SOURCE_URL" target="_blank" rel="noopener noreferrer">
          Ver la publicación completa </a
        >.
      </p>
    </section>

    <!-- Earlier tax years: procedure review has its own date and sources. -->
    <section id="ejercicios-anteriores" class="mb-12" aria-labelledby="irpf-past-years-title">
      <h2 id="irpf-past-years-title" class="text-h5 font-weight-bold mt-0 mb-4">
        {{ pastYears.heading }}
      </h2>
      <div v-for="item in pastYears.cases" :key="item.id" class="mb-6" style="max-width: 72ch">
        <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-2">{{ item.heading }}</h3>
        <p class="mt-0 mb-2">{{ item.body }}</p>
        <a :href="IRPF_PROCEDURE_SOURCES[item.source]" target="_blank" rel="noopener noreferrer">
          {{ item.action }}
        </a>
      </div>
      <VCard variant="flat" class="highlight-card pa-5 mb-4">
        <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">
          Las dos cifras que deciden: {{ IRPF_CREDIT_CADUCITY_YEARS }} años el crédito,
          {{ IRPF_DEBT_PRESCRIPTION_YEARS }} o {{ IRPF_DEBT_PRESCRIPTION_YEARS_EXTENDED }} la deuda
        </h3>
        <p class="mt-0 mb-0">{{ IRPF_PAST_YEARS_FIGURES }}</p>
      </VCard>
      <p class="mt-0 mb-4" style="max-width: 72ch">{{ pastYears.limit }}</p>
      <p class="text-body-2 text-medium-emphasis mt-0 mb-2">
        {{ pastYears.verifiedLabel }}
        <time :datetime="IRPF_PROCEDURES_VERIFIED_AT">{{ proceduresVerifiedAt }}</time
        >.
      </p>
      <ul class="sources-list mt-0 mb-0">
        <li v-for="key in ['refunds', 'form1102'] as const" :key="key">
          <a :href="IRPF_PROCEDURE_SOURCES[key]" target="_blank" rel="noopener noreferrer">
            {{ pastYears.additionalSources[key] }}
          </a>
        </li>
      </ul>
    </section>

    <!-- Caso 3: debo IRPF. Cuotas, códigos, recargo real, convenio y la multa por presentar tarde. -->
    <section id="debo-irpf" class="mb-12" aria-labelledby="debo-irpf-title">
      <h2 id="debo-irpf-title" class="text-h5 font-weight-bold mb-2">
        Si debo IRPF: plazos, cuotas y convenio
      </h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        El saldo a pagar de la declaración del ejercicio {{ IRPF_CAMPAIGN.incomeYear }} se puede
        pagar en cinco cuotas iguales. Son los vencimientos de la Resolución DGI 2284/025 para este
        ejercicio, no un derecho permanente: una cuota vencida entra en mora.
      </p>

      <VRow class="mb-2">
        <VCol cols="12" md="5">
          <VCard variant="flat" class="results-card pa-0 h-100">
            <VTable class="cu-mobile-cards" density="comfortable">
              <thead>
                <tr>
                  <th>Cuota</th>
                  <th>Vence</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in IRPF_INSTALMENTS_2025" :key="c.n">
                  <td data-label="Cuota" class="font-weight-medium">{{ c.n }}.ª</td>
                  <td data-label="Vence">{{ fmt(c.due) }}</td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>
        <VCol cols="12" md="7">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-2">Cómo se paga</h3>
            <p class="mt-0 mb-3 text-medium-emphasis">{{ IRPF_HOW_TO_PAY }}</p>
            <ul class="mt-0 mb-0 codes-list">
              <li v-for="c in IRPF_PAYMENT_CODES" :key="c.code">
                <strong>Código {{ c.code }}</strong
                >: {{ c.use }}
              </li>
            </ul>
          </VCard>
        </VCol>
      </VRow>

      <h3 class="text-subtitle-1 font-weight-bold mt-5 mb-3">
        Ya vencido: el recargo real, mes a mes
      </h3>
      <p class="text-medium-emphasis mt-0 mb-3" style="max-width: 72ch">
        A la multa del artículo 94 (tabla de abajo) se le suma un recargo mensual, calculado día por
        día. No es una tasa fija: la fija el Poder Ejecutivo y DGI la publica cada mes.
        <template v-if="latestMora">
          En {{ latestMora.month }} de 2026 es {{ fmtPct(latestMora.pct) }} % mensual.
        </template>
      </p>
      <VCard variant="flat" class="results-card pa-0 mb-3">
        <VTable class="cu-mobile-cards" density="compact">
          <thead>
            <tr>
              <th>Mes de 2026</th>
              <th class="text-right">Recargo por mora (art. 94)</th>
              <th class="text-right">Interés de convenio (art. 33)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, i) in IRPF_MORA_RATES_2026" :key="m.month">
              <td data-label="Mes" class="font-weight-medium text-capitalize">{{ m.month }}</td>
              <td data-label="Recargo por mora" class="text-right">
                {{ m.pct === null ? 'sin publicar' : `${fmtPct(m.pct)} %` }}
              </td>
              <td data-label="Interés de convenio" class="text-right">
                {{ convenioPct(i) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <p class="text-caption text-medium-emphasis mt-0 mb-5">
        Tasas publicadas por DGI, leídas el {{ casosVerifiedAt }}; los meses «sin publicar» no
        estaban en la tabla oficial ese día. Para saber el importe exacto antes de generar el
        boleto,
        <a :href="irpfSource('calculadora-recargos').url" target="_blank" rel="noopener noreferrer">
          DGI tiene una calculadora oficial de multas y recargos </a
        >.
      </p>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="highlight-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">
              No podés pagar todo: convenio con {{ IRPF_CONVENIO.minUpfrontPct }} % de entrega
            </h3>
            <p class="mt-0 mb-2 text-medium-emphasis">{{ IRPF_CONVENIO.rule }}</p>
            <p class="mt-0 mb-0 text-medium-emphasis">Dónde: {{ IRPF_CONVENIO.where }}.</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="case-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mt-0 mb-1">
              Presentar tarde tiene su propia multa:
              {{ formatUYU(IRPF_LATE_FILING_FINE.amount, 0) }}
            </h3>
            <p class="mt-0 mb-2 text-medium-emphasis">{{ IRPF_LATE_FILING_FINE.rule }}</p>
            <p class="mt-0 mb-0 text-medium-emphasis">{{ IRPF_DGI_WHATSAPP_RULE }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Mora -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Si te da a pagar y llegás tarde</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        La mora se configura <strong>por el solo vencimiento del plazo</strong>: no hace falta que
        DGI te intime ni que te enteres. La multa escala con el atraso.
      </p>
      <VCard variant="flat" class="results-card pa-0">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Cuándo pagás</th>
              <th class="text-right">Multa</th>
              <th>Detalle</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in MORA_TIERS" :key="t.pct">
              <td data-label="Cuándo pagás">{{ t.when }}</td>
              <td data-label="Multa" class="text-right">
                <strong>{{ t.pct }} %</strong>
              </td>
              <td data-label="Detalle" class="text-medium-emphasis">{{ t.detail }}</td>
            </tr>
            <tr>
              <td data-label="Cuándo pagás">Si pedís facilidades de pago</td>
              <td data-label="Multa" class="text-right">
                <strong>{{ MORA_FACILIDADES_PCT }} %</strong>
              </td>
              <td data-label="Detalle" class="text-medium-emphasis">
                En cualquier momento dentro del plazo establecido.
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        {{ RECARGOS_RULE }}
      </VAlert>
      <VAlert type="success" variant="tonal" density="comfortable" class="mt-3">
        {{ GOOD_HISTORY_RELIEF }}
      </VAlert>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in faq" :key="f.question">
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

    <!-- Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath('/guias/como-funciona-el-irpf-uruguay')" variant="tonal" size="small">
          Cómo funciona el IRPF
        </VBtn>
        <VBtn :to="localePath('/herramientas/calculadora-irpf')" variant="tonal" size="small">
          Calculadora de IRPF
        </VBtn>
        <VBtn
          :to="localePath('/prescripcion-de-deudas-con-el-estado-uruguay')"
          variant="tonal"
          size="small"
        >
          ¿Prescriben las deudas con el Estado?
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }}. Esta página es informativa: lo que resuelve DGI es lo que
        vale.
      </p>
      <ul class="sources-list">
        <li v-for="s in DGI_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
      <p class="text-body-2 text-medium-emphasis mt-4 mb-3">
        Las cifras de retención, devoluciones, cuotas, recargos y convenio se leyeron el
        {{ casosVerifiedAt }} en estas publicaciones:
      </p>
      <ul class="sources-list">
        <li v-for="s in IRPF_CASOS_SOURCES" :key="s.id">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span class="text-medium-emphasis"> ({{ s.publisher }})</span>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatUYU, SITE_TIME_ZONE } from '~/utils/format'
import {
  BPC_2026,
  estimateMonthlyWithholding,
  IRPF_AGUINALDO_RULE,
  IRPF_AUTO_REFUNDS_2026,
  IRPF_CASOS_FAQ,
  IRPF_CASOS_SOURCES,
  IRPF_CASOS_VERIFIED_AT,
  IRPF_COMPENSATION_RULE,
  IRPF_CONVENIO,
  IRPF_CONVENIO_RATES_2026,
  IRPF_CREDIT_CADUCITY_YEARS,
  IRPF_DEBT_PRESCRIPTION_YEARS,
  IRPF_DEBT_PRESCRIPTION_YEARS_EXTENDED,
  IRPF_DECEMBER_ADJUSTMENT,
  IRPF_DEDUCTION_RATE,
  IRPF_DEDUCTIONS,
  IRPF_DGI_WHATSAPP_RULE,
  IRPF_EXAMPLE_DISCLAIMER,
  IRPF_EXAMPLES,
  IRPF_EXCLUSION_2026,
  IRPF_FORM_3100_RULE,
  IRPF_HOW_TO_PAY,
  IRPF_INSTALMENTS_2025,
  IRPF_LATE_FILING_FINE,
  IRPF_MNI_MONTHLY_2026,
  IRPF_MONTHLY_BRACKETS_2026,
  IRPF_MORA_RATES_2026,
  IRPF_NEGATIVE_MEANING,
  IRPF_PAST_YEARS_FIGURES,
  IRPF_PAYMENT_CODES,
  IRPF_REFUND_CALENDAR_2026,
  IRPF_REFUND_HOW,
  IRPF_REFUND_OBSERVATIONS,
  IRPF_REFUND_RULE_CAVEAT,
  IRPF_REFUND_WHATSAPP,
  IRPF_RENTAL_CREDIT_NOTE,
  IRPF_SURCHARGE,
  irpfSource,
  latestPublishedRate,
  nextRefundWindow,
} from '~/utils/irpfCasos'
import {
  DGI_FAQ,
  DGI_SOURCES,
  DGI_VERIFIED_AT,
  GOOD_HISTORY_RELIEF,
  IRPF_CAMPAIGN,
  IRPF_FORMS,
  IRPF_PROCEDURES_VERIFIED_AT,
  IRPF_PROCEDURE_SOURCES,
  irpfPastYearsCopy,
  MORA_FACILIDADES_PCT,
  MORA_TIERS,
  NOT_OBLIGATED,
  OBLIGATION_CASES,
  RECARGOS_RULE,
  REFUND_RULE,
  RENTAL_CREDIT_BASIS,
  RENTAL_CREDIT_CONDITION,
  RENTAL_CREDIT_CONFUSION,
  RENTAL_CREDIT_FACTS,
  RENTAL_CREDIT_PCT,
  RENTAL_CREDIT_PCT_HISTORIC,
  RENTAL_CREDIT_QUOTE,
  RENTAL_CREDIT_SOURCE_URL,
  type FilerKind,
} from '~/utils/dgiTaxes'

const localePath = useLocalePath()
const { locale } = useI18n()
const pastYears = computed(() => irpfPastYearsCopy(locale.value))
const proceduresVerifiedAt = computed(() =>
  new Date(IRPF_PROCEDURES_VERIFIED_AT).toLocaleDateString(dateLocale(locale.value), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
)

/**
 * Esta página responde el trámite; la prescripción vive en su propia página. Las cinco preguntas
 * de los casos con número van primero: son las consultas que traen a la página.
 */
const faq = [
  ...IRPF_CASOS_FAQ,
  ...DGI_FAQ.filter(f => !/prescrib|patente vieja|interrumpe/i.test(f.question)),
]

/** Los ejemplos se calculan acá, con la misma función que prueba el test del módulo. */
const examples = IRPF_EXAMPLES.map(ex => ({
  ...ex,
  estimate: estimateMonthlyWithholding(ex.nominal, ex.options),
}))

const firstInstalmentDue = IRPF_INSTALMENTS_2025[0]!.due
const latestMora = latestPublishedRate(IRPF_MORA_RATES_2026)

/**
 * El día de hoy en Montevideo, serializado desde el servidor para que el cliente hidrate la
 * misma fila resaltada aunque cruce la medianoche entre una cosa y la otra.
 */
const today = useState('irpf-today', () =>
  new Date().toLocaleDateString('en-CA', { timeZone: SITE_TIME_ZONE })
)
const nextWindow = computed(() => nextRefundWindow(today.value))

const fmtPct = (pct: number) =>
  pct.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const convenioPct = (i: number) => {
  const pct = IRPF_CONVENIO_RATES_2026[i]?.pct ?? null
  return pct === null ? 'sin publicar' : `${fmtPct(pct)} %`
}

const kindLabel = (k: FilerKind) =>
  k === 'dependiente'
    ? 'Dependiente'
    : k === 'independiente'
      ? 'Independiente'
      : 'Rentas de capital'
const kindColor = (k: FilerKind) =>
  k === 'dependiente' ? 'primary' : k === 'independiente' ? 'warning' : 'info'

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', { day: 'numeric', month: 'long', timeZone: 'UTC' })
const verifiedAt = fmt(DGI_VERIFIED_AT)
const casosVerifiedAt = fmt(IRPF_CASOS_VERIFIED_AT)

const canonicalUrl = 'https://cambio-uruguay.com/declaracion-de-irpf-uruguay'
const title = 'IRPF 2026: cuánto te retienen y quién debe'
const description =
  'Con la BPC de $ 6.864 no te retienen hasta $ 48.048 al mes. Si la declaración da negativo es devolución; si da a pagar, 5 cuotas, mora y convenio con DGI.'

defineOgImageComponent('Cambio', {
  title: 'IRPF 2026: cuánto te retienen',
  subtitle: 'Escala mensual, saldo a favor o a pagar, cuotas y devolución',
  tag: 'IMPUESTOS',
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
        'declaracion jurada irpf uruguay, quienes estan obligados irpf, formulario 1102, formulario 1103, formulario 1101, devolucion irpf cuando cobro, irpf dos empleadores, formulario 3100, multa por mora dgi, articulo 94 codigo tributario, campaña irpf 2026, credito fiscal alquiler, irpf alquiler, deducir alquiler irpf, 8 por ciento alquiler irpf, arrendamiento irpf, cuanto irpf me tienen que quitar, cuanto me descuentan de irpf, escala irpf 2026, bpc 2026, minimo no imponible irpf, que pasa si el irpf sale negativo, irpf negativo, que pasa si debo irpf, cuotas irpf dgi, convenio dgi irpf, recargo por mora dgi, puedo cobrar irpf de años anteriores, devolucion irpf años anteriores',
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
              { '@type': 'ListItem', position: 2, name: 'Declaración de IRPF', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faq.map(f => ({
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
#ejercicios-anteriores,
#cuanto-me-retienen,
#sale-negativo,
#debo-irpf {
  scroll-margin-top: 5rem;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}
.case-link {
  display: block;
  padding: 1rem 1.25rem;
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-primary), 0.35);
  background: rgba(var(--v-theme-primary), 0.06);
  color: inherit;
  text-decoration: none;
  line-height: 1.5;
}
.case-link:hover,
.case-link:focus-visible {
  border-color: rgba(var(--v-theme-primary), 0.8);
}
.case-link .text-overline {
  color: rgb(var(--v-theme-primary));
  line-height: 1.6;
  margin-bottom: 0.25rem;
}
.case-link p {
  margin-top: 0;
  font-size: 0.95rem;
}

.codes-list {
  padding-left: 1.1rem;
  line-height: 1.7;
}
.codes-list li {
  margin-top: 0.25rem;
}

.is-next td {
  background: rgba(var(--v-theme-success), 0.1);
}

.irpf-page {
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

.dates-card,
.results-card,
.case-card,
.ok-card,
.highlight-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .dates-card,
.v-theme--light .results-card,
.v-theme--light .case-card,
.v-theme--light .ok-card,
.v-theme--light .highlight-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.ok-card {
  border-color: rgba(var(--v-theme-success), 0.45);
}
.highlight-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.dates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
}
.date-h {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.65;
}
.date-n {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.3;
  margin-bottom: 0.25rem;
}
.date-item.is-deadline .date-n {
  color: rgb(var(--v-theme-warning));
}
.date-item.is-refund .date-n {
  color: rgb(var(--v-theme-success));
}

.form-code {
  font-variant-numeric: tabular-nums;
}

.rental-credit-quote {
  margin: 0;
  padding-left: 1rem;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  font-size: 1.05rem;
  font-style: italic;
  line-height: 1.6;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}
</style>
