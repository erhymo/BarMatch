import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
    out[key] = value;
  }
  return out;
}

function getServiceAccountFromEnv() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON (Firebase Admin service account JSON string).');
  }
  const parsed = JSON.parse(json);
  if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
    throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON (missing required fields).');
  }
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: String(parsed.private_key).replace(/\\n/g, '\n'),
  };
}

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  const sa = getServiceAccountFromEnv();
  return initializeApp({
    credential: cert({
      projectId: sa.projectId,
      clientEmail: sa.clientEmail,
      privateKey: sa.privateKey,
    }),
  });
}

function toEmail(identifier, domain) {
  const trimmed = String(identifier || '').trim();
  if (!trimmed) throw new Error('Missing --username (or --email)');
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  return `${trimmed.toLowerCase()}@${domain}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const username = args.username || args.email || process.env.SUPERADMIN_USERNAME || 'Jens';
  const password = args.password || process.env.SUPERADMIN_PASSWORD;
  const domain = args.domain || process.env.SUPERADMIN_EMAIL_DOMAIN || 'where2watch.local';

  if (!password) {
    throw new Error('Missing password. Provide --password or SUPERADMIN_PASSWORD.');
  }

  const email = toEmail(username, domain);
  const app = getAdminApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log(`Found existing Firebase user for ${email} (uid=${user.uid}).`);
  } catch {
    user = await auth.createUser({
      email,
      password,
      displayName: String(args.displayName || username),
      emailVerified: true,
    });
    console.log(`Created Firebase user for ${email} (uid=${user.uid}).`);
  }

  await db
    .collection('admins')
    .doc(user.uid)
    .set({ enabled: true, seededAt: new Date(), seededEmail: email }, { merge: true });

  console.log('Marked as superadmin in Firestore: admins/{uid}.enabled = true');
  console.log(`Login on /admin with identifier "${String(args.username || username)}" and your chosen password.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
