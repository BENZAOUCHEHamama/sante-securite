const mongoose = require('mongoose');
const crypto = require('crypto');

// Fonctions de chiffrement pour les messages
function encryptMessage(text, key) {
  if (!text) return text;
  const algorithm = 'aes-256-cbc';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptMessage(encryptedText, key) {
  if (!encryptedText) return encryptedText;
  try {
    const algorithm = 'aes-256-cbc';
    const parts = encryptedText.split(':');
    if (parts.length !== 2) return encryptedText; // Pas chiffré
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encryptedText; // Retourner tel quel si erreur
  }
}

const chatSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  messages: [{
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Chiffrement des messages avant sauvegarde
chatSchema.pre('save', function(next) {
  const encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  if (this.isModified('messages')) {
    this.messages.forEach(msg => {
      if (msg.message && typeof msg.message === 'string' && !msg.message.includes(':')) {
        // Chiffrer seulement si pas déjà chiffré
        msg.message = encryptMessage(msg.message, encryptionKey);
      }
    });
  }
  next();
});

// Méthode pour déchiffrer les messages
chatSchema.methods.decryptFields = function() {
  const encryptionKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
  const decrypted = this.toObject();
  if (decrypted.messages) {
    decrypted.messages = decrypted.messages.map(msg => ({
      ...msg,
      message: decryptMessage(msg.message, encryptionKey)
    }));
  }
  return decrypted;
};

module.exports = mongoose.model('Chat', chatSchema);

