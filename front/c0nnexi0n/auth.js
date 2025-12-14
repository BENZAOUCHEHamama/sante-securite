const API_BASE_URL = 'http://localhost:5000/api';

let currentUserId = null;

// Inscription
// Inscription
document.getElementById('signupForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        phoneNumber: document.getElementById('phoneNumber').value,
        role: document.getElementById('role').value
    };

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de l\'inscription');
        }

        currentUserId = data.userId;
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        showMessage('Code de vérification envoyé', 'success');
    } catch (error) {
        showMessage(error.message, 'error');
    }
});

// Vérification du code (inscription et connexion si réutilisé)
document.getElementById('codeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const code = document.getElementById('verificationCode').value;

    if (!currentUserId) {
        showMessage('Aucun utilisateur en attente de vérification', 'error');
        return;
    }

    const isSignup = window.location.pathname.includes('signup');
    const endpoint = isSignup ? '/auth/verify-code' : '/auth/verify-login-code';

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: currentUserId, code })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Code invalide');
        }

        if (isSignup) {
            showMessage('Inscription réussie. Redirection...', 'success');
            setTimeout(() => { window.location.href = 'login.html'; }, 1500);
        } else {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            const role = data.user.role;
            if (role === 'admin') window.location.href = 'admin.html';
            else if (role === 'patient') window.location.href = 'patient.html';
            else if (role === 'medecin') window.location.href = 'doctor.html';
            else if (role === 'chef_service') window.location.href = 'chief.html';
        }
    } catch (error) {
        showMessage(error.message, 'error');
    }
});

// Connexion
document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de la connexion');
        }

        currentUserId = data.userId;

        // Afficher la saisie du code (Facteur 2)
        document.getElementById('step1').style.display = 'none';
        document.getElementById('step2').style.display = 'block';
        showMessage('Code de vérification envoyé', 'success');
    } catch (error) {
        showMessage(error.message, 'error');
    }
});

// Vérification pour la connexion (code)
async function verifyLoginCode(code) {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-login-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUserId,
                code
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Vérification échouée');
        }

        // Sauvegarder le token et rediriger
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Rediriger selon le rôle
        const role = data.user.role;
        if (role === 'admin') {
            window.location.href = 'admin.html';
        } else if (role === 'patient') {
            window.location.href = 'patient.html';
        } else if (role === 'medecin') {
            window.location.href = 'doctor.html';
        } else if (role === 'chef_service') {
            window.location.href = 'chief.html';
        }
    } catch (error) {
        showMessage(error.message, 'error');
    }
}

// Afficher les messages
function showMessage(message, type) {
    const errorEl = document.getElementById('errorMessage');
    const successEl = document.getElementById('successMessage');
    
    if (type === 'error' && errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        if (successEl) successEl.style.display = 'none';
    } else if (type === 'success' && successEl) {
        successEl.textContent = message;
        successEl.style.display = 'block';
        if (errorEl) errorEl.style.display = 'none';
    }
}

