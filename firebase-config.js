// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD688sjp01I4DfNOMdLoWqflqJwVhCuwE4",
  authDomain: "chequemanager-9e722.firebaseapp.com",
  projectId: "chequemanager-9e722",
  storageBucket: "chequemanager-9e722.firebasestorage.app",
  messagingSenderId: "73748998170",
  appId: "1:73748998170:web:f8b315fcf53848378749a3",
  measurementId: "G-3LCE3QM0XY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


