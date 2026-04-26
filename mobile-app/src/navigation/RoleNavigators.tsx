import React from 'react';
import { WorkspaceWebShell } from '../components/WorkspaceWebShell';
import { SessionUser } from '../types';

export const RoleNavigators = ({
  session,
  onLogout,
}: {
  session: SessionUser;
  onLogout: () => Promise<void>;
}) => <WorkspaceWebShell session={session} onLogout={onLogout} />;

