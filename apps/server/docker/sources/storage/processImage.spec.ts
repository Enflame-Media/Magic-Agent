import * as fs from 'fs';
import { processImage } from './processImage';
import { describe, it, expect } from 'vitest';

describe('processImage', () => {
    it('should resize image and return correct metadata', async () => {
        const img = fs.readFileSync(__dirname + '/__testdata__/image.jpg');
        const result = await processImage(img);

        // Verify original dimensions are preserved in output
        expect(result.width).toBe(200);
        expect(result.height).toBe(150);
        expect(result.format).toBe('jpeg');

        // Verify thumbhash is generated (base64 string)
        expect(result.thumbhash).toBeDefined();
        expect(typeof result.thumbhash).toBe('string');
        expect(result.thumbhash.length).toBeGreaterThan(0);

        // Verify resized pixels buffer exists
        expect(result.pixels).toBeInstanceOf(Buffer);
        expect(result.pixels.length).toBeGreaterThan(0);
    });

    it('should throw error for unsupported image format', async () => {
        // Create a fake buffer that sharp won't recognize as valid image
        const invalidImg = Buffer.from('not a valid image');

        await expect(processImage(invalidImg)).rejects.toThrow();
    });
});
