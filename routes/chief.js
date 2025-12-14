const express = require('express');
const User = require('../models/User');
const Patient = require('../models/Patient');
const { authenticate, checkPermission } = require('../middleware/auth');
const router = express.Router();

// Utiliser les routes du médecin
router.use(require('./doctors'));

// Liste des médecins du service
router.get('/doctors', authenticate, checkPermission('chef_service'), async (req, res) => {
  try {
    const doctors = await User.find({
      role: 'medecin',
      service: req.user.service,
      status: 'approved'
    }).select('-password -verificationCode');

    const decryptedDoctors = doctors.map(doctor => {
      const userData = doctor.decryptFields();
      return {
        _id: doctor._id,
        email: doctor.email,
        service: doctor.service,
        createdAt: doctor.createdAt,
        ...userData
      };
    });

    res.json(decryptedDoctors);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Liste des patients du service
router.get('/service/patients', authenticate, checkPermission('chef_service'), async (req, res) => {
  try {
    const patients = await Patient.find({
      assignedService: req.user.service
    }).populate('userId').populate('assignedDoctor');

    const decryptedPatients = patients.map(patient => {
      const userData = patient.userId.decryptFields();
      const patientData = patient.decryptFields();
      return {
        _id: patient._id,
        userId: patient.userId._id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        photo: patient.userId.photo,
        assignedService: patient.assignedService,
        assignedDoctor: patient.assignedDoctor,
        ...patientData
      };
    });

    res.json(decryptedPatients);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Assigner un médecin à un patient
router.put('/patients/:patientId/assign-doctor', authenticate, checkPermission('chef_service'), async (req, res) => {
  try {
    const { doctorId } = req.body;

    const patient = await Patient.findById(req.params.patientId);
    if (!patient) {
      return res.status(404).json({ message: 'Patient non trouvé' });
    }

    // Vérifier que le médecin appartient au même service
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.service !== req.user.service) {
      return res.status(400).json({ message: 'Médecin invalide ou ne fait pas partie du service' });
    }

    patient.assignedDoctor = doctorId;
    await patient.save();

    res.json({ message: 'Médecin assigné avec succès', patient });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

module.exports = router;


