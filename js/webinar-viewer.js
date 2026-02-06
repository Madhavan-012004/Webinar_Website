// =========================================
// Webinar Viewer (Public/Student)
// =========================================
import { collection, query, where, onSnapshot, addDoc, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, updateGlobalHeader } from './utils.js';
import { auth, db } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    initRealtimeWebinars();
    setupRegModal();
    initFilters();

    // Event Delegation for Register Buttons
    const grid = document.getElementById('webinar-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.btn-register');
            if (btn) {
                const id = btn.dataset.id;
                const title = btn.dataset.title;
                const syllabus = btn.dataset.syllabus;
                if (window.openRegModal) {
                    window.openRegModal(id, title, syllabus);
                }
            }
        });
    }
});

let currentWebinarDocs = [];
let registeredIds = new Set();
let currentCategory = 'All';
let currentSearch = '';
let currentUser = null;

auth.onAuthStateChanged(async (user) => {
    let role = 'student';
    if (user) {
        currentUser = user;
        // Fetch role
        try {
            const uSnap = await getDoc(doc(db, "users", user.uid));
            if (uSnap.exists()) role = uSnap.data().role || 'student';
        } catch (e) { console.error("Error fetching role", e); }

        updateGlobalHeader(user, role);

        const qReg = query(collection(db, "registrations"), where("studentId", "==", user.uid));
        onSnapshot(qReg, (snap) => {
            registeredIds = new Set(snap.docs.map(d => d.data().webinarId));
            renderWebinars(); // Re-render when registrations load/change
        });
    } else {
        updateGlobalHeader(null);
        currentUser = null;
        registeredIds.clear();
        renderWebinars();
    }
});

function initFilters() {
    // Chips
    const chips = document.querySelectorAll('.filter-chip');
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            // UI Toggle
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            // Logic
            currentCategory = chip.innerText;
            renderWebinars();
        });
    });

    // Search
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        // Check URL Params
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('search');
        if (searchQuery) {
            searchInput.value = searchQuery;
            currentSearch = searchQuery.toLowerCase();
        }

        searchInput.addEventListener('input', (e) => {
            currentSearch = e.target.value.toLowerCase();
            renderWebinars();
        });
    }
}

function initRealtimeWebinars() {
    const grid = document.getElementById('webinar-grid');
    if (!grid) return;

    // REAL-TIME LISTENER (onSnapshot)
    // Fetch all and filter client side to avoid Missing Index issues for "in" queries
    const q = query(collection(db, "webinars"));

    onSnapshot(q, (snapshot) => {
        // Filter for Approved OR Live
        currentWebinarDocs = snapshot.docs.filter(doc => {
            const s = doc.data().status;
            return s === 'approved' || s === 'live';
        });
        renderWebinars();
    });
}

function renderWebinars() {
    const grid = document.getElementById('webinar-grid');
    if (!grid) return;

    // Client-side Filter
    let filteredDocs = currentWebinarDocs.filter(docSnap => {
        const d = docSnap.data();

        // 1. Search Filter
        const matchesSearch = d.title.toLowerCase().includes(currentSearch) ||
            (d.hostName && d.hostName.toLowerCase().includes(currentSearch));

        // 2. Category Filter (Mock logic if category field missing, or check if matches)
        // Since we don't have a reliable category field in the schema we saw earlier, 
        // we'll assume 'All' passes everything. 
        // If we want to support categories, we'd check d.category === currentCategory.
        // For now, let's just do 'All' check.
        const matchesCategory = currentCategory === 'All' || (d.category && d.category === currentCategory);

        return matchesSearch && matchesCategory;
    });

    if (filteredDocs.length === 0) {
        grid.innerHTML = "<div style='grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8;'>No matching sessions found.</div>";
        return;
    }

    let html = "";
    filteredDocs.forEach(docSnap => {
        const d = docSnap.data();
        const isRegistered = registeredIds.has(docSnap.id);

        let mediaContent = '';
        if (d.youtubeUrl) {
            const videoId = extractYouTubeID(d.youtubeUrl);
            if (videoId) {
                mediaContent = `
                   <div class="w-thumb video-mode">
                       <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg">
                       <div class="play-overlay">
                            <i class="fas fa-play"></i>
                       </div>
                   </div>`;
            } else {
                mediaContent = `<div class="w-thumb"><img src="https://via.placeholder.com/400x250/1e293b/ffffff?text=${encodeURIComponent(d.title)}"></div>`;
            }
        } else {
            mediaContent = `<div class="w-thumb"><img src="https://via.placeholder.com/400x250/1e293b/ffffff?text=${encodeURIComponent(d.title)}"></div>`;
        }

        const buttonHtml = isRegistered
            ? `<a href="watch.html?id=${docSnap.id}" class="btn btn-primary btn-sm btn-watch">
                 <i class="fas fa-play"></i> Watch
               </a>`
            : `<button class="btn btn-outline btn-sm btn-register" 
                 data-id="${docSnap.id}" 
                 data-title="${d.title.replace(/"/g, '&quot;')}"
                 data-syllabus="${(d.syllabus || '').replace(/"/g, '&quot;')}"
               >
                 Register
               </button>`;

        const card = `
            <div class="w-card">
                ${mediaContent}
                <div class="w-content">
                    <div class="w-meta">
                        <span><i class="far fa-calendar"></i> ${d.date}</span>
                        <span><i class="far fa-clock"></i> ${d.time}</span>
                    </div>
                    <h3 class="w-title">${d.title}</h3>
                    <div class="w-host">
                         <div class="host-avatar">${(d.hostName || 'H').charAt(0)}</div>
                         <span>${d.hostName || 'Host'}</span>
                    </div>
                    <div class="w-footer">
                        <span class="w-price ${d.price == 0 ? 'free' : 'paid'}">
                            ${d.price > 0 ? '$' + d.price : 'Free'}
                        </span>
                        ${buttonHtml}
                    </div>
                </div>
            </div>`;
        html += card;
    });

    grid.innerHTML = html;
}

// MODAL LOGIC
function setupRegModal() {
    const modal = document.getElementById('regModal');
    const closeBtn = document.getElementById('closeRegModal');
    const form = document.getElementById('regForm');

    window.openRegModal = (id, title, syllabus) => {
        if (!currentUser) {
            if (typeof showToast === 'function') {
                showToast("Please Login to Register", "warning");
            } else {
                alert("Please Login to Register");
            }
            setTimeout(() => window.location.href = 'login.html', 1500);
            return;
        }

        const m_id = document.getElementById('reg-wid');
        const m_title = document.getElementById('reg-wtitle');
        const m_header = document.getElementById('reg-webinar-title');
        const m_syllabus = document.getElementById('reg-syllabus-content');

        if (m_id) m_id.value = id;
        if (m_title) m_title.value = title;
        if (m_header) m_header.innerText = title;
        if (m_syllabus) m_syllabus.innerText = syllabus || "No syllabus provided by the host.";

        // Auto-fill if possible
        const m_name = document.getElementById('reg-name');
        const m_email = document.getElementById('reg-email');

        if (m_name && currentUser.displayName) m_name.value = currentUser.displayName;
        if (m_email && currentUser.email) m_email.value = currentUser.email;

        modal.style.display = 'flex';
    };

    if (closeBtn) closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (e) => { if (e.target == modal) modal.style.display = 'none'; };

    if (form) form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = form.querySelector('button');
        const orgText = btn.innerText;

        const wid = document.getElementById('reg-wid').value;
        const wtitle = document.getElementById('reg-wtitle').value;
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const phone = document.getElementById('reg-phone').value;

        try {
            btn.innerText = "Registering...";
            btn.disabled = true;

            await addDoc(collection(db, "registrations"), {
                webinarId: wid,
                webinarTitle: wtitle,
                studentId: currentUser.uid,
                studentName: name,
                studentEmail: email,
                studentPhone: phone,
                registeredAt: new Date().toISOString()
            });

            showToast("Registration Successful!", "success");
            modal.style.display = 'none';

        } catch (err) {
            console.error(err);
            showToast("Registration Failed", "error");
        } finally {
            btn.innerText = orgText;
            btn.disabled = false;
        }
    });
}

function extractYouTubeID(url) {
    // Added 'live/' to the regex
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

// Expose toast for inline clicks
window.showToast = showToast;
