import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../themeColors';

function Pill({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.pill, active && styles.pillActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function GuideFilterBar({
  typeFilter = 'all',
  roleFilter = 'all',
  patchFilter = 'all',
  patchOptions = [],
  onTypeFilter,
  onRoleFilter,
  onPatchFilter,
}) {
  const roleOptions = ['all', 'Solo', 'Jungle', 'Mid', 'Support', 'Carry'];

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pill label="All" active={typeFilter === 'all'} onPress={() => onTypeFilter?.('all')} />
        <Pill label="God Guides" active={typeFilter === 'god'} onPress={() => onTypeFilter?.('god')} />
        <Pill label="Role Guides" active={typeFilter === 'role'} onPress={() => onTypeFilter?.('role')} />
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {roleOptions.map((role) => (
          <Pill
            key={role}
            label={role === 'all' ? 'All Roles' : role}
            active={roleFilter === role}
            onPress={() => onRoleFilter?.(role)}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pill label="All Patches" active={patchFilter === 'all'} onPress={() => onPatchFilter?.('all')} />
        {patchOptions.map((patch) => (
          <Pill key={patch} label={patch} active={patchFilter === patch} onPress={() => onPatchFilter?.(patch)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    marginBottom: 12,
  },
  row: {
    gap: 8,
    paddingRight: 16,
  },
  pill: {
    backgroundColor: COLORS.bgDeep,
    borderColor: COLORS.surfaceNavy,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  pillActive: {
    backgroundColor: COLORS.brandBlue,
    borderColor: COLORS.brandBlue,
  },
  pillText: {
    color: COLORS.slate400,
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: COLORS.white,
  },
});
