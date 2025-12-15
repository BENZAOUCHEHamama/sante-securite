const express = require('express');
const Analysis = require('../models/Analysis');
const Patient = require('../models/Patient');
const { authenticate, checkPermission } = require('../middleware/auth');
const router = express.Router();

// Créer une analyse (laboratoire)
router.post('/', authenticate, async (req, res) => {
  try {
    const { patientId, analysisType, results, notes, filePath } = req.body;

    const analysis = new Analysis({
      patientId,
      laboratoryId: req.user._id,
      analysisType,
      results,
      notes,
      filePath
    });

    await analysis.save();
    res.status(201).json({ message: 'Analyse créée', analysis });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

module.exports = router;


