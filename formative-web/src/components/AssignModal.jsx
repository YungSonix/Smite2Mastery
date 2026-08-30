import { useState } from 'react';
import { localTimeZoneLabel } from '../lib/formatWhen';
import { quizWindowState } from '../lib/quizSettings';
import { saveHostAssignDefaults } from '../lib/hostAssignDefaults';
import { DeferredDatetimeInput, DeferredNumberInput } from '../lib/deferredInputs';
import { publicTakeUrl, hostTestTakeUrl } from '../lib/takeLinks';

const SECTIONS = [
  { id: 'share', label: 'Share' },
  { id: 'time', label: 'Time' },
  { id: 'grading', label: 'Grading' },
  { id: 'display', label: 'Display' },
  { id: 'access', label: 'Access' },
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
        className="f-switch"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export default function AssignModal({
  open,
  onClose,
  quiz,
  settings,
  link,
  testLink,
  onPatchSettings,
  onPublish,
  publishing,
  dirty,
  onSaveFirst,
}) {
  const [section, setSection] = useState('share');
  const [publishError, setPublishError] = useState('');

  if (!open || !quiz) return null;

  const assignWindow = quizWindowState(settings);
  const isLive = Boolean(quiz.is_assigned);
  const publicLink = link || publicTakeUrl(quiz.slug);
  const practiceLink =
    testLink || hostTestTakeUrl(quiz.slug, settings?.test_take_token);

  const extend24h = () => {
    if (!assignWindow.closesAt) return;
    const next = new Date(new Date(assignWindow.closesAt).getTime() + 24 * 3600 * 1000);
    onPatchSettings({ closes_at: next.toISOString() });
  };

  const handlePublish = async () => {
    setPublishError('');
    try {
      if (dirty && onSaveFirst) {
        const ok = await onSaveFirst();
        if (!ok) return;
      }
      await onPublish();
    } catch (e) {
      setPublishError(e.message || 'Could not publish');
    }
  };

  const saveDefaults = () => {
    saveHostAssignDefaults(settings);
  };

  return (
    <div className="f-overlay" onClick={onClose} role="presentation">
      <div
        className="f-modal f-modal-wide f-assign-modal-v2"
        style={{ maxWidth: 720 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="f-assign-title"
      >
        <div className="f-modal-head">
          <div>
            <strong id="f-assign-title">Assign</strong>
            <p className="f-muted f-settings-sub">
              {isLive ? (
                <>
                  <span className="f-assign-live-pill">Live</span> Take link is active. Publishing
                  another quiz unassigns this one.
                </>
              ) : (
                <>Review settings, then publish when ready. Nothing goes live until you click Publish.</>
              )}
            </p>
          </div>
          <button type="button" className="f-icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="f-assign-layout">
          <nav className="f-assign-nav" aria-label="Assign sections">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`f-assign-nav-btn ${section === s.id ? 'active' : ''}`}
                onClick={() => setSection(s.id)}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="f-assign-body f-assign-body-v2">
            {section === 'share' ? (
              <>
                <section className="f-assign-section">
                  <h4>Public take link</h4>
                  <p className="f-muted" style={{ marginTop: 0 }}>
                    Share with players. Join code: <strong>{quiz.join_code}</strong>
                  </p>
                  <input type="text" readOnly value={publicLink} onFocus={(e) => e.target.select()} />
                  <div className="f-assign-share-actions">
                    <button
                      type="button"
                      className="f-primary-btn"
                      onClick={() => navigator.clipboard?.writeText(publicLink)}
                    >
                      Copy public link
                    </button>
                    <button
                      type="button"
                      className="f-outline-btn"
                      onClick={() => window.open(publicLink, '_blank')}
                    >
                      Open take page
                    </button>
                  </div>
                </section>
                <section className="f-assign-section" style={{ marginTop: 20 }}>
                  <h4>Host practice link</h4>
                  <p className="f-muted" style={{ marginTop: 0 }}>
                    Run through the quiz yourself before going live. Practice submissions are tagged and
                    hidden from Responses and Insights by default.
                  </p>
                  {settings?.test_take_token ? (
                    <>
                      <input
                        type="text"
                        readOnly
                        value={practiceLink}
                        onFocus={(e) => e.target.select()}
                      />
                      <div className="f-assign-share-actions">
                        <button
                          type="button"
                          className="f-outline-btn"
                          onClick={() => navigator.clipboard?.writeText(practiceLink)}
                        >
                          Copy practice link
                        </button>
                        <button
                          type="button"
                          className="f-outline-btn"
                          onClick={() => window.open(practiceLink, '_blank')}
                        >
                          Open practice take
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="f-muted" style={{ fontSize: 13 }}>
                      Publish once to generate your private practice link.
                    </p>
                  )}
                  {assignWindow.status === 'closed' ? (
                    <p className="f-assign-warn">
                      Window closed
                      {assignWindow.closesAt
                        ? ` at ${new Date(assignWindow.closesAt).toLocaleString()} (${localTimeZoneLabel()})`
                        : ''}
                      . Extend close time under Time.
                    </p>
                  ) : null}
                  {assignWindow.status === 'open' && assignWindow.closesAt ? (
                    <p className="f-muted" style={{ fontSize: 13, marginTop: 12 }}>
                      Closes {new Date(assignWindow.closesAt).toLocaleString()} ({localTimeZoneLabel()}).
                    </p>
                  ) : null}
                </section>
              </>
            ) : null}

            {section === 'time' ? (
              <section className="f-assign-section">
                <h4>Schedule</h4>
                <label className="f-assign-row">
                  <span>
                    Opens
                    <small>
                      Empty = already open. Times are in {localTimeZoneLabel()}; guests see their own
                      timezone.
                    </small>
                  </span>
                  <DeferredDatetimeInput
                    isoValue={settings.opens_at}
                    onCommit={(iso) => onPatchSettings({ opens_at: iso })}
                  />
                </label>
                <label className="f-assign-row">
                  <span>
                    Closes
                    <small>Empty = no end. After close, new submits are blocked until you extend.</small>
                  </span>
                  <DeferredDatetimeInput
                    isoValue={settings.closes_at}
                    onCommit={(iso) => onPatchSettings({ closes_at: iso })}
                  />
                </label>
                {assignWindow.closesAt ? (
                  <button type="button" className="f-outline-btn" onClick={extend24h}>
                    Extend close +24h
                  </button>
                ) : null}
                <label className="f-assign-row" style={{ marginTop: 16 }}>
                  <span>
                    Time limit (minutes)
                    <small>0 = no timer. Starts when they click Start.</small>
                  </span>
                  <DeferredNumberInput
                    min={0}
                    step={1}
                    value={Math.round(Number(settings.time_limit_seconds || 0) / 60) || 0}
                    onCommit={(minutes) =>
                      onPatchSettings({ time_limit_seconds: Math.max(0, minutes) * 60 })
                    }
                  />
                </label>
              </section>
            ) : null}

            {section === 'grading' ? (
              <>
                <section className="f-settings-card">
                  <h4>Attempts</h4>
                  <label className="f-assign-row">
                    <span>
                      Total attempts
                      <small>How many times the same Discord name can submit</small>
                    </span>
                    <select
                      value={settings.allow_retake ? 'unlimited' : '1'}
                      onChange={(e) => onPatchSettings({ allow_retake: e.target.value === 'unlimited' })}
                    >
                      <option value="1">1</option>
                      <option value="unlimited">Unlimited</option>
                    </select>
                  </label>
                </section>
                <section className="f-settings-card">
                  <h4>Scoring</h4>
                  <Toggle
                    label="Partial credit on multiple selection"
                    hint="Pick-all-that-apply: (correct − wrong) ÷ number of correct answers"
                    checked={settings.partial_credit_multiple_selection}
                    onChange={(v) => onPatchSettings({ partial_credit_multiple_selection: v })}
                  />
                  <p className="f-muted f-settings-foot">
                    Scores and answer keys stay <strong>hidden</strong> from players after submit (contest
                    default). You grade and announce winners from Responses.
                  </p>
                </section>
                <section className="f-settings-card">
                  <h4>After submission</h4>
                  <label className="f-assign-row">
                    <span>
                      Player sees
                      <small>Thank-you screen only. No score or answers on the take page</small>
                    </span>
                    <select
                      value={settings.after_submission || 'hidden'}
                      onChange={(e) => onPatchSettings({ after_submission: e.target.value })}
                    >
                      <option value="hidden">Thank-you only (recommended)</option>
                      <option value="visible">Keep take page visible (still no scores)</option>
                    </select>
                  </label>
                </section>
              </>
            ) : null}

            {section === 'display' ? (
              <section className="f-settings-card">
                <h4>Question order</h4>
                <Toggle
                  label="Shuffle questions"
                  hint="Scored questions in random order (Discord + IGN gates stay first)"
                  checked={settings.shuffle_questions}
                  onChange={(v) => onPatchSettings({ shuffle_questions: v })}
                />
                <Toggle
                  label="Randomize answer order"
                  hint="Shuffle A/B/C/D for each guest"
                  checked={settings.randomize_order}
                  onChange={(v) => onPatchSettings({ randomize_order: v })}
                />
                <Toggle
                  label="Require every scored question"
                  hint="Block submit until all scored items are answered"
                  checked={settings.require_all}
                  onChange={(v) => onPatchSettings({ require_all: v })}
                />
                <p className="f-muted f-settings-foot">
                  Theme and lifelines are under <strong>Quiz Settings</strong> (⋮ menu).
                </p>
              </section>
            ) : null}

            {section === 'access' ? (
              <section className="f-assign-section">
                <h4>Identity fields</h4>
                <label className="f-assign-row">
                  <span>
                    Discord field label
                    <small>Shown on the take form</small>
                  </span>
                  <input
                    type="text"
                    value={settings.discord_field_label || ''}
                    placeholder="Discord IGN"
                    onChange={(e) => onPatchSettings({ discord_field_label: e.target.value })}
                  />
                </label>
                <label className="f-assign-row">
                  <span>
                    In-game field label
                    <small>Shown on the take form</small>
                  </span>
                  <input
                    type="text"
                    value={settings.ingame_field_label || ''}
                    placeholder="In-Game Name"
                    onChange={(e) => onPatchSettings({ ingame_field_label: e.target.value })}
                  />
                </label>
                <p className="f-muted f-settings-foot">
                  Same Discord cannot submit twice unless Total attempts is Unlimited.
                </p>
              </section>
            ) : null}
          </div>
        </div>

        <div className="f-assign-footer">
          <button type="button" className="f-ghost-btn" onClick={saveDefaults}>
            Save as my defaults
          </button>
          <div className="f-assign-footer-actions">
            {publishError ? <span className="f-error" style={{ marginRight: 12 }}>{publishError}</span> : null}
            <button type="button" className="f-outline-btn" onClick={onClose}>
              Close
            </button>
            {!isLive ? (
              <button
                type="button"
                className="f-primary-btn f-assign-publish-btn"
                disabled={publishing}
                onClick={handlePublish}
              >
                {publishing ? 'Publishing…' : 'Publish quiz'}
              </button>
            ) : (
              <span className="f-assign-live-note">Published. Adjust settings above; they save immediately.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
