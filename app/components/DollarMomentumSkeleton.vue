<template>
  <VCard class="dollar-momentum pa-4" variant="flat">
    <div class="d-flex align-center justify-space-between mb-2">
      <span class="text-overline text-grey">{{ $t('dolarHoy.today') }}</span>
      <NuxtLink :to="localePath('/dolar-hoy')" class="see-more text-caption">
        {{ $t('dolarHoy.seeMore') }} →
      </NuxtLink>
    </div>

    <slot>
      <!-- Loading skeleton mirrors the loaded row's structure + widths so the card
           keeps the exact same height when live data arrives (no layout shift). -->
      <div class="d-flex align-center ga-4 flex-wrap" aria-hidden="true">
        <div class="dm-col">
          <div class="dm-skel dm-skel-caption" />
          <div class="dm-skel dm-skel-value" />
        </div>
        <div class="dm-skel dm-skel-chip" />
        <div class="spark-wrap flex-grow-1">
          <div class="dm-skel dm-skel-spark" />
        </div>
      </div>
    </slot>
  </VCard>
</template>

<script setup lang="ts">
// The DollarMomentum card shell. Alone it is the loading state (the placeholder bars), and the
// home renders it as the <ClientOnly> fallback, so the server HTML already reserves the card:
// before, the card appeared after hydration and pushed the converter down. DollarMomentum
// renders this same shell and passes its loaded row as the default slot.
const localePath = useLocalePath()
</script>

<style scoped>
.dollar-momentum {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}
.see-more {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
  font-weight: 600;
  position: relative;
}
/* The link is 20 px tall: a 44x44 hit area centred on it, without changing its box or the row's
   layout (the pseudo-element is out of flow). */
.see-more::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: max(100%, 44px);
  height: max(100%, 44px);
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
.spark-wrap {
  min-width: 120px;
  max-width: 240px;
}

/* Skeleton bars sized to mirror the loaded row so there is no layout shift when
   live data swaps in. Theme-aware tint (on-surface) works in light + dark. */
.dm-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.dm-skel {
  background: rgba(var(--v-theme-on-surface), 0.09);
  border-radius: 8px;
  animation: dm-pulse 1.4s ease-in-out infinite;
}
.dm-skel-caption {
  width: 88px;
  height: 16px;
}
.dm-skel-value {
  /* caption 16 + gap 4 + value 32 = 52px = the loaded left column, so the row
     (and card) height is identical in both states. */
  width: 150px;
  height: 32px;
}
.dm-skel-chip {
  width: 116px;
  height: 26px;
  border-radius: 13px;
}
.dm-skel-spark {
  width: 100%;
  height: 28px;
}
@keyframes dm-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
@media (prefers-reduced-motion: reduce) {
  .dm-skel {
    animation: none;
  }
}
</style>
