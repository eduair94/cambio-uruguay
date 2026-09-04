<template>
  <div class="loantier-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/prestamos-uruguay')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Préstamos en Uruguay
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5 hero-card" elevation="8">
      <div class="hero pa-6 pa-md-8 on-dark">
        <p class="hero-eyebrow">Tier list · se revisa sola todas las semanas</p>
        <h1 class="hero-title">
          Los mejores lugares para pedir un préstamo en Uruguay
          <span class="hero-title-accent">(y cuáles te prestan estando en el clearing)</span>
        </h1>
        <p class="hero-lead">
          Rankeamos {{ lenders.length }} bancos, financieras, cooperativas y fintech con una rúbrica
          transparente. El puesto no lo escribimos a mano: <strong>sale de los datos</strong> —tasa,
          a quién le prestan, letra chica, rapidez, montos— y un robot vuelve a leer las páginas
          oficiales de cada prestamista cada domingo. Si a alguno le sube la tasa, baja de tier
          solo.
        </p>
        <div class="hero-meta">
          <span class="hero-badge">
            <VIcon size="15" class="mr-1">mdi-account-alert-outline</VIcon>
            {{ clearingCount }} prestan con antecedentes en el Clearing
          </span>
          <span v-if="asOfLabel" class="hero-badge">
            <VIcon size="15" class="mr-1">mdi-refresh</VIcon>
            Datos reverificados el {{ asOfLabel }}
          </span>
        </div>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons text="Tier list: dónde conviene pedir un préstamo en Uruguay" />
        </div>
      </div>
    </VCard>

    <VAlert
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-5"
      icon="mdi-information-outline"
    >
      Esto es información, no asesoramiento financiero. Las tasas son las
      <strong>publicadas</strong>
      por cada prestamista: la que te va a cobrar a vos figura en el contrato como
      <strong>CFT</strong> y casi siempre es más alta, porque en Uruguay la TEA que se publicita
      suele no incluir el IVA sobre los intereses.
    </VAlert>

    <!-- Controls -->
    <VCard variant="flat" class="controls-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon size="18" color="primary">mdi-tune-variant</VIcon>
        <span class="text-subtitle-2 font-weight-bold">¿Quién sos y qué necesitás?</span>
      </div>
      <p class="text-caption text-medium-emphasis mb-3">
        No hay un “mejor préstamo”: hay uno mejor <em>para vos</em>. Elegí tu situación y el tablero
        se reordena.
      </p>

      <div class="d-flex flex-wrap ga-2 mb-4">
        <button
          v-for="p in LOAN_PROFILE_PRESETS"
          :key="p.id"
          type="button"
          class="preset-chip"
          :class="{ 'preset-chip--on': activePresetId === p.id }"
          :aria-pressed="activePresetId === p.id"
          @click="applyPreset(p)"
        >
          <VIcon size="16" class="mr-1">{{ p.icon }}</VIcon>
          {{ p.label }}
        </button>
      </div>

      <div class="criteria-grid mb-2">
        <button
          v-for="dim in LOAN_RUBRIC"
          :key="dim.id"
          type="button"
          class="crit-chip"
          :class="{ 'crit-chip--off': !activeDims.includes(dim.id) }"
          :aria-pressed="activeDims.includes(dim.id)"
          :disabled="activeDims.length === 1 && activeDims.includes(dim.id)"
          @click="toggleDim(dim.id)"
        >
          <VIcon size="15" class="mr-1">{{ dim.icon }}</VIcon>
          <span>{{ dim.short }}</span>
          <span class="crit-weight">{{ dim.weight }}</span>
        </button>
      </div>

      <p class="active-hint">
        <VIcon size="15" class="mr-1" color="primary">mdi-eye-outline</VIcon>
        <span>{{ activeHint }}</span>
      </p>

      <div class="d-flex flex-wrap align-center ga-2 mt-3">
        <span class="text-caption text-medium-emphasis mr-1">Mostrar:</span>
        <button
          v-for="opt in segmentOptions"
          :key="opt.value"
          type="button"
          class="kind-chip"
          :class="{ 'kind-chip--on': segmentFilter === opt.value }"
          @click="segmentFilter = opt.value"
        >
          {{ opt.label }}
        </button>
        <VDivider vertical class="mx-1 d-none d-sm-block" />
        <button
          type="button"
          class="kind-chip kind-chip--flag"
          :class="{ 'kind-chip--on': onlyClearing }"
          :aria-pressed="onlyClearing"
          @click="onlyClearing = !onlyClearing"
        >
          <VIcon size="14" class="mr-1">mdi-account-alert-outline</VIcon>
          Solo los que prestan con clearing
        </button>
      </div>
    </VCard>

    <!-- The board -->
    <section class="board mb-6" aria-label="Tier list de prestamistas de Uruguay">
      <div v-for="row in board" :key="row.tier.id" class="tier-row" :data-tier="row.tier.id">
        <div class="tier-gem" :style="gemStyle(row.tier.id)">
          <span class="tier-letter">{{ row.tier.label }}</span>
        </div>
        <div class="tier-body">
          <p class="tier-blurb">{{ row.tier.blurb }}</p>
          <TransitionGroup name="tile" tag="div" class="tier-tiles">
            <button
              v-for="r in row.items"
              :key="r.entity.id"
              type="button"
              class="tile"
              :class="{ 'tile--open': openId === r.entity.id }"
              @click="openFicha(r.entity.id)"
            >
              <span class="tile-mono" :style="monoStyle(r.entity.id)">
                {{ monogram(r.entity.name) }}
              </span>
              <span class="tile-main">
                <span class="tile-name">{{ r.entity.name }}</span>
                <span class="tile-kind">
                  {{ SEGMENT_LABELS[r.entity.segment] }}
                  <span v-if="r.entity.clearing === 'si'" class="tile-clear">· con clearing</span>
                </span>
              </span>
              <span class="tile-score" :class="scoreClass(r.score)">{{ r.score }}</span>
            </button>
            <span v-if="!row.items.length" key="empty" class="tier-empty">
              {{ emptyCaption(row.tier.id) }}
            </span>
          </TransitionGroup>
        </div>
      </div>
    </section>

    <!-- What moved this week -->
    <VCard v-if="changes.length" variant="flat" class="changes-card pa-4 pa-sm-5 mb-6">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon size="18" color="primary">mdi-swap-vertical-bold</VIcon>
        <span class="text-subtitle-2 font-weight-bold">Qué cambió en la última revisión</span>
        <VChip v-if="asOfLabel" size="x-small" variant="tonal" class="ml-auto">
          {{ asOfLabel }}
        </VChip>
      </div>
      <ul class="changes-list">
        <li v-for="c in changes" :key="c.id">
          <strong>{{ c.name }}</strong> — {{ c.text }}
        </li>
      </ul>
    </VCard>

    <!-- Methodology -->
    <VExpansionPanels class="mb-6 method-panels">
      <VExpansionPanel>
        <VExpansionPanelTitle>
          <VIcon start color="primary" size="small">mdi-scale-balance</VIcon>
          <span class="font-weight-bold">Cómo se calcula (y por qué se actualiza sola)</span>
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="text-body-2 mb-4">
            Cinco de las seis dimensiones <strong>no las puntuamos a mano</strong>: salen de los
            datos duros de cada prestamista. La tasa se convierte en puntaje sobre una escala
            logarítmica —pasar de 25% a 45% duele mucho más que de 120% a 140%—, el acceso sale de
            su política de clearing y del ingreso mínimo que exigen, y así con el resto. El puntaje
            general es el promedio ponderado y el tier sale del puntaje.
          </p>
          <p class="text-body-2 mb-4">
            Eso es lo que hace que la lista siga siendo cierta dentro de seis meses:
            <strong>todos los domingos</strong> un agente vuelve a leer las páginas oficiales de
            cada prestamista, verificamos que la URL que cita exista de verdad y solo entonces los
            datos entran. Si a una financiera le sube la TEA o deja de prestar a gente con
            antecedentes, baja de tier sin que nadie toque el código. Cuando la revisión no puede
            confirmar algo, se queda el dato de la semana anterior: preferimos viejo y correcto
            antes que nuevo e inventado.
          </p>
          <p class="text-body-2 mb-4">
            La excepción es <strong>Reputación</strong>, que sí ponemos a mano a partir de reseñas,
            hilos de Reddit y prensa. Ninguna pasada automática la mueve.
          </p>
          <div v-for="dim in LOAN_RUBRIC" :key="dim.id" class="method-dim">
            <div class="d-flex align-center justify-space-between mb-1 ga-2">
              <span class="font-weight-bold text-body-2">
                <VIcon size="15" class="mr-1">{{ dim.icon }}</VIcon
                >{{ dim.label }}
              </span>
              <span class="d-flex align-center ga-2">
                <VChip size="x-small" :color="dim.derived ? 'primary' : 'grey'" variant="tonal">
                  {{ dim.derived ? 'calculada' : 'editorial' }}
                </VChip>
                <VChip size="x-small" color="primary" variant="tonal">peso {{ dim.weight }}</VChip>
              </span>
            </div>
            <p class="text-caption text-medium-emphasis mb-3">{{ dim.what }}</p>
          </div>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Clearing section: the reason most people land here -->
    <section id="con-clearing" class="mb-8">
      <h2 class="section-heading mb-1">¿Quién presta si estoy en el clearing?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        La pregunta más repetida, y la que peor se contesta en internet. Estos son los prestamistas
        para los que encontramos evidencia de que evalúan a alguien con antecedentes. Los ordenamos
        por cuánto cuestan y cómo tratan al cliente, no por cuánto se publicitan.
      </p>

      <VCard variant="flat" class="clearing-card pa-4 pa-sm-5 mb-4">
        <VDataTable
          :headers="clearingHeaders"
          :items="clearingRows"
          :items-per-page="-1"
          :mobile="smAndDown"
          hide-default-footer
          density="comfortable"
          class="clearing-table"
        >
          <template #item.name="{ item }">
            <button type="button" class="linkish" @click="openFicha(item.id)">
              {{ item.name }}
            </button>
            <span class="d-block text-caption text-medium-emphasis">
              {{ SEGMENT_LABELS[item.segment] }}
            </span>
          </template>
          <template #item.clearing="{ item }">
            <span class="clearing-pill" :class="`clearing-pill--${item.clearing}`">
              {{ CLEARING_LABELS[item.clearing] }}
            </span>
          </template>
          <template #item.teaSort="{ item }">
            {{ teaLabel(item) }}
          </template>
          <template #item.clearingNote="{ item }">
            <span class="text-body-2">{{ item.clearingNote }}</span>
          </template>
        </VDataTable>
      </VCard>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mb-4" icon="mdi-alert">
        <strong>Estar en el clearing encarece la plata, no la hace imposible.</strong>
        Que alguien te preste con antecedentes casi siempre significa una de tres cosas: te presta
        menos, te cobra bastante más, o te pide una garantía (el auto, un codeudor, el descuento
        directo del sueldo). Antes de firmar, mirá si conviene primero
        <NuxtLink :to="localePath('/salir-del-clearing')" class="loantier-link">
          salir del clearing </NuxtLink
        >o
        <NuxtLink :to="localePath('/saldar-deudas-uruguay')" class="loantier-link">
          negociar la deuda que te dejó ahí </NuxtLink
        >: un préstamo caro para tapar una deuda vieja es la forma más común de empeorar el
        problema.
      </VAlert>

      <VCard variant="flat" class="pa-4 pa-sm-5 mb-2">
        <p class="text-subtitle-2 font-weight-bold mb-2">
          <VIcon size="16" color="primary" class="mr-1">mdi-shield-alert-outline</VIcon>
          Cómo reconocer una estafa de “préstamo sin clearing”
        </p>
        <ul class="warn-list">
          <li>
            <strong>Te piden un adelanto.</strong> Ningún prestamista legal cobra “gastos de
            gestión”, “sellado” o “seguro” <em>antes</em> de darte la plata. Si te piden depositar
            para recibir, es una estafa.
          </li>
          <li>
            <strong>Solo tienen WhatsApp y Facebook.</strong> Sin dirección, sin RUT, sin contrato
            escrito y sin figurar en los registros del BCU.
          </li>
          <li>
            <strong>Aprobación “sin importar tu situación”, al instante y sin papeles.</strong>
            Quien no evalúa nada no está prestando: está cobrando por la promesa.
          </li>
          <li>
            <strong>La tasa no aparece por ningún lado.</strong> Por la Ley 18.212 hay un tope de
            usura; quien no publica su tasa suele estar arriba de él.
          </li>
        </ul>
        <p class="text-caption text-medium-emphasis mb-0 mt-3">
          Más señales y qué hacer si ya caíste, en
          <NuxtLink :to="localePath('/estafas-uruguay')" class="loantier-link">
            estafas frecuentes en Uruguay </NuxtLink
          >.
        </p>
      </VCard>

      <VCard variant="flat" class="pa-4 pa-sm-5 mt-4">
        <p class="text-subtitle-2 font-weight-bold mb-2">
          <VIcon size="16" color="primary" class="mr-1">mdi-magnify</VIcon>
          Antes de pedir nada: fijate gratis cómo estás
        </p>
        <p class="text-body-2 mb-3">
          Son <strong>dos bases distintas</strong> y conviene mirar las dos. El
          <strong>Clearing de Informes</strong> es privado, lo opera Equifax y lo alimentan los
          acreedores que están afiliados. La <strong>Central de Riesgos</strong> es del Banco
          Central y solo reportan a ella las instituciones que el BCU supervisa. Una financiera no
          supervisada no aparece en la Central de Riesgos, pero sí te puede mandar al Clearing.
        </p>
        <VRow>
          <VCol cols="12" md="6">
            <p class="check-title">Central de Riesgos (BCU)</p>
            <p class="text-body-2 mb-2">
              Gratis, sin límite de veces y con respuesta inmediata. Se crea una cuenta con tu
              correo y listo.
            </p>
            <a
              href="https://consultadeuda.bcu.gub.uy/consultadeuda/"
              target="_blank"
              rel="noopener noreferrer"
              class="loantier-link text-body-2"
            >
              consultadeuda.bcu.gub.uy
            </a>
          </VCol>
          <VCol cols="12" md="6">
            <p class="check-title">Clearing de Informes (Equifax)</p>
            <p class="text-body-2 mb-2">
              Gratis una vez cada seis meses: es un derecho del artículo 14 de la Ley 18.331. El
              único canal gratuito es el teléfono <strong>2628 1515</strong>, interno 1, opción 2,
              de lunes a viernes. Lo mandan por mail dentro de los cinco días hábiles.
            </p>
            <p class="text-caption text-medium-emphasis mb-0">
              Si un dato está mal, el artículo 15 te da la rectificación sin cargo en cinco días
              hábiles — y mientras reclamás, quien te consulte debe ver que el dato está en
              revisión.
            </p>
          </VCol>
        </VRow>
      </VCard>

      <VCard variant="flat" class="pa-4 pa-sm-5 mt-4">
        <p class="text-subtitle-2 font-weight-bold mb-2">
          <VIcon size="16" color="primary" class="mr-1">mdi-format-list-numbered</VIcon>
          Qué significa tu categoría en el BCU (préstamos de consumo)
        </p>
        <p class="text-body-2 mb-3">
          Para el crédito al consumo la categoría es, lisa y llanamente,
          <strong>días de atraso</strong>. No hay ninguna norma que prohíba prestarle a una
          categoría concreta, pero el "no" aparece en la 3 por dos motivos: si figurás moroso en
          cualquier otra institución, este banco <em>no te puede clasificar mejor que 3</em> aunque
          con él estés impecable; y pasar de 2B a 3 le multiplica la previsión que tiene que
          constituir, así que el rechazo termina siendo económico antes que normativo.
        </p>
        <VTable density="compact" class="cat-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Qué es</th>
              <th>Atraso</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in BCU_CATEGORIES" :key="c.id">
              <td data-label="Categoría" class="font-weight-bold">{{ c.id }}</td>
              <td data-label="Qué es">{{ c.label }}</td>
              <td data-label="Atraso">{{ c.days }}</td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-caption text-medium-emphasis mb-0 mt-3">
          Dato que casi nadie menciona: si la cuota supera el <strong>30% del ingreso</strong> del
          núcleo familiar (15% si el crédito es en dólares), la norma obliga a clasificarte como
          categoría 3 como máximo, por buen pagador que seas.
        </p>
      </VCard>
    </section>

    <!-- How to check the lender yourself -->
    <section id="verificar" class="mb-8">
      <h2 class="section-heading mb-1">Cómo verificar vos mismo a quien te presta</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Antes de firmar con una empresa que no conocés, buscá su razón social en los registros del
        Banco Central. Son públicos, son tres, y la mayoría de la gente no sabe que existen. Ojo con
        una trampa: los registros publican la <strong>razón social</strong>, no el nombre de
        fantasía, así que hay que pedirle a la empresa con qué sociedad opera.
      </p>
      <VRow>
        <VCol v-for="r in BCU_REGISTERS" :key="r.name" cols="12" md="4">
          <VCard variant="flat" class="excl-card pa-4 h-100">
            <p class="text-subtitle-2 font-weight-bold mb-1">{{ r.name }}</p>
            <p class="text-body-2 mb-2">{{ r.what }}</p>
            <p class="text-caption text-medium-emphasis mb-2">{{ r.examples }}</p>
            <a
              :href="r.url"
              target="_blank"
              rel="noopener noreferrer"
              class="loantier-link text-caption"
            >
              Ver el registro
            </a>
          </VCard>
        </VCol>
      </VRow>
      <VAlert
        type="info"
        variant="tonal"
        density="comfortable"
        class="mt-4"
        icon="mdi-eye-off-outline"
      >
        <strong>Estar inscripta no es lo mismo que estar supervisada.</strong>
        Las administradoras de crédito de <em>menores</em> activos se inscriben igual que las
        grandes, pero el BCU no revisa su solvencia: las monitorea de forma reactiva, por denuncias.
        Además <strong>no reportan a la Central de Riesgos</strong>, así que la deuda que tengas con
        ellas no aparece en tu informe del BCU — y ellas tampoco ven ahí el resto de tu situación. Y
        hay un punto ciego declarado: las entidades otorgantes de crédito de
        <em>menor</em> actividad están alcanzadas por la norma pero
        <strong>no tienen registro público</strong>, así que un prestamista chico y legal puede no
        figurar en ninguna página del BCU.
      </VAlert>
    </section>

    <!-- Who is deliberately NOT on the board -->
    <section id="fuera-del-tablero" class="mb-8">
      <h2 class="section-heading mb-1">Los que no entran en el tablero (y por qué)</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Buscando prestamistas aparecen muchos nombres que no son prestamistas, y varios que sí lo
        son pero no prestan para lo que vos buscás. Dejamos la lista con el motivo, porque una
        ausencia sin explicación se lee como un olvido.
      </p>
      <VRow>
        <VCol v-for="e in EXCLUDED" :key="e.name" cols="12" md="6">
          <VCard variant="flat" class="excl-card pa-4 h-100">
            <div class="d-flex align-center ga-2 mb-1 flex-wrap">
              <span class="text-subtitle-2 font-weight-bold">{{ e.name }}</span>
              <VChip size="x-small" :color="e.tone" variant="tonal">{{ e.tag }}</VChip>
            </div>
            <p class="text-body-2 mb-0">{{ e.why }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Fichas -->
    <h2 class="section-heading mb-1">Ficha de cada prestamista</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Ordenadas según los criterios activos. Tocá uno del tablero para saltar a su ficha.
    </p>

    <VExpansionPanels v-model="openId" class="fichas">
      <VExpansionPanel
        v-for="r in rankedFichas"
        :key="r.entity.id"
        :ref="el => registerFicha(r.entity.id, el)"
        :value="r.entity.id"
        class="ficha"
        eager
      >
        <VExpansionPanelTitle>
          <div class="d-flex align-center ga-3 flex-grow-1">
            <span class="ficha-mono" :style="monoStyle(r.entity.id)">
              {{ monogram(r.entity.name) }}
            </span>
            <div class="flex-grow-1">
              <div class="d-flex align-center ga-2 flex-wrap">
                <span class="text-subtitle-1 font-weight-bold">{{ r.entity.name }}</span>
                <span class="ficha-tierbadge" :style="gemStyle(r.tier)">{{ r.tier }}</span>
                <VChip size="x-small" variant="tonal">
                  {{ SEGMENT_LABELS[r.entity.segment] }}
                </VChip>
                <VChip
                  v-if="r.entity.clearing === 'si'"
                  size="x-small"
                  color="success"
                  variant="tonal"
                >
                  Presta con clearing
                </VChip>
              </div>
              <p class="text-caption text-medium-emphasis mb-0 mt-1">{{ r.entity.tagline }}</p>
            </div>
            <div class="ficha-scorebox text-center flex-shrink-0">
              <div class="ficha-score" :class="scoreClass(r.score)">{{ r.score }}</div>
              <div class="text-caption text-medium-emphasis">/ 100</div>
            </div>
          </div>
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <VAlert
            v-if="r.entity.flag"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
            icon="mdi-alert-outline"
          >
            {{ r.entity.flag }}
          </VAlert>

          <!-- Hard facts strip -->
          <div class="facts-grid mb-4">
            <div class="fact">
              <span class="fact-label">TEA publicada</span>
              <span class="fact-value">{{ teaLabel(r.entity) }}</span>
            </div>
            <div class="fact">
              <span class="fact-label">Con clearing</span>
              <span class="fact-value">{{ CLEARING_LABELS[r.entity.clearing] }}</span>
            </div>
            <div class="fact">
              <span class="fact-label">Monto máximo</span>
              <span class="fact-value">{{ amountLabel(r.entity) }}</span>
            </div>
            <div class="fact">
              <span class="fact-label">Plazo máximo</span>
              <span class="fact-value">{{ termLabel(r.entity) }}</span>
            </div>
            <div class="fact">
              <span class="fact-label">Desembolso</span>
              <span class="fact-value">{{ speedLabel(r.entity) }}</span>
            </div>
            <div class="fact">
              <span class="fact-label">Ante el BCU</span>
              <span class="fact-value">{{ BCU_LABELS[r.entity.bcu] }}</span>
            </div>
          </div>

          <div class="d-flex flex-wrap ga-2 mb-4">
            <span
              v-for="(s, i) in r.entity.signals"
              :key="i"
              class="signal"
              :class="`signal--${s.tone}`"
            >
              <strong>{{ s.value }}</strong> {{ s.label }}
            </span>
          </div>

          <p class="ficha-verdict text-body-2 mb-4">
            <VIcon size="15" color="primary" class="mr-1">mdi-gavel</VIcon>
            {{ r.entity.verdict }}
          </p>

          <!-- Score bars -->
          <div class="score-bars mb-4">
            <div v-for="dim in LOAN_RUBRIC" :key="dim.id" class="score-row">
              <span class="score-dim" :class="{ 'score-dim--muted': !activeDims.includes(dim.id) }">
                {{ dim.short }}
              </span>
              <div class="score-track">
                <div
                  class="score-fill"
                  :class="{ 'score-fill--muted': !activeDims.includes(dim.id) }"
                  :style="{
                    width: r.scores[dim.id] + '%',
                    background: scoreHue(r.scores[dim.id]),
                  }"
                />
              </div>
              <span class="score-val">{{ r.scores[dim.id] }}</span>
            </div>
          </div>

          <VRow>
            <VCol cols="12" sm="6">
              <p class="plabel plabel--pro">A favor</p>
              <ul class="plist plist--pro">
                <li v-for="(x, i) in r.entity.pros" :key="i">{{ x }}</li>
              </ul>
            </VCol>
            <VCol cols="12" sm="6">
              <p class="plabel plabel--con">En contra</p>
              <ul class="plist plist--con">
                <li v-for="(x, i) in r.entity.cons" :key="i">{{ x }}</li>
              </ul>
            </VCol>
          </VRow>

          <p class="text-body-2 mt-3 mb-2">
            <VIcon size="15" class="mr-1">mdi-account-alert-outline</VIcon>
            <strong>Clearing:</strong> {{ r.entity.clearingNote }}
          </p>
          <p class="text-caption text-medium-emphasis mb-3">
            <VIcon size="13">mdi-account-check-outline</VIcon>
            Ideal para: {{ r.entity.bestFor }}
          </p>

          <div class="d-flex flex-wrap ga-2 align-center">
            <VBtn
              :href="r.entity.website"
              target="_blank"
              rel="noopener noreferrer nofollow"
              size="small"
              variant="tonal"
              color="primary"
            >
              <VIcon start size="16">mdi-open-in-new</VIcon>
              Sitio oficial
            </VBtn>
            <a
              :href="r.entity.sourceUrl"
              target="_blank"
              rel="noopener noreferrer nofollow"
              class="text-caption loantier-link"
            >
              Página de la que salen estos datos
            </a>
          </div>

          <div v-if="r.entity.sources.length" class="mt-3">
            <p class="text-caption text-medium-emphasis mb-1">Fuentes</p>
            <ul class="src-list">
              <li v-for="(s, i) in r.entity.sources" :key="i">
                <a :href="s.url" target="_blank" rel="noopener noreferrer">
                  <VIcon size="13" class="mr-1">mdi-link-variant</VIcon>{{ s.label }}
                </a>
              </li>
            </ul>
          </div>

          <RedditEntityBlock v-if="r.entity.redditId" :entity-id="r.entity.redditId" />
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Related loan pages -->
    <section class="mt-8">
      <h2 class="section-heading mb-1">Antes de pedirlo (o si ya lo pediste)</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        La decisión de dónde pedir es la última. Estas son las que vienen antes y después.
      </p>
      <VRow>
        <VCol v-for="link in relatedLinks" :key="link.to" cols="12" sm="6" md="4">
          <NuxtLink :to="localePath(link.to)" class="rel-card">
            <VIcon size="20" color="primary" class="mb-2">{{ link.icon }}</VIcon>
            <span class="rel-title">{{ link.title }}</span>
            <span class="rel-text">{{ link.text }}</span>
          </NuxtLink>
        </VCol>
      </VRow>
    </section>

    <FaqBlock heading="Preguntas frecuentes sobre préstamos en Uruguay" :items="FAQ" expanded />

    <!-- Sources -->
    <section class="mt-4">
      <h2 class="section-heading mb-3">Fuentes</h2>
      <ul class="src-list src-list--page">
        <li v-for="(s, i) in PAGE_SOURCES" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">
            <VIcon size="13" class="mr-1">mdi-link-variant</VIcon>{{ s.label }}
          </a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        No tenemos acuerdo comercial con ningún prestamista de esta página y los enlaces no son de
        afiliado. Las tasas son las publicadas; confirmá siempre el CFT antes de firmar.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import {
  BCU_LABELS,
  CLEARING_LABELS,
  LENDER_TIERLIST,
  LOAN_DIM_IDS,
  LOAN_PROFILE_PRESETS,
  LOAN_RUBRIC,
  SEGMENT_LABELS,
  buildBoard,
  matchPreset,
  mergeLenderFacts,
  rankLenders,
  representativeTea,
  type LenderEntity,
  type LenderSegment,
  type LoanDimId,
  type LoanProfilePreset,
  type LoanTierId,
  type LoanTierSnapshot,
} from '~/utils/loanTierlist'
import { monoStyle, monogram, readableOn } from '~/utils/brandColors'
import type { FaqItem } from '~/utils/faqAnswers'
import { BCU_CAPS, BCU_IN_FORCE_SINCE, type BcuCapRow } from '~/utils/cashAdvance'
import { useDisplay } from 'vuetify'

const localePath = useLocalePath()
const { smAndDown } = useDisplay()

// --- weekly refreshed facts (SSR, so the board Google sees is the fresh one) ---
// The route returns null when the snapshot row is missing or Mongo is down; `mergeLenderFacts`
// then simply hands back the seed catalogue, so the page renders identically minus the freshness.
const { data: snapshot } = await useFetch<LoanTierSnapshot | null>('/api/loan-tiers', {
  key: 'loan-tiers',
  default: () => null,
})

const lenders = computed<LenderEntity[]>(() =>
  mergeLenderFacts(LENDER_TIERLIST, snapshot.value?.patches)
)
const changes = computed(() => snapshot.value?.changes ?? [])
const asOfLabel = computed(() => {
  const iso = snapshot.value?.asOf
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
})

// --- interactive state ---
const activeDims = ref<LoanDimId[]>([...LOAN_DIM_IDS])
const segmentFilter = ref<'all' | LenderSegment>('all')
const onlyClearing = ref(false)
const openId = ref<string | null>(null)

const segmentOptions = [
  { value: 'all' as const, label: 'Todo' },
  { value: 'banco' as const, label: 'Bancos' },
  { value: 'financiera' as const, label: 'Financieras' },
  { value: 'cooperativa' as const, label: 'Cooperativas' },
  { value: 'fintech' as const, label: 'Fintech' },
]

function toggleDim(id: LoanDimId) {
  const i = activeDims.value.indexOf(id)
  if (i === -1) {
    activeDims.value = LOAN_DIM_IDS.filter(d => d === id || activeDims.value.includes(d))
  } else if (activeDims.value.length > 1) {
    activeDims.value = activeDims.value.filter(d => d !== id)
  }
}

function applyPreset(p: LoanProfilePreset) {
  activeDims.value = [...p.dims]
  onlyClearing.value = !!p.onlyClearing
}

const activePresetId = computed(() => matchPreset(activeDims.value, onlyClearing.value)?.id ?? null)

/** The pool the board and the fichas both draw from: filters are applied once, here. */
const pool = computed(() =>
  lenders.value.filter(
    l =>
      (segmentFilter.value === 'all' || l.segment === segmentFilter.value) &&
      (!onlyClearing.value || l.clearing === 'si' || l.clearing === 'parcial')
  )
)

const board = computed(() => buildBoard(activeDims.value, pool.value))
const rankedFichas = computed(() => rankLenders(activeDims.value, pool.value))

const clearingFriendly = computed(() =>
  rankLenders(['acceso', 'costo', 'reputacion'], lenders.value)
    .map(r => r.entity)
    .filter(l => l.clearing === 'si' || l.clearing === 'parcial')
)
const clearingCount = computed(
  () => lenders.value.filter(l => l.clearing === 'si' || l.clearing === 'parcial').length
)

// VDataTable headers for the "quién presta en el clearing" table. `teaSort` carries the raw
// representative rate (weighted toward a published band's ceiling, same as the score) so the
// column sorts by actual cost — "no la publica" lands at the bottom via +Infinity, never mixed in
// with real numbers. The visible text still comes from `teaLabel()` via the item slot.
const clearingHeaders = [
  { title: 'Prestamista', key: 'name', sortable: true },
  { title: 'Política', key: 'clearing', sortable: true },
  { title: 'TEA publicada', key: 'teaSort', sortable: true },
  { title: 'Qué te van a pedir', key: 'clearingNote', sortable: false },
] as const

const clearingRows = computed(() =>
  clearingFriendly.value.map(l => ({
    ...l,
    teaSort: representativeTea(l.teaPct, l.teaMaxPct) ?? Number.POSITIVE_INFINITY,
  }))
)

const activeHint = computed(() => {
  const preset = matchPreset(activeDims.value, onlyClearing.value)
  const labels = LOAN_RUBRIC.filter(d => activeDims.value.includes(d.id)).map(d => d.short)
  const base =
    activeDims.value.length === LOAN_DIM_IDS.length
      ? 'Todos los criterios con su peso. La foto general.'
      : `Solo: ${labels.join(' · ')}`
  return preset && preset.id !== 'equilibrado' ? `${preset.label} — ${preset.hint}` : base
})

// --- ficha open + scroll ---
const fichaEls = new Map<string, HTMLElement>()
function registerFicha(id: string, el: unknown) {
  const node = (el as { $el?: HTMLElement } | null)?.$el
  if (node) fichaEls.set(id, node)
}
function openFicha(id: string) {
  openId.value = openId.value === id ? null : id
  if (openId.value && import.meta.client) {
    nextTick(() => fichaEls.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
}

// --- presentation helpers ---
const TIER_HUE: Record<LoanTierId, string> = {
  S: '#059669',
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
}

function gemStyle(t: LoanTierId) {
  return { '--gem': TIER_HUE[t], color: readableOn(TIER_HUE[t]) } as Record<string, string>
}

function scoreClass(score: number): string {
  if (score >= 78) return 'sc-5'
  if (score >= 66) return 'sc-4'
  if (score >= 54) return 'sc-3'
  if (score >= 44) return 'sc-2'
  return 'sc-1'
}

function scoreHue(score: number): string {
  if (score >= 78) return '#16a34a'
  if (score >= 66) return '#65a30d'
  if (score >= 54) return '#ca8a04'
  if (score >= 44) return '#ea580c'
  return '#dc2626'
}

const nf = new Intl.NumberFormat('es-UY')

function teaLabel(l: LenderEntity): string {
  if (l.teaPct == null) return 'No la publica'
  const base =
    l.teaMaxPct && l.teaMaxPct > l.teaPct ? `${l.teaPct}–${l.teaMaxPct}%` : `${l.teaPct}%`
  return l.ivaOnInterest ? `${base} + IVA` : base
}

function amountLabel(l: LenderEntity): string {
  return l.maxAmountUyu == null ? 'Según tu perfil' : `$ ${nf.format(l.maxAmountUyu)}`
}

function termLabel(l: LenderEntity): string {
  return l.maxTermMonths == null ? 'Sin dato' : `${l.maxTermMonths} meses`
}

function speedLabel(l: LenderEntity): string {
  const h = l.disbursementHours
  if (h == null) return 'Caso a caso'
  if (h <= 1) return 'En minutos'
  if (h < 24) return `~${h} h`
  const days = Math.round(h / 24)
  return days === 1 ? '~1 día' : `~${days} días`
}

function emptyCaption(t: LoanTierId): string {
  if (t === 'S') return 'Vacío con estos criterios: barato Y accesible casi no existe en la plaza.'
  if (t === 'F') return 'Nadie cae tan bajo con los criterios elegidos.'
  return 'Nadie queda en este nivel con los criterios elegidos.'
}

const relatedLinks = [
  {
    to: '/herramientas/calculadora-prestamo',
    icon: 'mdi-calculator-variant-outline',
    title: 'Calculá la cuota',
    text: 'Monto, plazo y tasa: cuánto pagás por mes y cuánto termina costando en total.',
  },
  {
    to: '/prestamos-uruguay',
    icon: 'mdi-table-large',
    title: 'Comparativa de tasas',
    text: 'La tabla completa de TEA, montos y requisitos, con las tasas que refrescamos a diario.',
  },
  {
    to: '/salir-del-clearing',
    icon: 'mdi-account-alert-outline',
    title: 'Salir del clearing',
    text: 'Cuánto tiempo quedás registrado, cómo consultarlo gratis y qué se puede hacer.',
  },
  {
    to: '/saldar-deudas-uruguay',
    icon: 'mdi-handshake-outline',
    title: 'Negociar lo que ya debés',
    text: 'Quitas, refinanciación y prescripción, antes de pedir plata nueva para tapar plata vieja.',
  },
  {
    to: '/prestamos-p2p-uruguay',
    icon: 'mdi-account-switch-outline',
    title: 'Préstamos entre personas',
    text: 'Qué es legal en Uruguay, qué dice el BCU y por qué el registro de plataformas está vacío.',
  },
  {
    to: '/conviene-comprar-en-cuotas',
    icon: 'mdi-calendar-multiple-check',
    title: '¿Cuotas o contado?',
    text: 'Muchas veces el préstamo que necesitás es no pedirlo: la cuenta real de financiar.',
  },
  {
    to: '/mejores-bancos-uruguay',
    icon: 'mdi-bank-outline',
    title: 'Tier list de bancos',
    text: 'Si el préstamo te ata a un banco, mirá primero cómo es ese banco para todo lo demás.',
  },
  {
    to: '/tarjetas-de-credito-uruguay',
    icon: 'mdi-credit-card-outline',
    title: 'Tarjetas de crédito',
    text: 'Para montos chicos, a veces la cuota de la tarjeta sale menos que un préstamo.',
  },
  {
    to: '/salud-financiera',
    icon: 'mdi-heart-pulse',
    title: 'Salud financiera',
    text: 'Cuánto de tu ingreso puede irse en cuotas sin que el mes siguiente sea un problema.',
  },
]

/**
 * The three public registers, with what each one actually captures.
 *
 * Worth its own block because the usual advice — "fijate que esté registrada en el BCU" — is
 * useless without knowing that there are three lists, that they publish razón social rather than
 * brand, and that one whole category of lender has no public list at all.
 */
const BCU_REGISTERS = [
  {
    name: 'Administradoras de crédito',
    what: 'Las que financian compras con tarjeta, órdenes de compra o modalidades similares. Se dividen en mayores y menores activos según superen las 150.000 UR.',
    examples:
      'Ahí figuran, entre otras, OCA, Cash, ANDA, Verde, Creditel (Socur), Pronto (Bautzen), Crédito de la Casa (Retop) y Floder, la sociedad detrás de Volvé, Pago Después y el Prextamo de Prex.',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/emp_admin_cred.aspx',
  },
  {
    name: 'Entidades otorgantes de crédito de mayor actividad',
    what: 'El registro que captura al que presta plata SIN tarjeta, que es lo que la gente busca cuando busca "una financiera". Existe recién desde 2024.',
    examples:
      'Ahí están Crediton (Volmet), Pronto+ (Kedal), la Cooperativa ACAC y buena parte de las cooperativas de funcionarios y docentes.',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/EntidadesOtorCreMayActivi.aspx',
  },
  {
    name: 'Instituciones de intermediación financiera',
    what: 'Bancos, casas financieras y la única cooperativa de intermediación financiera que queda. Es el nivel de supervisión más alto que existe.',
    examples:
      'Todos los bancos del tablero, más FUCEREP, que es la única cooperativa con ese estatus.',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Default.aspx',
  },
]

/**
 * The BCU's consumer-credit risk grades, which are pure days-late arithmetic (Marco Contable,
 * Anexo 1, ap. 4.2.2.2). Worth spelling out because "estoy en categoría 3" is something people
 * are told on the phone and almost never get explained.
 */
const BCU_CATEGORIES = [
  { id: '1C', label: 'Capacidad de pago fuerte', days: 'Al día o menos de 10 días' },
  { id: '2A', label: 'Capacidad de pago adecuada', days: 'De 10 a 30 días' },
  { id: '2B', label: 'Problemas potenciales', days: 'De 30 a 60 días' },
  { id: '3', label: 'Capacidad de pago comprometida', days: 'De 60 a 90 días' },
  { id: '4', label: 'Capacidad de pago muy comprometida', days: 'De 90 a 120 días' },
  { id: '5', label: 'Irrecuperable', days: '120 días o más' },
]

/**
 * Deliberate absences.
 *
 * Two thirds of the first page of Google for "préstamos en el clearing" is lead-generation sites
 * that do not lend, and the rest mixes in at least one operation the BCU has publicly warned
 * about. Listing the board and staying quiet about that would leave the reader exactly where they
 * started, so the exclusions get their own section with the reason attached.
 */
const EXCLUDED: { name: string; tag: string; tone: string; why: string }[] = [
  {
    name: 'República Microfinanzas',
    tag: 'no es crédito al consumo',
    tone: 'info',
    why: 'Es del BROU y presta de verdad, pero sus líneas son productivas: capital de giro, inversión, crédito para emprendimientos. No tiene préstamo personal de consumo, así que compararla acá sería medirla por algo que no ofrece. Sus requisitos, eso sí, piden no tener morosidad vigente en el Clearing.',
  },
  {
    name: 'Microfin',
    tag: 'no es crédito al consumo',
    tone: 'info',
    why: 'Microfinanzas para micro y pequeña empresa. Además, su sitio rechazó la conexión durante toda la investigación, así que ni siquiera pudimos verificar condiciones actuales.',
  },
  {
    name: 'Mercado Pago y Ualá',
    tag: 'no prestan en Uruguay',
    tone: 'info',
    why: 'Mercado Pago tiene crédito personal en Argentina y Brasil, no en Uruguay. Ualá directamente no opera acá. Las notas que las listan entre las opciones uruguayas están copiando material regional.',
  },
  {
    name: 'BHU y Citibank',
    tag: 'otro producto',
    tone: 'info',
    why: 'El BHU solo da crédito hipotecario para vivienda (desde 3,75% en UI, hasta 25 años), que es otra cosa. Citibank tiene sucursal en Uruguay pero no banca minorista: no hay préstamo personal que evaluar.',
  },
  {
    name: 'Los "comparadores" de préstamos en clearing',
    tag: 'no prestan',
    tone: 'warning',
    why: 'Una veintena de sitios con nombres que suenan a financiera publican rankings de "préstamos sin clearing" con tasas y montos que no se pueden auditar. No prestan plata: cobran por derivarte. Varios no exhiben RUT ni registro alguno, y sus cifras son la fuente de la mitad de los errores que corregimos en esta página.',
  },
  {
    name: 'Prestamistas particulares y "gota a gota"',
    tag: 'ilegal',
    tone: 'error',
    why: 'La Fiscalía documentó redes que cobran 20% de interés a 20 días: anualizado son miles por ciento, decenas de veces el tope legal. Es usura, que en Uruguay es delito, y el cobro va acompañado de amenazas. No es una opción cara: es una trampa con violencia adentro.',
  },
  {
    name: 'Urucash y las "aseguradoras" que piden depósito previo',
    tag: 'estafa advertida por el BCU',
    tone: 'error',
    why: 'El Banco Central emitió advertencia pública por actividad no autorizada. El esquema es siempre el mismo: te aprueban un préstamo que nunca llega y te piden pagar antes un seguro, un sellado o una gestión. Hay además una banda con 19 condenados que apuntaba explícitamente a gente que no consigue crédito por tener antecedentes.',
  },
  {
    name: 'Financiación de vendedor "en clearing" sin tasa publicada',
    tag: 'alto riesgo',
    tone: 'warning',
    why: 'Concesionarias y comercios que publicitan "financiación en clearing" sin exhibir razón social, RUT ni tasa. No hay nada que compare: el precio termina escondido en el precio del bien, que es la forma más vieja de cobrar una tasa que no se puede nombrar.',
  },
]

// ── El tope de usura, del BCU de hoy ──
//
// El BCU republica la tabla TODOS LOS MESES. Hasta el 2026-09-03 esta respuesta decía "el tope
// vigente desde el 1° de agosto de 2026 es 130,9285%" mientras /ley-de-usura-uruguay publicaba
// 133,49 % leído esa misma mañana. Misma clave de fetch que las otras dos páginas que lo nombran.
const { data: liveCaps } = await useFetch<{
  periodo: string
  vigenteDesde: string
  rows: BcuCapRow[]
  live: boolean
}>('/api/bcu-rates', { key: 'bcu-rates', server: true, default: () => null })

const capChico = computed(() => {
  const row = (liveCaps.value?.rows || BCU_CAPS).find(
    r => r.bracket === 'menor10kUI' && r.cortoPlazo && r.currency === 'UYU'
  )
  return row ?? BCU_CAPS[0]
})
const topeChicoLabel = computed(() => usuryPct(capChico.value.tope * 100))
const mediaChicaLabel = computed(() => usuryPct(capChico.value.media * 100))
const vigenteDesdeLabel = computed(() => {
  const iso = liveCaps.value?.vigenteDesde || BCU_IN_FORCE_SINCE
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
})

const FAQ = computed<FaqItem[]>(() => [
  {
    id: 'quien-presta-clearing',
    question: '¿Quién presta plata en Uruguay estando en el clearing?',
    answer:
      'Ningún banco: todos piden antecedentes limpios y varios lo ponen por escrito en sus requisitos. Sí evalúan solicitudes ANDA —que lo contesta en sus propias preguntas frecuentes—, Cash, Pronto! a través de su marca Pronto+, Pago Después, Volvé, la plataforma entre personas Prestapagos y, sin mirar nada, las casas de empeño. Casi siempre con montos más chicos, plazos más cortos, tasas bastante más altas o alguna garantía. En la sección "¿Quién presta si estoy en el clearing?" de esta página está cada caso con la frase textual que lo respalda.',
  },
  {
    id: 'clearing-vs-bcu',
    question: '¿El Clearing de Informes y la Central de Riesgos del BCU son lo mismo?',
    answer:
      'No, y confundirlos hace perder tiempo. El Clearing de Informes es una base de datos PRIVADA que opera Equifax: la alimentan los acreedores que están afiliados (comercios, telcos, financieras, estudios de cobranza) y solo la consultan sus clientes. La Central de Riesgos es ESTATAL, la administra el Banco Central, y solo reportan a ella las instituciones que el BCU supervisa, obligatoriamente y todos los meses. Consecuencia práctica: una financiera no supervisada no aparece en la Central de Riesgos pero sí te puede mandar al Clearing, y estar limpio en una no significa estar limpio en la otra. Hay que mirar las dos.',
  },
  {
    id: 'cuanto-tiempo-clearing',
    question: '¿Cuánto tiempo quedo registrado en el clearing?',
    answer:
      'La Ley 18.331 en su artículo 22 fija cinco años contados desde que el dato se incorporó a la base, no desde que dejaste de pagar. Si al vencer ese plazo la deuda sigue impaga, el acreedor puede pedir por única vez un nuevo registro por cinco años más, solicitado en los treinta días previos al vencimiento: el máximo real con deuda impaga es de diez años. Y ojo con lo que pasa si pagás: el registro no desaparece, se convierte en "obligación cancelada" con mención expresa del pago y puede seguir hasta cinco años más desde la cancelación, esta vez sin renovación posible. En la práctica Equifax aplica una política más benigna que la ley y mantiene la operación cancelada con atraso por tres años, pero eso es política de la empresa, no un derecho.',
  },
  {
    id: 'nueva-ley-clearing',
    question: '¿Es cierto que una ley nueva borra los antecedentes a los dos años?',
    answer:
      'No. Varios sitios uruguayos de contenido afirman que existe una "nueva ley 2026" que borra los datos negativos a los dos años del pago. No existe en el texto vigente: el artículo 22 de la Ley 18.331 sigue diciendo cinco años, renovables una vez, y cinco más desde la cancelación. Antes de creerle a un sitio que promete plazos más cortos, mirá si enlaza el texto en IMPO. Casi ninguno lo hace.',
  },
  {
    id: 'consultar-gratis',
    question: '¿Cómo consulto gratis si estoy en el clearing?',
    answer:
      'Son dos consultas distintas y las dos son gratuitas. La Central de Riesgos del BCU se consulta en línea en consultadeuda.bcu.gub.uy, sin costo, sin límite de veces y con respuesta inmediata: solo hay que crear una cuenta con tu correo. El Clearing de Informes de Equifax es gratis una vez cada seis meses por el artículo 14 de la Ley 18.331, y el único canal gratuito es el teléfono 2628 1515, interno 1, opción 2, de lunes a viernes: te lo mandan por mail dentro de los cinco días hábiles. Si un dato está mal, el artículo 15 te da derecho a pedir la rectificación sin cargo, con cinco días hábiles de plazo para corregirlo — y mientras el reclamo está en curso, quien te consulte debe ver que ese dato está en revisión.',
  },
  {
    id: 'categorias-bcu',
    question: '¿Qué significan las categorías 1C, 2A, 3, 4 y 5 del BCU?',
    answer:
      'Para un préstamo de consumo son simplemente días de atraso. 1C es estar al día o con menos de diez días; 2A entre diez y treinta; 2B entre treinta y sesenta; 3 entre sesenta y noventa; 4 entre noventa y ciento veinte; 5 a partir de ciento veinte días. Ninguna norma prohíbe prestarle a una categoría determinada, pero hay dos mecanismos que hacen que el "no" aparezca en la 3. El primero es el contagio: si figurás moroso en cualquier otra institución, este banco no te puede clasificar mejor que 3 aunque con él estés impecable. El segundo es el costo: pasar de 2B a 3 le multiplica al banco la previsión que debe constituir, así que el rechazo termina siendo económico antes que normativo. Además, si la cuota supera el 30% del ingreso del núcleo familiar en pesos (15% en dólares), la norma obliga a clasificarte 3 como máximo.',
  },
  {
    id: 'tea-cft',
    question: '¿Por qué la cuota me sale más cara que la tasa publicada?',
    answer:
      'Porque la TEA que se publicita no es lo que pagás. Al interés se le suma el IVA sobre los intereses, y encima pueden ir gastos de otorgamiento, gastos de administración y un seguro de vida o de saldo deudor dentro de la cuota. Todo junto es el Costo Financiero Total (CFT), y es el único número comparable entre dos préstamos. Pedilo por escrito antes de firmar.',
  },
  {
    id: 'tope-usura',
    question: '¿Cuál es el tope legal y qué pasa si un prestamista lo supera?',
    answer: `La Ley 18.212 pone el techo en un porcentaje sobre la tasa MEDIA que el Banco Central publica cada mes por segmento. Para un préstamo personal en pesos, chico (menos de 10.000 UI, unos $66.351) y sin autorización de descuento del sueldo, el tope vigente desde el ${vigenteDesdeLabel.value} es ${topeChicoLabel.value} —80% en mora—, porque ese segmento tiene la tasa media más alta del sistema (${mediaChicaLabel.value}): el promedio de mercado no es un parámetro de razonabilidad, es solo un promedio. Con retención de haberes el tope baja mucho: 27,43% para "otra retención" y apenas 25,32% para crédito de nómina. Si un prestamista cobra por encima del tope, la ley hace caducar TODO el interés y los cargos —no solo el excedente— y lo ya cobrado se descuenta del capital; además es delito si hubo aprovechamiento de tu necesidad, con pena de seis meses a cuatro años. Se denuncia ante el BCU (si el prestamista está supervisado) o ante la Unidad Defensa del Consumidor del MEF si no lo está.`,
  },
  {
    id: 'iva-y-gastos',
    question: '¿El IVA y los gastos entran en la tasa que me muestran?',
    answer:
      'El IVA, no: la Ley 18.212 lo excluye expresamente del cálculo de la tasa y del tope de usura, así que un préstamo puede estar formalmente por debajo del tope y aun así costarte un 22% más de intereses de lo que muestra la TEA. Uruguay tampoco tiene una figura legal llamada "CFT": lo que la ley regula es la tasa de interés implícita, que si incluye intereses, comisiones, gastos y seguros —por eso en este tablero usamos "CFT" como la forma más conocida de nombrar esa misma idea. La ley sí permite cobrar aparte, dentro de topes chicos, los gastos de otorgamiento y administración (hasta 120 UI sin retención, 30 UI con retención) y un seguro de saldo deudor (desde 2026, hasta 2,5 por mil mensual sobre lo asegurado). Todo lo que exceda esos topes vuelve a contar para el cálculo de usura.',
  },
  {
    id: 'prestamo-sin-recibo',
    question: '¿Puedo pedir un préstamo sin recibo de sueldo?',
    answer:
      'Sí, pero cambia quién te lo da. Los bancos casi siempre piden relación de dependencia comprobable; varias financieras y cooperativas aceptan monotributistas, trabajadores independientes o jubilados con la constancia correspondiente, y algunas prestan montos chicos contra la cédula. A menor documentación, mayor tasa: es literalmente el precio de la incertidumbre.',
  },
  {
    id: 'jubilados',
    question: '¿Los jubilados y pensionistas pueden pedir préstamos?',
    answer:
      'Sí, y suelen tener acceso más fácil que un trabajador informal, porque la pasividad es un ingreso estable y verificable que además admite retención. La contracara es esa misma retención: la cuota se descuenta antes de que cobres, hay un tope de cuánto de la pasividad puede comprometerse, y si te sobre-endeudás el margen para maniobrar es mínimo.',
  },
  {
    id: 'como-elegir',
    question: '¿Cómo comparo dos préstamos en serio?',
    answer:
      'Con tres números y nada más: el CFT (no la TEA), el total a pagar en pesos al final del plazo, y la cuota como porcentaje de tu ingreso líquido. Si la cuota pasa de un tercio de lo que cobrás, el problema no es la tasa. Y siempre preguntá si podés cancelar anticipadamente sin multa: es lo que te deja salir si tu situación mejora.',
  },
  {
    id: 'cuidado-adelanto',
    question: '¿Es normal que me pidan pagar algo antes de recibir el préstamo?',
    answer:
      'No. Es la estafa más común del rubro. Ningún prestamista legítimo cobra sellado, gestión, seguro ni "liberación de fondos" antes de desembolsar: esos costos se descuentan del préstamo o se cobran después, siempre con contrato. Si te piden depositar para recibir, no es un préstamo caro, es un robo.',
  },
])

const PAGE_SOURCES: { label: string; url: string }[] = [
  {
    label: 'BCU — Central de Riesgos Crediticios (consulta y calificaciones)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/RepInfCred.aspx',
  },
  {
    label: 'BCU — instituciones y empresas de crédito registradas',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Default.aspx',
  },
  {
    label: 'BCU — tasas medias y topes de usura publicados',
    url: 'https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Tasas-de-Interes.aspx',
  },
  {
    label: 'Ley 18.212 — usura (texto en IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/18212-2007',
  },
  {
    label: 'Ley 18.331 — protección de datos personales (plazo de los antecedentes)',
    url: 'https://www.impo.com.uy/bases/leyes/18331-2008',
  },
  {
    label: 'Ley 17.250 — relaciones de consumo',
    url: 'https://www.impo.com.uy/bases/leyes/17250-2000',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/mejores-prestamos-uruguay'
const title = 'Mejores préstamos en Uruguay 2026'
const description =
  'Tier list de dónde pedir un préstamo personal en Uruguay: bancos, financieras, cooperativas y fintech rankeados por tasa, acceso, letra chica, rapidez y reputación. Incluye cuáles prestan estando en el clearing. Se reverifica todas las semanas.'

defineOgImageComponent('Cambio', {
  title: 'Mejores préstamos de Uruguay',
  subtitle: 'Tier list por tasa, acceso y letra chica',
  tag: 'TIER LIST',
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
        'mejores prestamos uruguay, donde pedir un prestamo uruguay, prestamos estando en el clearing, prestamos sin clearing uruguay, prestamos rapidos uruguay, prestamos online uruguay, prestamos para jubilados uruguay, mejor financiera uruguay, tier list prestamos, tasas prestamos personales uruguay',
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
                name: 'Préstamos en Uruguay',
                item: 'https://cambio-uruguay.com/prestamos-uruguay',
              },
              { '@type': 'ListItem', position: 3, name: 'Mejores préstamos', item: canonicalUrl },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Tier list de prestamistas de Uruguay (criterios balanceados)',
            itemListElement: rankLenders(LOAN_DIM_IDS, lenders.value).map((r, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: r.entity.name,
              description: `${r.tier} · ${r.score}/100 — ${r.entity.tagline}`,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Hero ------------------------------------------------------------------ */
.hero-card {
  border-radius: 16px;
}

.hero {
  background: linear-gradient(135deg, #00897b 0%, #121a2e 62%, #0a0e1a 100%);
}

.hero-eyebrow {
  margin-bottom: 6px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero-title {
  color: #fff;
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 900;
  line-height: 1.12;
  letter-spacing: -0.02em;
}

.hero-title-accent {
  display: block;
  color: #64b5f6;
  font-size: 0.72em;
  font-weight: 800;
}

.hero-lead {
  max-width: 68ch;
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
  line-height: 1.6;
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 11px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Controls -------------------------------------------------------------- */
.controls-card,
.changes-card,
.clearing-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
}

.preset-chip,
.crit-chip,
.kind-chip {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 999px;
  background: rgba(var(--v-theme-surface), 0.6);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 140ms ease,
    background 140ms ease;
}

.preset-chip--on,
.kind-chip--on {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
}

.criteria-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 8px;
}

.crit-chip {
  justify-content: space-between;
  width: 100%;
  border-radius: 12px;
}

.crit-chip--off {
  opacity: 0.42;
}

.crit-weight {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.14);
  color: rgb(var(--v-theme-primary));
  font-size: 0.75rem;
  font-weight: 800;
}

.active-hint {
  display: flex;
  align-items: center;
  margin: 6px 0 0;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8rem;
  opacity: 0.76;
}

/* Board ----------------------------------------------------------------- */
.board {
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 16px;
}

.tier-row {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  min-height: 104px;
  background: rgba(var(--v-theme-surface), 0.72);
}

.tier-row + .tier-row {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.tier-gem {
  display: grid;
  place-items: center;
  background: var(--gem);
}

.tier-letter {
  font-size: 1.5rem;
  font-weight: 950;
  letter-spacing: -0.06em;
}

.tier-body {
  min-width: 0;
  padding: 12px 14px 14px;
}

.tier-blurb {
  margin: 0 0 9px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.66;
}

.tier-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tile {
  display: inline-flex;
  min-width: 190px;
  max-width: 280px;
  align-items: center;
  gap: 8px;
  padding: 7px 9px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
  color: inherit;
  cursor: pointer;
  text-align: left;
  transition:
    border-color 150ms ease,
    transform 150ms ease;
}

.tile:hover,
.tile:focus-visible,
.tile--open {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-1px);
}

.tile-mono,
.ficha-mono {
  display: grid;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  place-items: center;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 900;
}

.tile-main {
  min-width: 0;
  flex: 1;
}

.tile-name {
  display: block;
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tile-kind {
  display: block;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.6;
}

.tile-clear {
  color: #35d07f;
  font-weight: 700;
}

.tile-score,
.ficha-score {
  font-weight: 900;
  font-variant-numeric: tabular-nums;
}

.tile-score {
  font-size: 0.875rem;
}

.tier-empty {
  padding: 8px 2px;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.45;
}

.sc-5 {
  color: #16a34a;
}
.sc-4 {
  color: #65a30d;
}
.sc-3 {
  color: #ca8a04;
}
.sc-2 {
  color: #ea580c;
}
.sc-1 {
  color: #dc2626;
}

.tile-move,
.tile-enter-active,
.tile-leave-active {
  transition: all 220ms ease;
}

.tile-enter-from,
.tile-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* Changes --------------------------------------------------------------- */
.changes-list,
.warn-list,
.plist,
.src-list {
  margin: 0;
  padding-left: 18px;
}

.changes-list li,
.warn-list li {
  margin-bottom: 6px;
  font-size: 0.875rem;
  line-height: 1.5;
}

/* Clearing table -------------------------------------------------------- */
.clearing-pill {
  display: inline-block;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.clearing-pill--si {
  background: rgba(16, 185, 129, 0.16);
  color: #059669;
}

.clearing-pill--parcial {
  background: rgba(234, 179, 8, 0.18);
  color: #a16207;
}

.clearing-pill--no,
.clearing-pill--desconocido {
  background: rgba(148, 163, 184, 0.2);
  color: #64748b;
}

.linkish {
  padding: 0;
  border: 0;
  background: none;
  color: rgb(var(--v-theme-primary));
  font: inherit;
  cursor: pointer;
  text-align: left;
}

.linkish:hover {
  text-decoration: underline;
}

/* Fichas ---------------------------------------------------------------- */
.section-heading {
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.01em;
}

.ficha-tierbadge {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 8px;
  background: var(--gem);
  font-size: 0.8rem;
  font-weight: 900;
}

.ficha-score {
  font-size: 1.5rem;
  line-height: 1.1;
}

.facts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.fact {
  padding: 8px 10px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.6);
}

.fact-label {
  display: block;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.75rem;
  opacity: 0.6;
}

.fact-value {
  display: block;
  font-size: 0.875rem;
  font-weight: 800;
}

.signal {
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
}

.signal--pos {
  background: rgba(16, 185, 129, 0.14);
  color: #059669;
}

.signal--neg {
  background: rgba(239, 68, 68, 0.14);
  color: #dc2626;
}

.signal--neutral {
  background: rgba(148, 163, 184, 0.18);
  color: #64748b;
}

.ficha-verdict {
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.06);
}

.score-row {
  display: grid;
  align-items: center;
  gap: 8px;
  grid-template-columns: 86px minmax(0, 1fr) 34px;
  margin-bottom: 6px;
}

.score-dim {
  font-size: 0.75rem;
  font-weight: 700;
}

.score-dim--muted,
.score-fill--muted {
  opacity: 0.35;
}

.score-track {
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(var(--v-border-color), 0.22);
}

.score-fill {
  height: 100%;
  border-radius: 999px;
}

.score-val {
  font-size: 0.75rem;
  font-weight: 800;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.plabel {
  margin-bottom: 4px;
  font-size: 0.8rem;
  font-weight: 800;
}

.plabel--pro {
  color: #059669;
}

.plabel--con {
  color: #dc2626;
}

.plist li {
  margin-bottom: 5px;
  font-size: 0.875rem;
  line-height: 1.5;
}

.src-list {
  list-style: none;
  padding-left: 0;
}

.src-list li {
  margin-bottom: 4px;
  font-size: 0.75rem;
}

.src-list a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.src-list a:hover {
  text-decoration: underline;
}

.src-list--page li {
  font-size: 0.875rem;
}

.loantier-link {
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.check-title {
  margin-bottom: 4px;
  color: rgb(var(--v-theme-primary));
  font-size: 0.8rem;
  font-weight: 800;
}

.cat-table :deep(td),
.cat-table :deep(th) {
  font-size: 0.875rem;
}

/* FaqBlock ---------------------------------------------------------------
 * FaqBlock ships its own <VContainer><VRow><VCol cols="12" md="10" lg="8">, sized against the
 * viewport rather than against this page's own content column (`.container_custom`, 1280px). On
 * wide viewports that reads as narrower than everything else; the deep overrides below make it
 * fill the exact same box every other section on this page uses, instead of computing its own.
 * `:deep()` only reaches into FaqBlock as rendered by THIS page — every other page that embeds it
 * keeps FaqBlock's own default width. */
:deep(.faq-block) {
  padding-left: 0;
  padding-right: 0;
}

:deep(.faq-block > .v-container) {
  max-width: none;
  padding-left: 0;
  padding-right: 0;
}

:deep(.faq-block .v-col) {
  max-width: 100%;
  flex-basis: 100%;
  padding-left: 0;
  padding-right: 0;
}

/* Exclusions ------------------------------------------------------------ */
.excl-card {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}

/* Related --------------------------------------------------------------- */
.rel-card {
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 16px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgba(var(--v-theme-surface), 0.6);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 140ms ease,
    transform 140ms ease;
}

.rel-card:hover {
  border-color: rgb(var(--v-theme-primary));
  transform: translateY(-2px);
}

.rel-title {
  margin-bottom: 4px;
  font-size: 0.95rem;
  font-weight: 800;
}

.rel-text {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.8rem;
  line-height: 1.45;
  opacity: 0.7;
}

@media (max-width: 599px) {
  .tier-row {
    grid-template-columns: 54px minmax(0, 1fr);
  }

  .tier-letter {
    font-size: 1.25rem;
  }

  .tile {
    width: 100%;
    max-width: none;
  }

  .score-row {
    grid-template-columns: 74px minmax(0, 1fr) 30px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile,
  .rel-card,
  .tile-move,
  .tile-enter-active,
  .tile-leave-active {
    transition: none;
  }
}
</style>
