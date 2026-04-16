<script setup lang="ts">
/**
 * CodeBlock - Syntax highlighted code display (AI Elements wrapper)
 *
 * Drop-in wrapper around the AI Elements CodeBlock primitive.
 * Composes CodeBlockHeader, CodeBlockFilename, and CodeBlockCopyButton
 * while preserving the original prop interface (`code`, `language?`, `filename?`)
 * so that existing consumers continue to work unchanged.
 *
 * @see HAP-1093 - Replace CodeBlock and FileTree with AI Elements equivalents
 */

import { computed } from 'vue';
import type { BundledLanguage } from 'shiki';
import { bundledLanguages } from 'shiki/langs';
import {
  CodeBlock as AiCodeBlock,
  CodeBlockHeader,
  CodeBlockFilename,
  CodeBlockCopyButton,
} from '@/components/ai-elements/code-block';

interface Props {
  /** The code content to display */
  code: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Optional filename to display */
  filename?: string;
}

const props = withDefaults(defineProps<Props>(), {
  language: '',
  filename: '',
});

/**
 * Normalize a user-supplied language identifier to a valid BundledLanguage.
 *
 * AI Elements' `CodeBlock` requires a `BundledLanguage`. If the caller passes
 * an empty string, an alias (e.g. `ts`, `py`, `md`), or an unknown identifier,
 * we fall back gracefully rather than letting Shiki throw at highlighter
 * creation time.
 */
const resolvedLanguage = computed<BundledLanguage>(() => {
  const raw = props.language?.trim().toLowerCase() ?? '';
  if (!raw) return 'text' as BundledLanguage;

  // `bundledLanguages` merges base language IDs and their aliases, so a single
  // hasOwnProperty check covers both (e.g. `typescript` and `ts`).
  if (Object.prototype.hasOwnProperty.call(bundledLanguages, raw)) {
    return raw as BundledLanguage;
  }

  // Unknown language: fall back to plain text (no syntax highlighting, but renders).
  return 'text' as BundledLanguage;
});

/** Label shown in the header: filename if provided, otherwise the language. */
const displayLabel = computed(() => {
  if (props.filename) return props.filename;
  if (props.language) return props.language;
  return 'code';
});
</script>

<template>
  <AiCodeBlock
    :code="props.code"
    :language="resolvedLanguage"
  >
    <CodeBlockHeader>
      <CodeBlockFilename class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {{ displayLabel }}
      </CodeBlockFilename>
      <CodeBlockCopyButton class="h-6 w-6" />
    </CodeBlockHeader>
  </AiCodeBlock>
</template>
