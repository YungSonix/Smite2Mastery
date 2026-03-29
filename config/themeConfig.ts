import { COLORS } from '../lib/themeColors';
export const BRAND_COLORS = {
  PRIMARY_BLUE: COLORS.brandBlue,
  SUCCESS_GREEN: COLORS.success,
  ERROR_RED: COLORS.danger,
} as const;

export const CONSOLE_STYLES = {
  SUPABASE_CHECK: `color: ${BRAND_COLORS.PRIMARY_BLUE}; font-weight: bold; font-size: 14px;`,
  SUPABASE_ERROR: `color: ${BRAND_COLORS.ERROR_RED}; font-weight: bold;`,
  SUPABASE_SUCCESS: `color: ${BRAND_COLORS.SUCCESS_GREEN}; font-weight: bold; font-size: 14px;`,
} as const;
