class AuthManager {
    constructor() {
        this.user = null;
        this.init();
    }

    init() {
        // Check authentication state
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.user = user;
                this.showApp();
                this.updateUserInfo(user);
            } else {
                this.user = null;
                this.showAuth();
            }
        });
    }

    // Email/Password Login
    async loginEmail() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const result = await auth.signInWithEmailAndPassword(email, password);
            this.showToast('Login successful!', 'success');
            return result;
        } catch (error) {
            this.showToast(error.message, 'error');
            throw error;
        }
    }

    // Biometric Login (WebAuthn API)
    async loginBiometric() {
        if (!this.isBiometricSupported()) {
            this.showToast('Biometric authentication not supported on this device', 'error');
            return;
        }

        // Check if credential exists for this user
        const credentialId = localStorage.getItem('biometricCredentialId');
        
        if (!credentialId) {
            this.showToast('Please register biometric first in settings', 'info');
            return;
        }

        try {
            // Request biometric authentication
            const credential = await navigator.credentials.get({
                publicKey: {
                    challenge: new Uint8Array(32),
                    allowCredentials: [{
                        id: this.base64ToArrayBuffer(credentialId),
                        type: 'public-key'
                    }],
                    timeout: 60000,
                    userVerification: 'required'
                }
            });

            // If biometric succeeds, sign in with custom token
            // Note: This requires a backend function to validate biometric
            this.showToast('Biometric authentication successful!', 'success');
            
            // For demo, we'll use a simple flag
            // In production, you'd verify with your backend
            localStorage.setItem('biometricVerified', 'true');
            
        } catch (error) {
            this.showToast('Biometric authentication failed', 'error');
        }
    }

    // Google Login
    async loginGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
            this.showToast('Google login successful!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Phone Login
    async loginPhone() {
        const phoneNumber = prompt('Enter your phone number with country code:');
        if (!phoneNumber) return;
        
        const appVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container');
        
        try {
            const confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, appVerifier);
            const code = prompt('Enter the SMS verification code:');
            await confirmationResult.confirm(code);
            this.showToast('Phone login successful!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Register new user
    async registerEmail() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        
        if (password !== confirm) {
            this.showToast('Passwords do not match', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            return;
        }
        
        try {
            const result = await auth.createUserWithEmailAndPassword(email, password);
            
            // Update user profile
            await result.user.updateProfile({
                displayName: name
            });
            
            // Create user document in Firestore
            await db.collection('users').doc(result.user.uid).set({
                name: name,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                settings: {
                    biometricEnabled: false,
                    autoSync: true
                }
            });
            
            this.showToast('Account created successfully!', 'success');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Logout
    async logout() {
        try {
            await auth.signOut();
            this.showToast('Logged out successfully', 'info');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    }

    // Check biometric support
    isBiometricSupported() {
        return window.PublicKeyCredential && 
               typeof window.PublicKeyCredential === 'function' &&
               navigator.credentials;
    }

    // Helper methods
    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                               type === 'error' ? 'exclamation-circle' : 
                               'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        const container = document.getElementById('toast-container');
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showApp() {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('app-screen').style.display = 'block';
        document.getElementById('loading-screen').style.display = 'none';
    }

    showAuth() {
        document.getElementById('auth-screen').style.display = 'block';
        document.getElementById('app-screen').style.display = 'none';
        document.getElementById('loading-screen').style.display = 'none';
    }

    updateUserInfo(user) {
        document.getElementById('user-name').textContent = user.displayName || 'User';
        document.getElementById('user-email').textContent = user.email;
    }
}

// Initialize auth manager
const authManager = new AuthManager();