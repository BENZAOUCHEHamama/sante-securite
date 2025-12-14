const UserFragment = require('../models/UserFragment');
const Patient = require('../models/Patient');

/**
 * Synchronise les données d'un User vers UserFragment
 * Récupère aussi les données du Patient associé si le role est 'patient'
 * @param {Object} user - Instance du modèle User
 * @returns {Promise<Object>} - Instance UserFragment créée ou mise à jour
 */
async function syncUserToFragment(user) {
  try {
    // Récupérer les données du Patient si le user est un patient
    let patientData = {};
    if (user.role === 'patient') {
      const patient = await Patient.findOne({ userId: user._id });
      if (patient) {
        patientData = {
          medicalHistory: patient.medicalHistory || '',
          allergies: patient.allergies || '',
          currentMedications: patient.currentMedications || '',
          bloodType: patient.bloodType || '',
          assignedService: patient.assignedService || '',
          assignedDoctorId: patient.assignedDoctor ? patient.assignedDoctor.toString() : null
        };
      }
    }

    // Préparer les données pour UserFragment
    const fragmentData = {
      username: user.username,
      email: user.email,
      password: user.password, // Le mot de passe est déjà hashé dans User
      role: user.role,
      mfaEnabled: user.mfaEnabled || false,
      mfaSecret: user.mfaSecret || null,
      specialite: user.specialite || null,
      isChef: user.isChef || false,
      service: user.service || null,
      status: user.status || 'pending',
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      dateOfBirth: user.dateOfBirth || null,
      photo: user.photo || null,
      createdAt: user.createdAt || new Date(),
      lastLogin: user.lastLogin || null,
      originalUserId: user._id.toString(),
      fragmentVersion: 1,
      // Données du patient si applicable
      ...patientData
    };

    // Vérifier si un fragment existe déjà pour cet utilisateur
    const existingFragment = await UserFragment.findOne({ 
      $or: [
        { email: user.email },
        { originalUserId: user._id.toString() }
      ]
    });

    if (existingFragment) {
      // Mettre à jour le fragment existant
      Object.assign(existingFragment, fragmentData);
      existingFragment.updatedAt = new Date();
      existingFragment.fragmentVersion = (existingFragment.fragmentVersion || 1) + 1;
      await existingFragment.save();
      return existingFragment;
    } else {
      // Créer un nouveau fragment
      const userFragment = new UserFragment(fragmentData);
      await userFragment.save();
      return userFragment;
    }
  } catch (error) {
    console.error('Erreur lors de la synchronisation vers UserFragment:', error);
    throw error;
  }
}

/**
 * Synchronise tous les Users existants vers UserFragment
 * Utile pour migrer les données existantes
 */
async function syncAllUsersToFragment() {
  try {
    const User = require('../models/User');
    const users = await User.find({});
    let synced = 0;
    let errors = 0;

    for (const user of users) {
      try {
        await syncUserToFragment(user);
        synced++;
        console.log(`✓ Synchronisé: ${user.email}`);
      } catch (error) {
        errors++;
        console.error(`✗ Erreur pour ${user.email}:`, error.message);
      }
    }

    console.log(`\nSynchronisation terminée: ${synced} réussis, ${errors} erreurs`);
    return { synced, errors };
  } catch (error) {
    console.error('Erreur lors de la synchronisation globale:', error);
    throw error;
  }
}

module.exports = {
  syncUserToFragment,
  syncAllUsersToFragment
};

