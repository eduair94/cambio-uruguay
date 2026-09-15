<template>
  <VContainer class="py-6">
    <VRow justify="center">
      <VCol cols="12" md="10" lg="9">
        <VCard class="overflow-hidden mb-5" elevation="8">
          <div class="hero pa-6 on-dark">
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              ¿Dónde cobrar un giro del exterior en Uruguay?
            </h1>
            <p class="hero-sub text-body-1 text-grey-lighten-2 mb-3">
              {{ counts.agents }} de las {{ counts.researched }} casas de cambio relevadas declaran
              ser agentes de una red internacional. Acá está cuáles, con la frase y el enlace de
              donde sale cada una.
            </p>
            <div class="d-flex justify-start justify-md-end">
              <ShareButtons text="Dónde cobrar un giro del exterior en Uruguay" />
            </div>
          </div>

          <!-- La respuesta va renderizada en el servidor y arriba de todo: quien busca "dónde cobro
               un giro" necesita un nombre y una dirección, no una explicación de qué es un giro. -->
          <VCardText class="cu-answer pa-5">
            <p class="answer-lead text-body-1 mb-0">
              {{ counts.westernUnion }} casas de cambio uruguayas se declaran agentes de
              <strong>Western Union</strong> y {{ counts.moneyGram }} figura como agente de
              <strong>MoneyGram</strong>. Otras {{ counts.international }} dicen hacer giros o
              remesas internacionales sin nombrar la red, y {{ counts.declines }} aclaran en su
              propia web que <strong>no</strong> los hacen — ese dato también está acá, porque
              ahorra el viaje.
            </p>
            <p class="answer-note text-body-2 text-medium-emphasis mb-0">
              Relevado el <time :datetime="researchedOn">{{ researchedLabel }}</time> sobre el sitio
              propio de cada casa. Las {{ counts.silent }} restantes no dicen nada al respecto, ni
              que sí ni que no, así que no figuran en ninguna lista.
            </p>
          </VCardText>
        </VCard>

        <!-- La aclaración que define qué puede prometer esta página. Va arriba de las listas y no
             en un pie de página: si alguien viene buscando "cuánto cobra Western Union", tiene que
             enterarse antes de recorrer 16 tarjetas. -->
        <VAlert type="info" variant="tonal" class="mb-5" density="comfortable">
          <p class="alert-title text-subtitle-2 font-weight-bold mb-0">
            Acá no vas a encontrar comisiones ni el tipo de cambio del giro
          </p>
          <p class="alert-body text-body-2 mb-0">
            Los fija la red según el corredor, el monto y el momento, y cambian sin aviso: no hay
            ninguna fuente propia que permita publicarlos sin inventarlos. Esta página contesta lo
            que sí es verificable —<em>quién</em> opera el servicio y <em>dónde</em> tiene
            mostrador— y el costo lo confirmás en la casa antes de operar. Si la diferencia que te
            importa es la del cambio de la moneda una vez que cobraste, esa sí está medida en
            <NuxtLink :to="localePath('/mejor-casa-de-cambio')">la comparación de pizarras</NuxtLink
            >.
          </p>
        </VAlert>

        <section v-for="group in groups" :key="group.verdict" class="mb-6">
          <h2 class="group-title text-h6 font-weight-bold mb-1">{{ group.title }}</h2>
          <p class="group-note text-body-2 text-medium-emphasis mb-3">{{ group.note }}</p>

          <VRow dense>
            <VCol v-for="entry in group.entries" :key="entry.code" cols="12" sm="6">
              <VCard class="h-100" variant="outlined">
                <VCardText class="pa-4">
                  <div class="d-flex align-center justify-space-between ga-2 mb-1">
                    <NuxtLink :to="localePath(entry.path)" class="casa-link text-subtitle-1">
                      {{ entry.name }}
                    </NuxtLink>
                    <VChip
                      v-if="entry.network"
                      size="x-small"
                      label
                      variant="tonal"
                      color="primary"
                    >
                      {{ NETWORK_LABELS[entry.network] }}
                    </VChip>
                  </div>
                  <!-- La cita es TEXTUAL del relevamiento, con comillas, para que se lea como lo
                       que es: lo que dijo la casa, no lo que afirma el sitio. -->
                  <blockquote class="casa-quote text-body-2 mb-0">“{{ entry.quote }}”</blockquote>
                  <!-- Sólo la fuente y el hub de la casa (el nombre, arriba). NO se enlaza
                       `/sucursales/:origin`: esa ruta valida el origen contra el padrón de
                       sucursales del BCU y cuatro de estas casas no tienen ninguna ahí, así que
                       cuatro tarjetas de dieciséis ofrecerían un 404. El hub sí resuelve para
                       todas y ya lleva a las sucursales de las que las tienen. -->
                  <p class="casa-links text-body-2 mb-0">
                    <a :href="entry.source" target="_blank" rel="nofollow noopener">
                      Ver la fuente
                    </a>
                  </p>
                </VCardText>
              </VCard>
            </VCol>
          </VRow>
        </section>

        <VCard class="mb-5" variant="tonal">
          <VCardText class="pa-5">
            <h2 class="tips-title text-h6 font-weight-bold mb-0">Antes de ir al mostrador</h2>
            <ul class="tips-list text-body-2 mb-0">
              <li>
                Llamá a la sucursal y confirmá que ese local paga giros. Una casa puede ser agente y
                no operar el servicio en todas sus bocas: la ficha de cada casa lista sus
                sucursales.
              </li>
              <li>
                El giro se cobra en la moneda que definió quien lo envió. Si lo cobrás en dólares y
                los querés en pesos, el cambio es una operación aparte y la hacés donde más te
                convenga, no necesariamente ahí mismo.
              </li>
              <li>
                Que una casa esté regulada por el BCU no dice nada sobre el precio del giro. El
                registro de instituciones del
                <a
                  href="https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx"
                  target="_blank"
                  rel="nofollow noopener"
                  >Banco Central</a
                >
                sirve para verificar que la casa existe y está habilitada, no para comparar costos.
              </li>
            </ul>
          </VCardText>
        </VCard>

        <VCard variant="outlined">
          <VCardText class="pa-5">
            <h2 class="next-title text-h6 font-weight-bold mb-0">Seguir por acá</h2>
            <ul class="next-list text-body-2 mb-0">
              <li>
                <NuxtLink :to="localePath('/casas-de-cambio')"
                  >Directorio de casas de cambio</NuxtLink
                >
                — reputación, servicios y fuentes de cada una.
              </li>
              <li>
                <NuxtLink :to="localePath('/casas-de-cambio-abiertas-fin-de-semana')"
                  >Casas abiertas sábados y domingos</NuxtLink
                >
                — leído del horario que publica cada sucursal.
              </li>
              <li>
                <NuxtLink :to="localePath('/comisiones-de-transferencia-uruguay')"
                  >Comisiones de transferencia entre bancos</NuxtLink
                >
                — la otra vía para recibir plata, cuando llega a una cuenta y no a un mostrador.
              </li>
              <li>
                <NuxtLink :to="localePath('/limite-de-efectivo-uruguay')"
                  >Límites para pagar y cobrar en efectivo</NuxtLink
                >
                — qué montos obliga la ley a canalizar por medios electrónicos.
              </li>
            </ul>
          </VCardText>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
</template>

<script setup lang="ts">
import {
  REMITTANCE_RESEARCHED_ON,
  remittanceCounts,
  remittanceEntries,
  type RemittanceNetwork,
  type RemittanceVerdict,
} from '~/utils/remittanceAgents'

const localePath = useLocalePath()

const canonical = 'https://cambio-uruguay.com/cobrar-giro-del-exterior-uruguay'

const counts = remittanceCounts()
const researchedOn = REMITTANCE_RESEARCHED_ON
const researchedLabel = new Date(`${REMITTANCE_RESEARCHED_ON}T00:00:00Z`).toLocaleDateString(
  'es-UY',
  { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
)

const NETWORK_LABELS: Record<RemittanceNetwork, string> = {
  'western-union': 'Western Union',
  moneygram: 'MoneyGram',
}

/**
 * Los cuatro grupos, en orden de utilidad para quien tiene un giro esperándolo.
 *
 * `archivado` va último y separado a propósito: Cambio Argentino ofrecía Western
 * Union según una captura de 2023 de un sitio que ya no está en línea. Mezclarlo
 * con los agentes vigentes convierte un dato viejo en un viaje perdido, que es
 * exactamente el daño que esta página existe para evitar.
 */
const GROUP_SPECS: Array<{ verdict: RemittanceVerdict; title: string; note: string }> = [
  {
    verdict: 'agente',
    title: `Agentes de una red internacional (${counts.agents})`,
    note: 'Nombran la red de la que son agentes en su propia web o en su ficha pública.',
  },
  {
    verdict: 'internacional',
    title: `Declaran giros internacionales sin nombrar la red (${counts.international})`,
    note: 'Dicen operar giros o remesas con el exterior, pero no publican con qué red. Preguntá desde qué país te pueden pagar antes de que te lo envíen.',
  },
  {
    verdict: 'no-declara',
    title: `Dicen que no hacen giros internacionales (${counts.declines})`,
    note: 'Su propia web lo descarta. Cambian moneda, pero no es acá donde vas a cobrar lo que te mandaron.',
  },
  {
    verdict: 'archivado',
    title: `Lo ofrecía, sin confirmación vigente (${counts.archived})`,
    note: 'La única evidencia es una captura archivada de un sitio que ya no está en línea: no se puede afirmar que hoy siga pagando giros.',
  },
]

const groups = GROUP_SPECS.map(group => ({ ...group, entries: remittanceEntries(group.verdict) }))

// El layout le agrega " | Cambio Uruguay" (17 caracteres) al title, así que la parte propia se
// queda corta a propósito: con la cifra adentro el conjunto entra en el ancho que Google muestra,
// y una descripción con números corre ~1,4 % de CTR contra 0,03-0,2 % de una genérica desde la
// misma posición. Las cifras salen de la lista, nunca escritas a mano, para que no envejezcan.
const metaTitle = `Dónde cobrar un giro del exterior en Uruguay: ${counts.agents} casas`
const metaDescription = `${counts.westernUnion} casas de cambio uruguayas se declaran agentes de Western Union y ${counts.moneyGram} de MoneyGram; otras ${counts.international} hacen giros del exterior y ${counts.declines} avisan que no. Fuente por casa.`

useSeoMeta({
  title: metaTitle,
  description: metaDescription,
  ogTitle: metaTitle,
  ogDescription: metaDescription,
  ogType: 'website',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
  twitterTitle: metaTitle,
  twitterDescription: metaDescription,
})

useHead(() => ({
  link: [{ key: 'i18n-can', hid: 'i18n-can', rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Cambio Uruguay',
            item: 'https://cambio-uruguay.com',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Casas de cambio',
            item: 'https://cambio-uruguay.com/casas-de-cambio',
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: 'Cobrar un giro del exterior',
            item: canonical,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.hero {
  background: linear-gradient(135deg, #13302a 0%, #1f5c4d 100%);
}

/* Vuetify 4 no anula el margen de los bloques de texto y dentro de una caja con padding el 1em del
   user-agent no colapsa: cada bloque declara el suyo. */
.hero-sub {
  margin-top: 8px;
}

.answer-lead {
  margin-top: 0;
}

.answer-note {
  margin-top: 12px;
}

.alert-title {
  margin-top: 0;
}

.alert-body {
  margin-top: 6px;
}

.group-title {
  margin-top: 0;
}

.group-note {
  margin-top: 4px;
}

.casa-quote {
  margin-top: 8px;
  border-left: 3px solid rgba(var(--v-theme-primary), 0.35);
  padding-left: 10px;
  color: rgba(var(--v-theme-on-surface), 0.82);
}

.casa-links {
  margin-top: 10px;
}

.casa-link {
  font-weight: 600;
}

.tips-title,
.next-title {
  margin-top: 0;
}

.tips-list,
.next-list {
  margin-top: 10px;
  padding-left: 20px;
}

.tips-list li + li,
.next-list li + li {
  margin-top: 8px;
}
</style>
