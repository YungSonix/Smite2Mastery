import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { UI_THEME } from './uiTheme';

const IS_WEB = Platform.OS === 'web';

const MAIN_NAV = [
  { key: 'data', label: 'Database', emoji: '📚' },
  { key: 'builds', label: 'Builds', emoji: '🛠️' },
  { key: 'homepage', label: 'Home', emoji: '🏠' },
  { key: 'patchhub', label: 'Patch Hub', emoji: '📰' },
  { key: 'more', label: 'More', emoji: '🎮' },
];

function NavButton({ active, onPress, label, emoji }) {
  return (
    <TouchableOpacity
      style={[styles.navButton, styles.navButtonMobile, active && styles.navButtonActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={[styles.navButtonText, active && styles.navButtonTextActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {`${emoji} ${label}`}
      </Text>
    </TouchableOpacity>
  );
}

function SubNavButton({ active, onPress, children }) {
  return (
    <TouchableOpacity
      style={[styles.subNavButton, active && styles.subNavButtonActive]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text
        style={[styles.subNavButtonText, active && styles.subNavButtonTextActive]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
}

function DesktopNavChip({ active, onPress, label, compact, fill }) {
  return (
    <TouchableOpacity
      style={[
        styles.desktopChip,
        fill && styles.desktopChipFill,
        compact && styles.desktopChipCompact,
        active && (compact ? styles.desktopChipActiveSub : styles.desktopChipActive),
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.desktopChipText,
          compact && styles.desktopChipTextCompact,
          active && (compact ? styles.desktopChipTextActiveSub : styles.desktopChipTextActive),
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Full-width nav row; buttons use flex fill on desktop web. */
function DesktopNavRail({ children, compact }) {
  return <View style={[styles.desktopNavRow, compact && styles.desktopNavRowSub]}>{children}</View>;
}
/**
 * Top main nav + contextual sub-nav (mobile and desktop web).
 */
export function AppMainNav({
  isWebDesktop = false,
  currentPage,
  setCurrentPage,
  databaseSubTab,
  setDatabaseSubTab,
  setDataPageKey,
  buildsSubTab,
  setBuildsSubTab,
  buildsHubMode,
  setBuildsHubMode,
  patchHubSubTab,
  setPatchHubSubTab,
  moreSubTab,
  setMoreSubTab,
  startTransition,
}) {
  const go = (fn) => {
    if (startTransition) startTransition(fn);
    else fn();
  };

  const onMainNav = (pageKey) => {
    if (pageKey === 'data') {
      setCurrentPage('data');
      if (currentPage !== 'data') setDataPageKey((prev) => prev + 1);
      return;
    }
    go(() => setCurrentPage(pageKey));
  };

  const isMainActive = (key) =>
    key === 'builds'
      ? currentPage === 'builds' || currentPage === 'custombuild'
      : currentPage === key;

  if (isWebDesktop) {
    return (
      <View style={styles.desktopNavStickyWrap}>
        <DesktopNavRail>
          {MAIN_NAV.map(({ key, label }) => (
            <DesktopNavChip
              key={key}
              label={label}
              fill
              active={isMainActive(key)}
              onPress={() => onMainNav(key)}
            />
          ))}
        </DesktopNavRail>

        {currentPage === 'data' && (
          <DesktopNavRail compact>
            {[
              ['gods', 'Gods'],
              ['items', 'Items'],
              ['gamemodes', 'Game Modes'],
              ['mechanics', 'Mechanics'],
            ].map(([tab, label]) => (
              <DesktopNavChip
                key={tab}
                label={label}
                compact
                active={databaseSubTab === tab}
                onPress={() => {
                  setCurrentPage('data');
                  setDatabaseSubTab(tab);
                }}
              />
            ))}
          </DesktopNavRail>
        )}

        {(currentPage === 'builds' || currentPage === 'custombuild') && (
            <DesktopNavRail compact>
              {[
                {
                  label: 'Builds',
                  active:
                    buildsSubTab === 'featured' ||
                    buildsSubTab === 'contributors' ||
                    buildsSubTab === 'community',
                  onPress: () =>
                    go(() => {
                      setBuildsHubMode('browse');
                      setBuildsSubTab('featured');
                      setCurrentPage('builds');
                    }),
                },
                {
                  label: 'Custom Builder',
                  active: buildsSubTab === 'custom' || currentPage === 'custombuild',
                  onPress: () =>
                    go(() => {
                      setBuildsHubMode('browse');
                      setBuildsSubTab('custom');
                      setCurrentPage('custombuild');
                    }),
                },
                {
                  label: 'Randomizer',
                  active: buildsSubTab === 'randomizer',
                  onPress: () =>
                    go(() => {
                      setBuildsHubMode('browse');
                      setBuildsSubTab('randomizer');
                      setCurrentPage('builds');
                    }),
                },
                {
                  label: 'My Builds',
                  active: buildsSubTab === 'mybuilds',
                  onPress: () =>
                    go(() => {
                      setBuildsHubMode('browse');
                      setBuildsSubTab('mybuilds');
                      setCurrentPage('builds');
                    }),
                },
                {
                  label: 'Guides',
                  active: buildsSubTab === 'guides',
                  onPress: () =>
                    go(() => {
                      setBuildsHubMode('browse');
                      setBuildsSubTab('guides');
                      setCurrentPage('builds');
                    }),
                },
              ].map(({ label, active, onPress }) => (
                <DesktopNavChip key={label} label={label} compact active={active} onPress={onPress} />
              ))}
            </DesktopNavRail>
          )}

        {currentPage === 'patchhub' && (
            <DesktopNavRail compact>
              {[
                ['simple', 'Simple Summary'],
                ['catchup', 'Catch Me Up'],
                ['archive', 'Archive'],
              ].map(([tab, label]) => (
                <DesktopNavChip
                  key={tab}
                  label={label}
                  compact
                  active={patchHubSubTab === tab}
                  onPress={() => go(() => setPatchHubSubTab(tab))}
                />
              ))}
            </DesktopNavRail>
          )}

        {currentPage === 'more' && (
            <DesktopNavRail compact>
              {[
                ['minigames', 'Mini Games'],
                ['profile', 'Profile'],
                ['shop', 'Shop'],
                ['tools', 'Tools'],
              ].map(([tab, label]) => (
                <DesktopNavChip
                  key={tab}
                  label={label}
                  compact
                  active={moreSubTab === tab}
                  onPress={() => go(() => setMoreSubTab(tab))}
                />
              ))}
            </DesktopNavRail>
          )}
      </View>
    );
  }

  return (
    <>
      <View style={styles.navBar}>
        <View style={styles.navLinksRow}>
          {MAIN_NAV.map(({ key, label, emoji }) => (
            <NavButton
              key={key}
              label={label}
              emoji={emoji}
              active={isMainActive(key)}
              onPress={() => onMainNav(key)}
            />
          ))}
        </View>
      </View>

      {currentPage === 'data' && (
        <View style={styles.subNavBar}>
          {[
            ['gods', 'Gods'],
            ['items', 'Items'],
            ['gamemodes', 'Game Modes'],
            ['mechanics', 'Mechanics'],
          ].map(([tab, label]) => (
            <SubNavButton
              key={tab}
              active={databaseSubTab === tab}
              onPress={() => {
                setCurrentPage('data');
                setDatabaseSubTab(tab);
              }}
            >
              {label}
            </SubNavButton>
          ))}
        </View>
      )}

      {(currentPage === 'builds' || currentPage === 'custombuild') && (
        <View style={styles.subNavBar}>
          <SubNavButton
            active={
              buildsSubTab === 'featured' ||
              buildsSubTab === 'contributors' ||
              buildsSubTab === 'community'
            }
            onPress={() =>
              go(() => {
                setBuildsHubMode('browse');
                setBuildsSubTab('featured');
                setCurrentPage('builds');
              })
            }
          >
            Builds
          </SubNavButton>
          <SubNavButton
            active={buildsSubTab === 'custom' || currentPage === 'custombuild'}
            onPress={() =>
              go(() => {
                setBuildsHubMode('browse');
                setBuildsSubTab('custom');
                setCurrentPage('custombuild');
              })
            }
          >
            Custom Builder
          </SubNavButton>
          <SubNavButton
            active={buildsSubTab === 'randomizer'}
            onPress={() =>
              go(() => {
                setBuildsHubMode('browse');
                setBuildsSubTab('randomizer');
                setCurrentPage('builds');
              })
            }
          >
            Randomizer
          </SubNavButton>
          <SubNavButton
            active={buildsSubTab === 'mybuilds'}
            onPress={() =>
              go(() => {
                setBuildsHubMode('browse');
                setBuildsSubTab('mybuilds');
                setCurrentPage('builds');
              })
            }
          >
            My Builds
          </SubNavButton>
          <SubNavButton
            active={buildsSubTab === 'guides'}
            onPress={() =>
              go(() => {
                setBuildsHubMode('browse');
                setBuildsSubTab('guides');
                setCurrentPage('builds');
              })
            }
          >
            Guides
          </SubNavButton>
        </View>
      )}

      {currentPage === 'patchhub' && (
        <View style={styles.subNavBar}>
          {[
            ['simple', 'Simple Summary'],
            ['catchup', 'Catch Me Up'],
            ['archive', 'Archive'],
          ].map(([tab, label]) => (
            <SubNavButton key={tab} active={patchHubSubTab === tab} onPress={() => go(() => setPatchHubSubTab(tab))}>
              {label}
            </SubNavButton>
          ))}
        </View>
      )}

      {currentPage === 'more' && (
        <View style={styles.subNavBar}>
          {[
            ['minigames', 'Mini Games'],
            ['profile', 'Profile'],
            ['shop', 'Shop'],
            ['tools', 'Tools'],
          ].map(([tab, label]) => (
            <SubNavButton key={tab} active={moreSubTab === tab} onPress={() => go(() => setMoreSubTab(tab))}>
              {label}
            </SubNavButton>
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  desktopNavStickyWrap: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: UI_THEME.panelBgSection,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorder,
    ...(IS_WEB && {
      position: 'sticky',
      top: 0,
      zIndex: 30,
      boxShadow: '0 6px 18px rgba(3, 7, 18, 0.45)',
    }),
  },
  desktopNavRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: UI_THEME.panelBgSection,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  desktopNavRowSub: {
    backgroundColor: UI_THEME.panelBg,
    borderTopWidth: 1,
    borderTopColor: UI_THEME.panelBorder,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  desktopChip: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: '#031320',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    ...(IS_WEB && {
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
    }),
  },
  desktopChipFill: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  desktopChipCompact: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(30, 58, 95, 0.85)',
    backgroundColor: 'rgba(3, 19, 32, 0.72)',
    ...(IS_WEB && {
      boxShadow: 'none',
    }),
  },
  desktopChipActive: {
    backgroundColor: '#0066cc',
    borderColor: '#1e90ff',
    ...(IS_WEB && {
      boxShadow: '0 0 0 1px rgba(30, 144, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    }),
  },
  desktopChipActiveSub: {
    backgroundColor: 'rgba(30, 144, 255, 0.14)',
    borderColor: 'rgba(125, 211, 252, 0.42)',
    ...(IS_WEB && {
      boxShadow: 'none',
    }),
  },
  desktopChipText: {
    color: UI_THEME.textBody,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.15,
    textAlign: 'center',
    ...(IS_WEB && { whiteSpace: 'nowrap' }),
  },
  desktopChipTextCompact: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.05,
  },
  desktopChipTextActiveSub: {
    color: '#7dd3fc',
    fontWeight: '600',
  },
  desktopChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  navBar: {
    flexDirection: 'row',
    backgroundColor: UI_THEME.panelBgSection,
    paddingTop: 40,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorder,
    gap: 6,
  },
  navLinksRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    width: '100%',
  },
  navButton: {
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#031320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#06202f',
    ...(IS_WEB && {
      cursor: 'pointer',
      transition: 'background-color 0.2s, border-color 0.2s',
      userSelect: 'none',
    }),
  },
  navButtonMobile: {
    flex: 1,
    paddingHorizontal: 4,
    minWidth: 0,
    ...(IS_WEB && { minHeight: 44 }),
  },
  navButtonActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  navButtonText: {
    color: UI_THEME.textBody,
    fontSize: Platform.OS === 'web' ? 11 : 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  navButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  subNavBar: {
    flexDirection: 'row',
    backgroundColor: UI_THEME.panelBgSection,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorder,
    gap: 5,
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
  },
  subNavButton: {
    flex: 1,
    flexBasis: 0,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#031320',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#06202f',
    minWidth: 0,
    minHeight: 32,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    ...(IS_WEB && {
      cursor: 'pointer',
      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.04)',
      transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
      userSelect: 'none',
    }),
  },
  subNavButtonActive: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
    shadowOpacity: 0.28,
    elevation: 3,
    ...(IS_WEB && {
      boxShadow: '0 0 0 1px rgba(30, 144, 255, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
    }),
  },
  subNavButtonText: {
    color: UI_THEME.textBody,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  subNavButtonTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
