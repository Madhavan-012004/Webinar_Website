import { collection, query, where, onSnapshot, getDoc, doc, addDoc, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, updateGlobalHeader } from './utils.js';
import { auth, db, EMAILJS_SERVICE_ID, EMAILJS_CERT_TEMPLATE_ID, initEmailJS } from './config.js';

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
                             <button class="btn btn-primary" onclick="window.claimCertificate('${w.regId}', '${w.title.replace(/'/g, "\\'")}', '${w.hostName || ''}')">
                                <i class="fas fa-download"></i> Check & Download
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

// --- BACKGROUND CERTIFICATE GENERATION ---

// New Logic: Check Minutes Watched > Threshold
window.claimCertificate = async (regId, title, hostName) => {
    showToast("Checking eligibility...", "info");

    try {
        const regRef = doc(db, "registrations", regId);
        const regSnap = await getDoc(regRef);

        if (!regSnap.exists()) {
            showToast("Registration not found.", "error");
            return;
        }

        const data = regSnap.data();
        const watched = data.minutesWatched || 0;
        const required = 1; // DEMO: 1 minute threshold (Production: ~30)

        if (watched < required) {
            showToast(`You have watched ${Math.floor(watched)} mins. Required: ${required} mins.`, "warning");
            setTimeout(() => {
                showToast("Go to 'Recordings' to watch more!", "info");
            }, 2000);
            return;
        }

        // ELIGIBLE: Generate in Background
        generateAndSaveCertificate(regId, title, hostName, userData.name);

    } catch (e) {
        console.error(e);
        showToast("Error checking status", "error");
    }
}

async function generateAndSaveCertificate(regId, courseTitle, hostName, studentName) {
    showToast("🎉 Eligible! Generating Certificate...", "success");

    const certId = `NS-${Math.floor(100000 + Math.random() * 900000)}`;
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    try {
        // 1. Create Certificate Record
        await addDoc(collection(db, "issued_certificates"), {
            certId: certId,
            studentId: auth.currentUser.uid,
            studentName: studentName,
            courseTitle: courseTitle,
            date: date,
            hostName: hostName,
            timestamp: new Date()
        });

        // 2. Mark Registration Completed
        await updateDoc(doc(db, "registrations", regId), {
            status: "completed",
            certificateId: certId,
            completedAt: new Date()
        });

        showToast("Certificate Generated! Downloading...", "success");

        // 3. Trigger Download (Silent)
        createHiddenCertificateCanvas(studentName, courseTitle, certId, date);

        // 4. Send Email
        sendEmailWithId(userData.email, studentName, courseTitle, certId);

    } catch (e) {
        console.error("Cert Gen Error:", e);
        showToast("Error saving certificate.", "error");
    }
}

function createHiddenCertificateCanvas(student, course, id, date) {
    // This function creates an off-screen canvas/element to generate the image
    // For simplicity, we can use the existing hidden template in the HTML if available,
    // or create one dynamically.

    // Assuming 'certificate-template' exists in HTML but hidden
    const template = document.getElementById('certificate-template');
    if (template) {
        document.getElementById('certStudentName').innerText = student;
        document.getElementById('certCourseName').innerText = course;
        document.getElementById('certID').innerText = id;
        document.getElementById('certDate').innerText = date;

        // Use dom-to-image or html2canvas
        // Small delay to let text render
        setTimeout(() => {
            window.downloadCertificateImage(template, course);
        }, 500);
    }
}

window.downloadCertificateImage = (originalNode, title) => {
    // html2canvas requires the element to be in the DOM and visible.
    // If originalNode is hidden, we clone it to an off-screen container.

    let nodeToCapture = originalNode;
    let isCloned = false;

    // Check if node or its parent is hidden
    if (getComputedStyle(originalNode).display === 'none' || originalNode.offsetParent === null) {
        // Clone and put off-screen
        const clone = originalNode.cloneNode(true);
        clone.id = 'temp-cert-clone';
        clone.style.display = 'flex'; // Ensure flex layout works
        clone.style.position = 'absolute';
        clone.style.top = '-9999px';
        clone.style.left = '-9999px';
        // HTML2Canvas needs a width/height
        clone.style.width = '800px';
        clone.style.height = '560px';

        document.body.appendChild(clone);
        nodeToCapture = clone;
        isCloned = true;
    }

    showToast("Generating PDF...", "info");

    // Wait briefly for styles/fonts
    setTimeout(() => {
        html2canvas(nodeToCapture, {
            useCORS: true,
            allowTaint: true,
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false
        }).then(canvas => {
            canvas.toBlob(blob => {
                if (blob) {
                    window.saveAs(blob, `${title}_Certificate.png`);
                    if (isCloned) document.body.removeChild(nodeToCapture);
                    showToast("Download started!", "success");
                } else {
                    showToast("Error creating image blob.", "error");
                    if (isCloned) document.body.removeChild(nodeToCapture);
                }
            });
        }).catch(err => {
            console.error("Certificate Gen Error:", err);
            showToast("Failed to generate certificate.", "error");
            if (isCloned) document.body.removeChild(nodeToCapture);
        });
    }, 500);
};

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
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_CERT_TEMPLATE_ID, {
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
    const title = currentWebinar ? currentWebinar.title : "Certificate";
    window.downloadCertificateImage(node, title.replace(/\s+/g, '_'));
};

function extractYouTubeID(url) {
    if (!url) return null;
    // Standard ID extraction for watch, embed, shorts, and shorthand links
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = url.match(regex);
    return match ? match[1] : null;
}
