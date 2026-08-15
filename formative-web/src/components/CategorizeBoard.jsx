import { useMemo, useState } from 'react';
import { remapCategoryValue, remapItemKey } from '../lib/categorize';

function seededShuffle(list, seedStr) {
  const out = [...list];
  let seed = 0;
  const id = String(seedStr || '');
  for (let i = 0; i < id.length; i += 1) seed = (seed * 31 + id.charCodeAt(i)) >>> 0;
  for (let i = out.length - 1; i > 0; i -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function CategorizeBoard({
  mode = 'editor',
  categories = [],
  items = [],
  map = {},
  shuffleSeed = '',
  onChange,
}) {
  const editor = mode === 'editor';
  const [picked, setPicked] = useState('');
  const [over, setOver] = useState('');

  const emit = (next, commitNow) => {
    onChange?.(
      {
        categories: next.categories,
        items: next.items,
        map: next.map,
      },
      { commit: Boolean(commitNow) }
    );
  };

  const assign = (item, category) => {
    const nextMap = { ...map };
    if (!category) delete nextMap[item];
    else nextMap[item] = category;
    setPicked('');
    setOver('');
    emit({ categories, items, map: nextMap }, true);
  };

  const pool = useMemo(() => {
    const catSet = new Set(categories.filter(Boolean));
    const loose = items.filter((item) => {
      const c = map[item];
      return !c || !catSet.has(c);
    });
    if (editor) return loose;
    return seededShuffle(loose, `${shuffleSeed}|pool`);
  }, [items, map, categories, editor, shuffleSeed]);

  const inBucket = (cat) => items.filter((item) => map[item] === cat);

  const onDragStart = (e, item) => {
    e.dataTransfer.setData('text/plain', item);
    e.dataTransfer.effectAllowed = 'move';
    setPicked(item);
  };

  const onDropOn = (e, cat) => {
    e.preventDefault();
    const item = e.dataTransfer.getData('text/plain') || picked;
    if (item) assign(item, cat);
  };

  const chip = (item, idx) => (
    <div
      key={`it-${idx}`}
      className={`f-cat-chip ${picked === item ? 'picked' : ''}`}
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onClick={(e) => {
        e.stopPropagation();
        setPicked((cur) => (cur === item ? '' : item));
      }}
    >
      {editor ? (
        <input
          type="text"
          value={item}
          aria-label="Item"
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            const nextName = e.target.value;
            const nextItems = items.map((x, i) => (i === idx ? nextName : x));
            emit(
              { categories, items: nextItems, map: remapItemKey(map, item, nextName) },
              false
            );
          }}
          onBlur={() => emit({ categories, items, map }, true)}
        />
      ) : (
        <span>{item}</span>
      )}
      {editor ? (
        <button
          type="button"
          className="f-ghost-btn"
          aria-label={`Remove ${item}`}
          onClick={(e) => {
            e.stopPropagation();
            const nextItems = items.filter((_, i) => i !== idx);
            const nextMap = { ...map };
            delete nextMap[item];
            emit({ categories, items: nextItems, map: nextMap }, true);
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );

  const bucket = (cat, idx, isPool) => {
    const key = isPool ? '__pool' : `c-${idx}`;
    const heading = isPool ? 'Unassigned' : null;
    const list = isPool ? pool : inBucket(cat);
    return (
      <div
        key={key}
        className={`f-cat-col ${over === key ? 'over' : ''} ${picked && !isPool ? 'can-drop' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(key);
        }}
        onDragLeave={() => setOver((cur) => (cur === key ? '' : cur))}
        onDrop={(e) => onDropOn(e, isPool ? '' : cat)}
        onClick={() => {
          if (picked && !isPool) assign(picked, cat);
          if (picked && isPool) assign(picked, '');
        }}
      >
        {isPool ? (
          <div className="f-cat-col-head">{heading}</div>
        ) : editor ? (
          <div className="f-cat-col-head">
            <input
              type="text"
              value={cat}
              aria-label={`Category ${idx + 1}`}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => {
                const nextName = e.target.value;
                const nextCats = categories.map((c, i) => (i === idx ? nextName : c));
                emit(
                  { categories: nextCats, items, map: remapCategoryValue(map, cat, nextName) },
                  false
                );
              }}
              onBlur={() => emit({ categories, items, map }, true)}
            />
            <button
              type="button"
              className="f-ghost-btn"
              aria-label={`Remove category ${cat}`}
              onClick={(e) => {
                e.stopPropagation();
                const nextCats = categories.filter((_, i) => i !== idx);
                const nextMap = { ...map };
                for (const [k, v] of Object.entries(nextMap)) {
                  if (v === cat) delete nextMap[k];
                }
                emit({ categories: nextCats, items, map: nextMap }, true);
              }}
            >
              ×
            </button>
          </div>
        ) : (
          <div className="f-cat-col-head">{cat || `Category ${idx + 1}`}</div>
        )}
        <div className="f-cat-chips">
          {list.map((item) => chip(item, items.indexOf(item)))}
        </div>
        {isPool && editor ? (
          <button
            type="button"
            className="f-outline-btn"
            style={{ marginTop: 8 }}
            onClick={(e) => {
              e.stopPropagation();
              const nextItems = [...items, `Item ${items.length + 1}`];
              emit({ categories, items: nextItems, map }, true);
            }}
          >
            + Item
          </button>
        ) : null}
        {!isPool && picked ? (
          <div className="f-muted" style={{ fontSize: 12, marginTop: 8 }}>
            Tap to place here
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="f-cat-board">
      <p className="f-muted" style={{ fontSize: 12, margin: '10px 0 8px' }}>
        {editor
          ? 'Drag or tap an item, then tap a bucket. The buckets are the answer key. For a numbered sequence, change the type to Order list.'
          : 'Drag or tap an item, then tap the bucket it belongs in.'}
      </p>
      <div className="f-cat-grid">
        {bucket('', -1, true)}
        {categories.map((cat, idx) => bucket(cat, idx, false))}
      </div>
      {editor ? (
        <button
          type="button"
          className="f-outline-btn"
          style={{ marginTop: 10 }}
          onClick={() => {
            emit(
              { categories: [...categories, `Category ${categories.length + 1}`], items, map },
              true
            );
          }}
        >
          + Bucket
        </button>
      ) : null}
    </div>
  );
}
