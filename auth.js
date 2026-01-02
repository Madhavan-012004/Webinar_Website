// --- 1. CONFIGURATION ---
const DB_KEY = 'lh_users_db';
let generatedOTP = null; // Store OTP temporarily

// --- 2. HASHING FUNCTION (SHA-256) ---
// Note: This makes passwords unreadable in Database
async function hashPassword(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- 3. HELPER FUNCTIONS ---
function showToast(msg, type='info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function getUsers() { return JSON.parse(localStorage.getItem(DB_KEY)) || []; }
function saveUsers(users) { localStorage.setItem(DB_KEY, JSON.stringify(users)); }

function togglePass(id, icon) {
    const input = document.getElementById(id);
    if(input.type === "password") {
        input.type = "text";
        icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash');
    } else {
        input.type = "password";
        icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye');
    }
}

function showForm(formId) {
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(formId).classList.add('active');
}

// --- 4. SIGNUP LOGIC ---

// A. Send Verification OTP
function sendSignupOTP() {
    const email = document.getElementById('s_email').value.trim();
    if(!email.includes('@')) { showToast("Invalid Email!", "error"); return; }
    
    // Check if email already used
    const users = getUsers();
    if(users.find(u => u.email === email)) { showToast("Email already registered! Login.", "error"); return; }

    generatedOTP = Math.floor(1000 + Math.random() * 9000); // 4 Digit OTP
    alert(`🔐 OTP for Zest Hub Verification: ${generatedOTP}`); // Real email server illathathal Alert
    
    document.getElementById('signupOtpField').style.display = 'flex';
    showToast("OTP Sent to Email!", "success");
}

// B. Password Strength Checker
document.getElementById('s_pass').addEventListener('input', function() {
    const pass = this.value;
    const bar = document.getElementById('strength-bar');
    let strength = 0;
    if(pass.length >= 8) strength += 30;
    if(pass.match(/[0-9]/)) strength += 30;
    if(pass.match(/[!@#$%^&*]/)) strength += 40;

    bar.style.width = strength + '%';
    bar.style.background = strength < 50 ? 'red' : (strength < 80 ? 'orange' : '#00E59E');
});

// C. Final Signup Submit
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('s_username').value.trim();
    const name = document.getElementById('s_name').value.trim();
    const email = document.getElementById('s_email').value.trim();
    const userOtp = document.getElementById('s_otp').value.trim();
    const pass = document.getElementById('s_pass').value;
    const confirmPass = document.getElementById('s_confirm_pass').value;
    const role = document.getElementById('s_role').value;

    const users = getUsers();

    // 1. Validation
    if(users.find(u => u.username === username)) { showToast("Username already taken!", "error"); return; }
    if(users.find(u => u.email === email)) { showToast("Email already exists!", "error"); return; }
    
    // 2. Security Checks
    if(username === pass) { showToast("Username and Password cannot be same!", "error"); return; }
    if(pass.length < 8 || pass.length > 16) { showToast("Password must be 8-16 chars!", "error"); return; }
    if(pass !== confirmPass) { showToast("Passwords do not match!", "error"); return; }

    // 3. OTP Verify
    if(userOtp != generatedOTP) { showToast("Invalid OTP!", "error"); return; }

    // 4. Hash & Save
    const hashedPassword = await hashPassword(pass);
    
    users.push({ 
        username, name, email, 
        pass: hashedPassword, // Storing Hash
        role 
    });
    
    saveUsers(users);
    showToast("🎉 Registration Successful!", "success");
    setTimeout(() => showForm('loginForm'), 1500);
});


// --- 5. LOGIN LOGIC ---
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const input = document.getElementById('l_user').value.trim();
    const pass = document.getElementById('l_pass').value;

    const users = getUsers();
    
    // Find user by Username OR Email
    const user = users.find(u => u.username === input || u.email === input);

    if(!user) { showToast("User not found!", "error"); return; }

    // Verify Password Hash
    const hashedInput = await hashPassword(pass);
    
    if(user.pass === hashedInput) {
        // Save Session (Excluding password)
        const sessionUser = { ...user };
        delete sessionUser.pass; 
        localStorage.setItem('lh_session', JSON.stringify(sessionUser));
        
        showToast("✅ Login Successful!", "success");
        setTimeout(() => window.location.href = 'index.html', 1000);
    } else {
        showToast("❌ Incorrect Password!", "error");
    }
});


// --- 6. FORGOT PASSWORD LOGIC ---
let forgotStage = 0; // 0: Send OTP, 1: Verify & Reset
let resetEmail = '';

function handleForgotFlow() {
    const btn = document.getElementById('f_action_btn');
    const emailInput = document.getElementById('f_email');
    const otpInput = document.getElementById('f_otp');
    const passInput = document.getElementById('f_new_pass');

    if (forgotStage === 0) {
        // STEP 1: SEND OTP
        const users = getUsers();
        const user = users.find(u => u.email === emailInput.value.trim());
        
        if(!user) { showToast("Email not registered!", "error"); return; }
        
        resetEmail = user.email;
        generatedOTP = Math.floor(1000 + Math.random() * 9000);
        alert(`🔐 Reset OTP: ${generatedOTP}`);
        
        document.getElementById('forgotOtpField').style.display = 'flex';
        document.getElementById('newPassField').style.display = 'flex';
        emailInput.disabled = true;
        btn.innerText = "Verify & Reset Password";
        forgotStage = 1;

    } else {
        // STEP 2: VERIFY & RESET
        if(otpInput.value != generatedOTP) { showToast("Invalid OTP!", "error"); return; }
        if(passInput.value.length < 8) { showToast("Password too weak!", "error"); return; }

        hashPassword(passInput.value).then(newHash => {
            const users = getUsers();
            const index = users.findIndex(u => u.email === resetEmail);
            users[index].pass = newHash;
            saveUsers(users);
            
            showToast("✅ Password Reset Successfully!", "success");
            setTimeout(() => location.reload(), 1500);
        });
    }
}