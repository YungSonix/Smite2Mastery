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

const IS_WEB = Platform.OS === 'web';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
const WordlePage = lazy(() => import('./wordle'));
const AbilityGamePage = lazy(() => import('./ability'));
const ProfilePage = lazy(() => import('./profile'));

export default function MorePage({ activeTab = 'minigames', onNavigateToBuilds, onNavigateToGod, onNavigateToCustomBuild, onNavigateToMyBuilds }) {
  // Use responsive screen dimensions
  const screenDimensions = useScreenDimensions();
  
  const [selectedGame, setSelectedGame] = useState(null);

  // If a game is selected, show it
  if (selectedGame === 'god-wordle') {
    return (
      <Suspense
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1e90ff" />
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
            <ActivityIndicator size="large" color="#1e90ff" />
          </View>
        }
      >
        <AbilityGamePage onBack={() => setSelectedGame(null)} />
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
                <ActivityIndicator size="large" color="#1e90ff" />
              </View>
            }>
              <ProfilePage 
                key={`profile-${activeTab}`}
                onNavigateToBuilds={onNavigateToBuilds} 
                onNavigateToGod={onNavigateToGod}
                onNavigateToCustomBuild={onNavigateToCustomBuild}
                onNavigateToMyBuilds={onNavigateToMyBuilds}
              />
            </Suspense>
          )}

          {activeTab === 'tools' && (
            <>
              {/* Tools Section */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Tools</Text>
            <View style={styles.grid}>
              <TouchableOpacity style={styles.card} onPress={() => {}}>
                <Text style={styles.cardTitle}>God Randomizer(TBD)</Text>
                <Text style={styles.cardDescription}>Random god selector</Text>
              </TouchableOpacity>
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
                  Linking.openURL('https://tracker.gg/smite2').catch((err) => {
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
    backgroundColor: '#071024',
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
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#7dd3fc',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionNote: {
    color: '#94a3b8',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: IS_WEB ? 12 : 8,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: IS_WEB ? 16 : 10,
    borderWidth: 1,
    borderColor: '#1e3a5f',
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
    color: '#e6eef8',
    fontSize: IS_WEB ? 16 : 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDescription: {
    color: '#94a3b8',
    fontSize: IS_WEB ? 12 : 11,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#071024',
  },
});

