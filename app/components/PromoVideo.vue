<template>
  <div ref="wrap" class="promo-video">
    <video
      ref="vid"
      class="promo-video__el"
      :poster="poster"
      muted
      loop
      playsinline
      preload="none"
      :aria-label="label"
      @click="toggleMute"
    >
      <source :src="src" type="video/mp4" />
    </video>

    <button
      type="button"
      class="promo-video__mute"
      :aria-label="muted ? t('a11y.unmute') : t('a11y.mute')"
      :title="muted ? t('a11y.unmute') : t('a11y.mute')"
      @click.stop="toggleMute"
    >
      <VIcon size="20">{{ muted ? 'mdi-volume-off' : 'mdi-volume-high' }}</VIcon>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    src?: string
    poster?: string
    label?: string
  }>(),
  {
    src: '/videos/promo-cambio.mp4',
    poster: '/videos/promo-cambio.jpg',
    label: 'Cambio Uruguay',
  }
)

const { t } = useI18n()
const track = useTrack()

const wrap = ref<HTMLElement>()
const vid = ref<HTMLVideoElement>()
const muted = ref(true)
let io: IntersectionObserver | null = null

onMounted(() => {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  // Lazy + polite: only load/play the clip while it is on screen (preload=none
  // means no bytes are fetched until then), and pause when scrolled away.
  io = new IntersectionObserver(
    ([entry]) => {
      const el = vid.value
      if (!el) return
      if (entry.isIntersecting && !reduce) el.play().catch(() => {})
      else el.pause()
    },
    { threshold: 0.4 }
  )
  if (wrap.value) io.observe(wrap.value)
})

onBeforeUnmount(() => io?.disconnect())

function toggleMute() {
  const el = vid.value
  if (!el) return
  el.muted = !el.muted
  muted.value = el.muted
  if (!el.muted) {
    el.play().catch(() => {})
    // Unmuting is a strong interest signal (GA4).
    track('promo_unmute', {})
  }
}
</script>

<style scoped>
.promo-video {
  position: relative;
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 30px 80px -34px rgba(0, 0, 0, 0.75);
  aspect-ratio: 16 / 9;
  background: #0a0e1a;
}

.v-theme--light .promo-video {
  border-color: rgba(15, 23, 42, 0.12);
  box-shadow: 0 24px 60px -34px rgba(15, 23, 42, 0.35);
}

.promo-video__el {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.promo-video__mute {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  color: #fff;
  background: rgba(10, 14, 26, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(6px);
  transition: background 0.15s ease;
}

.promo-video__mute:hover {
  background: rgba(10, 14, 26, 0.85);
}

.promo-video__mute:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
}
</style>
