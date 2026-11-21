import os
import shutil
from enum import Enum
import zipfile
import argparse
import json
from pathlib import Path
import sys
import tempfile

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tools.installer.package_layout import COMPACT_FILES, read_package_metadata

EPHEMERAL_RUNTIME_DIRS = ['cheat-settings']


class GameTypes(Enum):
    MV = 0
    MZ = 1


class CheatPaths:
    def __init__(self, root_dir):
        self.root_dir = root_dir
        self.cheat_dir = 'cheat'
        self.js_dir = 'js'
        self.initialize_dir = '_cheat_initialize'
        self.initialize_game_type_dirs = {
            GameTypes.MV: 'mv',
            GameTypes.MZ: 'mz'
        }

    def get_cheat_source_path(self):
        return os.path.join(self.root_dir, self.cheat_dir)

    def get_js_source_path(self):
        return os.path.join(self.root_dir, self.js_dir)

    def get_initialize_path(self, game_type=None):
        if game_type is None:
            return os.path.join(self.root_dir, self.initialize_dir)

        return os.path.join(self.root_dir, self.initialize_dir, self.initialize_game_type_dirs[game_type])


class Paths:
    def __init__(self):
        script_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.abspath(os.path.join(script_dir, '..'))
        
        self.temp_root_path = os.path.join(root_dir, 'tmp')

        self.origin = CheatPaths(os.path.join(root_dir, 'cheat-engine', 'www'))
        self.temp = CheatPaths(os.path.join(self.temp_root_path, 'www'))

        self.deploy_output_dir = os.path.join(root_dir, 'output')
        self.output_files = {
            GameTypes.MV: 'rpg-mv-cheat-{}-core',
            GameTypes.MZ: 'rpg-mz-cheat-{}-core'
        }

    def get_output_file_path(self, game_type, version):
        return os.path.join(self.deploy_output_dir, self.output_files[game_type]).format(version)


def validate_required_paths(root_dir, relative_paths, label):
    missing_paths = []

    for relative_path in relative_paths:
        absolute_path = os.path.join(root_dir, relative_path)
        if not os.path.exists(absolute_path):
            missing_paths.append(relative_path)

    if missing_paths:
        missing_text = '\n'.join([f'  - {path}' for path in missing_paths])
        raise FileNotFoundError(
            f'{label} is missing required files:\n{missing_text}'
        )


def validate_source_layout(paths):
    validate_required_paths(
        paths.root_dir,
        [
            os.path.join('cheat', 'init', 'import.js'),
            os.path.join('cheat', 'init', 'setup.js'),
            os.path.join('cheat', 'init', 'setup.bundle.js'),
            os.path.join('cheat', 'CheatModal.js'),
            os.path.join('cheat', 'MainComponent.js'),
            os.path.join('cheat', 'js', 'window-init.js'),
            os.path.join('cheat', 'js', 'window-init.bundle.js'),
            os.path.join('_cheat_initialize', 'mv', 'js', 'main.js'),
            os.path.join('_cheat_initialize', 'mz', 'js', 'main.js'),
        ],
        'Cheat source layout',
    )


def validate_packaged_layout(paths):
    validate_required_paths(
        paths.root_dir,
        [
            os.path.join('cheat', 'init', 'import.js'),
            os.path.join('cheat', 'init', 'setup.js'),
            os.path.join('cheat', 'init', 'setup.bundle.js'),
            os.path.join('cheat', 'CheatModal.js'),
            os.path.join('cheat', 'MainComponent.js'),
            os.path.join('cheat', 'js', 'window-init.bundle.js'),
            os.path.join('js', 'main.js'),
            'cheat-version-description.json',
        ],
        'Packaged cheat layout',
    )


def merge_directory(src, dest, inplace=True):
    if not os.path.exists(src) or not os.path.isdir(src):
        return

    if not os.path.exists(dest) and not os.path.isdir(dest):
        os.makedirs(dest, exist_ok=True)

    files = [os.path.join(src, file) for file in os.listdir(src)]

    dirs = [file for file in files if os.path.isdir(file)]
    files = [file for file in files if os.path.isfile(file)]

    for src_file in files:
        file_name = os.path.basename(src_file)
        dest_file = os.path.join(dest, file_name)

        # do not copy if not inplace mode and file exists in dest directory
        if not inplace and os.path.exists(dest) and os.path.isfile(dest_file):
            continue

        print(f'{src_file}  ->  {dest_file}')
        shutil.copy2(src_file, dest_file)

    for src_dir in dirs:
        dir_name = os.path.basename(src_dir)
        dest_dir = os.path.join(dest, dir_name)

        merge_directory(src_dir, dest_dir, inplace)


def create_cheat_version_file(version, paths):
    with open(os.path.join(paths.temp.root_dir, 'cheat-version-description.json'), 'w') as wf:
        data = {
            'version': f'{version}'
        }
        json.dump(data, wf, indent=2)


def build_release_packages(version, *, project_root=None, runtime_root=None, output_dir=None):
    root = Path(project_root or Path(__file__).resolve().parents[1])
    runtime_root = Path(runtime_root or root / 'output' / 'runtime')
    output_dir = Path(output_dir or root / 'output')
    output_dir.mkdir(parents=True, exist_ok=True)
    layouts = {}
    # Validate both variants before generating any new archive.
    for edition in ('offline', 'online'):
        source = runtime_root / edition
        if not (source / 'runtime-layout.json').is_file():
            raise FileNotFoundError(f'Build compact output first: pnpm run build:compact ({source})')
        layouts[edition] = read_package_metadata(source, edition=edition, source=True)
    outputs = []
    for edition, metadata in layouts.items():
        for engine in ('mv', 'mz'):
            # Cleanup owns this unique directory only; browser diagnostics share tmp/.
            with tempfile.TemporaryDirectory(prefix='.package-', dir=output_dir) as staging:
                stage = Path(staging)
                payload = stage / 'www' if engine == 'mv' else stage / 'payload'
                for relative in COMPACT_FILES:
                    destination = payload / relative
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(runtime_root / edition / relative, destination)
                for name in ('DEPENDENCIES.md', 'LICENSES.txt'):
                    source = runtime_root / edition / 'cheat' / name
                    if source.is_file():
                        shutil.copy2(source, payload / 'cheat' / name)
                (payload / 'js').mkdir(exist_ok=True)
                shutil.copy2(root / 'cheat-engine' / 'www' / '_cheat_initialize' / engine / 'js' / 'main.js', payload / 'js' / 'main.js')
                description = dict(metadata, version=version, engine=engine.upper())
                (payload / 'cheat-version-description.json').write_text(json.dumps(description, indent=2), encoding='utf-8')
                read_package_metadata(payload, engine=engine.upper(), edition=edition)
                suffix = '-online' if edition == 'online' else ''
                name = output_dir / f'rpg-{engine}-cheat-{version}{suffix}-core'
                archive = shutil.make_archive(str(name), 'gztar', stage if engine == 'mv' else payload, 'www' if engine == 'mv' else '.')
                outputs.append(archive)
                print(f'Created {archive}')
    return outputs


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='RPG Maker MV/MZ cheat deploy maker')
    parser.add_argument('--version', required=True, type=str, help='version of deployment')
    parser.add_argument('--runtime-root', default=None, help='Prebuilt compact output (default: output/runtime)')
    parser.add_argument('--output-dir', default=None, help='Archive destination (default: output)')
    args = parser.parse_args()
    build_release_packages(args.version, runtime_root=args.runtime_root, output_dir=args.output_dir)
