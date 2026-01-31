import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'node:fs';

function readDotEnvValue(key) {
  if (!existsSync('.env.local')) return null;
  const text = readFileSync('.env.local', 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (!line.startsWith(`${key}=`)) continue;
    let val = line.slice(key.length + 1);
    // Strip optional surrounding quotes.
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    return val;
  }
  return null;
}

function getEnvOrDotEnvValue(key) {
  const envVal = process.env[key];
  if (typeof envVal === 'string' && envVal.trim()) return envVal;
  const dotVal = readDotEnvValue(key);
  return typeof dotVal === 'string' && dotVal.trim() ? dotVal : null;
}

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
  const json = getEnvOrDotEnvValue('FIREBASE_SERVICE_ACCOUNT_JSON');
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

  const username = args.username || args.email || getEnvOrDotEnvValue('BAR_OWNER_USERNAME');
  const password = args.password || getEnvOrDotEnvValue('BAR_OWNER_PASSWORD');
  const domain =
    args.domain || getEnvOrDotEnvValue('BAR_OWNER_EMAIL_DOMAIN') || process.env.BAR_OWNER_EMAIL_DOMAIN || 'where2watch.local';
  const barName = String(args.barName || args.name || 'Fiktiv Bar (Test)');
  const preferredBarId = typeof args.barId === 'string' && args.barId.trim() ? args.barId.trim() : null;

  if (!username) {
    throw new Error('Missing --username/--email. You can also set BAR_OWNER_USERNAME in .env.local.');
  }
  if (!password) {
    throw new Error('Missing --password. You can also set BAR_OWNER_PASSWORD in .env.local.');
  }

  const email = toEmail(username, domain);

  console.log('Seeding bar owner…');
  console.log(`- email: ${email}`);

  const app = getAdminApp();
  console.log('- Firebase Admin app initialized');
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log('- ensure Firebase Auth user (create/update password)');
  let user;
  try {
    user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, {
      password,
      displayName: String(args.displayName || username),
      emailVerified: true,
    });
    console.log(`Updated Firebase user for ${email} (uid=${user.uid}).`);
  } catch {
    user = await auth.createUser({
      email,
      password,
      displayName: String(args.displayName || username),
      emailVerified: true,
    });
    console.log(`Created Firebase user for ${email} (uid=${user.uid}).`);
  }

  const barUserRef = db.collection('barUsers').doc(user.uid);
  console.log(`- load barUsers/${user.uid}`);
  const barUserSnap = await barUserRef.get();

  let barId = preferredBarId;
  if (!barId && barUserSnap.exists) {
    const d = barUserSnap.data() || {};
    if (typeof d.barId === 'string' && d.barId) barId = d.barId;
  }

  const barRef = barId ? db.collection('bars').doc(barId) : db.collection('bars').doc();
  barId = barRef.id;

  console.log(`- ensure bars/${barId}`);
  await barRef.set(
    {
      name: barName,
      email,
      isVisible: false,
      status: 'active',
      billingEnabled: false,
      billingStatus: 'unknown',
      seededAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(`- ensure barUsers/${user.uid} -> barId=${barId}`);
  await barUserRef.set(
    {
      barId,
      role: 'bar_owner',
      email,
      seededAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log('OK: Seeded bar owner');
  console.log(`- identifier: ${String(args.username || username)}`);
  console.log(`- email: ${email}`);
  console.log(`- uid: ${user.uid}`);
  console.log(`- barId: ${barId}`);
  console.log('Login on /admin with the identifier + password you provided.');

  // Force exit to avoid hanging gRPC handles in some environments.
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
