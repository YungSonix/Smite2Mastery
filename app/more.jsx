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
const ProfilePage = lazy(() => import('./profile'));

export default function MorePage({ activeTab = 'minigames', onNavigateToBuilds, onNavigateToGod, onNavigateToCustomBuild }) {
  // Use responsive screen dimensions
  const screenDimensions = useScreenDimensions();
  
  const [selectedGame, setSelectedGame] = useState(null);

  // If a game is selected, show it
  if (selectedGame) {
    return (
      <Suspense fallback={
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e90ff" />
        </View>
      }>
        <WordlePage gameMode={selectedGame} onBack={() => setSelectedGame(null)} />
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
                <View style={styles.grid}>
                  <TouchableOpacity style={styles.card} onPress={() => { /* No action, TBD */ }}>
                    <Text style={styles.cardTitle}>God Wordle (TBD)</Text>
                    <Text style={styles.cardDescription}>Coming Soon</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.card} onPress={() => { /* No action, TBD */ }}>
                    <Text style={styles.cardTitle}>Guess the Ability (TBD)</Text>
                    <Text style={styles.cardDescription}>Coming Soon</Text>
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
                onNavigateToBuilds={onNavigateToBuilds} 
                onNavigateToGod={onNavigateToGod}
                onNavigateToCustomBuild={onNavigateToCustomBuild}
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
                <Text style={styles.cardTitle}>God Randomizer</Text>
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
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#e6eef8',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  cardDescription: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#071024',
  },
});

