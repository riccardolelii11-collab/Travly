import PocketBase from 'pocketbase';

const envUrl = import.meta.env.VITE_POCKETBASE_URL;

// Use VITE_POCKETBASE_URL if configured, otherwise default to https://pocketbase.tagliaetrasforma.it
export const pocketbaseUrl = envUrl || 'https://pocketbase.tagliaetrasforma.it';

export const pb = new PocketBase(pocketbaseUrl);
