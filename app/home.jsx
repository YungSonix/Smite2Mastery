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
  Platform,
} from 'react-native';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrivacyPage from './privacy';
import { useScreenDimensions } from '../hooks/useScreenDimensions';

// ============================================================================
// EASY CONFIGURATION - Just update these values when a new patch releases!
// ============================================================================

const APP_VERSION_CONFIG = {
  currentVersion: '2.0.0', // Current app version
  previousVersion: '1.1.0', // Previous version (for comparison)
  updateNotes: [
    'Updated all pages.',
    'Added new features and improvements.',
    'New God builder page.',
    'Custom Profiles page.',
    'Added scaling to god pages.',
    'Gods slider is now draggable.',
    'Added new channels to Guides section.',
    'Improved Web performance.',
    'Fixed some bugs and accessibility issues.',
  ], 
};

// Version History - Add new versions here when releasing updates
// The current version will automatically be added to this list when you update APP_VERSION_CONFIG
const VERSION_HISTORY = [
  {
    version: '1.1.0',
    date: '2025-12-09', // Format: YYYY-MM-DD
    updateNotes: [
      'Gods slider now draggable.',
      'Added new channels to Guides section',
      'Updated home page.',
      'Made improvements while in a god/item page.',
      'Improved Web performance.',
      'Fixed some bugs.',
    ],
  },
  {
    version: '1.0.0',
    date: '2025-12-07', // Format: YYYY-MM-DD
    updateNotes: [
      'Initial release of the SMITE 2 App.',

      'Added app review form and bug report form.',
      'Added update status section to the home page.',
    ],
  },
 
];

const NEWS_CONFIG = {
  // Latest Open Beta Patch Info
  openBeta: {
    version: 25, // Update this number for new patches
    title: 'Open Beta 25 - Goddess of the Sky Update', // Update this title
    link: 'https://www.smite2.com/news/open-beta-25-update-notes/', // Update this link
    image: 'https://webcdn.hirezstudios.com/smite2-cdn/Blog_Header_Image_Nut_Default_11r2_2560x695_de720a4b2c.jpg', // Update this image link
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
const APP_REVIEW_ENDPOINT = 'https://formspree.io/f/meoyzvyg'; // App Review Form endpoint
const MISSING_OUTDATED_ENDPOINT = 'https://formspree.io/f/xdkqlezy'; // Missing/Outdated Feature Report endpoint
// ============================================================================

export default function HomePage({ setCurrentPage, setPatchHubSubTab }) {
  // Use responsive screen dimensions
  const screenDimensions = useScreenDimensions();
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
    additional: '',
  });
  const [submittingBugReport, setSubmittingBugReport] = useState(false);
  const [showAppReviewModal, setShowAppReviewModal] = useState(false);
  const [appReviewData, setAppReviewData] = useState({
    iphoneModel: '',
    confusing: '',
    likeMost: '',
    recommendScale: 5,
    loadingIssues: '',
    speedScale: 3,
    wishFeature: '',
    otherApps: '',
  });
  const [submittingAppReview, setSubmittingAppReview] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showFeedbackSection, setShowFeedbackSection] = useState(false);
  const [showAppUpdates, setShowAppUpdates] = useState(false);
  const [showNewsSection, setShowNewsSection] = useState(false);
  const [showPrivacySection, setShowPrivacySection] = useState(false);
  const [showMissingOutdatedModal, setShowMissingOutdatedModal] = useState(false);
  const [missingOutdatedData, setMissingOutdatedData] = useState({
    type: '', // 'missing' or 'outdated'
    description: '',
  });
  const [submittingMissingOutdated, setSubmittingMissingOutdated] = useState(false);

  // Get update information from expo-updates
  const {
    currentlyRunning,
    isUpdateAvailable,
    isUpdatePending,
  } = Updates.useUpdates();

  // Hide scrollbars on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        * {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        *::-webkit-scrollbar {
          display: none;
        }
      `;
      document.head.appendChild(style);
      return () => {
        if (document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, []);

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

  const openAppReviewForm = () => {
    setShowAppReviewModal(true);
  };

  const openMissingOutdatedForm = () => {
    setShowMissingOutdatedModal(true);
  };

  const resetMissingOutdatedForm = () => {
    setMissingOutdatedData({
      type: '',
      description: '',
    });
  };

  const submitMissingOutdated = async () => {
    // Validate required fields
    if (!missingOutdatedData.type) {
      Alert.alert('Required Field', 'Please select if this is a missing feature or outdated.');
      return;
    }
    if (!missingOutdatedData.description.trim()) {
      Alert.alert('Required Field', 'Please write and tell us what it is.');
      return;
    }

    setSubmittingMissingOutdated(true);

    try {
      const formData = {
        _subject: `Missing/Outdated Feature Report - SMITE 2 App v${APP_VERSION_CONFIG.currentVersion}`,
        _format: 'plain',
        'Type': missingOutdatedData.type === 'missing' ? 'Something is missing' : 'Outdated',
        'Description': missingOutdatedData.description.trim(),
        'App Version': APP_VERSION_CONFIG.currentVersion,
      };

      const response = await fetch(MISSING_OUTDATED_ENDPOINT, {
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
          'Your report has been submitted successfully. We appreciate your feedback!',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowMissingOutdatedModal(false);
                resetMissingOutdatedForm();
              },
            },
          ]
        );
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting missing/outdated report:', error);
      Alert.alert(
        'Submission Error',
        'Unable to submit report. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmittingMissingOutdated(false);
    }
  };

  const resetAppReviewForm = () => {
    setAppReviewData({
      iphoneModel: '',
      confusing: '',
      likeMost: '',
      recommendScale: 5,
      loadingIssues: '',
      speedScale: 3,
      wishFeature: '',
      otherApps: '',
    });
  };

  const submitAppReview = async () => {
    // Validate required fields
    if (!appReviewData.iphoneModel) {
      Alert.alert('Required Field', 'Please select your iPhone model.');
      return;
    }
    if (!appReviewData.confusing.trim()) {
      Alert.alert('Required Field', 'Please answer if anything felt confusing.');
      return;
    }
    if (!appReviewData.likeMost.trim()) {
      Alert.alert('Required Field', 'Please tell us what you like most about the app.');
      return;
    }
    if (!appReviewData.loadingIssues.trim()) {
      Alert.alert('Required Field', 'Please answer if you had any loading issues.');
      return;
    }
    if (!appReviewData.wishFeature.trim()) {
      Alert.alert('Required Field', 'Please tell us one feature you wish the app had.');
      return;
    }
    if (!appReviewData.otherApps.trim()) {
      Alert.alert('Required Field', 'Please answer about other apps or sites you use.');
      return;
    }

    setSubmittingAppReview(true);

    try {
      const formData = {
        _subject: `App Review Feedback - SMITE 2 App v${APP_VERSION_CONFIG.currentVersion}`,
        _format: 'plain',
        'iPhone Model': appReviewData.iphoneModel,
        'Was there anything confusing?': appReviewData.confusing.trim(),
        'What do you like most?': appReviewData.likeMost.trim(),
        'Recommendation Scale (1-10)': appReviewData.recommendScale,
        'Loading Issues': appReviewData.loadingIssues.trim(),
        'Speed Scale (1-5)': appReviewData.speedScale,
        'One feature you wish the app had': appReviewData.wishFeature.trim(),
        'Other apps or sites used': appReviewData.otherApps.trim(),
      };

      const response = await fetch(APP_REVIEW_ENDPOINT, {
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
          'Your feedback has been submitted successfully. We really appreciate your input!',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowAppReviewModal(false);
                resetAppReviewForm();
              },
            },
          ]
        );
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Error submitting app review:', error);
      Alert.alert(
        'Submission Error',
        'Unable to submit feedback. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSubmittingAppReview(false);
    }
  };

  const resetBugReportForm = () => {
    setBugReportData({
      description: '',
      device: '',
      os: '',
      steps: '',
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
    <View style={styles.outerContainer}>
      <ScrollView 
        style={styles.outerScrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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

      {/* Missing/Outdated Feature Modal */}
      <Modal
        visible={showMissingOutdatedModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowMissingOutdatedModal(false);
          resetMissingOutdatedForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.missingOutdatedModalContainer}>
            <View style={styles.missingOutdatedModalHeader}>
              <Text style={styles.missingOutdatedModalTitle}>Report a Missing Feature or Outdated</Text>
              <TouchableOpacity
                style={styles.missingOutdatedModalCloseButton}
                onPress={() => {
                  setShowMissingOutdatedModal(false);
                  resetMissingOutdatedForm();
                }}
              >
                <Text style={styles.missingOutdatedModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.missingOutdatedModalContent} showsVerticalScrollIndicator={true}>
              <Text style={styles.missingOutdatedFieldLabel}>
                Is this feature missing something or is it outdated? <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.missingOutdatedOptionsContainer}>
                <TouchableOpacity
                  style={[
                    styles.missingOutdatedOptionButton,
                    missingOutdatedData.type === 'missing' && styles.missingOutdatedOptionButtonActive,
                  ]}
                  onPress={() => setMissingOutdatedData({ ...missingOutdatedData, type: 'missing' })}
                >
                  <Text
                    style={[
                      styles.missingOutdatedOptionText,
                      missingOutdatedData.type === 'missing' && styles.missingOutdatedOptionTextActive,
                    ]}
                  >
                    Something is missing
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.missingOutdatedOptionButton,
                    missingOutdatedData.type === 'outdated' && styles.missingOutdatedOptionButtonActive,
                  ]}
                  onPress={() => setMissingOutdatedData({ ...missingOutdatedData, type: 'outdated' })}
                >
                  <Text
                    style={[
                      styles.missingOutdatedOptionText,
                      missingOutdatedData.type === 'outdated' && styles.missingOutdatedOptionTextActive,
                    ]}
                  >
                    Outdated
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.missingOutdatedFieldLabel}>
                Please write and tell me what it is <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.missingOutdatedInput, styles.missingOutdatedTextArea]}
                placeholder="Describe what is missing or outdated..."
                placeholderTextColor="#64748b"
                value={missingOutdatedData.description}
                onChangeText={(text) => setMissingOutdatedData({ ...missingOutdatedData, description: text })}
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />

              <Text style={styles.missingOutdatedInfoText}>
                App Version: {APP_VERSION_CONFIG.currentVersion}
              </Text>
            </ScrollView>
            <View style={styles.missingOutdatedModalFooter}>
              <TouchableOpacity
                style={[styles.missingOutdatedCancelButton, submittingMissingOutdated && styles.missingOutdatedButtonDisabled]}
                onPress={() => {
                  setShowMissingOutdatedModal(false);
                  resetMissingOutdatedForm();
                }}
                disabled={submittingMissingOutdated}
              >
                <Text style={styles.missingOutdatedCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.missingOutdatedSubmitButton, submittingMissingOutdated && styles.missingOutdatedButtonDisabled]}
                onPress={submitMissingOutdated}
                disabled={submittingMissingOutdated}
              >
                {submittingMissingOutdated ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.missingOutdatedSubmitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* App Review Modal */}
      <Modal
        visible={showAppReviewModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowAppReviewModal(false);
          resetAppReviewForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.appReviewModalContainer}>
            <View style={styles.appReviewModalHeader}>
              <Text style={styles.appReviewModalTitle}>App Review Feedback</Text>
              <TouchableOpacity
                style={styles.appReviewModalCloseButton}
                onPress={() => {
                  setShowAppReviewModal(false);
                  resetAppReviewForm();
                }}
              >
                <Text style={styles.appReviewModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.appReviewModalContent} showsVerticalScrollIndicator={true}>
              <Text style={styles.appReviewFieldLabel}>
                1. What iPhone do you currently have? <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.appReviewDropdown}>
                <TouchableOpacity
                  style={styles.appReviewDropdownButton}
                  onPress={() => {
                    Alert.alert(
                      'Select iPhone Model',
                      '',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'N/A using browser instead', onPress: () => setAppReviewData({ ...appReviewData, iphoneModel: 'N/A using browser instead' }) },
                        { text: '12 (mini, max, pro, or pro max)', onPress: () => setAppReviewData({ ...appReviewData, iphoneModel: '12 (mini, max, pro, or pro max)' }) },
                        { text: '13 (mini, max, pro, or pro max)', onPress: () => setAppReviewData({ ...appReviewData, iphoneModel: '13 (mini, max, pro, or pro max)' }) },
                        { text: '14 (mini, max, pro, or pro max)', onPress: () => setAppReviewData({ ...appReviewData, iphoneModel: '14 (mini, max, pro, or pro max)' }) },
                        { text: '15 (mini, max, pro, or pro max)', onPress: () => setAppReviewData({ ...appReviewData, iphoneModel: '15 (mini, max, pro, or pro max)' }) },
                        { text: '16 (mini, max, pro, or pro max)', onPress: () => setAppReviewData({ ...appReviewData, iphoneModel: '16 (mini, max, pro, or pro max)' }) },
                        { text: '17 (mini, max, pro, or pro max)', onPress: () => setAppReviewData({ ...appReviewData, iphoneModel: '17 (mini, max, pro, or pro max)' }) },
                      ]
                    );
                  }}
                >
                  <Text style={[styles.appReviewDropdownText, !appReviewData.iphoneModel && styles.appReviewPlaceholder]}>
                    {appReviewData.iphoneModel || 'Select iPhone model...'}
                  </Text>
                  <Text style={styles.appReviewDropdownArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.appReviewFieldLabel}>
                2. Was there anything that felt confusing to you as a user? <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.appReviewInput, styles.appReviewTextArea]}
                placeholder="Describe anything that felt confusing..."
                placeholderTextColor="#64748b"
                value={appReviewData.confusing}
                onChangeText={(text) => setAppReviewData({ ...appReviewData, confusing: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.appReviewFieldLabel}>
                3. What do you like most about this app? <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.appReviewInput, styles.appReviewTextArea]}
                placeholder="Tell us what you like most..."
                placeholderTextColor="#64748b"
                value={appReviewData.likeMost}
                onChangeText={(text) => setAppReviewData({ ...appReviewData, likeMost: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.appReviewFieldLabel}>
                4. On a scale of 1 to 10, how likely are you to recommend this app? <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.appReviewScaleContainer}>
                <Text style={styles.appReviewScaleLabel}>Unlikely</Text>
                <View style={styles.appReviewScaleButtons}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.appReviewScaleButton,
                        appReviewData.recommendScale === num && styles.appReviewScaleButtonActive,
                      ]}
                      onPress={() => setAppReviewData({ ...appReviewData, recommendScale: num })}
                    >
                      <Text
                        style={[
                          styles.appReviewScaleButtonText,
                          appReviewData.recommendScale === num && styles.appReviewScaleButtonTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.appReviewScaleLabel}>Very Likely</Text>
              </View>
              <Text style={styles.appReviewScaleValue}>Selected: {appReviewData.recommendScale}/10</Text>

              <Text style={styles.appReviewFieldLabel}>
                5. Did you have any issues loading any information? (Whether Images or text) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.appReviewInput, styles.appReviewTextArea]}
                placeholder="Describe any loading issues..."
                placeholderTextColor="#64748b"
                value={appReviewData.loadingIssues}
                onChangeText={(text) => setAppReviewData({ ...appReviewData, loadingIssues: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <Text style={styles.appReviewFieldLabel}>
                6. Does the app feel fast or slow when you use it? (Any input lag) <Text style={styles.requiredStar}>*</Text>
              </Text>
              <View style={styles.appReviewScaleContainer}>
                <Text style={styles.appReviewScaleLabel}>Slow</Text>
                <View style={styles.appReviewScaleButtons}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.appReviewScaleButton,
                        appReviewData.speedScale === num && styles.appReviewScaleButtonActive,
                      ]}
                      onPress={() => setAppReviewData({ ...appReviewData, speedScale: num })}
                    >
                      <Text
                        style={[
                          styles.appReviewScaleButtonText,
                          appReviewData.speedScale === num && styles.appReviewScaleButtonTextActive,
                        ]}
                      >
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.appReviewScaleLabel}>Fast</Text>
              </View>
              <Text style={styles.appReviewScaleValue}>Selected: {appReviewData.speedScale}/5</Text>

              <Text style={styles.appReviewFieldLabel}>
                7. What's ONE feature you wish my app had? <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.appReviewInput, styles.appReviewTextArea]}
                placeholder="Tell us one feature you'd like to see..."
                placeholderTextColor="#64748b"
                value={appReviewData.wishFeature}
                onChangeText={(text) => setAppReviewData({ ...appReviewData, wishFeature: text })}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={styles.appReviewFieldLabel}>
                8. What other apps or sites do you use to get smite 2 information and what do you feel they do better? <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                style={[styles.appReviewInput, styles.appReviewTextArea]}
                placeholder="Share other apps or sites you use..."
                placeholderTextColor="#64748b"
                value={appReviewData.otherApps}
                onChangeText={(text) => setAppReviewData({ ...appReviewData, otherApps: text })}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </ScrollView>
            <View style={styles.appReviewModalFooter}>
              <TouchableOpacity
                style={[styles.appReviewCancelButton, submittingAppReview && styles.appReviewButtonDisabled]}
                onPress={() => {
                  setShowAppReviewModal(false);
                  resetAppReviewForm();
                }}
                disabled={submittingAppReview}
              >
                <Text style={styles.appReviewCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.appReviewSubmitButton, submittingAppReview && styles.appReviewButtonDisabled]}
                onPress={submitAppReview}
                disabled={submittingAppReview}
              >
                {submittingAppReview ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.appReviewSubmitButtonText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

        {/* App Header with Icon */}
        <View style={styles.appHeaderSection}>
          <View style={styles.appIconContainer}>
            <Image
              source={require('../assets/icon.png')}
              style={styles.appIcon}
              resizeMode="contain"
              accessibilityLabel="SMITE 2 Mastery app icon"
            />
          </View>
          <Text style={styles.appHeaderTitle}>SMITE 2 Mastery</Text>
          <Text style={styles.appHeaderSubtitle}>Your Complete SMITE 2 Companion</Text>
        </View>

        {/* App Bio Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This App</Text>
          <Text style={styles.bioText}>
            Welcome to the SMITE 2 App! This app provides comprehensive information about all gods, abilities, items, gamemodes and so much more in SMITE 2.
          </Text>
          <Text style={styles.bioText}>
            Browse through community builds, explore the complete database of gods and items, filter by pantheons and stats, and stay up to date with the latest SMITE 2 news and patch notes.
          </Text>
          <Text style={styles.bioText}>
            Whether you're looking for the perfect build for your favorite god or researching item stats, this app has everything you need to enhance your SMITE 2 experience.
          </Text>
        </View>

        {/* Hero Banner with Latest Patch */}
        <View style={styles.heroBanner}>
          <Image
            source={{ uri: NEWS_CONFIG.openBeta.image }}
            style={styles.heroImage}
            resizeMode="contain"
            contentFit="contain"
            onError={() => {
              // Fallback if image fails
            }}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>{NEWS_CONFIG.openBeta.title}</Text>
            <Text style={styles.heroSubtitle}>Latest Patch - Open Beta {NEWS_CONFIG.openBeta.version}</Text>
            <View style={styles.heroButtonsContainer}>
              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => {
                  if (setCurrentPage) {
                    setCurrentPage('patchhub');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.heroButtonText}>Read Patch Notes →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroButton}
                onPress={() => openArticleLink('https://www.smite2.com/news/')}
                activeOpacity={0.7}
              >
                <Text style={styles.heroButtonText}>Show Latest Smite 2 News →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* More Info Section */}
        <View style={styles.section}>
          <View style={styles.expandableSectionHeader}>
            <Text style={styles.sectionTitle}>More Info</Text>
            <TouchableOpacity
              style={styles.expandableSectionToggle}
              onPress={() => setShowAppUpdates(!showAppUpdates)}
              activeOpacity={0.7}
            >
              <Text style={styles.expandableSectionToggleText}>
                {showAppUpdates ? '▼ Hide' : '▶ Show'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {showAppUpdates && (
            <View style={styles.expandableSectionContent}>
              {/* App Updates Subsection */}
              <Text style={styles.subSectionTitle}>App Updates</Text>
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

          {/* Version History - Expandable Section */}
          <TouchableOpacity
            style={styles.versionHistoryToggle}
            onPress={() => setShowVersionHistory(!showVersionHistory)}
            activeOpacity={0.7}
          >
            <Text style={styles.versionHistoryToggleText}>
              {showVersionHistory ? '▼ Hide' : '▶ Show'} Version History
            </Text>
          </TouchableOpacity>
          
          {showVersionHistory && (
            <View style={styles.versionHistoryContainer}>
              <Text style={styles.bioText}>
                View update notes and changes from previous app versions.
              </Text>
              {VERSION_HISTORY.map((versionData, index) => (
                <View key={index} style={styles.versionCard}>
                  <View style={styles.versionCardHeader}>
                    <Text style={styles.versionNumber}>Version {versionData.version}</Text>
                    {versionData.date && (
                      <Text style={styles.versionDate}>
                        {new Date(versionData.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    )}
                  </View>
                  <View style={styles.versionNotesContainer}>
                    {versionData.updateNotes.map((note, noteIndex) => (
                      <View key={noteIndex} style={styles.versionNoteItem}>
                        <Text style={styles.versionNoteBullet}>•</Text>
                        <Text style={styles.versionNoteText}>{note}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              {VERSION_HISTORY.length === 0 && (
                <Text style={styles.noVersionsText}>No previous versions available.</Text>
              )}
            </View>
          )}

              {/* Privacy & Security Subsection */}
              <Text style={styles.subSectionTitle}>Privacy & Security</Text>
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

              {/* Feedback & Reports Subsection */}
              <Text style={styles.subSectionTitle}>Feedback & Reports</Text>
          <Text style={styles.bioText}>
            Share your feedback, report issues, or suggest improvements. Your input helps us make the app better!
          </Text>
            <View style={styles.feedbackSectionContent}>
              {/* App Feedback - Green */}
              <TouchableOpacity
                style={[styles.appFeedbackButton, { marginBottom: 12 }]}
                onPress={openAppReviewForm}
                activeOpacity={0.7}
              >
                <Text style={styles.appFeedbackButtonIcon}>⭐</Text>
                <Text style={styles.appFeedbackButtonText}>App Feedback</Text>
              </TouchableOpacity>

              {/* Feature Request - Orange */}
              <TouchableOpacity
                style={[styles.feedbackButton, { marginBottom: 12 }]}
                onPress={openMissingOutdatedForm}
                activeOpacity={0.7}
              >
                <Text style={styles.feedbackButtonIcon}>📝</Text>
                <Text style={styles.feedbackButtonText}>Request a Feature</Text>
              </TouchableOpacity>

              {/* Bug Report - Red */}
              <TouchableOpacity
                style={styles.bugReportButton}
                onPress={reportBug}
                activeOpacity={0.7}
              >
                <Text style={styles.bugReportButtonIcon}>🐛</Text>
                <Text style={styles.bugReportButtonText}>Report a Bug</Text>
              </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Trademark Footer */}
        <View style={styles.trademarkFooter}>
          <Text style={styles.trademarkText}>
            SMITE 2 is a registered trademark of Hi-Rez Studios. Trademarks are the property of their respective owners. Game materials copyright Hi-Rez Studios. Hi-Rez Studios has not endorsed and is not responsible for this site or its content.
          </Text>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#071024',
  },
  outerScrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    minHeight: '100%',
    backgroundColor: '#071024',
    ...(Platform.OS === 'web' && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
      paddingHorizontal: 20,
    }),
  },
  scrollView: {
    flex: 1,
    ...(Platform.OS === 'web' && {
      scrollbarWidth: 'none',
      msOverflowStyle: 'none',
    }),
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  appHeaderSection: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 24,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  appIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 24,
    backgroundColor: '#0f1724',
    padding: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#1e90ff',
    shadowColor: '#1e90ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appIcon: {
    width: '100%',
    height: '100%',
  },
  appHeaderTitle: {
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  appHeaderSubtitle: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  section: {
    marginBottom: 32,
    padding: 20,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  subSectionTitle: {
    color: '#7dd3fc',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 12,
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
    backgroundColor: '#0066cc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0066cc',
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
    backgroundColor: '#0066cc',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#0066cc',
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
  // Feedback & Reports Section Styles
  feedbackSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feedbackSectionToggle: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  feedbackSectionToggleText: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '600',
  },
  feedbackSectionContent: {
    marginTop: 12,
  },
  expandableSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expandableSectionToggle: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      minHeight: 36,
      transition: 'background-color 0.2s',
      userSelect: 'none',
    }),
  },
  expandableSectionToggleText: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '600',
  },
  expandableSectionContent: {
    marginTop: 8,
  },
  feedbackButton: {
    backgroundColor: '#ea580c',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ea580c',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  feedbackButtonIcon: {
    fontSize: 20,
  },
  feedbackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  appFeedbackButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  appFeedbackButtonIcon: {
    fontSize: 20,
  },
  appFeedbackButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Report Missing or Outdated Button Styles
  reportMissingButton: {
    backgroundColor: '#ea580c',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#f97316',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  reportMissingButtonIcon: {
    fontSize: 20,
  },
  reportMissingButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  formContainer: {
    marginTop: 12,
    width: '100%',
    height: 600,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: '#0f1724',
  },
  // App Review Form Button Styles
  // Legacy appReviewButton - kept for backward compatibility but not used in new layout
  appReviewButton: {
    backgroundColor: '#10b981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  appReviewButtonIcon: {
    fontSize: 20,
  },
  appReviewButtonText: {
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
  // App Review Modal Styles
  appReviewModalContainer: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#10b981',
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
  appReviewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  appReviewModalTitle: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  appReviewModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  appReviewModalCloseText: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  appReviewModalContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 10,
  },
  appReviewFieldLabel: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  appReviewInput: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    color: '#e6eef8',
    fontSize: 14,
    marginBottom: 4,
  },
  appReviewTextArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  appReviewDropdown: {
    marginBottom: 4,
  },
  appReviewDropdownButton: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appReviewDropdownText: {
    color: '#e6eef8',
    fontSize: 14,
    flex: 1,
  },
  appReviewPlaceholder: {
    color: '#64748b',
  },
  appReviewDropdownArrow: {
    color: '#7dd3fc',
    fontSize: 12,
    marginLeft: 8,
  },
  appReviewScaleContainer: {
    marginBottom: 8,
  },
  appReviewScaleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    gap: 1,
  },
  appReviewScaleButton: {
    flex: 1,
    maxWidth: 30,
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 4,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  appReviewScaleButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  appReviewScaleButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  appReviewScaleButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  appReviewScaleLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  appReviewScaleValue: {
    color: '#7dd3fc',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  appReviewModalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    gap: 12,
  },
  appReviewCancelButton: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  appReviewCancelButtonText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  appReviewSubmitButton: {
    flex: 1,
    backgroundColor: '#10b981',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  appReviewSubmitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  appReviewButtonDisabled: {
    opacity: 0.6,
  },
  // Version History Styles
  versionHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  versionHistoryContainer: {
    marginTop: 12,
  },
  versionHistoryToggle: {
    marginTop: 12,
    padding: 10,
    borderRadius: 6,
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
  },
  versionHistoryToggleText: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
  },
  versionCard: {
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  versionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  versionNumber: {
    color: '#1e90ff',
    fontSize: 18,
    fontWeight: '700',
  },
  versionDate: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
  },
  versionNotesContainer: {
    marginTop: 8,
  },
  versionNoteItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  versionNoteBullet: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 8,
    width: 20,
  },
  versionNoteText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  noVersionsText: {
    color: '#64748b',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  // Missing/Outdated Feature Modal Styles
  missingOutdatedModalContainer: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ea580c',
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
  missingOutdatedModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  missingOutdatedModalTitle: {
    color: '#ea580c',
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  missingOutdatedModalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  missingOutdatedModalCloseText: {
    color: '#e6eef8',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  missingOutdatedModalContent: {
    flex: 1,
    padding: 20,
    paddingBottom: 10,
  },
  missingOutdatedFieldLabel: {
    color: '#7dd3fc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  missingOutdatedOptionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 4,
  },
  missingOutdatedOptionButton: {
    flex: 1,
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missingOutdatedOptionButtonActive: {
    backgroundColor: '#ea580c',
    borderColor: '#ea580c',
  },
  missingOutdatedOptionText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  missingOutdatedOptionTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  missingOutdatedInput: {
    backgroundColor: '#0f1724',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    color: '#e6eef8',
    fontSize: 14,
    marginBottom: 4,
  },
  missingOutdatedTextArea: {
    minHeight: 150,
    paddingTop: 12,
  },
  missingOutdatedInfoText: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 16,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  missingOutdatedModalFooter: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    gap: 12,
  },
  missingOutdatedCancelButton: {
    flex: 1,
    backgroundColor: '#1e3a5f',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  missingOutdatedCancelButtonText: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '600',
  },
  missingOutdatedSubmitButton: {
    flex: 1,
    backgroundColor: '#ea580c',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ea580c',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  missingOutdatedSubmitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  missingOutdatedButtonDisabled: {
    opacity: 0.6,
  },
  // Hero Banner Styles
  heroBanner: {
    marginBottom: 32,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e3a5f',
    backgroundColor: 'transparent',
  },
  heroImage: {
    width: '100%',
    ...(Platform.OS === 'web' ? {
      height: 400,
      minHeight: 400,
    } : {
      height: 300,
      minHeight: 300,
    }),
    backgroundColor: 'transparent',
  },
  heroContent: {
    backgroundColor: '#071024',
    padding: Platform.OS === 'web' ? 24 : 20,
    borderTopWidth: 2,
    borderTopColor: '#1e90ff',
  },
  heroTitle: {
    color: '#7dd3fc',
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#cbd5e1',
    fontSize: Platform.OS === 'web' ? 18 : 16,
    marginBottom: 20,
  },
  heroButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroButton: {
    backgroundColor: '#1e90ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#1e90ff',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      minHeight: 44,
      transition: 'background-color 0.2s, transform 0.1s',
      userSelect: 'none',
      ':hover': {
        backgroundColor: '#0066cc',
        transform: 'scale(1.02)',
      },
      ':active': {
        transform: 'scale(0.98)',
      },
    }),
  },
  heroButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Quick Links Styles
  quickLinksContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  quickLinkCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#0f1724',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  quickLinkIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickLinkText: {
    color: '#e6eef8',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Catch Me Up Button
  catchMeUpButton: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      cursor: 'pointer',
      minHeight: 48,
      transition: 'background-color 0.2s',
      userSelect: 'none',
    }),
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  catchMeUpButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

