# ⚡ NexStream | The Future of Live Learning

![NexStream Banner](https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop)

> **Unlock Potential. Stream Knowledge.**  
> A premium, interactive live learning ecosystem connecting Hosts and Learners in real-time.

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/Madhavan-012004/Webinar_Website)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Firebase](https://img.shields.io/badge/firebase-%23039BE5.svg?style=flat&logo=firebase)](https://firebase.google.com/)
[![Tech](https://img.shields.io/badge/Tech-Neo--Glass-purple)]()

---

## 📖 Overview

**NexStream** is a cutting-edge webinar platform designed to democratize online education. It features a stunning **"Neo-Glass" UI**, real-time engagement tools, and a robust certification system. Whether you are a **Host** broadcasting to thousands or a **Student** mastering a new skill, NexStream provides an immersive experience.

![UI Concept](https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop)

---

## 🌟 Key Features

### 🎨 **Premium "Neo-Glass" UI**
A complete visual overhaul featuring deep midnight blues, vibrant neon gradients, and frosted glass elements.
- **Fluid Animations**: Magnetic buttons, floating cards, and smooth page transitions.
- **Theater Mode**: Immersive video player experience.
- **Responsive Design**: Flawless experience across Desktop, Tablet, and Mobile.

### 🎥 **Interactive Video Player**
- **Live Chat & Q&A**: Real-time discussion with tabbed interfaces.
- **Host Prioritization**: Hosts can **Pin Messages** 📌 and **Moderate** chat (delete abusive messages).
- **Engagement Tools**: Floating Heart Reactions ❤️ and Live Viewer Counts 👁️.
- **Personal Notes**: Auto-saving private notes for students 📝.

### 🏆 **Gamification & Certificates**
- **Attendance Tracking**: Automatically tracks viewing time.
- **Verified Certificates**: Auto-generated certificates with unique IDs upon course completion.
- **Student Dashboard**: Track enrolled sessions and learning progress.

### 🔐 **Role-Based Access**
- **Hosts**: Create sessions, manage enrollments, and moderate chat.
- **Students**: Register for events, watch streams, and earn credentials.
- **Admin Panel**: User management and platform analytics.

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| **Frontend** | HTML5, CSS3 (Custom Variables, Flexbox/Grid), JavaScript (ES6+) |
| **Styling** | Custom "Neo-Glass" Design System, Glassmorphism CSS |
| **Backend** | Firebase (Firestore NoSQL Database) |
| **Auth** | Firebase Authentication |
| **Hosting** | GitHub Pages / Firebase Hosting |
| **Video** | YouTube Live Embed API |

---

## 📸 Screenshots

| **Home Page (Neo-Glass)** | **Interactive Player** |
|:---:|:---:|
| ![Home](https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=500&auto=format&fit=crop)<br>*(Replace with actual screenshot)* | ![Player](https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=500&auto=format&fit=crop)<br>*(Replace with actual screenshot)* |

| **Dashboard** | **Mobile View** |
|:---:|:---:|
| ![Dashboard](https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=500&auto=format&fit=crop)<br>*(Replace with actual screenshot)* | ![Mobile](https://images.unsplash.com/photo-1526498460520-4c246339dccb?q=80&w=500&auto=format&fit=crop)<br>*(Replace with actual screenshot)* |

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge).
- A code editor (VS Code recommended).

### Installation

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/Madhavan-012004/Webinar_Website.git
    cd Webinar_Website
    ```

2.  **Configuration**
    - The project uses Firebase. Ensure `js/config.js` is set up with your Firebase credentials.
    ```javascript
    // js/config.js
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        // ...
    };
    ```

3.  **Run Locally**
    - Simply open `index.html` in your browser.
    - OR use a live server extension in VS Code for the best experience.

---

## 📂 Project Structure

```bash
📦 Webinar_Website
 ┣ 📂 css
 ┃ ┣ 📜 style.css       # Core Neo-Glass Design System
 ┃ ┗ 📜 user-popup.css  # Modal & Popup Styles
 ┣ 📂 js
 ┃ ┣ 📜 watch.js        # Video Player & Chat Logic
 ┃ ┣ 📜 auth.js         # Authentication Handlers
 ┃ ┣ 📜 config.js       # Firebase Configuration
 ┃ ┗ 📜 ...
 ┣ 📜 index.html        # Landing Page
 ┣ 📜 watch.html        # Main Video Player Interface
 ┣ 📜 dashboard.html    # User Dashboard
 ┗ 📜 README.md         # Documentation
```

---

## 🤝 Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/Madhavan-012004">Madhavan</a>
</p>
