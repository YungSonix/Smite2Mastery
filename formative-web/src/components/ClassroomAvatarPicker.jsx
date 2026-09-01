import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KIND_LABELS,
  AVATAR_ENTRIES,
  getUseSkinJsonIcons,
  resolveAvatarEntryUrl,
  resolveGodPortraitUrl,
  searchAvatarCatalog,
  setUseSkinJsonIcons,
} from '../lib/classroomAvatars';

const PLACEHOLDER_SVG =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="#0b1220" width="64" height="64"/><text x="32" y="38" text-anchor="middle" fill="#7dd3fc" font-size="20">?</text></svg>'
  );

export default function ClassroomAvatarPicker({ open, student, onClose, onSave, busy }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [picked, setPicked] = useState(null);
  const [useSkinJsonIcons, setUseSkinJsonIconsState] = useState(() => getUseSkinJsonIcons());

  useEffect(() => {
    if (!open || !student) return;
    setQuery('');
    setKind('all');
    setUseSkinJsonIconsState(getUseSkinJsonIcons());
    setPicked({
      kind: student.avatarKind || 'badge',
      ref: student.avatarRef || student.avatarBadge || '',
      url: student.avatarUrl,
      label: student.badgeLabel,
      fallbackUrl: student.avatarFallbackUrl || null,
    });
  }, [open, student]);

  const handleSkinJsonToggle = useCallback((next) => {
    setUseSkinJsonIcons(next);
    setUseSkinJsonIconsState(next);
    setPicked((prev) => {
      if (!prev?.ref) return prev;
      const hit = AVATAR_ENTRIES.find((e) => e.kind === prev.kind && e.ref === prev.ref);
      const entry = hit || { kind: prev.kind, ref: prev.ref, godName: prev.godName };
      return {
        ...prev,
        url: resolveAvatarEntryUrl(entry, { useSkinJsonIcons: next }),
        fallbackUrl:
          entry.kind === 'skin' && entry.godName ? resolveGodPortraitUrl(entry.godName) : prev.fallbackUrl,
      };
    });
  }, []);

  const results = useMemo(
    () => searchAvatarCatalog({ query, kind, useSkinJsonIcons }),
    [query, kind, useSkinJsonIcons]
  );

  const handleAvatarImgError = useCallback((e, item) => {
    const img = e.currentTarget;
    if (img.dataset.fallback !== '1' && item?.fallbackUrl && img.src !== item.fallbackUrl) {
      img.dataset.fallback = '1';
      img.src = item.fallbackUrl;
      return;
    }
    img.src = PLACEHOLDER_SVG;
  }, []);

  if (!open || !student) return null;

  const canSave =
    picked?.kind &&
    picked?.ref &&
    (picked.kind !== student.avatarKind || picked.ref !== student.avatarRef);

  return (
    <div className="f-overlay" role="presentation" onClick={onClose}>
      <div
        className="f-modal f-modal-wide f-avatar-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avatar-picker-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="f-modal-head">
          <div>
            <h2 id="avatar-picker-title">Change avatar</h2>
            <p className="f-muted f-avatar-picker-sub">
              {student.ingame} · {student.discord}
            </p>
          </div>
          <button type="button" className="f-classroom-sheet-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="f-avatar-picker-toolbar">
          <input
            type="search"
            className="f-hub-input f-avatar-picker-search"
            placeholder="Search badges, gods, skins… (e.g. Athena Star Guardian)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="f-classroom-filters f-avatar-picker-filters">
            {['all', 'badge', 'god', 'skin'].map((id) => (
              <button
                key={id}
                type="button"
                className={kind === id ? 'is-active' : ''}
                onClick={() => setKind(id)}
              >
                {KIND_LABELS[id]}
              </button>
            ))}
          </div>
          <label className="f-avatar-picker-skin-toggle f-toggle-row">
            <span>
              Use skin icons from god data
              <small>
                {useSkinJsonIcons
                  ? 'Icons resolve from Skins JSON paths (/media in dev)'
                  : 'Legacy catalog GitHub URLs'}
              </small>
            </span>
            <input
              type="checkbox"
              className="f-switch"
              checked={useSkinJsonIcons}
              onChange={(e) => handleSkinJsonToggle(e.target.checked)}
            />
          </label>
        </div>

        <div className="f-avatar-picker-preview">
          <img
            src={picked?.url || student.avatarUrl}
            alt=""
            className="f-avatar-picker-preview-img"
            referrerPolicy="no-referrer"
            onError={(e) =>
              handleAvatarImgError(e, {
                fallbackUrl: picked?.fallbackUrl || student.avatarFallbackUrl,
              })
            }
          />
          <div>
            <div className="f-avatar-picker-preview-label">{picked?.label || student.badgeLabel}</div>
            <div className="f-muted f-avatar-picker-preview-kind">
              {picked?.kind ? KIND_LABELS[picked.kind] || picked.kind : 'Avatar'}
            </div>
          </div>
        </div>

        <div className="f-avatar-picker-grid-wrap">
          {results.length ? (
            <div className="f-avatar-picker-grid">
              {results.map((item) => {
                const active = picked?.kind === item.kind && picked?.ref === item.ref;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`f-avatar-picker-option ${active ? 'is-active' : ''}`}
                    title={item.label}
                    onClick={() =>
                      setPicked({
                        kind: item.kind,
                        ref: item.ref,
                        url: item.url,
                        label: item.label,
                        godName: item.godName,
                        fallbackUrl: item.fallbackUrl,
                      })
                    }
                  >
                    <img
                      src={item.url}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => handleAvatarImgError(e, item)}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="f-muted f-avatar-picker-empty">No matches — try another name or filter.</p>
          )}
        </div>

        <div className="f-avatar-picker-actions">
          <button type="button" className="f-ghost-btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="f-outline-btn"
            disabled={!canSave || busy}
            onClick={() => onSave({ kind: picked.kind, ref: picked.ref })}
          >
            {busy ? 'Saving…' : 'Save avatar'}
          </button>
        </div>
      </div>
    </div>
  );
}
