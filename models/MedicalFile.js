const mongoose = require('mongoose');
const { setupEncryption } = require('../config/database');

const medicalFileSchema = new mongoose.Schema({
  // Patient propriétaire
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  
  // Médecin qui a créé le fichier
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Informations du fichier
  title: {
    type: String,
    required: true
  },
  
  description: String,
  
  // Chemin du fichier CHIFFRÉ sur le serveur
  fileUrl: {
    type: String,
    required: true
  },
  
  // Nom original du fichier
  originalFileName: String,
  
  // Type de fichier
  fileType: {
    type: String,
    enum: ['prescription', 'report', 'scanner', 'radiography', 'analysis', 'other'],
    required: true
  },
  
  // Métadonnées de chiffrement
  encryption: {
    iv: {
      type: String,
      required: true
    },
    authTag: {
      type: String,
      required: true
    },
    algorithm: {
      type: String,
      default: 'aes-256-gcm'
    }
  },
  
  // Liste de contrôle d'accès (ACL)
  accessList: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'doctor', 'viewer']
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Logs d'accès
  accessLogs: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['view', 'download']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String
  }],
  
  // Métadonnées supplémentaires
  metadata: {
    dateExamen: Date,
    lieu: String,
    médecin: String,
    numDossier: String
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Méthode pour vérifier si un utilisateur a accès
medicalFileSchema.methods.hasAccess = function(userId) {
  // Le patient propriétaire a toujours accès
  if (this.patient.toString() === userId.toString()) {
    return true;
  }
  
  // Vérifier l'ACL
  return this.accessList.some(entry => 
    entry.userId.toString() === userId.toString()
  );
};

// Méthode pour ajouter un log d'accès
medicalFileSchema.methods.logAccess = function(userId, action, ipAddress) {
  this.accessLogs.push({
    userId,
    action,
    timestamp: new Date(),
    ipAddress
  });
  return this.save();
};

// Chiffrement des données sensibles (description uniquement, pas le fichier)
setupEncryption(medicalFileSchema, ['description']);

// Index pour recherche rapide
medicalFileSchema.index({ patient: 1, createdAt: -1 });
medicalFileSchema.index({ doctor: 1, createdAt: -1 });
medicalFileSchema.index({ 'accessList.userId': 1 });

module.exports = mongoose.model('MedicalFile', medicalFileSchema);