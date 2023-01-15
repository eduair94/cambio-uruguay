<template>
  <div class="text-center">
    <v-bottom-sheet v-model="sheet" persistent inset>
      <v-sheet class="text-center py-2" height="auto">
        <v-btn text color="warning" @click="close"
          >{{ $t('no_mostrar_nuevo') }}
        </v-btn>
        <v-btn text color="error" @click="sheet = false">
          {{ $t('cerrar') }}
        </v-btn>
        <div class="pb-3">
          {{ $t('join_twitter') }}:
          <a
            class="no_link"
            href="https://twitter.com/cambio_uruguay"
            target="_blank"
          >
            <span class="mr-2">https://twitter.com/cambio_uruguay</span>
            <v-icon>mdi-twitter</v-icon>
          </a>
        </div>
      </v-sheet>
    </v-bottom-sheet>
  </div>
</template>

<script>
export default {
  data() {
    return {
      sheet: false,
    }
  },
  beforeDestroy() {
    if (this.timeoutFunction) {
      clearTimeout(this.timeoutFunction)
    }
  },
  mounted() {
    this.show()
  },
  methods: {
    close() {
      localStorage.setItem('not_show_twitter', true)
      this.sheet = false
    },
    show() {
      if (localStorage.getItem('not_show_twitter')) return
      const randomSeconds = Math.floor(Math.random() * 60) + 20
      const time = randomSeconds * 1000
      this.timeoutFunction = setTimeout(() => {
        this.sheet = true
      }, time)
    },
  },
}
</script>