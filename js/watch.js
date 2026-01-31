import { db, auth } from './config.js';
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, initMobileMenu, formatDate } from './utils.js';

import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, increment, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userData = null;
let currentWebinarId = null;
let registrationId = null;

document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();

    // Get Webinar ID from URL
    const params = new URLSearchParams(window.location.search);
    currentWebinarId = params.get('id');

    if (!currentWebinarId) {
        showToast("No video specified. Redirecting...", "error");
        setTimeout(() => window.location.href = 'webinars.html', 2000);
        return;
    }

    try {
        const docRef = doc(db, "webinars", currentWebinarId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            renderWatchPage(data);
            initChat(currentWebinarId); // Initialize Chat
        } else {
            renderError("Webinar Not Found", "This session may have been removed.");
        }
    } catch (e) {
        console.error(e);
        showToast("Error loading video", "error");
    }

    // Auth & Attendance
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Fetch basic user info for chat
            const userSnap = await getDoc(doc(db, "users", user.uid));
            if (userSnap.exists()) {
                userData = userSnap.data();
            } else {
                userData = { name: "Student", role: "student" };
            }

            // Start Attendance Tracking
            startAttendanceTracking(user.uid, currentWebinarId);
        } else {
            // Disable Chat Input if not logged in
            document.getElementById('chat-input').placeholder = "Login to chat...";
            document.getElementById('chat-input').disabled = true;
        }
    });
});

// --- CHAT FUNCTIONALITY ---
function initChat(webinarId) {
    const chatContainer = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const messagesRef = collection(db, `webinars/${webinarId}/messages`);

    // Listen for messages
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    onSnapshot(q, (snapshot) => {
        chatContainer.innerHTML = '';
        if (snapshot.empty) {
            chatContainer.innerHTML = '<div class="chat-placeholder"><p>Start the conversation! 👋</p></div>';
            return;
        }

        snapshot.forEach(doc => {
            const msg = doc.data();
            renderMessage(chatContainer, msg);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight; // Auto scroll
    });

    // Send Message
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('chat-input');
        const text = input.value.trim();

        if (!text || !userData) return;

        try {
            await addDoc(messagesRef, {
                text: text,
                userId: auth.currentUser.uid,
                userName: userData.name || "User",
                userRole: userData.role || "student",
                timestamp: serverTimestamp()
            });
            input.value = '';
        } catch (err) {
            console.error(err);
            showToast("Failed to send", "error");
        }
    });
}

function renderMessage(container, msg) {
    const div = document.createElement('div');
    div.className = 'chat-message';
    div.innerHTML = `
        <span class="chat-user" style="${msg.userRole === 'host' ? 'color:#ef4444;' : ''}">
            ${msg.userName}:
        </span>
        <span class="chat-text">${msg.text}</span>
    `;
    container.appendChild(div);
}

// --- ATTENDANCE TRACKING ---
async function startAttendanceTracking(userId, webinarId) {
    // 1. Find Registration Doc ID
    const q = query(collection(db, "registrations"),
        where("studentId", "==", userId),
        where("webinarId", "==", webinarId)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
        registrationId = snap.docs[0].id;
        console.log("Tracking attendance for reg:", registrationId);

        // Update every 30 seconds
        setInterval(async () => {
            if (document.visibilityState === 'visible') { // Only if tab is active
                try {
                    await updateDoc(doc(db, "registrations", registrationId), {
                        minutesWatched: increment(0.5), // Increment by 0.5 mins (30s)
                        lastWatched: serverTimestamp()
                    });
                } catch (e) {
                    console.error("Attendance sync failed", e);
                }
            }
        }, 30000); // 30s interval
    }
}

function renderError(title, subtitle) {
    document.getElementById('video-embed').innerHTML = `
        <div style="height:100%; display:flex; justify-content:center; align-items:center; flex-direction:column; color:var(--text-muted);">
            <h2>${title}</h2>
            <p>${subtitle}</p>
        </div>`;
}

function renderWatchPage(data) {
    // 1. Title & Meta
    document.getElementById('v-title').innerText = data.title;
    document.getElementById('v-date').innerHTML = `<i class="far fa-calendar"></i> ${formatDate(data.date)}`;
    document.getElementById('v-time').innerHTML = `<i class="far fa-clock"></i> ${data.time}`;

    // 2. Host
    document.getElementById('v-host-name').innerText = data.hostName || 'NexStream Host';
    document.getElementById('v-host-avatar').innerText = (data.hostName || 'H').charAt(0).toUpperCase();

    // 3. Player
    const videoId = extractYouTubeID(data.youtubeUrl);
    const embedContainer = document.getElementById('video-embed');

    if (videoId) {
        embedContainer.innerHTML = `
            <iframe 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1" 
                title="${data.title}"
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen>
            </iframe>
        `;
    } else {
        embedContainer.innerHTML = `
            <div style="height:100%; display:flex; justify-content:center; align-items:center; background:#000; color:white;">
                <div style="text-align:center;">
                    <i class="fas fa-video-slash" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
                    <h3>Stream Not Available</h3>
                    <p style="color:var(--text-muted);">The host hasn't provided a valid video link yet.</p>
                </div>
            </div>
        `;
    }
}

function extractYouTubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
