import React from 'react';
import { Platform } from 'react-native';

/** Render hover tooltip layers on document.body so position:fixed uses the viewport. */
export default function HoverTooltipPortal({ children }) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return children;
  }

  const { createPortal } = require('react-dom');
  return createPortal(children, document.body);
}
