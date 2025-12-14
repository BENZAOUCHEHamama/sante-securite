# Guide d'installation rapide

## Prérequis
- Node.js (version 14 ou supérieure)
- MongoDB (local ou cloud)
- Compte email pour l'envoi de codes (optionnel)
- Compte Twilio pour SMS (optionnel)

## Étapes d'installation

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer l'environnement
Créez un fichier `.env` à la racine du projet avec le contenu suivant:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/sante-securite
JWT_SECRET=votre_secret_jwt_tres_securise_changez_moi
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Configuration Email (optionnel mais recommandé)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_application

# Configuration SMS Twilio (optionnel)
TWILIO_ACCOUNT_SID=votre_twilio_sid
TWILIO_AUTH_TOKEN=votre_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
```

**Important**: 
- `ENCRYPTION_KEY` doit être une chaîne hexadécimale de 64 caractères (32 bytes)
- Pour générer une clé: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `JWT_SECRET` doit être une chaîne aléatoire sécurisée

### 3. Démarrer MongoDB
Assurez-vous que MongoDB est en cours d'exécution:
```bash
# Sur Windows
net start MongoDB

# Sur Linux/Mac
sudo systemctl start mongod
# ou
mongod
```

### 4. Créer un administrateur initial
```bash
npm run init-admin
```

Cela créera un compte administrateur:
- **Email**: admin@hospital.com
- **Mot de passe**: admin123

⚠️ **IMPORTANT**: Changez ce mot de passe immédiatement après la première connexion!

### 5. Démarrer l'application
```bash
npm start
```

Pour le développement avec rechargement automatique:
```bash
npm run dev
```

### 6. Accéder à l'application
Ouvrez votre navigateur et allez sur: `http://localhost:3000`

## Utilisation

1. **Connexion en tant qu'admin**:
   - Email: `admin@hospital.com`
   - Mot de passe: `admin123`
   - Suivez les étapes MFA (code par email/SMS + biométrie simulée)

2. **Approuver les nouveaux utilisateurs**:
   - Connectez-vous en tant qu'admin
   - Allez dans "Utilisateurs en attente"
   - Approuvez ou rejetez les demandes d'inscription

3. **Créer des comptes**:
   - Utilisez la page d'inscription
   - Choisissez votre rôle (patient, médecin, chef de service)
   - Complétez le processus MFA
   - Attendez l'approbation de l'administrateur

## Dépannage

### Erreur de connexion MongoDB
- Vérifiez que MongoDB est démarré
- Vérifiez l'URI dans le fichier `.env`

### Erreur d'envoi d'email
- Vérifiez vos identifiants email dans `.env`
- Pour Gmail, utilisez un "Mot de passe d'application" au lieu du mot de passe normal

### Erreur de chiffrement
- Vérifiez que `ENCRYPTION_KEY` est bien une chaîne hexadécimale de 64 caractères

### Port déjà utilisé
- Changez le `PORT` dans le fichier `.env`


