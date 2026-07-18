<template>
  <VContainer class="page py-6" style="max-width: 1100px">
    <VBtn :to="localePath('/economia-uruguay')" variant="text" size="small" class="px-1 mb-2">
      <VIcon start icon="mdi-arrow-left" /> Economía
    </VBtn>

    <!-- Hero -->
    <VCard class="hero pa-6 pa-md-8 mb-6" rounded="xl">
      <div class="eyebrow mb-2">Análisis · actualizado el 12 de julio de 2026</div>
      <h1 class="hero-title mb-3">¿Por qué el BCU quiere que usemos más el peso?</h1>
      <p class="hero-lead mb-4">
        Qué busca la desdolarización, cómo podría beneficiar a la población y cuáles son sus
        riesgos. Una respuesta al debate sobre el "bimonetarismo" uruguayo, con datos y sin asumir
        que el Banco Central tiene razón por definición.
      </p>
      <div class="d-flex flex-wrap ga-3 mb-4">
        <VBtn href="#respuesta" color="primary" rounded="pill">
          Ir a la respuesta
          <VIcon end icon="mdi-arrow-down" />
        </VBtn>
        <VBtn
          href="https://www.reddit.com/r/uruguay/comments/1uuu7zc/por_qu%C3%A9_el_banco_central_quiere_incetivar_el_uso/"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          rounded="pill"
        >
          Ver pregunta original
          <VIcon end size="17" icon="mdi-open-in-new" />
        </VBtn>
      </div>
      <ShareButtons text="¿Por qué el BCU quiere que usemos más el peso? Un análisis con fuentes" />
    </VCard>

    <!-- En una frase -->
    <VCard variant="tonal" color="primary" class="pa-5 mb-6" rounded="lg">
      <div class="eyebrow mb-2">En una frase</div>
      <p class="text-body-1 mb-0">
        El objetivo principal no es "prohibir el dólar", sino lograr que una economía que cobra
        salarios y paga impuestos en pesos también pueda
        <strong>ahorrar y prestar más en pesos</strong>. Eso hace más útil la política monetaria y
        reduce riesgos cambiarios.
      </p>
    </VCard>

    <!-- Veredicto -->
    <h2 id="respuesta" class="section-heading" style="scroll-margin-top: 90px">
      Veredicto: parcialmente correcto, pero mal planteado
    </h2>
    <p class="mb-4 text-body-1" style="opacity: 0.9">
      Sí: el BCU está incentivando el ahorro, el crédito y la inversión en moneda nacional. No: la
      evidencia disponible no muestra que busque terminar con el bimonetarismo ni impedir que las
      personas ahorren o compren bienes en dólares.
    </p>
    <VRow>
      <VCol cols="12" md="6">
        <VAlert type="success" variant="tonal" class="h-100" density="comfortable">
          <div class="font-weight-bold mb-1">Lo confirmado</div>
          <p class="mb-2 text-body-2">
            El BCU llama a esto una agenda "gradual de incentivos" y modificó los encajes para
            favorecer la intermediación en pesos y UI.
          </p>
          <a :href="sources[0].url" target="_blank" rel="noopener noreferrer">BCU · jun 2026 ↗</a>
        </VAlert>
      </VCol>
      <VCol cols="12" md="6">
        <VAlert type="warning" variant="tonal" class="h-100" density="comfortable">
          <div class="font-weight-bold mb-1">Lo que no está demostrado</div>
          <p class="mb-2 text-body-2">
            No hay una prohibición del dólar, conversión forzosa de depósitos ni evidencia de que el
            objetivo declarado sea recaudar mediante inflación.
          </p>
          <span class="text-caption font-weight-bold">Incentivar no equivale a obligar</span>
        </VAlert>
      </VCol>
    </VRow>

    <!-- Fact strip -->
    <VRow class="mt-2">
      <VCol v-for="f in facts" :key="f.label" cols="12" sm="4">
        <VCard variant="outlined" rounded="lg" class="pa-4 h-100 text-center">
          <div class="stat-num">{{ f.value }}</div>
          <div class="text-body-2 text-medium-emphasis">{{ f.label }}</div>
        </VCard>
      </VCol>
    </VRow>
    <p class="text-caption text-medium-emphasis mt-2 mb-6">
      Valores redondeados para comunicar órdenes de magnitud. Fuentes:
      <a :href="sources[3].url" target="_blank" rel="noopener noreferrer">FMI 2024</a> y
      <a :href="sources[2].url" target="_blank" rel="noopener noreferrer">FMI 2025</a>.
    </p>

    <!-- El mecanismo -->
    <h2 class="section-heading">¿Qué problema económico intenta resolver?</h2>
    <p class="mb-4 text-body-1" style="opacity: 0.9">
      Los bancos prestan, en gran medida, en la moneda en la que consiguen depósitos. Si reciben
      muchos dólares y pocos pesos, el crédito en pesos queda más escaso y suele ser más caro. Eso
      crea tres problemas conectados.
    </p>
    <VRow>
      <VCol v-for="(step, index) in mechanism" :key="step.title" cols="12" md="4">
        <VCard variant="outlined" rounded="lg" class="pa-5 h-100">
          <div class="d-flex align-center ga-3 mb-3">
            <VAvatar color="primary" variant="tonal" size="40">{{ index + 1 }}</VAvatar>
            <VIcon :icon="step.icon" color="primary" size="26" />
          </div>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ step.title }}</h3>
          <p class="mb-0 text-body-2 text-medium-emphasis">{{ step.text }}</p>
        </VCard>
      </VCol>
    </VRow>
    <VAlert type="info" variant="tonal" class="mt-4" density="comfortable" icon="mdi-flask-outline">
      El diagnóstico no proviene solo del BCU. El FMI concluyó que la dolarización limita la oferta
      de préstamos en pesos y que una mayor liquidez en moneda local podría reducir los márgenes
      bancarios. Es evidencia a favor del mecanismo, no una garantía de que cada medida concreta
      llegue al consumidor.
      <a :href="sources[3].url" target="_blank" rel="noopener noreferrer">Ver informe ↗</a>
    </VAlert>

    <!-- Beneficios -->
    <h2 class="section-heading">¿Cómo podría beneficiar a la población?</h2>
    <p class="mb-4 text-body-1" style="opacity: 0.9">
      "Podría" es la palabra importante: los beneficios dependen de que el menor costo bancario se
      traduzca en mejores productos, exista competencia y la inflación siga anclada.
    </p>
    <VRow>
      <VCol v-for="benefit in benefits" :key="benefit.title" cols="12" md="6">
        <VCard variant="outlined" rounded="lg" class="pa-5 h-100">
          <VAvatar color="primary" variant="tonal" size="44" class="mb-3">
            <VIcon :icon="benefit.icon" size="24" />
          </VAvatar>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ benefit.title }}</h3>
          <p class="mb-2 text-body-2 text-medium-emphasis">{{ benefit.text }}</p>
          <VChip size="x-small" color="primary" variant="tonal" label>{{ benefit.who }}</VChip>
        </VCard>
      </VCol>
    </VRow>
    <VCard variant="tonal" color="primary" rounded="lg" class="pa-5 mt-4">
      <div class="eyebrow mb-2">Ejemplo simple</div>
      <p class="mb-0 text-body-2">
        Una panadería vende en pesos. Si se endeuda en dólares y el dólar sube 20%, su deuda medida
        en ventas también sube 20%. Un préstamo en pesos o UI puede tener otra tasa, pero elimina
        ese salto cambiario. Para un exportador que cobra en dólares, en cambio, endeudarse en
        dólares puede ser perfectamente razonable.
      </p>
    </VCard>

    <!-- Chequeo de argumentos -->
    <h2 class="section-heading">Cuatro afirmaciones del debate, puestas a prueba</h2>
    <VRow>
      <VCol v-for="claim in claims" :key="claim.title" cols="12">
        <VCard variant="outlined" rounded="lg" class="pa-5">
          <div class="d-flex flex-wrap align-center ga-3 mb-2">
            <VChip :color="claimColor(claim.tone)" variant="tonal" size="small" label>
              {{ claim.status }}
            </VChip>
            <h3 class="text-subtitle-1 font-weight-bold mb-0">"{{ claim.title }}"</h3>
          </div>
          <p class="mb-2 text-body-2 text-medium-emphasis">{{ claim.answer }}</p>
          <a
            v-if="claim.source"
            :href="claim.source"
            target="_blank"
            rel="noopener noreferrer"
            class="src-link"
            >Fuente / contexto ↗</a
          >
        </VCard>
      </VCol>
    </VRow>

    <!-- Costos y salvaguardas -->
    <h2 class="section-heading">La desdolarización también puede salir mal</h2>
    <p class="mb-4 text-body-1" style="opacity: 0.9">
      La literatura internacional advierte que una desdolarización abrupta o coercitiva puede sacar
      ahorro del sistema financiero o trasladar riesgos a otras partes. Por eso importa tanto el
      método como el objetivo.
    </p>
    <div style="overflow-x: auto">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Riesgo</th>
            <th>Qué exigir para mitigarlo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="risk in risks" :key="risk.name">
            <td class="font-weight-medium" data-label="Riesgo">
              <VIcon :icon="risk.icon" color="warning" size="18" class="mr-1" />{{ risk.name }}
            </td>
            <td class="text-body-2" data-label="Qué exigir para mitigarlo">{{ risk.guardrail }}</td>
          </tr>
        </tbody>
      </VTable>
    </div>
    <VAlert type="warning" variant="tonal" class="mt-4" density="comfortable">
      <strong>La prueba decisiva no es cuántos depósitos se pasan a pesos.</strong> Es si las
      personas obtienen mejor crédito, si preservan su poder de compra y si conservan la libertad de
      elegir moneda. Sin esas tres condiciones, el beneficio social es discutible.
    </VAlert>

    <!-- Qué cambia en la práctica -->
    <h2 class="section-heading">Las medidas concretas, sin jerga</h2>
    <VRow>
      <VCol v-for="m in measures" :key="m.title" cols="12" md="4">
        <VCard variant="outlined" rounded="lg" class="pa-5 h-100">
          <VChip color="primary" variant="tonal" size="small" label class="mb-3">{{
            m.when
          }}</VChip>
          <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ m.title }}</h3>
          <p class="mb-2 text-body-2 text-medium-emphasis">{{ m.text }}</p>
          <a
            v-if="m.source"
            :href="m.source"
            target="_blank"
            rel="noopener noreferrer"
            class="src-link"
            >{{ m.sourceLabel }} ↗</a
          >
        </VCard>
      </VCol>
    </VRow>

    <!-- Conclusión -->
    <h2 class="section-heading">Entonces, ¿a quién le creemos?</h2>
    <VCard variant="tonal" color="primary" rounded="lg" class="pa-5 pa-md-6 mb-6">
      <p class="mb-3">
        A ninguna narrativa completa. El argumento técnico del BCU es sólido en su núcleo: una
        economía menos dolarizada puede tener una política monetaria más eficaz, menos descalces y
        más crédito en la moneda de los ingresos. El contraargumento también es válido: ampliar el
        peso amplía la capacidad del Estado de afectar el ahorro mediante inflación y de financiarse
        localmente.
      </p>
      <p class="mb-0">
        La defensa razonable de la agenda no es "el peso siempre es mejor", sino
        <strong
          >más opciones competitivas en pesos y UI, inflación baja y libertad de mantener
          dólares</strong
        >. Si falta cualquiera de esas condiciones, la desconfianza es racional.
      </p>
    </VCard>

    <!-- Fuentes -->
    <h2 class="section-heading">Fuentes y metodología</h2>
    <p class="text-caption text-medium-emphasis mb-3">
      Priorizamos normas y comunicados del BCU para saber qué decidió; FMI y BID para contrastar el
      diagnóstico. Las declaraciones del BCU prueban su intención declarada, no prueban por sí solas
      que los beneficios ocurrirán. Consulta realizada el 12/07/2026 · {{ sources.length }} fuentes,
      mayoría primarias.
    </p>
    <VCard variant="outlined" rounded="lg" class="pa-2 mb-6">
      <VList density="comfortable" bg-color="transparent">
        <VListItem v-for="(source, index) in sources" :key="source.url">
          <template #prepend>
            <span class="src-num">{{ String(index + 1).padStart(2, '0') }}</span>
          </template>
          <VListItemTitle class="text-wrap">
            <a :href="source.url" target="_blank" rel="noopener noreferrer" class="src-link">{{
              source.title
            }}</a>
          </VListItemTitle>
          <VListItemSubtitle class="text-wrap">
            {{ source.publisher }} · {{ source.date }} — {{ source.use }}
          </VListItemSubtitle>
        </VListItem>
      </VList>
    </VCard>

    <!-- Enlaces relacionados -->
    <h2 class="section-heading">Seguí leyendo</h2>
    <VRow>
      <VCol cols="12" md="4">
        <NuxtLink :to="localePath('/por-que-sube-el-dolar')" class="cross-link pa-4 h-100">
          <div class="font-weight-bold mb-1">¿Por qué sube el dólar?</div>
          <div class="text-body-2 text-medium-emphasis">
            Qué mueve la cotización día a día, con datos y correlaciones.
          </div>
        </NuxtLink>
      </VCol>
      <VCol cols="12" md="4">
        <NuxtLink :to="localePath('/inversiones-uruguay')" class="cross-link pa-4 h-100">
          <div class="font-weight-bold mb-1">Ahorrar e invertir</div>
          <div class="text-body-2 text-medium-emphasis">
            Opciones en pesos, UI y dólares para proteger tu poder de compra.
          </div>
        </NuxtLink>
      </VCol>
      <VCol cols="12" md="4">
        <NuxtLink :to="localePath('/indicadores/inflacion')" class="cross-link pa-4 h-100">
          <div class="font-weight-bold mb-1">Inflación en Uruguay</div>
          <div class="text-body-2 text-medium-emphasis">
            El dato que decide si desdolarizar conviene o no.
          </div>
        </NuxtLink>
      </VCol>
    </VRow>

    <VAlert type="info" variant="tonal" class="mt-8" density="comfortable">
      Información con fines educativos, no asesoramiento financiero. Verificá siempre los datos en
      la fuente oficial.
    </VAlert>
  </VContainer>
</template>

<script setup lang="ts">
const localePath = useLocalePath()

const claimColor = (tone: string) =>
  tone === 'true' ? 'success' : tone === 'false' ? 'error' : 'warning'

const facts = [
  { value: '≈ 7 de cada 10', label: 'depósitos estaban en dólares' },
  { value: '≈ 1 de cada 2', label: 'créditos estaba en dólares' },
  { value: '31% del PIB', label: 'era el crédito privado en 2025' },
]

const mechanism = [
  {
    icon: 'mdi-safe-square-outline',
    title: 'Ahorro dolarizado',
    text: 'Los bancos reciben abundantes depósitos en USD y relativamente pocos en UYU.',
  },
  {
    icon: 'mdi-bank-transfer',
    title: 'Crédito segmentado',
    text: 'Hay liquidez en dólares, pero el fondeo en pesos es más escaso y costoso.',
  },
  {
    icon: 'mdi-store-alert-outline',
    title: 'Riesgo desigual',
    text: 'Hogares y empresas sin ingresos en USD quedan expuestos si se endeudan en esa moneda.',
  },
]

const benefits = [
  {
    icon: 'mdi-home-percent-outline',
    title: 'Más crédito en la moneda del ingreso',
    text: 'Una deuda en pesos o UI evita que una suba del dólar infle de golpe la cuota medida contra el salario.',
    who: 'Hogares y empresas no exportadoras',
  },
  {
    icon: 'mdi-chart-bell-curve-cumulative',
    title: 'Tasas del BCU con mayor alcance',
    text: 'Si más contratos están en pesos, subir o bajar la tasa de política afecta una porción mayor del crédito y la demanda.',
    who: 'Toda la economía, de forma indirecta',
  },
  {
    icon: 'mdi-shield-sun-outline',
    title: 'Menos fragilidad ante saltos del dólar',
    text: 'Se reducen descalces entre lo que una persona o empresa cobra y la moneda en la que debe.',
    who: 'Deudores con ingresos en UYU',
  },
  {
    icon: 'mdi-storefront-outline',
    title: 'Mercado financiero local más profundo',
    text: 'Más ahorro local puede financiar inversión privada y pública sin importar todo el riesgo cambiario.',
    who: 'Pymes, Estado e inversores locales',
  },
]

const sourcesBase = {
  bcuMeasures:
    'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=513&title=El-Banco-Central-anuncia-medidas-para-fortalecer-el-ahorro%2C-el-cr%C3%A9dito-y-la-inversi%C3%B3n-en-moneda-nacional',
  bcuResolution:
    'https://www.bcu.gub.uy/Acerca-de-BCU/Resoluciones%20de%20Directorio/RESOLUCION_D_383_2025.PDF',
  imf2025:
    'https://www.imf.org/es/news/articles/2025/09/19/cs-091925-uruguay-staff-concluding-statement-of-the-2025-article-iv-mission',
  imf2024:
    'https://www.imf.org/en/publications/cr/issues/2024/07/11/uruguay-2024-article-iv-consultation-press-release-and-staff-report-551750',
  imfPaper:
    'https://www.imf.org/en/publications/wp/issues/2023/11/24/taming-financial-dollarization-determinants-and-effective-policies-the-case-of-uruguay-541781',
  idb: 'https://publications.iadb.org/es/publicacion/11769/financial-dollarization-and-dedollarization',
  bcuTalk:
    'https://www.bcu.gub.uy/Comunicaciones/Paginas/Detalle-Noticia.aspx?noticia=474&title=Guillermo-Tolosa-destac%C3%B3-que-fijar-precios-en-pesos-aporta-mayor-previsibilidad-a-las-ventas-y-a-las-finanzas-de-los-negocios',
}

const claims = [
  {
    status: 'Engañoso',
    tone: 'mixed',
    title: 'Es para cobrar más impuesto inflacionario',
    answer:
      'Una mayor demanda de pesos sí puede aumentar el señoreaje potencial. Pero el impuesto inflacionario aparece cuando la emisión provoca inflación, no por el simple cambio de moneda de un depósito. Las medidas publicadas operan sobre encajes bancarios; no prueban una intención fiscal oculta.',
    source: sourcesBase.bcuMeasures,
  },
  {
    status: 'Mayormente cierto',
    tone: 'true',
    title: 'El BCU quiere recuperar control sobre la economía',
    answer:
      'Sí, si "control" significa que su tasa de interés influya sobre más préstamos y gastos. Con muchos contratos en dólares, una parte de la economía responde más a la Reserva Federal que al BCU. Eso puede estabilizar precios, pero también exige independencia y rendición de cuentas.',
    source: sourcesBase.imf2025,
  },
  {
    status: 'Posible, no probado',
    tone: 'mixed',
    title: 'Quieren que el ahorro financie al gobierno',
    answer:
      'Un mercado en pesos más profundo también facilita deuda pública en moneda local, y reduce el riesgo fiscal de una devaluación. Pero los depósitos bancarios no van automáticamente al Estado, y las medidas actuales se justifican por crédito e intermediación. Es un efecto posible, no evidencia del motivo principal.',
    source: sourcesBase.bcuResolution,
  },
  {
    status: 'Falso dilema',
    tone: 'false',
    title: 'Hay que elegir entre peso o dólar',
    answer:
      'La moneda conveniente depende del flujo: quien cobra dólares puede endeudarse en dólares; quien cobra pesos reduce riesgo endeudándose en pesos o UI. Un sistema sano puede mantener ambas monedas sin que una domine todos los usos.',
    source: sourcesBase.imfPaper,
  },
]

const risks = [
  {
    icon: 'mdi-trending-up',
    name: 'Inflación o pérdida de credibilidad',
    guardrail:
      'Meta clara, datos abiertos, independencia operativa y tasas reales que protejan al ahorrista.',
  },
  {
    icon: 'mdi-gavel',
    name: 'Coerción o controles',
    guardrail:
      'Mantener convertibilidad, libertad contractual y un proceso basado en incentivos, no prohibiciones.',
  },
  {
    icon: 'mdi-bank-off-outline',
    name: 'Ahorro fuera del sistema',
    guardrail:
      'Evitar medidas abruptas que empujen depósitos al exterior, efectivo o activos opacos.',
  },
  {
    icon: 'mdi-cash-lock',
    name: 'Beneficio capturado por bancos',
    guardrail:
      'Medir si bajan spreads y mejoran tasas/plazos; fomentar competencia y portabilidad.',
  },
  {
    icon: 'mdi-chart-timeline-variant-shimmer',
    name: 'Riesgo trasladado al ahorrista',
    guardrail:
      'Ofrecer UI, tasas transparentes y variedad de plazos; no vender el peso como libre de riesgo.',
  },
]

const measures = [
  {
    when: '1 mar. 2026',
    title: 'Primer cambio de incentivos',
    text: 'Comenzó a regir una remuneración más favorable para encajes en moneda nacional y menos favorable para moneda extranjera. El encaje es la parte de los depósitos que el banco debe inmovilizar en el BCU.',
    source: sourcesBase.bcuResolution,
    sourceLabel: 'Resolución D/383/2025',
  },
  {
    when: '12 jun. 2026',
    title: 'Profundización gradual',
    text: 'El BCU redujo progresivamente las alícuotas de encaje sobre obligaciones de corto plazo en pesos y UI, con convergencia a 12% desde setiembre, y profundizó el ajuste para moneda extranjera.',
    source: sourcesBase.bcuMeasures,
    sourceLabel: 'Comunicado del BCU',
  },
  {
    when: 'Lo que sigue',
    title: 'La transmisión no es automática',
    text: 'Cada banco decide si transforma el alivio regulatorio en mejores tasas, más plazos o nuevos productos. El efecto final deberá observarse en datos de depósitos, crédito, tasas y morosidad.',
    source: '',
    sourceLabel: '',
  },
]

const sources = [
  {
    title: 'Medidas para fortalecer el ahorro, el crédito y la inversión en moneda nacional',
    publisher: 'Banco Central del Uruguay',
    date: '12/06/2026',
    use: 'Medidas vigentes y mecanismo de encajes.',
    url: sourcesBase.bcuMeasures,
  },
  {
    title: 'Resolución D/383/2025 — remuneración de encajes',
    publisher: 'Banco Central del Uruguay',
    date: '26/11/2025',
    use: 'Fundamento normativo e intención expresa de desdolarización.',
    url: sourcesBase.bcuResolution,
  },
  {
    title: 'Consulta del Artículo IV de 2025: declaración final',
    publisher: 'Fondo Monetario Internacional',
    date: '19/09/2025',
    use: 'Crédito/PIB, riesgos y diagnóstico independiente.',
    url: sourcesBase.imf2025,
  },
  {
    title: 'Uruguay: Consulta del Artículo IV de 2024',
    publisher: 'Fondo Monetario Internacional',
    date: '11/07/2024',
    use: 'Dolarización de depósitos y préstamos; spreads bancarios.',
    url: sourcesBase.imf2024,
  },
  {
    title: 'Taming Financial Dollarization: The Case of Uruguay',
    publisher: 'Fondo Monetario Internacional',
    date: '24/11/2023',
    use: 'Determinantes, costos y opciones de política para Uruguay.',
    url: sourcesBase.imfPaper,
  },
  {
    title: 'Financial Dollarization and Dedollarization',
    publisher: 'Banco Interamericano de Desarrollo',
    date: '2005',
    use: 'Riesgos de políticas abruptas y comparación internacional.',
    url: sourcesBase.idb,
  },
  {
    title: 'Fijar precios en pesos aporta mayor previsibilidad',
    publisher: 'Banco Central del Uruguay',
    date: '31/10/2025',
    use: 'Argumento oficial sobre precios, ventas y poder adquisitivo.',
    url: sourcesBase.bcuTalk,
  },
]

const canonical = 'https://cambio-uruguay.com/por-que-el-bcu-quiere-mas-pesos'
useSeoMeta({
  title: '¿Por qué el BCU quiere incentivar el peso uruguayo? | Análisis objetivo',
  description:
    'Qué busca la desdolarización en Uruguay, cómo puede beneficiar a la población, cuáles son sus riesgos y qué dicen las fuentes del BCU, FMI y BID.',
  ogTitle: '¿Por qué el BCU quiere que usemos más el peso?',
  ogDescription:
    'Una respuesta objetiva al debate sobre desdolarización y bimonetarismo uruguayo, con fuentes y argumentos a favor y en contra.',
  ogType: 'article',
  ogUrl: canonical,
  twitterCard: 'summary_large_image',
})
useHead({
  link: [{ rel: 'canonical', href: canonical }],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: '¿Por qué el Banco Central quiere incentivar el uso del peso?',
        description: 'Análisis objetivo de la desdolarización y el bimonetarismo uruguayo.',
        datePublished: '2026-07-12',
        dateModified: '2026-07-12',
        inLanguage: 'es-UY',
        mainEntityOfPage: canonical,
        author: { '@type': 'Organization', name: 'Cambio Uruguay' },
        publisher: {
          '@type': 'Organization',
          name: 'Cambio Uruguay',
          url: 'https://cambio-uruguay.com',
        },
        citation: sources.map(s => s.url),
      }),
    },
  ],
})
defineOgImageComponent('Cambio', {
  title: '¿Por qué el BCU quiere más pesos?',
  description: 'Desdolarización: beneficios, riesgos y evidencia',
})
</script>

<style scoped>
/* Shared content-page idiom (matches saldar-deudas / other economía guides):
   theme-token hero + section headings, so the page reads native in dark AND
   light without any hardcoded palette. */
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
  font-size: clamp(1.6rem, 4.5vw, 2.5rem);
  font-weight: 800;
  line-height: 1.15;
}
.hero-lead {
  font-size: 1.05rem;
  opacity: 0.9;
  max-width: 65ch;
}
.section-heading {
  font-size: 1.35rem;
  font-weight: 750;
  border-left: 4px solid rgb(var(--v-theme-primary));
  padding-left: 0.6rem;
  margin: 2.25rem 0 1rem;
}
.stat-num {
  font-size: clamp(1.25rem, 3vw, 1.7rem);
  font-weight: 800;
  line-height: 1.1;
  color: rgb(var(--v-theme-primary));
}
.src-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  font-size: 0.85rem;
  text-decoration: none;
}
.src-link:hover {
  text-decoration: underline;
}
.src-num {
  color: rgb(var(--v-theme-primary));
  font-weight: 800;
  font-size: 0.8rem;
  margin-right: 0.5rem;
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
