# Translation Engines

The Cheat UI supports multiple translation engines ranging from free public APIs to high-performance local clusters and legacy Korean translators.

For instructions on how to actually start these servers, see the **[Server Setup (Run) Guide](/guide/translation-setup)**.

## Comparison of Engines

| Engine | Best For | Languages | Setup |
|--------|----------|-----------|-------|
| **Lingva** | General Use | Most pairs (JA → EN focus) | Docker (Free) |
| **ezTrans** | Japanese to Korean | JA → KR ONLY | Local App (Windows) |
| **LLMs** | Dialogue / Immersion | All | API Key or Ollama |

---

## ezTrans (Japanese → Korean)

Legacy support for the popular Korean translation tools. This remains the fastest and most accurate choice for Korean speakers.

### ezTransWeb
- **Repo**: [HelloKS/ezTransWeb](https://github.com/HelloKS/ezTransWeb)
- **Setup**:
    1. Install ezTrans XP on your Windows machine.
    2. Run the `ezTransWeb` python server.
    3. In Cheat UI, select the **ezTransWeb (JP → KR)** endpoint.
- **Default URL**: `http://localhost:5000/translate`

### eztrans-server
- **Repo**: [nanikit/eztrans-server](https://github.com/nanikit/eztrans-server)
- **Setup**:
    - High-performance Rust-based alternative to ezTransWeb.
- **Default URL**: `http://localhost:8000`

---

## Lingva Translate (Private & Free)

Lingva is an open-source front-end for Google Translate that doesn't track you and doesn't require an API key.

### Public Nodes
By default, the plugin uses `lingva.ml`. While free, public nodes may rate-limit you during bulk translations.

### Local Docker Cluster (Recommended)
For unlimited, high-speed translation, we recommend running Lingva locally:
1. Install [Docker](https://www.docker.com/).
2. Run our pre-configured suite: `docker-compose up -d`.
3. In Cheat UI, select **Local Lingva Docker**.

---

## LLM Engines (AI Translation)

For the highest quality translation that understands context and tone.

### Cloud Providers
- **OpenAI**: Supports GPT-4o-mini (very cheap and fast).
- **Google Gemini**: Supports Gemini 2.0 Flash (free tier available).

### Local LLM (Ollama)
Run your own AI locally with [Ollama](https://ollama.com/):
1. Install Ollama and pull a model (e.g., `ollama pull personal/llama3-8b-instruct`).
2. Point the Cheat UI to `http://localhost:11434/v1`.
3. Select the **Ollama (Local)** preset.
