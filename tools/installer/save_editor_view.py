"""Resizable save-editor widgets; save decoding and mutations stay in gui.py."""

import tkinter as tk
from tkinter import ttk

if __package__:
    from .ui_theme import COLORS, ScrollableContent, help_button, wrapped_label
else:
    from ui_theme import COLORS, ScrollableContent, help_button, wrapped_label


class SaveEditorView:
    def create_widgets(self):
        outer = ttk.Frame(self, padding=12)
        outer.pack(fill="both", expand=True)
        outer.columnconfigure(0, weight=1)
        outer.rowconfigure(0, weight=1)
        self.panes = ttk.Panedwindow(outer, orient="horizontal")
        self.panes.grid(row=0, column=0, sticky="nsew")
        files = ttk.Frame(self.panes, padding=(0, 0, 8, 0), width=224)
        files.grid_propagate(False)
        files.columnconfigure(0, weight=1)
        files.rowconfigure(1, weight=1)
        self.panes.add(files, weight=0)
        heading = ttk.Frame(files)
        heading.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 8))
        ttk.Label(heading, text="Save files", font=(self.parent.family, 11, "bold")).pack(side="left")
        help_button(heading, self.selected_file_info, label="Info").pack(side="right")
        columns = ("slot", "name", "size", "modified", "codec")
        self.save_tree = ttk.Treeview(files, columns=columns, displaycolumns=("slot", "name"), show="headings", height=8, selectmode="browse")
        for name, title, width in [("slot", "Slot", 50), ("name", "File", 150), ("size", "Bytes", 60), ("modified", "Modified", 130), ("codec", "Engine", 50)]:
            self.save_tree.heading(name, text=title)
            self.save_tree.column(name, width=width, minwidth=40 if name == "slot" else 60, stretch=name == "name", anchor="w")
        self.save_tree.grid(row=1, column=0, sticky="nsew")
        scroll = ttk.Scrollbar(files, command=self.save_tree.yview)
        scroll.grid(row=1, column=1, sticky="ns")
        horizontal = ttk.Scrollbar(files, orient="horizontal", command=self.save_tree.xview)
        horizontal.grid(row=2, column=0, sticky="ew")
        self.save_tree.configure(yscrollcommand=scroll.set, xscrollcommand=horizontal.set)
        self.save_tree.bind("<Double-1>", lambda _event: self.load_selected_save())
        self.save_tree.bind("<Return>", lambda _event: self.load_selected_save())
        self.save_tree.bind("<<TreeviewSelect>>", lambda _event: self._selection_changed())
        actions = ttk.Frame(files)
        actions.grid(row=3, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        ttk.Button(actions, text="Refresh", command=self.refresh_saves).pack(side="left")
        self.load_button = ttk.Button(actions, text="Load", command=self.load_selected_save)
        self.load_button.pack(side="right")
        right = ttk.Frame(self.panes, padding=(8, 0, 0, 0))
        self.panes.add(right, weight=1)
        self.editor_tabs = ttk.Notebook(right)
        self.editor_tabs.pack(fill="both", expand=True)
        self.structured_tab = ttk.Frame(self.editor_tabs, padding=4)
        raw_tab = ttk.Frame(self.editor_tabs, padding=4)
        self.editor_tabs.add(self.structured_tab, text="Structured")
        self.editor_tabs.add(raw_tab, text="Raw JSON")
        self.create_structured_editor(self.structured_tab)
        self.json_text = tk.Text(raw_tab, width=1, height=1, wrap="none", undo=True,
                                 font=("Consolas", 10), relief="flat", borderwidth=0,
                                 background=COLORS["surface"], foreground=COLORS["text"])
        yscroll = ttk.Scrollbar(raw_tab, command=self.json_text.yview)
        xscroll = ttk.Scrollbar(raw_tab, orient="horizontal", command=self.json_text.xview)
        self.json_text.configure(yscrollcommand=yscroll.set, xscrollcommand=xscroll.set)
        self.json_text.grid(row=0, column=0, sticky="nsew")
        yscroll.grid(row=0, column=1, sticky="ns")
        xscroll.grid(row=1, column=0, sticky="ew")
        raw_tab.rowconfigure(0, weight=1)
        raw_tab.columnconfigure(0, weight=1)
        footer = ttk.Frame(outer)
        footer.grid(row=1, column=0, sticky="ew", pady=(8, 0))
        wrapped_label(footer, textvariable=self.status_text).pack(fill="x", pady=(0, 6))
        row = ttk.Frame(footer)
        row.pack(fill="x")
        self.backup_button = ttk.Button(row, text="Backup selected", command=self.backup_selected_save)
        self.backup_button.pack(side="left")
        help_button(row, "Load a save, edit fields or Raw JSON, then choose Save changes. Each write creates a timestamped backup and is verified by reading the file back. Keep the game closed while editing.").pack(side="left", padx=(8, 0))
        ttk.Button(row, text="Close", command=self.destroy).pack(side="right")
        self.save_button = ttk.Button(row, text="Save changes", style="Primary.TButton", command=self.save_loaded_json)
        self.save_button.pack(side="right", padx=(0, 8))
        self._pane_positioned = False
        self.panes.bind("<Configure>", self._position_panes)
        self.bind("<FocusIn>", self._reveal_editor_focus, add="+")
        self._set_editor_enabled(False)
        self._selection_changed()

    def _position_panes(self, event):
        if not self._pane_positioned and event.width > 100:
            self.panes.sashpos(0, min(224, int(event.width * 0.27)))
            self._pane_positioned = True

    def create_structured_editor(self, parent):
        self.section_tabs = ttk.Notebook(parent)
        self.section_tabs.pack(fill="both", expand=True)
        party_tab = ttk.Frame(self.section_tabs)
        self.inventory_tab = ttk.Frame(self.section_tabs, padding=8)
        self.section_tabs.add(party_tab, text="Party & actors")
        self.section_tabs.add(self.inventory_tab, text="Inventory")
        self.party_scroll = ScrollableContent(party_tab, padding=(8, 8, 8, 8))
        self.party_scroll.pack(fill="both", expand=True)
        body = self.party_scroll.body
        gold = ttk.Frame(body)
        gold.pack(fill="x", pady=(0, 10))
        ttk.Label(gold, text="Gold").pack(side="left", padx=(0, 8))
        ttk.Entry(gold, textvariable=self.gold_var, width=12).pack(side="left")
        actor = ttk.Frame(body)
        actor.pack(fill="x", pady=(0, 8))
        ttk.Label(actor, text="Actor").pack(side="left", padx=(0, 8))
        self.actor_combo = ttk.Combobox(actor, textvariable=self.actor_var, values=[], state="readonly", width=1)
        self.actor_combo.pack(side="left", fill="x", expand=True)
        self.actor_combo.bind("<<ComboboxSelected>>", lambda _event: self.populate_actor_fields())
        fields = ttk.Frame(body)
        fields.pack(fill="x")
        for column in range(2):
            fields.columnconfigure(column, weight=1, uniform="actor-fields")
        for index, (key, label) in enumerate([("_name", "Name"), ("_nickname", "Nickname"), ("_level", "Level"), ("_hp", "HP"), ("_mp", "MP"), ("_tp", "TP")]):
            cell = ttk.Frame(fields)
            cell.grid(row=index // 2, column=index % 2, sticky="ew", padx=(0, 8) if index % 2 == 0 else 0, pady=(0, 8))
            ttk.Label(cell, text=label).pack(anchor="w", pady=(0, 3))
            var = tk.StringVar(self)
            self.actor_fields[key] = var
            ttk.Entry(cell, textvariable=var, width=1).pack(fill="x")
        header = ttk.Frame(body)
        header.pack(fill="x", pady=(2, 6))
        ttk.Label(header, text="Parameter bonuses").pack(side="left")
        help_button(header, "These are added parameter bonuses (_paramPlus), not the actor's total/base stats. MHP: max HP; MMP: max MP; ATK: attack; DEF: defense; MAT: magic attack; MDF: magic defense; AGI: agility; LUK: luck.").pack(side="right")
        parameters = ttk.Frame(body)
        parameters.pack(fill="x")
        for column in range(4):
            parameters.columnconfigure(column, weight=1, uniform="parameters")
        for index, name in enumerate(["MHP", "MMP", "ATK", "DEF", "MAT", "MDF", "AGI", "LUK"]):
            cell = ttk.Frame(parameters)
            cell.grid(row=index // 4, column=index % 4, sticky="ew", padx=(0, 8) if index % 4 != 3 else 0, pady=(0, 8))
            ttk.Label(cell, text=name).pack(anchor="w", pady=(0, 3))
            var = tk.StringVar(self)
            self.actor_param_fields[index] = var
            ttk.Entry(cell, textvariable=var, width=1).pack(fill="x")
        self._create_inventory(self.inventory_tab)

    def _create_inventory(self, parent):
        parent.columnconfigure(0, weight=1)
        parent.rowconfigure(1, weight=1)
        controls = ttk.Frame(parent)
        controls.grid(row=0, column=0, columnspan=2, sticky="ew", pady=(0, 8))
        ttk.Label(controls, text="Category").pack(side="left", padx=(0, 8))
        category = ttk.Combobox(controls, textvariable=self.inventory_category_var, values=["items", "weapons", "armors"], state="readonly", width=10)
        category.pack(side="left")
        category.bind("<<ComboboxSelected>>", lambda _event: self.populate_inventory())
        ttk.Checkbutton(controls, text="All items", variable=self.inventory_show_all_var, command=self.populate_inventory).pack(side="right")
        self.inventory_tree = ttk.Treeview(parent, columns=("id", "name", "quantity"), show="headings", height=6, selectmode="browse")
        for name, title, width, stretch in [("id", "ID", 45, False), ("name", "Name", 200, True), ("quantity", "Qty", 55, False)]:
            self.inventory_tree.heading(name, text=title)
            self.inventory_tree.column(name, width=width, minwidth=40, stretch=stretch, anchor="w")
        self.inventory_tree.grid(row=1, column=0, sticky="nsew")
        yscroll = ttk.Scrollbar(parent, command=self.inventory_tree.yview)
        yscroll.grid(row=1, column=1, sticky="ns")
        xscroll = ttk.Scrollbar(parent, orient="horizontal", command=self.inventory_tree.xview)
        xscroll.grid(row=2, column=0, sticky="ew")
        self.inventory_tree.configure(yscrollcommand=yscroll.set, xscrollcommand=xscroll.set)
        self.inventory_tree.bind("<<TreeviewSelect>>", lambda _event: self.populate_inventory_quantity())
        actions = ttk.Frame(parent)
        actions.grid(row=3, column=0, columnspan=2, sticky="ew", pady=(8, 0))
        ttk.Label(actions, text="Quantity").pack(side="left", padx=(0, 8))
        ttk.Entry(actions, textvariable=self.inventory_quantity_var, width=10).pack(side="left")
        help_button(actions, "Select an item, edit its quantity, then choose Save changes. Set quantity to zero to remove it. All items also lists database items that you don't currently own.").pack(side="right")

    def _set_editor_enabled(self, enabled, *, can_save=None):
        state = ["!disabled"] if enabled else ["disabled"]
        def visit(widget):
            for child in widget.winfo_children():
                if isinstance(child, (ttk.Entry, ttk.Combobox, ttk.Checkbutton)):
                    child.state(state)
                visit(child)
        visit(self.structured_tab)
        allow_save = enabled if can_save is None else can_save
        self.save_button.state(["!disabled"] if allow_save else ["disabled"])

    def _selection_changed(self):
        state = ["!disabled"] if self.get_selected_save_path() else ["disabled"]
        self.load_button.state(state)
        self.backup_button.state(state)

    def selected_file_info(self):
        selected = self.save_tree.selection()
        if not selected:
            return "Select a save and choose Load, or double-click it. File details appear here after selection."
        values = self.save_tree.item(selected[0], "values")
        return f"{values[1]}\nModified: {values[3]}\nSize: {values[2]} bytes\nEngine: {values[4]}\n\n{self.get_selected_save_path()}"

    def _reveal_editor_focus(self, event):
        ancestor = event.widget
        while ancestor is not None and ancestor is not self.party_scroll.body:
            ancestor = getattr(ancestor, "master", None)
        if ancestor is self.party_scroll.body:
            self.party_scroll.reveal(event.widget)
