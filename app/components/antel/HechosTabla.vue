<!--
  Tabla de hechos de /que-pasa-si-no-pago-antel: pregunta / qué dice / documento, con el enlace a
  la fuente principal al lado del artículo citado y la marca "sin publicar" cuando Antel no publica
  el dato. Se repite en cinco secciones de la página, por eso es componente. Se auto-importa como
  <AntelHechosTabla> (prefijo de directorio: ver tests/unit/componentResolution.test.ts).
-->
<template>
  <div class="table-wrap">
    <VTable density="comfortable" class="cu-mobile-cards">
      <tbody>
        <tr v-for="r in hechos" :key="r.pregunta">
          <td data-label="Punto" class="font-weight-medium" style="min-width: 220px">
            {{ r.pregunta }}
          </td>
          <td data-label="Qué dice" class="text-body-2">{{ r.respuesta }}</td>
          <td data-label="Fuente" class="text-caption text-medium-emphasis text-right">
            <VChip v-if="r.sinPublicar" size="x-small" color="warning" variant="tonal" class="mr-1">
              sin publicar
            </VChip>
            {{ r.fuente }}
            <a
              v-if="fuentePrincipal(r)"
              :href="fuentePrincipal(r)!.url"
              target="_blank"
              rel="noopener noreferrer"
              class="cu-link ml-1"
              >Fuente</a
            >
          </td>
        </tr>
      </tbody>
    </VTable>
  </div>
</template>

<script setup lang="ts">
import { fuentePrincipal, type HechoAntel } from '~/utils/antelDeuda'

defineProps<{ hechos: readonly HechoAntel[] }>()
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
</style>
