const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export function getGoogleMapsApiKey(): string {
  if (!API_KEY) {
    console.warn(
      '[GOKO] Google Maps API key not configured. ' +
        'Set VITE_GOOGLE_MAPS_API_KEY in .env file. ' +
        'See .env.example for setup instructions.'
    );
    return '';
  }
  return API_KEY;
}

export function isGoogleMapsConfigured(): boolean {
  return Boolean(API_KEY);
}
