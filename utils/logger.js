// logger.js
// Simple "KMS-like" helper.
// Mode par défaut : stockage local chiffré (dev).
// Option : USE_AWS_KMS=true -> utilise AWS KMS (Encrypt/Decrypt).
//
// Le but : stocker la secretKey de SEAL *enveloppée* (wrapped).
// On minimise l'exposition de la secretKey en clair.

import fs from 'fs/promises';
import path from 'path';

const DB_FILE = path.resolve('./kms_store.json'); // stockage local pour dev
const USE_AWS = process.env.USE_AWS_KMS === 'true';

// Si tu veux utiliser AWS KMS, installe @aws-sdk/client-kms et configure tes creds via env / IAM role.
let awsKmsClient = null;
if (USE_AWS) {
  try {
    const { KMSClient } = await import('@aws-sdk/client-kms');
    awsKmsClient = new KMSClient({ region: process.env.AWS_REGION || 'eu-west-1' });
  } catch (e) {
    console.warn('USE_AWS_KMS true mais @aws-sdk/client-kms non disponible :', e.message);
  }
}

/* ---------------------------
   UTIL: stock local simple
   --------------------------- */
async function readDb() {
  try {
    const txt = await fs.readFile(DB_FILE, 'utf8');
    return JSON.parse(txt || '{}');
  } catch (e) {
    return {};
  }
}
async function writeDb(obj) {
  await fs.writeFile(DB_FILE, JSON.stringify(obj, null, 2), 'utf8');
}

/* ======================================================
   Public API
   - storeWrappedKey(id, wrappedBase64) : stocke le wrapped key (base64)
   - getWrappedKey(id) : récupère le wrapped key (base64)
   ====================================================== */

// Stocke un wrapped secretKey (base64) associé à un identifiant (ex: patientId / tenantId)
export async function storeWrappedKey(id, wrappedB64) {
  if (USE_AWS && awsKmsClient) {
    // En mode AWS, on suppose que le wrapping a été fait côté client via KMS Encrypt.
    // Ici, on se contente de stocker le ciphertext renvoyé par KMS (base64).
    // En prod tu peux aussi attacher métadonnées (timestamp, owner, usage).
    const db = await readDb();
    db[id] = { wrapped: wrappedB64, savedAt: new Date().toISOString(), method: 'aws-kms' };
    await writeDb(db);
    return true;
  } else {
    // Mode local dev: stocke le wrapped string tel quel
    const db = await readDb();
    db[id] = { wrapped: wrappedB64, savedAt: new Date().toISOString(), method: 'local' };
    await writeDb(db);
    return true;
  }
}

export async function getWrappedKey(id) {
  const db = await readDb();
  return db[id]?.wrapped ?? null;
}

/* ==========================================================
   Optionnel : helpers AWS (Encrypt/Decrypt) si USE_AWS=true.
   - wrapWithAwsKms(plaintextBytes) -> returns base64 ciphertext
   - unwrapWithAwsKms(wrappedB64) -> returns plaintext bytes (Buffer)
   ========================================================== */
export async function wrapWithAwsKms(plaintextBuffer) {
  if (!USE_AWS || !awsKmsClient) {
    throw new Error('AWS KMS non configuré (USE_AWS_KMS !== true ou sdk manquant)');
  }
  const { EncryptCommand } = await import('@aws-sdk/client-kms');
  const KeyId = process.env.KMS_KEY_ID;
  if (!KeyId) throw new Error('Env KMS_KEY_ID non définie');

  const cmd = new EncryptCommand({
    KeyId,
    Plaintext: plaintextBuffer
    // Optionnel: EncryptionContext pour binder le ciphertext
  });
  const res = await awsKmsClient.send(cmd);
  return Buffer.from(res.CiphertextBlob).toString('base64');
}

export async function unwrapWithAwsKms(wrappedB64) {
  if (!USE_AWS || !awsKmsClient) {
    throw new Error('AWS KMS non configuré (USE_AWS_KMS !== true ou sdk manquant)');
  }
  const { DecryptCommand } = await import('@aws-sdk/client-kms');
  const ciphertextBlob = Buffer.from(wrappedB64, 'base64');
  const cmd = new DecryptCommand({ CiphertextBlob: ciphertextBlob });
  const res = await awsKmsClient.send(cmd);
  return Buffer.from(res.Plaintext); // Buffer with plaintext bytes
}

/* ==========================================================
   NOTE pour usage :
   - En local : appelle storeWrappedKey(id, secretKeyBase64Wrapped) -> stock local
   - En prod/AWS : soit tu fais wrapWithAwsKms() côté backend (et stockes le résultat via storeWrappedKey),
     soit tu fais Encrypt côté client et envoies le ciphertext au serveur pour qu'il le stocke.
   ========================================================== */
