import type { Suggestion } from './suggestions';
import type { ActiveWord } from './findActiveWord';

export function applySuggestion(
    value: string,
    activeWord: ActiveWord,
    suggestion: Suggestion
): { value: string; cursor: number } {
    const before = value.slice(0, activeWord.start);
    const after = value.slice(activeWord.end);
    const nextValue = `${before}${suggestion.insertText}${after}`;
    const cursor = before.length + suggestion.insertText.length;
    return { value: nextValue, cursor };
}
