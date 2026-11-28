<template>
  <div class="topic-subscribe" data-testid="topic-subscribe">
    <VAlert
      v-if="returnState"
      :type="returnState === 'invalido' ? 'warning' : 'success'"
      variant="tonal"
      density="compact"
      class="mb-3"
      role="status"
    >
      {{ t(`topic.${returnKey}`) }}
    </VAlert>
    <p v-if="title" class="topic-subscribe__title">{{ title }}</p>
    <!-- Quien ya lo pidió ve otra frase en el MISMO renglón: cambiar el formulario por un texto
         después de montar movería lo de abajo (la calculadora va en la primera pantalla). -->
    <p class="topic-subscribe__lead">
      {{ state === 'already' ? t('topic.already') : t('topic.lead') }}
    </p>
    <form class="topic-subscribe__form" novalidate @submit.prevent="submit">
      <VTextField
        v-model="email"
        :label="t('topic.emailLabel')"
        type="email"
        autocomplete="email"
        variant="outlined"
        density="comfortable"
        :disabled="state === 'sending' || state === 'sent'"
        :error-messages="state === 'error' ? t('topic.error') : undefined"
        hide-details="auto"
        data-testid="topic-email"
      />
      <input
        v-model="website"
        type="text"
        name="website"
        tabindex="-1"
        autocomplete="off"
        aria-hidden="true"
        class="topic-subscribe__hp"
      />
      <VBtn
        type="submit"
        color="primary"
        :loading="state === 'sending'"
        :disabled="state === 'sent'"
        prepend-icon="mdi-bell-outline"
        class="topic-subscribe__submit"
        data-cta="topic-subscribe"
        data-testid="topic-submit"
      >
        {{ t('topic.submit') }}
      </VBtn>
    </form>
    <VAlert v-if="state === 'sent'" type="success" variant="tonal" density="compact" class="mt-3">
      {{ t('topic.sent') }}
    </VAlert>
    <p class="topic-subscribe__privacy">
      {{ t('topic.privacy') }}
      <NuxtLink :to="localePath('/privacidad')">{{ t('topic.privacyLink') }}</NuxtLink
      >.
    </p>
  </div>
</template>

<script setup lang="ts">
// "Avisame cuando salga": un aviso por correo de UN tema (server/utils/topics.ts), separado del
// newsletter. Lo usan la calculadora de la guía de jubilaciones y la invitación del final por tema.
// El servidor contesta igual exista o no la dirección; la doble confirmación es la validación real.
import { topicMessages } from '~/utils/topicMessages'

const props = defineProps<{ topic: 'aumento-jubilaciones-2027'; title?: string }>()
const emit = defineEmits<{ subscribed: [] }>()

const { t, locale } = useI18n({ useScope: 'local', messages: topicMessages })
const localePath = useLocalePath()
const route = useRoute()
const track = useTrack()

const STORAGE_KEY = `cu_topic_${props.topic}`
const email = ref('')
const website = ref('')
const state = ref<'idle' | 'sending' | 'sent' | 'error' | 'already'>('idle')

/** `?aviso=` que dejan /api/topics/confirm y /unsubscribe al volver. */
const returnState = computed(() => {
  const value = route.query.aviso
  return value === 'confirmado' || value === 'baja' || value === 'invalido' ? value : null
})
const returnKey = computed(() =>
  returnState.value === 'confirmado'
    ? 'confirmed'
    : returnState.value === 'baja'
      ? 'unsubscribed'
      : 'invalid'
)

onMounted(() => {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'sent' && !returnState.value) state.value = 'already'
  } catch {
    // Sin almacenamiento: se ofrece el formulario, el servidor no duplica.
  }
})

async function submit() {
  if (state.value === 'sending' || state.value === 'sent') return
  if (!email.value.trim()) {
    state.value = 'error'
    return
  }
  state.value = 'sending'
  track('topic_subscribe_submit', { topic: props.topic })
  try {
    await $fetch('/api/topics/subscribe', {
      method: 'POST',
      body: {
        email: email.value,
        topic: props.topic,
        locale: locale.value,
        website: website.value,
      },
    })
    state.value = 'sent'
    track('topic_subscribe', { topic: props.topic })
    try {
      localStorage.setItem(STORAGE_KEY, 'sent')
    } catch {
      // nada que hacer
    }
    emit('subscribed')
  } catch {
    state.value = 'error'
  }
}
</script>

<style scoped>
.topic-subscribe__title {
  margin: 0 0 4px;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.4;
}
.topic-subscribe__lead {
  margin: 0 0 12px;
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.topic-subscribe__form {
  position: relative;
  display: flex;
  gap: 8px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.topic-subscribe__form :deep(.v-input) {
  flex: 1 1 220px;
}
.topic-subscribe__submit {
  min-height: 48px;
}
.topic-subscribe__hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}
.topic-subscribe__privacy {
  margin: 8px 0 0;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.68);
}
</style>
