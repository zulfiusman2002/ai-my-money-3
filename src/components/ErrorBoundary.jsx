import React from 'react';
import { MiloLogo } from './Milo';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('MoneyMilo UI error', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="fatal-shell" role="alert">
        <section className="fatal-card">
          <MiloLogo size={84} />
          <div className="t-label">MoneyMilo hit a snag</div>
          <h1>Your data is safe.</h1>
          <p>The page could not finish loading. Refresh once; if it happens again, return to the dashboard.</p>
          <div className="fatal-actions">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Refresh page</button>
            <button className="btn btn-secondary" onClick={() => { window.location.href = '/app'; }}>Go to overview</button>
          </div>
          <details><summary>Technical detail</summary><code>{this.state.error?.message || 'Unknown error'}</code></details>
        </section>
      </main>
    );
  }
}
