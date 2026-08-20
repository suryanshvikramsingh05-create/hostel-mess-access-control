import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "GMAIL_USER / GMAIL_APP_PASSWORD are not configured — cannot send email (see .env.example)."
    );
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transporter;
}

export interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Throws on any failure — callers must not swallow this into a fake success. */
export async function sendMail({ to, subject, html, text }: SendMailInput): Promise<void> {
  const mailer = getTransporter();
  await mailer.sendMail({
    from: `MessPass <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  });
}

export function inviteEmail({
  role,
  hostelName,
  roomNumber,
  inviteLink,
  expiresAt,
}: {
  role: "warden" | "resident";
  hostelName: string;
  roomNumber?: string | null;
  inviteLink: string;
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const roomLine = roomNumber ? ` (Room ${roomNumber})` : "";
  const expiry = expiresAt.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  const subject = `You're invited to join ${hostelName} on MessPass`;
  const text = `You've been invited to join ${hostelName} as a ${role}${roomLine} on MessPass.\n\nComplete your registration: ${inviteLink}\n\nThis link expires on ${expiry}.`;
  const html = `
    <p>You've been invited to join <strong>${hostelName}</strong> as a <strong>${role}</strong>${roomLine} on MessPass.</p>
    <p><a href="${inviteLink}">Complete your registration</a></p>
    <p style="color:#64748b;font-size:13px;">This link expires on ${expiry}. If the button doesn't work, copy this link: ${inviteLink}</p>
  `;
  return { subject, html, text };
}

export function residentWelcomeEmail({
  name,
  hostelName,
  roomNumber,
  email,
  tempPassword,
  loginUrl,
}: {
  name: string;
  hostelName: string;
  roomNumber: string;
  email: string;
  tempPassword: string;
  loginUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Your MessPass account for ${hostelName}`;
  const text = `Hi ${name},\n\nAn account has been created for you at ${hostelName} (Room ${roomNumber}).\n\nLogin: ${loginUrl}\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nYou'll be asked to set a new password on first login.`;
  const html = `
    <p>Hi ${name},</p>
    <p>An account has been created for you at <strong>${hostelName}</strong> (Room ${roomNumber}).</p>
    <p><a href="${loginUrl}">Sign in to MessPass</a></p>
    <table style="margin-top:8px;font-size:14px;">
      <tr><td style="color:#64748b;padding-right:8px;">Email</td><td><strong>${email}</strong></td></tr>
      <tr><td style="color:#64748b;padding-right:8px;">Temporary password</td><td><strong>${tempPassword}</strong></td></tr>
    </table>
    <p style="color:#64748b;font-size:13px;">You'll be asked to set a new password on first login.</p>
  `;
  return { subject, html, text };
}
