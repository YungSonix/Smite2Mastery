import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REMOTE_BASE_URLS, STORAGE_KEYS } from '../config';
import { useScreenDimensions } from '../hooks/useScreenDimensions';
import { UI_THEME } from './uiTheme';
import {
  DEFAULT_TWITCH_CHANNEL,
  DEFAULT_TWITCH_DISPLAY_NAME,
  DEFAULT_TWITCH_URL,
} from './featuredStreamChannels';
import { isTwitchChannelLive } from './featuredStreamStatus';

const IS_WEB = Platform.OS === 'web';
const PANEL_WIDTH_DESKTOP = 300;
const PANEL_WIDTH_MOBILE = 248;
const STREAM_HEIGHT_DESKTOP = 169;
const OFFLINE_BODY_HEIGHT_MOBILE = 118;
const OFFLINE_BODY_HEIGHT_DESKTOP = 132;
const MOBILE_BREAKPOINT = 768;

async function readStorage(key) {
  try {
    if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function writeStorage(key, value) {
  try {
    if (IS_WEB && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function getTwitchParent() {
  if (IS_WEB && typeof window !== 'undefined' && window.location?.hostname) {
    return window.location.hostname;
  }
  return 'localhost';
}

function buildTwitchEmbedSrc(width, height) {
  const params = new URLSearchParams({
    channel: DEFAULT_TWITCH_CHANNEL,
    parent: getTwitchParent(),
    width: String(Math.round(width)),
    height: String(Math.round(height)),
    muted: 'true',
  });
  return `${REMOTE_BASE_URLS.TWITCH_PLAYER}/?${params.toString()}`;
}

function StreamOfflineCard({ displayName, channelUrl, compact }) {
  const openChannel = useCallback(() => {
    Linking.openURL(channelUrl).catch(() => {});
  }, [channelUrl]);

  return (
    <View style={[styles.offlineCard, compact && styles.offlineCardCompact]}>
      <Text style={[styles.offlineTitle, compact && styles.offlineTitleCompact]}>
        <Text style={styles.offlineName}>{displayName}</Text>
        <Text style={styles.offlineTitleRest}> is offline.</Text>
      </Text>
      <Text style={[styles.offlineSub, compact && styles.offlineSubCompact]}>
        Learn more about them on their channel.
      </Text>
      <TouchableOpacity
        style={[styles.offlineLink, compact && styles.offlineLinkCompact]}
        onPress={openChannel}
        activeOpacity={0.85}
        accessibilityRole="link"
        accessibilityLabel={`Visit ${displayName} on Twitch`}
      >
        <Text style={[styles.offlineLinkText, compact && styles.offlineLinkTextCompact]}>
          Visit {displayName}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Small floating Twitch widget — bottom-right on web + native.
 * Tap header to expand/collapse; × dismisses until storage is cleared.
 */
export default function FeaturedStreamPanel() {
  const { width: screenWidth } = useScreenDimensions();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const isMobileLayout = !IS_WEB || screenWidth < MOBILE_BREAKPOINT;

  const panelWidth = useMemo(() => {
    const cap = isMobileLayout ? PANEL_WIDTH_MOBILE : PANEL_WIDTH_DESKTOP;
    const min = isMobileLayout ? 200 : 240;
    const max = Math.max(min, screenWidth - 24);
    return Math.min(cap, max);
  }, [screenWidth, isMobileLayout]);

  const streamHeight = useMemo(() => {
    if (isMobileLayout) return Math.round(panelWidth * (9 / 16));
    return STREAM_HEIGHT_DESKTOP;
  }, [panelWidth, isMobileLayout]);

  const offlineBodyHeight = isMobileLayout
    ? OFFLINE_BODY_HEIGHT_MOBILE
    : OFFLINE_BODY_HEIGHT_DESKTOP;

  const bodyHeight = isLive === true ? streamHeight : offlineBodyHeight;

  const twitchSrc = useMemo(
    () => buildTwitchEmbedSrc(panelWidth, streamHeight),
    [panelWidth, streamHeight],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [dismissedVal, collapsedVal] = await Promise.all([
        readStorage(STORAGE_KEYS.FEATURED_STREAM_DISMISSED),
        readStorage(STORAGE_KEYS.FEATURED_STREAM_COLLAPSED),
      ]);
      if (cancelled) return;
      setDismissed(dismissedVal === '1');
      if (collapsedVal != null) {
        setCollapsed(collapsedVal === '1');
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (collapsed) {
      setStatusLoading(false);
      setIsLive(false);
      return undefined;
    }

    let cancelled = false;
    const refresh = async () => {
      setStatusLoading(true);
      const live = await isTwitchChannelLive(DEFAULT_TWITCH_CHANNEL);
      if (cancelled) return;
      setIsLive(live === true);
      setStatusLoading(false);
    };

    refresh();
    const timer = setInterval(refresh, 120000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [collapsed]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      writeStorage(STORAGE_KEYS.FEATURED_STREAM_COLLAPSED, next ? '1' : '0');
      return next;
    });
  }, []);

  const dismissPanel = useCallback(() => {
    setDismissed(true);
    writeStorage(STORAGE_KEYS.FEATURED_STREAM_DISMISSED, '1');
  }, []);

  if (!ready || dismissed) return null;

  const showEmbed = !statusLoading && isLive;
  const showOffline = !statusLoading && !isLive;
  const showLoading = statusLoading;

  return (
    <View
      style={[
        styles.root,
        IS_WEB ? styles.rootWeb : styles.rootNative,
        isMobileLayout && styles.rootMobile,
        { width: panelWidth },
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.panel}>
        <View style={[styles.header, isMobileLayout && styles.headerMobile]}>
          <TouchableOpacity
            style={styles.headerTap}
            onPress={toggleCollapsed}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={collapsed ? 'Expand featured stream' : 'Collapse featured stream'}
          >
            <Text style={styles.chevron}>{collapsed ? '▶' : '▼'}</Text>
            <Text style={[styles.headerTitle, isMobileLayout && styles.headerTitleMobile]} numberOfLines={1}>
              FEATURED STREAM
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dismissHit}
            onPress={dismissPanel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Dismiss featured stream"
          >
            <Text style={styles.dismissText}>×</Text>
          </TouchableOpacity>
        </View>

        {!collapsed ? (
          <View style={[styles.body, { minHeight: bodyHeight }]}>
            {showLoading ? (
              <View style={[styles.loadingFrame, { height: bodyHeight }]}>
                <ActivityIndicator size="small" color={UI_THEME.accentSky} />
              </View>
            ) : null}

            {showOffline ? (
              <StreamOfflineCard
                displayName={DEFAULT_TWITCH_DISPLAY_NAME}
                channelUrl={DEFAULT_TWITCH_URL}
                compact={isMobileLayout}
              />
            ) : null}

            {showEmbed ? (
              <View style={[styles.playerFrame, { height: streamHeight }]}>
                {IS_WEB && typeof window !== 'undefined' ? (
                  <iframe
                    title="Featured Twitch stream"
                    src={twitchSrc}
                    style={{
                      width: '100%',
                      height: streamHeight,
                      border: 0,
                      display: 'block',
                    }}
                    frameBorder="0"
                    allowFullScreen
                  />
                ) : (
                  <WebView
                    source={{ uri: twitchSrc }}
                    style={styles.twitchWebView}
                    allowsInlineMediaPlayback
                    mediaPlaybackRequiresUserAction={false}
                  />
                )}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    zIndex: 10000,
    elevation: 16,
    ...(IS_WEB
      ? {
          position: 'fixed',
          bottom: 14,
          right: 14,
        }
      : {
          position: 'absolute',
          bottom: 14,
          right: 12,
        }),
  },
  rootWeb: {
    boxShadow: '0 8px 28px rgba(0, 0, 0, 0.55)',
  },
  rootNative: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  rootMobile: {
    bottom: 10,
    right: 8,
  },
  panel: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgSection,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7dd3fc',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headerMobile: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 0,
  },
  chevron: {
    color: '#0b1220',
    fontSize: 11,
    fontWeight: '800',
    width: 12,
    textAlign: 'center',
  },
  headerTitle: {
    flex: 1,
    color: '#0b1220',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  headerTitleMobile: {
    fontSize: 9,
    letterSpacing: 0.5,
  },
  dismissHit: {
    paddingHorizontal: 2,
    paddingVertical: 0,
    marginLeft: 4,
  },
  dismissText: {
    color: '#0b1220',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 18,
  },
  body: {
    backgroundColor: '#0b1220',
  },
  loadingFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0b1220',
  },
  playerFrame: {
    width: '100%',
    backgroundColor: '#000000',
  },
  twitchWebView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  offlineCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#f8fafc',
    minHeight: OFFLINE_BODY_HEIGHT_DESKTOP,
    justifyContent: 'center',
    gap: 8,
  },
  offlineCardCompact: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: OFFLINE_BODY_HEIGHT_MOBILE,
    gap: 6,
  },
  offlineTitle: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  offlineTitleCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  offlineName: {
    color: '#9146ff',
    fontWeight: '800',
  },
  offlineTitleRest: {
    color: '#0f172a',
    fontWeight: '700',
  },
  offlineSub: {
    fontSize: 13,
    lineHeight: 18,
    color: '#334155',
  },
  offlineSubCompact: {
    fontSize: 11,
    lineHeight: 16,
  },
  offlineLink: {
    alignSelf: 'flex-start',
    marginTop: 2,
    paddingVertical: 4,
  },
  offlineLinkCompact: {
    marginTop: 0,
  },
  offlineLinkText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    color: '#9146ff',
    textDecorationLine: 'underline',
  },
  offlineLinkTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
});
