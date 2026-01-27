import { computed } from 'vue';
import { getSuggestions, type Suggestion } from './suggestions';
import { useActiveWord } from './useActiveWord';

export function useActiveSuggestions(value: () => string) {
    const { activeWord, cursor, setCursor } = useActiveWord(value);

    const suggestions = computed<Suggestion[]>(() => {
        if (!activeWord.value) {
            return [];
        }
        return getSuggestions(activeWord.value.text);
    });

    return {
        activeWord,
        cursor,
        setCursor,
        suggestions,
    };
}
