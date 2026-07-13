<template>
  <div class="imp-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/inversiones-uruguay')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Inversiones en Uruguay
      </VBtn>
    </div>

    <!-- 1. Header / intro -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-imp pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-file-percent-outline</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Impuestos sobre inversiones en Uruguay: cómo funciona el IRPF Categoría I
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 imp-intro">
              El «impuesto a las ganancias» no existe en Uruguay. Lo que grava las rentas de tus
              inversiones es el <strong>IRPF Categoría I</strong> si sos residente fiscal, el
              <strong>IRNR</strong> si no lo sos, y el <strong>IRAE</strong> si invertís a través de
              una empresa.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end align-center ga-2 mt-3 flex-wrap">
          <VBtn
            :to="localePath('/herramientas/calculadora-impuestos-inversiones')"
            color="white"
            variant="flat"
            size="small"
          >
            <VIcon start size="small">mdi-calculator-variant-outline</VIcon>
            Calcular mi IRPF de inversiones
          </VBtn>
          <ShareButtons text="Impuestos sobre inversiones en Uruguay: guía del IRPF Categoría I" />
        </div>
      </div>
    </VCard>

    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-6"
      icon="mdi-check-decagram"
    >
      Casi todas las tasas de esta página llevan el artículo de la ley del que salen (la única
      excepción es el IASS, que cita su fuente en BPS, sin artículo) y la fecha en que las
      verificamos contra la fuente primaria (<strong>{{ verifiedOnLabel }}</strong
      >). Los montos en pesos no están escritos a mano: se calculan con la <strong>BPC</strong> y la
      <strong>UI</strong> vivas, porque los umbrales legales están expresados en BPC o en UI en la
      propia norma. Hoy usamos <strong>BPC = {{ formatUYU(bpc, 0) }}</strong> y
      <strong>UI = {{ formatUYU(ui, 4) }}</strong
      >.
    </VAlert>

    <!-- 2. Depósitos y renta fija -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-bank-outline</VIcon>
        Depósitos, plazos fijos y obligaciones negociables
      </h2>
      <p class="text-body-2 mb-3">
        La tasa de un depósito no es una sola: depende de la <strong>moneda</strong> y del
        <strong>plazo</strong>. Son nueve celdas, y esta tabla las muestra todas.
      </p>

      <VTable density="comfortable" class="imp-table mb-3">
        <thead>
          <tr>
            <th>Moneda</th>
            <th v-for="t in depositTerms" :key="t.key" class="text-right">{{ t.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in depositRows" :key="row.currency">
            <td class="font-weight-medium">{{ row.label }}</td>
            <td
              v-for="t in depositTerms"
              :key="t.key"
              class="text-right font-weight-bold imp-rate-cell"
            >
              {{ pct(depositRule(row.currency, t.key).rate) }}
            </td>
          </tr>
        </tbody>
      </VTable>

      <VAlert type="info" variant="tonal" density="compact" class="mb-3" icon="mdi-table-alert">
        <strong>Ojo con la celda de dólares a 1–3 años: paga 12%.</strong> En el HTML de la DGI esa
        celda es un <code>rowspan</code> del 12% de arriba, así que quien copia la tabla mirándola
        deja ese hueco vacío. No está exenta.
      </VAlert>

      <p class="text-caption imp-law mb-0">
        {{ depositRule('UYU', 'hasta_1a').law }} · verificado el {{ verifiedOnLabel }} ·
        <a
          :href="depositRule('UYU', 'hasta_1a').sourceUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="imp-link"
          >DGI, rendimientos de capital mobiliario</a
        >
      </p>
    </VCard>

    <!-- 3. Dividendos -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-cash-multiple</VIcon>
        Dividendos y utilidades: 7%
      </h2>
      <p class="text-body-2 mb-3">
        Los dividendos y utilidades distribuidos por contribuyentes de IRAE pagan
        <strong>{{ pct(DIVIDEND_RULE.rate) }}</strong
        >. La misma tasa alcanza a los <strong>dividendos fictos del art. 19</strong>, que
        <strong>siguen vigentes en 2026</strong>: aunque la empresa no distribuya, la ley puede
        considerar distribuida parte de la utilidad acumulada.
      </p>
      <p class="text-body-2 mb-3">
        Hay una <strong>exoneración</strong>: los dividendos de empresas unipersonales y sociedades
        personales con ingresos de hasta <strong>4.000.000 UI</strong> ({{
          formatUYU(uiToPesos(4_000_000), 0)
        }}
        con la UI de hoy) están exonerados.
      </p>
      <p class="text-caption imp-law mb-0">
        {{ DIVIDEND_RULE.law }} · verificado el {{ verifiedOnLabel }}
      </p>
    </VCard>

    <!-- 4. Deuda pública -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-file-certificate-outline</VIcon>
        Deuda pública uruguaya: exenta
      </h2>
      <p class="text-body-2 mb-3">
        Los <strong>Bonos del Tesoro</strong>, las <strong>Letras de Tesorería</strong>, las
        <strong>Letras de Regulación Monetaria (LRM) del BCU</strong> y los
        <strong>Bonos Globales en UI</strong> están <strong>exentos de IRPF</strong>.
      </p>
      <p class="text-body-2 mb-3">
        Y la exoneración es más amplia de lo que suele contarse: no cubre solo el interés. El art.
        38 lit. A exonera «cualquier otro rendimiento de capital o incremento patrimonial derivado
        de la tenencia o transferencia» de esos títulos, así que
        <strong>la ganancia de capital al venderlos también está exenta</strong>. Además,
        <strong>no son computables para el Impuesto al Patrimonio</strong> (Título 14, art. 23).
        Para los no residentes rige lo mismo (Título 8, art. 19 lit. A).
      </p>
      <p class="text-caption imp-law mb-0">
        {{ PUBLIC_DEBT_RULE.law }} · verificado el {{ verifiedOnLabel }}
      </p>
    </VCard>

    <!-- 5. Alquileres -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-home-city-outline</VIcon>
        Alquileres: 12% sobre la renta neta (el 10,5% es la retención)
      </h2>
      <p class="text-body-2 mb-3">
        La tasa del alquiler es <strong>12% sobre la renta NETA</strong>, no sobre lo que te
        deposita el inquilino. El
        <strong>{{ pct(RENT_WITHHOLDING_PCT) }} es la RETENCIÓN</strong> que aplica la
        administradora sobre el bruto (Dec. 148/007 art. 37, redacción del Dec. 95/026 art. 25):
        equivale a 12% × 87,5%, o sea que asume alrededor de 12,5% de gastos. Podés dejar esa
        retención como definitiva o liquidar por lo real, si tus gastos reales son mayores.
      </p>
      <p class="text-body-2 mb-2"><strong>Deducciones admitidas</strong> (Título 7, art. 16):</p>
      <ul class="imp-list mb-3">
        <li v-for="d in rentDeductions" :key="d">{{ d }}</li>
      </ul>

      <VAlert
        type="info"
        variant="tonal"
        density="compact"
        class="mb-0"
        icon="mdi-alert-circle-outline"
      >
        <strong
          >La exoneración de pequeños arrendadores NO se consigue «identificando al
          inquilino».</strong
        >
        La condición real (art. 38 lit. J) es tener rentas de arrendamiento de hasta
        <strong>{{ SMALL_LANDLORD_MAX_BPC }} BPC anuales</strong> ({{
          formatUYU(bpcToPesos(SMALL_LANDLORD_MAX_BPC), 0)
        }}
        con la BPC de hoy) <strong>y</strong> autorizar expresamente el
        <strong>levantamiento del secreto bancario</strong>. No opera si además tenés otros
        rendimientos de capital por más de {{ SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC }} BPC anuales
        ({{ formatUYU(bpcToPesos(SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC), 0) }}). Lo de «identificar»
        es otra cosa: el art. 51 le da al <strong>inquilino</strong> un crédito de hasta 8% del
        alquiler si identifica al <strong>arrendador</strong>.
      </VAlert>
    </VCard>

    <!-- 6. Ganancias de capital -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-trending-up</VIcon>
        Ganancias de capital (incrementos patrimoniales)
      </h2>
      <p class="text-body-2 mb-3">
        La regla general es la <strong>real</strong>:
        <strong>(precio de venta − costo fiscal actualizado por UI/IPC) × 12%</strong> (Título 7,
        arts. 29 y 32). Ese es el régimen por defecto.
      </p>
      <p class="text-body-2 mb-3">
        La base <strong>ficta</strong> es la excepción, y no siempre podés elegirla. Cuando aplica,
        se toma un porcentaje del precio de venta como base imponible y sobre eso se paga el 12%:
      </p>

      <VTable density="comfortable" class="imp-table mb-3">
        <thead>
          <tr>
            <th>Caso</th>
            <th>Base ficta</th>
            <th>Tasa efectiva</th>
            <th>Naturaleza</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(f, i) in fictoCases" :key="'f' + i">
            <td class="font-weight-medium">{{ f.caso }}</td>
            <td>{{ f.base }}</td>
            <td>{{ f.efectiva }}</td>
            <td>{{ f.naturaleza }}</td>
          </tr>
        </tbody>
      </VTable>

      <VAlert
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-3"
        icon="mdi-alert-outline"
      >
        <strong>El 20% / 2,4% no es el régimen por defecto de «venta de valores».</strong> Es
        obligatorio solo cuando <em>no podés probar el costo</em>. Si tenés el costo documentado, la
        regla es la real, al 12% sobre la ganancia efectiva. Publicar el ficto como si fuera la
        regla general lleva a subdeclarar.
      </VAlert>

      <p class="text-body-2 mb-2"><strong>Exoneraciones</strong> (Título 7, art. 38):</p>
      <ul class="imp-list mb-3">
        <li>
          <strong>lit. I)</strong> Operaciones de hasta
          <strong>{{ formatInt(EXEMPT_PER_OPERATION_UI) }} UI</strong> cada una ({{
            formatUYU(uiToPesos(EXEMPT_PER_OPERATION_UI), 0)
          }}) <strong>y</strong> cuya suma anual sea menor a
          <strong>{{ formatInt(EXEMPT_ANNUAL_UI) }} UI</strong> ({{
            formatUYU(uiToPesos(EXEMPT_ANNUAL_UI), 0)
          }}). Se tienen que cumplir las dos condiciones.
        </li>
        <li>
          <strong>lit. E)</strong> Acciones, obligaciones negociables y valores de fideicomisos con
          oferta pública y cotización bursátil.
        </li>
        <li>
          <strong>lit. L)</strong> Vivienda permanente: precio de hasta 1.200.000 UI ({{
            formatUYU(uiToPesos(1_200_000), 0)
          }}), reinvirtiendo al menos el 50% en una nueva vivienda permanente dentro de 12 meses, de
          hasta 1.800.000 UI ({{ formatUYU(uiToPesos(1_800_000), 0) }}).
        </li>
      </ul>

      <VAlert type="success" variant="tonal" density="compact" class="mb-3" icon="mdi-currency-usd">
        <strong>Tener dólares y que suba el dólar NO genera IRPF.</strong> La diferencia de cambio
        por la tenencia de moneda extranjera está <strong>exenta</strong> (Título 7, art. 38 lits. G
        y H).
      </VAlert>

      <VAlert type="success" variant="tonal" density="compact" class="mb-0" icon="mdi-family-tree">
        <strong>La herencia no paga IRPF.</strong> La transferencia por el modo sucesión no es una
        alteración patrimonial gravada (Título 7, art. 27 lit. B). Uruguay
        <strong>no tiene impuesto sucesorio</strong>.
      </VAlert>
    </VCard>

    <!-- 7. FCI -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-chart-pie</VIcon>
        Fondos de inversión (FCI) locales
      </h2>
      <p class="text-body-2 mb-0">
        Los fondos de inversión locales están exentos
        <strong
          >solo si invierten en valores públicos o en valores privados con oferta pública</strong
        >
        (Título 7, art. 38 lit. P). Si el fondo invierte en otra cosa, la exoneración no aplica.
        Antes de asumir que tu FCI es «libre de impuestos», mirá en qué invierte.
      </p>
    </VCard>

    <!-- 8. Cripto — NO RATE. -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-bitcoin</VIcon>
        Criptomonedas: no está resuelto
      </h2>
      <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-help-circle-outline">
        <p class="mb-2">
          <strong>No publicamos un porcentaje para cripto, porque la ley no lo fija.</strong> Esto
          es lo que se sabe y lo que no:
        </p>
        <ul class="imp-list mb-2">
          <li>
            <strong>No hay norma tributaria específica</strong> para criptomonedas. La única
            posición oficial conocida es la <strong>Consulta DGI Nº 6.419 (2021)</strong>, que
            trataría a la cripto como bien mueble incorporal o intangible; la citamos
            <strong>según fuentes secundarias</strong> porque no accedimos a su texto primario.
          </li>
          <li>
            La <strong>Ley 20.345 (activos virtuales) no cambió la tributación</strong>: regula a
            los proveedores de servicios de activos virtuales (PSAV) y su supervisión por el BCU.
          </li>
          <li>
            Después de la reforma de 2026, la <strong>fuente</strong> de la renta de cripto
            (uruguaya o extranjera) <strong>sigue sin definirse</strong>. Ni el Decreto 95/026 ni la
            Resolución DGI 1517/2026 mencionan cripto.
          </li>
        </ul>
        <p class="mb-0">
          Hay dos lecturas posibles y ninguna está zanjada.
          <strong>Consultá un contador antes de declarar cripto</strong>: cualquier número que te
          den como «la tasa de cripto en Uruguay» hoy es una interpretación, no una tasa legal.
        </p>
      </VAlert>
      <p class="text-caption imp-law mt-3 mb-0">
        Estado: <strong>{{ CRYPTO_RULE.confidence }}</strong> · {{ CRYPTO_RULE.law }} · verificado
        el
        {{ verifiedOnLabel }}
      </p>
    </VCard>

    <!-- 9. Reforma 2026 — bloque destacado -->
    <VCard variant="flat" class="imp-reform mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title-reform">
        <VIcon start size="small" color="warning">mdi-star-four-points-outline</VIcon>
        La reforma 2026: tus inversiones en el exterior ahora pagan IRPF
      </h2>
      <p class="text-body-2 mb-4">
        La <strong>Ley 20.446</strong> (Presupuesto), publicada el 08/01/2026 y
        <strong>vigente desde el 1/1/2026</strong>, cambió las reglas para las rentas de fuente
        extranjera. Está reglamentada por el <strong>Decreto 95/026</strong> (06/05/2026) y la
        <strong>Resolución DGI 1517/2026</strong>.
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">Qué cambió</h3>
      <p class="text-body-2 mb-2">
        <strong>Antes</strong> (Ley 18.718, 2011–2025): solo se gravaban los
        <em>rendimientos</em> de capital <em>mobiliario</em> del exterior —intereses y dividendos—
        al 12%. <strong>Las ganancias de capital del exterior no estaban gravadas.</strong>
      </p>
      <p class="text-body-2 mb-2"><strong>Ahora</strong> (Título 7, art. 6 num. 2, sustituido):</p>
      <ul class="imp-list mb-3">
        <li>
          Se amplía a <strong>todos los rendimientos de capital</strong>, incluido el inmobiliario
          (el alquiler de un inmueble en el exterior).
        </li>
        <li>
          Se gravan <strong>por primera vez los incrementos patrimoniales del exterior</strong>:
          vender acciones, ETFs o bonos extranjeros.
        </li>
        <li>
          Quedan <strong>fuera</strong> (art. 18 lits. A, C y D): regalías, marcas, patentes,
          llaves, derechos de autor, arrendamiento de bienes muebles, cesión de imagen e
          <strong>instrumentos financieros derivados</strong>.
        </li>
      </ul>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        La tasa es 12%. El 8% es una retención, no una tasa
      </h3>
      <VAlert
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-3"
        icon="mdi-percent-outline"
      >
        Esta es la confusión más cara de la reforma.
        <strong
          >La tasa de las rentas de fuente extranjera es {{ pct(FOREIGN_GENERAL_PCT) }}</strong
        >
        (Título 7, art. 52 lit. A + Dec. 148/007 arts. 44 quinquies y sexies).
      </VAlert>
      <VTable density="comfortable" class="imp-table mb-3">
        <thead>
          <tr>
            <th>Quién opera tu inversión</th>
            <th>Qué te retiene</th>
            <th>Sobre qué</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="font-weight-medium">
              Bróker uruguayo que además <strong>ejerce la custodia</strong> de los activos
            </td>
            <td class="font-weight-bold imp-rate-cell">
              {{ pct(FOREIGN_CUSTODIAN_WITHHOLDING_PCT) }} (retención reducida)
            </td>
            <td>
              Las rentas que administra. Es definitiva <strong>solo si vos optás</strong> por
              tomarla como tal (y así te liberás de la declaración jurada).
            </td>
          </tr>
          <tr>
            <td class="font-weight-medium">
              Otro agente local sin custodia: banco, corredor de bolsa, fondo o fideicomiso que
              actúa por cuenta y orden de terceros (art. 44 quater)
            </td>
            <td class="font-weight-bold imp-rate-cell">{{ pct(FOREIGN_GENERAL_PCT) }}</td>
            <td>
              <strong>Solo los incrementos patrimoniales</strong> — no es una retención sobre todas
              tus rentas del exterior.
            </td>
          </tr>
          <tr>
            <td class="font-weight-medium">
              Ningún agente uruguayo (por ejemplo, cuenta directa en un bróker del exterior)
            </td>
            <td class="font-weight-bold imp-rate-cell">Nadie retiene</td>
            <td>
              <strong>Anticipos semestrales obligatorios al {{ pct(FOREIGN_GENERAL_PCT) }}</strong>
              (Dec. 95/026 arts. 44 duodecies y terdecies). Pueden hacerse definitivos y liberarte
              de la declaración jurada.
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-body-2 mb-4">
        Es decir: el 8% <strong>no lo puede aplicar cualquier agente residente</strong>. Solo una
        entidad residente que intermedie profesional y habitualmente activos mobiliarios en
        entidades no residentes <strong>y ejerza la custodia</strong> de esos activos.
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        El step-up al 31/12/2025: el dato más valioso y menos difundido
      </h3>
      <VAlert type="success" variant="tonal" density="compact" class="mb-4" icon="mdi-stairs-up">
        Para los activos que coticen en <strong>bolsas de reconocido prestigio</strong> y hayas
        adquirido <strong>antes del 31/12/2025</strong>, el costo fiscal es
        <strong>la cotización al 31/12/2025</strong> (Título 7, art. 32 + Dec. 95/026 art. 18).
        <strong>Toda la apreciación anterior a 2026 queda fuera del impuesto.</strong> Si la renta
        calculada así da negativa, esa pérdida no se puede compensar con otras rentas.
      </VAlert>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">Se terminó el diferimiento vía offshore</h3>
      <p class="text-body-2 mb-4">
        El art. 21 imputa las rentas del art. 6 num. 2 obtenidas por entidades no residentes
        <strong>directamente al beneficiario final con participación ≥ 5%</strong>, se distribuyan o
        no. Y el
        <strong
          >art. 22 —que limitaba esto a jurisdicciones de baja tributación (BONT)— fue
          derogado</strong
        >
        (Ley 20.446 art. 655). <strong>Interponer una sociedad ya no difiere el impuesto.</strong>
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        El crédito por impuesto pagado en el exterior sigue vigente
      </h3>
      <p class="text-body-2 mb-4">
        Si ya pagaste un impuesto análogo en el exterior por esas mismas rentas, lo podés
        <strong>acreditar</strong> (Título 7, art. 25 + Dec. 95/026 art. 30), con
        <strong>tope en el IRPF de esas mismas rentas</strong> (no genera devolución). El propio
        agente de retención puede computarlo con los estados de cuenta del exterior.
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">El calendario real</h3>
      <p class="text-body-2 mb-0">
        Las retenciones <strong>se empiezan a verter a la DGI recién en julio de 2026</strong>
        (Dec. 95/026 art. 44 nonies).
      </p>
    </VCard>

    <!-- 10. Residencia fiscal y tax holiday -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-passport</VIcon>
        Residencia fiscal y tax holiday
      </h2>
      <p class="text-caption imp-law mb-3">
        Sección verificada el {{ verifiedOnLabel }}. Los umbrales están fijados en UI por la norma;
        los pesos se calculan con la UI de hoy ({{ formatUYU(ui, 4) }}).
      </p>

      <p class="text-body-2 mb-3">
        Alcanza con <strong>cualquiera</strong> de estas condiciones (Título 7, art. 2):
        <strong>más de 183 días</strong> en el año civil, o radicar en Uruguay el
        <strong>núcleo principal de actividades o de intereses económicos o vitales</strong>. Hay
        una presunción: si tu cónyuge e hijos menores dependientes residen habitualmente acá.
      </p>
      <p class="text-body-2 mb-3">
        El reglamento (Dec. 148/007 art. 5-BIS) precisa que cuentan todos los días con presencia
        física efectiva, y que
        <strong>las ausencias esporádicas de hasta 30 días corridos cuentan como presencia</strong>,
        salvo que presentes un certificado de residencia fiscal de otro país. También aclara que
        obtener <strong>solo rentas puras de capital NO configura</strong>
        núcleo de actividades.
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">Residencia por inversión</h3>
      <VTable density="comfortable" class="imp-table mb-4">
        <thead>
          <tr>
            <th>Vía</th>
            <th class="text-right">Umbral</th>
            <th class="text-right">Equivalente hoy</th>
            <th>Condición extra</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in residencyRoutes" :key="'r' + i">
            <!-- Static, authored-in-code copy (no user input): the markup is the emphasis. -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <td class="font-weight-medium" v-html="r.via" />
            <td class="text-right">UI {{ formatInt(r.ui) }}</td>
            <td class="text-right imp-rate-cell">
              {{ formatUYU(uiToPesos(r.ui), 0) }}{{ usdSuffix(uiToPesos(r.ui)) }}
            </td>
            <td>{{ r.extra }}</td>
          </tr>
        </tbody>
      </VTable>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">
        El régimen viejo cerró: el «7% para siempre» ya no se puede elegir
      </h3>
      <VAlert
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-3"
        icon="mdi-calendar-remove"
      >
        La opción del <strong>art. 24</strong> —incluido el famoso «7% para siempre»— solo podía
        ejercerse <strong>hasta el 31/12/2025</strong>. Quedó vigente para quien ya la eligió, pero
        <strong>no está disponible para quien se hace residente desde 2026</strong>. Si una guía te
        la ofrece hoy como opción, está desactualizada.
      </VAlert>

      <p class="text-body-2 mb-2">
        <strong>Nuevos residentes desde el 1/1/2026 → art. 24-Bis</strong> (Ley 20.446 art. 648):
        tributar
        <strong
          >IRNR por el ejercicio del cambio de residencia y los 10 siguientes (11 en total)</strong
        >, por única vez, y solo sobre las rentas del art. 6 num. 2. Requiere no haber sido
        residente en los 2 ejercicios anteriores y cumplir <strong>una</strong> de:
      </p>
      <ul class="imp-list mb-3">
        <li>
          Inmuebles por más de <strong>UI 12.500.000</strong> ({{
            formatUYU(uiToPesos(12_500_000), 0)
          }}).
        </li>
        <li>
          Fondos de inversión para proyectos productivos, de investigación o innovación por al menos
          <strong>UI 625.000 anuales</strong> ({{ formatUYU(uiToPesos(625_000), 0) }}).
        </li>
        <li>
          <strong>Más de 183 días en cada ejercicio fiscal</strong> → sin necesidad de inversión.
        </li>
      </ul>
      <p class="text-body-2 mb-3">
        Al vencer los 11 años, y por hasta 20 ejercicios más, se puede optar por: (i) IRPF al
        <strong>6%</strong> (la mitad de la tasa) por 5 ejercicios, si mantiene la condición de
        inversión o compra inmuebles por más de UI 6.250.000 ({{
          formatUYU(uiToPesos(6_250_000), 0)
        }}); o (ii) un <strong>monto fijo de UI 1.875.000 por año</strong> ({{
          formatUYU(uiToPesos(1_875_000), 0)
        }}), que baja a UI 1.250.000 ({{ formatUYU(uiToPesos(1_250_000), 0) }}) si configura más de
        183 días o invierte más de UI 45.000.000 en capacidad productiva. Para cónyuges, esos montos
        fijos son el 15%.
      </p>
      <p class="text-body-2 mb-3">
        Dentro del régimen de impatriados hay dos tasas reducidas: el art. 24-Bis sub-apartado i) →
        <strong>6%</strong>, y el art. 24 lit. b) (el viejo «7% para siempre») →
        <strong>7%</strong>.
      </p>

      <VAlert
        type="info"
        variant="tonal"
        density="compact"
        class="mb-0"
        icon="mdi-clock-alert-outline"
      >
        <strong>Dato perecedero:</strong> existe un «Proyecto de Ley de Competitividad» que podría
        volver a modificar el régimen de impatriados.
        <strong>No verificamos su contenido ni su estado parlamentario.</strong> Esta sección está
        verificada al {{ verifiedOnLabel }}: antes de tomar una decisión de residencia, confirmá que
        el régimen siga igual.
      </VAlert>
    </VCard>

    <!-- 11. Impuesto al Patrimonio -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-scale-balance</VIcon>
        Impuesto al Patrimonio (personas físicas)
      </h2>

      <VAlert type="success" variant="tonal" density="compact" class="mb-3" icon="mdi-earth-off">
        <strong>El Impuesto al Patrimonio es TERRITORIAL</strong> (Título 14, art. 10): grava solo
        los bienes situados, colocados o utilizados económicamente en la República. Es decir:
        <strong
          >tu cartera en un bróker del exterior y tu inmueble en el exterior NO pagan Impuesto al
          Patrimonio uruguayo</strong
        >, aunque desde 2026 sus rentas sí paguen IRPF. Son dos impuestos distintos y se confunden
        todo el tiempo.
      </VAlert>

      <p class="text-body-2 mb-3">
        <strong>Residentes: 0,10% plano.</strong> No es una escala progresiva. La escala del Título
        14 art. 53 se fue abatiendo 0,10 puntos por año desde 2016, con piso de 0,10%, y
        <strong>ya convergió</strong>.
      </p>
      <VAlert
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-3"
        icon="mdi-alert-outline"
      >
        La escala de <strong>0,70 / 1,10 / 1,40 / 1,50%</strong> que circula en muchas guías es la
        de <strong>no residentes que no tributan IRNR</strong>. Confundirla con la de residentes es
        el error más común sobre este impuesto.
      </VAlert>

      <p class="text-body-2 mb-3">
        <strong>Mínimo no imponible del ejercicio 2025</strong> (el que se declara en 2026, Dec.
        334/025): <strong>$6.653.000</strong> para personas físicas y
        <strong>$13.306.000</strong> para el núcleo familiar.
        <strong>El MNI de 2026 todavía no existe</strong>: lo fija un decreto a fines de 2026. Por
        eso mostramos el dato con su año explícito y no lo proyectamos.
      </p>

      <p class="text-body-2 mb-2"><strong>No computables:</strong></p>
      <ul class="imp-list mb-3">
        <li>
          Deuda pública, valores del BHU y del BCU (incluidas las LRM), Bonos y Letras de Tesorería.
        </li>
        <li>Acciones de la CND.</li>
        <li>Fondos acumulados en las AFAP.</li>
        <li>Obligaciones negociables de empresas que cotizan en bolsa.</li>
      </ul>

      <p class="text-body-2 mb-0">
        <strong>Depósitos bancarios de personas físicas:</strong> el art. 23 los lista «al solo
        efecto de la determinación ficta del valor del ajuar». La lectura estándar es que
        <strong>no están en la base gravada pero sí suman para el ajuar ficto</strong>. La redacción
        de la norma es oblicua, así que lo publicamos con esa salvedad y no como afirmación
        categórica.
      </p>
    </VCard>

    <!-- 12. IASS -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-account-cash-outline</VIcon>
        IASS 2026 (jubilaciones y pensiones)
      </h2>
      <p class="text-body-2 mb-3">
        El IASS no grava inversiones, pero se cruza con ellas en cualquier planificación de retiro,
        y
        <strong>la mayoría de las calculadoras uruguayas lo publica mal</strong>. Estas son las
        franjas vigentes, con la BPC de hoy ({{ formatUYU(bpc, 0) }}):
      </p>
      <VTable density="comfortable" class="imp-table mb-3">
        <thead>
          <tr>
            <th>Ingresos anuales</th>
            <th class="text-right">En pesos (BPC de hoy)</th>
            <th class="text-right">Tasa</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(b, i) in iassBrackets" :key="'i' + i">
            <td class="font-weight-medium">{{ b.label }}</td>
            <td class="text-right">{{ b.pesos }}</td>
            <td class="text-right font-weight-bold imp-rate-cell">{{ b.rate }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="text-body-2 mb-3">
        Mínimo no imponible mensualizado: <strong>9 BPC</strong> ({{
          formatUYU(bpcToPesos(9), 0)
        }}).
      </p>
      <VAlert
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-0"
        icon="mdi-alert-outline"
      >
        <strong
          >Las calculadoras que salen primero en Google siguen publicando 96 BPC y una primera
          franja del 10%. Eso está desactualizado.</strong
        >
        Hoy son <strong>108 BPC exentos</strong> y la primera franja es del <strong>6%</strong>. Si
        copiás de ahí, publicás un error.
      </VAlert>
    </VCard>

    <!-- 13. Cómo se declara -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-file-document-edit-outline</VIcon>
        Cómo se declara
      </h2>
      <ul class="imp-list mb-3">
        <li>
          <strong>Formulario 1101</strong> = IRPF Categoría I (rentas de capital). Los formularios
          1102 y 1103 son de Categoría II (trabajo).
        </li>
        <li>
          <strong>Campaña 2026 (ejercicio 2025): del 29 de junio al 31 de agosto de 2026</strong>,
          ventana única.
          <strong
            >No hay escalonamiento por terminación de RUT o de cédula para la declaración jurada
            anual</strong
          >
          — ese escalonamiento aplica a obligaciones mensuales. Si una guía te da una fecha según tu
          dígito, no es para esta declaración.
        </li>
        <li>
          En Uruguay hay <strong>retención automática</strong>: bancos, sujetos pasivos de IRAE y
          organismos públicos retienen. Podés darle carácter definitivo a esa retención y quedar
          liberado de la declaración. En alquileres, retiene la administradora al
          {{ pct(RENT_WITHHOLDING_PCT) }}.
        </li>
        <li>
          <strong>Los brókers del exterior no retienen nada en Uruguay.</strong> Ahí te corresponden
          los anticipos semestrales al {{ pct(FOREIGN_GENERAL_PCT) }} o la declaración jurada.
        </li>
      </ul>
      <p class="text-body-2 mb-2"><strong>Multas por mora</strong> (Código Tributario, art. 94):</p>
      <ul class="imp-list mb-0">
        <li><strong>5%</strong> dentro de los 5 días hábiles.</li>
        <li><strong>10%</strong> hasta 90 días corridos.</li>
        <li><strong>20%</strong> después, más un recargo mensual.</li>
        <li>
          Declaración jurada fuera de plazo: <strong>$910</strong>, monto uniforme sin importar
          cuánto te atrasaste (Res. DGI 097/026).
        </li>
      </ul>
    </VCard>

    <!-- 14. CRS -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-eye-outline</VIcon>
        CRS: ¿la DGI ya ve tu cuenta del exterior?
      </h2>
      <p class="text-body-2 mb-3">
        <strong>Uruguay aplica el CRS desde 2017</strong> (Ley 19.484): informa y
        <strong>recibe información automáticamente</strong> de las jurisdicciones socias. El
        intercambio alcanza cuentas de depósito, <strong>cuentas de custodia</strong>,
        participaciones de capital y de deuda, seguros con valor de rescate y rentas vitalicias.
      </p>
      <VAlert type="info" variant="tonal" density="compact" class="mb-3" icon="mdi-flag-outline">
        <strong>Estados Unidos no está en el CRS.</strong> Uruguay no figura en la lista de acuerdos
        FATCA del Tesoro estadounidense. Con EE.UU. hay un acuerdo de intercambio
        <strong>a requerimiento</strong>, caso por caso: no es automático ni «al barrer».
      </VAlert>
      <VAlert
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-0"
        icon="mdi-help-circle-outline"
      >
        <strong>Matiz que NO verificamos.</strong> Se dice que los clientes no estadounidenses de
        brókers como Interactive Brokers suelen ser onboardeados a entidades en Irlanda, Reino Unido
        o Hungría, que <strong>sí</strong> están en el CRS.
        <strong>No verificamos a qué entidad se asigna a los residentes uruguayos</strong>, así que
        no lo afirmamos. Si te importa, pedile a tu bróker por escrito con qué entidad tenés el
        contrato.
      </VAlert>
    </VCard>

    <!-- 15. Mitos -->
    <VCard variant="flat" class="imp-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 imp-title">
        <VIcon start size="small" color="primary">mdi-comment-remove-outline</VIcon>
        Mitos que circulan (y lo que dice la norma)
      </h2>
      <VTable density="comfortable" class="imp-table imp-myths">
        <thead>
          <tr>
            <th>Lo que se dice</th>
            <th>Lo que dice la norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(m, i) in myths" :key="'m' + i">
            <td class="imp-myth-claim">«{{ m.myth }}»</td>
            <!-- Static, authored-in-code copy (no user input): the markup is the emphasis. -->
            <!-- eslint-disable-next-line vue/no-v-html -->
            <td v-html="m.truth" />
          </tr>
        </tbody>
      </VTable>
    </VCard>

    <!-- 16. Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mb-4"
      icon="mdi-alert-outline"
    >
      Esta guía es
      <strong>informativa y no constituye asesoramiento tributario, legal ni financiero</strong>.
      Las tasas que publicamos salen de la norma y llevan el artículo y la fecha de verificación ({{
        verifiedOnLabel
      }}), pero tu situación concreta puede tener matices que una página no puede cubrir: el régimen
      aplicable depende de tu residencia fiscal, del instrumento, del plazo, de la fuente de la
      renta y de si tenés o no agente de retención.
      <strong>Consultá siempre con un contador</strong> antes de declarar, y verificá las normas
      vigentes en la DGI. En el caso de <strong>criptomonedas</strong>, la ley directamente no fija
      una tasa: cualquier número que veas por ahí es una interpretación.
    </VAlert>

    <!-- 17. Fuentes -->
    <VCard variant="flat" class="imp-section mb-6 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes primarias
      </h2>
      <ul class="imp-sources mb-3">
        <li v-for="(src, i) in officialSources" :key="'o' + i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
      <p class="text-caption imp-law mb-0">
        Normas citadas sin enlace directo: Ley 20.446 (Presupuesto), Ley 18.718, Ley 19.484 (CRS),
        Ley 18.083, Ley 16.906, Decreto 148/007, Resolución DGI 1517/2026, Decreto 334/025,
        Resolución DGI 097/026, Código Tributario art. 94, Títulos 8 y 14 del Texto Ordenado.
        Verificado el {{ verifiedOnLabel }}.
      </p>
    </VCard>

    <!-- Related -->
    <VRow class="my-6">
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/herramientas/calculadora-impuestos-inversiones')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-chart-box-outline</VIcon>
          <h2 class="text-subtitle-1 font-weight-bold mb-1">
            Calculadora de impuestos sobre inversiones
          </h2>
          <p class="text-body-2 imp-muted mb-0">
            Las mismas tasas de esta página, aplicadas a tu caso: cuánto IRPF paga tu plazo fijo, tu
            dividendo, tu alquiler o tu cuenta en el exterior, y cuál es tu
            <strong>rendimiento neto</strong>. También arma tu declaración anual.
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
          <h2 class="text-subtitle-1 font-weight-bold mb-1">Dónde invertir en Uruguay</h2>
          <p class="text-body-2 imp-muted mb-0">
            Bancos, fintech, brókers internacionales, renta fija local, fondos y cripto: riesgos,
            mínimos, comisiones y regulación de cada opción.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/herramientas/calculadora-irpf')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-calculator</VIcon>
          <h2 class="text-subtitle-1 font-weight-bold mb-1">Calculadora de IRPF (sueldo)</h2>
          <p class="text-body-2 imp-muted mb-0">
            Ojo: esa calculadora es de <strong>IRPF Categoría II</strong> (rentas del trabajo). Lo
            de esta página es la <strong>Categoría I</strong>, las rentas de capital. Son dos
            liquidaciones distintas.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import {
  CRYPTO_RULE,
  DIVIDEND_RULE,
  EXEMPT_ANNUAL_UI,
  EXEMPT_PER_OPERATION_UI,
  FOREIGN_CUSTODIAN_WITHHOLDING_PCT,
  FOREIGN_GENERAL_PCT,
  PUBLIC_DEBT_RULE,
  RENT_WITHHOLDING_PCT,
  SMALL_LANDLORD_MAX_BPC,
  SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC,
  VERIFIED_ON,
  depositRule,
  type Currency,
  type DepositTerm,
} from '~/utils/capitalTax'
import { formatUYU, formatUSD } from '~/utils/format'
import { currentIndicatorValue, indicatorFromSlug } from '~/utils/indicators'
import type { ExchangeRate } from '~/types/api'

const localePath = useLocalePath()

// ── Live values ──────────────────────────────────────────────────────────────
// The legal thresholds on this page are expressed in BPC or in UI by the norms
// themselves, so we NEVER hardcode their peso equivalent: we read BPC and UI live
// and derive every peso figure from them. That keeps the page correct on its own
// when the BPC changes each January and the UI moves daily.

const BPC_FALLBACK = 6864
// Used only when the rates API returns no rows at all (down/unreachable) — see the `ui`
// computed below. `currentIndicatorValue` has its OWN internal fallback (the indicator's
// static `referenceValue`, currently 6.58) for the separate, rarer case where rows come back
// but none of them is a UI row; that path is intentionally left alone here.
const UI_FALLBACK = 6.6142

const { data: figures } = await useFetch<{ bpc: number; asOf: string | null }>('/api/uy-figures', {
  key: 'uy-figures',
  default: () => ({ bpc: BPC_FALLBACK, asOf: null }),
})
const bpc = computed(() => {
  const v = figures.value?.bpc
  return typeof v === 'number' && v > 0 ? v : BPC_FALLBACK
})

// Reuse the site's shared, SSR-friendly rates fetch (deduped by key) for both the
// UI value and the USD reference, instead of hitting the API twice.
const { rows, bestSell } = useExchangeRates()
const ui = computed(() => {
  // `currentIndicatorValue` never returns 0/null — when it can't find a UI row it falls back
  // to the indicator's static reference value (6.58) instead. So the only reliable signal that
  // the rates API is actually down is an empty row set: check that FIRST, before calling the
  // helper, so UI_FALLBACK is the value that's actually used when live data is unavailable.
  if (!rows.value?.length) return UI_FALLBACK
  const ind = indicatorFromSlug('unidad-indexada')
  if (!ind) return UI_FALLBACK
  return currentIndicatorValue(rows.value as ExchangeRate[], ind)
})
const usdRate = computed(() => bestSell('USD'))

const uiToPesos = (units: number) => units * ui.value
const bpcToPesos = (units: number) => units * bpc.value
/** `≈ US$ x` suffix, only when we actually have a live dollar rate. */
const usdSuffix = (uyu: number) =>
  usdRate.value && usdRate.value > 0 ? ` ≈ ${formatUSD(uyu / usdRate.value, 0)}` : ''

const verifiedOnLabel = new Date(`${VERIFIED_ON}T00:00:00`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** `5.5` -> `'5,5%'`; `null` -> `'—'` (crypto never reaches here, but the type allows it). */
const pct = (n: number | null) => (n === null ? '—' : `${String(n).replace('.', ',')}%`)
const formatInt = (n: number) => n.toLocaleString('es-UY')

// ── Deposit matrix (3 currencies × 3 terms = the nine cells) ──────────────────
const depositRows: { label: string; currency: Currency }[] = [
  { label: 'Pesos, tasa fija nominal', currency: 'UYU' },
  { label: 'Pesos con reajuste (UI)', currency: 'UYU_UI' },
  { label: 'Moneda extranjera (USD)', currency: 'USD' },
]
const depositTerms: { key: DepositTerm; label: string }[] = [
  { key: 'hasta_1a', label: 'Hasta 1 año' },
  { key: 'de_1a_3a', label: 'De 1 a 3 años' },
  { key: 'mas_3a', label: 'Más de 3 años' },
]

const rentDeductions = [
  'Comisión de la administradora de propiedades (no una comisión inmobiliaria genérica).',
  'Honorarios profesionales por el contrato de arrendamiento.',
  'El IVA de esos servicios.',
  'Contribución Inmobiliaria.',
  'Impuesto de Enseñanza Primaria.',
  'El arrendamiento pagado por el subarrendador.',
  'Créditos incobrables.',
]

const fictoCases = [
  {
    caso: 'Inmuebles no rurales adquiridos antes del 1/7/2007',
    base: '15% del precio',
    efectiva: '1,8%',
    naturaleza: 'Opción',
  },
  {
    caso: 'Inmuebles rurales anteriores a 2007',
    base: '15% del valor en plaza al 1/7/2007 + la diferencia de precio',
    efectiva: 'Distinta de 1,8%',
    naturaleza: 'Fórmula distinta',
  },
  {
    caso: 'Valores y bienes muebles sin costo probable',
    base: '20% del precio',
    efectiva: '2,4%',
    naturaleza: 'Obligatorio',
  },
  {
    caso: 'Bienes anteriores a la Ley 18.083',
    base: '20% del precio',
    efectiva: '2,4%',
    naturaleza: 'Opción',
  },
  {
    caso: 'Bienes en el exterior (desde 2026)',
    base: '20% del precio',
    efectiva: '2,4%',
    naturaleza: 'Opción anual, vía declaración jurada',
  },
  {
    caso: 'Inmuebles en el exterior (desde 2026)',
    base: '15% del precio',
    efectiva: '1,8%',
    naturaleza: 'Opción anual',
  },
]

const residencyRoutes = [
  { via: 'Inmuebles', ui: 15_000_000, extra: '—' },
  {
    via: 'Empresa',
    ui: 45_000_000,
    extra: 'Proyecto declarado de interés nacional (Ley 16.906)',
  },
  {
    via: 'Inmuebles <strong>(la vía más usada)</strong>',
    ui: 3_500_000,
    extra: 'Desde el 1/7/2020, más al menos 60 días de presencia efectiva',
  },
  {
    via: 'Empresa',
    ui: 15_000_000,
    extra: 'Desde el 1/7/2020, más al menos 15 puestos de trabajo nuevos, dependientes y full time',
  },
]

// IASS 2026 brackets. The rates are legal; the pesos come from the live BPC.
const iassBrackets = computed(() => [
  {
    label: 'Hasta 108 BPC',
    pesos: `Hasta ${formatUYU(bpcToPesos(108), 0)}`,
    rate: 'Exento',
  },
  {
    label: 'De 108 a 180 BPC',
    pesos: `${formatUYU(bpcToPesos(108), 0)} — ${formatUYU(bpcToPesos(180), 0)}`,
    rate: '6%',
  },
  {
    label: 'De 180 a 600 BPC',
    pesos: `${formatUYU(bpcToPesos(180), 0)} — ${formatUYU(bpcToPesos(600), 0)}`,
    rate: '24%',
  },
  {
    label: 'Más de 600 BPC',
    pesos: `Más de ${formatUYU(bpcToPesos(600), 0)}`,
    rate: '30%',
  },
])

const myths = [
  {
    myth: 'El impuesto a las ganancias me grava las inversiones',
    truth:
      'En Uruguay no existe un impuesto con ese nombre. Las rentas de tus inversiones las grava el <strong>IRPF Categoría I</strong> (si sos residente fiscal), el <strong>IRNR</strong> (si no lo sos) o el <strong>IRAE</strong> (si invertís a través de una empresa).',
  },
  {
    myth: 'El depósito en dólares de 1 a 3 años no tributa',
    truth:
      'Paga <strong>12%</strong>. En la tabla de la DGI esa celda es un <code>rowspan</code> y por eso mucha gente la copia vacía.',
  },
  {
    myth: 'Vender acciones siempre paga 2,4%',
    truth:
      'El ficto del 20% (≈ 2,4%) <strong>no es el régimen por defecto</strong>. Es obligatorio solo si no podés probar el costo. Con costo documentado, la regla es la real: <strong>12% sobre la ganancia efectiva</strong>.',
  },
  {
    myth: 'Las rentas del exterior pagan 8%',
    truth:
      'La tasa es <strong>12%</strong>. El <strong>8% es una retención</strong> que solo puede aplicar un bróker uruguayo que <strong>además ejerza la custodia</strong> de los activos, y es definitiva solo si vos optás por tomarla así.',
  },
  {
    myth: 'El alquiler paga 10,5%',
    truth:
      'El <strong>10,5% es la retención</strong> sobre el bruto. La <strong>tasa es 12% sobre la renta neta</strong>, después de las deducciones admitidas.',
  },
  {
    myth: 'Para la exoneración de pequeños arrendadores hay que identificar al inquilino',
    truth:
      'No. Hay que tener rentas de hasta <strong>40 BPC anuales</strong> <strong>y</strong> autorizar el <strong>levantamiento del secreto bancario</strong>. Identificar al <em>arrendador</em> es otra cosa: le da al <em>inquilino</em> un crédito de hasta 8% del alquiler.',
  },
  {
    myth: 'Tengo dólares y subió el dólar, así que pago IRPF',
    truth:
      'No. La <strong>diferencia de cambio por tenencia de moneda extranjera está exenta</strong> (art. 38 lits. G y H).',
  },
  {
    myth: 'La herencia paga IRPF',
    truth:
      'No. La transferencia por sucesión no es una alteración patrimonial gravada (art. 27 lit. B). Uruguay <strong>no tiene impuesto sucesorio</strong>.',
  },
  {
    myth: 'El Impuesto al Patrimonio de un residente va de 0,70% a 1,50%',
    truth:
      'Los residentes pagan <strong>0,10% plano</strong>. Esa escala progresiva es la de los <strong>no residentes que no tributan IRNR</strong>.',
  },
  {
    myth: 'Mi cartera en un bróker del exterior paga Impuesto al Patrimonio',
    truth:
      'No: el Impuesto al Patrimonio es <strong>territorial</strong>. Tus activos en el exterior no lo pagan — aunque desde 2026 sus <em>rentas</em> sí paguen IRPF.',
  },
  {
    myth: 'El IASS arranca en 96 BPC y la primera franja es 10%',
    truth:
      'Está desactualizado. Hoy son <strong>108 BPC exentos</strong> y la primera franja es del <strong>6%</strong>.',
  },
  {
    myth: 'Me hago residente y consigo el 7% para siempre',
    truth:
      'La opción del art. 24 <strong>solo podía ejercerse hasta el 31/12/2025</strong>. Quien se hace residente desde 2026 va al <strong>art. 24-Bis</strong>.',
  },
  {
    myth: 'La declaración jurada vence según el último dígito de mi cédula',
    truth:
      'Para la <strong>declaración anual</strong> no hay escalonamiento: es una <strong>ventana única</strong> (en 2026, del 29 de junio al 31 de agosto). El escalonamiento por dígito es para obligaciones mensuales.',
  },
  {
    myth: 'Interponer una sociedad en el exterior difiere el impuesto',
    truth:
      'Ya no. El art. 21 imputa esas rentas <strong>directamente al beneficiario final con participación ≥ 5%</strong>, se distribuyan o no, y el art. 22 (que lo limitaba a jurisdicciones de baja tributación) <strong>fue derogado</strong>.',
  },
]

const officialSources = [
  {
    label: 'IMPO — Texto Ordenado, Título 7 (IRPF)',
    url: 'https://www.impo.com.uy/bases/todgi-2023/7-2024',
  },
  {
    label: 'DGI — IRPF, rendimientos de capital mobiliario (matriz de tasas de depósitos)',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario',
  },
  {
    label: 'IMPO — Decreto 95/026 (reglamenta las rentas de fuente extranjera desde 2026)',
    url: 'https://www.impo.com.uy/bases/decretos-originales/95-2026',
  },
  {
    label: 'BPS — Impuesto de Asistencia a la Seguridad Social (IASS)',
    url: 'https://www.bps.gub.uy/18002/el-impuesto-de-asistencia-a-la-seguridad-social-iass.html',
  },
  {
    label: 'IMPO — Ley 20.345 (activos virtuales)',
    url: 'https://www.impo.com.uy/bases/leyes-originales/20345-2024',
  },
]

// ── SEO ──────────────────────────────────────────────────────────────────────
const canonicalUrl = 'https://cambio-uruguay.com/impuestos-inversiones-uruguay'
const title = 'Impuestos sobre inversiones en Uruguay: guía del IRPF Categoría I (2026)'
const description =
  'El «impuesto a las ganancias» no existe en Uruguay: las rentas de tus inversiones pagan IRPF Categoría I. Tasas por instrumento verificadas contra la norma: depósitos, dividendos, alquileres, ganancias de capital, deuda pública, brókers del exterior desde 2026, residencia fiscal, Impuesto al Patrimonio e IASS.'

defineOgImageComponent('Cambio', {
  title: 'Impuestos sobre inversiones',
  subtitle: 'IRPF Categoría I: tasas verificadas contra la norma',
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
        'impuesto a las ganancias uruguay, irpf inversiones, irpf categoria 1, rentas de capital, impuestos cripto uruguay, impuestos broker exterior, residencia fiscal uruguay, tax holiday uruguay, impuesto al patrimonio, iass, irnr, declaracion jurada irpf',
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
                name: 'Impuestos sobre inversiones en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Existe el impuesto a las ganancias en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No. En Uruguay no existe un impuesto con ese nombre. Las rentas de las inversiones las grava el IRPF Categoría I si sos residente fiscal, el IRNR si no lo sos, y el IRAE si invertís a través de una empresa. La tasa general del IRPF Categoría I es 12%, con tasas reducidas por instrumento y plazo.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Pago impuestos por invertir en un bróker del exterior?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Sí, desde el 1 de enero de 2026. La Ley 20.446 extendió el IRPF a todos los rendimientos de capital del exterior y, por primera vez, a los incrementos patrimoniales del exterior (vender acciones, ETFs o bonos extranjeros). La tasa es 12%. El 8% no es una tasa: es una retención reducida que solo puede aplicar un bróker uruguayo que además ejerza la custodia de los activos, y es definitiva solo si el contribuyente opta por tomarla como tal. Si no hay agente de retención uruguayo, corresponden anticipos semestrales al 12%. Además, para activos que coticen en bolsas de reconocido prestigio y adquiridos antes del 31/12/2025, el costo fiscal es la cotización al 31/12/2025: toda la apreciación anterior a 2026 queda fuera del impuesto.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cuánto se paga por vender acciones en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'La regla general es la real: (precio de venta menos costo fiscal actualizado) por 12%. La base ficta del 20% del precio, que equivale a una tasa efectiva de 2,4%, no es el régimen por defecto: es obligatoria solo cuando no se puede probar el costo, y es una opción en otros casos. Además, están exentas las operaciones de hasta 30.000 UI cada una cuya suma anual sea menor a 90.000 UI, y las acciones y obligaciones negociables con oferta pública y cotización bursátil.',
                },
              },
              {
                '@type': 'Question',
                name: '¿La cripto paga impuestos en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No está resuelto y no publicamos un porcentaje. No hay norma tributaria específica para criptomonedas. La única posición oficial conocida es la Consulta DGI Nº 6.419 (2021), que la trataría como bien mueble incorporal o intangible, y que citamos según fuentes secundarias porque no accedimos a su texto primario. La Ley 20.345 regula a los proveedores de servicios de activos virtuales, no la tributación. Tras la reforma de 2026, la fuente de la renta (uruguaya o extranjera) sigue sin definirse: ni el Decreto 95/026 ni la Resolución DGI 1517/2026 mencionan cripto. Consultá un contador.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Tener dólares paga IRPF si sube el dólar?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'No. La diferencia de cambio por la tenencia de moneda extranjera está exenta de IRPF (Título 7, art. 38, literales G y H). Tener dólares y que suba la cotización no genera impuesto.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cuándo se presenta la declaración de IRPF por rentas de capital?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'El IRPF Categoría I se declara con el Formulario 1101. La campaña 2026, correspondiente al ejercicio 2025, va del 29 de junio al 31 de agosto de 2026, en una ventana única: no hay escalonamiento por terminación de cédula o RUT para la declaración anual. Quien tuvo retención automática (bancos, sujetos pasivos de IRAE, organismos públicos) puede darle carácter definitivo y quedar liberado de la declaración.',
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
.bg-gradient-imp {
  background: linear-gradient(135deg, #7c2d12 0%, #1e3a8a 100%);
}

.imp-page {
  overflow-x: hidden;
}

.imp-intro {
  max-width: 780px;
  line-height: 1.6;
}

.imp-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

.imp-title-reform {
  border-left: 3px solid rgb(var(--v-theme-warning));
  padding-left: 10px;
}

.imp-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.imp-reform {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
}
.v-theme--light .imp-section {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}

/* Tables scroll inside their own box instead of pushing the page sideways. */
.imp-table {
  overflow-x: auto;
}

.imp-table :deep(td),
.imp-table :deep(th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.v-theme--light .imp-table :deep(td),
.v-theme--light .imp-table :deep(th) {
  border-bottom-color: rgba(0, 0, 0, 0.08);
}

.imp-table :deep(td) {
  font-size: 0.86rem;
  line-height: 1.5;
  padding-block: 8px;
}

.imp-rate-cell {
  white-space: nowrap;
}

.imp-myths :deep(td) {
  vertical-align: top;
}

.imp-myth-claim {
  font-style: italic;
  color: rgba(255, 255, 255, 0.72);
}
.v-theme--light .imp-myth-claim {
  color: rgba(0, 0, 0, 0.72);
}

.imp-list {
  margin: 0;
  padding-left: 1.15rem;
}

.imp-list li {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  line-height: 1.6;
}

.imp-law {
  color: rgba(255, 255, 255, 0.6);
}
.v-theme--light .imp-law {
  color: rgba(0, 0, 0, 0.6);
}

.imp-muted {
  color: rgba(255, 255, 255, 0.75);
}
.v-theme--light .imp-muted {
  color: rgba(0, 0, 0, 0.75);
}

.imp-sources {
  margin: 0;
  padding-left: 1.1rem;
}

.imp-sources li {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  line-height: 1.6;
}

.imp-link,
.imp-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}

.imp-link:hover,
.imp-sources a:hover {
  text-decoration: underline;
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
