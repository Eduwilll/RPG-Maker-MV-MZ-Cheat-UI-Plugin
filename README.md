# RPG Maker MV/MZ Cheat UI + Translation

A powerful, GUI-based cheat tool for RPG Maker MV and MZ games, featuring **Real-time Machine Translation** support.

---

## 📸 UI Samples
<p float="left">
  <img src="https://user-images.githubusercontent.com/99193603/153754676-cee2b96e-c03a-491f-b71c-3c57d6dcc474.JPG" width="24%"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754683-4e7a09a5-2d31-436d-8546-7a5d658eb282.JPG" width="24%"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754687-732648c8-3483-42bb-9634-dd22d674dfed.JPG" width="24%"/>
  <img src="https://user-images.githubusercontent.com/99193603/153754696-0cbc76f9-99fa-47a7-a0d0-6510a2f76e01.JPG" width="24%"/>
</p>

---

## 🔥 Features
- **Cheat Panel**: Gold, Stats, Speed, Items, Weapons, Armors, Skills, and more.
- **World Hacks**: Wall-through (Noclip), God Mode, Disable Encounters.
- **Smart Translation**: Real-time translation for Variables, Switches, Maps, and Items.
  - Supports **Lingva Translate** (Free/Private Google Translate alternative).
  - **Translation Bank**: Caches results for instant loading.
  - **Batch Processing**: Translates hundreds of items in seconds.
- **Customizable Shortcuts**: Full control over key bindings.

---

## 🛠️ Quick Installation (MV/MZ)

1. **Download**: Get the latest zip from [Releases](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin/releases).
2. **Copy Files**: Extract and copy `js` and `cheat` folders:
   - **MV**: Copy to `{game_dir}/www/`
   - **MZ**: Copy to `{game_dir}/`
   > ⚠️ **Backup**: Replace `main.js`. Backup your original first!
3. **Run**: Launch game. Press **`Ctrl + C`** for the menu.

---

## 🐳 Self-Hosting Lingva (Docker)
For maximum speed and 100% privacy, you can run Lingva locally on your computer.

### Option 1: Single Instance (Fast)
```bash
docker run -d -p 3000:3000 thedaviddelta/lingva-translate
```
- In plugin settings, select: **"Local Lingva Docker (Port 3000)"**.

### Option 2: 3-Node Cluster (Balanced/Extreme Speed)
We provide a `docker-compose.yml` in this repository to run a 3-instance cluster on ports 3000, 3001, and 3002.
```bash
docker-compose up -d
```
- In plugin settings, select: **"Local Lingva Docker (Ports 3000, 3001, 3002 Balanced)"**.

---

## 🌍 Translation Setup
1. Open Menu (**`Ctrl + C`**) -> **Translation** Tab.
2. Toggle **Enable** ON.
3. Select an **End Point** (e.g., **Lingva JA → EN**).
4. Check **Targets** (Variables, Items, etc.) and click **"Start Translation"**.

---

## 📜 Credits
- **Original Plugin**: [paramonos](https://github.com/paramonos/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
- **Translation Idea**: [sieucapoccho3717](https://github.com/sieucapoccho3717/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
- **Maintained & Enhanced by**: [Eduwilll](https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin)
