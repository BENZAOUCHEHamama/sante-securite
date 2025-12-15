// ========================================
// MES-MEDECINS.JS - Gestion de la page médecins pour patients
// ========================================

let selectedDoctorId = null;
let selectedDoctorName = '';

// ========================================
// 1. CHARGER MES MÉDECINS TRAITANTS
// ========================================
async function loadMyDoctors() {
    const container = document.getElementById('myDoctorsList');
    
    try {
        // Récupérer le profil patient pour obtenir l'assignedDoctor
        const profileData = await apiRequest('/patients/profile');
        
        if (!profileData.patient || !profileData.patient.assignedDoctor) {
            container.innerHTML = '<p class="info-message">👨‍⚕️ Vous n\'avez pas encore de médecin traitant. Recherchez-en un ci-dessous !</p>';
            return;
        }
        
        // Récupérer les infos du médecin assigné
        const doctorId = profileData.patient.assignedDoctor;
        const doctor = await apiRequest(`/doctors/${doctorId}`);
        
        container.innerHTML = `
            <div class="doctor-card">
                <div class="doctor-header">
                    <div class="doctor-avatar">
                        ${doctor.firstName ? doctor.firstName.charAt(0).toUpperCase() : '👨‍⚕️'}
                    </div>
                    <div class="doctor-info">
                        <h3>Dr. ${doctor.firstName || ''} ${doctor.lastName || doctor.username}</h3>
                        <p>${doctor.email}</p>
                    </div>
                </div>
                ${doctor.specialite ? `<p class="doctor-speciality"><strong>🔬 Spécialité:</strong> ${doctor.specialite}</p>` : ''}
                ${doctor.service ? `<p class="doctor-service"><strong>🏥 Service:</strong> ${doctor.service}</p>` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Erreur chargement médecins traitants:', error);
        container.innerHTML = '<p class="info-message">👨‍⚕️ Vous n\'avez pas encore de médecin traitant.</p>';
    }
}

// ========================================
// 2. CHARGER TOUS LES MÉDECINS DISPONIBLES
// ========================================
async function loadAvailableDoctors() {
    const container = document.getElementById('availableDoctorsList');
    
    try {
        const doctors = await apiRequest('/follow-requests/doctors/available');
        
        if (!doctors || doctors.length === 0) {
            container.innerHTML = '<p class="info-message">Aucun médecin disponible pour le moment.</p>';
            return;
        }
        
        // Sauvegarder pour la recherche
        window.allDoctors = doctors;
        
        displayDoctors(doctors, container);
    } catch (error) {
        console.error('Erreur chargement médecins disponibles:', error);
        container.innerHTML = '<p class="error-message">❌ Erreur lors du chargement des médecins</p>';
    }
}

// ========================================
// 3. AFFICHER LES MÉDECINS (avec bouton demande)
// ========================================
function displayDoctors(doctors, container) {
    if (!doctors || doctors.length === 0) {
        container.innerHTML = '<p class="info-message">Aucun médecin trouvé.</p>';
        return;
    }
    
    container.innerHTML = doctors.map(doctor => `
        <div class="doctor-card">
            <div class="doctor-header">
                <div class="doctor-avatar">
                    ${doctor.firstName ? doctor.firstName.charAt(0).toUpperCase() : '👨‍⚕️'}
                </div>
                <div class="doctor-info">
                    <h3>Dr. ${doctor.firstName || ''} ${doctor.lastName || doctor.username}</h3>
                    <p>${doctor.email}</p>
                </div>
            </div>
            
            ${doctor.specialite ? `<p class="doctor-speciality"><strong>🔬 Spécialité:</strong> ${doctor.specialite}</p>` : ''}
            ${doctor.service ? `<p class="doctor-service"><strong>🏥 Service:</strong> ${doctor.service}</p>` : ''}
            
            <button class="btn btn-primary" onclick="openRequestModal('${doctor._id}', 'Dr. ${doctor.firstName || ''} ${doctor.lastName || doctor.username}')">
                📋 Demander un suivi
            </button>
        </div>
    `).join('');
}

// ========================================
// 4. RECHERCHE DE MÉDECINS
// ========================================
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    
    if (!searchInput) return;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        const container = document.getElementById('availableDoctorsList');
        
        if (!window.allDoctors) return;
        
        if (query === '') {
            displayDoctors(window.allDoctors, container);
            return;
        }
        
        const filtered = window.allDoctors.filter(doctor => {
            const name = `${doctor.firstName || ''} ${doctor.lastName || ''} ${doctor.username}`.toLowerCase();
            const speciality = (doctor.specialite || '').toLowerCase();
            const service = (doctor.service || '').toLowerCase();
            
            return name.includes(query) || speciality.includes(query) || service.includes(query);
        });
        
        displayDoctors(filtered, container);
    });
}

// ========================================
// 5. OUVRIR LE MODAL DE DEMANDE
// ========================================
function openRequestModal(doctorId, doctorName) {
    selectedDoctorId = doctorId;
    selectedDoctorName = doctorName;
    
    const modal = document.getElementById('requestModal');
    const modalName = document.getElementById('modalDoctorName');
    const reasonTextarea = document.getElementById('requestReason');
    
    if (modal && modalName && reasonTextarea) {
        modalName.textContent = `Demander un suivi à ${doctorName}`;
        reasonTextarea.value = '';
        modal.classList.add('active');
    }
}

// ========================================
// 6. FERMER LE MODAL
// ========================================
function closeModal() {
    const modal = document.getElementById('requestModal');
    if (modal) {
        modal.classList.remove('active');
    }
    selectedDoctorId = null;
    selectedDoctorName = '';
}

// ========================================
// 7. ENVOYER LA DEMANDE DE SUIVI
// ========================================
async function submitRequest() {
    const reasonTextarea = document.getElementById('requestReason');
    const reason = reasonTextarea.value.trim();
    
    if (!reason) {
        alert('❌ Veuillez expliquer le motif de votre demande');
        return;
    }
    
    if (!selectedDoctorId) {
        alert('❌ Erreur: médecin non sélectionné');
        return;
    }
    
    try {
        await apiRequest('/follow-requests/request', {
            method: 'POST',
            body: JSON.stringify({
                doctorId: selectedDoctorId,
                reason: reason
            })
        });
        
        alert(`✅ Demande envoyée avec succès à ${selectedDoctorName}!`);
        closeModal();
        
        // Recharger les demandes en attente
        loadPendingRequests();
    } catch (error) {
        console.error('Erreur envoi demande:', error);
        alert(`❌ Erreur: ${error.message}`);
    }
}

// ========================================
// 8. CHARGER MES DEMANDES EN ATTENTE
// ========================================
async function loadPendingRequests() {
    const container = document.getElementById('pendingRequestsList');
    
    try {
        const requests = await apiRequest('/follow-requests/my-requests');
        
        if (!requests || requests.length === 0) {
            container.innerHTML = '<p class="info-message">Aucune demande en cours.</p>';
            return;
        }
        
        container.innerHTML = requests.map(request => {
            const doctor = request.doctorId || {};
            const statusColors = {
                pending: '#ffc107',
                accepted: '#28a745',
                rejected: '#dc3545'
            };
            const statusLabels = {
                pending: '⏳ En attente',
                accepted: '✅ Acceptée',
                rejected: '❌ Rejetée'
            };
            
            return `
                <div class="pending-card">
                    <div>
                        <h3>Dr. ${doctor.firstName || ''} ${doctor.lastName || doctor.username || 'N/A'}</h3>
                        <p><strong>Spécialité:</strong> ${doctor.specialite || 'N/A'}</p>
                        <p><strong>Motif:</strong> ${request.reason}</p>
                        <p><strong>Date:</strong> ${new Date(request.createdAt).toLocaleDateString('fr-FR')}</p>
                        ${request.doctorMessage ? `<p><strong>Message du médecin:</strong> ${request.doctorMessage}</p>` : ''}
                    </div>
                    <div>
                        <span style="background: ${statusColors[request.status]}; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold;">
                            ${statusLabels[request.status]}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Erreur chargement demandes:', error);
        container.innerHTML = '<p class="error-message">❌ Erreur lors du chargement des demandes</p>';
    }
}

// ========================================
// 9. CHARGER LE PROFIL UTILISATEUR (sidebar)
// ========================================
async function loadUserProfile() {
    try {
        const data = await apiRequest('/patients/profile');
        
        if (data.patient) {
            const patient = data.patient;
            const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
            const displayName = fullName || patient.username || 'Patient';
            
            // Mettre à jour le nom
            const profileName = document.getElementById('profileName');
            const userName = document.getElementById('userName');
            
            if (profileName) profileName.textContent = displayName;
            if (userName) userName.textContent = displayName;
            
            // Mettre à jour la photo
            const profilePhoto = document.getElementById('profilePhoto');
            if (profilePhoto && patient.photo) {
                const photoUrl = patient.photo.startsWith('http') 
                    ? patient.photo 
                    : `http://localhost:5000${patient.photo}`;
                profilePhoto.src = photoUrl;
            }
        }
    } catch (error) {
        console.error('Erreur chargement profil:', error);
    }
}

// ========================================
// 10. INITIALISATION AU CHARGEMENT
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('✅ Page mes-medecins.js chargée');
    
    // Vérifier l'authentification
    if (!loadUser()) {
        console.log('❌ Non authentifié, redirection...');
        window.location.href = '../c0nnexi0n/index.html';
        return;
    }
    
    // Charger toutes les sections
    await loadUserProfile();
    await loadMyDoctors();
    await loadAvailableDoctors();
    await loadPendingRequests();
    
    // Initialiser la recherche
    initSearch();
    
    // Fermer le modal en cliquant en dehors
    const modal = document.getElementById('requestModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    console.log('✅ Toutes les sections chargées');
});