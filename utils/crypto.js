import SEAL from 'node-seal';
import * as logger from './logger.js'; // notre "KMS-like" (local ou AWS)

/* ============================
   1) Création contexte CKKS
   ============================ */
export async function createContextAndKeys({
  polyModulusDegree = 8192,
  coeffModulusBits = Int32Array.from([60, 40, 40, 60])
} = {}) {
  const seal = await SEAL();

  // Paramètres CKKS (exemple raisonnable pour demo)
  const parms = seal.EncryptionParameters(seal.SchemeType.CKKS);
  parms.setPolyModulusDegree(polyModulusDegree);
  parms.setCoeffModulus(seal.CoeffModulus.Create(polyModulusDegree, coeffModulusBits));

  // Contexte SEAL (vérifie les paramètres)
  const context = seal.Context(parms, true, seal.SecurityLevel.tc128);
  if (!context.parametersSet()) throw new Error('Paramètres CKKS invalides');

  // Génération de clés
  const keyGenerator = seal.KeyGenerator(context);
  const publicKey = keyGenerator.createPublicKey();
  const secretKey = keyGenerator.secretKey();
  const relinKeys = keyGenerator.createRelinKeys();
  const galoisKeys = keyGenerator.createGaloisKeys();

  const encoder = seal.CKKSEncoder(context);
  const slotCount = encoder.slotCount();

  // Sérialisation -> base64 (facile à stocker / envoyer)
  const serial = {
    parms: parms.save(),
    publicKey: publicKey.save(),
    secretKey: secretKey.save(),   // attention : c'est la secretKey (à protéger)
    relinKeys: relinKeys.save(),
    galoisKeys: galoisKeys.save()
  };

  // On renvoie aussi des objets utiles en mémoire si besoin (seal/context)
  return { seal, context, encoder, slotCount, serialized: serial };
}

/* ====================================================
   2) Wrapper : stocker la secretKey via logger (KMS)
   - id : identifiant logique (ex: hospital-tenant, patient)
   - secretKeyBase64 : secretKey.save() (string)
   ==================================================== */
export async function wrapAndStoreSecretKey(id, secretKeyBase64) {
  // Ici on "wrappe" la secretKey. Dans le flux réel on ferait KMS Encrypt.
  // Pour simplifier, on stocke le secretKeyBase64 **tel quel** dans logger.storeWrappedKey
  // si tu utilises AWS mode réel, adapte pour appeler wrapWithAwsKms() avant le store.
  // Pour exemple : si logger.wrapWithAwsKms existe, on l'utilise.
  let wrapped = null;
  if (logger.wrapWithAwsKms) {
    try {
      // wrapWithAwsKms attend un Buffer
      wrapped = await logger.wrapWithAwsKms(Buffer.from(secretKeyBase64, 'utf8'));
    } catch (e) {
      // si AWS non dispo, fallback local
      wrapped = Buffer.from(secretKeyBase64, 'utf8').toString('base64');
    }
  } else {
    // local fallback: encode la secretKeyBase64 en base64 et stocke
    wrapped = Buffer.from(secretKeyBase64, 'utf8').toString('base64');
  }

  // stocke via logger (DB local ou remote)
  await logger.storeWrappedKey(id, wrapped);
  return wrapped;
}

/* ====================================================
   3) Unwrap : récupérer la secretKey via logger (KMS)
   - id : identifiant associée à la clé
   - retourne secretKeyBase64 (la chaîne produite par secretKey.save())
   ==================================================== */
export async function unwrapSecretKey(id) {
  const wrapped = await logger.getWrappedKey(id);
  if (!wrapped) throw new Error('Aucune clé trouvée pour id=' + id);

  // si AWS mode dispo, appel unwrapWithAwsKms pour décrypter le wrapped blob
  if (logger.unwrapWithAwsKms) {
    try {
      const plaintextBuf = await logger.unwrapWithAwsKms(wrapped);
      return plaintextBuf.toString('utf8');
    } catch (e) {
      // fallback si erreur
      const maybe = Buffer.from(wrapped, 'base64').toString('utf8');
      return maybe;
    }
  } else {
    // local fallback : wrapped est base64 du secretKeyBase64
    return Buffer.from(wrapped, 'base64').toString('utf8');
  }
}

/* ====================================================
   4) Client-side: chiffrer un vecteur (values array -> ciphertext base64)
   - serialized: objet retourné par createContextAndKeys().serialized (publicKey/parms/...)
   - values: Array de nombres
   ==================================================== */
export async function clientEncryptVector(serialized, values, scale = Math.pow(2, 40)) {
  const seal = await SEAL();
  // Recréer le contexte depuis serialized.parms (doit matcher)
  const parms = seal.EncryptionParameters();
  parms.load(serialized.parms);
  const context = seal.Context(parms, true, seal.SecurityLevel.tc128);

  const encoder = seal.CKKSEncoder(context);
  const publicKey = seal.PublicKey();
  publicKey.load(context, serialized.publicKey);

  const plain = encoder.encode(Float64Array.from(values), scale);
  const encryptor = seal.Encryptor(context, publicKey);
  const cipher = encryptor.encrypt(plain);
  return cipher.save(); // base64 string
}

/* ====================================================
   5) Server-side: calcul aveugle (ex: moyenne)
   - seal/context doit être initialisé côté serveur (même params)
   - on fournit relin/galois en base64 (serialised.*)
   - cipherB64 : ciphertext reçu du client
   ==================================================== */
export async function serverComputeAverage(seal, context, cipherB64, serializedRelinB64, serializedGaloisB64, n) {
  // charger ciphertext
  const cipher = seal.CipherText();
  cipher.load(context, cipherB64);

  // load relin / galois keys
  const galois = seal.GaloisKeys();
  galois.load(context, serializedGaloisB64);
  const relin = seal.RelinKeys();
  relin.load(context, serializedRelinB64);

  const evaluator = seal.Evaluator(context);
  let sumCipher = cipher; // réutilise la référence (pour démos) — clone si besoin

  for (let step = 1; step < n; step <<= 1) {
    const rotated = seal.CipherText();
    evaluator.rotateVector(sumCipher, step, galois, rotated);
    evaluator.addInplace(sumCipher, rotated);
  }

  const encoder = seal.CKKSEncoder(context);
  const plainDiv = encoder.encode([1.0 / n], Math.pow(2, 40));
  evaluator.multiplyPlainInplace(sumCipher, plainDiv);
  evaluator.relinearizeInplace(sumCipher, relin);

  return sumCipher.save(); // base64
}

/* ====================================================
   6) Déchiffrement du résultat à partir de la secretKey (base64)
   - serializedParms : serialized.parms (base64)
   - secretKeyBase64 : secretKey.save() (string) -> charge et decrypte
   - resultCipherB64 : résultat renvoyé par le serveur
   ==================================================== */
export async function decryptResultWithSecretKey(serializedParms, secretKeyBase64, resultCipherB64) {
  const seal = await SEAL();
  const parms = seal.EncryptionParameters();
  parms.load(serializedParms);
  const context = seal.Context(parms, true, seal.SecurityLevel.tc128);

  // charge secretKey (string)
  const secretKey = seal.SecretKey();
  secretKey.load(context, secretKeyBase64);

  const decryptor = seal.Decryptor(context, secretKey);
  const cipher = seal.CipherText();
  cipher.load(context, resultCipherB64);

  const plain = decryptor.decrypt(cipher);
  const encoder = seal.CKKSEncoder(context);
  const decoded = encoder.decode(plain); // Float64Array approximatif
  return decoded;
}
