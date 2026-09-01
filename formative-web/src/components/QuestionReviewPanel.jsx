import { useEffect, useMemo, useState } from 'react';
import MediaStack from './MediaStack';
import SortStudentsMenu from './SortStudentsMenu';
import {
  earnedFromStored,
  effectiveEarned,
  formatResponseAnswer,
  isBlankAnswer,
  isScoredQuestion,
} from '../lib/formatResponseAnswer';
import { listMediaUrls } from '../lib/questionMedia';
import { promptPlain } from '../lib/promptPlain';
import { typeLabel } from '../lib/questionTypes';
import { sortResponses } from '../lib/sortResponses';
import { PaginationBar, usePagination } from '../lib/usePagination';
import {
  applyVariant,
  extractVariantMap,
  variantCount,
  variantLetter,
} from '../lib/triviaVariants';

const PANEL_SORT = [
  { id: 'discord_az', label: 'Discord (A–Z)' },
  { id: 'discord_za', label: 'Discord (Z–A)' },
  { id: 'score_hi', label: 'Score % (Hi–Lo · earlier submit wins ties)' },
  { id: 'score_lo', label: 'Score % (Lo–Hi · earlier submit wins ties)' },
  { id: 'submitted_desc', label: 'Submission date (newest)' },
];

function markFor(stored, maxPts, answerRaw) {
  if (stored == null || stored === '') {
    return isBlankAnswer(answerRaw) ? 'bad' : 'empty';
  }
  const earned = earnedFromStored(stored, maxPts);
  if (earned == null) return isBlankAnswer(answerRaw) ? 'bad' : 'empty';
  if (earned <= 0) return 'bad';
  if (maxPts > 0 && earned < maxPts - 1e-9) return 'partial';
  return 'ok';
}

function responseVariantIndex(response, questionId) {
  const map = extractVariantMap(response?.answers) || {};
  const raw = map[questionId];
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function QuestionReviewPanel({
  question,
  questionIndex,
  scoredQuestions,
  responses,
  onClose,
  onSelectQuestion,
  onSelectStudent,
}) {
  const [sortBy, setSortBy] = useState('discord_az');
  /** null = all versions */
  const [versionFilter, setVersionFilter] = useState(null);

  const vCount = variantCount(question);
  const hasVersions = vCount > 1;

  useEffect(() => {
    setVersionFilter(null);
  }, [question?.id]);

  const displayQuestion = useMemo(() => {
    if (!question) return null;
    if (versionFilter == null) return question;
    return applyVariant(question, versionFilter);
  }, [question, versionFilter]);

  const versionCounts = useMemo(() => {
    const counts = Array.from({ length: Math.max(1, vCount) }, () => 0);
    for (const r of responses || []) {
      const vi = responseVariantIndex(r, question?.id);
      if (vi >= 0 && vi < counts.length) counts[vi] += 1;
      else counts[0] += 1;
    }
    return counts;
  }, [responses, question?.id, vCount]);

  const filtered = useMemo(() => {
    const list = responses || [];
    if (versionFilter == null || !hasVersions) return list;
    return list.filter((r) => responseVariantIndex(r, question?.id) === versionFilter);
  }, [responses, versionFilter, hasVersions, question?.id]);

  const rows = useMemo(() => sortResponses(filtered, sortBy), [filtered, sortBy]);
  const { page, setPage, pageCount, slice, from, to, reset } = usePagination(rows.length);

  useEffect(() => {
    reset();
  }, [sortBy, question?.id, versionFilter, rows.length, reset]);

  const visibleRows = slice(rows);
  const maxPts = Number(question?.points) || 0;
  const scored = isScoredQuestion(question);

  if (!question || !displayQuestion) return null;

  const qLabel = questionIndex >= 0 ? questionIndex + 1 : '?';

  return (
    <aside className="f-student-panel f-student-panel-v2 f-q-review-panel" aria-label={`Answers for question ${qLabel}`}>
      <header className="f-student-panel-head f-student-panel-head-v2">
        <button type="button" className="f-outline-btn f-q-review-back" onClick={onClose}>
          ← Totals
        </button>
        <div className="f-student-panel-title" style={{ textAlign: 'left' }}>
          <div className="f-student-panel-name">Question {qLabel}</div>
          <div className="f-muted f-student-panel-sub">{typeLabel(displayQuestion)}</div>
        </div>
        <button type="button" className="f-icon-btn" title="Close" onClick={onClose}>
          ✕
        </button>
      </header>

      <nav className="f-q-review-tabs" aria-label="Question list">
        <button type="button" className="f-q-review-tab is-totals" onClick={onClose}>
          TOTALS
        </button>
        {(scoredQuestions || []).map((q, i) => (
          <button
            key={q.id}
            type="button"
            className={`f-q-review-tab ${q.id === question.id ? 'is-active' : ''}`}
            onClick={() => onSelectQuestion?.(q)}
          >
            {i + 1}
          </button>
        ))}
      </nav>

      {hasVersions ? (
        <div className="f-q-review-version-bar" role="group" aria-label="Filter by version">
          <button
            type="button"
            className={`f-q-review-version-chip${versionFilter == null ? ' is-active' : ''}`}
            onClick={() => setVersionFilter(null)}
          >
            All <span className="f-muted">{(responses || []).length}</span>
          </button>
          {Array.from({ length: vCount }, (_, i) => (
            <button
              key={i}
              type="button"
              className={`f-q-review-version-chip${versionFilter === i ? ' is-active' : ''}`}
              onClick={() => setVersionFilter(i)}
              title={`Only students who got Version ${variantLetter(i)}`}
            >
              {variantLetter(i)} <span className="f-muted">{versionCounts[i] || 0}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="f-q-review-meta">
        <div className="f-answer-type">
          {typeLabel(displayQuestion)}
          {scored ? ` · ${maxPts}pt` : ''}
          {versionFilter != null ? ` · Version ${variantLetter(versionFilter)}` : ''}
        </div>
        <div className="f-q-review-prompt">{promptPlain(displayQuestion.prompt) || typeLabel(displayQuestion)}</div>
        <MediaStack urls={listMediaUrls(displayQuestion)} />
      </div>

      <div className="f-q-review-toolbar">
        <span className="f-muted">
          {rows.length} response{rows.length === 1 ? '' : 's'}
          {versionFilter != null ? ` · Version ${variantLetter(versionFilter)}` : ''}
        </span>
        <SortStudentsMenu value={sortBy} onChange={setSortBy} options={PANEL_SORT} />
      </div>

      <div className="f-student-panel-body">
        {visibleRows.map((r) => {
          const vi = responseVariantIndex(r, question.id);
          const qForAnswer =
            hasVersions && versionFilter == null ? applyVariant(question, vi) : displayQuestion;
          const answerText = formatResponseAnswer(qForAnswer, r.answers?.[question.id], r);
          const stored = r.per_question?.[question.id];
          const mark = markFor(stored, maxPts, r.answers?.[question.id]);
          const earned = effectiveEarned(question, r, maxPts);
          const initial = (r.discord_username || '?').charAt(0).toUpperCase();
          return (
            <article
              key={r.id}
              className={`f-answer-card f-q-review-card mark-${mark}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectStudent?.(r)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectStudent?.(r);
                }
              }}
            >
              <div className="f-q-review-card-head">
                <div className="f-student">
                  <div className="f-avatar" style={{ width: 28, height: 28, fontSize: 12 }}>
                    {initial}
                  </div>
                  <div className="f-q-review-names">
                    <div className="f-student-name" title={r.discord_username}>
                      {r.discord_username || '—'}
                    </div>
                    <div className="f-muted" title={r.ingame_name || ''}>
                      {r.ingame_name || '—'}
                      {hasVersions ? ` · Ver ${variantLetter(vi)}` : ''}
                    </div>
                  </div>
                </div>
                <span className={`f-q-review-mark is-${mark}`}>
                  {mark === 'ok'
                    ? 'Correct'
                    : mark === 'partial'
                      ? 'Partial'
                      : mark === 'bad'
                        ? 'Wrong'
                        : '—'}
                </span>
              </div>
              <div className="f-answer-value">
                {answerText != null ? (
                  <pre>{answerText}</pre>
                ) : (
                  <span className="f-muted">Unanswered</span>
                )}
              </div>
              {scored ? (
                <div className="f-answer-foot">
                  <span className="f-muted">
                    {earned == null ? 'Ungraded' : `${earned} / ${maxPts}pt`}
                  </span>
                </div>
              ) : null}
            </article>
          );
        })}
        <PaginationBar
          page={page}
          pageCount={pageCount}
          from={from}
          to={to}
          total={rows.length}
          onPage={setPage}
        />
        {!rows.length ? (
          <p className="f-muted">
            {versionFilter != null
              ? `No submissions for Version ${variantLetter(versionFilter)}.`
              : 'No submissions yet.'}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
