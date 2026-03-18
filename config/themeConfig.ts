export const BRAND_COLORS = {
  PRIMARY_BLUE: '#1e90ff',
  SUCCESS_GREEN: '#10b981',
  ERROR_RED: '#ef4444',
} as const;

export const CONSOLE_STYLES = {
  SUPABASE_CHECK: `color: ${BRAND_COLORS.PRIMARY_BLUE}; font-weight: bold; font-size: 14px;`,
  SUPABASE_ERROR: `color: ${BRAND_COLORS.ERROR_RED}; font-weight: bold;`,
  SUPABASE_SUCCESS: `color: ${BRAND_COLORS.SUCCESS_GREEN}; font-weight: bold; font-size: 14px;`,
} as const;
