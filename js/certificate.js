import { collection, query, where, onSnapshot, getDoc, doc, addDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, updateGlobalHeader } from './utils.js';
import { auth, db, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, initEmailJS } from './config.js';

let player;
let progressInterval;
let currentWebinar = null;
let isUnlocked = false;
let userData = null;

const REQUIRED_PERCENTAGE = 50;

// Global callback for YouTube API
window.onYouTubeIframeAPIReady = () => {
    console.log("YouTube API Ready");
};

document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.style.display = navMenu.style.display === 'flex' ? 'none' : 'flex';
            navMenu.style.flexDirection = 'column';
            navMenu.style.position = 'absolute';
            navMenu.style.top = '100%';
            navMenu.style.left = '0';
            navMenu.style.width = '100%';
            navMenu.style.background = 'rgba(15, 23, 42, 0.95)';
            navMenu.style.padding = '20px';
        });
    }

    auth.onAuthStateChanged(async (user) => {
        let role = 'student';
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                userData = userDoc.data();
                role = userData.role || 'student';
            }
            initClaimableWebinars(user);
            initEmailJS();
        } else {
            showLoginMessage();
        }
        updateGlobalHeader(user, role);
    });

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('certIdInput').value.trim();
            if (id) searchCertificateById(id);
        });
    }
});

function showLoginMessage() {
    const grid = document.getElementById('webinar-list-grid');
    if (grid) {
        grid.innerHTML = `
            <div style="grid-column:1/-1; text-align:center; padding:60px; background:rgba(30,41,59,0.3); border-radius:12px;">
                <h3 style="color:white; margin-bottom:15px;">Please Log In</h3>
                <p style="color:#94a3b8; margin-bottom:20px;">You need to be logged in to claim certificates.</p>
                <a href="login.html" class="btn btn-primary">Log In</a>
            </div>
        `;
    }
}

function initClaimableWebinars(user) {
    const grid = document.getElementById('webinar-list-grid');
    if (!grid) return;

    const q = query(collection(db, "registrations"), where("studentId", "==", user.uid));

    onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            grid.innerHTML = "<div style='grid-column:1/-1; text-align:center; padding:50px; color:#94a3b8;'>You haven't registered for any webinars yet. <br><a href='webinars.html' style='color:var(--primary);'>Browse Webinars</a></div>";
            return;
        }

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
        webinars.forEach(w => {
            const videoId = extractYouTubeID(w.youtubeUrl);
            const card = `
                <div class="webinar-card" style="background:var(--bg-card); border:var(--border); border-radius:15px; overflow:hidden;">
                    <div style="height:180px; position:relative;">
                        <img src="${videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : 'https://via.placeholder.com/400x250'}" style="width:100%; height:100%; object-fit:cover;">
                        <div style="position:absolute; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center;">
                             <button class="btn btn-primary" onclick="window.startLesson('${w.id}', '${videoId}', '${w.title.replace(/'/g, "\\'")}', '${w.regId}')">
                                <i class="fas fa-play"></i> Watch to Earn
                             </button>
                        </div>
                    </div>
                    <div style="padding:20px;">
                        <h4 style="margin:0 0 10px 0; color:white;">${w.title}</h4>
                        <p style="color:var(--text-muted); font-size:0.85rem; margin-bottom:15px;">Hosted by ${w.hostName || 'NexStream Host'}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.8rem; color:var(--accent); font-weight:600;"><i class="fas fa-certificate"></i> Verified Certificate</span>
                            <span style="font-size:0.75rem; color:var(--text-muted);">${w.date}</span>
                        </div>
                    </div>
                </div>
            `;
            html += card;
        });
        grid.innerHTML = html;
    });
}

window.startLesson = (id, videoId, title, regId) => {
    if (!videoId || videoId === 'null') {
        showToast("Invalid YouTube URL.", "error");
        return;
    }
    currentWebinar = { id, videoId, title, regId };
    isUnlocked = false;
    document.getElementById('uiCourseName').innerText = title;
    document.getElementById('progressText').innerText = "Progress: 0%";
    document.getElementById('progressBar').style.width = "0%";
    document.getElementById('statusBadge').innerHTML = '<i class="fas fa-lock"></i> Locked';
    document.getElementById('statusBadge').style.color = "#ef4444";
    document.getElementById('certificate-wrapper').style.display = 'none';
    document.getElementById('certificate-classroom').style.display = 'block';
    document.getElementById('webinar-list-grid').style.display = 'none';
    const videoWrapper = document.getElementById('video-wrapper');
    videoWrapper.innerHTML = `
        <div id="player-loading" style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#000; color:white; z-index:1;">
            <i class="fas fa-circle-notch fa-spin fa-2x" style="margin-bottom:15px; color:var(--primary);"></i>
            <span>Initializing Secure Player...</span>
        </div>
        <div id="youtube-player" style="position:absolute; top:0; left:0; width:100%; height:100%;"></div>
    `;
    if (window.YT && window.YT.Player) {
        initPlayer(videoId);
    } else {
        let retries = 0;
        const checkAPI = setInterval(() => {
            if (window.YT && window.YT.Player) {
                clearInterval(checkAPI);
                initPlayer(videoId);
            } else if (retries > 10) {
                clearInterval(checkAPI);
                showToast("Player failed to load.", "error");
            }
            retries++;
        }, 500);
    }
    document.getElementById('certificate-classroom').scrollIntoView({ behavior: "smooth" });
};

window.closeClassroom = () => {
    if (player) {
        player.destroy();
        player = null;
    }
    clearInterval(progressInterval);
    document.getElementById('certificate-classroom').style.display = 'none';
    document.getElementById('webinar-list-grid').style.display = 'grid';
};

function initPlayer(videoId) {
    if (player) {
        player.destroy();
    }

    player = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
            'autoplay': 1,
            'modestbranding': 1,
            'rel': 0,
            'origin': window.location.origin === 'null' ? undefined : window.location.origin
        },
        events: {
            'onReady': (event) => {
                document.getElementById('player-loading').style.display = 'none';
                event.target.playVideo();
            },
            'onStateChange': onPlayerStateChange,
            'onError': (e) => {
                console.error("YT Player Error:", e.data);
                let msg = "Video playback error.";
                if (e.data === 101 || e.data === 150) msg = "This video cannot be embedded. Please contact the host.";
                showToast(msg, "error");
                document.getElementById('player-loading').innerHTML = `<span style='color:#ef4444;'>${msg}</span>`;
            }
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data == YT.PlayerState.PLAYING) {
        startTracking();
    } else {
        stopTracking();
    }
}

function startTracking() {
    progressInterval = setInterval(() => {
        if (player && player.getDuration) {
            const duration = player.getDuration();
            const currentTime = player.getCurrentTime();
            if (duration > 0) {
                const percentage = (currentTime / duration) * 100;
                updateProgressUI(percentage);

                if (percentage >= REQUIRED_PERCENTAGE && !isUnlocked) {
                    unlockCertificate();
                }
            }
        }
    }, 1000);
}

function stopTracking() {
    clearInterval(progressInterval);
}

function updateProgressUI(percentage) {
    const capped = Math.min(Math.round(percentage), 100);
    document.getElementById('progressText').innerText = `Progress: ${capped}%`;
    document.getElementById('progressBar').style.width = `${capped}%`;
}

async function unlockCertificate() {
    isUnlocked = true;

    const statusBadge = document.getElementById('statusBadge');
    statusBadge.innerHTML = '<i class="fas fa-unlock"></i> Unlocked';
    statusBadge.style.color = "#10b981";

    const certId = `NS-${currentWebinar.id.substring(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const studentName = userData ? userData.name : "Student";
    const courseTitle = currentWebinar.title;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    // Fill UI
    document.getElementById('certStudentName').innerText = studentName;
    document.getElementById('certCourseName').innerText = courseTitle;
    document.getElementById('certID').innerText = certId;
    document.getElementById('certDate').innerText = date;

    // Show certificate section
    document.getElementById('certificate-wrapper').style.display = 'block';

    showToast("Certificate Unlocked! 🏅");

    // Persist to DB
    try {
        // Save to issued_certificates
        await addDoc(collection(db, "issued_certificates"), {
            certId: certId,
            studentId: auth.currentUser.uid,
            studentName: studentName,
            courseTitle: courseTitle,
            date: date,
            timestamp: new Date()
        });

        // Mark registration as completed with certId
        if (currentWebinar.regId) {
            await updateDoc(doc(db, "registrations", currentWebinar.regId), {
                status: "completed",
                certificateId: certId,
                completedAt: new Date()
            });
        }

        // Send Email
        sendEmailWithId(userData.email, studentName, courseTitle, certId);
    } catch (error) {
        console.error("Error saving certificate:", error);
    }
}

async function sendEmailWithId(email, name, course, id) {
    if (!email) return;
    try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: email,
            user_name: name,
            course_name: course,
            cert_id: id
        });
        showToast("Certificate ID sent to your email! 📧");
    } catch (err) {
        console.warn("Email failed to send:", err);
    }
}

async function searchCertificateById(id) {
    const resultBox = document.getElementById('search-result-box');
    const detailText = document.getElementById('searchCertDetail');

    showToast("Searching...");

    try {
        const q = query(collection(db, "issued_certificates"), where("certId", "==", id));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            showToast("No certificate found with this ID.", "error");
            resultBox.style.display = 'none';
            return;
        }

        const data = snapshot.docs[0].data();
        currentWebinar = { title: data.courseTitle }; // For filename

        // Fill Template
        document.getElementById('certStudentName').innerText = data.studentName;
        document.getElementById('certCourseName').innerText = data.courseTitle;
        document.getElementById('certID').innerText = data.certId;
        document.getElementById('certDate').innerText = data.date;

        detailText.innerText = `${data.courseTitle} for ${data.studentName}`;
        resultBox.style.display = 'block';
        resultBox.scrollIntoView({ behavior: 'smooth' });

        showToast("Certificate Found! ✅");
    } catch (err) {
        console.error("Search error:", err);
        showToast("Error searching for certificate.", "error");
    }
}

window.downloadCertificate = () => {
    const node = document.getElementById('certificate-template');

    // Scale for high quality
    const scale = 2;
    const style = {
        transform: 'scale(' + scale + ')',
        transformOrigin: 'top left',
        width: node.offsetWidth + 'px',
        height: node.offsetHeight + 'px'
    };

    const param = {
        height: node.offsetHeight * scale,
        width: node.offsetWidth * scale,
        quality: 1,
        style: style
    };

    domtoimage.toBlob(node, param)
        .then(function (blob) {
            const fileName = `${currentWebinar.title.replace(/\s+/g, '_')}_Certificate.png`;
            window.saveAs(blob, fileName);
        })
        .catch(function (error) {
            console.error('Error generating certificate:', error);
            showToast("Error generating certificate image.");
        });
};

function extractYouTubeID(url) {
    if (!url) return null;
    // Standard ID extraction for watch, embed, shorts, and shorthand links
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}
