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
        // Clone to remove old listeners if any
        const newToggle = mobileToggle.cloneNode(true);
        mobileToggle.parentNode.replaceChild(newToggle, mobileToggle);

        newToggle.addEventListener('click', () => {
            const isFlex = navMenu.style.display === 'flex';
            navMenu.style.display = isFlex ? 'none' : 'flex';

            if (!isFlex) {
                navMenu.style.flexDirection = 'column';
                navMenu.style.position = 'absolute';
                navMenu.style.top = '100%';
                navMenu.style.left = '0';
                navMenu.style.width = '100%';
                navMenu.style.background = 'rgba(15, 23, 42, 0.95)';
                navMenu.style.padding = '20px';
                navMenu.style.backdropFilter = 'blur(10px)';
                navMenu.style.zIndex = '999';
            }
        });
    }
}
