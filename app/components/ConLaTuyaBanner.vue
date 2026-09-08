<!--
  THESIS: Invite readers to explore state spending after completing their rate lookup.
  OWN-WORLD: The host's navy, blue and Open Sans; the name carries the visual identity.
  STORY: One question, an explicit external destination, one action.
  FIRST VIEWPORT: Compact horizontal band; on phones, copy precedes a full-width link.
  FORM: Local extension of the homepage, in document flow, with no timed or floating UI.
-->
<template>
  <aside ref="banner" class="conlatuya-banner on-dark" :aria-label="$t('ads.label')">
    <div class="conlatuya-banner__identity">
      <span class="conlatuya-banner__label">{{ $t('ads.label') }}</span>
      <span class="conlatuya-banner__brand">{{ $t('conLaTuyaPromo.brand') }}</span>
    </div>

    <div class="conlatuya-banner__copy">
      <h2>{{ $t('conLaTuyaPromo.title') }}</h2>
      <p>{{ $t('conLaTuyaPromo.description') }}</p>
    </div>

    <div class="conlatuya-banner__action">
      <a
        href="https://conlatuya.checkleaked.cc/?utm_source=cambio-uruguay&utm_medium=banner&utm_campaign=conlatuya&utm_content=home-after-rates"
        target="_blank"
        rel="noopener noreferrer sponsored"
        class="conlatuya-banner__link"
        data-cta="conlatuya-home"
        :aria-label="$t('conLaTuyaPromo.ctaLabel')"
      >
        {{ $t('conLaTuyaPromo.cta') }}
        <VIcon size="18" aria-hidden="true">mdi-open-in-new</VIcon>
      </a>
      <span class="conlatuya-banner__destination">conlatuya.checkleaked.cc</span>
      <span class="conlatuya-banner__external">{{ $t('conLaTuyaPromo.external') }}</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
const banner = ref<HTMLElement | null>(null)
const route = useRoute()
const track = useTrack()
let observer: IntersectionObserver | undefined

onMounted(() => {
  if (!banner.value || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    entries => {
      if (!entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return
      observer?.disconnect()
      track('conlatuya_promo_view', {
        content_path: route.path,
        promo_placement: 'home-after-rates',
      })
    },
    { threshold: 0.5 }
  )
  observer.observe(banner.value)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<style scoped>
.conlatuya-banner {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border-radius: 12px;
  background: #121a2e;
  color: #fff;
}

.conlatuya-banner__identity {
  flex: 0 0 150px;
  min-width: 0;
}

.conlatuya-banner__label {
  display: block;
  margin-bottom: 8px;
  color: #b3bdcc;
  font-size: 0.75rem;
  line-height: 1.4;
}

.conlatuya-banner__brand {
  display: block;
  max-width: 6ch;
  font-size: 1.75rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.conlatuya-banner__copy {
  flex: 1 1 auto;
  min-width: 0;
}

.conlatuya-banner__copy h2 {
  margin: 0;
  color: inherit;
  font-size: clamp(1.25rem, 2vw, 1.5rem);
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

.conlatuya-banner__copy p {
  margin: 8px 0 0;
  max-width: 65ch;
  color: #b3bdcc;
  font-size: 0.95rem;
  line-height: 1.5;
}

.conlatuya-banner__action {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  min-width: 0;
}

.conlatuya-banner__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 20px;
  border-radius: 4px;
  background: #1976d2;
  color: #fff;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  text-decoration: none;
}

.conlatuya-banner__link:hover {
  background: #1565c0;
}

.conlatuya-banner__link:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 4px;
}

.conlatuya-banner__destination,
.conlatuya-banner__external {
  color: #b3bdcc;
  font-size: 0.75rem;
  line-height: 1.4;
  text-align: center;
  overflow-wrap: anywhere;
}

.conlatuya-banner__destination {
  margin-top: 8px;
}

.conlatuya-banner__external {
  margin-top: 4px;
}

@media (max-width: 959.98px) {
  .conlatuya-banner {
    flex-wrap: wrap;
    gap: 16px 24px;
  }

  .conlatuya-banner__identity {
    display: flex;
    flex-basis: 100%;
    align-items: baseline;
    justify-content: space-between;
    gap: 16px;
  }

  .conlatuya-banner__brand {
    max-width: none;
    font-size: 1.25rem;
  }

  .conlatuya-banner__label {
    margin-bottom: 0;
  }

  .conlatuya-banner__copy {
    flex-basis: 300px;
  }
}

@media (max-width: 599.98px) {
  .conlatuya-banner {
    padding: 20px;
  }

  .conlatuya-banner__action,
  .conlatuya-banner__link {
    width: 100%;
  }
}

@media print {
  .conlatuya-banner {
    display: none;
  }
}
</style>
