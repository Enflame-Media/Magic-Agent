import type { MarkdownBlock } from './parseMarkdown';
import { parseMarkdownSpans } from './parseMarkdownSpans';

function parseTable(
    lines: string[],
    startIndex: number
): { table: MarkdownBlock | null; nextIndex: number } {
    let index = startIndex;
    const tableLines: string[] = [];

    while (index < lines.length) {
        const line = lines[index];
        if (!line || !line.includes('|')) {
            break;
        }
        tableLines.push(line);
        index += 1;
    }

    if (tableLines.length < 2) {
        return { table: null, nextIndex: startIndex };
    }

    const separatorLine = tableLines[1]?.trim() ?? '';
    const isSeparator = /^[|\s\-:=]*$/.test(separatorLine) && separatorLine.includes('-');

    if (!isSeparator) {
        return { table: null, nextIndex: startIndex };
    }

    const headerLine = tableLines[0]?.trim() ?? '';
    const headers = headerLine
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell.length > 0);

    if (headers.length === 0) {
        return { table: null, nextIndex: startIndex };
    }

    const rows: string[][] = [];
    for (let i = 2; i < tableLines.length; i += 1) {
        const rowLine = tableLines[i]?.trim() ?? '';
        const rowCells = rowLine
            .split('|')
            .map((cell) => cell.trim())
            .filter((cell) => cell.length > 0);

        if (rowCells.length > 0) {
            rows.push(rowCells);
        }
    }

    const table: MarkdownBlock = {
        type: 'table',
        headers,
        rows,
    };

    return { table, nextIndex: index };
}

export function parseMarkdownBlock(markdown: string): MarkdownBlock[] {
    const blocks: MarkdownBlock[] = [];
    const lines = markdown.split('\n');
    let index = 0;

    outer: while (index < lines.length) {
        const line = lines[index];
        if (!line) {
            break;
        }
        index += 1;

        for (let i = 1; i <= 6; i += 1) {
            if (line.startsWith(`${'#'.repeat(i)} `)) {
                blocks.push({
                    type: 'header',
                    level: i as 1 | 2 | 3 | 4 | 5 | 6,
                    content: parseMarkdownSpans(line.slice(i + 1).trim(), true),
                });
                continue outer;
            }
        }

        const trimmed = line.trim();

        if (trimmed.startsWith('```')) {
            const language = trimmed.slice(3).trim() || null;
            const content: string[] = [];
            while (index < lines.length) {
                const nextLine = lines[index];
                if (!nextLine) {
                    index += 1;
                    break;
                }
                if (nextLine.trim() === '```') {
                    index += 1;
                    break;
                }
                content.push(nextLine);
                index += 1;
            }

            const contentString = content.join('\n');

            if (language === 'mermaid') {
                blocks.push({ type: 'mermaid', content: contentString });
            } else {
                blocks.push({ type: 'code-block', language, content: contentString });
            }
            continue;
        }

        if (trimmed === '---') {
            blocks.push({ type: 'horizontal-rule' });
            continue;
        }

        if (trimmed.startsWith('<options>')) {
            const items: string[] = [];
            while (index < lines.length) {
                const nextLine = lines[index];
                if (!nextLine) {
                    index += 1;
                    break;
                }
                if (nextLine.trim() === '</options>') {
                    index += 1;
                    break;
                }
                const optionMatch = nextLine.match(/<option>(.*?)<\/option>/);
                if (optionMatch?.[1]) {
                    items.push(optionMatch[1]);
                }
                index += 1;
            }
            if (items.length > 0) {
                blocks.push({ type: 'options', items });
            }
            continue;
        }

        const numberedListMatch = trimmed.match(/^(\d+)\.\s/);
        if (numberedListMatch) {
            const allLines = [
                {
                    number: Number.parseInt(numberedListMatch[1] ?? '0', 10),
                    content: trimmed.slice(numberedListMatch[0].length),
                },
            ];
            while (index < lines.length) {
                const rawLine = lines[index];
                if (!rawLine) {
                    break;
                }
                const nextLine = rawLine.trim();
                const nextMatch = nextLine.match(/^(\d+)\.\s/);
                if (!nextMatch) break;
                allLines.push({
                    number: Number.parseInt(nextMatch[1] ?? '0', 10),
                    content: nextLine.slice(nextMatch[0].length),
                });
                index += 1;
            }
            blocks.push({
                type: 'numbered-list',
                items: allLines.map((item) => ({
                    number: item.number,
                    spans: parseMarkdownSpans(item.content, false),
                })),
            });
            continue;
        }

        if (trimmed.startsWith('- ')) {
            const allLines = [trimmed.slice(2)];
            while (index < lines.length) {
                const nextLine = lines[index];
                if (!nextLine || !nextLine.trim().startsWith('- ')) {
                    break;
                }
                allLines.push(nextLine.trim().slice(2));
                index += 1;
            }
            blocks.push({
                type: 'list',
                items: allLines.map((item) => parseMarkdownSpans(item, false)),
            });
            continue;
        }

        if (trimmed.includes('|') && !trimmed.startsWith('```')) {
            const { table, nextIndex } = parseTable(lines, index - 1);
            if (table) {
                blocks.push(table);
                index = nextIndex;
                continue outer;
            }
        }

        if (trimmed.length > 0) {
            blocks.push({
                type: 'text',
                content: parseMarkdownSpans(trimmed, false),
            });
        }
    }

    return blocks;
}
