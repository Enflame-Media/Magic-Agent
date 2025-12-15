/**
 * Environment variable configuration for happy-app
 *
 * In React Native/Expo, environment variables work differently than Node.js:
 * - EXPO_PUBLIC_* variables are baked in at build time
 * - Runtime configuration uses expo-constants and app.config.js
 * - This module documents available configuration options
 */

export interface EnvConfig {
    /** Variable name */
    name: string;
    /** Description shown in documentation */
    description: string;
    /** Default value if not set */
    defaultValue?: string;
    /** Whether this is baked in at build time (EXPO_PUBLIC_*) */
    buildTime: boolean;
}

/**
 * Available environment variables for happy-app
 */
export const envConfig: EnvConfig[] = [
    // Build-time variables (EXPO_PUBLIC_*)
    {
        name: 'EXPO_PUBLIC_HAPPY_SERVER_URL',
        description: 'Happy server URL for API and WebSocket connections',
        defaultValue: 'https://happy-api.enflamemedia.com',
        buildTime: true,
    },

    // Debug variables
    {
        name: 'PUBLIC_EXPO_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING',
        description: 'Enable debug logging to server (dangerous - exposes session data)',
        buildTime: true,
    },
];

/**
 * Logs environment configuration status during app startup
 * Only logs in development mode
 */
export function logEnvStatus(): void {
    // __DEV__ is a React Native/Expo global that indicates development mode
    if (typeof __DEV__ === 'undefined' || !__DEV__) {
        return;
    }

    console.log('[envConfig] Environment configuration:');

    for (const config of envConfig) {
        // In RN/Expo, we can't easily check process.env at runtime for all vars
        // This is mainly for documentation
        console.log(`  ${config.name}:`);
        console.log(`    Description: ${config.description}`);
        if (config.defaultValue) {
            console.log(`    Default: ${config.defaultValue}`);
        }
        console.log(`    Build-time: ${config.buildTime}`);
    }
}

/**
 * Gets documentation for all environment variables (for .env.example generation)
 */
export function getEnvDocs(): string {
    const lines: string[] = [
        '# Happy App Environment Variables',
        '#',
        '# These variables are used during the Expo build process.',
        '# EXPO_PUBLIC_* variables are baked into the app at build time.',
        '',
    ];

    for (const config of envConfig) {
        lines.push(`# ${config.description}`);
        if (config.defaultValue) {
            lines.push(`# Default: ${config.defaultValue}`);
        }
        lines.push(`${config.name}=${config.defaultValue || ''}`);
        lines.push('');
    }

    return lines.join('\n');
}
