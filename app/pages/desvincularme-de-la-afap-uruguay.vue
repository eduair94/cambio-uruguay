<template>
  <VContainer class="afap-page py-8 py-md-12">
    <header class="mb-10">
      <VChip color="primary" variant="flat" size="small" class="mb-4">JUBILACIÓN</VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-4">¿Cómo me desvinculo de una AFAP?</h1>
      <p class="lead mb-6">
        La respuesta corta es que depende de qué querés deshacer, porque
        <strong>son dos trámites distintos</strong> y casi todo el mundo los mezcla. Acá están las
        condiciones exactas, los pasos y el plazo de {{ AFAP_DECISION_DAYS }} días que hace que
        mucha gente pierda la instancia sin enterarse.
      </p>

      <VCard class="warn-card pa-5 pa-md-6" variant="flat">
        <div class="d-flex align-start">
          <VIcon icon="mdi-alert-outline" color="warning" class="mr-3 mt-1" />
          <div>
            <div class="text-overline mb-2">Lo primero</div>
            <p class="mb-0">{{ AFAP_NOT_THE_SAME }}</p>
          </div>
        </div>
      </VCard>
    </header>

    <!-- Two paths -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Las dos cosas que no son la misma</h2>
      <VRow>
        <VCol v-for="p in AFAP_PATHS" :key="p.id" cols="12" md="6">
          <VCard variant="flat" class="path-card pa-5 h-100">
            <div class="d-flex align-start mb-2">
              <VIcon :icon="p.icon" color="primary" class="mr-3 mt-1" />
              <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ p.label }}</h3>
            </div>
            <p class="mb-2">{{ p.what }}</p>
            <p class="mb-0 text-medium-emphasis">{{ p.effect }}</p>
          </VCard>
        </VCol>
      </VRow>
      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        Lo que sigue en esta página es la revocación del artículo 8, que es lo que casi todos están
        buscando.
      </p>
    </section>

    <!-- Checker -->
    <section id="me-corresponde" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Te da para revocar?</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">
        Hay dos condiciones que podés chequear vos y otras que sólo puede confirmar BPS.
      </p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <VTextField
              v-model.number="age"
              type="number"
              label="Tu edad"
              min="18"
              max="99"
              suffix="años"
              density="comfortable"
              variant="outlined"
              class="mb-4"
            />
            <VSwitch
              v-model="mixedRegime"
              color="primary"
              density="comfortable"
              hide-details
              label="Estoy en el Régimen Mixto"
            />
          </VCard>
        </VCol>
        <VCol cols="12" md="7">
          <VCard
            variant="flat"
            class="verdict-card pa-5 h-100"
            :class="{ 'is-ok': result.possible }"
          >
            <div class="text-overline mb-2">Con lo que se puede medir</div>
            <p class="text-h6 font-weight-bold mb-3">
              <template v-if="result.possible"> Cumplís las dos condiciones medibles. </template>
              <template v-else> Por ahora no da. </template>
            </p>
            <ul v-if="result.blockers.length" class="mb-3 pl-4">
              <li v-for="(b, i) in result.blockers" :key="i">{{ b }}</li>
            </ul>
            <div class="text-overline mb-1">Lo que igual tiene que confirmar BPS</div>
            <ul class="mb-0 pl-4 text-medium-emphasis">
              <li v-for="(c, i) in result.toConfirm" :key="i">{{ c }}</li>
            </ul>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="results-card pa-0 mt-5">
        <div class="pa-4 pb-0 text-overline">Las seis condiciones, completas</div>
        <VTable class="cu-mobile-cards" density="comfortable">
          <tbody>
            <tr v-for="c in AFAP_CONDITIONS" :key="c.id">
              <td data-label="Condición" class="font-weight-medium">{{ c.label }}</td>
              <td data-label="Detalle" class="text-medium-emphasis">{{ c.detail }}</td>
            </tr>
          </tbody>
        </VTable>
      </VCard>
    </section>

    <!-- Steps -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">El trámite, paso a paso</h2>
      <VRow>
        <VCol v-for="s in AFAP_STEPS" :key="s.n" cols="12" md="6">
          <VCard variant="flat" class="step-card pa-5 h-100">
            <div class="step-n">{{ s.n }}</div>
            <h3 class="text-subtitle-1 font-weight-bold mb-1">{{ s.title }}</h3>
            <p class="mb-0 text-medium-emphasis">{{ s.detail }}</p>
          </VCard>
        </VCol>
      </VRow>
      <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4">
        {{ AFAP_IRREVERSIBLE_WARNING }}
      </VAlert>
    </section>

    <!-- ¿Desde qué sueldo va plata a la AFAP? -->
    <section id="desde-que-sueldo" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Desde qué sueldo va plata a la AFAP?</h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">{{ AFAP_TOPE_ANSWER }}</p>

      <VRow>
        <VCol cols="12" md="5">
          <VCard variant="flat" class="form-card pa-5">
            <div class="text-overline mb-2">Tu caso</div>
            <VBtnToggle
              v-model="cohort"
              mandatory
              divided
              density="comfortable"
              color="primary"
              class="mb-4 d-flex flex-wrap"
            >
              <VBtn v-for="c in AFAP_COHORTS" :key="c.id" :value="c.id" size="small">
                {{ c.id === 'spc' ? 'Empecé desde dic. 2023' : 'Ya aportaba antes' }}
              </VBtn>
            </VBtnToggle>

            <VTextField
              v-model.number="nominal"
              type="number"
              label="Tu sueldo nominal mensual"
              min="0"
              prefix="$"
              density="comfortable"
              variant="outlined"
              class="mb-2"
            />
            <VSwitch
              v-model="art8"
              color="primary"
              density="comfortable"
              hide-details
              :disabled="cohort === 'spc'"
              label="Tengo hecha la opción del artículo 8"
            />
            <p class="text-caption text-medium-emphasis mb-0 mt-2">
              {{ cohortDetail }}
            </p>
          </VCard>
        </VCol>

        <VCol cols="12" md="7">
          <VCard
            variant="flat"
            class="verdict-card pa-5 h-100"
            :class="{ 'is-ok': split.aAfap > 0 }"
          >
            <div class="text-overline mb-2">
              Tu aporte jubilatorio del mes ({{ APORTE_JUBILATORIO_RATE }}% del sueldo)
            </div>
            <p class="text-h6 font-weight-bold mb-3">
              <template v-if="split.aAfap > 0">
                A tu AFAP le entran {{ money(split.aAfap) }} por mes.
              </template>
              <template v-else> Hoy no te entra nada a la AFAP. </template>
            </p>
            <VTable class="cu-mobile-cards mb-3" density="comfortable">
              <tbody>
                <tr>
                  <td data-label="Concepto">Aporte total</td>
                  <td data-label="Monto" class="text-right font-weight-medium">
                    {{ money(split.aporte) }}
                  </td>
                </tr>
                <tr>
                  <td data-label="Concepto">Va al BPS (reparto)</td>
                  <td data-label="Monto" class="text-right">{{ money(split.aBps) }}</td>
                </tr>
                <tr>
                  <td data-label="Concepto">Va a tu AFAP (cuenta individual)</td>
                  <td data-label="Monto" class="text-right">{{ money(split.aAfap) }}</td>
                </tr>
                <tr v-if="split.excedente > 0">
                  <td data-label="Concepto">
                    Sueldo por encima del último nivel (fuera del aporte obligatorio)
                  </td>
                  <td data-label="Monto" class="text-right">{{ money(split.excedente) }}</td>
                </tr>
              </tbody>
            </VTable>
            <p class="mb-0 text-medium-emphasis text-body-2">
              <template v-if="split.desde > 0">
                En tu escenario, el primer peso entra a la AFAP recién con un sueldo de
                {{ money(split.desde) }}.
              </template>
              <template v-else> En tu escenario te entra a la AFAP desde el primer peso. </template>
            </p>
          </VCard>
        </VCol>
      </VRow>

      <VCard variant="flat" class="results-card pa-0 mt-5">
        <div class="pa-4 pb-0 text-overline">Los cortes, según el BPS ({{ topesMonth }})</div>
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th>Corte</th>
              <th>Monto</th>
              <th>A quién le rige</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td data-label="Corte" class="font-weight-medium">
                Tope A (arts. 7 y 8, Ley 16.713)
              </td>
              <td data-label="Monto">{{ money(AFAP_TOPE_A) }}</td>
              <td data-label="A quién" class="text-medium-emphasis">
                Quien ya estaba afiliado al BPS antes del {{ spcDate }}
              </td>
            </tr>
            <tr>
              <td data-label="Corte" class="font-weight-medium">Tope B</td>
              <td data-label="Monto">{{ money(AFAP_TOPE_B) }}</td>
              <td data-label="A quién" class="text-medium-emphasis">
                Sólo importa si tenés hecha la opción del artículo 8
              </td>
            </tr>
            <tr>
              <td data-label="Corte" class="font-weight-medium">Tope C</td>
              <td data-label="Monto">{{ money(AFAP_TOPE_C) }}</td>
              <td data-label="A quién" class="text-medium-emphasis">
                Por encima, el aporte es voluntario
              </td>
            </tr>
            <tr>
              <td data-label="Corte" class="font-weight-medium">Nivel 1 (art. 22, Ley 20.130)</td>
              <td data-label="Monto">{{ money(SPC_NIVEL_1) }}</td>
              <td data-label="A quién" class="text-medium-emphasis">
                Primer ingreso al mercado de trabajo desde el {{ spcDate }}
              </td>
            </tr>
            <tr>
              <td data-label="Corte" class="font-weight-medium">Nivel 2 (art. 22, Ley 20.130)</td>
              <td data-label="Monto">{{ money(SPC_NIVEL_2) }}</td>
              <td data-label="A quién" class="text-medium-emphasis">
                Hasta acá corre el aporte al ahorro individual; por encima el artículo ya no asigna
                aporte obligatorio. El BPS publica el corte como «Niveles Art. 22 - B»
              </td>
            </tr>
          </tbody>
        </VTable>
      </VCard>

      <VAlert type="info" variant="tonal" density="comfortable" class="mt-4">
        <div class="text-overline mb-1">El inciso que casi nadie lee</div>
        <p class="mb-0 text-body-2">«{{ AFAP_COHORT_RULE }}»</p>
      </VAlert>
    </section>

    <!-- ¿En qué está invertida la plata? -->
    <section id="donde-esta-la-plata" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">
        ¿En qué está invertida la plata y por qué no va afuera?
      </h2>
      <p class="text-medium-emphasis mb-5" style="max-width: 72ch">{{ AFAP_WHY_NOT_ABROAD }}</p>

      <VCard variant="flat" class="results-card pa-0 mb-5">
        <div class="pa-4 pb-0 text-overline">
          Las seis categorías de la ley y su máximo por subfondo (%)
        </div>
        <div class="table-scroll">
          <VTable class="cu-mobile-cards" density="comfortable">
            <thead>
              <tr>
                <th>Literal</th>
                <th v-for="s in AFAP_SUBFONDOS" :key="s.id">{{ s.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in AFAP_ASSET_CLASSES" :key="a.literal">
                <td data-label="Literal">
                  <div class="font-weight-medium">
                    {{ a.literal }}) {{ a.label }}
                    <VChip
                      v-if="a.exterior"
                      size="x-small"
                      color="primary"
                      variant="tonal"
                      class="ml-1"
                    >
                      exterior
                    </VChip>
                  </div>
                  <div class="text-caption text-medium-emphasis">{{ a.detail }}</div>
                </td>
                <td v-for="s in AFAP_SUBFONDOS" :key="s.id" :data-label="s.label">
                  <span class="font-weight-medium">máx. {{ a.max[s.id] }}%</span>
                  <span class="text-caption text-medium-emphasis d-block">
                    usan {{ range(a.used[s.id]) }}
                  </span>
                </td>
              </tr>
              <tr>
                <td data-label="Literal" class="font-weight-medium">
                  Suma de A) a F) colocada en moneda extranjera
                </td>
                <td v-for="s in AFAP_SUBFONDOS" :key="s.id" :data-label="s.label">
                  <span class="font-weight-medium">máx. {{ AFAP_ME_MAX[s.id] }}%</span>
                  <span class="text-caption text-medium-emphasis d-block">
                    usan {{ range(AFAP_ME_USED[s.id]) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p class="text-caption text-medium-emphasis px-4 pb-4 mb-0">
          Los máximos los fija la ley, no el regulador: son el cuadro del artículo 123-BIS de la Ley
          16.713, agregado por el artículo 119 de la Ley 20.130. El BCU publica el uso efectivo
          contra ellos, al {{ portfolioDate }}, en el cuadro «Inversiones según literales art. 123».
          «Usan» es el rango entre las cuatro AFAP.
        </p>
      </VCard>

      <VAlert type="info" variant="tonal" density="comfortable" class="mb-5">
        <div class="text-overline mb-1">El techo que de verdad ata el exterior</div>
        <p class="mb-0 text-body-2">{{ AFAP_D_FUND_NOTE }}</p>
      </VAlert>

      <VCard variant="flat" class="results-card pa-0">
        <div class="pa-4 pb-0 text-overline">
          Dónde estaba la plata al {{ portfolioDate }} (% del activo total)
        </div>
        <VTable class="cu-mobile-cards" density="comfortable">
          <tbody>
            <tr v-for="(l, i) in AFAP_PORTFOLIO" :key="`${l.label}-${i}`">
              <td data-label="Instrumento" class="font-weight-medium">{{ l.label }}</td>
              <td data-label="Moneda" class="text-medium-emphasis">{{ monedaLabel(l.moneda) }}</td>
              <td data-label="% del activo" class="text-right">{{ pct(l.pct) }}</td>
            </tr>
          </tbody>
        </VTable>
        <p class="text-caption text-medium-emphasis px-4 pb-4 mb-0">
          Fondo consolidado de {{ totalMillones }} millones de pesos:
          {{ pct(AFAP_PORTFOLIO_TOTALS.monedaNacional) }} en moneda nacional,
          {{ pct(AFAP_PORTFOLIO_TOTALS.monedaExtranjera) }} en moneda extranjera y
          {{ pct(AFAP_PORTFOLIO_TOTALS.disponibilidades) }} en disponibilidades. Dejamos afuera la
          línea de forwards, que el BCU publica en +0,73% y −0,73% y se cancela sola.
        </p>
      </VCard>
    </section>

    <!-- ¿Sobre qué te cobran? -->
    <section id="que-te-cobran" class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-2">¿Sobre qué te cobra la AFAP?</h2>
      <p class="text-medium-emphasis mb-4" style="max-width: 72ch">{{ AFAP_FEE_MYTH }}</p>

      <VCard class="warn-card pa-5 pa-md-6 mb-5" variant="flat">
        <div class="text-overline mb-2">La ley, textual</div>
        <p class="mb-2">«{{ AFAP_FEE_BASE_RULE }}»</p>
        <p class="mb-0">«{{ AFAP_FEE_BASE_RULE_2 }}»</p>
      </VCard>

      <VCard variant="flat" class="results-card pa-0 mb-5">
        <div class="pa-4 pb-0 text-overline">Comisión y prima por AFAP, {{ feesMonth }}</div>
        <div class="table-scroll">
          <VTable class="cu-mobile-cards" density="comfortable">
            <thead>
              <tr>
                <th>AFAP</th>
                <th>Comisión</th>
                <th>Prima del seguro</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="f in AFAP_FEES" :key="f.afap">
                <td data-label="AFAP" class="font-weight-medium">{{ f.afap }}</td>
                <td data-label="Comisión">
                  {{ pct(f.comisionSobreAporte) }} del aporte
                  <span class="text-caption text-medium-emphasis d-block">
                    {{ pct(f.comisionSobreIngreso) }} del sueldo
                  </span>
                </td>
                <td data-label="Prima del seguro">
                  {{ pct(f.primaSobreAporte) }} del aporte
                  <span class="text-caption text-medium-emphasis d-block">
                    {{ pct(f.primaSobreIngreso) }} del sueldo
                  </span>
                </td>
                <td data-label="Total" class="font-weight-medium">
                  {{ pct(f.totalSobreAporte) }} del aporte
                  <span class="text-caption text-medium-emphasis d-block">
                    {{ pct(f.totalSobreIngreso) }} del sueldo
                  </span>
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p class="text-caption text-medium-emphasis px-4 pb-4 mb-0">
          BCU, cuadros de comisiones y primas por mes de cargo. El aporte es el 15% del ingreso de
          aportación, así que las dos columnas son la misma plata mirada de dos maneras. Los mismos
          valores rigen en los tres subfondos.
        </p>
      </VCard>

      <VRow>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="path-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Qué es la prima del seguro</h3>
            <p class="mb-3">{{ AFAP_INSURANCE_PREMIUM }}</p>
            <div class="text-overline mb-1">Aseguradoras habilitadas</div>
            <p class="mb-0 text-body-2 text-medium-emphasis">{{ AFAP_INSURERS.join(' · ') }}</p>
          </VCard>
        </VCol>
        <VCol cols="12" md="6">
          <VCard variant="flat" class="path-card pa-5 h-100">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Por qué tres AFAP cobran lo mismo</h3>
            <p class="mb-4">{{ AFAP_FEE_CAP }}</p>
            <h3 class="text-subtitle-1 font-weight-bold mb-2">Si empezaste a trabajar hace poco</h3>
            <p class="mb-0">{{ AFAP_NEW_ENTRANTS_FEE }}</p>
          </VCard>
        </VCol>
      </VRow>
    </section>

    <!-- FAQ -->
    <section class="mb-12">
      <h2 class="text-h5 font-weight-bold mb-4">Preguntas frecuentes</h2>
      <VExpansionPanels variant="accordion">
        <VExpansionPanel v-for="f in AFAP_FAQ" :key="f.question">
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

    <!-- Related -->
    <section class="mb-12">
      <h2 class="text-h6 font-weight-bold mb-3">Seguir por acá</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          :to="localePath('/guias/reforma-jubilatoria-uruguay-que-cambia')"
          variant="tonal"
          size="small"
        >
          Qué cambió con la reforma
        </VBtn>
        <VBtn
          :to="localePath('/guias/jubilacion-y-afap-como-funciona-uruguay')"
          variant="tonal"
          size="small"
        >
          Cómo funciona la jubilación y la AFAP
        </VBtn>
        <VBtn
          :to="localePath('/guias/elegir-o-cambiar-de-afap-uruguay')"
          variant="tonal"
          size="small"
        >
          Elegir o cambiar de AFAP
        </VBtn>
      </div>
    </section>

    <!-- Sources -->
    <section>
      <h2 class="text-h6 font-weight-bold mb-3">Fuentes</h2>
      <p class="text-body-2 text-medium-emphasis mb-3">
        Contrastado el {{ verifiedAt }}. Esta página es informativa: lo que resuelve BPS es lo que
        vale, y el asesoramiento oficial es obligatorio antes de decidir.
      </p>
      <ul class="sources-list">
        <li v-for="s in AFAP_SOURCES" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer">{{ s.label }}</a>
        </li>
      </ul>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AFAP_FAQ,
  AFAP_PATHS,
  AFAP_SOURCES,
  AFAP_VERIFIED_AT,
  AFAP_CONDITIONS,
  AFAP_DECISION_DAYS,
  AFAP_IRREVERSIBLE_WARNING,
  AFAP_NOT_THE_SAME,
  AFAP_STEPS,
  checkRevocation,
  AFAP_ASSET_CLASSES,
  AFAP_COHORTS,
  AFAP_COHORT_RULE,
  AFAP_D_FUND_NOTE,
  AFAP_FEES,
  AFAP_FEES_AT,
  AFAP_FEE_BASE_RULE,
  AFAP_FEE_BASE_RULE_2,
  AFAP_FEE_CAP,
  AFAP_FEE_MYTH,
  AFAP_INSURANCE_PREMIUM,
  AFAP_INSURERS,
  AFAP_ME_MAX,
  AFAP_ME_USED,
  AFAP_NEW_ENTRANTS_FEE,
  AFAP_PORTFOLIO,
  AFAP_PORTFOLIO_AT,
  AFAP_PORTFOLIO_TOTALS,
  AFAP_SUBFONDOS,
  AFAP_TOPES_AT,
  AFAP_TOPE_A,
  AFAP_TOPE_ANSWER,
  AFAP_TOPE_B,
  AFAP_TOPE_C,
  AFAP_WHY_NOT_ABROAD,
  APORTE_JUBILATORIO_RATE,
  SPC_NIVEL_1,
  SPC_NIVEL_2,
  SPC_VIGENCIA,
  splitAporte,
  type AfapCohort,
  type AfapPortfolioLine,
} from '~/utils/afapRevocation'

const localePath = useLocalePath()

const age = ref(45)
const mixedRegime = ref(true)

const result = computed(() =>
  checkRevocation({
    age: Number.isFinite(age.value) ? age.value : 0,
    mixedRegime: mixedRegime.value,
  })
)

// --- ¿Desde qué sueldo va plata a la AFAP? ---
const nominal = ref(90000)
const art8 = ref(false)
const cohort = ref<AfapCohort>('ley16713')

const split = computed(() =>
  splitAporte({
    nominal: Number.isFinite(nominal.value) ? nominal.value : 0,
    art8: art8.value,
    cohort: cohort.value,
  })
)

const cohortDetail = computed(() => AFAP_COHORTS.find(c => c.id === cohort.value)?.who ?? '')

const moneyFmt = new Intl.NumberFormat('es-UY', {
  style: 'currency',
  currency: 'UYU',
  maximumFractionDigits: 0,
})
const money = (n: number) => moneyFmt.format(Math.round(n))
const pct = (n: number) => `${n.toLocaleString('es-UY', { maximumFractionDigits: 3 })}%`
const range = ([lo, hi]: readonly [number, number]) => (lo === hi ? `${lo}%` : `${lo}%–${hi}%`)

const MONEDA_LABELS: Record<AfapPortfolioLine['moneda'], string> = {
  pesos: 'Pesos',
  reajustable: 'Reajustable (UI / UP)',
  extranjera: 'Moneda extranjera',
}
const monedaLabel = (m: AfapPortfolioLine['moneda']) => MONEDA_LABELS[m]

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
const monthLabel = (ym: string) =>
  new Date(`${ym}-01`).toLocaleDateString('es-UY', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedAt = longDate(AFAP_VERIFIED_AT)
const portfolioDate = longDate(AFAP_PORTFOLIO_AT)
const spcDate = longDate(SPC_VIGENCIA)
const topesMonth = monthLabel(AFAP_TOPES_AT)
const feesMonth = monthLabel(AFAP_FEES_AT)
const totalMillones = Math.round(AFAP_PORTFOLIO_TOTALS.totalMilesDePesos / 1000).toLocaleString(
  'es-UY'
)

const canonicalUrl = 'https://cambio-uruguay.com/desvincularme-de-la-afap-uruguay'
const title = '¿Cómo me desvinculo de una AFAP? Revocación del artículo 8, paso a paso'
const description =
  'Revocar la opción del artículo 8 no es lo mismo que desafiliarse de la AFAP. Las condiciones exactas de la revocación (40 a 49 años, Régimen Mixto, haber optado sin estar obligado, causal antes de 2043), el asesoramiento obligatorio de BPS y los 90 días corridos para decidir. Más: desde qué sueldo va plata a la AFAP (tope A $ 96.279), en qué está invertida y por qué la ley casi no la deja ir al exterior, y sobre qué te cobran la comisión y la prima del seguro.'

defineOgImageComponent('Cambio', {
  title: '¿Cómo me desvinculo de una AFAP?',
  subtitle: 'Revocar el artículo 8 no es desafiliarse',
  tag: 'JUBILACIÓN',
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
        'desvincularme de la afap, desafiliarse afap uruguay, revocacion articulo 8 ley 16713, revocar afap bps, asesoramiento bps afap, 90 dias revocacion afap, salir de la afap, regimen mixto bps afap, causal jubilatoria 2043, tope a afap 2026, desde que sueldo aporto a la afap, en que invierten las afap, afap invertir en el exterior, comision afap sobre el aporte, prima seguro colectivo invalidez y fallecimiento',
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
                name: 'Desvincularme de la AFAP',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: AFAP_FAQ.map(f => ({
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
.afap-page {
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

.warn-card,
.path-card,
.form-card,
.verdict-card,
.results-card,
.step-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
}
.v-theme--light .warn-card,
.v-theme--light .path-card,
.v-theme--light .form-card,
.v-theme--light .verdict-card,
.v-theme--light .results-card,
.v-theme--light .step-card {
  background: rgba(0, 0, 0, 0.02);
  border-color: rgba(0, 0, 0, 0.1);
}
.warn-card {
  border-color: rgba(var(--v-theme-warning), 0.5);
}
.verdict-card.is-ok {
  border-color: rgba(var(--v-theme-success), 0.55);
}

.step-n {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1.2;
  color: rgb(var(--v-theme-primary));
  font-variant-numeric: tabular-nums;
}

.sources-list {
  padding-left: 1.1rem;
  font-size: 0.9rem;
  line-height: 1.8;
}

.table-scroll {
  overflow-x: auto;
}
</style>
