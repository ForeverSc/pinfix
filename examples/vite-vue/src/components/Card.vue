<template>
  <div :style="{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }">
    <h3 :style="{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#333' }">{{ title }}</h3>
    <slot />
    <p v-if="hint" :style="{ margin: 0, fontSize: '12px', color: '#999', fontStyle: 'italic' }">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; hint?: string }>()
</script>
