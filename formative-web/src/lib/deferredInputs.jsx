import { useState } from 'react';

export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

export function DeferredNumberInput({ value, onCommit, min = 0, step = 1, ...props }) {
  const [draft, setDraft] = useState(null);
  const display = draft !== null ? draft : String(value ?? '');

  return (
    <input
      type="number"
      min={min}
      step={step}
      value={display}
      onFocus={() => setDraft(String(value ?? ''))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const raw = draft ?? String(value ?? '');
        setDraft(null);
        const n = Math.max(min, Number(raw) || 0);
        if (n !== value) onCommit(n);
      }}
      {...props}
    />
  );
}

export function DeferredDatetimeInput({ isoValue, onCommit }) {
  const [draft, setDraft] = useState(null);
  const display = draft !== null ? draft : toLocalInput(isoValue);

  return (
    <input
      type="datetime-local"
      value={display}
      onFocus={() => setDraft(toLocalInput(isoValue))}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        const raw = draft ?? toLocalInput(isoValue);
        setDraft(null);
        const iso = fromLocalInput(raw);
        if (iso !== (isoValue || '')) onCommit(iso);
      }}
    />
  );
}
