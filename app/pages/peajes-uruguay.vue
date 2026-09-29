<template>
  <VContainer class="tolls-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">PEAJES</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Peajes en Uruguay: cuánto sale cada uno y por qué el mismo paso tiene tres precios
      </h1>
      <p class="lead mb-6">
        Un auto que cruza un peaje paga <strong>$ {{ money(car.telepeajeUyu) }}</strong> si tiene
        TAG, <strong>$ {{ money(car.basicaUyu) }}</strong> si paga en la barrera y
        <strong>$ {{ money(car.suciveUyu) }}</strong> si el cobro termina yendo al SUCIVE. Es el
        mismo paso, el mismo auto y el mismo día: lo único que cambia es cómo se paga, y entre la
        punta barata y la cara hay un <strong>{{ surcharge }} %</strong>.
      </p>

      <VCard class="note-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-motorbike" color="info" class="mr-3 mt-1" />
          <div>
            <p class="note-title mb-2">Las motos no pagan peaje</p>
            <p class="mb-0">
              El Reglamento exonera a los «vehículos de porte menor» y la enumeración del MTOP
              incluye expresamente las motos, además de bicicletas, triciclos, cuadriciclos con o
              sin motor, carros y cabalgaduras (arts. 19 y 20). Es un costo que la moto no tiene y
              el auto sí, y entra en la cuenta de
              <NuxtLink :to="localePath('/conviene-auto-moto-o-omnibus-uruguay')">
                si conviene auto, moto u ómnibus </NuxtLink
              >.
            </p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- El cuadro de tarifas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las tarifas por categoría</h2>
      <p class="section-intro mb-5">
        El cuadro del MTOP, fila por fila y en el orden de la fuente. Rigen desde la hora cero del 5
        de junio de 2026, incluyen IVA y son <strong>en cada sentido</strong>: una ida y vuelta por
        un solo peaje son dos pasadas.
      </p>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th class="text-left">Cat.</th>
            <th class="text-left">Vehículo</th>
            <th class="text-right">Telepeaje</th>
            <th class="text-right">Básica</th>
            <th class="text-right">SUCIVE</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in TOLL_CATEGORIES" :key="category.id">
            <td data-label="Categoría">
              <code>{{ category.id }}</code>
            </td>
            <td data-label="Vehículo">{{ category.vehicles }}</td>
            <td data-label="Telepeaje" class="text-right font-weight-bold">
              $ {{ money(category.telepeajeUyu) }}
            </td>
            <td data-label="Básica" class="text-right">$ {{ money(category.basicaUyu) }}</td>
            <td data-label="SUCIVE" class="text-right">$ {{ money(category.suciveUyu) }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="mt-5 mb-0 text-medium-emphasis">
        El SUCIVE no es una forma de pago que se elija: es la modalidad supletoria, la que se aplica
        cuando el vehículo pasa sin TAG y sin pagar en la barrera. Por eso es la más cara de las
        tres. El adeudo tiene un plazo perentorio e improrrogable de
        {{ TOLL_SUCIVE_DEADLINE_DAYS }} días calendario desde el día siguiente a su publicación por
        el SUCIVE; vencido, corre un recargo mensual.
      </p>
    </section>

    <!-- Calculadora -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto te sale el viaje</h2>
      <p class="section-intro mb-5">
        Elegí la categoría, cuántos peajes cruza tu ruta y si es ida y vuelta. La cuenta es la
        tarifa oficial por la cantidad de pasadas, nada más: esta página no sabe qué peajes cruza
        cada camino y no lo adivina.
      </p>
      <VRow>
        <VCol cols="12" md="4">
          <VSelect
            v-model="pickedCategoryId"
            :items="categoryOptions"
            item-title="label"
            item-value="value"
            label="Categoría de vehículo"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="4">
          <VTextField
            v-model.number="plazas"
            type="number"
            min="0"
            max="15"
            label="Peajes que cruza la ruta"
            variant="outlined"
            density="comfortable"
            hide-details
          />
        </VCol>
        <VCol cols="12" sm="6" md="4" class="d-flex align-center">
          <VSwitch v-model="roundTrip" color="primary" label="Ida y vuelta" hide-details />
        </VCol>
      </VRow>
      <VRow class="mt-2">
        <VCol v-for="row in tripRows" :key="row.payment" cols="12" md="4">
          <VCard variant="flat" class="cost-card pa-5 h-100">
            <div class="text-caption text-uppercase text-medium-emphasis mb-1">{{ row.label }}</div>
            <div class="text-h5 font-weight-bold">$ {{ money(row.total) }}</div>
            <p class="mb-0 mt-2 text-medium-emphasis">{{ row.note }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Los puestos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Los {{ TOLL_PLAZAS.length }} puestos que lista el MTOP
      </h2>
      <p class="section-intro mb-5">
        Con la ruta, el kilómetro y el concesionario que los opera, tal como los publica el
        ministerio. No se agrega el departamento porque el listado oficial no lo trae y deducirlo
        del kilómetro sería inventarlo. Todos atienden las 24 horas, todos los días.
      </p>
      <VRow>
        <VCol v-for="group in plazasByRoute" :key="group.route" cols="12" sm="6" md="4">
          <VCard variant="flat" class="plaza-card pa-5 h-100">
            <div class="plaza-route mb-3">{{ group.route }}</div>
            <ul class="plaza-list">
              <li v-for="plaza in group.plazas" :key="plaza.name">
                <strong>{{ plaza.name }}</strong> — {{ plaza.km }}
                <span class="d-block text-caption text-medium-emphasis">{{ plaza.operator }}</span>
              </li>
            </ul>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Quién no paga -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Quién no paga</h2>
      <p class="section-intro mb-5">
        Las exoneraciones generales valen en cualquier peaje del país y salen de los arts. 19 y 20
        del Reglamento.
      </p>
      <ul class="plain-list mb-8">
        <li v-for="exemption in TOLL_EXEMPTIONS" :key="exemption.who">
          {{ exemption.who }}
          <span class="text-caption text-medium-emphasis">({{ exemption.article }})</span>
        </li>
      </ul>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">Y siete exoneraciones por dónde vivís</h3>
      <p class="section-intro mb-5">
        Cada una vale en un solo puesto y depende de la residencia permanente. Hay que pedirlas y
        hay que tener cuenta de Telepeaje: sin saldo o sin medio de pago asociado, el paso se manda
        a cobrar al SUCIVE al valor de la tarifa en efectivo.
      </p>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th class="text-left">Peaje</th>
            <th class="text-left">Quién queda exonerado</th>
            <th class="text-left">Art.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="exemption in TOLL_LOCAL_EXEMPTIONS" :key="exemption.plaza">
            <td data-label="Peaje" class="font-weight-bold">{{ exemption.plaza }}</td>
            <td data-label="Quién queda exonerado">{{ exemption.who }}</td>
            <td data-label="Artículo">
              <code>{{ exemption.article }}</code>
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Bonificaciones -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Las bonificaciones</h2>
      <p class="section-intro mb-5">
        Todas exigen lo mismo: acogerse al pago anticipado, o sea tener cuenta de Telepeaje. Y no
        son acumulables — en un mismo puesto cada usuario puede tener sólo uno de los beneficios,
        aunque sí puede tener otro en los demás puestos.
      </p>
      <VTable class="cu-mobile-cards" density="comfortable">
        <thead>
          <tr>
            <th class="text-left">Quién</th>
            <th class="text-right">Bonificación</th>
            <th class="text-left">Art.</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="discount in TOLL_DISCOUNTS" :key="discount.who">
            <td data-label="Quién">
              {{ discount.who }}
              <span v-if="discount.note" class="d-block text-caption text-medium-emphasis">
                {{ discount.note }}
              </span>
            </td>
            <td data-label="Bonificación" class="text-right font-weight-bold">
              {{ discount.pct }} %
            </td>
            <td data-label="Artículo">
              <code>{{ discount.article }}</code>
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="mt-5 mb-0 text-medium-emphasis">
        La zona de bonificación 2 se amplía a las zonas urbana y suburbana de cinco localidades:
        <span v-for="(town, index) in TOLL_DISCOUNT_ZONE_2_TOWNS" :key="town.plaza">
          {{ town.town }} (peaje {{ town.plaza }}){{
            index === TOLL_DISCOUNT_ZONE_2_TOWNS.length - 1 ? '.' : ', '
          }}
        </span>
      </p>
    </section>

    <!-- Multas -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        Evadir sale {{ TOLL_FINE_MULTIPLIER }} veces caro
      </h2>
      <p class="section-intro mb-5">
        No es lo mismo pasar sin pagar que evadir. Lo primero se cobra después por el SUCIVE; lo
        segundo habilita al MTOP a aplicar una multa equivalente a
        {{ TOLL_FINE_MULTIPLIER }} veces «el valor de la tarifa correspondiente», y a
        {{ TOLL_FINE_MULTIPLIER_REPEAT }} veces si se reitera, sin perjuicio del cobro de los daños
        y perjuicios. Sobre la tarifa básica de un auto eso da
        <strong>$ {{ money(car.basicaUyu * TOLL_FINE_MULTIPLIER) }}</strong
        >; qué tarifa toma el ministerio en cada caso no lo precisa la norma, así que la cuenta va
        con su base a la vista y no como importe cerrado. Los casos que la habilitan son cuatro:
      </p>
      <ul class="plain-list">
        <li v-for="item in TOLL_FINE_CASES" :key="item">{{ item }}</li>
      </ul>
    </section>

    <!-- Cuándo cambia -->
    <section class="mb-12">
      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-clock" color="warning" class="mr-3 mt-1" />
          <div>
            <p class="warn-title mb-2">Estas tarifas cambian el 1° de diciembre de 2026</p>
            <p class="mb-0">
              No es una estimación nuestra: la propia página de tarifas del MTOP establece que los
              valores «se actualizarán semestralmente a la hora cero del 1° de junio y el 1° de
              diciembre de cada año». Los importes de acá rigen desde el 5 de junio de 2026 y se
              verificaron contra la fuente el {{ verifiedAt }}. Lo que no cambia con el ajuste son
              los porcentajes de bonificación, las exoneraciones y el multiplicador de la multa, que
              están en el Reglamento y no en el cuadro.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels class="faq-panels" variant="accordion">
        <VExpansionPanel v-for="item in TOLL_FAQ" :key="item.question">
          <VExpansionPanelTitle class="font-weight-medium">
            {{ item.question }}
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ item.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <ul class="sources">
        <li v-for="source in TOLL_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  TOLL_CATEGORIES,
  TOLL_CAR_CATEGORY_ID,
  TOLL_DISCOUNTS,
  TOLL_DISCOUNT_ZONE_2_TOWNS,
  TOLL_EXEMPTIONS,
  TOLL_FAQ,
  TOLL_FINE_CASES,
  TOLL_FINE_MULTIPLIER,
  TOLL_FINE_MULTIPLIER_REPEAT,
  TOLL_LOCAL_EXEMPTIONS,
  TOLL_PLAZAS,
  TOLL_SOURCES,
  TOLL_SUCIVE_DEADLINE_DAYS,
  TOLLS_VERIFIED_AT,
  suciveSurchargePct,
  tollCategory,
  tollPlazasByRoute,
  tollTripCostUyu,
} from '~/utils/tolls'

const localePath = useLocalePath()
const canonicalUrl = 'https://cambio-uruguay.com/peajes-uruguay'

const money = (value: number) =>
  value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const car = TOLL_CATEGORIES.find(category => category.id === TOLL_CAR_CATEGORY_ID)!
const surcharge = Math.round(suciveSurchargePct(car))
const verifiedAt = new Date(`${TOLLS_VERIFIED_AT}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const plazasByRoute = tollPlazasByRoute()

const pickedCategoryId = ref(TOLL_CAR_CATEGORY_ID)
const plazas = ref(2)
const roundTrip = ref(true)

const categoryOptions = TOLL_CATEGORIES.map(category => ({
  value: category.id,
  label: `${category.id} — ${category.vehicles}`,
}))

const tripRows = computed(() => {
  const category = tollCategory(pickedCategoryId.value) ?? car
  const count = Number.isFinite(plazas.value) ? plazas.value : 0
  return [
    {
      payment: 'telepeaje' as const,
      label: 'Con TAG',
      note: 'El TAG se entrega sin costo en cualquier peaje.',
      total: tollTripCostUyu(category, 'telepeaje', count, roundTrip.value),
    },
    {
      payment: 'basica' as const,
      label: 'Pagando en la barrera',
      note: 'La tarifa básica, sin bonificación por pago anticipado.',
      total: tollTripCostUyu(category, 'basica', count, roundTrip.value),
    },
    {
      payment: 'sucive' as const,
      label: 'Cobrado por SUCIVE',
      note: `Modalidad supletoria: ${String(TOLL_SUCIVE_DEADLINE_DAYS)} días para pagar y después recargo mensual.`,
      total: tollTripCostUyu(category, 'sucive', count, roundTrip.value),
    },
  ]
})

const title = 'Peajes en Uruguay: cuánto sale cada uno'
// La descripción arranca por la cifra y no por lo que la página es: medido en este sitio, un
// snippet con el dato corre a ~1,4 % de CTR y uno genérico a 0,03–0,2 % desde la misma posición.
// Entra entera en los 155 caracteres que el SERP publica (`seoDescriptionBudget`).
const description =
  'Un auto paga $ 167 con TAG y $ 214 si el cobro cae al SUCIVE: 28 % más por el mismo paso. Los 15 puestos del MTOP, las 7 categorías y quién no paga.'

defineOgImageComponent('Cambio', {
  title: 'Peajes en Uruguay',
  subtitle: 'Tres precios por el mismo paso, y quién no paga',
  tag: 'PEAJES',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'peajes uruguay, precio peaje uruguay, tarifa peaje 2026, telepeaje uruguay, tag telepeaje sin costo, peaje sucive, cuanto sale el peaje, peajes ruta interbalnearia, las motos pagan peaje, bonificacion peaje 10 km, decreto 119/023, multa por evadir peaje',
    },
  ],
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
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              { '@type': 'ListItem', position: 2, name: 'Peajes en Uruguay', item: canonicalUrl },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: TOLL_FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.lead {
  font-size: 1.1rem;
  line-height: 1.7;
  max-width: 72ch;
  margin-top: 0;
}

.section-intro {
  max-width: 72ch;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.7;
  margin-top: 0;
}

.note-card {
  border: 1px solid rgba(var(--v-theme-info), 0.35);
  background: rgba(var(--v-theme-info), 0.06);
}

.warn-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  background: rgba(var(--v-theme-warning), 0.06);
}

.note-title,
.warn-title {
  font-weight: 700;
  margin-top: 0;
}

.cost-card,
.plaza-card {
  border: 1px solid rgba(var(--v-border-color), 0.16);
}

.plaza-route {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.plaza-list,
.plain-list,
.sources {
  margin-top: 0;
  padding-left: 1.25rem;
}

.plaza-list li,
.plain-list li,
.sources li {
  margin-top: 0.4rem;
}

.faq-panels {
  max-width: 80ch;
}
</style>
