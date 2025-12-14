// Exemple de flow client -> server -> client (moyenne).
// 1) Génère contexte + clés (CKKS).
// 2) "Wrap" (protect) la secretKey via logger (local ou AWS KMS).
// 3) Chiffre un vecteur et POST /compute-average.
// 4) Récupère le ciphertext résultat et demande le unwrap de la secretKey pour déchiffrer.

import fetch from 'node-fetch'; // si Node >=18, tu peux utiliser fetch global
import * as cryptoModule from './crypto.js';

async function runDemo() {
  // 1) Génère contexte CKKS et clés (client-side)
  console.log('Génération des clés CKKS (ça prend un peu de temps)...');
  const { serialized } = await cryptoModule.createContextAndKeys();
  // serialized = { parms, publicKey, secretKey, relinKeys, galoisKeys }

  // 2) Wrap & stocke la secretKey (id = 'hospital-demo' par ex.)
  console.log('Protection (wrapping) de la secretKey via KMS/local store...');
  const id = 'hospital-demo';
  await cryptoModule.wrapAndStoreSecretKey(id, serialized.secretKey);
  console.log('SecretKey protégée et stockée.');

  // 3) chiffrement : on crée un petit vecteur médical
  const values = [120.0, 130.0, 110.0]; // exemple simple
  console.log('Chiffrement local du vecteur :', values);
  const cipherB64 = await cryptoModule.clientEncryptVector(serialized, values);

  // 4) Envoie au serveur pour calcul aveugle
  console.log('Envoi au serveur pour calcul (moyenne)...');
  const resp = await fetch('http://localhost:3000/compute-average', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cipher: cipherB64,
      relinKeys: serialized.relinKeys,
      galoisKeys: serialized.galoisKeys,
      n: values.length
    })
  });
  const payload = await resp.json();
  if (payload.error) {
    console.error('Erreur serveur:', payload.error);
    return;
  }
  const resultCipherB64 = payload.resultCipher;
  console.log('Résultat chiffré reçu du serveur.');

  // 5) Déprotéger la secretKey via KMS/local (unwrap) pour déchiffrer le résultat
  console.log('Récupération de la secretKey protégée (unwrap)...');
  const secretKeyBase64 = await cryptoModule.unwrapSecretKey(id);
  console.log('SecretKey obtenue (en mémoire seulement). On déchiffre le résultat...');

  const decoded = await cryptoModule.decryptResultWithSecretKey(serialized.parms, secretKeyBase64, resultCipherB64);
  console.log('Résultat décodé (approx) :', decoded[0]); // CKKS renvoie approximation
}

runDemo().catch(err => {
  console.error('Erreur demo client:', err);
});