import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { measureDomRect } from './hoverPointer';

const IS_WEB = Platform.OS === 'web';
const HIDE_DELAY_MS = 320;

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

function isInsideAbilityTooltip(target) {
  if (!target?.closest) return false;
  return (
    target.closest('[data-ability-tooltip-surface]') ||
    target.closest('[data-ability-tooltip-trigger]') ||
    target.closest('[data-ability-tooltip-controls]')
  );
}

/** Web: hover peek · click pins for level +/- · native: tap opens modal. */
export function useWebAbilityTooltip() {
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

  const pin = useCallback(() => {
    cancelHide();
    setState((prev) => (prev?.payload ? { ...prev, mode: 'pinned' } : prev));
  }, [cancelHide]);

  const scheduleHide = useCallback(() => {
    if (!IS_WEB) return;
    cancelHide();
    hideTimer.current = setTimeout(() => {
      setState((prev) => {
        if (!prev || prev.mode === 'pinned') return prev;
        return null;
      });
      hideTimer.current = null;
    }, HIDE_DELAY_MS);
  }, [cancelHide]);

  const openPreview = useCallback(
    (payload, node, { pinned = false } = {}) => {
      if (!payload) return;
      cancelHide();

      const commit = (anchor) => {
        setState({
          payload,
          anchor: anchor ?? null,
          mode: IS_WEB ? (pinned ? 'pinned' : 'hover') : 'modal',
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

      const getData = () => (typeof getPayload === 'function' ? getPayload() : getPayload);

      if (!IS_WEB) {
        return {
          onPress: (event) => {
            event?.stopPropagation?.();
            const payload = getData();
            if (!payload) return;
            cancelHide();
            setState({ payload, anchor: null, mode: 'modal' });
          },
        };
      }

      return {
        onPress: (event) => {
          event?.stopPropagation?.();
          const payload = getData();
          openPreview(payload, ref?.current ?? null, { pinned: true });
        },
        onHoverIn: () => {
          const payload = getData();
          openPreview(payload, ref?.current ?? null, { pinned: false });
        },
        onHoverOut: scheduleHide,
      };
    },
    [cancelHide, openPreview, scheduleHide]
  );

  useEffect(() => {
    if (!IS_WEB || !state?.payload) return undefined;

    const dismissIfOutside = (event) => {
      if (isInsideAbilityTooltip(event.target)) return;
      close();
    };

    document.addEventListener('click', dismissIfOutside);
    return () => document.removeEventListener('click', dismissIfOutside);
  }, [state?.payload, close]);

  useEffect(() => {
    if (!IS_WEB || !state?.payload) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') close();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [state?.payload, close]);

  useEffect(() => () => cancelHide(), [cancelHide]);

  const isPinned = state?.mode === 'pinned';

  return {
    isWeb: IS_WEB,
    isVisible: !!state?.payload,
    isPinned,
    payload: state?.payload ?? null,
    anchor: state?.anchor ?? null,
    presentation:
      state?.mode === 'pinned' ? 'pinned' : state?.mode === 'hover' ? 'hover' : 'modal',
    close,
    pin,
    cancelHide,
    scheduleHide,
    bindTrigger,
    setPayloadPatch: useCallback((patch) => {
      setState((prev) => (prev?.payload ? { ...prev, payload: { ...prev.payload, ...patch } } : prev));
    }, []),
  };
}
