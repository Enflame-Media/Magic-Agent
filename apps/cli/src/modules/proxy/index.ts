/**
 * HTTP Proxy Module
 *
 * Provides a configurable HTTP proxy server with request/response hooks
 * for intercepting and monitoring HTTP traffic. Useful for:
 * - API request/response monitoring
 * - Local development debugging
 * - Activity tracking and logging
 * - Request transformation/injection
 *
 * @example
 * ```typescript
 * import { startHTTPDirectProxy } from '@/modules/proxy';
 *
 * const proxy = await startHTTPDirectProxy({
 *   target: 'https://api.example.com',
 *   verbose: true,
 *   onRequest: (req, proxyReq) => {
 *     console.log(`Request: ${req.method} ${req.url}`);
 *   },
 *   onResponse: (req, proxyRes) => {
 *     console.log(`Response: ${proxyRes.statusCode}`);
 *   }
 * });
 *
 * console.log(`Proxy running at ${proxy.url}`);
 *
 * // Later: clean shutdown
 * await proxy.close();
 * ```
 */

export {
    startHTTPDirectProxy,
    type HTTPProxy,
    type HTTPProxyOptions
} from './startHTTPDirectProxy';
