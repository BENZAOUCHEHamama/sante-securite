const crypto = require("crypto");
const config = require("../config/config");

const ALGO = "algo-crypto";
// Utiliser une clé fixe depuis la config (convertir hex string en Buffer)
const KEY = Buffer.from(config.ENCRYPTION_KEY, "hex");

function encrypt(text) {
  // Générer un IV aléatoire pour chaque chiffrement (meilleure sécurité)
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  // Stocker l'IV avec le texte chiffré (nécessaire pour le déchiffrement)
  return encrypted + ":" + iv.toString("hex");
}

function decrypt(data) {
  const parts = data.split(":");
  if (parts.length !== 2) {
    throw new Error("Format de données chiffrées invalide");
  }
  const encryptedText = parts[0];
  const iv = Buffer.from(parts[1], "hex");

  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

module.exports = { encrypt, decrypt };
