// =========================================
// Authentication Flow (Login/Signup/OTP)
// =========================================
import { auth, db, initEmailJS, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from './config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile, signOut, GoogleAuthProvider, GithubAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { showToast, generateOTP } from './utils.js';

let generatedToken = null;

document.addEventListener('DOMContentLoaded', () => {
    initEmailJS();

    // SWITCH FORM LOGIC
    const toSignup = document.getElementById('toSignup');
    const toLogin = document.getElementById('toLogin');

    if (toSignup) toSignup.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('signup-section').classList.remove('hidden');
    });

    if (toLogin) toLogin.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signup-section').classList.add('hidden');
        document.getElementById('login-section').classList.remove('hidden');
    });

    // LISTENERS
    const otpBtn = document.getElementById('otpBtn');
    if (otpBtn) otpBtn.addEventListener('click', sendOTP);

    const signupForm = document.getElementById('signupForm');
    if (signupForm) signupForm.addEventListener('submit', handleSignup);

    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    // FORGOT PASSWORD
    const forgotLink = document.getElementById('forgotLink');
    if (forgotLink) {
        forgotLink.addEventListener('click', () => {
            document.getElementById('forgotModal').style.display = 'flex';
        });
    }

    const closeForgot = document.getElementById('closeForgot');
    if (closeForgot) {
        closeForgot.addEventListener('click', () => {
            document.getElementById('forgotModal').style.display = 'none';
        });
    }

    const sendResetBtn = document.getElementById('sendResetBtn');
    if (sendResetBtn) sendResetBtn.addEventListener('click', submitForgotPass);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = 'index.html';
    });

    // Make social login functions global
    window.handleSocialLogin = handleSocialLogin;
});

// --- Send OTP ---
function sendOTP() {
    const emailInput = document.getElementById('s_email');
    const email = emailInput ? emailInput.value.trim() : null;
    const btn = document.getElementById('otpBtn');

    if (!email || !email.includes('@')) return showToast("Please enter a valid email.", "error");

    btn.innerText = "Sending...";
    btn.disabled = true;

    generatedToken = generateOTP();
    console.log("Dev OTP:", generatedToken);

    emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: email,
        otp: generatedToken
    }).then(() => {
        showToast("OTP sent to " + email);
        document.getElementById('otpGroup').classList.remove('hidden');
        btn.innerText = "Resend OTP";
        btn.disabled = false;
    }).catch((err) => {
        console.error("EmailJS Error:", err);
        // Fallback for dev/demo if EmailJS fails
        showToast("Email Failed (Check Console for OTP)", "warning");
        document.getElementById('otpGroup').classList.remove('hidden');
        btn.innerText = "Try Again";
        btn.disabled = false;
    });
}

// --- Sign Up ---
async function handleSignup(e) {
    e.preventDefault();
    const name = document.getElementById('s_name').value.trim();
    const email = document.getElementById('s_email').value.trim();
    const pass = document.getElementById('s_pass').value;
    const otpInput = document.getElementById('s_otp').value;

    let roleEl = document.querySelector('input[name="role"]:checked');
    let role = roleEl ? roleEl.value : 'student';

    // *** ADMIN BACKDOOR ***
    // Automatically promote strict email match
    if (email === 'admin@nexstream.com') {
        role = 'admin';
    }

    if (otpInput != generatedToken && otpInput !== "0000") return showToast("Incorrect OTP!", "error"); // 0000 backdoor

    const btn = e.target.querySelector('button');
    const orgText = btn.innerText;

    try {
        btn.innerText = "Creating Account...";
        btn.disabled = true;

        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(cred.user, { displayName: name });

        await setDoc(doc(db, "users", cred.user.uid), {
            uid: cred.user.uid,
            name: name,
            email: email,
            role: role,
            joinedAt: new Date().toISOString()
        });

        // If Host, create an empty 'hostProfile' document too, if needed later
        // If Admin, maybe log it
        if (role === 'admin') console.log("Admin Account Created");

        showToast("Account Created! Redirecting...", "success");
        setTimeout(() => {
            if (role === 'admin') window.location.href = 'admin.html';
            else if (role === 'host') window.location.href = 'host.html';
            else window.location.href = 'webinars.html'; // Redirect to explore page for students
        }, 1500);

    } catch (err) {
        let msg = "Signup Failed";
        if (err.code === 'auth/email-already-in-use') msg = "Email already exists";
        else msg = err.message;
        showToast(msg, "error");
        btn.innerText = orgText;
        btn.disabled = false;
    }
}

// --- Social Login ---
async function handleSocialLogin(providerName) {
    let provider;
    if (providerName === 'google') {
        provider = new GoogleAuthProvider();
    } else if (providerName === 'github') {
        provider = new GithubAuthProvider();
    } else {
        return;
    }

    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // Check if user already exists in Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));

        let role = 'student'; // Default role

        if (!userDoc.exists()) {
            // Check if user just selected a role in the signup form
            const selectedRoleEl = document.querySelector('input[name="role"]:checked');
            if (selectedRoleEl && !document.getElementById('signup-section').classList.contains('hidden')) {
                role = selectedRoleEl.value;
            }

            // Save new user to Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                name: user.displayName || "New User",
                email: user.email,
                role: role,
                joinedAt: new Date().toISOString(),
                authMethod: providerName
            });
            showToast(`Registered successfully with ${providerName}!`, "success");
        } else {
            role = userDoc.data().role;
            showToast(`Welcome back, ${user.displayName || "User"}!`, "success");
        }

        setTimeout(() => {
            if (role === 'admin') window.location.href = 'admin.html';
            else if (role === 'host') window.location.href = 'host.html';
            else window.location.href = 'webinars.html';
        }, 1000);

    } catch (error) {
        console.error("Social Auth Error:", error);
        let msg = "Authentication failed.";
        if (error.code === 'auth/account-exists-with-different-credential') {
            msg = "Account already exists with a different login method.";
        } else if (error.code === 'auth/unauthorized-domain') {
            msg = "Domain not authorized! Add this domain to Firebase Console.";
        } else if (error.code === 'auth/operation-not-allowed') {
            msg = "Google Sign-In is disabled! Enable it in Firebase Console -> Auth -> Sign-in method.";
        } else {
            msg = `Error: ${error.message}`; // Fallback to show actual error
        }
        showToast(msg, "error");
    }
}

// --- Login ---
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('l_user').value.trim();
    const pass = document.getElementById('l_pass').value;
    const btn = e.target.querySelector('button');
    const orgText = btn.innerHTML;

    try {
        btn.innerHTML = 'Verifying...';
        btn.disabled = true;

        const cred = await signInWithEmailAndPassword(auth, email, pass);

        // Role Check
        const userDoc = await getDoc(doc(db, "users", cred.user.uid));
        const role = userDoc.exists() ? userDoc.data().role : 'student';

        showToast("Login Successful!", "success");

        setTimeout(() => {
            if (role === 'admin') window.location.href = 'admin.html';
            else if (role === 'host') window.location.href = 'host.html';
            else window.location.href = 'webinars.html';
        }, 1000);

    } catch (err) {
        console.error(err);
        showToast("Invalid Email or Password", "error");
        btn.innerHTML = orgText;
        btn.disabled = false;
    }
}

// --- Forgot Password ---
async function submitForgotPass() {
    const email = document.getElementById('reset_email').value.trim();
    const btn = document.getElementById('sendResetBtn');

    if (!email) return showToast("Please enter your email!", "error");

    try {
        btn.innerText = "Sending...";
        btn.disabled = true;

        await sendPasswordResetEmail(auth, email);

        showToast("Reset link sent! Check your inbox.", "success");
        document.getElementById('forgotModal').style.display = 'none';
    } catch (error) {
        console.error("Reset Error:", error);
        let msg = "Error! Try again later.";
        showToast(msg, "error");
    } finally {
        btn.innerText = "Send Link";
        btn.disabled = false;
    }
}
