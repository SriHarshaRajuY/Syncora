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

const sendMail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.log(`Email skipped: ${subject} -> ${to}`);
    return;
  }

  await transporter.sendMail({
    from: env.smtpFrom,
    to,
    subject,
    html
  });
};

export const sendBookingEmails = async ({ inviteeEmail, inviteeName, eventName, startAt, endAt, manageUrl }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2>${eventName} confirmed</h2>
      <p>Hi ${inviteeName}, your booking is confirmed.</p>
      <p><strong>Starts:</strong> ${startAt}</p>
      <p><strong>Ends:</strong> ${endAt}</p>
      <p><a href="${manageUrl}">Manage your booking</a></p>
    </div>
  `;

  await sendMail({
    to: inviteeEmail,
    subject: `${eventName} confirmed`,
    html
  });
};

export const sendCancellationEmail = async ({ inviteeEmail, inviteeName, eventName, cancelledAt }) => {
  const html = `
    <div style="font-family: Arial, sans-serif; color: #0f172a;">
      <h2>${eventName} cancelled</h2>
      <p>Hi ${inviteeName}, your booking was cancelled.</p>
      <p><strong>Cancelled:</strong> ${cancelledAt}</p>
    </div>
  `;

  await sendMail({
    to: inviteeEmail,
    subject: `${eventName} cancelled`,
    html
  });
};

