export type WorkspaceNoticeTone = 'info' | 'success' | 'warn' | 'error';

const normalize = (value: string) =>
  value
    .replace(/^firebase:\s*/i, '')
    .replace(/^backend error:\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

export const toFriendlyMessage = (error: unknown, fallback = 'We could not complete that step right now.') => {
  const raw =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : '';

  const message = normalize(raw);
  const lower = message.toLowerCase();

  if (!message) return fallback;

  if (lower.includes('missing or insufficient permissions') || lower.includes('permission-denied')) {
    return 'This workspace is not allowed to do that yet. Sign in with the correct role or update the access rules first.';
  }

  if (
    lower.includes('failed to fetch') ||
    lower.includes('network') ||
    lower.includes('service unavailable') ||
    lower.includes('health check failed') ||
    lower.includes('backend analysis failed')
  ) {
    return 'The live compliance service is temporarily unavailable. Please try again in a moment.';
  }

  if (
    lower.includes('invalid-credential') ||
    lower.includes('invalid login credentials') ||
    lower.includes('wrong-password') ||
    lower.includes('user-not-found')
  ) {
    return 'That email or password does not match a CarbonTrace workspace.';
  }

  if (lower.includes('email-already-in-use')) {
    return 'That email is already connected to a CarbonTrace workspace. Sign in instead or use a different email.';
  }

  if (lower.includes('too-many-requests')) {
    return 'Too many attempts were made just now. Wait a minute, then try again.';
  }

  if (lower.includes('plot geometry is required')) {
    return 'Save a valid plot boundary before starting EUDR screening.';
  }

  if (lower.includes('polygon') && lower.includes('three')) {
    return 'Add at least three map points to outline the plot before you continue.';
  }

  if (lower.includes('geojson')) {
    return message;
  }

  return message || fallback;
};

export const toFriendlyChecklist = (heading: string, items: string[]) =>
  `${heading}\n- ${items.filter(Boolean).join('\n- ')}`;
