import * as React from 'react';
import { InvalidateSync } from '@/utils/sync';

// Types
export interface AutocompleteResult {
    text: string;
}

export interface UseAutocompleteOptions {
    text: string;
    cursorPosition: number;
    autocompleteFunction: (text: string, cursorPosition: number) => Promise<AutocompleteResult[]>;
    debounceMs?: number;
}

export interface UseAutocompleteReturn {
    results: AutocompleteResult[];
    isLoading: boolean;
}

const emptyArray: AutocompleteResult[] = [];

export function useAutocomplete(query: string | null, resolver: (text: string) => Promise<AutocompleteResult[]>) {

    const [results, setResults] = React.useState<AutocompleteResult[]>([]);

    const sync = React.useMemo(() => {
        // Use mutable state object to avoid recreating cache on query changes
        const state = { query: null as string | null };
        let cache = new Map<string, AutocompleteResult[]>();

        let sync = new InvalidateSync(async () => {
            let t = state.query;
            if (t === null) {
                setResults(emptyArray);
                return;
            }
            let results = cache.get(t);
            if (results === undefined) {
                results = await resolver(t);
                cache.set(t, results);
            }
            if (state.query === t) {
                setResults(results);
            }
        });

        return {
            sync,
            state,
            onSearchQueryChange: (text: string | null) => {
                state.query = text;
                sync.invalidate();
            },
        };
    }, [resolver]); // ✅ Only resolver triggers rebuild - cache persists across query changes

    // Trigger sync
    React.useEffect(() => {
        sync.onSearchQueryChange(query);
    }, [query, sync]);

    // Return empty array if no query
    if (query === null) {
        return emptyArray;
    } else {
        return results;
    }
}