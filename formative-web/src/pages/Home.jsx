import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import HostShell from '../components/HostShell';
import { hostApi, takeUrl, activityHref } from '../lib/api';

const ICON = `${import.meta.env.BASE_URL}scroll-icon.png`;

export default function Home() {
  const nav = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await hostApi('/api/trivia/host?action=list');
        if (alive) setQuizzes(data.quizzes || []);
      } catch (e) {
        const network = e.message === 'Failed to fetch' || e.name === 'TypeError';
        if (alive) {
          setError(
            network
              ? 'Cannot reach the trivia API. If you are on localhost, run npm run trivia:api. On the live site, Vercel needs SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.'
              : e.message || 'Failed to load quizzes'
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const createQuiz = async () => {
    try {
      const data = await hostApi('/api/trivia/host', {
        method: 'POST',
        body: { action: 'create', title: 'Untitled Scroll Trivia' },
      });
      nav(activityHref(data.quiz));
    } catch (e) {
      setError(e.message || 'Create failed');
    }
  };

  return (
    <HostShell
      active="home"
      banner={
        !bannerDismissed ? (
          <div className="f-trial-banner">
            <span>★</span>
            <span>
              Private host area — create quizzes, share a take link, review Discord + In-Game Name
              responses.
            </span>
            <button type="button" onClick={() => setBannerDismissed(true)}>
              Got it
            </button>
            <button type="button" className="f-ghost-btn" onClick={() => setBannerDismissed(true)}>
              ✕
            </button>
          </div>
        ) : null
      }
    >
      <section className="f-home-hero">
        <img src={ICON} alt="Smite Scroll" className="f-home-logo" width={112} height={112} />
        <p className="f-kicker">Smite Scroll</p>
        <h1>Scroll Trivia</h1>
        <p className="f-lede" style={{ margin: '8px auto 0', textAlign: 'center' }}>
          Build contests, assign a link, track responses — for you and your helpers.
        </p>
        <button type="button" className="f-create-btn" style={{ marginTop: 18 }} onClick={createQuiz}>
          Create +
        </button>
      </section>

      {error ? <div className="f-error">{error}</div> : null}

      <section className="f-section-card">
        <div className="f-section-head">
          <h2>Your quizzes</h2>
        </div>
        {loading ? (
          <p className="f-muted">Loading…</p>
        ) : quizzes.length === 0 ? (
          <p className="f-muted">No quizzes yet. Click Create + to start.</p>
        ) : (
          <div className="f-activity-list">
            {quizzes.map((q) => (
              <div
                key={q.id}
                className="f-activity-card"
                onClick={() => nav(activityHref(q))}
                onKeyDown={(e) => e.key === 'Enter' && nav(activityHref(q))}
                role="button"
                tabIndex={0}
              >
                {q.banner_url ? (
                  <img className="f-activity-thumb" src={q.banner_url} alt="" />
                ) : (
                  <div className="f-activity-thumb" />
                )}
                <div className="f-activity-meta">
                  <strong>{q.title}</strong>
                  <span>
                    {q.is_assigned ? 'Assigned' : 'Draft'} · {q.slug} ·{' '}
                    {new Date(q.updated_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </HostShell>
  );
}
