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
        userNameEl.textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username || currentUser.email;
    }
}

// Fonction pour faire des requêtes API


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
        
        // Déclencher un événement personnalisé pour que les autres scripts puissent réagir
        const event = new CustomEvent('pageChanged', { detail: { pageId } });
        window.dispatchEvent(event);
    }
}

// Déconnexion - CORRECTION DU CHEMIN
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            
            // CORRECTION: Redirection vers index.html à la racine
            // Obtenir le chemin de base (enlever admin.html ou le fichier actuel)
            const currentPath = window.location.pathname;
            const pathParts = currentPath.split('/');
            
            // Remonter au dossier c0nnexi0n
            // Si on est dans /admine/admin.html, on remonte de 2 niveaux
            const indexPath = currentPath.includes('/admine/') 
                ? '../c0nnexi0n/index.html'
                : currentPath.includes('/medcin/')
                ? '../c0nnexi0n/index.html'
                : currentPath.includes('/patient/')
                ? '../c0nnexi0n/index.html'
                : './index.html';
            
            window.location.href = indexPath;
        });
    }
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    if (!loadUser()) {
        // Si pas d'utilisateur, rediriger vers la page de connexion
        const currentPath = window.location.pathname;
        const indexPath = currentPath.includes('/admine/') 
            ? '../c0nnexi0n/index.html'
            : currentPath.includes('/medcin/')
            ? '../c0nnexi0n/index.html'
            : currentPath.includes('/patient/')
            ? '../c0nnexi0n/index.html'
            : './index.html';
        
        window.location.href = indexPath;
        return;
    }
    
    initNavigation();
    initLogout();
});