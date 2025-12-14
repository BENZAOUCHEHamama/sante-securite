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
                            <input type="password" id="newPassword" name="newPassword" required minlength="6" placeholder="Minimum 6 caractères">
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
}

async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        alert('❌ Le fichier est trop volumineux. Taille maximale: 5MB');
        return;
    }
    
    if (!file.type.match('image.*')) {
        alert('❌ Veuillez sélectionner une image');
        return;
    }
    
    try {
        const formData = new FormData();
        formData.append('photo', file);
        
        console.log('📤 Upload en cours...');
        const response = await fetch('http://localhost:5000/api/patients/profile/photo', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        console.log('📊 Status:', response.status);
        const data = await response.json();
        console.log('📥 Réponse serveur:', data);
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de la mise à jour');
        }
        
        // Mettre à jour l'image
        const photoUrl = data.photo.startsWith('http') ? data.photo : `http://localhost:5000${data.photo}`;
        console.log('🖼️ URL finale:', photoUrl);
        
        const profilePhotoDisplay = document.getElementById('profilePhotoDisplay');
        if (profilePhotoDisplay) {
            profilePhotoDisplay.src = photoUrl + '?t=' + new Date().getTime();  // Ajouter timestamp pour forcer le rechargement
            console.log('✅ Image mise à jour');
        } else {
            console.log('❌ Element profilePhotoDisplay non trouvé');
        }
        
        alert('✅ Photo mise à jour!');
       window.location.reload();

    } catch (error) {
        console.error('❌ Erreur:', error);
        alert('❌ Erreur: ' + error.message);
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
    
    if (newPassword.length < 6) {
        messageDiv.innerHTML = '<div class="error-message">Le nouveau mot de passe doit contenir au moins 6 caractères</div>';
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

// Charger les fichiers médicaux
async function loadFiles() {
    try {
        const files = await apiRequest('/patients/files');
        const filesList = document.getElementById('filesList');
        
        if (filesList) {
            if (files.length === 0) {
                filesList.innerHTML = '<p style="text-align: center; color: #999;">Aucun fichier médical disponible</p>';
            } else {
                filesList.innerHTML = files.map(file => `
                    <div class="file-card">
                        <div class="card-header">
                            <h3>📄 ${file.fileName || 'Fichier médical'}</h3>
                            <span class="card-date">${new Date(file.createdAt).toLocaleDateString('fr-FR')}</span>
                        </div>
                        ${file.description ? `<p><strong>Description:</strong> ${file.description}</p>` : ''}
                        ${file.filePath ? `<a href="${file.filePath}" target="_blank" class="btn btn-primary" style="margin-top: 1rem; display: inline-block;">📥 Télécharger</a>` : ''}
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