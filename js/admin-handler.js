// Admin credentials
const ADMIN_USERNAME = 'ADMIN_USERNAME'; // Replace with your admin username
const ADMIN_PASSWORD = 'ADMIN_PASSWORD'; // Replace with your admin password

class AdminHandler {
    constructor() {
        this.isAdmin = false;
        this.setupAdminControls();
    }

    setupAdminControls() {
        const loginButton = document.getElementById('admin-login');
        const restoreButton = document.getElementById('restore-data');
        const addPlayerButton = document.getElementById('add-player');
        
        if (loginButton) {
            loginButton.addEventListener('click', () => {
                if (this.isAdmin) {
                    this.logout();
                } else {
                    this.showLoginPrompt();
                }
            });
            
            // Check if we were previously logged in
            const wasAdmin = localStorage.getItem('isAdmin') === 'true';
            if (wasAdmin) {
                this.setAdminMode(true);
            }
        }
    }

    showLoginPrompt() {
        const username = prompt("Enter admin username:");
        if (!username) return; // User cancelled

        if (username === ADMIN_USERNAME) {
            const password = prompt("Enter admin password:");
            if (!password) return; // User cancelled

            if (password === ADMIN_PASSWORD) {
                this.setAdminMode(true);
                localStorage.setItem('isAdmin', 'true');
                alert('Logged in as admin');
            } else {
                alert('Invalid credentials');
            }
        } else {
            alert('Invalid credentials');
        }
    }

    setAdminMode(isAdmin) {
        this.isAdmin = isAdmin;
        const loginButton = document.getElementById('admin-login');
        const restoreButton = document.getElementById('restore-data');
        const addPlayerButton = document.getElementById('add-player');

        if (loginButton) {
            loginButton.textContent = isAdmin ? 'Exit Admin Mode' : 'Admin Login';
        }
        if (restoreButton) {
            restoreButton.classList.toggle('hidden', !isAdmin);
        }
        if (addPlayerButton) {
            addPlayerButton.classList.toggle('hidden', !isAdmin);
        }

        if (window.dataHandler) {
            window.dataHandler.setAdminStatus(isAdmin);
        }
    }

    logout() {
        localStorage.removeItem('isAdmin');
        this.setAdminMode(false);
        window.location.reload();
    }

    isAdminUser() {
        return this.isAdmin;
    }
}

// Initialize admin handler after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing admin handler");
    window.adminHandler = new AdminHandler();
});
