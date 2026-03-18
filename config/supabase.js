import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { CONSOLE_STYLES, ENV_KEYS, SUPABASE_CONFIG } from '../config';

// Get Supabase credentials from environment variables
// Falls back to hardcoded values if env vars are not available
// This ensures it works in all environments (Expo dashboard, Vercel, local)
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

// Create a storage adapter that works on both web and native
const storageAdapter = Platform.OS === 'web' 
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

// Create Supabase client with storage adapter for session persistence
// The fallback values should ALWAYS be valid, so this should always be true
// Only use mock client if somehow both fallback values are also invalid
const hasValidCredentials = SUPABASE_URL && 
                            SUPABASE_ANON_KEY && 
                            typeof SUPABASE_URL === 'string' &&
                            typeof SUPABASE_ANON_KEY === 'string' &&
                            SUPABASE_URL.length > SUPABASE_CONFIG.MIN_URL_LENGTH &&
                            SUPABASE_ANON_KEY.length > SUPABASE_CONFIG.MIN_KEY_LENGTH &&
                            SUPABASE_URL.startsWith('http') && // Must be a valid URL
                            !SUPABASE_URL.includes('undefined') &&
                            !SUPABASE_ANON_KEY.includes('undefined');

// Force use of fallback values if validation fails (shouldn't happen, but safety check)
// ALWAYS ensure we have valid credentials - use fallback if needed
const FALLBACK_URL = SUPABASE_CONFIG.FALLBACK_URL;
const FALLBACK_KEY = SUPABASE_CONFIG.FALLBACK_ANON_KEY;

const finalUrl = (hasValidCredentials && SUPABASE_URL && SUPABASE_URL.length > SUPABASE_CONFIG.MIN_URL_LENGTH && SUPABASE_URL.startsWith('http')) 
  ? SUPABASE_URL 
  : FALLBACK_URL;
const finalKey = (hasValidCredentials && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > SUPABASE_CONFIG.MIN_KEY_LENGTH)
  ? SUPABASE_ANON_KEY 
  : FALLBACK_KEY;

// Debug logging - runs immediately when module loads
// Log on both web and native, but more detailed on web
const hasUrl = !!SUPABASE_URL && SUPABASE_URL.length > 0;
const hasKey = !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 0;
const fromEnv = !!(process.env[ENV_KEYS.EXPO_PUBLIC_SUPABASE_URL] && process.env[ENV_KEYS.EXPO_PUBLIC_SUPABASE_URL].trim());
const urlPreview = SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'MISSING';
const keyPreview = SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 30) + '...' : 'MISSING';
const willUseRealClient = (
  finalUrl &&
  finalKey &&
  finalUrl.length > SUPABASE_CONFIG.MIN_URL_LENGTH &&
  finalKey.length > SUPABASE_CONFIG.MIN_KEY_LENGTH
);

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Detailed logging for web
  console.log('%c🔧 Supabase Config Check', CONSOLE_STYLES.SUPABASE_CHECK, {
    hasUrl,
    hasKey,
    urlLength: SUPABASE_URL?.length || 0,
    keyLength: SUPABASE_ANON_KEY?.length || 0,
    fromEnv,
    usingFallback: !fromEnv,
    urlPreview,
    keyPreview,
    hasValidCredentials,
    willUseRealClient,
    finalUrlLength: finalUrl?.length || 0,
    finalKeyLength: finalKey?.length || 0,
  });
  
  if (!willUseRealClient) {
    console.error('%c❌ Supabase credentials are invalid!', CONSOLE_STYLES.SUPABASE_ERROR);
    console.error('💡 URL:', finalUrl || 'MISSING', `(${finalUrl?.length || 0} chars)`);
    console.error('💡 KEY:', finalKey ? 'Present (' + finalKey.length + ' chars)' : 'MISSING');
    console.error('💡 Original URL:', SUPABASE_URL || 'MISSING', `(${SUPABASE_URL?.length || 0} chars)`);
    console.error('💡 Original KEY:', SUPABASE_ANON_KEY ? 'Present (' + SUPABASE_ANON_KEY.length + ' chars)' : 'MISSING');
    console.error('💡 hasValidCredentials:', hasValidCredentials);
    console.error('💡 Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY are set in Vercel for Production environment');
  } else {
    console.log('%c✅ Supabase Client Initialized', CONSOLE_STYLES.SUPABASE_SUCCESS);
    console.log('✅ Using URL:', finalUrl.substring(0, 40) + '...');
    console.log('✅ Using KEY:', finalKey.substring(0, 40) + '...');
    console.log('✅ Client ready for use');
  }
} else {
  // Simple logging for native
  if (willUseRealClient) {
    console.log('✅ Supabase client initialized');
  } else {
    console.error('❌ Supabase credentials invalid');
  }
}

// ALWAYS create a real client - fallback values are guaranteed to be valid
// The fallback values are hardcoded and should always work
export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

