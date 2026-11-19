"""Installer preflight and worker tests; no real games are touched."""

import io
import json
import os
from pathlib import Path
import queue
import tarfile
import tempfile
import threading
import unittest

from tools.installer import presentation


class PreflightTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.game = self.root / "Example Game"
        self.make_game(self.game, "MV")

    def make_game(self, path, engine):
        root = path / "www" if engine == "MV" else path
        (root / "js").mkdir(parents=True)
        (root / "js" / ("rpg_core.js" if engine == "MV" else "rmmz_core.js")).write_text("// engine")
        (root / "js/main.js").write_text("// original game")
        (root / "data").mkdir()
        (root / "data/System.json").write_text(json.dumps({"gameTitle": "A Friendly Adventure"}))
        (path / "Game.exe").write_bytes(b"MZ")

    def make_archive(self, engine="MV", version="1.8.0", directory=None):
        directory = directory or self.root
        directory.mkdir(exist_ok=True)
        path = directory / f"rpg-{engine.lower()}-cheat-{version}-core.tar.gz"
        prefix = "www/" if engine == "MV" else ""
        with tarfile.open(path, "w:gz") as archive:
            for name, body in {
                "cheat/init/import.js": "// bootstrap",
                "cheat/init/setup.js": "// setup",
                "cheat/init/setup.bundle.js": "// bundled setup",
                "cheat/CheatModal.js": "// UI",
                "cheat/MainComponent.js": "// UI",
                "js/main.js": "// cheat/init/import.js",
                "cheat-version-description.json": json.dumps({"version": version}),
            }.items():
                payload = body.encode()
                entry = tarfile.TarInfo(prefix + name)
                entry.size = len(payload)
                archive.addfile(entry, io.BytesIO(payload))
        return path

    def test_detects_executable_and_reads_title_without_changing_files(self):
        archive = self.make_archive()
        before = sorted(str(path.relative_to(self.game)) for path in self.game.rglob("*"))
        result = presentation.inspect_game(f'"{self.game / "Game.exe"}"', search_dirs=[self.root])
        self.assertEqual(result.title, "A Friendly Adventure")
        self.assertEqual(result.status["game_type"], "MV")
        self.assertEqual(result.source.path, str(archive))
        self.assertEqual(result.source.version, "v1.8.0")
        self.assertEqual(before, sorted(str(path.relative_to(self.game)) for path in self.game.rglob("*")))

    def test_selects_matching_engine_and_semantic_version_not_modification_time(self):
        older = self.make_archive(version="1.9.0")
        newer = self.make_archive(version="1.10.0")
        self.make_archive(engine="MZ", version="99.0.0")
        os.utime(older, (2000000000, 2000000000))
        result = presentation.inspect_game(self.game, search_dirs=[self.root])
        self.assertEqual(result.source.path, str(newer))

    def test_nearest_search_directory_wins_over_unrelated_newer_package(self):
        bundled = self.root / "bundled"
        elsewhere = self.root / "elsewhere"
        wanted = self.make_archive(directory=bundled)
        self.make_archive(version="99.0.0", directory=elsewhere)
        result = presentation.inspect_game(self.game, search_dirs=[bundled, elsewhere])
        self.assertEqual(result.source.path, str(wanted))

    def test_missing_package_preserves_detected_game_for_maintenance(self):
        result = presentation.inspect_game(self.game)
        self.assertIsNone(result.source)
        self.assertEqual(result.status["game_type"], "MV")
        self.assertIn("package", result.package_error.lower())

    def test_explicit_broken_archive_does_not_fall_back_to_automatic_archive(self):
        self.make_archive()
        broken = self.root / "broken.tar.gz"
        broken.write_text("not an archive")
        result = presentation.inspect_game(self.game, archive_path=broken, search_dirs=[self.root])
        self.assertIsNone(result.source)
        self.assertIn("package", result.package_error.lower())

    def test_wrong_engine_archive_is_rejected_before_install(self):
        wrong = self.make_archive(engine="MZ")
        result = presentation.inspect_game(self.game, archive_path=wrong)
        self.assertIsNone(result.source)
        self.assertIn("MV", result.package_error)

    def test_truncated_gzip_keeps_game_detected_for_maintenance(self):
        archive = self.make_archive()
        content = archive.read_bytes()
        archive.write_bytes(content[:len(content) // 2])
        result = presentation.inspect_game(self.game, archive_path=archive)
        self.assertIsNone(result.source)
        self.assertEqual(result.status["game_type"], "MV")
        self.assertIn("package", result.package_error.lower())

    def test_developer_source_is_supported_only_when_explicitly_available(self):
        source = self.root / "source"
        for name in ["cheat/init/import.js", "cheat/init/setup.js", "cheat/init/setup.bundle.js", "cheat/CheatModal.js", "cheat/MainComponent.js", "cheat/js/window-init.js", "_cheat_initialize/mv/js/main.js", "_cheat_initialize/mz/js/main.js"]:
            path = source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text("// cheat/init/import.js")
        result = presentation.inspect_game(self.game, source_root=source, source_version="1.8.0")
        self.assertEqual(result.source.kind, "source")
        self.assertEqual(result.source.version, "v1.8.0")
        self.assertIsNone(presentation.inspect_game(self.game).source)

    def test_invalid_game_has_a_recovery_message(self):
        with self.assertRaisesRegex(RuntimeError, "game folder"):
            presentation.inspect_game(self.root)

    def test_title_falls_back_when_game_metadata_is_malformed(self):
        (self.game / "www/data/System.json").write_text("[]")
        self.assertEqual(presentation.inspect_game(self.game).title, "Example Game")

    def test_error_messages_offer_recovery_and_keep_details_separate(self):
        title, advice = presentation.explain_error(PermissionError("private technical detail"))
        self.assertIn("access", title.lower())
        self.assertIn("close", advice.lower())
        self.assertNotIn("private technical detail", advice)


class WorkerTests(unittest.TestCase):
    def test_one_job_until_result_consumed_and_no_ui_callbacks_from_worker(self):
        runner = presentation.JobRunner()
        release = threading.Event()
        self.addCleanup(release.set)
        self.assertTrue(runner.start("inspect", lambda: release.wait(2)))
        self.assertFalse(runner.start("install", lambda: self.fail("overlapping operation")))
        release.set()
        event = runner.events.get(timeout=3)
        self.assertEqual(event[:2], ("result", "inspect"))
        self.assertTrue(runner.busy)
        runner.finish()
        self.assertFalse(runner.busy)

    def test_failure_is_queued_as_data_and_runner_can_retry(self):
        runner = presentation.JobRunner()
        def broken():
            raise OSError("fixture failure")
        runner.start("install", broken)
        kind, operation, error = runner.events.get(timeout=3)
        self.assertEqual((kind, operation), ("error", "install"))
        self.assertIsInstance(error, OSError)
        runner.finish()
        self.assertTrue(runner.start("inspect", lambda: "ready"))
        self.assertEqual(runner.events.get(timeout=3), ("result", "inspect", "ready"))
        runner.finish()
        with self.assertRaises(queue.Empty):
            runner.events.get_nowait()


if __name__ == "__main__":
    unittest.main()
