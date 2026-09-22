<template>
  <VContainer class="assistant-page py-6" style="max-width: 860px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Buscar con IA', to: localePath('/buscar-con-ia') },
        { title: 'Asistente con IA', disabled: true },
      ]"
    />

    <div class="text-overline text-medium-emphasis mb-2">Asistente con IA · gratis</div>
    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Un asistente que conoce todo el sitio y busca por vos
    </h1>
    <p class="text-body-1 mb-4" style="max-width: 68ch">
      Preguntale como se lo preguntarías a alguien: cuánto podés traer por courier, cómo se calcula
      el aguinaldo, dónde conviene cambiar dólares hoy, o que te busque un alquiler, un auto o el
      precio de algo. Responde con lo que publica cambio-uruguay.com —guías, herramientas,
      cotizaciones y los avisos que relevamos cada día— y te deja el link a cada página. Tocás
      «Empezar», entrás con tu cuenta de Google, Microsoft o Apple, y listo.
    </p>

    <VAlert type="info" variant="tonal" density="comfortable" class="mb-6 on-dark">
      <p class="text-body-2 mb-0">
        Es gratis: la IA la provee Puter, que le da a cada cuenta un cupo mensual sin costo, y el
        uso se descuenta de tu cupo, no de nadie más. Lo que escribís pasa por Puter y por el
        proveedor del modelo (Google Gemini); no escribas datos que no quieras compartir.
      </p>
    </VAlert>

    <ClientOnly>
      <AssistantChat class="mb-8" :initial-prompt="initialPrompt" />
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
import { readAssistantPrompt } from '~/utils/assistantPrompt'

const localePath = useLocalePath()
// A directory's «Preguntale a la IA» brings the question in ?q= (utils/assistantPrompt.ts).
const initialPrompt = readAssistantPrompt(useRoute().query.q)
const examples = AI_PROMPT_EXAMPLES.map(example => example.text)

const FAQ = [
  {
    q: '¿Cuesta algo?',
    a: 'No. La IA la provee Puter, que le da a cada cuenta un cupo mensual gratis, y cada consulta se descuenta de tu cupo. Si algún mes se te termina, Puter te ofrece sumar crédito o podés esperar al mes siguiente. Nosotros no cobramos nada ni vemos pagos.',
  },
  {
    q: '¿Qué es Puter y por qué me pide entrar?',
    a: 'Puter es una plataforma que da acceso a modelos de IA (acá, Gemini de Google) a cada persona con su propia cuenta. Entrar con Google, Microsoft o Apple crea esa cuenta en un paso; así la IA corre a tu nombre y con tu cupo, sin claves que copiar.',
  },
  {
    q: '¿Qué ve cambio-uruguay.com de mi conversación?',
    a: 'Nada de la conversación. El buscador sólo recibe lo que el asistente le pide para cada búsqueda (por ejemplo barrio, presupuesto o la dirección del trabajo para medir distancias) y no lo guarda.',
  },
  {
    q: '¿De dónde saca las respuestas?',
    a: 'De cambio-uruguay.com: el texto de sus unas 3.300 páginas (guías, herramientas, glosario y fichas), las cotizaciones del día y los directorios de alquileres, autos y productos. Las páginas se releen cada noche y cada respuesta trae el link a la página de donde sale, para que la verifiques. Si el sitio no cubre algo, te lo dice.',
  },
  {
    q: '¿Qué pasa con lo que escribo?',
    a: 'Pasa por Puter y por el proveedor del modelo para generar la respuesta, según sus propias políticas. Para buscar alcanza con barrio, presupuesto y requisitos: evitá datos sensibles.',
  },
  {
    q: '¿Puedo usar mi propia clave de Gemini?',
    a: 'Sí: abajo del botón está la opción. Con una clave gratuita de Google AI Studio la conversación va directo de tu navegador a Google, sin Puter. En el plan gratuito de la API, Google puede usar las conversaciones para mejorar sus productos.',
  },
  {
    q: '¿Qué tan confiable es la respuesta?',
    a: 'Los datos son avisos reales que relevamos cada día, pero son precios pedidos, no de cierre, y la IA puede equivocarse al resumir. Abrí los links de los avisos antes de decidir o pagar nada.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/asistente-ia'
const title = 'Asistente con IA: dólar, guías y alquileres'
const description =
  'Chateá gratis con un asistente que conoce todo cambio-uruguay.com: cotizaciones, guías, alquileres, autos y precios, con el link a cada página.'

defineOgImageComponent('Cambio', {
  title: 'Asistente con IA',
  subtitle: 'Todo cambio-uruguay.com en un chat: entrás con Google y preguntás',
  tag: 'IA gratis',
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
