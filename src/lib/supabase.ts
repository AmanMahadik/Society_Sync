import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder-url.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-anon-key';

// Guard storage against server-side rendering (prerender) environments where window/localStorage is missing
const dummyStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
};

const authStorage = typeof window === 'undefined' ? dummyStorage : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Helper to convert a local file URI to an ArrayBuffer.
 * This is necessary in React Native / Expo to bypass the winterfill FormData bug
 * and upload files reliably to Supabase storage.
 */
export async function uriToArrayBuffer(localUri: string): Promise<ArrayBuffer> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as ArrayBuffer'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file as ArrayBuffer'));
    reader.readAsArrayBuffer(blob);
  });
}

