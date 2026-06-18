<template>
  <VCard variant="outlined" class="pa-4">
    <div class="d-flex align-center ga-2 mb-2">
      <VIcon color="primary">mdi-robot-happy</VIcon>
      <span class="text-h6 font-weight-bold">{{ t('acerca.mcpTitle') }}</span>
    </div>
    <p class="text-body-2 mb-3">{{ t('acerca.mcpText') }}</p>
    <div class="d-flex flex-wrap ga-2 mb-3">
      <VBtn
        href="https://www.npmjs.com/package/cambio-uruguay-mcp"
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-npm"
      >
        {{ t('acerca.mcpNpm') }}
      </VBtn>
      <VBtn
        href="https://github.com/eduair94/cambio-uruguay/tree/main/mcp"
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        variant="tonal"
        prepend-icon="mdi-github"
      >
        {{ t('acerca.mcpSource') }}
      </VBtn>
    </div>
    <VTextarea
      :model-value="mcpConfig"
      readonly
      variant="solo-filled"
      rows="5"
      auto-grow
      hide-details
      class="mb-2"
      :aria-label="t('acerca.mcpTitle')"
    />
    <VBtn
      size="small"
      variant="text"
      :prepend-icon="copied ? 'mdi-check' : 'mdi-content-copy'"
      @click="copy"
    >
      {{ copied ? t('acerca.embedCopied') : t('acerca.embedCopy') }}
    </VBtn>
  </VCard>
</template>

<script setup lang="ts">
const { t } = useI18n()

// MCP client config for AI assistants (Claude Desktop, Cursor, …). Points at the
// hosted Streamable-HTTP endpoint; the package is also on npm (cambio-uruguay-mcp).
const mcpConfig = JSON.stringify(
  { mcpServers: { 'cambio-uruguay': { url: 'https://mcp.cambio-uruguay.com/mcp' } } },
  null,
  2
)

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
const copy = async () => {
  try {
    await navigator.clipboard.writeText(mcpConfig)
    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => (copied.value = false), 2000)
  } catch {
    // Clipboard unavailable; the textarea stays selectable for manual copy.
  }
}
onBeforeUnmount(() => timer && clearTimeout(timer))
</script>
