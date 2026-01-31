// =========================================
// Home Page Logic
// =========================================
import { checkAuthRequirement } from './auth-guard.js';
import { db, auth } from './config.js';
import { initMobileMenu } from './utils.js'; // Import
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth & Update UI
    await checkAuthRequirement();

    // Mobile Menu
    initMobileMenu();
});
