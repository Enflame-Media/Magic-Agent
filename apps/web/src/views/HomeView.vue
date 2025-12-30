<script setup lang="ts">
/**
 * Home View - Landing page for Happy web application
 *
 * Displays welcome message and getting started information.
 */

import { ref } from 'vue';

const version = ref('0.0.1');
</script>

<template>
  <div class="home-view">
    <section class="hero">
      <h2>Welcome to Happy</h2>
      <p class="tagline">
        Control your Claude Code sessions remotely from any device.
      </p>
    </section>

    <section class="features">
      <div class="feature">
        <h3>Real-time Sync</h3>
        <p>See your coding sessions update in real-time across all devices.</p>
      </div>
      <div class="feature">
        <h3>End-to-End Encrypted</h3>
        <p>Your code and conversations are encrypted and only visible to you.</p>
      </div>
      <div class="feature">
        <h3>Multi-Platform</h3>
        <p>Available on web, iOS, and Android for seamless access anywhere.</p>
      </div>
    </section>

    <footer class="version">
      <p>Version {{ version }}</p>
    </footer>
  </div>
</template>

<style scoped>
.home-view {
  padding: 2rem 0;
}

.hero {
  margin-bottom: 3rem;
}

.hero h2 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.tagline {
  color: var(--color-text-muted);
  font-size: 1.125rem;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.feature {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 1.5rem;
  text-align: left;
}

.feature h3 {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-primary);
}

.feature p {
  color: var(--color-text-muted);
  font-size: 0.875rem;
}

.version {
  margin-top: 2rem;
}

.version p {
  color: var(--color-text-muted);
  font-size: 0.75rem;
}
</style>
