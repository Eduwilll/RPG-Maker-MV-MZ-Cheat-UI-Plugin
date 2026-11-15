"""Offline ttk styling and a keyboard-friendly scrollable content area."""

import tkinter as tk
from tkinter import font, ttk


COLORS = {
    "background": "#F3F5F2", "surface": "#FFFFFF", "text": "#20312D",
    "muted": "#566761", "border": "#D4DED8", "accent": "#096B52",
    "accent_hover": "#07533F", "sidebar": "#183A30", "sidebar_text": "#F4F8F5",
    "sidebar_muted": "#C0D5C9", "sidebar_active": "#2A5142",
    "disabled": "#E3E9E5", "disabled_text": "#64716A", "danger": "#AD2534",
    "info_bg": "#EAF0ED", "success_bg": "#E6F2EB", "success": "#14533B",
    "error_bg": "#FBECEE", "error": "#8E2332", "warning_bg": "#FFF3D6",
    "warning": "#6D4B06", "log_bg": "#F6F8F6",
}


def window_sizes(screen_width, screen_height):
    minimum = (min(760, max(640, screen_width - 60)), min(520, max(480, screen_height - 100)))
    default = (max(minimum[0], min(920, screen_width - 60)), max(minimum[1], min(620, screen_height - 100)))
    return default, minimum


def configure_theme(root):
    families = set(font.families(root))
    family = "Segoe UI Variable" if "Segoe UI Variable" in families else "Segoe UI"
    if family not in families:
        family = "TkDefaultFont"
    font.nametofont("TkDefaultFont").configure(family=family, size=10)
    font.nametofont("TkTextFont").configure(family=family, size=10)
    style = ttk.Style(root)
    style.theme_use("clam")
    style.configure(".", font=(family, 10), background=COLORS["background"], foreground=COLORS["text"])
    style.configure("TFrame", background=COLORS["background"])
    style.configure("TLabel", background=COLORS["background"], foreground=COLORS["text"])
    style.configure("Card.TFrame", background=COLORS["surface"], bordercolor=COLORS["border"], relief="solid", borderwidth=1)
    style.configure("Surface.TFrame", background=COLORS["surface"])
    style.configure("Card.TLabel", background=COLORS["surface"])
    style.configure("Muted.TLabel", foreground=COLORS["muted"])
    style.configure("CardMuted.TLabel", background=COLORS["surface"], foreground=COLORS["muted"])
    style.configure("Heading.TLabel", font=(family, 16, "bold"))
    style.configure("Section.TLabel", background=COLORS["surface"], font=(family, 11, "bold"))
    style.configure("Eyebrow.TLabel", foreground=COLORS["accent"], font=(family, 10, "bold"))
    style.configure("TButton", padding=(10, 6), background=COLORS["surface"], bordercolor=COLORS["border"], focuscolor=COLORS["accent"], focusthickness=2)
    style.map("TButton", background=[("active", COLORS["info_bg"])], foreground=[("disabled", COLORS["disabled_text"])])
    style.configure("Primary.TButton", background=COLORS["accent"], foreground="#FFFFFF", bordercolor=COLORS["accent"], font=(family, 10, "bold"), padding=(16, 8), focuscolor="#FFFFFF")
    style.map("Primary.TButton", background=[("disabled", COLORS["disabled"]), ("active", COLORS["accent_hover"])], foreground=[("disabled", COLORS["disabled_text"])])
    style.configure("Danger.TButton", foreground=COLORS["danger"])
    style.configure("TEntry", padding=(7, 5), fieldbackground=COLORS["surface"], bordercolor=COLORS["border"])
    style.map("TEntry", bordercolor=[("focus", COLORS["accent"])])
    style.configure("TCombobox", padding=(7, 5), fieldbackground=COLORS["surface"], arrowsize=14)
    style.map("TCombobox", fieldbackground=[("readonly", COLORS["surface"])])
    style.configure("TCheckbutton", background=COLORS["surface"], padding=(2, 5), focuscolor=COLORS["accent"])
    style.configure("Treeview", rowheight=24, fieldbackground=COLORS["surface"], background=COLORS["surface"])
    style.configure("TProgressbar", background=COLORS["accent"], troughcolor=COLORS["border"], borderwidth=0, thickness=4)
    style.configure("Sidebar.TFrame", background=COLORS["sidebar"])
    style.configure("Sidebar.TLabel", background=COLORS["sidebar"], foreground=COLORS["sidebar_text"])
    style.configure("Brand.TLabel", background=COLORS["sidebar"], foreground=COLORS["sidebar_text"], font=(family, 14, "bold"))
    style.configure("SidebarMuted.TLabel", background=COLORS["sidebar"], foreground=COLORS["sidebar_muted"], font=(family, 10))
    style.configure("Nav.TButton", background=COLORS["sidebar"], foreground=COLORS["sidebar_text"], borderwidth=0, relief="flat", anchor="w", padding=(10, 9), focuscolor=COLORS["sidebar_text"])
    style.map("Nav.TButton", background=[("pressed", COLORS["sidebar_active"]), ("active", COLORS["sidebar_active"])], foreground=[("disabled", COLORS["sidebar_muted"])])
    style.configure("Selected.Nav.TButton", background=COLORS["sidebar_active"], font=(family, 10, "bold"))
    for name, background, foreground in [
        ("info", COLORS["info_bg"], COLORS["text"]),
        ("success", COLORS["success_bg"], COLORS["success"]),
        ("error", COLORS["error_bg"], COLORS["error"]),
        ("warning", COLORS["warning_bg"], COLORS["warning"]),
    ]:
        style.configure(f"{name}.TFrame", background=background)
        style.configure(f"{name}.TLabel", background=background, foreground=foreground)
        style.configure(f"{name}.Title.TLabel", background=background, foreground=foreground, font=(family, 10, "bold"))
    root.configure(background=COLORS["background"])
    return family


def wrapped_label(parent, *, text=None, textvariable=None, style="Muted.TLabel"):
    options = {"style": style, "justify": tk.LEFT, "wraplength": 480, "width": 1}
    if textvariable is not None:
        options["textvariable"] = textvariable
    else:
        options["text"] = text
    label = ttk.Label(parent, **options)
    label.bind("<Configure>", lambda event: label.configure(wraplength=max(120, event.width)))
    return label


class HelpTooltip:
    """Optional help, reachable by hover, focus, click or F1; Escape dismisses."""

    def __init__(self, widget, text):
        self.widget = widget
        self.text = text
        self.window = None
        self._show_id = None
        self._hide_id = None
        widget.bind("<Enter>", self.schedule, add="+")
        widget.bind("<FocusIn>", self.schedule, add="+")
        widget.bind("<Leave>", self.defer_hide, add="+")
        widget.bind("<FocusOut>", self.hide, add="+")
        widget.bind("<F1>", self.show, add="+")
        widget.bind("<Destroy>", self._destroy, add="+")
        self.owner = widget.winfo_toplevel()
        self._escape_binding = self.owner.bind("<Escape>", self.hide, add="+")

    def _cancel(self, name):
        identifier = getattr(self, name)
        if identifier:
            try:
                self.widget.after_cancel(identifier)
            except tk.TclError:
                pass
            setattr(self, name, None)

    def schedule(self, _event=None):
        self._cancel("_hide_id")
        self._cancel("_show_id")
        self._show_id = self.widget.after(450, self.show)

    def defer_hide(self, _event=None):
        self._cancel("_show_id")
        self._cancel("_hide_id")
        self._hide_id = self.widget.after(180, self.hide)

    def show(self, _event=None):
        self._cancel("_show_id")
        self._cancel("_hide_id")
        if self.window is not None or not self.widget.winfo_exists():
            return
        text = self.text() if callable(self.text) else self.text
        if not text:
            return
        self.window = tk.Toplevel(self.widget, takefocus=False)
        self.window.withdraw()
        self.window.overrideredirect(True)
        self.window.transient(self.owner)
        label = tk.Label(self.window, text=text, wraplength=320, justify="left", padx=12, pady=10,
                         background="#FFFBE8", foreground=COLORS["text"], relief="solid", borderwidth=1)
        label.pack()
        self.window.update_idletasks()
        width, height = self.window.winfo_reqwidth(), self.window.winfo_reqheight()
        x = max(0, min(self.widget.winfo_rootx(), self.widget.winfo_screenwidth() - width - 8))
        y = self.widget.winfo_rooty() + self.widget.winfo_height() + 6
        if y + height > self.widget.winfo_screenheight() - 8:
            y = max(0, self.widget.winfo_rooty() - height - 6)
        self.window.geometry(f"+{x}+{y}")
        for target in (self.window, label):
            target.bind("<Enter>", lambda _event: self._cancel("_hide_id"))
            target.bind("<Leave>", self.defer_hide)
        self.window.deiconify()

    def hide(self, _event=None):
        self._cancel("_show_id")
        self._cancel("_hide_id")
        if self.window is not None:
            self.window.destroy()
            self.window = None

    def _destroy(self, event):
        if event.widget is self.widget:
            self.hide()
            try:
                self.owner.unbind("<Escape>", self._escape_binding)
            except tk.TclError:
                pass


def help_button(parent, text, *, label="Help"):
    button = ttk.Button(parent, text=label, width=5)
    button.help_tip = HelpTooltip(button, text)
    button.configure(command=button.help_tip.show)
    return button


class ScrollableContent(ttk.Frame):
    def __init__(self, parent, *, padding=(20, 16, 20, 16)):
        super().__init__(parent)
        self.columnconfigure(0, weight=1)
        self.rowconfigure(0, weight=1)
        self.canvas = tk.Canvas(self, background=COLORS["background"], highlightthickness=0, borderwidth=0, takefocus=False)
        self.scrollbar = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.canvas.configure(yscrollcommand=self.scrollbar.set)
        self.canvas.grid(row=0, column=0, sticky="nsew")
        self.scrollbar.grid(row=0, column=1, sticky="ns")
        self.body = ttk.Frame(self.canvas, padding=padding)
        self.window = self.canvas.create_window((0, 0), window=self.body, anchor="nw")
        self.body.bind("<Configure>", self._layout)
        self.canvas.bind("<Configure>", lambda event: self.canvas.itemconfigure(self.window, width=event.width))
        self._wheel_owner = self.winfo_toplevel()
        self._wheel_binding = self._wheel_owner.bind("<MouseWheel>", self._wheel, add="+")
        self.bind("<Destroy>", self._cleanup_wheel, add="+")
        self.body.bind("<FocusIn>", self._focus, add="+")

    def _cleanup_wheel(self, event):
        if event.widget is self:
            try:
                self._wheel_owner.unbind("<MouseWheel>", self._wheel_binding)
            except tk.TclError:
                pass

    def _layout(self, _event=None):
        self.canvas.configure(scrollregion=self.canvas.bbox("all"))

    def _wheel(self, event):
        widget = event.widget
        while widget is not None and widget is not self.body:
            widget = getattr(widget, "master", None)
        if widget is self.body or event.widget is self.canvas:
            if self.canvas.yview() != (0.0, 1.0):
                self.canvas.yview_scroll(-int(event.delta / 120) or (-1 if event.delta > 0 else 1), "units")

    def _focus(self, event):
        self.reveal(event.widget)

    def reveal(self, widget):
        self.update_idletasks()
        height = self.body.winfo_height()
        if height <= self.canvas.winfo_height():
            return
        top = widget.winfo_rooty() - self.body.winfo_rooty()
        viewport_top = self.canvas.canvasy(0)
        viewport_bottom = viewport_top + self.canvas.winfo_height()
        if top < viewport_top:
            self.canvas.yview_moveto(max(0, top - 12) / height)
        elif top + widget.winfo_height() > viewport_bottom:
            self.canvas.yview_moveto((top + widget.winfo_height() + 12 - self.canvas.winfo_height()) / height)
