// Admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'auction2025';

class AdminHandler {
    constructor() {
        this.isAdmin = false;
        this.setupAdminControls();
    }

    setupAdminControls() {
        const loginButton = document.getElementById('admin-login');
        const adminControls = document.getElementById('admin-controls');
        
        if (loginButton && adminControls) {
            loginButton.addEventListener('click', () => this.showLoginPrompt());
            
            // Check if we were previously logged in
            const wasAdmin = localStorage.getItem('isAdmin') === 'true';
            if (wasAdmin) {
                this.isAdmin = true;
                loginButton.classList.add('hidden');
                adminControls.classList.remove('hidden');
                window.dataHandler.isAdmin = true;
            }
        }
    }

    showLoginPrompt() {
        const username = prompt("Enter admin username:");
        if (username === ADMIN_USERNAME) {
            const password = prompt("Enter admin password:");
            if (password === ADMIN_PASSWORD) {
                this.isAdmin = true;
                localStorage.setItem('isAdmin', 'true');
                document.getElementById('admin-login').classList.add('hidden');
                document.getElementById('admin-controls').classList.remove('hidden');
                window.dataHandler.isAdmin = true;
                alert('Logged in as admin');
            } else {
                alert('Invalid credentials');
            }
        } else {
            alert('Invalid credentials');
        }
    }

    logout() {
        this.isAdmin = false;
        localStorage.removeItem('isAdmin');
        document.getElementById('admin-login').classList.remove('hidden');
        document.getElementById('admin-controls').classList.add('hidden');
        window.dataHandler.isAdmin = false;
    }

    isAdminUser() {
        return this.isAdmin;
    }
}

// Initialize admin handler
document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing admin handler");
    window.adminHandler = new AdminHandler();
});
