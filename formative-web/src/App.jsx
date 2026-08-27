import { Navigate, Route, Routes } from 'react-router-dom';
import { getHostSession } from './lib/auth';
import Activity from './pages/Activity';
import Analytics from './pages/Analytics';
import Home from './pages/Home';
import HostPreview from './pages/HostPreview';
import Instructions from './pages/Instructions';
import Login from './pages/Login';
import TakeQuiz from './pages/TakeQuiz';
function RequireHost({ children }) {
  const session = getHostSession();
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/take/:slug" element={<TakeQuiz />} />
      <Route
        path="/"
        element={
          <RequireHost>
            <Home />
          </RequireHost>
        }
      />
      <Route
        path="/analytics"
        element={
          <RequireHost>
            <Analytics />
          </RequireHost>
        }
      />
      <Route
        path="/instructions"
        element={
          <RequireHost>
            <Instructions />
          </RequireHost>
        }
      />
      <Route
        path="/activity/:quizId/preview"
        element={
          <RequireHost>
            <HostPreview />
          </RequireHost>
        }
      />
      <Route
        path="/activity/:quizId"
        element={
          <RequireHost>
            <Activity />
          </RequireHost>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
