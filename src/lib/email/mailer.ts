import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true';

  if (!host || !port || !user || !pass) {
    throw new Error('Missing SMTP_* env vars for nodemailer');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendStartSubscriptionEmail(params: {
  to: string;
  barName: string;
  checkoutUrl: string;
}) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error('Missing EMAIL_FROM env var');

  const { to, barName, checkoutUrl } = params;

  const subject = 'where2watch – Start abonnement';
  const text = `Hei ${barName},\n\nHer er lenken for å starte abonnementet ditt:\n${checkoutUrl}\n\nHilsen where2watch`;
  const html = `
    <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5">
      <h2 style="margin: 0 0 12px">where2watch</h2>
      <p>Hei ${barName},</p>
      <p>Her er lenken for å starte abonnementet ditt:</p>
      <p><a href="${checkoutUrl}">${checkoutUrl}</a></p>
      <p style="margin-top: 20px; color: #52525b">Hilsen where2watch</p>
    </div>
  `;

  await getTransporter().sendMail({ from, to, subject, text, html });
}
