# 🎙️ VoxAI Studio — Enterprise AI Text-to-Speech Web Application

**VoxAI Studio** is a professional text-to-speech studio web application powered by **ElevenLabs** neural synthesis models. It transforms written scripts, articles, and dialog into lifelike, emotional voiceovers with low-latency streaming and real-time audio visualization.

---

## ✨ Features

- **21+ Premier ElevenLabs Narrators**: Curated voice roster with live, working audio previews covering diverse accents, genders, and narrative styles (Audiobook, Tech Keynote, Podcast, Meditation, Drama).
- **Hybrid Voice Engine**:
  - **ElevenLabs Neural Pipeline**: Cinema-grade, high-fidelity neural audio synthesis with custom parameter tuning (Stability, Similarity Boost, Style Exaggeration, Speaker Boost).
  - **Studio Free Preview Engine**: Built-in interactive demo synthesis with audio visualization and HTML5 SpeechSynthesis fallback when no API key is configured.
- **Interactive In-App API Key Manager**: Connect, test, verify, and disconnect your ElevenLabs API key directly within the web UI or via `.env`.
- **Zero-Leakage Backend Security**: The API key is stored exclusively in server environment variables and never exposed to the client.
- **Custom Studio Audio Player**:
  - Live animated waveform canvas using Web Audio API (`AnalyserNode`).
  - Interactive timeline scrubber and seek controls.
  - Multi-speed playback selector (0.75x, 1.0x, 1.25x, 1.5x, 2.0x).
  - Quick skip (±5s) and replay controls.
  - MP3 and WAV audio download.
- **Script Metrics & Assistant**: Live word counter, character counter (5,000 max), estimated duration calculator (~150 wpm reading pace), and pre-built sample templates.
- **Generation History**: Persistent local generation archive with one-click re-loading and clipboard copying.
- **Zero-Dependency Architecture**: Built using Vanilla HTML5, modern CSS3 (glassmorphic design system), and Vanilla JavaScript on top of Node.js standard libraries.

---

## 🚀 Quick Start

### 1. Launch with One Click (Windows)
Double-click **`start.bat`** in the project folder. It will start the server and open your default browser to `http://localhost:3000`.

### 2. Launch via Terminal
```bash
# Start server
node server.js

# Or start with auto-reload (development mode)
npm run dev
```

### 3. Native PowerShell Fallback (No Node.js Required)
If running on a machine without Node.js, run:
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```

---

## 🔑 ElevenLabs API Key Setup

1. Sign up or log in at [elevenlabs.io](https://elevenlabs.io).
2. Go to **Profile** → **API Keys** and copy your secret key.
3. Configure it using either method:
   - **Method A (In the App)**: Click **API Security** in the top navigation bar, paste your key, and click **Connect Key**.
   - **Method B (Via `.env`)**: Open the `.env` file in the project root and insert:
     ```env
     ELEVENLABS_API_KEY=your_actual_elevenlabs_api_key_here
     ```

---

## 📁 Project Architecture

```
voice narrator anti gravity/
├── index.html       # Complete Studio UI structure and semantic markup
├── style.css        # Enterprise dark glassmorphic design system and responsive layout
├── script.js        # Web Audio API visualizer, player engine, API key controller
├── server.js        # Zero-dependency Node.js HTTP server & ElevenLabs secure proxy
├── server.ps1       # Native Windows PowerShell HTTP server fallback
├── start.bat        # Windows 1-click startup launcher
├── package.json     # Project metadata and npm scripts
├── .env.example     # Environment template
└── .env             # Local private environment configuration (not committed)
```

---

## 🛡️ Security & Privacy
- Zero client-side API key leakage.
- Token-bucket rate limiting on the backend prevents quota exhaustion.
- Script text is strictly passed to ElevenLabs official endpoints over TLS 1.2+.
