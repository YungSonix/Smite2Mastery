import { useEffect, useRef, useState } from 'react';
import { classifyMediaUrl, resolveMediaUrl } from '../lib/mediaUrl';
import SkinCropThumb from './SkinCropThumb';

function HostAudioPlayer({ src, autoPlayToken }) {
  const audioRef = useRef(null);

  useEffect(() => {
    if (!autoPlayToken || !src) return undefined;
    const el = audioRef.current;
    if (!el) return undefined;
    el.pause();
    el.currentTime = 0;
    const playPromise = el.play();
    if (playPromise?.catch) playPromise.catch(() => {});
    return undefined;
  }, [autoPlayToken, src]);

  return (
    <audio
      ref={audioRef}
      controls
      src={src}
      className="f-q-media-audio"
      title=""
      controlsList="nodownload"
    />
  );
}

function TakeAudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [phase, setPhase] = useState('idle');

  useEffect(() => {
    setPhase('idle');
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }, [src]);

  const play = () => {
    const el = audioRef.current;
    if (!el || !src) return;
    el.play()
      .then(() => setPhase('playing'))
      .catch(() => setPhase('idle'));
  };

  return (
    <div className="f-take-audio">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onEnded={() => setPhase('ended')}
      />
      {phase === 'playing' ? (
        <p className="f-take-audio-status">Playing voice line…</p>
      ) : (
        <button type="button" className="f-take-audio-btn" onClick={play}>
          {phase === 'ended' ? 'Replay' : 'Play voice line'}
        </button>
      )}
    </div>
  );
}

function OpaqueSrc({ url, children }) {
  const resolved = resolveMediaUrl(url);
  const [src, setSrc] = useState(() =>
    String(resolved || '').startsWith('data:') || String(resolved || '').startsWith('blob:')
      ? resolved
      : resolved || ''
  );

  useEffect(() => {
    const s = resolveMediaUrl(url);
    if (!s) {
      setSrc('');
      return undefined;
    }
    if (s.startsWith('data:') || s.startsWith('blob:')) {
      setSrc(s);
      return undefined;
    }
    let objectUrl = '';
    let alive = true;
    fetch(s)
      .then((res) => {
        if (!res.ok) throw new Error('media');
        return res.blob();
      })
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (alive) setSrc(s);
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return children(src);
}

function ThumbImg({ src }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (failed) {
    return <p className="f-media-load-fail f-muted">Image failed to load</p>;
  }
  return (
    <img
      {...mediaProps(src)}
      onError={() => setFailed(true)}
    />
  );
}

function mediaProps(src) {
  return {
    src,
    alt: '',
    title: '',
    draggable: false,
    onContextMenu: (e) => e.preventDefault(),
  };
}

export default function MediaStack({
  urls,
  editable = false,
  opaque = false,
  onRemove,
  hotspot = false,
  hotspotMark = null,
  onHotspot,
  imageCrop = '',
  imageCropSeed = '',
  autoPlayAudioToken = null,
}) {
  const list = (urls || []).filter(Boolean);
  if (!list.length) return null;

  return (
    <div className={`f-media-grid ${list.length === 1 ? 'is-single' : ''}`}>
      {list.map((url, i) => {
        const kind = classifyMediaUrl(url);
        const render = (src) => {
          if (!src) return <div className="f-media-thumb f-muted">Loading…</div>;
          let body = null;
          if (kind === 'audio') {
            body = opaque ? (
              <TakeAudioPlayer src={src} />
            ) : (
              <HostAudioPlayer src={src} autoPlayToken={autoPlayAudioToken} />
            );
          } else if (kind === 'video') {
            body = (
              <video
                controls
                src={src}
                className="f-q-media-video"
                title=""
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
              />
            );
          } else if (kind === 'embed') {
            body = (
              <div className="f-embed-frame">
                <iframe title="embed" src={resolveMediaUrl(url)} allowFullScreen />
              </div>
            );
          } else if (hotspot && i === 0) {
            body = (
              <button type="button" className="f-q-media-frame f-hotspot-wrap" onClick={onHotspot}>
                <img {...mediaProps(src)} />
                {hotspotMark}
              </button>
            );
          } else if (imageCrop === 'skin_zoom_center' && i === 0) {
            body = (
              <div className="f-media-thumb f-media-thumb-crop f-question-media-crop">
                <SkinCropThumb src={src} seed={imageCropSeed || src} />
              </div>
            );
          } else {
            body = (
              <div className="f-media-thumb">
                <ThumbImg src={src} />
              </div>
            );
          }
          return body;
        };

        return (
          <div className="f-media-item" key={`${i}-${String(url).slice(0, 48)}`}>
            {opaque && kind !== 'embed' ? (
              <OpaqueSrc url={url}>{render}</OpaqueSrc>
            ) : (
              render(resolveMediaUrl(url))
            )}
            {editable ? (
              <button
                type="button"
                className="f-media-thumb-x"
                title="Remove"
                onClick={() => onRemove?.(i)}
              >
                ×
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
