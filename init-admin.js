// Script pour créer un administrateur initial
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sante-securite', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connexion MongoDB réussie');

    // Vérifier si un admin existe déjà (peu importe l'email)
    const existingAdmin = await User.findOne({ role: 'admin' });
    
    if (existingAdmin) {
      console.log('Un administrateur existe déjà. Impossible de créer un autre admin.');
      console.log(`Admin existant: ${existingAdmin.email}`);
      process.exit(0);
    }

    // Créer l'administrateur
    const admin = new User({
      username: 'admin',
      email: 'admin@hospital.com',
      password: 'admin123', // À changer après la première connexion
      role: 'admin',
      firstName: 'Administrateur',
      lastName: 'Système',
      status: 'approved' // Approuvé automatiquement
    });

    await admin.save();
    console.log('Administrateur créé avec succès!');
    console.log('Email: admin@hospital.com');
    console.log('Mot de passe: admin123');
    console.log('⚠️  IMPORTANT: Changez le mot de passe après la première connexion!');
    
    process.exit(0);
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

createAdmin();


