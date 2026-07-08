import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MentorTierlistsView from '../../lib/mentorTierlists';
import { loadBuildsGodsData, getBuildsDataSync } from '../../lib/loadBuildsData';

import { WEB_CONTENT_MAX_WIDTH } from '../../lib/webLayout';

const IS_WEB = Platform.OS === 'web';

export default function TierlistPage({
  tierCategory = 'meta',
  entityType = 'god',
  selectedRole = null,
  query = '',
}) {
  const [buildsData, setBuildsData] = useState(() => getBuildsDataSync());

  useEffect(() => {
    if (buildsData) return undefined;
    let cancelled = false;
    loadBuildsGodsData()
      .then((data) => {
        if (!cancelled) setBuildsData(data);
      })
      .catch((e) => {
        console.error('Failed to load builds.json:', e);
        if (!cancelled) setBuildsData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [buildsData]);

  if (buildsData === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1e90ff" />
      </View>
    );
  }

  return (
    <MentorTierlistsView
      buildsData={buildsData}
      tierCategory={tierCategory}
      entityType={entityType}
      selectedRole={selectedRole}
      query={query}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#071024',
    paddingVertical: 32,
    ...(IS_WEB && {
      maxWidth: WEB_CONTENT_MAX_WIDTH,
      alignSelf: 'center',
      width: '100%',
    }),
  },
});
