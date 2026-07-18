<template>
  <VContainer class="rent-page py-6 py-md-10">
    <header class="hero mb-6">
      <p class="eyebrow">Vivienda · Uruguay · Verificado en julio de 2026</p>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">La guía para alquilar en Uruguay</h1>
      <p class="hero-copy text-body-1 text-medium-emphasis mb-4">
        Desde conseguir una habitación para esta semana hasta comparar garantías, revisar una
        vivienda y firmar sin sorpresas. Con rutas concretas, fuentes oficiales y una respuesta útil
        para quien llega diciendo: <strong>“necesito un techo urgente”</strong>.
      </p>
      <div class="d-flex flex-wrap ga-2">
        <VBtn color="error" href="#techo-hoy" prepend-icon="mdi-weather-night">
          Necesito techo hoy
        </VBtn>
        <VBtn color="primary" href="#armar-busqueda" prepend-icon="mdi-bullhorn-outline">
          Armar mi aviso
        </VBtn>
        <VBtn variant="outlined" href="#garantias" prepend-icon="mdi-shield-key-outline">
          Comparar garantías
        </VBtn>
      </div>
    </header>

    <VAlert
      type="warning"
      variant="tonal"
      border="start"
      class="mb-8"
      icon="mdi-timer-alert-outline"
    >
      <strong>Si el problema es esta noche, no empieces por un contrato.</strong> Primero asegurá un
      lugar seguro con los canales de emergencia de abajo. La búsqueda permanente puede empezar en
      paralelo, sin pagar señas por desesperación.
    </VAlert>

    <section id="techo-hoy" class="anchor-section mb-10" aria-labelledby="techo-hoy-title">
      <p class="step-kicker">Ruta urgente</p>
      <h2 id="techo-hoy-title" class="section-heading mb-2">Si podés quedar sin techo hoy</h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Estos son canales oficiales. Si existe riesgo médico, violencia o peligro inmediato, llamá
        al 911. No publiques documentos, dirección exacta ni datos sensibles en redes.
      </p>

      <VRow>
        <VCol v-for="resource in urgentResources" :key="resource.title" cols="12" md="4">
          <VCard class="resource-card pa-5 h-100" variant="flat">
            <VChip size="small" color="error" variant="tonal" class="mb-3">
              {{ resource.scope }}
            </VChip>
            <h3 class="text-subtitle-1 font-weight-bold mb-2">{{ resource.title }}</h3>
            <p class="text-body-2 text-medium-emphasis mb-3">{{ resource.action }}</p>
            <p class="resource-contact mb-4">{{ resource.contact }}</p>
            <VBtn
              :href="resource.url"
              target="_blank"
              rel="noopener noreferrer"
              variant="text"
              color="primary"
              size="small"
              append-icon="mdi-open-in-new"
            >
              Ver canal oficial
            </VBtn>
          </VCard>
        </VCol>
      </VRow>

      <div class="route-grid mt-5">
        <div class="route-step">
          <span>Hoy</span>
          <strong>Asegurá dónde dormir</strong>
          <p>Activá red personal y canal oficial; priorizá un lugar verificable y seguro.</p>
        </div>
        <div class="route-step">
          <span>24–72 h</span>
          <strong>Buscá habitación o pensión</strong>
          <p>Publicá un aviso completo, llamá en vez de solo escribir y agendá varias visitas.</p>
        </div>
        <div class="route-step">
          <span>1–3 semanas</span>
          <strong>Resolvé la vivienda estable</strong>
          <p>Definí garantía, costo total de entrada y contrato antes de entregar dinero.</p>
        </div>
      </div>
    </section>

    <section id="armar-busqueda" class="anchor-section mb-10" aria-labelledby="armar-title">
      <p class="step-kicker">Paso 1</p>
      <h2 id="armar-title" class="section-heading mb-2">
        Publicá un pedido que se pueda responder
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        “Busco algo barato cerca de Las Piedras” deja demasiadas preguntas. Completá lo esencial y
        copiá un aviso listo para Reddit, Marketplace o un grupo barrial. No pongas cédula, recibos
        de sueldo ni dirección actual: esos datos se comparten solo con una contraparte verificada.
      </p>

      <VCard variant="flat" class="post-builder pa-4 pa-sm-6">
        <VRow>
          <VCol cols="12" sm="6">
            <VTextField
              v-model.number="searchForm.budget"
              label="Presupuesto total mensual"
              prefix="$"
              type="number"
              min="0"
              hint="Incluí alquiler + gastos comunes"
              persistent-hint
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model="searchForm.zones"
              label="Zonas posibles"
              placeholder="La Paz, Colón, Las Piedras…"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VSelect
              v-model="searchForm.accommodation"
              :items="accommodationOptions"
              label="Qué aceptarías"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model="searchForm.moveDate"
              label="Cuándo necesitás entrar"
              placeholder="Hoy / esta semana / 1 de agosto"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model="searchForm.guarantee"
              label="Ingresos o garantía"
              placeholder="Trabajo formal, seguro, depósito, sin garantía…"
              variant="outlined"
            />
          </VCol>
          <VCol cols="12" sm="6">
            <VTextField
              v-model="searchForm.household"
              label="Quiénes vivirían"
              placeholder="1 adulto / pareja con un niño / mascota…"
              variant="outlined"
            />
          </VCol>
        </VRow>

        <label class="preview-label" for="rental-post-preview">Vista previa</label>
        <textarea id="rental-post-preview" class="post-preview" readonly :value="generatedPost" />
        <div class="d-flex align-center flex-wrap ga-3 mt-3">
          <VBtn color="primary" prepend-icon="mdi-content-copy" @click="copyPost">
            Copiar aviso
          </VBtn>
          <span class="text-body-2" role="status" aria-live="polite">{{ copyStatus }}</span>
        </div>
      </VCard>
    </section>

    <section class="mb-10" aria-labelledby="buscar-title">
      <p class="step-kicker">Paso 2</p>
      <h2 id="buscar-title" class="section-heading mb-2">
        Buscá en paralelo, no en un solo portal
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Guardá la misma búsqueda en varios canales y revisala mañana y tarde. Para una habitación o
        pensión, buscá también por barrio y combinaciones como “dueño directo”, “habitación” y
        “pensión”. Para una vivienda completa, filtrá primero por costo total y garantía aceptada.
      </p>
      <VRow>
        <VCol v-for="portal in portals" :key="portal.name" cols="12" sm="6">
          <VCard
            :href="portal.url"
            target="_blank"
            rel="noopener noreferrer"
            class="portal-card pa-5 h-100"
            variant="flat"
            hover
          >
            <div class="d-flex align-center justify-space-between ga-3 mb-2">
              <h3 class="text-subtitle-1 font-weight-bold">{{ portal.name }}</h3>
              <VIcon color="primary" size="20">mdi-open-in-new</VIcon>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-0">{{ portal.bestFor }}</p>
            <p v-if="portal.caution" class="portal-caution mt-3 mb-0">{{ portal.caution }}</p>
          </VCard>
        </VCol>
      </VRow>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-5">
        <strong>Si buscás pensión:</strong> pedí nombre y dirección, comprobá que el lugar exista y
        preguntá por habilitación, cerradura propia, baño/cocina, visitas, horarios, recibo y forma
        de salida. En Montevideo, las pensiones deben contar con habilitación y permiso
        departamental.
      </VAlert>
    </section>

    <section class="mb-10" aria-labelledby="presupuesto-title">
      <p class="step-kicker">Paso 3</p>
      <h2 id="presupuesto-title" class="section-heading mb-2">
        Calculá el costo real, no solo el aviso
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Estas cifras son referencias del modelo de costo de vida del sitio, no cotizaciones. El
        precio cambia por estado, barrio, muebles y fecha. Compará al menos cinco avisos similares
        antes de decidir si uno está barato o sospechosamente barato.
      </p>

      <VCard variant="flat" class="cost-card pa-2 pa-sm-5 mb-4">
        <div class="table-scroll">
          <VTable density="comfortable">
            <thead>
              <tr>
                <th>Vivienda en Montevideo</th>
                <th v-for="zone in zoneCols" :key="zone.id" class="text-right">
                  {{ zone.label }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in zoneRows" :key="row.key">
                <td class="font-weight-medium">{{ row.label }}</td>
                <td v-for="zone in zoneCols" :key="zone.id" class="text-right">
                  {{ formatUYU(row[zone.id]) }}
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </VCard>

      <div class="budget-formula">
        <div><span>1</span><strong>Alquiler publicado</strong></div>
        <VIcon>mdi-plus</VIcon>
        <div><span>2</span><strong>Gastos comunes</strong></div>
        <VIcon>mdi-plus</VIcon>
        <div><span>3</span><strong>Servicios y transporte</strong></div>
        <VIcon>mdi-equal</VIcon>
        <div class="budget-total"><span>4</span><strong>Costo mensual real</strong></div>
      </div>

      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-5">
        El 30% del ingreso para alquiler es una referencia de presupuesto,
        <strong>no una ley</strong>. Si el costo de vivienda te deja sin margen para comida,
        transporte e imprevistos, probá compartir, ampliar zonas o bajar de tipo de vivienda antes
        de firmar.
      </VAlert>

      <VBtn
        :to="localePath('/herramientas/costo-de-vida')"
        class="mt-4"
        color="primary"
        variant="outlined"
        prepend-icon="mdi-calculator-variant-outline"
      >
        Probar mi sueldo en la calculadora
      </VBtn>
    </section>

    <section id="garantias" class="anchor-section mb-10" aria-labelledby="garantias-title">
      <p class="step-kicker">Paso 4</p>
      <h2 id="garantias-title" class="section-heading mb-2">
        Conseguí la garantía antes de enamorarte de un aviso
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Preguntá qué garantías acepta el propietario y tramitá una preevaluación. No todas sirven
        para todos los perfiles ni todas las viviendas. Los datos siguientes vienen de cada
        proveedor o de la norma; cotizá tu caso antes de comprometerte.
      </p>

      <VExpansionPanels variant="accordion" class="guarantee-panels">
        <VExpansionPanel v-for="guarantee in guarantees" :key="guarantee.id">
          <VExpansionPanelTitle>
            <div>
              <strong>{{ guarantee.name }}</strong>
              <div class="text-caption text-medium-emphasis mt-1">{{ guarantee.summary }}</div>
            </div>
          </VExpansionPanelTitle>
          <VExpansionPanelText>
            <dl class="guarantee-grid">
              <div>
                <dt>Qué te piden</dt>
                <dd>{{ guarantee.requirements }}</dd>
              </div>
              <div>
                <dt>Costo</dt>
                <dd>{{ guarantee.cost }}</dd>
              </div>
              <div>
                <dt>Tiempo</dt>
                <dd>{{ guarantee.timing }}</dd>
              </div>
              <div>
                <dt>La contracara</dt>
                <dd>{{ guarantee.tradeoff }}</dd>
              </div>
            </dl>
            <VBtn
              :href="guarantee.officialUrl"
              target="_blank"
              rel="noopener noreferrer"
              size="small"
              variant="text"
              color="primary"
              append-icon="mdi-open-in-new"
            >
              Condiciones oficiales
            </VBtn>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <section class="mb-10" aria-labelledby="entrada-title">
      <p class="step-kicker">Paso 5</p>
      <h2 id="entrada-title" class="section-heading mb-2">Separá la plata de entrada</h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        No existe un único “costo de entrada”. Pedí un desglose por escrito antes de visitar para no
        descubrirlo al firmar.
      </p>
      <div class="entry-grid">
        <VCard variant="flat" class="entry-card pa-5">
          <VIcon color="primary" class="mb-3">mdi-calendar-month-outline</VIcon>
          <h3>Primer alquiler</h3>
          <p>Confirmá si se paga adelantado, la fecha de vencimiento y cómo te entregan recibo.</p>
        </VCard>
        <VCard variant="flat" class="entry-card pa-5">
          <VIcon color="primary" class="mb-3">mdi-shield-key-outline</VIcon>
          <h3>Garantía</h3>
          <p>
            Puede ser 3% mensual, prima de seguro o hasta 5 meses en depósito BHU, según la opción.
          </p>
        </VCard>
        <VCard variant="flat" class="entry-card pa-5">
          <VIcon color="primary" class="mb-3">mdi-office-building-outline</VIcon>
          <h3>Comisión</h3>
          <p>
            Suele ser un mes de alquiler más IVA, en un único pago al firmar. Se calcula sobre el
            alquiler, <strong>no</strong> sobre los gastos comunes. Pedila con IVA y factura.
          </p>
        </VCard>
        <VCard variant="flat" class="entry-card pa-5">
          <VIcon color="primary" class="mb-3">mdi-truck-cargo-container</VIcon>
          <h3>Mudanza y equipamiento</h3>
          <p>
            Sumá flete, cambio de titularidad, cerradura, cortinas, calefón y lo que realmente
            falte.
          </p>
        </VCard>
      </div>
    </section>

    <section class="mb-10" aria-labelledby="visita-title">
      <p class="step-kicker">Paso 6</p>
      <h2 id="visita-title" class="section-heading mb-2">
        Visitá como si fueras a discutir el depósito
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-5">
        Todo defecto que no quede documentado puede terminar atribuido a vos. Sacá fotos y video con
        fecha, pero hacé que el inventario escrito también lo refleje.
      </p>
      <ul class="check-list">
        <li v-for="item in visitChecklist" :key="item">
          <VIcon color="success" size="20">mdi-check-circle-outline</VIcon>
          <span>{{ item }}</span>
        </li>
      </ul>
    </section>

    <section class="mb-10" aria-labelledby="contrato-title">
      <p class="step-kicker">Paso 7</p>
      <h2 id="contrato-title" class="section-heading mb-2">
        No firmes hasta poder explicar cada cláusula
      </h2>
      <VRow class="mt-3">
        <VCol cols="12" md="7">
          <ul class="check-list compact">
            <li v-for="item in contractChecklist" :key="item">
              <VIcon color="primary" size="20">mdi-file-check-outline</VIcon>
              <span>{{ item }}</span>
            </li>
          </ul>
        </VCol>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="rights-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-3">
              Tres datos que suelen evitar peleas
            </h3>
            <ul>
              <li>
                La humedad estructural corresponde al arrendador, según Defensa del Consumidor.
              </li>
              <li>
                En SGA, el inventario puede objetarse desde los 5 días hábiles posteriores a la
                firma.
              </li>
              <li>
                Los gastos comunes deben separar conceptos exclusivos del propietario de los del
                inquilino.
              </li>
            </ul>
            <p class="text-caption text-medium-emphasis mt-4 mb-0">
              El régimen legal y el contrato importan. Ante una intimación o desalojo, buscá
              asesoramiento jurídico; no lo resuelvas con consejos de redes.
            </p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <section class="mb-10" aria-labelledby="estafas-title">
      <p class="step-kicker error-kicker">Antes de pagar</p>
      <h2 id="estafas-title" class="section-heading mb-2">Señales para frenar y verificar</h2>
      <div class="red-flags mt-4">
        <div v-for="flag in redFlags" :key="flag">
          <VIcon color="error" size="20">mdi-close-octagon-outline</VIcon>
          <span>{{ flag }}</span>
        </div>
      </div>
      <VAlert type="error" variant="tonal" density="comfortable" class="mt-5">
        <strong>Regla práctica:</strong> no transfieras por apuro. Verificá quién alquila, que el
        inmueble existe y que esa persona puede disponer de él; usá un pago trazable y exigí recibo.
        Si sospechás una estafa, guardá aviso, chat, perfil y comprobantes antes de denunciar.
      </VAlert>
    </section>

    <section class="mb-10" aria-labelledby="faq-title">
      <h2 id="faq-title" class="section-heading mb-4">Preguntas que aparecen una y otra vez</h2>
      <VExpansionPanels variant="accordion" class="faq-panels">
        <VExpansionPanel v-for="faq in faqs" :key="faq.q">
          <VExpansionPanelTitle>{{ faq.q }}</VExpansionPanelTitle>
          <VExpansionPanelText
            ><p class="mb-0">{{ faq.a }}</p></VExpansionPanelText
          >
        </VExpansionPanel>
      </VExpansionPanels>
    </section>

    <VCard variant="flat" class="sources-card pa-5 pa-sm-6 mb-6">
      <h2 class="text-subtitle-1 font-weight-bold mb-2">
        <VIcon start color="primary">mdi-bookshelf</VIcon>
        Fuentes y criterio de esta guía
      </h2>
      <p class="text-body-2 text-medium-emphasis mb-4">
        Priorizamos normas y organismos públicos para derechos y emergencias; condiciones oficiales
        de cada proveedor para garantías; y Reddit solo para detectar preguntas reales, nunca para
        convertir una anécdota en una regla. Enlaces verificados el {{ lastReviewedLabel }}.
      </p>
      <ul class="sources-list">
        <li v-for="source in sources" :key="source.url">
          <a :href="source.url" target="_blank" rel="noopener noreferrer">{{ source.label }}</a>
          <span>{{ source.detail }}</span>
        </li>
      </ul>
    </VCard>

    <VAlert type="info" variant="tonal" density="comfortable" icon="mdi-scale-balance">
      Esta guía orienta y enlaza fuentes; no sustituye asesoramiento jurídico ni una evaluación de
      emergencia. Las condiciones comerciales, topes y teléfonos pueden cambiar: confirmalos en el
      enlace oficial antes de actuar.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
import { COST_MODEL } from '~/utils/costOfLiving'
import { formatUYU } from '~/utils/format'
import {
  CONTRACT_CHECKLIST,
  GUARANTEE_OPTIONS,
  RENTAL_PORTALS,
  RENT_GUIDE_LAST_REVIEWED,
  RENT_GUIDE_SOURCES,
  RENT_RED_FLAGS,
  URGENT_HOUSING_RESOURCES,
  VISIT_CHECKLIST,
  buildRentalSearchPost,
} from '~/utils/rentGuide'

const localePath = useLocalePath()
const portals = RENTAL_PORTALS
const guarantees = GUARANTEE_OPTIONS
const urgentResources = URGENT_HOUSING_RESOURCES
const visitChecklist = VISIT_CHECKLIST
const contractChecklist = CONTRACT_CHECKLIST
const redFlags = RENT_RED_FLAGS
const sources = RENT_GUIDE_SOURCES

const searchForm = reactive({
  budget: 0,
  zones: '',
  accommodation: 'Habitación o pensión',
  moveDate: '',
  guarantee: '',
  household: '1 persona',
})
const accommodationOptions = [
  'Habitación o pensión',
  'Apartamento compartido',
  'Monoambiente',
  'Apartamento o casa',
  'Cualquiera de las anteriores',
]
const generatedPost = computed(() => buildRentalSearchPost(searchForm))
const copyStatus = ref('')

async function copyPost() {
  try {
    await navigator.clipboard.writeText(generatedPost.value)
    copyStatus.value = 'Aviso copiado.'
  } catch {
    copyStatus.value = 'No se pudo copiar automáticamente: seleccioná el texto de la vista previa.'
  }
}

const zoneCols = [
  { id: 'economico' as const, label: 'Zona económica' },
  { id: 'intermedio' as const, label: 'Zona media' },
  { id: 'costa' as const, label: 'Costa / premium' },
]
const dwellings = [
  { key: 'monoambiente', label: 'Monoambiente' },
  { key: '1_dormitorio', label: '1 dormitorio' },
  { key: '2_dormitorios', label: '2 dormitorios' },
] as const
const zoneRows = dwellings.map(dwelling => {
  const base = COST_MODEL.rentMontevideo[dwelling.key]
  return {
    key: dwelling.key,
    label: dwelling.label,
    economico: Math.round((base * COST_MODEL.zoneMultiplier.economico) / 500) * 500,
    intermedio: base,
    costa: Math.round((base * COST_MODEL.zoneMultiplier.costa) / 500) * 500,
  }
})

function formatReviewedDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
const lastReviewedLabel = formatReviewedDate(RENT_GUIDE_LAST_REVIEWED)

const faqs = [
  {
    q: 'No tengo garantía, ¿igual puedo alquilar?',
    a: 'Sí existe un régimen legal sin garantía, pero el propietario debe ofrecerlo y el contrato escrito debe acogerse expresamente a la Ley 19.889. La oferta es más escasa y los plazos de desalojo son más breves. También podés evaluar seguro, sumar ingresos de otras personas cuando el proveedor lo admita o acordar depósito en BHU.',
  },
  {
    q: '¿Puedo usar la garantía de otra persona?',
    a: 'Depende del proveedor. Porto permite componer ingresos de hasta cinco solicitantes y ANDA indica que puede evaluar un garante cuando ingreso o antigüedad no alcanzan. Esa persona asume una obligación real: no la agregues sin que entienda y acepte el contrato.',
  },
  {
    q: '¿Una habitación o pensión usa las mismas garantías?',
    a: 'No necesariamente. CGN excluye habitaciones de pensiones e inquilinatos porque exige un área de uso exclusivo con cocina y baño. En pensiones se suelen pactar otras condiciones; pedí recibo, reglas y forma de salida por escrito.',
  },
  {
    q: '¿Cuánto depósito pueden pedirme?',
    a: 'Para vivienda, el depósito formal en garantía acordado entre las partes puede llegar hasta cinco meses de alquiler y debe canalizarse por BHU. El BHU informa que puede integrarse hasta en diez pagos si ambas partes lo acuerdan y cobra un arancel de apertura del 5% del depósito.',
  },
  {
    q: '¿Quién paga una humedad o una reparación?',
    a: 'Defensa del Consumidor señala que la humedad estructural corresponde al arrendador. Otras reparaciones dependen del origen, el régimen y el contrato. Documentá el problema, notificá por un canal que deje constancia y buscá asesoramiento si no se resuelve.',
  },
  {
    q: '¿Qué hago si ya recibí una intimación o aviso de desalojo?',
    a: 'No ignores plazos ni confíes solo en redes. Contactá la Defensoría Pública, un consultorio jurídico gratuito o un abogado y llevá contrato, recibos, mensajes y la notificación completa. Defensa del Consumidor no interviene cuando la acción judicial ya comenzó.',
  },
  {
    q: '¿El depósito de garantía se devuelve al terminar el contrato?',
    a: 'Sí: el depósito es tuyo y funciona como respaldo, no como un pago al propietario. Al finalizar, se devuelve si entregás la vivienda en las condiciones pactadas y sin deudas. El propietario puede descontar alquileres o servicios impagos y los daños que excedan el desgaste normal por uso; las reparaciones que hacen a la habitabilidad (humedades, cañerías) son de su cargo, no del tuyo. El plazo y la forma de devolución deben figurar en el contrato: leé esa cláusula antes de firmar y, si no te lo devuelven sin motivo, podés reclamar en Defensa del Consumidor.',
  },
  {
    q: '¿La comisión de la inmobiliaria se calcula sobre el alquiler o también sobre los gastos comunes?',
    a: 'Solo sobre el alquiler. La comisión de intermediación equivale a un mes de alquiler más IVA, en un único pago al firmar, y se calcula sobre el precio del alquiler, no sobre los gastos comunes. Por ejemplo, con un alquiler de $1.000 y gastos comunes de $500, la comisión se calcula sobre $1.000. Pedí siempre factura con el IVA discriminado.',
  },
  {
    q: '¿Qué son los gastos comunes y quién los paga?',
    a: 'En un apartamento en propiedad horizontal, los gastos comunes ordinarios (limpieza, portería, ascensor, mantenimiento, saneamiento) los paga el inquilino como servicio accesorio, junto con UTE, OSE y tributos municipales. Los gastos extraordinarios y las obras estructurales del edificio corresponden al propietario. Pedí la última liquidación de gastos comunes antes de firmar para no llevarte sorpresas.',
  },
  {
    q: '¿Cada cuánto y con qué índice aumenta el alquiler?',
    a: 'El alquiler se reajusta cada 12 meses. En los contratos bajo la LUC (Ley 19.889), si no se pacta otra cosa, el ajuste anual es la variación del Índice de Precios al Consumo (IPC). Confirmá en el contrato el índice y la frecuencia antes de firmar y no aceptes una fórmula que no puedas explicar con tus palabras.',
  },
  {
    q: '¿Quién paga una reparación, como una humedad?',
    a: 'Las reparaciones que hacen a la habitabilidad de la vivienda (humedades, roturas de cañerías) son de cargo del propietario. Las reparaciones locativas que surgen del uso corriente corren por tu cuenta. Documentá el problema con fotos y notificalo por un canal que deje constancia; si no se resuelve, consultá en Defensa del Consumidor.',
  },
]

const canonicalUrl = 'https://cambio-uruguay.com/alquilar-en-uruguay'
const title = 'Cómo alquilar en Uruguay: guía definitiva y ruta urgente (2026)'
const description =
  'Guía completa para alquilar en Uruguay: qué hacer si necesitás techo hoy, cómo buscar habitación o vivienda, garantías ANDA, CGN, seguro, BHU y sin garantía, costos, contrato, derechos y estafas.'

defineOgImageComponent('Cambio', {
  title: 'La guía para alquilar en Uruguay',
  subtitle: 'Ruta urgente, búsqueda, garantías, contrato y estafas',
  tag: 'VIVIENDA',
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
        'alquilar en uruguay, necesito techo urgente uruguay, pensiones montevideo, habitación alquiler, garantía alquiler uruguay, ANDA garantía, CGN alquiler, depósito BHU, alquiler sin garantía, contrato alquiler uruguay, estafas alquiler',
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
              { '@type': 'ListItem', position: 2, name: 'Alquilar en Uruguay', item: canonicalUrl },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            dateModified: RENT_GUIDE_LAST_REVIEWED,
            mainEntityOfPage: canonicalUrl,
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: { '@type': 'Answer', text: faq.a },
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.rent-page {
  max-width: 1100px;
}
.hero {
  max-width: 900px;
}
.eyebrow,
.step-kicker {
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.09em;
  margin-bottom: 5px;
  text-transform: uppercase;
}
.error-kicker {
  color: rgb(var(--v-theme-error));
}
.hero-copy {
  font-size: 1.05rem !important;
  line-height: 1.7;
  max-width: 820px;
}
.section-heading {
  font-size: clamp(1.35rem, 3vw, 1.75rem);
  font-weight: 800;
  line-height: 1.25;
}
.anchor-section {
  scroll-margin-top: 90px;
}
.resource-card,
.portal-card,
.post-builder,
.cost-card,
.entry-card,
.rights-card,
.sources-card {
  border: 1px solid rgba(var(--v-border-color), 0.15);
  border-radius: 16px;
}
.resource-contact {
  color: rgb(var(--v-theme-error));
  font-size: 1rem;
  font-weight: 800;
}
.route-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, 1fr);
}
.route-step {
  border-left: 3px solid rgb(var(--v-theme-primary));
  padding: 4px 16px;
}
.route-step span {
  color: rgb(var(--v-theme-primary));
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}
.route-step strong {
  display: block;
  margin: 3px 0;
}
.route-step p {
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.82rem;
  line-height: 1.5;
  margin: 0;
}
.preview-label {
  display: block;
  font-size: 0.78rem;
  font-weight: 700;
  margin-bottom: 6px;
}
.post-preview {
  background: rgba(var(--v-theme-on-surface), 0.035);
  border: 1px solid rgba(var(--v-border-color), 0.22);
  border-radius: 12px;
  color: rgb(var(--v-theme-on-surface));
  font: inherit;
  font-size: 0.9rem;
  line-height: 1.55;
  min-height: 275px;
  padding: 14px;
  resize: vertical;
  width: 100%;
}
.post-preview:focus {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}
.portal-card {
  color: inherit;
  text-decoration: none;
}
.portal-caution {
  color: rgb(var(--v-theme-error));
  font-size: 0.78rem;
  line-height: 1.45;
}
.table-scroll {
  overflow-x: auto;
}
.table-scroll th,
.table-scroll td {
  white-space: nowrap;
}
.budget-formula {
  align-items: stretch;
  display: flex;
  gap: 10px;
  justify-content: center;
}
.budget-formula > div {
  background: rgba(var(--v-theme-primary), 0.06);
  border-radius: 12px;
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 14px;
}
.budget-formula span {
  color: rgb(var(--v-theme-primary));
  font-size: 0.72rem;
  font-weight: 800;
}
.budget-formula .budget-total {
  background: rgba(var(--v-theme-success), 0.11);
}
.budget-formula > .v-icon {
  align-self: center;
  flex: 0 0 auto;
}
.guarantee-panels,
.faq-panels {
  border: 1px solid rgba(var(--v-border-color), 0.15);
  border-radius: 16px;
  overflow: hidden;
}
.guarantee-grid {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(2, 1fr);
}
.guarantee-grid dt {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.guarantee-grid dd {
  font-size: 0.86rem;
  line-height: 1.55;
  margin: 4px 0 0;
}
.entry-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, 1fr);
}
.entry-card h3 {
  font-size: 0.95rem;
  margin-bottom: 7px;
}
.entry-card p {
  color: rgba(var(--v-theme-on-surface), 0.7);
  font-size: 0.8rem;
  line-height: 1.5;
  margin: 0;
}
.check-list {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, 1fr);
  list-style: none;
  margin: 0;
  padding: 0;
}
.check-list.compact {
  grid-template-columns: 1fr;
}
.check-list li {
  align-items: flex-start;
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12);
  display: flex;
  font-size: 0.88rem;
  gap: 10px;
  line-height: 1.55;
  padding: 10px 0;
}
.check-list .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
}
.rights-card ul {
  margin: 0;
  padding-left: 18px;
}
.rights-card li {
  font-size: 0.84rem;
  line-height: 1.55;
  margin-bottom: 8px;
}
.red-flags {
  background: rgba(var(--v-theme-error), 0.055);
  border: 1px solid rgba(var(--v-theme-error), 0.2);
  border-radius: 16px;
  display: grid;
  gap: 4px;
  padding: 16px;
}
.red-flags > div {
  align-items: flex-start;
  display: flex;
  font-size: 0.88rem;
  gap: 10px;
  line-height: 1.5;
  padding: 7px;
}
.red-flags .v-icon {
  flex: 0 0 auto;
  margin-top: 1px;
}
.sources-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.sources-list li {
  display: flex;
  flex-direction: column;
  font-size: 0.84rem;
  line-height: 1.45;
}
.sources-list a {
  font-weight: 700;
}
.sources-list span {
  color: rgba(var(--v-theme-on-surface), 0.62);
}
@media (max-width: 900px) {
  .entry-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .budget-formula {
    display: grid;
    grid-template-columns: 1fr;
  }
  .budget-formula > .v-icon {
    transform: rotate(90deg);
  }
}
@media (max-width: 600px) {
  .route-grid,
  .guarantee-grid,
  .entry-grid,
  .check-list {
    grid-template-columns: 1fr;
  }
  .hero .v-btn {
    flex: 1 1 100%;
  }
  .post-preview {
    min-height: 360px;
  }
}
</style>
