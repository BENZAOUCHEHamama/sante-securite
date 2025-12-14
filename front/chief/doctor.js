let currentPatientId = null;

// Charger la liste des patients
async function loadPatients() {
    try {
        const data = await apiRequest('/doctors/patients');
        const patientsList = document.getElementById('patientsList');
        
        if (!patientsList) return;
        
        if (data.length === 0) {
            patientsList.innerHTML = '<p>Aucun patient assigné</p>';
            return;
        }

        patientsList.innerHTML = data.map(patient => `
            <div class="patient-card" onclick="viewPatient('${patient._id}')">
                <img src="${patient.photo || 'https://via.placeholder.com/60'}" alt="Photo">
                <h3>${patient.firstName || ''} ${patient.lastName || ''}</h3>
                <p>Service: ${patient.assignedService || 'N/A'}</p>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erreur chargement patients:', error);
        showError('Erreur lors du chargement des patients');
    }
}

// Voir le profil d'un patient
async function viewPatient(patientId) {
    currentPatientId = patientId;
    
    try {
        const patient = await apiRequest(`/doctors/patients/${patientId}`);
        const profileDiv = document.getElementById('patientProfile');
        
        if (profileDiv) {
            profileDiv.innerHTML = `
                <div class="profile-info">
                    <div class="profile-info-item">
                        <label>Nom complet</label>
                        <span>${patient.firstName || ''} ${patient.lastName || ''}</span>
                    </div>
                    <div class="profile-info-item">
                        <label>Service</label>
                        <span>${patient.assignedService || 'N/A'}</span>
                    </div>
                    ${patient.medicalHistory ? `
                        <div class="profile-info-item">
                            <label>Historique médical</label>
                            <span>${patient.medicalHistory}</span>
                        </div>
                    ` : ''}
                    ${patient.allergies ? `
                        <div class="profile-info-item">
                            <label>Allergies</label>
                            <span>${patient.allergies}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        showPage('patientProfile');
    } catch (error) {
        console.error('Erreur chargement profil:', error);
        showError('Erreur lors du chargement du profil');
    }
}

// Voir les analyses d'un patient
async function viewAnalyses() {
    if (!currentPatientId) return;
    
    try {
        const analyses = await apiRequest(`/doctors/patients/${currentPatientId}/analyses`);
        const analysesList = document.getElementById('analysesList');
        
        if (analysesList) {
            if (analyses.length === 0) {
                analysesList.innerHTML = '<p>Aucune analyse disponible</p>';
            } else {
                analysesList.innerHTML = analyses.map(analysis => `
                    <div class="analysis-card">
                        <h3>${analysis.analysisType || 'Analyse'}</h3>
                        <p><strong>Date:</strong> ${new Date(analysis.analysisDate).toLocaleDateString()}</p>
                        <p><strong>Résultats:</strong> ${analysis.results || 'N/A'}</p>
                        ${analysis.notes ? `<p><strong>Notes:</strong> ${analysis.notes}</p>` : ''}
                        ${analysis.filePath ? `<a href="${analysis.filePath}" target="_blank">Voir le fichier</a>` : ''}
                    </div>
                `).join('');
            }
        }
        
        showPage('analyses');
    } catch (error) {
        console.error('Erreur chargement analyses:', error);
        showError('Erreur lors du chargement des analyses');
    }
}

// Ouvrir le chat avec un patient
async function openChat() {
    if (!currentPatientId) return;
    
    try {
        const chat = await apiRequest(`/doctors/patients/${currentPatientId}/chat`);
        const chatMessages = document.getElementById('chatMessages');
        
        if (chatMessages) {
            if (chat.messages && chat.messages.length > 0) {
                chatMessages.innerHTML = chat.messages.map(msg => {
                    const isSent = msg.senderId === currentUser.id;
                    return `
                        <div class="message ${isSent ? 'sent' : 'received'}">
                            <p>${msg.message}</p>
                            <small>${new Date(msg.timestamp).toLocaleString()}</small>
                        </div>
                    `;
                }).join('');
            } else {
                chatMessages.innerHTML = '<p>Aucun message</p>';
            }
        }
        
        showPage('chat');
    } catch (error) {
        console.error('Erreur chargement chat:', error);
        showError('Erreur lors du chargement du chat');
    }
}

// Envoyer un message
async function sendMessage() {
    if (!currentPatientId) return;
    
    const messageInput = document.getElementById('messageInput');
    const message = messageInput?.value.trim();
    
    if (!message) return;
    
    try {
        await apiRequest(`/doctors/patients/${currentPatientId}/chat/messages`, {
            method: 'POST',
            body: JSON.stringify({ message })
        });
        
        messageInput.value = '';
        openChat(); // Recharger le chat
    } catch (error) {
        console.error('Erreur envoi message:', error);
        showError('Erreur lors de l\'envoi du message');
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Boutons de navigation
    document.getElementById('backToPatients')?.addEventListener('click', () => {
        showPage('patients');
        loadPatients();
    });
    
    document.getElementById('backToProfile')?.addEventListener('click', () => {
        if (currentPatientId) {
            viewPatient(currentPatientId);
        }
    });
    
    document.getElementById('backToProfileFromChat')?.addEventListener('click', () => {
        if (currentPatientId) {
            viewPatient(currentPatientId);
        }
    });
    
    document.getElementById('viewAnalysesBtn')?.addEventListener('click', viewAnalyses);
    document.getElementById('openChatBtn')?.addEventListener('click', openChat);
    document.getElementById('sendMessageBtn')?.addEventListener('click', sendMessage);
    
    // Envoyer message avec Enter
    document.getElementById('messageInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Charger les patients au démarrage
    if (document.getElementById('patientsList')) {
        loadPatients();
    }
});

// Fonction utilitaire pour afficher les erreurs
function showError(message) {
    alert(message); // Pour simplifier, on utilise alert
}

// Exposer les fonctions globalement
window.viewPatient = viewPatient;


