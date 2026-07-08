import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { measureDomRect } from './hoverPointer';

const IS_WEB = Platform.OS === 'web';
const HIDE_DELAY_MS = 220;

function measureNode(node, cb) {
  if (!node) return;
  const rect = measureDomRect(node);
  if (rect) {
    cb(rect);
    return;
  }
  if (typeof node.measureInWindow === 'function') {
    node.measureInWindow((x, y, width, height) => {
      cb({ x, y, width, height });
    });
  }
}

/** Web: hover opens a card anchored to the trigger · native: tap opens modal. */
export function useWebHoverPreview() {
  const [state, setState] = useState(null);
  const hideTimer = useRef(null);

  const cancelHide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const close = useCallback(() => {
    cancelHide();
    setState(null);
  }, [cancelHide]);

  const scheduleHide = useCallback(() => {
    if (!IS_WEB) return;
    cancelHide();
    hideTimer.current = setTimeout(() => {
      setState(null);
      hideTimer.current = null;
    }, HIDE_DELAY_MS);
  }, [cancelHide]);

  const openPreview = useCallback(
    (payload, node) => {
      if (!payload) return;
      cancelHide();

      const commit = (anchor) => {
        setState({
          payload,
          anchor: anchor ?? null,
          mode: IS_WEB ? 'hover' : 'modal',
        });
      };

      if (node) measureNode(node, commit);
      else commit(null);
    },
    [cancelHide]
  );

  const bindTrigger = useCallback(
    (ref, getPayload, { enabled = true } = {}) => {
      if (!enabled) return {};

      const open = () => {
        const payload = typeof getPayload === 'function' ? getPayload() : getPayload;
        openPreview(payload, ref?.current ?? null);
      };

      if (!IS_WEB) {
        return {
          onPress: (event) => {
            event?.stopPropagation?.();
            const payload = typeof getPayload === 'function' ? getPayload() : getPayload;
            if (!payload) return;
            cancelHide();
            setState({ payload, anchor: null, mode: 'modal' });
          },
        };
      }

      return {
        onPress: (event) => {
          event?.stopPropagation?.();
          open();
        },
        onHoverIn: open,
        onHoverOut: scheduleHide,
      };
    },
    [cancelHide, openPreview, scheduleHide]
  );

  useEffect(() => () => cancelHide(), [cancelHide]);

  return {
    isWeb: IS_WEB,
    isVisible: !!state?.payload,
    payload: state?.payload ?? null,
    anchor: state?.anchor ?? null,
    presentation: state?.mode === 'hover' ? 'hover' : 'modal',
    close,
    cancelHide,
    scheduleHide,
    bindTrigger,
    setPayloadPatch: useCallback((patch) => {
      setState((prev) => (prev?.payload ? { ...prev, payload: { ...prev.payload, ...patch } } : prev));
    }, []),
  };
}
