<template>
  <VContainer fluid class="ui-page py-6">
    <div class="d-flex flex-wrap align-center justify-space-between ga-2 mb-1">
      <h1 class="text-h4">Uso del sitio</h1>
      <div class="d-flex flex-wrap ga-1">
        <VBtn
          to="/estadisticas-por-pagina"
          variant="text"
          size="small"
          prepend-icon="mdi-chart-bar"
        >
          Ranking de páginas
        </VBtn>
        <VBtn to="/estadisticas-de-busqueda" variant="text" size="small" prepend-icon="mdi-magnify">
          Search Console y plan de ingreso
        </VBtn>
      </div>
    </div>
    <p class="text-body-2 text-medium-emphasis mb-6">
      Panel privado. Qué hace la gente en cada página y qué hay que arreglar primero, cruzando
      Cloudflare, Google Analytics, la inspección de URLs de Search Console, las opiniones del sitio
      y, cuando tengan su clave, Clarity, Bing y CrUX. Lo escribe el job
      <code>currency-usage-insights</code> todos los días a las 09:21 de Uruguay y sólo lo ven las
      cuentas de <code>NUXT_ADMIN_EMAILS</code>. Nada de esto se junta desde el navegador: el job
      lee las APIs del lado del servidor.
    </p>

    <VAlert v-if="pending" type="info" variant="tonal" class="mb-4">Cargando…</VAlert>

    <VAlert v-else-if="forbidden" type="error" variant="tonal" class="mb-4">
      Esta cuenta no está en la lista de administradores.
    </VAlert>

    <VAlert v-else-if="!snapshot" type="warning" variant="tonal" class="mb-4">
      Todavía no hay datos. {{ hint }}
    </VAlert>

    <template v-else>
      <VAlert v-if="stale" type="warning" variant="tonal" density="compact" class="mb-3">
        El tablero es del {{ asOfLabel }}: el job no corrió desde entonces.
      </VAlert>
      <VAlert
        v-if="snapshot.run?.trimmed?.length"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        Se recortaron tablas para que el documento entre en 1 MB:
        {{ snapshot.run.trimmed.join(' · ') }}.
      </VAlert>

      <p class="text-caption text-medium-emphasis mb-3">
        Datos hasta el {{ uiDate(snapshot.day) }} ({{ snapshot.timezone }}). Ventana de 28 días:
        {{ uiDate(snapshot.window?.start) }} a {{ uiDate(snapshot.window?.end) }}. Corrida
        {{ asOfLabel }}.
      </p>

      <!-- 4. Las cuatro tejas -->
      <VRow class="mb-2">
        <VCol v-for="k in kpis" :key="k.id" cols="12" sm="6" md="3">
          <VCard variant="outlined" class="pa-4 h-100">
            <StatTile :label="k.label" :value="k.value" :note="k.note" />
          </VCard>
        </VCol>
      </VRow>
      <VRow class="mb-6">
        <VCol cols="12" sm="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis mb-1">
              Cargas reales por día (Cloudflare, Uruguay)
            </div>
            <Sparkline v-if="loadsSeries.length > 1" :values="loadsSeries" :up="loadsUp" />
            <div v-else class="text-caption text-medium-emphasis">Todavía no hay dos días.</div>
          </VCard>
        </VCol>
        <VCol cols="12" sm="6">
          <VCard variant="outlined" class="pa-4 h-100">
            <div class="text-caption text-medium-emphasis mb-1">
              Cobertura de Google Analytics por día (entradas)
            </div>
            <Sparkline v-if="coverageSeries.length > 1" :values="coverageSeries" :up="coverageUp" />
            <div v-else class="text-caption text-medium-emphasis">
              Todavía no hay dos días comparables (el último día GA4 sigue procesando).
            </div>
          </VCard>
        </VCol>
      </VRow>

      <!-- 5. Qué mirar primero -->
      <h2 class="text-h6 mb-1">Qué mirar primero</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Las señales que encontraron páginas, de la más grave a la menos. Cada una dice con qué
        números se disparó; el umbral está escrito abajo de su tabla.
      </p>
      <VAlert v-if="!actionable.length" type="success" variant="tonal" class="mb-6">
        Ninguna señal con datos frescos encontró páginas para arreglar.
      </VAlert>
      <VExpansionPanels v-else multiple class="mb-8">
        <VExpansionPanel v-for="s in actionable" :key="s.id" :value="s.id">
          <VExpansionPanelTitle>
            <div class="ui-panel-title">
              <div class="d-flex flex-wrap align-center ga-2 mb-1">
                <VChip size="small" variant="flat" :color="UI_SEVERITY[s.severity].color">
                  {{ UI_SEVERITY[s.severity].label }}
                </VChip>
                <span class="text-subtitle-1 font-weight-bold">{{ s.title }}</span>
                <VChip size="x-small" variant="tonal">
                  {{ prNumber(s.count) }} {{ s.count === 1 ? 'fila' : 'filas' }}
                </VChip>
                <VChip v-if="s.newRows" size="x-small" variant="tonal" color="info">
                  {{ prNumber(s.newRows) }} {{ s.newRows === 1 ? 'nueva' : 'nuevas' }}
                </VChip>
              </div>
              <div class="text-body-2 text-medium-emphasis">{{ s.summary }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="text-caption text-medium-emphasis mb-2">
              {{ s.question }} Impacto: {{ uiImpact(s) }}.
            </p>
            <VTable density="compact" class="mb-2 cu-mobile-cards">
              <thead>
                <tr>
                  <th v-if="signalHasPath(s)">Página</th>
                  <th
                    v-for="col in UI_SIGNAL_COLUMNS[s.id]"
                    :key="col.key"
                    :class="isNumericKind(col.kind) ? 'text-right text-no-wrap' : ''"
                  >
                    {{ col.label }}
                  </th>
                  <th class="text-right text-no-wrap">Impacto</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in s.rows.slice(0, signalLimit(s.id))" :key="r.key">
                  <td v-if="signalHasPath(s)" data-label="" class="ui-subject">
                    <template v-if="r.path">
                      <a
                        v-if="isLinkablePath(r.path)"
                        :href="r.path"
                        target="_blank"
                        rel="noopener"
                      >
                        {{ r.path }}
                      </a>
                      <span v-else>{{ r.path }}</span>
                      <VBtn
                        variant="text"
                        size="x-small"
                        density="comfortable"
                        prepend-icon="mdi-eye-outline"
                        class="ml-1"
                        @click="showPage(r.path)"
                      >
                        ver
                      </VBtn>
                    </template>
                    <span v-else class="text-medium-emphasis">—</span>
                    <VChip v-if="r.isNew" size="x-small" variant="tonal" color="info" class="ml-1">
                      nuevo
                    </VChip>
                  </td>
                  <td
                    v-for="col in UI_SIGNAL_COLUMNS[s.id]"
                    :key="col.key"
                    :data-label="col.label"
                    :class="cellClass(col)"
                  >
                    {{ uiCell(col, r) }}
                    <VChip
                      v-if="!signalHasPath(s) && r.isNew && col === UI_SIGNAL_COLUMNS[s.id][0]"
                      size="x-small"
                      variant="tonal"
                      color="info"
                      class="ml-1"
                    >
                      nuevo
                    </VChip>
                  </td>
                  <td data-label="Impacto" class="text-right text-no-wrap">
                    {{ prNumber(r.impact) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
            <div v-if="s.rows.length > signalLimit(s.id)" class="d-flex justify-center mb-2">
              <VBtn variant="tonal" size="small" @click="moreSignalRows(s.id)">
                Ver {{ Math.min(SIGNAL_STEP, s.rows.length - signalLimit(s.id)) }} más
              </VBtn>
            </div>
            <p v-if="s.count > s.rows.length" class="text-caption text-medium-emphasis mb-2">
              Se guardan las {{ prNumber(s.rows.length) }} de más impacto de
              {{ prNumber(s.count) }}.
            </p>
            <div v-if="s.groups.length" class="d-flex flex-wrap ga-1 mb-2">
              <VChip
                v-for="g in s.groups"
                :key="g.key"
                size="x-small"
                variant="outlined"
                :title="g.share !== null ? uiPercent(g.share) : undefined"
              >
                {{ g.label }} · {{ prNumber(g.count) }}
                <template v-if="g.share !== null"> · {{ uiPercent(g.share) }}</template>
              </VChip>
            </div>
            <p class="text-caption text-medium-emphasis mb-0">
              <template v-if="Object.keys(s.thresholds || {}).length">
                Umbrales: {{ uiThresholds(s.thresholds) }}.
              </template>
              Fuentes: {{ s.sources.map(id => UI_SOURCE_LABELS[id] || id).join(', ') }}. Datos del
              {{ uiDate(s.dataAsOf) }}.
            </p>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>

      <!-- 6. Todavía sin datos -->
      <template v-if="waiting.length">
        <h2 class="text-h6 mb-1">Todavía sin datos</h2>
        <p class="text-body-2 text-medium-emphasis mb-2">
          Señales que no pueden afirmar nada hoy. Ninguna convierte la falta de datos en "no hay
          problema".
        </p>
        <VList density="compact" class="mb-8 ui-waiting" lines="two">
          <VListItem v-for="s in waiting" :key="s.id">
            <template #prepend>
              <VChip
                size="x-small"
                variant="tonal"
                class="mr-3"
                :color="s.status === 'stale' ? 'warning' : 'grey'"
              >
                {{ s.status === 'stale' ? 'datos viejos' : 'sin datos' }}
              </VChip>
            </template>
            <VListItemTitle class="text-wrap">{{ s.title }}</VListItemTitle>
            <VListItemSubtitle class="text-wrap">
              {{ s.reason || s.summary }}
              <template v-if="s.status === 'stale' && s.rows.length">
                · {{ prNumber(s.rows.length) }} filas guardadas del {{ uiDate(s.dataAsOf) }}
              </template>
            </VListItemSubtitle>
          </VListItem>
        </VList>
      </template>

      <!-- 7. Una página -->
      <h2 id="una-pagina" class="text-h6 mb-1">Una página</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Todo lo que dicen las fuentes de una ruta, y en qué señales aparece. Se puede escribir una
        ruta o pegar una URL.
      </p>
      <VCombobox
        v-model="selectedPath"
        :items="pagePaths"
        label="Ruta"
        density="compact"
        variant="outlined"
        clearable
        hide-details
        prepend-inner-icon="mdi-magnify"
        class="mb-3 ui-picker"
      />
      <VCard v-if="detail" variant="outlined" class="pa-4 mb-8">
        <div class="d-flex flex-wrap align-center ga-2 mb-3">
          <a
            v-if="isLinkablePath(detailPath)"
            :href="detailPath"
            target="_blank"
            rel="noopener"
            class="text-subtitle-1 font-weight-bold ui-path"
          >
            {{ detailPath }}
          </a>
          <span v-else class="text-subtitle-1 font-weight-bold ui-path">{{ detailPath }}</span>
        </div>
        <VAlert v-if="!detail.row" type="info" variant="tonal" density="compact" class="mb-3">
          Esa ruta no está entre las {{ prNumber(snapshot.pages.length) }} páginas guardadas.
        </VAlert>
        <VRow v-else dense class="mb-2">
          <VCol v-for="sec in detailSections" :key="sec.title" cols="12" sm="6" md="4">
            <div class="text-overline">{{ sec.title }}</div>
            <div
              v-for="item in sec.items"
              :key="item.label"
              class="d-flex justify-space-between ga-2 text-body-2"
            >
              <span class="text-medium-emphasis">{{ item.label }}</span>
              <span class="font-weight-bold text-right">{{ item.value }}</span>
            </div>
          </VCol>
        </VRow>
        <div v-if="detail.signalRows.length">
          <div class="text-overline">Señales</div>
          <div
            v-for="(sr, i) in detail.signalRows"
            :key="`${sr.signal.id}-${i}`"
            class="text-body-2 mb-2"
          >
            <VChip size="x-small" variant="flat" :color="UI_SEVERITY[sr.signal.severity].color">
              {{ UI_SIGNAL_LABELS[sr.signal.id] }}
            </VChip>
            <span class="text-caption text-medium-emphasis ml-1">
              {{ signalRowLine(sr.signal, sr.row) }}
            </span>
          </div>
        </div>
        <p v-else class="text-caption text-medium-emphasis mb-0">No aparece en ninguna señal.</p>
      </VCard>
      <div v-else class="mb-8" />

      <!-- 8. Páginas -->
      <h2 class="text-h6 mb-3">Páginas</h2>
      <div class="d-flex flex-wrap ga-2 mb-2">
        <VTextField
          v-model="query"
          label="Buscar ruta o familia"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          prepend-inner-icon="mdi-magnify"
          class="ui-filter ui-filter--wide"
        />
        <VSelect
          v-model="family"
          :items="familyItems"
          label="Familia"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          class="ui-filter"
        />
        <VSelect
          v-model="signalFilter"
          :items="signalItems"
          label="Señal"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          class="ui-filter"
        />
        <VSelect
          v-model="locale"
          :items="localeItems"
          label="Idioma"
          density="compact"
          variant="outlined"
          clearable
          hide-details
          class="ui-filter"
        />
        <VSelect
          v-model="sortKey"
          :items="sortItems"
          label="Ordenar por"
          density="compact"
          variant="outlined"
          hide-details
          class="ui-filter"
        />
      </div>
      <p class="text-caption text-medium-emphasis mb-2">
        {{ prNumber(filtered.length) }} de {{ prNumber(snapshot.pages.length) }} páginas guardadas
        (las de más cargas o vistas). Cobertura = entradas que ve Google Analytics ÷ entradas que ve
        Cloudflare, los mismos días.
      </p>
      <VTable density="compact" class="mb-3 cu-mobile-cards">
        <thead>
          <tr>
            <th>Página</th>
            <th>Familia</th>
            <th class="text-right text-no-wrap">Cargas CF</th>
            <th class="text-right text-no-wrap">Vistas GA4</th>
            <th class="text-right text-no-wrap" title="Entradas GA4 ÷ entradas Cloudflare">
              Cobertura
            </th>
            <th class="text-right text-no-wrap">Interacción cel / escr</th>
            <th class="text-right text-no-wrap">Llega a la mitad</th>
            <th class="text-right text-no-wrap">Sale afuera</th>
            <th>Celular LCP/INP/CLS</th>
            <th>Índice</th>
            <th>Señales</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in visiblePages" :key="p.path">
            <td data-label="" class="ui-subject">
              <a v-if="isLinkablePath(p.path)" :href="p.path" target="_blank" rel="noopener">
                {{ p.path }}
              </a>
              <span v-else>{{ p.path }}</span>
              <VBtn
                variant="text"
                size="x-small"
                density="comfortable"
                prepend-icon="mdi-eye-outline"
                class="ml-1"
                @click="showPage(p.path)"
              >
                ver
              </VBtn>
            </td>
            <td data-label="Familia" class="text-caption ui-path">{{ p.family }}</td>
            <td data-label="Cargas CF" class="text-right text-no-wrap">
              {{ p.cf ? prNumber(p.cf.loads) : '—' }}
            </td>
            <td data-label="Vistas GA4" class="text-right text-no-wrap">
              {{ p.ga4 ? prNumber(p.ga4.views) : '—' }}
            </td>
            <td
              data-label="Cobertura"
              class="text-right text-no-wrap"
              :title="`Por cargas (contexto): ${uiPercent(p.coverageLoads)}`"
            >
              {{ uiPercent(p.coverage) }}
            </td>
            <td data-label="Interacción cel / escr" class="text-right text-no-wrap">
              <template v-if="p.ga4">
                {{ uiPercent(p.ga4.mobileEngagement) }} / {{ uiPercent(p.ga4.desktopEngagement) }}
              </template>
              <template v-else>—</template>
            </td>
            <td data-label="Llega a la mitad" class="text-right text-no-wrap">
              {{ uiRate(p, 'read') }}
            </td>
            <td data-label="Sale afuera" class="text-right text-no-wrap">
              {{ uiRate(p, 'outbound') }}
            </td>
            <td data-label="Celular LCP/INP/CLS">
              <span v-if="p.vitals?.mobile" class="d-inline-flex flex-wrap ga-1">
                <VChip
                  v-for="m in VITAL_METRICS"
                  :key="m.key"
                  size="x-small"
                  variant="tonal"
                  :color="ratingColor(p.vitals.mobile[m.key])"
                  :title="`${m.label}: ${uiFormat(p.vitals.mobile[m.key], 'rating')}`"
                >
                  {{ m.label }}
                </VChip>
              </span>
              <span v-else class="text-medium-emphasis">—</span>
            </td>
            <td data-label="Índice" class="text-caption">{{ uiIndexLabel(p) }}</td>
            <td data-label="Señales">
              <VChip
                v-for="sid in p.signals"
                :key="sid"
                size="x-small"
                variant="tonal"
                class="mr-1 mb-1"
              >
                {{ UI_SIGNAL_LABELS[sid] || sid }}
              </VChip>
            </td>
          </tr>
        </tbody>
      </VTable>
      <div class="d-flex justify-center mb-8">
        <VBtn
          v-if="visiblePages.length < filtered.length"
          variant="tonal"
          @click="pageLimit += PAGE_STEP"
        >
          Ver {{ Math.min(PAGE_STEP, filtered.length - visiblePages.length) }} más
        </VBtn>
      </div>

      <!-- 9. Fuentes -->
      <h2 class="text-h6 mb-1">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Cada fuente corre por separado: una caída conserva sus datos anteriores con su fecha vieja,
        y una inactiva dice qué le falta.
      </p>
      <VTable density="compact" class="mb-4 cu-mobile-cards">
        <thead>
          <tr>
            <th>Fuente</th>
            <th>Estado</th>
            <th>Datos</th>
            <th>Última buena</th>
            <th>Nota</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in statusRows" :key="r.id">
            <td data-label="" class="ui-subject font-weight-bold">{{ r.label }}</td>
            <td data-label="Estado">
              <VChip size="x-small" variant="tonal" :color="r.color">{{ r.statusLabel }}</VChip>
            </td>
            <td data-label="Datos" class="text-no-wrap">{{ r.date }}</td>
            <td data-label="Última buena" class="text-no-wrap">{{ r.lastOkAt }}</td>
            <td data-label="Nota" class="text-caption cu-cell-prose">
              {{ r.note || '—' }}
              <template v-if="r.carried"> · arrastrado: {{ r.carried }}</template>
            </td>
          </tr>
        </tbody>
      </VTable>

      <VTabs v-model="sourceTab" show-arrows class="mb-2">
        <VTab v-for="id in UI_SOURCE_IDS" :key="id" :value="id">{{ UI_SOURCE_LABELS[id] }}</VTab>
      </VTabs>
      <VTabsWindow v-model="sourceTab" class="mb-8">
        <VTabsWindowItem v-for="id in UI_SOURCE_IDS" :key="id" :value="id">
          <div class="pt-3">
            <VAlert
              v-if="!snapshot.sources?.[id]?.data"
              type="info"
              variant="tonal"
              density="compact"
              class="mb-3"
            >
              {{
                snapshot.sources?.[id]?.enableHint ||
                snapshot.sources?.[id]?.note ||
                'Esta fuente todavía no trajo datos.'
              }}
            </VAlert>
            <template v-else>
              <p class="text-caption text-medium-emphasis mb-2">
                {{ uiSourceDate(snapshot.sources[id]) }}
                <template v-if="snapshot.sources[id].window">
                  · ventana {{ uiDate(snapshot.sources[id].window?.start) }} a
                  {{ uiDate(snapshot.sources[id].window?.end) }}
                </template>
                <template v-if="snapshot.sources[id].truncated">
                  · algún pedido llegó al tope de filas
                </template>
              </p>
              <VAlert
                v-if="!snapshot.sources[id].ok"
                type="warning"
                variant="tonal"
                density="compact"
                class="mb-3"
              >
                Esta corrida no la actualizó ({{ UI_STATUS[snapshot.sources[id].status].label }}):
                lo de abajo son los datos guardados.
              </VAlert>
              <p
                v-if="
                  id === 'ga4Behavior' && !snapshot.sources.ga4Behavior.data?.search.qRegistered
                "
                class="text-caption text-medium-emphasis mb-2"
              >
                Las búsquedas sin resultado se cuentan por página porque Analytics no guarda el
                texto buscado: falta registrar la dimensión <code>q</code> (paso 5.6 de
                <code>docs/analytics/USAGE_INSIGHTS.md</code>).
              </p>
              <p v-if="id === 'clarity'" class="text-caption mb-2">
                <a :href="CLARITY_DASHBOARD_URL" target="_blank" rel="noopener noreferrer">
                  Abrir el tablero de Clarity
                </a>
                para ver las grabaciones de una página.
              </p>
              <div v-for="t in tablesFor(id)" :key="t.id" class="mb-4">
                <h3 class="text-subtitle-2 mb-1">{{ t.title }}</h3>
                <p v-if="!t.rows.length" class="text-caption text-medium-emphasis">
                  {{ t.empty || 'Sin filas.' }}
                </p>
                <template v-else>
                  <VTable density="compact" class="cu-mobile-cards">
                    <thead>
                      <tr>
                        <th
                          v-for="col in t.columns"
                          :key="col.key"
                          :class="isNumericKind(col.kind) ? 'text-right text-no-wrap' : ''"
                        >
                          {{ col.label }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(r, i) in t.rows.slice(0, tableLimit(id, t.id))" :key="i">
                        <td
                          v-for="col in t.columns"
                          :key="col.key"
                          :data-label="col.label"
                          :class="cellClass(col)"
                        >
                          <a
                            v-if="col.kind === 'path' && isLinkablePath(uiCellValue(col, r))"
                            :href="String(uiCellValue(col, r))"
                            target="_blank"
                            rel="noopener"
                          >
                            {{ uiCellValue(col, r) }}
                          </a>
                          <a
                            v-else-if="col.kind === 'link' && isExternalUrl(uiCellValue(col, r))"
                            :href="String(uiCellValue(col, r))"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            abrir
                          </a>
                          <template v-else-if="col.kind === 'link'">—</template>
                          <template v-else>{{ uiCell(col, r) }}</template>
                        </td>
                      </tr>
                    </tbody>
                  </VTable>
                  <div
                    v-if="t.rows.length > tableLimit(id, t.id)"
                    class="d-flex justify-center mt-2"
                  >
                    <VBtn variant="tonal" size="small" @click="moreTableRows(id, t.id)">
                      Ver {{ Math.min(TABLE_STEP, t.rows.length - tableLimit(id, t.id)) }} más
                    </VBtn>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </VTabsWindowItem>
      </VTabsWindow>
    </template>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { VCombobox } from 'vuetify/components'
import { prNumber } from '~/utils/pageRanking'
import {
  CLARITY_DASHBOARD_URL,
  UI_RATING,
  UI_SEVERITY,
  UI_SIGNAL_COLUMNS,
  UI_SIGNAL_IDS,
  UI_SIGNAL_LABELS,
  UI_SOURCE_IDS,
  UI_SOURCE_LABELS,
  UI_STATUS,
  actionableSignals,
  filterPages,
  isExternalUrl,
  isLinkablePath,
  isNumericKind,
  normalizeInsightPath,
  pageDetail,
  pageDetailFields,
  sortPages,
  sourceTables,
  uiCell,
  uiCellValue,
  uiDate,
  uiDropNulls,
  uiFamilies,
  uiFormat,
  uiImpact,
  uiIndexLabel,
  uiIsStale,
  uiKpis,
  uiLocales,
  uiPercent,
  uiRate,
  uiSourceDate,
  uiSourceStatusRows,
  uiThresholds,
  waitingSignals,
  type Rating,
  type Signal,
  type SignalId,
  type SignalRow,
  type SourceId,
  type UiColumn,
  type UiSortKey,
  type UiSourceTable,
  type UsageInsightSnapshot,
} from '~/utils/usageInsights'

// Login is required to get a bearer token at all; the server route re-checks the allowlist, which
// is the check that actually protects the data.
definePageMeta({ middleware: 'auth' })

useHead({
  title: 'Uso del sitio — panel privado',
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
})

const PAGE_STEP = 50
const SIGNAL_STEP = 10
const TABLE_STEP = 20

const { authFetch } = useAuthFetch()

const snapshot = ref<UsageInsightSnapshot | null>(null)
const hint = ref('')
const pending = ref(true)
const forbidden = ref(false)

try {
  const res = await authFetch<{ snapshot: UsageInsightSnapshot | null; hint?: string }>(
    '/api/usage-insights'
  )
  snapshot.value = res.snapshot
  hint.value = res.hint || ''
} catch (e: any) {
  // 403 (not on the allowlist) and 503 (allowlist unset) are the same thing to a reader: no data.
  forbidden.value = e?.statusCode === 403 || e?.response?.status === 403
  hint.value = 'La ruta respondió ' + (e?.statusCode || e?.response?.status || 'error') + '.'
} finally {
  pending.value = false
}

// ---- encabezado
const kpis = computed(() => (snapshot.value ? uiKpis(snapshot.value) : []))
const loadsSeries = computed(() => uiDropNulls(snapshot.value?.trend?.cfLoadsUy))
const coverageSeries = computed(() => uiDropNulls(snapshot.value?.trend?.coverage))
const rising = (v: number[]) => v.length < 2 || (v.at(-1) ?? 0) >= (v[0] ?? 0)
const loadsUp = computed(() => rising(loadsSeries.value))
const coverageUp = computed(() => rising(coverageSeries.value))

const stale = computed(() => !!snapshot.value && uiIsStale(snapshot.value.asOf))
const asOfLabel = computed(() => {
  const t = Date.parse(snapshot.value?.asOf || '')
  return Number.isFinite(t)
    ? new Intl.DateTimeFormat('es-UY', {
        dateStyle: 'medium',
        timeStyle: 'short',
        hourCycle: 'h23',
        timeZone: 'America/Montevideo',
      }).format(new Date(t))
    : ''
})

// ---- señales
const actionable = computed(() => actionableSignals(snapshot.value?.signals || []))
const waiting = computed(() => waitingSignals(snapshot.value?.signals || []))
const signalLimits = reactive<Record<string, number>>({})
const signalLimit = (id: SignalId) => signalLimits[id] ?? SIGNAL_STEP
const moreSignalRows = (id: SignalId) => (signalLimits[id] = signalLimit(id) + SIGNAL_STEP)
const signalHasPath = (s: Signal) => s.rows.some(r => !!r.path)

const cellClass = (col: UiColumn) =>
  isNumericKind(col.kind) ? 'text-right text-no-wrap' : col.key === 'element' ? 'text-break' : ''

/** "Malo 44 % · p75 aprox. 0,310 · Elemento #main…": la fila de una señal en una línea. */
const signalRowLine = (s: Signal, r: SignalRow) =>
  UI_SIGNAL_COLUMNS[s.id]
    .map(col => ({ label: col.label, value: uiCell(col, r) }))
    .filter(x => x.value !== '—')
    .map(x => `${x.label} ${x.value}`)
    .join(' · ')

// ---- una página
const selectedPath = ref<string | null>(null)
const pagePaths = computed(() => (snapshot.value?.pages || []).map(p => p.path))
const detailPath = computed(() => normalizeInsightPath(selectedPath.value || ''))
const detail = computed(() =>
  snapshot.value && detailPath.value ? pageDetail(snapshot.value, detailPath.value) : null
)
const detailSections = computed(() => (detail.value?.row ? pageDetailFields(detail.value.row) : []))
// Estado local, sin `router.replace`: cambiar la URL vuelve a correr el middleware de login.
function showPage(path: string | null) {
  if (!path) return
  selectedPath.value = path
  if (import.meta.client) {
    requestAnimationFrame(() =>
      document.getElementById('una-pagina')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    )
  }
}

// ---- páginas
const query = ref('')
const family = ref<string | null>(null)
const signalFilter = ref<SignalId | null>(null)
const locale = ref<string | null>(null)
const sortKey = ref<UiSortKey>('loads')
const pageLimit = ref(PAGE_STEP)

const familyItems = computed(() => uiFamilies(snapshot.value?.pages || []))
const localeItems = computed(() =>
  uiLocales(snapshot.value?.pages || []).map(value => ({
    value,
    title: value === 'es' ? 'español' : value,
  }))
)
const signalItems = UI_SIGNAL_IDS.map(value => ({ value, title: UI_SIGNAL_LABELS[value] }))
const sortItems: { value: UiSortKey; title: string }[] = [
  { value: 'loads', title: 'Cargas (Cloudflare)' },
  { value: 'views', title: 'Vistas (Google Analytics)' },
  { value: 'coverage', title: 'Cobertura (la más baja primero)' },
  { value: 'engagement', title: 'Interacción (la más baja primero)' },
  { value: 'read', title: 'Lectura (la más baja primero)' },
  { value: 'outbound', title: 'Salidas (la más alta primero)' },
]

const filtered = computed(() =>
  sortPages(
    filterPages(snapshot.value?.pages || [], {
      q: query.value || '',
      family: family.value,
      signal: signalFilter.value,
      locale: locale.value,
    }),
    sortKey.value
  )
)
const visiblePages = computed(() => filtered.value.slice(0, pageLimit.value))
watch([query, family, signalFilter, locale, sortKey], () => (pageLimit.value = PAGE_STEP))

const VITAL_METRICS: { key: 'lcp' | 'inp' | 'cls'; label: string }[] = [
  { key: 'lcp', label: 'LCP' },
  { key: 'inp', label: 'INP' },
  { key: 'cls', label: 'CLS' },
]
const ratingColor = (r: Rating | null) => (r ? UI_RATING[r].color : 'grey')

// ---- fuentes
const statusRows = computed(() => uiSourceStatusRows(snapshot.value?.sources))
const sourceTab = ref<SourceId>('cloudflareRum')
const tablesFor = (id: SourceId): UiSourceTable[] =>
  snapshot.value?.sources ? sourceTables(snapshot.value.sources, id) : []
const tableLimits = reactive<Record<string, number>>({})
const tableLimit = (id: SourceId, table: string) => tableLimits[`${id}:${table}`] ?? TABLE_STEP
const moreTableRows = (id: SourceId, table: string) =>
  (tableLimits[`${id}:${table}`] = tableLimit(id, table) + TABLE_STEP)
</script>

<style scoped>
.ui-subject {
  max-width: 24rem;
  overflow-wrap: anywhere;
}
.ui-path {
  overflow-wrap: anywhere;
}
.ui-panel-title {
  min-width: 0;
}
.ui-filter {
  flex: 1 1 10rem;
  max-width: 100%;
}
.ui-filter--wide {
  flex-basis: 16rem;
}
.ui-picker {
  max-width: 36rem;
}
.ui-waiting {
  background: transparent;
}
</style>
