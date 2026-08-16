import { useMemo } from 'react';

function hashSeed(str) {
  let h = 0;
  const s = String(str || 'skin');
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Centered zoom crop for skin-guess trivia (web). */
export default function SkinCropThumb({ src, seed = 'skin', size = 280 }) {
  const crop = useMemo(() => {
    const h = hashSeed(seed);
    const scale = 2.35 + (h % 40) / 100;
    const imgSize = size * scale;
    const shift = Math.max(0, (imgSize - size) / 2);
    return { imgSize, left: -shift, top: -shift };
  }, [seed, size]);

  if (!src) return null;

  return (
    <div className="f-skin-crop" style={{ width: size, maxWidth: '100%' }}>
      <img
        src={src}
        alt=""
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          width: crop.imgSize,
          height: crop.imgSize,
          left: crop.left,
          top: crop.top,
          objectFit: 'cover',
        }}
      />
    </div>
  );
}
