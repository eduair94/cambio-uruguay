<script setup lang="ts">
import type { CSSProperties } from 'vue'

// OG image template (1200x630) rendered server-side by nuxt-og-image via satori.
// Satori supports a CSS subset: flexbox only, gradients, border, border-radius,
// opacity, box-shadow. No grid, no backdrop-filter, no JS/motion.
// Styles are defined as typed objects here (not inline) to keep the template
// clean and avoid attribute-quoting issues with font names.
type OgLocale = 'es' | 'en' | 'pt'

const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    tag?: string
    rateBuy?: number | null
    rateSell?: number | null
    locale?: OgLocale
  }>(),
  {
    title: '',
    subtitle: '',
    tag: '',
    rateBuy: null,
    rateSell: null,
    locale: 'es',
  }
)

// Satori renders server-side without i18n, so the card's chrome is localized
// from this static map (es/en/pt). `title`/`subtitle` come pre-translated from
// the page; when omitted we fall back to the localized defaults below.
const OG_LABELS: Record<OgLocale, {
  title: string
  subtitle: string
  rateLabel: string
  buyWord: string
  footerHouses: string
  footerUpdated: string
}> = {
  es: {
    title: 'Cotización del Dólar en Uruguay Hoy',
    subtitle: 'Compará +40 casas de cambio en tiempo real',
    rateLabel: 'DÓLAR USD',
    buyWord: 'compra',
    footerHouses: '+40 casas de cambio',
    footerUpdated: 'actualizado cada 10 min',
  },
  en: {
    title: "Uruguay's Dollar Exchange Rate Today",
    subtitle: 'Compare 40+ exchange houses in real time',
    rateLabel: 'USD DOLLAR',
    buyWord: 'buy',
    footerHouses: '40+ exchange houses',
    footerUpdated: 'updated every 10 min',
  },
  pt: {
    title: 'Cotação do Dólar no Uruguai Hoje',
    subtitle: 'Compare +40 casas de câmbio em tempo real',
    rateLabel: 'DÓLAR USD',
    buyWord: 'compra',
    footerHouses: '+40 casas de câmbio',
    footerUpdated: 'atualizado a cada 10 min',
  },
}

const labels = OG_LABELS[props.locale] ?? OG_LABELS.es
const titleText = props.title || labels.title
const subtitleText = props.subtitle || labels.subtitle

const fmt = (n: number): string =>
  new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const root: CSSProperties = {
  width: '1200px',
  height: '630px',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  padding: '64px 72px',
  backgroundColor: '#0d0f14',
  backgroundImage: 'linear-gradient(135deg, #0d0f14 0%, #15181f 55%, #0d0f14 100%)',
  fontFamily: 'Open Sans',
  overflow: 'hidden',
}
const glowGreen: CSSProperties = {
  position: 'absolute',
  top: '-220px',
  left: '-160px',
  width: '620px',
  height: '620px',
  borderRadius: '50%',
  backgroundImage: 'radial-gradient(circle, rgba(22,199,132,0.30) 0%, rgba(22,199,132,0) 70%)',
  display: 'flex',
}
const glowBlue: CSSProperties = {
  position: 'absolute',
  bottom: '-260px',
  right: '-180px',
  width: '640px',
  height: '640px',
  borderRadius: '50%',
  backgroundImage: 'radial-gradient(circle, rgba(47,129,247,0.22) 0%, rgba(47,129,247,0) 70%)',
  display: 'flex',
}
const accentBar: CSSProperties = {
  position: 'absolute',
  top: '0',
  left: '0',
  width: '1200px',
  height: '8px',
  backgroundImage: 'linear-gradient(90deg, #16c784 0%, #2f81f7 100%)',
  display: 'flex',
}
const header: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}
const brand: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  marginRight: 'auto',
  fontSize: '34px',
  fontWeight: 800,
  letterSpacing: '2px',
  color: '#ffffff',
}
const dollarMark: CSSProperties = { color: '#16c784', margin: '0 14px', fontSize: '40px' }
const tagChip: CSSProperties = {
  display: 'flex',
  padding: '10px 22px',
  borderRadius: '999px',
  border: '1px solid rgba(22,199,132,0.5)',
  backgroundColor: 'rgba(22,199,132,0.12)',
  color: '#16c784',
  fontSize: '22px',
  fontWeight: 700,
  letterSpacing: '2px',
}
const main: CSSProperties = {
  display: 'flex',
  flex: '1',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: '24px',
}
const titleStyle: CSSProperties = {
  display: 'flex',
  fontFamily: 'Sora',
  fontWeight: 800,
  fontSize: '56px',
  lineHeight: 1.08,
  color: '#ffffff',
}
const subtitleStyle: CSSProperties = {
  display: 'flex',
  marginTop: '22px',
  fontSize: '30px',
  color: '#9aa4b2',
}
const rateCard: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: '300px',
  padding: '26px 22px',
  marginLeft: '40px',
  borderRadius: '24px',
  border: '1px solid rgba(22,199,132,0.45)',
  backgroundColor: 'rgba(255,255,255,0.04)',
  boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
}
const rateLabel: CSSProperties = {
  display: 'flex',
  fontSize: '26px',
  color: '#9aa4b2',
  fontWeight: 700,
  letterSpacing: '3px',
}
const rateValue: CSSProperties = {
  display: 'flex',
  fontFamily: 'Sora',
  fontWeight: 800,
  fontSize: '74px',
  color: '#16c784',
  lineHeight: 1.1,
}
const rateBuyStyle: CSSProperties = { display: 'flex', fontSize: '24px', color: '#cdd5df' }
const bigDollar: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Sora',
  fontWeight: 800,
  fontSize: '300px',
  color: 'rgba(22,199,132,0.14)',
  marginLeft: '20px',
}
const footer: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '24px',
  color: '#7b8694',
}
const footerBrand: CSSProperties = { color: '#ffffff', fontWeight: 700 }
const dot: CSSProperties = { margin: '0 16px' }
const titleCol = (hasRate: boolean): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  maxWidth: hasRate ? '640px' : '900px',
})
</script>

<template>
  <div :style="root">
    <div :style="glowGreen" />
    <div :style="glowBlue" />
    <div :style="accentBar" />

    <div :style="header">
      <div :style="brand">
        <span>CAMBIO</span>
        <span :style="dollarMark">$</span>
        <span>URUGUAY</span>
      </div>
      <div v-if="tag" :style="tagChip">{{ tag }}</div>
    </div>

    <div :style="main">
      <div :style="titleCol(!!props.rateSell)">
        <div :style="titleStyle">{{ titleText }}</div>
        <div :style="subtitleStyle">{{ subtitleText }}</div>
      </div>

      <div v-if="props.rateSell" :style="rateCard">
        <div :style="rateLabel">{{ labels.rateLabel }}</div>
        <div :style="rateValue">${{ fmt(props.rateSell) }}</div>
        <div v-if="props.rateBuy" :style="rateBuyStyle">{{ labels.buyWord }} ${{ fmt(props.rateBuy) }}</div>
      </div>
      <div v-else :style="bigDollar">$</div>
    </div>

    <div :style="footer">
      <span :style="footerBrand">cambio-uruguay.com</span>
      <span :style="dot">•</span>
      <span>{{ labels.footerHouses }}</span>
      <span :style="dot">•</span>
      <span>{{ labels.footerUpdated }}</span>
    </div>
  </div>
</template>
