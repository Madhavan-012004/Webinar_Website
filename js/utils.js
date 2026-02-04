// =========================================
// Utility Functions
// =========================================
import { auth } from './config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export function showToast(msg, type = 'success') {
    const box = document.getElementById('toast-box');
    if (!box) {
        // Create if missing
        const newBox = document.createElement('div');
        newBox.id = 'toast-box';
        document.body.appendChild(newBox);
    }

    // Check again
    const container = document.getElementById('toast-box');

    const div = document.createElement('div');
    div.className = 'toast';
    div.style.borderLeftColor = type === 'error' ? '#ef4444' : '#10b981';
    div.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
        <span>${msg}</span>
    `;
    container.appendChild(div);
    setTimeout(() => div.remove(), 4000);
}

export function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
}

export function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000);
}

export function updateGlobalHeader(user, role = 'student') {
    const authContainer = document.getElementById('auth-container') || document.querySelector('.auth-buttons');
    if (!authContainer) return;

    if (user) {
        // Create Profile UI
        authContainer.innerHTML = `
            <div style="position: relative;">
                <div id="profileTrigger" class="profile-trigger">
                    <div class="trigger-avatar">
                        ${(user.displayName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span class="trigger-name">${user.displayName || 'User'}</span>
                    <i class="fas fa-chevron-down trigger-icon"></i>
                </div>

                <div id="profileDropdown" class="profile-dropdown">
                    <div class="profile-header">
                        <div class="profile-avatar">
                            ${(user.displayName || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div class="profile-info">
                            <h4>${user.displayName || 'User'}</h4>
                            <span>${user.email || ''}</span>
                            <span style="text-transform: capitalize; color: var(--accent); margin-top: 2px; font-size: 0.7rem; border: 1px solid var(--accent); padding: 0 4px; border-radius: 4px; width: fit-content;">${role}</span>
                        </div>
                    </div>
                    
                    <a href="profile.html" class="dropdown-item">
                        <i class="fas fa-user-circle"></i> My Profile
                    </a>

                    <a href="registered.html" class="dropdown-item">
                        <i class="fas fa-calendar-alt"></i> My Schedule
                    </a>

                    <a href="recordings.html" class="dropdown-item">
                        <i class="fas fa-play-circle" style="color: var(--secondary);"></i> My Recordings
                    </a>
                    
                    ${role === 'host' ? `
                    <a href="host.html" class="dropdown-item">
                        <i class="fas fa-microphone-alt"></i> Creator Studio
                    </a>` : ''}
                    
                    ${role === 'admin' ? `
                    <a href="admin.html" class="dropdown-item">
                        <i class="fas fa-shield-alt"></i> Admin Panel
                    </a>` : ''}

                    <a href="requests.html" class="dropdown-item">
                        <i class="fas fa-headset"></i> Support
                    </a>

                    <div class="dropdown-item logout" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </div>
                </div>
            </div>
        `;

        // Toggle Logic
        const trigger = document.getElementById('profileTrigger');
        const dropdown = document.getElementById('profileDropdown');
        const logoutBtn = document.getElementById('logoutBtn');

        if (trigger && dropdown) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('active');
            });

            // Close when clicking outside
            document.addEventListener('click', (e) => {
                if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('active');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                await signOut(auth);
                window.location.href = 'index.html';
            });
        }

        // Also update Nav visibility (redundant if using profile menu but good for navbar links too)
        if (role === 'host') document.getElementById('nav-host')?.classList.remove('hidden');
        if (role === 'admin') document.getElementById('nav-admin')?.classList.remove('hidden');

    } else {
        authContainer.innerHTML = `
             <a href="login.html" class="btn btn-text">Log In</a>
             <a href="login.html?mode=signup" class="btn btn-primary">Sign Up Free</a>
        `;
    }
}

export function initMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileToggle && navMenu) {
        // Clone to remove old listeners
        const newToggle = mobileToggle.cloneNode(true);
        mobileToggle.parentNode.replaceChild(newToggle, mobileToggle);

        newToggle.addEventListener('click', () => {
            const isFlex = navMenu.style.display === 'flex';

            if (isFlex) {
                navMenu.style.display = 'none';
                // Remove auth buttons from mobile menu if they were added
                const mobileAuth = navMenu.querySelector('.mobile-auth-container');
                if (mobileAuth) mobileAuth.remove();
            } else {
                navMenu.style.display = 'flex';
                navMenu.style.flexDirection = 'column';
                navMenu.style.position = 'absolute';
                navMenu.style.top = '80px'; // Below header
                navMenu.style.left = '0';
                navMenu.style.width = '100%';
                navMenu.style.height = 'calc(100vh - 80px)'; // Full height
                navMenu.style.background = 'rgba(2, 6, 23, 0.98)';
                navMenu.style.padding = '40px 20px';
                navMenu.style.backdropFilter = 'blur(10px)';
                navMenu.style.zIndex = '999';
                navMenu.style.gap = '20px';
                navMenu.style.alignItems = 'center';

                // Add Auth Buttons to Mobile Menu
                const authContainer = document.getElementById('auth-container');
                if (authContainer && !navMenu.querySelector('.mobile-auth-container')) {
                    const authClone = authContainer.cloneNode(true);
                    authClone.id = '';
                    authClone.className = 'mobile-auth-container';
                    authClone.style.display = 'flex';
                    authClone.style.flexDirection = 'column';
                    authClone.style.gap = '15px';
                    authClone.style.marginTop = '20px';
                    authClone.style.width = '100%';

                    // Fix buttons in clone
                    const btns = authClone.querySelectorAll('.btn');
                    btns.forEach(b => {
                        b.style.width = '100%';
                        b.style.justifyContent = 'center';
                    });

                    // Fix Profile Dropdown logic in clone (it won't work easily, so simplified)
                    // If logged in, Show "My Profile" + "Logout" links instead of Dropdown
                    if (authClone.querySelector('.profile-trigger')) {
                        authClone.innerHTML = `
                            <hr style="width:100%; border:0; border-top:1px solid rgba(255,255,255,0.1); margin:10px 0;">
                            <a href="profile.html" class="nav-link" style="color:white;"><i class="fas fa-user-circle"></i> My Profile</a>
                            <a href="registered.html" class="nav-link" style="color:white;"><i class="fas fa-calendar-alt"></i> My Schedule</a>
                            <a href="recordings.html" class="nav-link" style="color:white;"><i class="fas fa-play-circle"></i> My Recordings</a>
                            ${authContainer.innerHTML.includes('host.html') ? '<a href="host.html" class="nav-link" style="color:white;"><i class="fas fa-microphone-alt"></i> Creator Studio</a>' : ''}
                            ${authContainer.innerHTML.includes('admin.html') ? '<a href="admin.html" class="nav-link" style="color:white;"><i class="fas fa-shield-alt"></i> Admin Panel</a>' : ''}
                            <a href="requests.html" class="nav-link" style="color:white;"><i class="fas fa-headset"></i> Support</a>
                            <a href="#" id="mobileLogout" class="nav-link" style="color:#ef4444;"><i class="fas fa-sign-out-alt"></i> Logout</a>
                        `;

                        // Re-attach logout listener
                        setTimeout(() => {
                            const mbLogout = navMenu.querySelector('#mobileLogout');
                            if (mbLogout) {
                                mbLogout.addEventListener('click', async () => {
                                    await signOut(auth);
                                    window.location.reload();
                                });
                            }
                        }, 100);
                    }

                    navMenu.appendChild(authClone);
                }
            }
        });
    }
}

export function extractYouTubeID(url) {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|live\/)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}
