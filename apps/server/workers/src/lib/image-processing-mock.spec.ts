/**
 * Additional tests for image-processing module using mocks
 * These tests cover defensive code paths that are otherwise unreachable
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock UPNG before importing the module
vi.mock('upng-js', () => ({
    default: {
        decode: vi.fn(),
        toRGBA8: vi.fn(),
    },
}));

// Import after mocking
import { generateThumbhash, processImage } from './image-processing';
import UPNG from 'upng-js';

describe('image-processing with mocked UPNG', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('generateThumbhash edge cases', () => {
        it('should return null when UPNG.toRGBA8 returns empty array', () => {
            // Mock UPNG to return empty frames
            vi.mocked(UPNG.decode).mockReturnValue({ width: 100, height: 100, data: new Uint8Array(0), depth: 8, ctype: 6, frames: [], tabs: {} } as unknown as ReturnType<typeof UPNG.decode>);
            vi.mocked(UPNG.toRGBA8).mockReturnValue([]);

            const data = new ArrayBuffer(100);
            const result = generateThumbhash(data, 'image/png');

            expect(result).toBeNull();
            expect(UPNG.toRGBA8).toHaveBeenCalled();
        });

        it('should return null when UPNG.toRGBA8 returns null', () => {
            // Mock UPNG to return null frames
            vi.mocked(UPNG.decode).mockReturnValue({ width: 100, height: 100, data: new Uint8Array(0), depth: 8, ctype: 6, frames: [], tabs: {} } as unknown as ReturnType<typeof UPNG.decode>);
            // @ts-expect-error - Testing null return which is not in the type but could happen
            vi.mocked(UPNG.toRGBA8).mockReturnValue(null);

            const data = new ArrayBuffer(100);
            const result = generateThumbhash(data, 'image/png');

            expect(result).toBeNull();
        });

        it('should return null when first frame is undefined', () => {
            // Mock UPNG to return array with undefined first element
            vi.mocked(UPNG.decode).mockReturnValue({ width: 100, height: 100, data: new Uint8Array(0), depth: 8, ctype: 6, frames: [], tabs: {} } as unknown as ReturnType<typeof UPNG.decode>);
            // Create sparse array with undefined first element
            const sparseArray: (ArrayBuffer | undefined)[] = [];
            sparseArray.length = 1;  // Set length but no actual element
            vi.mocked(UPNG.toRGBA8).mockReturnValue(sparseArray as ArrayBuffer[]);

            const data = new ArrayBuffer(100);
            const result = generateThumbhash(data, 'image/png');

            expect(result).toBeNull();
        });
    });

    describe('processImage error handling', () => {
        it('should return null when PNG decode fails (error caught internally)', async () => {
            // Mock console.error to capture any error logging
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            // Mock UPNG.decode to throw an error
            vi.mocked(UPNG.decode).mockImplementation(() => {
                throw new Error('Simulated decode error');
            });

            const data = new ArrayBuffer(100);
            const result = await processImage(data, 'image/png');

            // The function should return null (error is caught at some level)
            expect(result).toBeNull();

            consoleSpy.mockRestore();
        });
    });
});
