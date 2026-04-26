import React from 'react';
import { ExporterWorkspace } from '../features/exporter/ExporterWorkspace';
import { ExporterTab } from '../features/exporter/types';
import { SessionUser } from '../types';

export const ExporterScreen = ({
  session,
  onLogout,
  forcedTab,
  showTabs = true,
}: {
  session: SessionUser;
  onLogout: () => Promise<void>;
  forcedTab?: ExporterTab;
  showTabs?: boolean;
}) => (
  <ExporterWorkspace session={session} onLogout={onLogout} forcedTab={forcedTab} showTabs={showTabs} />
);
