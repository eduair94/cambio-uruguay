<template>
  <VContainer class="ai-page py-6" style="max-width: 920px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Conectar', to: localePath('/conectar') },
        { title: 'Buscar con IA', disabled: true },
      ]"
    />

    <div class="text-overline text-medium-emphasis mb-2">Asistentes de IA · MCP</div>
    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Buscá alquiler, auto o productos con tu IA
    </h1>
    <p class="text-body-1 mb-4" style="max-width: 68ch">
      Conectá Claude, ChatGPT o tu editor a los datos de este sitio y pedile lo que necesitás con
      tus palabras: «somos dos, trabajamos en el Centro, tenemos un perro y hasta $35.000». La IA
      cruza tu presupuesto, tus ingresos, dónde trabaja o estudia cada uno y tus requisitos con las
      viviendas, los autos y los precios que relevamos cada día, y te devuelve una lista corta con
      los links a cada aviso.
    </p>
    <VAlert type="success" variant="tonal" density="comfortable" class="mb-4 on-dark">
      <p class="text-body-2 mb-2">
        ¿No usás Claude ni ChatGPT? Probá el <strong>asistente con Gemini</strong> acá mismo: es
        gratis con tu cuenta de Google y no tenés que instalar nada.
      </p>
      <VBtn
        :to="localePath('/asistente-ia')"
        color="primary"
        size="small"
        prepend-icon="mdi-chat-processing-outline"
      >
        Abrir el asistente
      </VBtn>
    </VAlert>
    <div class="d-flex flex-wrap ga-2 mb-8">
      <VBtn color="primary" prepend-icon="mdi-connection" href="#conectar">Conectar mi IA</VBtn>
      <VBtn variant="tonal" prepend-icon="mdi-download" :href="SKILL_ZIP_PATH" download>
        Descargar la skill para Claude
      </VBtn>
    </div>

    <h2 class="text-h6 font-weight-bold mb-3">Qué le podés pedir</h2>
    <VRow class="mb-6">
      <VCol v-for="group in exampleGroups" :key="group.id" cols="12" md="4">
        <VCard variant="flat" class="ai-card pa-4 h-100">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon :icon="group.icon" color="primary" />
            <span class="text-subtitle-1 font-weight-bold">{{ group.title }}</span>
          </div>
          <p class="text-body-2 text-medium-emphasis mb-3">{{ group.summary }}</p>
          <div v-for="(example, i) in group.examples" :key="i" class="example mb-2">
            <p class="text-body-2 mb-1">«{{ example }}»</p>
            <VBtn
              size="x-small"
              variant="text"
              :prepend-icon="copied === `ex-${group.id}-${i}` ? 'mdi-check' : 'mdi-content-copy'"
              @click="copy(example, `ex-${group.id}-${i}`)"
            >
              {{ copied === `ex-${group.id}-${i}` ? 'Copiado' : 'Copiar' }}
            </VBtn>
          </div>
        </VCard>
      </VCol>
    </VRow>

    <h2 id="conectar" class="text-h6 font-weight-bold mb-2">Cómo conectarlo</h2>
    <p class="text-body-2 mb-3" style="max-width: 68ch">
      Es un servidor <strong>MCP</strong> (Model Context Protocol), el estándar con el que los
      asistentes de IA usan herramientas externas. Es gratis, no pide cuenta ni clave y sólo lee
      datos públicos. La dirección es:
    </p>
    <div class="snippet-row mb-4">
      <code class="snippet-inline">{{ MCP_ENDPOINT }}</code>
      <VBtn
        size="small"
        variant="tonal"
        :prepend-icon="copied === 'endpoint' ? 'mdi-check' : 'mdi-content-copy'"
        @click="copy(MCP_ENDPOINT, 'endpoint')"
      >
        {{ copied === 'endpoint' ? 'Copiado' : 'Copiar' }}
      </VBtn>
    </div>
    <VExpansionPanels variant="accordion" class="mb-6">
      <VExpansionPanel v-for="client in AI_CONNECTORS" :key="client.id">
        <VExpansionPanelTitle>
          <VIcon :icon="client.icon" class="mr-2" size="small" />
          {{ client.title }}
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <ol class="steps mb-2">
            <li v-for="(step, i) in client.steps" :key="i" class="text-body-2">{{ step }}</li>
          </ol>
          <template v-if="client.snippet">
            <pre class="snippet mb-2">{{ client.snippet }}</pre>
            <VBtn
              size="small"
              variant="text"
              :prepend-icon="copied === client.id ? 'mdi-check' : 'mdi-content-copy'"
              @click="copy(client.snippet, client.id)"
            >
              {{ copied === client.id ? 'Copiado' : 'Copiar' }}
            </VBtn>
          </template>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>

    <h2 class="text-h6 font-weight-bold mb-2">Sólo lo que usás</h2>
    <p class="text-body-2 mb-3" style="max-width: 68ch">
      La dirección de arriba trae las {{ toolCount }} herramientas. Si tu asistente se confunde con
      tantas, conectá sólo la parte que te sirve:
    </p>
    <div class="table-wrap mb-6">
      <VTable density="compact">
        <thead>
          <tr>
            <th>Parte</th>
            <th>Dirección</th>
            <th class="text-right">Herramientas</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="set in AI_TOOLSETS" :key="set.id">
            <td>{{ set.title }}</td>
            <td>
              <code>{{ set.url }}</code>
            </td>
            <td class="text-right">{{ set.tools.length }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">La skill para Claude</h2>
    <p class="text-body-2 mb-3" style="max-width: 68ch">
      La skill le enseña a Claude cómo buscar bien en Uruguay: qué preguntarte antes (sin
      interrogatorios), qué herramienta usar para cada pedido, que el total de un alquiler incluye
      los gastos comunes, qué garantías existen, qué revisar antes de señar un auto. Si Claude no
      tiene el conector, la skill usa la API pública del sitio directamente.
    </p>
    <ol class="steps mb-3">
      <li class="text-body-2">Descargá el archivo.</li>
      <li class="text-body-2">
        En Claude: Configuración → Capacidades → Skills → subir el zip. En Claude Code:
        descomprimilo en <code>~/.claude/skills/</code>.
      </li>
      <li class="text-body-2">Pedí lo que buscás; Claude la usa sola cuando corresponde.</li>
    </ol>
    <div class="d-flex flex-wrap ga-2 mb-8">
      <VBtn
        color="primary"
        variant="tonal"
        prepend-icon="mdi-download"
        :href="SKILL_ZIP_PATH"
        download
      >
        buscador-uruguay-skill.zip
      </VBtn>
      <VBtn
        variant="text"
        prepend-icon="mdi-github"
        :href="SKILL_SOURCE_URL"
        target="_blank"
        rel="noopener noreferrer"
      >
        Ver el código
      </VBtn>
    </div>

    <h2 class="text-h6 font-weight-bold mb-3">Todas las herramientas</h2>
    <VRow class="mb-6">
      <VCol v-for="set in AI_TOOLSETS" :key="set.id" cols="12" sm="6">
        <VCard variant="flat" class="ai-card pa-4 h-100">
          <div class="d-flex align-center ga-2 mb-2">
            <VIcon :icon="set.icon" color="primary" size="small" />
            <span class="text-subtitle-2 font-weight-bold">{{ set.title }}</span>
          </div>
          <ul class="tools">
            <li v-for="tool in set.tools" :key="tool.name" class="text-body-2">
              <code>{{ tool.name }}</code> — {{ tool.what }}
            </li>
          </ul>
        </VCard>
      </VCol>
    </VRow>

    <h2 class="text-h6 font-weight-bold mb-2">Qué hace con tus datos y qué no puede hacer</h2>
    <ul class="limits mb-6">
      <li class="text-body-2">
        Sólo lee datos públicos del sitio. No crea cuentas, no guarda búsquedas y no contacta a
        nadie en tu nombre.
      </li>
      <li class="text-body-2">
        Ingresos y direcciones se usan únicamente para calcular el ranking de esa consulta; no se
        guardan ni se registran.
      </li>
      <li class="text-body-2">
        Son precios pedidos en avisos, no de cierre. Una «oportunidad» es un aviso por debajo de
        otros parecidos, no una tasación: visitá, revisá y confirmá antes de pagar nada.
      </li>
      <li class="text-body-2">
        Las distancias son en línea recta. El geocodificador oficial (IDE Uruguay) necesita calle y
        número o una esquina; no reconoce nombres de lugares.
      </li>
      <li class="text-body-2">
        El ranking por hogar admite unas diez consultas por minuto y la primera puede tardar hasta
        un minuto.
      </li>
    </ul>
    <p class="text-body-2 text-medium-emphasis">
      Código abierto. Más:
      <NuxtLink :to="localePath('/desarrolladores')" class="cu-link">API pública</NuxtLink>
      ·
      <NuxtLink :to="localePath('/conectar')" class="cu-link">otras formas de conectarte</NuxtLink>
    </p>
  </VContainer>
</template>

<script setup lang="ts">
import {
  AI_CONNECTORS,
  AI_PROMPT_EXAMPLES,
  AI_TOOLSETS,
  MCP_ENDPOINT,
  SKILL_SOURCE_URL,
  SKILL_ZIP_PATH,
} from '~/utils/aiSearch'

const localePath = useLocalePath()

const exampleGroups = AI_TOOLSETS.filter(set => set.id !== 'cambio').map(set => ({
  id: set.id,
  title: set.title,
  icon: set.icon,
  summary: set.summary,
  examples: AI_PROMPT_EXAMPLES.filter(example => example.vertical === set.id).map(e => e.text),
}))
const toolCount = AI_TOOLSETS.reduce((sum, set) => sum + set.tools.length, 0)

const copied = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
async function copy(text: string, key: string) {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = key
    clearTimeout(timer)
    timer = setTimeout(() => (copied.value = ''), 2000)
  } catch {
    copied.value = ''
  }
}

const canonicalUrl = 'https://cambio-uruguay.com/buscar-con-ia'
const title = 'Buscá alquiler, auto o productos con tu IA'
const description =
  'Conectá Claude o ChatGPT a los alquileres, autos usados y precios de Uruguay: ranking por presupuesto y traslados, barrios y oportunidades. Gratis.'

defineOgImageComponent('Cambio', {
  title: 'Buscar con IA',
  subtitle: 'Alquileres, autos y productos de Uruguay en tu asistente',
  tag: 'MCP',
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
                name: 'Conectar',
                item: 'https://cambio-uruguay.com/conectar',
              },
              { '@type': 'ListItem', position: 3, name: 'Buscar con IA', item: canonicalUrl },
            ],
          },
          {
            '@type': 'HowTo',
            name: 'Conectar un asistente de IA al buscador de cambio-uruguay.com',
            description,
            step: AI_CONNECTORS.slice(0, 3).map((client, i) => ({
              '@type': 'HowToStep',
              position: i + 1,
              name: client.title,
              text: client.steps.join(' '),
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.ai-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
  border-radius: 12px;
}
.example {
  border-left: 3px solid rgba(var(--v-theme-primary), 0.5);
  padding-left: 10px;
}
.snippet-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
.snippet-inline,
.snippet {
  font-size: 0.85rem;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 8px;
  padding: 6px 10px;
  overflow-wrap: anywhere;
}
.snippet {
  white-space: pre-wrap;
  overflow-x: auto;
}
.steps,
.tools,
.limits {
  padding-left: 1.2rem;
}
.steps li,
.tools li,
.limits li {
  margin-bottom: 4px;
}
.table-wrap {
  overflow-x: auto;
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
