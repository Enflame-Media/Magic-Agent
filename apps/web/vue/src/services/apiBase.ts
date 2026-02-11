const DEFAULT_PROD_API_URL = 'https://happy-api.enflamemedia.com';
const DEFAULT_DEV_API_URL = 'https://happy-api-dev.enflamemedia.com';

export function getApiBaseUrl(): string {
  const configuredUrl = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_HAPPY_SERVER_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname.includes('happy-vue-dev.') || hostname === 'localhost' || hostname === '127.0.0.1') {
      return DEFAULT_DEV_API_URL;
    }
  }

  if (import.meta.env.DEV) {
    return DEFAULT_DEV_API_URL;
  }

  return DEFAULT_PROD_API_URL;
}
