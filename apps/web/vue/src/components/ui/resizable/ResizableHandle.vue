<script setup lang="ts">
import type { SplitterResizeHandleEmits, SplitterResizeHandleProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { GripVertical } from "lucide-vue-next"
import { SplitterResizeHandle, useForwardPropsEmits } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<SplitterResizeHandleProps & { class?: HTMLAttributes["class"], withHandle?: boolean }>()
// Extend emits to include dblclick for sidebar reset (HAP-929)
const emits = defineEmits<SplitterResizeHandleEmits & { dblclick: [event: MouseEvent] }>()

const delegatedProps = reactiveOmit(props, "class", "withHandle")
const forwarded = useForwardPropsEmits(delegatedProps, emits)

// Forward dblclick from wrapper since reka-ui doesn't forward $attrs to DOM (HAP-929)
function handleDblClick(event: MouseEvent) {
  emits('dblclick', event)
}
</script>

<template>
  <!-- Wrapper div captures dblclick since reka-ui SplitterResizeHandle doesn't forward $attrs -->
  <div @dblclick="handleDblClick" class="contents">
    <SplitterResizeHandle
      data-slot="resizable-handle"
      v-bind="forwarded"
      :class="cn('bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90', props.class)"
    >
      <template v-if="props.withHandle">
        <div class="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <slot>
            <GripVertical class="size-2.5" />
          </slot>
        </div>
      </template>
    </SplitterResizeHandle>
  </div>
</template>
