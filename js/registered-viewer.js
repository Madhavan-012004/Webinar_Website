// =========================================
// Registered Webinars Viewer
// =========================================
import { collection, query, where, onSnapshot, getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, updateGlobalHeader } from './utils.js';
import { auth, db } from './config.js';

document.addEventListener('DOMContentLoaded', () => {
    // Wait for auth to be ready
    auth.onAuthStateChanged(async (user) => {
        let role = 'student';

        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                role = userDoc.data().role || 'student';
            }
        }

        updateGlobalHeader(user, role);

        if (user) {
            initRegisteredWebinars(user);
        } else {
            // Not logged in
            const grid = document.getElementById('registered-grid');
            if (grid) {
                grid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:60px;">
                        <h3 style="color:white; margin-bottom:15px;">Please Log In</h3>
                        <p style="color:#94a3b8; margin-bottom:20px;">You need to be logged in to view your registered sessions.</p>
                        <a href="login.html" class="btn btn-primary">Log In</a>
                    </div>
                `;
            }
        }
    });
});

function initRegisteredWebinars(user) {
    const grid = document.getElementById('registered-grid');
    if (!grid) return;

    const q = query(collection(db, "registrations"), where("studentId", "==", user.uid));

    onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            grid.innerHTML = "<div style='grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8;'>You haven't registered for any webinars yet. <br><a href='webinars.html' style='color:var(--primary);'>Browse Webinars</a></div>";
            return;
        }

        // Fetch details for all registered webinars
        // Note: Ideally we'd optimize this (e.g., fetch all needed IDs or have data denormalized).
        // For waiting list size < 100, Promise.all is fine.

        const webinarPromises = snapshot.docs.map(async (regDoc) => {
            const data = regDoc.data();
            const webDocRef = doc(db, "webinars", data.webinarId);
            const webSnap = await getDoc(webDocRef);
            if (webSnap.exists()) {
                return { id: webSnap.id, ...webSnap.data(), regId: regDoc.id };
            }
            return null;
        });

        const webinars = (await Promise.all(webinarPromises)).filter(w => w !== null);

        if (webinars.length === 0) {
            grid.innerHTML = "<div style='grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8;'>No details found for your registered sessions.</div>";
            return;
        }

        let html = "";
        webinars.forEach(d => {

            // Video Preview / Placeholder
            let mediaContent = '';
            let videoId = null;
            if (d.youtubeUrl) {
                videoId = extractYouTubeID(d.youtubeUrl);
            }

            // If we have a video ID, we usually show a thumbnail.
            // On Click of "Watch", we replace the thumbnail with the iframe.
            // Using a unique ID for the container to target it.
            const containerId = `vid-container-${d.id}`;

            if (videoId) {
                mediaContent = `
                   <div id="${containerId}" class="video-container" style="position:relative; height:200px; overflow:hidden;">
                       <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" style="width:100%; height:100%; object-fit:cover;">
                       <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.6); padding:15px; border-radius:50%;">
                            <i class="fas fa-play" style="color:white; font-size: 1.2rem;"></i>
                       </div>
                   </div>`;
            } else {
                mediaContent = `<div class="w-thumb"><img src="https://via.placeholder.com/400x250/1e293b/ffffff?text=${encodeURIComponent(d.title)}"></div>`;
            }

            const buttonHtml = videoId
                ? `<a href="watch.html?id=${d.id}" class="btn btn-primary" style="width:100%; margin-top:10px; display:block; text-align:center; text-decoration:none;">
                     <i class="fas fa-play-circle"></i> Watch Session
                   </a>`
                : `<button class="btn btn-secondary" style="width:100%; margin-top:10px;" disabled>
                     <i class="fas fa-clock"></i> Stream Not Available
                   </button>`;

            const card = `
                <div class="w-card">
                    ${mediaContent}
                    <div class="w-content">
                        <div style="display:flex; justify-content:space-between; color:#94a3b8; font-size:0.85rem; margin-bottom:10px;">
                            <span><i class="far fa-calendar"></i> ${d.date}</span>
                            <span><i class="far fa-clock"></i> ${d.time}</span>
                        </div>
                        <h3 class="w-title">${d.title}</h3>
                        <p style="color:#94a3b8; font-size:0.9rem; margin-bottom:15px; flex:1;">
                            Hosted by ${d.hostName || 'NexStream Host'}
                        </p>
                        
                        <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:15px;">
                            ${buttonHtml}
                        </div>
                    </div>
                </div>`;
            html += card;
        });

        grid.innerHTML = html;
    });
}

// Global function to play video
window.playVideo = (containerId, videoId) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen></iframe>
    `;
};

function extractYouTubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
