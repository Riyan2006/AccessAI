<div align="center">
  
  <img src="https://github.com/Riyan2006/AccessAI/blob/8b3879633e717042e7c19521ffa39e26999876d1/Images/Thumbnail.png" alt="AccessAI Banner" width="100%" style="border-radius: 12px;"/>

  <h1>🧠 AccessAI: Gesture OS</h1>
  <p><strong>Navigate Your World, Hands-Free.</strong></p>

  <p>
    <img src="https://img.shields.io/badge/Python-3.10+-blue.svg?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/React-UI-61DAFB.svg?style=for-the-badge&logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Privacy-100%25_Offline-success.svg?style=for-the-badge" alt="100% Offline" />
    <img src="https://img.shields.io/badge/Event-NextGenHacks_2026-8A2BE2.svg?style=for-the-badge" alt="NextGenHacks" />
  </p>
</div>

---

> **AccessAI** is an AI-powered, multimodal accessibility system that transforms any standard webcam and microphone into a full operating system controller. Designed for users with motor disabilities, arthritis, or limited hand mobility, it allows for seamless computer navigation using natural hand gestures and local AI voice dictation.

---

## ✨ Key Features

- 🎯 **The Vision Matrix:** Real-time hand tracking (30 FPS) for mouse movement, clicking, and scrolling.
- 🤙 **The Clutch:** A physical "Shaka" gesture trigger that puts the OS controls to sleep to prevent accidental inputs while resting your hand.
- 🎙️ **Offline Dictation:** Integrated local **Faster-Whisper** AI for private, cloud-free voice-to-text typing directly into any application.
- 🎛️ **Zero-Latency Dashboard:** A premium React interface to tune mouse speed, exponential smoothing, and scroll sensitivity in real-time.
- 🔒 **100% Privacy-First:** Everything runs locally—zero data, voice clips, or video frames ever leave your machine.

---

## 🛠️ Tech Stack

| Category | Technologies Used |
| :--- | :--- |
| **Frontend** | React.js, TailwindCSS, Framer Motion, Web Audio API |
| **Backend** | Python, FastAPI, WebSockets, Uvicorn |
| **AI / Vision** | OpenCV, MediaPipe (Hand Landmarker), Faster-Whisper (Int8) |
| **OS Control** | PyAutoGUI, Plyer (Cross-platform OS Notifications) |

---

## 🏁 Getting Started

### 1. Prerequisites
Before you begin, ensure you have the following installed:
* **Python 3.10+** * **Node.js** (Latest LTS)
* A working webcam and microphone.

### 2. Booting the Matrix (Backend)
Open your terminal and navigate to the root directory, then run:

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Boot the server
python server.py
```

### 3. Launching the Dashboard (Frontend)

Open a **new** terminal window, navigate to the frontend folder, and run:

```bash
cd frontend

# Install node modules
npm install

# Start the dev server
npm run dev
```

Navigate to `http://localhost:5173` in your browser.

---

## 📖 Usage Guide

1. **Initialize:** Click **"Initialize Matrix"** on the React dashboard. Allow camera and microphone permissions if prompted by your browser/OS.
2. **Learn the Gestures:** Click the **User Manual / Cheat Sheet** button in the UI to view the dynamic SVG animations showing exactly how to move your hand.
3. **Engage the Clutch:** Use the **Shaka gesture** (Index & Pinky extended) to wake or sleep the system at any time. Look for the system notification to confirm the state change.
4. **Voice Typing:** Raise your **Pinky finger** to toggle the local Whisper dictation engine. Speak naturally to type anywhere.
5. **Tune Your Matrix:** Click the **Tune Settings** button to adjust mouse speed, exponential cursor smoothing, and scroll sensitivity to perfectly match your physical mobility needs.

---

<div align="center">
  <p>Built completely solo for <b>NextGenHacks 2026</b>.</p>
</div>
