import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

function hashSeed(str) {
  let h = 0;
  const s = String(str || 'skin');
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** getSkinImage may return {uri} or {primary, fallback} — flatten to an ordered source list. */
export function resolveSkinSources(source) {
  if (!source) return [];
  if (source.primary) {
    return [source.primary, source.fallback].filter(Boolean);
  }
  return [source];
}

/** Random zoomed crop viewport — does not modify the source asset. */
export function SkinCropPreview({ source, seedKey, size = 200, zoomed = true }) {
  const sources = useMemo(() => resolveSkinSources(source), [source]);
  const [sourceIdx, setSourceIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSourceIdx(0);
    setFailed(false);
  }, [seedKey, source]);

  const crop = useMemo(() => {
    const h = hashSeed(seedKey);
    const scale = 2.35 + (h % 65) / 100;
    const imgSize = size * scale;
    const maxShift = Math.max(0, (imgSize - size) / 2);
    const xNorm = (h % 100) / 100;
    const yNorm = ((h >> 7) % 100) / 100;
    return {
      imgSize,
      left: -maxShift + (xNorm * 2 - 1) * maxShift * 0.9,
      top: -maxShift + (yNorm * 2 - 1) * maxShift * 0.9,
    };
  }, [seedKey, size]);

  const activeSource = sources[sourceIdx] || null;

  if (!activeSource || failed) {
    return (
      <View style={[styles.frame, styles.fallback, { width: size, height: size }]}>
        <Text style={styles.fallbackText}>?</Text>
      </View>
    );
  }

  const handleError = () => {
    if (sourceIdx + 1 < sources.length) setSourceIdx(sourceIdx + 1);
    else setFailed(true);
  };

  if (!zoomed) {
    // Reveal: show the full art. Assets vary between portrait card art and
    // landscape wallpapers, so keep `contain` but drop the dark box background
    // so letterboxing blends into the card instead of reading as an off border.
    return (
      <View style={[styles.frame, styles.frameReveal, { width: size, height: size }]}>
        <Image
          source={activeSource}
          style={{ width: size, height: size }}
          contentFit="contain"
          cachePolicy="memory-disk"
          onError={handleError}
        />
      </View>
    );
  }

  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <Image
        source={activeSource}
        style={{
          position: 'absolute',
          width: crop.imgSize,
          height: crop.imgSize,
          left: crop.left,
          top: crop.top,
        }}
        contentFit="cover"
        cachePolicy="memory-disk"
        onError={handleError}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#030712',
    alignSelf: 'center',
  },
  frameReveal: {
    backgroundColor: 'transparent',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: {
    color: '#e5e7eb',
    fontSize: 40,
    fontWeight: '800',
  },
});
