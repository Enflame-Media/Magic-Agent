/**
 * API Client for Happy Admin Dashboard
 *
 * Provides typed fetch functions for all metrics endpoints.
 * All requests include credentials for Better-Auth session handling.
 *
 * IMPORTANT: This frontend calls the separate happy-admin-api worker.
 * The API base URL is configured based on the environment.
 */

/**
 * API Base URL Configuration
 *
 * In development: http://localhost:8788 (local API worker)
 * In production: https://happy-admin-api.enflamemedia.com
 * In dev environment: https://happy-admin-api-dev.enflamemedia.com
 */
function getApiBaseUrl(): string {
    // Check if running in development (Vite dev server)
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;

        // Local development
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8788';
        }

        // Development environment
        if (hostname.includes('-dev.enflamemedia.com')) {
            return 'https://happy-admin-api-dev.enflamemedia.com';
        }

        // Production environment
        if (hostname.includes('.enflamemedia.com')) {
            return 'https://happy-admin-api.enflamemedia.com';
        }
    }

    // Fallback for SSR or unknown environments
    return 'https://happy-admin-api.enflamemedia.com';
}

/**
 * Cached API base URL (computed once on module load)
 */
export const API_BASE_URL = getApiBaseUrl();

/*
 * Type definitions matching the API response schemas
 */

export interface MetricsSummary {
    syncType: string;
    syncMode: string;
    count: number;
    avgDurationMs: number;
    p95DurationMs: number;
    successRate: number;
}

export interface TimeseriesPoint {
    timestamp: string;
    count: number;
    avgDurationMs: number;
}

export interface CacheHitRate {
    hits: number;
    misses: number;
    hitRate: number;
}

export interface ModeDistribution {
    full: number;
    incremental: number;
    cached: number;
    total: number;
}

export interface ApiResponse<T> {
    data: T;
    timestamp: string;
}

/*
 * Time range options for filtering
 */

export type TimeRange = '1h' | '6h' | '24h' | '7d';

export function timeRangeToHours(range: TimeRange): number {
    const mapping: Record<TimeRange, number> = {
        '1h': 1,
        '6h': 6,
        '24h': 24,
        '7d': 168,
    };
    return mapping[range];
}

/*
 * API Error class for typed error handling
 */

export class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public statusText: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

/*
 * CSRF Token Handling (HAP-616)
 */

/**
 * Get CSRF token from cookie
 *
 * The API sets a csrf-token cookie that must be included in the
 * X-CSRF-Token header for all state-changing requests (POST, PUT, DELETE, PATCH).
 *
 * @returns The CSRF token or undefined if not set
 */
function getCsrfToken(): string | undefined {
    if (typeof document === 'undefined') return undefined;

    return document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf-token='))
        ?.split('=')[1];
}

/*
 * Base fetch wrapper with error handling
 */

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    // Build full URL using API base URL
    const url = `${API_BASE_URL}${path}`;

    const response = await fetch(url, {
        credentials: 'include',
        ...options,
    });

    if (!response.ok) {
        throw new ApiError(
            `API request failed: ${response.status} ${response.statusText}`,
            response.status,
            response.statusText
        );
    }

    return response.json();
}

/**
 * Make a state-changing API request with CSRF protection
 *
 * SECURITY FIX (HAP-616): This function includes the X-CSRF-Token header
 * for all requests, protecting against Cross-Site Request Forgery attacks.
 *
 * Use this function for:
 * - POST requests (login, logout, create operations)
 * - PUT requests (update operations)
 * - DELETE requests (delete operations)
 * - PATCH requests (partial updates)
 *
 * @param url - Full URL to send the request to
 * @param options - Fetch options (method, body, etc.)
 * @returns The fetch Response object
 *
 * @example
 * ```typescript
 * // Login request
 * const response = await apiRequest(`${API_BASE_URL}/api/auth/sign-in/email`, {
 *     method: 'POST',
 *     body: JSON.stringify({ email, password }),
 * });
 * ```
 */
export async function apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const csrfToken = getCsrfToken();

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
    }

    return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });
}

/*
 * Metrics API functions
 */

/**
 * Fetch 24h metrics summary grouped by type and mode
 */
export async function fetchSummary(): Promise<ApiResponse<MetricsSummary[]>> {
    return apiFetch<ApiResponse<MetricsSummary[]>>('/api/metrics/summary');
}

/**
 * Fetch time-bucketed metrics for charts
 */
export async function fetchTimeseries(
    hours: number = 24,
    bucket: 'hour' | 'day' = 'hour'
): Promise<ApiResponse<TimeseriesPoint[]>> {
    const params = new URLSearchParams({
        hours: String(hours),
        bucket,
    });
    return apiFetch<ApiResponse<TimeseriesPoint[]>>(`/api/metrics/timeseries?${params}`);
}

/**
 * Fetch profile cache hit rate
 */
export async function fetchCacheHits(): Promise<ApiResponse<CacheHitRate>> {
    return apiFetch<ApiResponse<CacheHitRate>>('/api/metrics/cache-hits');
}

/**
 * Fetch sync mode distribution
 */
export async function fetchModeDistribution(): Promise<ApiResponse<ModeDistribution>> {
    return apiFetch<ApiResponse<ModeDistribution>>('/api/metrics/mode-distribution');
}

/*
 * Utility functions
 */

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) {
        return `${ms.toFixed(0)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

/**
 * Format number with locale-specific separators
 */
export function formatNumber(value: number): string {
    return value.toLocaleString();
}

/**
 * Format bytes for display (e.g., 1.5 MB)
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value.toFixed(2)} ${sizes[i]}`;
}

/*
 * Bundle Size Types (HAP-564)
 */

export interface BundleSizePoint {
    date: string;
    platform: string;
    avgTotalSize: number;
    avgJsSize: number;
    avgAssetsSize: number;
    buildCount: number;
}

export interface BundleSizeLatest {
    platform: string;
    branch: string;
    commitHash: string;
    totalSize: number;
    jsSize: number;
    assetsSize: number;
    timestamp: string;
}

/*
 * Bundle Size API Functions (HAP-564)
 */

/**
 * Fetch bundle size trends for charting
 */
export async function fetchBundleTrends(
    days: number = 30,
    platform?: 'ios' | 'android' | 'web',
    branch: string = 'main'
): Promise<ApiResponse<BundleSizePoint[]>> {
    const params = new URLSearchParams({
        days: String(days),
        branch,
    });
    if (platform) {
        params.set('platform', platform);
    }
    return apiFetch<ApiResponse<BundleSizePoint[]>>(`/api/metrics/bundle-trends?${params}`);
}

/**
 * Fetch latest bundle sizes per platform
 */
export async function fetchBundleLatest(): Promise<ApiResponse<BundleSizeLatest[]>> {
    return apiFetch<ApiResponse<BundleSizeLatest[]>>('/api/metrics/bundle-latest');
}

/*
 * Validation Metrics Types (HAP-582)
 */

export interface ValidationSummary {
    totalFailures: number;
    schemaFailures: number;
    unknownTypes: number;
    strictFailures: number;
    uniqueUsers: number;
    avgSessionDurationMs: number;
}

export interface UnknownTypeBreakdown {
    typeName: string;
    count: number;
    percentage: number;
}

export interface ValidationTimeseriesPoint {
    timestamp: string;
    totalFailures: number;
    schemaFailures: number;
    unknownTypes: number;
    strictFailures: number;
}

/*
 * Validation Metrics API Functions (HAP-582)
 */

/**
 * Fetch 24h validation failure summary
 */
export async function fetchValidationSummary(): Promise<ApiResponse<ValidationSummary>> {
    return apiFetch<ApiResponse<ValidationSummary>>('/api/metrics/validation-summary');
}

/**
 * Fetch unknown type breakdown
 */
export async function fetchValidationUnknownTypes(
    hours: number = 24,
    limit: number = 10
): Promise<{ data: UnknownTypeBreakdown[]; total: number; timestamp: string }> {
    const params = new URLSearchParams({
        hours: String(hours),
        limit: String(limit),
    });
    return apiFetch<{ data: UnknownTypeBreakdown[]; total: number; timestamp: string }>(
        `/api/metrics/validation-unknown-types?${params}`
    );
}

/**
 * Fetch validation timeseries data
 */
export async function fetchValidationTimeseries(
    hours: number = 24,
    bucket: 'hour' | 'day' = 'hour'
): Promise<ApiResponse<ValidationTimeseriesPoint[]>> {
    const params = new URLSearchParams({
        hours: String(hours),
        bucket,
    });
    return apiFetch<ApiResponse<ValidationTimeseriesPoint[]>>(
        `/api/metrics/validation-timeseries?${params}`
    );
}
