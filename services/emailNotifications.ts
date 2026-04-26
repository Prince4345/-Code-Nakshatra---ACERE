import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type WorkflowEmailSummaryItem = {
  label: string;
  value: string;
};

export type WorkflowEmailAttachment = {
  fileName: string;
  contentBase64: string;
  contentType?: string;
};

export type WorkflowEmailPayload = {
  to: EmailRecipient[];
  subject: string;
  title: string;
  message: string;
  route?: string;
  secondaryLines?: string[];
  overline?: string;
  badge?: string;
  referenceId?: string;
  summaryItems?: WorkflowEmailSummaryItem[];
  actionLabel?: string;
  footerNote?: string;
  attachments?: WorkflowEmailAttachment[];
};

const EMAIL_FIXES: Record<string, string> = {
  'pincu77077@gmail.com': 'pincu7706@gmail.com',
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const normalizeRecipients = (recipients: EmailRecipient[]) => {
  const seen = new Set<string>();
  return recipients
    .map((item) => {
      const rawEmail = item.email.trim().toLowerCase();
      return {
        ...item,
        email: EMAIL_FIXES[rawEmail] ?? rawEmail,
      };
    })
    .filter((item) => {
      if (!isValidEmail(item.email) || seen.has(item.email)) return false;
      seen.add(item.email);
      return true;
    });
};

const callable = httpsCallable<
  {
    to: EmailRecipient[];
    subject: string;
    title: string;
    message: string;
    route?: string;
    secondaryLines?: string[];
    overline?: string;
    badge?: string;
    referenceId?: string;
    summaryItems?: WorkflowEmailSummaryItem[];
    actionLabel?: string;
    footerNote?: string;
    attachments?: WorkflowEmailAttachment[];
    appBaseUrl: string;
  },
  { sent: number; skipped?: boolean; reason?: string }
>(functions, 'sendWorkflowEmail');

export const sendWorkflowEmail = async (payload: WorkflowEmailPayload) => {
  const recipients = normalizeRecipients(payload.to);
  if (!recipients.length) return { sent: 0, skipped: true, reason: 'No recipients' };

  const response = await callable({
    ...payload,
    to: recipients,
    appBaseUrl: import.meta.env.VITE_APP_BASE_URL || window.location.origin,
  });

  return response.data;
};
