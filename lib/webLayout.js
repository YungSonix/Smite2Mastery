import { Platform } from 'react-native';
import { useScreenDimensions } from '../hooks/useScreenDimensions';

/** Minimum viewport width for desktop web chrome (centered top-nav layout). */
export const WEB_DESKTOP_MIN_WIDTH = 1024;

/** Max content width on web — wider than legacy 1200 mobile-first column. */
export const WEB_CONTENT_MAX_WIDTH = 1440;

/** Ultra-wide cap for hero / grid sections. */
export const WEB_WIDE_MAX_WIDTH = 1680;

export function useWebLayout() {
  const { width, height } = useScreenDimensions();
  const isWeb = Platform.OS === 'web';
  const isWebDesktop = isWeb && width >= WEB_DESKTOP_MIN_WIDTH;
  const isWebTablet = isWeb && width >= 768 && width < WEB_DESKTOP_MIN_WIDTH;

  return {
    width,
    height,
    isWeb,
    isWebDesktop,
    isWebTablet,
    contentMaxWidth: WEB_CONTENT_MAX_WIDTH,
    contentPaddingHorizontal: isWebDesktop ? 32 : isWeb ? 20 : 0,
  };
}

/** Shared page container style for web screens (home, data, builds, etc.). */
export function webPageContainerStyle(layout) {
  if (!layout?.isWeb) return {};
  return {
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: layout.contentPaddingHorizontal,
  };
}
