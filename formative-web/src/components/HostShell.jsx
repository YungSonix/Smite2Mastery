import { Link, useNavigate } from 'react-router-dom';
import { clearHostSession, getHostSession } from '../lib/auth';

const ICON = `${import.meta.env.BASE_URL}scroll-icon.png`;

const NAV_LEFT = [
  { id: 'home', label: 'Home', to: '/' },
  { id: 'analytics', label: 'Analytics', to: '/analytics' },
];

const NAV_RIGHT = [{ id: 'instructions', label: 'Instructions', to: '/instructions' }];

export default function HostShell({ active = 'home', children, banner }) {
  const nav = useNavigate();
  const session = getHostSession();
  const initial = (session?.username || 'H').charAt(0).toUpperCase();

  return (
    <div className="f-app f-app-topnav">
      <header className="f-topnav">
        <nav className="f-topnav-side" aria-label="Primary">
          {NAV_LEFT.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={`f-topnav-link ${active === item.id ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link to="/" className="f-topnav-brand" title="Scroll Trivia home">
          <img src={ICON} alt="" className="f-topnav-icon" width={52} height={52} />
          <span className="f-topnav-brand-text">
            Scroll Trivia
            <small>by Smite Scroll</small>
          </span>
        </Link>

        <div className="f-topnav-side f-topnav-side-right">
          {NAV_RIGHT.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={`f-topnav-link ${active === item.id ? 'active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
          <div className="f-topnav-account">
            <div className="f-avatar" aria-hidden="true">
              {initial}
            </div>
            <span className="f-topnav-user">{session?.username}</span>
            <button
              type="button"
              className="f-ghost-btn"
              onClick={() => {
                clearHostSession();
                nav('/login');
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="f-main">
        {banner}
        <div className="f-content">{children}</div>
      </div>
    </div>
  );
}
