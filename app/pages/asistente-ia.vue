<template>
  <VContainer class="assistant-page py-6" style="max-width: 860px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Buscar con IA', to: localePath('/buscar-con-ia') },
        { title: 'Asistente con Gemini', disabled: true },
      ]"
    />

    <div class="text-overline text-medium-emphasis mb-2">Asistente · Gemini</div>
    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Un asistente que busca alquiler, auto o productos por vos
    </h1>
    <p class="text-body-1 mb-4" style="max-width: 68ch">
      Contale lo que necesitás como se lo dirías a alguien: presupuesto, barrio, si tenés mascota,
      dónde trabajás. El asistente usa Gemini de Google con tu propia clave gratuita y busca en las
      viviendas, los autos y los precios que relevamos cada día. Te responde con una lista corta y
      los links a cada aviso.
    </p>

    <VAlert type="info" variant="tonal" density="comfortable" class="mb-6 on-dark">
      <p class="text-body-2 mb-0">
        Es gratis: usa la cuota gratuita de tu cuenta de Google. Tu clave va directo de tu navegador
        a Google y nunca pasa por nuestros servidores. En el plan gratuito, Google puede usar las
        conversaciones para mejorar sus productos: no escribas datos que no quieras compartir.
      </p>
    </VAlert>

    <ClientOnly>
      <GeminiChat class="mb-8" />
      <template #fallback>
        <VCard variant="flat" class="pa-6 mb-8 text-center text-medium-emphasis">
          Cargando el asistente…
        </VCard>
      </template>
    </ClientOnly>

    <h2 class="text-h6 font-weight-bold mb-2">Qué le podés pedir</h2>
    <ul class="list mb-6">
      <li v-for="(example, i) in examples" :key="i" class="text-body-2">«{{ example }}»</li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Preguntas frecuentes</h2>
    <VExpansionPanels variant="accordion" class="mb-6">
      <VExpansionPanel v-for="item in FAQ" :key="item.q">
        <VExpansionPanelTitle>{{ item.q }}</VExpansionPanelTitle>
        <VExpansionPanelText>
          <p class="text-body-2 mb-0">{{ item.a }}</p>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <p class="text-body-2 text-medium-emphasis">
      ¿Usás Claude o ChatGPT?
      <NuxtLink :to="localePath('/buscar-con-ia')" class="cu-link">Conectalos al buscador</NuxtLink>
      con las mismas herramientas.
    </p>
  </VContainer>
</template>

<script setup lang="ts">
import { AI_PROMPT_EXAMPLES } from '~/utils/aiSearch'

const localePath = useLocalePath()
const examples = AI_PROMPT_EXAMPLES.map(example => example.text)

const FAQ = [
  {
    q: '¿Cuesta algo?',
    a: 'No. Cada consulta usa la cuota gratuita de Gemini de tu cuenta de Google; ni vos ni nosotros pagamos. Google fija límites por minuto y por día: si llegás a uno, esperá un minuto o, si es el diario, al día siguiente.',
  },
  {
    q: '¿Dónde queda mi clave?',
    a: 'En tu navegador. Si marcás «Recordarla», queda guardada en este navegador para la próxima vez; «Olvidar mi clave» la borra. Viaja sólo a Google, nunca a cambio-uruguay.com. Podés revocarla cuando quieras desde Google AI Studio.',
  },
  {
    q: '¿Qué ve cambio-uruguay.com de mi conversación?',
    a: 'Nada de la conversación. El buscador sólo recibe lo que el asistente le pide para cada búsqueda (por ejemplo barrio, presupuesto o la dirección del trabajo para medir distancias) y no lo guarda.',
  },
  {
    q: '¿Qué hace Google con lo que escribo?',
    a: 'En el plan gratuito de la API de Gemini, Google puede usar las conversaciones para mejorar sus productos. Evitá escribir datos sensibles; para buscar alcanza con barrio, presupuesto y requisitos.',
  },
  {
    q: '¿Por qué no lo conecto directo en la app de Gemini?',
    a: 'La app de Gemini sólo permite conectar herramientas externas en Estados Unidos y en inglés. Acá lo usás desde Uruguay, en español, con las mismas herramientas.',
  },
  {
    q: '¿Qué tan confiable es la respuesta?',
    a: 'Los datos son avisos reales que relevamos cada día, pero son precios pedidos, no de cierre, y la IA puede equivocarse al resumir. Abrí los links de los avisos antes de decidir o pagar nada.',
  },
  {
    q: '¿Qué necesito para empezar?',
    a: 'Una cuenta de Google y ser mayor de 18 años, que es lo que pide Google para crear la clave. Se crea en un minuto en Google AI Studio y no pide tarjeta.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/asistente-ia'
const title = 'Asistente con IA: alquiler, autos y precios'
const description =
  'Chateá gratis con Gemini usando tu clave de Google: busca alquileres, autos usados y precios en Uruguay y te responde con los links a cada aviso.'

defineOgImageComponent('Cambio', {
  title: 'Asistente con IA',
  subtitle: 'Alquileres, autos y precios de Uruguay, gratis con tu clave de Gemini',
  tag: 'Gemini',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Buscar con IA',
                item: 'https://cambio-uruguay.com/buscar-con-ia',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Asistente con Gemini',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'WebApplication',
            name: title,
            url: canonicalUrl,
            description,
            applicationCategory: 'SearchApplication',
            operatingSystem: 'Web',
            inLanguage: 'es-UY',
            offers: { '@type': 'Offer', price: 0, priceCurrency: 'UYU' },
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQ.map(item => ({
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.list {
  padding-left: 1.2rem;
}
.list li {
  margin-bottom: 6px;
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
</style>
