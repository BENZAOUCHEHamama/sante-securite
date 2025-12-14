const mongoose = require('mongoose');
const crypto = require('crypto');

// Fonction pour chiffrer les données sensibles
function encrypt(text, key) {
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Fonction pour déchiffrer les données sensibles
function decrypt(encryptedText, key) {
  const algorithm = 'aes-256-cbc';
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Middleware pour chiffrer/déchiffrer automatiquement
function setupEncryption(schema, fields) {
  const encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  
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
    const decrypted = this.toObject();
    fields.forEach(field => {
      if (decrypted[field] && typeof decrypted[field] === 'string') {
        try {
          // Vérifier si c'est chiffré (contient ':')
          if (decrypted[field].includes(':')) {
            decrypted[field] = decrypt(decrypted[field], encryptionKey);
          }
        } catch (e) {
          console.error(`Erreur déchiffrement ${field}:`, e);
        }
      }
    });
    return decrypted;
  };
}

module.exports = { encrypt, decrypt, setupEncryption };

