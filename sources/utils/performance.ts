/**
 * Performance Monitoring Utilities
 *
 * Lightweight performance tracking for startup time, screen renders, and slow operations.
 * Designed to have minimal overhead (<1ms) by using idle callbacks for reporting.
 *
 * Key metrics tracked:
 * - App startup time (JS bundle to first render)
 * - Screen render times
 * - Slow renders (>16ms, which miss 60fps)
 *
 * HAP-336: Observability - Add performance monitoring and metrics
 */

import { Platform, InteractionManager } from 'react-native';
import { tracking } from '@/track/tracking';

// Performance thresholds (ms)
const SLOW_RENDER_THRESHOLD = 16; // 60fps = ~16ms per frame
const VERY_SLOW_RENDER_THRESHOLD = 100;
const STARTUP_THRESHOLD_WARN = 3000;

// Module-level state for startup tracking
let appStartTime: number | null = null;
let firstRenderTime: number | null = null;
let startupTracked = false;

// Store recent render metrics for baselines
interface RenderMetric {
    screen: string;
    duration: number;
    timestamp: number;
}

const renderMetrics: RenderMetric[] = [];
const MAX_METRICS_STORED = 100;

/**
 * Mark the start of app initialization.
 * Call this as early as possible in the app lifecycle.
 */
export function markAppStart(): void {
    if (appStartTime === null) {
        appStartTime = performance.now();
    }
}

/**
 * Mark the first meaningful render.
 * Call this when the main UI is visible.
 */
export function markFirstRender(): void {
    if (firstRenderTime === null && appStartTime !== null) {
        firstRenderTime = performance.now();
        trackStartupTime();
    }
}

/**
 * Track startup time to analytics
 */
function trackStartupTime(): void {
    if (startupTracked || appStartTime === null || firstRenderTime === null) {
        return;
    }

    startupTracked = true;
    const startupDuration = firstRenderTime - appStartTime;

    // Report via idle callback to avoid blocking
    scheduleIdleReport(() => {
        const properties = {
            duration_ms: Math.round(startupDuration),
            platform: Platform.OS,
            is_slow: startupDuration > STARTUP_THRESHOLD_WARN,
        };

        tracking?.capture('perf_startup', properties);

        // Also log for debugging
        const status = startupDuration > STARTUP_THRESHOLD_WARN ? 'SLOW' : 'OK';
        console.log(`[Performance] Startup: ${Math.round(startupDuration)}ms (${status})`);
    });
}

/**
 * Get the current startup duration (for display purposes)
 */
export function getStartupDuration(): number | null {
    if (appStartTime === null || firstRenderTime === null) {
        return null;
    }
    return Math.round(firstRenderTime - appStartTime);
}

/**
 * Track a screen render time
 */
export function trackScreenRender(screen: string, duration: number): void {
    // Store for baseline calculations
    const metric: RenderMetric = {
        screen,
        duration,
        timestamp: Date.now(),
    };
    renderMetrics.push(metric);

    // Keep only recent metrics
    if (renderMetrics.length > MAX_METRICS_STORED) {
        renderMetrics.shift();
    }

    // Report slow renders immediately, others via idle callback
    if (duration > SLOW_RENDER_THRESHOLD) {
        reportSlowRender(screen, duration);
    }
}

/**
 * Report a slow render to analytics
 */
function reportSlowRender(screen: string, duration: number): void {
    const severity = duration > VERY_SLOW_RENDER_THRESHOLD ? 'critical' : 'warning';

    scheduleIdleReport(() => {
        tracking?.capture('perf_slow_render', {
            screen,
            duration_ms: Math.round(duration),
            severity,
            platform: Platform.OS,
        });

        console.warn(`[Performance] Slow render on ${screen}: ${Math.round(duration)}ms (${severity})`);
    });
}

/**
 * Get baseline metrics for a specific screen
 */
export function getScreenBaseline(screen: string): {
    avgDuration: number;
    maxDuration: number;
    sampleCount: number;
} | null {
    const screenMetrics = renderMetrics.filter(m => m.screen === screen);

    if (screenMetrics.length === 0) {
        return null;
    }

    const durations = screenMetrics.map(m => m.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);

    return {
        avgDuration: Math.round(avg),
        maxDuration: Math.round(max),
        sampleCount: screenMetrics.length,
    };
}

/**
 * Get all screen baselines for dashboard display
 */
export function getAllScreenBaselines(): Map<string, ReturnType<typeof getScreenBaseline>> {
    const screens = new Set(renderMetrics.map(m => m.screen));
    const baselines = new Map<string, ReturnType<typeof getScreenBaseline>>();

    for (const screen of screens) {
        baselines.set(screen, getScreenBaseline(screen));
    }

    return baselines;
}

/**
 * Log current baselines to console (for debugging)
 */
export function logBaselines(): void {
    const baselines = getAllScreenBaselines();

    console.log('[Performance] Screen Baselines:');
    baselines.forEach((baseline, screen) => {
        if (baseline) {
            console.log(`  ${screen}: avg=${baseline.avgDuration}ms, max=${baseline.maxDuration}ms (n=${baseline.sampleCount})`);
        }
    });
}

/**
 * Create a timer for measuring operations
 */
export function createTimer(label: string): {
    stop: () => number;
    elapsed: () => number;
} {
    const start = performance.now();

    return {
        stop: () => {
            const duration = performance.now() - start;
            console.log(`[Performance] ${label}: ${Math.round(duration)}ms`);
            return duration;
        },
        elapsed: () => performance.now() - start,
    };
}

/**
 * Schedule a callback to run during idle time
 * Falls back to setTimeout on platforms without requestIdleCallback
 */
function scheduleIdleReport(callback: () => void): void {
    // Use InteractionManager on native for better performance
    if (Platform.OS !== 'web') {
        InteractionManager.runAfterInteractions(callback);
        return;
    }

    // Use requestIdleCallback on web if available
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(callback, { timeout: 1000 });
    } else {
        setTimeout(callback, 0);
    }
}

/**
 * Report all current baselines to analytics (call periodically or on app background)
 */
export function reportBaselines(): void {
    const baselines = getAllScreenBaselines();

    if (baselines.size === 0) {
        return;
    }

    scheduleIdleReport(() => {
        const report: Record<string, number> = {};
        baselines.forEach((baseline, screen) => {
            if (baseline) {
                report[`${screen}_avg_ms`] = baseline.avgDuration;
                report[`${screen}_max_ms`] = baseline.maxDuration;
            }
        });

        tracking?.capture('perf_baselines', {
            ...report,
            screens_tracked: baselines.size,
            platform: Platform.OS,
        });

        console.log('[Performance] Baselines reported to analytics');
    });
}
