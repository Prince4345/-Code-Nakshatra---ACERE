import React from 'react';
import { reportWebError } from '../services/monitoring';

type State = {
  hasError: boolean;
};

export class WebErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    void reportWebError({
      source: 'react-error-boundary',
      error,
      severity: 'fatal',
    });
  }

  reset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="ct-auth-shell">
        <div className="ct-auth-panel">
          <section className="ct-auth-card">
            <div className="ct-stack">
              <div className="ct-badge">CarbonTrace AI</div>
              <h1>Something broke in the workspace.</h1>
              <p className="ct-auth-lead">The error has been recorded. Reload once and continue from the last saved state.</p>
              <div className="ct-actions">
                <button className="ct-primary-button" onClick={this.reset}>Reload workspace</button>
                <button className="ct-secondary-button" onClick={() => window.location.reload()}>Refresh app</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }
}
