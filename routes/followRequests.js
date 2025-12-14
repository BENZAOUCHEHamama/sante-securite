const express = require('express');
const FollowRequest = require('../models/FollowRequest');
const Patient = require('../models/Patient');
const User = require('../models/User');
const { authenticate, checkPermission } = require('../middleware/auth');
const router = express.Router();

// ========================================
// ROUTES PATIENT
// ========================================

// Liste des médecins disponibles pour demande de suivi
router.get('/doctors/available', authenticate, checkPermission('patient'), async (req, res) => {
  try {
    const doctors = await User.find({ 
      role: 'medecin',
      status: 'approved'
    }).select('username email firstName lastName specialite service');
    
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Patient envoie une demande de suivi
router.post('/request', authenticate, checkPermission('patient'), async (req, res) => {
  try {
    const { doctorId, reason } = req.body;
    
    if (!doctorId || !reason) {
      return res.status(400).json({ message: 'Médecin et motif requis' });
    }
    
    // Vérifier que le médecin existe
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'medecin') {
      return res.status(404).json({ message: 'Médecin non trouvé' });
    }
    
    // Vérifier qu'il n'y a pas déjà une demande en attente
    const existingRequest = await FollowRequest.findOne({
      patientId: req.user._id,
      doctorId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({ message: 'Vous avez déjà une demande en attente avec ce médecin' });
    }
    
    // Créer la demande
    const followRequest = new FollowRequest({
      patientId: req.user._id,
      doctorId,
      reason
    });
    
    await followRequest.save();
    
    res.status(201).json({ 
      message: 'Demande de suivi envoyée avec succès',
      request: followRequest
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Patient voit ses demandes
router.get('/my-requests', authenticate, checkPermission('patient'), async (req, res) => {
  try {
    const requests = await FollowRequest.find({ patientId: req.user._id })
      .populate('doctorId', 'username email firstName lastName specialite')
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// ========================================
// ROUTES MÉDECIN
// ========================================

// Médecin voit ses demandes en attente
router.get('/pending', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    const requests = await FollowRequest.find({ 
      doctorId: req.user._id,
      status: 'pending'
    })
      .populate('patientId', 'username email firstName lastName')
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Médecin accepte une demande
router.post('/:requestId/accept', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message } = req.body;
    
    const followRequest = await FollowRequest.findById(requestId);
    
    if (!followRequest) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    
    // Vérifier que c'est bien le médecin concerné
    if (followRequest.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    
    if (followRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Demande déjà traitée' });
    }
    
    // Mettre à jour la demande
    followRequest.status = 'accepted';
    followRequest.processedAt = new Date();
    followRequest.doctorMessage = message || 'Demande acceptée';
    await followRequest.save();
    
    // Créer ou mettre à jour le dossier patient
    let patient = await Patient.findOne({ userId: followRequest.patientId });
    
    if (!patient) {
      // Créer un nouveau dossier patient
      patient = new Patient({
        userId: followRequest.patientId,
        assignedDoctor: req.user._id,
        assignedService: req.user.service || 'Général'
      });
    } else {
      // Mettre à jour le médecin traitant
      patient.assignedDoctor = req.user._id;
      patient.assignedService = req.user.service || 'Général';
    }
    
    await patient.save();
    
    res.json({ 
      message: 'Demande acceptée. Le patient a été ajouté à votre liste.',
      request: followRequest
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Médecin rejette une demande
router.post('/:requestId/reject', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { message } = req.body;
    
    const followRequest = await FollowRequest.findById(requestId);
    
    if (!followRequest) {
      return res.status(404).json({ message: 'Demande non trouvée' });
    }
    
    if (followRequest.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    
    if (followRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Demande déjà traitée' });
    }
    
    followRequest.status = 'rejected';
    followRequest.processedAt = new Date();
    followRequest.doctorMessage = message || 'Demande rejetée';
    await followRequest.save();
    
    res.json({ 
      message: 'Demande rejetée',
      request: followRequest
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

module.exports = router;