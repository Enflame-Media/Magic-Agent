<!--
  HAP-1047: ACP Thought Display Component

  Renders agent thinking text in a collapsible section.
  Collapsed by default, shows a preview of the thought content.
-->
<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconBulb, IconChevronDown, IconChevronUp } from '@tabler/icons-vue';

const props = defineProps<{
  thought: string;
}>();

const { t } = useI18n();
const expanded = ref(false);

function toggle() {
  expanded.value = !expanded.value;
}
</script>

<template>
  <div v-if="props.thought" class="rounded-xl bg-muted/50 p-3 my-1">
    <button
      class="flex w-full items-center gap-1.5 text-left"
      :aria-expanded="expanded"
      :aria-label="t('acp.thought.title')"
      @click="toggle"
    >
      <IconBulb class="size-3.5 shrink-0 text-muted-foreground" />
      <span class="flex-1 text-[13px] font-semibold text-muted-foreground">
        {{ t('acp.thought.title') }}
      </span>
      <IconChevronUp v-if="expanded" class="size-3.5 text-muted-foreground" />
      <IconChevronDown v-else class="size-3.5 text-muted-foreground" />
    </button>
    <p v-if="expanded" class="mt-2 text-[13px] leading-[18px] text-muted-foreground">
      {{ props.thought }}
    </p>
    <p v-else class="mt-1 truncate text-[13px] leading-[18px] text-muted-foreground/70">
      {{ props.thought }}
    </p>
  </div>
</template>
