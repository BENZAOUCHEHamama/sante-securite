const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate, checkPermission } = require('../middleware/auth');
const MedicalFile = require('../models/MedicalFile');
const Patient = require('../models/Patient');
const config = require('../config/config');
const { 
  generatePatientKey, 
  encryptFile, 
  decryptFile, 
  generateSecureFilename 
} = require('../utils/fileEncryption');

const router = express.Router();

// Créer les dossiers nécessaires
const UPLOAD_DIR = 'uploads/temp';
const ENCRYPTED_DIR = 'uploads/encrypted';

[UPLOAD_DIR, ENCRYPTED_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configuration multer pour upload temporaire
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Autoriser seulement certains types de fichiers
    const allowedTypes = /pdf|jpg|jpeg|png|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Type de fichier non autorisé'));
  }
});

// ========================================
// UPLOAD DE FICHIER CHIFFRÉ (Médecin)
// ========================================
router.post('/upload', 
  authenticate, 
  checkPermission(['medecin', 'chef_service']), 
  upload.single('file'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'Aucun fichier uploadé' });
      }
      
      const { patientId, title, description, fileType } = req.body;
      
      if (!patientId || !title || !fileType) {
        // Supprimer le fichier temporaire
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: 'Données manquantes' });
      }
      
      // Vérifier que le patient existe et est assigné au médecin
      const patient = await Patient.findOne({ 
        _id: patientId,
        assignedDoctor: req.user._id
      });
      
      if (!patient) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({ message: 'Patient non trouvé ou non autorisé' });
      }
      
      // Générer la clé de chiffrement pour ce patient
      const encryptionKey = generatePatientKey(patient.userId.toString(), config.ENCRYPTION_KEY);
      
      // Générer un nom de fichier sécurisé
      const secureFilename = generateSecureFilename(req.file.originalname);
      const encryptedPath = path.join(ENCRYPTED_DIR, secureFilename);
      
      // Chiffrer le fichier
      const encryptionMetadata = await encryptFile(
        req.file.path, 
        encryptedPath, 
        encryptionKey
      );
      
      // Créer l'entrée en base de données
      const medicalFile = new MedicalFile({
        patient: patientId,
        doctor: req.user._id,
        title,
        description,
        fileUrl: `/encrypted/${secureFilename}`,
        originalFileName: req.file.originalname,
        fileType,
        encryption: {
          iv: encryptionMetadata.iv,
          authTag: encryptionMetadata.authTag,
          algorithm: encryptionMetadata.algorithm
        },
        accessList: [
          {
            userId: req.user._id,
            role: 'doctor'
          }
        ]
      });
      
      await medicalFile.save();
      
      res.status(201).json({
        message: 'Fichier chiffré et uploadé avec succès',
        file: {
          id: medicalFile._id,
          title: medicalFile.title,
          fileType: medicalFile.fileType,
          encrypted: true,
          createdAt: medicalFile.createdAt
        }
      });
    } catch (error) {
      console.error('Erreur upload:', error);
      
      // Nettoyer en cas d'erreur
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({ 
        message: 'Erreur lors de l\'upload', 
        error: error.message 
      });
    }
  }
);

// ========================================
// TÉLÉCHARGEMENT DÉCHIFFRÉ (Patient + Médecin)
// ========================================
router.get('/download/:fileId', authenticate, async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Récupérer le fichier
    const medicalFile = await MedicalFile.findById(fileId)
      .populate('patient')
      .populate('doctor');
    
    if (!medicalFile) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }
    
    // Vérifier les droits d'accès
    const hasAccess = medicalFile.hasAccess(req.user._id) || 
                      (medicalFile.patient && medicalFile.patient.userId.toString() === req.user._id.toString()) ||
                      (medicalFile.doctor && medicalFile.doctor._id.toString() === req.user._id.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Accès refusé' });
    }
    
    // Récupérer la clé de chiffrement
    const patientUserId = medicalFile.patient.userId || medicalFile.patient;
    const encryptionKey = generatePatientKey(patientUserId.toString(), config.ENCRYPTION_KEY);
    
    // Chemin du fichier chiffré
// ✅ APRÈS (pointe vers le bon dossier)
const filename = path.basename(medicalFile.fileUrl);
const encryptedPath = path.join(__dirname, '..', 'uploads', 'encrypted', filename);
// Résultat: C:\Users\hp\Music\SSAD\uploads\encrypted\fichier.pdf (CORRECT)    
    if (!fs.existsSync(encryptedPath)) {
      return res.status(404).json({ message: 'Fichier physique non trouvé' });
    }
    
    // Déchiffrer le fichier
    const decryptedBuffer = await decryptFile(
      encryptedPath,
      encryptionKey,
      medicalFile.encryption.iv,
      medicalFile.encryption.authTag
    );
    
    // Logger l'accès
    await medicalFile.logAccess(req.user._id, 'download', req.ip);
    
    // Envoyer le fichier déchiffré
    const ext = path.extname(medicalFile.originalFileName);
    const contentType = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }[ext] || 'application/octet-stream';
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${medicalFile.originalFileName}"`);
    res.send(decryptedBuffer);
  } catch (error) {
    console.error('Erreur téléchargement:', error);
    res.status(500).json({ 
      message: 'Erreur lors du téléchargement', 
      error: error.message 
    });
  }
});

// ========================================
// LISTE DES FICHIERS (avec filtres)
// ========================================
router.get('/list', authenticate, async (req, res) => {
  try {
    const { patientId } = req.query;
    
    let query = {};
    
    // Si médecin, voir tous les fichiers de ses patients
    if (req.user.role === 'medecin' || req.user.role === 'chef_service') {
      if (patientId) {
        // Vérifier que le patient est assigné au médecin
        const patient = await Patient.findOne({
          _id: patientId,
          assignedDoctor: req.user._id
        });
        
        if (!patient) {
          return res.status(403).json({ message: 'Accès refusé à ce patient' });
        }
        
        query.patient = patientId;
      } else {
        query.doctor = req.user._id;
      }
    }
    
    // Si patient, voir seulement ses fichiers
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return res.json([]);
      }
      query.patient = patient._id;
    }
    
    const files = await MedicalFile.find(query)
      .populate('doctor', 'username email firstName lastName')
      .sort({ createdAt: -1 })
      .select('-encryption -accessLogs'); // Ne pas exposer les métadonnées de chiffrement
    
    res.json(files);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

module.exports = router;