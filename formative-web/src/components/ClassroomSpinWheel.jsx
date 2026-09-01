import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const WHEEL_POOL_KEY = 'classroom_wheel_pool';

function loadWheelPool() {
  try {
    const raw = localStorage.getItem(WHEEL_POOL_KEY);
    if (!raw) return { manualNames: [], includeFiltered: true };
    const parsed = JSON.parse(raw);
    return {
      manualNames: Array.isArray(parsed.manualNames) ? parsed.manualNames : [],
      includeFiltered: parsed.includeFiltered !== false,
    };
  } catch {
    return { manualNames: [], includeFiltered: true };
  }
}

function saveWheelPool(state) {
  try {
    localStorage.setItem(WHEEL_POOL_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

const WHEEL_COLORS = [
  '#0ea5e9',
  '#14b8a6',
  '#22d3ee',
  '#2dd4bf',
  '#38bdf8',
  '#06b6d4',
  '#0891b2',
  '#0d9488',
  '#0284c7',
  '#059669',
  '#10b981',
  '#34d399',
];

function buildWheelGradient(count) {
  if (count <= 0) return 'conic-gradient(#1e293b 0deg 360deg)';
  const step = 360 / count;
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
    parts.push(`${color} ${i * step}deg ${(i + 1) * step}deg`);
  }
  return `conic-gradient(${parts.join(', ')})`;
}

export default function ClassroomSpinWheel({ visibleStudents = [], poolLabel = 'filtered roster' }) {
  const [open, setOpen] = useState(true);
  const [poolState, setPoolState] = useState(loadWheelPool);
  const [nameInput, setNameInput] = useState('');
  const [poolSearch, setPoolSearch] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const wheelRef = useRef(null);

  useEffect(() => {
    saveWheelPool(poolState);
  }, [poolState]);

  const filteredStudentNames = useMemo(
    () =>
      visibleStudents.map((s) => ({
        id: s.discordKey,
        label: s.ingame && s.ingame !== '—' ? s.ingame : s.discord,
        source: 'student',
      })),
    [visibleStudents]
  );

  const wheelNames = useMemo(() => {
    const seen = new Set();
    const list = [];
    if (poolState.includeFiltered) {
      for (const entry of filteredStudentNames) {
        const key = entry.label.trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        list.push(entry);
      }
    }
    for (const raw of poolState.manualNames) {
      const label = String(raw || '').trim();
      const key = label.toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push({ id: `manual-${key}`, label, source: 'manual' });
    }
    return list;
  }, [poolState, filteredStudentNames]);

  const filteredPoolDisplay = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    if (!q) return wheelNames;
    return wheelNames.filter((n) => n.label.toLowerCase().includes(q));
  }, [wheelNames, poolSearch]);

  const addManualName = useCallback(() => {
    const label = nameInput.trim();
    if (!label) return;
    setPoolState((prev) => {
      const exists = prev.manualNames.some((n) => n.toLowerCase() === label.toLowerCase());
      if (exists) return prev;
      return { ...prev, manualNames: [...prev.manualNames, label] };
    });
    setNameInput('');
  }, [nameInput]);

  const removeManualName = useCallback((label) => {
    setPoolState((prev) => ({
      ...prev,
      manualNames: prev.manualNames.filter((n) => n !== label),
    }));
  }, []);

  const spin = useCallback(() => {
    if (spinning || wheelNames.length < 2) return;
    const count = wheelNames.length;
    const winnerIdx = Math.floor(Math.random() * count);
    const segment = 360 / count;
    const extraSpins = 4 + Math.floor(Math.random() * 3);
    const target =
      extraSpins * 360 + (360 - winnerIdx * segment - segment / 2);

    setWinner(null);
    setSpinning(true);
    setRotation((prev) => {
      const base = prev % 360;
      return prev - base + target;
    });

    window.setTimeout(() => {
      setSpinning(false);
      setWinner(wheelNames[winnerIdx]?.label || null);
    }, 4200);
  }, [spinning, wheelNames]);

  const gradient = buildWheelGradient(wheelNames.length);

  return (
    <section className="f-classroom-wheel-section">
      <button
        type="button"
        className="f-classroom-wheel-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>Spin the wheel</span>
        <span className="f-muted">{open ? '▲' : '▼'}</span>
      </button>

      {open ? (
        <div className="f-classroom-wheel-body">
          <p className="f-muted f-classroom-wheel-hint">
            Pick a random name from your {poolLabel} and/or a manual list. Pool saves in this
            browser ({wheelNames.length} name{wheelNames.length === 1 ? '' : 's'}).
          </p>

          <div className="f-classroom-wheel-layout">
            <div className="f-classroom-wheel-stage">
              <div className="f-classroom-wheel-wrap">
                <div
                  ref={wheelRef}
                  className={`f-classroom-wheel ${spinning ? 'is-spinning' : ''}`}
                  style={{
                    background: gradient,
                    transform: `rotate(${rotation}deg)`,
                  }}
                  aria-hidden={wheelNames.length < 2}
                >
                  <div className="f-classroom-wheel-hub" />
                </div>
                <div className="f-classroom-wheel-pointer" aria-hidden />
              </div>
              {winner ? (
                <p className="f-classroom-wheel-winner">
                  Winner: <strong>{winner}</strong>
                </p>
              ) : (
                <p className="f-muted f-classroom-wheel-winner">
                  {wheelNames.length < 2 ? 'Add at least 2 names' : 'Tap spin when ready'}
                </p>
              )}
              <button
                type="button"
                className="f-primary-btn f-classroom-wheel-spin-btn"
                disabled={spinning || wheelNames.length < 2}
                onClick={spin}
              >
                {spinning ? 'Spinning…' : 'Spin'}
              </button>
            </div>

            <div className="f-classroom-wheel-controls">
              <label className="f-classroom-wheel-check">
                <input
                  type="checkbox"
                  checked={poolState.includeFiltered}
                  onChange={(e) =>
                    setPoolState((prev) => ({ ...prev, includeFiltered: e.target.checked }))
                  }
                />
                Include {poolLabel} ({filteredStudentNames.length})
              </label>

              <div className="f-classroom-wheel-add">
                <input
                  type="text"
                  className="f-hub-input"
                  placeholder="Add manual name…"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addManualName();
                    }
                  }}
                />
                <button type="button" className="f-outline-btn f-compact" onClick={addManualName}>
                  Add
                </button>
              </div>

              <div className="f-classroom-wheel-filter">
                <input
                  type="search"
                  className="f-hub-input"
                  placeholder="Filter pool…"
                  value={poolSearch}
                  onChange={(e) => setPoolSearch(e.target.value)}
                />
              </div>

              <ul className="f-classroom-wheel-pool">
                {filteredPoolDisplay.length ? (
                  filteredPoolDisplay.map((entry) => (
                    <li key={entry.id}>
                      <span>{entry.label}</span>
                      <span className="f-muted f-classroom-wheel-pool-tag">
                        {entry.source === 'manual' ? 'manual' : 'student'}
                      </span>
                      {entry.source === 'manual' ? (
                        <button
                          type="button"
                          className="f-classroom-wheel-remove"
                          onClick={() => removeManualName(entry.label)}
                          aria-label={`Remove ${entry.label}`}
                        >
                          ×
                        </button>
                      ) : null}
                    </li>
                  ))
                ) : (
                  <li className="f-muted">No names in pool.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
