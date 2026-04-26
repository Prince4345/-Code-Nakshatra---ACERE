import { httpsCallable } from 'firebase/functions';
import { UserRole } from '../types';
import { functions } from './firebase';

export const MOBILE_WEB_APP_URL = 'https://acere4345.web.app';
const MOBILE_SESSION_QUERY_KEY = 'mobileSessionToken';

export type WorkspaceTab = {
  key: string;
  label: string;
  icon: string;
  route: string;
};

export const WORKSPACE_TABS: Record<UserRole, WorkspaceTab[]> = {
  exporter: [
    { key: 'home', label: 'Home', icon: 'home', route: '/app/exporter/dashboard' },
    { key: 'profile', label: 'Profile', icon: 'user', route: '/app/exporter/profile' },
    { key: 'plots', label: 'Plots', icon: 'map', route: '/app/exporter/plots' },
    { key: 'evidence', label: 'Evidence', icon: 'file-text', route: '/app/exporter/uploads' },
    { key: 'shipments', label: 'Shipments', icon: 'truck', route: '/app/exporter/shipments' },
  ],
  verifier: [
    { key: 'home', label: 'Home', icon: 'home', route: '/app/verifier/dashboard' },
    { key: 'queue', label: 'Queue', icon: 'check-square', route: '/app/verifier/queue' },
  ],
  importer: [
    { key: 'home', label: 'Home', icon: 'home', route: '/app/importer/dashboard' },
    { key: 'readiness', label: 'Ready', icon: 'shield', route: '/app/importer/readiness' },
    { key: 'packages', label: 'Packages', icon: 'package', route: '/app/importer/shipments' },
  ],
};

type MobileWorkspaceSessionResponse = {
  token: string;
  role?: UserRole;
  workspaceId?: string | null;
  appBaseUrl?: string;
};

const normalizeBaseUrl = (value?: string) => {
  const next = (value || MOBILE_WEB_APP_URL).trim();
  return next.endsWith('/') ? next.slice(0, -1) : next;
};

export const buildWorkspaceUrl = (route: string, token?: string, appBaseUrl?: string) => {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  const url = new URL(`${normalizeBaseUrl(appBaseUrl)}${normalizedRoute}`);
  if (token) {
    url.searchParams.set(MOBILE_SESSION_QUERY_KEY, token);
    url.searchParams.set('mobileApp', '1');
  }
  return url.toString();
};

export const createMobileWorkspaceSession = async (route: string) => {
  const callable = httpsCallable<undefined, MobileWorkspaceSessionResponse>(
    functions,
    'createMobileWorkspaceSession',
  );
  const result = await callable();
  const data = result.data;
  if (!data?.token) {
    throw new Error('A secure mobile session could not be created.');
  }

  return {
    token: data.token,
    workspaceId: data.workspaceId ?? null,
    appBaseUrl: normalizeBaseUrl(data.appBaseUrl),
    initialUrl: buildWorkspaceUrl(route, data.token, data.appBaseUrl),
  };
};
