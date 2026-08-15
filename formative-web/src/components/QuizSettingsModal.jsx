import {
  QUIZ_CORNERS,
  QUIZ_FONTS,
  QUIZ_PATTERNS,
  QUIZ_THEMES,
  applyModePatch,
  applyPresetPatch,
  onAccentColor,
  resolvedQuizTheme,
} from '../lib/quizThemes';

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="f-toggle-row">
      <span>
        {label}
        <small>{hint}</small>
      </span>
      <input
        type="checkbox"
        className="f-toggle"
        checked={Boolean(checked)}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

function ChipRow({ options, value, onChange }) {
  return (
    <div className="f-theme-grid">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          className={`f-theme-pick ${value === opt.id ? 'active' : ''}`}
          style={opt.family ? { fontFamily: opt.family } : undefined}
          onClick={() => onChange(opt.id)}
        >
          {opt.label}
        </button>
      ))}
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

export default function QuizSettingsModal({ settings, onChange, onClose }) {
  const theme = resolvedQuizTheme(settings);
  const font = QUIZ_FONTS.find((f) => f.id === theme.font) || QUIZ_FONTS[2];
  return (
    <div className="f-overlay" onClick={onClose} role="presentation">
      <div
        className="f-modal f-settings-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="f-quiz-settings-title"
      >
        <div className="f-modal-head">
          <strong id="f-quiz-settings-title">Quiz Settings</strong>
          <button type="button" className="f-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="f-assign-body">
          <section className="f-assign-section">
            <h4>Play</h4>
            <div className="f-q-settings-body" style={{ border: '1px solid var(--f-blue-border)', borderRadius: 10 }}>
              <Toggle
                label="Randomize order"
                hint="Shuffle answer choices for each guest"
                checked={settings.randomize_order}
                onChange={(v) => onChange({ randomize_order: v })}
              />
              <Toggle
                label="Shuffle questions"
                hint="Guests see scored questions in a random order (name fields stay first)"
                checked={settings.shuffle_questions}
                onChange={(v) => onChange({ shuffle_questions: v })}
              />
              <Toggle
                label="Required"
                hint="Guest must answer every scored question before submit"
                checked={settings.require_all}
                onChange={(v) => onChange({ require_all: v })}
              />
              <Toggle
                label="Auto-fill new questions"
                hint="New multiple-choice items get a random prompt, answers, and correct mark from game data"
                checked={settings.auto_random_questions}
                onChange={(v) => onChange({ auto_random_questions: v })}
              />
            </div>
            <p className="f-muted" style={{ fontSize: 12, margin: '10px 0 0' }}>
              Timer, open/close window, and score display stay under Assign.
            </p>
          </section>

          <section className="f-assign-section">
            <h4>Theme</h4>
            <div
              className="f-theme-sample"
              style={{
                background: theme.page,
                color: theme.text,
                fontFamily: font.family,
                borderColor: theme.border,
              }}
            >
              <p className="f-theme-sample-kicker" style={{ color: theme.secondary }}>
                {theme.label}
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
              <span className="f-theme-sample-btn" style={{ background: theme.accent, color: onAccentColor(theme.accent) }}>
                Submit
              </span>
            </div>
            <div className="f-theme-mode" role="group" aria-label="Light or dark">
              <button
                type="button"
                className={`f-theme-pick ${theme.mode === 'light' ? 'active' : ''}`}
                onClick={() => onChange(applyModePatch(settings, 'light'))}
              >
                Light
              </button>
              <button
                type="button"
                className={`f-theme-pick ${theme.mode === 'dark' ? 'active' : ''}`}
                onClick={() => onChange(applyModePatch(settings, 'dark'))}
              >
                Dark
              </button>
            </div>
            <div className="f-theme-strips" role="listbox" aria-label="Color templates">
              {QUIZ_THEMES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  role="option"
                  aria-selected={theme.id === preset.id}
                  className={`f-theme-kit ${theme.id === preset.id ? 'active' : ''}`}
                  onClick={() => onChange(applyPresetPatch(preset.id))}
                >
                  <span className="f-theme-kit-swatches" aria-hidden="true">
                    <span className="f-theme-kit-page" style={{ background: preset.page }} />
                    <span className="f-theme-kit-chip" style={{ background: preset.accent }} />
                    <span className="f-theme-kit-chip" style={{ background: preset.secondary }} />
                  </span>
                  <span className="f-theme-kit-name">{preset.label}</span>
                </button>
              ))}
            </div>
          </section>

          <details className="f-settings-details">
            <summary>
              Colors, type, and layout
              <span className="f-chevron" aria-hidden="true" />
            </summary>
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
              <ChipRow options={QUIZ_FONTS} value={theme.font} onChange={(id) => onChange({ theme_font: id })} />
            </section>
            <section className="f-assign-section">
              <h4>Corners</h4>
              <ChipRow options={QUIZ_CORNERS} value={theme.corners} onChange={(id) => onChange({ theme_corners: id })} />
            </section>
            <section className="f-assign-section">
              <h4>Background texture</h4>
              <ChipRow options={QUIZ_PATTERNS} value={theme.pattern} onChange={(id) => onChange({ theme_pattern: id })} />
            </section>
            <section className="f-assign-section">
              <h4>Card density</h4>
              <ChipRow
                options={[
                  { id: 'cozy', label: 'Cozy' },
                  { id: 'compact', label: 'Compact' },
                ]}
                value={theme.density}
                onChange={(id) => onChange({ theme_density: id })}
              />
            </section>
          </details>
        </div>
      </div>
    </div>
  );
}
