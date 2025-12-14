const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Patient = require('../models/Patient');
const Analysis = require('../models/Analysis');
const MedicalFile = require('../models/MedicalFile');
const User = require('../models/User');
const { authenticate, checkPermission } = require('../middleware/auth');
const { syncUserToFragment } = require('../utils/userFragmentSync');
const router = express.Router();

// Configuration multer pour les photos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'public/uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + req.user._id + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Seules les images (jpeg, jpg, png, gif) sont autorisées'));
  }
});

// Obtenir le profil du patient
router.get('/profile', authenticate, checkPermission('patient'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Profil patient non trouvé' });
    }
    
    res.json({
      patient: {
        ...patient.toObject(),
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        photo: req.user.photo
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Mettre à jour la photo de profil
router.put('/profile/photo', authenticate, checkPermission('patient'), upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Aucune photo uploadée' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Supprimer l'ancienne photo
    if (user.photo) {
      const oldPhotoPath = path.join('public', user.photo);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }

    // Mettre à jour la photo
    user.photo = `/uploads/profiles/${req.file.filename}`;
    await user.save();

    // Synchroniser vers UserFragment
    try {
      await syncUserToFragment(user);
    } catch (fragmentError) {
      console.error('Erreur lors de la synchronisation UserFragment:', fragmentError);
    }

    res.json({ 
      message: 'Photo de profil mise à jour avec succès',
      photo: user.photo
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Changer le mot de passe
router.put('/profile/password', authenticate, checkPermission('patient'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Le mot de passe actuel et le nouveau mot de passe sont requis' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Le nouveau mot de passe doit contenir au moins 6 caractères' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Vérifier le mot de passe actuel
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    }

    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();

    // Synchroniser vers UserFragment
    try {
      await syncUserToFragment(user);
    } catch (fragmentError) {
      console.error('Erreur lors de la synchronisation UserFragment:', fragmentError);
    }

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Liste des analyses du patient
router.get('/analyses', authenticate, checkPermission('patient'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    const analyses = await Analysis.find({ patientId: patient._id })
      .sort({ analysisDate: -1 })
      .populate('laboratoryId', 'email');

    // Déchiffrer les résultats
    const decryptedAnalyses = analyses.map(analysis => {
      const decrypted = analysis.decryptFields();
      return decrypted;
    });

    res.json(decryptedAnalyses);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Liste des fichiers médicaux du patient
router.get('/files', authenticate, checkPermission('patient'), async (req, res) => {
  try {
    const patient = await Patient.findOne({ userId: req.user._id });
    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    const files = await MedicalFile.find({ patientId: patient._id })
      .sort({ createdAt: -1 })
      .populate('doctorId', 'email');

    // Déchiffrer les données
    const decryptedFiles = files.map(file => {
      const decrypted = file.decryptFields();
      return decrypted;
    });

    res.json(decryptedFiles);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

module.exports = router;