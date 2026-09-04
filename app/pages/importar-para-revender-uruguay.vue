<!--
THESIS: Los dos bandos de la discusión ("con el nuevo régimen no necesitás despachante" / "sí
necesitás") tienen razón sobre rutas distintas; la página modela la RUTA, no el impuesto, y ahí
la contradicción desaparece.
OWN-WORLD: Un mostrador de importador — dos carriles paralelos (courier 60% / DUA) y un semáforo
de trámites por producto, en la paleta de la sección aduana.
STORY: Alguien que quiere revender accesorios de celular entra con cuatro dudas y sale con una
ruta, un costo comparado y la lista exacta de trámites de SU producto.
FIRST VIEWPORT: Respuesta corta a las cuatro preguntas, arriba de todo, sin scroll.
FORM: Guía operativa con simulador, extensión de la familia /franquicia-aduana-uruguay.
-->
<template>
  <VContainer class="resale-page py-6 py-md-10">
    <!-- Hero -->
    <header class="hero mb-6">
      <p class="eyebrow">Importar para revender · Agosto 2026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-2">
        Importar para revender en Uruguay: ¿despachante, empresa y el 60%?
      </h1>
      <p class="text-body-1 text-medium-emphasis mb-4">
        Esta página es para quien trae mercadería <strong>para vender</strong> — no para una compra
        personal. Si lo tuyo es una compra para uso propio, la respuesta está en
        <NuxtLink :to="localePath('/franquicia-aduana-uruguay')">franquicia y aduana</NuxtLink>.
      </p>

      <div class="answer-slab on-dark mb-4">
        <div class="answer-mark" aria-hidden="true">
          <VIcon size="24">mdi-scale-balance</VIcon>
        </div>
        <div>
          <p class="answer-label mb-1">La discusión que tenés no tiene un ganador</p>
          <p class="answer-copy mb-0">
            Las dos versiones son ciertas, sobre rutas distintas. Hasta
            <strong>US$ 800 de factura y 20 kg por envío</strong> entrás por la
            <strong>prestación única del 60%</strong>: sin DUA y sin despachante, y
            <strong>sí sirve para revender</strong>. Arriba de eso es
            <strong>Régimen General</strong>: DUA y despachante, que según la Aduana es
            <em>preceptivo</em>. Lo que no podés usar nunca para revender es la
            <strong>franquicia</strong> anual.
          </p>
        </div>
      </div>

      <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-file-document-outline">
        Todo lo que sigue sale del <strong>Decreto 50/026</strong>, la <strong>Ley 20.446</strong>,
        las páginas operativas de la <strong>DNA</strong>, y de URSEC, URSEA y DGI. Cuando una
        fuente oficial afirma algo sin norma identificada, lo decimos así.
      </VAlert>
    </header>

    <!-- The four answers -->
    <section class="mb-8" aria-label="Las cuatro respuestas cortas">
      <h2 class="section-heading mb-4">Las cuatro dudas, respondidas de una</h2>
      <VRow>
        <VCol v-for="a in quickAnswers" :key="a.q" cols="12" md="6">
          <VCard variant="flat" class="quick-card pa-4 h-100">
            <div class="d-flex align-start ga-3">
              <VIcon :color="a.color" size="24">{{ a.icon }}</VIcon>
              <div>
                <p class="text-subtitle-2 font-weight-bold mb-1">{{ a.q }}</p>
                <p class="text-body-2 mb-0" v-html="a.a" />
              </div>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- Simulator -->
    <section class="mb-8" aria-label="Simulador de ruta y costo">
      <h2 class="section-heading mb-1">Probá tu pedido</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Estimación de referencia. El arancel depende del código NCM de cada producto, así que es un
        campo que completás vos —
        <a :href="arancelUrl" target="_blank" rel="noopener noreferrer">consultá el tuyo en VUCE</a
        >.
      </p>

      <VCard variant="flat" class="calc pa-4 pa-sm-6">
        <VRow>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="invoiceUsd"
              type="number"
              min="0"
              prefix="US$"
              label="Valor de factura"
              variant="outlined"
              density="comfortable"
              hint="Total de la factura, envío del vendedor incluido"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="weightKg"
              type="number"
              min="0"
              suffix="kg"
              label="Peso del envío"
              variant="outlined"
              density="comfortable"
              hint="Tope postal: 20 kg por envío"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="arancelPct"
              type="number"
              min="0"
              suffix="%"
              label="Arancel (NCM)"
              variant="outlined"
              density="comfortable"
              hint="Sólo aplica en Régimen General"
              persistent-hint
            />
          </VCol>
          <VCol cols="12" sm="6" md="3">
            <VTextField
              v-model.number="clearingUsd"
              type="number"
              min="0"
              prefix="US$"
              label="Costos de despacho"
              variant="outlined"
              density="comfortable"
              hint="Despachante, terminal, depósito"
              persistent-hint
            />
          </VCol>
        </VRow>

        <div class="mt-4">
          <div class="text-overline text-medium-emphasis mb-2">¿Qué traés?</div>
          <div class="d-flex flex-wrap ga-2">
            <VChip
              v-for="p in PRODUCT_CHECKS"
              :key="p.id"
              :color="selected.includes(p.id) ? verdictColor(p.verdict) : undefined"
              :variant="selected.includes(p.id) ? 'flat' : 'outlined'"
              size="small"
              :prepend-icon="p.icon"
              @click="toggle(p.id)"
            >
              {{ p.label }}
            </VChip>
          </div>
        </div>

        <VAlert :type="verdictTone" variant="tonal" class="mt-5" :icon="verdictIcon" border="start">
          <p class="text-subtitle-1 font-weight-bold mb-1">{{ verdictTitle }}</p>
          <ul class="reason-list mb-0">
            <li v-for="(r, i) in decision.reasons" :key="i">{{ r }}</li>
          </ul>
        </VAlert>

        <VAlert
          v-for="(b, i) in decision.blockers"
          :key="`blocker-${i}`"
          type="error"
          variant="tonal"
          class="mt-3"
          icon="mdi-cancel"
          border="start"
        >
          {{ b }}
        </VAlert>

        <!-- Cost comparison -->
        <VRow class="mt-4">
          <VCol cols="12" md="6">
            <VCard variant="flat" class="cost-card pa-4 h-100">
              <p class="cost-title mb-1">
                <VIcon size="18" start>mdi-package-variant-closed</VIcon>
                Prestación única (courier)
              </p>
              <p class="cost-figure mb-1">US$ {{ money(comparison.simplified.chargesUsd) }}</p>
              <p class="text-caption text-medium-emphasis mb-3">
                {{ money(comparison.simplified.effectivePct) }}% sobre la factura · sin despachante
              </p>
              <ul class="cost-lines">
                <li v-for="(l, i) in comparison.simplified.lines" :key="i">
                  <span>{{ l.label }}</span>
                  <strong>US$ {{ money(l.amountUsd) }}</strong>
                </li>
              </ul>
              <p v-if="comparison.postalUnavailable" class="text-caption text-error mt-3 mb-0">
                No disponible para este envío: supera US$ 800 o 20 kg.
              </p>
            </VCard>
          </VCol>
          <VCol cols="12" md="6">
            <VCard variant="flat" class="cost-card pa-4 h-100">
              <p class="cost-title mb-1">
                <VIcon size="18" start>mdi-file-document-edit-outline</VIcon>
                Régimen General (DUA)
              </p>
              <p class="cost-figure mb-1">US$ {{ money(comparison.general.chargesUsd) }}</p>
              <p class="text-caption text-medium-emphasis mb-3">
                {{ money(comparison.general.effectivePct) }}% sobre la factura · con despachante
              </p>
              <ul class="cost-lines">
                <li v-for="(l, i) in comparison.general.lines" :key="i">
                  <span>{{ l.label }}</span>
                  <strong>US$ {{ money(l.amountUsd) }}</strong>
                </li>
              </ul>
            </VCard>
          </VCol>
        </VRow>

        <VAlert
          v-if="!comparison.postalUnavailable"
          type="success"
          variant="tonal"
          density="comfortable"
          class="mt-4"
          icon="mdi-calculator-variant-outline"
        >
          Con estos números conviene
          <strong>{{
            comparison.cheaper === 'prestacion-unica' ? 'el 60% por courier' : 'el DUA'
          }}</strong>
          por <strong>US$ {{ money(comparison.savingUsd) }}</strong> en este envío.
          <template v-if="breakEven !== null">
            El punto de cruce está en <strong>US$ {{ money(breakEven) }}</strong> de factura: por
            debajo gana el 60%, por encima gana el DUA.
          </template>
          <template v-else>
            Con este arancel el DUA no llega a ser más barato en ningún valor: el 60% le gana
            siempre.
          </template>
        </VAlert>

        <p class="text-caption text-medium-emphasis mt-3 mb-0">
          <VIcon size="14" class="mr-1">mdi-information-outline</VIcon>
          No incluimos el <strong>anticipo de IVA a la importación</strong> (código 551 de DGI).
          Existe y se paga en la frontera, pero es un anticipo: una pequeña empresa lo descuenta del
          IVA mínimo mensual y un contribuyente de IRAE lo acredita. No pudimos verificar su
          alícuota contra fuente primaria, así que no la inventamos.
        </p>
      </VCard>
    </section>

    <!-- Where the 60% is paid -->
    <section class="mb-8" aria-label="Cómo se paga el 60%">
      <h2 class="section-heading mb-1">¿Dónde y cómo se paga el 60%?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Spoiler: en ningún lado, en el sentido que la pregunta espera. No hay formulario de DGI ni
        boleta que imprimir.
      </p>
      <VCard variant="flat" class="steps-card pa-5">
        <ol class="steps-list">
          <li v-for="(s, i) in PAYMENT_STEPS" :key="i">
            <p class="step-title mb-1">{{ s.title }}</p>
            <p class="step-body mb-0">{{ s.body }}</p>
          </li>
        </ol>
      </VCard>
    </section>

    <!-- Company -->
    <section class="mb-8" aria-label="Cuándo abrir la empresa">
      <h2 class="section-heading mb-1">¿Me abro la unipersonal antes o después de importar?</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Aduana no te pide RUT para liberar un envío por el 60%. DGI te lo pide en cuanto
        <strong>vendés</strong>. Son dos obligaciones distintas y en ese orden.
      </p>
      <VCard variant="flat" class="steps-card pa-5">
        <ol class="steps-list">
          <li v-for="s in FORMALIZATION_STEPS" :key="s.id">
            <p class="step-when mb-1">{{ s.when }}</p>
            <p class="step-title mb-1">{{ s.title }}</p>
            <p class="step-body mb-0">{{ s.body }}</p>
            <NuxtLink v-if="s.to" :to="localePath(s.to)" class="step-link">
              Elegir el régimen que te corresponde
              <VIcon size="14">mdi-arrow-right</VIcon>
            </NuxtLink>
          </li>
        </ol>
      </VCard>
    </section>

    <!-- Product procedures -->
    <section class="mb-8" aria-label="Trámites por producto">
      <h2 class="section-heading mb-1">Trámites extra, producto por producto</h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Los rubros de accesorios de celular que más se piden. Dos resultados sorprenden a casi
        todos: un cargador de pared común <strong>no</strong> necesita autorización previa, y unos
        auriculares Bluetooth <strong>no</strong> necesitan URSEC.
      </p>
      <VRow>
        <VCol v-for="p in PRODUCT_CHECKS" :key="p.id" cols="12" md="6">
          <VCard variant="flat" class="check-card pa-4 h-100">
            <div class="d-flex align-center justify-space-between ga-2 mb-2">
              <p class="text-subtitle-2 font-weight-bold mb-0">
                <VIcon size="18" start>{{ p.icon }}</VIcon>
                {{ p.label }}
              </p>
              <VChip :color="verdictColor(p.verdict)" size="x-small" variant="flat">
                {{ verdictLabel(p.verdict) }}
              </VChip>
            </div>
            <p class="text-body-2 mb-2">{{ p.detail }}</p>
            <div v-if="p.organisms.length" class="d-flex flex-wrap ga-1">
              <VChip v-for="o in p.organisms" :key="o" size="x-small" variant="outlined">
                {{ o }}
              </VChip>
            </div>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-8" aria-label="Preguntas frecuentes">
      <h2 class="section-heading mb-4">Lo que se pregunta después</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="f in faqs" :key="f.q">
          <VExpansionPanelTitle>{{ f.q }}</VExpansionPanelTitle>
          <VExpansionPanelText>
            <p class="mb-0" v-html="f.a" />
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
      <VBtn
        :to="localePath('/preguntas-frecuentes-aduana-uruguay')"
        variant="text"
        color="primary"
        class="mt-3 px-1"
      >
        Ver el resto de las preguntas de aduana
        <VIcon end>mdi-arrow-right</VIcon>
      </VBtn>
    </section>

    <!-- Sources -->
    <VCard variant="flat" class="sources-card pa-5 mb-6">
      <h2 class="text-subtitle-2 font-weight-bold mb-2">
        <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
        Las fuentes, sin intermediarios
      </h2>
      <ul class="sources-list">
        <li v-for="s in sources" :key="s.id">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
          <span class="text-medium-emphasis"> — {{ s.authority }}</span>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Verificado contra fuente primaria el {{ LAST_RESEARCHED_LABEL }}. Dos advertencias: la
        página de Aduanas llama “monotributo” al pago único del 60% (no tiene relación con el
        monotributo de DGI/BPS), y el límite de dos DUA por año para personas físicas lo publica la
        propia DNA pero no pudimos identificar el artículo que lo establece.
      </p>
    </VCard>

    <VAlert type="warning" variant="tonal" density="comfortable" icon="mdi-alert-outline">
      Información <strong>de referencia</strong>, no asesoramiento profesional ni contable. La
      clasificación arancelaria, la alícuota vigente de la tasa consular y el criterio caso a caso
      de Aduana los confirma un despachante. Para la parte fiscal, un contador.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import {
  COMMERCIAL_IMPORT_SOURCES,
  FORMALIZATION_STEPS,
  LAST_RESEARCHED,
  PAYMENT_STEPS,
  PRODUCT_CHECKS,
  basketFlags,
  breakEvenInvoiceUsd,
  compareRoutes,
  resolveResaleRoute,
  type ProcedureVerdict,
} from '~/utils/commercialImport'

const localePath = useLocalePath()

const invoiceUsd = ref(450)
const weightKg = ref(6)
const arancelPct = ref(2)
const clearingUsd = ref(150)
const selected = ref<string[]>(['cargador-pared', 'funda-vidrio'])

function toggle(id: string) {
  selected.value = selected.value.includes(id)
    ? selected.value.filter(v => v !== id)
    : [...selected.value, id]
}

const flags = computed(() => basketFlags(selected.value))

const decision = computed(() =>
  resolveResaleRoute({
    invoiceUsd: invoiceUsd.value || 0,
    weightKg: weightKg.value || 0,
    carrierRefuses: flags.value.carrierRefuses,
  })
)

const comparison = computed(() =>
  compareRoutes({
    invoiceUsd: invoiceUsd.value || 0,
    weightKg: weightKg.value || 0,
    arancelPct: arancelPct.value || 0,
    clearingCostsUsd: clearingUsd.value || 0,
  })
)

const breakEven = computed(() =>
  breakEvenInvoiceUsd({
    arancelPct: arancelPct.value || 0,
    clearingCostsUsd: clearingUsd.value || 0,
  })
)

const verdictTone = computed(() => {
  if (decision.value.blockers.length) return 'error'
  return decision.value.route === 'prestacion-unica' ? 'success' : 'info'
})
const verdictIcon = computed(() =>
  decision.value.route === 'prestacion-unica' ? 'mdi-truck-check-outline' : 'mdi-clipboard-text'
)
const verdictTitle = computed(() =>
  decision.value.route === 'prestacion-unica'
    ? 'Entra por courier al 60%: sin DUA y sin despachante'
    : 'Va por Régimen General: DUA y despachante'
)

const VERDICT_UI: Record<ProcedureVerdict, { label: string; color: string }> = {
  'no-requiere': { label: 'Sin trámite', color: 'success' },
  requiere: { label: 'Trámite obligatorio', color: 'warning' },
  consultar: { label: 'Consultar antes', color: 'info' },
  bloqueante: { label: 'No entra por courier', color: 'error' },
}
function verdictLabel(v: ProcedureVerdict) {
  return VERDICT_UI[v].label
}
function verdictColor(v: ProcedureVerdict) {
  return VERDICT_UI[v].color
}

function money(n: number): string {
  return n.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const arancelUrl = COMMERCIAL_IMPORT_SOURCES['vuce-arancel'].url
const sources = Object.values(COMMERCIAL_IMPORT_SOURCES)

const LAST_RESEARCHED_LABEL = new Date(`${LAST_RESEARCHED}T00:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const quickAnswers = [
  {
    q: '1. ¿Necesito despachante de aduana?',
    icon: 'mdi-account-tie',
    color: 'primary',
    a: 'No, si cada envío queda dentro de <strong>US$ 800 de factura y 20 kg</strong>: esa vía es la prestación única del 60% y no lleva DUA. Sí, apenas superás cualquiera de los dos topes, o si la mercadería está gravada por IMESI: ahí es Régimen General y la DNA dice que la intervención del despachante <em>“es preceptiva”</em>.',
  },
  {
    q: '2. ¿Tengo que abrir la unipersonal antes de importar?',
    icon: 'mdi-domain',
    color: 'primary',
    a: 'Para <strong>importar</strong> por el 60%, no: el régimen admite titulares personas físicas o jurídicas y nadie te pide RUT. Para <strong>vender de forma habitual</strong>, sí, y eso es DGI/BPS, no Aduana. El otro motivo para tener empresa aparece al escalar: la DNA publica que una persona física puede hacer sólo <strong>dos DUA por año</strong>.',
  },
  {
    q: '3. ¿Dónde se paga el 60%?',
    icon: 'mdi-cash-multiple',
    color: 'primary',
    a: 'Al <strong>operador postal</strong> — el courier o el Correo — junto con el envío. El Decreto 50/026 art. 8 los designa responsables por el pago de obligaciones tributarias de terceros: ellos liquidan y le pagan a la Aduana. No hay trámite tuyo ante DGI.',
  },
  {
    q: '4. ¿Mis productos necesitan trámites extra?',
    icon: 'mdi-shield-check-outline',
    color: 'primary',
    a: 'Fundas, cables y cargadores de pared: <strong>ninguno</strong>. Auriculares Bluetooth: tampoco, por la excepción expresa de URSEC. <strong>Power banks: el problema no es un permiso sino el transporte</strong> — los operadores postales no llevan baterías de litio sueltas. Y ojo con adaptadores de enchufe y zapatillas, que <strong>sí</strong> necesitan autorización de URSEA.',
  },
]

const faqs = [
  {
    q: '¿Es legal usar el régimen del 60% para traer mercadería que voy a revender?',
    a: 'Sí. El Decreto 50/026 art. 2 abre la prestación única a “los titulares, sean personas físicas o jurídicas” y no exige uso personal; la Aduana lo repite en su propia página: “se pueden amparar personas jurídicas o personas físicas de cualquier edad”. La condición de <strong>uso personal y sin fines comerciales</strong> está en los arts. 3 y 4, que son los de la <strong>franquicia</strong>. Lo ilegal es lo otro: usar la franquicia para inventario, o repartirlo entre cédulas de conocidos.',
  },
  {
    q: '¿Puedo hacer muchos envíos de US$ 800 en el año?',
    a: 'Ni el Decreto 50/026 ni la lista de requisitos que publica la DNA establecen un tope anual o un cupo de envíos para la prestación única: los límites que publican son <strong>por envío</strong> (US$ 800 de factura y 20 kg). Lo que sí tiene tope anual es la franquicia (US$ 800 en hasta 3 envíos), y esa no la vas a usar igual. Dicho eso, fraccionar artificialmente un mismo pedido para esquivar el tope es la clase de maniobra que la Aduana mira: si tu proveedor te factura 2.400 y llegan tres cajas el mismo día, no es lo mismo que tres compras distintas.',
  },
  {
    q: '¿Por qué el 60% suele salir más barato que el DUA si el arancel es mucho menor?',
    a: 'Porque el DUA tiene <strong>costos fijos</strong> por envío — honorarios del despachante, terminal, depósito — que no dependen del valor, y porque el IVA se calcula sobre el valor en aduana <em>más</em> el arancel, no sobre la mercadería sola (Título 10 art. 13 lit. B). La <strong>tasa consular</strong> se paga aparte pero <strong>no</strong> integra esa base. Con un arancel del 10% más la tasa consular, la carga combinada ronda el 39%; recién por encima de cierto valor de factura los costos fijos se diluyen y el DUA gana. Un detalle que el simulador no aplica: si el que importa es un <strong>no contribuyente</strong> (una persona física sin RUT), el mismo artículo incrementa un 50% la base del IVA, y ahí el DUA sale bastante más caro de lo que muestra el cuadro. El simulador de arriba te da el punto de cruce asumiendo que importás como contribuyente.',
  },
  {
    q: '¿Y si el envío llega con el 60% pero yo no lo pago?',
    a: 'El Decreto 50/026 art. 14 da <strong>30 días</strong> desde el ingreso para pagar los tributos que correspondan cuando se constata un incumplimiento; vencido el plazo la mercadería se considera en <strong>abandono no infraccional</strong>. Y aun estando todo bien, si no retirás el envío del depósito en <strong>90 días</strong> desde su ingreso, también cae en abandono.',
  },
  {
    q: '¿Puedo importar con monotributo?',
    a: 'Sí. El Decreto 220/998 art. 132 prevé que los amparados por el monotributo paguen el IVA <strong>como no contribuyentes</strong> en el momento de la importación, y el art. 116 lit. c los exime del anticipo. La contra es que ese IVA queda como <strong>costo</strong>: no lo deducís. Una pequeña empresa del literal E también puede tener giro importador (Consulta DGI 6.410) — paga IVA importación y anticipo, y el anticipo lo descuenta del IVA mínimo mensual. Un contribuyente de IRAE con IVA general sí deduce el IVA, y por eso el mismo producto le cuesta menos.',
  },
  {
    q: '¿Los power banks realmente no entran?',
    a: 'No por courier, en la práctica. Un power bank <em>es</em> una batería de litio suelta, y los operadores postales publican que no transportan baterías de litio sin el dispositivo que alimentan. No es un permiso que se saque: es una restricción de transporte aéreo. Las alternativas son traerlos como carga con documentación de mercancía peligrosa (DUA y despachante) o comprarlos a un importador local. Confirmalo con tu courier <strong>antes</strong> de pagarle al proveedor.',
  },
  {
    q: '¿Y si mi producto necesita un certificado y no lo tengo?',
    a: 'El envío queda afuera de los dos regímenes postales: el Decreto 50/026 art. 7 excluye la mercadería que, requiriendo autorización de un organismo competente, no cuenta con ella. No es que pagues más — es que no entra. Con el certificado en la mano vuelve a entrar normalmente.',
  },
  {
    q: '¿Necesito registrarme como importador en algún lado?',
    a: 'Para la vía postal del 60%, no. Para el Régimen General el trámite lo arma el despachante y el importador tiene que estar identificado ante DGI; además, para los certificados de URSEC o URSEA vas a necesitar estar registrado en <strong>VUCE</strong> (Ventanilla Única de Comercio Exterior), que es donde se piden. El registro en VUCE es de la empresa, no tuyo personal.',
  },
]

// --- SEO ---
const canonicalUrl = 'https://cambio-uruguay.com/importar-para-revender-uruguay'
const title = 'Importar para revender en Uruguay 2026'
const description =
  'Hasta US$ 800 y 20 kg por envío importás para revender sin despachante ni DUA, pagando el 60% al courier: el Decreto 50/026 art. 2 admite personas jurídicas. Cuándo abrir la unipersonal, el cupo de 2 DUA por año y qué trámites piden cargadores, power banks y auriculares.'

defineOgImageComponent('Cambio', {
  title: '¿Necesito despachante para importar y revender?',
  subtitle: 'El 60%, la unipersonal y los trámites por producto',
  tag: 'IMPORTAR',
})

useSeoMeta({
  title: () => `${title} | Cambio Uruguay`,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'importar para revender uruguay, necesito despachante de aduana uruguay, importar sin despachante 800 dolares, impuesto 60 por ciento importacion uruguay, donde se paga el 60 aduana, abrir unipersonal para importar, importar accesorios de celular uruguay, ursec homologacion bluetooth, ursea autorizacion productos electricos, power bank courier uruguay, dos dua por año persona fisica, regimen general de importacion uruguay',
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
                name: 'Importar para revender en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: [...quickAnswers.map(a => ({ q: a.q, a: a.a })), ...faqs].map(f => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.eyebrow {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}
.section-heading {
  font-size: 1.25rem;
  font-weight: 800;
}
.answer-slab {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  padding: 18px 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(13, 27, 42, 0.96), rgba(27, 58, 87, 0.94));
  color: #fff;
}
.answer-mark {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}
.answer-label {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.78;
}
.answer-copy {
  font-size: 0.95rem;
  line-height: 1.62;
}
.quick-card,
.calc,
.steps-card,
.check-card,
.cost-card,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
}
.reason-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.88rem;
  line-height: 1.55;
}
.cost-title {
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.cost-figure {
  font-size: 1.6rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.cost-lines {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.82rem;
}
.cost-lines li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  border-top: 1px dashed rgba(var(--v-border-color), 0.2);
  padding-top: 6px;
}
.steps-list {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.step-when {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-primary));
}
.step-title {
  font-size: 0.98rem;
  font-weight: 700;
}
.step-body {
  font-size: 0.88rem;
  line-height: 1.6;
}
.step-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  font-size: 0.82rem;
  font-weight: 600;
}
.faq-panels {
  border: 1px solid rgba(var(--v-border-color), 0.14);
  border-radius: 12px;
  overflow: hidden;
}
.sources-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.85rem;
}
</style>
