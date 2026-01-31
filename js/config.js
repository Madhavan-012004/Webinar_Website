// =========================================
// ZestHub / NexStream Configuration
// =========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBLkxmdD9oE8FTkFZI5Xv_jv3xgaVp_veM",
    authDomain: "zesthub-39270.firebaseapp.com",
    projectId: "zesthub-39270",
    storageBucket: "zesthub-39270.firebasestorage.app",
    messagingSenderId: "97620937298",
    appId: "1:97620937298:web:b8b28ad1d0a23a5cf1ad8b"
};

// Initialize and Export
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// EmailJS Config
export const EMAILJS_SERVICE_ID = "service_q2ub7ml";
export const EMAILJS_TEMPLATE_ID = "template_k78lkgs";
export const EMAILJS_PUBLIC_KEY = "tGIO9L4chGFacWG4G";

export const initEmailJS = () => {
    try {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    } catch (e) {
        console.warn("EmailJS not loaded.", e);
    }
};
