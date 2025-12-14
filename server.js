const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const config = require("./config/config");

const app = express();

// Middleware pour logger les requêtes (pour debug)
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  next();
});

// CORS middleware - Accepte les requêtes de Live Server
app.use(cors({
  origin: [
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501",
    "http://127.0.0.1:5502",
    "http://localhost:5502"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

// JSON middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers statiques (pour les uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware pour logger le body (pour debug)
app.use((req, res, next) => {
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', req.body);
  }
  next();
});

// ========================================
// ROUTES
// ========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chief', require('./routes/chief'));
app.use('/api/analyses', require('./routes/analyses'));
app.use('/api/files', require('./routes/files')); // Mise à jour avec chiffrement
app.use('/api/chat', require('./routes/chat'));

// ⭐ NOUVELLES ROUTES
app.use('/api/follow-requests', require('./routes/followRequests'));

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Serveur opérationnel',
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ 
    error: 'Erreur interne du serveur', 
    details: err.message 
  });
});

// Gestion des routes non trouvées
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.path
  });
});

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || config.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connecté');
  console.log(`📂 Base de données: ${mongoose.connection.name}`);
})
.catch(err => {
  console.error('❌ Erreur MongoDB:', err);
  process.exit(1);
});

// Démarrage serveur
const PORT = process.env.PORT || config.PORT || 5000;
app.listen(PORT, () => {
  console.log('\n🚀 ========================================');
  console.log(`🏥 Serveur hospitalier démarré`);
  console.log(`📡 Backend API: http://localhost:${PORT}`);
  console.log(`🔐 Chiffrement: activé`);
  console.log(`🛡️  RBAC: Contrôle d'accès activé`);
  console.log('========================================\n');
  console.log('📋 Routes disponibles:');
  console.log('   POST   /api/auth/signup');
  console.log('   POST   /api/auth/login');
  console.log('   POST   /api/follow-requests/request');
  console.log('   POST   /api/files/upload (chiffrement auto)');
  console.log('   GET    /api/files/download/:id (déchiffrement)');
  console.log('   GET    /api/health');
  console.log('\n✨ Prêt à recevoir des requêtes!\n');
});