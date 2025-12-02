// Firebase configuration (replace with your own)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM elements
const loginPage = document.getElementById('login-page');
const appPage = document.getElementById('app-page');
const loginForm = document.getElementById('login-form');
const signupBtn = document.getElementById('signup-btn');
const biometricBtn = document.getElementById('biometric-btn');
const logoutBtn = document.getElementById('logout-btn');
const chequeForm = document.getElementById('cheque-details-form');
const cancelEditBtn = document.getElementById('cancel-edit');
const searchInput = document.getElementById('search');
const chequesContainer = document.getElementById('cheques-container');

// State
let currentChequeId = null;

// Event Listeners
loginForm.addEventListener('submit', handleLogin);
signupBtn.addEventListener('click', handleSignup);
biometricBtn.addEventListener('click', handleBiometricAuth);
logoutBtn.addEventListener('click', handleLogout);
chequeForm.addEventListener('submit', handleSaveCheque);
cancelEditBtn.addEventListener('click', cancelEdit);
searchInput.addEventListener('input', handleSearch);

// Check auth state
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        loginPage.style.display = 'none';
        appPage.style.display = 'block';
        loadCheques();
    } else {
        // User is signed out
        loginPage.style.display = 'block';
        appPage.style.display = 'none';
    }
});

// Handle login
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Login successful
        })
        .catch(error => {
            alert(error.message);
        });
}

// Handle signup
function handleSignup() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            // Signup successful
        })
        .catch(error => {
            alert(error.message);
        });
}

// Handle biometric authentication (using WebAuthn)
function handleBiometricAuth() {
    // Note: This is a simplified example. WebAuthn implementation is more complex.
    // We would need to register and authenticate with a server (Firebase supports WebAuthn in beta).
    // For simplicity, we'll just show an alert.
    alert("Biometric authentication is not implemented in this example. Please use email/password.");
}

// Handle logout
function handleLogout() {
    auth.signOut();
}

// Handle saving cheque (add or update)
function handleSaveCheque(e) {
    e.preventDefault();
    const cheque = {
        chequeNo: document.getElementById('cheque-no').value,
        bankName: document.getElementById('bank-name').value,
        accountNo: document.getElementById('account-no').value,
        payeeName: document.getElementById('payee-name').value,
        amount: parseFloat(document.getElementById('amount').value),
        date: document.getElementById('date').value,
        remarks: document.getElementById('remarks').value,
        status: document.getElementById('status').value,
        userId: auth.currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (currentChequeId) {
        // Update existing cheque
        db.collection('cheques').doc(currentChequeId).update(cheque)
            .then(() => {
                resetForm();
                loadCheques();
            })
            .catch(error => alert(error.message));
    } else {
        // Add new cheque
        db.collection('cheques').add(cheque)
            .then(() => {
                resetForm();
                loadCheques();
            })
            .catch(error => alert(error.message));
    }
}

// Cancel edit and reset form
function cancelEdit() {
    resetForm();
}

// Reset form
function resetForm() {
    chequeForm.reset();
    currentChequeId = null;
}

// Load cheques from Firestore
function loadCheques() {
    db.collection('cheques')
        .where('userId', '==', auth.currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            chequesContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const cheque = doc.data();
                const chequeElement = document.createElement('div');
                chequeElement.className = 'cheque-item';
                chequeElement.innerHTML = `
                    <h3>Cheque No: ${cheque.chequeNo}</h3>
                    <p>Bank: ${cheque.bankName}</p>
                    <p>Payee: ${cheque.payeeName}</p>
                    <p>Amount: ₹${cheque.amount}</p>
                    <p>Date: ${cheque.date}</p>
                    <p>Status: ${cheque.status}</p>
                    <p>Remarks: ${cheque.remarks}</p>
                    <button onclick="editCheque('${doc.id}')">Edit</button>
                    <button class="delete" onclick="deleteCheque('${doc.id}')">Delete</button>
                `;
                chequesContainer.appendChild(chequeElement);
            });
        });
}

// Edit cheque
function editCheque(id) {
    db.collection('cheques').doc(id).get()
        .then(doc => {
            if (doc.exists) {
                const cheque = doc.data();
                document.getElementById('cheque-no').value = cheque.chequeNo;
                document.getElementById('bank-name').value = cheque.bankName;
                document.getElementById('account-no').value = cheque.accountNo;
                document.getElementById('payee-name').value = cheque.payeeName;
                document.getElementById('amount').value = cheque.amount;
                document.getElementById('date').value = cheque.date;
                document.getElementById('remarks').value = cheque.remarks;
                document.getElementById('status').value = cheque.status;
                currentChequeId = doc.id;
            }
        })
        .catch(error => alert(error.message));
}

// Delete cheque
function deleteCheque(id) {
    if (confirm("Are you sure you want to delete this cheque?")) {
        db.collection('cheques').doc(id).delete()
            .then(() => {
                loadCheques();
            })
            .catch(error => alert(error.message));
    }
}

// Search cheques
function handleSearch() {
    const searchTerm = searchInput.value.toLowerCase();
    const chequeItems = document.querySelectorAll('.cheque-item');
    chequeItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm) ? 'block' : 'none';
    });
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
