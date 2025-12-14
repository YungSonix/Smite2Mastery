import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

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
  getEnvVar(process.env.EXPO_PUBLIC_SUPABASE_URL) || 
  getEnvVar(Constants.expoConfig?.extra?.supabaseUrl) || 
  getEnvVar(Constants.manifest?.extra?.supabaseUrl) ||
  'https://ofewccajgulkurtpdyoj.supabase.co'; // Fallback value - ALWAYS use this if env vars fail
  
const SUPABASE_ANON_KEY = 
  getEnvVar(process.env.EXPO_PUBLIC_SUPABASE_KEY) || 
  getEnvVar(Constants.expoConfig?.extra?.supabaseKey) || 
  getEnvVar(Constants.manifest?.extra?.supabaseKey) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZXdjY2FqZ3Vsa3VydHBkeW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODA0MzYsImV4cCI6MjA4MTA1NjQzNn0.iKxzUpSsvGhEwrFMBkhjcawZvKuAm-OJpdnKLZpL3a0'; // Fallback value - ALWAYS use this if env vars fail

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
                            SUPABASE_URL.length > 10 && // At least a valid URL length
                            SUPABASE_ANON_KEY.length > 10 && // At least a valid key length
                            SUPABASE_URL.startsWith('http') && // Must be a valid URL
                            !SUPABASE_URL.includes('undefined') &&
                            !SUPABASE_ANON_KEY.includes('undefined');

// Force use of fallback values if validation fails (shouldn't happen, but safety check)
// ALWAYS ensure we have valid credentials - use fallback if needed
const FALLBACK_URL = 'https://ofewccajgulkurtpdyoj.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mZXdjY2FqZ3Vsa3VydHBkeW9qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0ODA0MzYsImV4cCI6MjA4MTA1NjQzNn0.iKxzUpSsvGhEwrFMBkhjcawZvKuAm-OJpdnKLZpL3a0';

const finalUrl = (hasValidCredentials && SUPABASE_URL && SUPABASE_URL.length > 10 && SUPABASE_URL.startsWith('http')) 
  ? SUPABASE_URL 
  : FALLBACK_URL;
const finalKey = (hasValidCredentials && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 10)
  ? SUPABASE_ANON_KEY 
  : FALLBACK_KEY;

// Debug logging - runs immediately when module loads
// Log on both web and native, but more detailed on web
const hasUrl = !!SUPABASE_URL && SUPABASE_URL.length > 0;
const hasKey = !!SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 0;
const fromEnv = !!(process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_URL.trim());
const urlPreview = SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : 'MISSING';
const keyPreview = SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.substring(0, 30) + '...' : 'MISSING';
const willUseRealClient = (finalUrl && finalKey && finalUrl.length > 10 && finalKey.length > 10);

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Detailed logging for web
  console.log('%c🔧 Supabase Config Check', 'color: #1e90ff; font-weight: bold; font-size: 14px;', {
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
    console.error('%c❌ Supabase credentials are invalid!', 'color: #ef4444; font-weight: bold;');
    console.error('💡 URL:', finalUrl || 'MISSING', `(${finalUrl?.length || 0} chars)`);
    console.error('💡 KEY:', finalKey ? 'Present (' + finalKey.length + ' chars)' : 'MISSING');
    console.error('💡 Original URL:', SUPABASE_URL || 'MISSING', `(${SUPABASE_URL?.length || 0} chars)`);
    console.error('💡 Original KEY:', SUPABASE_ANON_KEY ? 'Present (' + SUPABASE_ANON_KEY.length + ' chars)' : 'MISSING');
    console.error('💡 hasValidCredentials:', hasValidCredentials);
    console.error('💡 Make sure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY are set in Vercel for Production environment');
  } else {
    console.log('%c✅ Supabase Client Initialized', 'color: #10b981; font-weight: bold; font-size: 14px;');
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

