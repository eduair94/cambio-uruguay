<template>
  <VContainer class="lrm py-8" style="max-width: 1100px">
    <VBreadcrumbs :items="crumbs" class="px-0 pb-2" />

    <header class="mb-6">
      <VChip color="primary" variant="tonal" size="small" class="mb-3">
        Inversiones · licitaciones del BCU
      </VChip>
      <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
        Letras de Regulación Monetaria (LRM): tasas y cómo invertir
      </h1>
      <p class="text-body-1 lead">
        Las LRM son la deuda en pesos del Banco Central del Uruguay: letras de cupón cero que el BCU
        licita todas las semanas para regular cuánta plata circula.
        <template v-if="thirty">
          En la última licitación, la de 30 días cortó en
          <strong>{{ pct(thirty.cutRate) }}</strong> ({{ shortDay(thirty.date) }})</template
        ><template v-if="year">
          y la de un año en <strong>{{ pct(year.cutRate) }}</strong> ({{
            shortDay(year.date)
          }})</template
        >.
      </p>
      <p v-if="yearMove" class="text-body-2 text-medium-emphasis lead mt-2">{{ yearMove }}</p>
      <p v-if="breakEvenLead" class="text-body-2 lead mt-2">
        Para una persona la cuenta depende del monto: comprada por el BROU, la letra le gana al
        plazo fijo e-BROU {{ breakEvenLead }}. Con menos, el plazo fijo rinde más que la letra
        comprada por el BROU.
      </p>
      <p v-if="rateRange" class="text-body-2 lead mt-2">
        La Tasa de Política Monetaria del BCU está en {{ tpmLabel }} {{ tpmSince }}, y las últimas
        letras cortaron {{ rateRange }}.
        <NuxtLink :to="links.tpm" class="cu-link">Qué es la TPM</NuxtLink>.
      </p>
      <p v-if="nextAuction" class="text-body-2 lead mt-2">
        La próxima licitación es el <strong>{{ longDay(nextAuction.date) }}</strong
        >, a las {{ nextAuction.hour }}: letra a {{ nextAuction.days }} días.
      </p>
    </header>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">
        Tasa de corte de la última licitación, por plazo
      </h2>
      <p class="text-body-2 lead mb-3">
        El BCU adjudica cada licitación a una sola tasa, la de corte: todos los que entran cobran
        esa. Es tasa efectiva anual en pesos, antes de la comisión del banco.
      </p>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Plazo</th>
              <th scope="col">Licitación</th>
              <th scope="col" class="text-right">Días</th>
              <th scope="col" class="text-right">Tasa de corte</th>
              <th scope="col" class="text-right">Hace un año</th>
              <th scope="col" class="text-right">Adjudicado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in latestRows" :key="row.auction.series">
              <td data-label="Plazo">{{ LRM_TERM_LABEL[row.auction.termRef] }}</td>
              <td data-label="Licitación">{{ shortDay(row.auction.date) }}</td>
              <td data-label="Días" class="text-right">{{ row.auction.days }}</td>
              <td data-label="Tasa de corte" class="text-right font-weight-bold">
                {{ pct(row.auction.cutRate) }}
              </td>
              <td data-label="Hace un año" class="text-right">
                {{ row.yearAgo ? pct(row.yearAgo.cutRate) : '—' }}
              </td>
              <td data-label="Adjudicado" class="text-right">
                $ {{ formatNumber(row.auction.awarded, 0) }} millones
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <VAlert v-if="stale" type="info" variant="tonal" density="comfortable" class="mt-3">
        <span class="text-body-2">
          La última licitación que tenemos es del {{ shortDay(newestDate) }}. El BCU licita todas
          las semanas, así que su planilla puede traer una más nueva:
          <a
            :href="snapshot.sources.pageUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="cu-link"
            >mirala en el BCU</a
          >.
        </span>
      </VAlert>
      <p class="text-caption text-medium-emphasis mt-2">
        Fuente: BCU, planilla «Operaciones BCU y MEF local», con todas las licitaciones de LRM desde
        2019. {{ readLabel }}
      </p>
    </section>

    <section v-if="chartRows.length > 4" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Cómo se movió la tasa en el último año</h2>
      <p v-if="yearMove" class="text-body-2 lead mb-3">{{ yearMove }}</p>
      <div class="chart-wrap">
        <ClientOnly>
          <LineChart
            :chart-data="chartData"
            :options="chartOptions"
            aria-label="Tasa de corte de las Letras de Regulación Monetaria por plazo, licitación por licitación"
          />
          <template #fallback>
            <VSkeletonLoader type="image" />
          </template>
        </ClientOnly>
      </div>

      <template v-if="recentAuctions.length">
        <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-2">
          Las últimas {{ recentAuctions.length }} licitaciones
        </h3>
        <div class="table-wrap">
          <VTable class="cu-mobile-cards" density="compact">
            <thead>
              <tr>
                <th scope="col">Fecha</th>
                <th scope="col">Plazo</th>
                <th scope="col" class="text-right">Días</th>
                <th scope="col" class="text-right">Tasa de corte</th>
                <th scope="col" class="text-right">Licitado</th>
                <th scope="col" class="text-right">Adjudicado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in recentAuctions" :key="a.series">
                <td data-label="Fecha">{{ shortDay(a.date) }}</td>
                <td data-label="Plazo">{{ LRM_TERM_LABEL[a.termRef] }}</td>
                <td data-label="Días" class="text-right">{{ a.days }}</td>
                <td data-label="Tasa de corte" class="text-right font-weight-bold">
                  {{ pct(a.cutRate) }}
                </td>
                <td data-label="Licitado" class="text-right">
                  $ {{ formatNumber(a.auctioned, 0) }} millones
                </td>
                <td data-label="Adjudicado" class="text-right">
                  $ {{ formatNumber(a.awarded, 0) }} millones
                </td>
              </tr>
            </tbody>
          </VTable>
        </div>
      </template>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Próximas licitaciones</h2>
      <template v-if="upcoming.length">
        <div class="table-wrap">
          <VTable class="cu-mobile-cards" density="comfortable">
            <thead>
              <tr>
                <th scope="col">Licitación</th>
                <th scope="col" class="text-right">Días</th>
                <th scope="col">Vence</th>
                <th scope="col" class="text-right">A licitar</th>
                <th scope="col" class="text-right">No competitivo</th>
                <th scope="col" class="text-right">Cierre</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in upcoming" :key="item.series">
                <td data-label="Licitación">{{ longDay(item.date) }}</td>
                <td data-label="Días" class="text-right">{{ item.days }}</td>
                <td data-label="Vence">{{ shortDay(item.maturity) }}</td>
                <td data-label="A licitar" class="text-right">
                  $ {{ formatNumber(item.amount, 0) }} millones
                </td>
                <td data-label="No competitivo" class="text-right">
                  $ {{ formatNumber(item.nonCompetitive, 0) }} millones
                </td>
                <td data-label="Cierre" class="text-right">{{ item.hour }}</td>
              </tr>
            </tbody>
          </VTable>
        </div>
        <p class="text-caption text-medium-emphasis mt-2">
          Calendario tentativo del BCU<template v-if="snapshot.calendar?.publishedOn">
            publicado el {{ longDay(snapshot.calendar.publishedOn, true) }}</template
          >. Puede cambiar por feriados o paros; el BCU lo reemplaza cada viernes.
        </p>
      </template>
      <template v-else>
        <p class="text-body-2 lead mb-2">
          El calendario que tenemos ya pasó. Mientras el BCU no publique el próximo (sale los
          viernes), la regla de su documento de instrumentos es esta:
        </p>
        <ul class="plain-list">
          <li v-for="s in LRM_SCHEDULE" :key="s.termRef">
            <strong>{{ LRM_TERM_LABEL[s.termRef] }}:</strong> {{ s.rule }}.
          </li>
        </ul>
      </template>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">
        ¿Le gana a un plazo fijo? Depende de cuánto pongas
      </h2>
      <p class="text-body-2 lead mb-3">
        La letra no paga IRPF y el plazo fijo sí. Pero una persona no compra en la licitación:
        compra por su banco o por un corredor, y la comisión se cobra aparte. Elegí un monto y un
        plazo para ver qué te queda con cada uno, con las tasas de la última licitación.
      </p>
      <VRow dense class="mb-2">
        <VCol cols="12" sm="6">
          <VTextField
            v-model.number="amount"
            label="Monto a invertir"
            prefix="$"
            type="number"
            :min="0"
            :step="amountStep"
            variant="outlined"
            :error-messages="amountError"
            hide-details="auto"
          />
        </VCol>
        <VCol cols="12" sm="6">
          <VSelect
            v-model="term"
            :items="termItems"
            label="Plazo de la letra"
            variant="outlined"
            hide-details
          />
        </VCol>
      </VRow>
      <div v-if="comparison?.rows.length" class="table-wrap">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Opción</th>
              <th scope="col" class="text-right">Ganás en {{ comparison.days }} días</th>
              <th scope="col" class="text-right">Rinde por año</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in comparison.rows" :key="row.id" :class="{ 'best-row': row.best }">
              <td data-label="Opción">
                <span class="font-weight-medium">{{ row.label }}</span>
                <span class="d-block text-caption text-medium-emphasis">{{ row.detail }}</span>
              </td>
              <td data-label="Ganás" class="text-right font-weight-bold">{{ money(row.gain) }}</td>
              <td data-label="Rinde por año" class="text-right">{{ pct(row.annual) }}</td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p v-if="comparison?.verdict" class="text-body-2 lead mt-3">{{ comparison.verdict }}</p>

      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-2">
        Desde cuánto la LRM comprada por el BROU le gana al plazo fijo e-BROU
      </h3>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards" density="compact">
          <thead>
            <tr>
              <th scope="col">Plazo</th>
              <th scope="col" class="text-right">Tasa de corte</th>
              <th scope="col" class="text-right">Pizarra e-BROU</th>
              <th scope="col" class="text-right">La letra gana desde</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in breakEvenRows" :key="row.termRef">
              <td data-label="Plazo">{{ LRM_TERM_LABEL[row.termRef] }}</td>
              <td data-label="Tasa de corte" class="text-right">{{ pct(row.cutRate) }}</td>
              <td data-label="Pizarra e-BROU" class="text-right">
                {{ row.deposit != null ? pct(row.deposit) : `no hay a ${row.days} días` }}
              </td>
              <td data-label="La letra gana desde" class="text-right font-weight-bold">
                {{ breakEvenLabel(row) }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p v-if="shortLetter" class="text-body-2 text-medium-emphasis lead mt-2">
        {{ noComparableDepositSentence(shortLetter.days) }}
      </p>
      <p class="text-body-2 lead mt-3">
        La comisión mínima del BROU es de {{ money(BROU_MIN_COMMISSION) }} por operación<template
          v-if="smallTicket"
          >: con {{ money(LRM_MIN_BID) }} a {{ smallTicket.days }} días, la letra genera
          {{ money(smallTicket.gross) }} de interés y la comisión es
          {{ smallTicket.eats ? 'más que eso' : money(smallTicket.commission) }}</template
        >. {{ itauSentence }} Si querés el plazo fijo, simulalo con la
        <NuxtLink :to="links.plazoFijo" class="cu-link">calculadora de plazo fijo</NuxtLink>; si
        buscás liquidez diaria en pesos, mirá las
        <NuxtLink :to="links.cuenta" class="cu-link">cuentas remuneradas</NuxtLink>.
      </p>

      <h3 class="text-subtitle-1 font-weight-bold mt-6 mb-2">
        Cuánto te queda según cuánto pongas
      </h3>
      <p class="text-body-2 lead mb-3">
        La misma cuenta para los montos más comunes, con la última licitación de cada plazo.
        Ganancia en pesos al vencimiento, ya descontada la comisión (letra) o el IRPF (plazo fijo).
      </p>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards cu-roomy" density="compact">
          <thead>
            <tr>
              <th scope="col">Monto</th>
              <th v-for="a in gridColumns" :key="a.termRef" scope="col" class="text-right">
                {{ LRM_TERM_LABEL[a.termRef] }}
                <span class="d-block text-caption text-medium-emphasis">
                  {{ a.days }} días · {{ pct(a.cutRate) }}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in amountGrid" :key="row.amount">
              <td data-label="">{{ money(row.amount) }}</td>
              <td
                v-for="c in row.cells"
                :key="c.termRef"
                :data-label="`${LRM_TERM_LABEL[c.termRef]} (${c.days} días)`"
                class="text-right"
              >
                <span>
                  <span class="d-block" :class="{ 'font-weight-bold': c.winner === 'letter' }">
                    {{
                      c.letter
                        ? `Letra ${money(c.letter.netGain)} (${BROKER_NAME[c.letter.broker]})`
                        : 'Letra: no llega al mínimo'
                    }}
                  </span>
                  <span class="d-block" :class="{ 'font-weight-bold': c.winner === 'deposit' }">
                    {{
                      c.deposit
                        ? `Plazo fijo ${money(c.deposit.netGain)}`
                        : 'Sin plazo fijo a ese plazo'
                    }}
                  </span>
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-caption text-medium-emphasis mt-2">
        Letra: la que deja más entre comprarla por el BROU o por Itaú. Plazo fijo: pizarra e-BROU.
        En negrita, la que gana.
      </p>

      <p class="text-caption text-medium-emphasis mt-2">
        Comisiones según los tarifarios publicados: {{ brouTariff.rule }} (BROU);
        {{ itauTariff.rule }}
        (Itaú). Plazo fijo: pizarra e-BROU en pesos vigente desde el
        {{ BROU_DEPOSIT_BOARD.series.UYU.vigenciaMoneda }}, intereses al vencimiento, menos el IRPF
        del {{ DEPOSIT_IRPF_LAW }}. Corredores y otros bancos publican tarifas propias.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Cómo comprar LRM siendo una persona</h2>
      <ol class="steps">
        <li>
          <strong>Por un banco o un corredor de bolsa, nunca directo.</strong> En la licitación
          compiten sólo los Operadores Primarios que designa el BCU; el resto de los bancos,
          corredores y casas financieras entra en el tramo no competitivo, a la misma tasa de corte
          y por hasta el 20 % de lo licitado. Tu banco o tu corredor te anota ahí, o te vende letras
          ya emitidas en el mercado secundario. El BCU lo recordó el 1/3/2024: la inversión «está
          disponible a través de los distintos agentes regulados del sistema financiero».
        </li>
        <li>
          <strong>Con un mínimo de {{ money(LRM_MIN_BID) }}.</strong> El sistema del BCU no admite
          propuestas por menos, y exige múltiplos de {{ money(LRM_BID_STEP) }}. El banco puede pedir
          más.
        </li>
        <li>
          <strong>Antes de la hora de cierre.</strong> Las licitaciones cierran a las 14:00 del día
          que marca el calendario; la plata se debita el día de liquidación, que suele ser el mismo
          (el de un año liquida al día siguiente).
        </li>
        <li>
          <strong>Al vencer cobrás el valor nominal.</strong> No hay cupones en el medio: la
          ganancia es la diferencia entre lo que pagaste y lo que cobrás al final. La custodia es
          sin cargo en el BROU y en Itaú.
        </li>
      </ol>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Dónde comprar LRM: qué publica cada banco</h2>
      <p class="text-body-2 lead mb-3">
        Lo que cada banco publica en su sitio y en su tarifario, leído el
        {{ longDay(LRM_TARIFFS_VERIFIED_AT, true) }}. De estos cinco, sólo el BROU y el Itaú
        publican una comisión propia de las LRM que dice cómo se aplica: son las dos del simulador.
        BBVA publica un porcentaje para letras sin decir si es anual, y Santander no tiene un
        renglón para letras.
      </p>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards cu-roomy" density="compact">
          <thead>
            <tr>
              <th scope="col">Banco</th>
              <th scope="col">Cómo se compra</th>
              <th scope="col">Mínimo</th>
              <th scope="col">Comisión por comprar</th>
              <th scope="col">Custodia</th>
              <th scope="col">Fuente</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in LRM_WHERE_TO_BUY" :key="s.id">
              <td data-label="">{{ s.name }}</td>
              <td data-label="Cómo se compra" class="cu-cell-prose">{{ s.how }}</td>
              <td data-label="Mínimo" class="cu-cell-prose">{{ s.minimum }}</td>
              <td data-label="Comisión por comprar" class="cu-cell-prose">{{ s.commission }}</td>
              <td data-label="Custodia" class="cu-cell-prose">{{ s.custody }}</td>
              <td data-label="Fuente" class="cu-cell-prose">
                <span class="source-links">
                  <a
                    v-for="src in s.sources"
                    :key="src.url"
                    :href="src.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="cu-link"
                    >{{ src.label }}</a
                  >
                </span>
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-body-2 lead mt-3">
        Si vas por un corredor de bolsa o un agente de valores, fijate que figure en el
        <a
          :href="LRM_SOURCES.bcuIntermediariesUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="cu-link"
          >registro de intermediarios de valores del BCU</a
        >
        y pedí por escrito la tasa neta: lo que te queda después de la comisión.
      </p>
    </section>

    <section v-if="example" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Cómo se lee la tasa</h2>
      <p class="text-body-2 lead mb-2">
        El BCU calcula lo que se paga hoy con VA = VN / (1 + i)<sup>t/365</sup>: el valor nominal
        que se cobra al vencer, descontado a la tasa de corte por los días del plazo.
      </p>
      <p class="text-body-2 lead">
        Con la última letra a {{ LRM_TERM_LABEL[example.auction.termRef] }} ({{
          example.auction.days
        }}
        días al {{ pct(example.auction.cutRate) }}), para cobrar
        <strong>{{ money(100000) }}</strong> el {{ shortDay(example.auction.maturity) }} se pagaron
        <strong>{{ money(example.price) }}</strong> el {{ shortDay(example.auction.settlement) }}:
        {{ money(100000 - example.price) }} de ganancia antes de la comisión.
      </p>
    </section>

    <section class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Impuestos: las LRM no pagan IRPF</h2>
      <p class="text-body-2 lead mb-2">
        El Título 7, art. 38, literal A exonera del IRPF «los intereses de los títulos de deuda
        pública», y también la ganancia por venderlos antes de que venzan. La DGI trata a las LRM
        como títulos de deuda pública (Consulta 6.322 de 2020), y el reglamento con el que el BCU
        las licita las llama así. Un plazo fijo en pesos a menos de un año paga
        {{ pct(depositIrpf, 1) }} de IRPF sobre el interés: esa es toda la ventaja impositiva de la
        letra, y la comisión del banco puede comérsela entera (la cuenta está más arriba).
      </p>
      <p class="text-body-2 lead">
        Para el Impuesto al Patrimonio y el resto de tus rentas de capital, mirá
        <NuxtLink :to="links.impuestos" class="cu-link">impuestos a las inversiones</NuxtLink>.
      </p>
    </section>

    <section v-if="treasury.length" class="mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">¿Y en UI? Las Notas del Tesoro</h2>
      <p class="text-body-2 lead mb-3">
        Hoy el BCU emite LRM sólo en pesos nominales. Para indexar a la inflación, el instrumento
        del Estado es la Nota del Tesoro del MEF, que el BCU licita en el mismo calendario. Paga
        cupón y dura años, no meses.
      </p>
      <div class="table-wrap">
        <VTable class="cu-mobile-cards" density="comfortable">
          <thead>
            <tr>
              <th scope="col">Moneda</th>
              <th scope="col">Licitación</th>
              <th scope="col">Vence</th>
              <th scope="col" class="text-right">Cupón</th>
              <th scope="col" class="text-right">Tasa de corte</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in treasury" :key="t.currency">
              <td data-label="Moneda">{{ TREASURY_LABEL[t.currency] }}</td>
              <td data-label="Licitación">{{ shortDay(t.date) }} (serie {{ t.series }})</td>
              <td data-label="Vence">{{ shortDay(t.maturity) }}</td>
              <td data-label="Cupón" class="text-right">{{ pct(t.coupon, 3) }}</td>
              <td data-label="Tasa de corte" class="text-right font-weight-bold">
                {{ pct(t.yield) }}{{ t.currency === 'UYU' ? '' : ' real' }}
              </td>
            </tr>
          </tbody>
        </VTable>
      </div>
      <p class="text-caption text-medium-emphasis mt-2">
        Fuente: BCU, misma planilla, hoja «NT MEF». En UI y UP la tasa es por encima de la
        inflación.
        <NuxtLink :to="links.bonos" class="cu-link">Cómo funcionan los bonos</NuxtLink>.
      </p>
    </section>

    <!-- En video: un creador uruguayo que contesta lo mismo (utils/creatorVideos.ts) -->
    <CreatorVideos
      page="/letras-de-regulacion-monetaria-uruguay"
      title="Dónde se usan las Letras, en video"
      intro="Las cuentas remuneradas y muchos fondos en pesos compran Letras de Regulación Monetaria por dentro. Un creador uruguayo lo explica y las compara con el plazo fijo y la UI. Si te sirve, suscribite a su canal."
    />

    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded />

    <section class="mt-8 mb-8">
      <h2 class="text-h5 font-weight-bold mb-3">Fuentes</h2>
      <ul class="sources">
        <li v-for="s in sources" :key="s.url">
          <a :href="s.url" target="_blank" rel="noopener noreferrer" class="cu-link">{{
            s.label
          }}</a>
        </li>
      </ul>
      <p class="text-caption text-medium-emphasis">
        Normas, tarifarios, pizarra y páginas de los bancos verificados el
        {{ longDay(LRM_TARIFFS_VERIFIED_AT, true) }}. Las tasas de las licitaciones se leen de la
        planilla del BCU dos veces por día.
      </p>
    </section>

    <section>
      <h2 class="text-h5 font-weight-bold mb-3">Seguir leyendo</h2>
      <div class="d-flex flex-wrap ga-2">
        <VBtn
          v-for="l in related"
          :key="l.to"
          :to="localePath(l.to)"
          variant="tonal"
          color="primary"
          size="small"
        >
          {{ l.label }}
        </VBtn>
      </div>
    </section>
  </VContainer>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
// Explícito: components/charts/ no se auto-importa plano (sería `ChartsLineChart`).
import LineChart from '~/components/charts/LineChart.vue'
import { formatNumber, formatSiteDateTime } from '~/utils/format'
import { BROU_DEPOSIT_BOARD, DEPOSIT_IRPF_LAW, netOfIrpf } from '~/utils/investments'
import { COPOM_DECISIONS_2026, LAST_DECISION } from '~/utils/monetaryPolicyRate'
import {
  BROKER_TARIFFS,
  BROU_MIN_COMMISSION,
  DEPOSIT_MIN_UYU,
  LRM_BASELINE,
  LRM_BID_STEP,
  LRM_MIN_BID,
  LRM_SCHEDULE,
  LRM_SOURCES,
  LRM_STATIC_DESCRIPTION,
  LRM_TARIFFS_VERIFIED_AT,
  LRM_TERM_LABEL,
  LRM_VERIFIED_AT,
  LRM_WHERE_TO_BUY,
  breakEvenAmount,
  breakEvenLabel,
  breakEvenSentence,
  buildAmountGrid,
  buildBreakEvenRows,
  buildLrmFaq,
  daysBetween,
  depositOutcome,
  latestAuctions,
  latestFor,
  longDay,
  lrmDescription,
  lrmOutcome,
  lrmTitle,
  money,
  noComparableDepositSentence,
  pct,
  presentValue,
  shortDay,
  sortedLatest,
  upcomingFrom,
  usableSnapshot,
  yearAgoOf,
  type LrmAuction,
  type LrmSnapshotDoc,
  type LrmTermRef,
} from '~/utils/lrm'

const localePath = useLocalePath()

// Rutas cortas: con `localePath('…')` adentro el enlace no entra en una línea y prettier y
// vue/max-attributes-per-line se pelean por dónde va `class`.
const links = {
  plazoFijo: localePath('/herramientas/calculadora-plazo-fijo'),
  cuenta: localePath('/cuenta-remunerada-uruguay'),
  impuestos: localePath('/impuestos-inversiones-uruguay'),
  bonos: localePath('/guias/bonos-y-renta-fija-uruguay'),
  tpm: localePath('/guias/tasa-de-politica-monetaria-uruguay'),
}

const { data } = await useFetch<LrmSnapshotDoc | null>('/api/letras-regulacion-monetaria', {
  key: 'lrm',
  default: () => null,
})

// La foto del job si vino entera; si no, la planilla leída a mano, que dice su propia fecha.
const live = computed(() => usableSnapshot(data.value))
const snapshot = computed<LrmSnapshotDoc>(() => live.value ?? LRM_BASELINE)

// El día de hoy en Montevideo, resuelto UNA vez en setup: en el template se reevaluaría en cada
// render y el servidor y el navegador podrían no coincidir.
//
// Al hidratar, el día del SERVIDOR, que viaja en el payload: la página se guarda 10 minutos en el
// borde, así que el HTML de las 23:55 se hidrataba pasada la medianoche con otra licitación en la
// FAQ que el HTML (tests/unit/headHydrationParity.test.ts). En cualquier otra visita dentro de la
// misma pestaña, el de hoy: un useState solo lo congelaría por toda la sesión, y quien volviera
// días después por un enlace interno vería como "próxima" una licitación que ya pasó.
const montevideoToday = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Montevideo' })
const renderedDay = useState('lrm-today', montevideoToday)
const TODAY =
  import.meta.client && !useNuxtApp().isHydrating ? montevideoToday() : renderedDay.value

const thirty = computed(() => latestFor(snapshot.value, 30))
const year = computed(() => latestFor(snapshot.value, 360))
const newestDate = computed(
  () =>
    snapshot.value.latest
      .map(a => a.date)
      .sort()
      .at(-1) ?? ''
)
/** El BCU licita todos los días hábiles: diez días sin una licitación nueva es una planilla vieja. */
const stale = computed(() => Boolean(newestDate.value) && daysBetween(newestDate.value, TODAY) > 10)

const readLabel = computed(() =>
  live.value?.capturedAt
    ? `Leída el ${formatSiteDateTime(live.value.capturedAt, 'es-UY', { day: 'numeric', month: 'long' })}.`
    : `Leída a mano el ${longDay(LRM_VERIFIED_AT, true)}.`
)

const latestRows = computed(() =>
  [...snapshot.value.latest]
    .sort((a, b) => a.termRef - b.termRef)
    .map(auction => ({ auction, yearAgo: yearAgoOf(snapshot.value.recent, auction) }))
)

const yearMove = computed(() => {
  if (!thirty.value) return ''
  const before = yearAgoOf(snapshot.value.recent, thirty.value)
  if (!before) return ''
  const diff = thirty.value.cutRate - before.cutRate
  if (Math.abs(diff) < 0.005) {
    return `Hace un año, el ${shortDay(before.date)}, la de 30 días cortaba en lo mismo.`
  }
  return `Hace un año, el ${shortDay(before.date)}, la de 30 días cortaba en ${pct(before.cutRate)}: hoy rinde ${formatNumber(Math.abs(diff), 2)} puntos ${diff < 0 ? 'menos' : 'más'}.`
})

const upcoming = computed(() => upcomingFrom(snapshot.value.calendar, TODAY))
const nextAuction = computed(() => upcoming.value[0] ?? null)

// --- La cuenta contra el plazo fijo ---------------------------------------------------------------

const amount = ref(LRM_MIN_BID * 5)
const term = ref<LrmTermRef>(90)
const termItems = computed(() =>
  [...snapshot.value.latest]
    .sort((a, b) => a.termRef - b.termRef)
    .map(a => ({ title: `${LRM_TERM_LABEL[a.termRef]} (${a.days} días)`, value: a.termRef }))
)
const amountError = computed(() =>
  (amount.value || 0) < DEPOSIT_MIN_UYU
    ? `El plazo fijo e-BROU arranca en ${money(DEPOSIT_MIN_UYU)} y la letra en ${money(LRM_MIN_BID)}.`
    : ''
)

// Las flechas del campo: de a $ 5.000 (el plazo fijo) debajo del mínimo de la letra y de a
// $ 10.000 (lo que exige el BCU) desde ahí. La base es 0 y no el mínimo: con base $ 5.000 un paso de
// $ 10.000 ofrecería $ 105.000, que el BCU no acepta.
const amountStep = computed(() =>
  (amount.value || 0) < LRM_MIN_BID ? DEPOSIT_MIN_UYU : LRM_BID_STEP
)

const brouTariff = BROKER_TARIFFS.find(t => t.id === 'brou')!
const itauTariff = BROKER_TARIFFS.find(t => t.id === 'itau')!
const BROKER_NAME = { brou: 'BROU', itau: 'Itaú' } as const

const comparison = computed(() => {
  const auction: LrmAuction | null =
    latestFor(snapshot.value, term.value) ?? snapshot.value.latest[0] ?? null
  const invested = Math.max(DEPOSIT_MIN_UYU, Number(amount.value) || 0)
  if (!auction) return null
  const deposit = depositOutcome(invested, auction.days)
  const depositRow = deposit
    ? {
        id: 'deposit',
        label: 'Plazo fijo e-BROU',
        detail: `Pizarra ${pct(deposit.grossPct)} (${deposit.tranche.label} días), menos ${money(deposit.irpf)} de IRPF.`,
        gain: deposit.netGain,
        annual: deposit.netAnnualPct,
      }
    : null
  // Debajo del mínimo de la letra no se calcula una letra que no se puede comprar: queda el
  // plazo fijo, y la página lo dice en vez de subir el monto a escondidas.
  if (invested < LRM_MIN_BID) {
    const tail = deposit
      ? `En plazo fijo e-BROU a ${auction.days} días ganás ${money(deposit.netGain)} después del IRPF.`
      : noComparableDepositSentence(auction.days)
    return {
      days: auction.days,
      rows: depositRow ? [{ ...depositRow, best: true }] : [],
      verdict: `Con ${money(invested)} no llegás al mínimo de una letra (${money(LRM_MIN_BID)}). ${tail}`,
    }
  }
  // El BCU toma múltiplos de $ 10.000: un monto escrito a mano se baja al múltiplo para la letra
  // (el plazo fijo va con el monto entero) y el veredicto lo dice.
  const letterAmount = Math.floor(invested / LRM_BID_STEP) * LRM_BID_STEP
  const roundedNote =
    letterAmount !== invested
      ? `La letra se compra en múltiplos de ${money(LRM_BID_STEP)}: la cuenta de la letra es con ${money(letterAmount)}. `
      : ''
  const none = lrmOutcome(letterAmount, auction, 'none')
  const brou = lrmOutcome(letterAmount, auction, 'brou')
  const itau = lrmOutcome(letterAmount, auction, 'itau')
  const rows = [
    {
      id: 'none',
      label: 'LRM sin comisión',
      detail: `La tasa de corte entera, ${pct(auction.cutRate)}: el techo.`,
      gain: none.netGain,
      annual: none.netAnnualPct,
    },
    {
      id: 'brou',
      label: 'LRM comprada por el BROU',
      detail: `Comisión de ${money(brou.commission)}.`,
      gain: brou.netGain,
      annual: brou.netAnnualPct,
    },
    {
      id: 'itau',
      label: 'LRM comprada por Itaú',
      detail: '2 puntos menos de tasa.',
      gain: itau.netGain,
      annual: itau.netAnnualPct,
    },
  ]
  if (depositRow) rows.push(depositRow)
  // La mejor opción contratable: la fila sin comisión es un techo, no algo que se pueda comprar.
  const buyable = rows.filter(r => r.id !== 'none')
  const best = buyable.reduce((a, b) => (b.gain > a.gain ? b : a))
  // La mejor letra que se puede comprar de verdad, para comparar contra el plazo fijo.
  const letters = rows.filter(r => r.id === 'brou' || r.id === 'itau')
  const bestLetter = letters.reduce((a, b) => (b.gain > a.gain ? b : a))
  const letterName = bestLetter.id === 'brou' ? 'el BROU' : 'Itaú'
  const verdict = deposit
    ? best.id === 'deposit'
      ? `Con ${money(invested)} a ${auction.days} días, el plazo fijo por e-BROU te deja ${money(deposit.netGain - bestLetter.gain)} más que la mejor letra comprada por banco (por ${letterName}), aun pagando IRPF.`
      : `Con ${money(invested)} a ${auction.days} días, la letra comprada por ${letterName} te deja ${money(bestLetter.gain - deposit.netGain)} más que el plazo fijo por e-BROU.`
    : noComparableDepositSentence(auction.days)
  return {
    days: auction.days,
    rows: rows.map(r => ({ ...r, best: r.id === best.id })),
    verdict: `${roundedNote}${verdict}`,
  }
})

const breakEvenRows = computed(() => buildBreakEvenRows(snapshot.value))
/** La primera letra más corta que el plazo fijo más corto: la pizarra no tiene con qué compararla. */
const shortLetter = computed(() => breakEvenRows.value.find(r => !r.comparable) ?? null)
const breakEvenLead = computed(() => breakEvenSentence(breakEvenRows.value))

const amountGrid = computed(() => buildAmountGrid(snapshot.value))
const gridColumns = computed(() => sortedLatest(snapshot.value))
const recentAuctions = computed(() => latestAuctions(snapshot.value))

const tpmLabel = pct(LAST_DECISION.levelPct, Number.isInteger(LAST_DECISION.levelPct) ? 0 : 2)
/**
 * Fechado, porque «está en 6 %» sin fecha es la frase que el sitio ya publicó un mes después de que
 * dejara de ser cierta (utils/monetaryPolicyRate.ts). «Desde» sólo si la racha de reuniones con el
 * mismo nivel arranca en una que lo cambió; si no, la fecha del comunicado que se leyó.
 */
const tpmSince = (() => {
  let start = COPOM_DECISIONS_2026.length - 1
  while (start > 0 && COPOM_DECISIONS_2026[start - 1]!.levelPct === LAST_DECISION.levelPct) start--
  const first = COPOM_DECISIONS_2026[start]!
  return first.changeBp !== 0
    ? `desde el ${longDay(first.date, true)}`
    : `según el comunicado del COPOM del ${longDay(LAST_DECISION.date, true)}`
})()
/** «entre 6,06 % y 6,49 %», de la última licitación de cada plazo. */
const rateRange = computed(() => {
  const rates = snapshot.value.latest.map(a => a.cutRate)
  if (!rates.length) return ''
  const lo = Math.min(...rates)
  const hi = Math.max(...rates)
  return lo === hi ? `en ${pct(lo)}` : `entre ${pct(lo)} y ${pct(hi)}`
})

/** Lo que hace la comisión mínima con la letra más chica y más corta. */
const smallTicket = computed(() => {
  if (!thirty.value) return null
  const o = lrmOutcome(LRM_MIN_BID, thirty.value, 'brou')
  return {
    days: thirty.value.days,
    gross: o.grossGain,
    commission: o.commission,
    eats: o.commission >= o.grossGain,
  }
})

/** Si con la tarifa de Itaú la letra le gana alguna vez al plazo fijo, a estas tasas. */
const itauSentence = computed(() => {
  const wins = snapshot.value.latest.filter(a => breakEvenAmount(a, 'itau') != null)
  if (!wins.length) {
    return 'Con la tarifa de Itaú —2 puntos de la tasa— la letra queda por debajo del plazo fijo e-BROU en todos los plazos y montos, con las tasas de esta licitación.'
  }
  const labels = wins.map(a => LRM_TERM_LABEL[a.termRef]).join(', ')
  return `Con la tarifa de Itaú —2 puntos de la tasa— la letra le gana al plazo fijo e-BROU sólo a ${labels}, con las tasas de esta licitación.`
})

const depositIrpf = netOfIrpf(1, 'UYU', 12).taxPct

/** El ejemplo de la fórmula del BCU con la última letra a un año (o la más larga que haya). */
const example = computed(() => {
  const auction =
    year.value ?? [...snapshot.value.latest].sort((a, b) => b.days - a.days)[0] ?? null
  return auction ? { auction, price: presentValue(100000, auction.cutRate, auction.days) } : null
})

const TREASURY_LABEL: Record<'UYU' | 'UI' | 'UP', string> = {
  UYU: 'Pesos',
  UI: 'Unidades indexadas',
  UP: 'Unidades previsionales',
}
const treasury = computed(() => snapshot.value.treasury)

const faq = computed(() => buildLrmFaq(snapshot.value, nextAuction.value, breakEvenRows.value))

// --- Gráfico ----------------------------------------------------------------------------------------

const SERIES: { termRef: LrmTermRef; color: string }[] = [
  { termRef: 30, color: '#1976d2' },
  { termRef: 90, color: '#ff8f00' },
  { termRef: 180, color: '#00897b' },
  { termRef: 360, color: '#15517e' },
]

const chartRows = computed(() =>
  [...snapshot.value.recent].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
)

const chartData = computed(() => {
  const labels = [...new Set(chartRows.value.map(a => a.date))]
  return {
    labels: labels.map(shortDay),
    datasets: SERIES.filter(s => chartRows.value.some(a => a.termRef === s.termRef)).map(s => {
      const byDate = new Map(
        chartRows.value.filter(a => a.termRef === s.termRef).map(a => [a.date, a.cutRate])
      )
      return {
        label: LRM_TERM_LABEL[s.termRef],
        data: labels.map(d => byDate.get(d) ?? null),
        borderColor: s.color,
        backgroundColor: s.color,
        spanGaps: true,
        pointRadius: 0,
        tension: 0.2,
      }
    }),
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' } },
  scales: {
    x: { ticks: { maxRotation: 0, autoSkipPadding: 16 } },
    y: { ticks: { callback: (v: number) => `${v} %` } },
  },
}

// --- Fuentes, enlaces y SEO ------------------------------------------------------------------------

const sources = [
  {
    label: 'BCU — Operaciones BCU y MEF local (planilla de licitaciones)',
    url: LRM_SOURCES.operationsUrl,
  },
  { label: 'BCU — Calendario tentativo de colocaciones', url: LRM_SOURCES.calendarUrl },
  {
    label: 'BCU — Instrumentos emitidos por el BCU (características y mecanismo de licitación)',
    url: LRM_SOURCES.characteristicsUrl,
  },
  {
    label: 'BCU — Reglamento de Operadores Primarios (junio de 2024)',
    url: LRM_SOURCES.primaryDealersUrl,
  },
  { label: 'IMPO — Título 7, art. 38 (rentas exentas de IRPF)', url: LRM_SOURCES.irpfUrl },
  { label: 'DGI — Consulta tributaria 6.322 (2020)', url: LRM_SOURCES.dgiConsultaUrl },
  { label: brouTariff.sourceLabel, url: brouTariff.source },
  { label: itauTariff.sourceLabel, url: itauTariff.source },
  { label: 'BROU — Pizarras de plazo fijo e-BROU y sucursales', url: BROU_DEPOSIT_BOARD.pdfUrl },
  {
    label: 'BCU — Acceso a Letras de Regulación Monetaria por parte de la ciudadanía (1/3/2024)',
    url: LRM_SOURCES.citizenAccessUrl,
  },
  { label: 'BROU — Instrumentos financieros', url: LRM_SOURCES.brouInstrumentsUrl },
  {
    label: 'BROU — Instrumentos financieros, preguntas frecuentes',
    url: LRM_SOURCES.brouInstrumentsFaqUrl,
  },
  { label: 'Itaú — Inversiones (Letras de Regulación Monetaria)', url: LRM_SOURCES.itauProductUrl },
  {
    label: 'BBVA — Manual de tarifas y comisiones (3/9/2026), secciones 42 y 43',
    url: LRM_SOURCES.bbvaTariffUrl,
  },
  {
    label: 'Santander — Letras de Regulación Monetaria y Notas del Gobierno Central',
    url: LRM_SOURCES.santanderProductUrl,
  },
  { label: 'Santander — App Inversiones', url: LRM_SOURCES.santanderAppUrl },
  { label: 'Santander — Manual de tarifas, inversión', url: LRM_SOURCES.santanderTariffUrl },
  { label: 'Scotiabank — Banca Premium', url: LRM_SOURCES.scotiabankPremiumUrl },
  { label: 'Scotiabank — Banca Premium, inversiones', url: LRM_SOURCES.scotiabankInvestmentsUrl },
  { label: 'BCU — Intermediarios de valores', url: LRM_SOURCES.bcuIntermediariesUrl },
]

const related = [
  { label: 'Calculadora de plazo fijo', to: '/herramientas/calculadora-plazo-fijo' },
  { label: 'Cuenta remunerada', to: '/cuenta-remunerada-uruguay' },
  { label: 'Dónde invertir en Uruguay', to: '/inversiones-uruguay' },
  { label: 'Impuestos a las inversiones', to: '/impuestos-inversiones-uruguay' },
  { label: 'Bonos y renta fija', to: '/guias/bonos-y-renta-fija-uruguay' },
  { label: 'Qué son las LRM (glosario)', to: '/glosario/letras-regulacion-monetaria' },
  { label: 'Valor de la UI hoy', to: '/indicadores/unidad-indexada' },
  { label: 'Tasa de política monetaria', to: '/guias/tasa-de-politica-monetaria-uruguay' },
  {
    label: 'Contra la inflación: dólares o indexados',
    to: '/guias/proteger-ahorros-de-la-inflacion',
  },
  { label: '¿Conviene un plazo fijo?', to: '/guias/plazo-fijo-en-uruguay-conviene' },
]

const crumbs = computed(() => [
  { title: 'Inicio', to: localePath('/') },
  { title: 'Inversiones', to: localePath('/inversiones-uruguay') },
  { title: 'Letras de Regulación Monetaria', disabled: true },
])

const canonicalUrl = 'https://cambio-uruguay.com/letras-de-regulacion-monetaria-uruguay'

// La tasa va en el `<title>` sólo si vino un dato: sin él, título estable. Con la foto horneada
// también hay dato, y lleva su fecha en la descripción.
const title = computed(() => lrmTitle(snapshot.value))
const description = computed(() =>
  snapshot.value.latest.length ? lrmDescription(snapshot.value) : LRM_STATIC_DESCRIPTION
)

defineOgImageComponent('Cambio', {
  title: 'Letras de Regulación Monetaria',
  subtitle:
    thirty.value && year.value
      ? `${pct(thirty.value.cutRate)} a 30 días · ${pct(year.value.cutRate)} a un año`
      : 'Tasas de las licitaciones del BCU',
  tag: 'INVERSIÓN',
})

useSeoMeta({
  title: () => `${title.value} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: () => title.value,
  ogDescription: () => description.value,
  ogType: 'article',
  ogUrl: canonicalUrl,
  twitterCard: 'summary_large_image',
  twitterTitle: () => title.value,
  twitterDescription: () => description.value,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl }],
  meta: [
    {
      name: 'keywords',
      content:
        'letras de regulacion monetaria, tasas lrm uruguay, lrm bcu, licitacion lrm, como comprar lrm, letras del bcu, lrm o plazo fijo, lrm irpf, notas del tesoro ui',
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
                name: 'Inversiones',
                item: 'https://cambio-uruguay.com/inversiones-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Letras de Regulación Monetaria',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: 'Letras de Regulación Monetaria (LRM): tasas y cómo invertir',
            description: description.value,
            inLanguage: 'es-UY',
            dateModified: newestDate.value || LRM_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            author: { '@type': 'Organization', name: 'Cambio Uruguay' },
            publisher: { '@type': 'Organization', name: 'Cambio Uruguay' },
            citation: sources.map(s => ({ '@type': 'CreativeWork', name: s.label, url: s.url })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.table-wrap {
  overflow-x: auto;
}
.lrm :deep(.v-table) {
  width: 100%;
}
.lead {
  max-width: 68ch;
}
/* El contenedor del canvas mide 100 % de alto: sin una altura acá el gráfico colapsa a cero. */
.chart-wrap {
  position: relative;
  height: clamp(240px, 44vw, 340px);
}
.best-row td {
  background: rgba(var(--v-theme-primary), 0.08);
}
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
.steps,
.plain-list {
  padding-left: 1.25rem;
  max-width: 68ch;
}
.steps li,
.plain-list li {
  margin-top: 8px;
}
.source-links {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0 0.75rem;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-bottom: 4px;
}
</style>
