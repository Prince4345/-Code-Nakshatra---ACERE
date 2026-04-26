import React from 'react';
import { WorkspaceNoticeTone } from '../services/userMessages';

type WorkspaceNoticeProps = {
  notice: {
    tone: WorkspaceNoticeTone;
    title: string;
    message: string;
  } | null;
  onDismiss?: () => void;
};

export const WorkspaceNotice: React.FC<WorkspaceNoticeProps> = ({ notice, onDismiss }) => {
  if (!notice) return null;

  return (
    <section className={`ct-workspace-notice is-${notice.tone}`} role="status">
      <div className="ct-workspace-notice-copy">
        <strong>{notice.title}</strong>
        <p>{notice.message}</p>
      </div>
      {onDismiss ? (
        <button className="ct-workspace-notice-close" type="button" onClick={onDismiss}>
          Dismiss
        </button>
      ) : null}
    </section>
  );
};

export const WorkspaceLoadingState: React.FC<{
  title?: string;
  detail?: string;
}> = ({
  title = 'Loading workspace',
  detail = 'Pulling the latest compliance records, documents, and shipment links.',
}) => (
  <section className="ct-loading-state" aria-live="polite" aria-busy="true">
    <div className="ct-loading-card">
      <div className="ct-badge">LIVE WORKSPACE</div>
      <h2>{title}</h2>
      <p>{detail}</p>
      <div className="ct-loading-grid">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="ct-loading-block" key={index}>
            <span className="ct-skeleton-line is-short" />
            <span className="ct-skeleton-line is-title" />
            <span className="ct-skeleton-line" />
            <span className="ct-skeleton-line is-short" />
          </div>
        ))}
      </div>
    </div>
  </section>
);
