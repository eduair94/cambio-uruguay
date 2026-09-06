<template>
  <div
    v-if="installer?.available.value || installer?.busy.value || help || failed"
    class="pwa-install-action"
  >
    <VBtn
      v-if="installer?.available.value || installer?.busy.value"
      variant="text"
      prepend-icon="mdi-cellphone-arrow-down"
      :loading="installer?.busy.value"
      data-testid="pwa-install-action"
      :aria-expanded="help"
      :aria-controls="help ? helpId : undefined"
      @click="install"
      >{{ t('action') }}</VBtn
    >
    <p v-if="help" :id="helpId" role="status">{{ t('ios') }}</p>
    <p v-if="failed" role="status">{{ t('failed') }}</p>
  </div>
</template>

<script setup lang="ts">
const installer = useNuxtApp().$pwaInstall
const help = ref(false)
const failed = ref(false)
const helpId = useId()
const { t } = useI18n({
  useScope: 'local',
  messages: {
    es: {
      action: 'Instalar en este dispositivo',
      ios: 'En Safari, abrí Compartir y elegí “Agregar a pantalla de inicio”. Después, abrí Cambio Uruguay desde ese acceso. También podés seguir usando la web sin instalarla.',
      failed:
        'No se pudo abrir la instalación. Podés usar la opción de instalar o agregar a la pantalla de inicio del menú del navegador.',
    },
    en: {
      action: 'Install on this device',
      ios: 'In Safari, open Share and choose “Add to Home Screen”. Then open Cambio Uruguay from that shortcut. You can also keep using the website without installing it.',
      failed:
        'Installation could not be opened. You can use the install or add to Home Screen option in your browser menu.',
    },
    pt: {
      action: 'Instalar neste dispositivo',
      ios: 'No Safari, abra Compartilhar e escolha “Adicionar à Tela de Início”. Depois, abra o Cambio Uruguay por esse atalho. Você também pode continuar usando o site sem instalar.',
      failed:
        'Não foi possível abrir a instalação. Use a opção de instalar ou adicionar à tela de início no menu do navegador.',
    },
  },
})
async function install() {
  failed.value = false
  try {
    const result = await installer?.install()
    help.value = result === 'instructions'
  } catch {
    failed.value = true
  }
}
</script>

<style scoped>
.pwa-install-action {
  max-width: 38rem;
}
.pwa-install-action :deep(.v-btn) {
  min-height: 44px;
  max-width: 100%;
  height: auto;
  white-space: normal;
  text-align: start;
}
.pwa-install-action :deep(.v-btn__content) {
  white-space: normal;
}
.pwa-install-action p {
  margin: 8px 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
