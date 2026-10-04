<template>
  <VContainer class="boleto py-6" style="max-width: 940px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Precio del boleto en Montevideo', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Precio del boleto en Montevideo: cuánto sale cada viaje
    </h1>

    <p class="lead mb-5">
      El boleto de <strong>1 hora</strong> cuesta <strong>{{ pesos(unaHoraTarjeta) }}</strong> con
      tarjeta STM y <strong>{{ pesos(unaHoraEfectivo) }}</strong> en efectivo; el de
      <strong>2 horas</strong>, {{ pesos(dosHorasTarjeta) }} y {{ pesos(dosHorasEfectivo) }}. Son
      las tarifas del transporte colectivo urbano que publica la Intendencia de Montevideo, vigentes
      desde el <strong>{{ vigenciaLarga }}</strong
      >.
    </p>

    <VCard variant="flat" class="note-card pa-4 pa-md-5 mb-8">
      <div class="d-flex align-start">
        <VIcon icon="mdi-card-account-details-outline" color="primary" class="mr-3 mt-1" />
        <div>
          <div class="text-overline mb-2">Tres condiciones que vienen con la tarjeta</div>
          <p class="note-text mb-0">
            La tarjeta STM de usuario corriente es <strong>gratuita la primera vez</strong>. Al
            usuario o usuaria frecuente se le devuelve
            <strong>{{ pesos(DEVOLUCION_FRECUENTE) }} por cada boleto</strong>, a mes vencido. Y el
            mínimo de recarga de la tarjeta común es <strong>{{ pesos(RECARGA_MINIMA) }}</strong
            >. Las tres cosas están publicadas al lado de la tabla de tarifas, no en una letra chica
            aparte.
          </p>
        </div>
      </div>
    </VCard>

    <!-- Con tarjeta -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Tarifas con tarjeta STM</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        Dinero electrónico o pospago. El orden es el de la tabla oficial, para que se pueda cotejar
        renglón a renglón.
      </p>

      <VTable density="comfortable" class="cu-mobile-cards data-table mb-3">
        <thead>
          <tr>
            <th>Boleto</th>
            <th class="text-right">Precio</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tarifa in TARIFAS_CON_TARJETA" :key="tarifa.id">
            <td data-label="Boleto">
              {{ tarifa.label }}
              <span v-if="tarifa.nota" class="d-block text-caption text-medium-emphasis">{{
                tarifa.nota
              }}</span>
            </td>
            <td data-label="Precio" class="text-right font-weight-bold">
              {{ pesos(tarifa.precio) }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="table-note text-medium-emphasis mb-0">
        El estudiante, el jubilado y el prepago nominado se cobran sólo con la tarjeta que
        corresponde: la tabla de efectivo no publica precio para
        {{ listar(soloTarjeta.map(t => t.label.toLowerCase())) }}.
      </p>
    </section>

    <!-- En efectivo -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Tarifas en efectivo</h2>
      <VTable density="comfortable" class="cu-mobile-cards data-table mb-3">
        <thead>
          <tr>
            <th>Boleto</th>
            <th class="text-right">Precio</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tarifa in TARIFAS_EN_EFECTIVO" :key="tarifa.id">
            <td data-label="Boleto">
              {{ tarifa.label }}
              <span v-if="tarifa.nota" class="d-block text-caption text-medium-emphasis">{{
                tarifa.nota
              }}</span>
            </td>
            <td data-label="Precio" class="text-right font-weight-bold">
              {{ pesos(tarifa.precio) }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- El sobreprecio -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Cuánto más sale pagar en efectivo</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        Es la única cuenta propia de esta página, y está hecha restando los dos precios publicados
        de cada renglón. En los boletos urbanos el efectivo sale entre
        <strong>{{ porcentaje(sobreprecioMinimoUrbano) }}</strong> y
        <strong>{{ porcentaje(sobreprecioMaximo) }}</strong> más caro por viaje.
      </p>

      <VTable density="comfortable" class="cu-mobile-cards data-table mb-3">
        <thead>
          <tr>
            <th>Boleto</th>
            <th class="text-right">Con tarjeta</th>
            <th class="text-right">En efectivo</th>
            <th class="text-right">Diferencia</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in sobreprecios" :key="fila.id">
            <td data-label="Boleto">{{ fila.label }}</td>
            <td data-label="Con tarjeta" class="text-right">{{ pesos(fila.conTarjeta) }}</td>
            <td data-label="En efectivo" class="text-right">{{ pesos(fila.enEfectivo) }}</td>
            <td data-label="Diferencia" class="text-right font-weight-bold">
              <template v-if="fila.diferencia === 0">Igual</template>
              <template v-else
                >+{{ pesos(fila.diferencia) }}
                <span class="text-caption text-medium-emphasis"
                  >({{ porcentaje(fila.ratio) }})</span
                ></template
              >
            </td>
          </tr>
        </tbody>
      </VTable>

      <p class="note-text mb-3">
        La <strong>combinación metropolitana</strong> es el único boleto de la tabla que cuesta lo
        mismo de las dos formas: {{ pesos(80) }} con tarjeta y {{ pesos(80) }} en efectivo.
      </p>

      <VCard variant="flat" class="note-card pa-4 pa-md-5">
        <div class="d-flex align-start">
          <VIcon icon="mdi-calendar-month-outline" color="primary" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Un mes de ir y volver al trabajo</div>
            <p class="note-text mb-0">
              Con el supuesto declarado de <strong>{{ VIAJES_POR_DIA }} viajes por día</strong> y
              <strong>{{ DIAS_POR_MES }} días por mes</strong>, el boleto de 1 hora son
              <strong>{{ pesos(mesTarjeta) }}</strong> con tarjeta y
              <strong>{{ pesos(mesEfectivo) }}</strong> en efectivo:
              {{ pesos(mesEfectivo - mesTarjeta) }} de diferencia por mes. Es el mismo supuesto que
              usa el sitio en
              <NuxtLink :to="localePath('/vivir-con-el-salario-minimo-uruguay')"
                >vivir con el salario mínimo</NuxtLink
              >, y no incluye trasbordos ni salidas del fin de semana.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- TUS -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Boleto TUS: la devolución del MIDES</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        Para quienes tienen la Tarjeta Uruguay Social del Ministerio de Desarrollo Social, la
        Intendencia devuelve parte del boleto a mes vencido, y cuánto depende del tipo de viaje. Los
        tres valores son los publicados.
      </p>

      <VTable density="comfortable" class="cu-mobile-cards data-table mb-3">
        <thead>
          <tr>
            <th>Tarifa</th>
            <th class="text-right">Valor a bordo</th>
            <th class="text-right">Valor TUS</th>
            <th class="text-right">Devolución</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fila in TARIFAS_TUS" :key="fila.id">
            <td data-label="Tarifa">{{ fila.label }}</td>
            <td data-label="Valor a bordo" class="text-right">{{ pesos(fila.valorABordo) }}</td>
            <td data-label="Valor TUS" class="text-right">{{ pesos(fila.valorTus) }}</td>
            <td data-label="Devolución" class="text-right font-weight-bold">
              {{ pesos(fila.devolucion) }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </section>

    <!-- Costo de las tarjetas -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Qué cuesta la tarjeta, y qué cuesta reponerla</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        La Intendencia publica este precio <em>en viajes comunes</em>, no en pesos: así no queda
        viejo cuando cambia la tarifa. Sube con cada reposición, que es la parte que suele
        sorprender.
      </p>

      <div class="cards-grid mb-3">
        <VCard variant="flat" class="data-table pa-4">
          <div class="text-overline mb-2">Tarjeta STM (usuario corriente)</div>
          <ul class="plain-list mb-0">
            <li v-for="fila in COSTO_TARJETAS.corriente" :key="fila.vez">
              <strong>{{ fila.vez }}:</strong> {{ fila.costo.toLowerCase() }}
            </li>
          </ul>
        </VCard>
        <VCard variant="flat" class="data-table pa-4">
          <div class="text-overline mb-2">
            {{ COSTO_TARJETAS.especialesAplicaA }}
          </div>
          <ul class="plain-list mb-0">
            <li v-for="fila in COSTO_TARJETAS.especiales" :key="fila.vez">
              <strong>{{ fila.vez }}:</strong> {{ fila.costo.toLowerCase() }}
            </li>
          </ul>
        </VCard>
      </div>
    </section>

    <!-- Lo que no está -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Lo que acá no vas a encontrar</h2>
      <VCard variant="flat" class="gap-card pa-4 pa-md-5">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-circle-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <p class="note-text mb-2">
              <strong>Tarifas del interior.</strong> El STM es el sistema de Montevideo y ésta es la
              tabla de su Intendencia. Las urbanas de cada departamento las fija su propia
              intendencia y las interdepartamentales el MTOP: son otras fuentes.
            </p>
            <p class="note-text mb-2">
              <strong>Una tarifa del año que viene.</strong> El ajuste publicado rige desde el
              {{ vigenciaLarga }} y el siguiente no está resuelto. Ajustar estos precios por
              inflación daría una tabla verosímil y sería una cifra nuestra con cara de dato
              oficial.
            </p>
            <p class="note-text mb-0">
              <strong>Qué líneas son «diferencial», resuelto.</strong> La propia página oficial
              enumera dos conjuntos distintos: con tarjeta dice «{{
                DIFERENCIAL_DISCREPANCIA.conTarjeta
              }}» y en efectivo «{{ DIFERENCIAL_DISCREPANCIA.enEfectivo }}», o sea
              {{ listar(DIFERENCIAL_DISCREPANCIA.soloEnEfectivo) }} de más. Reproducimos los dos
              textos como están publicados; antes de subirte a una de ésas, preguntá en el ómnibus.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Relacionadas -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Seguir por acá</h2>
      <ul class="plain-list mb-0">
        <li>
          <NuxtLink :to="localePath('/conviene-auto-moto-o-omnibus-uruguay')"
            >¿Conviene auto, moto u ómnibus?</NuxtLink
          >
          — el mismo boleto puesto al lado de lo que cuesta un auto por mes, según el trayecto.
        </li>
        <li>
          <NuxtLink :to="localePath('/precio-de-la-nafta-uruguay')"
            >Precio de la nafta en Uruguay</NuxtLink
          >
          — el otro costo de moverse, con el histórico de ANCAP.
        </li>
        <li>
          <NuxtLink :to="localePath('/peajes-uruguay')">Peajes de Uruguay</NuxtLink> — los tres
          precios que tiene el mismo paso según cómo se pague.
        </li>
      </ul>
    </section>

    <!-- Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-2">Fuentes</h2>
      <ul class="plain-list mb-2">
        <li v-for="source in BOLETO_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
      <p class="sources-note text-medium-emphasis mb-0">
        Verificado el {{ verifiedAt }}. La página oficial declara su última actualización el
        {{ actualizadaAt }} y la vigencia del ajuste el {{ vigenciaLarga }}: son tres fechas
        distintas y acá se muestran por separado.
      </p>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BOLETO_FUENTE_ACTUALIZADA,
  BOLETO_SOURCES,
  BOLETO_VERIFIED_AT,
  BOLETO_VIGENTE_DESDE,
  COSTO_TARJETAS,
  DEVOLUCION_FRECUENTE,
  DIAS_POR_MES,
  DIFERENCIAL_DISCREPANCIA,
  RECARGA_MINIMA,
  TARIFAS_CON_TARJETA,
  TARIFAS_EN_EFECTIVO,
  TARIFAS_TUS,
  VIAJES_POR_DIA,
  costoMensual,
  sobrepreciosEfectivo,
  soloConTarjeta,
} from '~/utils/boletoMontevideo'

const localePath = useLocalePath()

/** Los centésimos sólo se imprimen cuando el precio los tiene: $52, pero $28,50. */
const pesos = (n: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })

const porcentaje = (n: number): string =>
  `${(n * 100).toLocaleString('es-UY', { maximumFractionDigits: 0 })} %`

const listar = (items: readonly string[]): string =>
  items.length <= 1
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`

const fecha = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = fecha(BOLETO_VERIFIED_AT)
const actualizadaAt = fecha(BOLETO_FUENTE_ACTUALIZADA)
const vigenciaLarga = fecha(BOLETO_VIGENTE_DESDE)

const precio = (tabla: readonly { id: string; precio: number }[], id: string): number =>
  tabla.find(t => t.id === id)!.precio

const unaHoraTarjeta = precio(TARIFAS_CON_TARJETA, 'una-hora')
const unaHoraEfectivo = precio(TARIFAS_EN_EFECTIVO, 'una-hora')
const dosHorasTarjeta = precio(TARIFAS_CON_TARJETA, 'dos-horas')
const dosHorasEfectivo = precio(TARIFAS_EN_EFECTIVO, 'dos-horas')

const mesTarjeta = costoMensual(unaHoraTarjeta)
const mesEfectivo = costoMensual(unaHoraEfectivo)

const sobreprecios = sobrepreciosEfectivo()
const soloTarjeta = soloConTarjeta()

/**
 * La banda que se afirma en el texto. El mínimo se toma entre los boletos con sobreprecio real:
 * la combinación metropolitana cuesta igual de las dos formas, así que incluirla haría decir
 * «entre 0 % y 26 %», que describe otra cosa.
 */
const conSobreprecio = sobreprecios.filter(s => s.diferencia > 0)
const sobreprecioMaximo = Math.max(...conSobreprecio.map(s => s.ratio))
const sobreprecioMinimoUrbano = Math.min(...conSobreprecio.map(s => s.ratio))

const canonicalUrl = 'https://cambio-uruguay.com/precio-del-boleto-montevideo'
const title = 'Precio del boleto en Montevideo: $52'
const description =
  'El boleto de 1 hora sale $52 con tarjeta STM y $64 en efectivo; el de 2 horas, $78 y $97. Tarifas de la Intendencia vigentes desde enero de 2026.'

defineOgImageComponent('Cambio', {
  title: 'Precio del boleto en Montevideo',
  subtitle: 'Tarifas con tarjeta STM, en efectivo, jubilado, estudiante y TUS',
  tag: 'TRANSPORTE',
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
        'precio del boleto montevideo, cuanto sale el boleto en montevideo, boleto 2 horas montevideo, tarifas stm, boleto jubilado montevideo, boleto estudiante montevideo, boleto zonal, boleto centrico, boleto tus mides, tarjeta stm precio, recarga minima stm, combinacion metropolitana',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              {
                '@type': 'ListItem',
                position: 1,
                name: 'Inicio',
                item: 'https://cambio-uruguay.com/',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Precio del boleto en Montevideo',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: BOLETO_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: BOLETO_SOURCES.map(s => ({
              '@type': 'CreativeWork',
              name: s.label,
              url: s.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Vuetify 4 no cero los márgenes de los bloques de texto, y un <p> que sigue a un hermano se come
   cualquier separación menor a 1em: por eso cada bloque declara el suyo. Ver app/AGENTS.md. */
.lead {
  font-size: 1.075rem;
  line-height: 1.6;
  max-width: 72ch;
  margin-top: 0;
}
.section-intro,
.note-text,
.table-note,
.sources-note {
  max-width: 76ch;
  margin-top: 0;
}
.table-note,
.sources-note {
  font-size: 0.85rem;
  line-height: 1.5;
}
.plain-list {
  margin-top: 0;
  padding-left: 1.25rem;
}
.plain-list li {
  margin-bottom: 0.5rem;
  line-height: 1.55;
  max-width: 76ch;
}
.note-card {
  border: 1px solid rgba(var(--v-theme-primary), 0.28);
  border-radius: 12px;
}
.gap-card {
  border: 1px solid rgba(var(--v-theme-warning), 0.35);
  border-radius: 12px;
}
.data-table {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
}
.cards-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: 1fr;
}
@media (min-width: 720px) {
  .cards-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
