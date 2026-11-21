import concurrent.futures
import json
import pathlib
import tempfile
import unittest
from unittest import mock
import time

from tools.installer.dependency_cache import prepare_dependencies, validate_manifest, download_dependency

FIXTURE = pathlib.Path(__file__).parent / "fixtures" / "dependencies" / "manifest.json"


class DependencyCacheTests(unittest.TestCase):
    def setUp(self):
        self.manifest = json.loads(FIXTURE.read_text())
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = pathlib.Path(self.directory.name)

    def test_cold_warm_corrupt(self):
        calls = []
        def download(*args):
            calls.append(args)
            return b"hello"
        self.assertEqual(prepare_dependencies(self.manifest, cache_root=self.root, download=download)["vue.js"], b"hello")
        prepare_dependencies(self.manifest, cache_root=self.root, download=lambda *args: self.fail("warm cache used network"))
        self.assertEqual(len(calls), 1)
        (self.root / self.manifest["id"] / "vue.js").write_bytes(b"wrong")
        prepare_dependencies(self.manifest, cache_root=self.root, download=download)
        self.assertEqual(len(calls), 2)

    def test_bad_and_interrupted_downloads_never_publish(self):
        for value in [b"wrong", b"too long", b""]:
            with self.assertRaises(ValueError):
                prepare_dependencies(self.manifest, cache_root=self.root, download=lambda *args: value)
            self.assertFalse((self.root / self.manifest["id"] / "vue.js").exists())
        with self.assertRaises(OSError):
            prepare_dependencies(self.manifest, cache_root=self.root, download=lambda *args: (_ for _ in ()).throw(OSError("interrupted")))

    def test_manifest_protocol_and_concurrent_publication(self):
        self.assertIs(validate_manifest(self.manifest), self.manifest)
        for path in ["../vue.js", "C:/vue.js", "a\\vue.js", "CON.js", "x./vue.js"]:
            invalid = json.loads(FIXTURE.read_text())
            invalid["assets"][0]["path"] = path
            with self.assertRaises(ValueError):
                validate_manifest(invalid)
        with concurrent.futures.ThreadPoolExecutor(2) as pool:
            results = list(pool.map(lambda _: prepare_dependencies(self.manifest, cache_root=self.root, download=lambda *args: b"hello"), range(2)))
        self.assertEqual(results, [{"vue.js": b"hello"}] * 2)
        self.assertEqual([p.name for p in (self.root / self.manifest["id"]).iterdir()], ["vue.js"])

    def test_identity_and_blocked_directory(self):
        self.manifest["id"] = "b" * 64
        with self.assertRaises(ValueError):
            prepare_dependencies(self.manifest, cache_root=self.root, download=lambda *args: b"hello")
        self.manifest = json.loads(FIXTURE.read_text())
        blocked = self.root / "blocked"
        blocked.write_text("keep")
        with self.assertRaises(OSError):
            prepare_dependencies(self.manifest, cache_root=blocked, download=lambda *args: b"hello")

    def test_slow_stream_cannot_hold_installer_past_absolute_deadline(self):
        class SlowResponse:
            status = 200
            headers = {}
            def __enter__(self):
                return self
            def __exit__(self, *_):
                pass
            def read(self, _):
                time.sleep(2)
                return b"hello"
            read1 = read
        opener = mock.Mock()
        opener.open.return_value = SlowResponse()
        asset = self.manifest["assets"][0]
        started = time.monotonic()
        with mock.patch("tools.installer.dependency_cache.urllib.request.build_opener", return_value=opener):
            with self.assertRaises(TimeoutError):
                download_dependency(asset["urls"][0], asset, started + 0.05)
        self.assertLess(time.monotonic() - started, 1.5)


if __name__ == "__main__":
    unittest.main()
