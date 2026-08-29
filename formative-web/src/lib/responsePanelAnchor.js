/** Pin host side panels near the row the host clicked (viewport Y). */
export function setResponsePanelAnchor(clientY) {
  if (typeof window === 'undefined' || clientY == null || !Number.isFinite(clientY)) return;
  const margin = 10;
  const estPanel = Math.min(window.innerHeight * 0.82, window.innerHeight - 88);
  const top = clientY - 56;
  const maxTop = Math.max(margin, window.innerHeight - estPanel - margin);
  const clamped = Math.max(margin, Math.min(top, maxTop));
  document.documentElement.style.setProperty('--f-panel-anchor-y', `${Math.round(clamped)}px`);
}

export function clearResponsePanelAnchor() {
  if (typeof document === 'undefined') return;
  document.documentElement.style.removeProperty('--f-panel-anchor-y');
}
