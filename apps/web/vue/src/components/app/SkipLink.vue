<script setup lang="ts">
/**
 * SkipLink - Screen reader skip navigation link
 *
 * Provides a visually hidden link that becomes visible on focus,
 * allowing keyboard users to skip repetitive navigation and jump
 * directly to main content. Required for WCAG 2.1 AA compliance.
 *
 * @see HAP-963 - Keyboard Shortcuts and Accessibility
 * @see https://www.w3.org/WAI/WCAG21/Techniques/general/G1
 */

interface Props {
  /** Target element ID to skip to (without #) */
  targetId?: string;
  /** Label text for the skip link */
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  targetId: 'main-content',
  label: 'Skip to main content',
});

function handleClick(event: Event) {
  event.preventDefault();
  const target = document.getElementById(props.targetId);
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus();
    // Remove tabindex after blur to avoid breaking natural tab order
    target.addEventListener('blur', () => {
      target.removeAttribute('tabindex');
    }, { once: true });
  }
}
</script>

<template>
  <a
    :href="`#${targetId}`"
    class="skip-link"
    @click="handleClick"
  >
    {{ label }}
  </a>
</template>

<style scoped>
.skip-link {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 0.75rem 1.5rem;
  background: var(--color-background, hsl(0 0% 100%));
  color: var(--color-foreground, hsl(0 0% 3.9%));
  border: 2px solid var(--color-primary, hsl(0 0% 9%));
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: top 0.15s ease-in-out;
}

.skip-link:focus {
  top: 0.5rem;
  outline: 2px solid var(--color-ring, hsl(0 0% 63.9%));
  outline-offset: 2px;
}
</style>
