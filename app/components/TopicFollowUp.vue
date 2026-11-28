<template>
  <aside
    ref="card"
    class="topic-followup"
    :aria-label="title"
    data-testid="topic-followup"
    :data-followup="alert ? 'alert' : 'topic'"
  >
    <template v-if="alert">
      <div class="topic-followup__head">
        <VIcon color="primary" size="28" aria-hidden="true">mdi-bell-plus-outline</VIcon>
        <div>
          <h2 class="topic-followup__title">{{ t('followUp.alertTitle') }}</h2>
          <p class="topic-followup__lead">{{ t('followUp.alertLead') }}</p>
        </div>
      </div>
      <RentalAlertButton :kind="alert.kind" :filters="alert.filters" notify />
      <RentalAlertDialogHost v-if="!alert.hasHost" />
    </template>
    <TopicSubscribe v-else-if="topic" :topic="topic" :title="t('followUp.topicTitle')" />
  </aside>
</template>

<script setup lang="ts">
// La invitación del final según el tema de la página: el brazo `b` del experimento A/B
// `seguimiento` (utils/abTests.ts). Una alerta de avisos nuevos donde la página la declaró
// (`useFollowUpAlert`: directorios y ficha de alquiler, directorio de autos) o el aviso por correo
// de un tema (`followUpTopicForPath`). El brazo `a` es la invitación de siempre (ReaderFollowUp).
import RentalAlertButton from '~/components/rentals/RentalAlertButton.vue'
import RentalAlertDialogHost from '~/components/rentals/RentalAlertDialogHost.vue'
import type { FollowUpAlert } from '~/composables/useFollowUpAlert'
import type { FollowUpTopic } from '~/utils/followUpTopic'
import { topicMessages } from '~/utils/topicMessages'

const props = defineProps<{ alert: FollowUpAlert | null; topic: FollowUpTopic | null }>()

const { t } = useI18n({ useScope: 'local', messages: topicMessages })
const track = useTrack()
const title = computed(() => t(props.alert ? 'followUp.alertTitle' : 'followUp.topicTitle'))

// La misma vara que la tarjeta del newsletter: una vista cuando la mitad está en pantalla.
const card = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
onMounted(() => {
  if (!card.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    entries => {
      if (!entries.some(e => e.isIntersecting)) return
      track('topic_followup_view', { followup: props.alert ? 'alert' : 'topic' })
      observer?.disconnect()
    },
    { threshold: 0.5 }
  )
  observer.observe(card.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.topic-followup {
  margin: 2rem 0 0.5rem;
  padding: 24px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}
.topic-followup__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}
.topic-followup__title {
  margin: 0 0 4px;
  font-size: 1rem;
  line-height: 1.4;
  font-weight: 700;
}
.topic-followup__lead {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
@media (max-width: 599px) {
  .topic-followup {
    padding: 16px;
  }
}
</style>
