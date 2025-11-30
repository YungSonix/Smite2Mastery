import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  Linking,
  Alert,
} from 'react-native';

export default function PlayerProfilesPage() {
  const [platform, setPlatform] = useState('steam');
  const [userId, setUserId] = useState('');
  const [platformDropdownVisible, setPlatformDropdownVisible] = useState(false);

  const platforms = [
    { value: 'steam', label: 'Steam' },
    { value: 'epic', label: 'Epic Games' },
    { value: 'xbox', label: 'Xbox' },
    { value: 'playstation', label: 'PlayStation' },
  ];

  const handleSearch = async () => {
    if (!userId.trim()) {
      Alert.alert('Error', 'Please enter a user ID');
      return;
    }
    
    // Build the tracker.gg URL
    const url = `https://tracker.gg/smite2/profile/${platform}/${userId.trim()}/overview?gamemode=conquest&season=3`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open this URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open URL: ' + error.message);
    }
  };

  const selectedPlatformLabel = platforms.find(p => p.value === platform)?.label || 'Steam';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Player Profiles</Text>
        <Text style={styles.subtitle}>Search for player stats on Tracker.gg</Text>
      </View>

      <View style={styles.searchSection}>
        {platformDropdownVisible && (
          <Pressable
            style={styles.dropdownOverlay}
            onPress={() => setPlatformDropdownVisible(false)}
          />
        )}
        <View style={styles.searchRow}>
          <TouchableOpacity
            style={styles.platformButton}
            onPress={() => setPlatformDropdownVisible(!platformDropdownVisible)}
          >
            <Text style={styles.platformButtonText}>{selectedPlatformLabel} ▼</Text>
          </TouchableOpacity>

          {platformDropdownVisible && (
            <View style={styles.platformDropdown}>
              {platforms.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.platformOption,
                    platform === p.value && styles.platformOptionActive
                  ]}
                  onPress={() => {
                    setPlatform(p.value);
                    setPlatformDropdownVisible(false);
                  }}
                >
                  <Text style={[
                    styles.platformOptionText,
                    platform === p.value && styles.platformOptionTextActive
                  ]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            style={styles.searchInput}
            placeholder="Enter User ID (e.g., 76561198065516498)"
            placeholderTextColor="#64748b"
            value={userId}
            onChangeText={setUserId}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
            disabled={!userId.trim()}
          >
            <Text style={styles.searchButtonText}>Open Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>
          Select a platform and enter a user ID, then click "Open Profile" to view player stats on Tracker.gg
        </Text>
        <Text style={styles.placeholderSubtext}>
          The profile will open in your device's browser
        </Text>
      </View>

      {/* Trademark Footer */}
      <View style={styles.trademarkFooter}>
        <Text style={styles.trademarkText}>
          SMITE 2 is a registered trademark of Hi-Rez Studios. Trademarks are the property of their respective owners. Game materials copyright Hi-Rez Studios. Hi-Rez Studios has not endorsed and is not responsible for this site or its content.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e1a',
  },
  header: {
    padding: 20,
    paddingTop: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1e3a5f',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#e2e8f0',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },
  searchSection: {
    padding: 20,
    backgroundColor: '#0a0e1a',
    position: 'relative',
    zIndex: 10,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  platformButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1f2e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#B8FF12',
    minWidth: 120,
  },
  platformButtonText: {
    color: '#B8FF12',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  platformDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    backgroundColor: '#1a1f2e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#B8FF12',
    marginTop: 4,
    minWidth: 120,
    zIndex: 1000,
    shadowColor: '#B8FF12',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  platformOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2f3f',
  },
  platformOptionActive: {
    backgroundColor: '#2a3a2a',
  },
  platformOptionText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
  },
  platformOptionTextActive: {
    color: '#B8FF12',
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1a1f2e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#3a4a4a',
    color: '#e2e8f0',
    fontSize: 14,
  },
  searchButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#B8FF12',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#B8FF12',
  },
  searchButtonText: {
    color: '#0a0e1a',
    fontSize: 14,
    fontWeight: '700',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  placeholderText: {
    color: '#cbd5e1',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 12,
  },
  placeholderSubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  trademarkFooter: {
    padding: 1,
    backgroundColor: '#0b1226',
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
  },
  trademarkText: {
    color: '#64748b',
    fontSize: 6,
    lineHeight: 8,
    textAlign: 'center',
  },
});

