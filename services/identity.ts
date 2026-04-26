import { CompanyProfile, SessionUser, UserRole } from '../types';

const ROLE_PREFIX: Record<UserRole, string> = {
  exporter: 'EXP',
  verifier: 'VER',
  importer: 'IMP',
};

const cleanIdFragment = (value?: string) => {
  const fragment = (value ?? '').replace(/[^a-z0-9]/gi, '').toUpperCase().slice(-8);
  return fragment || '00000000';
};

export const buildWorkspaceId = (role: UserRole, userId?: string) =>
  `${ROLE_PREFIX[role]}-${cleanIdFragment(userId)}`;

export const getUserWorkspaceId = (user?: Pick<SessionUser, 'id' | 'role' | 'workspaceId'> | null) =>
  user ? user.workspaceId || buildWorkspaceId(user.role, user.id) : '';

export const getExporterReferenceId = (
  profile: CompanyProfile | null | undefined,
  user?: Pick<SessionUser, 'id' | 'role' | 'workspaceId'> | null,
) =>
  profile?.gst?.trim() ||
  profile?.eori?.trim() ||
  profile?.udyam?.trim() ||
  getUserWorkspaceId(user);

export const findUserByRoutingId = (
  users: SessionUser[],
  routingId?: string,
  role?: UserRole,
) => {
  const normalized = routingId?.trim().toLowerCase();
  if (!normalized) return undefined;

  return users.find((user) => {
    if (role && user.role !== role) return false;
    return user.id.toLowerCase() === normalized || getUserWorkspaceId(user).toLowerCase() === normalized;
  });
};

export const shipmentMatchesAssignee = (
  shipmentAssigneeId: string | undefined,
  user: SessionUser,
) => {
  if (!shipmentAssigneeId) return true;
  const normalized = shipmentAssigneeId.trim().toLowerCase();
  return normalized === user.id.toLowerCase() || normalized === getUserWorkspaceId(user).toLowerCase();
};
