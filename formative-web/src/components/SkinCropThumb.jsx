import { useEffect, useMemo, useState } from 'react';

function hashSeed(str) {
  let h = 0;
  const s = String(str || 'skin');
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Centered zoom crop for skin-guess trivia (web). Uses % sizing so mobile width does not break the crop. */
export default function SkinCropThumb({ src, seed = 'skin' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  const crop = useMemo(() => {
    const h = hashSeed(seed);
    const scale = 2.35 + (h % 40) / 100;
    const shiftPct = -((scale - 1) / 2) * 100;
    return {
      width: `${scale * 100}%`,
      height: `${scale * 100}%`,
      left: `${shiftPct}%`,
      top: `${shiftPct}%`,
    };
  }, [seed]);

  if (!src) return null;

  return (
    <div className="f-skin-crop">
      {failed ? (
        <p className="f-skin-crop-fallback f-muted">
          Image failed to load
          {/NewGodSkins|God%20Renders|God Renders|raw\.githubusercontent\.com\/.*\/assets\//i.test(
            String(src || '')
          ) ? (
            <>
              {' '}
              — skin art loads from the GitHub <code>assets</code> branch; check network or path
            </>
          ) : null}
        </p>
      ) : (
        <img
          src={src}
          alt=""
          draggable={false}
          onContextMenu={(e) => e.preventDefault()}
          onError={() => setFailed(true)}
          style={{
            position: 'absolute',
            width: crop.width,
            height: crop.height,
            left: crop.left,
            top: crop.top,
            maxWidth: 'none',
            maxHeight: 'none',
            objectFit: 'cover',
          }}
        />
      )}
    </div>
  );
}
