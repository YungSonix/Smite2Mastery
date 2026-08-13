import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setHostSession } from '../lib/auth';

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/trivia/host', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, secret }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setHostSession(data.username, secret);
      nav('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="f-login-page">
      <div className="f-login-card f-fade-up">
        <p className="f-kicker">Smite Scroll</p>
        <h1>Scroll Trivia</h1>
        <p className="f-muted">
          Host sign-in for you and helpers. Players never use this page.
          {import.meta.env.DEV ? (
            <>
              {' '}
              Local secret: <code>devsecret</code>
            </>
          ) : null}
        </p>
        <form onSubmit={onSubmit}>
          <label className="f-field">
            <span>Username</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </label>
          <label className="f-field">
            <span>Host secret</span>
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              required
            />
          </label>
          {error ? <div className="f-error">{error}</div> : null}
          <button type="submit" className="f-submit-btn" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
