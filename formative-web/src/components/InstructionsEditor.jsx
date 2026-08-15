import { useDeferredValue, useEffect, useRef, useState } from 'react';
import FormatToolbar from './FormatToolbar';
import RichText from './RichText';

export default function InstructionsEditor({ quizId, initialValue, liveRef, onDirty, onCommit }) {
  const textareaRef = useRef(null);
  const markedDirty = useRef(false);
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const [preview, setPreview] = useState(initialValue || '');
  const deferredPreview = useDeferredValue(preview);

  useEffect(() => {
    const next = initialValue || '';
    liveRef.current = next;
    setPreview(next);
    markedDirty.current = false;
    if (textareaRef.current) textareaRef.current.value = next;
    // Only reset when switching quizzes. Typing must not rewrite this field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId]);

  useEffect(() => {
    return () => {
      onCommitRef.current?.(liveRef.current);
    };
  }, [quizId, liveRef]);

  const onChange = (next) => {
    liveRef.current = next;
    setPreview(next);
    if (!markedDirty.current) {
      markedDirty.current = true;
      onDirty();
    }
  };

  return (
    <section className="f-instructions-card">
      <div className="f-qcard-head">
        <span>Instructions</span>
        <span className="pts">Shown to students</span>
      </div>
      <p className="f-field-hint" style={{ marginTop: 0 }}>
        Write rules, prize info, or how to play. Students see this under the cover on the take
        page. Highlight text, then use the toolbar (bold, italic, underline, lists, links).
        Click Save when you are done.
      </p>
      <FormatToolbar textareaRef={textareaRef} onChange={onChange} />
      <textarea
        ref={textareaRef}
        className="f-instructions-input"
        rows={8}
        defaultValue={initialValue || ''}
        onInput={(e) => onChange(e.currentTarget.value)}
        placeholder="e.g. Answer all questions. Use your Discord + in-game name. One entry per person. Good luck!"
      />
      {String(deferredPreview || '').trim() ? (
        <div className="f-md-preview">
          <span className="f-fib-preview-label">Student preview</span>
          <RichText className="f-md" text={deferredPreview} />
        </div>
      ) : null}
    </section>
  );
}
