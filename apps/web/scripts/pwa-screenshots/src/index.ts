/**
 * PWA Screenshot Generator Worker
 *
 * Uses Cloudflare Browser Rendering to capture screenshots of the Happy Vue.js
 * web application for PWA install prompts.
 *
 * Endpoints:
 *   GET /generate - Generate all PWA screenshots and store in R2
 *   GET /screenshot/:name - Serve a specific screenshot from R2
 *   GET /status - Check if screenshots exist
 *
 * @see HAP-923 - Create PWA screenshot assets for install prompt
 */

import puppeteer from '@cloudflare/puppeteer';

/**
 * Screenshot specifications matching manifest.json requirements
 */
const SCREENSHOTS = [
  {
    name: 'desktop-home.png',
    width: 1920,
    height: 1080,
    route: '/',
    label: 'Happy Dashboard - Desktop View',
  },
  {
    name: 'mobile-home.png',
    width: 390,
    height: 844,
    route: '/',
    label: 'Happy Dashboard - Mobile View',
  },
] as const;

interface Env {
  MYBROWSER: Fetcher;
  SCREENSHOTS_BUCKET: R2Bucket;
  TARGET_URL: string;
  ENVIRONMENT: string;
}

/**
 * Generate a single screenshot using Browser Rendering
 */
async function generateScreenshot(
  env: Env,
  spec: (typeof SCREENSHOTS)[number]
): Promise<{ name: string; size: number }> {
  const browser = await puppeteer.launch(env.MYBROWSER);

  try {
    const page = await browser.newPage();

    // Set viewport to match PWA screenshot requirements
    await page.setViewport({
      width: spec.width,
      height: spec.height,
      deviceScaleFactor: 1,
    });

    // Emulate dark color scheme for brand consistency
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);

    // Navigate to the target page
    const targetUrl = `${env.TARGET_URL}${spec.route}`;
    await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000,
    });

    // Wait for fonts and transitions to settle
    await page.evaluate(() => document.fonts.ready);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Capture screenshot as PNG
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
    });

    // Store in R2 bucket
    await env.SCREENSHOTS_BUCKET.put(spec.name, screenshot, {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'public, max-age=86400',
      },
      customMetadata: {
        width: String(spec.width),
        height: String(spec.height),
        label: spec.label,
        generatedAt: new Date().toISOString(),
        targetUrl,
      },
    });

    return {
      name: spec.name,
      size: screenshot.byteLength,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Handle incoming requests
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for cross-origin requests
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /generate - Generate all screenshots
      if (path === '/generate') {
        const results: Array<{ name: string; size: number; error?: string }> = [];

        for (const spec of SCREENSHOTS) {
          try {
            const result = await generateScreenshot(env, spec);
            results.push(result);
          } catch (error) {
            results.push({
              name: spec.name,
              size: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }

        const successful = results.filter((r) => !r.error).length;
        const failed = results.filter((r) => r.error).length;

        return new Response(
          JSON.stringify(
            {
              success: failed === 0,
              message: `Generated ${successful}/${SCREENSHOTS.length} screenshots`,
              environment: env.ENVIRONMENT,
              targetUrl: env.TARGET_URL,
              results,
              timestamp: new Date().toISOString(),
            },
            null,
            2
          ),
          {
            status: failed === 0 ? 200 : 207,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // GET /screenshot/:name - Serve a screenshot from R2
      const screenshotMatch = path.match(/^\/screenshot\/(.+\.png)$/);
      if (screenshotMatch) {
        const name = screenshotMatch[1];
        const object = await env.SCREENSHOTS_BUCKET.get(name);

        if (!object) {
          return new Response(JSON.stringify({ error: `Screenshot '${name}' not found` }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        return new Response(object.body, {
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=86400',
            ...corsHeaders,
          },
        });
      }

      // GET /status - Check screenshot status
      if (path === '/status') {
        const status: Array<{
          name: string;
          exists: boolean;
          size?: number;
          generatedAt?: string;
        }> = [];

        for (const spec of SCREENSHOTS) {
          const object = await env.SCREENSHOTS_BUCKET.head(spec.name);
          status.push({
            name: spec.name,
            exists: !!object,
            size: object?.size,
            generatedAt: object?.customMetadata?.generatedAt,
          });
        }

        const allExist = status.every((s) => s.exists);

        return new Response(
          JSON.stringify(
            {
              complete: allExist,
              environment: env.ENVIRONMENT,
              screenshots: status,
            },
            null,
            2
          ),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // GET / - API documentation
      if (path === '/') {
        return new Response(
          JSON.stringify(
            {
              name: 'Happy PWA Screenshot Generator',
              version: '1.0.0',
              environment: env.ENVIRONMENT,
              endpoints: {
                'GET /': 'This documentation',
                'GET /generate': 'Generate all PWA screenshots',
                'GET /screenshot/:name': 'Serve a specific screenshot (e.g., /screenshot/desktop-home.png)',
                'GET /status': 'Check if screenshots exist in R2',
              },
              screenshots: SCREENSHOTS.map((s) => ({
                name: s.name,
                dimensions: `${s.width}x${s.height}`,
                label: s.label,
              })),
            },
            null,
            2
          ),
          {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      }

      // 404 for unknown routes
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  },
} satisfies ExportedHandler<Env>;
