import React from 'react';
import { ImporterWorkspace } from '../features/importer/ImporterWorkspace';
import { ImporterTab } from '../features/importer/types';
import { SessionUser } from '../types';

export const ImporterScreen = ({
  session,
  onLogout,
  forcedTab,
  showTabs = true,
}: {
  session: SessionUser;
  onLogout: () => Promise<void>;
  forcedTab?: ImporterTab;
  showTabs?: boolean;
}) => (
  <ImporterWorkspace session={session} onLogout={onLogout} forcedTab={forcedTab} showTabs={showTabs} />
);
