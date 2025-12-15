const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

// Algorithme de chiffrement - AES-256-GCM (le plus sécurisé)
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Génère une clé de chiffrement unique pour un patient
 * @param {string} patientId - ID du patient
 * @param {string} masterKey - Clé maître depuis config
 * @returns {Buffer} - Clé de chiffrement de 32 bytes
 */
function generatePatientKey(patientId, masterKey) {
  // Dériver une clé unique par patient depuis la clé maître
  return crypto.pbkdf2Sync(
    patientId.toString(),
    masterKey,
    100000, // iterations
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Chiffre un fichier avec AES-256-GCM
 * @param {string} inputPath - Chemin du fichier à chiffrer
 * @param {string} outputPath - Chemin où sauvegarder le fichier chiffré
 * @param {Buffer} key - Clé de chiffrement (32 bytes)
 * @returns {Promise<Object>} - Métadonnées du chiffrement (iv, authTag)
 */
async function encryptFile(inputPath, outputPath, key) {
  try {
    // Lire le fichier original
    const fileBuffer = await readFile(inputPath);
    
    // Générer un IV aléatoire (vecteur d'initialisation)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Créer le cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Chiffrer les données
    const encryptedBuffer = Buffer.concat([
      cipher.update(fileBuffer),
      cipher.final()
    ]);
    
    // Récupérer le tag d'authentification (intégrité)
    const authTag = cipher.getAuthTag();
    
    // Écrire le fichier chiffré
    await writeFile(outputPath, encryptedBuffer);
    
    // Supprimer le fichier original (pour sécurité)
    await unlink(inputPath);
    
    return {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: ALGORITHM
    };
  } catch (error) {
    console.error('Erreur chiffrement fichier:', error);
    throw new Error('Échec du chiffrement du fichier');
  }
}

/**
 * Déchiffre un fichier
 * @param {string} inputPath - Chemin du fichier chiffré
 * @param {Buffer} key - Clé de déchiffrement
 * @param {string} ivHex - IV en hexadécimal
 * @param {string} authTagHex - Tag d'authentification en hexadécimal
 * @returns {Promise<Buffer>} - Données déchiffrées
 */
async function decryptFile(inputPath, key, ivHex, authTagHex) {
  try {
    // Lire le fichier chiffré
    const encryptedBuffer = await readFile(inputPath);
    
    // Convertir IV et authTag depuis hex
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Créer le decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Déchiffrer
    const decryptedBuffer = Buffer.concat([
      decipher.update(encryptedBuffer),
      decipher.final()
    ]);
    
    return decryptedBuffer;
  } catch (error) {
    console.error('Erreur déchiffrement fichier:', error);
    throw new Error('Échec du déchiffrement du fichier');
  }
}

/**
 * Génère un nom de fichier unique pour le stockage chiffré
 * @param {string} originalName - Nom original du fichier
 * @returns {string} - Nom de fichier hashé
 */
function generateSecureFilename(originalName) {
  const ext = path.extname(originalName);
  const hash = crypto.randomBytes(16).toString('hex');
  return `${hash}${ext}.encrypted`;
}

module.exports = {
  generatePatientKey,
  encryptFile,
  decryptFile,
  generateSecureFilename
};