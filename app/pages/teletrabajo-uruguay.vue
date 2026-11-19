<template>
  <VContainer class="tele py-6" style="max-width: 900px">
    <VBreadcrumbs
      class="px-0 pb-2"
      :items="[
        { title: 'Inicio', to: localePath('/') },
        { title: 'Teletrabajo', disabled: true },
      ]"
    />

    <h1 class="text-h5 text-md-h4 font-weight-bold mb-3">
      Teletrabajo en Uruguay: qué te tiene que dar la empresa
    </h1>

    <p class="text-body-1 mb-4" style="max-width: 68ch">
      El teletrabajo tiene ley propia desde 2021 y reglamento desde 2022, y casi todo lo que la
      gente discute por WhatsApp está escrito ahí: quién pone la computadora, cuántas horas podés no
      contestar, si la hora de más de un martes es extra y en qué plazo se puede volver a la
      oficina. Acá está cada respuesta con el artículo al lado.
    </p>

    <!-- Los cuatro números primero: son la pregunta. -->
    <h2 class="text-h6 font-weight-bold mb-2">Los cuatro plazos de la ley</h2>
    <div class="table-wrap mb-6">
      <VTable density="comfortable" class="cu-mobile-cards">
        <thead>
          <tr>
            <th>Cuánto</th>
            <th>De qué</th>
            <th>Qué cambia</th>
            <th class="text-right">Norma</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in TELETRABAJO_PLAZOS" :key="p.concepto">
            <td data-label="Cuánto">
              <VChip size="small" color="primary" variant="flat">{{ p.valor }}</VChip>
            </td>
            <td data-label="De qué" class="font-weight-medium">{{ p.concepto }}</td>
            <td data-label="Qué cambia" class="text-body-2">{{ p.detalle }}</td>
            <td data-label="Norma" class="text-right text-caption text-medium-emphasis">
              {{ p.articulo }}
            </td>
          </tr>
        </tbody>
      </VTable>
    </div>

    <h2 class="text-h6 font-weight-bold mb-2">Lo que pone la empresa</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      La provisión de las herramientas se acuerda entre las partes y tiene que constar en el
      contrato. Lo que la norma resuelve es el caso en que no se acordó nada, que es el caso de la
      mayoría.
    </p>
    <VList density="comfortable" class="mb-6 rules">
      <VListItem v-for="o in TELETRABAJO_OBLIGACIONES" :key="o.titular">
        <template #prepend>
          <VIcon icon="mdi-laptop" color="primary" />
        </template>
        <VListItemTitle class="text-body-2 font-weight-bold" style="white-space: normal">
          {{ o.titular }}
        </VListItemTitle>
        <VListItemSubtitle class="text-body-2" style="white-space: normal; opacity: 1">
          {{ o.detalle }}
          <span class="text-medium-emphasis">({{ o.articulo }})</span>
        </VListItemSubtitle>
      </VListItem>
    </VList>

    <!-- El hueco, dicho como hueco: es lo que más se lee mal afuera. -->
    <VAlert type="info" variant="tonal" class="mb-6" density="comfortable">
      <p class="text-body-2 font-weight-bold mb-1">
        La ley no nombra la factura de la luz ni el internet
      </p>
      <p class="text-body-2 mb-0">
        Dice «servicios», y de ahí sale la regla del desacuerdo: si no se pactó nada, el empleador
        debe proporcionar los equipos, los insumos y los servicios que el trabajo requiere (Ley
        19.978, art. 12). Lo que está escrito con todas las letras son los costos del equipo
        —instalación, operación, funcionamiento, reemplazo y mantenimiento (Decreto 86/022, art.
        8)—. Una página que te diga «la empresa te paga UTE» está afirmando algo que la norma no
        escribió. Lo que sí podés hacer es pactarlo, porque el acuerdo manda.
      </p>
    </VAlert>

    <h2 class="text-h6 font-weight-bold mb-2">Lo que podés negarte a hacer</h2>
    <VList density="comfortable" class="mb-6 rules">
      <VListItem v-for="d in TELETRABAJO_DERECHOS" :key="d.derecho">
        <template #prepend>
          <VIcon icon="mdi-check-circle-outline" color="success" />
        </template>
        <VListItemTitle class="text-body-2" style="white-space: normal">
          {{ d.derecho }}
          <span class="text-medium-emphasis">({{ d.articulo }})</span>
        </VListItemTitle>
      </VListItem>
    </VList>

    <h2 class="text-h6 font-weight-bold mb-2">Qué tiene que decir el acuerdo por escrito</h2>
    <p class="text-body-2 text-medium-emphasis mb-3" style="max-width: 68ch">
      El decreto enumera el contenido mínimo. Si alguno de estos puntos no está en tu contrato o en
      su anexo, falta, y es justo el que después se discute.
    </p>
    <VList density="compact" class="mb-6 rules">
      <VListItem v-for="punto in TELETRABAJO_ACUERDO" :key="punto">
        <template #prepend>
          <VIcon icon="mdi-file-document-outline" color="primary" />
        </template>
        <VListItemTitle class="text-body-2" style="white-space: normal">
          {{ punto }}
        </VListItemTitle>
      </VListItem>
    </VList>
    <p class="text-caption text-medium-emphasis mb-6">
      Decreto 86/022, art. 3. El trabajador, por su parte, tiene que comunicar los cambios de
      domicilio y de las condiciones de seguridad y salud del lugar donde teletrabaja.
    </p>

    <!-- El `FAQPage` lo escribe el `@graph` de abajo, con las mismas preguntas: el componente no
         tiene que emitir un segundo nodo (`faqSchemaOnce.test.ts`). -->
    <FaqSection :items="faq" heading="Preguntas frecuentes" expanded :emit-schema="false" />

    <h2 class="text-h6 font-weight-bold mt-8 mb-2">De dónde sale todo esto</h2>
    <p class="text-body-2 text-medium-emphasis mb-2" style="max-width: 68ch">
      Del texto vigente de cada norma, leído artículo por artículo, no de un resumen. Última
      lectura: {{ verifiedAt }}. Son {{ articulos.length }} artículos entre las tres normas.
    </p>
    <ul class="sources mb-6">
      <li v-for="src in TELETRABAJO_SOURCES" :key="src.url">
        <a :href="src.url" target="_blank" rel="noopener" class="cu-link">{{ src.label }}</a>
        <span class="text-medium-emphasis"> — {{ src.publisher }}</span>
      </li>
    </ul>

    <h2 class="text-h6 font-weight-bold mb-2">Seguir leyendo</h2>
    <div class="d-flex flex-wrap ga-3 mb-4">
      <NuxtLink
        v-for="rel in TELETRABAJO_RELATED"
        :key="rel.to"
        :to="localePath(rel.to)"
        class="cu-link"
      >
        {{ rel.label }}
      </NuxtLink>
    </div>

    <p class="text-caption text-medium-emphasis">
      Esto es información general sobre la ley, no asesoramiento legal para tu caso. Si tu acuerdo
      de teletrabajo no se cumple, la consulta va al Ministerio de Trabajo o a tu sindicato.
    </p>
  </VContainer>
</template>

<script setup lang="ts">
import {
  TELETRABAJO_ACUERDO,
  TELETRABAJO_DERECHOS,
  TELETRABAJO_FAQ,
  TELETRABAJO_OBLIGACIONES,
  TELETRABAJO_PLAZOS,
  TELETRABAJO_RELATED,
  TELETRABAJO_SOURCES,
  TELETRABAJO_VERIFIED_AT,
  teletrabajoArticulosCitados,
} from '~/utils/teletrabajo'
import type { FaqItem } from '~/utils/faqAnswers'

const localePath = useLocalePath()

const verifiedAt = new Date(`${TELETRABAJO_VERIFIED_AT}T12:00:00Z`).toLocaleDateString('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const articulos = teletrabajoArticulosCitados()
// `FaqSection` pide un `id` por ítem para los anclajes; el catálogo guarda sólo la pregunta y la
// respuesta, que es lo que también viaja al JSON-LD.
const faq: FaqItem[] = TELETRABAJO_FAQ.map((item, index) => ({
  id: `teletrabajo-${index + 1}`,
  question: item.question,
  answer: item.answer,
}))

const canonicalUrl = 'https://cambio-uruguay.com/teletrabajo-uruguay'
const title = 'Teletrabajo: 8 horas de desconexión'
const description =
  'Sin acuerdo escrito, el equipo y los servicios los pone el empleador (Ley 19.978, art. 12), y hay 8 horas continuas de desconexión entre jornadas.'

defineOgImageComponent('Cambio', {
  title: 'Teletrabajo en Uruguay',
  subtitle: '8 horas de desconexión, y el equipo lo pone la empresa',
  tag: 'TRABAJO',
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
        'teletrabajo uruguay, ley de teletrabajo uruguay, ley 19978, decreto 86022, derecho a la desconexion uruguay, quien paga la luz en el teletrabajo, teletrabajo derechos uruguay, me pueden obligar a teletrabajar, volver a la oficina teletrabajo, teletrabajo horas extras uruguay, acuerdo de teletrabajo que tiene que decir, teletrabajo hibrido uruguay',
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
                name: 'Teletrabajo en Uruguay',
                item: canonicalUrl,
              },
            ],
          },
          {
            '@type': 'Article',
            headline: title,
            description,
            inLanguage: 'es-UY',
            dateModified: TELETRABAJO_VERIFIED_AT,
            mainEntityOfPage: canonicalUrl,
            citation: TELETRABAJO_SOURCES.map(src => ({
              '@type': 'Legislation',
              name: src.label,
              url: src.url,
            })),
          },
          {
            '@type': 'FAQPage',
            mainEntity: TELETRABAJO_FAQ.map(item => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
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
.cu-link {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
  text-decoration: none;
}
.cu-link:hover {
  text-decoration: underline;
}
.sources {
  padding-left: 1.1rem;
  font-size: 0.9rem;
}
.sources li {
  margin-bottom: 4px;
}
.rules :deep(.v-list-item__prepend) {
  align-self: start;
  margin-top: 4px;
}
</style>
