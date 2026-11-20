<template>
  <div v-if="blocks.length" class="blocks">
    <template v-for="(block, i) in blocks" :key="i">
      <AssistantQuote v-if="block.kind === 'quote'" :block="block" />
      <AssistantRates v-else-if="block.kind === 'rates'" :block="block" />
      <AssistantCarousel v-else-if="block.kind === 'cards'" :block="block" />
      <AssistantSeries v-else-if="block.kind === 'series'" :block="block" />
      <AssistantLinks v-else-if="block.kind === 'links'" :block="block" />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ChatBlock } from '~/utils/chatResults'

defineProps<{ blocks: ChatBlock[] }>()
</script>

<style scoped>
.blocks {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}
</style>
