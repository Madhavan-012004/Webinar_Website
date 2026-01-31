// =========================================
// Home Page Logic
// =========================================
import { checkAuthRequirement } from './auth-guard.js';
import { db, auth } from './config.js';
import { initMobileMenu, extractYouTubeID } from './utils.js';
import { getDoc, doc, collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth & Update UI
    await checkAuthRequirement();

    // Mobile Menu
    initMobileMenu();

    // Load Featured Content
    loadFeaturedWebinar();
});

async function loadFeaturedWebinar() {
    try {
        const q = query(collection(db, "webinars"), orderBy("date", "desc"), limit(1));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();
            updateHeroCard(docSnap.id, data);
        } else {
            console.log("No webinars found for featured card.");
        }
    } catch (error) {
        console.error("Error loading featured webinar:", error);
    }
}

function updateHeroCard(id, data) {
    // 1. Update Text
    document.getElementById('hero-title').innerText = data.title || "Untitled Session";
    document.getElementById('hero-host').innerText = `with ${data.hostName || "NexStream Host"}`;

    // 2. Update Image
    // If usage of Youtube URL, try to get thumbnail, else use a default or the placeholder in HTML
    const videoId = extractYouTubeID(data.youtubeUrl);
    if (videoId) {
        const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        document.getElementById('hero-img').src = thumbUrl;
    }

    // 3. Make Clickable
    const card = document.getElementById('hero-live-card');
    card.onclick = () => {
        window.location.href = `watch.html?id=${id}`;
    };

    // 4. Randomize Viewer Count for "Live" feel
    const randomViewers = Math.floor(Math.random() * (1500 - 200 + 1)) + 200;
    document.getElementById('hero-count').innerText = randomViewers.toLocaleString();

    // 5. Check "Live" Status (Simple date check)
    const eventDate = new Date(data.date + "T" + data.time);
    const now = new Date();
    const badge = document.getElementById('hero-badge');

    // If event is in the future > 24h
    if (eventDate > now) {
        // Upcoming
        badge.innerHTML = `<i class="far fa-calendar-alt"></i> UPCOMING`;
        badge.style.background = "rgba(6, 182, 212, 0.8)"; // Cyan
        badge.style.border = "1px solid var(--accent)";
    } else {
        // Assume Live or Recent
        badge.innerHTML = `<i class="fas fa-circle"></i> LIVE NOW`; // Keep the pulsed red look
    }
}
