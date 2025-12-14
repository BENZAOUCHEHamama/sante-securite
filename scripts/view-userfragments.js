/**
 * Script pour visualiser les UserFragments dans MongoDB
 * Usage: node scripts/view-userfragments.js
 */
const mongoose = require('mongoose');
const UserFragment = require('../models/UserFragment');
require('dotenv').config();

async function viewUserFragments() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sante-securite', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✓ Connexion MongoDB réussie\n');
    console.log('='.repeat(80));
    console.log('LISTE DES USERFRAGMENTS');
    console.log('='.repeat(80) + '\n');

    // Récupérer tous les fragments
    const fragments = await UserFragment.find({}).sort({ createdAt: -1 });

    if (fragments.length === 0) {
      console.log('Aucun UserFragment trouvé dans la base de données.\n');
      console.log('💡 Astuce: Créez un nouvel utilisateur pour générer automatiquement un UserFragment.');
    } else {
      console.log(`Total: ${fragments.length} UserFragment(s)\n`);
      console.log('-'.repeat(80));

      // Afficher chaque fragment
      fragments.forEach((fragment, index) => {
        console.log(`\n[${index + 1}] UserFragment ID: ${fragment._id}`);
        console.log(`    Username: ${fragment.username}`);
        console.log(`    Email: ${fragment.email}`);
        console.log(`    Role: ${fragment.role}`);
        console.log(`    Status: ${fragment.status}`);
        console.log(`    Nom complet: ${fragment.getFullName()}`);
        console.log(`    MFA activé: ${fragment.mfaEnabled ? 'Oui' : 'Non'}`);
        
        if (fragment.role === 'medecin') {
          console.log(`    Spécialité: ${fragment.specialite || 'N/A'}`);
          console.log(`    Chef de service: ${fragment.isChef ? 'Oui' : 'Non'}`);
          if (fragment.service) {
            console.log(`    Service: ${fragment.service}`);
          }
        }

        if (fragment.role === 'patient') {
          console.log(`    Groupe sanguin: ${fragment.bloodType || 'N/A'}`);
          console.log(`    Service assigné: ${fragment.assignedService || 'N/A'}`);
          if (fragment.assignedDoctorId) {
            console.log(`    Médecin assigné ID: ${fragment.assignedDoctorId}`);
          }
        }

        console.log(`    Date de création: ${fragment.createdAt}`);
        console.log(`    Dernière mise à jour: ${fragment.updatedAt}`);
        if (fragment.lastLogin) {
          console.log(`    Dernière connexion: ${fragment.lastLogin}`);
        }
        console.log(`    Version fragment: ${fragment.fragmentVersion}`);
        console.log(`    Original User ID: ${fragment.originalUserId}`);
        console.log('-'.repeat(80));
      });

      // Statistiques
      console.log('\n' + '='.repeat(80));
      console.log('STATISTIQUES');
      console.log('='.repeat(80));
      
      const byRole = {};
      const byStatus = {};
      
      fragments.forEach(f => {
        byRole[f.role] = (byRole[f.role] || 0) + 1;
        byStatus[f.status] = (byStatus[f.status] || 0) + 1;
      });

      console.log('\nPar rôle:');
      Object.entries(byRole).forEach(([role, count]) => {
        console.log(`  ${role}: ${count}`);
      });

      console.log('\nPar statut:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });

      const withMFA = fragments.filter(f => f.mfaEnabled).length;
      console.log(`\nAvec MFA activé: ${withMFA}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('Pour voir les détails complets dans MongoDB Compass:');
    console.log('1. Ouvrez MongoDB Compass');
    console.log('2. Connectez-vous à votre base de données');
    console.log('3. Naviguez vers la collection "userfragments"');
    console.log('='.repeat(80) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

viewUserFragments();

