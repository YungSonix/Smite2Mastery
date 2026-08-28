import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { devToolsLikelyOpen, installScrapeGuard } from '../lib/scrapeGuard';

/**
 * Anti-scrape deterrent for Scroll Trivia host surfaces (not real security).
 * Take pages are excluded — players must never be blocked by DevTools heuristics.
 * Host preview: strict mode (no copy/select/print/save outside inputs + DevTools overlay).
 * Other host routes: block DevTools shortcuts and right-click only.
 */
export default function ScrapeGuard() {
  const { pathname } = useLocation();
  const isLogin = pathname.startsWith('/login');
  const isTake = pathname.startsWith('/take/');
  const skip = isLogin || isTake;
  const strict = pathname.includes('/preview');
  const [devtoolsOpen, setDevtoolsOpen] = useState(false);

  useEffect(() => {
    if (skip) return undefined;
    document.documentElement.classList.toggle('f-scrape-guard-take', strict);
    document.documentElement.classList.toggle('f-scrape-guard-active', strict && devtoolsOpen);
    return () => {
      document.documentElement.classList.remove('f-scrape-guard-take', 'f-scrape-guard-active');
    };
  }, [skip, strict, devtoolsOpen]);

  useEffect(() => {
    if (skip) return undefined;
    return installScrapeGuard({
      strict,
      onDevToolsOpen: () => setDevtoolsOpen(true),
      onDevToolsClose: () => {
        if (!devToolsLikelyOpen()) setDevtoolsOpen(false);
      },
    });
  }, [skip, strict]);

  if (skip || !strict || !devtoolsOpen) return null;

  return (
    <div className="f-scrape-guard-scrim" role="alert" aria-live="assertive">
      <div className="f-scrape-guard-card">
        <h2>Developer tools are not allowed</h2>
        <p>Close DevTools to continue. Quiz content stays hidden while tools are open.</p>
      </div>
    </div>
  );
}
