import { useEffect, useRef } from 'react';
import VisualTextEditor from './VisualTextEditor';
import { sanitizeRichHtml } from '../lib/richText';

export default function InstructionsEditor({ quizId, initialValue, liveRef, onDirty, onCommit }) {
  const markedDirty = useRef(false);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;

  useEffect(() => {
    liveRef.current = initialValue || '';
    markedDirty.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  useEffect(() => {
    return () => {
      onCommitRef.current?.(sanitizeRichHtml(liveRef.current || ''));
    };
  }, [quizId, liveRef]);

  return (
    <section className="f-instructions-card">
      <div className="f-qcard-head">
        <span>Instructions</span>
        <span className="pts">Shown to students</span>
      </div>
      <p className="f-field-hint" style={{ marginTop: 0 }}>
        Highlight text, then format it. What you see here is what students see. Click Save when you
        are done.
      </p>
      <VisualTextEditor
        initialValue={initialValue || ''}
        placeholder="Write rules, prize info, or how to play…"
        minHeight={200}
        onChange={(html) => {
          liveRef.current = html;
          if (!markedDirty.current) {
            markedDirty.current = true;
            onDirty();
          }
        }}
      />
    </section>
  );
}
