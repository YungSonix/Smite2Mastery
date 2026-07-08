import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { ENV_KEYS, SUPABASE_CONFIG } from '../config';

const getEnvVar = (value) => {
  if (!value || value === 'undefined' || value === 'null' || value.trim() === '') {
    return null;
  }
  return value.trim();
};

const SUPABASE_URL =
  getEnvVar(process.env[ENV_KEYS.EXPO_PUBLIC_SUPABASE_URL]) ||
  getEnvVar(Constants.expoConfig?.extra?.supabaseUrl) ||
  getEnvVar(Constants.manifest?.extra?.supabaseUrl) ||
  SUPABASE_CONFIG.FALLBACK_URL;

const SUPABASE_ANON_KEY =
  getEnvVar(process.env[ENV_KEYS.EXPO_PUBLIC_SUPABASE_KEY]) ||
  getEnvVar(Constants.expoConfig?.extra?.supabaseKey) ||
  getEnvVar(Constants.manifest?.extra?.supabaseKey) ||
  SUPABASE_CONFIG.FALLBACK_ANON_KEY;

const storageAdapter =
  Platform.OS === 'web'
    ? {
        getItem: async (key) => {
          if (typeof window !== 'undefined' && window.localStorage) {
            return window.localStorage.getItem(key);
          }
          return null;
        },
        setItem: async (key, value) => {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem(key, value);
          }
        },
        removeItem: async (key) => {
          if (typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.removeItem(key);
          }
        },
      }
    : AsyncStorage;

const hasValidCredentials =
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  typeof SUPABASE_URL === 'string' &&
  typeof SUPABASE_ANON_KEY === 'string' &&
  SUPABASE_URL.length > SUPABASE_CONFIG.MIN_URL_LENGTH &&
  SUPABASE_ANON_KEY.length > SUPABASE_CONFIG.MIN_KEY_LENGTH &&
  SUPABASE_URL.startsWith('http') &&
  !SUPABASE_URL.includes('undefined') &&
  !SUPABASE_ANON_KEY.includes('undefined');

const finalUrl = hasValidCredentials ? SUPABASE_URL : '';
const finalKey = hasValidCredentials ? SUPABASE_ANON_KEY : '';

const mockClient = {
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: { code: 'MISSING_CONFIG' } }),
        maybeSingle: async () => ({ data: null, error: { code: 'MISSING_CONFIG' } }),
      }),
      order: () => ({ limit: async () => ({ data: [], error: { code: 'MISSING_CONFIG' } }) }),
    }),
    upsert: async () => ({ error: { code: 'MISSING_CONFIG' } }),
    update: () => ({ eq: async () => ({ error: { code: 'MISSING_CONFIG' } }) }),
    insert: async () => ({ error: { code: 'MISSING_CONFIG' } }),
  }),
  rpc: async () => ({ data: null, error: { code: 'MISSING_CONFIG' } }),
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({
      data: null,
      error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
    }),
    signUp: async () => ({
      data: null,
      error: { code: 'MISSING_CONFIG', message: 'Supabase configuration is missing' },
    }),
    signOut: async () => ({ error: null }),
  },
};

if (__DEV__) {
  if (!hasValidCredentials) {
    console.warn(
      '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY — using offline mock client.'
    );
  } else if (Platform.OS === 'web') {
    console.log('[supabase] Client configured (credentials from env).');
  }
}

export const supabase = hasValidCredentials
  ? createClient(finalUrl, finalKey, {
      auth: {
        storage: storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : mockClient;
