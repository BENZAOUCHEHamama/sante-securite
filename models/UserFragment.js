const mongoose = require('mongoose');

/**
 * Modèle UserFragment - Stockage fragmenté de toutes les informations utilisateur
 * Ce modèle est complètement indépendant et n'a aucune relation avec les autres modèles du projet
 */
const userFragmentSchema = new mongoose.Schema({
  // Identifiants uniques
  username: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true
  },
  
  // Authentification
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['patient', 'medecin', 'admin'],
    required: true,
    index: true
  },
  
  // Authentification à deux facteurs (MFA)
  mfaEnabled: { 
    type: Boolean, 
    default: false 
  },
  mfaSecret: { 
    type: String 
  },
  
  // Informations spécifiques aux médecins
  specialite: { 
    type: String 
  },
  isChef: { 
    type: Boolean, 
    default: false 
  },
  service: { 
    type: String 
  },
  
  // Statut de vérification du compte
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  
  // Données personnelles
  firstName: { 
    type: String 
  },
  lastName: { 
    type: String 
  },
  dateOfBirth: { 
    type: Date 
  },
  photo: { 
    type: String 
  },
  
  // Informations médicales (si patient)
  medicalHistory: { 
    type: String 
  },
  allergies: { 
    type: String 
  },
  currentMedications: { 
    type: String 
  },
  bloodType: { 
    type: String 
  },
  assignedService: { 
    type: String 
  },
  assignedDoctorId: { 
    type: String  // Stocké comme String, pas de référence
  },
  
  // Métadonnées et timestamps
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: { 
    type: Date 
  },
  
  // Informations supplémentaires pour fragmentation
  fragmentVersion: {
    type: Number,
    default: 1
  },
  originalUserId: {
    type: String,  // ID original du User (stocké comme String, pas de référence)
    index: true
  },
  
  // Données supplémentaires (pour extensibilité)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,  // Ajoute automatiquement createdAt et updatedAt
  collection: 'userfragments'  // Nom de la collection MongoDB
});

// Index composés pour améliorer les performances de recherche
userFragmentSchema.index({ role: 1, status: 1 });
userFragmentSchema.index({ email: 1, role: 1 });
userFragmentSchema.index({ createdAt: -1 });

// Méthode pour obtenir le nom complet
userFragmentSchema.methods.getFullName = function() {
  if (this.firstName && this.lastName) {
    return `${this.firstName} ${this.lastName}`;
  }
  return this.username;
};

// Méthode pour vérifier si l'utilisateur est actif
userFragmentSchema.methods.isActive = function() {
  return this.status === 'approved';
};

// Méthode pour obtenir toutes les informations sous forme d'objet
userFragmentSchema.methods.getAllData = function() {
  return {
    username: this.username,
    email: this.email,
    role: this.role,
    mfaEnabled: this.mfaEnabled,
    specialite: this.specialite,
    isChef: this.isChef,
    service: this.service,
    status: this.status,
    firstName: this.firstName,
    lastName: this.lastName,
    dateOfBirth: this.dateOfBirth,
    photo: this.photo,
    medicalHistory: this.medicalHistory,
    allergies: this.allergies,
    currentMedications: this.currentMedications,
    bloodType: this.bloodType,
    assignedService: this.assignedService,
    assignedDoctorId: this.assignedDoctorId,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLogin: this.lastLogin,
    fragmentVersion: this.fragmentVersion,
    originalUserId: this.originalUserId,
    metadata: this.metadata
  };
};

// Middleware pre-save pour mettre à jour updatedAt
userFragmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('UserFragment', userFragmentSchema);

