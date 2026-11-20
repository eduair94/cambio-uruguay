/**
 * The loader of every machine-translated locale (utils/locales.ts), shared by all 32.
 *
 * Their messages are NOT bundled. es/en/pt are compiled into the client chunks and, all of
 * them, statically into the server bundle; 32 more files of ~130 KB compiled the same way
 * made the Nitro build run out of a 10 GB heap. Instead the JSON is a public asset
 * (`/i18n-messages/<code>.json`, nitro.publicAssets in nuxt.config, from i18n/extra/) that
 * vue-i18n compiles on first use, fetched once per process on the server and once per visit
 * in the browser. The `v` query is a hash of the files, so a deploy never serves old copy.
 *
 * The cache is ours, by locale: @nuxtjs/i18n keys its own by loader FILE, which this file is
 * for every locale — with its cache on, a German page would get the French messages. Hence
 * `cache: false` on the locale entries and the Map below.
 */
const loaded = new Map<string, Promise<Record<string, unknown>>>()

export default defineI18nLocale(locale => {
  let messages = loaded.get(locale)
  if (!messages) {
    const version = String(useRuntimeConfig().public.extraLocalesVersion || '')
    messages = $fetch<Record<string, unknown>>(`/i18n-messages/${locale}.json`, {
      query: version ? { v: version } : undefined,
    }).catch(error => {
      loaded.delete(locale)
      throw error
    })
    loaded.set(locale, messages)
  }
  return messages
})
