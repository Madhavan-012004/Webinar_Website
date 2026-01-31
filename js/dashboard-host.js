// =========================================
// Host Dashboard Logic
// =========================================
import { db, auth } from './config.js';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, formatDate, initMobileMenu } from './utils.js';
import { checkAuthRequirement } from './auth-guard.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();
    const authData = await checkAuthRequirement();
    if (authData) {
        currentUser = authData.user;
        loadHostDashboard();

        // Event Listeners
        const scheduleForm = document.getElementById('schedule-form');
        if (scheduleForm) scheduleForm.addEventListener('submit', handleHostRequest);

        // Expose delete to window for inline onclicks (legacy support)
        window.deleteWebinar = deleteWebinar;
    }
});

async function loadHostDashboard() {
    const grid = document.getElementById('host-webinars-grid');
    if (!grid || !currentUser) return;

    // REAL-TIME
    const q = query(collection(db, "webinars"), where("hostId", "==", currentUser.uid));

    // Returns unsubscriber
    onSnapshot(q, (snapshot) => {

        let sessionCount = snapshot.size;

        if (snapshot.empty) {
            grid.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8; background:rgba(30,41,59,0.3); border-radius:12px; border:1px dashed var(--border);">
                    <i class="fas fa-plus-circle" style="font-size:2rem; margin-bottom:15px; opacity:0.5;"></i>
                    <p>No sessions yet. Request your first one!</p>
                </div>
            `;
            // Update Stat (Sessions Hosted)
            const statCards = document.querySelectorAll('.stat-card h3');
            if (statCards.length > 1) statCards[1].innerText = 0;
            return;
        }

        grid.innerHTML = ''; // Clear

        snapshot.forEach(docSnap => {
            const d = docSnap.data();

            let badgeClass = 'status-pending';
            let badgeText = 'Pending';
            let icon = 'fa-clock';

            if (d.status === 'approved') {
                badgeClass = 'status-upcoming';
                badgeText = 'Approved';
                icon = 'fa-check-circle';
            }
            if (d.status === 'rejected') {
                badgeClass = 'status-ended';
                badgeText = 'Rejected';
                icon = 'fa-times-circle';
            }

            // YT Preview
            let mediaPreview = '';
            if (d.youtubeUrl && d.youtubeUrl.includes('v=')) {
                const vidId = d.youtubeUrl.split('v=')[1].split('&')[0];
                mediaPreview = `<div style="height:140px; overflow:hidden; border-radius:8px; margin-bottom:15px; border:1px solid var(--border);">
                    <img src="https://img.youtube.com/vi/${vidId}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover;">
                </div>`;
            } else {
                mediaPreview = `<div style="height:140px; background:rgba(255,255,255,0.02); display:flex; align-items:center; justify-content:center; border-radius:8px; margin-bottom:15px; border:1px solid var(--border);">
                    <i class="fas fa-video" style="font-size:2rem; color:var(--text-muted); opacity:0.3;"></i>
                </div>`;
            }

            const card = `
                <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:20px; position:relative; transition:0.3s;">
                    <button onclick="deleteWebinar('${docSnap.id}')" style="position:absolute; top:15px; right:15px; background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem;" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    
                    <span class="status-badge ${badgeClass}" style="position:absolute; top:15px; left:15px;">
                        <i class="fas ${icon}"></i> ${badgeText}
                    </span>

                    <div style="margin-top:40px;">
                        ${mediaPreview}
                        <h4 style="font-size:1.1rem; margin-bottom:10px; color:white;">${d.title}</h4>
                        <div style="font-size:0.9rem; color:var(--text-muted); display:flex; flex-direction:column; gap:8px;">
                            <span><i class="far fa-calendar"></i> ${d.date} at ${d.time}</span>
                            <span><i class="fas fa-tag"></i> ${d.price > 0 ? '$' + d.price : 'Free'}</span>
                            ${d.youtubeUrl ? `<span style="color:#ef4444;"><i class="fab fa-youtube"></i> Linked</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
            grid.innerHTML += card;
        });

        // Update Stat count (2nd card in stats-grid usually)
        const statCards = document.querySelectorAll('.stat-card h3');
        if (statCards.length > 1) statCards[1].innerText = sessionCount;
    });
}

async function handleHostRequest(e) {
    e.preventDefault();
    if (!currentUser) return showToast("Login required", "error");

    const title = document.getElementById('w-title').value;
    const date = document.getElementById('w-date').value;
    const time = document.getElementById('w-time').value;
    const price = document.getElementById('w-price').value;
    const youtubeUrl = document.getElementById('w-youtube')?.value || "";

    try {
        // --- VALIDATION: Prevent Past Dates ---
        const selectedDate = new Date(date + 'T' + time);
        const now = new Date();

        if (selectedDate < now) {
            return showToast("Cannot schedule a webinar in the past!", "error");
        }
        // --------------------------------------

        await addDoc(collection(db, "webinars"), {
            title, date, time, price,
            youtubeUrl, // New Field
            hostId: currentUser.uid,
            hostName: currentUser.displayName || "Host",
            status: "pending",
            createdAt: new Date()
        });

        showToast("Request Submitted to Admin!", "success");
        document.getElementById('create-modal').style.display = 'none';
        document.getElementById('schedule-form').reset();
        loadHostDashboard();

    } catch (err) {
        console.error(err);
        showToast("Error submitting request", "error");
    }
}

// Set Min Date to Today on Load
document.getElementById('openRequestModalBtn')?.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('w-date');
    if (dateInput) dateInput.min = today;
});

async function deleteWebinar(id) {
    if (!confirm("Are you sure you want to delete this session?")) return;
    try {
        await deleteDoc(doc(db, "webinars", id));
        showToast("Session Deleted.");
        loadHostDashboard();
    } catch (e) {
        showToast("Error deleting", "error");
    }
}
