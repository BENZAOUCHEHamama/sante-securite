// Configuration de l'API
const API_BASE_URL = 'http://localhost:5000/api';

// Gestion de l'authentification
let currentUser = null;
let authToken = null;

// Charger les informations utilisateur depuis le localStorage
function loadUser() {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    
    if (storedUser && storedToken) {
        currentUser = JSON.parse(storedUser);
        authToken = storedToken;
        updateUI();
        return true;
    }
    return false;
}

// Sauvegarder les informations utilisateur
function saveUser(user, token) {
    currentUser = user;
    authToken = token;
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    updateUI();
}

// Mettre à jour l'UI avec les informations utilisateur
function updateUI() {
    const userNameEl = document.getElementById('userName');
    if (userNameEl && currentUser) {
        userNameEl.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
    }
}

// Fonction pour faire des requêtes API
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` }),
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur de requête');
        }
        
        return data;
    } catch (error) {
        console.error('Erreur API:', error);
        throw error;
    }
}

// Gestion de la navigation
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            if (page) {
                showPage(page);
                navItems.forEach(nav => nav.classList.remove('active'));
                item.classList.add('active');
            }
        });
    });
}

// Afficher une page
function showPage(pageId) {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.classList.remove('active');
        page.style.display = 'none';
    });
    
    const targetPage = document.getElementById(`${pageId}Page`);
    if (targetPage) {
        targetPage.classList.add('active');
        targetPage.style.display = 'block';
    }
}

// Déconnexion
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            window.location.href = '../c0nnexi0n/index.html';
        });
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadUser();
    initNavigation();
    initLogout();
    
    // Rediriger vers login si non authentifié (sauf sur les pages d'auth)
    const authPages = ['login.html', 'signup.html', 'index.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (!authPages.includes(currentPage) && !authToken) {
        window.location.href = 'login.html';
    }
});


