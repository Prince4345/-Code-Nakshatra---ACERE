import React from 'react';
import { UserRole } from '../types';

type AuthRoute = '/login' | '/signup' | '/forgot-password';

type Props = {
  route: AuthRoute;
  authRole: UserRole;
  setAuthRole: React.Dispatch<React.SetStateAction<UserRole>>;
  authError: string;
  authNotice?: string;
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleRoute: () => void;
  onForgotPassword: () => void;
};

const AuthScreen: React.FC<Props> = ({
  route,
  authRole,
  setAuthRole,
  authError,
  authNotice,
  busy,
  onSubmit,
  onToggleRoute,
  onForgotPassword,
}) => {
  const isSignup = route === '/signup';
  const isRecovery = route === '/forgot-password';
  const title = isSignup ? 'Create your workspace' : isRecovery ? 'Reset password' : 'Welcome back';
  const subtitle = isSignup
    ? 'Choose your role and get started.'
    : isRecovery
      ? 'Enter your work email. We will send a secure reset link.'
      : 'Use your work email and password.';
  const submitLabel = isSignup ? 'Create Account' : isRecovery ? 'Send Reset Link' : 'Enter Workspace';

  return (
    <div className="ct-auth-shell">
      <section className="ct-auth-panel">
        <div className="ct-auth-card">
          <div className="ct-auth-header">
            <div className="ct-brand-mark">CT</div>
            <div>
              <div className="ct-badge">CarbonTrace AI</div>
              <div className="ct-auth-subtitle">Premium compliance workspace</div>
            </div>
          </div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
          <div className="ct-auth-metrics">
            <div className="ct-auth-metric">
              <strong>Real EUDR</strong>
              <span>Earth Engine live</span>
            </div>
            <div className="ct-auth-metric">
              <strong>Release packs</strong>
              <span>PDF, DDS, XML</span>
            </div>
          </div>
          <form className="ct-form-grid" onSubmit={onSubmit}>
            {isSignup && (
              <label className="ct-field">
                <span>Full Name</span>
                <input name="name" type="text" />
              </label>
            )}
            <label className="ct-field">
              <span>Email</span>
              <input name="email" type="email" required />
            </label>
            {!isRecovery && (
              <label className="ct-field">
                <span>Password</span>
                <input name="password" type="password" required />
              </label>
            )}
            {!isRecovery && (
              <label className="ct-field">
                <span>Role</span>
                <select value={authRole} onChange={(event) => setAuthRole(event.target.value as UserRole)}>
                  <option value="exporter">Exporter</option>
                  <option value="verifier">Verifier</option>
                  <option value="importer">Importer</option>
                </select>
              </label>
            )}
            {authError && <div className="ct-note">{authError}</div>}
            {authNotice && <div className="ct-note is-success">{authNotice}</div>}
            <button className="ct-primary-button" type="submit" disabled={busy}>
              {busy ? 'Please wait...' : submitLabel}
            </button>
          </form>
          <div className="ct-auth-footer-actions">
            <button className="ct-link-button" type="button" onClick={onToggleRoute}>
              {isSignup || isRecovery ? 'Back to login' : 'Need an account?'}
            </button>
            {!isSignup && !isRecovery ? (
              <button className="ct-link-button" type="button" onClick={onForgotPassword}>
                Forgot password?
              </button>
            ) : null}
          </div>
        </div>
        <aside className="ct-auth-side">
          <div className="ct-badge">CarbonTrace Platform</div>
          <h2>Trace origin. Verify risk. Ship with confidence.</h2>
          <p className="ct-auth-lead">One premium system for exporter, verifier, and importer teams.</p>
          <div className="ct-auth-role-strip">
            <div className="ct-auth-role-chip">Exporter</div>
            <div className="ct-auth-role-chip">Verifier</div>
            <div className="ct-auth-role-chip">Importer</div>
          </div>
          <div className="ct-auth-trust-grid">
            <div className="ct-auth-trust-card">
              <span className="ct-badge">Maps</span>
              <strong>Plot + GeoJSON</strong>
              <p>Land evidence stays linked.</p>
            </div>
            <div className="ct-auth-trust-card">
              <span className="ct-badge">Outputs</span>
              <strong>DDS, XML, PDF</strong>
              <p>Importer-ready packages.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default AuthScreen;
