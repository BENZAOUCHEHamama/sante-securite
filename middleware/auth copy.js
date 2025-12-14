const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware d'authentification
exports.authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token manquant' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }

    if (user.status !== 'approved') {
      return res.status(403).json({ message: 'Compte en attente de validation' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

// Vérification des rôles (sans RBAC classique, on utilise un système de permissions personnalisé)
exports.checkPermission = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    if (Array.isArray(requiredRole)) {
      if (!requiredRole.includes(req.user.role)) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
    } else {
      if (req.user.role !== requiredRole) {
        return res.status(403).json({ message: 'Accès refusé' });
      }
    }

    next();
  };
};


