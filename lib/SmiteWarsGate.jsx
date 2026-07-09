import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from './themeColors';

export function SmiteWarsTbdScreen({ onBack, gameTitle = 'Smite Wars', loading = false }) {
  if (loading) {
    return (
      <View style={styles.root}>
        <ActivityIndicator size="large" color={COLORS.goldAccent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {typeof onBack === 'function' && (
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.8}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      )}
      <View style={styles.card}>
        <Text style={styles.title}>{gameTitle} (TBD)</Text>
        <Text style={styles.body}>
          Coming soon — a full-screen card battle with Smite 2 gods. Deploy units, cast spells, and win the war.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bgVoid,
    padding: 20,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    backgroundColor: COLORS.bgDeep,
  },
  backBtnText: {
    color: COLORS.skySoft,
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: COLORS.bgDeep,
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceNavy,
    alignItems: 'center',
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    color: COLORS.textLight,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    color: COLORS.slate400,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
