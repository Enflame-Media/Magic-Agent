<script setup lang="ts">
/**
 * CodeBlock - Syntax highlighted code display with Shiki
 *
 * Renders code snippets with:
 * - Shiki syntax highlighting (VS Code quality)
 * - Language label (optional)
 * - Copy to clipboard button
 * - Dark/light theme support via CSS variables
 * - Graceful fallback for unsupported languages
 * - Lazy loading of the highlighter
 */

import { ref, computed, watch, onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import { useShiki } from '@/composables/useShiki';
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

const { highlightCode, highlightCodeSync, isReady } = useShiki();

const copied = ref(false);
const highlightedHtml = ref<string | null>(null);
const isHighlighting = ref(false);

/**
 * Simple syntax tokens as fallback when Shiki is loading or unavailable.
 */
const fallbackTokens = computed<SyntaxToken[]>(() =>
  tokenizeCode(props.code, props.language || null)
);

const displayLabel = computed(() => {
  if (props.filename) return props.filename;
  if (props.language) return props.language;
  return 'code';
});

/**
 * Whether to use Shiki highlighting (vs fallback).
 * Only use Shiki when we have valid HTML output.
 */
const useShikiHighlighting = computed(() => {
  return highlightedHtml.value !== null && highlightedHtml.value.trim() !== '';
});

/**
 * Performs Shiki highlighting for the current code.
 */
async function performHighlighting(): Promise<void> {
  if (!props.language || isHighlighting.value) {
    return;
  }

  // First, try synchronous highlighting if available
  const syncResult = highlightCodeSync(props.code, props.language);
  if (syncResult) {
    highlightedHtml.value = syncResult;
    return;
  }

  isHighlighting.value = true;

  try {
    const html = await highlightCode(props.code, props.language);
    // Only use Shiki output if it contains actual highlighted spans
    // (not just escaped text for unsupported languages)
    if (html.includes('class="shiki"') || html.includes('<span')) {
      highlightedHtml.value = html;
    } else {
      // Shiki returned escaped text, use fallback instead
      highlightedHtml.value = null;
    }
  } catch {
    // On error, stick with fallback
    highlightedHtml.value = null;
  } finally {
    isHighlighting.value = false;
  }
}

// Highlight on mount
onMounted(() => {
  performHighlighting();
});

// Re-highlight when code or language changes
watch(
  () => [props.code, props.language],
  () => {
    highlightedHtml.value = null;
    performHighlighting();
  }
);

// Re-highlight when Shiki becomes ready
watch(isReady, (ready) => {
  if (ready && !highlightedHtml.value) {
    performHighlighting();
  }
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

// Fallback token styling (for when Shiki is unavailable)
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
      <!-- Shiki highlighted output -->
      <div
        v-if="useShikiHighlighting"
        class="shiki-container p-4 text-sm leading-relaxed"
        v-html="highlightedHtml"
      />
      <!-- Fallback: simple syntax highlighting -->
      <pre v-else class="p-4 text-sm leading-relaxed">
        <code class="font-mono whitespace-pre-wrap"><span
          v-for="(token, index) in fallbackTokens"
          :key="index"
          :style="tokenStyle(token)"
          v-text="token.text"
        /></code>
      </pre>
    </div>
  </div>
</template>

<style scoped>
/**
 * Shiki container styles for dual-theme support.
 * Shiki outputs CSS variables --shiki-light and --shiki-dark.
 */
.shiki-container :deep(.shiki) {
  margin: 0;
  padding: 0;
  background-color: transparent !important;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: inherit;
  line-height: inherit;
}

.shiki-container :deep(.shiki code) {
  display: block;
  white-space: pre-wrap;
  word-break: break-word;
}

/* Light theme: use --shiki-light colors */
.shiki-container :deep(.shiki),
.shiki-container :deep(.shiki span) {
  color: var(--shiki-light) !important;
}

/* Dark theme: use --shiki-dark colors */
:global(.dark) .shiki-container :deep(.shiki),
:global(.dark) .shiki-container :deep(.shiki span) {
  color: var(--shiki-dark) !important;
}

/* Remove Shiki's background color, use our own */
.shiki-container :deep(.shiki) {
  background-color: transparent !important;
}
</style>
