<template>
  <main class="peso-page">
    <VContainer class="peso-shell py-5 py-md-9">
      <nav class="breadcrumbs mb-5" aria-label="Migas de pan">
        <NuxtLink :to="localePath('/')">Inicio</NuxtLink>
        <VIcon size="14" icon="mdi-chevron-right" />
        <NuxtLink :to="localePath('/economia-uruguay')">Economía</NuxtLink>
        <VIcon size="14" icon="mdi-chevron-right" />
        <span>Desdolarización</span>
      </nav>

      <article>
        <header class="hero mb-6 mb-md-8">
          <div class="hero-grid">
            <div>
              <div class="eyebrow mb-4">
                <span class="eyebrow-dot" />
                Análisis · actualizado el 12 de julio de 2026
              </div>
              <h1>¿Por qué el BCU quiere que usemos más el peso?</h1>
              <p class="hero-deck">
                Qué busca la desdolarización, cómo podría beneficiar a la población y cuáles son sus
                riesgos. Una respuesta al debate sobre el “bimonetarismo” uruguayo, con datos y sin
                asumir que el Banco Central tiene razón por definición.
              </p>
              <div class="d-flex flex-wrap ga-3 mt-5">
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
            </div>

            <aside class="hero-note" aria-label="La respuesta en una frase">
              <span class="note-label">En una frase</span>
              <p>
                El objetivo principal no es “prohibir el dólar”, sino lograr que una economía que
                cobra salarios y paga impuestos en pesos también pueda
                <strong>ahorrar y prestar más en pesos</strong>.
              </p>
              <div class="note-rule" />
              <span class="note-small"
                >Eso hace más útil la política monetaria y reduce riesgos cambiarios.</span
              >
            </aside>
          </div>
        </header>

        <section id="respuesta" class="verdict section-anchor mb-8">
          <div class="section-number">01</div>
          <div>
            <p class="kicker">Veredicto</p>
            <h2>La afirmación es parcialmente correcta, pero está mal planteada</h2>
            <p class="lead">
              Sí: el BCU está incentivando el ahorro, el crédito y la inversión en moneda nacional.
              No: la evidencia disponible no muestra que busque terminar con el bimonetarismo ni
              impedir que las personas ahorren o compren bienes en dólares.
            </p>

            <div class="verdict-grid mt-5">
              <div class="verdict-card verdict-card--yes">
                <VIcon icon="mdi-check-circle-outline" />
                <div>
                  <h3>Lo confirmado</h3>
                  <p>
                    El BCU llama a esto una agenda “gradual de incentivos” y modificó los encajes
                    para favorecer la intermediación en pesos y UI.
                  </p>
                  <a :href="sources[0].url"
target="_blank" rel="noopener noreferrer"
                    >BCU, junio de 2026 ↗</a
                  >
                </div>
              </div>
              <div class="verdict-card verdict-card--no">
                <VIcon icon="mdi-close-circle-outline" />
                <div>
                  <h3>Lo que no está demostrado</h3>
                  <p>
                    No hay una prohibición del dólar, conversión forzosa de depósitos ni evidencia
                    de que el objetivo declarado sea recaudar mediante inflación.
                  </p>
                  <span>Incentivar no equivale a obligar</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="fact-strip mb-8" aria-label="Tres datos de contexto">
          <div>
            <strong>≈ 7 de cada 10</strong>
            <span>depósitos estaban en dólares</span>
          </div>
          <div>
            <strong>≈ 1 de cada 2</strong>
            <span>créditos estaba en dólares</span>
          </div>
          <div>
            <strong>31% del PIB</strong>
            <span>era el crédito privado en 2025</span>
          </div>
          <p>
            Valores redondeados para comunicar órdenes de magnitud. Fuentes: informes del
            <a :href="sources[3].url" target="_blank" rel="noopener noreferrer">FMI 2024</a> y
            <a :href="sources[2].url" target="_blank" rel="noopener noreferrer">FMI 2025</a>.
          </p>
        </section>

        <section class="editorial-section mb-9">
          <div class="section-number">02</div>
          <div>
            <p class="kicker">El mecanismo</p>
            <h2>¿Qué problema económico intenta resolver?</h2>
            <p class="section-intro">
              Los bancos prestan, en gran medida, en la moneda en la que consiguen depósitos. Si
              reciben muchos dólares y pocos pesos, el crédito en pesos queda más escaso y suele ser
              más caro. Eso crea tres problemas conectados.
            </p>

            <div class="mechanism mt-5">
              <div v-for="(step, index) in mechanism" :key="step.title" class="mechanism-step">
                <span>{{ index + 1 }}</span>
                <VIcon :icon="step.icon" />
                <h3>{{ step.title }}</h3>
                <p>{{ step.text }}</p>
                <VIcon
                  v-if="index < mechanism.length - 1"
                  class="step-arrow"
                  icon="mdi-arrow-right"
                />
              </div>
            </div>

            <div class="evidence-note mt-5">
              <VIcon icon="mdi-flask-outline" />
              <p>
                El diagnóstico no proviene solo del BCU. El FMI concluyó que la dolarización limita
                la oferta de préstamos en pesos y que una mayor liquidez en moneda local podría
                reducir los márgenes bancarios. Es evidencia a favor del mecanismo, no una garantía
                de que cada medida concreta llegue al consumidor.
                <a :href="sources[3].url"
target="_blank" rel="noopener noreferrer"
                  >Ver informe ↗</a
                >
              </p>
            </div>
          </div>
        </section>

        <section class="editorial-section mb-9">
          <div class="section-number">03</div>
          <div>
            <p class="kicker">Beneficios posibles</p>
            <h2>¿Cómo podría beneficiar a la población?</h2>
            <p class="section-intro">
              “Podría” es la palabra importante: los beneficios dependen de que el menor costo
              bancario se traduzca en mejores productos, exista competencia y la inflación siga
              anclada.
            </p>

            <div class="benefit-grid mt-5">
              <article v-for="benefit in benefits" :key="benefit.title" class="benefit-card">
                <div class="benefit-icon"><VIcon :icon="benefit.icon" /></div>
                <h3>{{ benefit.title }}</h3>
                <p>{{ benefit.text }}</p>
                <span>{{ benefit.who }}</span>
              </article>
            </div>

            <div class="plain-example mt-5">
              <div class="example-label">Ejemplo simple</div>
              <p>
                Una panadería vende en pesos. Si se endeuda en dólares y el dólar sube 20%, su deuda
                medida en ventas también sube 20%. Un préstamo en pesos o UI puede tener otra tasa,
                pero elimina ese salto cambiario. Para un exportador que cobra en dólares, en
                cambio, endeudarse en dólares puede ser perfectamente razonable.
              </p>
            </div>
          </div>
        </section>

        <section class="editorial-section mb-9">
          <div class="section-number">04</div>
          <div>
            <p class="kicker">Chequeo de argumentos</p>
            <h2>Cuatro afirmaciones del debate, puestas a prueba</h2>

            <div class="claims mt-5">
              <article v-for="claim in claims" :key="claim.title" class="claim-row">
                <div class="claim-status" :class="`claim-status--${claim.tone}`">
                  {{ claim.status }}
                </div>
                <div>
                  <h3>“{{ claim.title }}”</h3>
                  <p>{{ claim.answer }}</p>
                  <a
                    v-if="claim.source"
                    :href="claim.source"
                    target="_blank"
                    rel="noopener noreferrer"
                    >Fuente / contexto ↗</a
                  >
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="editorial-section mb-9">
          <div class="section-number">05</div>
          <div>
            <p class="kicker">Costos y salvaguardas</p>
            <h2>La desdolarización también puede salir mal</h2>
            <p class="section-intro">
              La literatura internacional advierte que una desdolarización abrupta o coercitiva
              puede sacar ahorro del sistema financiero o trasladar riesgos a otras partes. Por eso
              importa tanto el método como el objetivo.
            </p>

            <div class="risk-table mt-5">
              <div class="risk-head"><span>Riesgo</span><span>Qué exigir para mitigarlo</span></div>
              <div v-for="risk in risks" :key="risk.name" class="risk-row">
                <div>
                  <VIcon :icon="risk.icon" /> <strong>{{ risk.name }}</strong>
                </div>
                <p>{{ risk.guardrail }}</p>
              </div>
            </div>

            <VAlert class="mt-5" type="warning" variant="tonal" density="comfortable">
              <strong>La prueba decisiva no es cuántos depósitos se pasan a pesos.</strong> Es si
              las personas obtienen mejor crédito, si preservan su poder de compra y si conservan la
              libertad de elegir moneda. Sin esas tres condiciones, el beneficio social es
              discutible.
            </VAlert>
          </div>
        </section>

        <section class="editorial-section mb-9">
          <div class="section-number">06</div>
          <div>
            <p class="kicker">Qué cambia en la práctica</p>
            <h2>Las medidas concretas, sin jerga</h2>
            <div class="measure-timeline mt-5">
              <article>
                <time datetime="2026-03-01">1 mar. 2026</time>
                <div>
                  <h3>Primer cambio de incentivos</h3>
                  <p>
                    Comenzó a regir una remuneración más favorable para encajes en moneda nacional y
                    menos favorable para moneda extranjera. El encaje es la parte de los depósitos
                    que el banco debe inmovilizar en el BCU.
                  </p>
                  <a :href="sources[1].url"
target="_blank" rel="noopener noreferrer"
                    >Resolución D/383/2025 ↗</a
                  >
                </div>
              </article>
              <article>
                <time datetime="2026-06-12">12 jun. 2026</time>
                <div>
                  <h3>Profundización gradual</h3>
                  <p>
                    El BCU redujo progresivamente las alícuotas de encaje sobre obligaciones de
                    corto plazo en pesos y UI, con convergencia a 12% desde setiembre, y profundizó
                    el ajuste para moneda extranjera.
                  </p>
                  <a :href="sources[0].url"
target="_blank" rel="noopener noreferrer"
                    >Comunicado del BCU ↗</a
                  >
                </div>
              </article>
              <article>
                <time>Lo que sigue</time>
                <div>
                  <h3>La transmisión no es automática</h3>
                  <p>
                    Cada banco decide si transforma el alivio regulatorio en mejores tasas, más
                    plazos o nuevos productos. El efecto final deberá observarse en datos de
                    depósitos, crédito, tasas y morosidad.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="bottom-line mb-9">
          <div class="bottom-line-mark">=</div>
          <div>
            <p class="kicker">Conclusión</p>
            <h2>Entonces, ¿a quién le creemos?</h2>
            <p>
              A ninguna narrativa completa. El argumento técnico del BCU es sólido en su núcleo: una
              economía menos dolarizada puede tener una política monetaria más eficaz, menos
              descalces y más crédito en la moneda de los ingresos. El contraargumento también es
              válido: ampliar el peso amplía la capacidad del Estado de afectar el ahorro mediante
              inflación y de financiarse localmente.
            </p>
            <p>
              La defensa razonable de la agenda no es “el peso siempre es mejor”, sino
              <strong
                >más opciones competitivas en pesos y UI, inflación baja y libertad de mantener
                dólares</strong
              >. Si falta cualquiera de esas condiciones, la desconfianza es racional.
            </p>
          </div>
        </section>

        <section class="sources mb-8" aria-labelledby="sources-title">
          <div class="d-flex align-center justify-space-between flex-wrap ga-3 mb-4">
            <div>
              <p class="kicker mb-1">Documentación</p>
              <h2 id="sources-title">Fuentes y metodología</h2>
            </div>
            <span class="source-count">{{ sources.length }} fuentes · mayoría primarias</span>
          </div>
          <p class="method-note">
            Priorizamos normas y comunicados del BCU para saber qué decidió; FMI y BID para
            contrastar el diagnóstico. Las declaraciones del BCU prueban su intención declarada, no
            prueban por sí solas que los beneficios ocurrirán. Consulta realizada el 12/07/2026.
          </p>
          <ol>
            <li v-for="(source, index) in sources" :key="source.url">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <div>
                <a :href="source.url" target="_blank" rel="noopener noreferrer">{{
                  source.title
                }}</a>
                <p>{{ source.publisher }} · {{ source.date }} — {{ source.use }}</p>
              </div>
            </li>
          </ol>
        </section>

        <footer class="article-footer">
          <p>¿Te sirvió esta respuesta?</p>
          <ShareButtons
            text="¿Por qué el BCU quiere que usemos más el peso? Un análisis con fuentes"
          />
          <div class="related-links">
            <NuxtLink :to="localePath('/por-que-sube-el-dolar')">¿Por qué sube el dólar?</NuxtLink>
            <NuxtLink :to="localePath('/inversiones-uruguay')"
              >Opciones para ahorrar e invertir</NuxtLink
            >
            <NuxtLink :to="localePath('/indicadores/inflacion')">Inflación en Uruguay</NuxtLink>
          </div>
        </footer>
      </article>
    </VContainer>
  </main>
</template>

<script setup lang="ts">
const localePath = useLocalePath()

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
      'Sí, si “control” significa que su tasa de interés influya sobre más préstamos y gastos. Con muchos contratos en dólares, una parte de la economía responde más a la Reserva Federal que al BCU. Eso puede estabilizar precios, pero también exige independencia y rendición de cuentas.',
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
.peso-page {
  --ink: #102a2b;
  --muted: #596b6a;
  --paper: #f7f5ee;
  --green: #087f5b;
  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
}
.peso-shell {
  max-width: 1120px;
}
.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--muted);
  font-size: 0.78rem;
}
.breadcrumbs a {
  color: inherit;
  text-decoration: none;
}
.hero {
  background: #0d3434;
  color: white;
  border-radius: 28px;
  padding: clamp(28px, 5vw, 64px);
  position: relative;
  overflow: hidden;
}
.hero::after {
  content: '';
  position: absolute;
  width: 340px;
  height: 340px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 50%;
  right: -150px;
  top: -130px;
  box-shadow:
    0 0 0 55px rgba(255, 255, 255, 0.025),
    0 0 0 110px rgba(255, 255, 255, 0.018);
}
.hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(250px, 0.75fr);
  gap: clamp(32px, 6vw, 74px);
  align-items: end;
  position: relative;
  z-index: 1;
}
.eyebrow {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #a8d8c7;
  text-transform: uppercase;
  letter-spacing: 0.11em;
  font-size: 0.7rem;
  font-weight: 800;
}
.eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #55d6a7;
  box-shadow: 0 0 0 4px rgba(85, 214, 167, 0.15);
}
h1 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(2.45rem, 5.8vw, 5.25rem);
  line-height: 0.97;
  letter-spacing: -0.045em;
  max-width: 760px;
}
.hero-deck {
  max-width: 720px;
  color: #c8d8d5;
  font-size: clamp(1rem, 1.55vw, 1.2rem);
  line-height: 1.65;
  margin-top: 24px;
}
.hero-note {
  border-left: 1px solid rgba(255, 255, 255, 0.25);
  padding-left: 25px;
}
.note-label,
.kicker {
  color: #11815f;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  font-size: 0.68rem;
  font-weight: 900;
}
.hero-note .note-label {
  color: #78dbb6;
}
.hero-note p {
  margin: 14px 0;
  font-family: Georgia, serif;
  font-size: 1.25rem;
  line-height: 1.45;
}
.note-rule {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 18px 0;
}
.note-small {
  color: #adc4c0;
  font-size: 0.78rem;
  line-height: 1.5;
}
.editorial-section,
.verdict {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr);
  gap: 20px;
}
.section-number {
  color: #8da09d;
  font-size: 0.72rem;
  font-weight: 800;
  padding-top: 7px;
  border-top: 1px solid #b9c4c0;
}
h2 {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(1.75rem, 3.4vw, 2.75rem);
  line-height: 1.13;
  letter-spacing: -0.026em;
  margin-top: 7px;
}
.lead,
.section-intro {
  color: var(--muted);
  font-size: 1.06rem;
  line-height: 1.72;
  max-width: 850px;
  margin-top: 14px;
}
.verdict-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.verdict-card {
  display: flex;
  gap: 16px;
  padding: 22px;
  background: white;
  border: 1px solid #dfe5e1;
  border-radius: 16px;
}
.verdict-card > .v-icon {
  flex: 0 0 auto;
}
.verdict-card--yes > .v-icon {
  color: var(--green);
}
.verdict-card--no > .v-icon {
  color: #a85f35;
}
.verdict-card h3,
.benefit-card h3,
.mechanism-step h3,
.claim-row h3 {
  font-size: 1rem;
  margin-bottom: 7px;
}
.verdict-card p,
.benefit-card p,
.mechanism-step p,
.claim-row p {
  color: var(--muted);
  line-height: 1.55;
  font-size: 0.9rem;
}
.verdict-card a,
.verdict-card span,
.claim-row a {
  color: var(--green);
  font-size: 0.76rem;
  font-weight: 800;
  text-decoration: none;
}
.fact-strip {
  background: #e8eee8;
  border-radius: 18px;
  padding: 26px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.fact-strip div {
  border-right: 1px solid #c9d4ce;
  display: flex;
  flex-direction: column;
}
.fact-strip div:nth-child(3) {
  border: 0;
}
.fact-strip strong {
  font-family: Georgia, serif;
  font-size: clamp(1.35rem, 2.5vw, 2rem);
}
.fact-strip span {
  color: var(--muted);
  font-size: 0.78rem;
}
.fact-strip > p {
  grid-column: 1 / -1;
  color: #6c7976;
  font-size: 0.7rem;
  margin: 0;
}
.fact-strip a,
.evidence-note a {
  color: var(--green);
}
.mechanism {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid #d8dfdb;
  border-radius: 18px;
  background: white;
}
.mechanism-step {
  padding: 25px;
  position: relative;
  min-height: 220px;
}
.mechanism-step + .mechanism-step {
  border-left: 1px solid #d8dfdb;
}
.mechanism-step > span {
  display: block;
  color: #8b9996;
  font-size: 0.7rem;
  font-weight: 800;
  margin-bottom: 28px;
}
.mechanism-step > .v-icon:not(.step-arrow) {
  color: var(--green);
  margin-bottom: 17px;
}
.step-arrow {
  position: absolute;
  right: -13px;
  top: 50%;
  z-index: 2;
  background: var(--paper);
  color: #7b8d88;
  border-radius: 50%;
}
.evidence-note {
  display: flex;
  gap: 15px;
  background: #e5f2ed;
  border-left: 3px solid var(--green);
  padding: 18px 20px;
  border-radius: 4px 12px 12px 4px;
}
.evidence-note .v-icon {
  color: var(--green);
  flex: 0 0 auto;
}
.evidence-note p {
  font-size: 0.86rem;
  line-height: 1.6;
  margin: 0;
}
.benefit-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}
.benefit-card {
  background: white;
  border: 1px solid #dce3df;
  border-radius: 16px;
  padding: 22px;
}
.benefit-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: #e6f2ed;
  color: var(--green);
  border-radius: 10px;
  margin-bottom: 22px;
}
.benefit-card span {
  display: inline-block;
  margin-top: 15px;
  color: #687773;
  font-size: 0.69rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 800;
}
.plain-example {
  border-top: 1px solid #cfd8d3;
  padding-top: 22px;
  display: grid;
  grid-template-columns: 145px 1fr;
  gap: 22px;
}
.example-label {
  color: var(--green);
  font-weight: 800;
  font-size: 0.78rem;
}
.plain-example p {
  color: var(--muted);
  line-height: 1.7;
}
.claims {
  border-top: 1px solid #cfd7d3;
}
.claim-row {
  display: grid;
  grid-template-columns: 145px 1fr;
  gap: 28px;
  padding: 25px 0;
  border-bottom: 1px solid #cfd7d3;
}
.claim-status {
  width: max-content;
  height: max-content;
  padding: 6px 10px;
  border-radius: 100px;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 900;
}
.claim-status--true {
  color: #086a4c;
  background: #dcefe8;
}
.claim-status--mixed {
  color: #8c5b11;
  background: #f5ead4;
}
.claim-status--false {
  color: #8c3d35;
  background: #f4deda;
}
.risk-table {
  background: white;
  border: 1px solid #d9e0dc;
  border-radius: 16px;
  overflow: hidden;
}
.risk-head,
.risk-row {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) 1.3fr;
  gap: 24px;
  padding: 16px 20px;
}
.risk-head {
  background: #103c3a;
  color: white;
  font-size: 0.7rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.09em;
}
.risk-row + .risk-row {
  border-top: 1px solid #e1e6e3;
}
.risk-row > div {
  display: flex;
  align-items: center;
  gap: 10px;
}
.risk-row .v-icon {
  color: #9c6532;
}
.risk-row p {
  margin: 0;
  color: var(--muted);
  font-size: 0.85rem;
  line-height: 1.5;
}
.measure-timeline {
  margin-left: 75px;
  border-left: 1px solid #a8b9b3;
}
.measure-timeline article {
  position: relative;
  display: grid;
  grid-template-columns: 105px 1fr;
  gap: 24px;
  padding: 0 0 34px 32px;
}
.measure-timeline article::before {
  content: '';
  position: absolute;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--green);
  left: -6px;
  top: 4px;
  box-shadow: 0 0 0 5px var(--paper);
}
.measure-timeline time {
  color: var(--green);
  font-weight: 900;
  font-size: 0.75rem;
}
.measure-timeline h3 {
  font-size: 1rem;
  margin-bottom: 7px;
}
.measure-timeline p {
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.6;
}
.measure-timeline a {
  color: var(--green);
  font-size: 0.75rem;
  font-weight: 800;
  text-decoration: none;
}
.bottom-line {
  background: #0e3a39;
  color: white;
  border-radius: 22px;
  padding: clamp(26px, 5vw, 52px);
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 22px;
}
.bottom-line-mark {
  font-family: Georgia, serif;
  color: #65d4ac;
  font-size: 3rem;
}
.bottom-line .kicker {
  color: #74dcb6;
}
.bottom-line p:not(.kicker) {
  color: #c8d8d5;
  max-width: 830px;
  line-height: 1.72;
  margin-top: 17px;
}
.sources {
  border-top: 3px solid #173e3d;
  padding-top: 25px;
}
.source-count {
  color: var(--muted);
  font-size: 0.74rem;
}
.method-note {
  color: var(--muted);
  font-size: 0.83rem;
  line-height: 1.6;
  max-width: 850px;
  margin-bottom: 25px;
}
.sources ol {
  list-style: none;
  padding: 0;
  border-top: 1px solid #d0d9d4;
}
.sources li {
  display: grid;
  grid-template-columns: 45px 1fr;
  gap: 16px;
  padding: 16px 0;
  border-bottom: 1px solid #d0d9d4;
}
.sources li > span {
  color: #879692;
  font-size: 0.69rem;
  font-weight: 900;
}
.sources a {
  color: var(--ink);
  font-weight: 800;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}
.sources li p {
  color: var(--muted);
  font-size: 0.75rem;
  margin: 4px 0 0;
}
.article-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  border-top: 1px solid #ccd6d1;
  padding-top: 24px;
}
.article-footer > p {
  font-weight: 800;
}
.related-links {
  margin-left: auto;
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}
.related-links a {
  color: var(--green);
  font-size: 0.78rem;
  font-weight: 700;
}
.section-anchor {
  scroll-margin-top: 90px;
}
@media (max-width: 800px) {
  .hero-grid,
  .verdict-grid,
  .benefit-grid {
    grid-template-columns: 1fr;
  }
  .hero-note {
    border-left: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.2);
    padding: 24px 0 0;
  }
  .mechanism {
    grid-template-columns: 1fr;
  }
  .mechanism-step {
    min-height: 0;
  }
  .mechanism-step + .mechanism-step {
    border-left: 0;
    border-top: 1px solid #d8dfdb;
  }
  .step-arrow {
    right: 50%;
    top: -13px;
    transform: rotate(90deg);
  }
  .fact-strip {
    grid-template-columns: 1fr;
  }
  .fact-strip div {
    border-right: 0;
    border-bottom: 1px solid #c9d4ce;
    padding-bottom: 13px;
  }
  .plain-example,
  .claim-row,
  .risk-head,
  .risk-row,
  .measure-timeline article {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  .risk-head span:first-child {
    display: none;
  }
  .measure-timeline {
    margin-left: 7px;
  }
}
@media (max-width: 520px) {
  .peso-shell {
    padding-inline: 13px !important;
  }
  .hero {
    border-radius: 20px;
    padding: 27px 21px;
  }
  h1 {
    font-size: 2.55rem;
  }
  .editorial-section,
  .verdict {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .section-number {
    width: 42px;
  }
  .bottom-line {
    grid-template-columns: 1fr;
  }
  .related-links {
    margin-left: 0;
  }
}
@media (prefers-reduced-motion: no-preference) {
  html {
    scroll-behavior: smooth;
  }
}
.v-theme--dark .peso-page {
  --ink: #e7efec;
  --muted: #b2c1bd;
  --paper: #0d1919;
  background: var(--paper);
}
.v-theme--dark .verdict-card,
.v-theme--dark .benefit-card,
.v-theme--dark .mechanism,
.v-theme--dark .risk-table {
  background: #142322;
  border-color: #30433f;
}
.v-theme--dark .fact-strip {
  background: #172725;
}
.v-theme--dark .step-arrow {
  background: #0d1919;
}
.v-theme--dark .claim-row,
.v-theme--dark .sources li,
.v-theme--dark .sources ol {
  border-color: #334440;
}
</style>
