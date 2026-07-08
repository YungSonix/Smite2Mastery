import { Platform } from 'react-native';

const STYLE_ID = 'smite-scroll-web-global';

/**
 * Desktop-friendly base styles for the Expo web build (typography, root layout, scrollbars).
 */
export function injectWebGlobalStyles() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return () => {};

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }

  style.textContent = `
    html, body, #root {
      min-height: 100%;
      width: 100%;
    }
    body {
      margin: 0;
      background: #071024;
      color: #f1f5f9;
      font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    #root {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }
    @media (min-width: 1024px) {
      * {
        scrollbar-width: thin;
        scrollbar-color: #1e3a5f transparent;
      }
      *::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      *::-webkit-scrollbar-thumb {
        background: #1e3a5f;
        border-radius: 8px;
      }
      *::-webkit-scrollbar-track {
        background: transparent;
      }
    }
  `;

  return () => {
    if (style?.parentNode) style.parentNode.removeChild(style);
  };
}
