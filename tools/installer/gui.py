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
from save_editor import backup_save_file, list_save_files, read_save_json, write_save_json


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
        ttk.Button(actions, text="Save Editor", command=self.open_save_editor).pack(
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

    def open_save_editor(self):
        game_path = self.game_path.get().strip()
        if not game_path:
            messagebox.showwarning("Missing game folder", "Select a game folder first.")
            return

        try:
            SaveEditorWindow(self, game_path)
        except Exception as error:
            self.enqueue_log(f"ERROR: {error}")
            messagebox.showerror("Save editor error", str(error))

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


class SaveEditorWindow(tk.Toplevel):
    def __init__(self, parent, game_path):
        super().__init__(parent)
        self.parent = parent
        self.game_path = game_path
        self.save_paths = {}
        self.loaded_save_path = None
        self.loaded_data = None
        self.database = {"items": {}, "weapons": {}, "armors": {}, "actors": {}}
        self.actor_records = []
        self.actor_var = tk.StringVar()
        self.gold_var = tk.StringVar()
        self.inventory_category_var = tk.StringVar(value="items")
        self.inventory_quantity_var = tk.StringVar()
        self.inventory_show_all_var = tk.BooleanVar(value=True)
        self.actor_fields = {}
        self.actor_param_fields = {}
        self.status_text = tk.StringVar(value="Select a save file, then click Load JSON.")

        self.title("Save File Editor")
        self.geometry("980x680")
        self.minsize(820, 560)
        if parent.window_icon:
            self.iconphoto(True, parent.window_icon)

        self.create_widgets()
        self.refresh_saves()

    def create_widgets(self):
        outer = ttk.Frame(self, padding=12)
        outer.pack(fill=tk.BOTH, expand=True)

        help_text = (
            "Raw JSON editor for RPG Maker MV/MZ local save files. "
            "Every write creates a timestamped backup before changing the save."
        )
        ttk.Label(outer, text=help_text, wraplength=920, justify=tk.LEFT).pack(
            anchor=tk.W, pady=(0, 8)
        )

        top = ttk.Frame(outer)
        top.pack(fill=tk.BOTH, expand=True)

        list_frame = ttk.LabelFrame(top, text="Save files", padding=8)
        list_frame.pack(side=tk.LEFT, fill=tk.Y, padx=(0, 10))

        columns = ("slot", "name", "size", "modified", "codec")
        self.save_tree = ttk.Treeview(
            list_frame,
            columns=columns,
            show="headings",
            height=18,
            selectmode="browse",
        )
        for column, text, width in [
            ("slot", "Slot", 80),
            ("name", "File", 150),
            ("size", "Bytes", 70),
            ("modified", "Modified", 130),
            ("codec", "Engine", 60),
        ]:
            self.save_tree.heading(column, text=text)
            self.save_tree.column(column, width=width, anchor=tk.W)
        self.save_tree.pack(fill=tk.Y, expand=True)
        self.save_tree.bind("<Double-1>", lambda _event: self.load_selected_save())

        list_actions = ttk.Frame(list_frame)
        list_actions.pack(fill=tk.X, pady=(8, 0))
        ttk.Button(list_actions, text="Refresh", command=self.refresh_saves).pack(
            side=tk.LEFT
        )
        ttk.Button(list_actions, text="Load JSON", command=self.load_selected_save).pack(
            side=tk.LEFT, padx=(8, 0)
        )

        editor_frame = ttk.LabelFrame(top, text="Editor", padding=8)
        editor_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.editor_tabs = ttk.Notebook(editor_frame)
        self.editor_tabs.pack(fill=tk.BOTH, expand=True)

        structured_tab = ttk.Frame(self.editor_tabs, padding=8)
        raw_tab = ttk.Frame(self.editor_tabs, padding=8)
        self.editor_tabs.add(structured_tab, text="Structured")
        self.editor_tabs.add(raw_tab, text="Raw JSON")

        self.create_structured_editor(structured_tab)

        self.json_text = tk.Text(raw_tab, wrap=tk.NONE, undo=True)
        y_scroll = ttk.Scrollbar(raw_tab, orient=tk.VERTICAL, command=self.json_text.yview)
        x_scroll = ttk.Scrollbar(raw_tab, orient=tk.HORIZONTAL, command=self.json_text.xview)
        self.json_text.configure(yscrollcommand=y_scroll.set, xscrollcommand=x_scroll.set)
        self.json_text.grid(row=0, column=0, sticky="nsew")
        y_scroll.grid(row=0, column=1, sticky="ns")
        x_scroll.grid(row=1, column=0, sticky="ew")
        raw_tab.rowconfigure(0, weight=1)
        raw_tab.columnconfigure(0, weight=1)

        actions = ttk.Frame(outer)
        actions.pack(fill=tk.X, pady=(10, 0))
        ttk.Button(actions, text="Backup Selected", command=self.backup_selected_save).pack(
            side=tk.LEFT
        )
        ttk.Button(actions, text="Save Current Tab With Backup", command=self.save_loaded_json).pack(
            side=tk.LEFT, padx=(8, 0)
        )
        ttk.Button(actions, text="Close", command=self.destroy).pack(side=tk.RIGHT)

        ttk.Label(outer, textvariable=self.status_text, wraplength=920, justify=tk.LEFT).pack(
            anchor=tk.W, pady=(8, 0)
        )

    def create_structured_editor(self, parent):
        parent.columnconfigure(0, weight=1)
        parent.rowconfigure(2, weight=1)

        party_frame = ttk.LabelFrame(parent, text="Party", padding=8)
        party_frame.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        ttk.Label(party_frame, text="Gold").pack(side=tk.LEFT)
        ttk.Entry(party_frame, textvariable=self.gold_var, width=14).pack(
            side=tk.LEFT, padx=(8, 8)
        )
        actor_frame = ttk.LabelFrame(parent, text="Actor", padding=8)
        actor_frame.grid(row=1, column=0, sticky="ew", pady=(0, 8))
        actor_frame.columnconfigure(1, weight=1)

        ttk.Label(actor_frame, text="Actor").grid(row=0, column=0, sticky="w")
        self.actor_combo = ttk.Combobox(
            actor_frame,
            textvariable=self.actor_var,
            values=[],
            state="readonly",
        )
        self.actor_combo.grid(row=0, column=1, columnspan=5, sticky="ew", padx=(8, 0))
        self.actor_combo.bind("<<ComboboxSelected>>", lambda _event: self.populate_actor_fields())

        actor_field_specs = [
            ("_name", "Name"),
            ("_nickname", "Nickname"),
            ("_level", "Level"),
            ("_hp", "HP"),
            ("_mp", "MP"),
            ("_tp", "TP"),
        ]
        for index, (key, label) in enumerate(actor_field_specs):
            row = 1 + index // 3
            column = (index % 3) * 2
            ttk.Label(actor_frame, text=label).grid(
                row=row, column=column, sticky="w", pady=(8, 0)
            )
            var = tk.StringVar()
            self.actor_fields[key] = var
            ttk.Entry(actor_frame, textvariable=var, width=18).grid(
                row=row, column=column + 1, sticky="ew", padx=(8, 12), pady=(8, 0)
            )

        param_frame = ttk.Frame(actor_frame)
        param_frame.grid(row=3, column=0, columnspan=6, sticky="ew", pady=(10, 0))
        param_names = ["MHP", "MMP", "ATK", "DEF", "MAT", "MDF", "AGI", "LUK"]
        for index, label in enumerate(param_names):
            ttk.Label(param_frame, text=label).grid(row=0, column=index, sticky="w")
            var = tk.StringVar()
            self.actor_param_fields[index] = var
            ttk.Entry(param_frame, textvariable=var, width=8).grid(
                row=1, column=index, padx=(0, 8)
            )

        inventory_frame = ttk.LabelFrame(parent, text="Inventory", padding=8)
        inventory_frame.grid(row=2, column=0, sticky="nsew")
        inventory_frame.columnconfigure(0, weight=1)
        inventory_frame.rowconfigure(1, weight=1)

        inventory_controls = ttk.Frame(inventory_frame)
        inventory_controls.grid(row=0, column=0, sticky="ew", pady=(0, 8))
        ttk.Label(inventory_controls, text="Category").pack(side=tk.LEFT)
        category_combo = ttk.Combobox(
            inventory_controls,
            textvariable=self.inventory_category_var,
            values=["items", "weapons", "armors"],
            state="readonly",
            width=12,
        )
        category_combo.pack(side=tk.LEFT, padx=(8, 12))
        category_combo.bind("<<ComboboxSelected>>", lambda _event: self.populate_inventory())
        ttk.Checkbutton(
            inventory_controls,
            text="Show all database entries",
            variable=self.inventory_show_all_var,
            command=self.populate_inventory,
        ).pack(side=tk.LEFT)

        columns = ("id", "name", "quantity")
        self.inventory_tree = ttk.Treeview(
            inventory_frame,
            columns=columns,
            show="headings",
            height=10,
            selectmode="browse",
        )
        self.inventory_tree.heading("id", text="ID")
        self.inventory_tree.heading("name", text="Name")
        self.inventory_tree.heading("quantity", text="Qty")
        self.inventory_tree.column("id", width=60, anchor=tk.W)
        self.inventory_tree.column("name", width=360, anchor=tk.W)
        self.inventory_tree.column("quantity", width=80, anchor=tk.W)
        self.inventory_tree.grid(row=1, column=0, sticky="nsew")
        self.inventory_tree.bind("<<TreeviewSelect>>", lambda _event: self.populate_inventory_quantity())

        inventory_actions = ttk.Frame(inventory_frame)
        inventory_actions.grid(row=2, column=0, sticky="ew", pady=(8, 0))
        ttk.Label(inventory_actions, text="Quantity").pack(side=tk.LEFT)
        ttk.Entry(inventory_actions, textvariable=self.inventory_quantity_var, width=12).pack(
            side=tk.LEFT, padx=(8, 8)
        )

        save_actions = ttk.Frame(parent)
        save_actions.grid(row=3, column=0, sticky="ew", pady=(10, 0))
        ttk.Button(
            save_actions,
            text="Save Changes to File",
            command=lambda: self.save_loaded_json(force_structured=True),
        ).pack(side=tk.LEFT)
        ttk.Label(
            save_actions,
            text="Creates a backup, writes the save, then verifies by reading it back.",
        ).pack(side=tk.LEFT, padx=(10, 0))

    def refresh_saves(self):
        saves = list_save_files(self.game_path)
        for item_id in self.save_tree.get_children():
            self.save_tree.delete(item_id)

        self.save_paths = {}
        for index, save in enumerate(saves):
            item_id = str(index)
            self.save_paths[item_id] = save["path"]
            self.save_tree.insert(
                "",
                tk.END,
                iid=item_id,
                values=(
                    save["slot"],
                    save["name"],
                    save["size"],
                    save["modified"],
                    save["codec"],
                ),
            )

        self.status_text.set(f"Loaded {len(saves)} save file(s).")

    def get_selected_save_path(self):
        selected = self.save_tree.selection()
        if not selected:
            return None
        return self.save_paths.get(selected[0])

    def load_selected_save(self):
        save_path = self.get_selected_save_path()
        if not save_path:
            messagebox.showwarning("Missing save", "Select a save file first.")
            return

        try:
            json_text = read_save_json(self.game_path, save_path)
        except Exception as error:
            self.status_text.set(f"Could not load save: {error}")
            messagebox.showerror("Save load error", str(error))
            return

        self.loaded_save_path = save_path
        self.loaded_data = json.loads(json_text)
        self.database = self.load_database()
        self.json_text.delete("1.0", tk.END)
        self.json_text.insert("1.0", json_text)
        self.json_text.edit_reset()
        self.populate_structured_editor()
        self.status_text.set(f"Loaded JSON from {save_path}")

    def backup_selected_save(self):
        save_path = self.get_selected_save_path()
        if not save_path:
            messagebox.showwarning("Missing save", "Select a save file first.")
            return

        try:
            backup_path = backup_save_file(self.game_path, save_path)
        except Exception as error:
            self.status_text.set(f"Backup failed: {error}")
            messagebox.showerror("Backup error", str(error))
            return

        self.parent.enqueue_log(f"Save backup created: {backup_path}")
        self.status_text.set(f"Backup created: {backup_path}")
        messagebox.showinfo("Backup created", f"Save backup created:\n\n{backup_path}")

    def save_loaded_json(self, force_structured=False):
        if not self.loaded_save_path:
            messagebox.showwarning("Missing save", "Load a save file before writing JSON.")
            return

        json_text = self.prepare_json_text_for_save(force_structured=force_structured)
        if json_text is None:
            return

        confirm = messagebox.askyesno(
            "Write save file",
            "Write the edited JSON back to the save file?\n\n"
            "A backup copy will be created before writing.",
        )
        if not confirm:
            return

        try:
            backup_path = write_save_json(self.game_path, self.loaded_save_path, json_text)
        except Exception as error:
            self.status_text.set(f"Save failed: {error}")
            messagebox.showerror("Save write error", str(error))
            return

        self.parent.enqueue_log(f"Save file edited: {self.loaded_save_path}")
        self.parent.enqueue_log(f"Save backup created: {backup_path}")
        self.reload_loaded_save_from_disk()
        self.status_text.set(f"Saved and verified. Backup: {backup_path}")
        self.refresh_saves()
        messagebox.showinfo(
            "Save updated",
            "Save file updated and verified successfully.\n\n"
            f"Backup:\n{backup_path}\n\n"
            "If the game was open, close it before editing saves so it cannot overwrite the file.",
        )

    def load_database(self):
        target = detect_game(self.game_path)
        data_root = os.path.join(target.root_path, "data")
        return {
            "items": self.load_database_table(data_root, "Items.json"),
            "weapons": self.load_database_table(data_root, "Weapons.json"),
            "armors": self.load_database_table(data_root, "Armors.json"),
            "actors": self.load_database_table(data_root, "Actors.json"),
        }

    def load_database_table(self, data_root, filename):
        path = os.path.join(data_root, filename)
        if not os.path.exists(path):
            return {}

        try:
            with open(path, "r", encoding="utf-8-sig") as rf:
                data = json.load(rf)
        except (OSError, ValueError):
            return {}

        if not isinstance(data, list):
            return {}

        table = {}
        for entry in data:
            if not entry or not isinstance(entry, dict):
                continue
            entry_id = entry.get("id")
            if entry_id is None:
                continue
            table[str(entry_id)] = entry.get("name") or f"{filename} #{entry_id}"

        return table

    def reload_loaded_save_from_disk(self):
        if not self.loaded_save_path:
            return

        json_text = read_save_json(self.game_path, self.loaded_save_path)
        self.loaded_data = json.loads(json_text)
        self.json_text.delete("1.0", tk.END)
        self.json_text.insert("1.0", json_text)
        self.json_text.edit_reset()
        self.populate_structured_editor()

    def populate_structured_editor(self):
        if not self.loaded_data:
            return

        party = self.loaded_data.get("party") or {}
        self.gold_var.set(str(party.get("_gold", 0)))
        self.actor_records = self.get_actor_records()
        actor_labels = [record["label"] for record in self.actor_records]
        self.actor_combo.configure(values=actor_labels)
        self.actor_var.set(actor_labels[0] if actor_labels else "")
        self.populate_actor_fields()
        self.populate_inventory()

    def get_actor_records(self):
        actors = (self.loaded_data.get("actors") or {}).get("_data")
        actor_list = self.get_jsonex_array(actors)
        records = []

        for index, actor in enumerate(actor_list):
            if not actor or not isinstance(actor, dict):
                continue

            actor_id = actor.get("_actorId") or index
            database_name = self.database.get("actors", {}).get(str(actor_id), "")
            save_name = actor.get("_name") or database_name or f"Actor {actor_id}"
            label = f"{actor_id}: {save_name}"
            records.append(
                {
                    "label": label,
                    "actor": actor,
                    "actor_id": actor_id,
                    "index": index,
                }
            )

        return records

    def get_selected_actor_record(self):
        selected_label = self.actor_var.get()
        for record in self.actor_records:
            if record["label"] == selected_label:
                return record
        return None

    def populate_actor_fields(self):
        record = self.get_selected_actor_record()
        actor = record["actor"] if record else {}

        for key, var in self.actor_fields.items():
            var.set(str(actor.get(key, "")))

        param_plus = self.get_jsonex_array(actor.get("_paramPlus"))
        for index, var in self.actor_param_fields.items():
            value = param_plus[index] if index < len(param_plus) else 0
            var.set(str(value))

    def populate_inventory(self):
        if not hasattr(self, "inventory_tree"):
            return

        for item_id in self.inventory_tree.get_children():
            self.inventory_tree.delete(item_id)

        if not self.loaded_data:
            return

        category = self.inventory_category_var.get()
        inventory = self.get_inventory_map(category)
        database = self.database.get(category, {})
        ids = set(inventory.keys())
        if self.inventory_show_all_var.get():
            ids.update(database.keys())

        for entry_id in sorted(ids, key=self.safe_int_sort):
            if entry_id.startswith("@"):
                continue
            quantity = int(inventory.get(entry_id, 0) or 0)
            if not self.inventory_show_all_var.get() and quantity <= 0:
                continue
            name = database.get(entry_id, f"{category[:-1].title()} {entry_id}")
            self.inventory_tree.insert(
                "",
                tk.END,
                iid=entry_id,
                values=(entry_id, name, quantity),
            )

    def populate_inventory_quantity(self):
        selected = self.inventory_tree.selection()
        if not selected:
            self.inventory_quantity_var.set("")
            return

        entry_id = selected[0]
        inventory = self.get_inventory_map(self.inventory_category_var.get())
        self.inventory_quantity_var.set(str(inventory.get(entry_id, 0) or 0))

    def apply_gold(self):
        if not self.sync_loaded_data_from_json():
            messagebox.showwarning("Missing save", "Load a save first.")
            return

        try:
            self.apply_gold_to_loaded_data()
        except ValueError as error:
            messagebox.showerror("Invalid gold", str(error))
            return

        self.refresh_json_from_loaded_data("Applied gold to JSON.")

    def apply_actor(self):
        if not self.sync_loaded_data_from_json():
            messagebox.showwarning("Missing save", "Load a save first.")
            return

        try:
            self.apply_actor_to_loaded_data(require_actor=True)
        except ValueError as error:
            messagebox.showerror("Invalid actor value", str(error))
            return

        self.refresh_json_from_loaded_data("Applied actor changes to JSON.")

    def apply_inventory_quantity(self):
        if not self.sync_loaded_data_from_json():
            messagebox.showwarning("Missing save", "Load a save first.")
            return

        selected = self.inventory_tree.selection()
        if not selected:
            messagebox.showwarning("Missing item", "Select an inventory row first.")
            return

        try:
            self.apply_inventory_quantity_to_loaded_data(require_selection=True)
        except ValueError as error:
            messagebox.showerror("Invalid quantity", str(error))
            return

        self.populate_inventory()
        self.refresh_json_from_loaded_data("Applied inventory quantity to JSON.")

    def prepare_json_text_for_save(self, force_structured=False):
        if force_structured or self.is_structured_tab_selected():
            if not self.sync_loaded_data_from_json():
                return None

            try:
                self.apply_gold_to_loaded_data()
                self.apply_actor_to_loaded_data(require_actor=False)
                self.apply_inventory_quantity_to_loaded_data(require_selection=False)
            except ValueError as error:
                messagebox.showerror("Invalid structured value", str(error))
                return None

            self.refresh_json_from_loaded_data("Structured changes are ready to save.")
            return self.json_text.get("1.0", tk.END).strip()

        json_text = self.json_text.get("1.0", tk.END).strip()
        try:
            self.loaded_data = json.loads(json_text)
        except ValueError as error:
            messagebox.showerror("Invalid JSON", f"Fix the Raw JSON before saving.\n\n{error}")
            return None

        return json_text

    def is_structured_tab_selected(self):
        return self.editor_tabs.index(self.editor_tabs.select()) == 0

    def apply_gold_to_loaded_data(self):
        gold = self.parse_int(self.gold_var.get(), "Gold", minimum=0)
        party = self.loaded_data.setdefault("party", {})
        party["_gold"] = gold

    def apply_actor_to_loaded_data(self, require_actor):
        self.actor_records = self.get_actor_records()
        record = self.get_selected_actor_record()
        if not record:
            if require_actor:
                raise ValueError("Select an actor first.")
            return

        actor = record["actor"]
        text_fields = {"_name", "_nickname"}
        numeric_fields = {
            "_level": ("Level", 1),
            "_hp": ("HP", 0),
            "_mp": ("MP", 0),
            "_tp": ("TP", 0),
        }

        for key, var in self.actor_fields.items():
            if key in text_fields:
                actor[key] = var.get()
            elif key in numeric_fields:
                label, minimum = numeric_fields[key]
                actor[key] = self.parse_int(var.get(), label, minimum=minimum)

        param_plus = self.ensure_jsonex_array(actor, "_paramPlus", size=8)
        for index, var in self.actor_param_fields.items():
            param_plus[index] = self.parse_int(var.get(), f"Param {index}", minimum=None)

    def apply_inventory_quantity_to_loaded_data(self, require_selection):
        selected = self.inventory_tree.selection()
        if not selected:
            if require_selection:
                raise ValueError("Select an inventory row first.")
            return

        quantity_text = self.inventory_quantity_var.get().strip()
        if not quantity_text and not require_selection:
            return

        entry_id = selected[0]
        category = self.inventory_category_var.get()
        quantity = self.parse_int(quantity_text, "Quantity", minimum=0)
        inventory = self.get_inventory_map(category)

        if quantity <= 0:
            inventory.pop(entry_id, None)
        else:
            inventory[entry_id] = quantity

    def get_inventory_map(self, category):
        party = self.loaded_data.setdefault("party", {})
        key = {
            "items": "_items",
            "weapons": "_weapons",
            "armors": "_armors",
        }.get(category, "_items")

        inventory = party.get(key)
        if not isinstance(inventory, dict):
            inventory = {}
            party[key] = inventory
        return inventory

    def get_jsonex_array(self, value):
        if isinstance(value, list):
            return value
        if isinstance(value, dict) and isinstance(value.get("@a"), list):
            return value["@a"]
        return []

    def ensure_jsonex_array(self, owner, key, size=0):
        value = owner.get(key)
        if isinstance(value, list):
            array = value
        elif isinstance(value, dict) and isinstance(value.get("@a"), list):
            array = value["@a"]
        else:
            array = []
            owner[key] = array

        while len(array) < size:
            array.append(0)

        return array

    def refresh_json_from_loaded_data(self, message):
        json_text = json.dumps(self.loaded_data, ensure_ascii=False, indent=2)
        self.json_text.delete("1.0", tk.END)
        self.json_text.insert("1.0", json_text)
        self.json_text.edit_modified(False)
        self.status_text.set(message)

    def sync_loaded_data_from_json(self):
        if not self.loaded_save_path:
            return False

        json_text = self.json_text.get("1.0", tk.END).strip()
        if not json_text:
            return False

        try:
            self.loaded_data = json.loads(json_text)
        except ValueError as error:
            messagebox.showerror(
                "Invalid JSON",
                f"Fix the Raw JSON before applying structured changes.\n\n{error}",
            )
            return False

        return True

    def parse_int(self, value, label, minimum=0):
        try:
            parsed = int(str(value).strip())
        except ValueError as error:
            raise ValueError(f"{label} must be a whole number.") from error

        if minimum is not None and parsed < minimum:
            raise ValueError(f"{label} must be {minimum} or higher.")

        return parsed

    def safe_int_sort(self, value):
        try:
            return (0, int(value))
        except ValueError:
            return (1, value)


def main():
    app = InstallerApp()
    app.mainloop()


if __name__ == "__main__":
    main()
