// =========================================
// Host Dashboard Logic
// =========================================
import { db, auth } from './config.js';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
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

    // Filter Config
    let currentFilter = 'all';
    let webinarsData = [];

    // Filter Buttons
    const btnAll = document.getElementById('filter-all');
    const btnApproved = document.getElementById('filter-approved');
    const btnPending = document.getElementById('filter-pending');

    function setActiveFilter(filter) {
        currentFilter = filter;
        // Update Buttons UI
        [btnAll, btnApproved, btnPending].forEach(btn => {
            if (btn) {
                btn.classList.remove('btn-outline');
                btn.classList.add('btn-text');
            }
        });

        const activeBtn = filter === 'all' ? btnAll : (filter === 'approved' ? btnApproved : btnPending);
        if (activeBtn) {
            activeBtn.classList.remove('btn-text');
            activeBtn.classList.add('btn-outline');
        }
        renderWebinars();
    }

    if (btnAll) btnAll.onclick = () => setActiveFilter('all');
    if (btnApproved) btnApproved.onclick = () => setActiveFilter('approved');
    if (btnPending) btnPending.onclick = () => setActiveFilter('pending');

    // REAL-TIME
    const q = query(collection(db, "webinars"), where("hostId", "==", currentUser.uid));

    onSnapshot(q, (snapshot) => {
        webinarsData = [];
        let sessionCount = snapshot.size;

        if (snapshot.empty) {
            renderEmptyState();
            updateStats(0);
            return;
        }

        snapshot.forEach(docSnap => {
            webinarsData.push({ id: docSnap.id, ...docSnap.data() });
        });

        renderWebinars();
        updateStats(sessionCount);

    }, (error) => {
        console.error("Snapshot Error:", error);
        grid.innerHTML = `<div style="text-align:center; padding:30px; color:#ef4444;">Error loading sessions</div>`;
    });

    function renderEmptyState() {
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8; background:rgba(30,41,59,0.3); border-radius:12px; border:1px dashed var(--border);">
                <i class="fas fa-plus-circle" style="font-size:2rem; margin-bottom:15px; opacity:0.5;"></i>
                <p>No sessions yet. Request your first one!</p>
            </div>
        `;
    }

    function updateStats(count) {
        const statCards = document.querySelectorAll('.stat-card h3');
        if (statCards.length > 1) statCards[1].innerText = count;
    }

    function renderWebinars() {
        let htmlBuffer = '';
        const filtered = webinarsData.filter(d => {
            if (currentFilter === 'all') return true;
            return d.status === currentFilter;
        });

        if (filtered.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted);">No ${currentFilter} sessions found.</div>`;
            return;
        }

        filtered.forEach(d => {
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
            if (d.status === 'live') {
                badgeClass = 'status-live';
                badgeText = 'Live Now';
                icon = 'fa-broadcast-tower';
            }

            // YT Preview or Placeholder
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

            let actionButton = '';

            // ALWAYS SHOW BUTTON (Fix for User Request)
            // Allows converting ANY session (YouTube/Native) to Native Live
            if (['approved', 'pending', 'live'].includes(d.status)) {
                actionButton = `
                    <button onclick="startNativeSession('${d.id}', '${d.title}')" 
                            style="width:100%; padding:10px; margin-top:15px; background:linear-gradient(135deg, #ef4444, #f43f5e); border:none; border-radius:8px; color:white; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; box-shadow:0 4px 15px rgba(239, 68, 68, 0.4);">
                        <i class="fas fa-broadcast-tower"></i> ${d.status === 'live' ? 'Resume Stream' : 'Start Live Session'}
                    </button>
                 `;
            } else if (!d.youtubeUrl && d.type !== 'native') {
                actionButton = `
                     <div style="margin-top:15px; padding:10px; text-align:center; background:rgba(255,255,255,0.05); border-radius:8px; color:var(--text-muted); font-size:0.9rem;">
                        Waiting for Link...
                     </div>
                `;
            }

            const card = `
                <div style="background:var(--bg-card); border:1px solid var(--border); border-radius:16px; padding:20px; position:relative; transition:0.3s; animation: fadeIn 0.5s;">
                    <button onclick="deleteWebinar('${d.id}')" style="position:absolute; top:15px; right:15px; background:transparent; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem;" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                    
                    <span class="status-badge ${badgeClass}" style="position:absolute; top:15px; left:15px;">
                        <i class="fas ${icon}"></i> ${badgeText}
                    </span>

                    <div style="margin-top:40px;">
                        ${mediaPreview}
                        <h4 style="font-size:1.1rem; margin-bottom:10px; color:white;">${d.title}</h4>
                        <div style="font-size:0.9rem; color:var(--text-muted); display:flex; flex-direction:column; gap:8px;">
                            <span style="color:var(--accent); font-size:0.8rem; text-transform:uppercase; letter-spacing:1px; font-weight:bold;">${d.category || 'General'}</span>
                            <span><i class="far fa-calendar"></i> ${d.date} at ${d.time}</span>
                            <span><i class="fas fa-tag"></i> ${d.price > 0 ? '$' + d.price : 'Free'}</span>
                            ${d.type === 'native' || d.status === 'live' ? `<span style="color:#ef4444; font-weight:bold;"><i class="fas fa-bolt"></i> Native Live</span>` : ''}
                            ${d.youtubeUrl && d.type !== 'native' ? `<span style="color:#ef4444;"><i class="fab fa-youtube"></i> Linked</span>` : ''}
                        </div>
                        ${actionButton}
                    </div>
                </div>
            `;
            htmlBuffer += card;
        });

        grid.innerHTML = htmlBuffer;
    }
}

// Global Start Function
window.startNativeSession = async (id, title) => {
    try {
        const meetingId = `MAD-${id}-${Date.now()}`; // Unique Jitsi Room
        await updateDoc(doc(db, "webinars", id), {
            status: 'live',
            meetingId: meetingId,
            isLive: true,
            type: 'native' // FORCE native type
        });
        // Redirect to Watch Page as Host
        window.location.href = `watch.html?id=${id}`;
    } catch (e) {
        console.error(e);
        showToast("Error starting session", "error");
    }
};

async function handleHostRequest(e) {
    e.preventDefault();
    if (!currentUser) return showToast("Login required", "error");

    const title = document.getElementById('w-title').value;
    const category = document.getElementById('w-category').value;
    const date = document.getElementById('w-date').value;
    const time = document.getElementById('w-time').value;
    const price = document.getElementById('w-price').value;
    const mode = document.getElementById('w-mode').value;
    const youtubeUrl = document.getElementById('w-youtube')?.value || "";
    const syllabus = document.getElementById('w-syllabus')?.value || "No syllabus provided.";

    try {
        // --- VALIDATION: Prevent Past Dates ---
        const selectedDate = new Date(date + 'T' + time);
        const now = new Date();

        if (selectedDate < now) {
            return showToast("Cannot schedule a webinar in the past!", "error");
        }
        // --------------------------------------

        await addDoc(collection(db, "webinars"), {
            title, category, date, time, price,
            type: mode,
            youtubeUrl: mode === 'youtube' ? youtubeUrl : '',
            syllabus: syllabus, // Saving Syllabus
            hostId: currentUser.uid,
            hostName: currentUser.displayName || "Host",
            status: "pending",
            createdAt: new Date()
        });

        showToast("Request Submitted to Admin!", "success");
        document.getElementById('create-modal').style.display = 'none';
        document.getElementById('schedule-form').reset();
        // Filtering will auto-update via snapshot
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
    } catch (e) {
        showToast("Error deleting", "error");
    }
}
