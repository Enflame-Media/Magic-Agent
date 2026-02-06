/**
 * Cloudflare Worker entry for Happy Vue SPA
 *
 * This is a minimal worker that serves static assets.
 * The Vue app runs entirely in the browser - the worker just handles asset serving
 * and SPA routing (serving index.html for client-side routes).
 *
 * IMPORTANT: This file must NOT import any browser-specific code (Vue, Vue Router, etc.)
 * as it runs in the Cloudflare Workers runtime which doesn't have browser APIs.
 */

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ENVIRONMENT?: string;
  BASE_URL?: string;
  API_BASE_URL?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Let the ASSETS binding handle static asset serving
    // The not_found_handling = "single-page-application" in wrangler.toml
    // ensures that unmatched routes serve index.html
    return env.ASSETS.fetch(request);
  },
};
