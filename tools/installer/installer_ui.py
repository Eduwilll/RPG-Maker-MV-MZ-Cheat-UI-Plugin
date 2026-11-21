"""Guided Tkinter installer. Filesystem workers never access Tk objects."""

from collections import deque
from datetime import datetime
import json
import os
from pathlib import Path
import queue
import sys
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import webbrowser

if __package__:
    from .core import install_from_archive, install_from_source, uninstall
    from .presentation import JobRunner, explain_error, inspect_game
    from .save_editor import SAVE_EDITOR_BACKUP_DIR
    from .ui_theme import COLORS, ScrollableContent, configure_theme, help_button, window_sizes, wrapped_label
else:
    from core import install_from_archive, install_from_source, uninstall
    from presentation import JobRunner, explain_error, inspect_game
    from save_editor import SAVE_EDITOR_BACKUP_DIR
    from ui_theme import COLORS, ScrollableContent, configure_theme, help_button, window_sizes, wrapped_label


_AUTO = object()

PROJECT_URL = "https://github.com/Eduwilll/RPG-Maker-MV-MZ-Cheat-UI-Plugin"
DOCUMENTATION_URL = "https://eduwilll.github.io/RPG-Maker-MV-MZ-Cheat-UI-Plugin/"
LICENSE_URL = f"{PROJECT_URL}/blob/main/LICENSE"
ISSUES_URL = f"{PROJECT_URL}/issues/new/choose"
CONTRIBUTORS_URL = f"{PROJECT_URL}/graphs/contributors"
CREDIT_ROWS = (
    ("Original plugin", "paramonos", "https://github.com/paramonos/RPG-Maker-MV-MZ-Cheat-UI-Plugin"),
    ("Translation idea", "sieucapoccho3717", "https://github.com/sieucapoccho3717/RPG-Maker-MV-MZ-Cheat-UI-Plugin"),
    ("Map Event Panel", "Justype", "https://github.com/Justype/RPG-Maker-MV-MZ-Cheat-UI-Plugin"),
    ("Maintained and enhanced by", "Eduwilll", PROJECT_URL),
)


class InstallerApp(tk.Tk):
    def __init__(self, *, save_editor_factory=None, search_dirs=None, source_root=_AUTO,
                 source_version=None, visible=True):
        super().__init__()
        self.title("RPG Maker Cheat UI - Installer")
        default, minimum = window_sizes(self.winfo_screenwidth(), self.winfo_screenheight())
        self.geometry(f"{default[0]}x{default[1]}")
        self.minsize(*minimum)
        self.family = configure_theme(self)
        self.window_icon = None
        self.brand_icon = None
        self.set_window_icon()
        self.runner = JobRunner()
        self.save_editor_factory = save_editor_factory
        self.save_editor_window = None
        self.save_editor_windows = {}
        self.search_dirs = self.get_release_archive_search_dirs() if search_dirs is None else list(search_dirs)
        project = Path(__file__).resolve().parents[2]
        if source_root is _AUTO:
            candidate = project / "cheat-engine" / "www"
            source_root = candidate if not getattr(sys, "frozen", False) and candidate.is_dir() else None
        self.source_root = str(source_root) if source_root is not None else None
        self.source_version = source_version or self.read_source_version(project)
        self.inspection = None
        self.revision = 0
        self._check_id = None
        self._poll_id = None
        self._pending_check = False
        self._destroyed = False
        self._active_operation = None
        self.mutable_controls = []
        self.backup_labels = {}
        self.log_lines = deque(maxlen=2000)
        self.advanced_visible = False
        self.details_visible = False
        self.current_view = "install"
        self.game_path = tk.StringVar(self)
        self.archive_path = tk.StringVar(self)
        self.version = tk.StringVar(self)
        self.edition = tk.StringVar(self, value="offline")
        self.clean_settings = tk.BooleanVar(self, value=False)
        self.selected_backup = tk.StringVar(self)
        self.game_title = tk.StringVar(self, value="No game selected")
        self.engine_text = tk.StringVar(self, value="Detected automatically")
        self.installed_text = tk.StringVar(self, value="Not checked yet")
        self.package_text = tk.StringVar(self, value="We'll find the right MV/MZ package for you.")
        self.original_text = tk.StringVar(self, value="Choose a game to see its recovery options.")
        self.notice_title = tk.StringVar(self, value="Start with your game folder")
        self.notice_body = tk.StringVar(self, value="Choose the folder that contains Game.exe. You don't need to know whether the game uses MV or MZ.")
        self.status_text = tk.StringVar(self, value="Ready when you are")
        self.steps_text = tk.StringVar(self, value="1  CHOOSE GAME     /     2  REVIEW     /     3  INSTALL")
        self.create_widgets()
        self.game_path.trace_add("write", self._inputs_changed)
        self.archive_path.trace_add("write", self._inputs_changed)
        self.edition.trace_add("write", self._inputs_changed)
        self.version.trace_add("write", lambda *_: self._update_package_text())
        self.protocol("WM_DELETE_WINDOW", self.on_close)
        self.bind("<Control-o>", lambda _event: self.browse_game())
        self.bind("<FocusIn>", self._reveal_focus, add="+")
        self._refresh_controls()
        self._poll_id = self.after(60, self._drain_events)
        if visible:
            self.after_idle(self.deiconify)
        else:
            self.withdraw()

    @staticmethod
    def get_resource_path(relative_path):
        root = Path(sys._MEIPASS) if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS") else Path(__file__).resolve().parents[2]
        return str(root / relative_path)

    @staticmethod
    def read_source_version(project):
        try:
            with open(project / "package.json", encoding="utf-8") as stream:
                return str(json.load(stream).get("version") or "unknown")
        except (OSError, ValueError):
            return "unknown"

    def set_window_icon(self):
        try:
            self.window_icon = tk.PhotoImage(master=self, file=self.get_resource_path("docs/public/logo.png"))
            self.iconphoto(True, self.window_icon)
            scale = max(1, (max(self.window_icon.width(), self.window_icon.height()) + 31) // 32)
            self.brand_icon = self.window_icon.subsample(scale, scale)
        except tk.TclError:
            try:
                self.iconbitmap(self.get_resource_path("docs/public/favicon.ico"))
            except tk.TclError:
                pass

    def get_release_archive_search_dirs(self):
        paths = []
        if getattr(sys, "frozen", False):
            paths.append(os.path.dirname(sys.executable))
        paths.extend([os.getcwd(), str(Path(__file__).resolve().parents[2] / "output")])
        return list(dict.fromkeys(path for path in paths if os.path.isdir(path)))

    def _track(self, widget):
        self.mutable_controls.append(widget)
        return widget

    def create_widgets(self):
        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)
        sidebar = ttk.Frame(self, style="Sidebar.TFrame", padding=(12, 16), width=180)
        sidebar.grid(row=0, column=0, rowspan=2, sticky="nsew")
        sidebar.grid_propagate(False)
        sidebar.columnconfigure(0, weight=1)
        sidebar.rowconfigure(6, weight=1)
        if self.brand_icon:
            ttk.Label(sidebar, image=self.brand_icon, style="Sidebar.TLabel").grid(row=0, column=0, sticky="w", pady=(0, 10))
        ttk.Label(sidebar, text="RPG Maker\nCheat UI", style="Brand.TLabel").grid(row=1, column=0, sticky="w")
        ttk.Label(sidebar, text="MV + MZ", style="SidebarMuted.TLabel").grid(row=2, column=0, sticky="w", pady=(4, 18))
        self.setup_button = self._track(ttk.Button(sidebar, text="Install / update", style="Selected.Nav.TButton", command=lambda: self.show_view("install")))
        self.setup_button.grid(row=3, column=0, sticky="ew", pady=(0, 8))
        self.manage_button = self._track(ttk.Button(sidebar, text="Manage", style="Nav.TButton", command=lambda: self.show_view("manage")))
        self.manage_button.grid(row=4, column=0, sticky="ew")
        self.save_editor_button = self._track(ttk.Button(sidebar, text="Save editor", style="Nav.TButton", command=self.open_save_editor))
        self.save_editor_button.grid(row=7, column=0, sticky="ew")
        self.about_button = self._track(ttk.Button(sidebar, text="About", style="Nav.TButton", command=lambda: self.show_view("about")))
        self.about_button.grid(row=8, column=0, sticky="ew", pady=(8, 0))
        self.scroller = ScrollableContent(self)
        self.scroller.grid(row=0, column=1, sticky="nsew")
        content = self.scroller.body
        header = ttk.Frame(content)
        header.pack(fill="x", pady=(0, 12))
        self.header_help = help_button(header, "Choose a game folder or paste the path to Game.exe. MV/MZ and the correct package are detected automatically. Close the game before installing. Advanced options are optional.")
        self.header_help.pack(side="right")
        self.heading = wrapped_label(header, text="Install plugin", style="Heading.TLabel")
        self.heading.pack(side="left", fill="x", expand=True)
        self.subtitle = wrapped_label(content, text="Install the Cheat UI in a few clicks. No manual file copying needed.")
        self._create_game_picker(content)
        self._create_notice(content)
        self.install_page = ttk.Frame(content)
        self.install_page.pack(fill="x")
        edition_row = ttk.Frame(self.install_page)
        edition_row.pack(fill="x", pady=(0, 8))
        ttk.Label(edition_row, text="Edition").pack(side="left", padx=(0, 12))
        self._track(ttk.Radiobutton(edition_row, text="Offline", variable=self.edition, value="offline")).pack(side="left")
        self._track(ttk.Radiobutton(edition_row, text="Online (cached)", variable=self.edition, value="online")).pack(side="left", padx=(12, 0))
        help_button(edition_row, "Offline includes everything and is portable. Online downloads verified dependencies once into a shared cache on this computer, then works offline. The cache is kept when a game is uninstalled.").pack(side="left", padx=(8, 0))
        self._create_review(self.install_page)
        self._create_advanced(self.install_page)
        self.manage_page = ttk.Frame(content)
        self._create_maintenance(self.manage_page)
        self.about_page = ttk.Frame(content)
        self._create_about(self.about_page)
        self.details_toggle = ttk.Button(content, text="Show activity log", command=self.toggle_details)
        self.details_toggle.pack(anchor="w", pady=(8, 0))
        self.details_frame = ttk.Frame(content, style="Card.TFrame", padding=12)
        log_tools = ttk.Frame(self.details_frame)
        log_tools.pack(fill="x", pady=(0, 10))
        ttk.Button(log_tools, text="Copy log", command=self.copy_log).pack(side="left")
        ttk.Button(log_tools, text="Save log...", command=self.save_log).pack(side="left", padx=(8, 0))
        self.log_box = tk.Text(self.details_frame, height=9, wrap="word", state="disabled", font=("Consolas", 10), background=COLORS["log_bg"], foreground=COLORS["text"], relief="flat", highlightthickness=1, highlightbackground=COLORS["border"], highlightcolor=COLORS["accent"])
        self.log_box.pack(side="left", fill="both", expand=True)
        log_scroll = ttk.Scrollbar(self.details_frame, command=self.log_box.yview)
        self.log_box.configure(yscrollcommand=log_scroll.set)
        log_scroll.pack(side="right", fill="y")
        footer = ttk.Frame(self, padding=(20, 10))
        footer.grid(row=1, column=1, sticky="ew")
        footer.columnconfigure(0, weight=1)
        wrapped_label(footer, textvariable=self.status_text).grid(row=0, column=0, sticky="ew", padx=(0, 14))
        ttk.Button(footer, text="Close", command=self.on_close).grid(row=0, column=1, padx=(0, 10))
        self.install_button = ttk.Button(footer, text="Install plugin", style="Primary.TButton", command=self.run_install)
        self.install_button.grid(row=0, column=2)
        self.progress = ttk.Progressbar(footer, mode="indeterminate")
        self.progress.grid(row=1, column=0, columnspan=3, sticky="ew", pady=(12, 0))
        self.progress.grid_remove()

    def _create_game_picker(self, parent):
        card = ttk.Frame(parent, style="Card.TFrame", padding=12)
        self.game_picker_card = card
        card.pack(fill="x", pady=(0, 8))
        ttk.Label(card, text="Game folder", style="Section.TLabel").pack(anchor="w", pady=(0, 8))
        row = ttk.Frame(card, style="Surface.TFrame")
        row.pack(fill="x")
        self.game_entry = self._track(ttk.Entry(row, textvariable=self.game_path))
        self.game_entry.pack(side="left", fill="x", expand=True)
        self.game_entry.bind("<Return>", lambda _event: self.run_status())
        self._track(ttk.Button(row, text="Browse...", command=self.browse_game)).pack(side="left", padx=(8, 0))
        self._track(ttk.Button(row, text="Check", command=self.run_status)).pack(side="left", padx=(8, 0))

    def _create_notice(self, parent):
        self.notice_frame = ttk.Frame(parent, style="info.TFrame", padding=(12, 8))
        self.notice_frame.pack(fill="x", pady=(0, 8))
        row = ttk.Frame(self.notice_frame, style="info.TFrame")
        self.notice_row = row
        row.pack(fill="x")
        help_button(row, self.notice_body.get).pack(side="right", padx=(8, 0))
        self.notice_heading = wrapped_label(row, textvariable=self.notice_title, style="info.Title.TLabel")
        self.notice_heading.pack(fill="x")
        self.notice_label = wrapped_label(self.notice_frame, textvariable=self.notice_body, style="info.TLabel")
        self.open_folder_button = ttk.Button(self.notice_frame, text="Open game folder", command=self.open_game_folder)

    def _create_review(self, parent):
        card = ttk.Frame(parent, style="Card.TFrame", padding=12)
        self.review_card = card
        header = ttk.Frame(card, style="Surface.TFrame")
        header.pack(fill="x", pady=(0, 6))
        help_button(header, "Close the game before installing. Saves are not changed. Original game files are backed up when available, and existing plugin files are backed up before updates.").pack(side="right")
        ttk.Label(header, text="Installation", style="Section.TLabel").pack(side="left")
        for label, variable in [("GAME", self.game_title), ("ENGINE", self.engine_text), ("INSTALLED", self.installed_text), ("INSTALLING", self.package_text)]:
            row = ttk.Frame(card, style="Surface.TFrame")
            row.pack(fill="x", pady=2)
            ttk.Label(row, text=label, style="CardMuted.TLabel", width=12).pack(side="left", anchor="n")
            wrapped_label(row, textvariable=variable, style="Card.TLabel").pack(side="left", fill="x", expand=True)

    def _create_advanced(self, parent):
        self.advanced_toggle = self._track(ttk.Button(parent, text="Show advanced options", command=self.toggle_advanced))
        self.advanced_toggle.pack(anchor="w")
        self.advanced_frame = ttk.Frame(parent, style="Card.TFrame", padding=12)
        ttk.Label(self.advanced_frame, text="Advanced options", style="Section.TLabel").pack(anchor="w")
        ttk.Label(self.advanced_frame, text="Release package (optional)", style="Card.TLabel").pack(anchor="w", pady=(8, 0))
        row = ttk.Frame(self.advanced_frame, style="Surface.TFrame")
        row.pack(fill="x", pady=(6, 8))
        self._track(ttk.Entry(row, textvariable=self.archive_path)).pack(side="left", fill="x", expand=True)
        self._track(ttk.Button(row, text="Browse...", command=self.browse_archive)).pack(side="left", padx=(8, 0))
        self._track(ttk.Button(row, text="Use automatic", command=lambda: self.archive_path.set(""))).pack(side="left", padx=(8, 0))
        ttk.Label(self.advanced_frame, text="Version override (optional)", style="Card.TLabel").pack(anchor="w", pady=(8, 4))
        self._track(ttk.Entry(self.advanced_frame, textvariable=self.version, width=25)).pack(anchor="w")
        row = ttk.Frame(self.advanced_frame, style="Surface.TFrame")
        row.pack(fill="x", pady=(8, 0))
        self._track(ttk.Checkbutton(row, text="Reset cheat preferences", variable=self.clean_settings)).pack(side="left")
        help_button(row, "Off by default. Removes cheat-settings, including preferences and translation cache, not game saves. The installation confirmation warns when this is enabled.").pack(side="right")

    def _create_maintenance(self, parent):
        card = ttk.Frame(parent, style="Card.TFrame", padding=12)
        card.pack(fill="x", pady=(0, 8))
        header = ttk.Frame(card, style="Surface.TFrame")
        header.pack(fill="x")
        help_button(header, "Restore uses the selected dated backup, not necessarily original files. Cheat preferences are reset; game saves stay unchanged. Uninstall instead uses the original-game backup when available.").pack(side="right")
        ttk.Label(header, text="Restore backup", style="Section.TLabel").pack(side="left")
        wrapped_label(card, textvariable=self.original_text, style="CardMuted.TLabel").pack(fill="x", pady=(8, 8))
        self.backup_combo = self._track(ttk.Combobox(card, textvariable=self.selected_backup, state="readonly", values=[]))
        self.backup_combo.pack(fill="x")
        self.backup_combo.bind("<<ComboboxSelected>>", lambda _event: self._refresh_controls())
        self.restore_button = ttk.Button(card, text="Restore selected backup", command=self.run_restore)
        self.restore_button.pack(anchor="w", pady=(12, 0))
        card = ttk.Frame(parent, style="Card.TFrame", padding=12)
        card.pack(fill="x")
        header = ttk.Frame(card, style="Surface.TFrame")
        header.pack(fill="x", pady=(0, 8))
        help_button(header, "Uninstall restores original files when a backup exists. Otherwise cheat files are removed and a disabled loader keeps the game playable. Save files are not deleted.").pack(side="right")
        ttk.Label(header, text="Uninstall", style="Section.TLabel").pack(side="left")
        self.uninstall_button = ttk.Button(card, text="Uninstall plugin...", style="Danger.TButton", command=self.run_uninstall)
        self.uninstall_button.pack(anchor="w")

    def _create_about(self, parent):
        card = ttk.Frame(parent, style="Card.TFrame", padding=16)
        card.pack(fill="x", pady=(0, 8))
        ttk.Label(card, text="RPG Maker MV/MZ Cheat UI Installer", style="Section.TLabel").pack(anchor="w")
        version = str(self.source_version or "").strip()
        if version and version.lower() != "unknown":
            version = version if version.lower().startswith("v") else "v" + version
            ttk.Label(card, text=f"Version {version}", style="CardMuted.TLabel").pack(anchor="w", pady=(2, 0))
        wrapped_label(
            card,
            text="Guided installer for the RPG Maker MV/MZ Cheat UI plugin. It detects the engine, installs the matching release, keeps backups and can edit local save files.",
            style="Card.TLabel",
        ).pack(fill="x", pady=(10, 12))
        links = ttk.Frame(card, style="Surface.TFrame")
        links.pack(fill="x")
        ttk.Button(links, text="GitHub repository", command=lambda: self.open_link(PROJECT_URL, "GitHub repository")).pack(side="left")
        ttk.Button(links, text="Documentation", command=lambda: self.open_link(DOCUMENTATION_URL, "documentation")).pack(side="left", padx=(8, 0))
        ttk.Button(links, text="Report an issue", command=lambda: self.open_link(ISSUES_URL, "issue page")).pack(side="left", padx=(8, 0))

        card = ttk.Frame(parent, style="Card.TFrame", padding=16)
        card.pack(fill="x", pady=(0, 8))
        ttk.Label(card, text="CREDITS", style="Eyebrow.TLabel").pack(anchor="w")
        wrapped_label(
            card,
            text="This fork builds on the work of the RPG Maker cheat UI community.",
            style="CardMuted.TLabel",
        ).pack(fill="x", pady=(2, 10))
        credits = ttk.Frame(card, style="Surface.TFrame")
        credits.pack(fill="x")
        credits.columnconfigure(1, weight=1)
        for index, (role, name, url) in enumerate(CREDIT_ROWS):
            ttk.Label(credits, text=role, style="CardMuted.TLabel").grid(row=index, column=0, sticky="w", pady=2)
            ttk.Label(credits, text=name, style="Card.TLabel").grid(row=index, column=1, sticky="w", padx=(10, 8), pady=2)
            ttk.Button(credits, text="GitHub", command=lambda target=url: self.open_link(target, name)).grid(row=index, column=2, sticky="e", pady=2)
        contributors_row = len(CREDIT_ROWS)
        ttk.Label(credits, text="Contributors", style="CardMuted.TLabel").grid(row=contributors_row, column=0, sticky="w", pady=(8, 0))
        ttk.Button(credits, text="View all on GitHub", command=lambda: self.open_link(CONTRIBUTORS_URL, "contributors page")).grid(
            row=contributors_row, column=1, columnspan=2, sticky="w", padx=(10, 0), pady=(8, 0)
        )

        card = ttk.Frame(parent, style="Card.TFrame", padding=16)
        card.pack(fill="x")
        ttk.Label(card, text="LICENSE", style="Eyebrow.TLabel").pack(anchor="w")
        wrapped_label(
            card,
            text="MIT License. Original project copyright (c) 2022 paramonos. The full license text is in the repository.",
            style="Card.TLabel",
        ).pack(fill="x", pady=(4, 10))
        ttk.Button(card, text="Read the license", command=lambda: self.open_link(LICENSE_URL, "license")).pack(anchor="w")
        wrapped_label(
            card,
            text="Built with Python and Tkinter. The in-game UI uses Vue.js and Vuetify. RPG Maker MV/MZ are trademarks of their respective owners.",
            style="CardMuted.TLabel",
        ).pack(fill="x", pady=(12, 0))

    def _set_notice(self, kind, title, body, *, folder=False):
        self.notice_title.set(title)
        self.notice_body.set(body)
        self.notice_frame.configure(style=f"{kind}.TFrame")
        self.notice_row.configure(style=f"{kind}.TFrame")
        self.notice_heading.configure(style=f"{kind}.Title.TLabel")
        self.notice_label.configure(style=f"{kind}.TLabel")
        self.notice_label.pack_forget()
        if kind in {"error", "warning"}:
            self.notice_label.pack(fill="x", pady=(6, 0))
        self.open_folder_button.pack_forget()
        if folder:
            self.open_folder_button.pack(anchor="w", pady=(12, 0))

    def _refresh_controls(self):
        busy = self.runner.busy
        for widget in self.mutable_controls:
            widget.state(["disabled"] if busy else ["!disabled"])
        valid = self.inspection is not None
        self.install_button.state(["!disabled"] if valid and self.inspection.source and not busy else ["disabled"])
        self.save_editor_button.state(["!disabled"] if valid and not busy else ["disabled"])
        self.restore_button.state(["!disabled"] if valid and self.get_selected_backup_path() and not busy else ["disabled"])
        removable = valid and (self.inspection.status["installed"] or self.inspection.status["original_backup"] or os.path.lexists(os.path.join(self.inspection.status["root_path"], "cheat")))
        self.uninstall_button.state(["!disabled"] if removable and not busy else ["disabled"])
        self.open_folder_button.state(["!disabled"] if valid and not busy else ["disabled"])

    def _inputs_changed(self, *_args):
        self.revision += 1
        self.inspection = None
        self.review_card.pack_forget()
        self.game_title.set("No game selected")
        self.engine_text.set("Detected automatically")
        self.installed_text.set("Check the selected game")
        self.package_text.set("Waiting for a game check")
        self.original_text.set("Check the selected game to see recovery options.")
        self.populate_backups([])
        self._cancel_check()
        self._refresh_controls()
        if self.game_path.get().strip():
            self._set_notice("info", "Checking your selection", "We'll detect the engine and find a matching package automatically.")
            self._check_id = self.after(500, self.run_status)
        else:
            self._set_notice("info", "Start with your game folder", "Choose the folder containing Game.exe, or paste its path above.")
            self.status_text.set("Choose a game to continue")

    def _cancel_check(self):
        if self._check_id:
            self.after_cancel(self._check_id)
            self._check_id = None

    def browse_game(self):
        if self.runner.busy:
            return
        path = filedialog.askdirectory(parent=self, title="Choose the folder containing Game.exe", mustexist=True)
        if path:
            self.game_path.set(path)
            self.run_status()

    def browse_archive(self):
        path = filedialog.askopenfilename(parent=self, title="Choose an MV/MZ release package", filetypes=[("Cheat release packages", "*.tar.gz *.tgz"), ("All files", "*.*")])
        if path:
            self.archive_path.set(path)
            self.run_status()

    def run_status(self):
        self._cancel_check()
        if self.runner.busy:
            self._pending_check = True
            return
        game_path = self.game_path.get().strip()
        if not game_path:
            self.game_entry.focus_set()
            return
        revision = self.revision
        options = self._inspection_options()
        self._start_job("inspect", lambda: (revision, inspect_game(game_path, **options)))

    def _inspection_options(self):
        return {"archive_path": self.archive_path.get().strip(), "search_dirs": tuple(self.search_dirs), "source_root": self.source_root, "source_version": self.source_version, "edition": self.edition.get()}

    def _start_job(self, operation, work):
        if not self.runner.start(operation, work):
            return False
        self._active_operation = operation
        self.status_text.set({"inspect": "Checking game and package...", "install": "Installing plugin... Please keep this window open.", "restore": "Restoring backup... Please keep this window open.", "uninstall": "Removing plugin... Please keep this window open."}.get(operation, "Working..."))
        self.progress.grid()
        self.progress.start(12)
        self._refresh_controls()
        if operation != "inspect":
            self._set_notice("info", "Working on your game", "Please keep the game closed and wait for the completion message. Backups and technical details appear in Activity.")
            self.steps_text.set("1  GAME SELECTED     /     2  REVIEWED     /     3  WORKING")
        return True

    def _operation(self, action, game_path, options):
        result = action()
        try:
            fresh = inspect_game(game_path, **options)
        except Exception as error:
            self.runner.log(f"Operation finished, but status refresh failed: {error}")
            fresh = None
        return {"result": result, "inspection": fresh}

    def run_install(self):
        if self.runner.busy or self.inspection is None or self.inspection.source is None:
            return
        inspection = self.inspection
        source = inspection.source
        game_path = inspection.status["game_path"]
        version = self.version.get().strip() or None
        reset = self.clean_settings.get()
        action_name = "Update / reinstall" if inspection.status["installed"] else "Install"
        confirmation = f"{action_name} the Cheat UI for {inspection.title}?\n\nGame folder:\n{game_path}\n\nClose the game before continuing. Game save files will not be changed."
        if reset:
            confirmation += "\n\nReset preferences is ON: existing cheat-settings and translation cache will be removed."
        if not messagebox.askyesno(f"{action_name} plugin", confirmation, parent=self):
            return
        options = self._inspection_options()
        if source.kind == "archive":
            action = lambda: install_from_archive(game_path, source.path, version=version, clean_settings=reset, logger=self.runner.log, edition=options["edition"])
        else:
            action = lambda: install_from_source(game_path, source.path, version=version or source.version, clean_settings=reset, logger=self.runner.log, edition=options["edition"])
        self._start_job("install", lambda: self._operation(action, game_path, options))

    def run_restore(self):
        if self.runner.busy or self.inspection is None:
            return
        backup = self.get_selected_backup_path()
        if not backup:
            return
        game_path = self.inspection.status["game_path"]
        if not messagebox.askyesno("Restore this backup?", f"Restore {self.selected_backup.get()} for {self.inspection.title}?\n\nThis replaces files covered by the backup and resets cheat preferences. Game saves will not be changed. Keep the game closed.\n\n{backup}", parent=self):
            return
        options = self._inspection_options()
        self._start_job("restore", lambda: self._operation(lambda: uninstall(game_path, backup_path=backup, logger=self.runner.log), game_path, options))

    def run_uninstall(self):
        if self.runner.busy or self.inspection is None or self.uninstall_button.instate(["disabled"]):
            return
        game_path = self.inspection.status["game_path"]
        recovery = "Original game files will be restored from their backup." if self.inspection.status["original_backup"] else "No original-game backup was found. Cheat files will be removed; a disabled loader will keep the game playable."
        if not messagebox.askyesno("Uninstall the Cheat UI?", f"Remove the Cheat UI from {self.inspection.title}?\n\n{recovery}\n\nCheat preferences are removed. Your game saves stay unchanged. Close the game before continuing.", parent=self):
            return
        options = self._inspection_options()
        self._start_job("uninstall", lambda: self._operation(lambda: uninstall(game_path, logger=self.runner.log), game_path, options))

    def _apply_inspection(self, inspection):
        self.inspection = inspection
        self.review_card.pack(fill="x", pady=(0, 12), before=self.advanced_toggle)
        status = inspection.status
        self.game_title.set(inspection.title)
        self.engine_text.set(f"RPG Maker {status['game_type']}")
        self.installed_text.set((str(status["version"] or "Version unknown") + " - " + str(status.get("edition") or "legacy").title()) if status["installed"] else "Not installed")
        self.install_button.configure(text="Update / reinstall" if status["installed"] else "Install plugin")
        self._update_package_text()
        self.populate_backups(status.get("backups") or [])
        self.original_text.set("Original-game backup available." if status["original_backup"] else "No original-game backup available.")
        self._append_log(f"Detected {status['game_type']}: {inspection.title}\nGame root: {status['root_path']}")
        if inspection.source:
            self._append_log(f"Install source: {inspection.source.path}")
        self._refresh_controls()

    def _update_package_text(self):
        if not self.inspection or not self.inspection.source:
            if self.inspection:
                self.package_text.set("Package needed - see the message above")
            return
        source = self.inspection.source
        version = self.version.get().strip() or source.version
        version = version if version.lower().startswith("v") else "v" + version
        edition_name = "Legacy local" if source.edition == "legacy" else source.edition.title() + (" (cached)" if source.edition == "online" else "")
        self.package_text.set(f"{version[:100]} - {edition_name} - " + ("local development source" if source.kind == "source" else "matching release package found"))

    def _complete(self, operation, data):
        if operation == "inspect":
            revision, inspection = data
            if revision != self.revision:
                return
            self._apply_inspection(inspection)
            if inspection.source:
                self._set_notice("success", "Your game is ready for setup", "Review the detected game below, close the game, then choose Install plugin or Update / reinstall.")
                self.status_text.set("Ready to install" if not inspection.status["installed"] else "Plugin detected - ready to update")
                self.steps_text.set("1  GAME SELECTED     /     2  REVIEW     /     3  INSTALL")
            else:
                self._set_notice("warning", "Game found. Installation package needed.", inspection.package_error)
                self.status_text.set("Game detected - add a matching package to install")
        elif isinstance(data, dict) and "result" in data:
            if data["inspection"] is not None:
                self._apply_inspection(data["inspection"])
            else:
                self.inspection = None
            if data["inspection"] is None:
                self._set_notice("warning", "Operation finished. Check status again.", "The file operation completed, but the game status couldn't be refreshed. Use Check before starting another operation; technical details are in Activity.")
                self.status_text.set("Operation finished - status check needed")
            else:
                title, body = {
                    "install": ("You're ready to play.", "The Cheat UI is installed. Open the game normally and press the middle mouse button to open the overlay. You can return here to update or uninstall."),
                    "restore": ("Backup restored.", "The selected backup was restored. Cheat preferences were reset; your game saves were not changed. You can open the game normally."),
                    "uninstall": ("Cheat UI removed.", "The plugin has been removed. Original files were restored when available; otherwise a disabled loader was kept so the game can start. Your save files were not changed."),
                }[operation]
                self._set_notice("success", title, body, folder=True)
                self.status_text.set({"install": "Installation complete", "restore": "Restore complete", "uninstall": "Uninstall complete"}[operation])
            self.steps_text.set("1  GAME SELECTED     /     2  REVIEWED     /     3  COMPLETE")
        self._refresh_controls()

    def _drain_events(self):
        self._poll_id = None
        for _ in range(80):
            try:
                kind, operation, data = self.runner.events.get_nowait()
            except queue.Empty:
                break
            if kind == "log":
                self._append_log(data)
                if self.runner.busy:
                    for marker, phase in [("Downloading dependency", "Preparing verified Online dependencies..."), ("backup", "Protecting game and plugin files..."), ("Copying", "Copying plugin files..."), ("bootstrap", "Setting up game startup..."), ("Extracting", "Opening release package..."), ("Restoring", "Restoring backed-up files...")]:
                        if marker in data:
                            self.status_text.set(phase)
                            break
                continue
            self.runner.finish()
            self._active_operation = None
            self.progress.stop()
            self.progress.grid_remove()
            if kind == "error":
                title, advice = explain_error(data)
                self._append_log(f"ERROR [{operation}] {type(data).__name__}: {data}")
                self._set_notice("error", title, advice)
                self.status_text.set("Could not finish - check the message above")
                if not self.details_visible:
                    self.toggle_details()
                self.inspection = None
                self.review_card.pack_forget()
                self.populate_backups([])
                self.original_text.set("Check the game again to refresh its recovery options.")
            else:
                self._complete(operation, data)
            self._refresh_controls()
        if self._pending_check and not self.runner.busy:
            self._pending_check = False
            self.run_status()
        if not self._destroyed:
            self._poll_id = self.after(60, self._drain_events)

    def populate_backups(self, backups):
        current = self.get_selected_backup_path()
        self.backup_labels = {
            self.format_backup_label(backup): backup["path"]
            for backup in backups if backup.get("name") != SAVE_EDITOR_BACKUP_DIR
        }
        self.backup_combo.configure(values=list(self.backup_labels))
        label = next((label for label, path in self.backup_labels.items() if path == current), next(iter(self.backup_labels), ""))
        self.selected_backup.set(label)

    @staticmethod
    def format_backup_label(backup):
        reason = "Original game files" if backup.get("reason") == "original-game" else "Plugin backup"
        timestamp = backup.get("createdAt", backup["name"])
        try:
            timestamp = datetime.fromisoformat(timestamp).strftime("%d %b %Y, %H:%M:%S")
        except ValueError:
            pass
        return f"{reason} - {timestamp} [{backup['name']}]"

    def get_selected_backup_path(self):
        return self.backup_labels.get(self.selected_backup.get())

    def toggle_advanced(self):
        self.advanced_visible = not self.advanced_visible
        if self.advanced_visible:
            self.advanced_frame.pack(fill="x", pady=(12, 0))
        else:
            self.advanced_frame.pack_forget()
        self.advanced_toggle.configure(text="Hide advanced options" if self.advanced_visible else "Show advanced options")

    def toggle_details(self):
        self.details_visible = not self.details_visible
        if self.details_visible:
            self.details_frame.pack(fill="both", expand=True, pady=(10, 0))
        else:
            self.details_frame.pack_forget()
        self.details_toggle.configure(text="Hide activity log" if self.details_visible else "Show activity log")

    def show_view(self, view):
        if self.runner.busy:
            return
        pages = {"install": self.install_page, "manage": self.manage_page, "about": self.about_page}
        if view not in pages:
            view = "install"
        self.current_view = view
        for page in pages.values():
            page.pack_forget()
        if view == "about":
            self.game_picker_card.pack_forget()
            self.notice_frame.pack_forget()
        else:
            if not self.game_picker_card.winfo_manager():
                self.game_picker_card.pack(fill="x", pady=(0, 8), before=self.details_toggle)
            if not self.notice_frame.winfo_manager():
                self.notice_frame.pack(fill="x", pady=(0, 8), before=self.details_toggle)
        pages[view].pack(fill="x", before=self.details_toggle)
        for name, button in (("install", self.setup_button), ("manage", self.manage_button), ("about", self.about_button)):
            button.configure(style="Selected.Nav.TButton" if view == name else "Nav.TButton")
        headings = {"install": "Install plugin", "manage": "Manage installation", "about": "About"}
        subtitles = {
            "install": "Install the Cheat UI in a few clicks. No manual file copying needed.",
            "manage": "Review backups, roll back a plugin version, or remove the Cheat UI.",
            "about": "Project links, credits and license.",
        }
        help_texts = {
            "install": "Choose a game folder or paste the path to Game.exe. MV/MZ and the correct package are detected automatically. Close the game before installing. Advanced options are optional.",
            "manage": "Manage shows available backups and the uninstall action. Close the game before restoring or uninstalling so its files are not in use.",
            "about": "About lists the installer version, project credits and links. GitHub and documentation links open in your default browser.",
        }
        self.heading.configure(text=headings[view])
        self.subtitle.configure(text=subtitles[view])
        self.header_help.help_tip.text = help_texts[view]
        if view == "install":
            self.install_button.grid()
        else:
            self.install_button.grid_remove()
        self.scroller.canvas.yview_moveto(0)

    def open_link(self, url, label="link"):
        try:
            opened = webbrowser.open(url)
        except (webbrowser.Error, OSError) as error:
            opened = False
            self._append_log(f"Could not open {label}: {error}")
        if opened:
            self.status_text.set(f"Opened {label} in your browser")
            return
        self.status_text.set(f"Couldn't open {label} - the address is in Activity")
        self._append_log(f"Link: {url}")
        messagebox.showerror("Couldn't open the link", f"Open this address in your browser:\n\n{url}", parent=self)

    def open_save_editor(self):
        if self.runner.busy or self.inspection is None or self.save_editor_factory is None:
            return
        try:
            target = os.path.normcase(os.path.realpath(self.inspection.status["root_path"]))
            editor = self.save_editor_windows.get(target)
            if editor is not None and editor.winfo_exists():
                editor.deiconify()
                editor.lift()
                self.save_editor_window = editor
                return
            self.save_editor_window = self.save_editor_factory(self, self.inspection.status["game_path"])
            self.save_editor_windows[target] = self.save_editor_window
        except Exception as error:
            self._set_notice("error", "Save editor couldn't open", "Check the game's local save files. Details are available in Activity.")
            self._append_log(f"Save editor: {error}")

    def open_game_folder(self):
        if self.inspection and not self.runner.busy:
            try:
                os.startfile(self.inspection.status["game_path"])
            except OSError as error:
                self._set_notice("error", "Couldn't open the game folder", "Open the game folder manually in File Explorer.")
                self._append_log(str(error))

    def _append_log(self, message):
        lines = [f"[{datetime.now():%H:%M:%S}] {line}" for line in str(message).splitlines()]
        self.log_lines.extend(lines)
        self.log_box.configure(state="normal")
        self.log_box.delete("1.0", "end")
        self.log_box.insert("end", "\n".join(self.log_lines) + "\n")
        self.log_box.see("end")
        self.log_box.configure(state="disabled")

    def enqueue_log(self, message):
        self.runner.log(message)

    def copy_log(self):
        self.clipboard_clear()
        self.clipboard_append("\n".join(self.log_lines))
        self.status_text.set("Activity log copied - check paths before sharing it")

    def save_log(self):
        path = filedialog.asksaveasfilename(parent=self, title="Save installer activity", initialfile="cheat-installer.log", defaultextension=".log", filetypes=[("Log file", "*.log"), ("Text file", "*.txt")])
        if path:
            try:
                with open(path, "w", encoding="utf-8") as stream:
                    stream.write("\n".join(self.log_lines) + "\n")
                self.status_text.set("Activity log saved")
            except OSError as error:
                self._set_notice("error", "Couldn't save the log", "Choose a writable folder and try again.")
                self._append_log(str(error))

    def _reveal_focus(self, event):
        widget = event.widget
        ancestor = widget
        while ancestor is not None and ancestor is not self.scroller.body:
            ancestor = getattr(ancestor, "master", None)
        if ancestor is self.scroller.body:
            self.scroller.reveal(widget)

    def on_close(self):
        if self.runner.busy:
            messagebox.showwarning("Please wait", "An operation is still running. Wait for it to finish before closing so game files are not left incomplete.", parent=self)
            return
        self.destroy()

    def destroy(self):
        if self._destroyed:
            return
        self._destroyed = True
        self._cancel_check()
        if self._poll_id:
            self.after_cancel(self._poll_id)
        super().destroy()
