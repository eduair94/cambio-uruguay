<template>
  <v-app dark>
    <v-app-bar :clipped-left="clipped" fixed app>
      <v-img
        max-height="90%"
        contain
        position="left center"
        src="./img/logo.png"
      >
        <template #sources>
          <source srcset="/img/logo.webp" />
        </template>
      </v-img>
      <v-spacer />
    </v-app-bar>
    <v-main>
      <v-container>
        <Nuxt />
      </v-container>
    </v-main>
    <v-footer :fixed="false">
      <span>Cambio Uruguay &copy; {{ new Date().getFullYear() }}</span>
      <v-spacer />
      <span
        >Hecho con <v-icon color="red">mdi-heart</v-icon> por
        <a
          class="white--text"
          href="https://www.linkedin.com/in/eduardo-airaudo/"
          >Eduardo Airaudo</a
        >
        y
        <a
          class="white--text"
          href="https://www.linkedin.com/in/reginascagliotti/"
          >Regina Scagliotti</a
        >
      </span>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  name: 'DefaultLayout',
  data() {
    return {
      clipped: false,
      drawer: false,
      fixed: false,
      items: [
        {
          icon: 'mdi-apps',
          title: 'Welcome',
          to: '/',
        },
        {
          icon: 'mdi-chart-bubble',
          title: 'Inspire',
          to: '/inspire',
        },
      ],
      miniVariant: false,
      right: true,
      rightDrawer: false,
      title: 'Cambio Uruguay - encuentra la mejor cotización',
    }
  },
}
</script>
