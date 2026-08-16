import { useState } from 'react';
import {
  QUIZ_CORNERS,
  QUIZ_FONTS,
  QUIZ_PATTERNS,
  QUIZ_THEMES,
  applyModePatch,
  applyPresetPatch,
  onAccentColor,
  paletteForMode,
  resolvedQuizTheme,
} from '../lib/quizThemes';

const TABS = [
  { id: 'play', label: 'Play' },
  { id: 'theme', label: 'Theme' },
  { id: 'style', label: 'Style' },
];

const DENSITY = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'compact', label: 'Compact' },
];

function Toggle({ label, hint, checked, onChange, disabled }) {
  return (
    <label className={`f-settings-toggle ${disabled ? 'is-disabled' : ''}`}>
      <span className="f-settings-toggle-copy">
        <strong>{label}</strong>
        <small>{hint}</small>
      </span>
      <input
        type="checkbox"
        className="f-toggle"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function Segmented({ options, value, onChange, ariaLabel }) {
  return (
    <div className="f-seg" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt) => {
        const on = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`f-seg-item ${on ? 'is-on' : ''}`}
            style={opt.family ? { fontFamily: opt.family } : undefined}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorTile({ label, value, fallback, onChange }) {
  const hex = /^#([0-9a-f]{6})$/i.test(String(value || '')) ? value : fallback;
  return (
    <label className="f-theme-tile">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      <span>{label}</span>
    </label>
  );
}

function StyleFields({ theme, onChange }) {
  return (
    <>
      <section className="f-assign-section">
        <h4>Colors</h4>
        <div className="f-theme-tiles">
          <ColorTile label="Page" value={theme.page} fallback="#ece8df" onChange={(v) => onChange({ theme_page: v })} />
          <ColorTile label="Card" value={theme.card} fallback="#f4f1ea" onChange={(v) => onChange({ theme_card: v })} />
          <ColorTile label="Ink" value={theme.text} fallback="#2c3546" onChange={(v) => onChange({ theme_text: v })} />
          <ColorTile label="Button" value={theme.accent} fallback="#5b8ab0" onChange={(v) => onChange({ theme_accent: v })} />
          <ColorTile label="Gold" value={theme.secondary} fallback="#c4a35a" onChange={(v) => onChange({ theme_secondary: v })} />
        </div>
      </section>
      <section className="f-assign-section">
        <h4>Type</h4>
        <Segmented
          options={QUIZ_FONTS}
          value={theme.font}
          onChange={(id) => onChange({ theme_font: id })}
          ariaLabel="Typeface"
        />
      </section>
      <section className="f-assign-section">
        <h4>Corners</h4>
        <Segmented
          options={QUIZ_CORNERS}
          value={theme.corners}
          onChange={(id) => onChange({ theme_corners: id })}
          ariaLabel="Corner radius"
        />
      </section>
      <section className="f-assign-section">
        <h4>Background texture</h4>
        <Segmented
          options={QUIZ_PATTERNS}
          value={theme.pattern}
          onChange={(id) => onChange({ theme_pattern: id })}
          ariaLabel="Background texture"
        />
      </section>
      <section className="f-assign-section">
        <h4>Card density</h4>
        <Segmented
          options={DENSITY}
          value={theme.density}
          onChange={(id) => onChange({ theme_density: id })}
          ariaLabel="Card density"
        />
      </section>
    </>
  );
}

function ModeIcon({ mode }) {
  if (mode === 'dark') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M13.2 10.4A6 6 0 0 1 5.6 2.8 6.2 6.2 0 1 0 13.2 10.4Z"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="3.1" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function QuizSettingsModal({ settings, onChange, onClose }) {
  const [tab, setTab] = useState('play');
  const theme = resolvedQuizTheme(settings);
  const font = QUIZ_FONTS.find((f) => f.id === theme.font) || QUIZ_FONTS[2];

  const setMode = (mode) => {
    if (mode === theme.mode) return;
    onChange(applyModePatch(settings, mode));
  };

  const onModeKey = (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    if (e.key === 'ArrowLeft' || e.key === 'Home') setMode('light');
    else setMode('dark');
  };

  return (
    <div className="f-overlay" onClick={onClose} role="presentation">
      <div
        className="f-modal f-settings-modal f-settings-modal-v2"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="f-quiz-settings-title"
      >
        <div className="f-modal-head">
          <div>
            <strong id="f-quiz-settings-title">Quiz settings</strong>
            <p className="f-muted f-settings-sub">Guest experience and look of the take page.</p>
          </div>
          <button type="button" className="f-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="f-settings-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`f-settings-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="f-assign-body f-settings-body-v2">
          {tab === 'play' ? (
            <>
              <section className="f-settings-card">
                <h4>During the quiz</h4>
                <Toggle
                  label="Randomize answer order"
                  hint="Shuffle A/B/C/D for each guest"
                  checked={settings.randomize_order}
                  onChange={(v) => onChange({ randomize_order: v })}
                />
                <Toggle
                  label="Shuffle questions"
                  hint="Scored questions appear in random order (Discord + IGN stay first)"
                  checked={settings.shuffle_questions}
                  onChange={(v) => onChange({ shuffle_questions: v })}
                />
                <Toggle
                  label="Require every scored question"
                  hint="Block submit until all scored items are answered"
                  checked={settings.require_all}
                  onChange={(v) => onChange({ require_all: v })}
                />
              </section>

              <section className="f-settings-card">
                <h4>Editor helpers</h4>
                <Toggle
                  label="Auto-fill new questions"
                  hint="New MC items get random prompts from game data (items, gods, voice, skins, releases)"
                  checked={settings.auto_random_questions}
                  onChange={(v) => onChange({ auto_random_questions: v })}
                />
              </section>

              <section className="f-settings-card">
                <h4>Lifelines</h4>
                <Toggle
                  label="Allow 3 lifelines per guest"
                  hint="Guests can spend up to 3 hints on the take page. Each hint on a question lowers that question’s points (100% → 75% → 50% → 35%)."
                  checked={settings.lifelines_enabled}
                  onChange={(v) => onChange({ lifelines_enabled: v })}
                />
                <Toggle
                  label="Auto-fill hint text"
                  hint="New and random questions get three draft hints you can edit under question Settings."
                  checked={settings.auto_hints}
                  onChange={(v) => onChange({ auto_hints: v })}
                />
              </section>

              <p className="f-muted f-settings-foot">
                Timer, open/close window, retakes, and score display are under <strong>Assign</strong>.
              </p>
            </>
          ) : null}

          {tab === 'theme' ? (
            <>
              <div className="f-settings-label-row">
                <span>Appearance</span>
                <small>Applies to the take page</small>
              </div>
              <div
                className={`f-seg f-seg-mode f-seg-mode-${theme.mode}`}
                role="radiogroup"
                aria-label="Light or dark"
                onKeyDown={onModeKey}
              >
                {['light', 'dark'].map((mode) => {
                  const on = theme.mode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      className={`f-seg-item ${on ? 'is-on' : ''}`}
                      onClick={() => setMode(mode)}
                    >
                      <ModeIcon mode={mode} />
                      {mode === 'light' ? 'Light' : 'Dark'}
                    </button>
                  );
                })}
              </div>

              <div className="f-settings-label-row">
                <span>Palette</span>
                <small>{theme.label}</small>
              </div>
              <div className="f-theme-strips" role="listbox" aria-label="Color templates">
                {QUIZ_THEMES.map((preset) => {
                  const pal = paletteForMode(preset, theme.mode);
                  const selected = theme.id === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={`f-theme-kit ${selected ? 'active' : ''}`}
                      onClick={() => onChange(applyPresetPatch(preset.id, theme.mode))}
                    >
                      <span className="f-theme-kit-stage" style={{ background: pal.page }} aria-hidden="true">
                        <span
                          className="f-theme-kit-mini"
                          style={{ background: pal.card, borderColor: pal.border, color: pal.text }}
                        >
                          <span className="f-theme-kit-mini-bar" style={{ background: pal.accent }} />
                          <span className="f-theme-kit-mini-line" style={{ background: pal.text }} />
                          <span className="f-theme-kit-mini-line is-short" style={{ background: pal.text }} />
                        </span>
                        <span className="f-theme-kit-dots">
                          <i style={{ background: pal.page }} />
                          <i style={{ background: pal.card }} />
                          <i style={{ background: pal.accent }} />
                          <i style={{ background: pal.secondary }} />
                        </span>
                        {selected ? (
                          <span className="f-theme-kit-check" style={{ background: pal.accent, color: onAccentColor(pal.accent) }}>
                            ✓
                          </span>
                        ) : null}
                      </span>
                      <span className="f-theme-kit-name">{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              <div
                className="f-theme-sample f-theme-sample-lg"
                style={{
                  background: theme.page,
                  color: theme.text,
                  fontFamily: font.family,
                  borderColor: theme.border,
                }}
              >
                <p className="f-theme-sample-kicker" style={{ color: theme.secondary }}>
                  Live preview · {theme.label}
                </p>
                <p className="f-theme-sample-q">Which item grants Magical Lifesteal?</p>
                <div className="f-theme-sample-choice" style={{ background: theme.card, borderColor: theme.border }}>
                  Bancroft&apos;s Talon
                </div>
                <div
                  className="f-theme-sample-choice is-on"
                  style={{ background: theme.card, borderColor: theme.accent, color: theme.accent }}
                >
                  Blood-soaked Shroud
                </div>
                <span
                  className="f-theme-sample-btn"
                  style={{ background: theme.accent, color: onAccentColor(theme.accent) }}
                >
                  Submit
                </span>
              </div>

              <details className="f-settings-details">
                <summary>
                  Colors, type, and layout
                  <span className="f-chevron" aria-hidden="true" />
                </summary>
                <StyleFields theme={theme} onChange={onChange} />
              </details>
            </>
          ) : null}

          {tab === 'style' ? <StyleFields theme={theme} onChange={onChange} /> : null}
        </div>
      </div>
    </div>
  );
}
