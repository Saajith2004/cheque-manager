cat > public/firebase-config.js << 'EOF'
// TODO: REPLACE WITH YOUR ACTUAL FIREBASE CONFIG FROM CONSOLE
const firebaseConfig = {
    apiKey: "AIzaSyB...YOUR_API_KEY_HERE",
    authDomain: "chequemanager-9e722.firebaseapp.com",
    projectId: "chequemanager-9e722",
    storageBucket: "chequemanager-9e722.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "1:YOUR_APP_ID:web:YOUR_WEB_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Make available globally
window.auth = auth;
window.db = db;
window.firebase = firebase;

console.log("Firebase initialized successfully");
EOF