// Vue 2 type overrides for better TypeScript support
declare module 'vue/types/options' {
  import type Vue from 'vue'

  interface ComponentOptions<_V extends Vue> {
    [key: string]: any
  }
}

declare module 'vue/types/vue' {
  interface VueConstructor {
    extend<Data, Methods, Computed, Props>(
      options?: ThisType<Data & Methods & Computed & Props> & object,
    ): VueConstructor<Vue & Data & Methods & Computed & Props>
  }
}

// Force Vue 2 context
declare global {
  const __VUE_VERSION__: 2
}

export { }

