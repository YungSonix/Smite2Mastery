import { StyleSheet } from 'react-native';
import { UI_THEME } from './uiTheme';

/** Shared dropdown / inline-select tokens — match Builds kit tooltip shell. */
export const DROPDOWN_PANEL_BG = UI_THEME.panelBgSection;
export const DROPDOWN_SHELL_BG = UI_THEME.panelBg;
export const DROPDOWN_BORDER = UI_THEME.panelBorder;
export const DROPDOWN_BORDER_CYAN = UI_THEME.borderCyan;
export const DROPDOWN_TEXT = UI_THEME.textDropdown;
export const DROPDOWN_TEXT_MUTED = UI_THEME.textBody;
export const DROPDOWN_ACCENT = UI_THEME.accentSky;

/** Default visible rows in scrollable inline pickers (e.g. skin list). */
export const DROPDOWN_VISIBLE_ROWS = 3;
export const DROPDOWN_ITEM_HEIGHT = 38;

export function dropdownListMaxHeight(itemCount, itemHeight = DROPDOWN_ITEM_HEIGHT, visibleRows = DROPDOWN_VISIBLE_ROWS) {
  const n = Number(itemCount) || 0;
  if (n <= 0) return 0;
  return Math.min(n, visibleRows) * itemHeight;
}

/**
 * Canonical dropdown styles for the app.
 * Reference implementations: `app/data.jsx` (filter menus), `lib/SkinShowcasePanel.jsx` (inline select).
 */
export const uiDropdownStyles = StyleSheet.create({
  /** Floating menu (absolute under filter button — Database Gods/Items filters). */
  menuFloating: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: 4,
    backgroundColor: DROPDOWN_PANEL_BG,
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: DROPDOWN_BORDER,
    minWidth: 180,
    zIndex: 10000,
    elevation: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  menuFloatingRight: {
    right: 0,
    left: 'auto',
  },
  menuFloatingScroll: {
    maxHeight: 200,
  },
  /** Connected inline select shell (trigger + list in one box — skin picker, etc.). */
  selectShell: {
    borderRadius: UI_THEME.radiusPanel,
    borderWidth: 1,
    borderColor: DROPDOWN_BORDER,
    backgroundColor: DROPDOWN_SHELL_BG,
    overflow: 'hidden',
  },
  selectShellOpen: {
    borderColor: DROPDOWN_BORDER_CYAN,
    backgroundColor: UI_THEME.cardBg,
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 10,
  },
  selectTriggerText: {
    flex: 1,
    minWidth: 0,
  },
  selectCaret: {
    color: DROPDOWN_ACCENT,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 1,
  },
  selectCaretOpen: {
    transform: [{ rotate: '180deg' }],
  },
  selectDivider: {
    height: 1,
    backgroundColor: DROPDOWN_BORDER,
  },
  menuList: {
    flexGrow: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: DROPDOWN_ITEM_HEIGHT,
    paddingHorizontal: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: DROPDOWN_BORDER,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemActive: {
    backgroundColor: UI_THEME.borderCyanFill10,
  },
  menuItemText: {
    flex: 1,
    color: DROPDOWN_TEXT_MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: DROPDOWN_ACCENT,
    fontWeight: '700',
  },
  menuScrollHint: {
    color: UI_THEME.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: DROPDOWN_BORDER,
    backgroundColor: UI_THEME.panelBgAlt,
  },
  /** Filter-row option (Database pantheon/stat/tier menus). */
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: DROPDOWN_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterOptionActive: {
    backgroundColor: UI_THEME.borderCyanFill12,
  },
  filterOptionText: {
    color: DROPDOWN_TEXT,
    fontSize: 14,
  },
  filterOptionTextActive: {
    color: DROPDOWN_ACCENT,
    fontWeight: '700',
  },
});
