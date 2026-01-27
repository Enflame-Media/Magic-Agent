<script setup lang="ts">
import { computed, ref } from 'vue';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/app';
import { parseMarkdown, type MarkdownBlock, type MarkdownSpan } from './parseMarkdown';
import MermaidRenderer from './MermaidRenderer.vue';

export type Option = {
  title: string;
};

interface Props {
  markdown: string;
  onOptionPress?: (option: Option) => void;
}

const props = defineProps<Props>();
const copied = ref(false);

const blocks = computed<MarkdownBlock[]>(() => parseMarkdown(props.markdown));

function spanClasses(span: MarkdownSpan): string[] {
  const classes: string[] = [];
  if (span.styles.includes('bold')) classes.push('font-semibold');
  if (span.styles.includes('italic')) classes.push('italic');
  if (span.styles.includes('code')) {
    classes.push('font-mono', 'bg-muted/70', 'px-1', 'py-0.5', 'rounded');
  }
  return classes;
}

async function copyMarkdown(): Promise<void> {
  try {
    await globalThis.navigator.clipboard.writeText(props.markdown);
  } catch {
    const textarea = globalThis.document.createElement('textarea');
    textarea.value = props.markdown;
    globalThis.document.body.appendChild(textarea);
    textarea.select();
    globalThis.document.execCommand('copy');
    globalThis.document.body.removeChild(textarea);
  }
  copied.value = true;
  globalThis.setTimeout(() => {
    copied.value = false;
  }, 1500);
}
</script>

<template>
  <div class="relative space-y-2">
    <Button
      v-if="markdown.length > 0"
      variant="ghost"
      size="sm"
      class="absolute -top-2 right-0 h-6 px-2 text-[11px]"
      @click="copyMarkdown"
    >
      {{ copied ? 'Copied' : 'Copy' }}
    </Button>
    <template v-for="(block, index) in blocks" :key="index">
      <p
        v-if="block.type === 'text'"
        class="text-sm leading-relaxed text-foreground whitespace-pre-wrap break-words"
      >
        <template v-for="(span, spanIndex) in block.content" :key="spanIndex">
          <a
            v-if="span.url"
            :href="span.url"
            target="_blank"
            rel="noreferrer"
            class="text-primary underline"
          >
            <span :class="spanClasses(span)">{{ span.text }}</span>
          </a>
          <span v-else :class="spanClasses(span)">{{ span.text }}</span>
        </template>
      </p>

      <p
        v-else-if="block.type === 'header'"
        :class="[
          'font-semibold text-foreground',
          block.level === 1 && 'text-base',
          block.level === 2 && 'text-lg',
          block.level === 3 && 'text-base',
          block.level === 4 && 'text-sm',
          block.level >= 5 && 'text-sm uppercase tracking-wide',
        ]"
      >
        <template v-for="(span, spanIndex) in block.content" :key="spanIndex">
          <span :class="spanClasses(span)">{{ span.text }}</span>
        </template>
      </p>

      <div
        v-else-if="block.type === 'horizontal-rule'"
        class="h-px bg-border/60 my-2"
      />

      <ul v-else-if="block.type === 'list'" class="space-y-1 text-sm text-foreground">
        <li
          v-for="(item, itemIndex) in block.items"
          :key="itemIndex"
          class="flex gap-2"
        >
          <span class="text-muted-foreground">-</span>
          <span>
            <template v-for="(span, spanIndex) in item" :key="spanIndex">
              <span :class="spanClasses(span)">{{ span.text }}</span>
            </template>
          </span>
        </li>
      </ul>

      <ol v-else-if="block.type === 'numbered-list'" class="space-y-1 text-sm text-foreground">
        <li
          v-for="(item, itemIndex) in block.items"
          :key="itemIndex"
          class="flex gap-2"
        >
          <span class="text-muted-foreground">{{ item.number }}.</span>
          <span>
            <template v-for="(span, spanIndex) in item.spans" :key="spanIndex">
              <span :class="spanClasses(span)">{{ span.text }}</span>
            </template>
          </span>
        </li>
      </ol>

      <div v-else-if="block.type === 'code-block'" class="group">
        <CodeBlock
          :code="block.content"
          :language="block.language ?? undefined"
        />
      </div>

      <MermaidRenderer
        v-else-if="block.type === 'mermaid'"
        :content="block.content"
      />

      <div v-else-if="block.type === 'options'" class="space-y-2">
        <Button
          v-for="(item, itemIndex) in block.items"
          :key="itemIndex"
          variant="outline"
          class="w-full justify-start text-left"
          :disabled="!props.onOptionPress"
          @click="props.onOptionPress?.({ title: item })"
        >
          {{ item }}
        </Button>
      </div>

      <div
        v-else-if="block.type === 'table'"
        class="overflow-x-auto rounded-lg border border-border/60"
      >
        <table class="min-w-full text-sm">
          <thead class="bg-muted/40 text-muted-foreground">
            <tr>
              <th
                v-for="(header, headerIndex) in block.headers"
                :key="headerIndex"
                class="px-3 py-2 text-left font-medium"
              >
                {{ header }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border/60">
            <tr v-for="(row, rowIndex) in block.rows" :key="rowIndex">
              <td
                v-for="(header, cellIndex) in block.headers"
                :key="header"
                class="px-3 py-2 text-muted-foreground"
              >
                {{ row[cellIndex] ?? '' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
