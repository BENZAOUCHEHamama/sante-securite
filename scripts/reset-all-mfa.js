/**
 * Script de migration pour réinitialiser tous les secrets MFA
 * Ce script désactive temporairement le MFA pour tous les utilisateurs
 * afin qu'ils puissent se reconnecter, puis ils pourront réactiver le MFA
 */

const mongoose = require('mongoose');
const config = require('../config/config');
const User = require('../models/User');

async function resetAllMFA() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(config.MONGO_URI);
    console.log('✅ Connecté à MongoDB');

    // Trouver tous les utilisateurs avec MFA activé
    const users = await User.find({ mfaEnabled: true });
    console.log(`📋 Trouvé ${users.length} utilisateur(s) avec MFA activé`);

    // Désactiver le MFA pour tous
    const result = await User.updateMany(
      { mfaEnabled: true },
      { 
        $set: { 
          mfaEnabled: false,
          mfaSecret: null 
        } 
      }
    );

    console.log(`✅ MFA désactivé pour ${result.modifiedCount} utilisateur(s)`);
    console.log('\n📝 Instructions:');
    console.log('   1. Les utilisateurs peuvent maintenant se connecter sans MFA');
    console.log('   2. Ils devront réactiver le MFA depuis leur profil');
    console.log('   3. Ou vous pouvez utiliser l\'endpoint admin /admin/users/:userId/reset-mfa pour régénérer leur secret');

    await mongoose.disconnect();
    console.log('\n✅ Déconnexion de MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Exécuter le script
resetAllMFA();

