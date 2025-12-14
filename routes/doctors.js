const express = require('express');
const Patient = require('../models/Patient');
const Analysis = require('../models/Analysis');
const MedicalFile = require('../models/MedicalFile');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { authenticate, checkPermission } = require('../middleware/auth');
const router = express.Router();

// Liste des patients du médecin - CORRIGÉ AVEC LOGS
router.get('/patients', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    console.log('🔥 Récupération des patients pour le médecin:', req.user._id);
    
    const patients = await Patient.find({ 
      assignedDoctor: req.user._id 
    }).populate('userId');

    console.log(`✅ Trouvé ${patients.length} patient(s)`);

    if (patients.length === 0) {
      console.log('⚠️ Aucun patient trouvé pour ce médecin');
      return res.json([]);
    }

    const decryptedPatients = patients.map(patient => {
      try {
        // Vérifier si userId existe
        if (!patient.userId) {
          console.error('❌ Patient sans userId:', patient._id);
          return null;
        }

        const userData = patient.userId.decryptFields ? patient.userId.decryptFields() : patient.userId;
        const patientData = patient.decryptFields ? patient.decryptFields() : patient;
        
        return {
          _id: patient._id,
          userId: patient.userId._id,
          username: userData.username || patient.userId.username,
          email: userData.email || patient.userId.email,
          firstName: userData.firstName || patient.userId.firstName,
          lastName: userData.lastName || patient.userId.lastName,
          photo: patient.userId.photo,
          assignedService: patient.assignedService,
          assignedDoctor: patient.assignedDoctor,
          medicalHistory: patientData.medicalHistory,
          allergies: patientData.allergies,
          currentMedications: patientData.currentMedications,
          bloodType: patientData.bloodType,
          dateOfBirth: patientData.dateOfBirth
        };
      } catch (err) {
        console.error('❌ Erreur lors du déchiffrement du patient:', patient._id, err);
        return null;
      }
    }).filter(p => p !== null); // Filtrer les patients invalides

    console.log('📤 Envoi de', decryptedPatients.length, 'patient(s) déchiffré(s)');

    res.json(decryptedPatients);
  } catch (error) {
    console.error('❌ Erreur récupération patients:', error);
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Profil d'un patient spécifique
router.get('/patients/:patientId', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    console.log('🔥 Récupération profil patient:', req.params.patientId);
    
    const patient = await Patient.findById(req.params.patientId)
      .populate('userId')
      .populate('assignedDoctor');

    if (!patient) {
      console.log('❌ Patient non trouvé');
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    // Vérifier que le patient est bien assigné à ce médecin
    if (patient.assignedDoctor._id.toString() !== req.user._id.toString()) {
      console.log('❌ Patient non assigné à ce médecin');
      return res.status(403).json({ message: 'Accès refusé' });
    }

    const userData = patient.userId.decryptFields ? patient.userId.decryptFields() : patient.userId;
    const patientData = patient.decryptFields ? patient.decryptFields() : patient;

    const result = {
      ...patient.toObject(),
      username: userData.username || patient.userId.username,
      email: userData.email || patient.userId.email,
      firstName: userData.firstName || patient.userId.firstName,
      lastName: userData.lastName || patient.userId.lastName,
      dateOfBirth: patientData.dateOfBirth,
      medicalHistory: patientData.medicalHistory,
      allergies: patientData.allergies,
      currentMedications: patientData.currentMedications,
      bloodType: patientData.bloodType
    };

    console.log('✅ Profil patient récupéré');
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur profil patient:', error);
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Analyses d'un patient
router.get('/patients/:patientId/analyses', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    const analyses = await Analysis.find({ patientId: req.params.patientId })
      .sort({ analysisDate: -1 })
      .populate('laboratoryId', 'email');

    const decryptedAnalyses = analyses.map(analysis => {
      return analysis.decryptFields ? analysis.decryptFields() : analysis;
    });

    res.json(decryptedAnalyses);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// ========================================
// 🔥 NOUVELLE ROUTE : Fichiers médicaux d'un patient
// ========================================
router.get('/patients/:patientId/files', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    console.log('🔥 Récupération des fichiers pour le patient:', req.params.patientId);
    
    // Vérifier que le patient est bien assigné au médecin
    const patient = await Patient.findOne({
      _id: req.params.patientId,
      assignedDoctor: req.user._id
    });
    
    if (!patient) {
      console.log('❌ Patient non trouvé ou non autorisé');
      return res.status(403).json({ message: 'Accès refusé à ce patient' });
    }
    
    // Récupérer les fichiers médicaux
    const files = await MedicalFile.find({ patient: req.params.patientId })
      .populate('doctor', 'username email firstName lastName')
      .sort({ createdAt: -1 })
      .select('-encryption -accessLogs');
    
    console.log(`✅ Trouvé ${files.length} fichier(s) pour ce patient`);
    
    // Déchiffrer les fichiers
    const decryptedFiles = files.map(file => {
      try {
        if (file.decryptFields && typeof file.decryptFields === 'function') {
          return file.decryptFields();
        } else {
          return file.toObject();
        }
      } catch (error) {
        console.error(`❌ Erreur déchiffrement fichier ${file._id}:`, error.message);
        return file.toObject();
      }
    });
    
    res.json(decryptedFiles);
  } catch (error) {
    console.error('❌ Erreur récupération fichiers:', error);
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Envoyer un fichier/ordonnance au patient
router.post('/patients/:patientId/files', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    const { fileName, fileType, filePath, description, prescription } = req.body;

    const medicalFile = new MedicalFile({
      patientId: req.params.patientId,
      doctorId: req.user._id,
      fileName,
      fileType,
      filePath,
      description,
      prescription
    });

    await medicalFile.save();
    res.status(201).json({ message: 'Fichier envoyé avec succès', file: medicalFile });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Obtenir ou créer un chat avec un patient
router.get('/patients/:patientId/chat', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    let chat = await Chat.findOne({
      patientId: req.params.patientId,
      doctorId: req.user._id
    });

    if (!chat) {
      chat = new Chat({
        patientId: req.params.patientId,
        doctorId: req.user._id,
        messages: []
      });
      await chat.save();
    }

    const decryptedChat = chat.decryptFields ? chat.decryptFields() : chat;
    res.json(decryptedChat);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Envoyer un message dans le chat
router.post('/patients/:patientId/chat/messages', authenticate, checkPermission(['medecin', 'chef_service']), async (req, res) => {
  try {
    const { message } = req.body;

    let chat = await Chat.findOne({
      patientId: req.params.patientId,
      doctorId: req.user._id
    });

    if (!chat) {
      chat = new Chat({
        patientId: req.params.patientId,
        doctorId: req.user._id,
        messages: []
      });
    }

    chat.messages.push({
      senderId: req.user._id,
      message
    });

    await chat.save();
    const decryptedChat = chat.decryptFields ? chat.decryptFields() : chat;
    res.json({ message: 'Message envoyé', chat: decryptedChat });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

module.exports = router;