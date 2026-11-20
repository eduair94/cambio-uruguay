<!--
  /prestamos-para-jubilados-uruguay — quién le presta a un jubilado o a un pensionista, a qué tasa,
  cuánto le pueden descontar de la pasividad y cómo se reconoce el préstamo trucho. La pidió la cola
  de demanda del sitio («cuando empiezan los préstamos para jubilados en el brou», con foros arriba
  en el SERP). Todo lo que afirma está en utils/retireeLoans.ts con su fuente y la fecha de lectura.
-->
<template>
  <div class="retiree-page">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10" lg="8">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-account-cane</VIcon>
              Préstamos
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Préstamos para jubilados y pensionistas en Uruguay: BPS, BROU y cuánto te pueden
              descontar
            </h1>
            <p class="text-body-1 retiree-lead">
              El <strong>BPS</strong> presta hasta <strong>{{ maxHaberes }} pasividades</strong>,
              con un tope de <strong>{{ maxAmountLabel }}</strong
              >, al <strong>{{ teaRangeLabel }}</strong> anual según el plazo. El
              <strong>BROU</strong> presta con retención todo el año y hace una campaña para pasivos
              a fin de año, que en 2025 empezó en noviembre. Y pase lo que pase, la ley te deja
              cobrando en mano al menos el <strong>{{ floorPct }} %</strong> de tu pasividad.
            </p>
            <ShareButtons
              class="mt-4"
              :url="canonicalUrl"
              text="Préstamos para jubilados en Uruguay: BPS, BROU y cuánto te pueden descontar"
            />
            <p class="text-caption text-medium-emphasis mt-3">
              Tasas, topes y requisitos leídos en las páginas del BPS, del BROU, de ANDA y de Verde,
              y en impo.com.uy, el {{ verifiedDisplay }}. Cada dato lleva su fuente al pie.
            </p>
          </header>

          <VDivider class="mb-6" />

          <!-- 1. Lo que está abierto hoy -->
          <section class="mb-8" aria-labelledby="calendario-title">
            <h2 id="calendario-title" class="text-h5 font-weight-bold mb-3">
              Qué está abierto, y desde cuándo
            </h2>
            <p class="text-body-1 retiree-prose mb-4">
              Lo que más se busca es la fecha. Éste es el estado de cada cosa al
              {{ todayDisplay }}.
            </p>
            <VCard
              v-for="event in events"
              :key="event.id"
              variant="outlined"
              class="retiree-card pa-4 mb-3"
            >
              <div class="retiree-card-title d-flex flex-wrap align-center ga-2">
                <VChip size="x-small" variant="tonal">{{ event.who }}</VChip>
                <span class="text-subtitle-1 font-weight-bold">{{ event.title }}</span>
              </div>
              <div class="retiree-card-when d-flex flex-wrap align-center ga-2">
                <VChip :color="event.statusColor" size="small" variant="flat" label>
                  {{ event.statusLabel }}
                </VChip>
                <span class="text-body-2 text-medium-emphasis">{{ event.when }}</span>
              </div>
              <p class="text-body-2 retiree-card-body">{{ event.detail }}</p>
              <a
                v-if="event.source"
                :href="event.source.url"
                target="_blank"
                rel="noopener noreferrer"
                class="cu-link text-caption"
                >Fuente: {{ event.source.label }}</a
              >
            </VCard>
          </section>

          <!-- 2. El préstamo social del BPS -->
          <section class="mb-8" aria-labelledby="bps-title">
            <h2 id="bps-title" class="text-h5 font-weight-bold mb-3">El préstamo social del BPS</h2>
            <p class="text-body-1 retiree-prose mb-4">
              Es un préstamo en efectivo que el propio BPS le da a quien cobra una pasividad suya, y
              la cuota se descuenta del recibo. Presta hasta {{ maxHaberes }} haberes nominales
              mensuales con un tope de {{ maxAmountLabel }}, en 6, 12, 18 o 24 cuotas. La tasa la
              fija el BPS «ateniéndose al carácter social de los préstamos», y la bajó el 4 de
              agosto de 2026.
            </p>

            <VTable class="retiree-table cu-mobile-cards mb-3" density="comfortable">
              <thead>
                <tr>
                  <th>Cuotas</th>
                  <th>Tasa vigente</th>
                  <th>Antes del 4/8/2026</th>
                  <th>Pasividades mínimas, desde el 1/11</th>
                  <th>Cuota por cada $ 10.000</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rate in bpsRates" :key="rate.cuotas">
                  <td data-label="Cuotas">{{ rate.cuotas }}</td>
                  <td data-label="Tasa vigente">
                    <strong>{{ retireePct(rate.teaPct) }}</strong>
                  </td>
                  <td data-label="Antes del 4/8/2026">{{ retireePct(rate.previousPct) }}</td>
                  <td data-label="Pasividades mínimas, desde el 1/11">
                    {{ retireePct(rate.differentialPct) }}
                  </td>
                  <td data-label="Cuota por cada $ 10.000">{{ retireePesos(rate.cuota10k) }}</td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-caption text-medium-emphasis retiree-note mb-5">
              Tasas efectivas anuales sobre saldos. La cuota es la de la tabla de ejemplo del BPS,
              que cierra con la tasa sola: la ficha no menciona IVA. La tasa diferencial es para
              préstamos nuevos de quienes cobraron hace poco el aumento diferencial y adicional, por
              90 días.
            </p>

            <h3 class="text-subtitle-1 font-weight-bold retiree-h3">Quién lo puede pedir</h3>
            <ul class="retiree-list mb-3">
              <li v-for="item in beneficiaries" :key="item">{{ item }}</li>
            </ul>
            <p class="text-body-2 retiree-prose mb-5">
              Desde agosto de 2024 el BPS no da préstamos nuevos a quien cobra el
              <NuxtLink :to="localePath('/jubilacion-por-incapacidad-uruguay')"
                >subsidio transitorio por incapacidad parcial</NuxtLink
              >
              ni el subsidio especial por inactividad compensada, porque son prestaciones de
              actividad y no de pasividad; quien ya tenía un préstamo lo puede renovar.
            </p>

            <h3 class="text-subtitle-1 font-weight-bold retiree-h3">El tope de la cuota</h3>
            <p class="text-body-2 retiree-prose mb-3">
              Dos topes que no coinciden, y un piso que manda sobre los dos.
              <strong>La ficha del préstamo</strong> (actualizada el 6/8/2026) dice que la cuota no
              puede superar el {{ capFicha }} %. <strong>El reglamento</strong> que esa misma ficha
              enlaza dice {{ capReglamento }} % de la suma de los haberes nominales. No elegimos
              uno: el que vale en tu caso es el que te muestra el simulador del BPS. Y aparte de los
              dos, ningún préstamo puede dejarte cobrando menos del {{ floorPct }} % del nominal
              deducidos el aporte al SNIS y el IASS, contando también las retenciones que ya tengas:
              pensión alimenticia, garantía de alquiler, la cuota de un préstamo del BROU.
            </p>
            <VAlert type="info" variant="tonal" density="comfortable" class="mb-5">
              <p class="text-body-2 retiree-alert">
                <strong>Los seis haberes no entran en cualquier plazo.</strong> En 6 y en 12 cuotas
                la cuota de seis haberes pasa largo del {{ capFicha }} % del haber, así que lo que
                limita el monto es la cuota y no los seis haberes. La cuenta para tu pasividad está
                acá abajo.
              </p>
            </VAlert>

            <!-- Calculadora -->
            <VCard variant="flat" class="retiree-form pa-4 pa-md-6 mb-5">
              <p class="text-overline retiree-overline">¿Cuánto te presta el BPS?</p>
              <VRow dense>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model.number="haber"
                    label="Tu pasividad nominal del mes"
                    type="number"
                    inputmode="numeric"
                    prefix="$"
                    min="0"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                  />
                </VCol>
                <VCol cols="12" sm="6">
                  <VTextField
                    v-model.number="monto"
                    label="Cuánto querés pedir (opcional)"
                    type="number"
                    inputmode="numeric"
                    prefix="$"
                    min="0"
                    density="comfortable"
                    variant="outlined"
                    hide-details
                  />
                </VCol>
              </VRow>
              <VTable
                v-if="calcRows.length"
                class="retiree-table cu-mobile-cards mt-4"
                density="comfortable"
              >
                <thead>
                  <tr>
                    <th>Cuotas</th>
                    <th>Monto máximo</th>
                    <th>Lo limita</th>
                    <th>{{ askedLabel }}</th>
                    <th>Parte del haber</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in calcRows" :key="row.cuotas">
                    <td data-label="Cuotas">{{ row.cuotas }}</td>
                    <td data-label="Monto máximo">
                      <strong>{{ row.maxLabel }}</strong>
                    </td>
                    <td data-label="Lo limita">{{ row.limitLabel }}</td>
                    <td :data-label="askedLabel">{{ row.cuotaLabel }}</td>
                    <td data-label="Parte del haber">
                      <span :class="row.overCap ? 'text-error font-weight-bold' : ''">{{
                        row.shareLabel
                      }}</span>
                    </td>
                  </tr>
                </tbody>
              </VTable>
              <p v-else class="text-body-2 text-medium-emphasis retiree-prose mt-4">
                Escribí tu pasividad nominal para ver el monto máximo en cada plazo.
              </p>
              <p class="text-caption text-medium-emphasis retiree-note mt-3">
                Monto máximo: seis haberes, el tope de {{ maxAmountLabel }} o una cuota de hasta el
                {{ capFicha }} % del haber, lo que toque primero, redondeado a la centena. Con el
                {{ capReglamento }} % del reglamento el monto en 6 y 12 cuotas baja. Es una
                estimación con la tabla de cuotas del BPS: no descuenta las retenciones que ya
                tengas, que pueden achicarlo. El número final lo da «Gestionar mis préstamos».
              </p>
            </VCard>

            <h3 class="text-subtitle-1 font-weight-bold retiree-h3">
              Cómo se pide y cómo se cobra
            </h3>
            <ul class="retiree-list mb-5">
              <li>
                <strong>En línea</strong>, con el usuario personal del BPS, en «Gestionar mis
                préstamos» (también desde la app BPS Personas): ahí se simula, se pide y se renueva.
                Tienen que haber pasado 7 días desde que creaste el usuario o cambiaste la
                contraseña, y hay que ser mayor de edad y vivir en el país.
              </li>
              <li>
                <strong>En persona</strong>, con la cédula vigente y en buen estado. Un apoderado
                necesita además, si el titular no va, un certificado médico de existencia con
                vigencia de 24 horas.
              </li>
              <li>
                <strong>El cobro</strong>: si tenés cuenta bancaria o de dinero electrónico asociada
                al BPS, se deposita el mismo día si lo pedís antes de las 13 en un día hábil; si no,
                se cobra en las oficinas centrales o en Abitab, Redpagos, Anda o Polakof.
              </li>
              <li>
                <strong>Renovar</strong> se puede con 3 cuotas pagas de 6, 5 de 12, 8 de 18 o 10 de
                24, y el préstamo nuevo cancela el anterior. Nunca más de
                {{ maxOpenLoans }} préstamos vigentes a la vez.
              </li>
              <li>
                <strong>Cancelarlo antes</strong> se puede, parcial o total, en línea o en las
                oficinas; el BPS sugiere hacerlo antes del día 15 para que no se cruce con la
                emisión del recibo, y el pago tiene que hacerse el mismo día del trámite.
              </li>
              <li>
                <strong>Si fallecés</strong>, el saldo de capital lo cubre un fondo de autoseguro
                del BPS, cuya prima ya está incluida en la tasa.
              </li>
            </ul>

            <h3 class="text-subtitle-1 font-weight-bold retiree-h3">
              Para prótesis, lentes, audífonos y dentista
            </h3>
            <p class="text-body-2 retiree-prose mb-2">
              Es otra línea, más barata: <strong>{{ retireePct(protesis.teaPct) }}</strong> anual
              (era {{ retireePct(protesis.previousPct) }} hasta agosto de 2026), en 6 a 24 cuotas, y
              el BPS le paga directamente a quien hace el tratamiento o entrega la prótesis. Es para
              quien cobra hasta {{ protesis.maxHaberBpc }} BPC ({{
                retireePesos(protesis.maxHaberPesos)
              }}) y presta hasta {{ protesis.maxAmountBpc }} BPC ({{
                retireePesos(protesis.maxAmountPesos)
              }}). La cuota por $ 10.000 va de {{ retireePesos(protesis.cuotaPor10k[0]) }} en 6
              cuotas a {{ retireePesos(protesis.cuotaPor10k[3]) }} en 24. También la puede pedir
              quien cobra la asistencia a la vejez del MIDES.
            </p>
          </section>

          <!-- 3. El BROU -->
          <section class="mb-8" aria-labelledby="brou-title">
            <h2 id="brou-title" class="text-h5 font-weight-bold mb-3">
              El BROU: la línea con retención de todo el año
            </h2>
            <p class="text-body-1 retiree-prose mb-4">
              Fuera de la campaña de fin de año, el BROU le presta a cualquier pasivo con convenio
              de retención desde el primer mes de cobro, con la cuota descontada del recibo. La tasa
              depende de dos cosas: si cobrás la pasividad en el BROU (tasa preferencial) y si lo
              pedís por eBROU. Todas son <strong>más IVA</strong>; tabla vigente desde el
              {{ brouSince }}.
            </p>
            <VTable class="retiree-table cu-mobile-cards mb-3" density="comfortable">
              <thead>
                <tr>
                  <th>Cómo lo pedís</th>
                  <th v-for="tramo in brouTramos" :key="tramo.id">{{ tramo.label }} cuotas</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="channel in brouChannels" :key="channel.id">
                  <td data-label="Cómo lo pedís">
                    <strong>{{ channel.label }}</strong>
                  </td>
                  <td
                    v-for="(tramo, index) in brouTramos"
                    :key="tramo.id"
                    :data-label="`${tramo.label} cuotas`"
                  >
                    {{ retireePct(channel.teaPct[index]!) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-caption text-medium-emphasis retiree-note mb-5">
              Tasas efectivas anuales, a las que se les suma el IVA. Quien está calificado 3 en la
              Central de Riesgos del BCU paga {{ brouSpread }} puntos más. En Unidades Indexadas no
              hay línea para pasivos: es sólo para empleados con convenio y la última cuota tiene
              que vencer antes de los 65 años.
            </p>

            <h3 class="text-subtitle-1 font-weight-bold retiree-h3">
              La edad cambia lo que te presta
            </h3>
            <VTable class="retiree-table cu-mobile-cards mb-3" density="comfortable">
              <thead>
                <tr>
                  <th>Edad</th>
                  <th>Plazo máximo</th>
                  <th>Afectación máxima del nominal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in brouAges" :key="row.id">
                  <td data-label="Edad">{{ row.label }}</td>
                  <td data-label="Plazo máximo">{{ row.maxMeses }} meses</td>
                  <td data-label="Afectación máxima del nominal">{{ row.maxAfectacionPct }} %</td>
                </tr>
              </tbody>
            </VTable>
            <ul class="retiree-list mb-5">
              <li>
                La suma de las cuotas de todos tus préstamos del BROU no puede pasar esa afectación.
              </li>
              <li>
                Se renueva con el {{ brouRenew }} % de las cuotas pagas, o el
                {{ brouRenewApoderado }} % si operás con un apoderado.
              </li>
              <li>
                El primer descuento se puede diferir hasta 60 días según la fecha en que lo cobres,
                y las cuotas incluyen la cancelación del saldo si el titular fallece.
              </li>
              <li>Cancelarlo antes tiene una comisión por cancelación anticipada.</li>
            </ul>
          </section>

          <!-- 4. BPS o BROU -->
          <section class="mb-8" aria-labelledby="comparar-title">
            <h2 id="comparar-title" class="text-h5 font-weight-bold mb-3">
              ¿BPS o BROU? La cuota en el mismo pie
            </h2>
            <p class="text-body-1 retiree-prose mb-4">
              Las dos tablas de ejemplo no se pueden comparar como vienen. La del BPS cierra con su
              tasa sola. La del BROU sólo cierra si se le suma el IVA y un mes más de interés: el
              banco supone que el primer descuento llega 31 días más tarde. Rehicimos sus 24 cuotas
              de ejemplo con esos dos supuestos y dan al peso. Sin ese mes de más, por cada
              $&nbsp;10.000:
            </p>
            <VTable class="retiree-table cu-mobile-cards mb-3" density="comfortable">
              <thead>
                <tr>
                  <th>Cuotas</th>
                  <th>BPS</th>
                  <th>BROU por eBROU, tasa preferencial</th>
                  <th>BROU en sucursal, tasa estándar</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in comparison" :key="row.cuotas">
                  <td data-label="Cuotas">{{ row.cuotas }}</td>
                  <td data-label="BPS">
                    <strong>{{ retireePesos(row.bps) }}</strong>
                  </td>
                  <td data-label="BROU por eBROU, tasa preferencial">
                    {{ retireePesos(row.brouMin) }}
                  </td>
                  <td data-label="BROU en sucursal, tasa estándar">
                    {{ retireePesos(row.brouMax) }}
                  </td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-body-2 retiree-prose mb-2">
              El BPS queda en el medio: si cobrás la pasividad en el BROU y lo pedís por eBROU, el
              banco te cobra un poco menos; en una sucursal con la tasa estándar, un poco más. Lo
              que el BROU sí ofrece y el BPS no son los plazos largos: hasta 60 cuotas si tenés
              hasta 70 años, contra 24.
            </p>
            <p class="text-caption text-medium-emphasis retiree-note mb-0">
              El BPS no dice si a su tasa se le suma IVA; si se le sumara, su cuota quedaría por
              encima de las cuatro del BROU. Cuotas con el primer descuento al mes, IVA del
              22&nbsp;% sobre el interés en el BROU.
            </p>
          </section>

          <!-- 5. Otras puertas -->
          <section class="mb-8" aria-labelledby="otros-title">
            <h2 id="otros-title" class="text-h5 font-weight-bold mb-3">
              Otras puertas: ANDA, cooperativas y financieras
            </h2>
            <p class="text-body-1 retiree-prose mb-4">
              Fuera del BPS y del BROU, lo que te ofrecen contra la pasividad suele ser un
              <strong>Crédito de Nómina</strong>: un préstamo que se cobra por descuento del recibo,
              con dos límites de la Ley 19.210. La suma de esas cuotas no puede pasar del
              {{ nominaCap }} % de tus haberes nominales, y la tasa no puede superar en más de un
              20&nbsp;% la tasa media del BCU. Y el descuento sólo vale si lo autorizaste por
              escrito: sin ese consentimiento firmado es nulo. Algunas de las que lo dicen en su
              propio sitio:
            </p>
            <VCard
              v-for="lender in otherLenders"
              :key="lender.id"
              variant="outlined"
              class="retiree-card pa-4 mb-3"
            >
              <p class="text-subtitle-1 font-weight-bold retiree-card-title">
                {{ lender.name }} — {{ lender.product }}
              </p>
              <ul class="retiree-list retiree-card-list">
                <li v-for="condition in lender.conditions" :key="condition">{{ condition }}</li>
              </ul>
              <p class="text-body-2 retiree-card-body">
                <strong>Tasa:</strong> {{ lender.rate }} ({{ lender.asOf }}).
                <a
                  v-if="lender.source"
                  :href="lender.source.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="cu-link"
                  >Fuente</a
                >
              </p>
            </VCard>
            <p class="text-body-2 retiree-prose mb-0">
              Para el resto, con su tasa, si prestan estando en el clearing y si aceptan jubilados,
              está la
              <NuxtLink :to="localePath('/mejores-prestamos-uruguay')"
                >tabla de los mejores préstamos</NuxtLink
              >. Antes de firmar con cualquiera, verificá que esté registrado en el Banco Central.
            </p>
          </section>

          <!-- 6. Cuánto te pueden descontar -->
          <section class="mb-8" aria-labelledby="descuento-title">
            <h2 id="descuento-title" class="text-h5 font-weight-bold mb-3">
              Cuánto te pueden descontar de la jubilación
            </h2>
            <p class="text-body-1 retiree-prose mb-4">
              La regla la pone el artículo 3 de la Ley 17.829, y vale igual para un sueldo que para
              una pasividad: todos los descuentos juntos no pueden dejarte cobrando menos del
              <strong>{{ floorPct }} %</strong> del nominal, una vez restados los impuestos a la
              renta y los aportes. Baja al {{ floorHousingPct }} % si entre los descuentos hay una
              garantía de alquiler o actos cooperativos. Si no alcanza para todos, la ley fija quién
              cobra primero: después de la pensión alimenticia, la garantía de alquiler y la cuota
              sindical vienen los créditos de la División Crédito Social del BROU, antes que la
              mutualista y que cualquier crédito de nómina.
            </p>
            <ol class="retiree-order mb-4">
              <li v-for="rank in retentionOrder" :key="rank.position">{{ rank.label }}</li>
            </ol>
            <p class="text-body-2 retiree-prose mb-5">
              La cuenta con tus números, y la diferencia entre una retención que firmaste y un
              embargo que ordena un juez, están en
              <NuxtLink :to="localePath('/embargo-de-sueldo-uruguay')"
                >embargo de sueldo y de pasividad</NuxtLink
              >.
            </p>

            <h3 class="text-subtitle-1 font-weight-bold retiree-h3">
              El tope de la tasa: con retención es mucho más bajo
            </h3>
            <p class="text-body-2 retiree-prose mb-3">
              La ley de usura le pone un techo distinto a cada préstamo. Uno que se cobra por
              retención de la pasividad tiene un techo de una fracción del que tiene un préstamo de
              financiera sin retención:
            </p>
            <VTable class="retiree-table cu-mobile-cards mb-3" density="comfortable">
              <thead>
                <tr>
                  <th>Préstamo en pesos, menos de 10.000 UI</th>
                  <th>Plazo</th>
                  <th>Tope legal</th>
                  <th>Tasas medias de</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in usuryRows" :key="row.id">
                  <td data-label="Préstamo">{{ row.segment }}</td>
                  <td data-label="Plazo">{{ row.plazo }}</td>
                  <td data-label="Tope legal">
                    <strong>{{ retireePct(row.capPct) }}</strong>
                  </td>
                  <td data-label="Tasas medias de">
                    {{ row.periodo }}<template v-if="!row.live"> (lectura del PDF)</template>
                  </td>
                </tr>
              </tbody>
            </VTable>
            <p class="text-caption text-medium-emphasis retiree-note mb-0">
              La fila sin retención sale de la grilla que el sitio lee del BCU todos los días; las
              de retención y crédito de nómina, de la lectura del PDF del BCU vigente desde el
              {{ datedCapsSince }}, porque esa grilla no las trae. El BCU republica la tabla todos
              los meses. Qué entra en la cuenta y qué hacer si te cobraron de más:
              <NuxtLink :to="localePath('/ley-de-usura-uruguay')">la ley de usura</NuxtLink>.
            </p>
          </section>

          <!-- 7. Errores -->
          <section class="mb-8" aria-labelledby="errores-title">
            <h2 id="errores-title" class="text-h5 font-weight-bold mb-3">
              Errores que salen caros
            </h2>
            <VCard
              v-for="mistake in mistakes"
              :key="mistake.id"
              variant="outlined"
              class="retiree-card pa-4 mb-3"
            >
              <p class="text-subtitle-1 font-weight-bold retiree-card-title">{{ mistake.title }}</p>
              <p class="text-body-2 retiree-card-body">{{ mistake.text }}</p>
            </VCard>
          </section>

          <!-- 8. Estafas -->
          <section class="mb-8" aria-labelledby="estafas-title">
            <h2 id="estafas-title" class="text-h5 font-weight-bold mb-3">
              Cómo reconocer un préstamo trucho
            </h2>
            <p class="text-body-1 retiree-prose mb-3">
              El Banco Central pide desconfiar de un ofrecimiento de crédito que tenga cualquiera de
              estas cinco características (Comunicación 2024/177):
            </p>
            <ol class="retiree-order mb-5">
              <li v-for="signal in scamSignals" :key="signal">{{ signal }}</li>
            </ol>
            <VCard
              v-for="note in antifraud"
              :key="note.id"
              variant="outlined"
              class="retiree-card pa-4 mb-3"
            >
              <p class="text-subtitle-1 font-weight-bold retiree-card-title">{{ note.title }}</p>
              <p class="text-body-2 retiree-card-body">{{ note.text }}</p>
            </VCard>
            <VAlert type="warning" variant="tonal" density="comfortable" class="mt-4 mb-4">
              <p class="text-body-2 retiree-alert">
                <strong>¿Te aparece un descuento que no reconocés?</strong> Un descuento sobre la
                pasividad necesita tu consentimiento expreso y por escrito; sin él es nulo (Ley
                19.210, art. 31). Para consultar una retención de una institución habilitada, el BPS
                tiene un trámite presencial: «Descuentos de cooperativas, alquileres y asociaciones
                de jubilados y pensionistas».
              </p>
            </VAlert>
            <p class="text-body-2 retiree-prose mb-0">
              Para ver si una empresa figura en las
              <NuxtLink :to="localePath('/advertencias-bcu')"
                >advertencias del Banco Central</NuxtLink
              >
              y las demás estafas que circulan, mirá
              <NuxtLink :to="localePath('/estafas-uruguay')">estafas en Uruguay</NuxtLink>
              y
              <NuxtLink :to="localePath('/guias/como-evitar-estafas-financieras-uruguay')"
                >cómo evitar estafas financieras</NuxtLink
              >.
            </p>
          </section>

          <!-- 9. Lo que no publicamos -->
          <section class="mb-8" aria-labelledby="no-publicamos-title">
            <h2 id="no-publicamos-title" class="text-h5 font-weight-bold mb-3">
              Lo que acá no vas a encontrar
            </h2>
            <p class="text-body-1 retiree-prose mb-4">
              Porque no lo pudimos sostener con una fuente, y en un préstamo una cifra sin fuente es
              peor que ninguna.
            </p>
            <ul class="retiree-list">
              <li v-for="item in unpublished" :key="item.id">
                <strong>{{ item.label }}</strong> — {{ item.why }}
              </li>
            </ul>
          </section>

          <!-- La unidad intermedia, antes de las preguntas: mismo corte que FaqSection (ver
               docs/seo/adsense-growth-loop.md, 31/10/2026). Sólo dibuja en densidad normal. -->
          <AdSlot placement="in-article" class="mb-6" />
          <!-- 10. Preguntas frecuentes -->
          <section class="mb-8" aria-labelledby="faq-title">
            <h2 id="faq-title" class="text-h5 font-weight-bold mb-3">Preguntas frecuentes</h2>
            <VExpansionPanels variant="accordion">
              <VExpansionPanel v-for="faq in faqs" :key="faq.id" :title="faq.question">
                <template #text>
                  <p class="text-body-2 retiree-faq">{{ faq.answer }}</p>
                </template>
              </VExpansionPanel>
            </VExpansionPanels>
          </section>

          <!-- 11. Herramientas -->
          <section class="mb-8" aria-labelledby="herramientas-title">
            <h2 id="herramientas-title" class="text-h6 font-weight-bold mb-3">
              Herramientas y páginas que siguen
            </h2>
            <div class="d-flex flex-wrap ga-2">
              <VBtn
                :to="localePath('/herramientas/calculadora-prestamo')"
                variant="tonal"
                size="small"
              >
                Calculadora de préstamo
              </VBtn>
              <VBtn :to="localePath('/mejores-prestamos-uruguay')" variant="tonal" size="small">
                Mejores préstamos
              </VBtn>
              <VBtn :to="localePath('/prestamos-uruguay')" variant="tonal" size="small">
                Préstamos en Uruguay
              </VBtn>
              <VBtn :to="localePath('/ley-de-usura-uruguay')" variant="tonal" size="small">
                Ley de usura
              </VBtn>
              <VBtn :to="localePath('/embargo-de-sueldo-uruguay')" variant="tonal" size="small">
                Embargo de sueldo y pasividad
              </VBtn>
              <VBtn :to="localePath('/fecha-de-cobro-bps-uruguay')" variant="tonal" size="small">
                Cuándo cobro en el BPS
              </VBtn>
              <VBtn :to="localePath('/saldar-deudas-uruguay')" variant="tonal" size="small">
                Saldar deudas
              </VBtn>
              <VBtn
                :to="localePath('/guias/cancelar-prestamo-antes-de-tiempo-uruguay')"
                variant="tonal"
                size="small"
              >
                Cancelar un préstamo antes de tiempo
              </VBtn>
            </div>
          </section>

          <!-- 12. Fuentes -->
          <section class="mb-4" aria-labelledby="fuentes-title">
            <h2 id="fuentes-title" class="text-h5 font-weight-bold mb-3">Fuentes</h2>
            <ul class="retiree-list mb-4">
              <li v-for="source in sources" :key="source.id">
                <a :href="source.url" target="_blank" rel="noopener noreferrer" class="cu-link">{{
                  source.label
                }}</a>
                <template v-if="source.shownAt">
                  — fecha del documento: {{ displayDate(source.shownAt) }}
                </template>
              </li>
            </ul>
            <p class="text-body-2 retiree-prose">
              Todo leído el {{ verifiedDisplay }}. Esta página es informativa: las condiciones de
              cada préstamo las confirma quien lo da. Las demás páginas del tema están en
              <NuxtLink :to="localePath('/temas/deudas-y-credito-uruguay')"
                >Deudas y crédito en Uruguay</NuxtLink
              >.
            </p>
          </section>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { BcuCapRow } from '~/utils/cashAdvance'
import {
  RETENTION_FLOOR_PCT,
  RETENTION_FLOOR_PCT_HOUSING,
  RETENTION_ORDER,
} from '~/utils/salaryGarnishment'
import {
  BCU_SCAM_SIGNALS,
  BPS_ANTIFRAUD,
  BPS_BENEFICIARIES,
  BPS_CUOTA_CAP_FICHA_PCT,
  BPS_CUOTA_CAP_REGLAMENTO_PCT,
  BPS_MAX_AMOUNT,
  BPS_MAX_HABERES,
  BPS_MAX_OPEN_LOANS,
  BPS_PROTESIS,
  BPS_RATES,
  BPS_TEA_MAX,
  BPS_TEA_MIN,
  BROU_AGE_LIMITS,
  BROU_PASIVOS,
  BROU_RATES_IN_FORCE_SINCE,
  BROU_RENEW_PAID_PCT,
  BROU_RENEW_PAID_PCT_APODERADO,
  BROU_SPREAD_CALIFICADOS_3,
  BROU_TRAMOS,
  NOMINA_CUOTA_CAP_PCT,
  OTHER_LENDERS,
  RETIREE_DESCRIPTION,
  RETIREE_EVENTS,
  RETIREE_FAQ,
  RETIREE_MISTAKES,
  RETIREE_PATH,
  RETIREE_SOURCES,
  RETIREE_TITLE,
  RETIREE_UNPUBLISHED,
  RETIREE_VERIFIED_AT,
  bpsCuota,
  bpsMaxForPlazo,
  cuotaComparison,
  cuotaShareOfHaber,
  retireeEventStatus,
  retireePct,
  retireePesos,
  retireeSource,
  retireeUsuryRows,
  uruguayTodayIso,
  type BpsLimit,
  type RetireeEventStatus,
} from '~/utils/retireeLoans'
import { BCU_CAPS_IN_FORCE_SINCE } from '~/utils/loanNoPayslip'

const localePath = useLocalePath()

const maxHaberes = BPS_MAX_HABERES
const maxAmountLabel = retireePesos(BPS_MAX_AMOUNT)
const teaRangeLabel = `${retireePct(BPS_TEA_MIN)}–${retireePct(BPS_TEA_MAX)}`
const floorPct = RETENTION_FLOOR_PCT
const floorHousingPct = RETENTION_FLOOR_PCT_HOUSING
const capFicha = BPS_CUOTA_CAP_FICHA_PCT
const capReglamento = BPS_CUOTA_CAP_REGLAMENTO_PCT
const maxOpenLoans = BPS_MAX_OPEN_LOANS
const nominaCap = NOMINA_CUOTA_CAP_PCT
const protesis = BPS_PROTESIS
const beneficiaries = BPS_BENEFICIARIES
const brouTramos = BROU_TRAMOS
const brouChannels = BROU_PASIVOS
const brouAges = BROU_AGE_LIMITS
const brouSpread = BROU_SPREAD_CALIFICADOS_3.toLocaleString('es-UY')
const brouRenew = BROU_RENEW_PAID_PCT
const brouRenewApoderado = BROU_RENEW_PAID_PCT_APODERADO
const retentionOrder = RETENTION_ORDER
const mistakes = RETIREE_MISTAKES
const scamSignals = BCU_SCAM_SIGNALS
const antifraud = BPS_ANTIFRAUD
const unpublished = RETIREE_UNPUBLISHED
const faqs = RETIREE_FAQ
const sources = RETIREE_SOURCES
const comparison = cuotaComparison()

const otherLenders = OTHER_LENDERS.map(lender => ({
  ...lender,
  source: retireeSource(lender.sourceId),
}))

const bpsRates = BPS_RATES.map(rate => ({
  ...rate,
  cuota10k: bpsCuota(10_000, rate.cuotas) ?? 0,
}))

const displayDate = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })

const verifiedDisplay = displayDate(RETIREE_VERIFIED_AT)
const brouSince = displayDate(BROU_RATES_IN_FORCE_SINCE)
const datedCapsSince = displayDate(BCU_CAPS_IN_FORCE_SINCE)

// ── El calendario: el día lo fija el servidor y viaja al cliente, así la hidratación no
//    recalcula otro estado a medianoche ni con la zona horaria del navegador.
const today = useState('prestamos-jubilados-hoy', () => uruguayTodayIso(new Date()))
const todayDisplay = computed(() => displayDate(today.value))

const STATUS_COLOR: Record<RetireeEventStatus, string> = {
  vigente: 'success',
  proximo: 'info',
  anunciado: 'primary',
  cerrado: 'grey',
  'sin-fecha': 'warning',
}

const events = computed(() =>
  RETIREE_EVENTS.map(event => {
    const status = retireeEventStatus(event, today.value)
    const statusLabel =
      status === 'vigente'
        ? event.to
          ? `Abierta hasta el ${displayDate(event.to)}`
          : 'Abierta'
        : status === 'proximo'
          ? `Empieza el ${displayDate(event.from!)}`
          : status === 'cerrado'
            ? `Cerró el ${displayDate(event.to!)}`
            : status === 'anunciado'
              ? 'Anunciada por el BPS'
              : 'Sin fecha anunciada'
    return {
      ...event,
      statusLabel,
      statusColor: STATUS_COLOR[status],
      source: retireeSource(event.sourceId),
    }
  })
)

// ── La calculadora del préstamo social
const haber = ref<number | string>(30_000)
const monto = ref<number | string>('')

const asNumber = (value: number | string): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null

const LIMIT_LABEL: Record<BpsLimit, string> = {
  haberes: `${BPS_MAX_HABERES} haberes`,
  tope: `el tope de ${maxAmountLabel}`,
  cuota: `la cuota del ${BPS_CUOTA_CAP_FICHA_PCT} %`,
}

const askedLabel = computed(() =>
  asNumber(monto.value) ? `Cuota de ${retireePesos(asNumber(monto.value)!)}` : 'Cuota del máximo'
)

const calcRows = computed(() => {
  const haberValue = asNumber(haber.value)
  if (!haberValue) return []
  const asked = asNumber(monto.value)
  return BPS_RATES.flatMap(rate => {
    const max = bpsMaxForPlazo(haberValue, rate.cuotas)
    if (!max) return []
    const amount = asked ?? max.amount
    const cuota = bpsCuota(amount, rate.cuotas)
    const share = cuotaShareOfHaber(cuota, haberValue)
    return [
      {
        cuotas: rate.cuotas,
        maxLabel: retireePesos(max.amount),
        limitLabel: LIMIT_LABEL[max.limit],
        cuotaLabel: cuota ? retireePesos(cuota) : '—',
        shareLabel: share != null ? retireePct(Math.round(share * 10) / 10) : '—',
        overCap: (share ?? 0) > BPS_CUOTA_CAP_FICHA_PCT || (asked ?? 0) > max.amount,
      },
    ]
  })
})

// ── El tope de usura: la grilla viva del BCU, la misma que leen las otras páginas que nombran
//    un tope (memoria `un-solo-tope-de-usura`).
const { data: liveCaps } = await useFetch<{
  periodo: string
  vigenteDesde: string
  rows: BcuCapRow[]
  live: boolean
}>('/api/bcu-rates', { key: 'bcu-rates', server: true, default: () => null })

const usuryRows = computed(() => retireeUsuryRows(liveCaps.value?.live ? liveCaps.value : null))

// ── SEO
const canonicalUrl = `https://cambio-uruguay.com${RETIREE_PATH}`
const title = RETIREE_TITLE
const description = RETIREE_DESCRIPTION

defineOgImageComponent('Cambio', {
  title: 'Préstamos para jubilados',
  subtitle: `BPS: hasta ${BPS_MAX_HABERES} pasividades al ${teaRangeLabel} · BROU · tope de descuentos`,
  tag: 'PRÉSTAMOS',
})

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
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
        'prestamos para jubilados uruguay, prestamos para jubilados brou, cuando empiezan los prestamos para jubilados en el brou, prestamo social bps, prestamos bps jubilados y pensionistas, prestamos para pensionistas, cuanto me pueden descontar de la jubilacion, renovacion anticipada prestamo bps, prestamo bps protesis lentes audifonos, credito de nomina jubilados',
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
                name: 'Deudas y crédito en Uruguay',
                item: 'https://cambio-uruguay.com/temas/deudas-y-credito-uruguay',
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: 'Préstamos para jubilados',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: faqs.map(faq => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: RETIREE_VERIFIED_AT,
            mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
            publisher: {
              '@type': 'Organization',
              name: 'Cambio Uruguay',
              url: 'https://cambio-uruguay.com',
            },
            citation: sources.map(source => ({
              '@type': 'CreativeWork',
              name: source.label,
              url: source.url,
            })),
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
/* Vuetify 4 no anula el margen de los bloques de texto y éste no colapsa dentro de una tarjeta ni
   de un item de flex: cada bloque declara el suyo (DESIGN.md → "The Text Block Owns Its Top
   Margin Rule"). */
.retiree-lead,
.retiree-prose,
.retiree-alert,
.retiree-faq,
.retiree-note,
.retiree-card-title,
.retiree-overline {
  margin-top: 0;
}

.retiree-lead {
  font-size: 1.0625rem;
  line-height: 1.7;
}

.retiree-prose {
  line-height: 1.7;
}

.retiree-alert {
  margin-bottom: 0;
  line-height: 1.6;
}

.retiree-h3 {
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.retiree-card-title {
  margin-bottom: 0.35rem;
}

.retiree-card-when {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.retiree-card-body {
  margin-top: 0;
  margin-bottom: 0.25rem;
  line-height: 1.65;
}

.retiree-list {
  padding-left: 1.25rem;
  line-height: 1.7;
}

.retiree-list li + li {
  margin-top: 0.5rem;
}

.retiree-card-list {
  margin-top: 0;
  margin-bottom: 0.5rem;
}

.retiree-order {
  padding-left: 1.5rem;
  line-height: 1.6;
}

.retiree-order li + li {
  margin-top: 0.4rem;
}

.retiree-form {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 12px;
  background: rgb(var(--v-theme-surface));
}

.retiree-overline {
  margin-bottom: 0.75rem;
}

.retiree-table :deep(th) {
  font-weight: 700;
}
</style>
