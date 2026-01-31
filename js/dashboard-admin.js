// =========================================
// Admin Dashboard Logic
// =========================================
import { db } from './config.js'; // Relative import
import { collection, query, where, onSnapshot, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast } from './utils.js'; // Relative import
import { checkAuthRequirement } from './auth-guard.js'; // Relative import

document.addEventListener('DOMContentLoaded', async () => {
    const authData = await checkAuthRequirement();
    if (authData && authData.role === 'admin') {
        loadAdminDashboard();
        window.adminAction = adminAction; // Expose for inline onclick
    }
});

async function loadAdminDashboard() {
    // REAL-TIME LISTENER
    const q = query(collection(db, "webinars"), where("status", "==", "pending"));

    // Returns unsubscriber
    onSnapshot(q, (snapshot) => {
        // Update Stats
        const statPending = document.getElementById('stat-pending');
        if (statPending) statPending.innerText = snapshot.size;

        const grid = document.getElementById('admin-requests-grid');
        if (!grid) return;

        // Render Empty State or Grid
        if (snapshot.empty) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 60px; background: rgba(30, 41, 59, 0.3); border-radius: 16px; border: 1px dashed var(--border);">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #10b981; margin-bottom: 20px; opacity: 0.8;"></i>
                    <h3 style="color: white; margin-bottom: 10px;">All Caught Up!</h3>
                    <p style="color: var(--text-muted);">No pending requests to review.</p>
                </div>`;
            return;
        }

        grid.innerHTML = ''; // Clear header loader

        snapshot.forEach(docSnap => {
            const d = docSnap.data();

            // Extract YT ID for preview if available
            let videoPreview = '';
            if (d.youtubeUrl && d.youtubeUrl.includes('v=')) {
                const vidId = d.youtubeUrl.split('v=')[1].split('&')[0];
                videoPreview = `<img src="https://img.youtube.com/vi/${vidId}/mqdefault.jpg" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:15px; border:1px solid var(--border);">`;
            }

            const card = `
                <div class="request-card" style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 25px; transition: 0.3s; position: relative;">
                    <div style="position: absolute; top: 20px; right: 20px;">
                        <span style="font-size: 0.8rem; background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 20px; color: var(--text-muted);">
                            <i class="far fa-clock"></i> Pending
                        </span>
                    </div>

                    ${videoPreview}

                    <h3 style="margin-bottom: 10px; font-size: 1.3rem;">${d.title}</h3>
                    
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                        <div style="width: 32px; height: 32px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                            ${(d.hostName || 'H').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p style="margin: 0; font-size: 0.9rem; font-weight: 600;">${d.hostName}</p>
                            <p style="margin: 0; font-size: 0.8rem; color: var(--text-muted);">Host</p>
                        </div>
                    </div>

                    <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-bottom: 20px; font-size: 0.9rem; color: var(--text-muted);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span><i class="far fa-calendar"></i> Date:</span>
                            <span style="color: white;">${d.date}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                            <span><i class="far fa-clock"></i> Time:</span>
                            <span style="color: white;">${d.time}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span><i class="fas fa-tag"></i> Price:</span>
                            <span style="color: ${d.price > 0 ? 'var(--accent)' : '#10b981'}; font-weight: bold;">
                                ${d.price > 0 ? '$' + d.price : 'Free'}
                            </span>
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px;">
                        <button onclick="adminAction('${docSnap.id}', 'rejected')" 
                                style="flex: 1; padding: 12px; border-radius: 10px; border: 1px solid #ef4444; background: transparent; color: #ef4444; cursor: pointer; transition: 0.2s;"
                                onmouseover="this.style.background='#ef4444'; this.style.color='white'"
                                onmouseout="this.style.background='transparent'; this.style.color='#ef4444'">
                            Reject
                        </button>
                        <button onclick="adminAction('${docSnap.id}', 'approved')" 
                                style="flex: 1; padding: 12px; border-radius: 10px; border: none; background: #10b981; color: white; cursor: pointer; font-weight: 600; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
                            Approve
                        </button>
                    </div>
                </div>
            `;
            grid.innerHTML += card;
        });
    });
}

async function adminAction(id, status) {
    try {
        await updateDoc(doc(db, "webinars", id), { status: status });
        showToast(`Webinar ${status}!`);
        loadAdminDashboard();
    } catch (e) {
        console.error(e);
        showToast("Action failed", "error");
    }
}
