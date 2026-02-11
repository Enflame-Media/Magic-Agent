<script setup lang="ts">
import type { AvatarImageProps } from "reka-ui"
import { AvatarImage } from "reka-ui"

interface Props extends AvatarImageProps {
  /** Enable lazy loading for below-fold images */
  loading?: 'lazy' | 'eager'
}

const props = withDefaults(defineProps<Props>(), {
  loading: 'lazy',
})
</script>

<template>
  <AvatarImage
    data-slot="avatar-image"
    v-bind="props"
    class="aspect-square size-full"
  >
    <slot />
  </AvatarImage>
</template>
