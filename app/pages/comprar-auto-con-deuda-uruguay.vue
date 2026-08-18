<template>
  <VContainer class="cardebt-page py-8 py-md-12">
    <!-- Hero -->
    <header class="mb-10">
      <VChip class="mb-3" color="warning" size="small" variant="tonal">
        <VIcon start size="small">mdi-car-off</VIcon>
        AUTO USADO
      </VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">
        Comprar un auto con deuda de patente o multas en Uruguay
      </h1>
      <p class="lead mb-4">
        El auto barato de Marketplace suele ser barato por una razón que no está en la foto. La
        deuda no pasa a ser tuya como obligación personal, pero hace algo peor: mientras exista, el
        vehículo no se puede transferir. Comprás un auto que vas a manejar con los papeles de otra
        persona, y las sanciones por circular caen sobre vos. Acá está qué se bloquea, cuándo deja
        de ser un problema de plata, y cómo averiguar la deuda real antes de señar.
      </p>
      <ShareButtons
        class="mt-4"
        :url="canonicalUrl"
        text="Comprar un auto con deuda de patente o multas en Uruguay"
      />
      <p class="text-caption text-medium-emphasis mt-3">
        Artículos y montos verificados contra su fuente el {{ verifiedAt }}.
      </p>
    </header>

    <!-- 1. La respuesta corta -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">La respuesta corta</h2>
      <VRow>
        <VCol v-for="v in CAR_DEBT_VERDICTS" :key="v.claim" cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ v.claim }}</h3>
            <p class="mb-3 text-medium-emphasis">{{ v.answer }}</p>
            <VChip size="x-small" variant="tonal" color="info">{{ v.norm }}</VChip>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- 2. Antes de señar -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Antes de señar</h2>
      <p class="text-body-1 cardebt-prose mb-5">
        Seis pasos en orden. Los dos primeros son gratis y descartan la mayoría de los autos; el
        tercero es el único documento que hace fe.
      </p>
      <ol class="cardebt-steps">
        <li v-for="(step, i) in BEFORE_BUYING_STEPS" :key="i" class="mb-4">
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ step.title }}</h3>
          <p class="text-body-2 cardebt-prose mb-0">{{ step.detail }}</p>
        </li>
      </ol>

      <div class="d-flex flex-wrap ga-2 mt-5">
        <VBtn
          :href="CONSULTA_DEUDA_URL"
          target="_blank"
          rel="noopener noreferrer"
          color="primary"
          variant="flat"
          size="small"
          prepend-icon="mdi-magnify"
        >
          Consulta gratuita de deuda
        </VBtn>
        <VBtn
          :href="CERTIFICADO_URL"
          target="_blank"
          rel="noopener noreferrer"
          variant="tonal"
          size="small"
          prepend-icon="mdi-file-certificate-outline"
        >
          Pedir el Certificado SUCIVE
        </VBtn>
      </div>
    </section>

    <!-- 3. El certificado -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">El Certificado SUCIVE, que es el que importa</h2>
      <p class="text-body-1 cardebt-prose mb-5">
        La consulta rápida te muestra la patente. El certificado te muestra todo lo demás, y es
        bastante más de lo que la gente supone que existe.
      </p>

      <VCard variant="flat" class="highlight-card pa-5 pa-md-6 mb-5">
        <div class="text-overline mb-3">Qué cubre</div>
        <ul class="cardebt-covers mb-0">
          <li v-for="(item, i) in CERTIFICADO_COVERS" :key="i">{{ item }}</li>
        </ul>
      </VCard>

      <VRow>
        <VCol v-for="f in CERTIFICADO_FACTS" :key="f.label" cols="12" md="6">
          <VCard variant="flat" class="plain-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ f.label }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ f.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- 4. La calculadora -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Cuánto te sale de verdad</h2>
      <p class="text-body-1 cardebt-prose mb-5">
        Poné el precio que piden y la deuda que te devolvió el certificado. La cuenta suma la multa
        por mora, el recargo que se capitaliza todos los días y las multas por circular con la
        patente vencida, que es la parte que nadie proyecta.
      </p>

      <VCard variant="flat" class="calc-card pa-5 pa-md-6 mb-5">
        <VRow dense>
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model.number="form.askingPrice"
              label="Precio que piden ($)"
              type="number"
              min="0"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model.number="form.patenteAnual"
              label="Patente anual del vehículo ($)"
              type="number"
              min="0"
              variant="outlined"
              density="comfortable"
              hint="Sale de la consulta del SUCIVE por matrícula y padrón"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model.number="form.tributoAdeudado"
              label="Patente adeudada, sin sanciones ($)"
              type="number"
              min="0"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model.number="form.diasAtraso"
              label="Días de atraso"
              type="number"
              min="0"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model.number="form.multasPendientes"
              label="Multas de tránsito pendientes ($)"
              type="number"
              min="0"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </VCol>
          <VCol cols="12" sm="6" md="4">
            <VTextField
              v-model.number="form.multasPorCircular"
              label="Multas por circular ya aplicadas"
              type="number"
              min="0"
              :max="CIRCULAR_MULTA_MAX_POR_ANIO"
              variant="outlined"
              density="comfortable"
              :hint="`Máximo ${CIRCULAR_MULTA_MAX_POR_ANIO} por año`"
              persistent-hint
            />
          </VCol>
        </VRow>
      </VCard>

      <VRow class="mb-2">
        <VCol cols="12" md="7">
          <VCard variant="flat" class="plain-card pa-0">
            <VTable class="cu-mobile-cards" density="comfortable">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th class="text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Precio pedido</td>
                  <td data-label="Monto" class="text-right">{{ money(form.askingPrice) }}</td>
                </tr>
                <tr>
                  <td>Patente adeudada</td>
                  <td data-label="Monto" class="text-right">{{ money(result.tributo) }}</td>
                </tr>
                <tr>
                  <td>
                    Multa por mora
                    <span class="d-block text-caption text-medium-emphasis">
                      {{ result.tier.label }} — {{ result.tier.nominalPct }}% del artículo, reducido
                      al {{ result.tier.effectivePct }}%
                    </span>
                  </td>
                  <td data-label="Monto" class="text-right">{{ money(result.multaMora) }}</td>
                </tr>
                <tr>
                  <td>
                    Recargo acumulado
                    <span class="d-block text-caption text-medium-emphasis">
                      {{ MORA_RECARGO_DAILY_PCT }}% diario, capitalizable
                    </span>
                  </td>
                  <td data-label="Monto" class="text-right">{{ money(result.recargo) }}</td>
                </tr>
                <tr>
                  <td>Multas de tránsito</td>
                  <td data-label="Monto" class="text-right">{{ money(result.multasTransito) }}</td>
                </tr>
                <tr>
                  <td>
                    Multas por circular
                    <span class="d-block text-caption text-medium-emphasis">
                      {{ CIRCULAR_MULTA_PCT }}% de la patente anual, cada una
                    </span>
                  </td>
                  <td data-label="Monto" class="text-right">
                    {{ money(result.multasCirculacion) }}
                  </td>
                </tr>
                <tr class="cardebt-total-row">
                  <td class="font-weight-bold">Deuda a saldar para poder transferir</td>
                  <td data-label="Deuda total" class="text-right font-weight-bold">
                    {{ money(result.deudaTotal) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </VCard>
        </VCol>

        <VCol cols="12" md="5">
          <VCard variant="flat" class="highlight-card pa-5 pa-md-6 h-100">
            <div class="text-overline mb-1">Costo real del auto</div>
            <p class="cardebt-big mb-2">{{ money(result.costoReal) }}</p>
            <p class="mb-4 text-medium-emphasis">
              El {{ result.deudaShare.toFixed(1) }}% de lo que vas a poner es deuda, no auto.
            </p>

            <VDivider class="mb-4" />

            <div class="text-overline mb-2">Si lo pagás en convenio</div>
            <VSlider
              v-model="cuotas"
              :min="1"
              :max="CONVENIO_MAX_CUOTAS"
              :step="1"
              color="primary"
              density="compact"
              hide-details
              class="mb-2"
            >
              <template #append>
                <span class="text-body-2 font-weight-medium">{{ cuotas }} cuotas</span>
              </template>
            </VSlider>
            <ul class="cardebt-plan mb-0">
              <li>
                Entrega inicial: <strong>{{ money(convenio.entregaInicial) }}</strong>
                <span class="text-caption text-medium-emphasis d-block">
                  el total dividido las cuotas más una, a pagar en 3 días hábiles
                </span>
              </li>
              <li>
                Cuota mensual: <strong>{{ money(convenio.cuotaMensual) }}</strong>
              </li>
              <li>
                Termina pagando: <strong>{{ money(convenio.totalPagado) }}</strong>
                <span class="text-caption text-medium-emphasis d-block">
                  {{ money(convenio.costoFinanciero) }} de costo financiero
                </span>
              </li>
            </ul>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        <p class="mb-0 text-body-2">
          Las dos tasas salen del texto ordenado vigente para 2026, que las arrastra con la etiqueta
          del año en que se calcularon y no las reetiquetó: el recargo por mora figura como
          <strong
            >{{ MORA_RECARGO_MONTHLY_PCT }}% mensual «para el año
            {{ MORA_RECARGO_RATE_LABEL_YEAR }}»</strong
          >
          y el interés del convenio como
          <strong
            >{{ CONVENIO_MONTHLY_PCT }}% mensual «para el año
            {{ CONVENIO_RATE_LABEL_YEAR }}»</strong
          >. Se usan tal cual están publicadas. La cuenta es una estimación para negociar: el número
          que vale es el del certificado.
        </p>
      </VAlert>
    </section>

    <!-- 5. La escalera -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Qué pasa, en orden</h2>
      <p class="text-body-1 cardebt-prose mb-5">
        No hay un único castigo: hay una escalera, y cada escalón se activa solo. El salto que casi
        nadie ve venir es el tercero.
      </p>
      <div v-for="(stage, i) in CAR_DEBT_STAGES" :key="stage.title" class="cardebt-stage mb-3">
        <div class="d-flex align-start">
          <div class="cardebt-stage-num">{{ i + 1 }}</div>
          <div class="flex-grow-1">
            <VChip size="x-small" variant="tonal" color="warning" class="mb-2">
              {{ stage.trigger }}
            </VChip>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ stage.title }}</h3>
            <p class="text-body-2 cardebt-prose mb-2">{{ stage.detail }}</p>
            <VChip size="x-small" variant="tonal" color="info">{{ stage.norm }}</VChip>
          </div>
        </div>
      </div>

      <VCard variant="flat" class="warn-card pa-5 pa-md-6 mt-5">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Dónde está el corte</div>
            <p class="mb-0">
              Debajo de {{ RETIRO_PLACAS_EJERCICIOS }} ejercicios fiscales acumulados el problema es
              plata, y la plata se negocia en el precio. Desde
              {{ RETIRO_PLACAS_EJERCICIOS }} ejercicios el vehículo entra en el régimen de retiro de
              placas y depósito, y eso ya no se arregla con un descuento: lo tiene que sacar el
              titular registral, con la situación regularizada y pagando los gastos. Al mirar una
              publicación, contá años antes de mirar el total.
            </p>
          </div>
        </div>
      </VCard>
    </section>

    <!-- 6. Las frases del aviso -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que dice el aviso y lo que significa</h2>
      <p class="text-body-1 cardebt-prose mb-5">Seis frases que suenan a garantía y no lo son.</p>
      <div class="table-scroll">
        <table class="cardebt-table cu-mobile-cards">
          <thead>
            <tr>
              <th>Dice</th>
              <th>Significa</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="trap in LISTING_TRAPS" :key="trap.phrase">
              <td class="font-weight-medium">{{ trap.phrase }}</td>
              <td data-label="Significa">{{ trap.reality }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- 7. Mitos -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">Lo que se dice por ahí</h2>
      <p class="text-body-1 cardebt-prose mb-5">
        Seis creencias que circulan en cada hilo sobre esto, con la norma que las confirma o las
        desarma.
      </p>
      <div v-for="m in CAR_DEBT_MYTHS" :key="m.myth" class="cardebt-myth mb-3">
        <div class="d-flex align-start flex-wrap ga-2 mb-2">
          <VChip size="x-small" variant="flat" :color="verdictColor(m.verdict)">
            {{ verdictLabel(m.verdict) }}
          </VChip>
          <span class="text-subtitle-1 font-weight-bold flex-grow-1">«{{ m.myth }}»</span>
        </div>
        <p class="text-body-2 cardebt-prose mb-2">{{ m.answer }}</p>
        <VChip size="x-small" variant="tonal" color="info">{{ m.norm }}</VChip>
      </div>
    </section>

    <!-- 8. Por qué se paga -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-3">Y de paso: por qué se paga patente</h2>
      <VCard variant="flat" class="plain-card pa-5 pa-md-6">
        <p class="mb-0 cardebt-prose">{{ PATENTE_WHY }}</p>
      </VCard>
    </section>

    <!-- 9. FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in CAR_DEBT_FAQ" :key="f.question">
          <VExpansionPanelTitle>
            <div>
              <div class="font-weight-medium">{{ f.question }}</div>
              <div class="text-caption text-medium-emphasis">{{ f.short }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>{{ f.answer }}</VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <!-- 10. Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn :to="localePath(CAR_DEBT_OWNER_PAGE)" variant="tonal" size="small">
          Cómo se calcula la patente y cómo se descarga una multa
        </VBtn>
        <VBtn :to="localePath('/guias/transferir-un-auto-uruguay')" variant="tonal" size="small">
          Transferir un auto
        </VBtn>
        <VBtn :to="localePath('/guias/costos-de-tener-auto-uruguay')" variant="tonal" size="small">
          Cuánto cuesta tener auto
        </VBtn>
        <VBtn :to="localePath('/estafas-uruguay')" variant="tonal" size="small">
          Estafas y compras entre particulares
        </VBtn>
      </div>
    </section>

    <!-- 11. Fuentes -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Artículos, plazos y porcentajes contrastados el {{ verifiedAt }} contra el Texto Ordenado
        del SUCIVE 2026, las leyes 18.860 y 19.824 y las publicaciones del Congreso de Intendentes.
        El texto ordenado se reordena y renumera todos los años, así que los números de artículo son
        los de la edición 2026. Es información de referencia: lo que resuelve la intendencia es lo
        que vale.
      </p>
      <ul class="sources-list">
        <li v-for="s in CAR_DEBT_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import {
  BEFORE_BUYING_STEPS,
  CAR_DEBT_FAQ,
  CAR_DEBT_MYTHS,
  CAR_DEBT_OWNER_PAGE,
  CAR_DEBT_SOURCES,
  CAR_DEBT_STAGES,
  CAR_DEBT_VERDICTS,
  CAR_DEBT_VERIFIED_AT,
  CERTIFICADO_COVERS,
  CERTIFICADO_FACTS,
  CIRCULAR_MULTA_MAX_POR_ANIO,
  CIRCULAR_MULTA_PCT,
  CONVENIO_MAX_CUOTAS,
  CONVENIO_MONTHLY_PCT,
  CONVENIO_RATE_LABEL_YEAR,
  LISTING_TRAPS,
  MORA_RECARGO_DAILY_PCT,
  MORA_RECARGO_MONTHLY_PCT,
  MORA_RECARGO_RATE_LABEL_YEAR,
  PATENTE_WHY,
  RETIRO_PLACAS_EJERCICIOS,
  type MythVerdict,
  computeCarDebt,
  computeConvenio,
} from '~/utils/carDebt'

const localePath = useLocalePath()

const CONSULTA_DEUDA_URL = 'https://www.sucive.gub.uy/consulta_deuda'
const CERTIFICADO_URL = 'https://www.sucive.gub.uy/certificado_sucive'

// Valores de arranque: un usado barato con dos años de patente encima, para que el bloque de
// resultados nunca se vea vacío y se entienda de un vistazo qué proporción es deuda.
const form = reactive({
  askingPrice: 200_000,
  patenteAnual: 30_000,
  tributoAdeudado: 60_000,
  diasAtraso: 730,
  multasPendientes: 12_000,
  multasPorCircular: 2,
})

const cuotas = ref(18)

const result = computed(() => computeCarDebt(form))
const convenio = computed(() => computeConvenio(result.value.deudaTotal, cuotas.value))

const money = (n: number) =>
  new Intl.NumberFormat('es-UY', {
    style: 'currency',
    currency: 'UYU',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0)

const verdictColor = (v: MythVerdict) =>
  v === 'cierto' ? 'error' : v === 'falso' ? 'success' : 'warning'

// El color va al revés de lo intuitivo a propósito: «cierto» pinta rojo porque el mito confirmado
// es una mala noticia para el comprador, y «falso» pinta verde porque desactiva un miedo.
const verdictLabel = (v: MythVerdict) =>
  v === 'cierto' ? 'Es cierto' : v === 'falso' ? 'Es falso' : 'A medias'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = fmtDate(CAR_DEBT_VERIFIED_AT)

const canonicalUrl = 'https://cambio-uruguay.com/comprar-auto-con-deuda-uruguay'
const title = 'Comprar un auto con deuda de patente o multas en Uruguay'
const description =
  'La deuda no pasa a ser tuya, pero bloquea la transferencia: comprás un auto que no podés poner a tu nombre. Qué se traba, en qué momento dejan de ser pesos y pasan a retirarte las placas, qué cubre el Certificado SUCIVE que la consulta rápida no muestra, y una calculadora del costo real con mora, recargo diario y multas por circular.'

defineOgImageComponent('Cambio', {
  title: 'Auto usado con deuda',
  subtitle: 'Qué se hereda, qué se bloquea y cuándo te retiran las placas',
  tag: 'AUTO',
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
        'comprar auto con deuda uruguay, auto con deuda de patente, transferir auto con deuda, certificado sucive, consulta deuda sucive matricula padron, que pasa si no pago la patente, multa por circular con patente vencida, camaras deuda de patente montevideo, retiro de placas deuda patente, auto endeudado marketplace, comprar auto usado uruguay deuda, prescripcion deuda patente 10 años, convenio de pago sucive',
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
                name: 'Cambio Uruguay',
                item: 'https://cambio-uruguay.com',
              },
              {
                '@type': 'ListItem',
                position: 2,
                name: 'Comprar un auto con deuda',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: CAR_DEBT_FAQ.map(f => ({
              '@type': 'Question',
              name: f.question,
              acceptedAnswer: { '@type': 'Answer', text: f.answer },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.cardebt-page {
  max-width: 1180px;
}

.lead {
  font-size: 1.075rem;
  line-height: 1.65;
  max-width: 72ch;
  color: rgba(255, 255, 255, 0.82);
}
.v-theme--light .lead {
  color: rgba(0, 0, 0, 0.76);
}

.cardebt-prose {
  max-width: 74ch;
  line-height: 1.65;
}

.plain-card,
.highlight-card,
.warn-card,
.calc-card,
.cardebt-stage,
.cardebt-myth {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 12px;
}
.v-theme--light .plain-card,
.v-theme--light .highlight-card,
.v-theme--light .warn-card,
.v-theme--light .calc-card,
.v-theme--light .cardebt-stage,
.v-theme--light .cardebt-myth {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}

.highlight-card {
  border-color: rgba(var(--v-theme-primary), 0.45);
}
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}

.cardebt-stage,
.cardebt-myth {
  padding: 20px;
}

.cardebt-stage-num {
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  margin-right: 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  background: rgba(var(--v-theme-primary), 0.16);
  color: rgb(var(--v-theme-primary));
}

/* Paso `display` del sistema. `tabular-nums` porque el número se recalcula mientras se tipea y
   sin ancho fijo por dígito el bloque entero tiembla. */
.cardebt-big {
  font-size: clamp(1.55rem, 4.4vw, 2.5rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.cardebt-steps {
  padding-left: 1.25rem;
}
.cardebt-steps li::marker {
  font-weight: 700;
  color: rgb(var(--v-theme-primary));
}

.cardebt-covers,
.cardebt-plan {
  padding-left: 1.15rem;
  line-height: 1.6;
}
.cardebt-covers li,
.cardebt-plan li {
  margin-bottom: 0.5rem;
}

.table-scroll {
  overflow-x: auto;
}

.cardebt-table {
  width: 100%;
  border-collapse: collapse;
}
.cardebt-table th,
.cardebt-table td {
  text-align: left;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  vertical-align: top;
}
.v-theme--light .cardebt-table th,
.v-theme--light .cardebt-table td {
  border-bottom-color: rgba(0, 0, 0, 0.1);
}
.cardebt-table th {
  font-weight: 700;
  white-space: nowrap;
}

.cardebt-total-row td {
  border-top: 2px solid rgba(var(--v-theme-primary), 0.45);
}

.sources-list {
  padding-left: 1.15rem;
  line-height: 1.7;
}
.sources-list a {
  color: rgb(var(--v-theme-primary));
}
</style>
