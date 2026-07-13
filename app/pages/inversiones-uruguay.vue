<template>
  <div class="inversiones-page pb-8">
    <!-- Breadcrumb -->
    <div class="mb-3">
      <VBtn :to="localePath('/herramientas')" variant="text" size="small" class="px-1">
        <VIcon start size="small">mdi-arrow-left</VIcon>
        Herramientas
      </VBtn>
    </div>

    <!-- Header -->
    <VCard class="overflow-hidden mb-4" elevation="8">
      <div class="bg-gradient-inversiones pa-6">
        <div class="d-flex align-center ga-4 flex-wrap">
          <VAvatar size="56" class="d-none d-md-flex bg-white">
            <VIcon size="32" color="primary">mdi-chart-line</VIcon>
          </VAvatar>
          <div>
            <h1 class="text-h5 text-md-h4 font-weight-bold text-white mb-1">
              Dónde invertir en Uruguay: bancos, brokers, renta fija y cripto
            </h1>
            <p class="text-body-1 text-grey-lighten-2 mb-0 inversiones-intro">
              Guía comparativa de cuentas de inversión en bancos, fintech, brokers internacionales,
              renta fija local, fondos de inversión y criptomonedas disponibles desde Uruguay.
              Riesgos, mínimos, comisiones, regulación e impuestos. Datos verificados en julio de
              2026.
            </p>
          </div>
        </div>
        <div class="d-flex justify-start justify-md-end mt-3">
          <ShareButtons
            text="Dónde invertir en Uruguay: guía completa de bancos, brokers, renta fija y cripto"
          />
        </div>
      </div>
    </VCard>

    <!-- Risk framework -->
    <VAlert type="info" variant="tonal" density="comfortable" class="mb-4" icon="mdi-scale-balance">
      Cada opción de esta guía tiene un <strong>riesgo</strong> y una
      <strong>regulación</strong> distintos: <strong>Bajo</strong> (capital e interés pactado sin
      exposición a variaciones de mercado, como el plazo fijo o las Letras del BCU),
      <strong>Medio/Variable</strong> (fondos y carteras de bonos/acciones cuyo valor fluctúa según
      el instrumento elegido) y <strong>Alto</strong> (acciones, ETFs y criptomonedas, cuyo valor
      puede subir o bajar significativamente). En regulación distinguimos entre entidades
      <strong>supervisadas por el BCU</strong> como banco o corredor de bolsa local, entidades
      <strong>reguladas en el exterior</strong> (sin protección del BCU) y proveedores
      <strong>no regulados</strong> localmente (como la mayoría de los exchanges de cripto). Ni
      todos los bancos que ofrecen inversiones están inscriptos como corredores de bolsa ante el
      BCU: revisá la columna "Regulación" de cada fila antes de decidir.
    </VAlert>

    <!-- Comparison groups -->
    <div v-for="group in groups" :key="group.category" class="mb-6">
      <h2 class="text-h6 font-weight-bold mb-3 inversiones-group-title">
        <VIcon start size="small" color="primary">{{ groupIcon(group.category) }}</VIcon>
        {{ group.label }}
      </h2>

      <VCard class="inversiones-card pa-4 pa-sm-6">
        <!-- Desktop: table -->
        <div class="d-none d-md-block">
          <VTable density="comfortable" class="inversiones-table">
            <thead>
              <tr>
                <th>Entidad</th>
                <th>Riesgo</th>
                <th class="text-right">Mín. inversión</th>
                <th>Regulación</th>
                <th>Comisiones</th>
                <th>Sitio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="i in group.items" :key="i.id">
                <td class="font-weight-medium">{{ i.name }}</td>
                <td>{{ riskLabel(i.riskLevel) }}</td>
                <td class="text-right">{{ minInvestmentLabel(i) }}</td>
                <td>
                  <span class="inversiones-note">{{ i.regulationNote }}</span>
                </td>
                <td>
                  <span class="inversiones-note">{{ i.feesNote }}</span>
                </td>
                <td>
                  <a
                    :href="i.website"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inversiones-link"
                  >
                    {{ hostOf(i.website) }}
                  </a>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>

        <!-- Mobile: stacked cards -->
        <div class="d-md-none">
          <div v-for="i in group.items" :key="i.id" class="investment-card">
            <div class="d-flex align-center justify-space-between ga-2 mb-1">
              <span class="text-subtitle-1 font-weight-bold">{{ i.name }}</span>
              <span class="investment-risk">{{ riskLabel(i.riskLevel) }}</span>
            </div>
            <dl class="investment-specs">
              <div>
                <dt>Mín. inversión</dt>
                <dd>{{ minInvestmentLabel(i) }}</dd>
              </div>
              <div>
                <dt>Regulación</dt>
                <dd>{{ regulationBadge(i.regulation) }}</dd>
              </div>
            </dl>
            <p class="text-caption text-grey-lighten-1 mb-1">Regulación:</p>
            <p class="text-body-2 mb-2 inversiones-note">{{ i.regulationNote }}</p>
            <p class="text-caption text-grey-lighten-1 mb-1">Comisiones:</p>
            <p class="text-body-2 mb-2 inversiones-note">{{ i.feesNote }}</p>
            <a
              :href="i.website"
              target="_blank"
              rel="noopener noreferrer"
              class="inversiones-link text-caption"
            >
              {{ hostOf(i.website) }}
            </a>
          </div>
        </div>
      </VCard>
    </div>

    <!-- AFAP editorial section -->
    <VCard variant="flat" class="inversiones-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 inversiones-group-title">
        <VIcon start size="small" color="primary">mdi-piggy-bank-outline</VIcon>
        AFAP: el ahorro previsional obligatorio
      </h2>
      <p class="text-body-2 mb-3">
        Además de las inversiones voluntarias de esta guía, Uruguay tiene un pilar de ahorro
        previsional obligatorio administrado por AFAPs (Administradoras de Fondos de Ahorro
        Previsional). Hay <strong>4 AFAP habilitadas</strong>: República AFAP (estatal), AFAP SURA,
        AFAP Itaú (antes "Unión Capital AFAP") e Integración AFAP.
      </p>
      <p class="text-body-2 mb-3">
        Bajo el régimen vigente desde la reforma de la Ley 20.130 (2023), quienes ingresan al
        mercado laboral aportan de forma obligatoria a BPS y a una AFAP desde el primer peso, sin la
        antigua opción de exoneración para ingresos bajos. Podés elegir libremente tu AFAP dentro de
        los primeros 3 meses de aportación; si no elegís, BPS te asigna una de oficio. Para
        cambiarte de AFAP (traspaso) se requiere un mínimo de 6 meses de permanencia en la
        administradora actual antes de poder transferirte de nuevo.
      </p>
      <p class="text-body-2 mb-0">
        Los rendimientos de los fondos de las AFAP están exonerados de impuestos. Para el detalle de
        porcentajes de aporte y bandas salariales vigentes, consultá directamente
        <a
          href="https://www.bps.gub.uy"
          target="_blank"
          rel="noopener noreferrer"
          class="inversiones-link"
          >bps.gub.uy</a
        >
        o el sitio de tu AFAP, ya que las cifras se indexan cada año.
      </p>
    </VCard>

    <!-- Inmobiliario editorial section -->
    <VCard variant="flat" class="inversiones-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 inversiones-group-title">
        <VIcon start size="small" color="primary">mdi-home-city-outline</VIcon>
        Inmobiliario
      </h2>
      <p class="text-body-2 mb-3">
        Invertir en un inmueble para alquilar es una alternativa tradicional en Uruguay, pero
        requiere un capital inicial considerablemente mayor que cualquier otra opción de esta guía
        (compra del inmueble, impuestos de compraventa, escribano y gastos de mantenimiento), además
        de menor liquidez: vender un inmueble puede tomar meses.
      </p>
      <p class="text-body-2 mb-0">
        No encontramos evidencia de que exista actualmente una plataforma de
        <em>crowdfunding</em> inmobiliario específica de Uruguay en funcionamiento; si estás
        evaluando una plataforma que promete fraccionar la inversión en inmuebles, verificá primero
        su regulación y trayectoria antes de destinarle dinero.
      </p>
    </VCard>

    <!-- Impuestos editorial section -->
    <VCard variant="flat" class="inversiones-section mb-6 pa-5 pa-sm-6">
      <h2 class="text-h6 font-weight-bold mb-3 inversiones-group-title">
        <VIcon start size="small" color="primary">mdi-file-percent-outline</VIcon>
        Impuestos sobre las inversiones
      </h2>
      <p class="text-body-2 mb-3">
        Los residentes fiscales uruguayos pagan
        <strong>IRPF Categoría I sobre las rentas de capital</strong> (intereses, dividendos,
        alquileres y ganancias de capital) a una tasa general del <strong>12%</strong> (los
        dividendos de fuente uruguaya, al 7%). Los depósitos a plazo tienen tasas reducidas según
        moneda y plazo: en <strong>pesos</strong> no indexados, 5,5% (hasta 1 año), 2,5% (de 1 a 3
        años) y 0,5% (más de 3 años); en <strong>UI</strong>, 10%, 7% y 5%; en
        <strong>moneda extranjera</strong>, 12% hasta 1 año, 12% de 1 a 3 años y 7% a más de 3 años.
        Al <strong>vender valores</strong>, el régimen por defecto es el <strong>real</strong>: 12%
        sobre la ganancia (precio de venta menos costo fiscal actualizado). La base ficta del 20%
        del precio (≈ 2,4% efectivo) <strong>no es la regla general</strong>: es obligatoria solo
        cuando no se puede probar el costo, y opcional en casos puntuales (bienes anteriores a la
        Ley 18.083 y, desde 2026, bienes en el exterior).
      </p>
      <p class="text-body-2 mb-3">
        Desde el 1° de enero de 2026, la Ley de Presupuesto (20.446) extendió el IRPF a las rentas y
        <strong>ganancias de capital de fuente extranjera</strong> que antes no estaban gravadas
        —relevante para quienes invierten con brokers internacionales como eToro o XTB—. La
        <strong>tasa es 12%</strong>. El <strong>8% no es una tasa</strong>: es una
        <strong>retención reducida</strong> que solo puede aplicar una entidad uruguaya que
        intermedie y además <strong>ejerza la custodia</strong> de esos activos (un bróker/custodio
        local), y es definitiva únicamente <strong>si el contribuyente opta</strong> por tomarla
        como tal. Operando directo con un bróker del exterior
        <strong>no hay retención uruguaya</strong>: corresponden
        <strong>anticipos semestrales</strong> al 12% o declaración jurada (Formulario 1101). El
        dato más valioso de la reforma es el <strong>step-up al 31/12/2025</strong>: para activos
        que coticen en bolsas de reconocido prestigio y hayas comprado antes de esa fecha, el costo
        fiscal es su <strong>cotización al 31/12/2025</strong>, así que toda la apreciación anterior
        a 2026 queda fuera del impuesto. Los no residentes tributan IRNR, generalmente también al
        12%.
      </p>
      <p class="text-body-2 mb-0">
        Existe una <strong>exoneración confirmada</strong>: la deuda pública uruguaya (Bonos del
        Tesoro, Letras de Tesorería, Letras de Regulación Monetaria del BCU y Bonos Globales en UI)
        está exenta de IRPF y de Impuesto al Patrimonio, tanto para residentes como para no
        residentes —y no solo el interés: el Título 7, art. 38 lit. A exonera también la ganancia de
        capital por transferirlos—. Los rendimientos de los fondos de las AFAP también están
        exonerados. La <strong>cripto</strong>, en cambio, es una zona gris: no hay norma tributaria
        específica (la Ley 20.345 regula a los proveedores, no la tributación) y ni el Decreto
        95/026 ni la Resolución DGI 1517/2026 la mencionan, así que
        <strong>no publicamos un porcentaje</strong> para ella. Estas reglas tienen matices por
        instrumento y situación personal: <strong>consultá siempre con un contador</strong> antes de
        declarar.
      </p>
      <VBtn
        :to="localePath('/impuestos-inversiones-uruguay')"
        variant="text"
        color="primary"
        class="px-0 mt-3"
      >
        <VIcon start size="small">mdi-file-percent-outline</VIcon>
        Ver la guía completa: impuestos sobre inversiones en Uruguay
      </VBtn>
    </VCard>

    <!-- Disclaimer -->
    <VAlert
      type="warning"
      variant="tonal"
      density="comfortable"
      class="mt-4"
      icon="mdi-alert-outline"
    >
      Esta guía es
      <strong>informativa y no constituye asesoramiento financiero, legal ni tributario</strong>; no
      tenemos afiliación con las entidades listadas. Las opciones cubren niveles de riesgo muy
      distintos: desde el plazo fijo bancario y las Letras del BCU (riesgo bajo, cercano al de un
      depósito garantizado por el sistema financiero) hasta acciones, ETFs y criptomonedas (riesgo
      alto, con posibilidad real de pérdida de capital). También difieren en regulación: algunas
      entidades están <strong>supervisadas por el BCU</strong> como banco o corredor de bolsa local,
      otras están <strong>reguladas únicamente en el exterior</strong> (sin protección del BCU si
      algo sale mal) y otras —como la mayoría de los exchanges de cripto— operan
      <strong>sin regulación local específica</strong> más allá de las obligaciones de prevención de
      lavado de activos. Verificá siempre la regulación, las comisiones vigentes y los mínimos
      actualizados directamente en el sitio de cada entidad antes de invertir, y recordá que
      rentabilidades pasadas no garantizan resultados futuros.
    </VAlert>

    <!-- Sources -->
    <VCard variant="flat" class="inversiones-section mt-4 pa-5">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Fuentes y referencias
      </h2>
      <ul class="inversiones-sources">
        <li v-for="(src, i) in officialSources" :key="'o' + i">
          <a :href="src.url" target="_blank" rel="noopener noreferrer">{{ src.label }}</a>
        </li>
      </ul>
    </VCard>

    <!-- Related guides -->
    <VRow class="my-6">
      <VCol cols="12" md="6">
        <VCard
          :to="localePath('/invertir-en-proyectos-uruguayos')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-sprout-outline</VIcon>
          <h2 class="text-subtitle-1 font-weight-bold mb-1">Invertir en proyectos uruguayos</h2>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Crowdfunding, obligaciones negociables, fideicomisos de forestación e infraestructura,
            agro, inmobiliario y startups: cómo poner tu dinero en la economía real de Uruguay.
          </p>
        </VCard>
      </VCol>
      <VCol cols="12" md="6">
        <VCard
          :to="localePath('/salud-financiera')"
          class="cross-link pa-4 h-100"
          hover
          variant="flat"
        >
          <VIcon color="primary" class="mb-2">mdi-heart-pulse</VIcon>
          <h2 class="text-subtitle-1 font-weight-bold mb-1">Salud financiera e ingresos extra</h2>
          <p class="text-body-2 text-grey-lighten-1 mb-0">
            Antes de invertir, ordená tus finanzas: hacé el diagnóstico de salud financiera y mirá
            ideas para generar ingresos extra en Uruguay.
          </p>
        </VCard>
      </VCol>
    </VRow>

    <!-- CTA -->
    <VCard class="cta-inversiones mt-6 pa-6 text-center" variant="flat">
      <h2 class="text-h6 font-weight-bold mb-2 text-white">¿Cuánto rendiría tu plazo fijo?</h2>
      <p class="text-body-2 text-grey-lighten-1 mb-4">
        Simulá el interés de un plazo fijo en pesos, dólares o UI, o convertí tu dinero a la moneda
        que necesitás para invertir con nuestras herramientas.
      </p>
      <div class="d-flex justify-center flex-wrap ga-3">
        <VBtn
          :to="localePath('/herramientas/calculadora-plazo-fijo')"
          color="primary"
          variant="elevated"
          class="cta-btn"
        >
          <VIcon start>mdi-calculator</VIcon>
          Calcular plazo fijo
        </VBtn>
        <VBtn :to="localePath('/convertir')" variant="outlined" class="cta-btn cta-btn-outline">
          <VIcon start>mdi-swap-horizontal</VIcon>
          Convertir moneda
        </VBtn>
      </div>
    </VCard>
  </div>
</template>

<script setup lang="ts">
import {
  INVESTMENTS,
  investmentsByCategory,
  riskLabel,
  minInvestmentLabel,
  type RegulationStatus,
} from '~/utils/investments'

const localePath = useLocalePath()
const groups = computed(() => investmentsByCategory())

/** Bare host (without scheme / www) for compact source links. */
function hostOf(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
}

/** Compact regulation badge label for the mobile card view. */
function regulationBadge(regulation: RegulationStatus): string {
  if (regulation === 'bcu') return 'BCU'
  if (regulation === 'exterior_regulado') return 'Exterior'
  return 'No regulado'
}

/** Icon per investment category, mirrors groupIcon() in prestamos-uruguay.vue. */
function groupIcon(category: string): string {
  const icons: Record<string, string> = {
    banco_broker: 'mdi-bank',
    fintech: 'mdi-cellphone-check',
    broker_internacional: 'mdi-earth',
    renta_fija_local: 'mdi-file-certificate-outline',
    fondo_inversion: 'mdi-chart-pie',
    cripto: 'mdi-bitcoin',
  }
  return icons[category] ?? 'mdi-finance'
}

const officialSources = [
  {
    label: 'BCU — Registro de Intermediarios de Valores',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/int_Valores.aspx',
  },
  {
    label: 'BCU — Tasas Medias de Interés (plazo fijo)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/Tasas-Medias.aspx',
  },
  {
    label: 'BCU — Administradoras de Fondos de Inversión',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/admin_Fondos_Inv.aspx',
  },
  {
    label: 'BCU — Memoria AFAP (participación de mercado)',
    url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/paginas/memoria-afap.aspx',
  },
  {
    label: 'MEF — Notas del Tesoro',
    url: 'https://deuda.mef.gub.uy/29186/14/areas/notas-del-tesoro.html',
  },
  {
    label: 'BVM — Corredores de bolsa',
    url: 'https://www.bvm.com.uy/operadores/corredores-de-bolsa',
  },
  {
    label: 'BPS — Administradoras de Ahorro Previsional (AFAP)',
    url: 'https://www.bps.gub.uy/21194/administradoras-de-ahorro-previsional-afap-y-distribucion.html',
  },
  {
    label: 'DGI — IRPF, rendimientos de capital mobiliario',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-rendimientos-capital-mobiliario',
  },
  {
    label: 'IMPO — Ley 20.345 (activos virtuales)',
    url: 'https://www.impo.com.uy/bases/leyes-originales/20345-2024',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/inversiones-uruguay'
const title =
  'Dónde invertir en Uruguay: guía completa de bancos, brokers, renta fija y cripto (2026)'
const description =
  'Guía completa para invertir en Uruguay: cuentas de inversión en bancos, Prex, brokers internacionales como eToro, renta fija local (plazo fijo, letras BCU, bonos), fondos de inversión, cripto, AFAP e inmobiliario. Riesgos, mínimos, comisiones e impuestos.'

defineOgImageComponent('Cambio', {
  title: 'Invertir en Uruguay',
  subtitle: 'Guía de bancos, brokers, renta fija, fondos y cripto',
  tag: 'GUÍA',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
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
        'invertir en uruguay, inversiones uruguay, donde invertir uruguay, etoro uruguay, prex inversiones, itau inversiones, plazo fijo uruguay, letras de regulacion monetaria, afap uruguay, cripto uruguay',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'ItemList',
            name: 'Opciones de inversión en Uruguay',
            itemListElement: INVESTMENTS.map((i, idx) => ({
              '@type': 'ListItem',
              position: idx + 1,
              name: i.name,
              url: i.website,
            })),
          },
          {
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
                name: 'Inversiones en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: '¿Dónde puedo invertir mi dinero en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'En Uruguay podés invertir a través de cuentas de inversión en bancos (Itaú, Santander, BROU, Scotiabank, BBVA), fintech como Prex, brokers internacionales accesibles desde Uruguay (eToro, XTB, Balanz, este último regulado localmente), instrumentos de renta fija local (plazo fijo, Letras de Regulación Monetaria del BCU, bonos y notas del Tesoro), fondos de inversión locales (República AFISA, Delta Asset Management y otras administradoras registradas ante el BCU) y exchanges de criptomonedas. Cada opción tiene distinto riesgo, mínimo de inversión, regulación y tratamiento impositivo.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cuál es la opción de menor riesgo para invertir en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'El plazo fijo bancario y las Letras de Regulación Monetaria del BCU son las opciones de menor riesgo, ya que devuelven capital e interés pactado sin exposición a variaciones de mercado, y ambas están supervisadas por el BCU. Los fondos de inversión y las carteras de bonos/acciones tienen riesgo variable según el instrumento, mientras que acciones, ETFs y criptomonedas tienen riesgo alto, ya que su valor puede subir o bajar significativamente según el mercado.',
                },
              },
              {
                '@type': 'Question',
                name: '¿Cómo se pagan impuestos por invertir en Uruguay?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Los residentes fiscales uruguayos pagan IRPF Categoría I sobre las rentas de capital (intereses, dividendos, alquileres y ganancias de capital) a una tasa general del 12%; los dividendos de fuente uruguaya, al 7%. Los depósitos a plazo tienen tasas reducidas según moneda y plazo: en pesos 5,5% (hasta 1 año), 2,5% (1 a 3 años) y 0,5% (más de 3 años); en UI 10%, 7% y 5%; en moneda extranjera 12%, 12% y 7%. Al vender valores, la regla por defecto es el régimen real: 12% sobre la ganancia (precio menos costo fiscal actualizado); la base ficta del 20% del precio (≈ 2,4% efectivo) es obligatoria solo si no se puede probar el costo, no es el régimen general. Desde 2026 (Ley 20.446) el IRPF también grava las rentas y ganancias de capital de fuente extranjera, al 12%: el 8% no es una tasa, es una retención reducida que solo puede aplicar un bróker o custodio uruguayo que ejerza la custodia de los activos, y es definitiva solo si el contribuyente opta por ella. Con un bróker del exterior no hay retención uruguaya: corresponden anticipos semestrales o declaración jurada (Formulario 1101). Para activos que coticen en bolsas de reconocido prestigio adquiridos antes del 31/12/2025, el costo fiscal es su cotización al 31/12/2025. La deuda pública uruguaya (Bonos del Tesoro, Letras de Tesorería, LRM) está exenta de IRPF, tanto el interés como la ganancia de capital al transferirla. Los no residentes tributan IRNR. Consultá siempre con un contador y las publicaciones oficiales de la DGI antes de declarar.',
                },
              },
            ],
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.bg-gradient-inversiones {
  background: linear-gradient(135deg, #0f766e 0%, #1e3a8a 100%);
}

/* Guard against any child forcing horizontal scroll. */
.inversiones-page {
  overflow-x: hidden;
}

.inversiones-intro {
  max-width: 760px;
  line-height: 1.6;
}

/* Let the CTA label wrap inside the button instead of spilling out on narrow screens. */
.cta-btn {
  height: auto;
  min-height: 44px;
  max-width: 100%;
  white-space: normal;
}
.cta-btn :deep(.v-btn__content) {
  white-space: normal;
  padding-block: 8px;
}

.cta-btn-outline {
  border-color: rgba(255, 255, 255, 0.4);
  color: #fff;
}

.inversiones-group-title {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding-left: 10px;
}

.inversiones-card,
.inversiones-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
}

.inversiones-table :deep(td),
.inversiones-table :deep(th) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.inversiones-note {
  font-size: 0.82rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.78);
}
.v-theme--light .inversiones-note {
  color: rgba(0, 0, 0, 0.78);
}

.inversiones-sources {
  margin: 0;
  padding-left: 1.1rem;
}

.inversiones-sources li {
  margin-bottom: 0.4rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.78);
  line-height: 1.6;
}
.v-theme--light .inversiones-sources li {
  color: rgba(0, 0, 0, 0.78);
}

.inversiones-link,
.inversiones-sources a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}

.inversiones-link:hover,
.inversiones-sources a:hover {
  text-decoration: underline;
}

.cta-inversiones {
  background: rgba(15, 118, 110, 0.12);
  border: 1px solid rgba(15, 118, 110, 0.28);
  border-radius: 12px;
}

/* Mobile card layout for the investment comparison (replaces the table < md). */
.investment-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px 16px;
}

.investment-card + .investment-card {
  margin-top: 12px;
}

.investment-risk {
  font-weight: 700;
  color: #0f766e;
  white-space: nowrap;
  background: rgba(15, 118, 110, 0.14);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.investment-specs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 0 0 8px;
}

.investment-specs dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.5);
}
.v-theme--light .investment-specs dt {
  color: rgba(0, 0, 0, 0.5);
}

.investment-specs dd {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}
.v-theme--light .investment-specs dd {
  color: rgba(0, 0, 0, 0.85);
}

.investment-stars {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.cross-link {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  text-decoration: none;
  transition: transform 0.2s ease;
}
.cross-link:hover {
  transform: translateY(-2px);
}
.v-theme--light .cross-link {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.08);
}
</style>
