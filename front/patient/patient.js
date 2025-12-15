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
  const password = document.getElementById('newPassword').value;
  const strengthBar = document.getElementById('passwordStrengthBar');
  const strengthText = document.getElementById('passwordStrengthText');
  const requirementsList = document.getElementById('passwordRequirements');

  if (!strengthBar || !strengthText || !requirementsList) return;

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
// Charger le profil du patient
async function loadProfile() {
    try {
        const data = await apiRequest('/patients/profile');
        const profileInfo = document.getElementById('profileInfo');
        const profileName = document.getElementById('profileName');
        const profilePhoto = document.getElementById('profilePhoto');
        
        if (!data.patient) {
            throw new Error('Données profil invalides');
        }

        const patient = data.patient;
        const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
        const displayName = fullName || patient.username || 'Patient';
        
        // Mettre à jour la barre latérale
        if (profileName) {
            profileName.textContent = displayName;
        }
        
        // Construire l'URL de la photo
        let photoUrl = null;  // Pas d'URL par défaut
        if (patient.photo) {
            photoUrl = patient.photo.startsWith('http') 
                ? patient.photo 
                : `http://localhost:5000${patient.photo}`;
        }
        
        if (profilePhoto) {
            if (photoUrl) {
                profilePhoto.src = photoUrl;
                profilePhoto.onerror = function() {
                    // Si l'image échoue, afficher un avatar par défaut
                    this.style.display = 'none';
                };
            } else {
                profilePhoto.style.display = 'none';
            }
        }
        
        // Construire le contenu du profil
        if (profileInfo) {
            const roleMap = {
                'patient': 'Patient',
                'medecin': 'Médecin',
                'admin': 'Administrateur'
            };
            const roleLabel = roleMap[patient.role] || patient.role;
            
            profileInfo.innerHTML = `
                <div class="profile-section">
                    <h3>👤 Informations personnelles</h3>
                    <div class="profile-photo-section">
                        <div class="profile-photo-container">
                            ${photoUrl ? `<img id="profilePhotoDisplay" src="${photoUrl}" alt="Photo de profil" class="profile-photo-large">` : '<div style="width: 150px; height: 150px; margin: 0 auto 1rem; background: #f0f0f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid #667eea;"><span style="font-size: 3rem;">👤</span></div>'}
                            <label for="photoInput" class="btn btn-secondary" style="margin-top: 1rem; cursor: pointer; display: inline-block;">
                                📷 Changer la photo
                            </label>
                            <input type="file" id="photoInput" accept="image/*" style="display: none;">
                        </div>
                    </div>
                    
                    <div class="profile-grid">
                        <div class="profile-info-item">
                            <label>👤 Nom d'utilisateur</label>
                            <span class="info-value">${patient.username || currentUser.username || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <label>📧 Email</label>
                            <span class="info-value">${patient.email || currentUser.email || 'N/A'}</span>
                        </div>
                        <div class="profile-info-item">
                            <label>🔐 Rôle</label>
                            <span class="badge badge-role">${roleLabel}</span>
                        </div>
                        ${fullName ? `
                            <div class="profile-info-item">
                                <label>👨‍⚕️ Nom complet</label>
                                <span class="info-value">${fullName}</span>
                            </div>
                        ` : ''}
                        ${patient.medicalHistory ? `
                            <div class="profile-info-item">
                                <label>📋 Historique médical</label>
                                <span class="info-value">${patient.medicalHistory}</span>
                            </div>
                        ` : ''}
                        ${patient.allergies ? `
                            <div class="profile-info-item">
                                <label>⚠️ Allergies</label>
                                <span class="info-value">${patient.allergies}</span>
                            </div>
                        ` : ''}
                        ${patient.currentMedications ? `
                            <div class="profile-info-item">
                                <label>💊 Médicaments actuels</label>
                                <span class="info-value">${patient.currentMedications}</span>
                            </div>
                        ` : ''}
                        ${patient.bloodType ? `
                            <div class="profile-info-item">
                                <label>🩸 Groupe sanguin</label>
                                <span class="info-value">${patient.bloodType}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="profile-section">
                    <h3>🔒 Sécurité - Changer le mot de passe</h3>
                    <form id="changePasswordForm">
                        <div class="form-group">
                            <label for="currentPassword">Mot de passe actuel</label>
                            <input type="password" id="currentPassword" name="currentPassword" required placeholder="Entrez votre mot de passe actuel">
                        </div>
<div class="form-group">
    <label for="newPassword">Nouveau mot de passe</label>
    <input type="password" id="newPassword" name="newPassword" required placeholder="Minimum 8 caractères">
    
    <!-- Indicateur de force du mot de passe -->
    <div class="password-strength-container">
        <div class="strength-bar-container">
            <div id="passwordStrengthBar" class="strength-bar"></div>
        </div>
        <div id="passwordStrengthText" class="strength-text"></div>
        <ul id="passwordRequirements" class="requirements-list"></ul>
    </div>
</div>
                        <div class="form-group">
                            <label for="confirmPassword">Confirmer le nouveau mot de passe</label>
                            <input type="password" id="confirmPassword" name="confirmPassword" required minlength="6" placeholder="Confirmez votre nouveau mot de passe">
                        </div>
                        <button type="submit" class="btn btn-primary">Changer le mot de passe</button>
                        <div id="passwordMessage" style="margin-top: 1rem;"></div>
                    </form>
                </div>
            `;
            
            // Initialiser les événements
            initProfileEvents();
        }
    } catch (error) {
        console.error('Erreur chargement profil:', error);
        const profileInfo = document.getElementById('profileInfo');
        if (profileInfo) {
            profileInfo.innerHTML = `<div class="error-message">❌ Erreur lors du chargement du profil: ${error.message}</div>`;
        }
    }
}

// Initialiser les événements pour le profil
function initProfileEvents() {
    // Gestion du changement de photo
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoUpload);
    }
    
    // Gestion du changement de mot de passe
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlePasswordChange);
    }
    
    // 🔥 NOUVEAU : Écouter les changements sur le champ mot de passe
    const newPasswordInput = document.getElementById('newPassword');
    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', updatePasswordStrength);
    }
}

async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Vérifier la taille du fichier (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ Le fichier est trop volumineux. Taille maximale: 5MB');
        return;
    }
    
    // Vérifier le type de fichier
    if (!file.type.match('image.*')) {
        alert('❌ Veuillez sélectionner une image (JPEG, PNG, GIF)');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('photo', file);
        
        const response = await fetch('http://localhost:5000/api/patients/profile/photo', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de la mise à jour de la photo');
        }
        
        // Mettre à jour l'affichage de la photo
        const photoUrl2 = data.photo.startsWith('http') 
            ? data.photo 
            : `http://localhost:5000${data.photo}`;
        
        const profilePhotoDisplay = document.getElementById('profilePhotoDisplay');
        const profilePhoto = document.getElementById('profilePhoto');
        
        if (profilePhotoDisplay) {
            profilePhotoDisplay.src = photoUrl2;
        }
        if (profilePhoto) {
            profilePhoto.src = photoUrl2;
        }
        
        // Réinitialiser l'input
        document.getElementById('photoInput').value = '';
        alert('✅ Photo de profil mise à jour avec succès');
        
        // 🔥 RECHARGER LE PROFIL pour voir la photo
window.location.reload();

    } catch (error) {
        console.error('Erreur mise à jour photo:', error);
        alert('❌ Erreur lors de la mise à jour de la photo: ' + error.message);
    }
}
// Gestion du changement de mot de passe
async function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const messageDiv = document.getElementById('passwordMessage');
    
    // Nettoyer le message précédent
    messageDiv.innerHTML = '';
    
    // Validations
    if (!currentPassword || !newPassword || !confirmPassword) {
        messageDiv.innerHTML = '<div class="error-message">Tous les champs sont requis</div>';
        return;
    }
    
// 🔥 NOUVELLE VALIDATION avec indicateur de force
const passwordFeedback = checkPasswordStrength(newPassword);

if (passwordFeedback.level === 'faible') {
    messageDiv.innerHTML = '<div class="error-message">❌ Le mot de passe est trop faible. Utilisez un mot de passe plus sécurisé.</div>';
    return;
}

if (passwordFeedback.requirements.length > 0) {
    messageDiv.innerHTML = '<div class="error-message">❌ Le mot de passe ne respecte pas toutes les exigences de sécurité.</div>';
    return;
}
    
    if (newPassword !== confirmPassword) {
        messageDiv.innerHTML = '<div class="error-message">Les nouveaux mots de passe ne correspondent pas</div>';
        return;
    }
    
    if (currentPassword === newPassword) {
        messageDiv.innerHTML = '<div class="error-message">Le nouveau mot de passe doit être différent du mot de passe actuel</div>';
        return;
    }
    
    try {
        await apiRequest('/patients/profile/password', {
            method: 'PUT',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        messageDiv.innerHTML = '<div class="success-message">✅ Mot de passe modifié avec succès</div>';
        document.getElementById('changePasswordForm').reset();
        
        // Effacer le message après 5 secondes
        setTimeout(() => {
            messageDiv.innerHTML = '';
        }, 5000);
    } catch (error) {
        messageDiv.innerHTML = `<div class="error-message">❌ ${error.message || 'Erreur lors du changement de mot de passe'}</div>`;
    }
}

// Charger les analyses
async function loadAnalyses() {
    try {
        const analyses = await apiRequest('/patients/analyses');
        const analysesList = document.getElementById('analysesList');
        
        if (analysesList) {
            if (analyses.length === 0) {
                analysesList.innerHTML = '<p style="text-align: center; color: #999;">Aucune analyse disponible</p>';
            } else {
                analysesList.innerHTML = analyses.map(analysis => `
                    <div class="analysis-card">
                        <div class="card-header">
                            <h3>${analysis.analysisType || 'Analyse'}</h3>
                            <span class="card-date">${new Date(analysis.analysisDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p><strong>Résultats:</strong> ${analysis.results || 'N/A'}</p>
                        ${analysis.notes ? `<p><strong>Notes:</strong> ${analysis.notes}</p>` : ''}
                        ${analysis.filePath ? `<a href="${analysis.filePath}" target="_blank" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">📥 Télécharger</a>` : ''}
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Erreur chargement analyses:', error);
    }
}

// Fonction de téléchargement déchiffré
async function downloadDecryptedFile(fileId, fileName) {
    try {
        console.log(`🔓 Déchiffrement du fichier ${fileId}...`);
        
        const response = await fetch(`http://localhost:5000/api/files/download/${fileId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Erreur lors du téléchargement');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'fichier_medical.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        console.log('✅ Fichier téléchargé avec succès');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
        alert(`❌ Erreur: ${error.message}`);
    }
}

// Exposer globalement
window.downloadDecryptedFile = downloadDecryptedFile;// Charger les fichiers médicaux
async function loadFiles() {
    try {
        const files = await apiRequest('/files/list');
        const filesList = document.getElementById('filesList');
        
        if (filesList) {
            if (files.length === 0) {
                filesList.innerHTML = '<p style="text-align: center; color: #999;">Aucun fichier médical disponible</p>';
            } else {
                filesList.innerHTML = files.map(file => `
                    <div class="file-card">
                        <div class="card-header">
                            <h3>📄 ${file.title || 'Fichier médical'}</h3>
                            <span class="card-date">${new Date(file.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        ${file.description ? `<p><strong>Description:</strong> ${file.description}</p>` : ''}
                        
                        <!-- 🔓 DÉCHIFFRER & TÉLÉCHARGER -->
<button 
    onclick="downloadDecryptedFile('${file._id}', '${file.originalFileName || 'fichier.pdf'}')"
    class="btn btn-primary" 
    style="margin-top: 1rem;">
    🔓 Déchiffrer & Télécharger
</button>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Erreur chargement fichiers:', error);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
    loadAnalyses();
    
    // Écouter les changements de page
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            
            // Charger les données appropriées
            if (page === 'analyses') {
                await loadAnalyses();
            } else if (page === 'files') {
                await loadFiles();
            } else if (page === 'profile') {
                await loadProfile();
            }
        });
    });
});