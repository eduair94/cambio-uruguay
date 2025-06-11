declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

declare module 'vue/types/vue' {
  interface Vue {
    $pwaUtils?: {
      isStandalone: boolean
      isPWASupported: boolean
      canInstall(): boolean
      install(): Promise<void>
    }
  }
}

declare module '@nuxt/types' {
  interface Context {
    $pwaUtils?: {
      isStandalone: boolean
      isPWASupported: boolean
      canInstall(): boolean
      install(): Promise<void>
    }
  }

  interface NuxtAppOptions {
    $pwaUtils?: {
      isStandalone: boolean
      isPWASupported: boolean
      canInstall(): boolean
      install(): Promise<void>
    }
  }
}
