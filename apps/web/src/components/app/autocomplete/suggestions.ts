export type Suggestion = {
    label: string;
    insertText: string;
};

const COMMANDS: Suggestion[] = [
    { label: '/clear', insertText: '/clear' },
    { label: '/compact', insertText: '/compact' },
];

export function getSuggestions(text: string): Suggestion[] {
    if (!text) {
        return [];
    }

    if (text.startsWith('/')) {
        const query = text.slice(1).toLowerCase();
        return COMMANDS.filter((item) => item.label.slice(1).toLowerCase().includes(query));
    }

    return [];
}
