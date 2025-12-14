const mongoose = require('mongoose');
const crypto = require('crypto');
const config = require('./config');

// Fonction pour chiffrer les données sensibles
function encrypt(text, key) {
  const algorithm = 'algo-crypto';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Fonction pour déchiffrer les données sensibles
function decrypt(encryptedText, key) {
  try {
    const algorithm = 'algo-crypto';
    const parts = encryptedText.split(':');
    
    if (parts.length < 2) {
      throw new Error('Format de chiffrement invalide: doit contenir au moins un ":"');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    if (!iv || iv.length !== 16) {
      throw new Error('IV invalide: doit être de 16 bytes (32 caractères hex)');
    }
    
    if (!encrypted || encrypted.length === 0) {
      throw new Error('Données chiffrées vides');
    }
    
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 32) {
      throw new Error('Clé de chiffrement invalide: doit être de 32 bytes (64 caractères hex)');
    }
    
    const decipher = crypto.createDecipheriv(algorithm, keyBuffer, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Erreur déchiffrement:', error.message);
    throw error;
  }
}

// Middleware pour chiffrer/déchiffrer automatiquement
function setupEncryption(schema, fields) {
  // Utiliser la même clé que le reste de l'application (config/config.js)
  const encryptionKey = process.env.ENCRYPTION_KEY || config.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  
  schema.pre('save', function(next) {
    if (this.isNew || this.isModified()) {
      fields.forEach(field => {
        if (this[field] && typeof this[field] === 'string') {
          // Ne pas chiffrer si déjà chiffré (contient ':')
          if (!this[field].includes(':')) {
            this[field] = encrypt(this[field], encryptionKey);
          }
        }
      });
    }
    next();
  });

  schema.methods.decryptFields = function() {
    // Récupérer la clé à chaque appel pour s'assurer qu'elle est à jour
    const currentEncryptionKey = process.env.ENCRYPTION_KEY || config.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    const decrypted = this.toObject();
    fields.forEach(field => {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          // Vérifier si c'est chiffré (contient ':')
          if (decrypted[field].includes(':')) {
            const parts = decrypted[field].split(':');
            // Vérifier que le format est correct (au moins 2 parties: IV et données chiffrées)
            if (parts.length >= 2) {
              decrypted[field] = decrypt(decrypted[field], currentEncryptionKey);
            } else {
              console.warn(`Format de chiffrement invalide pour ${field}, valeur conservée telle quelle`);
            }
          }
        } catch (e) {
          console.error(`Erreur déchiffrement ${field}:`, e.message);
          // En cas d'erreur, conserver la valeur chiffrée plutôt que de la perdre
          // L'utilisateur verra la valeur chiffrée, ce qui indique un problème
        }
      }
    });
    return decrypted;
  };
}

module.exports = { encrypt, decrypt, setupEncryption };

