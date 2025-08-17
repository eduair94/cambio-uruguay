<template>
  <div>
    <v-icon size="64" color="grey-lighten-1">mdi-test</v-icon>
    <p class="test">Test content {{ _testVar }} {{ _anotherVar }}</p>
  </div>
</template>

<script setup lang="ts">
const _testVar = 'test'
const _anotherVar = 'another'
</script>
