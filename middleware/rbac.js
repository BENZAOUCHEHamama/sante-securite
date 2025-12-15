/**
 * RBAC - Role-Based Access Control
 * Système de gestion des rôles et permissions
 */

// Définition des permissions par rôle
const ROLE_PERMISSIONS = {
  admin: [
    'manage_users',
    'approve_accounts',
    'view_all_data',
    'manage_permissions',
    'view_logs',
    'manage_system'
  ],
  
  medecin: [
    'view_assigned_patients',
    'create_medical_files',
    'upload_files',
    'view_patient_files',
    'accept_follow_requests',
    'create_analyses',
    'chat_with_patients'
  ],
  
  chef_service: [
    'view_assigned_patients',
    'create_medical_files',
    'upload_files',
    'view_patient_files',
    'accept_follow_requests',
    'create_analyses',
    'chat_with_patients',
    'view_service_patients',
    'view_service_doctors',
    'assign_doctors'
  ],
  
  patient: [
    'view_own_profile',
    'view_own_files',
    'view_own_analyses',
    'send_follow_requests',
    'chat_with_doctor',
    'download_own_files'
  ]
};

// Hiérarchie des rôles (pour héritage de permissions)
const ROLE_HIERARCHY = {
  admin: ['admin'],
  chef_service: ['chef_service', 'medecin'],
  medecin: ['medecin'],
  patient: ['patient']
};

/**
 * Vérifie si un rôle a une permission spécifique
 * @param {string} role - Rôle de l'utilisateur
 * @param {string} permission - Permission à vérifier
 * @returns {boolean}
 */
function hasPermission(role, permission) {
  // Admin a toutes les permissions
  if (role === 'admin') return true;
  
  // Récupérer les rôles hérités
  const inheritedRoles = ROLE_HIERARCHY[role] || [role];
  
  // Vérifier dans tous les rôles hérités
  for (const inheritedRole of inheritedRoles) {
    const permissions = ROLE_PERMISSIONS[inheritedRole] || [];
    if (permissions.includes(permission)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Middleware pour vérifier une permission
 * @param {string|string[]} requiredPermission - Permission(s) requise(s)
 * @returns {Function}
 */
function requirePermission(requiredPermission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    
    const permissions = Array.isArray(requiredPermission) 
      ? requiredPermission 
      : [requiredPermission];
    
    const hasAnyPermission = permissions.some(perm => 
      hasPermission(req.user.role, perm)
    );
    
    if (!hasAnyPermission) {
      return res.status(403).json({ 
        message: 'Accès refusé - Permissions insuffisantes',
        required: permissions,
        userRole: req.user.role
      });
    }
    
    next();
  };
}

/**
 * Middleware pour vérifier l'accès à un patient
 * Vérifie que le médecin/chef a le droit d'accéder aux données du patient
 */
async function checkPatientAccess(req, res, next) {
  try {
    const { patientId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    // Admin a accès à tout
    if (userRole === 'admin') {
      return next();
    }
    
    // Patient peut accéder à ses propres données
    if (userRole === 'patient') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ 
        _id: patientId,
        userId: userId
      });
      
      if (!patient) {
        return res.status(403).json({ message: 'Accès refusé à ce patient' });
      }
      
      return next();
    }
    
    // Médecin/Chef peut accéder à ses patients assignés
    if (userRole === 'medecin' || userRole === 'chef_service') {
      const Patient = require('../models/Patient');
      const patient = await Patient.findOne({ 
        _id: patientId,
        assignedDoctor: userId
      });
      
      if (!patient) {
        return res.status(403).json({ message: 'Patient non assigné à vous' });
      }
      
      return next();
    }
    
    return res.status(403).json({ message: 'Accès refusé' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur vérification accès', error: error.message });
  }
}

/**
 * Middleware pour vérifier l'accès à un fichier médical
 */
async function checkFileAccess(req, res, next) {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    
    const MedicalFile = require('../models/MedicalFile');
    const file = await MedicalFile.findById(fileId).populate('patient');
    
    if (!file) {
      return res.status(404).json({ message: 'Fichier non trouvé' });
    }
    
    // Admin a accès à tout
    if (userRole === 'admin') {
      return next();
    }
    
    // Patient propriétaire
    if (file.patient.userId.toString() === userId.toString()) {
      return next();
    }
    
    // Médecin créateur
    if (file.doctor.toString() === userId.toString()) {
      return next();
    }
    
    // Vérifier l'ACL
    if (file.hasAccess(userId)) {
      return next();
    }
    
    return res.status(403).json({ message: 'Accès refusé à ce fichier' });
  } catch (error) {
    return res.status(500).json({ message: 'Erreur vérification accès', error: error.message });
  }
}

/**
 * Obtenir toutes les permissions d'un utilisateur
 * @param {string} role - Rôle de l'utilisateur
 * @returns {string[]}
 */
function getUserPermissions(role) {
  const inheritedRoles = ROLE_HIERARCHY[role] || [role];
  const allPermissions = new Set();
  
  for (const inheritedRole of inheritedRoles) {
    const permissions = ROLE_PERMISSIONS[inheritedRole] || [];
    permissions.forEach(perm => allPermissions.add(perm));
  }
  
  return Array.from(allPermissions);
}

module.exports = {
  hasPermission,
  requirePermission,
  checkPatientAccess,
  checkFileAccess,
  getUserPermissions,
  ROLE_PERMISSIONS
};