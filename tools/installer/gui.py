import json
import glob
import os
import queue
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

from core import (
    detect_game,
    get_status,
    install_from_archive,
    install_from_source,
    list_backups,
    uninstall,
)


class InstallerApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("RPG Maker MV/MZ Cheat UI Installer")
        self.geometry("860x620")
        self.minsize(760, 560)
        self.set_window_icon()

        self.log_queue = queue.Queue()
        self.backup_labels = {}
        self.window_icon = None
        self.backup_panel_visible = False
        self.game_path = tk.StringVar()
        self.archive_path = tk.StringVar()
        self.version = tk.StringVar()
        self.clean_settings = tk.BooleanVar(value=False)
        self.selected_backup = tk.StringVar()
        self.status_text = tk.StringVar(value="Select a game folder to begin.")

        self.create_widgets()
        self.after(100, self.flush_log_queue)

    def set_window_icon(self):
        png_candidates = [
            self.get_resource_path(os.path.join("docs", "public", "logo.png")),
        ]

        for icon_path in png_candidates:
            if not os.path.exists(icon_path):
                continue

            try:
                self.window_icon = tk.PhotoImage(file=icon_path)
                self.iconphoto(True, self.window_icon)
                return
            except tk.TclError:
                continue

        ico_path = self.get_resource_path(os.path.join("docs", "public", "favicon.ico"))
        if not os.path.exists(ico_path):
            return

        try:
            self.iconbitmap(ico_path)
        except tk.TclError:
            pass

    def get_resource_path(self, relative_path):
        if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
            return os.path.join(sys._MEIPASS, relative_path)

        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        return os.path.join(project_root, relative_path)

    def create_widgets(self):
        outer = ttk.Frame(self, padding=14)
        outer.pack(fill=tk.BOTH, expand=True)

        game_row = ttk.Frame(outer)
        game_row.pack(fill=tk.X)
        ttk.Label(game_row, text="Game folder").pack(anchor=tk.W)
        game_input_row = ttk.Frame(game_row)
        game_input_row.pack(fill=tk.X, pady=(4, 10))
        ttk.Entry(game_input_row, textvariable=self.game_path).pack(
            side=tk.LEFT, fill=tk.X, expand=True
        )
        ttk.Button(game_input_row, text="Browse", command=self.browse_game).pack(
            side=tk.LEFT, padx=(8, 0)
        )
        ttk.Button(game_input_row, text="Check", command=self.run_status).pack(
            side=tk.LEFT, padx=(8, 0)
        )

        archive_row = ttk.Frame(outer)
        archive_row.pack(fill=tk.X)
        ttk.Label(archive_row, text="Release archive (optional)").pack(anchor=tk.W)
        archive_input_row = ttk.Frame(archive_row)
        archive_input_row.pack(fill=tk.X, pady=(4, 10))
        ttk.Entry(archive_input_row, textvariable=self.archive_path).pack(
            side=tk.LEFT, fill=tk.X, expand=True
        )
        ttk.Button(
            archive_input_row,
            text="Browse",
            command=self.browse_archive,
        ).pack(side=tk.LEFT, padx=(8, 0))
        ttk.Button(
            archive_input_row,
            text="Clear",
            command=lambda: self.archive_path.set(""),
        ).pack(side=tk.LEFT, padx=(8, 0))

        options = ttk.Frame(outer)
        options.pack(fill=tk.X, pady=(0, 10))
        ttk.Label(options, text="Override version (optional)").pack(side=tk.LEFT)
        ttk.Entry(options, textvariable=self.version, width=18).pack(
            side=tk.LEFT, padx=(8, 18)
        )
        ttk.Button(options, text="Clear", command=lambda: self.version.set("")).pack(
            side=tk.LEFT, padx=(0, 18)
        )
        ttk.Checkbutton(
            options,
            text="Clean old cheat-settings",
            variable=self.clean_settings,
        ).pack(side=tk.LEFT)

        actions = ttk.Frame(outer)
        actions.pack(fill=tk.X, pady=(0, 10))
        ttk.Button(actions, text="Install", command=self.run_install).pack(side=tk.LEFT)
        ttk.Button(actions, text="Restore Old Plugin", command=self.show_backup_panel).pack(
            side=tk.LEFT, padx=(8, 0)
        )
        ttk.Button(actions, text="Uninstall Cheat", command=self.run_uninstall).pack(
            side=tk.LEFT, padx=(8, 0)
        )

        self.backup_frame = ttk.LabelFrame(outer, text="Manual Restore Backups", padding=10)
        backup_help = ttk.Label(
            self.backup_frame,
            text=(
                "Use this only to roll back to an older plugin backup. "
                "Uninstall ignores the selected backup and uses the original-game backup when available."
            ),
            wraplength=800,
            justify=tk.LEFT,
        )
        backup_help.pack(anchor=tk.W, pady=(0, 8))
        backup_row = ttk.Frame(self.backup_frame)
        backup_row.pack(fill=tk.X)
        self.backup_combo = ttk.Combobox(
            backup_row,
            textvariable=self.selected_backup,
            values=[],
            state="readonly",
        )
        self.backup_combo.pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(backup_row, text="Refresh", command=self.refresh_backups).pack(
            side=tk.LEFT, padx=(8, 0)
        )
        ttk.Button(backup_row, text="Restore Selected", command=self.run_restore).pack(
            side=tk.LEFT, padx=(8, 0)
        )
        ttk.Button(backup_row, text="Hide", command=self.hide_backup_panel).pack(
            side=tk.LEFT, padx=(8, 0)
        )

        self.status_frame = ttk.LabelFrame(outer, text="Status", padding=10)
        self.status_frame.pack(fill=tk.X, pady=(0, 10))
        ttk.Label(
            self.status_frame,
            textvariable=self.status_text,
            justify=tk.LEFT,
            wraplength=800,
        ).pack(anchor=tk.W)

        log_frame = ttk.LabelFrame(outer, text="Log", padding=10)
        log_frame.pack(fill=tk.BOTH, expand=True)
        self.log_box = tk.Text(log_frame, height=14, wrap=tk.WORD, state=tk.DISABLED)
        scrollbar = ttk.Scrollbar(log_frame, command=self.log_box.yview)
        self.log_box.configure(yscrollcommand=scrollbar.set)
        self.log_box.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

    def browse_game(self):
        path = filedialog.askdirectory(title="Select RPG Maker game folder")
        if path:
            self.game_path.set(path)
            self.run_status()

    def browse_archive(self):
        path = filedialog.askopenfilename(
            title="Select release archive",
            filetypes=[
                ("Release archives", "*.tar.gz *.tgz"),
                ("All files", "*.*"),
            ],
        )
        if path:
            self.archive_path.set(path)

    def find_release_archive(self, game_path):
        target = detect_game(game_path)
        game_key = "mv" if target.game_type.value == "MV" else "mz"
        patterns = [
            f"rpg-{game_key}-cheat-*-core.tar.gz",
            f"rpg-{game_key}-cheat-*-core.tgz",
        ]
        matches = []

        for search_dir in self.get_release_archive_search_dirs():
            for pattern in patterns:
                matches.extend(glob.glob(os.path.join(search_dir, pattern)))

        matches = [path for path in matches if os.path.isfile(path)]
        if not matches:
            return None

        matches.sort(key=lambda path: (os.path.getmtime(path), path), reverse=True)
        return matches[0]

    def get_release_archive_search_dirs(self):
        dirs = []

        if getattr(sys, "frozen", False):
            dirs.append(os.path.dirname(sys.executable))

        dirs.append(os.getcwd())
        dirs.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "output")))

        unique_dirs = []
        for path in dirs:
            if path not in unique_dirs and os.path.isdir(path):
                unique_dirs.append(path)

        return unique_dirs

    def run_status(self):
        game_path = self.game_path.get().strip()
        if not game_path:
            messagebox.showwarning("Missing game folder", "Select a game folder first.")
            return

        self.run_worker(lambda: self.update_status(get_status(game_path)))

    def run_install(self):
        game_path = self.game_path.get().strip()
        if not game_path:
            messagebox.showwarning("Missing game folder", "Select a game folder first.")
            return

        archive_path = self.archive_path.get().strip()
        version = self.version.get().strip() or None
        clean_settings = self.clean_settings.get()

        def worker():
            selected_archive = archive_path or self.find_release_archive(game_path)

            if selected_archive and not archive_path:
                self.enqueue_log(f"Auto-selected release archive: {selected_archive}")

            if selected_archive:
                result = install_from_archive(
                    game_path,
                    selected_archive,
                    version=version,
                    clean_settings=clean_settings,
                    logger=self.enqueue_log,
                )
            else:
                result = install_from_source(
                    game_path,
                    version=version,
                    clean_settings=clean_settings,
                    logger=self.enqueue_log,
                )
            original_backup = result["original_backup_path"] or "not available"
            plugin_backup = result["plugin_backup_path"] or "not created"
            self.enqueue_log(f"Original backup: {original_backup}")
            self.enqueue_log(f"Plugin-version backup: {plugin_backup}")
            self.update_status(get_status(game_path))
            self.show_info(
                "Install complete",
                "Plugin installed successfully.\n\n"
                f"Original backup:\n{original_backup}\n\n"
                f"Plugin-version backup:\n{plugin_backup}",
            )

        self.run_worker(worker)

    def run_restore(self):
        game_path = self.game_path.get().strip()
        if not game_path:
            messagebox.showwarning("Missing game folder", "Select a game folder first.")
            return

        backup_path = self.get_selected_backup_path()
        if not backup_path:
            messagebox.showwarning("Missing backup", "Select a backup to restore first.")
            return

        confirm = messagebox.askyesno(
            "Restore backup",
            f"Restore this backup?\n\n{backup_path}",
        )
        if not confirm:
            return

        def worker():
            result = uninstall(game_path, backup_path=backup_path, logger=self.enqueue_log)
            self.enqueue_log(f"Restored: {result['backup_path']}")
            self.update_status(get_status(game_path))
            self.show_info(
                "Restore complete",
                f"Backup restored successfully.\n\nBackup:\n{result['backup_path']}",
            )

        self.run_worker(worker)

    def run_uninstall(self):
        game_path = self.game_path.get().strip()
        if not game_path:
            messagebox.showwarning("Missing game folder", "Select a game folder first.")
            return

        self.show_backup_panel()

        confirm = messagebox.askyesno(
            "Uninstall cheat",
            "Uninstall the cheat?\n\n"
            "If an original-game backup exists, original files will be restored. "
            "If not, the installer will only remove cheat files.",
        )
        if not confirm:
            return

        def worker():
            result = uninstall(game_path, logger=self.enqueue_log)
            backup_text = result["backup_path"] or "No original-game backup was available."
            self.enqueue_log(f"Uninstall backup: {backup_text}")
            self.update_status(get_status(game_path))
            self.show_info(
                "Uninstall complete",
                "Cheat uninstall finished.\n\n"
                f"Original backup:\n{backup_text}\n\n"
                "If no original backup was available, a tiny disabled loader was kept so the game can still boot.",
            )

        self.run_worker(worker)

    def show_backup_panel(self, refresh=True):
        game_path = self.game_path.get().strip()
        if not game_path:
            messagebox.showwarning("Missing game folder", "Select a game folder first.")
            return

        if not self.backup_panel_visible:
            self.backup_frame.pack(fill=tk.X, pady=(0, 10), before=self.status_frame)
            self.backup_panel_visible = True

        if refresh:
            self.refresh_backups()

    def hide_backup_panel(self):
        self.backup_frame.pack_forget()
        self.backup_panel_visible = False

    def run_worker(self, work):
        def wrapped():
            try:
                work()
            except Exception as error:
                self.enqueue_log(f"ERROR: {error}")
                self.after(0, lambda: messagebox.showerror("Installer error", str(error)))

        threading.Thread(target=wrapped, daemon=True).start()

    def update_status(self, status):
        backups = status.get("backups") or []
        text = (
            f"Game type: {status['game_type']}\n"
            f"Install root: {status['root_path']}\n"
            f"Installed: {'yes' if status['installed'] else 'no'}\n"
            f"Version: {status['version'] or '-'}\n"
            f"Settings: {status['settings_path']}\n"
            f"Backups: {status['backup_root']}\n"
            f"Original backup: {status['original_backup'] or '-'}\n"
            f"Backup count: {len(backups)}"
        )
        self.after(0, lambda: self.apply_status_update(text, backups))
        self.enqueue_log(json.dumps(status, indent=2))

    def apply_status_update(self, text, backups):
        self.status_text.set(text)
        self.populate_backups(backups)

    def refresh_backups(self):
        game_path = self.game_path.get().strip()
        if not game_path:
            messagebox.showwarning("Missing game folder", "Select a game folder first.")
            return

        def worker():
            backups = list_backups(game_path)
            self.after(0, lambda: self.populate_backups(backups))
            self.enqueue_log(f"Loaded {len(backups)} backup(s).")

        self.run_worker(worker)

    def populate_backups(self, backups):
        current_path = self.get_selected_backup_path()
        labels = []
        self.backup_labels = {}

        for backup in backups:
            label = self.format_backup_label(backup)
            labels.append(label)
            self.backup_labels[label] = backup["path"]

        self.backup_combo.configure(values=labels)

        if current_path:
            for label, path in self.backup_labels.items():
                if path == current_path:
                    self.selected_backup.set(label)
                    return

        self.selected_backup.set(labels[0] if labels else "")

    def format_backup_label(self, backup):
        game_type = backup.get("gameType") or "unknown"
        schema = backup.get("schema") or 1
        reason = backup.get("reason") or "legacy"
        entries = backup.get("entryCount") or 0
        return f"{backup['name']} | {reason} | {game_type} | backup v{schema} | {entries} paths"

    def get_selected_backup_path(self):
        return self.backup_labels.get(self.selected_backup.get())

    def enqueue_log(self, message):
        self.log_queue.put(str(message))

    def show_info(self, title, message):
        self.after(0, lambda: messagebox.showinfo(title, message))

    def flush_log_queue(self):
        while True:
            try:
                message = self.log_queue.get_nowait()
            except queue.Empty:
                break

            self.log_box.configure(state=tk.NORMAL)
            self.log_box.insert(tk.END, message + "\n")
            self.log_box.see(tk.END)
            self.log_box.configure(state=tk.DISABLED)

        self.after(100, self.flush_log_queue)


def main():
    app = InstallerApp()
    app.mainloop()


if __name__ == "__main__":
    main()
