<!--
  Shared normativa block for /monopatines-electricos-uruguay and /bicicletas-electricas-uruguay.

  Renders `MOVILIDAD_NORMATIVA` (app/utils/movilidadNormativa.ts, Task 4) exactly as that file
  states it: never a general "es legal"/"es ilegal" verdict, a rule is `null` when the norm it comes
  from does not say it, and "sin-norma-encontrada" reads as "we did not find one", never as "there
  is none". The 14 departments with nothing to cite are listed once, by name, instead of repeating
  the same explanatory sentence fourteen times — the identical text lives once in `NOTA_SIN_NORMA`
  and this component quotes it once too.

  No own `<h2>`: both pages wrap this inside their own `<section>` with its own heading, so the
  document only ever has one heading level here (this component's cards use `<h3>`).
-->
<template>
  <div class="movilidad-normativa">
    <p class="normativa-nacional">{{ MOVILIDAD_NORMATIVA_NOTA_NACIONAL }}</p>

    <div class="normativa-grid">
      <article
        v-for="fila in conNorma"
        :key="fila.departamento"
        class="normativa-card"
        :class="`estado-${fila.estado}`"
      >
        <h3>
          {{ fila.departamento }}
          <span class="estado-badge">{{ ESTADO_LABEL[fila.estado] }}</span>
        </h3>
        <p v-if="fila.norma" class="normativa-cita">{{ fila.norma }}</p>

        <dl class="normativa-reglas">
          <template v-if="fila.reglas.edadMinima != null">
            <dt>Edad mínima</dt>
            <dd>{{ fila.reglas.edadMinima }} años</dd>
          </template>
          <template v-if="fila.reglas.velocidadMaxKmh != null">
            <dt>Velocidad máxima</dt>
            <dd>{{ fila.reglas.velocidadMaxKmh }} km/h</dd>
          </template>
          <template v-if="fila.reglas.casco">
            <dt>Casco</dt>
            <dd>{{ fila.reglas.casco }}</dd>
          </template>
          <template v-if="fila.reglas.altaVisibilidad">
            <dt>Alta visibilidad</dt>
            <dd>{{ fila.reglas.altaVisibilidad }}</dd>
          </template>
          <template v-if="fila.reglas.seguro">
            <dt>Seguro</dt>
            <dd>{{ fila.reglas.seguro }}</dd>
          </template>
          <template v-if="fila.reglas.registro">
            <dt>Registro</dt>
            <dd>{{ fila.reglas.registro }}</dd>
          </template>
          <template v-if="fila.reglas.donde">
            <dt>Dónde circular</dt>
            <dd>{{ fila.reglas.donde }}</dd>
          </template>
          <template v-if="fila.reglas.dondeNo">
            <dt>Dónde no</dt>
            <dd>{{ fila.reglas.dondeNo }}</dd>
          </template>
        </dl>

        <p v-if="fila.nota" class="normativa-nota">{{ fila.nota }}</p>

        <ul v-if="fila.fuentes.length" class="normativa-fuentes">
          <li v-for="fuente in fila.fuentes" :key="fuente.url">
            <a :href="fuente.url" target="_blank" rel="nofollow noopener">{{ fuente.titulo }}</a>
            <span class="fuente-fecha">({{ fuente.fecha }})</span>
          </li>
        </ul>
      </article>
    </div>

    <p v-if="sinNorma.length" class="normativa-sin-norma">
      Departamentos donde no encontramos una norma departamental específica al
      {{ revisadoEl }}: {{ sinNorma.map(fila => fila.departamento).join(', ') }}. Que no aparezcan
      acá no quiere decir que estén exceptuados de nada: quiere decir que no encontramos una norma
      propia para citar.
    </p>

    <p class="normativa-revisado">Tabla revisada el {{ revisadoEl }}.</p>
  </div>
</template>

<script setup lang="ts">
import {
  MOVILIDAD_NORMATIVA,
  MOVILIDAD_NORMATIVA_NOTA_NACIONAL,
  MOVILIDAD_NORMATIVA_REVISADA,
  type MovilidadNormativaEstado,
} from '~/utils/movilidadNormativa'
import { movilidadLongDate } from '~/utils/movilidad'

const ESTADO_LABEL: Record<MovilidadNormativaEstado, string> = {
  vigente: 'Vigente',
  'en-estudio': 'En estudio',
  'sin-norma-encontrada': 'Sin norma encontrada',
}

const conNorma = computed(() =>
  MOVILIDAD_NORMATIVA.filter(fila => fila.estado !== 'sin-norma-encontrada')
)
const sinNorma = computed(() =>
  MOVILIDAD_NORMATIVA.filter(fila => fila.estado === 'sin-norma-encontrada')
)
const revisadoEl = movilidadLongDate(MOVILIDAD_NORMATIVA_REVISADA)
</script>

<style scoped>
.normativa-nacional {
  max-width: 70ch;
  font-size: 0.95rem;
  opacity: 0.88;
}
.normativa-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-top: 18px;
}
.normativa-card {
  padding: 18px;
  border: 1px solid rgba(var(--v-border-color), 0.25);
  border-left-width: 4px;
  border-radius: 0 12px 12px 0;
  background: rgb(var(--v-theme-surface));
}
.normativa-card.estado-vigente {
  border-left-color: rgb(var(--v-theme-success));
}
.normativa-card.estado-en-estudio {
  border-left-color: rgb(var(--v-theme-warning));
}
.normativa-card h3 {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px;
  margin: 0;
  font-size: 1rem;
}
.estado-badge {
  /* Label step (DESIGN.md typography): 700, 0.75rem, 0.0333em — status labels are its documented
     use case. Nothing on this page renders below this step. */
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.0333em;
  text-transform: uppercase;
  opacity: 0.7;
}
.normativa-cita {
  margin: 8px 0 0 !important;
  font-size: 0.8rem;
  opacity: 0.75;
}
.normativa-reglas {
  margin: 10px 0 0;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 10px;
  font-size: 0.875rem;
}
.normativa-reglas dt {
  font-weight: 700;
  opacity: 0.75;
}
.normativa-reglas dd {
  margin: 0;
}
.normativa-nota {
  margin: 10px 0 0 !important;
  font-size: 0.8rem;
  opacity: 0.85;
}
.normativa-fuentes {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  font-size: 0.8rem;
}
.normativa-fuentes a {
  color: rgb(var(--v-theme-link));
  font-weight: 600;
}
.fuente-fecha {
  opacity: 0.65;
}
.normativa-sin-norma,
.normativa-revisado {
  max-width: 74ch;
  margin-top: 16px !important;
  font-size: 0.875rem;
  opacity: 0.8;
}
</style>
