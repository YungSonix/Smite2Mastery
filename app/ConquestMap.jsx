import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import { conquestMapHtml } from '../data/_conquestMapHtml';

export default function ConquestMap() {
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.container}>
      <WebView
        source={{ 
          html: conquestMapHtml,
          baseUrl: 'file:///android_asset/' // For Android, adjust for iOS if needed
        }}
        style={styles.webview}
        scalesPageToFit={true}
        startInLoadingState={true}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        injectedJavaScript={`
          (function() {
            const meta = document.createElement('meta');
            meta.name = 'viewport';
            meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes';
            const head = document.getElementsByTagName('head')[0];
            if (head) {
              head.appendChild(meta);
            }
            
            // Adjust for mobile
            if (window.innerWidth <= 768) {
              document.body.style.zoom = "0.75";
            }
            
            // Replace image sources to use correct paths
            // Since WebView can't access local files directly, we'll handle errors gracefully
            const replaceImageSources = () => {
              const images = document.querySelectorAll('img[src^="data/Icons"]');
              images.forEach(img => {
                const originalSrc = img.getAttribute('src');
                // Add error handler for missing images
                img.onerror = function() {
                  this.style.display = 'none';
                };
              });
            };
            
            // Run after DOM is loaded
            if (document.readyState === 'loading') {
              document.addEventListener('DOMContentLoaded', replaceImageSources);
            } else {
              replaceImageSources();
            }
          })();
          true;
        `}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn('WebView error: ', nativeEvent);
          setLoading(false);
        }}
        renderLoading={() => (
          <View style={[styles.container, styles.centerContent]}>
            <ActivityIndicator size="large" color="#1e90ff" />
            <Text style={styles.loadingText}>Loading map...</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: 700,
    backgroundColor: '#0b1226',
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#cbd5e1',
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});

