<template>
  <div class="atable" role="table" :aria-label="label">
    <div class="row head" role="row">
      <span role="columnheader">#</span>
      <span role="columnheader">Usuario</span>
      <span role="columnheader">{{ metricHead }}</span>
      <span role="columnheader">Opiniones</span>
      <span role="columnheader" class="hide-sm">Reparto</span>
      <span role="columnheader" class="hide-sm">Activo</span>
    </div>
    <div v-for="(u, i) in rows" :key="u.a" class="row" role="row">
      <span class="rank" role="cell">{{ i + 1 }}</span>
      <span class="who" role="cell">
        <a
          v-if="isRedditUsername(u.a)"
          :href="redditUserUrl(u.a)"
          target="_blank"
          rel="noopener nofollow"
          class="user"
          >{{ u.a }}</a
        >
        <span v-else class="user">{{ u.a }}</span>
        <a
          v-if="isRedditUsername(u.a)"
          :href="ghostdditUserUrl(u.a)"
          target="_blank"
          rel="noopener nofollow"
          class="mirror"
          :title="`Ver ${u.a} en Ghostddit (sin login)`"
        >
          <VIcon icon="mdi-ghost-outline" size="15" />
          <span class="sr-only">Ver el perfil en Ghostddit</span>
        </a>
        <small class="themes">{{ themeLine(u) }}</small>
      </span>
      <span class="metric" role="cell">
        <b :class="metricClass(u)">{{ metricValue(u) }}</b>
        <em v-if="metricNote(u)">{{ metricNote(u) }}</em>
      </span>
      <span class="ops" role="cell">{{ fmtInt(u.n) }}</span>
      <span class="split" role="cell">
        <span class="bar" :aria-label="`${fmtPct(u.neg)} negativas, ${fmtPct(u.pos)} positivas`">
          <i class="neg" :style="{ width: `${u.neg * 100}%`, background: NEG }" />
          <i class="neu" :style="{ width: `${Math.max(0, 1 - u.neg - u.pos) * 100}%` }" />
          <i class="pos" :style="{ width: `${u.pos * 100}%`, background: POS }" />
        </span>
        <em>{{ fmtPct(u.neg) }} neg · {{ fmtPct(u.pos) }} pos</em>
      </span>
      <span class="when hide-sm" role="cell">
        {{ shortMonth(u.first) }} → {{ shortMonth(u.last) }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  fmtInt,
  fmtPct,
  ghostdditUserUrl,
  isRedditUsername,
  monthLabel,
  redditUserUrl,
  stanceMeta,
  THEME_LABELS,
  type AuthorRow,
  type AuthorShift,
} from '~/utils/charruadevs'

type Row = AuthorRow & Partial<AuthorShift>

const props = defineProps<{
  rows: Row[]
  label: string
  /** Qué columna manda: la media encogida, el karma de un signo, el volumen o el giro. */
  metric: 'score' | 'doom' | 'negK' | 'posK' | 'n' | 'delta'
}>()

const NEG = stanceMeta(-1).color
const POS = stanceMeta(1).color

const metricHead = computed(
  () =>
    ({
      score: 'Orientación',
      doom: 'Catastrofismo',
      negK: 'Karma negativo',
      posK: 'Karma positivo',
      n: 'Volumen',
      delta: 'Giro',
    })[props.metric]
)

const signed = (v: number, d = 2): string =>
  `${v >= 0 ? '+' : '−'}${Math.abs(v).toLocaleString('es-UY', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  })}`

function metricValue(u: Row): string {
  if (props.metric === 'score') return signed(u.score)
  if (props.metric === 'doom') return fmtPct(u.doom)
  if (props.metric === 'negK') return fmtInt(u.negK)
  if (props.metric === 'posK') return fmtInt(u.posK)
  if (props.metric === 'n') return fmtInt(u.n)
  return signed(u.delta ?? 0)
}

function metricNote(u: Row): string {
  if (props.metric === 'score') return `media ${signed(u.mean)}`
  if (props.metric === 'doom') return 'de sus opiniones son «se terminó»'
  if (props.metric === 'negK') return 'votos en lo que dijo en contra'
  if (props.metric === 'posK') return 'votos en lo que dijo a favor'
  if (props.metric === 'n') return `${fmtInt(u.texts)} textos en total`
  return `${signed(u.oldMean ?? 0)} → ${signed(u.recentMean ?? 0)}`
}

function metricClass(u: Row): string {
  const v = props.metric === 'delta' ? (u.delta ?? 0) : props.metric === 'score' ? u.score : 0
  if (props.metric === 'doom' || props.metric === 'negK') return 'is-neg'
  if (props.metric === 'posK') return 'is-pos'
  if (props.metric === 'n') return ''
  return v < 0 ? 'is-neg' : v > 0 ? 'is-pos' : ''
}

const themeLine = (u: Row): string =>
  u.themes
    .slice(0, 3)
    .map(t => (THEME_LABELS[t.th] ?? t.th).toLowerCase())
    .join(' · ')

const shortMonth = (m: string): string => monthLabel(`${m}-01`)
</script>

<style scoped>
.atable {
  display: grid;
  container-type: inline-size;
}
.row {
  display: grid;
  grid-template-columns: 28px minmax(140px, 1.5fr) 124px 96px minmax(0, 1.4fr) 128px;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.row:last-child {
  border-bottom: 0;
}
.head {
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.7;
  padding-bottom: 6px;
}
.rank {
  font-variant-numeric: tabular-nums;
  opacity: 0.55;
  font-size: 0.85rem;
}
.who {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
}
.user {
  font-weight: 600;
  word-break: break-word;
}
a.user {
  color: inherit;
  text-decoration: underline;
  text-decoration-color: rgba(var(--v-border-color), 0.6);
  text-underline-offset: 2px;
}
a.user:hover {
  text-decoration-color: currentColor;
}
.mirror {
  color: inherit;
  opacity: 0.55;
  line-height: 1;
}
.mirror:hover {
  opacity: 1;
}
.themes {
  flex-basis: 100%;
  font-size: 0.75rem;
  opacity: 0.68;
  line-height: 1.25;
}
.metric {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}
.metric b {
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}
.metric em,
.split em {
  font-style: normal;
  font-size: 0.75rem;
  opacity: 0.68;
}
.is-neg {
  color: v-bind(NEG);
}
.is-pos {
  color: v-bind(POS);
}
.ops {
  font-variant-numeric: tabular-nums;
}
.split {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.bar {
  display: flex;
  height: 7px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(125, 138, 163, 0.18);
}
.bar i {
  display: block;
  height: 100%;
}
.bar .neu {
  background: rgba(125, 138, 163, 0.45);
}
.when {
  font-size: 0.8rem;
  opacity: 0.7;
  font-variant-numeric: tabular-nums;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
/* La tabla se adapta a SU CONTENEDOR, no al viewport: dos de estas van lado a lado dentro de una
   misma página, así que a 1360 px de pantalla una de ellas puede tener 500 px y la columna de
   reparto quedaba en 10 px, con el encabezado escrito en vertical, una letra por línea. */
@container (max-width: 860px) {
  /* La ventana de actividad y su encabezado no entran. */
  .hide-sm {
    display: none;
  }
}
@container (min-width: 601px) and (max-width: 860px) {
  .row {
    grid-template-columns: 24px minmax(0, 1.6fr) 124px 96px;
    row-gap: 6px;
  }
  .split {
    grid-column: 2 / -1;
  }
}
/* Angosto de verdad: el nombre se parte a la mitad de la palabra y los temas caen en una tira de
   una palabra por línea. Cada fila pasa a tres bloques apilados. */
@container (max-width: 600px) {
  .row {
    grid-template-columns: 22px minmax(0, 1fr) auto;
    grid-template-areas:
      'rank who metric'
      '. ops ops'
      '. split split';
    row-gap: 6px;
    align-items: start;
  }
  /* El encabezado sigue en el DOM (la tabla necesita sus columnheader) pero no se dibuja. */
  .head {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
  .rank {
    grid-area: rank;
    padding-top: 2px;
  }
  .who {
    grid-area: who;
  }
  .metric {
    grid-area: metric;
    align-items: flex-end;
    text-align: right;
  }
  .ops {
    grid-area: ops;
    font-size: 0.8rem;
    opacity: 0.75;
  }
  /* Sin encabezado visible, el número suelto no dice de qué es. */
  .ops::after {
    content: ' opiniones';
  }
  .split {
    grid-area: split;
  }
}
/* Navegadores sin container queries (anteriores a 2023): al menos que un teléfono no vea la grilla
   de seis columnas. Acá el ancho del viewport es una aproximación aceptable. */
@supports not (container-type: inline-size) {
  @media (max-width: 860px) {
    .hide-sm {
      display: none;
    }
  }
  @media (min-width: 601px) and (max-width: 860px) {
    .row {
      grid-template-columns: 24px minmax(0, 1.6fr) 124px 96px;
      row-gap: 6px;
    }
    .split {
      grid-column: 2 / -1;
    }
  }
  @media (max-width: 600px) {
    .row {
      grid-template-columns: 22px minmax(0, 1fr) auto;
      grid-template-areas:
        'rank who metric'
        '. ops ops'
        '. split split';
      row-gap: 6px;
      align-items: start;
    }
    .head {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
    .rank {
      grid-area: rank;
      padding-top: 2px;
    }
    .who {
      grid-area: who;
    }
    .metric {
      grid-area: metric;
      align-items: flex-end;
      text-align: right;
    }
    .ops {
      grid-area: ops;
      font-size: 0.8rem;
      opacity: 0.75;
    }
    .ops::after {
      content: ' opiniones';
    }
    .split {
      grid-area: split;
    }
  }
}
</style>
