import { Component, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './theme/formative.css';

class TriviaErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    const msg = String(this.state.error?.message || this.state.error);
    return (
      <div
        style={{
          minHeight: '100vh',
          margin: 0,
          padding: 24,
          background: '#070b14',
          color: '#e2e8f0',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <h1 style={{ fontSize: 20, color: '#7dd3fc' }}>Scroll Trivia hit an error</h1>
        <p style={{ color: '#94a3b8' }}>Reload the page. If it keeps happening, copy this message:</p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            background: '#0b1220',
            border: '1px solid rgba(125, 211, 252, 0.42)',
            borderRadius: 10,
            padding: 12,
          }}
        >
          {msg}
        </pre>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TriviaErrorBoundary>
      <BrowserRouter basename="/trivia">
        <App />
      </BrowserRouter>
    </TriviaErrorBoundary>
  </StrictMode>
);
