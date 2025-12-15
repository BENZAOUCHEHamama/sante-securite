const express = require('express');
const User = require('../models/User');
const { authenticate, checkPermission } = require('../middleware/auth');
const { encrypt } = require('../utils/cryptSecret');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const router = express.Router();

// Liste de tous les utilisateurs inscrits
router.get('/users', authenticate, checkPermission('admin'), async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -mfaSecret')
      .sort({ createdAt: -1 });

    const formattedUsers = users.map(user => {
      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        specialite: user.specialite || '',
        service: user.service || '',
        isChef: user.isChef || false,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Liste d'attente des nouveaux utilisateurs
router.get('/pending-users', authenticate, checkPermission('admin'), async (req, res) => {
  try {
    const pendingUsers = await User.find({ status: 'pending' })
      .select('-password -mfaSecret')
      .sort({ createdAt: -1 });

    const formattedUsers = pendingUsers.map(user => {
      return {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        specialite: user.specialite || '',
        service: user.service || '',
        isChef: user.isChef || false,
        createdAt: user.createdAt
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Valider ou rejeter un utilisateur
router.put('/users/:userId/status', authenticate, checkPermission('admin'), async (req, res) => {
  try {
    const { status } = req.body; // 'approved' ou 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Statut invalide' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status },
      { new: true }
    ).select('-password -mfaSecret');

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    res.json({ message: `Utilisateur ${status === 'approved' ? 'approuvé' : 'rejeté'}`, user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Gérer les droits d'accès (système personnalisé sans RBAC)
router.put('/users/:userId/access', authenticate, checkPermission('admin'), async (req, res) => {
  try {
    const { permissions } = req.body; // Objet avec les permissions personnalisées

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Stocker les permissions dans un champ personnalisé
    user.customPermissions = permissions;
    await user.save();

    res.json({ message: 'Droits d\'accès mis à jour', user });
  } catch (error) {
    res.status(500).json({ message: 'Erreur', error: error.message });
  }
});

// Réinitialiser le MFA d'un utilisateur (générer un nouveau secret)
router.post('/users/:userId/reset-mfa', authenticate, checkPermission('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    // Générer un nouveau secret MFA
    const secret = speakeasy.generateSecret({
      name: `TPConfidentialite (${user.username})`,
      issuer: 'Hôpital Central'
    });

    // Chiffrer et stocker le nouveau secret
    user.mfaSecret = encrypt(secret.base32);
    user.mfaEnabled = true;
    await user.save();

    // Générer le QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      message: 'Secret MFA régénéré avec succès',
      qrCode: qrCodeUrl,
      secret: secret.base32, // Pour affichage direct si nécessaire
      username: user.username,
      email: user.email
    });
  } catch (error) {
    console.error('Erreur réinitialisation MFA:', error);
    res.status(500).json({ message: 'Erreur lors de la réinitialisation MFA', error: error.message });
  }
});

// Désactiver le MFA d'un utilisateur
router.post('/users/:userId/disable-mfa', authenticate, checkPermission('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    user.mfaEnabled = false;
    user.mfaSecret = null;
    await user.save();

    res.json({
      message: 'MFA désactivé avec succès',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        mfaEnabled: user.mfaEnabled
      }
    });
  } catch (error) {
    console.error('Erreur désactivation MFA:', error);
    res.status(500).json({ message: 'Erreur lors de la désactivation MFA', error: error.message });
  }
});

module.exports = router;


