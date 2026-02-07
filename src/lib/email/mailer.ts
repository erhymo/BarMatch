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

function getMailFrom() {
  const from = process.env.MAIL_FROM ?? process.env.EMAIL_FROM;
  if (!from) throw new Error('Missing MAIL_FROM (or EMAIL_FROM) env var');
  return from;
}

export async function sendStartSubscriptionEmail(params: {
  to: string;
  barName: string;
  checkoutUrl: string;
}) {
  const from = getMailFrom();

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

export async function sendInviteEmail(params: {
  to: string;
  inviteLink: string;
  trialDays: number;
  firstChargeDateText: string;
  expiresHours: number;
}) {
  const from = getMailFrom();
  const { to, inviteLink, trialDays, firstChargeDateText, expiresHours } = params;

  const subject = 'where2watch – Invitasjon til å registrere bar';
  const text = `Hei!\n\nDu er invitert til å registrere baren din i where2watch.\n\nLenke (gyldig i ${expiresHours} timer, kun én gang):\n${inviteLink}\n\nDu legger inn kort nå, men første belastning skjer ved slutten av prøvetiden (${trialDays} dager): ${firstChargeDateText}.\n\nHilsen where2watch`;
  const html = `
    <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5">
      <h2 style="margin: 0 0 12px">where2watch</h2>
      <p>Du er invitert til å registrere baren din i where2watch.</p>
      <p><strong>Lenken er gyldig i ${expiresHours} timer</strong> og kan kun brukes én gang.</p>
      <p><a href="${inviteLink}">${inviteLink}</a></p>
      <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 16px 0" />
      <p>
        Du legger inn kort nå, men <strong>første belastning skjer ved slutten av prøvetiden</strong>
        (${trialDays} dager): <strong>${firstChargeDateText}</strong>.
      </p>
      <p style="margin-top: 20px; color: #52525b">Hilsen where2watch</p>
    </div>
  `;

  await getTransporter().sendMail({ from, to, subject, text, html });
}

export async function sendPaymentFailedDay0(params: { to: string; barName?: string }) {
  const from = getMailFrom();
  const { to, barName } = params;
  const subject = 'where2watch – Betaling feilet';
  const text = `Hei${barName ? ` ${barName}` : ''}.\n\nVi klarte ikke å gjennomføre betalingen for abonnementet ditt.\n\nBaren din blir ikke skjult med en gang. Du har en grace-periode på 14 dager til å oppdatere betalingskort.\n\nLogg inn på /admin og velg “Oppdater betalingskort”.\n\nHilsen where2watch`;
  await getTransporter().sendMail({ from, to, subject, text });
}

export async function sendPaymentReminderDay7(params: { to: string; barName?: string }) {
  const from = getMailFrom();
  const { to, barName } = params;
  const subject = 'where2watch – Påminnelse: oppdater betalingskort';
  const text = `Hei${barName ? ` ${barName}` : ''}.\n\nPåminnelse: betalingen for abonnementet ditt feilet for 7 dager siden.\n\nLogg inn på /admin og velg “Oppdater betalingskort” for å unngå at baren blir skjult etter 14 dager.\n\nHilsen where2watch`;
  await getTransporter().sendMail({ from, to, subject, text });
}

export async function sendHiddenDay14(params: { to: string; barName?: string }) {
  const from = getMailFrom();
  const { to, barName } = params;
  const subject = 'where2watch – Baren er skjult pga manglende betaling';
  const text = `Hei${barName ? ` ${barName}` : ''}.\n\nGrace-perioden er utløpt og baren er nå skjult i where2watch pga manglende betaling.\n\nDu har fortsatt full tilgang til /admin/bar. Oppdater betalingskort der for å aktivere abonnementet igjen.\n\nHilsen where2watch`;
  await getTransporter().sendMail({ from, to, subject, text });
}

export async function sendBarContactMessageEmail(params: {
  to: string;
  barName?: string;
  customerName?: string;
  customerEmail: string;
  customerPhone?: string;
  message: string;
}) {
  const from = getMailFrom();
  const { to, barName, customerName, customerEmail, customerPhone, message } = params;

  const subject = 'where2watch – Ny melding fra kunde';

  const safeBarName = barName ?? 'baren din';
  const safeCustomerName = customerName && customerName.trim().length > 0 ? customerName.trim() : 'Ikke oppgitt';
  const safePhone = customerPhone && customerPhone.trim().length > 0 ? customerPhone.trim() : 'Ikke oppgitt';

  const text = `Hei ${safeBarName}.\n\nDu har fått en ny melding fra en kunde via where2watch:\n\nNavn: ${safeCustomerName}\nE-post: ${customerEmail}\nTelefon: ${safePhone}\n\nMelding:\n${message}\n\nDu kan svare direkte ved å svare på denne e-posten.\n\nHilsen where2watch`;

  const html = `
    <div style="font-family: ui-sans-serif, system-ui; line-height: 1.5">
      <h2 style="margin: 0 0 12px">where2watch</h2>
      <p>Hei ${safeBarName}.</p>
      <p>Du har fått en ny melding fra en kunde via where2watch:</p>
      <ul>
        <li><strong>Navn:</strong> ${safeCustomerName}</li>
        <li><strong>E-post:</strong> ${customerEmail}</li>
        <li><strong>Telefon:</strong> ${safePhone}</li>
      </ul>
      <p><strong>Melding:</strong></p>
      <p style="white-space: pre-wrap; border-left: 3px solid #e4e4e7; padding-left: 12px; margin: 8px 0 16px;">${message}</p>
      <p>Du kan svare kunden ved å svare direkte på denne e-posten.</p>
      <p style="margin-top: 20px; color: #52525b">Hilsen where2watch</p>
    </div>
  `;

  await getTransporter().sendMail({
    from,
    to,
    replyTo: customerEmail,
    subject,
    text,
    html,
  });
}
