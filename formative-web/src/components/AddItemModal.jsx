import { ADD_GROUPS } from '../lib/questionTypes';

function TypeIcon({ kind }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    'aria-hidden': true,
  };
  switch (kind) {
    case 'radio':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.5" />
          <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
          <path d="M5 8.2 7.1 10.2 11 5.8" />
        </svg>
      );
    case 'select':
      return (
        <svg {...common}>
          <rect x="2" y="3.5" width="12" height="9" rx="1.5" />
          <path d="M5.5 8.2 8 10.5 10.5 8.2" />
        </svg>
      );
    case 'text':
      return (
        <svg {...common}>
          <path d="M3 4.5h10M5.5 4.5v7M10.5 4.5v7M4.5 11.5h7" />
        </svg>
      );
    case 'blank':
      return (
        <svg {...common}>
          <path d="M2.5 11.5h11M4 5.5h3.5M9 5.5h3" />
          <path d="M5.5 5.5v6M10.5 5.5v6" opacity="0.5" />
        </svg>
      );
    case 'paragraph':
      return (
        <svg {...common}>
          <path d="M3 4.5h10M3 8h10M3 11.5h7" />
        </svg>
      );
    case 'highlight':
      return (
        <svg {...common}>
          <path d="M3 11.5h10" />
          <rect x="4" y="4" width="8" height="5" rx="1" fill="currentColor" opacity="0.25" stroke="none" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <path d="M3 12.5V3.5M3 12.5h10" />
          <path d="M5.5 10V7.5M8 10V5M10.5 10V6.5" />
        </svg>
      );
    case 'link':
      return (
        <svg {...common}>
          <path d="M6.5 9.5 9.5 6.5" />
          <path d="M7.2 4.8a2.4 2.4 0 0 1 3.4 3.4L9.5 9.3" />
          <path d="M8.8 11.2a2.4 2.4 0 0 1-3.4-3.4L6.5 6.7" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
          <path d="M8 2.5v11M2.5 8h11" />
        </svg>
      );
    case 'folders':
      return (
        <svg {...common}>
          <path d="M2.5 5.5h4l1.2 1.3H13.5v5.2a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1z" />
        </svg>
      );
    case 'drag':
      return (
        <svg {...common}>
          <path d="M5 3.5h6M5 8h6M5 12.5h6" />
          <circle cx="3.2" cy="3.5" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="3.2" cy="8" r="0.8" fill="currentColor" stroke="none" />
          <circle cx="3.2" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'file':
      return (
        <svg {...common}>
          <path d="M4.5 2.5h5l3 3V13.5a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1z" />
          <path d="M9.5 2.5V5.5h3" />
        </svg>
      );
    case 'mic':
      return (
        <svg {...common}>
          <rect x="6" y="2.5" width="4" height="7" rx="2" />
          <path d="M4.5 8.5a3.5 3.5 0 0 0 7 0M8 12v1.5" />
        </svg>
      );
    case 'pen':
      return (
        <svg {...common}>
          <path d="M9.5 3.5 12.5 6.5 6 13H3v-3z" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="5.5" />
          <circle cx="8" cy="8" r="2.5" />
          <circle cx="8" cy="8" r="0.8" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'image':
      return (
        <svg {...common}>
          <rect x="2" y="3" width="12" height="10" rx="1.5" />
          <circle cx="5.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          <path d="M3.5 11.5 6.5 8.5 9 10.5 12.5 6.5" />
        </svg>
      );
    case 'audio':
      return (
        <svg {...common}>
          <path d="M4 6.5v3M6.5 4.5v7M9 5.5v5M11.5 3.5v9" />
        </svg>
      );
    case 'video':
      return (
        <svg {...common}>
          <rect x="2" y="4" width="8.5" height="8" rx="1.5" />
          <path d="M10.5 7 14 5v6l-3.5-2z" />
        </svg>
      );
    case 'block':
      return (
        <svg {...common}>
          <rect x="2.5" y="3" width="11" height="10" rx="1.5" />
          <path d="M5 6.5h6M5 9.5h4" />
        </svg>
      );
    case 'embed':
      return (
        <svg {...common}>
          <path d="M5.5 4.5 2.5 8l3 3.5M10.5 4.5l3 3.5-3 3.5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M3 4.5h10M3 8h10M3 11.5h7" />
        </svg>
      );
  }
}

export default function AddItemModal({ open, onClose, onAdd }) {
  if (!open) return null;

  const pick = (item) => {
    onAdd(item.type);
    onClose();
  };

  return (
    <div className="f-overlay" onClick={onClose} role="presentation">
      <div className="f-modal f-modal-wide" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="f-modal-head">
          <div className="f-modal-tabs">
            <button type="button" className="f-modal-tab active">
              Add Item
            </button>
          </div>
          <button type="button" className="f-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="f-modal-body f-modal-body-add">
          <div className="f-add-sections">
            {ADD_GROUPS.map((group) => (
              <section className="f-add-section" key={group.id}>
                <h4>{group.label}</h4>
                <div className="f-add-section-grid">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="f-add-item"
                      onClick={() => pick(item)}
                    >
                      <span className="f-add-icon">
                        <TypeIcon kind={item.icon} />
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside className="f-add-side">
            <h4>For you & helpers</h4>
            <p>
              All types are free on your host site. Guests only see the take link, never this
              editor, Responses, or Analytics.
            </p>
            <p style={{ marginTop: 10 }}>
              File / audio / drawing answers are stored for host review (not auto-scored).
            </p>
          </aside>
        </div>
        <div className="f-add-footer">
          <div className="f-quickbar">
            <button
              type="button"
              className="plus"
              onClick={() => onAdd('multiple_choice')}
              aria-label="Add"
            >
              +
            </button>
            <button type="button" className="f-quick-btn" onClick={() => onAdd('multiple_choice')}>
              Multiple Choice
            </button>
            <button type="button" className="f-quick-btn" onClick={() => onAdd('true_false')}>
              True or False
            </button>
            <button type="button" className="f-quick-btn" onClick={() => onAdd('short_answer')}>
              Short Answer
            </button>
            <button type="button" className="f-quick-btn" onClick={() => onAdd('image')}>
              Image
            </button>
            <button type="button" className="f-quick-btn" onClick={() => onAdd('audio')}>
              Audio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
