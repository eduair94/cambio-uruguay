<template>
  <!-- What a card shows when the advert has no photo, or its photo no longer loads: a line drawing of
       what it is, in the surface's own ink, never a grey box or a broken-image icon. -->
  <svg
    class="art"
    viewBox="0 0 160 120"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
    focusable="false"
  >
    <g
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <template v-if="vertical === 'alquiler' || vertical === 'oportunidad'">
        <path d="M40 92V58L80 30l40 28v34" />
        <path d="M30 64L80 26l50 38" />
        <rect x="70" y="68" width="20" height="24" rx="2" />
        <rect x="50" y="62" width="12" height="12" rx="1.5" />
        <rect x="98" y="62" width="12" height="12" rx="1.5" />
        <path d="M24 92h112" />
        <template v-if="vertical === 'oportunidad'">
          <path d="M112 30l14-2 6 6-12 12-8-8z" />
          <circle cx="122" cy="34" r="1.6" />
        </template>
        <template v-else>
          <path d="M136 92V76" />
          <circle cx="136" cy="68" r="9" />
        </template>
      </template>
      <template v-else-if="vertical === 'auto'">
        <path
          d="M22 82V70c0-4 2-6 6-7l14-3 14-14c3-3 6-4 10-4h28c4 0 7 1 10 4l14 14 12 3c4 1 6 3 6 7v12"
        />
        <path d="M56 60l10-10h34l10 10" />
        <path d="M83 50v10" />
        <circle cx="50" cy="84" r="10" />
        <circle cx="114" cy="84" r="10" />
        <path d="M60 84h44" />
        <path d="M22 82h18M124 82h14" />
      </template>
      <template v-else>
        <path d="M42 46l38-16 38 16v44l-38 16-38-16z" />
        <path d="M42 46l38 16 38-16" />
        <path d="M80 62v44" />
        <path d="M61 38l38 16v12" />
      </template>
    </g>
  </svg>
</template>

<script setup lang="ts">
import type { CardVertical } from '~/utils/chatResults'

defineProps<{ vertical: CardVertical }>()
</script>

<style scoped>
.art {
  width: 56%;
  height: auto;
  color: rgba(var(--v-theme-on-surface), 0.28);
}
</style>
