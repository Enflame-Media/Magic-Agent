export type ActiveWord = {
    start: number;
    end: number;
    text: string;
};

export function findActiveWord(value: string, cursor: number): ActiveWord | null {
    const left = value.slice(0, cursor);
    const right = value.slice(cursor);
    const leftMatch = left.match(/[\w-]+$/);
    const rightMatch = right.match(/^[\w-]+/);

    if (!leftMatch && !rightMatch) {
        return null;
    }

    const leftText = leftMatch ? leftMatch[0] : '';
    const rightText = rightMatch ? rightMatch[0] : '';
    const start = cursor - leftText.length;
    const end = cursor + rightText.length;
    return {
        start,
        end,
        text: `${leftText}${rightText}`,
    };
}
