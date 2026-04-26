import React from 'react';
import { VerifierWorkspace } from '../features/verifier/VerifierWorkspace';
import { VerifierTab } from '../features/verifier/types';
import { SessionUser } from '../types';

export const VerifierScreen = ({
  session,
  onLogout,
  forcedTab,
  showTabs = true,
}: {
  session: SessionUser;
  onLogout: () => Promise<void>;
  forcedTab?: VerifierTab;
  showTabs?: boolean;
}) => (
  <VerifierWorkspace session={session} onLogout={onLogout} forcedTab={forcedTab} showTabs={showTabs} />
);
