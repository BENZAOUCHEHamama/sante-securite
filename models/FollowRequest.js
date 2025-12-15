const mongoose = require('mongoose');

const followRequestSchema = new mongoose.Schema({
  // Patient qui demande le suivi
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Médecin demandé
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Motif de la demande
  reason: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Statut de la demande
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  
  // Date de traitement
  processedAt: Date,
  
  // Message du médecin (optionnel)
  doctorMessage: String,
  
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour recherche rapide
followRequestSchema.index({ doctorId: 1, status: 1 });
followRequestSchema.index({ patientId: 1, status: 1 });

module.exports = mongoose.model('FollowRequest', followRequestSchema);