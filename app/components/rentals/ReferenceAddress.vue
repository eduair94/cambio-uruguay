<template>
  <div class="rental-reference-address" data-clarity-mask="true">
    <div ref="anchor" class="rental-reference-address__input">
      <div class="rental-address-field" data-testid="rental-reference-address">
        <label :for="listId + '-input'">{{ t('referenceAddress') }}</label>
        <div class="rental-address-field__control">
          <input
            :id="listId + '-input'"
            ref="field"
            :value="address"
            :placeholder="t('referenceAddressExample')"
            type="text"
            maxlength="180"
            autocomplete="off"
            spellcheck="false"
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            :aria-expanded="String(open)"
            :aria-controls="open ? listId : undefined"
            :aria-activedescendant="open && active >= 0 ? listId + '-' + active : undefined"
            :aria-describedby="listId + '-hint'"
            :aria-busy="pending"
            @input="editAddress(($event.target as HTMLInputElement).value)"
            @focus="focusInput"
            @blur="focused = false"
            @keydown="onKeydown"
            @compositionstart="composing = true"
            @compositionend="compositionEnd"
          />
          <button
            v-if="address"
            type="button"
            class="rental-reference-address__clear"
            :aria-label="t('clearAddress')"
            @click="clearAddress"
          >
            <VIcon size="20">mdi-close</VIcon>
          </button>
        </div>
      </div>
      <VBtn
        type="button"
        color="primary"
        variant="tonal"
        :loading="pending"
        :disabled="address.trim().length < 4"
        :aria-label="t('findAddress')"
        :title="t('findAddress')"
        :icon="compact ? 'mdi-magnify' : undefined"
        @click="search(true)"
      >
        <VIcon>mdi-magnify</VIcon>
        <span v-if="!compact" class="rental-reference-address__search-label">{{
          t('findAddress')
        }}</span>
      </VBtn>
    </div>
    <VOverlay
      v-model="open"
      :activator="anchor"
      :open-on-click="false"
      :open-on-focus="false"
      :capture-focus="false"
      :scrim="false"
      location-strategy="connected"
      location="bottom start"
      scroll-strategy="reposition"
      :offset="4"
      :max-height="280"
      :content-props="{ 'data-clarity-mask': 'true' }"
      :transition="false"
    >
      <ul
        :id="listId"
        class="rental-address-options"
        role="listbox"
        :aria-label="t('addressResults')"
      >
        <li
          v-for="(option, index) in options"
          :id="listId + '-' + index"
          :key="option.kind + ':' + option.label"
          role="option"
          :aria-selected="index === active"
          :class="{ 'rental-address-options__active': index === active }"
          @mousedown.prevent
          @click="select(option)"
        >
          <VIcon size="20" aria-hidden="true">{{
            option.kind === 'point' ? 'mdi-map-marker-outline' : 'mdi-sign-direction'
          }}</VIcon>
          <span>
            <span class="rental-address-options__label">{{ option.label }}</span>
            <span v-if="option.kind === 'street'" class="rental-address-options__hint">{{
              t('addressCompleteStreet')
            }}</span>
            <span v-else-if="option.point.suggested" class="rental-address-options__hint">{{
              t('addressSuggestedResult')
            }}</span>
          </span>
        </li>
      </ul>
    </VOverlay>
    <p :id="listId + '-hint'" class="rental-reference-address__hint">
      {{ t('addressAutocomplete') }}
    </p>
    <p v-if="error" role="alert">{{ t(error) }}</p>
    <p v-else role="status" aria-live="polite" aria-atomic="true">
      <template v-if="pending">{{ t('addressSearching') }}</template>
      <template v-else-if="searched && !options.length">{{ t('addressNotFound') }}</template>
      <template v-else-if="open && options.length">{{
        t('addressResultCount', { n: options.length })
      }}</template>
      <template v-else-if="refining">{{ t('addressCompleteStreet') }}</template>
    </p>
    <p class="rental-reference-address__source">
      <a
        href="https://www.gub.uy/infraestructura-datos-espaciales/tramites-y-servicios/servicios/servicio-direcciones-geograficas"
        target="_blank"
        rel="noopener"
        >{{ t('addressSource') }}</a
      >
    </p>
  </div>
</template>

<script setup lang="ts">
import { rentalMessages } from '~/utils/rentalMessages'
import type { RentalGeocodeItem, RentalGeocodeResponse } from '~/utils/rentalGeocode'

type AddressOption =
  | { kind: 'point'; label: string; point: RentalGeocodeItem }
  | { kind: 'street'; label: string; query: string }
defineProps<{ compact?: boolean }>()
const emit = defineEmits<{ select: [point: RentalGeocodeItem]; edit: [] }>()
const { t } = useI18n({ useScope: 'local', messages: rentalMessages })
const listId = 'rental-address-' + useId()
const anchor = ref<HTMLElement | null>(null)
const field = ref<HTMLInputElement | null>(null)
const address = ref('')
const options = ref<AddressOption[]>([])
const pending = ref(false)
const searched = ref(false)
const focused = ref(false)
const composing = ref(false)
const refining = ref(false)
const open = ref(false)
const active = ref(-1)
const error = ref('')
let request: AbortController | null = null
let timer: ReturnType<typeof setTimeout> | undefined
let activeQuery = ''
let completedQuery = ''
function inputElement() {
  return field.value
}
function cancelSearch() {
  clearTimeout(timer)
  request?.abort()
  request = null
  pending.value = false
  options.value = []
  open.value = false
  active.value = -1
  searched.value = false
  error.value = ''
  completedQuery = ''
}
function scheduleSearch() {
  clearTimeout(timer)
  if (address.value.trim().length >= 4 && !composing.value)
    timer = setTimeout(() => void search(), 600)
}
function editAddress(value: string | null) {
  address.value = value ?? ''
  cancelSearch()
  refining.value = false
  emit('edit')
  scheduleSearch()
}
function clearAddress() {
  editAddress('')
  inputElement()?.focus()
}
function compositionEnd() {
  composing.value = false
  scheduleSearch()
}
function focusInput() {
  focused.value = true
  if (options.value.length) open.value = true
}
onBeforeUnmount(cancelSearch)
async function search(immediate = false) {
  clearTimeout(timer)
  const query = address.value.trim()
  if (query.length < 4 || composing.value) return
  if (immediate) inputElement()?.focus()
  if (pending.value && activeQuery === query) return
  if (completedQuery === query && options.value.length) {
    open.value = true
    return
  }
  cancelSearch()
  const current = new AbortController()
  request = current
  activeQuery = query
  pending.value = true
  try {
    const result = await $fetch<RentalGeocodeResponse>('/api/rentals/geocode', {
      query: { q: query, autocomplete: '1' },
      signal: current.signal,
      timeout: 20000,
      retry: 0,
    })
    if (request !== current) return
    options.value = [
      ...result.items.map(point => ({ kind: 'point' as const, label: point.label, point })),
      ...(result.refinements ?? []).map(street => ({ kind: 'street' as const, ...street })),
    ].slice(0, 5)
    completedQuery = query
    searched.value = true
    open.value = focused.value && options.value.length > 0
  } catch (cause: unknown) {
    if (request === current && !current.signal.aborted) {
      const status = (cause as { statusCode?: number }).statusCode
      error.value = status === 429 ? 'addressBusy' : 'addressError'
    }
  } finally {
    if (request === current) pending.value = false
  }
}
async function select(option: AddressOption) {
  cancelSearch()
  if (option.kind === 'point') {
    address.value = option.point.label
    refining.value = false
    emit('select', option.point)
  } else {
    address.value = option.query
    refining.value = true
    emit('edit')
    await nextTick()
    const input = inputElement()
    input?.focus()
    // Keep the native locality and put the caret where a number or second street belongs.
    const comma = option.query.indexOf(',')
    const at = comma < 0 ? option.query.length : comma
    input?.setSelectionRange(at, at)
  }
}
async function onKeydown(event: KeyboardEvent) {
  if (event.isComposing || composing.value) return
  if (event.key === 'Escape' || event.key === 'Tab') {
    clearTimeout(timer)
    if (event.key === 'Escape' && (open.value || pending.value)) {
      event.preventDefault()
      event.stopPropagation()
    }
    if (event.key === 'Escape' && pending.value) cancelSearch()
    if (event.key === 'Tab') focused.value = false
    open.value = false
    active.value = -1
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    if (open.value && active.value >= 0) void select(options.value[active.value]!)
    else void search(true)
    return
  }
  if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return
  if (!options.value.length) {
    if (address.value.trim().length >= 4) {
      event.preventDefault()
      void search(true)
    }
    return
  }
  event.preventDefault()
  open.value = true
  active.value =
    event.key === 'ArrowDown'
      ? (active.value + 1) % options.value.length
      : active.value < 0
        ? options.value.length - 1
        : (active.value - 1 + options.value.length) % options.value.length
  await nextTick()
  document.getElementById(listId + '-' + active.value)?.scrollIntoView({ block: 'nearest' })
}
</script>

<style scoped>
.rental-reference-address {
  margin: 0 0 12px;
}
.rental-reference-address__input {
  display: flex;
  align-items: flex-end;
  gap: 8px;
}
.rental-address-field {
  flex: 1;
  min-width: 0;
}
.rental-address-field label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.875rem;
  line-height: 1.4;
}
.rental-address-field__control {
  display: flex;
  align-items: center;
  min-height: 48px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.55);
  border-radius: 4px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.rental-address-field__control:focus-within {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -1px;
}
.rental-address-field input {
  flex: 1;
  min-width: 0;
  width: 100%;
  height: 46px;
  padding: 10px 12px;
  outline: none;
  border: 0;
  border-radius: 4px;
  appearance: none;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 16px;
}
.rental-address-field input::placeholder {
  color: rgba(var(--v-theme-on-surface), 0.75);
  opacity: 1;
}
.rental-reference-address__input .v-btn {
  min-height: 48px;
  text-transform: none;
  letter-spacing: normal;
}
.rental-reference-address__search-label {
  margin-inline-start: 6px;
}
.rental-reference-address__clear {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  appearance: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
.rental-reference-address p {
  margin: 8px 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
}
.rental-reference-address p:empty {
  display: none;
}
.rental-address-options {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-width: min(560px, calc(100vw - 32px));
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
}
.rental-address-options li {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 48px;
  padding: 12px;
  cursor: pointer;
  overflow-wrap: anywhere;
  font-size: 0.9rem;
  line-height: 1.5;
}
.rental-address-options li > span {
  min-width: 0;
}
.rental-address-options__label,
.rental-address-options__hint {
  display: block;
}
.rental-address-options__hint {
  margin-top: 2px;
  font-size: 0.8rem;
}
.rental-address-options li + li {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.rental-address-options li:hover,
.rental-address-options__active {
  background: rgba(var(--v-theme-primary), 0.1);
}
.rental-reference-address__clear:focus-visible {
  outline: 2px solid rgb(var(--v-theme-link));
  outline-offset: -2px;
}
.rental-reference-address :deep(input) {
  font-size: 16px;
}
@media (max-width: 599px) {
  .rental-reference-address__input > .v-btn {
    min-width: 48px;
    width: 48px;
    padding-inline: 0;
  }
  .rental-reference-address__search-label {
    display: none;
  }
}
</style>
