<template>
  <v-container class="py-4">
    <h1 class="text-h5 text-sm-h4 mb-2">
      Tarjetas de socio y programas de beneficios en Uruguay (sin ser de crédito ni de débito)
    </h1>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 74ch">
      {{ cards.length }} programas uruguayos que dan descuentos sin ser una tarjeta bancaria: clubes
      de diarios, socios de shoppings, fidelidad de supermercados y combustible, abonos de cine y
      teatro. De cada uno decimos cuánto cuesta de verdad, cómo se saca paso a paso y qué beneficio
      concreto da — con la fuente al lado, porque estos programas cambian sin avisar.
    </p>

    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-map-search-outline"
        :to="localePath('/descuentos-con-tarjeta-uruguay')"
      >
        Mapa de descuentos por banco
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-credit-card-multiple-outline"
        :to="localePath('/tarjetas-de-credito-uruguay')"
      >
        Tarjetas de crédito
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-credit-card-outline"
        :to="localePath('/tarjetas-de-debito-uruguay')"
      >
        Tarjetas de débito
      </v-chip>
    </div>

    <!-- Filtros -->
    <v-row dense class="mb-2">
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="search"
          label="Buscar programa o emisor"
          density="compact"
          variant="outlined"
          hide-details
          clearable
          prepend-inner-icon="mdi-magnify"
        />
      </v-col>
      <v-col cols="12" sm="6" md="4">
        <v-select
          v-model="category"
          :items="categoryItems"
          label="Rubro"
          density="compact"
          variant="outlined"
          hide-details
        />
      </v-col>
      <v-col cols="12" md="4" class="d-flex align-center ga-2">
        <v-chip
          size="small"
          :variant="onlyFree ? 'flat' : 'outlined'"
          :color="onlyFree ? 'success' : undefined"
          prepend-icon="mdi-gift-outline"
          @click="onlyFree = !onlyFree"
        >
          Solo gratis ({{ freeCount }})
        </v-chip>
        <span class="text-caption text-medium-emphasis"
          >{{ filtered.length }} de {{ cards.length }}</span
        >
      </v-col>
    </v-row>

    <v-alert v-if="!filtered.length" type="info" variant="tonal" density="comfortable" class="mb-4">
      Ningún programa coincide con el filtro.
    </v-alert>

    <!-- Fichas -->
    <v-expansion-panels variant="accordion" class="mb-6">
      <!-- `eager`: sin esto Vuetify no monta el contenido del panel hasta que se abre, y el
           costo, los pasos, la letra chica y las FUENTES no llegan al HTML del servidor. En una
           página cuyo valor es justamente ese detalle, dejarlo perezoso es publicarla vacía para
           quien la lea sin ejecutar JavaScript. -->
      <v-expansion-panel v-for="c in filtered" :id="c.id" :key="c.id" eager>
        <v-expansion-panel-title>
          <div class="d-flex flex-wrap align-center ga-2">
            <span class="font-weight-medium">{{ c.name }}</span>
            <v-chip size="x-small" :color="c.isFree ? 'success' : 'warning'" variant="tonal">
              {{ c.isFree ? 'Gratis' : 'Paga' }}
            </v-chip>
            <v-chip size="x-small" variant="outlined">{{ CATEGORY_LABEL[c.category] }}</v-chip>
            <v-chip v-if="c.confidence !== 'alta'" size="x-small" variant="text" color="grey">
              dato {{ c.confidence === 'baja' ? 'poco firme' : 'a confirmar' }}
            </v-chip>
          </div>
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <p class="text-caption text-medium-emphasis mb-3">{{ c.issuer }}</p>

          <h3 class="text-subtitle-2 mb-1">Cuánto cuesta</h3>
          <p class="text-body-2 mb-3">{{ c.cost }}</p>

          <h3 class="text-subtitle-2 mb-1">Cómo se obtiene</h3>
          <ol class="text-body-2 pl-5 mb-3">
            <li v-for="(step, i) in c.howToGet" :key="i" class="mb-1">{{ step }}</li>
          </ol>

          <template v-if="c.requirements.length">
            <h3 class="text-subtitle-2 mb-1">Requisitos</h3>
            <ul class="text-body-2 pl-5 mb-3">
              <li v-for="(r, i) in c.requirements" :key="i" class="mb-1">{{ r }}</li>
            </ul>
          </template>

          <h3 class="text-subtitle-2 mb-1">Qué da</h3>
          <ul class="text-body-2 pl-5 mb-3">
            <li v-for="(b, i) in c.benefits" :key="i" class="mb-1">{{ b }}</li>
          </ul>

          <p v-if="c.whereValid" class="text-body-2 mb-3">
            <strong>Dónde vale:</strong> {{ c.whereValid }}
          </p>

          <v-alert v-if="c.caveat" type="warning" variant="tonal" density="compact" class="mb-3">
            <span class="text-body-2">{{ c.caveat }}</span>
          </v-alert>

          <div class="text-caption">
            <strong>Fuentes:</strong>
            <a
              v-for="(s, i) in c.sources"
              :key="i"
              :href="s"
              target="_blank"
              rel="noopener nofollow"
              class="mr-2"
              >[{{ i + 1 }}]</a
            >
            <span class="text-medium-emphasis">· soporte: {{ c.digital }}</span>
          </div>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Hallazgos negativos -->
    <v-card variant="outlined" class="mb-6">
      <v-card-item class="pb-1">
        <h2 class="text-subtitle-1 font-weight-medium">Lo que no existe (aunque lo busques)</h2>
        <p class="text-caption text-medium-emphasis mb-0">
          Programas que la gente da por hecho y que, al ir a buscarlos, no están. Te ahorramos la
          búsqueda.
        </p>
      </v-card-item>
      <v-card-text>
        <div v-for="m in myths" :key="m.name" class="mb-3">
          <div class="text-body-2 font-weight-medium">{{ m.name }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ m.finding }}</div>
        </div>
      </v-card-text>
    </v-card>

    <!-- Método -->
    <v-card variant="tonal" class="mb-6">
      <v-card-text style="max-width: 78ch">
        <h2 class="text-h6 mb-2">Cómo se armó esta lista</h2>
        <p class="text-body-2 mb-2">
          Se relevaron 83 programas candidatos y cada uno se verificó contra la web oficial del
          emisor. Después, un segundo control intentó refutar cada ficha leyendo las mismas fuentes:
          los datos que no quedaron respaldados se borraron, y varios programas se cayeron enteros
          por no existir o por ser en realidad una tarjeta bancaria. Solo publicamos lo que
          sobrevivió a ese control.
        </p>
        <p class="text-body-2 mb-2">
          <strong>Los precios y porcentajes son del {{ RESEARCHED_AT }}</strong> y los programas los
          cambian sin aviso: cada ficha trae las URLs para que confirmes antes de pagar nada. Si una
          ficha dice “sin confirmar”, es porque la fuente oficial no lo publica, no porque no lo
          hayamos buscado.
        </p>
        <p class="text-body-2 mb-0">
          Faltan rubros: quedaron sin auditar los programas de farmacias, algunos supermercados y
          varios clubes gremiales y de shoppings. Se agregan cuando pasen el mismo control.
        </p>
      </v-card-text>
    </v-card>

    <FaqSection :items="SOCIOS_FAQ" heading="Preguntas frecuentes" :expanded="true" />
  </v-container>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  MEMBERSHIP_CARDS,
  MEMBERSHIP_MYTHS,
  type MembershipCategory,
} from '~/utils/membershipCards'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

/** Fecha en que se leyeron las fuentes; va en la página porque estos programas cambian seguido. */
const RESEARCHED_AT = '19 de agosto de 2026'

const CATEGORY_LABEL: Record<MembershipCategory, string> = {
  medio: 'Diario / medio',
  shopping: 'Shopping',
  supermercado: 'Supermercado',
  combustible: 'Combustible',
  entretenimiento: 'Cine y teatro',
  joven: 'Jóvenes',
  otro: 'Otro',
}

const cards = MEMBERSHIP_CARDS
const myths = MEMBERSHIP_MYTHS

const search = ref('')
const category = ref<'__all__' | MembershipCategory>('__all__')
const onlyFree = ref(false)

const freeCount = computed(() => cards.filter(c => c.isFree).length)

const categoryItems = computed(() => {
  const present = new Set(cards.map(c => c.category))
  return [
    { title: 'Todos los rubros', value: '__all__' },
    ...[...present].map(c => ({ title: CATEGORY_LABEL[c], value: c })),
  ]
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return cards.filter(c => {
    if (onlyFree.value && !c.isFree) return false
    if (category.value !== '__all__' && c.category !== category.value) return false
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.issuer.toLowerCase().includes(q) ||
      c.benefits.some(b => b.toLowerCase().includes(q))
    )
  })
})

const SOCIOS_FAQ: FaqItem[] = [
  {
    id: 'que-son',
    question: '¿Qué son estas tarjetas si no son de crédito ni de débito?',
    answer:
      'Son credenciales de socio o de fidelidad: te identifican como cliente o socio de un diario, un shopping, un supermercado, una estación de servicio o una sala, y con eso accedés a descuentos o beneficios. No sirven para pagar ni tienen línea de crédito.',
  },
  {
    id: 'gratis',
    question: '¿Cuáles son gratis?',
    answer:
      'Varias lo son: los clubes de shoppings, la fidelidad de supermercados y combustible y algunos beneficios de clientes no cobran nada por asociarte. Las de los diarios son gratis como plástico pero exigen una suscripción paga, y los abonos de cine y teatro se pagan. En la lista podés filtrar por “Solo gratis”.',
  },
  {
    id: 'conviene',
    question: '¿Conviene sacar la del diario solo por los descuentos?',
    answer:
      'Depende de cuánto uses los comercios adheridos y qué días comprás: hay clubes donde la mayoría de los comercios limita el beneficio a lunes, martes y miércoles. Sumá lo que pagás de suscripción por año y compará contra lo que realmente ahorrarías en los locales a los que ya ibas.',
  },
  {
    id: 'combinar',
    question: '¿Se pueden combinar con los descuentos del banco?',
    answer:
      'A veces sí y a veces no: muchos comercios no acumulan promociones. Conviene preguntar en la caja cuál conviene aplicar. Para ver qué descuento te da tu banco en cada local, mirá el mapa de descuentos con tarjeta.',
  },
  {
    id: 'actualizado',
    question: '¿Qué tan actualizados están los precios y beneficios?',
    answer: `Se leyeron de las fuentes oficiales el ${RESEARCHED_AT}. Estos programas cambian condiciones sin aviso, así que cada ficha incluye las URLs oficiales para que confirmes antes de contratar o de ir al local.`,
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/tarjetas-de-socio-uruguay'
defineOgImageComponent('Cambio', {
  title: 'Tarjetas de socio y beneficios',
  subtitle: 'Descuentos sin tarjeta bancaria, en Uruguay',
  tag: 'Beneficios',
})
useSeoMeta({
  title: 'Tarjetas de socio y beneficios en Uruguay: cuáles hay y cómo obtenerlas | Cambio Uruguay',
  description:
    'Lista verificada de tarjetas de socio y programas de beneficios uruguayos que no son de crédito ni de débito: Club El País, clubes de shoppings, fidelidad de supermercados y combustible, abonos de cine y teatro. Cuánto cuestan, cómo sacarlas y qué descuentos dan, con fuentes oficiales.',
  ogTitle: 'Tarjetas de socio y beneficios en Uruguay',
  ogDescription:
    'Cuánto cuestan de verdad, cómo se sacan y qué descuento dan — con la fuente oficial al lado.',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
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
            '@type': 'ItemList',
            name: 'Tarjetas de socio y programas de beneficios en Uruguay',
            numberOfItems: cards.length,
            itemListElement: cards.slice(0, 25).map((c, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: c.name,
            })),
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              { '@type': 'ListItem', position: 2, name: 'Tarjetas de socio', item: canonicalUrl },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>
