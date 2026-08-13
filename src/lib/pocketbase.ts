import PocketBase from 'pocketbase';

const envUrl = import.meta.env.VITE_POCKETBASE_URL;

// Use VITE_POCKETBASE_URL if configured, otherwise default to HTTPS URL to prevent Mixed Content errors
export const pocketbaseUrl = envUrl || 'https://161.97.169.242:8090';

export const pb = new PocketBase(pocketbaseUrl);
