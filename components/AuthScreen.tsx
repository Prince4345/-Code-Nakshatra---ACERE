import React from 'react';
import { UserRole } from '../types';

type Props = {
  route: '/login' | '/signup';
  authRole: UserRole;
  setAuthRole: React.Dispatch<React.SetStateAction<UserRole>>;
  authError: string;
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  onToggleRoute: () => void;
};

const AuthScreen: React.FC<Props> = ({
  route,
  authRole,
  setAuthRole,
  authError,
  busy,
  onSubmit,
  onToggleRoute,
}) => (
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
        <h1>{route === '/signup' ? 'Create your workspace' : 'Welcome back'}</h1>
        <p>{route === '/signup' ? 'Choose your role and get started.' : 'Use your work email and password.'}</p>
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
          {route === '/signup' && (
            <label className="ct-field">
              <span>Full Name</span>
              <input name="name" type="text" />
            </label>
          )}
          <label className="ct-field">
            <span>Email</span>
            <input name="email" type="email" />
          </label>
          <label className="ct-field">
            <span>Password</span>
            <input name="password" type="password" />
          </label>
          <label className="ct-field">
            <span>Role</span>
            <select value={authRole} onChange={(event) => setAuthRole(event.target.value as UserRole)}>
              <option value="exporter">Exporter</option>
              <option value="verifier">Verifier</option>
              <option value="importer">Importer</option>
            </select>
          </label>
          {authError && <div className="ct-note">{authError}</div>}
          <button className="ct-primary-button" type="submit" disabled={busy}>
            {busy ? 'Please wait...' : route === '/signup' ? 'Create Account' : 'Enter Workspace'}
          </button>
        </form>
        <button className="ct-link-button" onClick={onToggleRoute}>
          {route === '/signup' ? 'Already have an account?' : 'Need an account?'}
        </button>
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

export default AuthScreen;
