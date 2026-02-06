
import { db, auth } from './config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { showToast, updateGlobalHeader } from './utils.js';

// Init
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalHeader();
    renderContactForm(); // Default view

    // Expose global functions
    window.selectHostApp = renderHostApp;
    window.submitContact = submitContact;
    window.submitHostApp = submitHostApp;
});

// =========================================
// RENDER FUNCTIONS
// =========================================

function renderContactForm() {
    const container = document.getElementById('dynamic-form-container');
    if (!container) return;

    container.innerHTML = `
        <div class="form-box fade-in">
            <h3 style="margin-bottom: 20px; color: white;">Send us a message</h3>
            <form id="contactForm" onsubmit="event.preventDefault(); window.submitContact();">
                <div class="form-row">
                    <div class="input-group">
                        <label>Your Name</label>
                        <input type="text" id="c-name" placeholder="John Doe" required style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:white;">
                    </div>
                    <div class="input-group">
                        <label>Email Address</label>
                        <input type="email" id="c-email" placeholder="john@example.com" required style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:white;">
                    </div>
                </div>
                <div class="input-group" style="margin-top:20px;">
                    <label>Subject</label>
                    <input type="text" id="c-subject" placeholder="How can we help?" required style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:white;">
                </div>
                <div class="input-group" style="margin-top:20px;">
                    <label>Message</label>
                    <textarea id="c-message" rows="5" placeholder="Tell us more..." required style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:white; resize:none;"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top:25px; width:100%;">
                    <i class="fas fa-paper-plane"></i> Send Message
                </button>
            </form>
        </div>
    `;
}

function renderHostApp() {
    // Check Auth first
    const user = auth.currentUser;
    if (!user) {
        showToast("Please log in to apply as a host", "error");
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    const container = document.getElementById('dynamic-form-container');
    if (!container) return;

    container.innerHTML = `
        <div class="form-box fade-in">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                <h3 style="color: white; margin:0;">Instructor Application</h3>
                <button onclick="renderContactForm()" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer;">Cancel</button>
            </div>
            
            <form id="hostForm" onsubmit="event.preventDefault(); window.submitHostApp();">
                <div class="input-group">
                    <label>Webinar Title</label>
                    <input type="text" id="h-title" placeholder="e.g. Advanced React Patterns" required 
                           style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:white;">
                </div>

                <div class="form-row" style="margin-top:20px;">
                    <div class="input-group">
                        <label>Date</label>
                        <input type="date" id="h-date" required style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:white;">
                    </div>
                    <div class="input-group">
                        <label>Time</label>
                        <input type="time" id="h-time" required style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:white;">
                    </div>
                </div>

                <div class="form-row" style="margin-top:20px;">
                    <div class="input-group">
                        <label>Price ($)</label>
                        <input type="number" id="h-price" min="0" value="0" required 
                               style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:white;">
                        <small style="color:var(--text-muted);">Enter 0 for free sessions</small>
                    </div>
                    <div class="input-group">
                        <label>YouTube Live Link (Optional)</label>
                        <input type="url" id="h-link" placeholder="https://youtube.com/..." 
                               style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border); background:rgba(0,0,0,0.2); color:white;">
                    </div>
                </div>

                <button type="submit" class="btn btn-primary" style="margin-top:25px; width:100%; background: linear-gradient(135deg, var(--primary), var(--secondary)); border:none;">
                    <i class="fas fa-check-circle"></i> Submit Application
                </button>
            </form>
        </div>
    `;
}

// =========================================
// LOGIC FUNCTIONS
// =========================================

async function submitContact() {
    const btn = document.querySelector('#contactForm button');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    btn.disabled = true;

    // Simulate API call or use EmailJS
    setTimeout(() => {
        showToast("Message sent successfully!");
        btn.innerHTML = originalText;
        btn.disabled = false;
        document.getElementById('contactForm').reset();
    }, 1500);
}

async function submitHostApp() {
    const user = auth.currentUser;
    if (!user) return;

    const title = document.getElementById('h-title').value;
    const date = document.getElementById('h-date').value;
    const time = document.getElementById('h-time').value;
    const price = document.getElementById('h-price').value;
    const youtubeUrl = document.getElementById('h-link').value;

    const btn = document.querySelector('#hostForm button');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    btn.disabled = true;

    try {
        await addDoc(collection(db, "webinars"), {
            title: title,
            date: date,
            time: time,
            price: Number(price),
            youtubeUrl: youtubeUrl || '',
            hostId: user.uid,
            hostName: user.displayName || 'Unknown Host',
            hostEmail: user.email,
            status: 'pending', // IMPORTANT for Admin Dashboard
            participants: [],
            createdAt: serverTimestamp()
        });

        showToast("Application submitted! Pending approval.", "success");
        renderContactForm(); // Go back to default
    } catch (error) {
        console.error("Error adding document: ", error);
        showToast("Error submitting application", "error");
        btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Retry';
        btn.disabled = false;
    }
}
