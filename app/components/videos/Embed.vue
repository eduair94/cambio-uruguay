<!--
  A YouTube player that costs nothing until somebody presses play.

  Three reasons this is a facade and not an <iframe> per card:
    - weight: a real YouTube embed pulls ~1 MB of script per player. A page listing 24 of them
      would never pass Core Web Vitals, and this site's whole SEO position rests on those.
    - privacy: the embed sets third-party cookies on load. Rendering it only after a click means a
      visitor who never plays a video is never handed to YouTube, which is also what keeps this
      page consistent with the site's consent banner.
    - layout: the thumbnail reserves the exact 16/9 box the player will occupy, so pressing play
      shifts nothing (CLS 0).

  The iframe uses youtube-nocookie.com, YouTube's own reduced-tracking host. `autoplay=1` is
  correct here and is not autoplay in the bad sense: it only ever runs in response to a click.
-->
<template>
  <div class="yt" :class="{ 'yt--playing': playing }">
    <iframe
      v-if="playing"
      class="yt__frame"
      :src="`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`"
      :title="title"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    />

    <button
      v-else
      type="button"
      class="yt__facade"
      :aria-label="`Reproducir: ${title}`"
      @click="play"
    >
      <img
        class="yt__thumb"
        :src="thumbnail"
        :alt="''"
        width="480"
        height="360"
        loading="lazy"
        decoding="async"
      />
      <span class="yt__play" aria-hidden="true">
        <svg viewBox="0 0 68 48" width="68" height="48" focusable="false">
          <path
            class="yt__play-bg"
            d="M66.5 7.7a8.6 8.6 0 0 0-6-6C55.2 0 34 0 34 0S12.8 0 7.5 1.7a8.6 8.6 0 0 0-6 6A90 90 0 0 0 0 24a90 90 0 0 0 1.5 16.3 8.6 8.6 0 0 0 6 6C12.8 48 34 48 34 48s21.2 0 26.5-1.7a8.6 8.6 0 0 0 6-6A90 90 0 0 0 68 24a90 90 0 0 0-1.5-16.3z"
          />
          <path d="M45 24 27 14v20z" fill="#fff" />
        </svg>
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  videoId: string
  title: string
  thumbnail: string
}>()

const playing = ref(false)
const track = useTrack()

function play() {
  playing.value = true
  // Pressing play is the only conversion this page has, so it is the one thing worth measuring.
  track('video_play', { video_id: props.videoId })
}
</script>

<style scoped>
.yt {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #0a0e1a;
}

.yt__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
}

.yt__facade {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  cursor: pointer;
  background: #0a0e1a;
}

.yt__thumb {
  display: block;
  width: 100%;
  height: 100%;
  /* hqdefault is 4:3 with letterbox bars. Cropping to the 16/9 box removes them and is the only
     thumbnail size YouTube guarantees exists for every video — maxresdefault 404s on plenty. */
  object-fit: cover;
  transition: transform 0.25s ease;
}

.yt__facade:hover .yt__thumb,
.yt__facade:focus-visible .yt__thumb {
  transform: scale(1.03);
}

.yt__facade:focus-visible {
  outline: 3px solid rgb(var(--v-theme-primary));
  outline-offset: -3px;
}

.yt__play {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.yt__play-bg {
  fill: rgba(20, 20, 20, 0.72);
  transition: fill 0.2s ease;
}

.yt__facade:hover .yt__play-bg,
.yt__facade:focus-visible .yt__play-bg {
  fill: #f00;
}

@media (prefers-reduced-motion: reduce) {
  .yt__thumb {
    transition: none;
  }

  .yt__facade:hover .yt__thumb,
  .yt__facade:focus-visible .yt__thumb {
    transform: none;
  }
}
</style>
