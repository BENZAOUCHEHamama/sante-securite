/**
 * Script pour migrer tous les Users existants vers UserFragment
 * Usage: node scripts/migrate-to-userfragment.js
 */
const mongoose = require('mongoose');
const { syncAllUsersToFragment } = require('../utils/userFragmentSync');
require('dotenv').config();

async function migrateUsers() {
  try {
    console.log('🔄 Démarrage de la migration vers UserFragment...\n');

    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sante-securite', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✓ Connexion MongoDB réussie\n');

    // Synchroniser tous les utilisateurs
    const result = await syncAllUsersToFragment();

    console.log('\n' + '='.repeat(80));
    console.log('MIGRATION TERMINÉE');
    console.log('='.repeat(80));
    console.log(`✓ ${result.synced} utilisateur(s) synchronisé(s) avec succès`);
    if (result.errors > 0) {
      console.log(`⚠ ${result.errors} erreur(s) rencontrée(s)`);
    }
    console.log('\n💡 Utilisez "node scripts/view-userfragments.js" pour visualiser les données.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
    process.exit(1);
  }
}

migrateUsers();

