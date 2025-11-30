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
import PrivacyPage from './privacy';

export default function HomePage() {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [articles, setArticles] = useState([
    {
      title: 'OB23 UPDATE - THE NINE-TAILED FOX UPDATE',
      date: '8 days ago',
      snippet: 'New Ported God Da Ji - General Melee Basic Attacks Damage Type: Physical Scaling Type: Strength Scaling Passive: Torture Blades Attacks and non-ultimate abilities cause enemies to bleed...',
      link: 'https://www.smite2.com/news/open-beta-23-update-notes/',
      image: 'https://webcdn.hirezstudios.com/smite2-cdn/Da_Ji_V5_e8e7f9d875.png',
    },
    {
      title: 'OPEN BETA 22 - KEEPER OF THE WILD UPDATE',
      date: '22 days ago',
      snippet: 'New Ported God Sylvanus - General Ranged Basic Attacks Damage Type: Magical Scaling Type: Intelligence Scaling Passive: Nature\'s Bounty When your abilities hit or are deployed...',
      link: 'https://www.smite2.com/news/open-beta-22-update-notes/',
      image: 'https://webcdn.hirezstudios.com/smite2-cdn/Blog_Header_Promo_Assets_2560x695_6_20cd38af6d.jpg',
    },
    {
      title: 'OPEN BETA 21 - GODDESS OF THE MAGIC UPDATE',
      date: '1 month ago',
      snippet: 'Stay updated with the latest patch notes, balance changes, and updates from SMITE 2. Check out new gods, item changes, and gameplay improvements.',
      link: 'https://www.smite2.com/news/open-beta-21-update-notes/',
      image: 'https://webcdn.hirezstudios.com/smite2-cdn/Blog_Header_Promo_Assets_2560x695_5_da7ccb9465.jpg',
    }
  ]);
  const [imageErrors, setImageErrors] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    // Fetch images from the news page
    fetch('https://www.smite2.com/news')
      .then(response => response.text())
      .then(html => {
        // Parse HTML to find images matching the pattern: large_Blog_Header_Promo_Assets_2560x695_{number}_{hash}.jpg or .png
        // Pattern: large_Blog_Header_Promo_Assets_2560x695_ followed by a number, underscore, and random hash
        const imagePattern = /large_Blog_Header_Promo_Assets_2560x695_\d+_[a-f0-9]+\.(jpg|png)/gi;
        const urlRegex = /https:\/\/webcdn\.hirezstudios\.com\/smite2-cdn\/large_Blog_Header_Promo_Assets_2560x695_\d+_[a-f0-9]+\.(jpg|png)/gi;
        
        const matches = [];
        let match;
        
        // First, try to find images with the specific class pattern
        const classRegex = /<img[^>]*class="[^"]*aspect-\[16\/9\][^"]*"[^>]*src="(https:\/\/webcdn\.hirezstudios\.com\/smite2-cdn\/[^"]+)"[^>]*>/gi;
        while ((match = classRegex.exec(html)) !== null) {
          const imageUrl = match[1];
          // Check if it matches the blog header pattern
          if (imageUrl && imagePattern.test(imageUrl)) {
            matches.push(imageUrl);
          }
        }
        
        // If we didn't find enough, search for all images matching the pattern in the HTML
        if (matches.length < 2) {
          while ((match = urlRegex.exec(html)) !== null) {
            const imageUrl = match[0];
            // Avoid duplicates
            if (!matches.includes(imageUrl)) {
              matches.push(imageUrl);
            }
          }
        }
        
        // Sort matches to ensure consistent ordering (by the number in the filename)
        matches.sort((a, b) => {
          const numA = parseInt(a.match(/2560x695_(\d+)_/)?.[1] || '0');
          const numB = parseInt(b.match(/2560x695_(\d+)_/)?.[1] || '0');
          return numB - numA; // Sort descending (newest first)
        });
        
        // Update articles with found images (first 3 images for the 3 articles)
        // Skip first article (OB23) as it already has an image
        if (matches.length > 0) {
          setArticles(prevArticles => {
            const updated = [...prevArticles];
            // Assign images to OB22 and OB21 (indices 1 and 2)
            // Take the first 2 images found (excluding OB23 which is already set)
            if (matches.length >= 1 && updated[1] && !updated[1].image) {
              updated[1].image = matches[0];
            }
            if (matches.length >= 2 && updated[2] && !updated[2].image) {
              updated[2].image = matches[1];
            }
            return updated;
          });
        }
        setLoadingImages(false);
      })
      .catch(err => {
        console.error('Error fetching news images:', err);
        setLoadingImages(false);
      });
  }, []);

  const openArticleLink = (url) => {
    Linking.openURL(url).catch((err) => {
      console.error('Failed to open URL:', err);
    });
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
          <Text style={styles.sectionTitle}>About This App</Text>
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

        {/* Smite 2 News Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SMITE 2 News</Text>
          <Text style={styles.newsDescription}>
            Stay updated with the latest SMITE 2 news, patch notes, and updates directly from the official SMITE 2 website.
          </Text>
          
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
                  
                  if (loadingImages && index > 0 && !hasValidImage) {
                    return (
                      <View style={styles.articleImagePlaceholder}>
                        <ActivityIndicator size="small" color="#7dd3fc" />
                      </View>
                    );
                  }
                  
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
});

