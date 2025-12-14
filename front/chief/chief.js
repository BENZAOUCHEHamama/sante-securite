// Charger les médecins du service
async function loadDoctors() {
    try {
        const doctors = await apiRequest('/chief/doctors');
        const doctorsList = document.getElementById('doctorsList');
        
        if (doctorsList) {
            if (doctors.length === 0) {
                doctorsList.innerHTML = '<p>Aucun médecin dans ce service</p>';
            } else {
                doctorsList.innerHTML = doctors.map(doctor => `
                    <div class="doctor-card">
                        <h3>${doctor.firstName || ''} ${doctor.lastName || ''}</h3>
                        <p>Email: ${doctor.email}</p>
                        <p>Service: ${doctor.service}</p>
                        <p>Date d'inscription: ${new Date(doctor.createdAt).toLocaleDateString()}</p>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Erreur chargement médecins:', error);
    }
}

// Charger les patients du service
async function loadServicePatients() {
    try {
        const patients = await apiRequest('/chief/service/patients');
        const servicePatientsList = document.getElementById('servicePatientsList');
        
        if (servicePatientsList) {
            if (patients.length === 0) {
                servicePatientsList.innerHTML = '<p>Aucun patient dans ce service</p>';
            } else {
                servicePatientsList.innerHTML = patients.map(patient => `
                    <div class="patient-card" onclick="viewPatient('${patient._id}')">
                        <img src="${patient.photo || 'https://via.placeholder.com/60'}" alt="Photo">
                        <h3>${patient.firstName || ''} ${patient.lastName || ''}</h3>
                        <p>Service: ${patient.assignedService || 'N/A'}</p>
                        ${patient.assignedDoctor ? `<p>Médecin: ${patient.assignedDoctor.email || 'N/A'}</p>` : ''}
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Erreur chargement patients du service:', error);
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Écouter les changements de page
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', async (e) => {
            const page = item.getAttribute('data-page');
            
            if (page === 'doctors') {
                await loadDoctors();
            } else if (page === 'servicePatients') {
                await loadServicePatients();
            }
        });
    });
});


