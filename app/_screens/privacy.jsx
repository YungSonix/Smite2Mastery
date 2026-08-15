import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { COLORS } from '../../lib/themeColors';
import { EXTERNAL_LINKS } from '../../config';

export default function PrivacyPage() {
  const openPrivacyPolicy = () => {
    Linking.openURL(EXTERNAL_LINKS.TERMS_POLICY).catch((err) => {
      console.error('Failed to open Privacy Policy:', err);
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <Text style={styles.bodyText}>
            Game data you browse (gods, items, patch notes) can stay on your device. If you create
            an account, post builds, use the shop, or play Scroll Trivia, some information is sent
            to our servers so those features work.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>🔒 Security Measures</Text>
          <Text style={styles.bodyText}>
            We use HTTPS for network calls and keep contest and account data on our host (not sold
            as an ad profile). Details:
          </Text>
          
          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• What stays on your device</Text>
            <Text style={styles.securityText}>
              Offline-style caches, builder drafts, and some minigame progress can stay in local
              storage on this device.
            </Text>
          </View>

          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• What we store if you use accounts or contests</Text>
            <Text style={styles.securityText}>
              Login and profile (display name, cosmetics, gold) and saved or posted builds. Scroll
              Trivia live-tab data is only for that contest and is deleted when the event closes
              (see the bottom of this page).
            </Text>
          </View>

          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• Secure Network Communication</Text>
            <Text style={styles.securityText}>
              Connections to our APIs and to linked sites use HTTPS.
            </Text>
          </View>

          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• Input Validation</Text>
            <Text style={styles.securityText}>
              Inputs are checked to reduce abuse (spam, injection). That is not a guarantee against
              every attack.
            </Text>
          </View>

          <View style={styles.securityItem}>
            <Text style={styles.securityTitle}>• Ads and analytics</Text>
            <Text style={styles.securityText}>
              We do not run third-party advertising in the app. On web we use Vercel Analytics and
              Speed Insights for traffic and performance, not to build an ad profile.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>📋 What we do not collect</Text>
          <Text style={styles.bodyText}>
            We do not collect:
          </Text>
          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Government ID, phone book, or payment card numbers</Text>
            <Text style={styles.listItem}>• GPS / precise device location</Text>
            <Text style={styles.listItem}>• Other websites or apps you have open (we cannot see those)</Text>
            <Text style={styles.listItem}>• What you type outside Smite Scroll / Scroll Trivia</Text>
          </View>
          <Text style={styles.bodyText}>
            We do not sell your contest or account data to advertisers.
          </Text>
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
            Last updated: August 15, 2026
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

        <View style={styles.section}>
          <Text style={styles.subsectionTitle}>📝 Scroll Trivia contests</Text>
          <Text style={styles.bodyText}>
            Live tab tracking is only for Scroll Trivia events. It is not used for shop, profile,
            builds, or anything else in Smite Scroll.
          </Text>
          <Text style={styles.bodyText}>
            Optional contests at /trivia ask for Discord Username and In-Game Name. While a contest
            is open, hosts can see who is taking it, roughly how many questions they have filled,
            whether the quiz tab is in front or in the background, and how many times that tab went
            to the background. We cannot see other sites, other tabs, or what you typed outside this
            quiz. Tab-away counts are not proof of cheating.
          </Text>
          <Text style={styles.bodyText}>
            When the event ends (close time, or the host unassigns the quiz), we delete those live
            session records (who is in the quiz, tab-away counts, in-progress pings). Submitted
            answers and names stay only so the host can pick winners, then the host can remove them.
            Do not play if you do not agree.
          </Text>
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
    backgroundColor: COLORS.bgVoid,
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
    backgroundColor: COLORS.bgDeep,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
  },
  sectionTitle: {
    color: COLORS.skySoft,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  subsectionTitle: {
    color: COLORS.brandBlue,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  bodyText: {
    color: COLORS.slate300,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  securityItem: {
    marginBottom: 20,
    paddingLeft: 8,
  },
  securityTitle: {
    color: COLORS.skySoft,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  securityText: {
    color: COLORS.slate300,
    fontSize: 14,
    lineHeight: 20,
  },
  listContainer: {
    marginTop: 8,
  },
  listItem: {
    color: COLORS.slate300,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
    paddingLeft: 8,
  },
  button: {
    backgroundColor: COLORS.brandBlue,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.brandBlue,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  emailLink: {
    marginTop: 8,
    padding: 12,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
  },
  emailLinkText: {
    color: COLORS.brandBlue,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  discordContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.bgElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
  },
  discordText: {
    color: COLORS.slate300,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
  },
  discordLabel: {
    color: COLORS.skySoft,
    fontWeight: '600',
  },
  discordNote: {
    color: COLORS.slate400,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    fontStyle: 'italic',
  },
  updateDate: {
    color: COLORS.slate400,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  trademarkFooter: {
    marginTop: 16,
    padding: 16,
    backgroundColor: COLORS.bgDeep,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
  },
  trademarkText: {
    color: COLORS.slate500,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
  },
});

