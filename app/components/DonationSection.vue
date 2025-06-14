<template>
  <div class="pt-2">
    <h2 class="font-weight-regular text-body-1">
      {{ fixTitle($t('title')) }}
    </h2>
    <div
      class="d-flex flex-wrap align-center top_container justify-space-between mb-md-4"
    >
      <div
        class="my-3 mb-0 md-md-3 bg-grey-darken-3 pa-3 px-lg-5 text-subtitle-1 d-flex align-center flex-wrap donation_container"
      >
        <span class="mr-3 text_info"
          >{{ $t('info') }}
          <a
            target="_blank"
            class="text-white"
            href="https://www.trustpilot.com/review/cambio-uruguay.com"
          >
            {{ $t('here') }}</a
          ></span
        >
        <div class="d-flex mt-2">
          <a
            target="_blank"
            :aria-label="$t('donarPaypal')"
            class="text-white d-flex mr-4 align-center justify-content-left donation_logo"
            href="https://ko-fi.com/cambio_uruguay"
          >
            <img
              max-width="50px"
              height="50px"
              src="/img/paypal_icon.webp"
              alt="PayPal"
              class="donation_img"
            />
          </a>
          <a
            :aria-label="$t('donarMercadoPago')"
            class="text-white d-flex align-center justify-content-left donation_logo"
            target="_blank"
            href="https://mpago.la/19j46vX"
          >
            <img
              max-width="50px"
              height="50px"
              src="/img/mercadopago_icon.webp"
              alt="Mercado Pago"
              class="donation_img"
            />
          </a>
        </div>
      </div>
      <div class="button_section mb-3 mt-3 mt-md-0"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  day: string
}

const props = defineProps<Props>()

const fixTitle = (text: string) => {
  return text.replace('[day]', props.day)
}
</script>

<style scoped>
.donation_container {
  border-radius: 8px;
}

.text_info {
  font-size: 0.9rem;
}

.donation_logo img {
  transition: transform 0.2s ease;
}

.donation_logo:hover img {
  transform: scale(1.1);
}

.donation_img {
  max-width: 50px;
  height: 50px;
  width: auto;
}
</style>
