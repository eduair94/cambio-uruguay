<script setup lang="ts">
import type { CSSProperties } from 'vue'

// A shared selection has its own preview. Currency-specific claims in Cambio's
// footer do not describe a saved car comparison, rental search or article.
const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    label?: string
    shortPath?: string
    locale?: 'es' | 'en' | 'pt'
  }>(),
  { description: '', label: '', shortPath: '', locale: 'es' }
)
const labels = {
  es: { label: 'Página compartida', open: 'Abrí la selección completa' },
  en: { label: 'Shared page', open: 'Open the full selection' },
  pt: { label: 'Página compartilhada', open: 'Abra a seleção completa' },
}[props.locale]
const title = props.title.slice(0, 160)
const description = props.description.slice(0, 240)
const titleSize = title.length > 100 ? 46 : title.length > 65 ? 54 : 64
const root: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '1200px',
  height: '630px',
  padding: '48px 64px',
  backgroundColor: '#101a30',
  color: '#ffffff',
  fontFamily: 'Open Sans',
  overflow: 'hidden',
}
const row: CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'center' }
const labelStyle: CSSProperties = { fontSize: '24px', fontWeight: 600, color: '#90caf9' }
const spacer: CSSProperties = { display: 'flex', flexGrow: 1 }
const brandStyle: CSSProperties = { fontSize: '24px', fontWeight: 800, color: '#ffffff' }
const body: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  flexGrow: 1,
  padding: '24px 0',
}
const heading: CSSProperties = {
  display: 'flex',
  fontFamily: 'Sora',
  fontSize: `${titleSize}px`,
  fontWeight: 700,
  lineHeight: 1.15,
  letterSpacing: '-0.02em',
}
const summary: CSSProperties = {
  display: 'flex',
  marginTop: '22px',
  fontSize: '27px',
  lineHeight: 1.4,
  color: '#d1dbe9',
}
const footer: CSSProperties = {
  ...row,
  paddingTop: '24px',
  borderTop: '1px solid #34445d',
  fontSize: '23px',
  color: '#d1dbe9',
}
const action: CSSProperties = {
  display: 'flex',
  padding: '13px 22px',
  borderRadius: '8px',
  backgroundColor: '#1976d2',
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: 600,
}
</script>

<template>
  <div class="flex-col" :style="root">
    <div class="flex-row" :style="row">
      <div :style="labelStyle">{{ label || labels.label }}</div>
      <div :style="spacer" />
      <div :style="brandStyle">Cambio Uruguay</div>
    </div>
    <div class="flex-col" :style="body">
      <div :style="heading">{{ title }}</div>
      <div v-if="description" :style="summary">{{ description }}</div>
    </div>
    <div class="flex-row" :style="footer">
      <div>cambio-uruguay.com{{ shortPath }}</div>
      <div :style="spacer" />
      <div :style="action">{{ labels.open }}</div>
    </div>
  </div>
</template>
