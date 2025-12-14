const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { setupEncryption } = require('../config/database');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['patient', 'medecin', 'admin'],
    required: true
  },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String },
  
  // Médecin uniquement (validation dans pre-save)
  specialite: { type: String },
  isChef: { type: Boolean, default: false },
  service: { type: String },

  // Statut de vérification du compte
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // Données personnelles (chiffrées)
  firstName: String,
  lastName: String,
  dateOfBirth: Date,
  photo: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: Date
});

// Hash password et validations avant sauvegarde
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  // Validation pour medecin uniquement
  if (this.role === "medecin") {
    if (!this.specialite) {
      throw new Error("Un médecin doit avoir une spécialité.");
    }
    if (this.isChef && !this.service) {
      throw new Error("Un chef de service doit avoir un service attribué.");
    }
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Méthode pour comparer mot de passe
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model("User", userSchema);
