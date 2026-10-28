<template>
  <VCard
    variant="outlined"
    class="ro-card h-100 d-flex flex-column"
    :class="{ 'ro-card--done': item.state !== 'open' }"
  >
    <div class="ro-body">
      <div class="ro-meta">
        <a
          :href="`https://www.reddit.com/r/${item.sub}/`"
          target="_blank"
          rel="noopener nofollow"
          class="ro-sub"
          >r/{{ item.sub }}</a
        >
        <span aria-hidden="true">·</span>
        <time :datetime="item.createdAt" :title="dateLabel(item.createdAt)">{{ age }}</time>
        <span class="ro-stat" :title="`${item.score} votos`">
          <VIcon icon="mdi-arrow-up-bold-outline" size="14" />{{ item.score }}
        </span>
        <span class="ro-stat" :title="`${item.numComments} comentarios`">
          <VIcon icon="mdi-comment-outline" size="14" />{{ item.numComments }}
        </span>
        <span v-if="item.lang === 'en'" class="ro-tag">EN</span>
        <span v-if="item.flair" class="ro-flair">{{ item.flair }}</span>
      </div>

      <h3 class="ro-title">
        <a :href="item.permalink" target="_blank" rel="noopener nofollow">{{ item.title }}</a>
      </h3>
      <p v-if="item.excerpt" class="ro-excerpt">{{ item.excerpt }}</p>
      <p v-else class="ro-excerpt ro-excerpt--empty">
        Sin texto: el hilo es el título o una imagen.
      </p>
      <p v-if="linkHost" class="ro-shared">
        <VIcon icon="mdi-link-variant" size="14" /> Comparte un enlace a {{ linkHost }}
      </p>

      <section class="ro-suggest" :aria-label="`Página sugerida: ${item.pageTitle}`">
        <div class="ro-suggest-head">
          <span class="ro-suggest-label">Responder con</span>
          <span class="ro-family">{{ familyLabel }}</span>
          <span class="ro-confidence" :title="'Confianza del juez'">{{ confidence }}</span>
        </div>
        <a :href="item.path" target="_blank" rel="noopener" class="ro-page">{{
          item.pageTitle || item.path
        }}</a>
        <div class="ro-path">{{ shownUrl }}</div>
        <p class="ro-reason">{{ item.reason }}</p>
        <p v-if="item.angle" class="ro-angle"><strong>Qué aportar:</strong> {{ item.angle }}</p>
      </section>

      <ul v-if="flags.length" class="ro-flags">
        <li v-for="flag in flags" :key="flag.text" :class="`ro-flag--${flag.tone}`">
          <VIcon :icon="flag.icon" size="16" />
          <span>{{ flag.text }}</span>
        </li>
      </ul>

      <p v-if="item.alsoIn.length" class="ro-also">
        También en
        <template v-for="(copy, i) in item.alsoIn" :key="copy.permalink">
          <a :href="copy.permalink" target="_blank" rel="noopener nofollow">r/{{ copy.sub }}</a
          ><span v-if="i < item.alsoIn.length - 1">, </span>
        </template>
        — contestá en uno solo.
      </p>
    </div>

    <div class="ro-actions">
      <template v-if="item.state === 'open' && !answering">
        <VBtn
          :href="item.permalink"
          target="_blank"
          rel="noopener nofollow"
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-open-in-new"
        >
          Abrir hilo
        </VBtn>
        <VBtn
          variant="tonal"
          size="small"
          prepend-icon="mdi-content-copy"
          @click="emit('copy', shownUrl)"
        >
          Copiar enlace
        </VBtn>
        <VSpacer />
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-check"
          :disabled="busy"
          @click="answering = true"
        >
          Respondido
        </VBtn>
        <VBtn
          variant="text"
          size="small"
          prepend-icon="mdi-close"
          :disabled="busy"
          @click="emit('update-state', { state: 'dismissed' })"
        >
          Descartar
        </VBtn>
      </template>

      <form v-else-if="answering" class="ro-answer" @submit.prevent="saveAnswer">
        <VTextField
          v-model="answerUrl"
          label="Enlace a tu comentario (opcional)"
          placeholder="https://www.reddit.com/r/…/comments/…/…/"
          density="compact"
          variant="outlined"
          autofocus
          :error-messages="answerError"
          hint="Abrí tu comentario y copiá la dirección de la barra. El enlace corto de «Compartir» no sirve. Con él, la próxima corrida mira si se ve con sesión cerrada."
          persistent-hint
        />
        <div class="d-flex flex-wrap ga-2 mt-3">
          <VBtn
            type="submit"
            color="primary"
            variant="flat"
            size="small"
            :disabled="busy || !!answerError"
          >
            Guardar
          </VBtn>
          <VBtn variant="text" size="small" @click="cancelAnswer">Cancelar</VBtn>
        </div>
      </form>

      <template v-else>
        <span class="ro-status">
          <VIcon :icon="status.icon" size="16" />
          {{ status.text }}
        </span>
        <VSpacer />
        <VBtn
          variant="text"
          size="small"
          :disabled="busy"
          @click="emit('update-state', { state: 'open' })"
        >
          Volver a pendientes
        </VBtn>
      </template>
    </div>
  </VCard>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  oppAgeLabel,
  OPPS_FAMILY_LABELS,
  isRedditCommentUrl,
  oppSubNoteOf,
  oppSuggestedUrl,
  type OppItem,
  type OppState,
} from '~/utils/redditOpportunities'

const props = defineProps<{ item: OppItem; busy?: boolean }>()
const emit = defineEmits<{
  (e: 'update-state', payload: { state: OppState; answerUrl?: string }): void
  (e: 'copy', url: string): void
}>()

const answering = ref(false)
const answerUrl = ref('')

const age = computed(() => oppAgeLabel(props.item.createdAt))
const familyLabel = computed(
  () => OPPS_FAMILY_LABELS[props.item.family] ?? OPPS_FAMILY_LABELS.otros
)
const confidence = computed(() => `${Math.round(props.item.confidence * 100)} %`)
const shownUrl = computed(() => oppSuggestedUrl(props.item))
const linkHost = computed(() => {
  try {
    return props.item.linkUrl ? new URL(props.item.linkUrl).hostname.replace(/^www\./, '') : ''
  } catch {
    return ''
  }
})

const answerError = computed(() =>
  answerUrl.value.trim() && !isRedditCommentUrl(answerUrl.value)
    ? 'Tiene que ser el enlace a un comentario: …/comments/<hilo>/<título>/<comentario>/'
    : ''
)

interface Flag {
  icon: string
  text: string
  tone: 'warn' | 'info'
}

/** Lo que hay que saber antes de contestar, en el orden en que cambia la decisión. */
const flags = computed<Flag[]>(() => {
  const out: Flag[] = []
  const i = props.item
  if (i.removed)
    out.push({
      icon: 'mdi-delete-outline',
      text: 'Lo borraron: ya no se puede contestar.',
      tone: 'warn',
    })
  if (i.locked)
    out.push({
      icon: 'mdi-lock-outline',
      text: 'Está cerrado: no admite comentarios.',
      tone: 'warn',
    })
  if (i.alreadyLinked)
    out.push({
      icon: 'mdi-link-variant',
      text: 'Alguien ya enlazó el sitio en los comentarios.',
      tone: 'warn',
    })
  else if (i.alreadyLinked === null && i.numComments > 0)
    out.push({
      icon: 'mdi-comment-search-outline',
      text: 'Comentarios sin revisar: mirá si ya lo contestaron.',
      tone: 'info',
    })
  if (i.numComments > 80)
    out.push({
      icon: 'mdi-comment-multiple-outline',
      text: 'Hilo muy comentado: una respuesta nueva queda abajo.',
      tone: 'info',
    })
  const note = oppSubNoteOf(i.sub)
  if (note) out.push({ icon: 'mdi-information-outline', text: note, tone: 'info' })
  return out
})

const status = computed(() => {
  const i = props.item
  if (i.state === 'dismissed')
    return { icon: 'mdi-close', text: `Descartado ${i.stateAt ? oppAgeLabel(i.stateAt) : ''}` }
  const when = i.stateAt ? oppAgeLabel(i.stateAt) : ''
  if (!i.answerUrl)
    return { icon: 'mdi-check', text: `Respondido ${when}, sin enlace al comentario` }
  if (i.answerVisible === true)
    return { icon: 'mdi-eye-outline', text: `Respondido ${when}. Tu comentario se ve.` }
  if (i.answerVisible === false)
    return {
      icon: 'mdi-eye-off-outline',
      text: `Respondido ${when}. Con sesión cerrada tu comentario NO se ve.`,
    }
  return {
    icon: 'mdi-timer-sand',
    text: `Respondido ${when}. Se revisa si se ve en la próxima corrida.`,
  }
})

function saveAnswer(): void {
  if (answerError.value) return
  emit('update-state', { state: 'answered', answerUrl: answerUrl.value.trim() || undefined })
  answering.value = false
}

function cancelAnswer(): void {
  answering.value = false
  answerUrl.value = ''
}

const dateLabel = (iso: string) =>
  new Intl.DateTimeFormat('es-UY', {
    dateStyle: 'medium',
    timeStyle: 'short',
    hourCycle: 'h23',
    timeZone: 'America/Montevideo',
  }).format(new Date(iso))
</script>

<style scoped>
.ro-card {
  border-radius: 12px;
  transition: opacity 0.2s ease;
}
.ro-card--done {
  opacity: 0.86;
}
.ro-body {
  padding: 16px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1 1 auto;
}
.ro-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.ro-sub {
  font-weight: 700;
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.ro-sub:hover,
.ro-sub:focus-visible {
  text-decoration: underline;
}
.ro-stat {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-variant-numeric: tabular-nums;
}
.ro-tag,
.ro-flair {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0 6px;
  border-radius: 999px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
}
.ro-flair {
  font-weight: 400;
  max-width: 14ch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ro-title {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.35;
  margin: 0;
  text-wrap: pretty;
  overflow-wrap: anywhere;
}
.ro-title a {
  color: inherit;
  text-decoration: none;
}
.ro-title a:hover,
.ro-title a:focus-visible {
  text-decoration: underline;
}
.ro-excerpt {
  font-size: 0.875rem;
  line-height: 1.45;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.78);
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
.ro-excerpt--empty {
  font-style: italic;
}
.ro-shared {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.ro-suggest {
  margin-top: 4px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(var(--v-theme-primary), 0.07);
}
.ro-suggest-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  line-height: 1.4;
  margin-bottom: 4px;
}
.ro-suggest-label {
  font-weight: 700;
  letter-spacing: 0.0333em;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.ro-family {
  color: rgb(var(--v-theme-link));
  font-weight: 700;
}
.ro-confidence {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
  color: rgba(var(--v-theme-on-surface), 0.72);
}
.ro-page {
  display: block;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.ro-page:hover,
.ro-page:focus-visible {
  text-decoration: underline;
}
.ro-path {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
  overflow-wrap: anywhere;
  margin-bottom: 6px;
}
.ro-reason,
.ro-angle {
  font-size: 0.875rem;
  line-height: 1.45;
  margin: 0;
}
.ro-angle {
  margin-top: 4px;
}
.ro-flags {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ro-flags li {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.74);
}
.ro-flags li .v-icon {
  margin-top: 1px;
  flex: none;
}
.ro-flag--warn {
  color: rgb(var(--v-theme-on-surface)) !important;
  font-weight: 700;
}
.ro-flag--warn .v-icon {
  color: rgb(var(--v-theme-error));
}
.ro-also {
  font-size: 0.8rem;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.74);
}
.ro-also a {
  color: rgb(var(--v-theme-link));
}
.ro-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
}
.ro-answer {
  width: 100%;
}
.ro-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  line-height: 1.35;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
</style>
