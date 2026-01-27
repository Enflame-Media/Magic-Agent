import { computed, ref } from 'vue';
import { findActiveWord, type ActiveWord } from './findActiveWord';

export function useActiveWord(value: () => string) {
    const cursor = ref(0);

    const activeWord = computed<ActiveWord | null>(() => {
        return findActiveWord(value(), cursor.value);
    });

    function setCursor(nextCursor: number): void {
        cursor.value = nextCursor;
    }

    return {
        cursor,
        activeWord,
        setCursor,
    };
}
