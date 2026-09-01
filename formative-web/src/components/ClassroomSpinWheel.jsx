import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildSpinWheelNames } from '../lib/triviaPlayerStats';

const WHEEL_POOL_KEY = 'classroom_wheel_pool';
const WHEEL_PRIZES_KEY = 'classroom_wheel_prizes';
const SPIN_MS = 4200;

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

function loadPrizePool() {
  try {
    const raw = localStorage.getItem(WHEEL_PRIZES_KEY);
    if (!raw) return { prizes: [] };
    const parsed = JSON.parse(raw);
    return { prizes: Array.isArray(parsed.prizes) ? parsed.prizes : [] };
  } catch {
    return { prizes: [] };
  }
}

function savePrizePool(state) {
  try {
    localStorage.setItem(WHEEL_PRIZES_KEY, JSON.stringify(state));
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

const PRIZE_COLORS = [
  '#f59e0b',
  '#f97316',
  '#fb923c',
  '#eab308',
  '#fbbf24',
  '#fcd34d',
  '#fde68a',
  '#d97706',
  '#ea580c',
  '#ca8a04',
  '#facc15',
  '#fdba74',
];

function buildWheelGradient(count, palette = WHEEL_COLORS) {
  if (count <= 0) return 'conic-gradient(#1e293b 0deg 360deg)';
  const step = 360 / count;
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const color = palette[i % palette.length];
    parts.push(`${color} ${i * step}deg ${(i + 1) * step}deg`);
  }
  return `conic-gradient(${parts.join(', ')})`;
}

function pickSpinTarget(count) {
  const winnerIdx = Math.floor(Math.random() * count);
  const segment = 360 / count;
  const extraSpins = 4 + Math.floor(Math.random() * 3);
  const target = extraSpins * 360 + (360 - winnerIdx * segment - segment / 2);
  return { winnerIdx, target };
}

function WheelStage({
  title,
  labels,
  rotation,
  spinning,
  palette,
  emptyHint,
}) {
  const gradient = buildWheelGradient(labels.length, palette);
  return (
    <div className="f-classroom-wheel-stage">
      <h4 className="f-classroom-wheel-stage-title">{title}</h4>
      <div className="f-classroom-wheel-wrap">
        <div
          className={`f-classroom-wheel ${spinning ? 'is-spinning' : ''}`}
          style={{
            background: gradient,
            transform: `rotate(${rotation}deg)`,
          }}
          aria-hidden={labels.length < 2}
        >
          <div className="f-classroom-wheel-hub" />
        </div>
        <div className="f-classroom-wheel-pointer" aria-hidden />
      </div>
      {labels.length < 2 ? (
        <p className="f-muted f-classroom-wheel-stage-hint">{emptyHint}</p>
      ) : null}
    </div>
  );
}

function PoolControls({
  addPlaceholder,
  filterPlaceholder,
  inputValue,
  onInputChange,
  onAdd,
  search,
  onSearchChange,
  entries,
  emptyLabel,
  onRemove,
  removableSource,
  tagForSource,
  extraActions,
}) {
  return (
    <div className="f-classroom-wheel-controls">
      {extraActions}
      <div className="f-classroom-wheel-add">
        <input
          type="text"
          className="f-hub-input"
          placeholder={addPlaceholder}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        <button type="button" className="f-outline-btn f-compact" onClick={onAdd}>
          Add
        </button>
      </div>
      <div className="f-classroom-wheel-filter">
        <input
          type="search"
          className="f-hub-input"
          placeholder={filterPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <ul className="f-classroom-wheel-pool">
        {entries.length ? (
          entries.map((entry) => (
            <li key={entry.id}>
              <span>{entry.label}</span>
              <span className="f-muted f-classroom-wheel-pool-tag">
                {tagForSource(entry.source)}
              </span>
              {entry.source === removableSource ? (
                <button
                  type="button"
                  className="f-classroom-wheel-remove"
                  onClick={() => onRemove(entry.label)}
                  aria-label={`Remove ${entry.label}`}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))
        ) : (
          <li className="f-muted">{emptyLabel}</li>
        )}
      </ul>
    </div>
  );
}

export default function ClassroomSpinWheel({
  filteredStudents = [],
  classRoster = [],
  poolLabel = 'giveaway pool',
  onPoolChange,
}) {
  const [open, setOpen] = useState(true);
  const [poolState, setPoolState] = useState(loadWheelPool);
  const [prizeState, setPrizeState] = useState(loadPrizePool);
  const [nameInput, setNameInput] = useState('');
  const [prizeInput, setPrizeInput] = useState('');
  const [poolSearch, setPoolSearch] = useState('');
  const [prizeSearch, setPrizeSearch] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [nameRotation, setNameRotation] = useState(0);
  const [prizeRotation, setPrizeRotation] = useState(0);
  const [winner, setWinner] = useState(null);
  const [prize, setPrize] = useState(null);

  useEffect(() => {
    saveWheelPool(poolState);
  }, [poolState]);

  useEffect(() => {
    savePrizePool(prizeState);
  }, [prizeState]);

  const wheelNames = useMemo(
    () =>
      buildSpinWheelNames({
        filteredStudents,
        manualNames: poolState.manualNames,
        includeFiltered: poolState.includeFiltered,
      }),
    [poolState, filteredStudents]
  );

  const prizeLabels = useMemo(
    () =>
      prizeState.prizes.map((label, i) => ({
        id: `prize-${i}-${label}`,
        label,
        source: 'prize',
      })),
    [prizeState.prizes]
  );

  useEffect(() => {
    onPoolChange?.(wheelNames);
  }, [wheelNames, onPoolChange]);

  const filteredPoolDisplay = useMemo(() => {
    const q = poolSearch.trim().toLowerCase();
    if (!q) return wheelNames;
    return wheelNames.filter((n) => n.label.toLowerCase().includes(q));
  }, [wheelNames, poolSearch]);

  const filteredPrizeDisplay = useMemo(() => {
    const q = prizeSearch.trim().toLowerCase();
    if (!q) return prizeLabels;
    return prizeLabels.filter((n) => n.label.toLowerCase().includes(q));
  }, [prizeLabels, prizeSearch]);

  const nameLabels = useMemo(() => wheelNames.map((e) => e.label), [wheelNames]);
  const prizeLabelStrings = useMemo(() => prizeLabels.map((e) => e.label), [prizeLabels]);

  const canSpinNames = nameLabels.length >= 2;
  const canSpinPrizes = prizeLabelStrings.length >= 2;

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

  const addPrize = useCallback(() => {
    const label = prizeInput.trim();
    if (!label) return;
    setPrizeState((prev) => {
      const exists = prev.prizes.some((n) => n.toLowerCase() === label.toLowerCase());
      if (exists) return prev;
      return { ...prev, prizes: [...prev.prizes, label] };
    });
    setPrizeInput('');
  }, [prizeInput]);

  const removePrize = useCallback((label) => {
    setPrizeState((prev) => ({
      ...prev,
      prizes: prev.prizes.filter((n) => n !== label),
    }));
  }, []);

  const importClassRoster = useCallback(() => {
    if (!classRoster.length) return;
    setPoolState((prev) => {
      const seen = new Set(prev.manualNames.map((n) => n.toLowerCase()));
      if (prev.includeFiltered) {
        for (const entry of buildSpinWheelNames({
          filteredStudents,
          manualNames: [],
          includeFiltered: true,
        })) {
          seen.add(entry.label.toLowerCase());
        }
      }
      const added = [];
      for (const student of classRoster) {
        const ingame = String(student.ingame || '').trim();
        const discord = String(student.discord || '').trim();
        const label = ingame && ingame !== '—' ? ingame : discord;
        const key = label.toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        added.push(label);
      }
      if (!added.length) return prev;
      return { ...prev, manualNames: [...prev.manualNames, ...added] };
    });
  }, [classRoster, filteredStudents]);

  const spin = useCallback(() => {
    if (spinning) return;
    const spinNames = nameLabels.length >= 2;
    const spinPrizes = prizeLabelStrings.length >= 2;
    if (!spinNames && !spinPrizes) return;
    if (!spinNames) return;

    setWinner(null);
    setPrize(null);
    setSpinning(true);

    if (spinNames) {
      const { winnerIdx, target } = pickSpinTarget(nameLabels.length);
      setNameRotation((prev) => {
        const base = prev % 360;
        return prev - base + target;
      });
      window.setTimeout(() => {
        setWinner(nameLabels[winnerIdx] || null);
      }, SPIN_MS);
    }

    if (spinPrizes) {
      const { winnerIdx, target } = pickSpinTarget(prizeLabelStrings.length);
      setPrizeRotation((prev) => {
        const base = prev % 360;
        return prev - base + target;
      });
      window.setTimeout(() => {
        setPrize(prizeLabelStrings[winnerIdx] || null);
      }, SPIN_MS);
    }

    window.setTimeout(() => setSpinning(false), SPIN_MS);
  }, [spinning, nameLabels, prizeLabelStrings]);

  const resultText = useMemo(() => {
    if (!winner && !prize) return null;
    if (winner && prize) return (
      <>
        <strong>{winner}</strong> wins <strong>{prize}</strong>
      </>
    );
    if (winner) return (
      <>
        Winner: <strong>{winner}</strong>
      </>
    );
    return (
      <>
        Prize: <strong>{prize}</strong>
      </>
    );
  }, [winner, prize]);

  const spinHint = useMemo(() => {
    if (spinning) return 'Spinning…';
    if (!canSpinNames) return 'Add at least 2 names';
    if (canSpinPrizes) return 'Spin both wheels when ready';
    return 'Spin for a winner (add 2+ prizes to spin both)';
  }, [spinning, canSpinNames, canSpinPrizes]);

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
            Pick a random winner from your {poolLabel} and/or manual list. Optionally spin a prize
            wheel at the same time. Pools save in this browser ({wheelNames.length} name
            {wheelNames.length === 1 ? '' : 's'}
            {prizeLabelStrings.length ? ` · ${prizeLabelStrings.length} prize${prizeLabelStrings.length === 1 ? '' : 's'}` : ''}
            ).
          </p>

          <div className="f-classroom-wheel-dual">
            <WheelStage
              title="Winner"
              labels={nameLabels}
              rotation={nameRotation}
              spinning={spinning}
              palette={WHEEL_COLORS}
              emptyHint="Add at least 2 names"
            />
            <WheelStage
              title="Prize"
              labels={prizeLabelStrings}
              rotation={prizeRotation}
              spinning={spinning}
              palette={PRIZE_COLORS}
              emptyHint="Optional — add 2+ prizes"
            />
          </div>

          <div className="f-classroom-wheel-result-row">
            {resultText ? (
              <p className="f-classroom-wheel-winner">{resultText}</p>
            ) : (
              <p className="f-muted f-classroom-wheel-winner">{spinHint}</p>
            )}
            <button
              type="button"
              className="f-primary-btn f-classroom-wheel-spin-btn"
              disabled={spinning || !canSpinNames}
              onClick={spin}
            >
              {spinning ? 'Spinning…' : canSpinPrizes ? 'Spin both' : 'Spin'}
            </button>
          </div>

          <div className="f-classroom-wheel-dual-controls">
            <PoolControls
              addPlaceholder="Add manual name…"
              filterPlaceholder="Filter names…"
              inputValue={nameInput}
              onInputChange={setNameInput}
              onAdd={addManualName}
              search={poolSearch}
              onSearchChange={setPoolSearch}
              entries={filteredPoolDisplay}
              emptyLabel="No names in pool."
              onRemove={removeManualName}
              removableSource="manual"
              tagForSource={(source) =>
                source === 'manual' ? 'manual' : source === 'giveaway' ? 'giveaway' : 'student'
              }
              extraActions={
                <>
                  <label className="f-classroom-wheel-check">
                    <input
                      type="checkbox"
                      checked={poolState.includeFiltered}
                      onChange={(e) =>
                        setPoolState((prev) => ({ ...prev, includeFiltered: e.target.checked }))
                      }
                    />
                    Include {poolLabel} ({filteredStudents.length})
                  </label>
                  <button
                    type="button"
                    className="f-outline-btn f-compact f-classroom-wheel-import"
                    onClick={importClassRoster}
                    disabled={!classRoster.length}
                    title={
                      classRoster.length
                        ? `Add ${classRoster.length} classroom student(s) not already in the pool`
                        : 'No classroom roster loaded yet'
                    }
                  >
                    Add all from classroom ({classRoster.length})
                  </button>
                </>
              }
            />

            <PoolControls
              addPlaceholder="Add prize or outcome…"
              filterPlaceholder="Filter prizes…"
              inputValue={prizeInput}
              onInputChange={setPrizeInput}
              onAdd={addPrize}
              search={prizeSearch}
              onSearchChange={setPrizeSearch}
              entries={filteredPrizeDisplay}
              emptyLabel="No prizes yet — add outcomes to spin for."
              onRemove={removePrize}
              removableSource="prize"
              tagForSource={() => 'prize'}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
