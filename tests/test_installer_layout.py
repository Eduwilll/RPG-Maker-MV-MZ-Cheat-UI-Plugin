"""Regression tests for the clipped save editor and compact installer."""

import json
from pathlib import Path
import tempfile
import tkinter as tk
from tkinter import ttk
import unittest
from unittest import mock

from tools.installer.gui import SaveEditorWindow
from tools.installer.installer_ui import InstallerApp
from tools.installer import ui_theme
from tools.installer import gui, save_editor


def descendants(widget):
    for child in widget.winfo_children():
        yield child
        yield from descendants(child)


class LayoutTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.game = Path(self.temp.name) / "Example"
        (self.game / "js").mkdir(parents=True)
        (self.game / "js/rmmz_core.js").write_text("// fixture")
        self.app = InstallerApp(visible=False, search_dirs=[], source_root=None)
        self.addCleanup(self.app.destroy)
        self.errors = []
        self.app.report_callback_exception = lambda *args: self.errors.append(args)

    def editor(self, width=980, height=680):
        editor = SaveEditorWindow(self.app, str(self.game))
        editor.geometry(f"{width}x{height}")
        editor.deiconify()
        editor.update()
        editor.update_idletasks()
        return editor

    def assert_inside(self, widget, ancestor):
        self.assertLessEqual(widget.winfo_rootx() + widget.winfo_width(), ancestor.winfo_rootx() + ancestor.winfo_width() + 1, f"{widget}: clipped at right edge")
        self.assertGreaterEqual(widget.winfo_rootx(), ancestor.winfo_rootx(), f"{widget}: clipped at left edge")

    def test_actor_and_all_eight_parameter_inputs_fit_their_parent(self):
        editor = self.editor()
        variables = {str(var) for var in [*editor.actor_fields.values(), *editor.actor_param_fields.values()]}
        inputs = [widget for widget in descendants(editor) if isinstance(widget, ttk.Entry) and str(widget.cget("textvariable")) in variables]
        self.assertEqual(len(inputs), 14)
        for widget in inputs:
            self.assert_inside(widget, widget.master)
            self.assert_inside(widget, editor)

    def test_file_pane_leaves_most_of_the_width_for_editing(self):
        editor = self.editor()
        self.assertLess(editor.save_tree.winfo_width(), editor.winfo_width() * 0.36)

    def test_closing_editor_does_not_leave_global_mousewheel_callbacks(self):
        before = self.app.bind_class("all", "<MouseWheel>")
        editor = self.editor()
        editor.destroy()
        self.app.update()
        self.assertEqual(self.app.bind_class("all", "<MouseWheel>"), before)

    def test_inventory_table_has_usable_height_and_is_inside_the_window(self):
        editor = self.editor(840, 620)
        if hasattr(editor, "section_tabs"):
            editor.section_tabs.select(editor.inventory_tab)
            editor.update()
        self.assertGreaterEqual(editor.inventory_tree.winfo_height(), 160)
        self.assert_inside(editor.inventory_tree, editor)
        self.assertLessEqual(editor.inventory_tree.winfo_rooty() + editor.inventory_tree.winfo_height(), editor.winfo_rooty() + editor.winfo_height())

    def test_last_actor_parameter_can_be_revealed_in_a_small_window(self):
        editor = self.editor(840, 620)
        last = next(widget for widget in descendants(editor) if isinstance(widget, ttk.Entry) and str(widget.cget("textvariable")) == str(editor.actor_param_fields[7]))
        editor.party_scroll.reveal(last)
        editor.update()
        canvas = editor.party_scroll.canvas
        self.assertGreaterEqual(last.winfo_rooty(), canvas.winfo_rooty())
        self.assertLessEqual(last.winfo_rooty() + last.winfo_height(), canvas.winfo_rooty() + canvas.winfo_height())

    def test_only_one_save_action_is_needed_and_it_stays_visible(self):
        editor = self.editor(840, 620)
        buttons = [widget for widget in descendants(editor) if isinstance(widget, ttk.Button) and str(widget.cget("text")).lower().startswith("save")]
        self.assertEqual(len(buttons), 1)
        self.assert_inside(buttons[0], editor)
        self.assertLessEqual(buttons[0].winfo_rooty() + buttons[0].winfo_height(), editor.winfo_rooty() + editor.winfo_height())

    def test_installer_is_compact_and_explanations_are_optional(self):
        default, _minimum = ui_theme.window_sizes(1920, 1080)
        self.assertLessEqual(default[0], 960)
        self.assertLessEqual(default[1], 640)
        self.assertFalse(self.app.subtitle.winfo_manager())
        self.assertFalse(self.app.notice_label.winfo_manager())
        self.app._set_notice("error", "Can't install", "Close the game and check permissions.")
        self.assertEqual(self.app.notice_label.winfo_manager(), "pack")

    def test_help_is_available_on_demand_and_dismissible(self):
        button = ttk.Button(self.app.scroller.body, text="Help")
        button.pack()
        help_tip = ui_theme.HelpTooltip(button, "Useful optional help.")
        self.assertIsNone(help_tip.window)
        help_tip.show()
        self.app.update_idletasks()
        self.assertTrue(help_tip.window.winfo_exists())
        help_tip.hide()
        self.assertIsNone(help_tip.window)
        self.app.deiconify()
        button.focus_force()
        self.app.update()
        help_tip.show()
        button.event_generate("<Escape>")
        self.app.update()
        self.assertIsNone(help_tip.window)
        help_tip.schedule()
        button.destroy()
        self.app.update()
        self.assertIsNone(help_tip.window)
        self.assertEqual(self.errors, [])

    def loaded_editor(self, data, name="file1.rmmzsave"):
        directory = self.game / "save"
        directory.mkdir(exist_ok=True)
        path = directory / name
        with open(path, "w", encoding="utf-8", newline="") as stream:
            stream.write(save_editor.encode_mz_save(json.dumps(data)))
        editor = self.editor()
        row = next(key for key, value in editor.save_paths.items() if value == str(path))
        editor.save_tree.selection_set(row)
        editor.load_selected_save()
        editor.update()
        return editor, path

    def test_one_save_button_writes_actor_bonuses_gold_and_inventory(self):
        data = {"party": {"_gold": 10, "_items": {"1": 2}}, "actors": {"_data": [None, {"_actorId": 1, "_name": "Hero", "_nickname": "", "_level": 3, "_hp": 100, "_mp": 50, "_tp": 0, "_paramPlus": [0] * 8}]}}
        editor, path = self.loaded_editor(data)
        self.assertFalse(editor.save_button.instate(["disabled"]))
        editor.actor_fields["_hp"].set("80")
        editor.actor_param_fields[7].set("10")
        editor.gold_var.set("100")
        editor.section_tabs.select(editor.inventory_tab)
        editor.inventory_tree.selection_set("1")
        editor.populate_inventory_quantity()
        editor.inventory_quantity_var.set("5")
        with mock.patch.object(gui.messagebox, "askyesno", return_value=True), mock.patch.object(gui.messagebox, "showinfo"):
            editor.save_button.invoke()
        saved = json.loads(save_editor.read_save_json(self.game, path))
        self.assertEqual(saved["party"]["_gold"], 100)
        self.assertEqual(saved["party"]["_items"]["1"], 5)
        self.assertEqual(saved["actors"]["_data"][1]["_hp"], 80)
        self.assertEqual(saved["actors"]["_data"][1]["_paramPlus"][7], 10)

    def test_global_metadata_opens_as_raw_json_not_an_actor_save(self):
        data = [None, {"title": "Example", "playtime": "01:00"}]
        editor, _path = self.loaded_editor(data, "global.rmmzsave")
        self.assertEqual(editor.editor_tabs.index(editor.editor_tabs.select()), 1)
        self.assertEqual(editor.editor_tabs.tab(0, "state"), "disabled")
        self.assertEqual(json.loads(editor.json_text.get("1.0", "end")), data)
        self.assertFalse(editor.save_button.instate(["disabled"]))

    def test_config_save_does_not_gain_party_fields_when_written(self):
        data = {"alwaysDash": True, "volume": 80}
        editor, path = self.loaded_editor(data, "config.rmmzsave")
        self.assertEqual(editor.editor_tabs.index(editor.editor_tabs.select()), 1)
        with mock.patch.object(gui.messagebox, "askyesno", return_value=True), mock.patch.object(gui.messagebox, "showinfo"):
            editor.save_button.invoke()
        self.assertEqual(json.loads(save_editor.read_save_json(self.game, path)), data)

    def test_save_confirmation_names_the_file_and_cancel_does_not_write(self):
        data = {"party": {"_gold": 10}, "actors": {"_data": []}}
        editor, path = self.loaded_editor(data)
        before = path.read_bytes()
        editor.gold_var.set("100")
        with mock.patch.object(gui.messagebox, "askyesno", return_value=False) as confirm:
            editor.save_button.invoke()
        self.assertIn(str(path), confirm.call_args.args[1])
        self.assertEqual(path.read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
