// =========================================
// Auth Guard & RBAC
// =========================================
import { auth, db } from './config.js'; // Relative import
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updateGlobalHeader } from './utils.js';

export async function checkAuthRequirement() {
    const path = window.location.pathname;

    // Returns a promise that resolves when auth state is settled
    return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe(); // Run once

            if (!user) {
                // Not logged in
                updateGlobalHeader(null); // Ensure "Login" is shown

                if (path.includes('host.html') || path.includes('admin.html')) {
                    window.location.href = 'login.html';
                }
                resolve(null);
            } else {
                // Logged in - Check Role
                const userDoc = await getDoc(doc(db, "users", user.uid));
                const role = userDoc.exists() ? userDoc.data().role : 'student';

                // Update Header Globally
                updateGlobalHeader(user, role);

                // Enforce RBAC
                if (path.includes('host.html') && role !== 'host') {
                    alert("Access Denied: Hosts Only");
                    window.location.href = 'index.html';
                }
                if (path.includes('admin.html') && role !== 'admin') {
                    alert("Access Denied: Admins Only");
                    window.location.href = 'index.html';
                }

                resolve({ user, role });
            }
        });
    });
}
