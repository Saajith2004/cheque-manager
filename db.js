class DatabaseManager {
    constructor() {
        this.userId = null;
        this.cheques = [];
        this.init();
    }

    init() {
        // Listen for auth state changes
        auth.onAuthStateChanged((user) => {
            if (user) {
                this.userId = user.uid;
                this.subscribeToCheques();
                this.updateStats();
            } else {
                this.userId = null;
                this.cheques = [];
            }
        });
    }

    // Subscribe to real-time cheque updates
    subscribeToCheques() {
        if (!this.userId) return;
        
        db.collection('cheques')
            .where('userId', '==', this.userId)
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                this.cheques = [];
                snapshot.forEach(doc => {
                    this.cheques.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                this.renderCheques();
                this.updateStats();
                
                // Update offline storage
                this.updateLocalStorage();
            });
    }

    // Add new cheque
    async addCheque(chequeData) {
        if (!this.userId) throw new Error('User not authenticated');
        
        try {
            const cheque = {
                ...chequeData,
                userId: this.userId,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const docRef = await db.collection('cheques').add(cheque);
            
            // Also save to IndexedDB for offline
            await this.saveToIndexedDB(cheque, docRef.id);
            
            return { id: docRef.id, ...cheque };
        } catch (error) {
            // If offline, save to local storage
            if (error.code === 'unavailable') {
                return this.saveToLocalStorage(chequeData);
            }
            throw error;
        }
    }

    // Update cheque
    async updateCheque(id, chequeData) {
        try {
            await db.collection('cheques').doc(id).update({
                ...chequeData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            if (error.code === 'unavailable') {
                // Save update to pending sync
                this.queueForSync('update', id, chequeData);
            }
            throw error;
        }
    }

    // Delete cheque
    async deleteCheque(id) {
        try {
            await db.collection('cheques').doc(id).delete();
        } catch (error) {
            if (error.code === 'unavailable') {
                // Mark as deleted for sync
                this.queueForSync('delete', id);
            }
            throw error;
        }
    }

    // Search cheques
    searchCheques(query, status = 'all') {
        let results = [...this.cheques];
        
        if (query) {
            const q = query.toLowerCase();
            results = results.filter(c => 
                c.chequeNo.toLowerCase().includes(q) ||
                c.bankName.toLowerCase().includes(q) ||
                c.payeeName.toLowerCase().includes(q) ||
                c.remarks.toLowerCase().includes(q)
            );
        }
        
        if (status !== 'all') {
            results = results.filter(c => c.status === status);
        }
        
        return results;
    }

    // Update statistics
    updateStats() {
        const total = this.cheques.length;
        const pending = this.cheques.filter(c => c.status === 'Pending').length;
        const cleared = this.cheques.filter(c => c.status === 'Cleared').length;
        const totalAmount = this.cheques.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
        
        document.getElementById('total-cheques').textContent = total;
        document.getElementById('pending-cheques').textContent = pending;
        document.getElementById('cleared-cheques').textContent = cleared;
        document.getElementById('total-amount').textContent = `₹${totalAmount.toLocaleString('en-IN')}`;
        
        // Update recent cheques
        this.updateRecentCheques();
    }

    // Render cheques to table
    renderCheques() {
        const tbody = document.getElementById('cheque-table-body');
        tbody.innerHTML = '';
        
        this.cheques.forEach(cheque => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${cheque.chequeNo}</td>
                <td>${cheque.payeeName}</td>
                <td>${cheque.bankName}</td>
                <td>₹${parseFloat(cheque.amount).toLocaleString('en-IN')}</td>
                <td>${new Date(cheque.date).toLocaleDateString('en-IN')}</td>
                <td><span class="status-badge status-${cheque.status.toLowerCase()}">${cheque.status}</span></td>
                <td class="actions">
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

    // Export data
    async exportData(format = 'csv') {
        const data = this.cheques.map(c => ({
            'Cheque No': c.chequeNo,
            'Bank': c.bankName,
            'Account No': c.accountNo,
            'Payee': c.payeeName,
            'Amount': c.amount,
            'Date': c.date,
            'Status': c.status,
            'Remarks': c.remarks,
            'Created': c.createdAt?.toDate().toLocaleString()
        }));
        
        if (format === 'csv') {
            this.exportToCSV(data);
        } else if (format === 'pdf') {
            this.exportToPDF(data);
        }
    }

    // Offline storage with IndexedDB
    async saveToIndexedDB(cheque, id) {
        const db = await this.openIndexedDB();
        const tx = db.transaction('cheques', 'readwrite');
        const store = tx.objectStore('cheques');
        
        cheque.id = id;
        await store.put(cheque);
        
        return tx.complete;
    }

    // PWA Service Worker registration
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('SW registered:', registration);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        console.log('SW update found!');
                    });
                })
                .catch(error => {
                    console.log('SW registration failed:', error);
                });
        }
    }
}

// Initialize database manager
const dbManager = new DatabaseManager();