// =========================================
// Profile Page Logic
// =========================================
import { db, auth } from './config.js';
import { getDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { updateProfile, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showToast, updateGlobalHeader, formatDate, initMobileMenu } from './utils.js';

// Init Mobile Menu
document.addEventListener('DOMContentLoaded', initMobileMenu);

let currentUser = null;

// Listen for Auth State
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        // Fetch User Doc for more details (joinedAt, role)
        await loadUserProfile(user);
        updateGlobalHeader(user, 'student'); // Default role, will update inside load
    } else {
        window.location.href = 'login.html';
    }
});

async function loadUserProfile(user) {
    try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let userData = userSnap.exists() ? userSnap.data() : {};
        let role = userData.role || 'student';
        let joinedAt = userData.joinedAt || user.metadata.creationTime;

        // Fetch new fields
        let college = userData.college || '';
        let photoURL = user.photoURL || userData.photoURL || '';

        // Update Header with correct role
        updateGlobalHeader(user, role);

        // UI Binding - Avatar Logic
        const avatarText = document.getElementById('p-avatar-text');
        const avatarImg = document.getElementById('p-avatar-img');

        if (photoURL) {
            avatarImg.src = photoURL;
            avatarImg.style.display = 'block';
            avatarText.style.display = 'none';
        } else {
            avatarText.innerText = (user.displayName || 'U').charAt(0).toUpperCase();
            avatarText.style.display = 'flex';
            avatarImg.style.display = 'none';
        }

        document.getElementById('p-name-display').innerText = user.displayName || 'User';
        document.getElementById('p-college-display').innerText = college ? `@ ${college}` : '';
        document.getElementById('p-role').innerText = role;

        // Form Fields
        const nameInput = document.getElementById('p-name-input');
        const collegeInput = document.getElementById('p-college-input');
        const photoInput = document.getElementById('p-photo-input');

        nameInput.value = user.displayName || '';
        collegeInput.value = college;
        photoInput.value = photoURL;

        document.getElementById('p-email').innerText = user.email;
        document.getElementById('p-uid').innerText = user.uid;
        document.getElementById('p-joined').innerText = formatDate(joinedAt);

        // Avatar Click -> Focus Photo Input
        document.getElementById('avatar-container').onclick = () => {
            photoInput.focus();
            showToast("Paste your image URL below", "info");
        };

        // Edit Mode Logic
        const saveBtn = document.getElementById('save-btn');
        nameInput.removeAttribute('readonly');

        const checkChanges = () => {
            const isNameChanged = nameInput.value.trim() !== (user.displayName || '');
            const isCollegeChanged = collegeInput.value.trim() !== college;
            const isPhotoChanged = photoInput.value.trim() !== photoURL;

            if (isNameChanged || isCollegeChanged || isPhotoChanged) {
                saveBtn.style.display = 'block';
            } else {
                saveBtn.style.display = 'none';
            }
        };

        nameInput.addEventListener('input', checkChanges);
        collegeInput.addEventListener('input', checkChanges);
        photoInput.addEventListener('input', checkChanges);

        // Save Changes
        saveBtn.onclick = async () => {
            const newName = nameInput.value.trim();
            const newCollege = collegeInput.value.trim();
            const newPhoto = photoInput.value.trim();

            if (!newName) return showToast("Name cannot be empty", "error");

            saveBtn.innerText = "Saving...";
            saveBtn.disabled = true;

            try {
                // 1. Update Auth Profile (Name & Photo)
                await updateProfile(user, {
                    displayName: newName,
                    photoURL: newPhoto
                });

                // 2. Update Firestore (Sync all data)
                await updateDoc(userRef, {
                    name: newName,
                    college: newCollege,
                    photoURL: newPhoto
                });

                showToast("Profile Updated!", "success");

                // Refresh Page Data Manually
                loadUserProfile(user);
                saveBtn.style.display = 'none';

            } catch (err) {
                console.error(err);
                showToast("Error updating profile", "error");
            } finally {
                saveBtn.innerText = "Save Changes";
                saveBtn.disabled = false;
            }
        };

    } catch (e) {
        console.error("Error loading profile", e);
        showToast("Failed to load profile data", "error");
    }
}

// Logout Button in page
document.getElementById('logout-btn-page')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = 'index.html';
});
