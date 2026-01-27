# PWA Screenshot Generator

Generates PWA install prompt screenshots using Cloudflare Browser Rendering.

## Overview

This Cloudflare Worker uses Browser Rendering to capture screenshots of the Happy Vue.js web application at the dimensions required by the PWA manifest.

## Screenshots Generated

| File | Dimensions | Description |
|------|------------|-------------|
| `desktop-home.png` | 1920x1080 | Desktop layout of Happy dashboard |
| `mobile-home.png` | 390x844 | Mobile layout of Happy dashboard |

## Setup

### Prerequisites

1. Cloudflare account with Browser Rendering enabled
2. R2 buckets created:
   - `happy-pwa-screenshots-dev` (development)
   - `happy-pwa-screenshots` (production)

### Create R2 Buckets

```bash
# Development
wrangler r2 bucket create happy-pwa-screenshots-dev

# Production
wrangler r2 bucket create happy-pwa-screenshots
```

### Deploy Worker

```bash
# From @happy-vue/web root
yarn pwa-screenshots:deploy:dev   # Development
yarn pwa-screenshots:deploy:prod  # Production
```

## Usage

### Generate Screenshots

```bash
# Generate screenshots (runs Browser Rendering)
yarn pwa-screenshots:generate:dev

# Check status
yarn pwa-screenshots:status:dev
```

### Download to Local

After generation, download screenshots to `public/screenshots/`:

```bash
yarn pwa-screenshots:download:dev
```

### API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | API documentation |
| `GET /generate` | Generate all PWA screenshots |
| `GET /screenshot/:name` | Serve a specific screenshot |
| `GET /status` | Check if screenshots exist |

## Workflow

1. **Deploy the Worker** (one-time setup):
   ```bash
   yarn pwa-screenshots:deploy:dev
   ```

2. **Generate Screenshots** (after UI changes):
   ```bash
   yarn pwa-screenshots:generate:dev
   ```

3. **Download to Local** (for static serving):
   ```bash
   yarn pwa-screenshots:download:dev
   ```

4. **Commit** the downloaded screenshots to the repository

## Technical Details

- Uses `@cloudflare/puppeteer` for browser automation
- Screenshots are stored in R2 with 24-hour cache headers
- Dark theme is used for brand consistency
- Waits for fonts and network idle before capturing

## Related

- [HAP-923](https://linear.app/enflame-media/issue/HAP-923) - Create PWA screenshot assets for install prompt
- [manifest.json](../../public/manifest.json) - PWA manifest referencing these screenshots
