# Visual Regression Testing Guide

This document describes how to use and maintain visual regression tests for the Happy Vue.js web application.

## Overview

Visual regression testing ensures that UI changes don't introduce unintended visual differences. We use [Percy](https://percy.io) integrated with Playwright to capture and compare screenshots across builds.

**Related Issues:**
- HAP-876 - Visual Regression Testing Implementation
- HAP-720 - NativeScript Mobile Testing Suite (parent)

## Technology Stack

- **Percy** - Cloud-based visual testing platform
- **@percy/playwright** - Playwright integration for Percy snapshots
- **Playwright** - Browser automation for E2E tests

## Running Visual Tests

### Local Development (Without Percy)

Run visual tests locally without uploading to Percy:

```bash
# From the monorepo root
cd apps/web/vue

# Run visual tests locally (no Percy upload)
yarn workspace @happy-vue/web test:e2e:visual:local

# Run with specific browser
yarn workspace @happy-vue/web test:e2e:visual:local --project=chromium
```

### With Percy (CI/Development)

To run tests with Percy and upload snapshots:

```bash
# Set your Percy token
export PERCY_TOKEN=your_percy_token_here

# Run visual tests with Percy
yarn workspace @happy-vue/web test:e2e:visual
```

## Test Structure

Visual tests are located in `apps/web/e2e/visual.spec.ts` and organized into test groups:

### Authentication Screens
- Login screen (desktop and responsive)
- QR Scanner screen
- Manual Entry screen
- Connecting screen

### Main Application Screens
- Dashboard (empty state)
- Settings page and sub-pages
- Account, Appearance, Privacy, Notifications, Features, Server, MCP

### Mobile Viewports
- iPhone 12, iPhone SE, iPhone 14 Pro
- Pixel 5, Pixel 7, Galaxy S21

### Theme Variations
- Light theme tests
- Dark theme tests

### Connection Status Indicators
- Disconnected state
- Settings connection indicator

## Baseline Update Process

### When to Update Baselines

Update visual baselines when:
1. **Intentional UI changes** - New features, design updates, or bug fixes that change the UI
2. **Dependency updates** - When updating UI libraries (Vue, Tailwind, shadcn-vue)
3. **Initial setup** - When first establishing baselines

### How to Update Baselines

#### Method 1: Percy Dashboard (Recommended for CI)

1. Run the visual tests in CI (or locally with `PERCY_TOKEN`)
2. Go to the [Percy Dashboard](https://percy.io)
3. Review the visual diffs for each snapshot
4. **Approve changes** if they are intentional
5. Percy automatically updates the baseline for approved changes

#### Method 2: Local Baseline Update

For tests running without Percy (using Playwright's built-in comparison):

```bash
# Update local snapshots
yarn workspace @happy-vue/web test:e2e:visual:local --update-snapshots
```

### Review Process

1. **Before PR merge**: All visual changes must be reviewed in Percy
2. **Percy Build Status**: PRs show Percy build status as a check
3. **Required Approval**: Visual changes require approval from a team member
4. **Auto-Approve Minor Changes**: Percy can be configured to auto-approve changes below a threshold

## CI Integration

Visual regression tests run automatically in GitHub Actions:

- **On push to main/develop**: Full Percy upload and comparison
- **On pull requests**: Percy generates a comparison build
- **For forked PRs**: Tests run locally without Percy upload

### Percy Token Setup

1. Create a Percy project at [percy.io](https://percy.io)
2. Get the project token from Percy settings
3. Add `PERCY_TOKEN` as a GitHub repository secret

## Configuration

### Percy Configuration

Percy can be configured via `.percy.yml` or command-line flags:

```yaml
# .percy.yml (optional)
version: 2
snapshot:
  widths:
    - 375
    - 768
    - 1280
  min-height: 1024
  enable-javascript: true
```

### Test Viewport Configuration

Viewports are defined in `e2e/visual.spec.ts`:

```typescript
const MOBILE_VIEWPORTS = {
  iPhoneSE: { width: 375, height: 667 },
  iPhone12: { width: 390, height: 844 },
  // ... more viewports
};
```

## Best Practices

### Writing Visual Tests

1. **Wait for content**: Always wait for `networkidle` and visibility
   ```typescript
   await page.waitForLoadState('networkidle');
   await expect(page.locator('body')).toBeVisible();
   ```

2. **Handle dynamic content**: Hide or mask dynamic elements
   ```typescript
   await percySnapshot(page, 'My Snapshot', {
     percyCSS: '.dynamic-timestamp { visibility: hidden; }'
   });
   ```

3. **Use descriptive names**: Snapshot names should clearly describe the state
   ```typescript
   // Good
   await percySnapshot(page, 'Dashboard - Empty State - Light Theme');

   // Bad
   await percySnapshot(page, 'test1');
   ```

### Reducing Flakiness

1. **Disable animations**: Configure tests to disable CSS animations
2. **Mock time-dependent content**: Use fixed dates/times for timestamps
3. **Stabilize async content**: Wait for all async operations to complete
4. **Use consistent test data**: Mock API responses for predictable states

### Organizing Tests

1. **Group by feature**: Keep related visual tests together
2. **Test critical paths first**: Prioritize login, dashboard, settings
3. **Cover responsive breakpoints**: Test mobile, tablet, and desktop
4. **Test both themes**: Include light and dark theme variants

## Troubleshooting

### Common Issues

#### "Percy is not receiving any snapshots"
- Verify `PERCY_TOKEN` is set correctly
- Check Percy CLI output for errors
- Ensure tests are actually calling `percySnapshot()`

#### "Visual diffs are inconsistent"
- Check for animations or dynamic content
- Ensure consistent viewport sizes
- Mock time-dependent data
- Use `percyCSS` to hide flaky elements

#### "Tests are slow"
- Reduce the number of viewport widths
- Run visual tests only on Chromium
- Use `test.skip` for redundant viewport combinations

### Debug Commands

```bash
# Run with Percy debug output
PERCY_LOGLEVEL=debug yarn workspace @happy-vue/web test:e2e:visual

# Run specific test file
yarn workspace @happy-vue/web exec playwright test e2e/visual.spec.ts --project=chromium

# Generate HTML report
yarn workspace @happy-vue/web test:e2e:report
```

## Resources

- [Percy Documentation](https://docs.percy.io/)
- [Percy + Playwright Guide](https://docs.percy.io/docs/playwright)
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [HAP-876 Implementation](https://linear.app/enflame-media/issue/HAP-876)
