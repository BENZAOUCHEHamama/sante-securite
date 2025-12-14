const mongoose = require('mongoose');
const { setupEncryption } = require('../config/database');

const analysisSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  laboratoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  // Résultats d'analyse (chiffrés)
  analysisType: String,
  results: String,
  notes: String,
  filePath: String,
  // Date
  analysisDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'reviewed'],
    default: 'pending'
  }
});

// Chiffrement des résultats
setupEncryption(analysisSchema, ['results', 'notes']);

module.exports = mongoose.model('Analysis', analysisSchema);


