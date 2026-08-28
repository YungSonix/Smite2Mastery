import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { installScrapeGuard } from '../lib/scrapeGuard';

/**
 * Light anti-scrape deterrent for Scroll Trivia (not real security).
 * - All pages except login: block DevTools shortcuts
 * - Take page: also block right-click outside inputs and flag docked DevTools
 */
export default function ScrapeGuard() {
  const { pathname } = useLocation();
  const isLogin = pathname.startsWith('/login');
  const strict = pathname.startsWith('/take/');
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  useEffect(() => {
    if (isLogin) return undefined;
    document.documentElement.classList.toggle('f-scrape-guard-take', strict);
    return () => {
      document.documentElement.classList.remove('f-scrape-guard-take');
    };
  }, [isLogin, strict]);

  useEffect(() => {
    if (isLogin) return undefined;
    return installScrapeGuard({
      strict,
      onDevToolsOpen: () => setDevtoolsOpen(true),
    });
  }, [isLogin, strict]);

  if (isLogin || !devtoolsOpen) return null;

  return (
    <div className="f-scrape-guard-scrim" role="alert" aria-live="assertive">
      <div className="f-scrape-guard-card">
        <h2>Developer tools are not allowed on this page</h2>
        <p>Close DevTools to continue the quiz.</p>
        <button type="button" className="f-btn" onClick={() => setDevtoolsOpen(false)}>
          I closed DevTools
        </button>
      </div>
    </div>
  );
}
