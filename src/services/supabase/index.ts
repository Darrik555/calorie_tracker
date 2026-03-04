import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { Database } from '../../types/supabase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Missing Supabase Environment Variables.");
}

// Create a custom storage adapter that checks if 'window' exists (fixes SSR crashes)
const webSafeStorage = {
  getItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return AsyncStorage.getItem(key);
    }
    return Promise.resolve(null);
  },
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') {
      return AsyncStorage.setItem(key, value);
    }
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') {
      return AsyncStorage.removeItem(key);
    }
    return Promise.resolve();
  },
};

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || '', 
  {
  auth: {
    storage: webSafeStorage, // Use the custom adapter here
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});