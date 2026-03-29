import React, { useState, lazy, Suspense } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { COLORS } from '../lib/themeColors';
import { WebView } from 'react-native-webview';
import { DEFAULT_TAB_STATE, EXTERNAL_LINKS, REMOTE_BASE_URLS } from '../config';

const IS_WEB = Platform.OS === 'web';

// Featured Twitch channels for the More page.
// These are the channels that can appear in the Featured Streamers section.
const FEATURED_TWITCH_CHANNELS = [
  'changebest',
  'thebiackeye',
  'bigggtony',
];
const DEFAULT_TWITCH_CHANNEL = FEATURED_TWITCH_CHANNELS[0];
import { useScreenDimensions } from '../hooks/useScreenDimensions';
const WordlePage = lazy(() => import('./wordle'));
const AbilityGamePage = lazy(() => import('./ability'));
const ProphecyPage = lazy(() => import('./prophecy'));
const ProfilePage = lazy(() => import('./profile'));
const ShopPage = lazy(() => import('./shop'));

export default function MorePage({ activeTab = DEFAULT_TAB_STATE.more, currentUsername = null, onNavigateToBuilds, onNavigateToGod, onNavigateToCustomBuild, onNavigateToMyBuilds, viewUsername = null, onNavigateBack = null, onSwitchToProfile = null, onOpenSmiteWars = null }) {
  // Use responsive screen dimensions
  const screenDimensions = useScreenDimensions();
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedTool, setSelectedTool] = useState(null);
  const [featuredChannelIndex, setFeaturedChannelIndex] = useState(0);

  const featuredChannel =
    FEATURED_TWITCH_CHANNELS[featuredChannelIndex] ?? DEFAULT_TWITCH_CHANNEL;

  if (activeTab === 'tools' && selectedTool === 'player-lookup') {
    return (
      <PlayerLookupScreen
        onBack={() => setSelectedTool(null)}
      />
    );
  }

  // If a game is selected, show it
  if (selectedGame === 'god-wordle') {
    return (
      <Suspense
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.brandBlue} />
          </View>
        }
      >
        <WordlePage gameMode="daily" onBack={() => setSelectedGame(null)} />
      </Suspense>
    );
  }

  if (selectedGame === 'guess-ability') {
    return (
      <Suspense
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.brandBlue} />
          </View>
        }
      >
        <AbilityGamePage onBack={() => setSelectedGame(null)} />
      </Suspense>
    );
  }

  if (selectedGame === 'prophecy') {
    return (
      <Suspense
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.goldAccent} />
          </View>
        }
      >
        <ProphecyPage onBack={() => setSelectedGame(null)} gameTitle="Smite Wars" />
      </Suspense>
    );
  }

  if (activeTab === 'shop') {
    return (
      <Suspense
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.amber} />
          </View>
        }
      >
        <ShopPage
          currentUsername={currentUsername}
          onNavigateToProfile={onSwitchToProfile}
          onNavigateToWordle={() => setSelectedGame('god-wordle')}
          onNavigateToAbility={() => setSelectedGame('guess-ability')}
        />
      </Suspense>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>More</Text>
          
          {activeTab === 'minigames' && (
            <>
              {/* Featured Streamers — Sponsored slot (buy "Featured Streamer" in Shop) */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Featured Streamers</Text>
                <Text style={styles.sectionNote}>
                  Support streamers. Unlock "Featured Streamer" in the Shop to get your Twitch here.
                </Text>
                <View style={styles.featuredStreamerCard}>
                  {IS_WEB && typeof window !== 'undefined' ? (
                    <iframe
                      title="Featured Twitch"
                      src={`${REMOTE_BASE_URLS.TWITCH_PLAYER}/?channel=${featuredChannel}&parent=${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}`}
                      style={styles.twitchIframe}
                      frameBorder="0"
                      allowFullScreen
                    />
                  ) : (
                    <WebView
                      source={{
                        uri: `${REMOTE_BASE_URLS.TWITCH_PLAYER}/?channel=${featuredChannel}&parent=localhost`,
                      }}
                      style={styles.twitchIframe}
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                    />
                  )}
                </View>
                <View style={styles.twitchChannelSelector}>
                  {FEATURED_TWITCH_CHANNELS.map((channel, index) => {
                    const isActive = channel === featuredChannel;
                    return (
                      <TouchableOpacity
                        key={channel}
                        style={[
                          styles.twitchChannelPill,
                          isActive && styles.twitchChannelPillActive,
                        ]}
                        onPress={() => setFeaturedChannelIndex(index)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.twitchChannelPillText,
                            isActive && styles.twitchChannelPillTextActive,
                          ]}
                        >
                          {channel}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Mini Games Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Mini Games</Text>
                <Text style={styles.sectionNote}>
                  Choose a mini game below to play. More games coming soon.
                </Text>
                <View style={styles.grid}>
                  {/* God Wordle - active game */}
                  <TouchableOpacity 
                    style={styles.card} 
                    onPress={() => setSelectedGame('god-wordle')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cardTitle}>God Wordle</Text>
                    <Text style={styles.cardDescription}>Guess the Smite 2 god in 6 tries.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.card} 
                    onPress={() => setSelectedGame('guess-ability')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cardTitle}>Guess the Ability</Text>
                    <Text style={styles.cardDescription}>Guess the god and ability (1-4).</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.card} 
                    onPress={() => {
                      if (typeof onOpenSmiteWars === 'function') onOpenSmiteWars();
                      else setSelectedGame('prophecy');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cardTitle}>Smite Wars</Text>
                    <Text style={styles.cardDescription}>Full-screen card war with Smite 2 gods. Deploy, attack, win.</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.card} onPress={() => { /* No action, TBD */ }}>
                    <Text style={styles.cardTitle}>Guess the Skin (TBD)</Text>
                    <Text style={styles.cardDescription}>Coming Soon</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.card} onPress={() => { /* No action, TBD */ }}>
                    <Text style={styles.cardTitle}>Guess the Item (TBD)</Text>
                    <Text style={styles.cardDescription}>Coming Soon</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.sectionNote}>Leaderboards for each game coming soon!</Text>
              </View>
            </>
          )}

          {activeTab === 'profile' && (
            <Suspense fallback={
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.brandBlue} />
              </View>
            }>
              <ProfilePage 
                key={`profile-${activeTab}-${viewUsername || 'self'}`}
                onNavigateToBuilds={onNavigateToBuilds} 
                onNavigateToGod={onNavigateToGod}
                onNavigateToCustomBuild={onNavigateToCustomBuild}
                onNavigateToMyBuilds={onNavigateToMyBuilds}
                viewUsername={viewUsername}
                onNavigateBack={onNavigateBack}
              />
            </Suspense>
          )}

          {activeTab === 'tools' && (
            <>
              {/* Tools Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tools</Text>
                <View style={styles.grid}>
                  <View style={[styles.card, styles.cardDisabled]}>
                    <Text style={styles.cardTitle}>Player Lookup</Text>
                    <Text style={styles.cardDescription}>Coming when API access is available.</Text>
                  </View>
                  <TouchableOpacity style={styles.card} onPress={() => {}}>
                    <Text style={styles.cardTitle}>Team Comp Builder</Text>
                    <Text style={styles.cardDescription}>Build team compositions</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.card} onPress={() => {}}>
                    <Text style={styles.cardTitle}>Damage Calculator</Text>
                    <Text style={styles.cardDescription}>Coming soon</Text>
                  </TouchableOpacity>
                </View>
              </View>
          
          {/* External Links Section */} 
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>External Resources</Text>
            <View style={styles.grid}>
              <TouchableOpacity 
                style={styles.card} 
                onPress={() => {
                  Linking.openURL(EXTERNAL_LINKS.TRACKER_SMITE2_HOME).catch((err) => {
                    console.error('Failed to open Tracker.gg:', err);
                  });
                }}
              >
                <Text style={styles.cardTitle}>Tracker Profile</Text>
                <Text style={styles.cardDescription}>View stats on Tracker.gg</Text>
              </TouchableOpacity>
            </View>
          </View>
            </>
          )}
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
    flexGrow: 1,
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  content: {
    padding: 20,
  },
  title: {
    color: COLORS.skySoft,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: COLORS.skySoft,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionNote: {
    color: COLORS.slate400,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  featuredStreamerCard: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    overflow: 'hidden',
    marginTop: 8,
    minHeight: 220,
  },
  twitchIframe: {
    width: '100%',
    height: 220,
    border: 0,
  },
  twitchChannelSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  twitchChannelPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    backgroundColor: COLORS.void2,
  },
  twitchChannelPillActive: {
    borderColor: COLORS.purple,
    backgroundColor: COLORS.slate800,
  },
  twitchChannelPillText: {
    color: COLORS.slate400,
    fontSize: 12,
    fontWeight: '600',
  },
  twitchChannelPillTextActive: {
    color: COLORS.orange,
  },
  twitchPlaceholder: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  twitchPlaceholderText: {
    color: COLORS.skySoft,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  twitchPlaceholderSub: {
    color: COLORS.slate500,
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_WEB ? 12 : 8,
    justifyContent: 'center',
  },
  cardDisabled: {
    opacity: 0.7,
  },
  card: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: 12,
    padding: IS_WEB ? 16 : 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    alignItems: 'center',
    marginBottom: IS_WEB ? 12 : 8,
    ...(IS_WEB
      ? {
          flexBasis: '45%',
          maxWidth: '45%',
        }
      : {
          flexBasis: '40%',
          maxWidth: 150,
        }),
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    color: COLORS.textLight,
    fontSize: IS_WEB ? 16 : 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDescription: {
    color: COLORS.slate400,
    fontSize: IS_WEB ? 12 : 11,
    textAlign: 'center',
  },
  inputBox: {
    backgroundColor: COLORS.bgDeep,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.gray200,
    fontSize: 14,
  },
  lookupButton: {
    flex: 1,
    backgroundColor: COLORS.brandBlue,
    borderRadius: 8,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.sky,
    alignItems: 'center',
  },
  lookupButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  playerStatsCard: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
  },
  playerStatsTitle: {
    color: COLORS.skySoft,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  playerStatsSubtitle: {
    color: COLORS.slate400,
    fontSize: 12,
    marginBottom: 8,
  },
  playerStatsSectionTitle: {
    color: COLORS.skyMuted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  playerStatsLine: {
    color: COLORS.gray200,
    fontSize: 12,
    marginBottom: 2,
  },
  overviewKpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    marginBottom: 4,
  },
  overviewKpi: {
    minWidth: 72,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: COLORS.slate900,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
  },
  overviewKpiLabel: {
    color: COLORS.slate400,
    fontSize: 10,
    marginBottom: 2,
  },
  overviewKpiValue: {
    color: COLORS.skySoft,
    fontSize: 14,
    fontWeight: '700',
  },
  overviewKpiSub: {
    color: COLORS.slate500,
    fontSize: 10,
    marginTop: 2,
  },
  matchesSummaryRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate800,
  },
  matchesSummaryLabel: {
    color: COLORS.slate400,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  matchesSummaryText: {
    color: COLORS.slate300,
    fontSize: 12,
  },
  lookupTabBar: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  lookupTab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: COLORS.slate900,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    alignItems: 'center',
  },
  lookupTabActive: {
    backgroundColor: COLORS.surfaceNavy,
    borderColor: COLORS.skySoft,
  },
  lookupTabText: {
    color: COLORS.slate400,
    fontSize: 11,
    fontWeight: '600',
  },
  lookupTabTextActive: {
    color: COLORS.skySoft,
  },
  godRowWrap: {
    gap: 6,
  },
  godRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  lookupGodIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: COLORS.slate800,
  },
  lookupGodIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: COLORS.slate800,
  },
  lookupGodIconPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupGodIconPlaceholderText: {
    color: COLORS.slate500,
    fontSize: 14,
  },
  lookupGodIconPlaceholderTextSmall: {
    color: COLORS.slate500,
    fontSize: 12,
  },
  godRowText: {
    flex: 1,
  },
  matchBlock: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate800,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  matchRowText: {
    flex: 1,
  },
  buildRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  buildLabel: {
    color: COLORS.slate400,
    fontSize: 11,
    marginRight: 4,
  },
  buildItems: {
    color: COLORS.slate300,
    fontSize: 11,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgVoid,
  },
});

