import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ErrorBoundary from './ErrorBoundary';
import { useEffect, useMemo } from 'react';
import * as Updates from 'expo-updates';

// Global error handler for unhandled promise rejections and errors
const setupGlobalErrorHandlers = () => {
  // Handle unhandled promise rejections
  if (typeof global !== 'undefined') {
    // Set up unhandled promise rejection handler (if supported)
    try {
      const originalUnhandledRejection = global.onunhandledrejection;
      global.onunhandledrejection = (event) => {
        console.error('Unhandled promise rejection:', event?.reason || event);
        // Prevent default crash behavior
        if (event && typeof event.preventDefault === 'function') {
          event.preventDefault();
        }
        if (originalUnhandledRejection) {
          originalUnhandledRejection(event);
        }
      };
    } catch (err) {
      console.warn('Could not set up unhandled rejection handler:', err);
    }

    // Handle global errors using ErrorUtils (React Native specific)
    try {
      if (global.ErrorUtils && typeof global.ErrorUtils.getGlobalHandler === 'function') {
        const originalHandler = global.ErrorUtils.getGlobalHandler();
        global.ErrorUtils.setGlobalHandler((error, isFatal) => {
          console.error('Global error handler caught:', error, 'isFatal:', isFatal);
          
          // Check if __DEV__ is defined (it should be in React Native/Expo)
          const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
          
          // In production, we want to prevent crashes from unhandled errors
          // Log the error but don't crash the app for non-fatal errors
          if (isFatal && isDev) {
            // In development, use the original handler for fatal errors
            if (originalHandler) {
              originalHandler(error, isFatal);
            }
          } else {
            // Log the error but don't crash
            console.error('Error caught by global handler:', error);
            // For non-fatal errors, we can continue
            if (!isFatal && originalHandler) {
              originalHandler(error, isFatal);
            }
          }
        });
      }
    } catch (err) {
      console.warn('Could not set up ErrorUtils handler:', err);
    }
  }
};

export default function RootLayout() {
  useEffect(() => {
    setupGlobalErrorHandlers();
    
    // Check for EAS Updates
    async function checkForUpdates() {
      if (__DEV__) {
        // Skip update checks in development
        return;
      }

      try {
        const update = await Updates.checkForUpdateAsync();
        
        if (update.isAvailable) {
          console.log('📦 Update available, downloading...');
          await Updates.fetchUpdateAsync();
          console.log('✅ Update downloaded, reloading app...');
          await Updates.reloadAsync();
        } else {
          console.log('✅ App is up to date');
        }
      } catch (error) {
        console.error('❌ Error checking for updates:', error);
        // Don't crash the app if update check fails
      }
    }

    checkForUpdates();
  }, []);

  // CRITICAL FIX: Minimal screen options with ONLY boolean primitives
  // The error suggests expo-router is passing string booleans to RNSScreen
  // We use the absolute minimum to avoid any potential type conversion issues
  const screenOptions = useMemo(() => {
    return {
      headerShown: false,
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Stack screenOptions={screenOptions} />
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

