// ========================================
// DOCTOR.JS - Gestion de la page médecin
// ========================================

let currentPatientId = null;

// ========================================
// 1. CHARGER MES PATIENTS
// ========================================
async function loadMyPatients() {
    const container = document.getElementById('patientsList');
    
    try {
        container.innerHTML = '<p class="loading">Chargement des patients...</p>';
        
        const patients = await apiRequest('/doctors/patients');
        
        if (!patients || patients.length === 0) {
            container.innerHTML = '<p class="info-message">👥 Vous n\'avez pas encore de patients assignés. Les demandes acceptées apparaîtront ici.</p>';
            return;
        }
        
        container.innerHTML = patients.map(patient => {
            const fullName = `${patient.firstName || ''} ${patient.lastName || patient.username || 'Patient'}`.trim();
            const initials = getInitials(patient.firstName, patient.lastName);
            
            return `
                <div class="patient-card" onclick="viewPatientProfile('${patient._id}')">
                    <div class="patient-avatar">${initials}</div>
                    <h3>${fullName}</h3>
                    <p>📧 ${patient.email || 'N/A'}</p>
                    ${patient.assignedService ? `<p>🏥 Service: ${patient.assignedService}</p>` : ''}
                    <button class="btn btn-primary" onclick="event.stopPropagation(); viewPatientProfile('${patient._id}')">
                        📋 Voir le profil
                    </button>
                </div>
            `;
        }).join('');
        
        console.log(`✅ ${patients.length} patient(s) chargé(s)`);
    } catch (error) {
        console.error('Erreur chargement patients:', error);
        container.innerHTML = '<p class="error-message">❌ Erreur lors du chargement des patients</p>';
    }
}

// ========================================
// 2. CHARGER LES DEMANDES DE SUIVI EN ATTENTE
// ========================================
async function loadPendingRequests() {
    const container = document.getElementById('requestsList');
    
    try {
        container.innerHTML = '<p class="loading">Chargement des demandes...</p>';
        
        const requests = await apiRequest('/follow-requests/pending');
        
        if (!requests || requests.length === 0) {
            container.innerHTML = '<p class="info-message">📭 Aucune demande de suivi en attente.</p>';
            return;
        }
        
        container.innerHTML = requests.map(request => {
            const patient = request.patientId || {};
            const fullName = `${patient.firstName || ''} ${patient.lastName || patient.username || 'Patient'}`.trim();
            const date = new Date(request.createdAt).toLocaleDateString('fr-FR', { 
                day: 'numeric', 
                month: 'long', 
                year: 'numeric' 
            });
            
            return `
                <div class="pending-card">
                    <div class="pending-info">
                        <h3>👤 ${fullName}</h3>
                        <p><strong>📧 Email:</strong> ${patient.email || 'N/A'}</p>
                        <p><strong>📅 Date de demande:</strong> ${date}</p>
                        <p><strong>📝 Motif:</strong></p>
                        <p style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 5px;">
                            ${request.reason}
                        </p>
                    </div>
                    <div class="pending-actions">
                        <button class="btn btn-primary" onclick="acceptRequest('${request._id}', '${fullName}')">
                            ✅ Accepter
                        </button>
                        <button class="btn btn-danger" onclick="rejectRequest('${request._id}', '${fullName}')">
                            ❌ Rejeter
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log(`✅ ${requests.length} demande(s) en attente`);
    } catch (error) {
        console.error('Erreur chargement demandes:', error);
        container.innerHTML = '<p class="error-message">❌ Erreur lors du chargement des demandes</p>';
    }
}

// ========================================
// 3. ACCEPTER UNE DEMANDE DE SUIVI
// ========================================
async function acceptRequest(requestId, patientName) {
    const message = prompt(`✅ Accepter la demande de ${patientName}\n\nVous pouvez ajouter un message (optionnel):`);
    
    // Si l'utilisateur annule (null), on arrête
    if (message === null) return;
    
    try {
        await apiRequest(`/follow-requests/${requestId}/accept`, {
            method: 'POST',
            body: JSON.stringify({ 
                message: message || 'Demande acceptée. Vous êtes maintenant mon patient.' 
            })
        });
        
        alert(`✅ Demande acceptée ! ${patientName} est maintenant votre patient.`);
        
        // Recharger les deux listes
        loadPendingRequests();
        loadMyPatients();
    } catch (error) {
        console.error('Erreur acceptation demande:', error);
        alert(`❌ Erreur: ${error.message}`);
    }
}

// ========================================
// 4. REJETER UNE DEMANDE DE SUIVI
// ========================================
async function rejectRequest(requestId, patientName) {
    const message = prompt(`❌ Rejeter la demande de ${patientName}\n\nVeuillez indiquer la raison (optionnel):`);
    
    // Si l'utilisateur annule (null), on arrête
    if (message === null) return;
    
    try {
        await apiRequest(`/follow-requests/${requestId}/reject`, {
            method: 'POST',
            body: JSON.stringify({ 
                message: message || 'Demande rejetée.' 
            })
        });
        
        alert(`❌ Demande de ${patientName} rejetée.`);
        
        // Recharger la liste des demandes
        loadPendingRequests();
    } catch (error) {
        console.error('Erreur rejet demande:', error);
        alert(`❌ Erreur: ${error.message}`);
    }
}

// ========================================
// 5. VOIR LE PROFIL D'UN PATIENT
// ========================================
async function viewPatientProfile(patientId) {
    currentPatientId = patientId;
    
    try {
        const patient = await apiRequest(`/doctors/patients/${patientId}`);
        
        const fullName = `${patient.firstName || ''} ${patient.lastName || patient.username || 'Patient'}`.trim();
        
        const profileContainer = document.getElementById('patientProfile');
        profileContainer.innerHTML = `
            <div class="profile-section">
                <h3>👤 Informations du patient</h3>
                <div class="profile-grid">
                    <div class="profile-info-item">
                        <label>👤 Nom complet</label>
                        <span class="info-value">${fullName}</span>
                    </div>
                    <div class="profile-info-item">
                        <label>📧 Email</label>
                        <span class="info-value">${patient.email || 'N/A'}</span>
                    </div>
                    <div class="profile-info-item">
                        <label>🏥 Service</label>
                        <span class="info-value">${patient.assignedService || 'N/A'}</span>
                    </div>
                    ${patient.dateOfBirth ? `
                        <div class="profile-info-item">
                            <label>📅 Date de naissance</label>
                            <span class="info-value">${new Date(patient.dateOfBirth).toLocaleDateString('fr-FR')}</span>
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
        `;
        
        // Afficher la page du profil
        showPage('patientProfile');
    } catch (error) {
        console.error('Erreur chargement profil patient:', error);
        alert(`❌ Erreur lors du chargement du profil: ${error.message}`);
    }
}

// ========================================
// 6. VOIR LES ANALYSES ET FICHIERS D'UN PATIENT
// ========================================
async function viewPatientAnalyses() {
    if (!currentPatientId) return;
    
    try {
        const analysesContainer = document.getElementById('analysesList');
        analysesContainer.innerHTML = '<p class="loading">Chargement...</p>';
        
        // Charger les analyses ET les fichiers médicaux
        const [analyses, files] = await Promise.all([
            apiRequest(`/doctors/patients/${currentPatientId}/analyses`).catch(() => []),
            apiRequest(`/doctors/patients/${currentPatientId}/files`).catch(() => [])
        ]);
        
        let content = '';
        
        // Section Fichiers médicaux
        if (files && files.length > 0) {
            content += '<h3 style="margin-bottom: 1rem;">📄 Fichiers médicaux</h3>';
            content += files.map(file => `
                <div class="file-card" style="margin-bottom: 1rem;">
                    <div class="card-header">
                        <h3>📄 ${file.title || 'Fichier médical'}</h3>
                        <span class="card-date">${new Date(file.createdAt).toLocaleDateString('fr-FR')}</span>
                    </div>
                    ${file.description ? `<p><strong>Description:</strong> ${file.description}</p>` : ''}
                    ${file.fileType ? `<p><strong>Type:</strong> ${getFileTypeLabel(file.fileType)}</p>` : ''}
                    <button 
                        onclick="downloadDecryptedFileDoctor('${file._id}', '${file.originalFileName || 'fichier.pdf'}')"
                        class="btn btn-primary" 
                        style="margin-top: 0.5rem;">
                        Télécharger le document
                    </button>
                </div>
            `).join('');
        }
        
        // Section Analyses
        if (analyses && analyses.length > 0) {
            content += '<h3 style="margin: 2rem 0 1rem 0;">🧪 Analyses médicales</h3>';
            content += analyses.map(analysis => `
                <div class="analysis-card" style="margin-bottom: 1rem;">
                    <div class="card-header">
                        <h3>🧪 ${analysis.analysisType || 'Analyse'}</h3>
                        <span class="card-date">${new Date(analysis.analysisDate).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p><strong>Résultats:</strong> ${analysis.results || 'N/A'}</p>
                    ${analysis.notes ? `<p><strong>Notes:</strong> ${analysis.notes}</p>` : ''}
                    ${analysis.filePath ? `<a href="${analysis.filePath}" target="_blank" class="btn btn-primary">📥 Télécharger</a>` : ''}
                </div>
            `).join('');
        }
        
        // Si rien n'est disponible
        if ((!files || files.length === 0) && (!analyses || analyses.length === 0)) {
            content = '<p class="info-message">📭 Aucun fichier médical ou analyse disponible pour ce patient.</p>';
        }
        
        analysesContainer.innerHTML = content;
        showPage('analyses');
    } catch (error) {
        console.error('Erreur chargement analyses:', error);
        document.getElementById('analysesList').innerHTML = 
            `<p class="error-message">❌ Erreur lors du chargement: ${error.message}</p>`;
    }
}

// Fonction pour obtenir le label du type de fichier
function getFileTypeLabel(fileType) {
    const types = {
        'prescription': '💊 Ordonnance',
        'report': '📋 Compte-rendu',
        'scanner': '🔬 Scanner',
        'radiography': '📸 Radiographie',
        'analysis': '🧪 Analyse',
        'other': '📄 Autre'
    };
    return types[fileType] || fileType;
}

// Fonction de téléchargement pour le médecin
async function downloadDecryptedFileDoctor(fileId, fileName) {
    try {
        console.log(`🔓 Déchiffrement du fichier ${fileId}...`);
        
        const response = await fetch(`${API_BASE_URL}/files/download/${fileId}`, {
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
window.downloadDecryptedFileDoctor = downloadDecryptedFileDoctor;

// ========================================
// 7. UPLOAD DE FICHIER CHIFFRÉ
// ========================================
async function handleFileUpload(e) {
    e.preventDefault();
    
    if (!currentPatientId) {
        alert('❌ Aucun patient sélectionné');
        return;
    }
    
    const fileInput = document.getElementById('fileInput');
    const title = document.getElementById('fileTitle').value.trim();
    const description = document.getElementById('fileDescription').value.trim();
    const fileType = document.getElementById('fileType').value;
    const statusDiv = document.getElementById('uploadStatus');
    
    if (!fileInput.files[0]) {
        alert('❌ Veuillez sélectionner un fichier');
        return;
    }
    
    if (!title || !fileType) {
        alert('❌ Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    const file = fileInput.files[0];
    
    // Vérifier la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        alert('❌ Le fichier est trop volumineux (max 10MB)');
        return;
    }
    
    try {
        statusDiv.innerHTML = '<p class="info-message">⏳ Chiffrement et envoi en cours...</p>';
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('patientId', currentPatientId);
        formData.append('title', title);
        formData.append('description', description);
        formData.append('fileType', fileType);
        
        const response = await fetch(`${API_BASE_URL}/files/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de l\'upload');
        }
        
        statusDiv.innerHTML = '<p class="success-message">✅ Fichier chiffré et envoyé avec succès !</p>';
        
        // Réinitialiser le formulaire
        document.getElementById('uploadFileForm').reset();
        
        // Retour au profil après 2 secondes
        setTimeout(() => {
            showPage('patientProfile');
            statusDiv.innerHTML = '';
        }, 2000);
        
    } catch (error) {
        console.error('Erreur upload:', error);
        statusDiv.innerHTML = `<p class="error-message">❌ ${error.message}</p>`;
    }
}

// ========================================
// 8. UTILITAIRES
// ========================================

// Obtenir les initiales
function getInitials(firstName, lastName) {
    const first = (firstName || '').charAt(0).toUpperCase();
    const last = (lastName || '').charAt(0).toUpperCase();
    return (first + last) || '👤';
}

// ========================================
// 9. GESTION DE LA NAVIGATION
// ========================================

// Initialiser les boutons de navigation
function initDoctorNavigation() {
    // Bouton retour à la liste des patients
    const backToPatients = document.getElementById('backToPatients');
    if (backToPatients) {
        backToPatients.addEventListener('click', () => {
            showPage('patients');
            loadMyPatients();
        });
    }
    
    // Bouton retour au profil
    const backToProfile = document.getElementById('backToProfile');
    if (backToProfile) {
        backToProfile.addEventListener('click', () => {
            showPage('patientProfile');
        });
    }
    
    // Bouton retour au profil depuis upload
    const backToProfileFromUpload = document.getElementById('backToProfileFromUpload');
    if (backToProfileFromUpload) {
        backToProfileFromUpload.addEventListener('click', () => {
            showPage('patientProfile');
        });
    }
    
    // Bouton voir les analyses
    const viewAnalysesBtn = document.getElementById('viewAnalysesBtn');
    if (viewAnalysesBtn) {
        viewAnalysesBtn.addEventListener('click', viewPatientAnalyses);
    }
    
    // Bouton upload fichier
    const uploadFileBtn = document.getElementById('uploadFileBtn');
    if (uploadFileBtn) {
        uploadFileBtn.addEventListener('click', () => {
            showPage('uploadFile');
        });
    }
    
    // Formulaire d'upload
    const uploadFileForm = document.getElementById('uploadFileForm');
    if (uploadFileForm) {
        uploadFileForm.addEventListener('submit', handleFileUpload);
    }
}

// ========================================
// 10. INITIALISATION AU CHARGEMENT
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ Page doctor.js chargée');
    
    // Vérifier l'authentification
    if (!loadUser()) {
        console.log('❌ Non authentifié, redirection...');
        window.location.href = '../c0nnexi0n/index.html';
        return;
    }
    
    // Vérifier le rôle médecin
    if (currentUser && currentUser.role !== 'medecin') {
        console.log('❌ Accès refusé: rôle non autorisé');
        alert('❌ Accès refusé. Cette page est réservée aux médecins.');
        window.location.href = '../c0nnexi0n/index.html';
        return;
    }
    
    // Initialiser la navigation spécifique au médecin
    initDoctorNavigation();
    
    // Charger les données initiales
    await loadMyPatients();
    await loadPendingRequests();
    
    console.log('✅ Page médecin initialisée');
});

// Exposer les fonctions globalement pour onclick
window.viewPatientProfile = viewPatientProfile;
window.acceptRequest = acceptRequest;
window.rejectRequest = rejectRequest;