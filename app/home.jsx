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
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrivacyPage from './privacy';

// ============================================================================
// EASY CONFIGURATION - Just update these values when a new patch releases!
// ============================================================================

const APP_VERSION_CONFIG = {
  currentVersion: '1.4', // Current app version
  previousVersion: '1.3', // Previous version (for comparison)
  updateNotes: [
    'Added more updated information about Conquest',
    'Added base stats section to god pages with level slider',
    'Added role icons next to role names on god pages',
    'Improved god page header design and responsiveness',
    'Fixed slider interaction for better user experience',
  ], 
};

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
// BUG REPORT CONFIGURATION
// ============================================================================
// To set up Formspree (free service that sends emails directly):
// 1. Go to https://formspree.io and create a free account
// 2. Create a new form and set the recipient email to your yungsonix email
// 3. Get your form endpoint (e.g., https://formspree.io/f/YOUR_FORM_ID)
// 4. Replace the BUG_REPORT_ENDPOINT below with your Formspree endpoint
// Formspree will send emails directly to your configured email address
const BUG_REPORT_ENDPOINT = 'https://formspree.io/f/xqarlgol'; // Replace with your Formspree endpoint
// ============================================================================

export default function HomePage() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [articles, setArticles] = useState([]);
  const [imageErrors, setImageErrors] = useState({});
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [downloadingUpdate, setDownloadingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState(null); // 'success', 'error', 'up-to-date', null
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const [bugReportData, setBugReportData] = useState({
    description: '',
    device: '',
    os: '',
    steps: '',
    expected: '',
    actual: '',
    additional: '',
  });
  const [submittingBugReport, setSubmittingBugReport] = useState(false);

  // Get update information from expo-updates
  const {
    currentlyRunning,
    isUpdateAvailable,
    isUpdatePending,
  } = Updates.useUpdates();

  // Check for app update and show popup
  useEffect(() => {
    const checkForAppUpdate = async () => {
      try {
        const lastSeenVersion = await AsyncStorage.getItem('lastSeenAppVersion');
        const currentVersion = APP_VERSION_CONFIG.currentVersion;
        
        // If we haven't seen this version before, or it's different from last seen, show popup
        if (!lastSeenVersion || lastSeenVersion !== currentVersion) {
          setShowUpdatePopup(true);
          // Store that we've seen this version
          await AsyncStorage.setItem('lastSeenAppVersion', currentVersion);
        }
      } catch (error) {
        console.error('Error checking app version:', error);
      }
    };
    
    checkForAppUpdate();
  }, []);

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

  const reportBug = () => {
    setShowBugReportModal(true);
  };

  const resetBugReportForm = () => {
    setBugReportData({
      description: '',
      device: '',
      os: '',
      steps: '',
      expected: '',
      actual: '',
      additional: '',
    });
  };

  const submitBugReport = async () => {
    // Validate required fields
    if (!bugReportData.description.trim()) {
      Alert.alert('Required Field', 'Please describe the bug or crash you encountered.');
      return;
    }

    setSubmittingBugReport(true);

    try {
      const formData = {
        _subject: `Bug Report - SMITE 2 App v${APP_VERSION_CONFIG.currentVersion}`,
        _format: 'plain',
        'App Version': APP_VERSION_CONFIG.currentVersion,
        'Bug Description': bugReportData.description.trim(),
        'Device': bugReportData.device.trim() || 'Not specified',
        'OS': bugReportData.os.trim() || 'Not specified',
        'Steps to Reproduce': bugReportData.steps.trim() || 'Not specified',
        'Expected Behavior': bugReportData.expected.trim() || 'Not specified',
        'Actual Behavior': bugReportData.actual.trim() || 'Not specified',
        'Additional Notes': bugReportData.additional.trim() || 'None',
      };

      const response = await fetch(BUG_REPORT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        Alert.alert(
          'Thank You!',
          'Your bug report has been submitted successfully. We appreciate your feedback!',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowBugReportModal(false);
                resetBugReportForm();
              },
            },
          ]
        );
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      Alert.alert(
        'Submission Error',
        'Unable to submit bug report. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmittingBugReport(false);
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
      {/* Update Popup Modal */}
      <Modal
        visible={showUpdatePopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUpdatePopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.updatePopupContainer}>
            <View style={styles.updatePopupHeader}>
              <Text style={styles.updatePopupTitle}>App Updated</Text>
              <TouchableOpacity
                style={styles.updatePopupCloseButton}
                onPress={() => setShowUpdatePopup(false)}
              >
                <Text style={styles.updatePopupCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.updatePopupContent}>
              <Text style={styles.updatePopupVersion}>
                V{APP_VERSION_CONFIG.previousVersion} → V{APP_VERSION_CONFIG.currentVersion}
              </Text>
              <View style={styles.updateNotesContainer}>
                <Text style={styles.updateNotesTitle}>What's New:</Text>
                {APP_VERSION_CONFIG.updateNotes.map((note, index) => (
                  <View key={index} style={styles.updateNoteItem}>
                    <Text style={styles.updateNoteBullet}>•</Text>
                    <Text style={styles.updateNoteText}>{note}</Text>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity
              style={styles.updatePopupButton}
              onPress={() => setShowUpdatePopup(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.updatePopupButtonText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bug Report Modal */}
      <Modal
        visible={showBugReportModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowBugReportModal(false);
          resetBugReportForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bugReportModalContainer}>
            <View style={styles.bugReportModalHeader}>
              <Text style={styles.bugReportModalTitle}>Report a Bug or Crash</Text>
              <TouchableOpacity
                style={styles.bugReportModalCloseButton}
                onPress={() => {
                  setShowBugReportModal(false);
                  resetBugReportForm();
                }}
              >
                <Text style={styles.bugReportModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.bugReportModalContent} showsVerticalScrollIndicator={true}>
              <Text style={styles.bugReportFieldLabel}>
                Bug Description <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.bugReportInput, styles.bugReportTextArea]}
                placeholder="Describe the bug or crash you encountered..."
                placeholderTextColor="#64748b"
                value={bugReportData.description}
                onChangeText={(text) => setBugReportData({ ...bugReportData, description: text })}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />

              <Text style={styles.bugReportFieldLabel}>Device or Browser (optional)</Text>
              <TextInput
                style={styles.bugReportInput}
                placeholder="e.g., iPhone 14, Samsung Galaxy S23"
                placeholderTextColor="#64748b"
                value={bugReportData.device}
                onChangeText={(text) => setBugReportData({ ...bugReportData, device: text })}
              />

              <Text style={styles.bugReportFieldLabel}>OS Version (optional)</Text>
              <TextInput
                style={styles.bugReportInput}
                placeholder="e.g., iOS 17.0, Android 13"
                placeholderTextColor="#64748b"
                value={bugReportData.os}
                onChangeText={(text) => setBugReportData({ ...bugReportData, os: text })}
              />

              <Text style={styles.bugReportFieldLabel}>Steps to Reproduce (optional)</Text>
              <TextInput
                style={[styles.bugReportInput, styles.bugReportTextArea]}
                placeholder="1. \n2. \n3."
                placeholderTextColor="#64748b"
                value={bugReportData.steps}
                onChangeText={(text) => setBugReportData({ ...bugReportData, steps: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.bugReportFieldLabel}>Expected Behavior (optional)</Text>
              <TextInput
                style={[styles.bugReportInput, styles.bugReportTextArea]}
                placeholder="What should have happened?"
                placeholderTextColor="#64748b"
                value={bugReportData.expected}
                onChangeText={(text) => setBugReportData({ ...bugReportData, expected: text })}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <Text style={styles.bugReportFieldLabel}>Actual Behavior (optional)</Text>
              <TextInput
                style={[styles.bugReportInput, styles.bugReportTextArea]}
                placeholder="What actually happened?"
                placeholderTextColor="#64748b"
                value={bugReportData.actual}
                onChangeText={(text) => setBugReportData({ ...bugReportData, actual: text })}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <Text style={styles.bugReportFieldLabel}>Additional Notes (optional)</Text>
              <TextInput
                style={[styles.bugReportInput, styles.bugReportTextArea]}
                placeholder="Any other relevant information..."
                placeholderTextColor="#64748b"
                value={bugReportData.additional}
                onChangeText={(text) => setBugReportData({ ...bugReportData, additional: text })}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />

              <Text style={styles.bugReportInfoText}>
                App Version: {APP_VERSION_CONFIG.currentVersion}
              </Text>
            </ScrollView>
            <View style={styles.bugReportModalFooter}>
              <TouchableOpacity
                style={[styles.bugReportCancelButton, submittingBugReport && styles.bugReportButtonDisabled]}
                onPress={() => {
                  setShowBugReportModal(false);
                  resetBugReportForm();
                }}
                disabled={submittingBugReport}
              >
                <Text style={styles.bugReportCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bugReportSubmitButton, submittingBugReport && styles.bugReportButtonDisabled]}
                onPress={submitBugReport}
                disabled={submittingBugReport}
              >
                {submittingBugReport ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.bugReportSubmitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* App Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This App </Text>
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
          <TouchableOpacity
            style={styles.viewUpdateNotesButton}
            onPress={() => setShowUpdatePopup(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.viewUpdateNotesButtonText}>View Update Notes (V{APP_VERSION_CONFIG.currentVersion})</Text>
          </TouchableOpacity>
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

        {/* Report a Bug Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report a Bug or Crash</Text>
          <Text style={styles.bioText}>
            Found a bug or experiencing crashes? We'd love to hear about it! Your feedback helps us improve the app.
          </Text>
          <Text style={styles.bioText}>
            When reporting, please include:
          </Text>
          <View style={styles.bugReportList}>
            <Text style={styles.bugReportItem}>• App version: {APP_VERSION_CONFIG.currentVersion}</Text>
            <Text style={styles.bugReportItem}>• Device and OS information</Text>
            <Text style={styles.bugReportItem}>• Steps to reproduce the issue</Text>
            <Text style={styles.bugReportItem}>• Expected vs actual behavior</Text>
          </View>
          <TouchableOpacity
            style={styles.bugReportButton}
            onPress={reportBug}
            activeOpacity={0.7}
          >
            <Text style={styles.bugReportButtonIcon}>🐛</Text>
            <Text style={styles.bugReportButtonText}>Report a Bug or Crash</Text>
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
  viewUpdateNotesButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0f1724',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
  },
  viewUpdateNotesButtonText: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
  },
  // Update Popup Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  updatePopupContainer: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1e90ff',
    width: '100%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  updatePopupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  updatePopupTitle: {
    color: '#7dd3fc',
    fontSize: 24,
    fontWeight: '700',
  },
  updatePopupCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updatePopupCloseText: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  updatePopupContent: {
    marginBottom: 20,
  },
  updatePopupVersion: {
    color: '#1e90ff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  updateNotesContainer: {
    marginTop: 8,
  },
  updateNotesTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  updateNoteItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  updateNoteBullet: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
    width: 20,
  },
  updateNoteText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  updatePopupButton: {
    backgroundColor: '#1e90ff',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  updatePopupButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Bug Report Section Styles
  bugReportList: {
    marginTop: 8,
    marginBottom: 16,
    paddingLeft: 8,
  },
  bugReportItem: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  bugReportButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  bugReportButtonIcon: {
    fontSize: 20,
  },
  bugReportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Bug Report Modal Styles
  bugReportModalContainer: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ef4444',
    width: '95%',
    maxWidth: 600,
    height: '90%',
    maxHeight: '90%',
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    flexDirection: 'column',
  },
  bugReportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  bugReportModalTitle: {
    color: '#ef4444',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  bugReportModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  bugReportModalCloseText: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  bugReportModalContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 10,
  },
  bugReportFieldLabel: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  requiredStar: {
    color: '#ef4444',
  },
  bugReportInput: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    color: '#e6eef8',
    fontSize: 14,
    marginBottom: 4,
  },
  bugReportTextArea: {
    minHeight: 150,
    paddingTop: 12,
  },
  bugReportInfoText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  bugReportModalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    gap: 12,
  },
  bugReportCancelButton: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  bugReportCancelButtonText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  bugReportSubmitButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ef4444',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bugReportSubmitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  bugReportButtonDisabled: {
    opacity: 0.6,
  },
});

