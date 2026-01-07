<script setup lang="ts">
/**
 * CodeBlock - Syntax highlighted code display
 *
 * Renders code snippets with:
 * - Language label (optional)
 * - Copy to clipboard button
 * - Proper monospace styling
 * - Horizontal scroll for long lines
 * - Lightweight syntax highlighting
 */

import { ref, computed } from 'vue';
import { Button } from '@/components/ui/button';
import { tokenizeCode, type SyntaxToken } from './simpleSyntaxHighlighter';

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

const copied = ref(false);
const tokens = computed<SyntaxToken[]>(() => tokenizeCode(props.code, props.language || null));

const displayLabel = computed(() => {
  if (props.filename) return props.filename;
  if (props.language) return props.language;
  return 'code';
});

async function copyToClipboard() {
  try {
    await globalThis.navigator.clipboard.writeText(props.code);
    copied.value = true;
    globalThis.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    // Fallback for older browsers
    const textarea = globalThis.document.createElement('textarea');
    textarea.value = props.code;
    globalThis.document.body.appendChild(textarea);
    textarea.select();
    globalThis.document.execCommand('copy');
    globalThis.document.body.removeChild(textarea);
    copied.value = true;
    globalThis.setTimeout(() => {
      copied.value = false;
    }, 2000);
  }
}

const tokenWeightTypes = new Set(['keyword', 'controlFlow', 'type', 'function']);
const bracketColors = [
  'var(--syntax-bracket-1)',
  'var(--syntax-bracket-2)',
  'var(--syntax-bracket-3)',
  'var(--syntax-bracket-4)',
  'var(--syntax-bracket-5)',
];
const tokenColors: Record<string, string> = {
  keyword: 'var(--syntax-keyword)',
  controlFlow: 'var(--syntax-keyword)',
  type: 'var(--syntax-keyword)',
  modifier: 'var(--syntax-keyword)',
  string: 'var(--syntax-string)',
  regex: 'var(--syntax-string)',
  number: 'var(--syntax-number)',
  boolean: 'var(--syntax-number)',
  function: 'var(--syntax-function)',
  method: 'var(--syntax-function)',
  property: 'var(--syntax-default)',
  comment: 'var(--syntax-comment)',
  docstring: 'var(--syntax-comment)',
  operator: 'var(--syntax-default)',
  assignment: 'var(--syntax-keyword)',
  comparison: 'var(--syntax-keyword)',
  logical: 'var(--syntax-keyword)',
  decorator: 'var(--syntax-keyword)',
  import: 'var(--syntax-keyword)',
  variable: 'var(--syntax-default)',
  parameter: 'var(--syntax-default)',
  punctuation: 'var(--syntax-default)',
  default: 'var(--syntax-default)',
};

function tokenColor(token: SyntaxToken): string {
  const defaultColor = tokenColors.default ?? 'var(--syntax-default)';
  if (token.type === 'bracket') {
    const index = ((token.nestLevel ?? 1) - 1) % bracketColors.length;
    const bracketColor = bracketColors[index];
    return bracketColor ?? defaultColor;
  }
  return tokenColors[token.type] ?? defaultColor;
}

function tokenStyle(token: SyntaxToken): Record<string, string> {
  return {
    color: tokenColor(token),
    fontWeight: tokenWeightTypes.has(token.type) ? '600' : '400',
  };
}
</script>

<template>
  <div class="rounded-lg border bg-muted/50 overflow-hidden">
    <!-- Header with language/filename and copy button -->
    <div class="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
      <span class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {{ displayLabel }}
      </span>
      <Button
        variant="ghost"
        size="sm"
        class="h-6 px-2 text-xs"
        @click="copyToClipboard"
      >
        <svg
          v-if="!copied"
          xmlns="http://www.w3.org/2000/svg"
          class="h-3.5 w-3.5 mr-1"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="h-3.5 w-3.5 mr-1 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
        {{ copied ? 'Copied!' : 'Copy' }}
      </Button>
    </div>

    <!-- Code content -->
    <div class="overflow-x-auto">
      <pre class="p-4 text-sm leading-relaxed">
        <code class="font-mono whitespace-pre-wrap"><span
          v-for="(token, index) in tokens"
          :key="index"
          :style="tokenStyle(token)"
          v-text="token.text"
        /></code>
      </pre>
    </div>
  </div>
</template>
