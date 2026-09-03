<template>
  <v-container fluid class="pa-2 pa-sm-4">
    <h1 class="text-h5 text-sm-h4 mb-2">Descuentos con tarjeta en Uruguay: el mapa por banco</h1>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 70ch">
      Elegí tus tarjetas y mirá en el mapa qué comercios tienen descuento con cada una — Itaú, BROU,
      Santander, BBVA, Scotiabank, OCA, Prex, Mercado Pago, ANDA y Club El País. Los datos son de la
      app <a href="https://bankos.uy" target="_blank" rel="noopener nofollow">Bankos</a>; podés
      agregar todas las tarjetas que quieras y se combinan en un solo mapa.
    </p>

    <!-- Cross-links to the card / bank family -->
    <div class="d-flex flex-wrap ga-2 mb-4">
      <v-chip
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-bank-outline"
        :to="localePath('/mejores-bancos-uruguay')"
      >
        Mejores bancos (tier list)
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-chart-bar"
        :to="localePath('/que-banco-tiene-mas-descuentos-uruguay')"
      >
        ¿Qué banco tiene más descuentos?
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-card-account-details-outline"
        :to="localePath('/tarjetas-de-socio-uruguay')"
      >
        Tarjetas de socio
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
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-receipt-text-outline"
        :to="localePath('/pagar-cuentas-con-tarjeta')"
      >
        Pagar cuentas con tarjeta
      </v-chip>
      <v-chip
        size="small"
        variant="tonal"
        prepend-icon="mdi-star-outline"
        :to="localePath('/mi-lista')"
      >
        Mi lista
      </v-chip>
    </div>

    <!-- Card selector -->
    <v-card variant="outlined" class="mb-4">
      <v-card-item class="pb-1">
        <v-card-title class="text-subtitle-1 d-flex align-center">
          <v-icon start size="small">mdi-credit-card-plus-outline</v-icon>
          Tus tarjetas
          <v-chip
            v-if="selectedCards.length"
            size="x-small"
            class="ml-2"
            color="primary"
            variant="flat"
          >
            {{ selectedCards.length }}
          </v-chip>
          <v-spacer />
          <v-btn variant="text" @click="selectAll">Todas</v-btn>
          <v-btn v-if="selectedCards.length" variant="text" @click="clearAll">Limpiar</v-btn>
        </v-card-title>
      </v-card-item>
      <v-card-text class="pt-1">
        <!-- Este es EL control de la pantalla: sin tarjetas elegidas no hay mapa. Iba como chips
             sin rol ni estado, o sea invisible para un lector y sin forma de saber cuáles están
             puestas. `aria-pressed` y no `role="switch"`: es lo que ya usan otras ocho páginas del
             sitio (mejores-bancos-uruguay, mejores-prestamos-uruguay, ChairFilterPanel) y meter un
             segundo idioma de interruptor en el mismo lugar sólo confunde.

             `role="button"` es obligatorio, no decorativo: Vuetify renderiza el chip como un
             <span> con tabindex y sin rol, y `aria-pressed` sobre algo que no es un botón es ARIA
             inválido — un lector lo ignora y axe lo marca. Verificado en el HTML servido antes de
             agregarlo. Y con el rol viene el teclado: Enter y Espacio tienen que alternar, porque
             un <span> no lo hace solo. -->
        <div v-for="bank in banks" :key="bank.id" class="mb-2">
          <div
            class="d-flex flex-wrap align-center ga-2"
            role="group"
            :aria-label="`Tarjetas de ${bank.name}`"
          >
            <span class="bank-dot" :style="{ background: bank.color }" aria-hidden="true" />
            <span class="text-caption font-weight-medium mr-1" style="min-width: 92px">{{
              bank.name
            }}</span>
            <v-chip
              v-for="card in cardsByBank[bank.id]"
              :key="card.id"
              size="small"
              class="card-chip"
              :variant="selected.has(card.id) ? 'flat' : 'outlined'"
              :color="selected.has(card.id) ? 'primary' : undefined"
              role="button"
              :aria-pressed="selected.has(card.id)"
              :aria-label="`${bank.name} ${cardKindLabel(bank, card)}`"
              @click="toggleCard(card.id)"
              @keydown.enter.prevent="toggleCard(card.id)"
              @keydown.space.prevent="toggleCard(card.id)"
            >
              <v-icon start size="x-small" aria-hidden="true">{{
                card.type === 'credit' ? 'mdi-credit-card' : 'mdi-card-bulleted-outline'
              }}</v-icon>
              {{ cardKindLabel(bank, card) }}
            </v-chip>
          </div>
        </div>
        <!-- La pregunta de alguien parado en la caja no se contesta con un mapa de 4.000 puntos.
             Va arriba de los otros controles porque es el atajo, no una función más. -->
        <div class="mt-3">
          <v-btn
            :to="localePath('/descuentos-con-tarjeta-uruguay/cerca-de-mi')"
            color="primary"
            variant="flat"
            prepend-icon="mdi-crosshairs-gps"
            block
          >
            ¿Tengo descuento acá? Ver los de esta cuadra
          </v-btn>
        </div>

        <div class="d-flex flex-wrap align-center ga-2 mt-3">
          <v-btn
            v-if="isLoggedIn"
            :color="cardsStore.notify ? 'primary' : undefined"
            :variant="cardsStore.notify ? 'flat' : 'outlined'"
            size="small"
            :loading="alertBusy"
            :prepend-icon="cardsStore.notify ? 'mdi-bell-check' : 'mdi-bell-outline'"
            @click="toggleAlerts"
          >
            {{ cardsStore.notify ? 'Avisos activados' : 'Avisarme de descuentos nuevos' }}
          </v-btn>
          <span v-if="alertMsg" class="text-caption">{{ alertMsg }}</span>
        </div>
        <div class="text-caption text-medium-emphasis mt-2 d-flex align-center flex-wrap ga-1">
          <v-icon size="x-small">{{
            isLoggedIn ? 'mdi-cloud-check-outline' : 'mdi-laptop'
          }}</v-icon>
          <span v-if="isLoggedIn">Sincronizado con tu cuenta.</span>
          <span v-else>
            Guardado en este navegador.
            <NuxtLink :to="localePath('/conectar')">Iniciá sesión</NuxtLink> para sincronizarlas en
            tus dispositivos.
          </span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Empty state -->
    <v-alert
      v-if="!selectedBankIds.length"
      type="info"
      variant="tonal"
      density="comfortable"
      class="mb-4"
    >
      Agregá al menos una tarjeta arriba para ver los comercios con descuento en el mapa.
    </v-alert>

    <template v-else>
      <!-- Controls -->
      <v-row dense class="mb-2">
        <v-col cols="12" sm="6" md="4">
          <v-text-field
            v-model="search"
            label="Buscar comercio"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
          />
        </v-col>
        <v-col cols="12" sm="6" md="3">
          <v-select
            v-model="category"
            :items="categoryItems"
            label="Categoría"
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="6" md="2">
          <v-select
            v-model="sortBy"
            :items="sortItems"
            label="Ordenar"
            density="compact"
            variant="outlined"
            hide-details
          />
        </v-col>
        <v-col cols="6" sm="6" md="3" class="d-flex align-center">
          <v-btn color="primary" :loading="locating" block @click="locate">
            <v-icon start>mdi-crosshairs-gps</v-icon>Cerca mío
          </v-btn>
        </v-col>
      </v-row>

      <!-- Quick filters: what applies TODAY, and your own shortlist -->
      <v-row dense class="mb-1">
        <v-col cols="12" class="d-flex flex-wrap align-center ga-2">
          <v-chip
            size="small"
            :variant="onlyToday ? 'flat' : 'outlined'"
            :color="onlyToday ? 'primary' : undefined"
            prepend-icon="mdi-calendar-today"
            @click="onlyToday = !onlyToday"
          >
            Hoy ({{ todayLabel }})
          </v-chip>
          <v-chip
            size="small"
            :variant="onlyFavorites ? 'flat' : 'outlined'"
            :color="onlyFavorites ? 'amber-darken-2' : undefined"
            prepend-icon="mdi-star"
            @click="onlyFavorites = !onlyFavorites"
          >
            Mis favoritos ({{ favoritesStore.favorites.length }})
          </v-chip>
          <v-chip
            size="small"
            :variant="onlyTopRated ? 'flat' : 'outlined'"
            :color="onlyTopRated ? 'primary' : undefined"
            prepend-icon="mdi-thumb-up-outline"
            @click="onlyTopRated = !onlyTopRated"
          >
            Mejor puntuados
          </v-chip>
          <span class="text-caption text-medium-emphasis">
            {{ todayCount }} descuentos aplican hoy
          </span>
        </v-col>
      </v-row>

      <v-row v-if="userLocation" dense class="mb-1">
        <v-col cols="12" md="6" class="d-flex align-center">
          <span class="text-caption mr-2">Radio: {{ radiusKm }} km</span>
          <v-slider
            v-model="radiusKm"
            :min="1"
            :max="30"
            :step="1"
            hide-details
            density="compact"
            aria-label="Radio en km"
          />
        </v-col>
      </v-row>

      <v-alert
        v-if="geoError"
        type="warning"
        density="compact"
        class="mb-2"
        closable
        @click:close="geoError = ''"
      >
        {{ geoError }}
      </v-alert>

      <!-- Source / counts -->
      <div class="d-flex flex-wrap align-center ga-2 mb-2 text-caption text-medium-emphasis">
        <v-chip size="x-small" :color="sourceColor" variant="tonal">
          <v-icon start size="x-small">{{ sourceIcon }}</v-icon
          >{{ sourceLabel }}
        </v-chip>
        <span v-if="pending">Cargando descuentos…</span>
        <span v-else
          >{{ filtered.length }} de {{ items.length }} comercios · {{ brandsCount }} marcas</span
        >
        <span v-if="generatedAt">· actualizado {{ formatDate(generatedAt) }}</span>
      </div>

      <v-row>
        <v-col cols="12" md="8">
          <LocationsMap
            ref="mapRef"
            :branches="mapBranches"
            :user-location="userLocation"
            :radius-km="userLocation ? radiusKm : 0"
            :highlight-id="highlightId"
            :popup-for="popupFor"
            fit-to-markers
            height="70vh"
            @marker-click="onMarkerClick"
          />
        </v-col>
        <v-col cols="12" md="4">
          <v-card variant="outlined" class="ranked-panel">
            <v-card-title class="text-subtitle-1">
              {{ userLocation ? 'Más cercanos' : 'Comercios con descuento' }}
            </v-card-title>
            <v-card-text v-if="pending" class="text-center py-8">
              <v-progress-circular indeterminate color="primary" />
            </v-card-text>
            <v-card-text v-else-if="!filtered.length">
              Ningún comercio coincide con el filtro.
            </v-card-text>
            <v-card-text v-else class="pa-0">
              <v-list density="compact" lines="two">
                <v-list-item
                  v-for="item in visibleList"
                  :key="item.locationId"
                  :active="item.locationId === highlightId"
                  @click="focus(item.locationId)"
                >
                  <template #append>
                    <v-btn
                      :icon="favoritesStore.has(item.locationId) ? 'mdi-star' : 'mdi-star-outline'"
                      :color="favoritesStore.has(item.locationId) ? 'amber-darken-2' : undefined"
                      variant="text"
                      size="small"
                      :aria-label="
                        favoritesStore.has(item.locationId)
                          ? `Quitar ${item.brandName} de favoritos`
                          : `Guardar ${item.brandName} en favoritos`
                      "
                      @click.stop="favoritesStore.toggle(item.locationId)"
                    />
                  </template>
                  <v-list-item-title class="d-flex align-center">
                    {{ item.brandName }}
                    <span v-if="item.rating >= 4.5" class="ml-1 text-amber">★</span>
                    <span
                      v-if="item.distanceKm != null"
                      class="text-caption text-medium-emphasis ml-auto"
                    >
                      {{ item.distanceKm.toFixed(1) }} km
                    </span>
                  </v-list-item-title>
                  <v-list-item-subtitle>
                    <span v-for="b in item.banks" :key="b.bankId" class="mr-1">
                      <v-chip
                        size="x-small"
                        label
                        :style="{ background: b.color, color: readableText(b.color) }"
                        >{{ b.bankName }}</v-chip
                      >
                    </span>
                  </v-list-item-subtitle>
                  <div class="text-caption text-medium-emphasis mt-1">{{ bestDiscount(item) }}</div>
                  <div v-if="dayNote(item)" class="text-caption mt-1">
                    <v-icon size="x-small" class="mr-1">mdi-calendar-clock</v-icon
                    >{{ dayNote(item) }}
                  </div>
                  <div
                    v-if="item.otherBanks?.length"
                    class="text-caption mt-1 d-flex flex-wrap align-center ga-1"
                  >
                    <span class="text-medium-emphasis">También con:</span>
                    <v-chip
                      v-for="ob in item.otherBanks.slice(0, 3)"
                      :key="ob.bankId"
                      size="x-small"
                      variant="outlined"
                      @click.stop="selectBank(ob.bankId)"
                    >
                      + {{ ob.bankName }}
                    </v-chip>
                  </div>
                </v-list-item>
              </v-list>
              <div v-if="filtered.length > visibleList.length" class="text-center pa-2">
                <v-btn size="small" variant="text" @click="listLimit += 200">
                  Ver más ({{ filtered.length - visibleList.length }})
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </template>

    <!-- Marcas con descuento. Server-rendered a propósito: es lo único de esta página que el
         buscador puede leer, porque el mapa depende de una selección que sólo existe en el
         navegador de cada quien. -->
    <section v-if="topBrands.length" class="mt-8">
      <h2 class="text-h6 mb-1">Marcas con descuento en Uruguay</h2>
      <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 70ch">
        Las cadenas con más locales del catálogo. Cada una tiene su página con qué emisor da el
        beneficio, si aplica con débito y el mapa de sus locales.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <NuxtLink
          v-for="brand in topBrands"
          :key="brand.pageSlug!"
          :to="localePath(`/descuentos-con-tarjeta-uruguay/marca/${brand.pageSlug}`)"
          class="brand-pill"
        >
          {{ brand.name }}
          <span class="brand-pill__count">{{ brand.locations }}</span>
        </NuxtLink>
      </div>
    </section>

    <!-- Context / SEO body -->
    <v-card variant="tonal" class="mt-6">
      <v-card-text style="max-width: 75ch">
        <h2 class="text-h6 mb-2">Cómo funciona</h2>
        <p class="text-body-2 mb-2">
          Cada banco negocia sus propios descuentos con los comercios. Al elegir tus tarjetas, el
          mapa muestra únicamente los locales que tienen beneficio con alguno de tus bancos, con el
          detalle de crédito y débito. Si tenés tarjetas de varios bancos, se combinan: vas a ver la
          unión de todos los beneficios.
        </p>
        <p class="text-body-2 mb-2">
          El descuento real depende de la tarjeta puntual, el día y los topes de cada banco.
          Verificá siempre las condiciones vigentes antes de pagar. Para comparar qué banco te
          conviene por reintegros y app, mirá la
          <NuxtLink :to="localePath('/mejores-bancos-uruguay')">tier list de bancos</NuxtLink> y las
          <NuxtLink :to="localePath('/tarjetas-de-credito-uruguay')"
            >tarjetas de crédito por puntos y beneficios</NuxtLink
          >.
        </p>
        <p class="text-caption text-medium-emphasis">
          Datos de Bankos (bankos.uy). Este sitio no está afiliado a Bankos ni a los bancos
          mencionados.
        </p>
      </v-card-text>
    </v-card>

    <!-- Per-bank section: a real <h3> per issuer for brand-intent queries, an accurate blurb,
         and a shortcut that selects that bank's cards (also reachable via ?banco=<id>). -->
    <section class="mt-8">
      <h2 class="text-h6 mb-1">Descuentos por banco</h2>
      <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 75ch">
        Tocá tu banco para ver en el mapa los comercios con descuento. Podés sumar varios y se
        combinan.
      </p>
      <v-row dense>
        <v-col v-for="bank in banks" :key="bank.id" cols="12" sm="6" md="4">
          <v-card :id="`descuentos-${bank.id}`" variant="outlined" class="d-flex flex-column h-100">
            <h3 class="bank-card__title text-subtitle-1 font-weight-medium">
              <span class="bank-dot" :style="{ background: bank.color }" />
              <!-- El título es el link a la página del emisor: es el ancla más fuerte que este
                   hub le puede pasar, y la que un lector busca primero. -->
              <NuxtLink v-if="bankPagePath(bank.id)" :to="bankPagePath(bank.id)">
                Descuentos {{ bank.name }}
              </NuxtLink>
              <span v-else>Descuentos {{ bank.name }}</span>
            </h3>
            <v-card-text class="text-body-2 py-1 flex-grow-1">{{ bankBlurb(bank) }}</v-card-text>
            <v-card-actions class="flex-wrap ga-1 pt-0">
              <v-btn size="small" variant="text" color="primary" @click="selectBank(bank.id)">
                Ver en el mapa
              </v-btn>
              <v-btn
                v-if="bankPagePath(bank.id)"
                size="small"
                variant="text"
                :to="bankPagePath(bank.id)"
              >
                Guía completa
              </v-btn>
            </v-card-actions>
            <!-- La otra mitad de la decisión: el descuento lo da el mapa, pero cuánto acumula y
                 cuánto cuesta la tarjeta lo contestan las fichas del ranking. -->
            <div
              v-if="creditFichaPath(bank.id) || debitFichaPath(bank.id)"
              class="bank-card__fichas d-flex flex-wrap ga-2 px-4 pb-3 text-caption"
            >
              <NuxtLink v-if="creditFichaPath(bank.id)" :to="creditFichaPath(bank.id)">
                <v-icon size="x-small" class="mr-1">mdi-credit-card-multiple-outline</v-icon>
                Tarjeta de crédito {{ bank.name }}
              </NuxtLink>
              <NuxtLink v-if="debitFichaPath(bank.id)" :to="debitFichaPath(bank.id)">
                <v-icon size="x-small" class="mr-1">mdi-credit-card-outline</v-icon>
                Débito {{ bank.name }}
              </NuxtLink>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </section>

    <!-- Rubros: la otra entrada al mismo catálogo. Alguien que busca "descuentos en farmacias" no
         sabe todavía qué banco quiere; esta sección lo lleva a la comparativa del rubro. -->
    <section class="mt-8">
      <h2 class="text-h6 mb-1">Descuentos por rubro</h2>
      <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 75ch">
        Si la pregunta es "¿con qué tarjeta me conviene el supermercado?" y no "¿qué tiene mi
        banco?", entrá por acá: cada rubro compara a todos los emisores por marcas y locales
        adheridos.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <v-chip
          v-for="rubro in BANKOS_CATEGORY_PAGES"
          :key="rubro.slug"
          size="small"
          variant="tonal"
          :prepend-icon="rubro.icon"
          :to="localePath(`/descuentos-con-tarjeta-uruguay/rubro/${rubro.slug}`)"
        >
          {{ rubro.label }}
        </v-chip>
      </div>
    </section>

    <FaqSection
      :items="BANKOS_FAQ"
      heading="Preguntas frecuentes sobre descuentos con tarjeta"
      :expanded="true"
    />
  </v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import LocationsMap from '~/components/map/LocationsMap.vue'
import {
  BANKOS_BANKS,
  BANKOS_CARD_PAGE_ANCHORS,
  BANKOS_CARDS,
  BANKOS_DAY_LABELS,
  appliesOnDay,
  bankIdsForCards,
  bankosTypeFromQuery,
  dayRestrictionLabel,
  isoWeekdayToday,
  type BankosBank,
  type BankosCard,
  type BankosDiscountsResponse,
  type BankosItem,
} from '~/utils/bankos'
import { BANKOS_CATEGORY_PAGES, bankPageForBankId } from '~/utils/bankosPages'
import { useBankosCardsStore } from '~/stores/bankosCards'
import { useBankosFavoritesStore } from '~/stores/bankosFavorites'
import { useAuthStore } from '~/stores/auth'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()
const route = useRoute()

const banks = BANKOS_BANKS
const cardsByBank = computed<Record<string, typeof BANKOS_CARDS>>(() => {
  const m: Record<string, typeof BANKOS_CARDS> = {}
  for (const c of BANKOS_CARDS) (m[c.bankId] ||= []).push(c)
  return m
})

// Selection lives in a pinia store: localStorage for anonymous users, synced to the account on
// login (the firebase.client plugin calls hydrateFromAccount, unioning local + saved). The store
// owns persistence, so the page just reads/mutates it.
const cardsStore = useBankosCardsStore()
const auth = useAuthStore()
const isLoggedIn = computed(() => auth.isLoggedIn)

const selectedCards = computed(() => cardsStore.cards)
const selected = computed(() => new Set(cardsStore.cards))
const selectedBankIds = computed(() => bankIdsForCards(cardsStore.cards))

function toggleCard(id: string) {
  cardsStore.toggle(id)
}
function selectAll() {
  cardsStore.selectAll()
}
function clearAll() {
  cardsStore.clear()
}

/**
 * Add a bank's cards to the selection (per-bank SEO section, `?banco=` and the card pages).
 *
 * `type` acota a crédito o débito: las páginas de tarjetas entran con `?banco=itau&tipo=credito`
 * y no tiene sentido que eso prenda también el débito. Si el banco no tiene ese tipo, se cae al
 * banco entero en vez de dejar el mapa vacío.
 */
function selectBank(bankId: string, type?: BankosCard['type']) {
  const ofBank = BANKOS_CARDS.filter(c => c.bankId === bankId)
  const narrowed = type ? ofBank.filter(c => c.type === type) : []
  const ids = (narrowed.length ? narrowed : ofBank).map(c => c.id)
  if (!ids.length) return
  cardsStore.setCards([...cardsStore.cards, ...ids])
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

/** La página propia de este emisor, o vacío si todavía no tiene una. */
function bankPagePath(bankId: string): string {
  const bankPage = bankPageForBankId(bankId)
  return bankPage ? localePath(`/descuentos-con-tarjeta-uruguay/${bankPage.slug}`) : ''
}

/**
 * Ficha del banco en las páginas de tarjetas (vacío si ese emisor no está rankeado).
 *
 * El ancla la arma el id del catálogo de la otra página, que `BANKOS_CARD_PAGE_ANCHORS` guarda
 * como string suelto para no importar acá dos archivos de datos grandes.
 */
function creditFichaPath(bankId: string): string {
  const id = BANKOS_CARD_PAGE_ANCHORS[bankId]?.credit
  return id ? localePath(`/tarjetas-de-credito-uruguay#programa-${id}`) : ''
}
function debitFichaPath(bankId: string): string {
  const id = BANKOS_CARD_PAGE_ANCHORS[bankId]?.debit
  return id ? localePath(`/tarjetas-de-debito-uruguay#tarjeta-${id}`) : ''
}

/** Accurate one-liner per bank — card types read from the catalog, never invented. */
function bankBlurb(bank: BankosBank): string {
  const types = new Set(BANKOS_CARDS.filter(c => c.bankId === bank.id).map(c => c.type))
  const t =
    types.has('credit') && types.has('debit')
      ? 'crédito y débito'
      : types.has('credit')
        ? 'crédito'
        : 'débito'
  const qr = bank.id === 'mercadopago' ? ' y pagos con QR' : ''
  return `Descuentos de ${bank.name} con tarjeta de ${t}${qr} en comercios adheridos de todo el país. Elegí tus tarjetas ${bank.name} para verlos en el mapa.`
}

// Push alerts: the PWA service worker already carries the FCM handler, so enabling them is
// permission + token + opt-in flag. Account-only, because a push needs a device to send to.
const { enablePush } = usePushNotifications()
const alertBusy = ref(false)
const alertMsg = ref('')

async function toggleAlerts() {
  alertMsg.value = ''
  if (cardsStore.notify) {
    alertBusy.value = true
    await cardsStore.setNotify(false)
    alertBusy.value = false
    alertMsg.value = 'Avisos desactivados.'
    return
  }
  alertBusy.value = true
  try {
    const state = await enablePush()
    if (state === 'granted') {
      await cardsStore.setNotify(true)
      alertMsg.value = 'Te avisamos cuando aparezcan descuentos para tus tarjetas.'
    } else if (state === 'denied') {
      alertMsg.value = 'El navegador bloqueó las notificaciones. Habilitalas y probá de nuevo.'
    } else {
      alertMsg.value = 'Este navegador no soporta notificaciones push.'
    }
  } finally {
    alertBusy.value = false
  }
}

onMounted(() => {
  cardsStore.loadLocal()
  favoritesStore.loadLocal()
  // Shareable deep link: /descuentos-con-tarjeta-uruguay?banco=itau pre-selects a bank, y
  // `&tipo=credito|debito` lo acota a un tipo de tarjeta (así entran las fichas de
  // /tarjetas-de-credito-uruguay y /tarjetas-de-debito-uruguay).
  const q = String(route.query.banco || '').toLowerCase()
  if (q && BANKOS_BANKS.some(b => b.id === q)) selectBank(q, bankosTypeFromQuery(route.query.tipo))
  // ?categoria=Farmacias — the analysis page links straight to a rubro. Applied verbatim: the
  // select only offers categories the loaded data actually has, so an unknown value would
  // silently show nothing; `pendingCategory` waits for the data and clears itself if it never
  // matches.
  const cat = String(route.query.categoria || '').trim()
  if (cat) pendingCategory.value = cat
})

// FAQ — accurate answers, keyword-rich for long-tail queries. FaqBlock emits FAQPage JSON-LD.
const BANKOS_FAQ: FaqItem[] = [
  {
    id: 'que-bancos',
    question: '¿Qué bancos y tarjetas tienen descuentos en Uruguay?',
    answer:
      'El mapa reúne descuentos de Itaú, BROU, Santander, BBVA, Scotiabank, OCA, Prex, Mercado Pago, ANDA y Club El País, con tarjeta de crédito o de débito según el banco. Elegí las tuyas y verás solo los comercios con beneficio.',
  },
  {
    id: 'como-ver',
    question: '¿Cómo veo qué descuentos tengo con mi tarjeta?',
    answer:
      'Seleccioná arriba las tarjetas que tenés. El mapa filtra los comercios adheridos y, al tocar cada uno, muestra el detalle del descuento con crédito y con débito.',
  },
  {
    id: 'credito-debito',
    question: '¿Los descuentos aplican con crédito y con débito?',
    answer:
      'Depende del banco y del comercio. Cada local muestra por separado el beneficio con tarjeta de crédito y con débito, así sabés con cuál conviene pagar.',
  },
  {
    id: 'combinar',
    question: '¿Puedo combinar tarjetas de varios bancos?',
    answer:
      'Sí. Agregá todas las tarjetas que quieras y el mapa combina los beneficios: ves la unión de los descuentos de todos tus bancos en un solo lugar.',
  },
  {
    id: 'mercadopago',
    question: '¿Mercado Pago tiene descuentos con QR?',
    answer:
      'Sí. Seleccioná Mercado Pago para ver los comercios que ofrecen descuento pagando con el QR de Mercado Pago.',
  },
  {
    id: 'cerca',
    question: '¿Cómo encuentro descuentos cerca mío?',
    answer:
      'Tocá "Cerca mío" para usar tu ubicación y ordenar los comercios por distancia. Ajustá el radio en kilómetros para ver solo los beneficios de tu zona.',
  },
  {
    id: 'gratis',
    question: '¿Es gratis? ¿Necesito registrarme?',
    answer:
      'Es gratis y no necesitás registrarte. Si iniciás sesión, tus tarjetas quedan guardadas en tu cuenta y sincronizadas en todos tus dispositivos.',
  },
  {
    id: 'actualizacion',
    question: '¿Cada cuánto se actualizan los descuentos?',
    answer:
      'Los descuentos se leen en vivo y, si la fuente no está disponible, se muestra un respaldo que se actualiza a diario. La fecha de la última actualización aparece junto al mapa.',
  },
  {
    id: 'fuente',
    question: '¿De dónde salen los datos?',
    answer:
      'Los descuentos provienen de la app Bankos (bankos.uy). Este sitio no está afiliado a Bankos ni a los bancos; confirmá siempre las condiciones vigentes antes de pagar.',
  },
]

// --- Data ---
/**
 * La consulta viaja con las TARJETAS, no con los emisores.
 *
 * Con `banks=brou` el servidor devolvía los 1.224 locales de BROU aunque el visitante sólo tuviera
 * la de débito, y sólo 193 dan beneficio con débito (medido contra la API viva el 2026-09-02): el
 * 84 % de lo que veía no le servía, en la única pantalla del sitio cuya pregunta es "¿me sirve mi
 * tarjeta acá?". `selectedBankIds` sigue existiendo para pintar los chips y la leyenda.
 */
/**
 * Cómo se llama el medio de pago de esa tarjeta.
 *
 * No siempre es "Crédito" o "Débito": Mercado Pago se paga con QR y Club El País y Prex son una
 * tarjeta a secas. El catálogo lo dice en `bank.unique`, y el chip venía anunciando "Débito" para
 * los tres — mal para quien lo lee y peor para quien lo escucha.
 */
function cardKindLabel(bank: { unique?: string }, card: { type: string }): string {
  if (bank.unique) return bank.unique
  return card.type === 'credit' ? 'Crédito' : 'Débito'
}

/**
 * Las marcas más grandes con página propia, traídas EN EL SERVIDOR.
 *
 * Por qué existe: el mapa se arma con la selección de tarjetas, que vive en localStorage y en el
 * servidor está vacía, así que su fetch es `server: false` y el HTML servido de esta página no
 * contenía el nombre de una sola marca — medido: Farmashop, TaTa, Ancap, Tienda Inglesa y Las
 * Delicias aparecían cero veces en 287 KB. La página que ES el producto hacía 35 impresiones y 0
 * clics. Esta lectura es chica, no depende de nadie en particular, y le da al buscador (y a quien
 * llega sin tarjetas elegidas) algo que leer y por dónde entrar a las 304 páginas de marca.
 */
const { data: brandIndex } = await useFetch<{
  brands: Array<{ name: string; locations: number; pageSlug: string | null }>
}>('/api/bankos/brands', { key: 'bankos-brands-hub' })

const topBrands = computed(() =>
  (brandIndex.value?.brands || [])
    .filter(b => b.pageSlug)
    .sort((a, b) => b.locations - a.locations)
    .slice(0, 48)
)

const cardsParam = computed(() => [...selectedCards.value].sort().join(','))
const { data, pending, refresh } = await useLazyAsyncData<BankosDiscountsResponse>(
  'bankos-discounts',
  () =>
    cardsParam.value
      ? $fetch('/api/bankos/discounts', { query: { cards: cardsParam.value } })
      : Promise.resolve({
          source: 'cache',
          generatedAt: null,
          banks: [],
          brandsCount: 0,
          locationsCount: 0,
          items: [],
        }),
  { watch: [cardsParam], server: false }
)

const items = computed(() => data.value?.items ?? [])
const brandsCount = computed(() => data.value?.brandsCount ?? 0)
const generatedAt = computed(() => data.value?.generatedAt ?? null)
const source = computed(() => data.value?.source ?? 'cache')

const sourceLabel = computed(() =>
  source.value === 'snapshot' ? 'Datos de respaldo' : 'Datos en vivo'
)
const sourceColor = computed(() => (source.value === 'snapshot' ? 'warning' : 'success'))
const sourceIcon = computed(() =>
  source.value === 'snapshot' ? 'mdi-database-clock-outline' : 'mdi-access-point'
)

// --- Filters ---
const favoritesStore = useBankosFavoritesStore()

// Day-aware filtering: ~200 discounts only run on certain weekdays (verified mapping,
// utils/bankos + tests/unit/bankosDays.test.ts). "Hoy" is the question people actually ask.
const today = ref(isoWeekdayToday())
const todayLabel = computed(() => BANKOS_DAY_LABELS[today.value] ?? '')
const onlyToday = ref(false)
const onlyFavorites = ref(false)
const onlyTopRated = ref(false)

/** Does any of the item's banks apply today? */
function appliesToday(item: BankosItem): boolean {
  return item.banks.some(b => appliesOnDay(b, today.value))
}
/** "solo miércoles, sábados y domingos" for the banks that restrict days; '' when all are daily. */
function dayNote(item: BankosItem): string {
  const notes = new Set<string>()
  for (const b of item.banks) {
    const label = dayRestrictionLabel(b.availableDays)
    if (label) notes.add(item.banks.length > 1 ? `${b.bankName}: ${label}` : label)
  }
  return [...notes].join(' · ')
}

const search = ref('')
const category = ref('__all__')
/** A `?categoria=` value waiting for the catalog to load (categories come from the data). */
const pendingCategory = ref('')
const sortBy = ref<'distance' | 'rating' | 'name'>('rating')
const sortItems = [
  { title: 'Mejor puntuados', value: 'rating' },
  { title: 'Cercanía', value: 'distance' },
  { title: 'Nombre', value: 'name' },
]
const categoryItems = computed(() => {
  const set = new Set<string>()
  for (const it of items.value) for (const c of it.categories) set.add(c)
  return [
    { title: 'Todas las categorías', value: '__all__' },
    ...[...set].sort().map(c => ({ title: c, value: c })),
  ]
})

// Geolocation
const userLocation = ref<{ lat: number; lng: number } | null>(null)
const radiusKm = ref(5)
const locating = ref(false)
const geoError = ref('')
function locate() {
  if (!import.meta.client || !navigator.geolocation) {
    geoError.value = 'Tu navegador no permite geolocalización.'
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    pos => {
      userLocation.value = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      if (sortBy.value === 'rating') sortBy.value = 'distance'
      locating.value = false
    },
    () => {
      geoError.value = 'No pudimos obtener tu ubicación; usamos el centro de Montevideo.'
      userLocation.value = { lat: -34.9011, lng: -56.1645 }
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 8000 }
  )
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

type EnrichedItem = BankosItem & { distanceKm: number | null }

const filtered = computed<EnrichedItem[]>(() => {
  const q = search.value.trim().toLowerCase()
  const cat = category.value
  const here = userLocation.value
  let list: EnrichedItem[] = items.value.map(it => ({
    ...it,
    distanceKm: here ? haversineKm(here, { lat: it.lat, lng: it.lng }) : null,
  }))
  // Search covers the source's own keywords too (≈375 brands carry them), so "farmacia" finds
  // a chain whose brand name never says it.
  if (q)
    list = list.filter(
      it =>
        it.brandName.toLowerCase().includes(q) ||
        it.categories.some(c => c.toLowerCase().includes(q)) ||
        (it.keywords ?? []).some(k => k.toLowerCase().includes(q))
    )
  if (cat !== '__all__') list = list.filter(it => it.categories.includes(cat))
  if (onlyToday.value) list = list.filter(appliesToday)
  if (onlyFavorites.value) list = list.filter(it => favoritesStore.has(it.locationId))
  if (onlyTopRated.value) list = list.filter(it => (it.rating || 0) >= 4.5)
  if (here) list = list.filter(it => it.distanceKm == null || it.distanceKm <= radiusKm.value)
  list.sort((a, b) => {
    if (sortBy.value === 'distance' && here) return (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9)
    if (sortBy.value === 'name') return a.brandName.localeCompare(b.brandName)
    return (b.rating || 0) - (a.rating || 0)
  })
  return list
})

// Apply a deep-linked ?categoria= as soon as the data offers that category.
watch(
  [pendingCategory, categoryItems],
  ([pending, options]) => {
    if (!pending) return
    const match = options.find(o => String(o.value).toLowerCase() === pending.toLowerCase())
    if (match) {
      category.value = String(match.value)
      pendingCategory.value = ''
    }
  },
  { immediate: true }
)

/** How many of the loaded stores have a benefit that applies today (before other filters). */
const todayCount = computed(() => items.value.filter(appliesToday).length)

const listLimit = ref(200)
watch([search, category, sortBy, cardsParam, onlyToday, onlyFavorites, onlyTopRated], () => {
  listLimit.value = 200
})
const visibleList = computed(() => filtered.value.slice(0, listLimit.value))

// Map branches (capped so we never hand Leaflet tens of thousands of markers)
const MAP_CAP = 4000
const mapBranches = computed(() =>
  filtered.value.slice(0, MAP_CAP).map(it => ({
    origin: it.banks[0]?.bankId || 'bankos',
    id: it.locationId,
    name: it.brandName,
    dept: '',
    locality: it.categories[0] || '',
    address: '',
    phone: '',
    hours: '',
    lat: it.lat,
    lng: it.lng,
    mapUrl: `https://www.google.com/maps/search/${encodeURIComponent(it.brandName + ' Uruguay')}`,
    source: 'bankos',
    _item: it,
  }))
)

const highlightId = ref<string | null>(null)
const mapRef = ref<any>(null)
function onMarkerClick(b: any) {
  highlightId.value = b.id
}
function focus(id: string) {
  highlightId.value = id
  mapRef.value?.focusBranch(id)
}

function bestDiscount(it: BankosItem): string {
  for (const b of it.banks) {
    if (b.creditDescription) return `${b.bankName}: ${b.creditDescription}`
    if (b.debitDescription) return `${b.bankName}: ${b.debitDescription}`
  }
  return ''
}

/** Foreground (#fff or near-black) that keeps ≥4.5:1 on an arbitrary brand colour. */
function readableText(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#ffffff'
  const n = m[1]
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const L =
    0.2126 * lin(parseInt(n.slice(0, 2), 16) / 255) +
    0.7152 * lin(parseInt(n.slice(2, 4), 16) / 255) +
    0.0722 * lin(parseInt(n.slice(4, 6), 16) / 255)
  // contrast vs white = 1.05/(L+0.05); vs near-black = (L+0.05)/0.05
  return 1.05 / (L + 0.05) >= (L + 0.05) / 0.05 ? '#ffffff' : '#1a2027'
}

function popupFor(b: any): string {
  const it: BankosItem = b._item
  const esc = (s: string) =>
    String(s).replace(
      /[&<>"]/g,
      c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string
    )
  const cats = it.categories?.length ? `<br><em>${esc(it.categories.join(', '))}</em>` : ''
  const lines = it.banks
    .map(bk => {
      const parts: string[] = []
      if (bk.creditDescription) parts.push(`Crédito: ${esc(bk.creditDescription)}`)
      if (bk.debitDescription) parts.push(`Débito: ${esc(bk.debitDescription)}`)
      const days = dayRestrictionLabel(bk.availableDays)
      if (days) parts.push(`<em>${esc(days)}</em>`)
      // Colour lives in a swatch, never the label text — a light brand colour as text
      // fails contrast on the popup's white background (Club El País, Mercado Pago).
      const swatch = `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${esc(bk.color)};margin-right:4px;vertical-align:middle"></span>`
      return `<div style="margin-top:4px">${swatch}<strong>${esc(bk.bankName)}</strong><br>${parts.join('<br>')}</div>`
    })
    .join('')
  const dir = esc(b.mapUrl)
  const directions = esc(
    `https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lng}&travelmode=driving`
  )
  const others = it.otherBanks?.length
    ? `<div style="margin-top:6px;opacity:.75">También con: ${esc(it.otherBanks.map(o => o.bankName).join(', '))}</div>`
    : ''
  return (
    `<strong>${esc(it.brandName)}</strong>` +
    (it.rating ? ` ★${it.rating.toFixed(1)}` : '') +
    cats +
    lines +
    others +
    `<div style="margin-top:6px"><a href="${directions}" target="_blank" rel="noopener">Cómo llegar →</a>` +
    ` &nbsp;·&nbsp; <a href="${dir}" target="_blank" rel="noopener">Googlear</a></div>`
  )
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-UY', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

// Refresh once when the component mounts if cards were restored from storage.
onMounted(() => {
  if (cardsParam.value) refresh()
})

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/descuentos-con-tarjeta-uruguay'
defineOgImageComponent('Cambio', {
  title: 'Descuentos con tarjeta en Uruguay',
  subtitle: 'El mapa de beneficios por banco',
  tag: 'Descuentos',
})
useSeoMeta({
  title: 'Descuentos con tarjeta en Uruguay: mapa por banco | Cambio Uruguay',
  description:
    'Mapa interactivo de descuentos por banco y tarjeta en Uruguay: Itaú, BROU, Santander, BBVA, Scotiabank, OCA, Prex, Mercado Pago, ANDA y Club El País. Agregá tus tarjetas y encontrá comercios con beneficio cerca tuyo.',
  ogTitle: 'Descuentos con tarjeta en Uruguay: el mapa por banco',
  ogDescription:
    'Elegí tus tarjetas y mirá qué comercios tienen descuento con cada banco, en un mapa por cercanía.',
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
            '@type': 'WebApplication',
            name: 'Mapa de descuentos con tarjeta — Uruguay',
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Web',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'UYU' },
            url: canonicalUrl,
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
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Descuentos con tarjeta',
                item: canonicalUrl,
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.ranked-panel {
  max-height: 70vh;
  overflow-y: auto;
}
.bank-dot {
  display: inline-block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 auto;
}
/* El título del rubro es link: mismo token de link que el resto del sitio, subrayado en hover. */
.bank-card__title a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.bank-card__title a:hover,
.bank-card__title a:focus-visible {
  text-decoration: underline;
}
/* Dot and title on one baseline-centred row — the card-item prepend slot placed the
   dot against the block's top edge instead of the heading's optical centre. */
.bank-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 16px 0;
  line-height: 1.4;
}
/* Los links a las fichas son secundarios frente al CTA del mapa: token de link (no `primary`,
   que en tema oscuro no llega a AA sobre la tarjeta) y subrayado recién en hover. */
.bank-card__fichas a {
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.bank-card__fichas a:hover,
.bank-card__fichas a:focus-visible {
  text-decoration: underline;
}

/* 44 px de alto para el objetivo táctil. A 26 px ya cumplía WCAG 2.5.8 (AA, 24 px); esto es
   2.5.5 (AAA) y sobre todo comodidad real: es el control que hay que tocar dieciséis veces.
   `size="small"` se conserva para no agrandar la tipografía. */
.card-chip {
  min-height: 44px;
}

.brand-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid rgba(var(--v-border-color), 0.3);
  border-radius: 999px;
  font-size: 0.875rem;
  color: rgb(var(--v-theme-link));
  text-decoration: none;
}
.brand-pill:hover {
  border-color: rgb(var(--v-theme-link));
}
.brand-pill__count {
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-variant-numeric: tabular-nums;
}
</style>
