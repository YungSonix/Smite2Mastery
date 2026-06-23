/**
 * Shared cyan dark-shell tokens + floating chrome styles.
 * Canonical reference: Builds ability tooltip (`lib/KitAbilityTooltipModal.jsx`).
 */
import { StyleSheet } from 'react-native';

/** Color + layout tokens for modals, tooltips, dropdowns, and inset panels. */
export const UI_THEME = {
  borderCyan: 'rgba(125, 211, 252, 0.42)',
  borderCyanSoft: 'rgba(125, 211, 252, 0.14)',
  borderCyanFill10: 'rgba(125, 211, 252, 0.10)',
  borderCyanFill12: 'rgba(125, 211, 252, 0.12)',
  borderCyanFill08: 'rgba(125, 211, 252, 0.08)',
  cardBg: 'rgba(8, 12, 22, 0.98)',
  overlayScrim: 'rgba(3, 7, 18, 0.42)',
  panelBg: '#0b1220',
  panelBgAlt: '#0f1724',
  panelBgSection: '#0b1226',
  panelBorder: '#1e3a5f',
  panelBorderMuted: '#1e293b',
  mediaBg: '#030712',
  accentSky: '#7dd3fc',
  labelSoft: '#93c5fd',
  textPrimary: '#f1f5f9',
  textBright: '#f8fafc',
  textBody: '#cbd5e1',
  textMuted: '#94a3b8',
  textHint: '#64748b',
  textClose: '#e6eef8',
  textIconFallback: '#e2e8f0',
  textDropdown: '#e6eef8',
  statDelta: '#67e8f9',
  radiusCard: 10,
  radiusPanel: 8,
  radiusClose: 14,
  shadowCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  shadowClose: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
};

/** Default pantheon-agnostic tooltip border (Builds modal default). */
export const UI_TOOLTIP_BORDER_DEFAULT = UI_THEME.borderCyan;

/**
 * Kit ability tooltip modal — shared by Builds (`KitAbilityTooltipModal`)
 * and Database god kit (via `kitAbilityTooltipStylesForData` aliases).
 */
export const kitAbilityTooltipModalStyles = StyleSheet.create({
  overlayRoot: {
    flex: 1,
    backgroundColor: UI_THEME.overlayScrim,
  },
  cardWrap: {
    position: 'absolute',
    zIndex: 4,
    elevation: 10,
    overflow: 'visible',
  },
  card: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: UI_THEME.cardBg,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    borderRadius: UI_THEME.radiusCard,
    padding: 12,
    ...UI_THEME.shadowCard,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    gap: 8,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: UI_THEME.radiusPanel,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: '100%',
    height: '100%',
  },
  iconFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallbackText: {
    color: UI_THEME.textIconFallback,
    fontSize: 14,
    fontWeight: '800',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: UI_THEME.textPrimary,
    fontWeight: '800',
    fontSize: 15,
  },
  subTitle: {
    marginTop: 2,
    color: UI_THEME.accentSky,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    flexShrink: 0,
  },
  closeCornerBtn: {
    position: 'absolute',
    top: -14,
    right: -14,
    width: 28,
    height: 28,
    borderRadius: UI_THEME.radiusClose,
    backgroundColor: UI_THEME.panelBorder,
    borderWidth: 1,
    borderColor: UI_THEME.borderCyan,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    elevation: 14,
    ...UI_THEME.shadowClose,
  },
  closeCornerText: {
    color: UI_THEME.textClose,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: -2,
  },
  sectionLabel: {
    color: UI_THEME.labelSoft,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  levelStepperTopRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    borderRadius: UI_THEME.radiusPanel,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: UI_THEME.panelBg,
  },
  levelStepperBtn: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    backgroundColor: UI_THEME.panelBgAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelStepperText: {
    color: UI_THEME.textBody,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
  },
  levelStepperTextDisabled: {
    color: UI_THEME.textHint,
  },
  levelCurrentText: {
    color: UI_THEME.accentSky,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 12,
    minWidth: 14,
    textAlign: 'center',
  },
  descSection: {
    marginBottom: 6,
  },
  descScroll: {
    height: 118,
    marginHorizontal: -2,
  },
  descScrollContent: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  statsSection: {
    marginBottom: 4,
    height: 148,
    minHeight: 148,
  },
  statsScroll: {
    flex: 1,
    minHeight: 0,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    borderRadius: UI_THEME.radiusPanel,
    backgroundColor: UI_THEME.panelBg,
  },
  statsScrollContent: {
    paddingBottom: 8,
  },
  statsBlock: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: UI_THEME.panelBorderMuted,
  },
  statLabel: {
    color: UI_THEME.textBody,
    fontSize: 9,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
    flexWrap: 'wrap',
  },
  statValueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    maxWidth: '46%',
    flexShrink: 1,
    minWidth: 0,
  },
  statValue: {
    color: UI_THEME.textBright,
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'right',
    flexShrink: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  statDelta: {
    color: UI_THEME.statDelta,
    fontSize: 8,
    fontWeight: '700',
    flexShrink: 0,
  },
  body: {
    color: UI_THEME.textBody,
    fontSize: 11,
    lineHeight: 14,
  },
  hint: {
    color: UI_THEME.textHint,
    fontSize: 10,
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

const tip = kitAbilityTooltipModalStyles;

/** `app/data.jsx` StyleSheet keys → shared kit tooltip styles (Database god kit). */
export const kitAbilityTooltipStylesForData = {
  kitAbilityTooltipOverlayRoot: tip.overlayRoot,
  kitAbilityTooltipCardWrap: tip.cardWrap,
  kitAbilityTooltipCard: tip.card,
  kitAbilityTooltipHeader: tip.header,
  kitAbilityTooltipHeaderLeft: tip.headerLeft,
  kitAbilityTooltipIconWrap: tip.iconWrap,
  kitAbilityTooltipIcon: tip.icon,
  kitAbilityTooltipIconFallback: tip.iconFallback,
  kitAbilityTooltipIconFallbackText: tip.iconFallbackText,
  kitAbilityTooltipTitleWrap: tip.titleWrap,
  kitAbilityTooltipTitle: tip.title,
  kitAbilityTooltipSubTitle: tip.subTitle,
  kitAbilityTooltipHeaderRight: tip.headerRight,
  kitAbilityTooltipCloseCornerBtn: tip.closeCornerBtn,
  kitAbilityTooltipCloseCornerText: tip.closeCornerText,
  kitAbilitySectionLabel: tip.sectionLabel,
  kitAbilityLevelStepperTopRight: tip.levelStepperTopRight,
  kitAbilityLevelStepperBtn: tip.levelStepperBtn,
  kitAbilityLevelStepperText: tip.levelStepperText,
  kitAbilityLevelStepperTextDisabled: tip.levelStepperTextDisabled,
  kitAbilityLevelCurrentText: tip.levelCurrentText,
  kitAbilityDescSection: tip.descSection,
  kitAbilityDescScroll: tip.descScroll,
  kitAbilityDescScrollContent: tip.descScrollContent,
  kitAbilityStatsSection: tip.statsSection,
  kitAbilityTooltipScroll: tip.statsScroll,
  kitAbilityStatsScrollContent: tip.statsScrollContent,
  kitAbilityStatsBlock: tip.statsBlock,
  kitAbilityStatRow: tip.statRow,
  kitAbilityStatLabel: tip.statLabel,
  kitAbilityStatValueWrap: tip.statValueWrap,
  kitAbilityStatValue: tip.statValue,
  kitAbilityStatDelta: tip.statDelta,
  kitAbilityTooltipBody: tip.body,
  kitAbilityTooltipHint: tip.hint,
};

/** Simple centered modal chrome (patch badges, item/god icon tooltips). */
export const genericTooltipChromeStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: UI_THEME.overlayScrim,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: UI_THEME.panelBgSection,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingRight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    maxWidth: 300,
    ...UI_THEME.shadowCard,
    position: 'relative',
  },
  text: {
    color: UI_THEME.textDropdown,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: UI_THEME.panelBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: {
    color: UI_THEME.textClose,
    fontSize: 16,
    fontWeight: '700',
  },
});

/** Legacy StyleSheet keys used in `app/index.jsx` and Database pages. */
export const genericTooltipStylesForApp = {
  tooltipOverlay: genericTooltipChromeStyles.overlay,
  tooltipContent: genericTooltipChromeStyles.content,
  tooltipText: genericTooltipChromeStyles.text,
  tooltipCloseButton: genericTooltipChromeStyles.closeButton,
  tooltipCloseText: genericTooltipChromeStyles.closeText,
};

/** Mechanics / counterplay detail tooltips (wider card, same chrome). */
export const counterplayTooltipChromeStyles = StyleSheet.create({
  content: {
    backgroundColor: UI_THEME.panelBgSection,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingRight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: UI_THEME.panelBorder,
    maxWidth: 400,
    ...UI_THEME.shadowCard,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    color: UI_THEME.textBright,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: UI_THEME.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: UI_THEME.radiusPanel,
  },
  body: {
    color: UI_THEME.textDropdown,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  stat: {
    color: UI_THEME.accentSky,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
});

const cp = counterplayTooltipChromeStyles;

export const counterplayTooltipStylesForData = {
  counterplayTooltipContent: cp.content,
  counterplayTooltipHeader: cp.header,
  counterplayTooltipTitleContainer: cp.titleContainer,
  counterplayTooltipTitle: cp.title,
  counterplayTooltipSubtitle: cp.subtitle,
  counterplayTooltipIcon: cp.icon,
  counterplayTooltipText: cp.body,
  counterplayTooltipStat: cp.stat,
};
