// ==================================================
// ADMIN.JS — Espace administrateur auto-suffisant
// Auteur : Assistant IA
// Date : 13 décembre 2025
// ==================================================

// ======================
// CONFIGURATION
// ======================
const API_BASE_URL = 'http://localhost:5000/api';

// ======================
// UTILITAIRES
// ======================

// Fonction API robuste (lit le token à chaque appel)
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('token');

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    };

    try {
        console.log('🔐 Token utilisé:', token);
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Erreur ${response.status}`);
        }
        return data;
    } catch (error) {
        console.error('❌ Erreur API:', error);
        throw error;
    }
}

// Mettre à jour le nom de l'utilisateur dans le header
function updateUserName() {
    const userNameEl = document.getElementById('userName');
    const userStr = localStorage.getItem('user');
    if (userNameEl && userStr) {
        const user = JSON.parse(userStr);
        const displayName = 
            `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
            user.username || 
            user.email;
        userNameEl.textContent = displayName;
    }
}

// Afficher une notification
function showNotification(message, type = 'info') {
    let container = document.getElementById('notificationContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notificationContainer';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
        `;
        document.body.appendChild(container);
    }

    const notif = document.createElement('div');
    notif.className = `notification notification-${type}`;
    notif.style.cssText = `
        background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
        color: white;
        padding: 15px 20px;
        margin-bottom: 10px;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
    `;
    notif.textContent = message;
    container.appendChild(notif);

    setTimeout(() => {
        notif.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notif.remove(), 300);
    }, 5000);
}

// Gestion de la déconnexion
function handleLogout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    window.location.href = '../c0nnexi0n/index.html';
}

// Afficher une page (navigation)
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });

    const target = document.getElementById(`${pageId}Page`);
    if (target) {
        target.classList.add('active');
        target.style.display = 'block';

        // Déclencher un événement pour recharger les données si nécessaire
        window.dispatchEvent(new CustomEvent('pageChanged', { detail: { pageId } }));
    }

    // Mettre à jour la classe active dans la sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === pageId);
    });
}

// ======================
// GESTION DES UTILISATEURS
// ======================

async function loadUsers() {
    try {
        const users = await apiRequest('/admin/users');
        const usersList = document.getElementById('usersList');
        if (usersList) {
            usersList.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Rôle</th>
                            <th>Statut</th>
                            <th>Date d'inscription</th>
                            <th>Dernière connexion</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.firstName || ''} ${user.lastName || ''}</td>
                                <td>${user.email}</td>
                                <td>${user.role}</td>
                                <td>
                                    <span class="status-badge ${user.status}">${user.status}</span>
                                </td>
                                <td>${new Date(user.createdAt).toLocaleString('fr-FR')}</td>
                                <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleString('fr-FR') : 'Jamais'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Erreur chargement utilisateurs:', error);
        showNotification('Erreur lors du chargement des utilisateurs', 'error');
    }
}

async function loadPendingUsers() {
    const pendingList = document.getElementById('pendingList');
    if (!pendingList) return;

    try {
        pendingList.innerHTML = '<p class="loading">Chargement des utilisateurs en attente...</p>';
        const pendingUsers = await apiRequest('/admin/pending-users');

        if (!Array.isArray(pendingUsers)) {
            throw new Error('Réponse API invalide');
        }

        if (pendingUsers.length === 0) {
            pendingList.innerHTML = '<p class="info-message">Aucun utilisateur en attente de validation</p>';
            return;
        }

        pendingList.innerHTML = pendingUsers.map(user => `
            <div class="pending-card">
                <div class="pending-info">
                    <h3>${user.firstName || ''} ${user.lastName || 'Utilisateur'}</h3>
                    <p><strong>Email:</strong> ${user.email}</p>
                    <p><strong>Rôle:</strong> ${user.role}</p>
                    ${user.specialite ? `<p><strong>Spécialité:</strong> ${user.specialite}</p>` : ''}
                    ${user.service ? `<p><strong>Service:</strong> ${user.service}</p>` : ''}
                    ${user.isChef ? `<p><strong>Chef de service:</strong> Oui</p>` : ''}
                    <p><strong>Date d'inscription:</strong> ${new Date(user.createdAt).toLocaleString('fr-FR')}</p>
                </div>
                <div class="pending-actions">
                    <button class="btn btn-primary" onclick="approveUser('${user._id}')">✓ Approuver</button>
                    <button class="btn btn-danger" onclick="rejectUser('${user._id}')">✗ Rejeter</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erreur chargement utilisateurs en attente:', error);
        pendingList.innerHTML = `
            <div class="error-message">
                <p><strong>❌ Erreur</strong></p>
                <p>${error.message || 'Échec du chargement'}</p>
                <button class="btn btn-secondary" onclick="loadPendingUsers()">🔄 Réessayer</button>
            </div>
        `;
        if (error.message?.includes('401') || error.message?.includes('token')) {
            showNotification('Session expirée. Veuillez vous reconnecter.', 'error');
            setTimeout(handleLogout, 2000);
        }
    }
}

async function approveUser(userId) {
    try {
        await apiRequest(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'approved' })
        });
        showNotification('Utilisateur approuvé avec succès', 'success');
        loadPendingUsers();
        loadUsers();
    } catch (error) {
        console.error('Erreur approbation:', error);
        showNotification('Erreur lors de l\'approbation', 'error');
    }
}

async function rejectUser(userId) {
    if (!confirm('Êtes-vous sûr de vouloir rejeter cet utilisateur ?')) return;
    try {
        await apiRequest(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'rejected' })
        });
        showNotification('Utilisateur rejeté', 'success');
        loadPendingUsers();
        loadUsers();
    } catch (error) {
        console.error('Erreur rejet:', error);
        showNotification('Erreur lors du rejet', 'error');
    }
}

async function loadUsersForPermissions() {
    try {
        const users = await apiRequest('/admin/users');
        const select = document.getElementById('userSelect');
        if (select) {
            select.innerHTML = '<option value="">Sélectionnez un utilisateur</option>' +
                users.map(user => `
                    <option value="${user._id}">
                        ${user.firstName || ''} ${user.lastName || user.username || user.email} (${user.role})
                    </option>
                `).join('');
        }
    } catch (error) {
        console.error('Erreur chargement utilisateurs (permissions):', error);
        showNotification('Erreur chargement utilisateurs', 'error');
    }
}

async function savePermissions(userId) {
    const permissions = {
        canViewPatients: document.getElementById('canViewPatients')?.checked || false,
        canViewAnalyses: document.getElementById('canViewAnalyses')?.checked || false,
        canSendFiles: document.getElementById('canSendFiles')?.checked || false
    };

    try {
        await apiRequest(`/admin/users/${userId}/access`, {
            method: 'PUT',
            body: JSON.stringify({ permissions })
        });
        showNotification('Permissions mises à jour', 'success');
    } catch (error) {
        console.error('Erreur sauvegarde permissions:', error);
        showNotification('Erreur sauvegarde permissions', 'error');
    }
}

// ======================
// INITIALISATION
// ======================

document.addEventListener('DOMContentLoaded', () => {
    // 🔐 Vérification d'authentification
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (!token || !userStr) {
        alert('Accès non autorisé. Veuillez vous connecter.');
        window.location.href = '../c0nnexi0n/index.html';
        return;
    }

    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
        alert('Accès réservé aux administrateurs.');
        window.location.href = '../c0nnexi0n/index.html';
        return;
    }

    // 💡 Initialisation UI
    updateUserName();
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // 🧭 Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page) showPage(page);
        });
    });

    // 📥 Chargement initial
    loadUsers();
    loadPendingUsers();
    loadUsersForPermissions();

    // 🔁 Rechargement automatique lors du changement de page
    window.addEventListener('pageChanged', (e) => {
        const { pageId } = e.detail;
        if (pageId === 'users') loadUsers();
        else if (pageId === 'pending') loadPendingUsers();
        else if (pageId === 'permissions') loadUsersForPermissions();
    });

    // 🎛 Gestion du formulaire de permissions
    document.getElementById('userSelect')?.addEventListener('change', (e) => {
        const userId = e.target.value;
        const form = document.getElementById('permissionsForm');
        if (userId && form) {
            form.style.display = 'block';
            form.innerHTML = `
                <h3>Gérer les permissions</h3>
                <div class="form-group">
                    <label><input type="checkbox" id="canViewPatients"> Voir les patients</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="canViewAnalyses"> Voir les analyses</label>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="canSendFiles"> Envoyer des fichiers</label>
                </div>
                <button class="btn btn-primary" onclick="savePermissions('${userId}')">
                    Sauvegarder les permissions
                </button>
            `;
        } else if (form) {
            form.style.display = 'none';
        }
    });
});

// ✅ Exposer les fonctions globales pour onclick=""
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.savePermissions = savePermissions;
window.loadPendingUsers = loadPendingUsers;