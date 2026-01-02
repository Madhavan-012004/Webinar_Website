// --- 1. INIT ON LOAD ---
document.addEventListener('DOMContentLoaded', () => {
    initDatabase();
    updateAuthUI();
    renderPageContent();
    startGlobalTimer(); // Start the Timer Loop
    startHeroSlider();  // 🔥 Start Image Slider
});

// --- 2. CUSTOM TOAST NOTIFICATION SYSTEM (New UI) ---
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return; 

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = type === 'success' ? 'fa-circle-check' : (type === 'error' ? 'fa-circle-exclamation' : 'fa-info-circle');
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- 3. HERO SLIDER LOGIC ---
function startHeroSlider() {
    const slides = document.querySelectorAll('.hero-slide');
    if (slides.length === 0) return;

    let currentSlide = 0;
    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 4000); // Change image every 4 seconds
}

// --- HELPER: DATABASE ---
function getCurrentUser() { return JSON.parse(localStorage.getItem('lh_session')); }
function setCurrentUser(user) { localStorage.setItem('lh_session', JSON.stringify(user)); }
function logout() { 
    localStorage.removeItem('lh_session'); 
    showToast("Logged out successfully!", "info");
    setTimeout(() => window.location.href = 'index.html', 1000);
}

function getWebinars() { return JSON.parse(localStorage.getItem('lh_webinars')) || []; }
function saveWebinars(data) { localStorage.setItem('lh_webinars', JSON.stringify(data)); }

function getRegistrations() { return JSON.parse(localStorage.getItem('lh_registrations')) || []; }
function saveRegistrations(data) { localStorage.setItem('lh_registrations', JSON.stringify(data)); }

function getNotifs() { return JSON.parse(localStorage.getItem('lh_notifs')) || []; }
function saveNotifs(data) { localStorage.setItem('lh_notifs', JSON.stringify(data)); }

function getUsersDB() { return JSON.parse(localStorage.getItem('lh_users_db')) || []; }
function saveUsersDB(users) { localStorage.setItem('lh_users_db', JSON.stringify(users)); }

// --- 4. INITIALIZE DB ---
function initDatabase() {
    let users = getUsersDB();
    // Default Admins added as per your request
    if (!users.find(u => u.email === 'admin')) {
        users.push({ name: "ANIESH ADMIN", email: "admin", pass: "admin123", role: "Admin", college: "N/A" });
        saveUsersDB(users);
    }
    if (!users.find(u => u.email === 'admin2')) {
        users.push({ name: "MADHAVAN ADMIN", email: "admin2", pass: "admin123", role: "Admin", college: "N/A" });
        saveUsersDB(users);
    }
}

// --- 5. UI & NAVBAR ---
function updateAuthUI() {
    const user = getCurrentUser();
    const navBtn = document.getElementById('navLoginBtn');
    const navbar = document.querySelector('.navbar');
    
    // Clean up
    document.getElementById('userProfileArea')?.remove();
    document.getElementById('mySubmissionsModal')?.remove();
    document.getElementById('adminReqLink')?.remove(); 

    if (user) {
        if(navBtn) navBtn.style.display = 'none';

        // Admin Link Check
        if (user.role === 'Admin') {
            const navLinks = document.querySelector('.nav-links');
            if(navLinks && !document.getElementById('adminReqLink')) {
                const reqLi = document.createElement('li'); reqLi.id = 'adminReqLink';
                reqLi.innerHTML = `<a href="requests.html" style="color: #F59E0B; font-weight: bold;">Requests</a>`;
                navLinks.appendChild(reqLi);
            }
        }

        const avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${user.name}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
        
        // Notifications Filter
        const notifs = getNotifs();
        const myNotifs = notifs.filter(n => n.target === user.name || (user.role === 'Admin' && n.target === 'Admin'));
        const unreadCount = myNotifs.filter(n => !n.read).length;

        const profileHTML = `
            <div id="userProfileArea" class="nav-profile" onclick="toggleDropdown(event)">
                <div class="notif-box" onclick="showNotifs(event)">
                    <i class="fa-regular fa-bell"></i>
                    ${unreadCount > 0 ? `<div class="notif-dot"></div>` : ''}
                </div>
                ${user.role === 'Admin' ? '<span class="admin-badge">ADMIN</span>' : ''}
                <img src="${avatarUrl}" class="profile-pic" alt="Profile">
                
                <div class="profile-dropdown" id="profileMenu">
                    <div style="padding: 10px 15px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 5px;">
                        <div style="color: white; font-weight: bold;">${user.name}</div>
                        <div style="color: var(--text-gray); font-size: 0.8rem;">${user.role}</div>
                    </div>
                    ${user.role === 'Admin' ? `<div class="dropdown-item" onclick="window.location.href='requests.html'"><i class="fa-solid fa-list-check"></i> Admin Requests</div>` : ''}
                    <div class="dropdown-item" onclick="openMySubmissions()"><i class="fa-solid fa-file-signature"></i> My Submissions</div>
                    <div class="dropdown-item logout-btn" onclick="logout()"><i class="fa-solid fa-right-from-bracket"></i> Logout</div>
                </div>
            </div>
        `;
        navbar.insertAdjacentHTML('beforeend', profileHTML);
        injectMySubmissionsModal();
    } else {
        if(navBtn) navBtn.style.display = 'flex';
    }
}

// --- 6. WEBINAR RENDERING ---
function renderWebinarsDOM(filterType) {
    const container = document.getElementById('dynamicWebinars');
    if(!container) return;

    const user = getCurrentUser();
    const allWebinars = getWebinars();
    const registrations = getRegistrations();

    const approvedData = allWebinars.filter(w => w.status === 'approved');
    const filtered = filterType === 'all' ? approvedData : approvedData.filter(w => w.type === filterType);

    if (filtered.length === 0) {
        container.innerHTML = `<div class="glass-box" style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-gray);">No upcoming webinars found.</div>`;
        return;
    }

    container.innerHTML = filtered.map(w => {
        const isRegistered = user && registrations.find(r => r.userId === user.email && r.webinarId === w.id);
        let actionButtonHTML = '';

        if (isRegistered) {
            actionButtonHTML = `<div class="timer-badge" id="timer-${w.id}" data-date="${w.date}" data-link="${w.meetingLink}">Loading Timer...</div>`;
        } else {
            actionButtonHTML = `<button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="handleRegister(${w.id}, '${w.title}')">Register</button>`;
        }

        return `
        <div class="glass-box webinar-card" style="text-align: left; animation: fadeIn 0.5s ease;">
            <span style="background:${w.type === 'Free' ? 'rgba(0, 229, 158, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; color:${w.type === 'Free' ? 'var(--primary)' : 'var(--warning)'}; padding: 5px 12px; border-radius: 20px; font-size: 0.8rem;">${w.type}</span>
            <h3 style="margin: 15px 0;">${w.title}</h3>
            <p style="color: var(--text-gray); font-size: 0.9rem; margin-bottom: 20px;"><i class="fa-solid fa-user-circle"></i> ${w.speaker} &nbsp;|&nbsp; ${w.date} | ${w.time}</p>
            ${actionButtonHTML}
        </div>`;
    }).join('');
}

// --- 7. TIMER & LINK LOGIC ---
function startGlobalTimer() {
    setInterval(() => {
        const timerElements = document.querySelectorAll('.timer-badge');
        const now = new Date().getTime();

        timerElements.forEach(el => {
            const dateStr = el.getAttribute('data-date'); 
            const link = el.getAttribute('data-link'); 
            const eventDate = new Date(`${dateStr}T09:00:00`).getTime(); 
            const distance = eventDate - now;

            if (distance < 0) {
                el.outerHTML = `<button class="btn btn-attend" onclick="window.open('${link}', '_blank')"><i class="fa-solid fa-video"></i> Attend Session</button>`;
            } else {
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                el.innerHTML = `Starts in: ${days}d ${hours}h ${minutes}m ${seconds}s`;
            }
        });
    }, 1000);
}

// --- 8. OPEN HOST MODAL ---
function openHostModal() {
    const user = getCurrentUser();
    if (!user) {
        showToast("Please Login to submit a proposal!", "error"); // Replaced Alert
        openAuthModal('login');
        return;
    }
    document.getElementById('hostModal').style.display = 'flex';
}

// --- 9. HOST FORM SUBMIT ---
document.getElementById('hostForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const user = getCurrentUser();

    if (!user) { showToast("Please Login!", "error"); return; }

    const newWebinar = {
        id: Date.now(),
        title: document.getElementById('w_title').value,
        speaker: document.getElementById('w_speaker').value,
        date: document.getElementById('w_date').value,
        time: document.getElementById('w_time').value, // Added Time
        type: document.getElementById('w_type').value,
        meetingLink: "",
        status: 'pending',
        requestedBy: user.name
    };

    const data = getWebinars();
    data.push(newWebinar);
    saveWebinars(data);

    addNotification('Admin', `New Request: "${newWebinar.title}" by ${user.name}`);

    showToast("✅ Proposal Submitted! Waiting for Admin Approval.", "success");
    closeHostModal();
    openMySubmissions();
});

// --- 10. ADMIN ACTIONS ---
function renderAdminRequests() {
    const list = document.getElementById('requestsList');
    if(!list) return;

    const pendingData = getWebinars().filter(w => w.status === 'pending');

    if(pendingData.length === 0) {
        list.innerHTML = `<div class="glass-box" style="grid-column:1/-1; text-align:center;">No Pending Requests</div>`;
        return;
    }

    list.innerHTML = pendingData.map(w => `
        <div class="glass-box" style="text-align: left;">
            <div style="display:flex; justify-content:space-between;"><span style="background:rgba(255,255,255,0.1); padding:4px 8px; border-radius:4px; font-size:0.8rem;">${w.type}</span><small style="color:var(--text-gray);">By: ${w.requestedBy}</small></div>
            <h3 style="margin:10px 0;">${w.title}</h3>
            <p style="color:var(--text-gray); font-size:0.9rem;">Speaker: ${w.speaker} | Date: ${w.date} | Time: ${w.time || '09:00'}</p>
            <div style="display:flex; gap:10px; margin-top:15px;">
                <button class="btn btn-primary" onclick="adminAction(${w.id}, 'approve')" style="flex:1; justify-content:center;">Approve</button>
                <button class="btn btn-outline" onclick="adminAction(${w.id}, 'deny')" style="flex:1; justify-content:center; border-color:#ef4444; color:#ef4444;">Deny</button>
            </div>
        </div>
    `).join('');
}

function adminAction(id, action) {
    let data = getWebinars();
    const index = data.findIndex(w => w.id === id);
    if(index === -1) return;

    if(action === 'approve') {
        let link = prompt("Enter Meeting Link (Google Meet/Zoom):");
        if (!link || link.trim() === "") { showToast("❌ Link Required for Approval!", "error"); return; }

        data[index].meetingLink = link;
        data[index].status = 'approved';
        addNotification(data[index].requestedBy, `✅ Approved: "${data[index].title}"`);
        showToast("✅ Approved & Published!", "success");
    } else {
        addNotification(data[index].requestedBy, `❌ Rejected: "${data[index].title}"`);
        data.splice(index, 1);
        showToast("🚫 Request Denied.", "info");
    }
    
    saveWebinars(data);
    renderAdminRequests();
}

// --- 11. HELPERS (Auth, Modals, Notifs) ---
function renderPageContent() {
    if (document.getElementById('dynamicWebinars')) renderWebinarsDOM('all');
    else if (document.getElementById('requestsList')) renderAdminRequests();
}

function addNotification(target, msg) { const n=getNotifs(); n.push({id:Date.now(), target, msg, read:false}); saveNotifs(n); }

function showNotifs(e) { 
    e.stopPropagation(); 
    const u = getCurrentUser(); 
    const n = getNotifs(); 
    
    // Filter User Notifications
    const my = n.filter(x => x.target === u.name || (u.role === 'Admin' && x.target === 'Admin')); 
    
    if(my.length == 0) {
        showToast("No new notifications.", "info");
    } else { 
        // Showing count in Toast instead of big alert
        showToast(`You have ${my.length} notifications. Check 'My Submissions'.`, "info");
        
        // Simple Alert for details (since list is long) or we can make a modal later
        // For now, sticking to your previous format but cleaning up
        let t = "📢 Your Notifications:\n\n"; 
        my.forEach(x => t += `• ${x.msg}\n`); 
        alert(t); // Keeping alert ONLY for reading the list, as toast is small
        
        // Mark read
        const o = n.filter(x => !(x.target === u.name || (u.role === 'Admin' && x.target === 'Admin'))); 
        saveNotifs(o); 
        updateAuthUI(); 
    } 
}

function toggleDropdown(e) { e.stopPropagation(); document.getElementById('profileMenu').classList.toggle('show'); }
window.onclick=(e)=>{ document.getElementById('profileMenu')?.classList.remove('show'); if(e.target.className==='modal') e.target.style.display='none'; }
function openAuthModal(m) { document.getElementById('authModal').style.display='flex'; switchTab(m); }
function closeAuthModal() { document.getElementById('authModal').style.display='none'; }
function closeHostModal() { document.getElementById('hostModal').style.display='none'; }
function closeRegModal() { document.getElementById('regModal').style.display='none'; }

function switchTab(t) { 
    const l=document.getElementById('loginForm'), s=document.getElementById('signupForm'), lb=document.getElementById('tab-login'), sb=document.getElementById('tab-signup'); 
    if(t==='login'){l.style.display='block';s.style.display='none';lb.style.background='#00E59E';lb.style.color='black';sb.background='transparent';sb.style.color='gray';}
    else{l.style.display='none';s.style.display='block';sb.style.background='#00E59E';sb.style.color='black';lb.background='transparent';lb.color='gray';} 
}

function toggleCollegeField() { document.getElementById('collegeField').style.display = document.getElementById('s_role').value==='Student'?'block':'none'; }

// Auth Listeners
document.getElementById('loginForm')?.addEventListener('submit',e=>{
    e.preventDefault(); 
    const email=document.getElementById('l_email').value.trim(), pass=document.getElementById('l_pass').value.trim(); 
    const u=getUsersDB().find(x=>x.email===email&&x.pass===pass); 
    if(u){
        setCurrentUser(u); 
        showToast(`✅ Welcome back, ${u.name}!`, "success");
        setTimeout(() => location.reload(), 1500);
    } else {
        showToast("❌ Invalid Credentials", "error");
    }
});

document.getElementById('signupForm')?.addEventListener('submit',e=>{
    e.preventDefault(); 
    const name=document.getElementById('s_name').value, email=document.getElementById('s_email').value, pass=document.getElementById('s_pass').value, role=document.getElementById('s_role').value, college=document.getElementById('s_college').value; 
    const db=getUsersDB(); 
    if(db.find(x=>x.email===email)){ showToast("⚠️ User Exists! Login instead.", "error"); return; } 
    db.push({name,email,pass,role,college}); 
    saveUsersDB(db); 
    showToast("🎉 Account Created! Please Login.", "success"); 
    switchTab('login');
});

function filterWebinars(t,b){ document.querySelectorAll('.tab-btn').forEach(x=>{x.classList.remove('active');x.style.background='transparent';x.style.color='gray';}); b.classList.add('active'); b.style.background='#00E59E'; b.style.color='black'; renderWebinarsDOM(t); }

function handleRegister(id, title) {
    const user = getCurrentUser();
    if (!user) { showToast("Please Login to Register!", "error"); openAuthModal('login'); return; }
    document.getElementById('regModal').style.display = 'flex';
    document.getElementById('regTopic').innerText = title;
    document.getElementById('regForm').setAttribute('data-wid', id); 
    if(user.name) document.getElementById('r_name').value = user.name;
    if(user.email) document.getElementById('r_email').value = user.email;
}

document.getElementById('regForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const webinarId = parseInt(this.getAttribute('data-wid'));
    const user = getCurrentUser();
    const regs = getRegistrations();
    if (regs.find(r => r.userId === user.email && r.webinarId === webinarId)) { showToast("Already registered!", "info"); closeRegModal(); return; }
    regs.push({ userId: user.email, webinarId: webinarId, date: new Date().toISOString() });
    saveRegistrations(regs);
    showToast("✅ Registration Successful!", "success"); 
    closeRegModal(); 
    renderWebinarsDOM('all');
});

function injectMySubmissionsModal() {
    const h = `<div id="mySubmissionsModal" class="modal"><div class="modal-content" style="max-width:500px;text-align:left;border:1px solid var(--primary);"><h2 style="text-align:center;">My Submissions</h2><div id="mySubList" style="max-height:300px;overflow-y:auto;"></div><p onclick="document.getElementById('mySubmissionsModal').style.display='none'" style="margin-top:20px;cursor:pointer;text-align:center;color:gray;">Close</p></div></div>`;
    if(!document.getElementById('mySubmissionsModal')) document.body.insertAdjacentHTML('beforeend', h);
}
function openMySubmissions() {
    const user = getCurrentUser(); const list = document.getElementById('mySubList');
    if(!user || !list) return;
    const myReqs = getWebinars().filter(w => w.requestedBy === user.name);
    if (myReqs.length === 0) list.innerHTML = `<p style="text-align:center;color:gray;">No requests yet.</p>`;
    else list.innerHTML = myReqs.map(w => {
        let color = w.status === 'approved' ? '#00E59E' : '#F59E0B';
        return `<div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:10px;margin-bottom:10px;border-left:4px solid ${color};"><h4 style="margin:0;color:white;">${w.title}</h4><div style="display:flex;justify-content:space-between;margin-top:5px;font-size:0.85rem;color:gray;"><span>${w.date}</span><span style="color:${color};font-weight:bold;">${w.status.toUpperCase()}</span></div></div>`;
    }).join('');
    document.getElementById('mySubmissionsModal').style.display = 'flex';
}