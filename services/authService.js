const User = require("../models/user.model");
const { encrypt, decrypt } = require("../utils/cryptSecret");
const { generateMfaSecret, generateQRCode, verifyTOTP } = require("../utils/mfa");

// -------------------- SIGNUP --------------------
async function signup({ username, email, password, role, specialite, isChef, service, mfaEnabled }) {
  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) throw new Error("Email ou username déjà utilisé");

  const user = new User({ username, email, password, role, specialite, isChef, service, mfaEnabled });

  let qrCodeUrl = null;
  if (mfaEnabled) {
    const secret = generateMfaSecret(username);

    // 🔐 Chiffrer le secret avant stockage
    user.mfaSecret = encrypt(secret.base32);

    // QR code pour Google Authenticator
    qrCodeUrl = await generateQRCode(secret.otpauth_url);
  }

  await user.save();
  return { user, qrCodeUrl };
}

// -------------------- LOGIN --------------------
async function login({ email, password, code }) {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Utilisateur non trouvé");

  const valid = await user.comparePassword(password);
  if (!valid) throw new Error("Mot de passe incorrect");

  // Vérification MFA uniquement si activé
  if (user.mfaEnabled) {
    if (!code) throw new Error("Code MFA requis");
    if (!user.mfaSecret) throw new Error("Utilisateur MFA mal configuré");

    const decryptedSecret = decrypt(user.mfaSecret);
    const mfaValid = verifyTOTP(code, decryptedSecret);
    if (!mfaValid) throw new Error("Code MFA invalide");
  }

  return { user };
}


// -------------------- GENERER MFA --------------------
async function generateMfa(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error("Utilisateur non trouvé");

  const secret = generateMfaSecret(user.username);

  // 🔐 Chiffrer le secret avant stockage
  user.mfaSecret = encrypt(secret.base32);
  user.mfaEnabled = true;

  await user.save();

  const qrCodeUrl = await generateQRCode(secret.otpauth_url);
  return { qrCodeUrl };
}

// -------------------- VERIFIER MFA --------------------
async function verifyMfa(userId, code) {
  const user = await User.findById(userId);
  if (!user || !user.mfaSecret) throw new Error("Utilisateur invalide");

  const decryptedSecret = decrypt(user.mfaSecret);
  const mfaValid = verifyTOTP(code, decryptedSecret);
  if (!mfaValid) throw new Error("Code MFA invalide");

  return user;
}

module.exports = { signup, login, generateMfa, verifyMfa };
