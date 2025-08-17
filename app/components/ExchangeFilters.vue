<template>
  <div>
    <!-- Exchange House and Date Search -->
    <VRow class="mb-4">
      <VCol cols="12" md="6">
        <VAutocomplete
          :model-value="selectedExchangeHouse"
          class="selectExchangeHouse"
          :items="exchangeHouseOptions"
          item-title="text"
          item-value="value"
          :label="$t('searchExchangeHouse')"
          :no-data-text="$t('noExchangeHousesFound')"
          multiple
          clearable
          chips
          closable-chips
          hide-details
          variant="outlined"
          prepend-inner-icon="mdi-magnify"
          @update:model-value="updateSelectedExchangeHouse"
          @click:clear="$emit('clearExchangeHouseFilter')"
        />
      </VCol>
      <VCol cols="12" md="6">
        <div class="d-flex align-center ga-2">
          <VMenu
            :model-value="datePickerMenu"
            :close-on-content-click="false"
            offset-y
            @update:model-value="$emit('update:datePickerMenu', $event)"
          >
            <template #activator="{ props }">
              <VTextField
                v-bind="props"
                class="mb-0"
                :model-value="formatDisplayDate(selectedDate)"
                :label="$t('selectDate')"
                readonly
                hide-details
                variant="outlined"
                prepend-inner-icon="mdi-calendar"
              />
            </template>
            <VDatePicker
              :model-value="selectedDate"
              @update:model-value="handleDateChange"
            />
          </VMenu>
          <VBtn
            class="primary"
            icon
            variant="text"
            color="primary"
            :title="$t('resetDate')"
            @click="$emit('resetDate')"
          >
            <VIcon>mdi-restore</VIcon>
          </VBtn>
        </div>
      </VCol>
    </VRow>

    <!-- Currency and Amount Controls -->
    <VRow class="mb-4">
      <VCol cols="12" md="6" lg="2">
        <VRadioGroup
          :model-value="wantTo"
          hide-details
          @update:model-value="$emit('update:wantTo', $event ? $event : '')"
        >
          <VRadio
            color="blue darken-2"
            :label="$t('wantToSell')"
            value="sell"
          />
          <VRadio color="blue darken-2" :label="$t('wantToBuy')" value="buy" />
        </VRadioGroup>
      </VCol>
      <VCol cols="12" md="6" lg="2">
        <VTextField
          class="d-flex align-center amount_input"
          :model-value="amount"
          type="number"
          variant="underlined"
          :label="(wantTo === 'buy' ? $t('get') : $t('pay')) + ' ' + code"
          hide-details
          @update:model-value="$emit('update:amount', $event)"
        >
          <template #append>
            <VBtn
              size="small"
              icon
              color="primary"
              @click="changeCode(code, codeWith)"
            >
              <VIcon>mdi-cached</VIcon>
            </VBtn>
          </template>
        </VTextField>
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <VSelect
          :model-value="code"
          hide-details
          variant="underlined"
          :items="moneyOptions"
          :label="wantTo === 'buy' ? $t('get') : $t('pay')"
          return-obj
          @update:model-value="$emit('update:code', $event)"
        >
          <template #selection="{ item }">
            <span v-if="item.raw"
              >{{ item.raw.value }} - {{ getTexts(item.raw) }}</span
            >
          </template>
          <template #item="{ props: itemProps, item }">
            <VListItem
              v-if="item.raw.value"
              v-bind="itemProps"
              :title="item.raw.value + ' - ' + getTexts(item.raw)"
            />
          </template>
        </VSelect>
        <VSelect
          :model-value="codeWith"
          class="mt-3"
          hide-details
          variant="underlined"
          :items="moneyOptions"
          :label="wantTo === 'buy' ? $t('pay') : $t('get')"
          @update:model-value="$emit('update:codeWith', $event)"
        >
          <template #selection="{ item }">
            <span v-if="item.raw"
              >{{ item.raw.value }} - {{ getTexts(item.raw) }}</span
            >
          </template>

          <template #item="{ props: itemProps, item }">
            <VListItem
              v-if="item.raw.value"
              v-bind="itemProps"
              :title="item.raw.value + ' - ' + getTexts(item.raw)"
            />
          </template>
        </VSelect>
      </VCol>
      <VCol cols="12" md="6" lg="3">
        <VSelect
          :model-value="location"
          hide-details
          variant="underlined"
          :items="formattedLocations"
          :label="$t('departments')"
          @update:model-value="$emit('update:location', $event)"
        >
          <template #selection="{ item }">
            <span>{{ capitalize(item.value) }}</span>
          </template>
          <template #item="{ item, props: itemProps }">
            <VListItem v-bind="itemProps" :title="capitalize(item.raw.value)" />
          </template>
        </VSelect>
      </VCol>
      <VCol cols="12" md="6" lg="2">
        <div class="mt-lg-3 d-flex flex-wrap ga-2">
          <div>
            <LocationPopup
              ref="locationPopup"
              @geo-location-success="$emit('geoLocationSuccess', $event)"
            />
          </div>
          <VBtn
            :aria-label="$t('deshacerCargaDistancias')"
            :disabled="!latitude"
            color="blue-darken-3"
            @click="$emit('undoDistances')"
          >
            <VIcon>mdi-undo</VIcon>
          </VBtn>
          <VBtn
            :title="$t('resetFilters')"
            color="orange-darken-3"
            @click="$emit('resetAllFilters')"
          >
            <VIcon>mdi-restore</VIcon>
          </VBtn>
        </div>
      </VCol>
    </VRow>

    <!-- Results Info and Checkboxes -->
    <VRow v-if="items && items.length" class="mb-4">
      <VCol class="py-0 my-0 mt-1 mt-md-3" cols="12">
        <span>{{ getText() }}</span
        ><br />
        <VAlert
          v-if="amount"
          class="bg-green-darken-4 mb-0 mt-3"
          type="success"
          density="compact"
        >
          {{ savings }}
        </VAlert>
      </VCol>
    </VRow>

    <VRow class="mb-4">
      <VCol class="pt-0 mb-5" cols="12">
        <div style="gap: 10px" class="d-flex flex-wrap">
          <VCheckbox
            color="primary"
            :model-value="notInterBank"
            :disabled="onlyInterBankDisabled"
            class="mr-md-3"
            hide-details
            :label="$t('hideInterBank')"
            @update:model-value="$emit('update:notInterBank', $event == true)"
          />
          <VCheckbox
            color="primary"
            :model-value="notConditional"
            hide-details
            :label="$t('hideConditional')"
            @update:model-value="$emit('update:notConditional', $event == true)"
          />
          <VCheckbox
            color="primary"
            :model-value="hiddenWidgets"
            hide-details
            :label="$t('hideWidgets')"
            @update:model-value="$emit('update:hiddenWidgets', $event == true)"
          />
        </div>
      </VCol>
    </VRow>
  </div>
</template>

<script setup lang="ts">
interface Props {
  selectedExchangeHouse: any[]
  exchangeHouseOptions: any[]
  datePickerMenu: boolean
  selectedDate: string
  wantTo: string
  amount: number
  code: string
  codeWith: string
  location: string
  latitude: number
  longitude: number
  notInterBank: boolean
  notConditional: boolean
  hiddenWidgets: boolean
  onlyInterBank: string[]
  items: any[]
  savings: string
  moneyOptions: any[]
  formattedLocations: any[]
}

const props = defineProps<Props>()
const { t } = useI18n()

const emit = defineEmits<{
  'update:selectedExchangeHouse': [value: any[]]
  clearExchangeHouseFilter: []
  'update:datePickerMenu': [value: boolean]
  dateChange: [value: string]
  resetDate: []
  'update:wantTo': [value: string]
  'update:amount': [value: string]
  'update:code': [value: string]
  'update:codeWith': [value: string]
  'update:location': [value: string]
  geoLocationSuccess: [value: any]
  undoDistances: []
  resetAllFilters: []
  'update:notInterBank': [value: boolean]
  'update:notConditional': [value: boolean]
  'update:hiddenWidgets': [value: boolean]
}>()

const { locale } = useI18n()

const formatDisplayDate = (dateValue: string | Date) => {
  if (!dateValue) return ''

  // If it's already a string in YYYY-MM-DD format, convert to display format
  if (typeof dateValue === 'string') {
    const date = new Date(dateValue + 'T00:00:00')
    return date.toLocaleDateString('en-CA', {
      timeZone: 'America/Montevideo',
    })
  }

  // If it's a Date object, format it
  if (dateValue instanceof Date) {
    return dateValue.toLocaleDateString('en-CA', {
      timeZone: 'America/Montevideo',
    })
  }

  return dateValue
}

const handleDateChange = (newDate: Date | string) => {
  let formattedDate: string

  if (newDate instanceof Date) {
    // Convert Date object to YYYY-MM-DD format
    formattedDate = newDate.toLocaleDateString('en-CA', {
      timeZone: 'America/Montevideo',
    }) // en-CA gives YYYY-MM-DD format
  } else {
    // If it's already a string, use it as is
    formattedDate = newDate
  }

  // Emit the formatted date string
  emit('dateChange', formattedDate)
}

const getTexts = (data: any) => {
  return t('codes.' + data.value)
}

const capitalize = (entry: string) => {
  let str = entry
  if (entry === 'TODOS') {
    const tr: any = {
      es: 'TODOS',
      en: 'ALL',
      pt: 'TODOS',
    }
    str = tr[locale.value] ?? 'TODOS'
  }
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

const getText = () => {
  if (!props.items.length) return ''
  const m = formatMoney(props.items[0].amount)
  if (props.wantTo === 'buy') {
    const loc: any = {
      es: `Comprar ${props.amount} ${props.code} te costará un total de ${m}.`,
      en: `Buying ${props.amount} ${props.code} will cost you a total of ${m}.`,
      pt: `Comprar ${props.amount} ${props.code} lhe custará um total de ${m}.`,
    }
    return loc[locale.value] ?? loc.es
  } else {
    const loc: any = {
      es: `Te darán ${m} por tus ${props.amount} ${props.code}.`,
      en: `You will receive ${m} for your ${props.amount} ${props.code}.`,
      pt: `Você receberá ${m} por seus ${props.amount} ${props.code}.`,
    }
    return loc[locale.value] ?? loc.es
  }
}

const formatMoney = (number: number) => {
  return number.toLocaleString('es-ES', {
    style: 'currency',
    currency: props.codeWith,
  })
}

const changeCode = (currentCode: string, currentCodeWith: string) => {
  emit('update:code', currentCodeWith)
  emit('update:codeWith', currentCode)
}

const updateSelectedExchangeHouse = (value: any[]) => {
  console.log('Updating selected exchange house:', value)
  emit('update:selectedExchangeHouse', value)
}

// Computed property onlyInterBankDisabled
const onlyInterBankDisabled = computed(() => {
  return props.onlyInterBank.includes(props.code)
})
</script>

<style lang="scss">
.selectExchangeHouse {
  max-width: 100%;
}
.amount_input .v-input__control {
  flex: 1;
}
</style>
