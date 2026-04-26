const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

const region = 'us-central1';

if (!admin.apps.length) {
  admin.initializeApp();
}

const SMTP_HOST = (process.env.SMTP_HOST || '').trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USERNAME = (process.env.SMTP_USERNAME || '').trim();
const SMTP_PASSWORD = (process.env.SMTP_PASSWORD || '').trim();
const SMTP_FROM_EMAIL = (process.env.SMTP_FROM_EMAIL || SMTP_USERNAME).trim();
const SMTP_FROM_NAME = (process.env.SMTP_FROM_NAME || 'CarbonTrace AI').trim();
const SMTP_USE_TLS = String(process.env.SMTP_USE_TLS || 'true').toLowerCase() !== 'false';

const emailConfigured = () => Boolean(SMTP_HOST && SMTP_FROM_EMAIL);

const EMAIL_FIXES = {
  'pincu77077@gmail.com': 'pincu7706@gmail.com',
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const normalizeRecipients = (items) => {
  const seen = new Set();
  return items
    .filter((item) => item && typeof item.email === 'string' && item.email.trim())
    .map((item) => {
      const rawEmail = item.email.trim().toLowerCase();
      return {
        ...item,
        email: EMAIL_FIXES[rawEmail] || rawEmail,
      };
    })
    .filter((item) => {
      if (!isValidEmail(item.email) || seen.has(item.email)) return false;
      seen.add(item.email);
      return true;
    });
};

const normalizeAttachments = (items) => {
  const validItems = Array.isArray(items) ? items : [];
  const attachments = [];
  let totalBytes = 0;

  validItems.forEach((item) => {
    if (!item || typeof item.fileName !== 'string' || typeof item.contentBase64 !== 'string') return;
    const fileName = item.fileName.trim();
    const contentBase64 = item.contentBase64.trim();
    if (!fileName || !contentBase64) return;

    const byteLength = Math.ceil((contentBase64.length * 3) / 4);
    if (totalBytes + byteLength > 7 * 1024 * 1024) return;

    totalBytes += byteLength;
    attachments.push({
      filename: fileName,
      content: Buffer.from(contentBase64, 'base64'),
      contentType: typeof item.contentType === 'string' && item.contentType.trim()
        ? item.contentType.trim()
        : undefined,
    });
  });

  return attachments.slice(0, 6);
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getEmailTone = ({ badge, title }) => {
  const value = `${badge || ''} ${title || ''}`.toLowerCase();

  if (value.includes('approved') || value.includes('compliant') || value.includes('ready')) {
    return {
      accent: '#16804f',
      accentSoft: '#e9f7ef',
      accentText: '#0f5132',
    };
  }

  if (value.includes('rejected') || value.includes('alert') || value.includes('flagged')) {
    return {
      accent: '#c2410c',
      accentSoft: '#fff1e8',
      accentText: '#9a3412',
    };
  }

  if (value.includes('clarification') || value.includes('review') || value.includes('submitted')) {
    return {
      accent: '#2563eb',
      accentSoft: '#edf4ff',
      accentText: '#1d4ed8',
    };
  }

  return {
    accent: '#ea6f2d',
    accentSoft: '#fff4eb',
    accentText: '#b45309',
  };
};

const buildActionUrl = ({ route, appBaseUrl }) => (route ? `${appBaseUrl}${route}` : '');

const chunkItems = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const renderSummaryItems = (summaryItems) => {
  if (!summaryItems.length) return '';

  const rows = chunkItems(summaryItems, 2)
    .map(
      (row) => `
        <tr>
          ${row
            .map(
              (item) => `
                <td valign="top" width="50%" style="padding:0 8px 12px 0;">
                  <div style="border:1px solid #e9e1d4;border-radius:16px;padding:14px 16px;background:#fbfaf7;">
                    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a7767;margin-bottom:8px;">${escapeHtml(item.label)}</div>
                    <div style="font-size:16px;line-height:1.45;color:#172033;font-weight:700;">${escapeHtml(item.value)}</div>
                  </div>
                </td>
              `,
            )
            .join('')}
          ${row.length === 1 ? '<td width="50%" style="padding:0 0 12px 0;"></td>' : ''}
        </tr>
      `,
    )
    .join('');

  return `
    <div style="margin:0 0 18px 0;">
      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a7767;margin-bottom:12px;">Package summary</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rows}
      </table>
    </div>
  `;
};

const renderSecondaryLines = (secondaryLines) => {
  if (!secondaryLines.length) return '';

  const items = secondaryLines
    .map(
      (line) => `
        <tr>
          <td valign="top" style="padding:0 10px 10px 0;color:#ea6f2d;font-size:16px;line-height:1;">•</td>
          <td style="padding:0 0 10px 0;color:#475467;font-size:14px;line-height:1.7;">${escapeHtml(line)}</td>
        </tr>
      `,
    )
    .join('');

  return `
    <div style="margin:0 0 20px 0;padding:18px 18px 8px 18px;border:1px solid #eee5da;border-radius:18px;background:#fffdfa;">
      <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#8a7767;margin-bottom:10px;">Included in this update</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${items}
      </table>
    </div>
  `;
};

const buildHtml = ({
  title,
  message,
  route,
  secondaryLines = [],
  appBaseUrl,
  overline,
  badge,
  referenceId,
  summaryItems = [],
  actionLabel,
  footerNote,
}) => {
  const actionUrl = buildActionUrl({ route, appBaseUrl });
  const tone = getEmailTone({ badge, title });
  const pillMarkup = [
    badge
      ? `<span style="display:inline-block;margin:0 8px 8px 0;padding:8px 12px;border-radius:999px;background:${tone.accentSoft};color:${tone.accentText};font-size:12px;font-weight:700;">${escapeHtml(badge)}</span>`
      : '',
    referenceId
      ? `<span style="display:inline-block;margin:0 8px 8px 0;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.14);color:#edf2ff;font-size:12px;font-weight:700;">Ref ${escapeHtml(referenceId)}</span>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  return `
    <!doctype html>
    <html lang="en">
      <body style="margin:0;padding:0;background:#f6f1e8;font-family:Segoe UI,Aptos,Arial,sans-serif;color:#172033;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f1e8;">
          <tr>
            <td align="center" style="padding:28px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:720px;background:#ffffff;border:1px solid #e6dfd5;border-radius:24px;overflow:hidden;">
                <tr>
                  <td style="background:linear-gradient(135deg,#0f1728 0%,#15213a 58%,#291d18 100%);padding:28px 28px 24px 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="top">
                          <div style="display:inline-block;padding:11px 13px;border-radius:16px;background:#ff8a3d;color:#0f1728;font-size:20px;font-weight:800;line-height:1;">CT</div>
                        </td>
                        <td align="right" valign="top">
                          <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#d0d7e6;">${escapeHtml(overline || 'CarbonTrace AI workflow')}</div>
                          <div style="margin-top:12px;">${pillMarkup}</div>
                        </td>
                      </tr>
                    </table>
                    <h1 style="margin:20px 0 12px 0;font-size:30px;line-height:1.16;color:#ffffff;font-weight:800;">${escapeHtml(title)}</h1>
                    <p style="margin:0;font-size:16px;line-height:1.7;color:#d7deec;">${escapeHtml(message)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:26px 28px 28px 28px;">
                    ${renderSummaryItems(summaryItems)}
                    ${renderSecondaryLines(secondaryLines)}
                    ${
                      actionUrl
                        ? `
                          <div style="margin:0 0 22px 0;">
                            <a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:${tone.accent};color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;">${escapeHtml(actionLabel || 'Open in CarbonTrace AI')}</a>
                          </div>
                        `
                        : ''
                    }
                    <div style="padding-top:18px;border-top:1px solid #ede3d7;color:#667085;font-size:12px;line-height:1.7;">
                      <div>${escapeHtml(footerNote || 'This message was generated from the CarbonTrace AI compliance workflow.')}</div>
                      ${
                        actionUrl
                          ? `<div style="margin-top:6px;">Workspace link: <a href="${escapeHtml(actionUrl)}" style="color:${tone.accentText};text-decoration:none;">${escapeHtml(actionUrl)}</a></div>`
                          : ''
                      }
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const buildText = ({
  title,
  message,
  route,
  secondaryLines = [],
  appBaseUrl,
  overline,
  badge,
  referenceId,
  summaryItems = [],
  actionLabel,
  footerNote,
}) => {
  const actionUrl = buildActionUrl({ route, appBaseUrl });
  const lines = [
    overline || 'CarbonTrace AI workflow',
    title,
  ];

  if (badge) lines.push(`Status: ${badge}`);
  if (referenceId) lines.push(`Reference: ${referenceId}`);

  lines.push('', message);

  if (summaryItems.length) {
    lines.push('', 'Package summary:');
    summaryItems.forEach((item) => lines.push(`- ${item.label}: ${item.value}`));
  }

  if (secondaryLines.length) {
    lines.push('', 'Included in this update:');
    secondaryLines.forEach((line) => lines.push(`- ${line}`));
  }

  if (actionUrl) {
    lines.push('', `${actionLabel || 'Open in CarbonTrace AI'}: ${actionUrl}`);
  }

  if (footerNote) {
    lines.push('', footerNote);
  }

  return lines.join('\n');
};

exports.createMobileWorkspaceSession = onCall({ region, cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to create a mobile workspace session.');
  }

  const uid = request.auth.uid;
  const userSnap = await admin.firestore().collection('users').doc(uid).get();
  const userData = userSnap.data() || {};
  const additionalClaims = Object.fromEntries(Object.entries({
    source: 'mobile-app',
    role: typeof userData.role === 'string' ? userData.role : undefined,
    workspaceId: typeof userData.workspaceId === 'string' ? userData.workspaceId : undefined,
  }).filter(([, value]) => value !== undefined));

  const token = await admin.auth().createCustomToken(uid, additionalClaims);

  return {
    token,
    role: additionalClaims.role || null,
    workspaceId: additionalClaims.workspaceId || null,
    appBaseUrl: String(process.env.APP_BASE_URL || 'https://acere4345.web.app').trim(),
  };
});

exports.sendWorkflowEmail = onCall({ region, cors: true }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to send workflow emails.');
  }

  const data = request.data || {};
  const recipients = Array.isArray(data.to)
    ? normalizeRecipients(data.to)
    : [];

  if (!recipients.length) {
    return { sent: 0, skipped: true, reason: 'No recipients provided.' };
  }

  if (!emailConfigured()) {
    logger.warn('SMTP is not configured; email delivery skipped.');
    return { sent: 0, skipped: true, reason: 'SMTP is not configured.' };
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: SMTP_USERNAME && SMTP_PASSWORD
      ? {
          user: SMTP_USERNAME,
          pass: SMTP_PASSWORD,
        }
      : undefined,
  });

  if (SMTP_USE_TLS) {
    transporter.options.requireTLS = true;
  }

  const subject = String(data.subject || '').trim();
  const title = String(data.title || '').trim() || subject || 'CarbonTrace AI Notification';
  const message = String(data.message || '').trim();
  const route = typeof data.route === 'string' ? data.route : '';
  const secondaryLines = Array.isArray(data.secondaryLines)
    ? data.secondaryLines.map((line) => String(line))
    : [];
  const overline = String(data.overline || '').trim();
  const badge = String(data.badge || '').trim();
  const referenceId = String(data.referenceId || '').trim();
  const summaryItems = Array.isArray(data.summaryItems)
    ? data.summaryItems
        .filter((item) => item && typeof item.label === 'string' && typeof item.value === 'string')
        .map((item) => ({
          label: String(item.label).trim(),
          value: String(item.value).trim(),
        }))
        .filter((item) => item.label && item.value)
    : [];
  const actionLabel = String(data.actionLabel || '').trim();
  const footerNote = String(data.footerNote || '').trim();
  const attachments = normalizeAttachments(data.attachments);
  const appBaseUrl = String(data.appBaseUrl || '').replace(/\/$/, '');

  if (!subject || !message) {
    throw new HttpsError('invalid-argument', 'Subject and message are required.');
  }

  await transporter.sendMail({
    from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
    to: recipients.map((item) => (item.name ? `${item.name} <${item.email}>` : item.email)).join(', '),
    subject,
    text: buildText({
      title,
      message,
      route,
      secondaryLines,
      appBaseUrl,
      overline,
      badge,
      referenceId,
      summaryItems,
      actionLabel,
      footerNote,
    }),
    html: buildHtml({
      title,
      message,
      route,
      secondaryLines,
      appBaseUrl,
      overline,
      badge,
      referenceId,
      summaryItems,
      actionLabel,
      footerNote,
    }),
    attachments,
  });

  logger.info('Workflow email sent.', {
    actorId: request.auth.uid,
    recipients: recipients.map((item) => item.email),
    subject,
  });

  return { sent: recipients.length, skipped: false };
});
