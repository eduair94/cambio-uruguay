<template>
  <VContainer class="page py-6" style="max-width: 1100px">
    <VBtn :to="localePath('/salud-financiera')" variant="text" size="small" class="px-1 mb-2">
      <VIcon start icon="mdi-arrow-left" /> Salud financiera
    </VBtn>

    <VCard class="hero pa-6 pa-md-8 mb-6" rounded="xl">
      <div class="eyebrow mb-2">Guía práctica · Uruguay</div>
      <h1 class="hero-title mb-3">
        Saldar deudas en Uruguay: cómo negociar, y si conviene ChauDeudas o MiDeuda
      </h1>
      <p class="hero-lead mb-4">
        Conseguiste trabajo y querés ponerte al día para mejorar tu historial. Esta guía te muestra
        qué hacer gratis primero, cómo negociar una quita vos mismo, y qué son realmente las
        plataformas de "solución de deudas" — con datos, no promesas.
      </p>
      <ShareButtons text="Saldar deudas en Uruguay: guía y comparativa de servicios" />
    </VCard>

    <!-- Sections added in Tasks 7 and 8 -->

    <VAlert type="info" variant="tonal" class="mt-8" density="comfortable">
      Información con fines educativos, no asesoramiento financiero ni legal. Cada caso concreto
      requiere un abogado. Verificá siempre los datos en la fuente oficial.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
const localePath = useLocalePath()

const title = 'Saldar deudas en Uruguay: cómo negociar y si conviene ChauDeudas o MiDeuda'
const description =
  'Guía para saldar deudas viejas en Uruguay: verificá prescripción, negociá una quita vos mismo, comparativa honesta de ChauDeudas, MiDeuda y otras, y cómo reconstruir tu historial crediticio.'
const canonicalUrl = 'https://cambio-uruguay.com/saldar-deudas-uruguay'

defineOgImageComponent('Cambio', {
  title: 'Saldar deudas en Uruguay',
  subtitle: 'Negociar, comparar servicios y reconstruir tu historial',
  tag: 'Guía',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: description,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'saldar deudas uruguay, chaudeudas opiniones, mideuda vale la pena, negociar deuda uruguay, quita de deuda, salir de deudas uruguay, prescripción deuda, clearing',
    },
  ],
}))
</script>

<style scoped>
.hero {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.16),
    rgba(var(--v-theme-primary), 0.04)
  );
  border: 1px solid rgba(var(--v-border-color), 0.16);
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}
.hero-title {
  font-size: clamp(1.5rem, 4vw, 2.25rem);
  font-weight: 800;
  line-height: 1.15;
}
.hero-lead {
  font-size: 1.05rem;
  opacity: 0.9;
  max-width: 60ch;
}
.section-heading {
  font-size: 1.35rem;
  font-weight: 750;
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 0.6rem;
  margin: 2rem 0 1rem;
}
.cross-link {
  display: block;
  border: 1px solid rgba(var(--v-border-color), 0.18);
  border-radius: 14px;
  transition:
    transform 0.15s ease,
    border-color 0.15s ease;
}
.cross-link:hover {
  transform: translateY(-2px);
  border-color: rgb(var(--v-theme-primary));
}
</style>
