import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { startHTTPDirectProxy, HTTPProxy } from './index';

describe('HTTPDirectProxy', () => {
    let targetServer: ReturnType<typeof createServer>;
    let targetUrl: string;
    let proxy: HTTPProxy | null = null;

    // Create a simple target server for testing
    beforeAll(async () => {
        targetServer = createServer((req: IncomingMessage, res: ServerResponse) => {
            // Echo back request info
            const body = JSON.stringify({
                method: req.method,
                url: req.url,
                headers: req.headers
            });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(body);
        });

        await new Promise<void>((resolve) => {
            targetServer.listen(0, '127.0.0.1', () => {
                const addr = targetServer.address();
                if (addr && typeof addr === 'object') {
                    targetUrl = `http://127.0.0.1:${addr.port}`;
                }
                resolve();
            });
        });
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => {
            targetServer.close(() => resolve());
        });
    });

    afterEach(async () => {
        if (proxy) {
            await proxy.close();
            proxy = null;
        }
    });

    it('should start proxy on a random port', async () => {
        proxy = await startHTTPDirectProxy({
            target: targetUrl
        });

        expect(proxy.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
        expect(typeof proxy.close).toBe('function');
    });

    it('should proxy requests to target server', async () => {
        proxy = await startHTTPDirectProxy({
            target: targetUrl
        });

        // Make a request through the proxy
        const response = await fetch(`${proxy.url}/test-path`);
        const data = await response.json() as { method: string; url: string };

        expect(response.ok).toBe(true);
        expect(data.method).toBe('GET');
        expect(data.url).toBe('/test-path');
    });

    it('should call onRequest hook', async () => {
        const onRequest = vi.fn();

        proxy = await startHTTPDirectProxy({
            target: targetUrl,
            onRequest
        });

        await fetch(`${proxy.url}/hook-test`);

        expect(onRequest).toHaveBeenCalledTimes(1);
        expect(onRequest).toHaveBeenCalledWith(
            expect.objectContaining({ url: '/hook-test' }),
            expect.anything()
        );
    });

    it('should call onResponse hook', async () => {
        const onResponse = vi.fn();

        proxy = await startHTTPDirectProxy({
            target: targetUrl,
            onResponse
        });

        await fetch(`${proxy.url}/response-test`);

        expect(onResponse).toHaveBeenCalledTimes(1);
        expect(onResponse).toHaveBeenCalledWith(
            expect.objectContaining({ url: '/response-test' }),
            expect.objectContaining({ statusCode: 200 })
        );
    });

    it('should handle proxy close gracefully', async () => {
        proxy = await startHTTPDirectProxy({
            target: targetUrl
        });

        const url = proxy.url;

        // Should work before close
        const response1 = await fetch(`${url}/before-close`);
        expect(response1.ok).toBe(true);

        // Close the proxy
        await proxy.close();
        proxy = null;

        // Should fail after close
        await expect(fetch(`${url}/after-close`)).rejects.toThrow();
    });

    it('should handle target server errors gracefully', async () => {
        // Create a proxy pointing to non-existent target
        proxy = await startHTTPDirectProxy({
            target: 'http://127.0.0.1:1' // Port 1 should be unavailable
        });

        // Request should fail gracefully with 500
        const response = await fetch(`${proxy.url}/error-test`);
        expect(response.status).toBe(500);
    });

    it('should proxy POST requests with body', async () => {
        // Create a target that echoes the body
        const postServer = createServer(async (req, res) => {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const body = Buffer.concat(chunks).toString();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ receivedBody: body }));
        });

        await new Promise<void>((resolve) => {
            postServer.listen(0, '127.0.0.1', () => resolve());
        });

        const postAddr = postServer.address();
        const postUrl = `http://127.0.0.1:${(postAddr as { port: number }).port}`;

        proxy = await startHTTPDirectProxy({
            target: postUrl
        });

        const testBody = JSON.stringify({ test: 'data' });
        const response = await fetch(`${proxy.url}/post-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: testBody
        });

        const data = await response.json() as { receivedBody: string };
        expect(data.receivedBody).toBe(testBody);

        await new Promise<void>((resolve) => {
            postServer.close(() => resolve());
        });
    });
});
