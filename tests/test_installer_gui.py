"""Actual Tk widget tests with disposable MV/MZ games, never user games."""

import json
from pathlib import Path
import tempfile
import threading
import time
import tkinter as tk
import unittest
from unittest import mock

from tools.installer import installer_ui


def descendants(widget):
    for child in widget.winfo_children():
        yield child
        yield from descendants(child)


class InstallerWindowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "source"
        for name in ["cheat/init/import.js", "cheat/init/setup.js", "cheat/init/setup.bundle.js", "cheat/CheatModal.js", "cheat/MainComponent.js", "cheat/js/window-init.js", "cheat/js/window-init.bundle.js", "_cheat_initialize/mv/js/main.js", "_cheat_initialize/mz/js/main.js"]:
            path = self.source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("// cheat/init/import.js")
        self.game = self.make_game("MV")
        self.app = installer_ui.InstallerApp(search_dirs=[], source_root=self.source, source_version="1.8.0", visible=False)
        self.app.withdraw()
        self.addCleanup(self.close_app)
        self.tk_errors = []
        self.app.report_callback_exception = lambda *args: self.tk_errors.append(args)

    def make_game(self, engine):
        game = self.root / f"Game {engine}"
        content = game / "www" if engine == "MV" else game
        (content / "js").mkdir(parents=True)
        (content / "js" / ("rpg_core.js" if engine == "MV" else "rmmz_core.js")).write_text("// engine")
        (content / "js/main.js").write_text("// original bootstrap")
        (content / "index.html").write_text('<html><script src="js/main.js"></script></html>')
        (content / "data").mkdir()
        (content / "data/System.json").write_text(json.dumps({"gameTitle": f"Demo {engine}"}))
        (content / "save").mkdir()
        (content / "save/untouched.save").write_bytes(b"original save bytes")
        return game

    def close_app(self):
        if self.app.winfo_exists():
            self.wait_idle()
            self.app.destroy()

    def wait_idle(self):
        deadline = time.monotonic() + 5
        while time.monotonic() < deadline:
            self.app.update()
            if not self.app.runner.busy:
                break
            time.sleep(0.01)
        self.assertFalse(self.app.runner.busy, "worker did not finish")
        self.assertEqual(self.tk_errors, [])

    def inspect(self, game=None):
        self.app.game_path.set(str(game or self.game))
        self.app.run_status()
        self.wait_idle()

    def test_initial_screen_is_simple_and_actions_require_a_game(self):
        self.assertTrue(self.app.install_button.instate(["disabled"]))
        self.assertTrue(self.app.save_editor_button.instate(["disabled"]))
        self.assertFalse(self.app.advanced_visible)
        self.assertFalse(self.app.details_visible)
        self.assertFalse(self.app.clean_settings.get())
        self.assertFalse(self.app.review_card.winfo_manager())
        self.assertFalse(self.app.about_button.instate(["disabled"]))

    def test_about_view_credits_every_project_and_opens_links(self):
        self.app.show_view("about")
        self.assertEqual(self.app.current_view, "about")
        self.assertEqual(self.app.heading.cget("text"), "About")
        self.assertEqual(self.app.about_page.winfo_manager(), "pack")
        self.assertFalse(self.app.install_button.winfo_manager())
        self.assertFalse(self.app.game_picker_card.winfo_manager())
        self.assertFalse(self.app.notice_frame.winfo_manager())
        self.assertIn("credits", self.app.header_help.help_tip.text.lower())
        page_text = " ".join(
            str(widget.cget("text"))
            for widget in descendants(self.app.about_page)
            if "text" in widget.keys()
        )
        self.assertIn("Version v1.8.0", page_text)
        for name in ["paramonos", "sieucapoccho3717", "Justype", "Eduwilll"]:
            self.assertIn(name, page_text)
        for label in ["GitHub repository", "Documentation", "Report an issue", "Contributors", "Read the license"]:
            self.assertIn(label, page_text)
        with mock.patch.object(installer_ui.webbrowser, "open", return_value=True) as opened:
            self.app.open_link(installer_ui.PROJECT_URL, "GitHub repository")
            self.app.open_link(installer_ui.DOCUMENTATION_URL, "documentation")
        self.assertEqual(
            [call.args[0] for call in opened.call_args_list],
            [installer_ui.PROJECT_URL, installer_ui.DOCUMENTATION_URL],
        )
        self.app.show_view("install")
        self.assertEqual(self.app.about_page.winfo_manager(), "")
        self.assertEqual(self.app.current_view, "install")
        self.assertEqual(self.app.game_picker_card.winfo_manager(), "pack")
        self.assertEqual(self.app.notice_frame.winfo_manager(), "pack")

    def test_about_link_failure_shows_the_address_to_copy(self):
        with mock.patch.object(installer_ui.webbrowser, "open", return_value=False), mock.patch.object(
            installer_ui.messagebox, "showerror"
        ) as error:
            self.app.open_link(installer_ui.DOCUMENTATION_URL, "documentation")
        error.assert_called_once()
        self.assertIn(installer_ui.DOCUMENTATION_URL, error.call_args.args[1])
        self.assertTrue(any(installer_ui.DOCUMENTATION_URL in line for line in self.app.log_lines))

    def test_valid_preflight_enables_install_and_invalidates_immediately_on_edit(self):
        self.inspect()
        self.assertEqual(self.app.inspection.title, "Demo MV")
        self.assertEqual(self.app.review_card.winfo_manager(), "pack")
        self.assertFalse(self.app.install_button.instate(["disabled"]))
        self.app.game_path.set(str(self.root / "wrong"))
        self.assertIsNone(self.app.inspection)
        self.assertTrue(self.app.install_button.instate(["disabled"]))
        self.assertFalse(self.app.review_card.winfo_manager())

    def test_startup_size_fits_a_small_laptop_screen(self):
        from tools.installer.ui_theme import window_sizes
        default, minimum = window_sizes(1366, 768)
        self.assertLessEqual(default[1], 668)
        self.assertLessEqual(minimum[1], default[1])
        default, minimum = window_sizes(800, 600)
        self.assertLessEqual(default[0], 740)
        self.assertLessEqual(default[1], 500)
        self.assertLessEqual(minimum[0], default[0])

    def test_missing_package_keeps_save_editor_and_maintenance_available(self):
        self.app.source_root = None
        self.inspect()
        self.assertTrue(self.app.install_button.instate(["disabled"]))
        self.assertFalse(self.app.save_editor_button.instate(["disabled"]))
        self.assertIn("package", self.app.notice_body.get().lower())

    def test_advanced_and_activity_are_user_controlled_disclosures(self):
        self.app.toggle_advanced()
        self.app.toggle_details()
        self.assertTrue(self.app.advanced_visible)
        self.assertTrue(self.app.details_visible)
        self.app.toggle_advanced()
        self.app.toggle_details()
        self.assertFalse(self.app.advanced_visible)
        self.assertFalse(self.app.details_visible)

    def test_worker_blocks_overlapping_operations_and_close_until_complete(self):
        release = threading.Event()
        self.addCleanup(release.set)
        self.app._start_job("install", lambda: release.wait(2))
        self.assertTrue(self.app.game_entry.instate(["disabled"]))
        self.assertFalse(self.app._start_job("uninstall", lambda: self.fail("overlap")))
        with mock.patch.object(installer_ui.messagebox, "showwarning") as warning:
            self.app.on_close()
            warning.assert_called_once()
        release.set()
        self.wait_idle()

    def test_exception_is_displayed_and_controls_recover_without_tk_thread_calls(self):
        self.inspect()
        def broken():
            raise PermissionError("fixture access failure")
        self.app._start_job("install", broken)
        self.wait_idle()
        self.assertIn("access", self.app.notice_title.get().lower())
        self.assertIn("close", self.app.notice_body.get().lower())
        self.assertFalse(self.app.game_entry.instate(["disabled"]))
        self.assertTrue(self.app.details_visible)

    def test_failed_recheck_discards_previous_actionable_inspection(self):
        self.inspect()
        self.assertFalse(self.app.install_button.instate(["disabled"]))
        with mock.patch.object(installer_ui, "inspect_game", side_effect=PermissionError("game became unavailable")):
            self.app.run_status()
            self.wait_idle()
        self.assertIsNone(self.app.inspection)
        self.assertTrue(self.app.install_button.instate(["disabled"]))
        self.assertTrue(self.app.save_editor_button.instate(["disabled"]))
        self.assertTrue(self.app.restore_button.instate(["disabled"]))
        self.assertFalse(self.app.review_card.winfo_manager())

    def test_late_inspection_cannot_reenable_a_different_game(self):
        from tools.installer.presentation import inspect_game
        old = inspect_game(self.game, source_root=self.source)
        old_revision = self.app.revision
        self.app.game_path.set(str(self.root / "different game"))
        self.app._complete("inspect", (old_revision, old))
        self.assertIsNone(self.app.inspection)
        self.assertTrue(self.app.install_button.instate(["disabled"]))

    def test_save_editor_uses_detected_game_and_existing_editor_factory(self):
        self.inspect()
        factory = mock.Mock(return_value=None)
        self.app.save_editor_factory = factory
        self.app.open_save_editor()
        factory.assert_called_once_with(self.app, str(self.game))

    def test_switching_games_opens_the_correct_editor_and_reuses_only_a_matching_one(self):
        first, second = mock.Mock(), mock.Mock()
        first.winfo_exists.return_value = True
        second.winfo_exists.return_value = True
        factory = mock.Mock(side_effect=[first, second])
        self.app.save_editor_factory = factory
        self.inspect()
        self.app.open_save_editor()
        other_game = self.make_game("MZ")
        self.inspect(other_game)
        self.app.open_save_editor()
        self.assertEqual(factory.call_count, 2)
        self.assertEqual(factory.call_args.args[1], str(other_game))
        first.lift.assert_not_called()
        self.inspect()
        self.app.open_save_editor()
        self.assertEqual(factory.call_count, 2)
        first.lift.assert_called_once()

    def test_real_save_editor_backup_and_both_save_actions_complete_and_log(self):
        from tools.installer import gui, save_editor
        self.inspect()
        path = self.game / "www/save/file1.rpgsave"
        initial = {"party": {"_gold": 10, "_items": {}, "_weapons": {}, "_armors": {}}, "actors": {"_data": []}}
        path.write_text(save_editor.encode_mv_save(json.dumps(initial)), encoding="utf-8")
        self.app.save_editor_factory = gui.SaveEditorWindow
        self.app.open_save_editor()
        editor = self.app.save_editor_window
        self.assertIsNotNone(editor)
        editor.withdraw()
        editor.save_tree.selection_set(editor.save_tree.get_children()[0])
        editor.load_selected_save()
        with mock.patch.object(gui.messagebox, "showinfo") as info, mock.patch.object(gui.messagebox, "askyesno", return_value=True):
            editor.backup_selected_save()
            self.assertIn("Backup created", editor.status_text.get())
            editor.editor_tabs.select(1)
            initial["party"]["_gold"] = 25
            editor.json_text.delete("1.0", "end")
            editor.json_text.insert("1.0", json.dumps(initial))
            editor.save_loaded_json()
            self.assertEqual(json.loads(save_editor.read_save_json(self.game, path))["party"]["_gold"], 25)
            self.assertEqual(editor.gold_var.get(), "25")
            editor.gold_var.set("50")
            editor.save_loaded_json(force_structured=True)
            self.assertEqual(json.loads(save_editor.read_save_json(self.game, path))["party"]["_gold"], 50)
            self.assertEqual(editor.gold_var.get(), "50")
            self.assertEqual(info.call_count, 3)
        deadline = time.monotonic() + 2
        while not any("Save file edited" in line for line in self.app.log_lines) and time.monotonic() < deadline:
            self.app.update()
            time.sleep(0.01)
        self.assertTrue(any("Save file edited" in line for line in self.app.log_lines))

    def test_real_mv_and_mz_install_update_and_uninstall_preserve_originals(self):
        for engine in ["MV", "MZ"]:
            with self.subTest(engine=engine):
                game = self.game if engine == "MV" else self.make_game("MZ")
                self.inspect(game)
                content = Path(self.app.inspection.status["root_path"])
                original_main = (content / "js/main.js").read_bytes()
                original_html = (content / "index.html").read_bytes()
                with mock.patch.object(installer_ui.messagebox, "askyesno", return_value=True):
                    self.app.run_install()
                    self.wait_idle()
                    self.assertTrue((content / "cheat/init/import.js").exists())
                    self.assertIn("ready", self.app.notice_title.get().lower())
                    (content / "cheat-settings").mkdir()
                    (content / "cheat-settings/preferences.json").write_text("keep")
                    self.app.run_install()
                    self.wait_idle()
                    self.assertEqual((content / "cheat-settings/preferences.json").read_text(), "keep")
                    self.assertGreaterEqual(len(self.app.backup_labels), 2)
                    self.app.run_uninstall()
                    self.wait_idle()
                self.assertEqual((content / "js/main.js").read_bytes(), original_main)
                self.assertEqual((content / "index.html").read_bytes(), original_html)
                self.assertFalse((content / "cheat").exists())
                self.assertEqual((content / "save/untouched.save").read_bytes(), b"original save bytes")

    def test_restore_uses_the_selected_plugin_backup_not_the_original(self):
        self.inspect()
        with mock.patch.object(installer_ui.messagebox, "askyesno", return_value=True):
            self.app.run_install()
            self.wait_idle()
            plugin_file = Path(self.app.inspection.status["root_path"]) / "cheat/CheatModal.js"
            plugin_file.write_text("// customized older plugin")
            self.app.run_install()
            self.wait_idle()
            selected = next(label for label in self.app.backup_labels if label.startswith("Plugin backup"))
            backup = self.app.backup_labels[selected]
            self.app.selected_backup.set(selected)
            self.app._refresh_controls()
            with mock.patch.object(installer_ui, "uninstall", wraps=installer_ui.uninstall) as restore:
                self.app.run_restore()
                self.wait_idle()
                self.assertEqual(restore.call_args.kwargs["backup_path"], backup)
            self.assertEqual(plugin_file.read_text(), "// customized older plugin")
            self.assertIn("restored", self.app.notice_title.get().lower())

    def test_save_editor_backup_collection_is_not_offered_as_a_plugin_restore(self):
        self.app.populate_backups([
            {"name": "save-editor", "path": "save-backups", "reason": "plugin-version"},
            {"name": "20261114-120000", "path": "plugin-backup", "reason": "plugin-version"},
        ])
        self.assertEqual(list(self.app.backup_labels.values()), ["plugin-backup"])

    def test_uninstall_without_original_backup_keeps_the_disabled_loader(self):
        content = self.game / "www"
        (content / "cheat/init").mkdir(parents=True)
        (content / "cheat/init/import.js").write_text("// active cheat")
        (content / "cheat-version-description.json").write_text('{"version":"v1.7.0"}')
        (content / "js/main.js").write_text("// game startup references cheat/init/import.js")
        self.inspect()
        self.assertIsNone(self.app.inspection.status["original_backup"])
        with mock.patch.object(installer_ui.messagebox, "askyesno", return_value=True):
            self.app.run_uninstall()
            self.wait_idle()
        self.assertIn("no-op", (content / "cheat/init/import.js").read_text())
        self.assertFalse((content / "cheat-version-description.json").exists())
        self.assertEqual((content / "save/untouched.save").read_bytes(), b"original save bytes")

    def test_frozen_app_searches_beside_exe_and_does_not_use_repository_source(self):
        from tools.installer import installer_ui as module
        with mock.patch.object(module.sys, "frozen", True, create=True), mock.patch.object(module.sys, "executable", str(self.root / "Installer.exe")):
            frozen = module.InstallerApp(visible=False)
            try:
                self.assertIsNone(frozen.source_root)
                self.assertEqual(frozen.search_dirs[0], str(self.root))
            finally:
                frozen.destroy()

    def test_post_install_status_failure_reports_completion_without_retargeting(self):
        self.inspect()
        with mock.patch.object(installer_ui.messagebox, "askyesno", return_value=True), mock.patch.object(installer_ui, "inspect_game", side_effect=OSError("status read failed")):
            self.app.run_install()
            self.wait_idle()
        self.assertTrue((self.game / "www/cheat/init/import.js").exists())
        self.assertIn("finished", self.app.notice_title.get().lower())
        self.assertIsNone(self.app.inspection)
        self.assertTrue(self.app.install_button.instate(["disabled"]))

    def test_compact_layout_keeps_footer_visible_and_reveals_keyboard_focus(self):
        self.inspect()
        self.app.geometry("840x620")
        self.app.toggle_advanced()
        self.app.toggle_details()
        self.app.deiconify()
        self.app.update()
        self.app.update_idletasks()
        self.assertEqual(self.app.winfo_width(), 840)
        button = self.app.install_button
        self.assertLessEqual(button.winfo_rootx() + button.winfo_width(), self.app.winfo_rootx() + 840)
        self.assertLessEqual(button.winfo_rooty() + button.winfo_height(), self.app.winfo_rooty() + 620)
        self.app.scroller.reveal(self.app.log_box)
        self.assertGreater(self.app.scroller.canvas.yview()[0], 0)

    def test_gui_entry_point_runs_without_opening_a_window_for_help(self):
        import subprocess
        import sys
        result = subprocess.run([sys.executable, "-B", "tools/installer/gui.py", "--help"], cwd=Path(__file__).resolve().parents[1], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("--game-path", result.stdout)


if __name__ == "__main__":
    unittest.main()
