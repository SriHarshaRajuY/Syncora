import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transporter =
  env.smtpHost && env.smtpUser && env.smtpPass
    ? nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: {
          user: env.smtpUser,
          pass: env.smtpPass
        }
      })
    : null;

// 🔥 RETURN STATUS
const sendMail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log(`Email skipped: ${subject} -> ${to}`);
    return { success: false, reason: 'SMTP not configured' };
  }

  try {
    await transporter.sendMail({
      from: env.smtpFrom,
      to,
      subject,
      html
    });

    return { success: true };
  } catch (err) {
    console.error('Email failed:', err);
    return { success: false, reason: err.message };
  }
};

const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const buildAnswerRows = (answers = {}) => {
  const entries = Object.entries(answers).filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');

  if (!entries.length) {
    return '';
  }

  return `
    <div style="margin-top: 24px;">
      <h3 style="margin: 0 0 12px; font-size: 16px; color: #17355c;">Invitee details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        ${entries
          .map(
            ([label, value]) => `
              <tr>
                <td style="padding: 10px 0; border-top: 1px solid #e2ebf6; color: #5f748c; vertical-align: top; width: 40%;">
                  ${escapeHtml(label)}
                </td>
                <td style="padding: 10px 0; border-top: 1px solid #e2ebf6; color: #17355c; font-weight: 500;">
                  ${escapeHtml(value)}
                </td>
              </tr>
            `
          )
          .join('')}
      </table>
    </div>
  `;
};

const buildEmailShell = ({ title, intro, detailRows, manageUrl, answersHtml, footerNote }) => `
  <div style="margin: 0; padding: 24px; background: #f4f8ff; font-family: Inter, Arial, sans-serif; color: #17355c;">
    <div style="max-width: 680px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe4f0; border-radius: 24px; overflow: hidden;">
      <div style="padding: 28px 32px; background: linear-gradient(135deg, #0d63db 0%, #0a47b1 100%); color: #ffffff;">
        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.14em; font-weight: 700; text-transform: uppercase;">Syncora scheduling</p>
        <h2 style="margin: 0; font-size: 30px; line-height: 1.15;">${escapeHtml(title)}</h2>
      </div>
      <div style="padding: 28px 32px;">
        <p style="margin: 0 0 18px; font-size: 16px; line-height: 1.7; color: #17355c;">${intro}</p>
        <div style="border: 1px solid #e2ebf6; border-radius: 18px; background: #fbfdff; padding: 20px 22px;">
          ${detailRows}
        </div>
        ${answersHtml}
        ${
          manageUrl
            ? `
          <div style="margin-top: 24px;">
            <a href="${manageUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #006bff; color: #ffffff; text-decoration: none; font-weight: 700;">
              Manage your booking
            </a>
          </div>
        `
            : ''
        }
        <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.7; color: #5f748c;">
          ${footerNote}
        </p>
      </div>
    </div>
  </div>
`;

export const sendBookingEmails = async ({
  inviteeEmail,
  inviteeName,
  eventName,
  startAt,
  endAt,
  timezone,
  location,
  manageUrl,
  answers
}) => {
  const detailRows = `
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>Event:</strong> ${escapeHtml(eventName)}</p>
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>Starts:</strong> ${escapeHtml(startAt)}</p>
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>Ends:</strong> ${escapeHtml(endAt)}</p>
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>Timezone:</strong> ${escapeHtml(timezone || 'Local time')}</p>
    <p style="margin: 0; font-size: 15px;"><strong>Location:</strong> ${escapeHtml(location || 'Shared after confirmation')}</p>
  `;

  const html = buildEmailShell({
    title: `${eventName} confirmed`,
    intro: `Hi ${escapeHtml(inviteeName)}, your booking for ${escapeHtml(eventName)} is confirmed. Here are the meeting details and the information you submitted.`,
    detailRows,
    manageUrl,
    answersHtml: buildAnswerRows(answers),
    footerNote: 'If you need to reschedule or cancel, use the manage booking link above.'
  });

  return await sendMail({
    to: inviteeEmail,
    subject: `${eventName} confirmed`,
    html
  });
};

export const sendCancellationEmail = async ({
  inviteeEmail,
  inviteeName,
  eventName,
  startAt,
  endAt,
  timezone,
  location,
  cancelledAt,
  reason,
  answers
}) => {
  const detailRows = `
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>Event:</strong> ${escapeHtml(eventName)}</p>
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>Originally scheduled:</strong> ${escapeHtml(startAt)}</p>
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>End time:</strong> ${escapeHtml(endAt)}</p>
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>Timezone:</strong> ${escapeHtml(timezone || 'Local time')}</p>
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>Location:</strong> ${escapeHtml(location || 'Shared after confirmation')}</p>
    <p style="margin: 0 0 10px; font-size: 15px;"><strong>Cancelled at:</strong> ${escapeHtml(cancelledAt)}</p>
    <p style="margin: 0; font-size: 15px;"><strong>Reason:</strong> ${escapeHtml(reason || 'No reason provided')}</p>
  `;

  const html = buildEmailShell({
    title: `${eventName} cancelled`,
    intro: `Hi ${escapeHtml(inviteeName)}, your ${escapeHtml(eventName)} booking has been cancelled. The original meeting details are included below for reference.`,
    detailRows,
    manageUrl: '',
    answersHtml: buildAnswerRows(answers),
    footerNote: 'If you still need this meeting, please return to the booking page and choose a new time.'
  });

  return await sendMail({
    to: inviteeEmail,
    subject: `${eventName} cancelled`,
    html
  });
};