<script setup lang="ts">
import type { AlertDialogActionProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import type { ButtonVariants } from "@/components/ui/button"
import { reactiveOmit } from "@vueuse/core"
import { AlertDialogAction } from "reka-ui"
import { cn } from "@/lib/utils"
import { buttonVariants } from '@/components/ui/button'

interface Props extends AlertDialogActionProps {
  variant?: ButtonVariants["variant"]
  size?: ButtonVariants["size"]
  class?: HTMLAttributes["class"]
}

const props = defineProps<Props>()

// Omit variant, size, and class from delegation (handled by buttonVariants/cn)
const delegatedProps = reactiveOmit(props, "class", "variant", "size")
</script>

<template>
  <AlertDialogAction v-bind="delegatedProps" :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)">
    <slot />
  </AlertDialogAction>
</template>
