import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { devToolsLikelyOpen, installScrapeGuard } from '../lib/scrapeGuard';

/**
 * Anti-scrape deterrent for Scroll Trivia (not real security — slows casual copying).
 * - All pages except login: block DevTools shortcuts
 * - Take + host preview: strict mode (no copy/select/print/save outside inputs)
 */
export default function ScrapeGuard() {
  const { pathname } = useLocation();
  const isLogin = pathname.startsWith('/login');
  const strict = pathname.startsWith('/take/') || pathname.includes('/preview');
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  useEffect(() => {
    if (isLogin) return undefined;
    document.documentElement.classList.toggle('f-scrape-guard-take', strict);
    document.documentElement.classList.toggle('f-scrape-guard-active', strict && devtoolsOpen);
    return () => {
      document.documentElement.classList.remove('f-scrape-guard-take', 'f-scrape-guard-active');
    };
  }, [isLogin, strict, devtoolsOpen]);

  useEffect(() => {
    if (isLogin) return undefined;
    return installScrapeGuard({
      strict,
      onDevToolsOpen: () => setDevtoolsOpen(true),
      onDevToolsClose: () => {
        if (!devToolsLikelyOpen()) setDevtoolsOpen(false);
      },
    });
  }, [isLogin, strict]);

  if (isLogin || !strict || !devtoolsOpen) return null;

  return (
    <div className="f-scrape-guard-scrim" role="alert" aria-live="assertive">
      <div className="f-scrape-guard-card">
        <h2>Developer tools are not allowed</h2>
        <p>Close DevTools to continue. Quiz content stays hidden while tools are open.</p>
      </div>
    </div>
  );
}
