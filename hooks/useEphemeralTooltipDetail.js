import { useEffect, useState } from 'react';

import { DEFAULT_TOOLTIP_DETAIL } from '../lib/tooltipDetail';

/**
 * Per-tooltip detail level — resets when opened or when resetKey changes.
 * Does not persist; use profile settings for the saved default.
 */
export function useEphemeralTooltipDetail(
  open,
  defaultDetail = DEFAULT_TOOLTIP_DETAIL,
  resetKey = null
) {
  const [detailLevel, setDetailLevel] = useState(defaultDetail);

  useEffect(() => {
    if (open) {
      setDetailLevel(defaultDetail);
    }
  }, [open, resetKey, defaultDetail]);

  return [detailLevel, setDetailLevel];
}
