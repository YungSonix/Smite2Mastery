import { useEffect, useMemo, useState } from 'react';
import MediaStack from './MediaStack';
import SortStudentsMenu from './SortStudentsMenu';
import {
  earnedFromStored,
  formatResponseAnswer,
  isScoredQuestion,
} from '../lib/formatResponseAnswer';
import { listMediaUrls } from '../lib/questionMedia';
import { promptPlain } from '../lib/promptPlain';
import { typeLabel } from '../lib/questionTypes';
import { sortResponses } from '../lib/sortResponses';
import { PaginationBar, usePagination } from '../lib/usePagination';

const PANEL_SORT = [
  { id: 'discord_az', label: 'Discord (A–Z)' },
  { id: 'discord_za', label: 'Discord (Z–A)' },
  { id: 'score_hi', label: 'Score % (Hi–Lo)' },
  { id: 'score_lo', label: 'Score % (Lo–Hi)' },
  { id: 'submitted_desc', label: 'Submission date (newest)' },
];

function markFor(stored, maxPts) {
  if (stored == null || stored === '') return 'empty';
  const earned = earnedFromStored(stored, maxPts);
  if (earned == null) return 'empty';
  return earned > 0 ? 'ok' : 'bad';
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

  const rows = useMemo(() => sortResponses(responses, sortBy), [responses, sortBy]);
  const { page, setPage, pageCount, slice, from, to, reset } = usePagination(rows.length);

  useEffect(() => {
    reset();
  }, [sortBy, question?.id, rows.length, reset]);

  const visibleRows = slice(rows);
  const maxPts = Number(question?.points) || 0;
  const scored = isScoredQuestion(question);

  if (!question) return null;

  const qLabel = questionIndex >= 0 ? questionIndex + 1 : '?';

  return (
    <aside className="f-student-panel f-student-panel-v2 f-q-review-panel" aria-label={`Answers for question ${qLabel}`}>
      <header className="f-student-panel-head f-student-panel-head-v2">
        <button type="button" className="f-outline-btn f-q-review-back" onClick={onClose}>
          ← Totals
        </button>
        <div className="f-student-panel-title" style={{ textAlign: 'left' }}>
          <div className="f-student-panel-name">Question {qLabel}</div>
          <div className="f-muted f-student-panel-sub">{typeLabel(question)}</div>
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

      <div className="f-q-review-meta">
        <div className="f-answer-type">{typeLabel(question)}{scored ? ` · ${maxPts}pt` : ''}</div>
        <div className="f-q-review-prompt">{promptPlain(question.prompt) || typeLabel(question)}</div>
        <MediaStack urls={listMediaUrls(question)} />
      </div>

      <div className="f-q-review-toolbar">
        <span className="f-muted">{rows.length} response{rows.length === 1 ? '' : 's'}</span>
        <SortStudentsMenu value={sortBy} onChange={setSortBy} options={PANEL_SORT} />
      </div>

      <div className="f-student-panel-body">
        {visibleRows.map((r) => {
          const answerText = formatResponseAnswer(question, r.answers?.[question.id], r);
          const stored = r.per_question?.[question.id];
          const mark = markFor(stored, maxPts);
          const earned = earnedFromStored(stored, maxPts);
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
                    </div>
                  </div>
                </div>
                <span className={`f-q-review-mark is-${mark}`}>
                  {mark === 'ok' ? 'Correct' : mark === 'bad' ? 'Wrong' : '—'}
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
        {!rows.length ? <p className="f-muted">No submissions yet.</p> : null}
      </div>
    </aside>
  );
}
