<template>
  <VFooter>
    <div class="d-flex footer_content flex-wrap ga-3">
      <div class="d-flex flex-column flex-md-row align-center ga-3 w-100">
        <!-- Copyright Section -->
        <div class="text-center text-md-left">
          <span>Cambio Uruguay &copy; {{ new Date().getFullYear() }}</span>
        </div>

        <VSpacer class="d-none d-md-flex" />

        <!-- Social Media Links -->
        <div class="d-flex align-center ga-2">
          <VTooltip :text="$t('siguenos.twitter')">
            <template #activator="{ props }">
              <VBtn
                v-bind="props"
                href="https://twitter.com/cambio_uruguay"
                target="_blank"
                rel="noopener noreferrer"
                icon
                size="small"
                variant="text"
                color="white"
              >
                <VIcon>mdi-twitter</VIcon>
              </VBtn>
            </template>
          </VTooltip>

          <VTooltip :text="$t('siguenos.linkedin')">
            <template #activator="{ props }">
              <VBtn
                v-bind="props"
                href="https://www.linkedin.com/company/cambio-uruguay/"
                target="_blank"
                rel="noopener noreferrer"
                icon
                size="small"
                variant="text"
                color="white"
              >
                <VIcon>mdi-linkedin</VIcon>
              </VBtn>
            </template>
          </VTooltip>

          <VTooltip :text="$t('siguenos.kofi')">
            <template #activator="{ props }">
              <VBtn
                v-bind="props"
                href="https://ko-fi.com/cambio_uruguay"
                target="_blank"
                rel="noopener noreferrer"
                icon
                size="small"
                variant="text"
                color="white"
              >
                <VIcon>mdi-heart</VIcon>
              </VBtn>
            </template>
          </VTooltip>
        </div>

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

<style lang="scss" scoped>
.footer_content {
  width: 100%;
  align-items: center;
  padding: 16px;
}
</style>
