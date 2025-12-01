import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';

export default function PrivacyPage() {
  const openPrivacyPolicy = () => {
    Linking.openURL('https://www.termsfeed.com/live/39fa5ec6-7ecb-4684-b2e2-99a6b1e4cde3').catch((err) => {
      console.error('Failed to open Privacy Policy:', err);
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <Text style={styles.bodyText}>
            Your privacy and data security are our top priorities. This app is designed with privacy-first principles.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>🔒 Security Measures</Text>
          <Text style={styles.bodyText}>
            We have implemented multiple layers of security to protect your information:
          </Text>
          
          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• No Data Collection</Text>
            <Text style={styles.securityText}>
              This app does not collect, store, or transmit any personal information. All data remains on your device.
            </Text>
          </View>

          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• Local Data Storage</Text>
            <Text style={styles.securityText}>
              All game data is stored locally on your device. No information is sent to external servers.
            </Text>
          </View>

          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• Secure Network Communication</Text>
            <Text style={styles.securityText}>
              When accessing external resources (like news articles), we only use HTTPS encrypted connections.
            </Text>
          </View>

          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• Input Validation</Text>
            <Text style={styles.securityText}>
              All user inputs are validated and sanitized to prevent malicious data injection.
            </Text>
          </View>

          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• No Third-Party Tracking</Text>
            <Text style={styles.securityText}>
              We do not use analytics, tracking, or advertising services that could collect your data.
            </Text>
          </View>

          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• Secure Code Practices</Text>
            <Text style={styles.securityText}>
              Our codebase follows security best practices to prevent vulnerabilities and data leaks.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>📋 What Data We Don't Collect</Text>
          <Text style={styles.bodyText}>
            To be completely transparent, here's what we explicitly do NOT collect:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Personal identification information</Text>
            <Text style={styles.listItem}>• Device identifiers</Text>
            <Text style={styles.listItem}>• Location data</Text>
            <Text style={styles.listItem}>• Usage analytics</Text>
            <Text style={styles.listItem}>• User preferences or settings</Text>
            <Text style={styles.listItem}>• Search queries or browsing history</Text>
            <Text style={styles.listItem}>• Any information sent to external servers</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>🌐 External Links</Text>
          <Text style={styles.bodyText}>
            This app may contain links to external websites (such as SMITE 2 news). When you click these links, 
            you will be directed to external sites. We are not responsible for the privacy practices of these external sites.
          </Text>
          <Text style={styles.bodyText}>
            We recommend reviewing the privacy policy of any external website you visit.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>📄 Privacy Policy</Text>
          <Text style={styles.bodyText}>
            For detailed information about our privacy practices, please review our full Privacy Policy.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={openPrivacyPolicy}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>View Full Privacy Policy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>🔄 Updates</Text>
          <Text style={styles.bodyText}>
            We may update our privacy and security measures from time to time. Any changes will be reflected 
            in this page and our Privacy Policy.
          </Text>
          <Text style={styles.updateDate}>
            Last updated: November 27, 2025
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>📧 Contact</Text>
          <Text style={styles.bodyText}>
            If you have any questions or concerns about privacy or security, please contact us at:
          </Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:[email protected]')}
            style={styles.emailLink}
          >
            <Text style={styles.emailLinkText}>[email protected]</Text>
          </TouchableOpacity>
          <Text style={styles.bodyText}>
            For faster contact, you can also message me on Discord:
          </Text>
          <View style={styles.discordContainer}>
            <Text style={styles.discordText}>
              <Text style={styles.discordLabel}>Username: </Text>
              yungsonix
            </Text>
            <Text style={styles.discordText}>
              <Text style={styles.discordLabel}>User ID: </Text>
              208316498878529536
            </Text>
            <Text style={styles.discordNote}>
              I'm also in the official SMITE Discord server, so you can ping me there!
            </Text>
          </View>
        </View>

        <View style={styles.trademarkFooter}>
          <Text style={styles.trademarkText}>
            SMITE 2 is a registered trademark of Hi-Rez Studios. Trademarks are the property of their respective owners. 
            Game materials copyright Hi-Rez Studios. Hi-Rez Studios has not endorsed and is not responsible for this site or its content.
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
    marginBottom: 24,
    padding: 20,
    backgroundColor: '#0b1226',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  sectionTitle: {
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  subsectionTitle: {
    color: '#1e90ff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  bodyText: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  securityItem: {
    marginBottom: 20,
    paddingLeft: 8,
  },
  securityTitle: {
    color: '#7dd3fc',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  securityText: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 20,
  },
  listContainer: {
    marginTop: 8,
  },
  listItem: {
    color: '#cbd5e1',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 8,
  },
  button: {
    backgroundColor: '#1e90ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#1e90ff',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  emailLink: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  emailLinkText: {
    color: '#1e90ff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  discordContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#0f1724',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  discordText: {
    color: '#cbd5e1',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  discordLabel: {
    color: '#7dd3fc',
    fontWeight: '600',
  },
  discordNote: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
  },
  updateDate: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  trademarkFooter: {
    marginTop: 16,
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
});

