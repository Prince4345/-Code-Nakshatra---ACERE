import React from 'react';

type LandingPageProps = {
  onNavigate: (path: '/' | '/login' | '/signup' | '/pricing') => void;
};

const roleFlow = [
  {
    label: 'Exporter',
    title: 'Map plots and link evidence.',
    detail: 'Profile, suppliers, and shipment data stay connected.',
  },
  {
    label: 'Verifier',
    title: 'Review one clean package.',
    detail: 'Assigned queues and approval decisions stay visible.',
  },
  {
    label: 'Importer',
    title: 'Open approved handoff packs.',
    detail: 'DDS, PDF, XML, and evidence stay bundled.',
  },
];

const valueCards = ['Live EUDR', 'Verifier routing', 'Importer pack'];

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => (
  <div className="ct-landing-shell">
    <section className="ct-landing-hero">
      <div className="ct-landing-topline">
        <div>
          <div className="ct-badge">CARBONTRACE AI</div>
          <div className="ct-landing-kicker">Exporter to verifier to importer.</div>
        </div>
        <button className="ct-link-button" type="button" onClick={() => onNavigate('/pricing')}>
          Pricing
        </button>
      </div>

      <div className="ct-landing-grid">
        <div className="ct-landing-copy">
          <h1>Trade compliance teams can actually run.</h1>
          <p>Map origin, review evidence, and release one clean package.</p>
          <div className="ct-landing-actions">
            <button className="ct-primary-button" type="button" onClick={() => onNavigate('/login')}>
              Sign in
            </button>
            <button className="ct-secondary-button" type="button" onClick={() => onNavigate('/signup')}>
              Create account
            </button>
          </div>
          <div className="ct-landing-inline-proof">
            {valueCards.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="ct-landing-flow-panel">
          {roleFlow.map((item, index) => (
            <article className="ct-landing-flow-item" key={item.label}>
              <div className="ct-landing-flow-step">{index + 1}</div>
              <div className="ct-landing-flow-body">
                <div className="ct-landing-flow-label">{item.label}</div>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  </div>
);
