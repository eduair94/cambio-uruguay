<script setup lang="ts">
import type { CSSProperties } from 'vue'

// OG image template (1200x630) rendered server-side by nuxt-og-image via satori.
// Satori supports a CSS subset: flexbox only, gradients, border, border-radius,
// opacity, box-shadow. No grid, no backdrop-filter, no JS/motion.
//
// Two layout constraints this file depends on, both learned the hard way:
//  - nuxt-og-image's `flex` satori transformer rewrites any <div> holding
//    <div> children to `flex-direction: column` and overrides the inline
//    style — UNLESS the element carries a class containing `flex-`. Hence the
//    `flex-row` / `flex-col` markers below. They style nothing (satori has no
//    stylesheet here); dropping one silently collapses that row into a stack.
//  - the same transformer injects `flex-wrap: wrap` + a `0.2em` gap into
//    class-less containers, so spacing is pushed with an explicit spacer div
//    rather than an `auto` margin.
// Styles are defined as typed objects here (not inline) to keep the template
// clean and avoid attribute-quoting issues with font names.
//
// Two compositions come out of one component:
//  - board variant (a rate was passed): the card becomes a market board with
//    Compra and Venta as an equal pair, the way /pizarra and the embed widget
//    already show them.
//  - editorial variant (no rate): the title takes the space at display size.
// Only the fonts registered in nuxt.config `ogImage.fonts` exist here — Open
// Sans 400/600/800 and Sora 700/800. Any other weight is silently substituted
// by satori, so the ramp below stays inside that set.
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
// buyNote/sellNote reuse the site's own wording for the pair ("Mejor compra
// (te pagan)" / "Mejor venta (pagás)") so someone meeting the preview cold can
// tell which side of the trade each number belongs to.
const OG_LABELS: Record<
  OgLocale,
  {
    title: string
    subtitle: string
    market: string
    marketNote: string
    buy: string
    sell: string
    buyNote: string
    sellNote: string
    footerHouses: string
    footerUpdated: string
  }
> = {
  es: {
    title: 'Cotización del Dólar en Uruguay Hoy',
    subtitle: 'Compará +40 casas de cambio en tiempo real',
    market: 'Dólar USD',
    marketNote: 'mejor precio del mercado',
    buy: 'Compra',
    sell: 'Venta',
    buyNote: 'te pagan',
    sellNote: 'pagás',
    footerHouses: '+40 casas de cambio',
    footerUpdated: 'actualizado cada 10 min',
  },
  en: {
    title: "Uruguay's Dollar Exchange Rate Today",
    subtitle: 'Compare 40+ exchange houses in real time',
    market: 'USD Dollar',
    marketNote: 'best market price',
    buy: 'Buy',
    sell: 'Sell',
    buyNote: 'they pay you',
    sellNote: 'you pay',
    footerHouses: '40+ exchange houses',
    footerUpdated: 'updated every 10 min',
  },
  pt: {
    title: 'Cotação do Dólar no Uruguai Hoje',
    subtitle: 'Compare +40 casas de câmbio em tempo real',
    market: 'Dólar USD',
    marketNote: 'melhor preço do mercado',
    buy: 'Compra',
    sell: 'Venda',
    buyNote: 'te pagam',
    sellNote: 'você paga',
    footerHouses: '+40 casas de câmbio',
    footerUpdated: 'atualizado a cada 10 min',
  },
}

const NUMBER_LOCALE: Record<OgLocale, string> = {
  es: 'es-UY',
  en: 'en-US',
  pt: 'pt-BR',
}

const labels = OG_LABELS[props.locale] ?? OG_LABELS.es
const titleText = props.title || labels.title
const subtitleText = props.subtitle || labels.subtitle

const validRate = (n: number | null | undefined): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0

// One live side is enough to earn the board; the missing one renders an em dash
// instead of collapsing the pair into a single ambiguous number.
const hasBuy = validRate(props.rateBuy)
const hasSell = validRate(props.rateSell)
const hasBoard = hasBuy || hasSell

const fmt = (n: number | null | undefined): string =>
  validRate(n)
    ? new Intl.NumberFormat(NUMBER_LOCALE[props.locale] ?? 'es-UY', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n)
    : '—'

// Titles arrive from ~150 pages and their length is not ours to control, so the
// display step is picked from the string rather than fixed: a 90-character page
// title at hero size pushed the footer off the canvas.
const step = (len: number, ramp: [number, number, number, number]): number =>
  len <= 30 ? ramp[0] : len <= 52 ? ramp[1] : len <= 78 ? ramp[2] : ramp[3]

const titleSize = hasBoard
  ? step(titleText.length, [50, 42, 36, 30])
  : step(titleText.length, [82, 68, 56, 46])
const subtitleSize = hasBoard ? 26 : subtitleText.length > 90 ? 28 : 31

// The board owns ~245px of the 630. A long title plus a subtitle above it does
// not fit beside that, and satori has no line clamp — so the subtitle yields
// first, since the board already says what the page is about.
const showSubtitle = Boolean(subtitleText) && (!hasBoard || titleText.length <= 52)

const root: CSSProperties = {
  width: '1200px',
  height: '630px',
  display: 'flex',
  flexDirection: 'column',
  position: 'relative',
  padding: '50px 64px 46px',
  backgroundColor: '#0a0e1a',
  backgroundImage: 'linear-gradient(158deg, #101a30 0%, #0a0e1a 54%, #070a12 100%)',
  fontFamily: 'Open Sans',
  overflow: 'hidden',
}
const brandBar: CSSProperties = {
  position: 'absolute',
  top: '0',
  left: '0',
  width: '1200px',
  height: '6px',
  backgroundImage: 'linear-gradient(90deg, #00e676 0%, #1976d2 100%)',
  display: 'flex',
}
const spacer: CSSProperties = { display: 'flex', flexGrow: 1 }
const header: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  height: '44px',
}
const brand: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  fontSize: '29px',
  fontWeight: 800,
  letterSpacing: '2.6px',
  color: '#ffffff',
}
const dollarMark: CSSProperties = {
  display: 'flex',
  color: '#00e676',
  margin: '0 12px',
  fontSize: '33px',
  fontWeight: 800,
}
const tagChip: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  height: '40px',
  padding: '0 20px',
  borderRadius: '999px',
  border: '1px solid rgba(100,181,246,0.42)',
  backgroundColor: 'rgba(25,118,210,0.16)',
  color: '#64b5f6',
  fontSize: '20px',
  fontWeight: 600,
  letterSpacing: '2.2px',
  textTransform: 'uppercase',
}
const headRule: CSSProperties = {
  display: 'flex',
  width: '1072px',
  height: '1px',
  marginTop: '26px',
  backgroundColor: 'rgba(255,255,255,0.08)',
}
const titleCol: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  justifyContent: 'center',
  overflow: 'hidden',
}
const titleStyle: CSSProperties = {
  display: 'flex',
  fontFamily: 'Sora',
  fontWeight: 800,
  fontSize: `${titleSize}px`,
  lineHeight: 1.06,
  letterSpacing: '-0.02em',
  color: '#ffffff',
}
const subtitleStyle: CSSProperties = {
  display: 'flex',
  marginTop: '18px',
  fontSize: `${subtitleSize}px`,
  lineHeight: 1.3,
  color: '#b3bdcc',
}

// --- Board (Compra | Venta) ----------------------------------------------
// Both figures carry the same weight and the same ink: they are two sides of
// one trade, not a good and a bad number, and /pizarra renders them that way.
const board: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  marginTop: '28px',
  borderRadius: '22px',
  border: '1px solid rgba(255,255,255,0.09)',
  backgroundColor: '#121a2e',
  boxShadow: '0 24px 56px rgba(0,0,0,0.5)',
  overflow: 'hidden',
}
const boardHead: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  height: '56px',
  padding: '0 30px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  backgroundColor: 'rgba(255,255,255,0.025)',
}
const liveDot: CSSProperties = {
  display: 'flex',
  width: '11px',
  height: '11px',
  borderRadius: '999px',
  marginRight: '13px',
  backgroundColor: '#00e676',
}
const boardHeadText: CSSProperties = {
  display: 'flex',
  fontSize: '20px',
  fontWeight: 600,
  letterSpacing: '2.6px',
  textTransform: 'uppercase',
  color: '#ffffff',
}
const boardHeadNote: CSSProperties = {
  display: 'flex',
  fontSize: '20px',
  color: '#818da0',
}
const midDot: CSSProperties = { display: 'flex', padding: '0 11px', color: '#5b6678' }
const boardStamp: CSSProperties = {
  display: 'flex',
  fontSize: '19px',
  color: '#7d8aa3',
}
const boardBody: CSSProperties = { display: 'flex', flexDirection: 'row' }
const cell: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexGrow: 1,
  flexBasis: '0px',
  minWidth: '0px',
  padding: '22px 30px 24px',
}
const cellRule: CSSProperties = {
  display: 'flex',
  width: '1px',
  flexShrink: 0,
  backgroundColor: 'rgba(255,255,255,0.09)',
}
const labelRow: CSSProperties = { display: 'flex', flexDirection: 'row', alignItems: 'center' }
const cellLabel: CSSProperties = {
  display: 'flex',
  fontSize: '20px',
  fontWeight: 600,
  letterSpacing: '3.4px',
  textTransform: 'uppercase',
  color: '#64b5f6',
}
const cellNote: CSSProperties = {
  display: 'flex',
  fontSize: '20px',
  color: '#818da0',
}
const valueRow: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'flex-end',
  marginTop: '12px',
}
const currencySign: CSSProperties = {
  display: 'flex',
  fontFamily: 'Sora',
  fontWeight: 700,
  fontSize: '36px',
  color: '#7d8aa3',
  marginRight: '10px',
  paddingBottom: '8px',
}
// An absent side is a gap in the data, not a price: it drops the currency sign
// so "$ —" cannot read as a mangled number.
const valueMissing: CSSProperties = {
  display: 'flex',
  fontFamily: 'Sora',
  fontWeight: 700,
  fontSize: '46px',
  lineHeight: 1,
  color: '#5b6678',
  paddingBottom: '14px',
}
const valueNum: CSSProperties = {
  display: 'flex',
  fontFamily: 'Sora',
  fontWeight: 800,
  fontSize: '76px',
  lineHeight: 1,
  letterSpacing: '-0.015em',
  color: '#ffffff',
}

const footer: CSSProperties = {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: '30px',
  fontSize: '22px',
  color: '#7d8aa3',
}
const footerBrand: CSSProperties = { display: 'flex', color: '#ffffff', fontWeight: 600 }
</script>

<template>
  <div class="flex-col" :style="root">
    <div :style="brandBar" />

    <div class="flex-row" :style="header">
      <div class="flex-row" :style="brand">
        <span>CAMBIO</span>
        <span :style="dollarMark">$</span>
        <span>URUGUAY</span>
      </div>
      <div :style="spacer" />
      <div v-if="tag" :style="tagChip">{{ tag }}</div>
    </div>
    <div :style="headRule" />

    <div class="flex-col" :style="titleCol">
      <div :style="titleStyle">{{ titleText }}</div>
      <div v-if="showSubtitle" :style="subtitleStyle">{{ subtitleText }}</div>
    </div>

    <div v-if="hasBoard" class="flex-col" :style="board">
      <div class="flex-row" :style="boardHead">
        <div :style="liveDot" />
        <div :style="boardHeadText">{{ labels.market }}</div>
        <div :style="midDot">·</div>
        <div :style="boardHeadNote">{{ labels.marketNote }}</div>
        <div :style="spacer" />
        <div :style="boardStamp">{{ labels.footerUpdated }}</div>
      </div>
      <div class="flex-row" :style="boardBody">
        <div class="flex-col" :style="cell">
          <div class="flex-row" :style="labelRow">
            <div :style="cellLabel">{{ labels.buy }}</div>
            <div :style="midDot">·</div>
            <div :style="cellNote">{{ labels.buyNote }}</div>
          </div>
          <div class="flex-row" :style="valueRow">
            <template v-if="hasBuy">
              <div :style="currencySign">$</div>
              <div :style="valueNum">{{ fmt(props.rateBuy) }}</div>
            </template>
            <div v-else :style="valueMissing">—</div>
          </div>
        </div>
        <div :style="cellRule" />
        <div class="flex-col" :style="cell">
          <div class="flex-row" :style="labelRow">
            <div :style="cellLabel">{{ labels.sell }}</div>
            <div :style="midDot">·</div>
            <div :style="cellNote">{{ labels.sellNote }}</div>
          </div>
          <div class="flex-row" :style="valueRow">
            <template v-if="hasSell">
              <div :style="currencySign">$</div>
              <div :style="valueNum">{{ fmt(props.rateSell) }}</div>
            </template>
            <div v-else :style="valueMissing">—</div>
          </div>
        </div>
      </div>
    </div>

    <div class="flex-row" :style="footer">
      <span :style="footerBrand">cambio-uruguay.com</span>
      <span :style="midDot">·</span>
      <span>{{ labels.footerHouses }}</span>
      <template v-if="!hasBoard">
        <span :style="midDot">·</span>
        <span>{{ labels.footerUpdated }}</span>
      </template>
    </div>
  </div>
</template>
