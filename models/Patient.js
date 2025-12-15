const mongoose = require('mongoose');
const { setupEncryption } = require('../config/database');

const patientSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Informations médicales (chiffrées)
  medicalHistory: String,
  allergies: String,
  currentMedications: String,
  bloodType: String,
  // Service assigné
  assignedService: String,
  assignedDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Chiffrement des données médicales
setupEncryption(patientSchema, ['medicalHistory', 'allergies', 'currentMedications', 'bloodType']);

module.exports = mongoose.model('Patient', patientSchema);


