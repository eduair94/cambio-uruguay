<template>
  <div class="text-center">
    <VBottomSheet v-model="sheet" persistent inset>
      <VSheet class="text-center py-2 bg-grey-darken-3" height="auto">
        <VBtn variant="text" class="font-weight-bold" color="warning" @click="close">
          No mostrar más
        </VBtn>
        <VBtn variant="text" class="font-weight-bold" color="error" @click="sheet = false">
          Cerrar
        </VBtn>
        <div class="pb-3 d-flex flex-wrap justify-center">
          <span class="mr-2">Síguenos en Twitter:</span>
          <a class="no_link text-white" href="https://twitter.com/cambio_uruguay" target="_blank">
            <span class="mr-2 link_format">https://twitter.com/cambio_uruguay</span>
            <VIcon color="#00acee">mdi-twitter</VIcon>
          </a>
        </div>
        <div class="pb-3 d-flex flex-wrap justify-center">
          <span class="mr-2">Síguenos en LinkedIn:</span>
          <a
            class="no_link text-white"
            href="https://www.linkedin.com/company/cambio-uruguay/"
            target="_blank"
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
import { onBeforeUnmount, onMounted, ref } from 'vue'

const sheet = ref(false)
let timeoutFunction: NodeJS.Timeout | null = null

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
  show()
})

onBeforeUnmount(() => {
  if (timeoutFunction) {
    clearTimeout(timeoutFunction)
  }
})
</script>
