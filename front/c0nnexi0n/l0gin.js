// Navigation entre pages
function showAuthPage() {
  document.getElementById('homePage').style.display = 'none';
  document.getElementById('authPage').style.display = 'block';
}

function showHomePage() {
  document.getElementById('homePage').style.display = 'block';
  document.getElementById('authPage').style.display = 'none';
}
// ============== VALIDATION MOT DE PASSE ==============
function checkPasswordStrength(password) {
  let strength = 0;
  const feedback = {
    level: '',
    message: '',
    requirements: []
  };

  // Critères de validation
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  // Calcul de la force
  if (minLength) strength++;
  if (hasUpperCase) strength++;
  if (hasLowerCase) strength++;
  if (hasNumbers) strength++;
  if (hasSpecialChar) strength++;
  if (password.length >= 12) strength++;

  // Déterminer le niveau
  if (strength <= 2) {
    feedback.level = 'faible';
    feedback.message = 'Mot de passe faible';
  } else if (strength <= 4) {
    feedback.level = 'moyen';
    feedback.message = 'Mot de passe moyen';
  } else {
    feedback.level = 'fort';
    feedback.message = 'Mot de passe fort';
  }

  // Exigences manquantes
  if (!minLength) feedback.requirements.push('Au moins 8 caractères');
  if (!hasUpperCase) feedback.requirements.push('Une majuscule');
  if (!hasLowerCase) feedback.requirements.push('Une minuscule');
  if (!hasNumbers) feedback.requirements.push('Un chiffre');
  if (!hasSpecialChar) feedback.requirements.push('Un caractère spécial (!@#$%^&*...)');

  return feedback;
}

function updatePasswordStrength() {
  const password = document.getElementById('signupPassword').value;
  const strengthBar = document.getElementById('passwordStrengthBar');
  const strengthText = document.getElementById('passwordStrengthText');
  const requirementsList = document.getElementById('passwordRequirements');

  if (!password) {
    strengthBar.style.width = '0%';
    strengthBar.className = 'strength-bar';
    strengthText.textContent = '';
    requirementsList.innerHTML = '';
    return;
  }

  const feedback = checkPasswordStrength(password);

  // Mise à jour de la barre
  let width = 0;
  let colorClass = '';

  switch(feedback.level) {
    case 'faible':
      width = 33;
      colorClass = 'weak';
      break;
    case 'moyen':
      width = 66;
      colorClass = 'medium';
      break;
    case 'fort':
      width = 100;
      colorClass = 'strong';
      break;
  }

  strengthBar.style.width = width + '%';
  strengthBar.className = 'strength-bar ' + colorClass;
  strengthText.textContent = feedback.message;
  strengthText.className = 'strength-text ' + colorClass;

  // Afficher les exigences manquantes
  if (feedback.requirements.length > 0) {
    requirementsList.innerHTML = '<p style="margin: 5px 0; font-size: 12px; color: #666;">Exigences manquantes :</p>' +
      feedback.requirements.map(req => `<li style="font-size: 12px; color: #d32f2f;">${req}</li>`).join('');
  } else {
    requirementsList.innerHTML = '<p style="margin: 5px 0; font-size: 12px; color: #2e7d32;">✓ Toutes les exigences sont remplies</p>';
  }
}

// Initialiser l'écouteur d'événement au chargement
window.addEventListener('DOMContentLoaded', function() {
  const passwordInput = document.getElementById('signupPassword');
  if (passwordInput) {
    passwordInput.addEventListener('input', updatePasswordStrength);
  }
});

// Affichage des étapes
function showSignup() {
  document.getElementById('signupStep').classList.add('active');
  document.getElementById('loginStep').classList.remove('active');
  document.getElementById('qrStep').classList.remove('active');
}

function showLogin() {
  document.getElementById('loginStep').classList.add('active');
  document.getElementById('signupStep').classList.remove('active');
  document.getElementById('qrStep').classList.remove('active');
  // Réinitialiser le champ MFA
  document.getElementById('loginMfaContainer').style.display = 'none';
  document.getElementById('loginMfaCode').value = '';
}

function showQr(qrUrl) {
  document.getElementById('qrImage').src = qrUrl;
  document.getElementById('qrStep').classList.add('active');
  document.getElementById('signupStep').classList.remove('active');
  document.getElementById('loginStep').classList.remove('active');
}

// Gestion des champs spécifiques au rôle
document.getElementById('signupRole').addEventListener('change', function() {
  const specialiteInput = document.getElementById('signupSpecialite');
  const serviceInput = document.getElementById('signupService');
  const chefLabel = document.getElementById('chefLabel');
  const isChef = document.getElementById('signupIsChef');
  
  if (this.value === 'medecin') {
    specialiteInput.style.display = 'block';
    chefLabel.style.display = 'block';
    if (isChef.checked) {
      serviceInput.style.display = 'block';
    }
  } else {
    specialiteInput.style.display = 'none';
    serviceInput.style.display = 'none';
    chefLabel.style.display = 'none';
  }
  
  // Désactiver admin si un admin existe déjà
  if (this.value === 'admin') {
    // Optionnel: vous pouvez ajouter une vérification ici
  }
});

document.getElementById('signupIsChef').addEventListener('change', function() {
  const serviceInput = document.getElementById('signupService');
  const role = document.getElementById('signupRole').value;
  
  if (role === 'medecin' && this.checked) {
    serviceInput.style.display = 'block';
  } else {
    serviceInput.style.display = 'none';
  }
});

// ---------------- SIGNUP ----------------
async function signup() {
  const username = document.getElementById('signupUsername').value;
  const email = document.getElementById('signupEmail').value;
  const password = document.getElementById('signupPassword').value;
  const role = document.getElementById('signupRole').value;
  const specialite = document.getElementById('signupSpecialite').value;
  const isChef = document.getElementById('signupIsChef').checked;
  const service = document.getElementById('signupService').value;
  const mfaEnabled = document.getElementById('signupMfaEnabled').checked;
  const messageEl = document.getElementById('signupMessage');

  if (!username || !email || !password || !role) {
    messageEl.innerText = 'Veuillez remplir tous les champs obligatoires';
    messageEl.className = 'message error';
    return;
  }
  // Validation du mot de passe
const passwordFeedback = checkPasswordStrength(password);

if (passwordFeedback.level === 'faible') {
  messageEl.innerText = 'Le mot de passe est trop faible. Veuillez utiliser un mot de passe plus sécurisé.';
  messageEl.className = 'message error';
  return;
}

if (passwordFeedback.requirements.length > 0) {
  messageEl.innerText = 'Le mot de passe ne respecte pas toutes les exigences de sécurité.';
  messageEl.className = 'message error';
  return;
}

  const data = {
    username,
    email,
    password,
    role,
    specialite,
    isChef,
    service,
    mfaEnabled
  };

  try {
    const res = await fetch('http://localhost:5000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (res.ok) {
      if (result.mfaQR) {
        // Afficher le QR code MFA
        showQr(result.mfaQR);
        messageEl.innerText = 'Inscription réussie ! Scannez le QR code avec Google Authenticator.';
        messageEl.className = 'message success';
      } else {
        messageEl.innerText = 'Inscription réussie ! Vous pouvez maintenant vous connecter.';
        messageEl.className = 'message success';
        setTimeout(() => showLogin(), 2000);
      }
    } else {
      messageEl.innerText = result.message || result.error || 'Erreur lors de l\'inscription';
      messageEl.className = 'message error';
    }
  } catch (err) {
    messageEl.innerText = 'Erreur de connexion au serveur: ' + err.message;
    messageEl.className = 'message error';
  }
}

// ---------------- LOGIN ----------------
let currentUserId = null; // Stocker l'ID utilisateur pour MFA

async function login() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const mfaCode = document.getElementById('loginMfaCode').value;
  const messageEl = document.getElementById('loginMessage');

  if (!email || !password) {
    messageEl.innerText = 'Veuillez remplir tous les champs';
    messageEl.className = 'message error';
    return;
  }

  const data = { email, password };
  
  // Ajouter code MFA si présent
  if (mfaCode) {
    data.code = mfaCode;
  }
  
  // Si on a un userId stocké, c'est qu'on est à l'étape MFA
  if (currentUserId) {
    data.userId = currentUserId;
  }

  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (res.ok) {
      // Si MFA requis mais code non fourni
      if (result.mfaRequired && !mfaCode) {
        currentUserId = result.userId;
        document.getElementById('loginMfaContainer').style.display = 'block';
        messageEl.innerText = 'Code MFA requis. Entrez le code de votre application d\'authentification.';
        messageEl.className = 'message info';
        return;
      }

      // Connexion réussie
      if (result.token) {
        // Stocker le token et les infos utilisateur
        localStorage.setItem('token', result.token);
        localStorage.setItem('user', JSON.stringify(result.user));
        
        messageEl.innerText = `Connexion réussie ! Bienvenue ${result.user.username}`;
        messageEl.className = 'message success';
        
        // Réinitialiser
        currentUserId = null;
        
        // Redirection selon le rôle
        setTimeout(() => {
          redirectByRole(result.user.role);
        }, 1500);
      }
    } else {
      messageEl.innerText = result.message || result.error || 'Erreur de connexion';
      messageEl.className = 'message error';

      // Afficher champ MFA si nécessaire
      if (result.message && result.message.toLowerCase().includes('mfa')) {
        document.getElementById('loginMfaContainer').style.display = 'block';
      }
    }
  } catch (err) {
    messageEl.innerText = 'Erreur de connexion au serveur: ' + err.message;
    messageEl.className = 'message error';
  }
}

// Fonction de redirection selon le rôle
function redirectByRole(role) {
  const basePath = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
  
  switch(role) {
    case 'admin':
      window.location.href = basePath + '../admine/admin.html';
      break;
    case 'medecin':
      // Vérifier si c'est un chef de service
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Note: Vous devrez peut-être récupérer isChef depuis le backend
      window.location.href = basePath + '../medcin/doctor.html';
      break;
    case 'patient':
      window.location.href = basePath + '../patient/patient.html';
      break;
    default:
      alert('Rôle non reconnu: ' + role);
  }
}
