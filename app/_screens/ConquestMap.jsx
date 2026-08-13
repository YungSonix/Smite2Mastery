import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../../lib/themeColors';
import ConquestInteractiveMap from '../../lib/ConquestInteractiveMap';

/** Interactive Conquest map (Day / Night) with POI tooltips. */
export default function ConquestMap() {
  return (
    <View style={styles.container}>
      <ConquestInteractiveMap />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: COLORS.bgDeep,
    marginVertical: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
