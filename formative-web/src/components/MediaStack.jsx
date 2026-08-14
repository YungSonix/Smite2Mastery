import { useEffect, useState } from 'react';
import { classifyMediaUrl, resolveMediaUrl } from '../lib/mediaUrl';

function OpaqueSrc({ url, children }) {
  const resolved = resolveMediaUrl(url);
  const [src, setSrc] = useState(() =>
    String(resolved || '').startsWith('data:') || String(resolved || '').startsWith('blob:')
      ? resolved
      : ''
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
            body = <audio controls src={src} className="f-q-media-audio" title="" controlsList="nodownload" />;
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
          } else {
            body = (
              <div className="f-media-thumb">
                <img {...mediaProps(src)} />
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
