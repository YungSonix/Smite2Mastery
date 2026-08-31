import { useEffect, useMemo, useState } from 'react';
import { KIND_LABELS, searchAvatarCatalog } from '../lib/classroomAvatars';

export default function ClassroomAvatarPicker({ open, student, onClose, onSave, busy }) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    if (!open || !student) return;
    setQuery('');
    setKind('all');
    setPicked({
      kind: student.avatarKind || 'badge',
      ref: student.avatarRef || student.avatarBadge || '',
      url: student.avatarUrl,
      label: student.badgeLabel,
    });
  }, [open, student]);

  const results = useMemo(
    () => searchAvatarCatalog({ query, kind, limit: 84 }),
    [query, kind]
  );

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
        </div>

        <div className="f-avatar-picker-preview">
          <img src={picked?.url || student.avatarUrl} alt="" className="f-avatar-picker-preview-img" />
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
                      })
                    }
                  >
                    <img
                      src={item.url}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src =
                          'data:image/svg+xml,' +
                          encodeURIComponent(
                            '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect fill="#0b1220" width="64" height="64"/><text x="32" y="38" text-anchor="middle" fill="#7dd3fc" font-size="20">?</text></svg>'
                          );
                      }}
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
