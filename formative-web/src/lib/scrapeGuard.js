/** True when the event target is a field the player/host must be able to type in. */
export function isEditableTarget(el) {
  if (!el || !(el instanceof Element)) return false;
  return Boolean(el.closest('input, textarea, select, [contenteditable="true"]'));
}

function keyChar(e) {
  return String(e.key || '').toLowerCase();
}

/** DevTools / inspector shortcuts — blocked on every trivia page except login. */
export function isDevToolsShortcut(e) {
  const key = keyChar(e);
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;
  const alt = e.altKey;
  const code = String(e.code || '');

  if (e.key === 'F12' || e.key === 'F8' || e.keyCode === 123) return true;
  if (code === 'F12' || code === 'F8') return true;

  // Chromium / Edge — inspect, console, network, sources, performance
  if (ctrl && shift && 'ijckuep'.includes(key)) return true;
  if (ctrl && !shift && key === 'u') return true;

  // Firefox
  if (ctrl && shift && 'emk'.includes(key)) return true;

  // macOS
  if (e.metaKey && alt && 'ijcu'.includes(key)) return true;
  if (e.metaKey && alt && key === 'k') return true;

  // Context menu / Inspect entry (keyboard)
  if (e.key === 'ContextMenu') return true;
  if (e.shiftKey && (e.key === 'F10' || code === 'F10')) return true;

  return false;
}

/** Take / preview: block save, print, select-all, copy, cut outside name fields. */
export function isStrictExfilShortcut(e) {
  if (isDevToolsShortcut(e)) return true;
  const key = keyChar(e);
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) {
    if (e.key === 'PrintScreen' || e.key === 'ContextMenu') return true;
    return false;
  }
  if (['a', 'c', 'x', 's', 'p', 'u', 'd'].includes(key)) return true;
  if (e.shiftKey && key === 'i') return true;
  return false;
}

function shouldBlockKey(e, strict) {
  if (isEditableTarget(e.target)) return isDevToolsShortcut(e);
  return strict ? isStrictExfilShortcut(e) : isDevToolsShortcut(e);
}

function blockEvent(e) {
  e.preventDefault();
  e.stopPropagation();
  if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
  return false;
}

/** Docked DevTools often shrink the inner viewport. */
export function devToolsLikelyOpen() {
  if (typeof window === 'undefined') return false;
  const widthGap = window.outerWidth - window.innerWidth;
  const heightGap = window.outerHeight - window.innerHeight;
  return widthGap > 140 || heightGap > 140;
}

/** Console is only read when DevTools is open (classic probe). */
function installConsoleProbe(onOpen) {
  if (typeof window === 'undefined' || typeof console === 'undefined') return () => {};
  let timer = null;
  const probe = () => {
    try {
      const bait = new Image();
      Object.defineProperty(bait, 'id', {
        get() {
          onOpen();
          return '';
        },
        configurable: true,
      });
      // eslint-disable-next-line no-console
      console.log('%c', bait);
      console.clear?.();
    } catch {
      /* ignore */
    }
  };
  timer = window.setInterval(probe, 1500);
  probe();
  return () => {
    if (timer) window.clearInterval(timer);
  };
}

export function installScrapeGuard({ strict = false, onDevToolsOpen, onDevToolsClose } = {}) {
  const flagOpen = () => onDevToolsOpen?.();
  const flagClose = () => {
    if (!devToolsLikelyOpen()) onDevToolsClose?.();
  };

  const onKeyDown = (e) => {
    if (!shouldBlockKey(e, strict)) return;
    blockEvent(e);
  };

  const onKeyUp = (e) => {
    if (!shouldBlockKey(e, strict)) return;
    blockEvent(e);
  };

  const onContextMenu = (e) => {
    if (isEditableTarget(e.target)) return;
    blockEvent(e);
  };

  const onCopy = (e) => {
    if (!strict || isEditableTarget(e.target)) return;
    blockEvent(e);
  };

  const onCut = (e) => {
    if (!strict || isEditableTarget(e.target)) return;
    blockEvent(e);
  };

  const onSelectStart = (e) => {
    if (!strict || isEditableTarget(e.target)) return;
    blockEvent(e);
  };

  const onDragStart = (e) => {
    if (!strict) return;
    const tag = e.target?.tagName;
    if (tag === 'IMG' || tag === 'VIDEO' || tag === 'AUDIO' || tag === 'CANVAS') {
      blockEvent(e);
    }
  };

  const onBeforePrint = (e) => {
    if (!strict) return;
    blockEvent(e);
  };

  let detectTimer = null;
  const pollDevTools = () => {
    if (devToolsLikelyOpen()) flagOpen();
    else flagClose();
  };

  const stopConsoleProbe = strict ? installConsoleProbe(flagOpen) : () => {};

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  document.addEventListener('contextmenu', onContextMenu, true);
  document.addEventListener('copy', onCopy, true);
  document.addEventListener('cut', onCut, true);
  document.addEventListener('selectstart', onSelectStart, true);
  document.addEventListener('dragstart', onDragStart, true);
  window.addEventListener('beforeprint', onBeforePrint, true);
  detectTimer = window.setInterval(pollDevTools, 800);
  pollDevTools();

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('keyup', onKeyUp, true);
    document.removeEventListener('contextmenu', onContextMenu, true);
    document.removeEventListener('copy', onCopy, true);
    document.removeEventListener('cut', onCut, true);
    document.removeEventListener('selectstart', onSelectStart, true);
    document.removeEventListener('dragstart', onDragStart, true);
    window.removeEventListener('beforeprint', onBeforePrint, true);
    if (detectTimer) window.clearInterval(detectTimer);
    stopConsoleProbe();
  };
}
