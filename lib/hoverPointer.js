/** Client / viewport coordinates from RN-web hover or DOM mouse events. */
export function getPointerFromEvent(event) {
  if (!event) return null;

  const ne = event.nativeEvent ?? event;
  const x =
    ne?.clientX ??
    ne?.pageX ??
    event.clientX ??
    event.pageX ??
    (typeof ne?.locationX === 'number' ? ne.locationX : undefined);
  const y =
    ne?.clientY ??
    ne?.pageY ??
    event.clientY ??
    event.pageY ??
    (typeof ne?.locationY === 'number' ? ne.locationY : undefined);

  if (typeof x !== 'number' || typeof y !== 'number') return null;
  return { x, y };
}

/** Resolve a Pressable/ref node to a DOM element on web. */
export function resolveDomNode(node) {
  if (!node) return null;
  if (typeof node.getBoundingClientRect === 'function') return node;
  if (node._nativeNode) return node._nativeNode;
  if (node.nativeNode) return node.nativeNode;
  return node;
}

export function measureDomRect(node) {
  const dom = resolveDomNode(node);
  if (!dom || typeof dom.getBoundingClientRect !== 'function') return null;
  const rect = dom.getBoundingClientRect();
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function anchorCenter(anchor) {
  if (!anchor) return null;
  return {
    x: anchor.x + anchor.width / 2,
    y: anchor.y + anchor.height / 2,
  };
}
