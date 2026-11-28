<!--
Los dos formularios del directorio de emprendimientos: «Sumá un emprendimiento» (cualquiera sugiere
una cuenta; el job la lee y la clasifica como a las demás) y «Pedir la baja» (la cuenta sale en el
momento). Sin cuenta ni correo: el handle y, al sugerir, una nota opcional.
-->
<template>
  <form class="emp-form" :aria-labelledby="`${id}-title`" novalidate @submit.prevent="submit">
    <h2 :id="`${id}-title`" class="emp-form__title">{{ copy.title }}</h2>
    <p class="emp-form__intro">{{ copy.intro }}</p>
    <div class="emp-form__row">
      <VTextField
        v-model="cuenta"
        :label="copy.label"
        placeholder="@tu.emprendimiento o instagram.com/…"
        density="comfortable"
        variant="outlined"
        hide-details="auto"
        :error-messages="error ? [error] : []"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        class="emp-form__input"
        :readonly="fixedHandle !== null"
      />
      <VBtn
        type="submit"
        :color="mode === 'baja' ? undefined : 'primary'"
        :variant="mode === 'baja' ? 'outlined' : 'flat'"
        size="large"
        :loading="sending"
        :disabled="sending || done"
      >
        {{ copy.button }}
      </VBtn>
    </div>
    <VTextField
      v-if="mode === 'sugerir'"
      v-model="nota"
      label="¿Qué vende? (opcional)"
      density="comfortable"
      variant="outlined"
      hide-details
      maxlength="200"
      class="emp-form__note"
    />
    <!-- Honeypot: una persona no lo ve ni lo llena. -->
    <input
      v-model="website"
      class="emp-form__hp"
      type="text"
      name="website"
      tabindex="-1"
      autocomplete="off"
      aria-hidden="true"
    />
    <p v-if="result" class="emp-form__ok" role="status">
      <VIcon size="18" aria-hidden="true">mdi-check-circle-outline</VIcon>
      <span>{{ result }}</span>
      <NuxtLink v-if="existingHref" :to="existingHref">Ver su ficha</NuxtLink>
    </p>
  </form>
</template>

<script setup lang="ts">
import { EMPRENDIMIENTOS_PATH, handleFromInput } from '~/utils/emprendimientos'

const props = withDefaults(
  defineProps<{ mode?: 'sugerir' | 'baja'; fixedHandle?: string | null }>(),
  {
    mode: 'sugerir',
    fixedHandle: null,
  }
)

const localePath = useLocalePath()
const id = useId()
const cuenta = ref(props.fixedHandle ? `@${props.fixedHandle}` : '')
const nota = ref('')
const website = ref('')
const sending = ref(false)
const done = ref(false)
const error = ref<string | null>(null)
const result = ref<string | null>(null)
const existing = ref<string | null>(null)
const existingHref = computed(() =>
  existing.value ? localePath(`${EMPRENDIMIENTOS_PATH}/cuenta/${existing.value}`) : null
)

const copy = computed(() =>
  props.mode === 'baja'
    ? {
        title: '¿Es tu cuenta y no querés aparecer?',
        intro:
          'Pedí la baja y la sacamos del directorio en el momento. No la volvemos a sumar por ninguna fuente.',
        label: 'Tu cuenta de Instagram',
        button: 'Pedir la baja',
      }
    : {
        title: 'Sumá un emprendimiento',
        intro:
          'Escribí la cuenta de un emprendimiento uruguayo que vende por Instagram, tuyo o de alguien más. La leemos en las próximas horas y, si cumple las condiciones, aparece con su rubro. Es gratis.',
        label: 'Cuenta de Instagram',
        button: 'Sugerir',
      }
)

async function submit() {
  error.value = null
  result.value = null
  existing.value = null
  const handle = handleFromInput(cuenta.value)
  if (!handle) {
    error.value = 'Escribí una cuenta de Instagram, como @tortas.de.ana'
    return
  }
  sending.value = true
  try {
    const url = props.mode === 'baja' ? '/api/emprendimientos/baja' : '/api/emprendimientos/sugerir'
    const res = await $fetch<{ ok: boolean; estado?: string }>(url, {
      method: 'POST',
      body: { cuenta: handle, nota: nota.value, website: website.value },
    })
    done.value = true
    if (props.mode === 'baja') {
      result.value = `Listo: @${handle} ya no aparece en el directorio.`
    } else if (res.estado === 'ya-esta') {
      result.value = `@${handle} ya está en el directorio.`
      existing.value = handle
    } else {
      result.value = `Gracias: vamos a leer @${handle} en las próximas horas.`
    }
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode
    error.value =
      status === 429
        ? 'Mandaste muchos pedidos seguidos. Probá de nuevo más tarde.'
        : status === 400
          ? 'Esa no parece una cuenta de Instagram.'
          : 'No pudimos guardar el pedido. Probá de nuevo en un rato.'
  } finally {
    sending.value = false
  }
}
</script>

<style scoped>
.emp-form {
  display: grid;
  gap: 12px;
  max-width: 640px;
}
@layer vuetify-overrides.cu-reset {
  :where(.emp-form) :where(h2, p) {
    margin: 0;
  }
}
.emp-form__title {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 700;
  line-height: 1.2;
}
.emp-form__intro {
  color: rgba(var(--v-theme-on-surface), 0.76);
  font-size: 0.95rem;
}
.emp-form__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: flex-start;
}
.emp-form__input {
  flex: 1 1 260px;
}
.emp-form__hp {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
.emp-form__ok {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  color: rgb(var(--v-theme-success));
  font-size: 0.95rem;
  font-weight: 600;
}
</style>
