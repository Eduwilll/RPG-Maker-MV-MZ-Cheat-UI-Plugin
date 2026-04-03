# Development & UI Testing

This guide explains how to develop and test the Cheat UI using our professional developer tools.

---

## 1. Web-UI Preview (Rapid Prototyping)

The **Web-UI Preview** allows you to develop the cheat interface directly in your web browser. This is the fastest way to tweak layouts, colors, and components without launching an actual game.

### Features
- **Instant Updates**: Changes to your `.js` or `.css` files are reflected immediately (with a browser refresh).
- **Engine Mocks**: The previewer automatically injects mock versions of `$gameParty`, `$dataItems`, and other RPG Maker objects so the UI doesn't crash outside of a game.
- **Cache-Busting**: The built-in server automatically prevents the browser from caching old UI files.

### How to use
1. Open your terminal in the project root.
2. Run the preview script using your virtual environment:

   ```bash [.py]
   .venv\Scripts\python.exe start-preview.py
   ```
3. Open the provided URL in your browser: `http://localhost:8080/preview/index.html`

---

## 2. Dev-Sync (Live In-Game Testing)

Once your UI looks good in the browser, you'll want to test it inside a real RPG Maker game. Instead of manually copying files every time, use the **Dev-Sync** tool.

### Features
- **Junction/Symlinking**: It creates a "Magic Link" between your development folder and the game's `cheat/` folder.
- **Entry Point Injection**: Automatically replaces the game's `main.js` with our bootstrap launcher.
- **Interactive Selection**: Automatically scans your `tests/` folder for games to link.

### How to use
Run the development sync tool from the root:

#### Sync with a specific game path:
```bash [.py]
.venv\Scripts\python.exe deploy/dev.py --game-path "C:/Games/MyTestGame"
```

#### Sync with local test games (Interactive):
If you have games inside a `tests/MV` or `tests/MZ` folder, you can use these shortcuts:
```bash [.py]
.venv\Scripts\python.exe deploy/dev.py --mv    # Scan for MV games
.venv\Scripts\python.exe deploy/dev.py --mz    # Scan for MZ games
```

### The Development Cycle
1. **Link once**: Run `dev.py` once per game project.
2. **Edit code**: Change any file in `cheat-engine/www/cheat/`.
3. **Save**: Your changes are instantly visible in the game's folder (via the symlink).
4. **Refresh**: Press <kbd>F5</kbd> inside the game to see the updates!

---

## 🛠️ Internal Structure

- **`cheat-engine/www/cheat/js/`**: Core logic (Translation, Storage, Helper).
- **`cheat-engine/www/cheat/panels/`**: The actual UI tabs (Stats, Items, etc.).
- **`preview/`**: The mock environment for browser development.
- **`deploy/`**: Scripts for packaging and syncing.
