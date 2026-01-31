// =========================================
// Student Dashboard Logic (My Learning)
// =========================================
import { db, auth } from './config.js';
import { collection, query, where, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, updateGlobalHeader, initMobileMenu, formatDate } from './utils.js';

let currentUser = null;

// Re-use auth observer to ensure we have user
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        initMobileMenu(); // Fix Mobile Menu

        // Fetch role for header
        let role = 'student';
        try {
            const uSnap = await getDoc(doc(db, "users", user.uid));
            if (uSnap.exists()) role = uSnap.data().role || 'student';
        } catch (e) { console.error(e); }

        updateGlobalHeader(user, role);
        loadRegistrations();
    } else {
        window.location.href = 'login.html';
    }
});

async function loadRegistrations() {
    const grid = document.getElementById('learning-grid');
    if (!grid) return;

    // Get my registrations
    const q = query(collection(db, "registrations"), where("studentId", "==", currentUser.uid));

    onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: rgba(30, 41, 59, 0.3); border-radius: 12px; border: 1px dashed var(--border);">
                    <i class="fas fa-book-open" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 20px; opacity: 0.5;"></i>
                    <h3 style="color: white; margin-bottom: 10px;">No Enrollments Yet</h3>
                    <p style="color: var(--text-muted); margin-bottom: 20px;">Explore our upcoming webinars to start learning.</p>
                    <a href="webinars.html" class="btn btn-primary">Browse Webinars</a>
                </div>`;
            return;
        }

        // Parallel Fetching for Performance
        const promises = snapshot.docs.map(async (regSnap) => {
            const regResult = regSnap.data();
            try {
                const wSnap = await getDoc(doc(db, "webinars", regResult.webinarId));
                if (wSnap.exists()) return { ...wSnap.data(), id: wSnap.id };
            } catch (e) { console.error(e); }
            return null;
        });

        const webinars = (await Promise.all(promises)).filter(w => w !== null);

        if (webinars.length === 0) {
            grid.innerHTML = "<div style='grid-column:1/-1; text-align:center;'>No details available.</div>";
            return;
        }

        let html = '';
        webinars.forEach(w => {
            // Determine Action Button
            let actionBtn = `<button class="btn btn-outline" style="width:100%; opacity:0.5; cursor:not-allowed;">Not Started Yet</button>`;

            if (w.youtubeUrl) {
                // Check for live link
                actionBtn = `<a href="${w.youtubeUrl}" target="_blank" class="btn btn-primary" style="width:100%; display:block; text-align:center;">
                    <i class="fas fa-play-circle"></i> Join Now
                </a>`;
            }

            // Card
            html += `
            <div class="w-card" style="border-top: 4px solid var(--secondary);">
                 <div class="w-content" style="padding-top:20px;">
                    <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.85rem; margin-bottom:10px;">
                        <span><i class="far fa-calendar"></i> ${formatDate(w.date)}</span>
                        <span><i class="far fa-clock"></i> ${w.time}</span>
                    </div>
                    <h3 class="w-title" style="margin-bottom:10px;">${w.title}</h3>
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:20px;">
                         <div style="width:25px; height:25px; background:#4f46e5; border-radius:50%; display:flex; justify-content:center; align-items:center; color:white; font-size:10px;">${(w.hostName || 'H').charAt(0)}</div>
                         <span style="color:#94a3b8; font-size:0.85rem;">Hosted by ${w.hostName}</span>
                    </div>
                    
                    <!-- Attendance Section -->
                    <div style="margin-top: auto;">
                        ${actionBtn}
                    </div>
                </div>
            </div>`;
        });

        grid.innerHTML = html;
    });
}
