<script setup lang="ts">
defineProps<{ name: 'search' | 'expand' | 'fold' | 'pin' | 'layers' | 'chevron' }>();
</script>
<template>
  <svg class="atlas-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="name === 'search'"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></template>
    <path v-else-if="name === 'expand'" d="M4 9V4h5m6 0h5v5M4 15v5h5m6 0h5v-5"/>
    <path v-else-if="name === 'fold'" d="M9 4v5H4m16 0h-5V4M9 20v-5H4m16 0h-5v5"/>
    <template v-else-if="name === 'pin'"><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></template>
    <path v-else-if="name === 'layers'" d="m12 3 9 6-9 6-9-6Zm-9 10 9 6 9-6M3 17l9 6 9-6"/>
    <path v-else d="m6 9 6 6 6-6"/>
  </svg>
</template>
<style scoped>.atlas-icon{width:17px;height:17px;flex:none;display:block}</style>
