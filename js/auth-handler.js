import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";

class AuthHandler {
    constructor() {
        this.setupAuthListener();
    }

    setupAuthListener() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                user.getIdTokenResult().then((idTokenResult) => {
                    const isAdmin = idTokenResult.claims.admin === true;
                    this.updateUIForAuth(true, isAdmin);
                });
            } else {
                // User is signed out
                this.updateUIForAuth(false, false);
            }
        });
    }

    async loginAdmin(email, password) {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }

    async logout() {
        try {
            await signOut(auth);
            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }

    updateUIForAuth(isLoggedIn, isAdmin) {
        const adminControls = document.getElementById('admin-controls');
        const loginSection = document.getElementById('login-section');
        const adminBidControls = document.getElementById('admin-bid-controls');

        if (isLoggedIn && isAdmin) {
            adminControls.classList.remove('hidden');
            loginSection.classList.add('hidden');
            if (adminBidControls) {
                adminBidControls.classList.remove('hidden');
            }
        } else {
            adminControls.classList.add('hidden');
            loginSection.classList.remove('hidden');
            if (adminBidControls) {
                adminBidControls.classList.add('hidden');
            }
        }
    }
}

// Export the auth handler
export const authHandler = new AuthHandler();
