<script setup lang="ts">
/**
 * Root Application Component
 *
 * Sets up the main Frame with navigation to the home view.
 * Uses NativeScript's Frame for native navigation stack.
 */
import HomeView from './views/HomeView.vue';
</script>

<template>
  <Frame>
    <HomeView />
  </Frame>
</template>
