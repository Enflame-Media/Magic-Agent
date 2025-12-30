<script setup lang="ts">
/**
 * Root Vue component for Happy web application
 *
 * Renders the router-view for client-side navigation.
 */
</script>

<template>
  <div id="happy-app">
    <header>
      <h1>Happy</h1>
      <p>Remote control for Claude Code</p>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style>
:root {
  --color-background: #0f0f0f;
  --color-text: #ffffff;
  --color-text-muted: #888888;
  --color-primary: #646cff;
  --color-primary-hover: #535bf2;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  background-color: var(--color-background);
  color: var(--color-text);
  min-height: 100vh;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#happy-app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

header {
  margin-bottom: 2rem;
}

header h1 {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, var(--color-primary), #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

header p {
  color: var(--color-text-muted);
  font-size: 1.125rem;
  margin-top: 0.5rem;
}

a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: var(--color-primary-hover);
}
</style>
