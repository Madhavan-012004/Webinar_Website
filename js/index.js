// =========================================
// Home Page Logic
// =========================================
import { checkAuthRequirement } from './auth-guard.js';
import { db, auth } from './config.js';
import { initMobileMenu, extractYouTubeID } from './utils.js';
import { getDoc, doc, collection, query, orderBy, limit, getDocs, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', async () => {
    // Check Auth & Update UI
    await checkAuthRequirement();

    // Mobile Menu
    initMobileMenu();

    // Search Functionality
    const searchBtn = document.getElementById('hero-search-btn');
    const searchInput = document.getElementById('hero-search-input');
    const resultsPanel = document.getElementById('search-results-floating');

    if (searchInput && resultsPanel) {
        let webinars = [];

        // Fetch approved webinars for live search
        const fetchWebinars = async () => {
            try {
                const q = query(collection(db, "webinars"), where("status", "==", "approved"));
                const snap = await getDocs(q);
                webinars = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (e) {
                console.error("Error fetching webinars for search", e);
            }
        };
        fetchWebinars();

        searchInput.addEventListener('input', () => {
            const queryText = searchInput.value.trim().toLowerCase();
            if (queryText.length > 0) {
                const filtered = webinars.filter(w =>
                    w.title.toLowerCase().includes(queryText) ||
                    (w.hostName && w.hostName.toLowerCase().includes(queryText))
                ).slice(0, 5); // Limit to 5 results

                renderResults(filtered);
                resultsPanel.classList.remove('hidden');
            } else {
                resultsPanel.classList.add('hidden');
            }
        });

        const renderResults = (results) => {
            if (results.length === 0) {
                resultsPanel.innerHTML = '<div class="no-results">No matches found</div>';
                return;
            }

            resultsPanel.innerHTML = results.map(w => {
                const videoId = extractYouTubeID(w.youtubeUrl);
                const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 'https://via.placeholder.com/60x40';
                return `
                    <div class="search-result-item" onclick="window.location.href='watch.html?id=${w.id}'">
                        <img src="${thumb}" class="result-thumb">
                        <div class="result-info">
                            <h5>${w.title}</h5>
                            <span>${w.hostName || 'NexStream Host'}</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        // Close results on outside click
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsPanel.contains(e.target)) {
                resultsPanel.classList.add('hidden');
            }
        });

        // Search Button click still redirects to Explore with query
        const performSearch = () => {
            const query = searchInput.value.trim();
            if (query) {
                window.location.href = `webinars.html?search=${encodeURIComponent(query)}`;
            }
        };
        if (searchBtn) searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    // Dynamic Hero Stats (Animation)tent
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
