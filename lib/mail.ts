import nodemailer from "nodemailer";
import { getSetting } from "./app-settings";

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendMail({ to, subject, html, text }: SendMailParams) {
  // Fetch SMTP credentials dynamically from DB (with environment variable fallback)
  const host = await getSetting("smtp_host", "SMTP_HOST");
  const portStr = await getSetting("smtp_port", "SMTP_PORT", "587");
  const user = await getSetting("smtp_user", "SMTP_USER");
  const pass = await getSetting("smtp_pass", "SMTP_PASS");
  const from = await getSetting("mail_from", "MAIL_FROM", "noreply@boothmagic.app");

  const port = parseInt(portStr, 10) || 587;

  // Fallback to Console Mock Mailer if no SMTP configurations are present
  if (!host || !user || !pass) {
    console.log("\n========================================================");
    console.log("📨 [MOCK EMAIL SENT]");
    console.log(`FROM:    ${from}`);
    console.log(`TO:      ${to}`);
    console.log(`SUBJECT: ${subject}`);
    console.log("CONTENT:");
    console.log(text);
    console.log("========================================================\n");
    return { mock: true };
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });

  // Send mail
  const info = await transporter.sendMail({
    from: `"${from.split("@")[0]}" <${from}>`,
    to,
    subject,
    text,
    html,
  });

  return { mock: false, messageId: info.messageId };
}

/**
 * Generate a nice-looking HTML layout for transactional emails.
 */
function getEmailLayout(title: string, bodyContent: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background-color: #0b0b14;
            color: #e2e8f0;
            padding: 40px 20px;
            margin: 0;
          }
          .container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #121220;
            border: 1px solid #272740;
            border-radius: 12px;
            padding: 32px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .logo {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            margin-bottom: 24px;
            text-align: center;
          }
          .logo-highlight {
            color: #7c5cff;
          }
          .title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 16px;
            color: #ffffff;
          }
          .body {
            font-size: 15px;
            line-height: 1.6;
            color: #abb2bf;
            margin-bottom: 32px;
          }
          .button-container {
            text-align: center;
            margin-bottom: 32px;
          }
          .button {
            display: inline-block;
            background: linear-gradient(135deg, #7c5cff 0%, #c44dff 100%);
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 600;
            padding: 12px 28px;
            border-radius: 8px;
            font-size: 14px;
            box-shadow: 0 4px 15px rgba(124, 92, 255, 0.4);
          }
          .footer {
            font-size: 12px;
            color: #636d7e;
            text-align: center;
            border-top: 1px solid #272740;
            padding-top: 20px;
          }
          a {
            color: #7c5cff;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <span class="logo-highlight">Booth</span>Magic
          </div>
          ${bodyContent}
          <div class="footer">
            This email was sent by BoothMagic. If you did not request this, you can safely ignore this email.
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendVerificationEmail(email: string, token: string, appUrl: string) {
  const url = `${appUrl.replace(/\/$/, "")}/api/auth/verify?token=${token}`;
  const title = "Verify your email address";
  const html = getEmailLayout(
    title,
    `
      <div class="title">Verify your email address</div>
      <div class="body">
        Welcome to BoothMagic! Please verify your email address to complete your account setup and unlock your 9 free credits.
      </div>
      <div class="button-container">
        <a href="${url}" class="button" target="_blank">Verify Email Address</a>
      </div>
      <div class="body">
        Or copy and paste this link into your browser:<br>
        <a href="${url}">${url}</a>
      </div>
    `
  );

  const text = `Welcome to BoothMagic!\n\nPlease verify your email address to complete your account setup:\n${url}`;

  return sendMail({ to: email, subject: "Verify your email for BoothMagic", html, text });
}

export async function sendPasswordResetEmail(email: string, token: string, appUrl: string) {
  const url = `${appUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
  const title = "Reset your password";
  const html = getEmailLayout(
    title,
    `
      <div class="title">Reset your password</div>
      <div class="body">
        You requested a password reset for your BoothMagic account. Click the button below to set a new password. This link will expire in 1 hour.
      </div>
      <div class="button-container">
        <a href="${url}" class="button" target="_blank">Reset Password</a>
      </div>
      <div class="body">
        Or copy and paste this link into your browser:<br>
        <a href="${url}">${url}</a>
      </div>
    `
  );

  const text = `Reset your password for BoothMagic:\n${url}\n\nThis link will expire in 1 hour.`;

  return sendMail({ to: email, subject: "Reset your BoothMagic Password", html, text });
}
