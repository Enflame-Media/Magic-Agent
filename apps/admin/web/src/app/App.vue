<script setup lang="ts">
/**
 * Root App Component
 *
 * Provides the main layout wrapper with navigation
 * and router-view for page content.
 */
import { RouterView } from 'vue-router';
</script>

<template>
    <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
        <RouterView />
    </div>
</template>
