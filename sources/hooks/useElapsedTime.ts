import { useEffect, useState } from 'react';

/**
 * Shared Timer Manager
 *
 * Instead of each useElapsedTime hook creating its own setInterval,
 * all hooks subscribe to a single shared interval. This reduces N intervals
 * to 1 interval when displaying multiple elapsed timers simultaneously.
 *
 * The interval is lazily created when the first subscriber joins and
 * automatically cleaned up when the last subscriber leaves.
 */
const subscribers = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function subscribe(callback: () => void): () => void {
    subscribers.add(callback);

    // Start the shared interval when first subscriber joins
    if (subscribers.size === 1 && intervalId === null) {
        intervalId = setInterval(() => {
            subscribers.forEach(cb => cb());
        }, 1000);
    }

    // Return unsubscribe function
    return () => {
        subscribers.delete(callback);

        // Stop the interval when last subscriber leaves
        if (subscribers.size === 0 && intervalId !== null) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };
}

/**
 * Hook to track elapsed time from a given timestamp.
 * Uses a shared interval across all instances to minimize CPU/battery usage.
 *
 * @param date - Start timestamp as Date or number (milliseconds), or null/undefined
 * @returns Elapsed time in seconds (floored)
 */
export function useElapsedTime(date: Date | number | null | undefined): number {
    const [elapsedSeconds, setElapsedSeconds] = useState(0);

    useEffect(() => {
        // Handle null/undefined dates
        if (!date) {
            setElapsedSeconds(0);
            return;
        }

        // Convert to timestamp if Date object
        const timestamp = date instanceof Date ? date.getTime() : date;

        // Update function to calculate elapsed seconds
        const updateElapsed = () => {
            const now = Date.now();
            const elapsed = Math.max(0, Math.floor((now - timestamp) / 1000));
            setElapsedSeconds(elapsed);
        };

        // Initial update (immediate, don't wait for first tick)
        updateElapsed();

        // Subscribe to shared timer
        return subscribe(updateElapsed);
    }, [date]);

    return elapsedSeconds;
}