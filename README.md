# Système de Gestion Médicale Sécurisé

Application web pour la confidentialité des données médicales dans le Big Data, spécialisée dans le secteur de la santé.

## Technologies utilisées

- **Backend**: Node.js avec Express
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Base de données**: MongoDB
- **Sécurité**: Chiffrement des données sensibles, Authentification Multi-Facteurs (MFA)

## Fonctionnalités principales

### Sécurité
- ✅ Authentification Multi-Facteurs (MFA) à 3 niveaux:
  - Facteur 1: Mot de passe
  - Facteur 2: Code de vérification par SMS ou Email
  - Facteur 3: Face ID ou empreinte digitale
- ✅ Chiffrement des données sensibles en base de données
- ✅ Stockage non contigu des données chiffrées
- ✅ Système de gestion des droits d'accès personnalisé (sans RBAC classique)

### Pages et rôles

#### Page d'accueil
- Présentation de l'hôpital
- Explication de la sensibilité des données médicales

#### Authentification
- Inscription avec validation par code
- Connexion avec MFA complet

#### Espace Médecin
- Liste des patients assignés
- Profil détaillé de chaque patient
- Consultation des analyses du laboratoire
- Chat avec les patients pour envoyer des ordonnances

#### Espace Patient
- Profil personnel (nom, photo)
- Liste des analyses envoyées par le laboratoire
- Liste des fichiers médicaux envoyés par les médecins
- Navigation par onglets

#### Espace Administrateur
- Liste de tous les utilisateurs inscrits (médecins, patients, chefs de service) avec dates
- Liste d'attente des nouveaux utilisateurs pour validation des rôles
- Gestion des droits d'accès personnalisés

#### Espace Chef de Service
- Toutes les fonctionnalités du médecin
- Gestion des médecins de son service
- Gestion des patients de son service
- Assignation de médecins aux patients

## Installation

1. Installer les dépendances:
```bash
npm install
```

2. Configurer les variables d'environnement:
```bash
cp .env.example .env
```

Éditer le fichier `.env` et remplir les valeurs:
- `MONGODB_URI`: URI de connexion MongoDB
- `JWT_SECRET`: Secret pour les tokens JWT
- `ENCRYPTION_KEY`: Clé de chiffrement (32 caractères hexadécimaux)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: Pour l'envoi de SMS (optionnel)
- `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`: Pour l'envoi d'emails

3. Créer un administrateur initial (optionnel):
```bash
npm run init-admin
```
Cela créera un compte admin avec:
- Email: `admin@hospital.com`
- Mot de passe: `admin123`
⚠️ **Changez le mot de passe après la première connexion!**

4. Démarrer le serveur:
```bash
npm start
```

Pour le développement avec rechargement automatique:
```bash
npm run dev
```

5. Accéder à l'application:
- Ouvrir `http://localhost:3000` dans votre navigateur

## Structure du projet

```
.
├── server.js              # Point d'entrée du serveur
├── config/
│   └── database.js        # Configuration chiffrement
├── models/                # Modèles MongoDB
│   ├── User.js
│   ├── Patient.js
│   ├── Analysis.js
│   ├── MedicalFile.js
│   └── Chat.js
├── routes/                # Routes API
│   ├── auth.js
│   ├── patients.js
│   ├── doctors.js
│   ├── admin.js
│   ├── chief.js
│   ├── analyses.js
│   ├── files.js
│   └── chat.js
├── middleware/
│   └── auth.js            # Middleware d'authentification
├── utils/
│   └── mfa.js             # Utilitaires MFA
└── public/                 # Frontend
    ├── index.html
    ├── login.html
    ├── signup.html
    ├── doctor.html
    ├── patient.html
    ├── admin.html
    ├── chief.html
    ├── css/
    │   └── style.css
    └── js/
        ├── app.js
        ├── auth.js
        ├── doctor.js
        ├── patient.js
        ├── admin.js
        └── chief.js
```

## Notes importantes

- Les données sensibles sont automatiquement chiffrées avant d'être stockées en base de données
- Le système MFA nécessite une configuration Twilio pour les SMS (optionnel, peut fonctionner avec email uniquement)
- La vérification biométrique est simulée pour la démonstration (dans un environnement de production, utiliser WebAuthn ou une API biométrique réelle)
- Tous les nouveaux utilisateurs sont en statut "pending" et doivent être approuvés par un administrateur

## Licence

ISC

