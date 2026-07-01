# Sound Lounge — Build and Technology Guide

This document provides a comprehensive breakdown of the architectural decisions, technology stack, and step-by-step build instructions for **Sound Lounge**.

---

## 1. Technology Justifications

### React (Frontend Framework)
- **What it does**: A component-based JavaScript library for building interactive user interfaces.
- **Why it was selected**: It provides rapid development, a massive ecosystem (including state managers like Zustand and styling libraries like Tailwind), and allows building a single-page application (SPA) that behaves like a native desktop app interface.
- **Alternative options**: Vue.js, Svelte, SolidJS.
- **Pros**:
  - Huge ecosystem and community support.
  - Excellent dev tools and state sync patterns.
  - Component reusability makes UI development modular.
- **Cons**:
  - Requires compiling and bundling.
  - Slightly larger footprint than Svelte/SolidJS (negligible for desktop).

### Tailwind CSS (Styling)
- **What it does**: A utility-first CSS framework for rapid styling directly in HTML/React components.
- **Why it was selected**: Enables creating a premium, dark-mode visual interface matching Spotify's aesthetic in record time without writing thousands of lines of ad-hoc CSS.
- **Alternative options**: Vanilla CSS, Bootstrap, CSS Modules, Styled Components.
- **Pros**:
  - Extremely fast design iteration.
  - No bloated CSS stylesheets; compiles down to exactly the classes used.
  - Out-of-the-box support for consistent spacing, colors, and responsive designs.
- **Cons**:
  - Can make HTML/JSX class attributes cluttered.
  - Slight learning curve for utility classes.

### Python FastAPI (Backend API)
- **What it does**: A modern, high-performance, async web framework for building APIs in Python based on standard type hints.
- **Why it was selected**: Since **yt-dlp** is written in Python, using a Python-based backend like FastAPI allows programmatically calling yt-dlp through its native Python API rather than spawning brittle CLI sub-processes. It also includes out-of-the-box support for WebSockets and async database engines.
- **Alternative options**: Flask, Django, Node.js (Express), Go (Fiber).
- **Pros**:
  - Programmatic yt-dlp integration.
  - High performance (comparable to Node/Go) due to async features.
  - Auto-generated Swagger documentation.
- **Cons**:
  - Spawning downloads can consume significant memory if not controlled (mitigated using concurrency semaphore).

### SQLite (Database)
- **What it does**: A self-contained, serverless, zero-configuration SQL database engine.
- **Why it was selected**: Sound Lounge is a local-first single-user application. SQLite stores all data in a single file on the user's disk, requiring no background services to be installed. The FTS5 extension provides instant full-text search capabilities over the local library.
- **Alternative options**: PostgreSQL, MySQL, DuckDB.
- **Pros**:
  - Zero setup; files are portable.
  - Lightning-fast read operations.
  - Low resource consumption.
- **Cons**:
  - Does not support high-concurrency write scaling (not needed for a single-player app).

### PyInstaller (Packaging & Standalone Executable)
- **What it does**: Bundles a Python application and all its dependencies (including the Python interpreter, yt-dlp, FFmpeg binaries, and the pre-built React frontend) into a single, standalone folder or executable.
- **Why it was selected**: Since the application is shared with friends, they should not have to install Python, Node, pip packages, or configure FFmpeg paths. A double-clickable `.exe` makes it instantly runnable on any computer.
- **Alternative options**: Tauri (with Rust), Electron (with Node), Docker.
- **Pros**:
  - Zero-dependency distribution for recipients.
  - Portable; can run from a USB drive.
- **Cons**:
  - Bundle size is relatively large (~150MB due to bundled Python interpreter and FFmpeg binaries).

---

## 2. Rejecting Cloud-Scale Tech

### Why Docker was bypassed for distribution
Docker requires the end-user to install Docker Desktop (~500MB), which runs a Linux virtual machine on Windows, consuming significant CPU and memory. While excellent for developers, it is a high-friction installation for friends who just want to manage and listen to music.

### Why Kubernetes was rejected
Kubernetes is a container orchestration platform designed for managing clusters of microservices across hundreds of physical servers in cloud environments. It provides auto-scaling, load balancing, and high availability. Since Sound Lounge is a single-user desktop app, Kubernetes would add immense setup complexity and resource overhead with zero benefits.

---

## 3. Step-by-Step Build Instructions

### Prerequisites
- **Node.js** (v18+) and **npm** (for compiling the frontend).
- **Python** (v3.11+) (for compiling/packaging the backend).
- **FFmpeg** binaries downloaded (required for audio conversion and metadata writing).

### Step 1: Install Python Dependencies
Open your shell in the `backend` folder and run:
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Install Node Dependencies and Build Frontend
Compile the React frontend to HTML/CSS/JS. Run:
```bash
cd frontend
npm install
npm run build
```
Once built, copy the contents of the `frontend/dist/` directory into the `backend/static/` directory so that FastAPI can serve it:
```bash
xcopy /s /e /y dist\* ..\backend\static\
```

### Step 3: Run in Development Mode
To run both backend and frontend with hot-reloading:

1. **Start Backend**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   ```

2. **Start Frontend Dev Server**:
   ```bash
   cd frontend
   npm run dev -- --port 3000
   ```
   Now visit `http://localhost:3000` in your browser. API requests will be proxied to the backend on port 8000.

### Step 4: Package into Standalone Executable (PyInstaller)
To compile into a single executable that bundles all dependencies:

1. Install PyInstaller:
   ```bash
   pip install pyinstaller
   ```

2. Generate the package:
   ```bash
   pyinstaller --name="SoundLounge" --add-data="app;app" --add-data="static;static" --onedir --noconsole app/main.py
   ```
3. Copy FFmpeg binaries (`ffmpeg.exe`, `ffprobe.exe`) into the root of the generated `dist/SoundLounge/` folder so that PyInstaller's runtime environment has access to it.

4. Distribute the `dist/SoundLounge/` folder as a `.zip` archive to your friends. They can launch the app by double-clicking `SoundLounge.exe`.
