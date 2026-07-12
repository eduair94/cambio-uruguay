<template>
  <div class="text-center">
    <VBottomSheet v-model="sheet" persistent inset>
      <VSheet class="text-center py-2 bg-grey-darken-3 join_sheet" height="auto">
        <VBtn variant="text" class="font-weight-bold" color="warning" @click="close">
          No mostrar más
        </VBtn>
        <VBtn variant="text" class="font-weight-bold" color="error" @click="sheet = false">
          Cerrar
        </VBtn>
        <div class="pb-3 d-flex flex-wrap justify-center">
          <span class="mr-2">Síguenos en Twitter:</span>
          <a
            class="no_link"
            href="https://twitter.com/cambio_uruguay"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="mr-2 link_format">https://twitter.com/cambio_uruguay</span>
            <VIcon color="#00acee">mdi-twitter</VIcon>
          </a>
        </div>
        <div class="pb-3 d-flex flex-wrap justify-center">
          <span class="mr-2">Síguenos en LinkedIn:</span>
          <a
            class="no_link"
            href="https://www.linkedin.com/company/cambio-uruguay/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="mr-2 link_format">https://www.linkedin.com/company/cambio-uruguay/</span>
            <VIcon color="#0e76a8">mdi-linkedin</VIcon>
          </a>
        </div>
      </VSheet>
    </VBottomSheet>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const sheet = ref(false)
let timeoutFunction: NodeJS.Timeout | null = null
const { hasDecided } = useConsent()

const close = () => {
  localStorage.setItem('not_show_twitter', 'true')
  sheet.value = false
}

const show = () => {
  if (localStorage.getItem('not_show_twitter')) return
  const randomSeconds = Math.floor(Math.random() * 60) + 20
  const time = randomSeconds * 1000
  timeoutFunction = setTimeout(() => {
    sheet.value = true
  }, time)
}

onMounted(() => {
  if (hasDecided.value) {
    show()
    return
  }
  const stop = watch(hasDecided, decided => {
    if (decided) {
      stop()
      show()
    }
  })
})

onBeforeUnmount(() => {
  if (timeoutFunction) {
    clearTimeout(timeoutFunction)
  }
})
</script>

<style scoped>
/* `bg-grey-darken-3` also forces `color: #fff`; the light-theme remap in
   critical.css only swaps the background, leaving white text on #eef1f5.
   `.v-sheet` is stacked in so this outranks the utility class regardless of
   stylesheet order (both are `!important`). */
.v-sheet.join_sheet,
.join_sheet a {
  color: rgb(var(--v-theme-on-surface)) !important;
}
</style>
