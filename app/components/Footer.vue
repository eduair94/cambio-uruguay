<template>
  <VFooter>
    <div class="d-flex footer_content flex-wrap ga-3">
      <div class="d-flex flex-column flex-md-row align-center ga-3 w-100">
        <!-- Copyright Section -->
        <div class="text-center text-md-left">
          <span>Cambio Uruguay &copy; {{ new Date().getFullYear() }}</span>
        </div>

        <VSpacer class="d-none d-md-flex" />

        <!-- API Documentation & Social Media Links.
             Native title (hover hint) + aria-label instead of VTooltip: avoids
             empty role=tooltip overlays that fail the aria-tooltip-name audit. -->
        <div class="d-flex align-center ga-2">
          <VBtn
            href="https://api.cambio-uruguay.com/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Documentación de la API"
            title="Documentación de la API"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-api</VIcon>
          </VBtn>

          <VDivider vertical class="mx-2" />

          <VBtn
            href="https://twitter.com/cambio_uruguay"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="$t('siguenos.twitter')"
            :title="$t('siguenos.twitter')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-twitter</VIcon>
          </VBtn>

          <VBtn
            href="https://www.linkedin.com/company/cambio-uruguay/"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="$t('siguenos.linkedin')"
            :title="$t('siguenos.linkedin')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-linkedin</VIcon>
          </VBtn>

          <VBtn
            href="https://ko-fi.com/cambio_uruguay"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="$t('siguenos.kofi')"
            :title="$t('siguenos.kofi')"
            icon
            size="small"
            variant="text"
            color="white"
          >
            <VIcon>mdi-heart</VIcon>
          </VBtn>
        </div>

        <VSpacer class="d-none d-md-flex" />

        <!-- Site links: editorial guides + methodology/about (internal SEO) -->
        <nav class="d-flex align-center ga-3 footer-links">
          <NuxtLink :to="localePath('/guias')" class="footer-link text-caption">
            {{ $t('guias.nav') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/acerca')" class="footer-link text-caption">
            {{ $t('acerca.nav') }}
          </NuxtLink>
        </nav>

        <VSpacer class="d-none d-md-flex" />

        <!-- Credits Section -->
        <div class="text-center text-md-right">
          <span class="text-caption">
            {{ $t('hechoConAmor') }}
            <VIcon color="red" size="small">mdi-heart</VIcon>
            {{ $t('porText') }}
            <a
              class="white--text text-decoration-none"
              href="https://www.linkedin.com/in/eduardo-airaudo/"
              target="_blank"
              rel="noopener noreferrer"
              >Eduardo Airaudo</a
            >
            {{ $t('yText') }}
            <a
              class="white--text text-decoration-none"
              href="https://www.linkedin.com/in/reginascagliotti/"
              target="_blank"
              rel="noopener noreferrer"
              >Regina Scagliotti</a
            >
          </span>
        </div>
      </div>
    </div>
  </VFooter>
</template>

<script setup lang="ts">
const localePath = useLocalePath()
</script>

<style lang="scss" scoped>
.footer_content {
  width: 100%;
  align-items: center;
  padding: 16px;
}

.footer-link {
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: #fff;
    text-decoration: underline;
  }
}
</style>
