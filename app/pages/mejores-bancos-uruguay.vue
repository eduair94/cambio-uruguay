<template>
  <div class="tierlist-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/salud-financiera')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Salud financiera
      </VBtn>
    </div>

    <!-- Hero -->
    <VCard class="overflow-hidden mb-5 hero-card" elevation="8">
      <div class="hero pa-6 pa-md-8">
        <p class="hero-eyebrow">Tier list · Julio 2026</p>
        <h1 class="hero-title">
          Los mejores bancos de Uruguay
          <span class="hero-title-accent">(y las fintech que ya les compiten)</span>
        </h1>
        <p class="hero-lead">
          Cada tanto en Reddit reaparece el clásico hilo de los “peores bancos de Uruguay”. En vez
          de sumar bronca, dimos vuelta la pregunta: <strong>¿cuál conviene?</strong> Rankeamos
          {{ BANKS.length }} bancos y fintech con datos —reseñas reales, comisiones, atención y
          letra chica— y una rúbrica transparente que <em>vos</em> podés reconfigurar.
        </p>
        <div class="hero-meta">
          <a :href="redditUrl" target="_blank" rel="noopener noreferrer" class="hero-link">
            <VIcon size="15" class="mr-1">mdi-reddit</VIcon>Ver el hilo original en r/Burises
          </a>
          <div class="hero-spoiler">
            <VIcon size="16" class="mr-2">mdi-alert-decagram-outline</VIcon>
            <span>
              Spoiler: con criterios parejos, <strong>ninguno llega a S</strong>. La banca uruguaya
              tiene techo.
            </span>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-4">
          <ShareButtons text="Tier list de los mejores bancos de Uruguay 2026" />
        </div>
      </div>
    </VCard>

    <!-- Controls -->
    <VCard variant="flat" class="controls-card pa-4 pa-sm-5 mb-5">
      <div class="d-flex align-center ga-2 mb-2">
        <VIcon size="18" color="primary">mdi-tune-variant</VIcon>
        <span class="text-subtitle-2 font-weight-bold">Armá tu tier list</span>
      </div>
      <p class="text-caption text-medium-emphasis mb-3">
        Elegí un perfil o prendé y apagá criterios: el tablero se reordena en vivo según lo que a
        <em>vos</em> te importa.
      </p>

      <!-- Profile presets -->
      <div class="d-flex flex-wrap ga-2 mb-4">
        <button
          v-for="p in PROFILE_PRESETS"
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

      <!-- Criteria toggles -->
      <div class="criteria-grid mb-2">
        <button
          v-for="dim in BANK_RUBRIC"
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

      <!-- Kind filter -->
      <div class="d-flex flex-wrap align-center ga-2 mt-3">
        <span class="text-caption text-medium-emphasis mr-1">Mostrar:</span>
        <button
          v-for="opt in kindOptions"
          :key="opt.value"
          type="button"
          class="kind-chip"
          :class="{ 'kind-chip--on': kindFilter === opt.value }"
          @click="kindFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </VCard>

    <!-- The board -->
    <section class="board mb-8" aria-label="Tier list de bancos y fintech">
      <div v-for="row in board" :key="row.tier.id" class="tier-row" :data-tier="row.tier.id">
        <div class="tier-gem" :style="gemStyle(row.tier.id)">
          <span class="tier-letter">{{ row.tier.label }}</span>
        </div>
        <div class="tier-body">
          <p class="tier-blurb">{{ row.tier.blurb }}</p>
          <TransitionGroup name="tile" tag="div" class="tier-tiles">
            <button
              v-for="r in visibleItems(row.items)"
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
                <span class="tile-kind">{{ KIND_LABELS[r.entity.kind] }}</span>
              </span>
              <span class="tile-score" :class="scoreClass(r.score)">{{ r.score }}</span>
            </button>
            <span v-if="!visibleItems(row.items).length" key="empty" class="tier-empty">
              {{ emptyCaption(row.tier.id) }}
            </span>
          </TransitionGroup>
        </div>
      </div>
    </section>

    <!-- Methodology -->
    <VExpansionPanels class="mb-6 method-panels">
      <VExpansionPanel>
        <VExpansionPanelTitle>
          <VIcon start color="primary" size="small">mdi-scale-balance</VIcon>
          <span class="font-weight-bold">Cómo se calcula (metodología transparente)</span>
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="text-body-2 mb-4">
            Cada entidad se puntúa de 0 a 100 en seis dimensiones. El puntaje general se
            <strong>calcula</strong> como promedio ponderado; el tier (S a F) sale del puntaje, no
            lo ponemos “a dedo”. Cuando prendés o apagás criterios, el promedio se recalcula solo
            sobre lo activo. Los puntajes son nuestro mejor criterio con evidencia pública (reseñas,
            tarifarios, prensa) a julio de 2026.
          </p>
          <p class="text-body-2 mb-4">
            <strong>De dónde sale el puntaje de “App”:</strong> lo anclamos al puntaje real de las
            tiendas (Google Play y App Store, ponderado por cantidad de reseñas) y después lo
            ajustamos por la <em>tendencia</em> de las reseñas recientes, por funciones que faltan
            (Apple Pay, Google Pay) y por el tamaño de la muestra. Donde no hay muestra local
            razonable —Takenos tiene 1 reseña en la App Store uruguaya; Heritage, 13— lo decimos en
            la ficha y puntuamos conservador en vez de inventar un número.
          </p>
          <div v-for="dim in BANK_RUBRIC" :key="dim.id" class="method-dim">
            <div class="d-flex align-center justify-space-between mb-1">
              <span class="font-weight-bold text-body-2">
                <VIcon size="15" class="mr-1">{{ dim.icon }}</VIcon
                >{{ dim.label }}
              </span>
              <VChip size="x-small" color="primary" variant="tonal">peso {{ dim.weight }}</VChip>
            </div>
            <p class="text-caption text-medium-emphasis mb-3">{{ dim.what }}</p>
          </div>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Fichas (detail) -->
    <h2 class="section-heading mb-1">Ficha de cada uno</h2>
    <p class="text-body-2 text-medium-emphasis mb-4">
      Ordenadas según los criterios activos. Tocá un banco arriba para saltar a su ficha.
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
                <VChip size="x-small" variant="tonal">{{ KIND_LABELS[r.entity.kind] }}</VChip>
                <VChip
                  v-if="r.entity.flag"
                  size="x-small"
                  color="warning"
                  variant="tonal"
                  class="font-weight-medium"
                >
                  <VIcon start size="12">mdi-alert-outline</VIcon>
                  Marca nueva
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

          <!-- Signals -->
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
            <div v-for="dim in BANK_RUBRIC" :key="dim.id" class="score-row">
              <span class="score-dim" :class="{ 'score-dim--muted': !activeDims.includes(dim.id) }">
                {{ dim.short }}
              </span>
              <div class="score-track">
                <div
                  class="score-fill"
                  :class="{ 'score-fill--muted': !activeDims.includes(dim.id) }"
                  :style="{
                    width: r.entity.scores[dim.id] + '%',
                    background: scoreHue(r.entity.scores[dim.id]),
                  }"
                />
              </div>
              <span class="score-val">{{ r.entity.scores[dim.id] }}</span>
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
          <p class="text-caption text-medium-emphasis mb-0 mt-2">
            <VIcon size="13">mdi-account-check-outline</VIcon>
            Ideal para: {{ r.entity.bestFor }}
          </p>

          <!-- What Uruguayans say about THIS entity on Reddit (daily snapshot) -->
          <ClientOnly>
            <div v-if="redditFor(r.entity.id)" class="ficha-reddit mt-4">
              <div class="d-flex align-center flex-wrap ga-2 mb-2">
                <VIcon size="16" color="primary">mdi-reddit</VIcon>
                <span class="text-caption font-weight-bold">Qué dicen en Reddit</span>
                <VChip
                  size="x-small"
                  variant="tonal"
                  :color="netColor(redditFor(r.entity.id)!.net)"
                  class="font-weight-bold"
                >
                  {{ redditFor(r.entity.id)!.label }}
                  ({{ redditFor(r.entity.id)!.net > 0 ? '+' : ''
                  }}{{ redditFor(r.entity.id)!.net }})
                </VChip>
                <span class="text-caption text-medium-emphasis">
                  {{ redditFor(r.entity.id)!.opinions }} opiniones ·
                  {{ redditFor(r.entity.id)!.positive }} a favor /
                  {{ redditFor(r.entity.id)!.negative }} en contra
                </span>
              </div>
              <p v-if="redditFor(r.entity.id)!.summary" class="reddit-summary mb-2">
                {{ redditFor(r.entity.id)!.summary }}
              </p>
              <ul class="reddit-quotes">
                <li v-for="(q, i) in redditFor(r.entity.id)!.quotes" :key="i">
                  <a
                    :href="q.permalink"
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    :class="q.polarity < 0 ? 'q-neg' : 'q-pos'"
                  >
                    <span class="q-mark">“</span>{{ q.text }}<span class="q-mark">”</span>
                    <span class="q-meta">r/{{ q.sub }} · {{ q.date }} · {{ q.score }} votos</span>
                  </a>
                </li>
              </ul>
              <p class="text-caption text-medium-emphasis mt-2 mb-0">
                Comentarios reales de uruguayos, no editados. Reddit se queja más de lo que elogia:
                es una señal, no el veredicto — no toca el puntaje de arriba.
              </p>
            </div>
          </ClientOnly>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <!-- Corrections: we were called out, we checked, we were wrong. Say it out loud. -->
    <section class="corrections mt-8" aria-label="Correcciones">
      <h2 class="section-heading mb-1">Correcciones</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Publicamos esta tier list, un uruguayo nos marcó tres errores en Reddit y fuimos a chequear.
        Tenía razón en casi todo — y buscando lo que nos marcó encontramos dos errores peores, que
        nadie nos había señalado. Los dejamos acá en vez de corregir en silencio.
      </p>
      <VCard variant="flat" class="corrections-card pa-4 pa-sm-5">
        <p class="corr-date">11 de julio de 2026</p>
        <ul class="corr-list">
          <li>
            <strong>Santander sí tiene Apple Pay</strong>, desde agosto de 2025 (y Google Pay desde
            abril de ese año). Decíamos “todavía no”. Está en la lista oficial de emisores de Apple
            para Uruguay y en la página del propio banco. Era nuestro error, y era el más visible.
          </li>
          <li>
            <strong>BBVA no es “app de referencia”.</strong> El histórico es bueno (4,61/5 en Play),
            pero viene cayendo hace un año: las últimas 60 reseñas promedian 3,1/5 con 32% de una
            estrella, y es el único del tablero sin Apple Pay ni Google Pay. Bajamos su app de 84 a
            62. Lo que no encontramos es que “se vea espantosa”: las quejas son de que no anda, no
            de cómo se ve.
          </li>
          <li>
            <strong>HSBC ya no existe en Uruguay: es BTG Pactual</strong> desde el 10 de julio de
            2026. Reemplazamos la ficha. Para el cliente, por ahora, sigue todo igual (misma app,
            mismo teléfono, mismas sucursales) y el foco sigue siendo Premium, como era HSBC.
          </li>
          <li>
            <strong>Scotiabank: nos equivocamos feo.</strong> Decíamos “app funcional”. Es, con
            datos, la peor app bancaria del país: 2,45/5 en Play y 2,35/5 en la App Store. Le
            bajamos la app de 66 a 30 y quedó último.
          </li>
          <li>
            <strong>Prex: le habíamos puesto una nota injusta.</strong> Sus apps son las mejor
            puntuadas del tablero (4,8/5 con 210 mil reseñas) y fue la primera en pagar rendimientos
            diarios en Uruguay, dos meses antes que Mercado Pago. Le castigábamos dos veces lo mismo
            (producto y comisiones). Sale del último tier; su problema sigue siendo la atención.
          </li>
          <li>
            <strong>Takenos: nos comimos la letra chica.</strong> Cobrar del exterior es gratis,
            pero <em>sacar</em> la plata cuesta 3%, y no tiene rieles en pesos. Decíamos “sin
            comisiones” y “casi instantáneo”: las dos cosas eran falsas.
          </li>
        </ul>
      </VCard>
    </section>

    <!-- Recent news + AI analysis -->
    <section class="news-section mt-8">
      <h2 class="section-heading mb-1">Novedades recientes y análisis con IA</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Noticias reales de los últimos meses de cada banco y fintech, con un análisis del sector
        escrito por IA (Gemini con búsqueda de Google) a partir de esas fuentes. Se actualiza a
        diario.
      </p>

      <ClientOnly>
        <template #default>
          <VCard
            v-if="newsPending"
            variant="flat"
            class="news-placeholder pa-6 d-flex align-center"
          >
            <VProgressCircular indeterminate size="22" width="2" color="primary" class="mr-3" />
            <span class="text-body-2 text-medium-emphasis">Buscando y analizando novedades…</span>
          </VCard>

          <template v-else>
            <!-- Sector analysis -->
            <VCard v-if="newsHtml" variant="flat" class="ai-analysis pa-5 pa-sm-6 mb-5">
              <div class="d-flex align-center flex-wrap ga-2 mb-3">
                <VIcon color="primary">mdi-robot-outline</VIcon>
                <span class="text-subtitle-1 font-weight-bold">Análisis del sector</span>
                <VChip size="x-small" color="primary" variant="tonal">IA · Gemini</VChip>
                <span v-if="newsAsOf" class="text-caption text-medium-emphasis ml-auto">
                  Actualizado {{ newsAsOf }}
                </span>
              </div>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div class="ai-analysis-content" v-html="newsHtml" />
            </VCard>

            <!-- Per-entity recent news -->
            <div v-if="newsItems.length" class="news-grid">
              <VCard v-for="it in newsItems" :key="it.id" variant="flat" class="news-card pa-4">
                <div class="d-flex align-center ga-2 mb-3">
                  <span class="tile-mono" :style="monoStyle(it.id)">
                    {{ monogram(it.name) }}
                  </span>
                  <span class="text-subtitle-2 font-weight-bold">{{ it.name }}</span>
                </div>
                <p v-if="it.insight" class="news-insight news-teaser mb-2">
                  {{ teaser(it.insight) }}
                </p>
                <button
                  v-if="it.insight"
                  type="button"
                  class="news-more"
                  @click.stop="openNewsId = it.id"
                >
                  Ver más<VIcon size="14" class="ml-1">mdi-arrow-right</VIcon>
                </button>
                <ul v-if="it.headlines.length" class="news-links mt-3">
                  <li v-for="(h, i) in it.headlines" :key="i">
                    <a
                      :href="h.link"
                      target="_blank"
                      rel="noopener noreferrer"
                      :title="h.title"
                      @click.stop
                    >
                      <VIcon size="13" class="mr-1">mdi-open-in-new</VIcon>{{ h.source }}
                    </a>
                  </li>
                </ul>
              </VCard>
            </div>

            <!-- Empty / not-yet-generated -->
            <VCard v-else-if="!newsHtml" variant="flat" class="news-placeholder pa-5">
              <p class="text-body-2 text-medium-emphasis mb-0">
                <VIcon size="16" class="mr-1">mdi-clock-outline</VIcon>
                El análisis con IA se genera en el servidor y se actualiza a diario. Volvé a
                intentar en un rato.
              </p>
            </VCard>

            <!-- Reading-friendly detail dialog -->
            <VDialog v-model="newsDialog" max-width="580" scrollable>
              <VCard v-if="activeNews" class="news-dialog">
                <div class="news-dialog-head pa-4 pa-sm-5">
                  <div class="d-flex align-center ga-3">
                    <span class="ficha-mono" :style="monoStyle(activeNews.id)">
                      {{ monogram(activeNews.name) }}
                    </span>
                    <div class="flex-grow-1">
                      <div class="d-flex align-center ga-2 flex-wrap">
                        <span class="text-h6 font-weight-bold">{{ activeNews.name }}</span>
                        <VChip size="x-small" color="primary" variant="tonal">Novedades · IA</VChip>
                      </div>
                      <p v-if="newsAsOf" class="text-caption text-medium-emphasis mb-0 mt-1">
                        Actualizado {{ newsAsOf }}
                      </p>
                    </div>
                    <VBtn
                      icon="mdi-close"
                      variant="text"
                      size="small"
                      aria-label="Cerrar"
                      @click="newsDialog = false"
                    />
                  </div>
                </div>
                <VDivider />
                <div class="news-dialog-body pa-4 pa-sm-5">
                  <p
                    v-for="(para, i) in newsParagraphs(activeNews.insight)"
                    :key="i"
                    class="news-dialog-text"
                  >
                    {{ para }}
                  </p>
                  <div v-if="activeNews.headlines.length" class="mt-4">
                    <p class="news-dialog-srclabel">Fuentes</p>
                    <ul class="news-links">
                      <li v-for="(h, i) in activeNews.headlines" :key="i">
                        <a
                          :href="h.link"
                          target="_blank"
                          rel="noopener noreferrer"
                          :title="h.title"
                        >
                          <VIcon size="13" class="mr-1">mdi-open-in-new</VIcon>{{ h.source }}
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
                <VDivider />
                <div class="pa-3 d-flex justify-end">
                  <VBtn variant="tonal" color="primary" size="small" @click="newsDialog = false">
                    Cerrar
                  </VBtn>
                </div>
              </VCard>
            </VDialog>
          </template>
        </template>
        <template #fallback>
          <VCard variant="flat" class="news-placeholder pa-6">
            <span class="text-body-2 text-medium-emphasis">Cargando novedades…</span>
          </VCard>
        </template>
      </ClientOnly>
    </section>

    <!-- What Reddit says -->
    <section class="reddit-section mt-8" aria-label="Qué dice Reddit de cada banco">
      <h2 class="section-heading mb-1">Qué dice Reddit</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Nuestro puntaje es nuestro criterio. Esto es el contrapeso: lo que dicen los uruguayos en
        Reddit. Todos los días buscamos los hilos de bancos y fintech en
        <span class="text-medium-emphasis">{{ redditSubs }}</span
        >, atribuimos cada frase al banco del que habla y la puntuamos. El número sale de las
        opiniones, no de las menciones al pasar —y si a alguien casi nadie lo juzgó, decimos
        <em>sin datos</em> en vez de inventar un veredicto.
      </p>

      <ClientOnly>
        <template #default>
          <VCard
            v-if="redditPending"
            variant="flat"
            class="news-placeholder pa-6 d-flex align-center"
          >
            <VProgressCircular indeterminate size="22" width="2" color="primary" class="mr-3" />
            <span class="text-body-2 text-medium-emphasis">Leyendo Reddit…</span>
          </VCard>

          <template v-else-if="redditJudged.length">
            <div class="reddit-grid">
              <VCard
                v-for="e in redditJudged"
                :key="e.id"
                variant="flat"
                class="reddit-card pa-4"
                :class="`rd-${netClass(e.net)}`"
              >
                <div class="d-flex align-center ga-2 mb-2">
                  <span class="tile-mono" :style="monoStyle(e.id)">{{ monogram(e.name) }}</span>
                  <span class="text-subtitle-2 font-weight-bold">{{ e.name }}</span>
                  <VChip
                    size="x-small"
                    variant="tonal"
                    class="ml-auto font-weight-bold"
                    :color="netColor(e.net)"
                  >
                    {{ e.label }}
                  </VChip>
                </div>

                <!-- Net sentiment, −100 … +100, drawn from the centre -->
                <div
                  class="rd-bar"
                  role="img"
                  :aria-label="`Sentimiento neto de ${e.name}: ${e.net} sobre 100`"
                >
                  <span class="rd-zero" />
                  <span
                    class="rd-fill"
                    :style="{
                      left: e.net >= 0 ? '50%' : `${50 + e.net / 2}%`,
                      width: `${Math.abs(e.net) / 2}%`,
                      background: netHue(e.net),
                    }"
                  />
                </div>
                <p class="rd-counts mb-3">
                  <strong :style="{ color: netHue(e.net) }"
                    >{{ e.net > 0 ? '+' : '' }}{{ e.net }}</strong
                  >
                  · {{ e.opinions }} opiniones ({{ e.positive }} 👍 / {{ e.negative }} 👎) sobre
                  {{ e.mentions }} menciones
                </p>

                <p v-if="e.summary" class="reddit-summary mb-3">{{ e.summary }}</p>

                <ul v-if="e.quotes.length" class="reddit-quotes">
                  <li v-for="(q, i) in e.quotes.slice(0, 3)" :key="i">
                    <a
                      :href="q.permalink"
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      :class="q.polarity < 0 ? 'q-neg' : 'q-pos'"
                    >
                      <span class="q-mark">“</span>{{ q.text }}<span class="q-mark">”</span>
                      <span class="q-meta">r/{{ q.sub }} · {{ q.date }}</span>
                    </a>
                  </li>
                </ul>

                <div v-if="e.themes.length" class="d-flex flex-wrap ga-1 mt-3">
                  <VChip
                    v-for="t in e.themes.slice(0, 3)"
                    :key="t.theme"
                    size="x-small"
                    variant="tonal"
                    color="primary"
                  >
                    {{ THEME_LABELS[t.theme] ?? t.theme }} · {{ t.count }}
                  </VChip>
                </div>
              </VCard>
            </div>

            <p v-if="redditUnjudged.length" class="text-caption text-medium-emphasis mt-4 mb-0">
              <VIcon size="14" class="mr-1">mdi-help-circle-outline</VIcon>
              Sin datos suficientes en Reddit ({{ redditMinSample }} opiniones mínimo):
              <strong>{{ redditUnjudged.map(e => e.name).join(', ') }}</strong
              >. Que no se hable de un banco no dice nada bueno ni malo de él.
            </p>
            <p class="text-caption text-medium-emphasis mt-2 mb-0">
              <VIcon size="14" class="mr-1">mdi-alert-outline</VIcon>
              Reddit amplifica la queja: se escribe más cuando algo sale mal, y quien postea es una
              porción joven y urbana del país. Tomalo como una señal, no como el veredicto del
              mercado — por eso no toca los puntajes de arriba.
              <span v-if="redditAsOf">Actualizado {{ redditAsOf }}.</span>
            </p>
          </template>
        </template>
        <template #fallback>
          <VCard variant="flat" class="news-placeholder pa-6">
            <span class="text-body-2 text-medium-emphasis">Cargando opiniones…</span>
          </VCard>
        </template>
      </ClientOnly>
    </section>

    <!-- Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-6"
      icon="mdi-alert-outline"
    >
      Comparación <strong>informativa</strong>, no asesoramiento financiero; no tenemos afiliación
      con ninguna entidad. Comisiones, tasas, beneficios y letra chica
      <strong>cambian seguido</strong>. Los puntajes reflejan nuestro criterio con la información
      pública disponible a julio de 2026 — incluido que
      <strong>HSBC Uruguay pasó a ser BTG Pactual el 10 de julio de 2026</strong>. Verificá siempre
      las condiciones vigentes en el sitio de cada entidad antes de decidir.
    </VAlert>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes
      </h2>
      <ul class="sources-list">
        <li v-for="(s, i) in sources" :key="i">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </VCard>

    <!-- Cross-links -->
    <VRow class="my-6">
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/tarjetas-de-credito-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-credit-card-multiple-outline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Tarjetas de crédito</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Ranking de puntos y beneficios de las tarjetas uruguayas.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="4">
        <VCard
          :to="localePath('/apps-economia-uruguay')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-cellphone-cog</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Apps de dinero</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Prex, Mercado Pago, Astropay y más, comparadas.
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
          <VIcon color="primary" class="mb-2">mdi-chart-areaspline</VIcon>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">Dónde invertir</h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            Plazo fijo, FCI, brokers y cripto para hacer rendir tus pesos y dólares.
          </p>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import {
  BANKS,
  BANK_RUBRIC,
  PROFILE_PRESETS,
  KIND_LABELS,
  DIM_IDS,
  buildBoard,
  rankEntities,
  matchPreset,
  type DimId,
  type TierId,
  type EntityKind,
  type ProfilePreset,
} from '~/utils/bankTierlist'

const localePath = useLocalePath()
const redditUrl = 'https://www.reddit.com/r/Burises/comments/1ut5srl/top_peores_bancos_de_uruguay/'

// --- interactive state ---
const activeDims = ref<DimId[]>([...DIM_IDS])
const kindFilter = ref<'all' | EntityKind>('all')
const openId = ref<string | null>(null)

const kindOptions = [
  { value: 'all' as const, label: 'Todo' },
  { value: 'banco' as const, label: 'Bancos' },
  { value: 'fintech' as const, label: 'Fintech' },
]

function toggleDim(id: DimId) {
  const i = activeDims.value.indexOf(id)
  if (i === -1) {
    // keep rubric order for a stable hint
    activeDims.value = DIM_IDS.filter(d => d === id || activeDims.value.includes(d))
  } else if (activeDims.value.length > 1) {
    activeDims.value = activeDims.value.filter(d => d !== id)
  }
}
function applyPreset(p: ProfilePreset) {
  activeDims.value = [...p.dims]
}

const activePresetId = computed(() => matchPreset(activeDims.value)?.id ?? null)
const board = computed(() => buildBoard(activeDims.value))
const rankedFichas = computed(() =>
  rankEntities(activeDims.value).filter(
    r => kindFilter.value === 'all' || r.entity.kind === kindFilter.value
  )
)

const activeHint = computed(() => {
  const preset = matchPreset(activeDims.value)
  const labels = BANK_RUBRIC.filter(d => activeDims.value.includes(d.id)).map(d => d.short)
  const base =
    activeDims.value.length === DIM_IDS.length
      ? 'Todos los criterios con su peso'
      : `Solo: ${labels.join(' · ')}`
  return preset && preset.id !== 'equilibrado' ? `${preset.label} — ${preset.hint}` : base
})

function visibleItems(items: ReturnType<typeof rankEntities>) {
  return items.filter(r => kindFilter.value === 'all' || r.entity.kind === kindFilter.value)
}

// --- ficha open + scroll ---
const fichaEls = new Map<string, HTMLElement>()
function registerFicha(id: string, el: unknown) {
  const node = (el as { $el?: HTMLElement } | null)?.$el
  if (node) fichaEls.set(id, node)
}
function openFicha(id: string) {
  openId.value = openId.value === id ? null : id
  if (openId.value && import.meta.client) {
    nextTick(() => {
      fichaEls.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }
}

// --- presentation helpers ---
const BRAND: Record<string, string> = {
  mercadopago: '#00a5e0',
  itau: '#ec7000',
  santander: '#ec0000',
  brou: '#0072bc',
  bbva: '#1464a5',
  takenos: '#6c5ce7',
  heritage: '#0f4c81',
  astropay: '#00b487',
  scotiabank: '#d5121a',
  prex: '#ff5a1f',
  btg: '#00274d',
}
const brand = (id: string) => BRAND[id] ?? '#64748b'

const TIER_HUE: Record<TierId, string> = {
  S: '#059669',
  A: '#22c55e',
  B: '#84cc16',
  C: '#eab308',
  D: '#f97316',
  F: '#ef4444',
}

/**
 * Pick the text colour (near-black or white) with the better contrast against a
 * background hex. Brand and tier colours span the whole lightness range, so
 * hardcoding white would fail WCAG on the light ones (Mercado Pago, Astropay, the
 * lime/amber tiers). This keeps every chip legible in both themes.
 */
function readableOn(hex: string): string {
  const h = hex.replace('#', '')
  const toLin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  const r = toLin(parseInt(h.slice(0, 2), 16) / 255)
  const g = toLin(parseInt(h.slice(2, 4), 16) / 255)
  const b = toLin(parseInt(h.slice(4, 6), 16) / 255)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
  const vsWhite = 1.05 / (lum + 0.05)
  const vsBlack = (lum + 0.05) / 0.05
  return vsBlack > vsWhite ? '#0b1220' : '#ffffff'
}

/** Monogram chip: brand background + a text colour that actually contrasts with it. */
function monoStyle(id: string) {
  const bg = brand(id)
  return { background: bg, color: readableOn(bg) }
}

function gemStyle(t: TierId) {
  return {
    '--gem': TIER_HUE[t],
    color: readableOn(TIER_HUE[t]),
  } as Record<string, string>
}

/** Score band → a class, so the colour can differ per theme (see `<style>`). */
function scoreClass(score: number): string {
  if (score >= 78) return 'sc-5'
  if (score >= 66) return 'sc-4'
  if (score >= 54) return 'sc-3'
  if (score >= 44) return 'sc-2'
  return 'sc-1'
}

/** Score → hue for the (non-text) progress bars. */
function scoreHue(score: number): string {
  if (score >= 78) return '#16a34a'
  if (score >= 66) return '#65a30d'
  if (score >= 54) return '#ca8a04'
  if (score >= 44) return '#ea580c'
  return '#dc2626'
}

function monogram(name: string): string {
  if (name === 'Mercado Pago') return 'MP'
  if (name === 'Banco Heritage') return 'H'
  if (name === 'BTG Pactual') return 'BTG'
  return name.slice(0, 2).toUpperCase()
}

function emptyCaption(t: TierId): string {
  if (t === 'S')
    return 'Vacío a propósito: ningún banco ni fintech uruguayo llega tan alto con estos criterios.'
  if (t === 'F') return 'Sin ocupantes con estos criterios. Nadie cae tan bajo… todavía.'
  return 'Nadie queda en este nivel con los criterios elegidos.'
}

// --- recent news + AI analysis (client-lazy; the grounded AI call never blocks SSR) ---
const { locale } = useI18n()

interface BriefingHeadline {
  title: string
  source: string
  link: string
}
interface BanksBriefing {
  items: { id: string; name: string; insight: string | null; headlines: BriefingHeadline[] }[]
  analysis: string | null
  asOf: string
  unavailable: boolean
}
const { data: news, pending: newsPending } = useLazyFetch<BanksBriefing>('/api/banks-news', {
  query: { lang: locale },
  server: false,
})
const newsItems = computed(() => news.value?.items ?? [])

marked.setOptions({ breaks: true, gfm: true })
const newsHtml = computed(() => {
  const txt = news.value?.analysis
  if (!txt) return ''
  const html = marked.parse(txt) as string
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h3', 'h4', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'blockquote'],
    ALLOWED_ATTR: ['class'],
    ALLOW_DATA_ATTR: false,
  })
})
const newsAsOf = computed(() => {
  const iso = news.value?.asOf
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
})

// "Ver más" opens a reading-friendly dialog with the full news for one entity.
const openNewsId = ref<string | null>(null)
const newsDialog = computed({
  get: () => openNewsId.value !== null,
  set: v => {
    if (!v) openNewsId.value = null
  },
})
const activeNews = computed(() => newsItems.value.find(it => it.id === openNewsId.value) ?? null)

/** Short first-sentence teaser for the card (the full text lives in the dialog). */
function teaser(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const stop = clean.indexOf('. ')
  if (stop >= 40 && stop <= 150) return clean.slice(0, stop + 1)
  return clean.length > 140 ? clean.slice(0, 140).replace(/\s+\S*$/, '') + '…' : clean
}

/** Split the insight into ~2-sentence paragraphs so the dialog reads comfortably. */
function newsParagraphs(text: string | null): string[] {
  if (!text) return []
  const clean = text.replace(/\s+/g, ' ').trim()
  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map(s => s.trim()) ?? [clean]
  const paras: string[] = []
  for (let i = 0; i < sentences.length; i += 2) paras.push(sentences.slice(i, i + 2).join(' '))
  return paras
}

// --- what Reddit says (daily snapshot from MongoDB; never a live Reddit call) ---
interface RedditQuote {
  text: string
  permalink: string
  date: string
  score: number
  sub: string
  polarity: number
}
interface RedditEntitySentiment {
  id: string
  name: string
  mentions: number
  positive: number
  negative: number
  neutral: number
  opinions: number
  net: number
  label: string
  themes: { theme: string; count: number }[]
  quotes: RedditQuote[]
  summary: string | null
  latestMentionDate: string | null
}
interface RedditSnapshot {
  entities: RedditEntitySentiment[]
  asOf: string | null
  empty: boolean
  subs: string[]
  minSample: number
}

const THEME_LABELS: Record<string, string> = {
  app: 'App',
  comisiones: 'Comisiones',
  atencion: 'Atención',
  usd: 'Dólares',
  productos: 'Productos',
  cobertura: 'Cobertura',
}

const { data: reddit, pending: redditPending } = useLazyFetch<RedditSnapshot>(
  '/api/reddit-sentiment',
  { server: false }
)

/** Entities Reddit actually judged (enough opinions to say something). */
const redditJudged = computed(() =>
  (reddit.value?.entities ?? [])
    .filter(e => e.label !== 'sin datos')
    .sort((a, b) => b.opinions - a.opinions)
)
/** Named but barely judged — we say so instead of pretending silence is a verdict. */
const redditUnjudged = computed(() =>
  (reddit.value?.entities ?? []).filter(e => e.label === 'sin datos' && e.mentions > 0)
)
const redditMinSample = computed(() => reddit.value?.minSample ?? 5)
const redditSubs = computed(() =>
  (reddit.value?.subs ?? ['uruguay', 'Burises', 'UruguayFinanzas']).map(s => `r/${s}`).join(', ')
)
const redditAsOf = computed(() => {
  const iso = reddit.value?.asOf
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-UY', { day: 'numeric', month: 'long', year: 'numeric' })
})

/** The Reddit verdict for one tier-list entity, or null when Reddit hasn't judged it. */
function redditFor(id: string): RedditEntitySentiment | null {
  const e = (reddit.value?.entities ?? []).find(x => x.id === id)
  return e && e.label !== 'sin datos' && e.quotes.length ? e : null
}

const netClass = (net: number) => (net >= 15 ? 'pos' : net > -15 ? 'mix' : 'neg')
const netColor = (net: number) => (net >= 15 ? 'success' : net > -15 ? 'warning' : 'error')
const netHue = (net: number) => (net >= 15 ? '#16a34a' : net > -15 ? '#ca8a04' : '#dc2626')

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/mejores-bancos-uruguay'
const title = 'Los mejores bancos de Uruguay 2026: tier list de bancos y fintech'
const description =
  'Tier list interactiva de los bancos y fintech de Uruguay (BROU, Itaú, Santander, BBVA, Scotiabank, BTG Pactual (ex HSBC), Heritage, Mercado Pago, Prex, Astropay, Takenos). Rankeados con datos: puntajes reales de las tiendas, comisiones, atención, dólares y cobertura, más lo que dicen los uruguayos en Reddit. Reordená según lo que te importa.'

defineOgImageComponent('Cambio', {
  title: 'Mejores bancos de Uruguay',
  subtitle: 'Tier list de bancos y fintech, con datos',
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

const sources = [
  { label: 'Reddit r/Burises — “Top peores bancos de Uruguay” (hilo disparador)', url: redditUrl },
  {
    label: 'Apple — bancos que participan en Apple Pay (sección Uruguay)',
    url: 'https://support.apple.com/en-us/109524',
  },
  {
    label: 'Santander Uruguay — página oficial de Apple Pay',
    url: 'https://www.santander.com.uy/apple-pay',
  },
  {
    label: 'Santander suma Apple Pay en Uruguay (El Observador, ago. 2025)',
    url: 'https://www.elobservador.com.uy/ciencia-y-tecnologia/santander-suma-apple-pay-uruguay-conoce-la-lista-bancos-que-ya-lo-tienen-n6012017',
  },
  {
    label: 'Google Wallet — bancos compatibles en Uruguay',
    url: 'https://support.google.com/wallet/answer/12059326?hl=es-419&co=GENIE.CountryCode%3DUY',
  },
  {
    label:
      'HSBC Uruguay — aviso: “el 10 de julio de 2026 se concretó la adquisición” por BTG Pactual',
    url: 'https://www.hsbc.com.uy/aviso/',
  },
  { label: 'BTG Pactual Uruguay — sitio oficial', url: 'https://www.btgpactual.uy/' },
  {
    label: 'HSBC vende su operación en Uruguay a BTG Pactual (Mercopress, jul. 2025)',
    url: 'https://en.mercopress.com/2025/07/29/hsbc-sells-out-operations-in-uruguay-to-leading-brazilian-bank',
  },
  {
    label: 'eBROU — reseñas Google Play (~4,4/5)',
    url: 'https://play.google.com/store/apps/details?id=uy.brou',
  },
  {
    label: 'Itaú Uruguay — reseñas Google Play (~4,8/5)',
    url: 'https://play.google.com/store/apps/details?id=com.uy.itau.appitauuypf',
  },
  {
    label: 'BBVA Uruguay — reseñas Google Play (histórico ~4,6/5; recientes ~3,1/5)',
    url: 'https://play.google.com/store/apps/details?id=com.bbva.glomo.uy',
  },
  {
    label: 'Scotia Móvil — reseñas Google Play (~2,45/5)',
    url: 'https://play.google.com/store/apps/details?id=com.ingsw.scotiabankapp',
  },
  {
    label: 'Prex — reseñas Google Play (~4,77/5, 129 mil reseñas)',
    url: 'https://play.google.com/store/apps/details?id=air.Prex',
  },
  {
    label: 'Prex — Trustpilot (~1,9/5, 70 reseñas)',
    url: 'https://es.trustpilot.com/review/www.prexcard.com',
  },
  {
    label: 'Astropay — Trustpilot (~4,2/5, 9.611 reseñas)',
    url: 'https://www.trustpilot.com/review/app.astropay.com',
  },
  { label: 'Takenos — Trustpilot (~3,6/5)', url: 'https://www.trustpilot.com/review/takenos.com' },
  {
    label: 'Takenos — comisiones de retiro (centro de ayuda)',
    url: 'https://help.takenos.com/en/articles/9820507',
  },
  {
    label: 'Scotiabank — modificación de retiros Banred (Cuenta Sueldo)',
    url: 'https://www.scotiabank.com.uy/Acerca-de/novedades/Aviso-banred-cuenta-sueldo',
  },
  {
    label: 'Mercado Pago lanza rendimientos y tarjeta internacional en Uruguay (El Observador)',
    url: 'https://www.elobservador.com.uy/cafe-y-negocios/negocios/mercado-pago-uruguay',
  },
  {
    label: 'Banque Heritage — tarifario Cuenta Smart (mínimo US$ 10.000)',
    url: 'https://www.heritage.com.uy/',
  },
]

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'mejores bancos uruguay, peores bancos uruguay, mejor banco uruguay, tier list bancos uruguay, brou itau santander scotiabank bbva, mercado pago prex astropay takenos, comparativa bancos uruguay, btg pactual uruguay, hsbc uruguay btg pactual, hsbc pasa a btg, santander apple pay uruguay',
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
                name: 'Mejores bancos de Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Tier list de bancos y fintech de Uruguay (criterios balanceados)',
            itemListElement: rankEntities(DIM_IDS).map((r, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: `${r.entity.name} — Tier ${r.tier} (${r.score}/100)`,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.tierlist-page {
  overflow-x: hidden;
}

/* ---------- Hero ---------- */
.hero-card {
  border-radius: 18px;
}
.hero {
  position: relative;
  background:
    radial-gradient(120% 140% at 100% 0%, rgba(5, 150, 105, 0.35), transparent 55%),
    radial-gradient(120% 160% at 0% 100%, rgba(239, 68, 68, 0.28), transparent 55%),
    linear-gradient(135deg, #0b3b2e 0%, #10233a 55%, #3a1220 100%);
}
.hero-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  font-weight: 700;
  color: #9ff2c9;
  margin-bottom: 0.5rem;
}
.hero-title {
  color: #fff;
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.02em;
  font-size: clamp(1.6rem, 4.6vw, 2.75rem);
  margin-bottom: 0.75rem;
  text-wrap: balance;
}
.hero-title-accent {
  display: block;
  font-size: 0.62em;
  font-weight: 600;
  color: #cfe9ff;
  letter-spacing: -0.01em;
  margin-top: 0.2rem;
}
.hero-lead {
  color: rgba(255, 255, 255, 0.9);
  max-width: 760px;
  line-height: 1.6;
  font-size: 1rem;
  margin-bottom: 1rem;
}
/* Link + spoiler sit on one row with a real gap, and wrap cleanly on mobile. */
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin-top: 14px;
}
.hero-link {
  display: inline-flex;
  align-items: center;
  color: #ffd7a1;
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
  flex-shrink: 0;
}
.hero-link:hover {
  text-decoration: underline;
  text-underline-offset: 2px;
}
.hero-spoiler {
  display: inline-flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(255, 255, 255, 0.16);
  color: #fff;
  border-radius: 999px;
  padding: 7px 15px;
  font-size: 0.85rem;
  line-height: 1.45;
}

/* ---------- Controls ---------- */
.controls-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 16px;
}
.preset-chip,
.crit-chip,
.kind-chip {
  display: inline-flex;
  align-items: center;
  font: inherit;
  cursor: pointer;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  background: transparent;
  color: rgb(var(--v-theme-on-surface));
  padding: 7px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  transition:
    background 0.18s ease,
    border-color 0.18s ease,
    transform 0.12s ease;
}
.preset-chip:hover,
.crit-chip:hover,
.kind-chip:hover {
  border-color: rgb(var(--v-theme-primary));
}
.preset-chip:active {
  transform: scale(0.97);
}
.preset-chip--on {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.criteria-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.crit-chip {
  justify-content: flex-start;
  padding: 9px 12px;
}
.crit-chip .crit-weight {
  margin-left: auto;
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.85;
  background: rgba(var(--v-border-color), 0.16);
  border-radius: 6px;
  padding: 1px 6px;
}
.crit-chip:not(.crit-chip--off) {
  background: rgba(var(--v-theme-primary), 0.14);
  border-color: rgba(var(--v-theme-primary), 0.55);
}
.crit-chip--off {
  opacity: 0.5;
}
.crit-chip:disabled {
  cursor: default;
  opacity: 0.9;
}
.kind-chip--on {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}
.active-hint {
  display: flex;
  align-items: center;
  font-size: 0.82rem;
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  margin: 10px 0 0;
}

/* ---------- Board ---------- */
.board {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tier-row {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 12px;
  align-items: stretch;
  border-radius: 14px;
  overflow: hidden;
  background: color-mix(in srgb, var(--row-hue, #64748b) 9%, transparent);
  border: 1px solid color-mix(in srgb, var(--row-hue, #64748b) 26%, transparent);
}
.tier-row[data-tier='S'] {
  --row-hue: #059669;
}
.tier-row[data-tier='A'] {
  --row-hue: #22c55e;
}
.tier-row[data-tier='B'] {
  --row-hue: #84cc16;
}
.tier-row[data-tier='C'] {
  --row-hue: #eab308;
}
.tier-row[data-tier='D'] {
  --row-hue: #f97316;
}
.tier-row[data-tier='F'] {
  --row-hue: #ef4444;
}
.tier-gem {
  --gem: #64748b;
  background: linear-gradient(160deg, color-mix(in srgb, var(--gem) 88%, #fff 12%), var(--gem));
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 92px;
}
.tier-letter {
  font-size: 2.6rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.22);
}
.tier-body {
  padding: 10px 12px 12px;
  min-width: 0;
}
.tier-blurb {
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.88;
  margin-bottom: 8px;
}
.tier-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tile {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.22);
  border-radius: 12px;
  padding: 7px 12px 7px 7px;
  cursor: pointer;
  font: inherit;
  text-align: left;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
  transition:
    transform 0.16s ease,
    border-color 0.16s ease,
    box-shadow 0.16s ease;
}
.tile:hover {
  transform: translateY(-2px);
  border-color: rgba(var(--v-theme-primary), 0.7);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
}
.tile--open {
  border-color: rgb(var(--v-theme-primary));
}
.tile-mono {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: -0.02em;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}
.tile-main {
  display: flex;
  flex-direction: column;
  line-height: 1.15;
}
.tile-name {
  font-weight: 700;
  font-size: 0.92rem;
}
.tile-kind {
  font-size: 0.68rem;
  opacity: 0.82;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tile-score {
  font-weight: 800;
  font-size: 1.05rem;
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
}
.tier-empty {
  font-size: 0.8rem;
  font-style: italic;
  opacity: 0.85;
  align-self: center;
  padding: 4px 2px;
}

/* Tile move/enter/leave animation on re-tiering */
.tile-move,
.tile-enter-active,
.tile-leave-active {
  transition:
    transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.32s ease;
}
.tile-enter-from,
.tile-leave-to {
  opacity: 0;
  transform: scale(0.82) translateY(6px);
}
.tile-leave-active {
  position: absolute;
}

/* ---------- Method + fichas ---------- */
.method-panels,
.fichas {
  border-radius: 12px;
}
.method-dim:last-child p {
  margin-bottom: 0;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}
.ficha {
  margin-bottom: 6px;
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px !important;
}
.ficha-mono {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 800;
  font-size: 0.95rem;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
}
.ficha-tierbadge {
  --gem: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 6px;
  font-weight: 900;
  font-size: 0.8rem;
  background: var(--gem);
}
.ficha-scorebox {
  min-width: 52px;
}
.ficha-score {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}
.ficha-verdict {
  background: rgba(var(--v-theme-primary), 0.07);
  border-left: 3px solid rgba(var(--v-theme-primary), 0.7);
  border-radius: 0 8px 8px 0;
  padding: 10px 12px;
  line-height: 1.6;
}

/* Signals */
.signal {
  font-size: 0.78rem;
  border-radius: 999px;
  padding: 3px 11px;
  border: 1px solid transparent;
}
.signal strong {
  font-weight: 800;
}
.signal--pos {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.4);
  color: #15803d;
}
.signal--neg {
  background: rgba(239, 68, 68, 0.12);
  border-color: rgba(239, 68, 68, 0.4);
  color: #b91c1c;
}
.signal--neutral {
  background: rgba(var(--v-border-color), 0.12);
  border-color: rgba(var(--v-border-color), 0.3);
}
.v-theme--dark .signal--pos {
  color: #6ee7a8;
}
.v-theme--dark .signal--neg {
  color: #fca5a5;
}

/* Score bars */
.score-bars {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.score-row {
  display: grid;
  grid-template-columns: 92px 1fr 28px;
  align-items: center;
  gap: 10px;
}
.score-dim {
  font-size: 0.78rem;
  font-weight: 600;
  opacity: 0.9;
}
.score-dim--muted {
  opacity: 0.4;
}
.score-track {
  height: 8px;
  border-radius: 999px;
  background: rgba(var(--v-border-color), 0.18);
  overflow: hidden;
}
.score-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}
.score-fill--muted {
  opacity: 0.35;
}
.score-val {
  font-size: 0.78rem;
  font-weight: 700;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Pros / cons */
.plabel {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 6px;
}
.plabel--pro {
  color: #16a34a;
}
.plabel--con {
  color: #dc2626;
}
.plist {
  padding-left: 18px;
  margin: 0;
}
.plist li {
  font-size: 0.86rem;
  line-height: 1.5;
  margin-bottom: 5px;
}
.plist--pro li::marker {
  content: '✓  ';
  color: #16a34a;
}
.plist--con li::marker {
  content: '✕  ';
  color: #dc2626;
}

/* ---------- Sources + cross-links ---------- */
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.sources-list {
  padding-left: 18px;
  margin: 0;
}
.sources-list li {
  font-size: 0.84rem;
  margin-bottom: 5px;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
}
.cross-link {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
  transition:
    transform 0.16s ease,
    border-color 0.16s ease;
}
.cross-link:hover {
  transform: translateY(-3px);
  border-color: rgba(var(--v-theme-primary), 0.6);
}

/* ---------- News + AI analysis ---------- */
.news-placeholder {
  border: 1px dashed rgba(var(--v-border-color), 0.3);
  border-radius: 14px;
}
.ai-analysis {
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  border-radius: 16px;
  background: rgba(var(--v-theme-primary), 0.05);
}
.ai-analysis-content :deep(p) {
  line-height: 1.65;
  margin-bottom: 0.6rem;
  font-size: 0.92rem;
}
.ai-analysis-content :deep(ul),
.ai-analysis-content :deep(ol) {
  padding-left: 20px;
  margin: 0.3rem 0 0.6rem;
}
.ai-analysis-content :deep(li) {
  margin-bottom: 0.35rem;
  font-size: 0.9rem;
  line-height: 1.55;
}
.ai-analysis-content :deep(:last-child) {
  margin-bottom: 0;
}
.ai-analysis-content :deep(em) {
  opacity: 0.72;
}
.news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.news-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.news-insight {
  font-size: 0.85rem;
  line-height: 1.6;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.88;
  margin-bottom: 0;
}
.news-teaser {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.news-more {
  display: inline-flex;
  align-items: center;
  font: inherit;
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: rgb(var(--v-theme-primary));
  background: none;
  border: none;
  cursor: pointer;
  padding: 3px 0;
}
.news-more:hover {
  text-decoration: underline;
}

/* Corrections */
.corrections-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-left: 3px solid rgb(var(--v-theme-primary));
  border-radius: 14px;
}
.corr-date {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.6;
  margin-bottom: 10px;
}
.corr-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.corr-list li {
  font-size: 0.88rem;
  line-height: 1.6;
}

/* Per-ficha Reddit block */
.ficha-reddit {
  border-top: 1px dashed rgba(var(--v-border-color), 0.22);
  padding-top: 12px;
}

/* What Reddit says */
.reddit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 12px;
}
.reddit-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 14px;
}
.reddit-card.rd-neg {
  border-left: 3px solid #dc2626;
}
.reddit-card.rd-mix {
  border-left: 3px solid #ca8a04;
}
.reddit-card.rd-pos {
  border-left: 3px solid #16a34a;
}
/* Net sentiment bar: zero sits in the middle, the fill grows to its side. */
.rd-bar {
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--v-border-color), 0.16);
  overflow: hidden;
}
.rd-zero {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(var(--v-theme-on-surface), 0.35);
}
.rd-fill {
  position: absolute;
  top: 0;
  bottom: 0;
  border-radius: 999px;
}
.rd-counts {
  font-size: 0.74rem;
  opacity: 0.75;
  margin-top: 6px;
  margin-bottom: 0;
}
.reddit-summary {
  font-size: 0.85rem;
  line-height: 1.6;
  opacity: 0.9;
}
.reddit-quotes {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.reddit-quotes a {
  display: block;
  font-size: 0.78rem;
  line-height: 1.5;
  text-decoration: none;
  border-radius: 8px;
  padding: 6px 8px;
  background: rgba(var(--v-border-color), 0.08);
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.92;
}
.reddit-quotes a:hover {
  background: rgba(var(--v-theme-primary), 0.1);
}
.reddit-quotes a.q-neg {
  border-left: 2px solid rgba(220, 38, 38, 0.75);
}
.reddit-quotes a.q-pos {
  border-left: 2px solid rgba(22, 163, 74, 0.75);
}
.q-mark {
  opacity: 0.45;
}
.q-meta {
  display: block;
  font-size: 0.68rem;
  opacity: 0.6;
  margin-top: 3px;
}

/* News detail dialog */
.news-dialog {
  border-radius: 16px;
}
.news-dialog-head {
  background: rgba(var(--v-theme-primary), 0.06);
}
.news-dialog-body {
  max-height: 60vh;
  overflow-y: auto;
}
.news-dialog-text {
  font-size: 0.95rem;
  line-height: 1.7;
  margin-bottom: 0.85rem;
}
.news-dialog-text:last-of-type {
  margin-bottom: 0;
}
.news-dialog-srclabel {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.6;
  margin-bottom: 6px;
}
.news-links {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.news-links a {
  display: inline-flex;
  align-items: center;
  font-size: 0.74rem;
  color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.1);
  border-radius: 999px;
  padding: 2px 9px;
  text-decoration: none;
}
.news-links a:hover {
  background: rgba(var(--v-theme-primary), 0.18);
}

/* ---------- Score colours (theme-aware: the dark-tuned hues fail AA on white) ---------- */
.sc-5 {
  color: #22c55e;
}
.sc-4 {
  color: #a3e635;
}
.sc-3 {
  color: #eab308;
}
.sc-2 {
  color: #fb923c;
}
.sc-1 {
  color: #f87171;
}
.v-theme--light .sc-5 {
  color: #15803d;
}
.v-theme--light .sc-4 {
  color: #4d7c0f;
}
.v-theme--light .sc-3 {
  color: #a16207;
}
.v-theme--light .sc-2 {
  color: #c2410c;
}
.v-theme--light .sc-1 {
  color: #b91c1c;
}

/* ---------- Light-mode contrast fixes (brand primary is tuned for dark) ---------- */
.v-theme--light .active-hint,
.v-theme--light .news-more,
.v-theme--light .news-links a,
.v-theme--light .sources-list a {
  color: #0d47a1;
}
.v-theme--light .plabel--pro {
  color: #15803d;
}
.v-theme--light .plabel--con {
  color: #b91c1c;
}
.v-theme--light .score-dim {
  color: rgba(0, 0, 0, 0.72);
}
.v-theme--light .score-val {
  color: rgba(0, 0, 0, 0.78);
}
.v-theme--light .tier-empty,
.v-theme--light .tier-blurb {
  color: rgba(0, 0, 0, 0.68);
}

@media (max-width: 600px) {
  .tier-row {
    grid-template-columns: 60px 1fr;
  }
  .tier-gem {
    min-height: 76px;
  }
  .tier-letter {
    font-size: 2rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tile-move,
  .tile-enter-active,
  .tile-leave-active,
  .score-fill,
  .tile,
  .cross-link,
  .preset-chip,
  .crit-chip {
    transition: none !important;
  }
}
</style>
