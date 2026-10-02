<template>
  <VContainer class="contribucion py-6" style="max-width: 940px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Contribución inmobiliaria', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Contribución inmobiliaria en Uruguay: quién la paga y cuánto es
    </h1>

    <p class="lead mb-5">
      No es un impuesto nacional: <strong>la fija cada intendencia</strong>, así que hay
      {{ CI_DEPARTAMENTOS_DEL_PAIS }} escalas distintas y ninguna cifra vale para todo el país. Se
      calcula sobre el <strong>valor imponible</strong> que fija Catastro —no sobre lo que vale la
      casa en el mercado— y la paga quien tiene el derecho sobre el padrón. Abajo está la escala de
      {{ CI_DEPARTAMENTO }} del ejercicio {{ CI_EJERCICIO }}, que es la que se pudo contrastar
      contra el documento oficial de la propia intendencia.
    </p>

    <VCard v-if="ventanaAbierta" variant="flat" class="note-card pa-4 pa-md-5 mb-8">
      <div class="d-flex align-start">
        <VIcon icon="mdi-calendar-clock-outline" color="primary" class="mr-3 mt-1" />
        <div>
          <div class="text-overline mb-2">Hay una decisión abierta ahora mismo</div>
          <p class="note-text mb-0">
            Entre el <strong>{{ fecha(CI_VENTANA_OPCION.desde) }}</strong> y el
            <strong>{{ fecha(CI_VENTANA_OPCION.hasta) }}</strong> la Intendencia de Montevideo deja
            elegir entre pagar en <strong>1, 3 o 12 cuotas</strong>. Las doce cuotas mensuales son
            la opción nueva y empiezan a regir en {{ CI_VENTANA_OPCION.rigeDesde }}. En la misma
            ventana se puede registrar el aviso de factura por WhatsApp: las facturas dejan de
            enviarse en papel y pasan a estar sólo por medios electrónicos. Quien no elige, sigue
            con la modalidad que tenía.
          </p>
        </div>
      </div>
    </VCard>

    <!-- Quiénes -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Quiénes son contribuyentes</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        El documento de la intendencia y el artículo A.439 del Texto Ordenado nombran cuatro
        figuras. Con que se dé una alcanza:
      </p>
      <ul class="plain-list mb-4">
        <li v-for="quien in CI_CONTRIBUYENTES" :key="quien">{{ quien }}</li>
      </ul>
      <p class="note-text mb-0">
        El promitente comprador cuenta: alcanza con la
        <strong>promesa inscripta o con fecha cierta</strong>, sin escritura. Y si alquilás, la
        contribución no es tuya —pero la factura viaja acompañada, y eso se explica
        <a href="#tasa-general">más abajo</a>. Qué revisar antes de firmar está en
        <NuxtLink :to="localePath('/primer-alquiler-uruguay')">el primer alquiler</NuxtLink>.
      </p>
    </section>

    <!-- La escala -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">
        La escala de {{ CI_DEPARTAMENTO }}, ejercicio {{ CI_EJERCICIO }}
      </h2>
      <p class="section-intro text-medium-emphasis mb-3">
        La base es el <strong>valor real del padrón (tierra y mejoras)</strong> que fija la
        Dirección Nacional de Catastro. En la factura del ejercicio figura como «valor imponible».
        Dos casas que se venden al mismo precio pueden tener valores imponibles distintos.
      </p>

      <VTable density="comfortable" class="cu-mobile-cards data-table mb-3">
        <thead>
          <tr>
            <th>Valor imponible {{ CI_EJERCICIO }}</th>
            <th class="text-right">Alícuota</th>
            <th class="text-right">
              Si el valor imponible es menor a {{ pesos(CI_TASA_ESPECIAL_TOPE) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tramo in CI_ESCALA_2026" :key="tramo.desde">
            <td :data-label="`Valor imponible ${CI_EJERCICIO}`">
              {{
                tramo.hasta === null
                  ? `${pesos(tramo.desde)} en adelante`
                  : `${pesos(tramo.desde)} a ${pesos(tramo.hasta)}`
              }}
            </td>
            <td data-label="Alícuota" class="text-right font-weight-bold">
              {{ porcentaje(tramo.alicuota) }}
            </td>
            <td data-label="Tasa especial" class="text-right">
              {{ tramo.alicuotaEspecial === null ? '—' : porcentaje(tramo.alicuotaEspecial) }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="table-note text-medium-emphasis mb-4">
        Intendencia de Montevideo, «Cálculo de Contribución Inmobiliaria urbana y suburbana
        {{ CI_EJERCICIO }}». Son los mismos porcentajes del artículo A.439 del Texto Ordenado, pero
        no los mismos montos: la norma los expresa a valores del 1.º de enero de 2022 y aclara que
        no incluyen la variación del IPC posterior. La columna de la derecha es la disposición
        especial del Decreto 38.156, vigente desde el {{ fecha(CI_TASA_ESPECIAL_DESDE) }}: baja la
        primera franja de {{ porcentaje(CI_ESCALA_2026[0]!.alicuota) }} a
        {{ porcentaje(CI_ESCALA_2026[0]!.alicuotaEspecial!) }} y sólo alcanza a los padrones que no
        pasan del segundo tramo.
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mb-2">Se aplica por tramos, no sobre el total</h3>
      <p class="section-intro text-medium-emphasis mb-3">
        Es lo que más se malinterpreta, y el documento oficial lo dice expresamente: cuando el valor
        imponible supera un tramo, la alícuota del tramo siguiente grava
        <strong>sólo la diferencia</strong>, no el total. Un padrón de
        {{ pesos(ejemplo.valorImponible) }} se liquida así:
      </p>
      <VTable density="compact" class="cu-mobile-cards data-table mb-3">
        <thead>
          <tr>
            <th>Tramo</th>
            <th class="text-right">Porción gravada</th>
            <th class="text-right">Alícuota</th>
            <th class="text-right">Impuesto del tramo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(linea, i) in ejemplo.tramos" :key="i">
            <td data-label="Tramo">{{ i + 1 }}.º</td>
            <td data-label="Porción gravada" class="text-right">{{ pesos(linea.baseGravada) }}</td>
            <td data-label="Alícuota" class="text-right">{{ porcentaje(linea.alicuota) }}</td>
            <td data-label="Impuesto del tramo" class="text-right">{{ pesos(linea.importe) }}</td>
          </tr>
          <tr>
            <td data-label="Tramo" class="font-weight-bold">Impuesto de la escala</td>
            <td data-label="Porción gravada" class="text-right">
              {{ pesos(ejemplo.valorImponible) }}
            </td>
            <td data-label="Alícuota" class="text-right">—</td>
            <td data-label="Impuesto del tramo" class="text-right font-weight-bold">
              {{ pesos(ejemplo.impuesto) }}
            </td>
          </tr>
        </tbody>
      </VTable>
      <p class="table-note text-medium-emphasis mb-0">
        Aplicar {{ porcentaje(CI_ESCALA_2026[2]!.alicuota) }} sobre el valor entero daría
        {{ pesos(ejemplo.valorImponible * CI_ESCALA_2026[2]!.alicuota) }}, que es {{ veces }} veces
        el impuesto real de la escala. Esa diferencia es todo el efecto de que la escala sea
        progresiva.
      </p>
    </section>

    <!-- Lo que suma la factura -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Por qué la factura da más que la alícuota</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        Porque la alícuota es sólo el impuesto. Encima van dos adicionales, los dos calculados sobre
        ese mismo importe:
      </p>
      <ul class="plain-list mb-4">
        <li v-for="adicional in CI_ADICIONALES" :key="adicional.nombre">
          <strong>{{ porcentaje(adicional.proporcion, 0) }} — {{ adicional.nombre }}.</strong>
          {{ adicional.destino }}
        </li>
      </ul>
      <p class="note-text mb-0">
        Entre los dos suman <strong>{{ porcentaje(adicionalesTotal, 0) }}</strong> del impuesto
        antes de que entre nada más. Y el propio documento de la intendencia avisa que la factura
        «incluye otros tributos de pago conjunto», uno de los cuales está en la sección siguiente.
      </p>
    </section>

    <!-- Tasa general -->
    <section id="tasa-general" class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">La Tasa General, que no la paga el propietario</h2>
      <p class="section-intro text-medium-emphasis mb-3">
        Viaja en la misma factura y es otro tributo, con otro sujeto pasivo: el artículo A.526 dice
        que la paga <strong>«el ocupante de la respectiva unidad ocupacional»</strong> —o el
        propietario del baldío, y el propietario también en casas que se arriendan por piezas
        separadas—. Es la razón por la que alguien que alquila puede recibir un papel con el nombre
        «contribución» arriba.
      </p>
      <ul class="plain-list mb-4">
        <li>
          Alícuota: <strong>{{ porMil(CI_TASA_GENERAL.alicuota) }}</strong> sobre el aforo del
          inmueble (tierra y mejoras), en todos los casos.
        </li>
        <li>
          Piso: nunca menos de <strong>{{ pesos(CI_TASA_GENERAL.minimoMensual) }} por mes</strong>.
        </li>
        <li>
          Se reduce <strong>{{ porcentaje(CI_TASA_GENERAL.rebajaPorServicioAusente, 0) }}</strong>
          por cada uno de los cuatro servicios departamentales que no se presten en la zona:
          {{ CI_TASA_GENERAL.servicios.join(', ').toLowerCase() }}.
        </li>
      </ul>
      <p class="note-text mb-0">
        Las cuatro rebajas del {{ porcentaje(CI_TASA_GENERAL.rebajaPorServicioAusente, 0) }} son la
        tasa entera: si no se presta ninguno de los cuatro, no queda tasa. El mínimo mensual sólo
        admite las deducciones por falla de servicio.
      </p>
    </section>

    <!-- Cómo se paga -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">En cuántas cuotas y dónde se paga</h2>
      <VTable density="compact" class="cu-mobile-cards data-table mb-3">
        <thead>
          <tr>
            <th>Cuotas</th>
            <th>Qué es</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="opcion in CI_OPCIONES_DE_PAGO" :key="opcion.cuotas">
            <td data-label="Cuotas" class="font-weight-bold">{{ opcion.cuotas }}</td>
            <td data-label="Qué es">{{ opcion.detalle }}</td>
          </tr>
        </tbody>
      </VTable>
      <p class="section-intro text-medium-emphasis mb-3">Dónde:</p>
      <ul class="plain-list mb-4">
        <li v-for="canal in CI_CANALES_DE_PAGO" :key="canal">{{ canal }}</li>
      </ul>
      <p class="note-text mb-2">
        Medios admitidos: {{ CI_MEDIOS.admitidos.join(', ').toLowerCase() }}.
        <strong>{{ CI_MEDIOS.excluido }}</strong>
      </p>
      <p class="note-text mb-0">
        Si sos propietario y alquilás, la contribución es un <strong>gasto deducible</strong> al
        liquidar el IRPF del arrendamiento, junto con el Impuesto de Primaria y la comisión de la
        administradora: la cuenta está en
        <NuxtLink :to="localePath('/impuestos-inversiones-uruguay')"
          >impuestos sobre inversiones y rentas</NuxtLink
        >. Si la deuda ya viene de años, mirá
        <NuxtLink :to="localePath('/prescripcion-de-deudas-con-el-estado-uruguay')"
          >cómo prescriben las deudas con el Estado</NuxtLink
        >.
      </p>
    </section>

    <!-- Lo que no está -->
    <section class="mb-10">
      <VCard variant="flat" class="gap-card pa-4 pa-md-5">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-circle-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo que acá no vas a encontrar</div>
            <p class="note-text mb-2">
              <strong>Un total a pagar.</strong> La tabla de arriba liquida el impuesto de la escala
              con el método que describe el documento oficial, y nada más. La factura suma los dos
              adicionales, la Tasa General —que ni siquiera debe el mismo sujeto— y los otros
              tributos de pago conjunto. El importe exacto lo liquida la Intendencia y se consulta
              por padrón:
              <a
                href="https://tramites.montevideo.gub.uy/tramites-y-tributos/contribucion-inmobiliaria"
                target="_blank"
                rel="noopener noreferrer"
                >mirá tu cuenta en el portal de trámites</a
              >.
            </p>
            <p class="note-text mb-0">
              <strong>La escala de los otros dieciocho departamentos.</strong> Cada intendencia fija
              la suya y cada una la publica por su cuenta. Armar una tabla «nacional» con la de
              Montevideo sería una cifra nuestra disfrazada de dato oficial, así que acá va sólo la
              que se pudo contrastar.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- Edificación inapropiada -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">Si hay obra sin permiso, se cobra encima</h2>
      <p class="section-intro text-medium-emphasis mb-0">
        El Impuesto a la Edificación Inapropiada —el numeral 2.º del mismo artículo 297 de la
        Constitución— grava, entre otros casos, las obras que no tienen permiso de construcción. Y
        se expresa como un porcentaje de la propia contribución: para padrones de valor catastral
        inferior a {{ pesos(CI_EDIFICACION_INAPROPIADA.valorCatastralTope) }}, entre
        {{ porcentaje(CI_EDIFICACION_INAPROPIADA.proporcionMinima, 0) }} y
        {{ porcentaje(CI_EDIFICACION_INAPROPIADA.proporcionMaxima, 0) }} del importe de la
        Contribución Inmobiliaria. El artículo aclara además que pagarlo
        <strong>no da derecho a mantener la situación irregular</strong> ni vale como autorización.
      </p>
    </section>

    <!-- El campo -->
    <section class="mb-10">
      <h2 class="text-h6 font-weight-bold mb-2">El campo es la excepción</h2>
      <p class="section-intro text-medium-emphasis mb-0">
        El mismo numeral 1.º del artículo 297 invierte la regla para la propiedad rural: los
        impuestos sobre el inmueble rural <strong>los fija el Poder Legislativo</strong>, pero su
        recaudación y la totalidad de lo recaudado —salvo los adicionales nacionales— le
        corresponden al Gobierno Departamental. O sea que en el campo la intendencia cobra una
        escala que no escribió. Para la ciudad vale lo contrario, y de ahí salen las
        {{ CI_DEPARTAMENTOS_DEL_PAIS }} escalas.
      </p>
    </section>

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <section class="mt-10">
      <h2 class="text-h6 font-weight-bold mb-2">Fuentes</h2>
      <p class="sources-note text-medium-emphasis mb-3">
        Todo lo de arriba sale de estas páginas, contrastadas el {{ verifiedAt }}. Ninguna cifra de
        esta página es una estimación propia: los importes del ejemplo se calculan con la escala
        oficial y el método que el propio documento de la Intendencia describe.
      </p>
      <ul class="plain-list mb-0">
        <li v-for="source in CI_SOURCES" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  CI_ADICIONALES,
  CI_CANALES_DE_PAGO,
  CI_CONTRIBUYENTES,
  CI_DEPARTAMENTO,
  CI_DEPARTAMENTOS_DEL_PAIS,
  CI_EDIFICACION_INAPROPIADA,
  CI_EJERCICIO,
  CI_ESCALA_2026,
  CI_FAQ,
  CI_MEDIOS,
  CI_OPCIONES_DE_PAGO,
  CI_SOURCES,
  CI_TASA_ESPECIAL_DESDE,
  CI_TASA_ESPECIAL_TOPE,
  CI_TASA_GENERAL,
  CI_VENTANA_OPCION,
  CI_VERIFIED_AT,
  contribucionBase,
  ventanaOpcionAbierta,
} from '~/utils/propertyTax'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const faq = CI_FAQ as unknown as FaqItem[]

/**
 * El ejemplo de la página: un padrón que cruza al tercer tramo, que es donde el efecto de la
 * progresividad se ve. Se calcula, no se escribe a mano, para que no pueda quedar desfasado de la
 * escala si la intendencia publica la del ejercicio siguiente.
 */
const ejemplo = contribucionBase(4_000_000)!

const adicionalesTotal = CI_ADICIONALES.reduce((total, a) => total + a.proporcion, 0)

/** Cuántas veces el impuesto real sería el error de aplicar una sola alícuota al valor entero. */
const veces = (
  (ejemplo.valorImponible * CI_ESCALA_2026[2]!.alicuota) /
  ejemplo.impuesto
).toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** La tarjeta de la ventana se retira sola cuando el plazo vence. */
const ventanaAbierta = ventanaOpcionAbierta(new Date())

const pesos = (n: number): string =>
  n.toLocaleString('es-UY', {
    style: 'currency',
    currency: 'UYU',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

const porcentaje = (n: number, decimales = 2): string =>
  `${(n * 100).toLocaleString('es-UY', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })} %`

const porMil = (n: number): string =>
  `${(n * 1000).toLocaleString('es-UY', { maximumFractionDigits: 2 })} ‰`

const fechaLarga = (iso: string): string =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const fecha = fechaLarga
const verifiedAt = fechaLarga(CI_VERIFIED_AT)

const canonicalUrl = 'https://cambio-uruguay.com/contribucion-inmobiliaria-uruguay'
const title = 'Contribución inmobiliaria 2026: cuánto es'
const description =
  'La fija cada intendencia, no el Estado: en Montevideo 2026 va de 0,25 % a 1,80 % del valor imponible por tramos, y hasta el 15/12 podés pasar a 12 cuotas.'

defineOgImageComponent('Cambio', {
  title: 'Contribución inmobiliaria',
  subtitle: 'Quién la paga, sobre qué valor y en cuántas cuotas',
  tag: 'IMPUESTOS',
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
        'contribucion inmobiliaria uruguay, contribucion inmobiliaria montevideo, contribucion inmobiliaria 2026, como se calcula la contribucion inmobiliaria, alicuota contribucion inmobiliaria, pagar contribucion inmobiliaria montevideo, contribucion inmobiliaria en 12 cuotas, tasa general montevideo, valor imponible catastro, quien paga la contribucion inmobiliaria',
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
                name: 'Contribución inmobiliaria en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: CI_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: CI_SOURCES.map(s => ({
              '@type': 'Legislation',
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
h3 {
  margin-top: 0;
}
</style>
