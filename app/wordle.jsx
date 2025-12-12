import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';

const IS_WEB = Platform.OS === 'web';

export default function WordlePage({ gameMode: initialGameMode = null, onBack = null }) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {onBack && (
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back to Menu</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.tbdContainer}>
          <Text style={styles.tbdIcon}>🚧</Text>
          <Text style={styles.tbdTitle}>Coming Soon</Text>
          <Text style={styles.tbdText}>This game mode is currently under development.</Text>
          <Text style={styles.tbdText}>Check back soon for updates!</Text>
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
  scrollContent: {
    padding: 20,
    ...(IS_WEB && {
      maxWidth: 1200,
      alignSelf: 'center',
      width: '100%',
    }),
  },
  backButton: {
    backgroundColor: '#1e90ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  tbdContainer: {
    backgroundColor: '#0b1226',
    borderRadius: 12,
    padding: 40,
    borderWidth: 1,
    borderColor: '#1e3a5f',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 400,
  },
  tbdIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  tbdTitle: {
    color: '#7dd3fc',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  tbdText: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
});
