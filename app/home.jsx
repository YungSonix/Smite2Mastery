import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import * as Updates from 'expo-updates';
import PrivacyPage from './privacy';

// ============================================================================
// EASY CONFIGURATION - Just update these values when a new patch releases!
// ============================================================================
const NEWS_CONFIG = {
  // Latest Open Beta Patch Info
  openBeta: {
    version: 24, // Update this number for new patches
    title: 'Open Beta 24 - The Bear Goddess Update', // Update this title
    link: 'https://www.smite2.com/news/open-beta-24-update-notes/', // Update this link
    image: 'https://webcdn.hirezstudios.com/smite2-cdn/Blog_Header_Promo_Assets_2560x695_c7340cf8b6.jpg', // Update this image link
    snippet: 'Read the latest SMITE 2 Open Beta update notes and patch information.',
  },
  // Latest News Article
  latestNews: {
    title: 'SMITE 2 News',
    link: 'https://www.smite2.com/news',
    image: 'https://webcdn.hirezstudios.com/smite2-cdn/BLOG_Header_SMITE_2_2560x695_6f634f8313.jpg',
    snippet: 'Stay updated with the latest SMITE 2 news, patch notes, and updates.',
  },
};
// ============================================================================

export default function HomePage() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [articles, setArticles] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); // 'success', 'error', 'up-to-date', null

  // Get update information from expo-updates
  const {
    currentlyRunning,
    isUpdateAvailable,
    isUpdatePending,
  } = Updates.useUpdates();

  // Auto-reload if update is pending
  useEffect(() => {
    if (isUpdatePending) {
      setUpdateStatus('success');
      // Update has successfully downloaded; apply it now
      Updates.reloadAsync();
    }
  }, [isUpdatePending]);

  useEffect(() => {
    // Simple manual configuration - no auto-fetching needed
    const configuredArticles = [
      {
        title: NEWS_CONFIG.openBeta.title,
        date: 'Latest',
        snippet: NEWS_CONFIG.openBeta.snippet,
        link: NEWS_CONFIG.openBeta.link,
        image: NEWS_CONFIG.openBeta.image,
      },
      {
        title: NEWS_CONFIG.latestNews.title,
        date: 'Latest',
        snippet: NEWS_CONFIG.latestNews.snippet,
        link: NEWS_CONFIG.latestNews.link,
        image: NEWS_CONFIG.latestNews.image,
      },
    ];
    
    setArticles(configuredArticles);
    setLoadingArticles(false);
  }, []);

  const openArticleLink = (url) => {
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open URL:', err);
    });
  };

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    
    try {
      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        setUpdateStatus('available');
        // Automatically download if available
        await downloadUpdate();
      } else {
        setUpdateStatus('up-to-date');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdateStatus('error');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const downloadUpdate = async () => {
    setDownloadingUpdate(true);
    setUpdateStatus(null);
    
    try {
      await Updates.fetchUpdateAsync();
      setUpdateStatus('success');
      // Reload will happen automatically via useEffect when isUpdatePending becomes true
    } catch (error) {
      console.error('Error downloading update:', error);
      setUpdateStatus('error');
    } finally {
      setDownloadingUpdate(false);
    }
  };

  const getUpdateStatusMessage = () => {
    if (checkingUpdate) return 'Checking for updates...';
    if (downloadingUpdate) return 'Downloading update...';
    
    switch (updateStatus) {
      case 'success':
        return '✅ Update downloaded successfully! App will reload...';
      case 'available':
        return '📦 Update available! Downloading...';
      case 'up-to-date':
        return '✅ App is up to date';
      case 'error':
        return '❌ Error checking for updates. Please try again.';
      default:
        if (isUpdateAvailable) {
          return '📦 Update available - tap to download';
        }
        return currentlyRunning.isEmbeddedLaunch
          ? 'App is running from built-in code'
          : 'App is running an update';
    }
  };

  const getUpdateStatusColor = () => {
    switch (updateStatus) {
      case 'success':
        return '#10b981'; // green
      case 'up-to-date':
        return '#10b981'; // green
      case 'error':
        return '#ef4444'; // red
      case 'available':
        return '#f59e0b'; // orange
      default:
        return '#7dd3fc'; // blue
    }
  };

  if (showPrivacy) {
    return (
      <View style={styles.container}>
        <View style={styles.privacyHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setShowPrivacy(false)}
          >
            <Text style={styles.backButtonText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.privacyContainer}>
          <PrivacyPage />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* App Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This App.</Text>
          <Text style={styles.bioText}>
            Welcome to the SMITE 2 App! This app provides comprehensive information about all gods, items, and abilities in SMITE 2.
          </Text>
          <Text style={styles.bioText}>
            Browse through community builds, explore the complete database of gods and items, filter by pantheons and stats, and stay up to date with the latest SMITE 2 news and patch notes.
          </Text>
          <Text style={styles.bioText}>
            Whether you're looking for the perfect build for your favorite god or researching item stats, this app has everything you need to enhance your SMITE 2 experience.
          </Text>
        </View>

        {/* Update Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Updates</Text>
          <View style={styles.updateStatusContainer}>
            <Text style={[styles.updateStatusText, { color: getUpdateStatusColor() }]}>
              {getUpdateStatusMessage()}
            </Text>
          </View>
          <View style={styles.updateButtonsContainer}>
            <TouchableOpacity
              style={[styles.updateButton, (checkingUpdate || downloadingUpdate) && styles.updateButtonDisabled]}
              onPress={checkForUpdates}
              disabled={checkingUpdate || downloadingUpdate}
              activeOpacity={0.7}
            >
              {checkingUpdate || downloadingUpdate ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.updateButtonIcon}>🔄</Text>
              )}
              <Text style={styles.updateButtonText}>
                {checkingUpdate ? 'Checking...' : downloadingUpdate ? 'Downloading...' : 'Check for Updates'}
              </Text>
            </TouchableOpacity>
            {isUpdateAvailable && !downloadingUpdate && (
              <TouchableOpacity
                style={[styles.updateButton, styles.updateButtonDownload]}
                onPress={downloadUpdate}
                activeOpacity={0.7}
              >
                <Text style={styles.updateButtonIcon}>⬇️</Text>
                <Text style={styles.updateButtonText}>Download Update</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Smite 2 News Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SMITE 2 News</Text>
          <Text style={styles.newsDescription}>
            Stay updated with the latest SMITE 2 news, patch notes, and updates directly from the official SMITE 2 website.
          </Text>
          
          {loadingArticles ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#7dd3fc" />
              <Text style={styles.loadingText}>Loading latest news...</Text>
            </View>
          ) : (
            <>
              {/* Latest Articles */}
              <View style={styles.articlesContainer}>
                {articles.map((article, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.articleCard}
                    onPress={() => openArticleLink(article.link)}
                    activeOpacity={0.7}
                  >
                    {(() => {
                      // Check if image is valid (not null, not 'null' string, and not errored)
                      const hasValidImage = article.image && 
                                           article.image !== 'null' && 
                                           article.image !== null && 
                                           !imageErrors[index];
                      
                      if (hasValidImage) {
                        return (
                          <Image
                            source={{ uri: article.image }}
                            style={styles.articleImage}
                            resizeMode="cover"
                            onError={(error) => {
                              console.error(`Image load error for article ${index}:`, error);
                              setImageErrors(prev => ({ ...prev, [index]: true }));
                            }}
                          />
                        );
                      }
                      
                      return (
                        <View style={styles.articleImagePlaceholder}>
                          <Text style={styles.articleImagePlaceholderText}>SMITE 2</Text>
                        </View>
                      );
                    })()}
                    <View style={styles.articleContent}>
                      <Text style={styles.articleDate}>{article.date}</Text>
                      <Text style={styles.articleTitle}>{article.title}</Text>
                      <Text style={styles.articleSnippet} numberOfLines={3}>
                        {article.snippet}
                      </Text>
                      <Text style={styles.readMore}>Read More →</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* View Full News Page */}
          <View style={styles.fullNewsContainer}>
            <Text style={styles.webViewTitle}>View Full News Page</Text>
            <TouchableOpacity
              style={styles.fullNewsButton}
              onPress={() => openArticleLink('https://www.smite2.com/news')}
              activeOpacity={0.7}
            >
              <Text style={styles.fullNewsButtonText}>Open News Page in Browser</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy & Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <Text style={styles.bioText}>
            Your privacy is important to us. This app does not collect or store any personal information. 
            All data remains on your device.
          </Text>
          <TouchableOpacity
            style={styles.privacyButton}
            onPress={() => setShowPrivacy(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.privacyButtonText}>View Privacy & Security Policy</Text>
          </TouchableOpacity>
        </View>

        {/* Trademark Footer */}
        <View style={styles.trademarkFooter}>
          <Text style={styles.trademarkText}>
            SMITE 2 is a registered trademark of Hi-Rez Studios. Trademarks are the property of their respective owners. Game materials copyright Hi-Rez Studios. Hi-Rez Studios has not endorsed and is not responsible for this site or its content.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#071024',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  sectionTitle: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  bioText: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  newsDescription: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#7dd3fc',
    fontSize: 16,
    marginTop: 16,
  },
  newsButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  newsButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  newsButtonSubtext: {
    color: '#e6eef8',
    fontSize: 12,
    opacity: 0.8,
  },
  articlesContainer: {
    marginBottom: 24,
  },
  articleCard: {
    backgroundColor: '#0f1724',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  articleImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#1e3a5f',
  },
  articleImagePlaceholder: {
    width: '100%',
    height: 180,
    backgroundColor: '#1e3a5f',
    justifyContent: 'center',
    alignItems: 'center',
  },
  articleImagePlaceholderText: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
  },
  articleContent: {
    padding: 16,
  },
  articleDate: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 8,
  },
  articleTitle: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  articleSnippet: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  readMore: {
    color: '#1e90ff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  fullNewsContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  webViewTitle: {
    color: '#7dd3fc',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  fullNewsButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  fullNewsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  trademarkFooter: {
    marginTop: 32,
    padding: 16,
    backgroundColor: '#0b1226',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  trademarkText: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
  privacyHeader: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
    backgroundColor: '#0b1226',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  privacyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  privacyContainer: {
    flex: 1,
  },
  updateStatusContainer: {
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#0f1724',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  updateStatusText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  updateButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  updateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e90ff',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e90ff',
    minWidth: 120,
    gap: 6,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonDownload: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  updateButtonIcon: {
    fontSize: 16,
  },
  updateButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  updateSection: {
    marginBottom: 20,
    padding: 12,
  },
  updateSectionTitle: {
    fontSize: 20,
    marginBottom: 10,
  },
});

