/**
 * usePerformanceMonitor Hook
 *
 * A React hook that measures screen/component render times.
 * Uses requestAnimationFrame to accurately measure time-to-paint.
 *
 * Usage:
 *   const MyScreen = () => {
 *     usePerformanceMonitor('MyScreen');
 *     return <View>...</View>;
 *   };
 *
 * The hook tracks:
 * - Initial mount render time
 * - Re-render times (on significant updates)
 *
 * HAP-336: Observability - Add performance monitoring and metrics
 */

import * as React from 'react';
import { trackScreenRender } from '@/utils/performance';

/**
 * Monitor render performance of a screen or component.
 * Should be called at the top of the component function.
 *
 * @param screenName - Identifier for the screen (e.g., 'SessionView', 'MainView')
 * @param options - Configuration options
 */
export function usePerformanceMonitor(
    screenName: string,
    options: {
        /** Track re-renders, not just initial mount. Default: false */
        trackReRenders?: boolean;
        /** Minimum ms between tracked re-renders. Default: 500 */
        reRenderThrottle?: number;
    } = {}
): void {
    const { trackReRenders = false, reRenderThrottle = 500 } = options;

    // Track render start time
    const renderStartRef = React.useRef<number>(performance.now());
    const isMountedRef = React.useRef(false);
    const lastTrackTimeRef = React.useRef<number>(0);

    // Reset render start on each render
    renderStartRef.current = performance.now();

    React.useEffect(() => {
        const renderStart = renderStartRef.current;
        const now = Date.now();

        // Throttle re-render tracking
        if (isMountedRef.current && !trackReRenders) {
            return;
        }

        if (isMountedRef.current && now - lastTrackTimeRef.current < reRenderThrottle) {
            return;
        }

        // Use requestAnimationFrame to measure time until paint
        const frameId = requestAnimationFrame(() => {
            const duration = performance.now() - renderStart;
            const isInitialMount = !isMountedRef.current;

            trackScreenRender(
                isInitialMount ? screenName : `${screenName}_rerender`,
                duration
            );

            lastTrackTimeRef.current = now;
            isMountedRef.current = true;
        });

        return () => {
            cancelAnimationFrame(frameId);
        };
    });
}

/**
 * A simpler version that only tracks initial mount.
 * Lower overhead than full usePerformanceMonitor.
 */
export function useTrackMountTime(screenName: string): void {
    const renderStartRef = React.useRef<number>(performance.now());
    const hasTrackedRef = React.useRef(false);

    React.useEffect(() => {
        if (hasTrackedRef.current) {
            return;
        }

        const renderStart = renderStartRef.current;

        // Measure after paint
        const frameId = requestAnimationFrame(() => {
            const duration = performance.now() - renderStart;
            trackScreenRender(screenName, duration);
            hasTrackedRef.current = true;
        });

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, [screenName]);
}
