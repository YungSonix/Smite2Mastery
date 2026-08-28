/** True when the event target is a field the player/host must be able to type in. */
export function isEditableTarget(el) {
  if (!el || !(el instanceof Element)) return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));
}

/** Block common DevTools / view-source shortcuts (deterrent only — not real security). */
export function isDevToolsShortcut(e) {
  const key = String(e.key || '');
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;
  const alt = e.altKey;

  if (key === 'F12') return true;

  // Chromium / Edge
  if (ctrl && shift && ['I', 'J', 'C', 'K', 'U'].includes(key)) return true;
  if (ctrl && !shift && key === 'U') return true;

  // Firefox
  if (ctrl && shift && ['E', 'M'].includes(key)) return true;

  // macOS Safari / Chrome
  if (e.metaKey && alt && ['i', 'I', 'j', 'J', 'c', 'C', 'u', 'U'].includes(key)) return true;

  return false;
}

/** Heuristic: docked DevTools often shrinks the inner viewport. */
export function devToolsLikelyOpen() {
  if (typeof window === 'undefined') return false;
  const widthGap = window.outerWidth - window.innerWidth;
  const heightGap = window.outerHeight - window.innerHeight;
  return widthGap > 160 || heightGap > 160;
}

export function installScrapeGuard({ strict = false, onDevToolsOpen } = {}) {
  const onKeyDown = (e) => {
    if (isEditableTarget(e.target)) return;
    if (!isDevToolsShortcut(e)) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const onContextMenu = (e) => {
    if (!strict) return;
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
  };

  const onDragStart = (e) => {
    if (!strict) return;
    const tag = e.target?.tagName;
    if (tag === 'IMG' || tag === 'VIDEO' || tag === 'AUDIO') {
      e.preventDefault();
    }
  };

  let detectTimer = null;
  const pollDevTools = () => {
    if (devToolsLikelyOpen()) onDevToolsOpen?.();
  };

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('dragstart', onDragStart, true);
  detectTimer = window.setInterval(pollDevTools, 1200);
  pollDevTools();

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('contextmenu', onContextMenu, true);
    document.removeEventListener('dragstart', onDragStart, true);
    if (detectTimer) window.clearInterval(detectTimer);
  };
}
