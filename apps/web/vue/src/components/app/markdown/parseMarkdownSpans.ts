import type { MarkdownSpan } from './parseMarkdown';

const pattern = /(\*\*(.*?)(?:\*\*|$))|(\*(.*?)(?:\*|$))|(\[([^\]]+)\](?:\(([^)]+)\))?)|(`(.*?)(?:`|$))/g;

export function parseMarkdownSpans(markdown: string, header: boolean): MarkdownSpan[] {
    const spans: MarkdownSpan[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(markdown)) !== null) {
        const plainText = markdown.slice(lastIndex, match.index);
        if (plainText) {
            spans.push({ styles: [], text: plainText, url: null });
        }

        if (match[1]) {
            const text = match[2] ?? '';
            spans.push({ styles: header ? [] : ['bold'], text, url: null });
        } else if (match[3]) {
            const text = match[4] ?? '';
            spans.push({ styles: header ? [] : ['italic'], text, url: null });
        } else if (match[5]) {
            const linkText = match[6] ?? '';
            if (match[7]) {
                spans.push({ styles: [], text: linkText, url: match[7] });
            } else {
                spans.push({ styles: [], text: `[${linkText}]`, url: null });
            }
        } else if (match[8]) {
            const text = match[9] ?? '';
            spans.push({ styles: ['code'], text, url: null });
        }

        lastIndex = pattern.lastIndex;
    }

    if (lastIndex < markdown.length) {
        spans.push({ styles: [], text: markdown.slice(lastIndex), url: null });
    }

    return spans;
}
