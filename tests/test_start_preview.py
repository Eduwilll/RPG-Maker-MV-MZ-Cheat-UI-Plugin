"""Stdlib-only integration tests for the standalone preview launcher."""

import contextlib
import http.client
import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest import mock


SCRIPT = Path(__file__).resolve().parents[1] / "start-preview.py"
spec = importlib.util.spec_from_file_location("start_preview", SCRIPT)
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class PreviewHTTPTests(unittest.TestCase):
    def setUp(self):
        self.assertTrue(callable(getattr(launcher, "create_server", None)),
                        "launcher must expose import-safe create_server")
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "repo"
        self.root.mkdir()
        for name, content in {
            "preview/index.html": "<h1>Standalone UI</h1>",
            "preview/app.js": "export const value = 1;",
            "preview/style.css": "body {}",
            "preview/empty/.hidden": "hidden",
            "preview/.secret": "secret",
            "preview/.private/config.json": "secret",
            "cheat-engine/www/cheat/Main.js": "export default {};",
            "docs/public/logo.svg": "<svg></svg>",
            "docs/guide.md": "private guide",
            "tmp/game/data.json": "game",
            "README.md": "private readme",
            ".git/config": "private config",
        }.items():
            self.write(name, content)
        self.server = launcher.create_server(self.root, 0)
        self.thread = threading.Thread(
            target=self.server.serve_forever, kwargs={"poll_interval": 0.01}
        )
        self.thread.start()
        self.addCleanup(self.stop_server)

    def stop_server(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=3)
        self.assertFalse(self.thread.is_alive())

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return path

    def request(self, path, method="GET", headers=None):
        with contextlib.closing(http.client.HTTPConnection(
            "127.0.0.1", self.server.server_port, timeout=3
        )) as connection:
            connection.request(method, path, headers=headers or {})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()

    def version(self):
        status, headers, body = self.request("/__preview__/version")
        self.assertEqual(status, 200)
        self.assertIn("application/json", headers["Content-Type"])
        value = json.loads(body)
        self.assertIsInstance(value["version"], str)
        self.assertTrue(value["version"])
        self.assertIs(value["reload"], True)
        return value["version"]

    def test_loopback_ephemeral_port_and_no_cwd_mutation(self):
        self.assertEqual(self.server.server_address[0], "127.0.0.1")
        self.assertGreater(self.server.server_port, 0)
        before = Path.cwd()
        with launcher.create_server(self.root, 0):
            self.assertEqual(Path.cwd(), before)

    def test_root_redirect_and_allowlisted_files(self):
        status, headers, _ = self.request("/")
        self.assertEqual(status, 302)
        self.assertEqual(headers["Location"], "/preview/index.html")
        for path, expected in [
            ("/preview/index.html?mode=test", b"Standalone UI"),
            ("/cheat-engine/www/cheat/Main.js", b"export default"),
            ("/docs/public/logo.svg", b"<svg>"),
        ]:
            with self.subTest(path=path):
                status, _, body = self.request(path)
                self.assertEqual(status, 200)
                self.assertIn(expected, body)

    def test_private_paths_dotfiles_and_traversal_are_blocked(self):
        for path in [
            "/README.md", "/tmp/game/data.json", "/docs/guide.md",
            "/.git/config", "/preview/.secret", "/preview/%2esecret",
            "/preview/.private/config.json", "/preview/../README.md",
            "/preview/%2e%2e/README.md", "/preview/%2E%2E%2fREADME.md",
            "/preview/%252e%252e/README.md",
            "/preview/%2e%2e%5cREADME.md", "/preview/..\\README.md",
            "/preview/C%3a/README.md", "/preview/%00index.html",
            "/preview/%ff", "/preview-other/index.html",
        ]:
            with self.subTest(path=path):
                status, _, _ = self.request(path)
                self.assertIn(status, (400, 403, 404))

    def test_directory_listings_are_never_served(self):
        for path in ["/preview/", "/preview/empty/", "/cheat-engine/www/cheat/"]:
            with self.subTest(path=path):
                status, _, body = self.request(path)
                self.assertEqual(status, 404)
                self.assertNotIn(b"Directory listing", body)

    def test_symlink_escapes_and_hidden_targets_are_blocked(self):
        outside = Path(self.temp.name) / "outside.js"
        outside.write_text("outside secret", encoding="utf-8")
        try:
            (self.root / "preview/escape.js").symlink_to(outside)
            (self.root / "preview/hidden.js").symlink_to(self.root / "preview/.secret")
            (self.root / "preview/outside").symlink_to(
                self.root / "docs", target_is_directory=True
            )
        except (OSError, NotImplementedError) as error:
            self.skipTest("Symlink creation not permitted: {}".format(error))
        for path in ["/preview/escape.js", "/preview/hidden.js", "/preview/outside/guide.md"]:
            with self.subTest(path=path):
                self.assertEqual(self.request(path)[0], 404)

    def test_javascript_mime_no_cache_and_no_wildcard_cors(self):
        status, headers, body = self.request("/preview/app.js")
        self.assertEqual(status, 200)
        self.assertEqual(headers["Content-Type"], "application/javascript")
        self.assertIn("no-store", headers["Cache-Control"])
        self.assertEqual(headers["Pragma"], "no-cache")
        self.assertNotIn("Access-Control-Allow-Origin", headers)
        status, _, head_body = self.request("/preview/app.js", "HEAD")
        self.assertEqual(status, 200)
        self.assertEqual(head_body, b"")
        self.assertTrue(body)
        status, _, _ = self.request("/preview/app.js", headers={
            "If-Modified-Since": "Wed, 31 Dec 2099 23:59:59 GMT"
        })
        self.assertEqual(status, 200)

    def test_version_cached_for_one_second_then_tracks_source_changes(self):
        with mock.patch.object(launcher.time, "monotonic", return_value=100) as clock:
            initial = self.version()
            source = self.write("preview/app.js", "export const value = 2;")
            stat = source.stat()
            os.utime(source, ns=(stat.st_atime_ns, stat.st_mtime_ns + 2000000000))
            clock.return_value = 100.5
            self.assertEqual(self.version(), initial)
            clock.return_value = 101.1
            changed = self.version()
            self.assertNotEqual(changed, initial)
            self.write("cheat-engine/www/cheat/new.css", "body { color: red; }")
            clock.return_value = 102.2
            self.assertNotEqual(self.version(), changed)

    def test_version_ignores_games_docs_and_generated_storage(self):
        with mock.patch.object(launcher.time, "monotonic", return_value=100) as clock:
            initial = self.version()
            for name in ["tmp/game/new.js", "docs/public/new.css",
                         "preview/generatedstorage/state.json", "preview/tmp/new.js",
                         "preview/games/new.js", "preview/.hidden.js", "preview/image.png"]:
                self.write(name, "not preview source")
            clock.return_value = 101.1
            self.assertEqual(self.version(), initial)

    def test_version_detects_each_source_type_and_deletion(self):
        with mock.patch.object(launcher.time, "monotonic", return_value=100) as clock:
            previous = self.version()
            for index, suffix in enumerate(("js", "css", "html", "json")):
                with self.subTest(suffix=suffix):
                    source = self.write("preview/new." + suffix, "source")
                    clock.return_value = 102 + index * 4
                    added = self.version()
                    self.assertNotEqual(added, previous)
                    source.unlink()
                    clock.return_value += 2
                    self.assertEqual(self.version(), previous)

    def test_cached_polls_do_not_rescan_sources(self):
        tracker = self.server.source_version
        with mock.patch.object(launcher.time, "monotonic", return_value=100) as clock, \
                mock.patch.object(tracker, "_fingerprint", wraps=tracker._fingerprint) as scan:
            self.version()
            for now in (100.1, 100.5, 100.99):
                clock.return_value = now
                self.version()
            self.assertEqual(scan.call_count, 1)
            clock.return_value = 101.1
            self.version()
            self.assertEqual(scan.call_count, 2)

    def test_scan_budget_prevents_descending_unbounded_trees(self):
        real_scandir = launcher.os.scandir
        scanned = []

        def record_scan(path):
            scanned.append(Path(path))
            return real_scandir(path)

        with mock.patch.object(launcher, "MAX_SCAN_ENTRIES", 1), \
                mock.patch.object(launcher.os, "scandir", side_effect=record_scan):
            self.version()
        self.assertEqual(scanned, [self.root / "preview"])


class LauncherTests(unittest.TestCase):
    def test_import_does_not_bind_open_browser_or_change_cwd(self):
        with mock.patch("os.chdir", side_effect=AssertionError("chdir")), \
                mock.patch("webbrowser.open", side_effect=AssertionError("browser")), \
                mock.patch("socket.socket.bind", side_effect=AssertionError("bind")):
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)

    def test_cli_parses_flags_and_defaults_without_opening_browser(self):
        self.assertTrue(callable(getattr(launcher, "main", None)), "launcher must expose main")
        with mock.patch.object(launcher, "start_server", return_value=0) as start:
            self.assertEqual(launcher.main(["--port", "0", "--no-browser", "--no-reload"]), 0)
            self.assertEqual(start.call_args.kwargs["port"], 0)
            self.assertIs(start.call_args.kwargs["open_browser"], False)
            self.assertIs(start.call_args.kwargs["reload"], False)
            launcher.main([])
            self.assertEqual(start.call_args.kwargs["port"], 8080)
            self.assertIs(start.call_args.kwargs["open_browser"], True)
            self.assertIs(start.call_args.kwargs["reload"], True)
        for port in ["-1", "65536", "not-a-port"]:
            with self.subTest(port=port), contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as error:
                    launcher.main(["--port", port])
                self.assertEqual(error.exception.code, 2)

    def test_no_reload_endpoint_and_startup_url(self):
        self.assertTrue(callable(getattr(launcher, "create_server", None)))
        output = io.StringIO()
        with tempfile.TemporaryDirectory() as root:
            server = launcher.create_server(root, 0, reload=False)
            server.timeout = 3
            port = server.server_port

            def stop_after_request():
                thread = threading.Thread(target=server.handle_request)
                thread.start()
                with contextlib.closing(http.client.HTTPConnection("127.0.0.1", port, timeout=3)) as conn:
                    conn.request("GET", "/__preview__/version")
                    payload = json.loads(conn.getresponse().read())
                thread.join(timeout=3)
                self.assertFalse(thread.is_alive())
                self.assertIs(payload["reload"], False)
                self.assertIsInstance(payload["version"], str)
                raise KeyboardInterrupt

            with mock.patch.object(launcher, "create_server", return_value=server), \
                    mock.patch.object(server, "serve_forever", side_effect=stop_after_request), \
                    mock.patch.object(launcher.webbrowser, "open", side_effect=AssertionError("browser")), \
                    contextlib.redirect_stdout(output):
                self.assertEqual(launcher.start_server(root, 0, open_browser=False, reload=False), 0)
            self.assertEqual(server.fileno(), -1)
        self.assertIn("http://localhost:{}/preview/index.html".format(port), output.getvalue())
        output.getvalue().encode("ascii")

    def test_port_conflict_is_friendly(self):
        self.assertTrue(callable(getattr(launcher, "create_server", None)))
        with tempfile.TemporaryDirectory() as root, launcher.create_server(root, 0) as server:
            error = io.StringIO()
            with contextlib.redirect_stderr(error), mock.patch.object(
                type(server), "serve_forever",
                side_effect=AssertionError("Conflicting port must not start a server"),
            ):
                result = launcher.start_server(root, server.server_port, open_browser=False)
            self.assertEqual(result, 1)
            self.assertIn(str(server.server_port), error.getvalue())
            self.assertIn("--port", error.getvalue())
            self.assertNotIn("Traceback", error.getvalue())


if __name__ == "__main__":
    unittest.main()
