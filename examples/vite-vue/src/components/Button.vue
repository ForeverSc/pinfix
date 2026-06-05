<template>
  <button :style="buttonStyle" @click="$emit('click')">
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ variant?: 'primary' | 'secondary' }>()
defineEmits<{ click: [] }>()

const buttonStyle = computed(() => {
  const isPrimary = props.variant !== 'secondary'
  return {
    padding: '8px 16px',
    borderRadius: '6px',
    border: isPrimary ? 'none' : '1px solid #d0d0d0',
    background: isPrimary ? '#0070ea' : '#fff',
    color: isPrimary ? '#fff' : '#333',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  }
})
</script>
