<template>
  <div class="weekend-index">
    <VContainer>
      <VRow justify="center">
        <VCol cols="12" md="10">
          <header class="mb-6">
            <VChip class="mb-3" color="primary" size="small" variant="tonal">
              <VIcon start size="small">mdi-calendar-weekend</VIcon>
              Fin de semana
            </VChip>
            <h1 class="text-h4 text-md-h3 font-weight-bold mb-3">
              Casas de cambio abiertas los sábados y domingos en Uruguay
            </h1>
            <p v-if="hasWeekendData" class="text-body-1 weekend-lead">
              De los {{ total }} mostradores del registro del Banco Central,
              <strong>{{ saturdayCount }} abren el sábado</strong> y
              <strong>{{ sundayCount }} también el domingo</strong>. Abajo está cada uno con su
              dirección y la franja horaria tal como la declara la propia casa.
            </p>
            <p v-else class="text-body-1 weekend-lead">
              Qué casas de cambio y bancos de Uruguay atienden el sábado y el domingo, con la
              dirección y la franja horaria que declara cada casa ante el Banco Central.
            </p>
          </header>

          <VAlert v-if="!hasWeekendData" type="info" variant="tonal" class="mb-6">
            No pudimos leer el registro de sucursales en este momento. Probá de nuevo en unos
            minutos.
          </VAlert>

          <template v-else>
            <VAlert
              type="info"
              variant="tonal"
              density="comfortable"
              class="mb-6"
              icon="mdi-information-outline"
            >
              <p class="weekend-note">
                Un mostrador aparece acá solo cuando su horario publicado nombra el día. Los
                {{ unstatedCount }} que declaran únicamente días hábiles —o no declaran horario— no
                figuran: eso significa que no lo dicen, no que estén cerrados. El horario puede
                cambiar por feriado, así que confirmá por teléfono antes de viajar.
              </p>
            </VAlert>

            <section class="mb-10">
              <div class="d-flex align-center flex-wrap ga-2 mb-1">
                <h2 class="text-h5 font-weight-bold mb-0">Abiertas los sábados</h2>
                <VChip size="x-small" variant="tonal" color="primary">{{ saturdayCount }}</VChip>
              </div>
              <p class="text-body-2 text-medium-emphasis mb-4">
                {{ saturdayGroups.length }} departamentos con al menos un mostrador abierto el
                sábado.
              </p>

              <section v-for="group in saturdayGroups" :key="`sab-${group.key}`" class="mb-6">
                <div class="d-flex align-center flex-wrap ga-2 mb-3">
                  <h3 class="text-subtitle-1 font-weight-bold mb-0">{{ group.label }}</h3>
                  <VChip size="x-small" variant="tonal">{{ group.branches.length }}</VChip>
                  <VSpacer />
                  <NuxtLink :to="localePath(`/dolar/${group.slug}`)" class="weekend-link">
                    Dólar en {{ group.label }}
                  </NuxtLink>
                </div>
                <VRow dense>
                  <VCol v-for="item in group.branches" :key="item.slug" cols="12" sm="6" lg="4">
                    <NuxtLink :to="localePath(`/sucursal/${item.slug}`)" class="weekend-tile">
                      <span class="weekend-tile-casa">{{ item.casaName }}</span>
                      <span class="weekend-tile-address">{{ item.addressLabel }}</span>
                      <span class="weekend-tile-hours">
                        <VIcon size="x-small" start>mdi-clock-outline</VIcon>
                        Sábado {{ item.saturdayWindow || '— ver horario' }}
                      </span>
                      <span v-if="item.sunday === 'open'" class="weekend-tile-sunday">
                        También domingo {{ item.sundayWindow }}
                      </span>
                    </NuxtLink>
                  </VCol>
                </VRow>
              </section>
            </section>

            <section class="mb-10">
              <div class="d-flex align-center flex-wrap ga-2 mb-1">
                <h2 class="text-h5 font-weight-bold mb-0">Abiertas los domingos</h2>
                <VChip size="x-small" variant="tonal" color="primary">{{ sundayCount }}</VChip>
              </div>
              <p v-if="sundayTopLabel" class="text-body-2 text-medium-emphasis mb-4">
                El domingo es la excepción, y está concentrado: {{ sundayTopShare }} de los
                {{ sundayCount }} mostradores están en {{ sundayTopLabel }}.
              </p>

              <VRow v-if="sundayBranches.length" dense>
                <VCol v-for="item in sundayBranches" :key="item.slug" cols="12" sm="6" lg="4">
                  <NuxtLink :to="localePath(`/sucursal/${item.slug}`)" class="weekend-tile">
                    <span class="weekend-tile-casa">{{ item.casaName }}</span>
                    <span class="weekend-tile-address">
                      {{ item.addressLabel }} · {{ item.deptLabel }}
                    </span>
                    <span class="weekend-tile-hours">
                      <VIcon size="x-small" start>mdi-clock-outline</VIcon>
                      Domingo {{ item.sundayWindow || '— ver horario' }}
                    </span>
                  </NuxtLink>
                </VCol>
              </VRow>
              <p v-else class="text-body-2 text-medium-emphasis">
                Ningún mostrador declara horario de domingo en este momento.
              </p>
            </section>

            <VCard variant="flat" class="weekend-section pa-5 mb-6">
              <h2 class="text-subtitle-1 font-weight-bold mb-3">Qué mirar antes de ir</h2>
              <ul class="weekend-list">
                <li v-if="commonClose">
                  El sábado suele ser media jornada: el cierre más repetido es a las
                  {{ commonClose.time }}, en {{ commonClose.count }} de los
                  {{ saturdayCount }} mostradores abiertos ese día.
                </li>
                <li>
                  La franja publicada es la que declara la casa, no un horario garantizado. Un
                  feriado o un fin de semana largo la mueve sin que el registro cambie, y
                  <NuxtLink
                    :to="localePath('/feriados-que-se-corren-uruguay')"
                    class="weekend-link"
                  >
                    tres feriados se corren al lunes
                  </NuxtLink>
                  justamente para armar ese fin de semana largo.
                </li>
                <li>
                  El precio no es el mismo en todos:
                  <NuxtLink :to="localePath('/')" class="weekend-link">
                    compará la cotización
                  </NuxtLink>
                  antes de elegir mostrador, y si ninguno te queda cerca
                  <NuxtLink :to="localePath('/casa-de-cambio-cerca-de-mi')" class="weekend-link">
                    buscá por cercanía
                  </NuxtLink>
                  o mirá el
                  <NuxtLink :to="localePath('/mapa')" class="weekend-link">mapa completo</NuxtLink>.
                </li>
              </ul>
            </VCard>

            <VCard variant="flat" class="weekend-section pa-5">
              <h2 class="text-subtitle-2 font-weight-bold mb-2">
                <VIcon start size="small" color="primary">mdi-link-variant</VIcon>
                Fuente
              </h2>
              <p class="text-body-2 mb-2">
                Direcciones y horarios provienen de la información que cada casa de cambio y banco
                declara ante el Banco Central del Uruguay, la misma que alimenta el
                <NuxtLink :to="localePath('/sucursal')" class="weekend-link">
                  directorio de sucursales
                </NuxtLink>
                de este sitio. No corregimos ni completamos lo que una casa no informa.
              </p>
              <ul class="sources-list">
                <li>
                  <a
                    href="https://www.bcu.gub.uy/Servicios-Financieros-SSF/Paginas/InformacionInstitucion.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    BCU — Información de instituciones financieras
                  </a>
                </li>
              </ul>
            </VCard>
          </template>
        </VCol>
      </VRow>
    </VContainer>
  </div>
</template>

<script setup lang="ts">
import { groupByDepartment, type BranchPage } from '~/utils/branches'
import { parseWeekendHours } from '~/utils/branchHours'

/**
 * "¿Hay alguna casa de cambio abierta el sábado?" is asked every weekend and the
 * site could not answer it: the hours sit on 523 individual branch pages, one
 * counter at a time, so the only way to find out was to open them one by one.
 *
 * Nothing here is authored. The classification is derived from each casa's own
 * published hours string, and the string itself is shown next to every entry —
 * a mostrador the feed says nothing about is left out rather than guessed at.
 */
interface WeekendBranch extends BranchPage {
  saturdayWindow: string
  sundayWindow: string
  sunday: 'open' | 'closed' | 'unknown'
}

const localePath = useLocalePath()

const { data } = await useAsyncData('branch-directory-weekend', () =>
  $fetch<{ branches: BranchPage[] }>('/api/branches')
)

const branches = computed<BranchPage[]>(() => data.value?.branches ?? [])
const total = computed(() => branches.value.length)

/** Every branch, tagged with what its own hours string says about the weekend. */
const classified = computed(() =>
  branches.value.map(branch => {
    const parsed = parseWeekendHours(branch.hoursLabel)
    return { ...branch, ...parsed } as WeekendBranch & { saturday: string }
  })
)

const saturdayBranches = computed(() => classified.value.filter(b => b.saturday === 'open'))
const sundayBranches = computed(() => classified.value.filter(b => b.sunday === 'open'))
const saturdayCount = computed(() => saturdayBranches.value.length)
const sundayCount = computed(() => sundayBranches.value.length)

/**
 * Whether there is anything to publish.
 *
 * Not `total > 0`: when the upstream directory is unreachable the endpoint still
 * answers with its handful of manually-kept locations, and a page that renders
 * "0 abren el sábado" is worse than one that says it could not read the
 * register — it states a fact, and the fact is false.
 */
const hasWeekendData = computed(() => saturdayCount.value > 0 || sundayCount.value > 0)

/** Counters whose published hours never mention a weekend day either way. */
const unstatedCount = computed(
  () => classified.value.filter(b => b.saturday !== 'open' && b.sunday !== 'open').length
)

const saturdayGroups = computed(() => groupByDepartment(saturdayBranches.value))

/**
 * The most repeated Saturday closing time, counted rather than assumed.
 *
 * Worth counting because the intuition is wrong: "media jornada" reads as
 * "before noon", and the single most common close is actually 13:00 — stating
 * it the other way would have been a made-up fact dressed as an observation.
 */
const commonClose = computed(() => {
  const tally = new Map<string, number>()
  for (const branch of saturdayBranches.value) {
    // The last window of the day is the one that holds the closing time.
    const last = branch.saturdayWindow.split(' y ').pop() ?? ''
    const close = /a (\d{1,2}:\d{2})$/.exec(last)?.[1]
    if (close) tally.set(close, (tally.get(close) ?? 0) + 1)
  }
  const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]
  return top ? { time: top[0], count: top[1] } : null
})

/** The departments holding most of the Sunday counters, named in order. */
const sundayTop = computed(() => {
  const tally = new Map<string, number>()
  for (const branch of sundayBranches.value) {
    tally.set(branch.deptLabel, (tally.get(branch.deptLabel) ?? 0) + 1)
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
})

const sundayTopShare = computed(() => sundayTop.value.reduce((sum, [, n]) => sum + n, 0))

const sundayTopLabel = computed(() => {
  const names = sundayTop.value.map(([label]) => label)
  if (!names.length) return ''
  if (names.length === 1) return names[0]
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`
})

const canonicalUrl = computed(
  () => `https://cambio-uruguay.com${localePath('/casas-de-cambio-abiertas-fin-de-semana')}`
)

const title = 'Casas de cambio abiertas los sábados y domingos en Uruguay'

/**
 * The description carries the two counts because they ARE the answer, and a
 * snippet that answers outranks one that promises to: on this site the pages
 * whose description states the day's number run at ~1,4% CTR against 0,03–0,2%
 * for a generic sentence from the same position. Falls back to a numberless
 * sentence when the directory could not be read, rather than publishing a zero.
 */
const description = computed(() =>
  hasWeekendData.value
    ? `${saturdayCount.value} mostradores de casas de cambio y bancos abren los sábados en Uruguay y ${sundayCount.value} también los domingos. Dirección, franja horaria y departamento de cada uno, según lo que declara cada casa ante el BCU.`
    : 'Qué casas de cambio y bancos de Uruguay abren los sábados y domingos, con dirección y franja horaria de cada mostrador según lo que declara cada casa ante el BCU.'
)

defineOgImageComponent('Cambio', {
  title,
  subtitle: () => description.value,
  tag: 'FIN DE SEMANA',
})

useSeoMeta({
  title: `${title} | Cambio Uruguay`,
  description: () => description.value,
  ogTitle: title,
  ogDescription: () => description.value,
  ogType: 'website',
  ogUrl: () => canonicalUrl.value,
  twitterCard: 'summary_large_image',
  twitterTitle: title,
  twitterDescription: () => description.value,
})

useHead(() => ({
  link: [{ rel: 'canonical', href: canonicalUrl.value }],
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
                name: 'Sucursales',
                item: 'https://cambio-uruguay.com/sucursal',
              },
              { '@type': 'ListItem', position: 3, name: title, item: canonicalUrl.value },
            ],
          },
          {
            '@type': 'ItemList',
            name: 'Casas de cambio abiertas los sábados',
            numberOfItems: saturdayCount.value,
          },
        ],
      }),
    },
  ],
}))
</script>

<style scoped>
.weekend-lead {
  line-height: 1.7;
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.weekend-note {
  margin-top: 0;
  line-height: 1.7;
  font-size: 0.9rem;
}

.weekend-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
  font-size: 0.9rem;
}
.weekend-link:hover {
  text-decoration: underline;
}

.weekend-tile {
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100%;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.03);
  text-decoration: none;
  color: inherit;
  transition: border-color 0.15s ease;
}
.weekend-tile:hover {
  border-color: rgba(var(--v-theme-primary), 0.5);
}
.weekend-tile-casa {
  font-weight: 700;
  font-size: 0.95rem;
}
.weekend-tile-address {
  font-size: 0.88rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.78);
}
.weekend-tile-hours {
  margin-top: 4px;
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.66);
}
.weekend-tile-sunday {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgb(var(--v-theme-primary));
}

.weekend-section {
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
}

.weekend-list {
  margin-top: 0;
  padding-left: 1.1rem;
}
.weekend-list li {
  margin-top: 0.6rem;
  line-height: 1.7;
  font-size: 0.92rem;
}

.sources-list {
  margin-top: 0.25rem;
  padding-left: 1.1rem;
  font-size: 0.88rem;
}
.sources-list li {
  margin-top: 0.35rem;
}
</style>
