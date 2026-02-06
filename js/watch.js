import { db, auth } from './config.js';
import { getDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, initMobileMenu, formatDate } from './utils.js';

import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc, increment, getDocs, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let userData = null;
let currentWebinarId = null;
let registrationId = null;
let reactionCount = 0;

document.addEventListener('DOMContentLoaded', async () => {
    initMobileMenu();

    // Gets Webinar ID
    const params = new URLSearchParams(window.location.search);
    currentWebinarId = params.get('id');

    if (!currentWebinarId) {
        showToast("No video specified. Redirecting...", "error");
        setTimeout(() => window.location.href = 'webinars.html', 2000);
        return;
    }

    // Init UI Handlers
    initTabs();
    initNotes();
    initTheaterMode();
    initReactions();

    // 1. Wait for Auth to Initialize
    await new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
            unsubscribe(); // Run once for init
            if (user) {
                const userSnap = await getDoc(doc(db, "users", user.uid));
                userData = userSnap.exists() ? userSnap.data() : { name: "Student", role: "student", uid: user.uid };
                // Keep uid for comparison
                userData.uid = user.uid;
                startAttendanceTracking(user.uid, currentWebinarId);
            } else {
                document.getElementById('chat-input').placeholder = "Login to chat...";
                document.getElementById('chat-input').disabled = true;
                userData = null;
            }
            resolve();
        });
    });

    // 2. Fetch Webinar Data
    try {
        const docRef = doc(db, "webinars", currentWebinarId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            renderWatchPage(data);
            initChat(currentWebinarId);
            initLiveCount();
        } else {
            renderError("Webinar Not Found", "This session may have been removed.");
        }
    } catch (e) {
        console.error(e);
        showToast("Error loading video", "error");
    }
});

// --- UI FEATURES ---

function initTabs() {
    const tabs = document.querySelectorAll('.chat-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
        });
    });
}

function initNotes() {
    const noteArea = document.getElementById('user-notes');
    const savedKey = `notes_${currentWebinarId}`;

    // Load
    const saved = localStorage.getItem(savedKey);
    if (saved) noteArea.value = saved;

    // Save on input
    noteArea.addEventListener('input', () => {
        localStorage.setItem(savedKey, noteArea.value);
    });
}

function initTheaterMode() {
    const btn = document.getElementById('theater-toggle');
    const layout = document.querySelector('.player-layout');

    if (btn && layout) {
        btn.addEventListener('click', () => {
            layout.classList.toggle('theater-mode');
            const isWide = layout.classList.contains('theater-mode');
            btn.innerHTML = isWide ? '<i class="fas fa-compress"></i> Standard' : '<i class="fas fa-expand"></i> Theater Mode';
        });
    }
}

function initReactions() {
    const btn = document.getElementById('btn-react');
    const container = document.getElementById('reaction-container');

    btn.addEventListener('click', () => {
        // 1. Show Visual
        const heart = document.createElement('div');
        heart.innerText = '❤️';
        heart.className = 'floating-heart';
        heart.style.left = Math.random() * 40 + 'px'; // Random X
        container.appendChild(heart);
        setTimeout(() => heart.remove(), 2000);

        // 2. Increment DB (Optional, throttling usually needed)
        // For now, local visual only to save writes
    });
}

function initLiveCount() {
    // Simulate live viewer count for "Wait... is it live?" feeling
    const el = document.getElementById('live-count');
    let count = Math.floor(Math.random() * (150 - 50 + 1)) + 50;
    el.innerText = count;

    setInterval(() => {
        const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
        count += change;
        if (count < 10) count = 15;
        el.innerText = count;
    }, 5000);
}

// --- CHAT & MODERATION ---

function initChat(webinarId) {
    const chatContainer = document.getElementById('chat-messages');
    const chatForm = document.getElementById('chat-form');
    const messagesRef = collection(db, `webinars/${webinarId}/messages`);
    const pinnedRef = doc(db, `webinars/${webinarId}`, "metadata");

    // Listen for Pinned Messages
    onSnapshot(pinnedRef, (doc) => {
        const pinContainer = document.getElementById('pinned-container');
        if (doc.exists() && doc.data().pinnedMessage) {
            pinContainer.innerHTML = `
                <div class="pinned-msg">
                    <i class="fas fa-thumbtack" style="color:var(--secondary);"></i>
                    <div style="flex:1;">
                        <span style="font-weight:bold; font-size:0.8rem; display:block;">Pinned</span>
                        ${doc.data().pinnedMessage}
                    </div>
                </div>`;
        } else {
            pinContainer.innerHTML = '';
        }
    });

    // Listen for Messages
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    onSnapshot(q, (snapshot) => {
        chatContainer.innerHTML = '';
        if (snapshot.empty) {
            chatContainer.innerHTML = '<div class="chat-placeholder"><p>Start the conversation! 👋</p></div>';
            return;
        }

        snapshot.forEach(docSnap => {
            const msg = docSnap.data();
            renderMessage(chatContainer, msg, docSnap.id, webinarId);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
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

function renderMessage(container, msg, msgId, webinarId) {
    const div = document.createElement('div');
    div.className = 'chat-message';

    // Check if current user is Host to show Moderation options
    const isHost = userData && userData.role === 'host';
    const modActions = isHost ? `
        <div style="margin-left:auto; display:flex; gap:5px; opacity:0; transition:opacity 0.2s;" class="mod-tools">
            <i class="fas fa-thumbtack" style="font-size:0.7rem; cursor:pointer;" title="Pin" onclick="pinMessage('${webinarId}', '${msg.text.replace(/'/g, "\\'")}')"></i>
            <i class="fas fa-trash" style="font-size:0.7rem; cursor:pointer; color:#ef4444;" title="Delete" onclick="deleteMessage('${webinarId}', '${msgId}')"></i>
        </div>
    ` : '';

    div.innerHTML = `
        <style>.chat-message:hover .mod-tools { opacity: 1 !important; }</style>
        <span class="chat-user" style="${msg.userRole === 'host' ? 'color:#ef4444;' : ''}">
            ${msg.userName}:
        </span>
        <span class="chat-text">${msg.text}</span>
        ${modActions}
    `;
    container.appendChild(div);
}

// Global actions for HTML onclicks
window.pinMessage = async (wid, text) => {
    try {
        await setDoc(doc(db, `webinars/${wid}`, "metadata"), { pinnedMessage: text }, { merge: true });
        showToast("Message Pinned", "success");
    } catch (e) { console.error(e); }
};

window.deleteMessage = async (wid, msgId) => {
    if (!confirm("Delete this message?")) return;
    try {
        await deleteDoc(doc(db, `webinars/${wid}/messages`, msgId));
        showToast("Message Deleted", "success");
    } catch (e) { console.error(e); }
};

window.toggleEmojiPicker = () => {
    const input = document.getElementById('chat-input');
    input.value += " 👍 "; // Simple mock implementation
    input.focus();
};

window.askQuestion = () => {
    // Switch to Q&A tab (simplified)
    const list = document.getElementById('qa-list');
    list.innerHTML = `<p style="padding:20px; text-align:center;">Q&A feature coming fully in v2. Use Chat for now!</p>`;
};


// --- ATTENDANCE (Unchanged) ---
async function startAttendanceTracking(userId, webinarId) {
    const q = query(collection(db, "registrations"),
        where("studentId", "==", userId),
        where("webinarId", "==", webinarId)
    );

    const snap = await getDocs(q);
    if (!snap.empty) {
        registrationId = snap.docs[0].id; // Keep existing logical flow
        // (Interval code omitted for brevity as it was unchanged, assuming kept by user context or irrelevant for this specific update, but actually I should keep it to avoid breaking feature) 
        // Re-adding the interval for safety:
        setInterval(async () => {
            if (document.visibilityState === 'visible') {
                try {
                    await updateDoc(doc(db, "registrations", registrationId), {
                        minutesWatched: increment(0.5),
                        lastWatched: serverTimestamp()
                    });
                } catch (e) { }
            }
        }, 30000);
    }
}

function renderError(title, subtitle) {
    document.getElementById('video-embed').innerHTML = `
        <div style="height:100%; display:flex; justify-content:center; align-items:center; flex-direction:column; color:var(--text-muted);">
            <h2>${title}</h2>
            <p>${subtitle}</p>
        </div>`;
}

// Jitsi Player Instance
let jitsiApi = null;

function renderWatchPage(data) {
    document.getElementById('v-title').innerText = data.title;
    document.getElementById('v-date').innerHTML = `<i class="far fa-calendar"></i> ${formatDate(data.date)}`;
    document.getElementById('v-time').innerHTML = `<i class="far fa-clock"></i> ${data.time}`;
    document.getElementById('v-host-name').innerText = data.hostName || 'NexStream Host';
    document.getElementById('v-host-avatar').innerText = (data.hostName || 'H').charAt(0).toUpperCase();

    const embedContainer = document.getElementById('video-embed');
    embedContainer.innerHTML = ''; // Clear

    // 1. NATIVE LIVE STREAM (Jitsi)
    if (data.type === 'native' && data.meetingId) {

        embedContainer.style.background = '#000';

        const isHost = userData && userData.uid === data.hostId;
        const domain = 'meet.jit.si';
        const options = {
            roomName: data.meetingId,
            width: '100%',
            height: '100%',
            parentNode: embedContainer,
            userInfo: {
                displayName: userData ? userData.name : 'Guest Student'
            },
            configOverwrite: {
                startWithAudioMuted: !isHost,
                startWithVideoMuted: !isHost,
                prejoinPageEnabled: false,
                disableDeepLinking: true,
                toolbarButtons: isHost
                    ? ['microphone', 'camera', 'desktop', 'fullscreen', 'fodeviceselection', 'hangup', 'profile', 'chat', 'settings', 'raisehand', 'videoquality', 'filmstrip', 'tileview']
                    : ['chat', 'raisehand', 'fullscreen', 'tileview'] // Restricted Viewer Toolbar
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                SHOW_WATERMARK_FOR_GUESTS: false,
                DEFAULT_REMOTE_DISPLAY_NAME: 'Student',
                TOOLBAR_ALWAYS_VISIBLE: true
            }
        };

        // Init Jitsi
        jitsiApi = new JitsiMeetExternalAPI(domain, options);

        // Host Auto-Join
        if (isHost) {
            jitsiApi.executeCommand('displayName', data.hostName);
            jitsiApi.executeCommand('subject', data.title);
        }

        return;
    }

    // 2. YOUTUBE LIVE STREAM
    const videoId = extractYouTubeID(data.youtubeUrl);

    if (videoId) {
        embedContainer.innerHTML = `
            <iframe 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0" 
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
                    <p style="color:var(--text-muted);">Waiting for host to start...</p>
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
