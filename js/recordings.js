import { db, auth } from './config.js';
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, initMobileMenu, formatDate, updateGlobalHeader } from './utils.js';

document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            updateGlobalHeader(user, 'student'); // Default role, specific role fetch if needed
            loadRecordings(user);
        } else {
            // Show login prompt
            document.getElementById('recordings-grid').innerHTML = `
                <div style="grid-column:1/-1; text-align:center;">
                    <h3>Please Log In</h3>
                    <p>You need to be logged in to access your recordings.</p>
                    <a href="login.html" class="btn btn-primary" style="margin-top:10px;">Log In</a>
                </div>
            `;
        }
    });
});

async function loadRecordings(user) {
    const grid = document.getElementById('recordings-grid');

    try {
        // 1. Get Registrations
        const q = query(collection(db, "registrations"), where("studentId", "==", user.uid));
        const regSnaps = await getDocs(q);

        if (regSnaps.empty) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted);">No sessions found.</div>`;
            return;
        }

        // 2. Fetch Webinars in Parallel
        const promises = regSnaps.docs.map(async (reg) => {
            const data = reg.data();
            const wSnap = await getDoc(doc(db, "webinars", data.webinarId));
            if (wSnap.exists()) return { ...wSnap.data(), id: wSnap.id };
            return null;
        });

        const allWebinars = (await Promise.all(promises)).filter(w => w !== null);

        // 3. Filter for PAST events (Recordings)
        const now = new Date();
        const recordings = allWebinars.filter(w => {
            const wDate = new Date(w.date + 'T' + w.time);
            return wDate < now; // It's in the past
        });

        if (recordings.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-muted);">You have no past sessions to re-watch.</div>`;
            return;
        }

        // 4. Render
        grid.innerHTML = recordings.map(w => `
            <div class="webinar-card">
                <div class="thumb">
                    <img src="https://img.youtube.com/vi/${extractYouTubeID(w.youtubeUrl) || ''}/mqdefault.jpg" onerror="this.src='https://via.placeholder.com/300x180?text=No+Preview'">
                    <div class="tag" style="background:var(--secondary);">RECORDED</div>
                </div>
                <div class="details">
                    <h3 style="font-size:1.1rem; margin-bottom:10px;">${w.title}</h3>
                    <div class="meta">
                         <span><i class="far fa-calendar"></i> ${formatDate(w.date)}</span>
                    </div>
                    <a href="watch.html?id=${w.id}" class="btn-card">
                        <i class="fas fa-play"></i> Watch Recording
                    </a>
                </div>
            </div>
        `).join('');

    } catch (e) {
        console.error(e);
        showToast("Error loading recordings", "error");
    }
}

function extractYouTubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
