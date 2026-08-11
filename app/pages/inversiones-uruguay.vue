<template>
  <div class="inversiones-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/herramientas')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Herramientas
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-inversiones pa-6 on-dark">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-chart-line</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Dónde invertir en Uruguay: bancos, brokers, renta fija y cripto
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 inversiones-intro">
              Guía comparativa de cuentas de inversión en bancos, fintech, brokers internacionales,
              renta fija local, fondos de inversión y criptomonedas disponibles desde Uruguay.
              Riesgos, mínimos, comisiones, regulación e impuestos. Datos verificados en julio de
              2026.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons
            text="Dónde invertir en Uruguay: guía completa de bancos, brokers, renta fija y cripto"
          />
        </div>
      </div>
    </VCard>

    <!-- Risk framework -->
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-4" icon="mdi-scale-balance">
      Cada opción de esta guía tiene un <strong>riesgo</strong> y una
      <strong>regulación</strong> distintos: <strong>Bajo</strong> (capital e interés pactado sin
      exposición a variaciones de mercado, como el plazo fijo o las Letras del BCU),
      <strong>Medio/Variable</strong> (fondos y carteras de bonos/acciones cuyo valor fluctúa según
      el instrumento elegido) y <strong>Alto</strong> (acciones, ETFs y criptomonedas, cuyo valor
      puede subir o bajar significativamente). En regulación distinguimos entre entidades
      <strong>supervisadas por el BCU</strong> como banco o corredor de bolsa local, entidades
      <strong>reguladas en el exterior</strong> (sin protección del BCU) y proveedores
      <strong>no regulados</strong> localmente (como la mayoría de los exchanges de cripto). Ni
      todos los bancos que ofrecen inversiones están inscriptos como corredores de bolsa ante el
      BCU: revisá la columna "Regulación" de cada fila antes de decidir.
    </VAlert>

    <!-- Comparison groups -->
    <div v-for="group in groups" :key="group.category" class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-3 inversiones-group-title">
        <VIcon start size="small" color="primary">{{ groupIcon(group.category) }}</VIcon>
        {{ group.label }}
      </h2>

      <VCard class="inversiones-card pa-4 pa-sm-6">
        <!-- Desktop: table -->
        <div class="d-none d-md-block">
          <VTable density="comfortable" class="inversiones-table cu-mobile-cards">
            <thead>
              <tr>
                <th>Entidad</th>
                <th>Riesgo</th>
                <th class="text-right">Mín. inversión</th>
                <th>Regulación</th>
                <th>Comisiones</th>
                <th>Sitio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in group.items" :key="i.id">
                <td class="font-weight-medium" data-label="">{{ i.name }}</td>
                <td data-label="Riesgo">{{ riskLabel(i.riskLevel) }}</td>
                <td class="text-right" data-label="Mín. inversión">{{ minInvestmentLabel(i) }}</td>
                <td data-label="Regulación">
                  <span class="inversiones-note">{{ i.regulationNote }}</span>
                </td>
                <td data-label="Comisiones">
                  <span class="inversiones-note">{{ i.feesNote }}</span>
                </td>
                <td data-label="Sitio">
                  <a
                    :href="i.website"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inversiones-link"
                  >
                    {{ hostOf(i.website) }}
                  </a>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>

        <!-- Mobile: stacked cards -->
        <div class="d-md-none">
          <div v-for="i in group.items" :key="i.id" class="investment-card">
            <div class="d-flex align-center justify-space-between ga-2 mb-1">
              <span class="text-subtitle-1 font-weight-bold">{{ i.name }}</span>
              <span class="investment-risk">{{ riskLabel(i.riskLevel) }}</span>
            </div>
            <dl class="investment-specs">
              <div>
                <dt>Mín. inversión</dt>
                <dd>{{ minInvestmentLabel(i) }}</dd>
              </div>
              <div>
                <dt>Regulación</dt>
                <dd>{{ regulationBadge(i.regulation) }}</dd>
              </div>
            </dl>
            <p class="text-caption text-grey-lighten-1 mb-1">Regulación:</p>
            <p class="text-body-2 mb-2 inversiones-note">{{ i.regulationNote }}</p>
            <p class="text-caption text-grey-lighten-1 mb-1">Comisiones:</p>
            <p class="text-body-2 mb-2 inversiones-note">{{ i.feesNote }}</p>
            <a
              :href="i.website"
              target="_blank"
              rel="noopener noreferrer"
              class="inversiones-link text-caption"
            >
              {{ hostOf(i.website) }}
            </a>
          </div>
        </div>
      </VCard>
    </div>

    <!-- Gletir deep dive -->
    <VCard
      id="gletir"
      variant="flat"
      class="inversiones-section gletir-assessment mb-6 pa-5 pa-sm-6"
    >
      <div class="d-flex align-start justify-space-between flex-wrap ga-3 mb-3">
        <div>
          <p class="text-overline text-primary font-weight-bold mb-1">Análisis del intermediario</p>
          <h2 class="text-h6 font-weight-bold mb-1 inversiones-group-title">
            ¿Qué tan seguro es invertir mediante Gletir?
          </h2>
          <p class="text-caption text-medium-emphasis mb-0">
            Evidencia revisada al {{ GLETIR_SAFETY_ANALYSIS.updatedAt }}
          </p>
        </div>
        <VChip color="warning" variant="tonal" prepend-icon="mdi-shield-half-full">
          {{ GLETIR_SAFETY_ANALYSIS.verdict }}
        </VChip>
      </div>

      <p class="text-body-2 mb-4">{{ GLETIR_SAFETY_ANALYSIS.summary }}</p>

      <VRow dense class="mb-4">
        <VCol
          v-for="dimension in GLETIR_SAFETY_ANALYSIS.dimensions"
          :key="dimension.label"
          cols="12"
          sm="6"
          lg="3"
        >
          <div class="gletir-score-card h-100">
            <div class="d-flex align-center justify-space-between ga-2 mb-2">
              <strong class="text-body-2">{{ dimension.label }}</strong>
              <VChip :color="dimension.color" variant="tonal" size="x-small">
                {{ dimension.assessment }}
              </VChip>
            </div>
            <p class="text-caption mb-0 gletir-detail">{{ dimension.detail }}</p>
          </div>
        </VCol>
      </VRow>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mb-4" icon="mdi-gavel">
        <strong>La sanción relevante:</strong> en junio de 2025 el BCU multó a Gletir con UI 150.000
        por incumplimientos detectados en una revisión de 2024. No fue una declaración de
        insolvencia ni una baja de licencia: Gletir continúa activa y la resolución recoge medidas
        correctivas. Sí es una señal que debe pesar en la evaluación, porque las fallas incluyeron
        información al inversor, perfiles de riesgo, registros, custodias y controles.
      </VAlert>

      <VRow>
        <VCol cols="12" md="6">
          <h3 class="text-subtitle-2 font-weight-bold mb-2">
            <VIcon start size="small" color="success">mdi-check-circle-outline</VIcon>
            Qué juega a favor
          </h3>
          <ul class="gletir-list">
            <li v-for="item in GLETIR_SAFETY_ANALYSIS.positives" :key="item">{{ item }}</li>
          </ul>
        </VCol>
        <VCol cols="12" md="6">
          <h3 class="text-subtitle-2 font-weight-bold mb-2">
            <VIcon start size="small" color="warning">mdi-alert-circle-outline</VIcon>
            Qué obliga a ser cauteloso
          </h3>
          <ul class="gletir-list">
            <li v-for="item in GLETIR_SAFETY_ANALYSIS.cautions" :key="item">{{ item }}</li>
          </ul>
        </VCol>
      </VRow>

      <div class="gletir-costs mt-2 mb-4 pa-4">
        <h3 class="text-subtitle-2 font-weight-bold mb-1">
          Costos: competitivos en servicio local, caros para órdenes pequeñas
        </h3>
        <p class="text-caption text-medium-emphasis mb-3">
          Para acciones o ETFs de EE.UU. con precio superior a USD 5, la cartilla cobra 0,75% con
          mínimo de USD 10 <strong>en cada operación</strong>. Ejemplos antes de otros cargos:
        </p>
        <div class="d-flex flex-wrap ga-2">
          <VChip
            v-for="example in GLETIR_SAFETY_ANALYSIS.costExamples"
            :key="example.orderAmount"
            variant="outlined"
            size="small"
          >
            Orden {{ formatUsd(example.orderAmount) }} → comisión
            {{ formatUsd(example.commission) }} ({{ example.effectiveRate }})
          </VChip>
        </div>
        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          Comprar y luego vender duplica esos porcentajes: una orden de USD 500 enfrenta 4% de ida y
          vuelta solo por comisión; una de USD 10.000, 1,5%. Pueden sumarse conversión de moneda,
          aranceles de mercado, custodio e impuestos.
        </p>
      </div>

      <h3 class="text-subtitle-2 font-weight-bold mb-2">Antes de transferir un monto importante</h3>
      <ol class="gletir-list mb-4">
        <li v-for="item in GLETIR_SAFETY_ANALYSIS.checklist" :key="item">{{ item }}</li>
      </ol>

      <details class="gletir-sources">
        <summary class="text-body-2 font-weight-bold">
          Ver fuentes primarias de este análisis
        </summary>
        <ul class="inversiones-sources mt-2">
          <li v-for="source in GLETIR_SAFETY_ANALYSIS.sources" :key="source.url">
            <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
          </li>
        </ul>
      </details>
    </VCard>

    <!-- Custodia e insolvencia del intermediario -->
    <VCard
      id="custodia"
      variant="flat"
      class="inversiones-section custodia-section mb-6 pa-5 pa-sm-6"
    >
      <div class="d-flex align-start justify-space-between flex-wrap ga-3 mb-3">
        <div>
          <p class="text-overline text-primary font-weight-bold mb-1">Custodia e insolvencia</p>
          <h2 class="text-h6 font-weight-bold mb-1 inversiones-group-title">
            Si el corredor quiebra, ¿qué pasa con mis títulos?
          </h2>
          <p class="text-caption text-medium-emphasis mb-0">
            Normas contrastadas al {{ custodyVerifiedAt }}
          </p>
        </div>
        <VChip color="info" variant="tonal" prepend-icon="mdi-scale-balance">
          Separación patrimonial, no seguro
        </VChip>
      </div>

      <p class="text-body-2 mb-4">{{ CUSTODY_INSOLVENCY.thesis }}</p>

      <VAlert
        type="error"
        variant="tonal"
        density="comfortable"
        class="mb-4"
        icon="mdi-shield-off-outline"
      >
        <strong>No existe un COPAB para inversiones.</strong> El Fondo de Garantía de Depósitos
        Bancarios cubre depósitos en bancos y cooperativas de intermediación financiera, hasta el
        equivalente a USD 10.000 en moneda extranjera y UI 250.000 en moneda nacional por persona y
        por institución. Ni valores, ni cuotapartes de fondos, ni el efectivo que tenés en un
        corredor de bolsa. Y en Uruguay <strong>no consta</strong> que exista un fondo de
        compensación al inversor equivalente al SIPC de Estados Unidos.
      </VAlert>

      <h3 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="success">mdi-lock-check-outline</VIcon>
        Lo que sí te protege
      </h3>
      <VRow dense class="mb-4">
        <VCol v-for="rule in CUSTODY_INSOLVENCY.protections" :key="rule.title" cols="12" md="6">
          <div class="custodia-card h-100">
            <strong class="text-body-2 d-block mb-1">{{ rule.title }}</strong>
            <p class="text-caption mb-2 gletir-detail">{{ rule.detail }}</p>
            <span class="text-caption text-medium-emphasis font-weight-bold">{{
              rule.source
            }}</span>
          </div>
        </VCol>
      </VRow>

      <h3 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="warning">mdi-ruler</VIcon>
        Hasta dónde llega
      </h3>
      <VRow dense class="mb-4">
        <VCol v-for="rule in CUSTODY_INSOLVENCY.limits" :key="rule.title" cols="12" md="6">
          <div class="custodia-card h-100">
            <strong class="text-body-2 d-block mb-1">{{ rule.title }}</strong>
            <p class="text-caption mb-2 gletir-detail">{{ rule.detail }}</p>
            <span class="text-caption text-medium-emphasis font-weight-bold">{{
              rule.source
            }}</span>
          </div>
        </VCol>
      </VRow>

      <h3 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="error">mdi-close-circle-outline</VIcon>
        Lo que la gente busca y no existe
      </h3>
      <div class="mb-4">
        <div
          v-for="absence in CUSTODY_INSOLVENCY.absences"
          :key="absence.missing"
          class="custodia-absence"
        >
          <p class="text-body-2 font-weight-bold mb-1">{{ absence.missing }}</p>
          <p class="text-body-2 mb-1 gletir-detail">{{ absence.instead }}</p>
          <span class="text-caption text-medium-emphasis font-weight-bold">{{
            absence.source
          }}</span>
        </div>
      </div>

      <h3 class="text-subtitle-2 font-weight-bold mb-2">
        Cómo probarías que esos títulos son tuyos
      </h3>
      <ol class="gletir-list mb-4">
        <li v-for="item in CUSTODY_INSOLVENCY.checklist" :key="item">{{ item }}</li>
      </ol>

      <details class="gletir-sources">
        <summary class="text-body-2 font-weight-bold">
          Ver fuentes primarias de esta sección
        </summary>
        <ul class="inversiones-sources mt-2">
          <li v-for="source in CUSTODY_INSOLVENCY.sources" :key="source.url">
            <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
          </li>
        </ul>
      </details>
    </VCard>

    <!-- AFAP editorial section -->
    <VCard variant="flat" class="inversiones-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 inversiones-group-title">
        <VIcon start size="small" color="primary">mdi-piggy-bank-outline</VIcon>
        AFAP: el ahorro previsional obligatorio
      </h2>
      <p class="text-body-2 mb-3">
        Además de las inversiones voluntarias de esta guía, Uruguay tiene un pilar de ahorro
        previsional obligatorio administrado por AFAPs (Administradoras de Fondos de Ahorro
        Previsional). Hay <strong>4 AFAP habilitadas</strong>: República AFAP (estatal), AFAP SURA,
        AFAP Itaú (antes "Unión Capital AFAP") e Integración AFAP.
      </p>
      <p class="text-body-2 mb-3">
        Ojo con el corte por generación, que casi siempre se cuenta mal: el reparto obligatorio
        entre BPS y AFAP desde el primer peso rige para quienes
        <strong>ingresaron por primera vez al mercado de trabajo</strong> a partir de la vigencia
        del Sistema Previsional Común de la Ley 20.130 (2023). A quien ya estaba afiliado antes le
        siguen rigiendo los artículos 7 y 8 de la Ley 16.713, con sus topes por franja y la opción
        de aportar a una AFAP por debajo del primer tope. Podés elegir libremente tu AFAP dentro de
        los primeros 3 meses de aportación; si no elegís, BPS te asigna una de oficio. Para
        cambiarte de AFAP (traspaso) se requiere un mínimo de 6 meses de permanencia en la
        administradora actual antes de poder transferirte de nuevo.
      </p>
      <p class="text-body-2 mb-0">
        Los rendimientos de los fondos de las AFAP están exonerados de impuestos. Para el detalle de
        porcentajes de aporte y bandas salariales vigentes, consultá directamente
        <a
          href="https://www.bps.gub.uy"
          target="_blank"
          rel="noopener noreferrer"
          class="inversiones-link"
          >bps.gub.uy</a
        >
        o el sitio de tu AFAP, ya que las cifras se indexan cada año.
      </p>
    </VCard>

    <!-- Inmobiliario editorial section -->
    <VCard variant="flat" class="inversiones-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 inversiones-group-title">
        <VIcon start size="small" color="primary">mdi-home-city-outline</VIcon>
        Inmobiliario
      </h2>
      <p class="text-body-2 mb-3">
        Invertir en un inmueble para alquilar es una alternativa tradicional en Uruguay, pero
        requiere un capital inicial considerablemente mayor que cualquier otra opción de esta guía
        (compra del inmueble, impuestos de compraventa, escribano y gastos de mantenimiento), además
        de menor liquidez: vender un inmueble puede tomar meses.
      </p>
      <p class="text-body-2 mb-0">
        No encontramos evidencia de que exista actualmente una plataforma de
        <em>crowdfunding</em> inmobiliario específica de Uruguay en funcionamiento; si estás
        evaluando una plataforma que promete fraccionar la inversión en inmuebles, verificá primero
        su regulación y trayectoria antes de destinarle dinero.
      </p>
    </VCard>

    <!-- Impuestos editorial section -->
    <VCard variant="flat" class="inversiones-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 inversiones-group-title">
        <VIcon start size="small" color="primary">mdi-file-percent-outline</VIcon>
        Impuestos sobre las inversiones
      </h2>
      <p class="text-body-2 mb-3">
        Los residentes fiscales uruguayos pagan
        <strong>IRPF Categoría I sobre las rentas de capital</strong> (intereses, dividendos,
        alquileres y ganancias de capital) a una tasa general del <strong>12%</strong> (los
        dividendos de fuente uruguaya, al 7%). Los depósitos a plazo tienen tasas reducidas según
        moneda y plazo: en <strong>pesos</strong> no indexados, 5,5% (hasta 1 año), 2,5% (de 1 a 3
        años) y 0,5% (más de 3 años); en <strong>UI</strong>, 10%, 7% y 5%; en
        <strong>moneda extranjera</strong>, 12% hasta 1 año, 12% de 1 a 3 años y 7% a más de 3 años.
        Al <strong>vender valores</strong>, el régimen por defecto es el <strong>real</strong>: 12%
        sobre la ganancia (precio de venta menos costo fiscal actualizado). La base ficta del 20%
        del precio (≈ 2,4% efectivo) <strong>no es la regla general</strong>: es obligatoria solo
        cuando no se puede probar el costo, y opcional en casos puntuales (bienes anteriores a la
        Ley 18.083 y, desde 2026, bienes en el exterior).
      </p>
      <p class="text-body-2 mb-3">
        Desde el 1° de enero de 2026, la Ley de Presupuesto (20.446) extendió el IRPF a las rentas y
        <strong>ganancias de capital de fuente extranjera</strong> que antes no estaban gravadas
        —relevante para quienes invierten con brokers internacionales como eToro o XTB—. La
        <strong>tasa es 12%</strong>. El <strong>8% no es una tasa</strong>: es una
        <strong>retención reducida</strong> que solo puede aplicar una entidad uruguaya que
        intermedie y además <strong>ejerza la custodia</strong> de esos activos (un bróker/custodio
        local), y es definitiva únicamente <strong>si el contribuyente opta</strong> por tomarla
        como tal. Operando directo con un bróker del exterior
        <strong>no hay retención uruguaya</strong>: corresponden
        <strong>anticipos semestrales</strong> al 12% o declaración jurada (Formulario 1101). El
        dato más valioso de la reforma es el <strong>step-up al 31/12/2025</strong>: para activos
        que coticen en bolsas de reconocido prestigio y hayas comprado antes de esa fecha, el costo
        fiscal es su <strong>cotización al 31/12/2025</strong>, así que toda la apreciación anterior
        a 2026 queda fuera del impuesto. Los no residentes tributan IRNR, generalmente también al
        12%.
      </p>
      <p class="text-body-2 mb-0">
        Existe una <strong>exoneración confirmada</strong>: la deuda pública uruguaya (Bonos del
        Tesoro, Letras de Tesorería, Letras de Regulación Monetaria del BCU y Bonos Globales en UI)
        está exenta de IRPF y de Impuesto al Patrimonio, tanto para residentes como para no
        residentes —y no solo el interés: el Título 7, art. 38 lit. A exonera también la ganancia de
        capital por transferirlos—. Los rendimientos de los fondos de las AFAP también están
        exonerados. La <strong>cripto</strong>, en cambio, es una zona gris: no hay norma tributaria
        específica (la Ley 20.345 regula a los proveedores, no la tributación) y ni el Decreto
        95/026 ni la Resolución DGI 1517/2026 la mencionan, así que
        <strong>no publicamos un porcentaje</strong> para ella. Estas reglas tienen matices por
        instrumento y situación personal: <strong>consultá siempre con un contador</strong> antes de
        declarar.
      </p>
      <VBtn
        :to="localePath('/impuestos-inversiones-uruguay')"
        variant="text"
        color="primary"
        class="px-0 mt-3"
      >
        <VIcon start size="small">mdi-file-percent-outline</VIcon>
        Ver la guía completa: impuestos sobre inversiones en Uruguay
      </VBtn>

      <!-- El IRPF es sólo un eslabón: entre el giro, los corresponsales, la comisión del bróker
           y la retención estadounidense sobre los dividendos, el rendimiento que llega a tu
           cuenta no es el que publica el fondo. -->
      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-swap-vertical-circle-outline"
      >
        <p class="mb-2">
          <strong>El impuesto uruguayo es sólo un eslabón.</strong> Si invertís afuera, entre el
          giro de ida, la cadena de bancos corresponsales, la comisión del bróker, la retención
          estadounidense sobre los dividendos y el giro de vuelta, lo que te llega a la cuenta no es
          el rendimiento que publica el fondo.
        </p>
        <VBtn
          :to="localePath('/herramientas/costo-real-de-invertir-afuera')"
          variant="text"
          color="primary"
          class="px-0"
        >
          <VIcon start size="small">mdi-calculator-variant-outline</VIcon>
          Calcular el costo real de invertir afuera, ida y vuelta
        </VBtn>
      </VAlert>
    </VCard>

    <!-- Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-alert-outline"
    >
      Esta guía es
      <strong>informativa y no constituye asesoramiento financiero, legal ni tributario</strong>; no
      tenemos afiliación con las entidades listadas. Las opciones cubren niveles de riesgo muy
      distintos: desde el plazo fijo bancario y las Letras del BCU (riesgo bajo, cercano al de un
      depósito garantizado por el sistema financiero) hasta acciones, ETFs y criptomonedas (riesgo
      alto, con posibilidad real de pérdida de capital). También difieren en regulación: algunas
      entidades están <strong>supervisadas por el BCU</strong> como banco o corredor de bolsa local,
      otras están <strong>reguladas únicamente en el exterior</strong> (sin protección del BCU si
      algo sale mal) y otras —como la mayoría de los exchanges de cripto— operan
      <strong>sin regulación local específica</strong> más allá de las obligaciones de prevención de
      lavado de activos. Verificá siempre la regulación, las comisiones vigentes y los mínimos
      actualizados directamente en el sitio de cada entidad antes de invertir, y recordá que
      rentabilidades pasadas no garantizan resultados futuros.
    </VAlert>

    <!-- Sources -->
    <VCard variant="flat" class="inversiones-section mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes y referencias
      </h2>
      <ul class="inversiones-sources">
        <li v-for="(src, i) in officialSources" :key="'o' + i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </VCard>

    <!-- Related guides -->
    <VRow class="my-6">
      <VCol cols="12" md="6">
        <VCard
          :to="localePath('/invertir-en-proyectos-uruguayos')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-sprout-outline</VIcon>
          <h2 class="text-subtitle-1 font-weight-bold mb-1">Invertir en proyectos uruguayos</h2>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Crowdfunding, obligaciones negociables, fideicomisos de forestación e infraestructura,
            agro, inmobiliario y startups: cómo poner tu dinero en la economía real de Uruguay.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard
          :to="localePath('/salud-financiera')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
          <h2 class="text-subtitle-1 font-weight-bold mb-1">Salud financiera e ingresos extra</h2>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Antes de invertir, ordená tus finanzas: hacé el diagnóstico de salud financiera y mirá
            ideas para generar ingresos extra en Uruguay.
          </p>
        </VCard>
      </VCol>
    </VRow>

    <!-- Learn-to-invest guides + external educational resources -->
    <VCard variant="flat" class="inversiones-section mt-4 pa-5 pa-sm-6">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-school-outline</VIcon>
        Aprender a invertir: guías y recursos
      </h2>
      <p class="text-body-2 text-grey-lighten-1 mb-3">
        Antes de elegir un instrumento conviene entender lo básico. Estas guías te explican paso a
        paso cómo funciona invertir en Uruguay, sin tecnicismos:
      </p>
      <div class="d-flex flex-wrap ga-2 mb-4">
        <VChip
          v-for="link in learnGuides"
          :key="link.to"
          :to="localePath(link.to)"
          color="primary"
          variant="tonal"
          size="small"
          link
        >
          <VIcon start size="small">mdi-book-open-variant</VIcon>
          {{ link.label }}
        </VChip>
      </div>
      <p class="text-body-2 text-grey-lighten-1 mb-1">
        <strong>Recurso recomendado:</strong> si querés formarte en análisis fundamental y finanzas
        personales sin costo, en Uruguay existe
        <a
          href="https://foroagora.org"
          target="_blank"
          rel="noopener noreferrer"
          class="inversiones-ext-link"
          >Foro Ágora</a
        >, una iniciativa sin fines de lucro de educación financiera para jóvenes, con la premisa de
        <em>“educación antes que especulación”</em>.
      </p>
    </VCard>

    <!-- CTA -->
    <VCard class="cta-inversiones mt-6 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">¿Cuánto rendiría tu plazo fijo?</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Simulá el interés de un plazo fijo en pesos, dólares o UI, o convertí tu dinero a la moneda
        que necesitás para invertir con nuestras herramientas.
      </p>
      <div class="d-flex justify-center flex-wrap ga-3">
        <VBtn
          :to="localePath('/herramientas/calculadora-plazo-fijo')"
          color="primary"
          variant="elevated"
          class="cta-btn"
        >
          <VIcon start>mdi-calculator</VIcon>
          Calcular plazo fijo
        </VBtn>
        <VBtn :to="localePath('/convertir')" variant="outlined" class="cta-btn cta-btn-outline">
          <VIcon start>mdi-swap-horizontal</VIcon>
          Convertir moneda
        </VBtn>
      </div>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import {
  CUSTODY_INSOLVENCY,
  CUSTODY_VERIFIED_AT,
  GLETIR_SAFETY_ANALYSIS,
  INVESTMENTS,
  investmentsByCategory,
  riskLabel,
  minInvestmentLabel,
  type RegulationStatus,
} from '~/utils/investments'

const localePath = useLocalePath()
const groups = computed(() => investmentsByCategory())

// CUSTODY_VERIFIED_AT es ISO para poder ordenarlo/testearlo; acá se muestra en es-UY.
const custodyVerifiedAt = new Date(CUSTODY_VERIFIED_AT).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

function formatUsd(amount: number): string {
  return `US$ ${new Intl.NumberFormat('es-UY').format(amount)}`
}

/** Bare host (without scheme / www) for compact source links. */
function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

/** Compact regulation badge label for the mobile card view. */
function regulationBadge(regulation: RegulationStatus): string {
  if (regulation === 'bcu') return 'BCU'
  if (regulation === 'exterior_regulado') return 'Exterior'
  return 'No regulado'
}

/** Icon per investment category, mirrors groupIcon() in prestamos-uruguay.vue. */
function groupIcon(category: string): string {
  const icons: Record<string, string> = {
    banco_broker: 'mdi-bank',
    fintech: 'mdi-cellphone-check',
    broker_internacional: 'mdi-earth',
    renta_fija_local: 'mdi-file-certificate-outline',
    fondo_inversion: 'mdi-chart-pie',
    cripto: 'mdi-bitcoin',
  }
  return icons[category] ?? 'mdi-finance'
}

const officialSources = [
  {
    label: 'BCU — Registro de Intermediarios de Valores',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/int_Valores.aspx',
  },
  {
    label: 'BCU — Tasas Medias de Interés (plazo fijo)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Tasas-Medias.aspx',
  },
  {
    label: 'BCU — Administradoras de Fondos de Inversión',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/admin_Fondos_Inv.aspx',
  },
  {
    label: 'BCU — Memoria AFAP (participación de mercado)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/paginas/memoria-afap.aspx',
  },
  {
    label: 'MEF — Notas del Tesoro',
    url: 'https://deuda.mef.gub.uy/29186/14/areas/notas-del-tesoro.html',
  },
  {
    label: 'BVM — Corredores de bolsa',
    url: 'https://www.bvm.com.uy/operadores/corredores-de-bolsa',
  },
  {
    label: 'BPS — Administradoras de Ahorro Previsional (AFAP)',
    url: 'https://www.bps.gub.uy/21194/administradoras-de-ahorro-previsional-afap-y-distribucion.html',
  },
  {
    label: 'DGI — IRPF, rendimientos de capital mobiliario',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario',
  },
  {
    label: 'IMPO — Ley 20.345 (activos virtuales)',
    url: 'https://www.impo.com.uy/bases/leyes-originales/20345-2024',
  },
  {
    label: 'IMPO — Ley 18.627 (Mercado de Valores)',
    url: 'https://www.impo.com.uy/bases/leyes/18627-2009',
  },
  {
    label: 'BCU — Recopilación de Normas del Mercado de Valores',
    url: 'https://www.bcu.gub.uy/Acerca-de-BCU/Normativa/Documents/Reordenamiento%20de%20la%20Recopilaci%C3%B3n/Mercado%20de%20Valores/RNMV.pdf',
  },
  {
    label: 'COPAB — Seguro de depósitos: cobertura y exclusiones',
    url: 'https://www.copab.org.uy/innovaportal/v/308/1/web/cobertura.html',
  },
]

// Educational guides that teach the fundamentals before choosing an instrument.
const learnGuides = [
  { label: 'Empezar a invertir desde cero', to: '/guias/como-empezar-a-invertir-uruguay' },
  { label: 'Interés compuesto', to: '/guias/interes-compuesto-explicado-uruguay' },
  { label: '¿Conviene un plazo fijo?', to: '/guias/plazo-fijo-en-uruguay-conviene' },
  {
    label: 'La bolsa de USA desde Uruguay',
    to: '/guias/invertir-en-la-bolsa-de-usa-desde-uruguay',
  },
  { label: 'Bonos y renta fija', to: '/guias/bonos-y-renta-fija-uruguay' },
  { label: 'Errores y estafas al invertir', to: '/guias/errores-y-estafas-al-invertir-uruguay' },
]

const canonicalUrl = 'https://cambio-uruguay.com/inversiones-uruguay'
const title =
  'Dónde invertir en Uruguay: guía completa de bancos, brokers, renta fija y cripto (2026)'
const description =
  'Guía completa para invertir en Uruguay: qué pasa con tus títulos si el corredor quiebra (y por qué no hay un COPAB para inversiones), análisis de Gletir, bancos, Prex, brokers internacionales, renta fija local, fondos, cripto, AFAP e inmobiliario.'

defineOgImageComponent('Cambio', {
  title: 'Invertir en Uruguay',
  subtitle: 'Guía de bancos, brokers, renta fija, fondos y cripto',
  tag: 'GUÍA',
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
        'invertir en uruguay, inversiones uruguay, gletir uruguay, gletir seguro, gletir global, broker uruguay, etoro uruguay, prex inversiones, itau inversiones, plazo fijo uruguay, letras de regulacion monetaria, afap uruguay, cripto uruguay, si quiebra el corredor de bolsa que pasa con mis titulos, copab inversiones, ley 18627 custodia, fondo de compensacion al inversor uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            name: 'Opciones de inversión en Uruguay',
            itemListElement: INVESTMENTS.map((i, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: i.name,
              url: i.website,
            })),
          },
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
                name: 'Inversiones en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Dónde puedo invertir mi dinero en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'En Uruguay podés invertir a través de cuentas de inversión en bancos (Itaú, Santander, BROU, Scotiabank, BBVA), fintech como Prex, brokers internacionales accesibles desde Uruguay (eToro, XTB, Balanz, este último regulado localmente), instrumentos de renta fija local (plazo fijo, Letras de Regulación Monetaria del BCU, bonos y notas del Tesoro), fondos de inversión locales (República AFISA, Delta Asset Management y otras administradoras registradas ante el BCU) y exchanges de criptomonedas. Cada opción tiene distinto riesgo, mínimo de inversión, regulación y tratamiento impositivo.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cuál es la opción de menor riesgo para invertir en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'El plazo fijo bancario y las Letras de Regulación Monetaria del BCU son las opciones de menor riesgo, ya que devuelven capital e interés pactado sin exposición a variaciones de mercado, y ambas están supervisadas por el BCU. Los fondos de inversión y las carteras de bonos/acciones tienen riesgo variable según el instrumento, mientras que acciones, ETFs y criptomonedas tienen riesgo alto, ya que su valor puede subir o bajar significativamente según el mercado.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Es seguro invertir mediante Gletir en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Gletir es un corredor de bolsa activo, supervisado por el BCU y miembro de la Bolsa de Valores de Montevideo, lo que ofrece un marco local más sólido que una plataforma no habilitada. No es una inversión garantizada: Gletir Global opera mediante GTN, custodios extranjeros y cuentas ómnibus, y el riesgo del capital depende del instrumento. Además, el BCU impuso en 2025 una multa de UI 150.000 por incumplimientos materiales detectados en 2024 sobre información al inversor, perfiles, registros, custodias y controles. La resolución también recoge medidas correctivas de Gletir. La evaluación objetiva es seguridad media del intermediario y riesgo variable o alto según el activo.',
                },
              },
              {
                '@type': 'Question',
                name: 'Si el corredor de bolsa quiebra, ¿qué pasa con mis títulos? ¿Hay algo tipo COPAB para inversiones?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No hay un COPAB para inversiones. El Fondo de Garantía de Depósitos Bancarios que administra la COPAB tiene por objeto garantizar los depósitos en bancos y cooperativas de intermediación financiera, hasta el equivalente a USD 10.000 para el total de los depósitos en moneda extranjera y UI 250.000 en moneda nacional, por persona y por institución: no alcanza a los valores, ni a las cuotapartes de fondos de inversión, ni al efectivo que tenés en un corredor de bolsa. En Uruguay tampoco consta que exista un fondo de compensación al inversor equivalente al SIPC de Estados Unidos. Lo que sí hay es separación patrimonial: la Ley 18.627 establece en su artículo 109 que el dinero y los valores que un intermediario de valores adquiera o mantenga en custodia por cuenta de sus clientes no pueden ser embargados por deudas del intermediario y, en caso de liquidación por insolvencia, no integran la masa activa de la liquidación. Es una regla de propiedad, no un seguro: te saca de la fila de acreedores, pero no repone lo que el intermediario no compró o no tiene. Por eso importa el registro: si custodia valores a nombre propio debe anotarlos separadamente en su contabilidad y en un registro especial con la individualización de cada cliente (art. 103), debe llevar registro de los titulares reales de los valores escriturales (art. 28) y responde civilmente por omisiones, inexactitudes y retrasos de registro (art. 30). El liquidador es el Banco Central del Uruguay, en sede administrativa (art. 108). Además, el intermediario debe mantener una garantía a favor del BCU no inferior a UI 2.000.000, que es un piso por entidad y no una cobertura por inversor.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cómo se pagan impuestos por invertir en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Los residentes fiscales uruguayos pagan IRPF Categoría I sobre las rentas de capital (intereses, dividendos, alquileres y ganancias de capital) a una tasa general del 12%; los dividendos de fuente uruguaya, al 7%. Los depósitos a plazo tienen tasas reducidas según moneda y plazo: en pesos 5,5% (hasta 1 año), 2,5% (1 a 3 años) y 0,5% (más de 3 años); en UI 10%, 7% y 5%; en moneda extranjera 12%, 12% y 7%. Al vender valores, la regla por defecto es el régimen real: 12% sobre la ganancia (precio menos costo fiscal actualizado); la base ficta del 20% del precio (≈ 2,4% efectivo) es obligatoria solo si no se puede probar el costo, no es el régimen general. Desde 2026 (Ley 20.446) el IRPF también grava las rentas y ganancias de capital de fuente extranjera, al 12%: el 8% no es una tasa, es una retención reducida que solo puede aplicar un bróker o custodio uruguayo que ejerza la custodia de los activos, y es definitiva solo si el contribuyente opta por ella. Con un bróker del exterior no hay retención uruguaya: corresponden anticipos semestrales o declaración jurada (Formulario 1101). Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025. La deuda pública uruguaya (Bonos del Tesoro, Letras de Tesorería, LRM) está exenta de IRPF, tanto el interés como la ganancia de capital al transferirla. Los no residentes tributan IRNR. Consultá siempre con un contador y las publicaciones oficiales de la DGI antes de declarar.',
                },
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
.bg-gradient-inversiones {
  background: linear-gradient(135deg, #0f766e 0%, #1e3a8a 100%);
}

/* Guard against any child forcing horizontal scroll. */
.inversiones-page {
  overflow-x: hidden;
}

.inversiones-intro {
  max-width: 760px;
  line-height: 1.6;
}

/* Let the CTA label wrap inside the button instead of spilling out on narrow screens. */
.cta-btn {
  height: auto;
  min-height: 44px;
  max-width: 100%;
  white-space: normal;
}
.cta-btn :deep(.v-btn__content) {
  white-space: normal;
  padding-block: 8px;
}

.cta-btn-outline {
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

.inversiones-group-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

.inversiones-card,
.inversiones-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.inversiones-table :deep(td),
.inversiones-table :deep(th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.inversiones-note {
  font-size: 0.82rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.78);
}
.v-theme--light .inversiones-note {
  color: rgba(0, 0, 0, 0.78);
}

.inversiones-sources {
  margin: 0;
  padding-left: 1.1rem;
}

.inversiones-sources li {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.6;
}
.v-theme--light .inversiones-sources li {
  color: rgba(0, 0, 0, 0.78);
}

.inversiones-link,
.inversiones-ext-link,
.inversiones-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}

.inversiones-link:hover,
.inversiones-ext-link:hover,
.inversiones-sources a:hover {
  text-decoration: underline;
}

.gletir-assessment,
.custodia-section {
  scroll-margin-top: 88px;
}

/* La sección de custodia reusa la paleta del bloque de Gletir a propósito: son el mismo tema
   (qué te protege del intermediario) y no queremos un segundo sistema de tarjetas. */
.gletir-score-card,
.gletir-costs,
.custodia-card {
  background: rgba(15, 118, 110, 0.06);
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 10px;
}

.gletir-score-card,
.custodia-card {
  padding: 14px;
}

.gletir-detail,
.gletir-list {
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.55;
}

.gletir-list {
  margin: 0;
  padding-left: 1.2rem;
  font-size: 0.86rem;
}

.gletir-list li + li {
  margin-top: 0.55rem;
}

.gletir-sources summary {
  color: rgb(var(--v-theme-link));
  cursor: pointer;
}

.v-theme--light .gletir-detail,
.v-theme--light .gletir-list {
  color: rgba(0, 0, 0, 0.78);
}

.v-theme--light .gletir-score-card,
.v-theme--light .gletir-costs,
.v-theme--light .custodia-card {
  background: rgba(15, 118, 110, 0.04);
}

.cta-inversiones {
  background: rgba(15, 118, 110, 0.12);
  border: 1px solid rgba(15, 118, 110, 0.28);
  border-radius: 12px;
}

/* Mobile card layout for the investment comparison (replaces the table < md).
   `.custodia-absence` comparte el bloque: es la misma tarjeta neutra, y así los "no existe"
   se leen distinto de las tarjetas verdes de protecciones sin inventar otra paleta. */
.investment-card,
.custodia-absence {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
}

.investment-card + .investment-card,
.custodia-absence + .custodia-absence {
  margin-top: 12px;
}

.v-theme--light .custodia-absence {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}

.investment-risk {
  font-weight: 700;
  color: #0f766e;
  white-space: nowrap;
  background: rgba(15, 118, 110, 0.14);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.investment-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0 0 8px;
}

.investment-specs dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.5);
}
.v-theme--light .investment-specs dt {
  color: rgba(0, 0, 0, 0.5);
}

.investment-specs dd {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.v-theme--light .investment-specs dd {
  color: rgba(0, 0, 0, 0.85);
}

.investment-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.cross-link {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  text-decoration: none;
  transition: transform 0.2s ease;
}
.cross-link:hover {
  transform: translateY(-2px);
}
.v-theme--light .cross-link {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
</style>
