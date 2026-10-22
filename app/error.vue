<template>
  <section v-if="recoveredHtml" class="ssr-recovery">
    <aside class="recovery-notice" role="alert" data-startup-recovery>
      <p>{{ text.incomplete }} {{ text.readOnly }}</p>
      <button type="button" :disabled="reloading" data-startup-reload @click="reload">
        {{ text.reload }}
      </button>
    </aside>
    <!-- Only the detached, non-executable copy of this document's original SSR reaches v-html. -->
    <!-- eslint-disable-next-line vue/no-v-html -->
    <div data-startup-content @submit.prevent v-html="recoveredHtml" />
  </section>
  <main v-else class="error-page">
    <a :href="`${prefix}/`" class="error-brand">Cambio Uruguay</a>
    <h1>{{ notFound ? text.notFoundTitle : text.genericTitle }}</h1>
    <p>{{ notFound ? text.notFoundBody : text.genericBody }}</p>
    <button type="button" :disabled="reloading" @click="reload">{{ text.reload }}</button>
    <form v-if="notFound" :action="`${prefix}/buscar`" method="get" class="error-search">
      <label for="error-search">{{ text.searchLabel }}</label>
      <div>
        <input id="error-search" name="q" type="search" required />
        <button type="submit">{{ text.search }}</button>
      </div>
    </form>
    <nav :aria-label="text.linksLabel">
      <a :href="`${prefix}/dolar-hoy`">{{ text.dollar }}</a>
      <a :href="`${prefix}/casas-de-cambio`">{{ text.exchanges }}</a>
      <a :href="`${prefix}/guias`">{{ text.guides }}</a>
      <a :href="`${prefix}/herramientas`">{{ text.tools }}</a>
    </nav>
  </main>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'
import {
  fallbackErrorHead,
  isChunkLoadError,
  recoveredSsrHead,
  ssrRecovery,
  staticSsrHtml,
} from '~/utils/chunkError'

const props = defineProps<{ error: NuxtError }>()
const statusCode = props.error.statusCode ?? props.error.status ?? 500
const notFound = statusCode === 404
// During SSR, Nitro renders errors through /__nuxt_error; ssrContext keeps the original URL.
const path = import.meta.client ? window.location.pathname : useNuxtApp().ssrContext?.url || '/'
const locale = /^\/(en|pt)(?:\/|$)/.exec(path)?.[1] as 'en' | 'pt' | undefined
const prefix = locale ? `/${locale}` : ''

// The error path must work even when the failed module belongs to the layout or i18n.
const messages = {
  es: {
    incomplete: 'Esta página no terminó de cargar.',
    readOnly: 'Podés leerla y seguir sus enlaces; para usar los controles, recargá.',
    reload: 'Recargar',
    notFoundTitle: 'Página no encontrada',
    notFoundBody:
      'No encontramos esta página. Puede que el enlace haya cambiado o ya no esté disponible.',
    genericTitle: 'No pudimos mostrar esta página',
    genericBody: 'Algo falló al mostrar esta página. Probá recargar.',
    searchLabel: 'Buscar en el sitio',
    search: 'Buscar',
    linksLabel: 'Páginas para seguir',
    dollar: 'Dólar hoy',
    exchanges: 'Casas de cambio',
    guides: 'Guías',
    tools: 'Herramientas',
  },
  en: {
    incomplete: 'This page did not finish loading.',
    readOnly: 'You can read it and follow its links. Reload to use the controls.',
    reload: 'Reload',
    notFoundTitle: 'Page not found',
    notFoundBody:
      'We could not find this page. The link may have changed or is no longer available.',
    genericTitle: 'We could not display this page',
    genericBody: 'Something went wrong while displaying this page. Try reloading.',
    searchLabel: 'Search the site',
    search: 'Search',
    linksLabel: 'Pages to explore',
    dollar: 'Dollar today',
    exchanges: 'Exchange houses',
    guides: 'Guides',
    tools: 'Tools',
  },
  pt: {
    incomplete: 'Esta página não terminou de carregar.',
    readOnly: 'Você pode ler o conteúdo e seguir os links. Recarregue para usar os controles.',
    reload: 'Recarregar',
    notFoundTitle: 'Página não encontrada',
    notFoundBody:
      'Não encontramos esta página. O link pode ter mudado ou não estar mais disponível.',
    genericTitle: 'Não foi possível exibir esta página',
    genericBody: 'Ocorreu um erro ao exibir esta página. Tente recarregar.',
    searchLabel: 'Buscar no site',
    search: 'Buscar',
    linksLabel: 'Páginas para explorar',
    dollar: 'Dólar hoje',
    exchanges: 'Casas de câmbio',
    guides: 'Guias',
    tools: 'Ferramentas',
  },
}
const text = messages[locale ?? 'es']
const snapshot = import.meta.client ? ssrRecovery.forUrl(window.location.href) : null
const recoveredHtml =
  snapshot && isChunkLoadError(props.error) ? staticSsrHtml(snapshot.html, document) : ''

useHead(
  snapshot
    ? recoveredSsrHead(snapshot)
    : fallbackErrorHead(
        notFound ? `${text.notFoundTitle} | Cambio Uruguay` : 'Cambio Uruguay',
        statusCode,
        import.meta.server || ssrRecovery.wasServerError()
      )
)

const reloading = ref(false)
function reload() {
  reloading.value = true
  ssrRecovery.requestReload(() => window.location.reload())
}
</script>

<style scoped>
.recovery-notice,
.error-page {
  color: #182b24;
  background: #fff;
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}
.recovery-notice {
  position: sticky;
  top: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 20px;
  border-bottom: 2px solid #d5e4dc;
}
.recovery-notice p {
  margin: 0;
}
button {
  padding: 8px 16px;
  border: 1px solid #245c43;
  border-radius: 6px;
  background: #245c43;
  color: #fff;
  font: inherit;
  cursor: pointer;
}
button:disabled {
  opacity: 0.65;
  cursor: wait;
}
a:focus-visible,
button:focus-visible,
input:focus-visible {
  outline: 3px solid #b47500;
  outline-offset: 3px;
}
.error-page {
  box-sizing: border-box;
  width: min(100%, 760px);
  min-height: 100vh;
  margin: 0 auto;
  padding: 48px 28px;
}
.error-page h1 {
  margin: 32px 0 16px;
  font-size: clamp(1.75rem, 5vw, 2.5rem);
  line-height: 1.2;
}
.error-page p {
  margin: 0 0 24px;
}
.error-page a {
  color: #245c43;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.error-brand {
  font-size: 1.125rem;
  font-weight: 700;
}
.error-search {
  margin-top: 32px;
}
.error-search label {
  display: block;
  margin-bottom: 8px;
}
.error-search div,
.error-page nav {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.error-search input {
  flex: 1 1 180px;
  min-width: 0;
  padding: 8px 12px;
  border: 1px solid #66746c;
  border-radius: 6px;
  font: inherit;
}
.error-page nav {
  margin-top: 32px;
}
</style>
