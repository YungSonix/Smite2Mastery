import { classifyMediaUrl, resolveMediaUrl } from '../lib/mediaUrl';

export default function MediaStack({
  urls,
  editable = false,
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
        const src = resolveMediaUrl(url);
        let body = null;
        if (kind === 'audio') {
          body = <audio controls src={src} className="f-q-media-audio" />;
        } else if (kind === 'video') {
          body = <video controls src={src} className="f-q-media-video" />;
        } else if (kind === 'embed') {
          body = (
            <div className="f-embed-frame">
              <iframe title="embed" src={src} allowFullScreen />
            </div>
          );
        } else if (hotspot && i === 0) {
          body = (
            <button type="button" className="f-q-media-frame f-hotspot-wrap" onClick={onHotspot}>
              <img src={src} alt="" />
              {hotspotMark}
            </button>
          );
        } else {
          body = (
            <div className="f-media-thumb">
              <img src={src} alt="" />
            </div>
          );
        }
        return (
          <div className="f-media-item" key={`${i}-${String(url).slice(0, 48)}`}>
            {body}
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
