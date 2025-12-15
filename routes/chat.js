const express = require('express');
const Chat = require('../models/Chat');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Obtenir les chats d'un utilisateur
router.get('/', authenticate, async (req, res) => {
  try {
    let chats;
    
    if (req.user.role === 'patient') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ userId: req.user._id });
      if (!patient) {
        return res.status(404).json({ message: 'Patient non trouvé' });
      }
      chats = await Chat.find({ patientId: patient._id })
        .populate('doctorId', 'email')
        .populate('patientId');
    } else {
      chats = await Chat.find({ doctorId: req.user._id })
        .populate('patientId')
        .populate('doctorId', 'email');
    }

    const decryptedChats = chats.map(chat => chat.decryptFields());
    res.json(decryptedChats);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

module.exports = router;


