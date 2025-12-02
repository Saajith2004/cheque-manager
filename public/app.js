cat > public/app.js << 'EOF'
// Main Application Logic

// DOM Elements
let currentUser = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initialized');
    
    // Check auth state
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            showApp();
            loadUserData();
        } else {
            showAuth();
        }
    });
    
    // Setup form submission
    document.getElementById('cheque-form').addEventListener('submit', addCheque);
    
    // Setup search
    document.getElementById('search-input').addEventListener('input', searchCheques);
    document.getElementById('filter-status').addEventListener('change', searchCheques);
});

// Tab switching
function showTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(form => form.style.display = 'none');
    
    event.target.classList.add('active');
    document.getElementById(tabName + '-tab').style.display = 'block';
}

// Auth functions
function loginEmail() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            showToast('Login successful!', 'success');
        })
        .catch(error => {
            showToast(error.message, 'error');
        });
}

function loginGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then(result => {
            showToast('Google login successful!', 'success');
        })
        .catch(error => {
            showToast(error.message, 'error');
        });
}

function registerEmail() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    
    if (password !== confirm) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then(userCredential => {
            // Update profile
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            showToast('Account created successfully!', 'success');
            showTab('login');
        })
        .catch(error => {
            showToast(error.message, 'error');
        });
}

function logout() {
    auth.signOut()
        .then(() => {
            showToast('Logged out successfully', 'info');
        })
        .catch(error => {
            showToast(error.message, 'error');
        });
}

// UI Functions
function showAuth() {
    document.getElementById('auth-screen').style.display = 'block';
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('loading-screen').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';
    document.getElementById('loading-screen').style.display = 'none';
    
    // Update user info
    document.getElementById('user-name').textContent = currentUser.displayName || 'User';
    document.getElementById('user-email').textContent = currentUser.email;
    
    // Load cheques
    loadCheques();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionId).style.display = 'block';
    
    // Update active menu
    document.querySelectorAll('.nav-menu li').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('li').classList.add('active');
    
    // Close sidebar on mobile
    if (window.innerWidth < 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

// Cheque Functions
async function addCheque(e) {
    e.preventDefault();
    
    const chequeData = {
        chequeNo: document.getElementById('cheque-no').value,
        bankName: document.getElementById('bank-name').value,
        accountNo: document.getElementById('account-no').value,
        payeeName: document.getElementById('payee-name').value,
        amount: parseFloat(document.getElementById('amount').value),
        date: document.getElementById('date').value,
        remarks: document.getElementById('remarks').value,
        status: document.getElementById('status').value,
        userId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('cheques').add(chequeData);
        showToast('Cheque added successfully!', 'success');
        resetForm();
        loadCheques();
    } catch (error) {
        showToast('Error adding cheque: ' + error.message, 'error');
    }
}

function loadCheques() {
    if (!currentUser) return;
    
    db.collection('cheques')
        .where('userId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc')
        .onSnapshot(snapshot => {
            const cheques = [];
            snapshot.forEach(doc => {
                cheques.push({ id: doc.id, ...doc.data() });
            });
            
            renderCheques(cheques);
            updateStats(cheques);
            updateRecentCheques(cheques);
        });
}

function renderCheques(cheques) {
    const tbody = document.getElementById('cheque-table-body');
    tbody.innerHTML = '';
    
    cheques.forEach(cheque => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cheque.chequeNo}</td>
            <td>${cheque.payeeName}</td>
            <td>${cheque.bankName}</td>
            <td>₹${cheque.amount.toLocaleString('en-IN')}</td>
            <td>${new Date(cheque.date).toLocaleDateString('en-IN')}</td>
            <td><span class="status-badge status-${cheque.status.toLowerCase()}">${cheque.status}</span></td>
            <td>
                <button onclick="editCheque('${cheque.id}')" class="btn-icon">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteCheque('${cheque.id}')" class="btn-icon delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function searchCheques() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const status = document.getElementById('filter-status').value;
    
    db.collection('cheques')
        .where('userId', '==', currentUser.uid)
        .get()
        .then(snapshot => {
            let cheques = [];
            snapshot.forEach(doc => {
                cheques.push({ id: doc.id, ...doc.data() });
            });
            
            // Filter
            cheques = cheques.filter(cheque => {
                const matchesSearch = 
                    cheque.chequeNo.toLowerCase().includes(query) ||
                    cheque.payeeName.toLowerCase().includes(query) ||
                    cheque.bankName.toLowerCase().includes(query);
                
                const matchesStatus = status === 'all' || cheque.status === status;
                
                return matchesSearch && matchesStatus;
            });
            
            renderCheques(cheques);
        });
}

function updateStats(cheques) {
    const total = cheques.length;
    const pending = cheques.filter(c => c.status === 'Pending').length;
    const cleared = cheques.filter(c => c.status === 'Cleared').length;
    const totalAmount = cheques.reduce((sum, c) => sum + c.amount, 0);
    
    document.getElementById('total-cheques').textContent = total;
    document.getElementById('pending-cheques').textContent = pending;
    document.getElementById('cleared-cheques').textContent = cleared;
    document.getElementById('total-amount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
}

function updateRecentCheques(cheques) {
    const recentList = document.getElementById('recent-list');
    recentList.innerHTML = '';
    
    const recent = cheques.slice(0, 5);
    recent.forEach(cheque => {
        const item = document.createElement('div');
        item.className = 'recent-item';
        item.innerHTML = `
            <strong>${cheque.chequeNo}</strong> - ${cheque.payeeName}
            <span class="amount">₹${cheque.amount.toLocaleString('en-IN')}</span>
            <span class="status status-${cheque.status.toLowerCase()}">${cheque.status}</span>
        `;
        recentList.appendChild(item);
    });
}

function resetForm() {
    document.getElementById('cheque-form').reset();
    document.getElementById('date').value = new Date().toISOString().split('T')[0];
}

function showToast(message, type = 'info') {
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
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export placeholder functions
function exportData() {
    showToast('Export feature coming soon!', 'info');
}

function syncData() {
    showToast('Syncing data...', 'info');
    loadCheques();
}

function loadUserData() {
    // Load user-specific data
}

console.log('App.js loaded successfully');
EOF