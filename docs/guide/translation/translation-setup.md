# Running Translation Servers

This guide teaches you how to set up and run the background servers required for the various translation engines in Cheat UI.

---

## 🏗️ Architecture Overview

The translation system works as follows:
1.  **Game (Cheat UI)**: Sends Japanese text to a local or remote server.
2.  **Background Server**: Receives the text, translates it using its engine, and returns it.
3.  **Cheat UI**: Updates the game data (Map names, Variables, etc.) with the translated text.

> [!IMPORTANT]
> You must have the background server running **BEFORE** you click "Start Translation" in-game.

---

## 🇰🇷 ezTrans Setup (JP → KR)

For high-quality Japanese to Korean translation, you need the original **ezTrans XP** software and a "wrapper" server.

### 1. Prerequisite: ezTrans XP
You must have **ezTrans XP** installed on your Windows machine. It is a commercial product and must be set up correctly in your system registry.

### 2. Choose a Wrapper Server

#### Option A: ezTransWeb (Python)
- **GitHub**: [HelloKS/ezTransWeb](https://github.com/HelloKS/ezTransWeb)
- **Setup**:
    1.  Install Python 3.
    2.  Install Flask: `pip install flask`
    3.  Download `ezTransWeb.py` from the repository.
    4.  **Run**: `python ezTransWeb.py`
- **Port**: 5000 (Default).

#### Option B: eztrans-server (Rust/High Performance)
- **GitHub**: [nanikit/eztrans-server](https://github.com/nanikit/eztrans-server)
- **Setup**:
    1.  Download the latest `.exe` from the [Releases](https://github.com/nanikit/eztrans-server/releases) page.
    2.  **Run**: Just double-click the `eztrans-server.exe`.
- **Port**: 8000 (Default).

---

## 🐳 Lingva Setup (Auto-detect → EN/Others)

Lingva is an open-source front-end for Google Translate. For bulk translations, you should always run it locally via Docker.

### Running a Cluster (Recommended)
This repository includes a `docker-compose.yml` that runs a 3-node balanced cluster for extreme performance (~160 strings/sec).

1.  Install [Docker Desktop](https://www.docker.com/).
2.  Open your terminal in the plugin root directory.
3.  **Run**: `docker-compose up -d`
4.  Cheat UI will now be able to use ports 3000, 3001, and 3002.

### Running a Single Instance
If you just want a simple local node:
```bash
docker run -d -p 3000:3000 thedaviddelta/lingva-translate
```

---

## 🤖 AI/LLM Setup (Generic)

For the smartest translations, use an Artificial Intelligence model.

### Ollama (Local AI)
1.  Install [Ollama](https://ollama.com/).
2.  **Pull a model**: `ollama pull personal/llama3-8b-instruct` (or any other translation model).
3.  **Run**: The Ollama server runs automatically in the background.
4.  In Cheat UI, select the **Ollama (Local)** preset.

---

## 🧪 Testing with Dummy Server

If you want to test the UI and connectivity without setting up a real engine, you can use the included dummy server:

1.  Open terminal in `dummy-translator/`.
2.  Run: `python eztrans.py`
3.  In Cheat UI, select **ezTransWeb** as the endpoint.
4.  It will return "T: [Original Text]" to confirm the connection is working.
