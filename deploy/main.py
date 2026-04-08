import os
import shutil
from enum import Enum
import zipfile
import argparse
import json


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
            os.path.join('cheat', 'CheatModal.js'),
            os.path.join('cheat', 'MainComponent.js'),
            os.path.join('cheat', 'js', 'window-init.js'),
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
            os.path.join('cheat', 'CheatModal.js'),
            os.path.join('cheat', 'MainComponent.js'),
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
            'version': f'v{version}'
        }
        json.dump(data, wf, indent=2)


if __name__ == '__main__':
    # parse args
    parser = argparse.ArgumentParser(description='RPG Maker MV/MZ cheat deploy maker')
    parser.add_argument('--version', required=True, type=str, help='version of deployment')
    args = parser.parse_args()

    paths = Paths()
    validate_source_layout(paths.origin)

    for game_type in GameTypes:
        # copy js sources to temp directory
        shutil.copytree(paths.origin.root_dir, paths.temp.root_dir)

        # merge cheat sources
        merge_directory(
            os.path.join(paths.temp.get_initialize_path(game_type), os.path.basename(paths.temp.get_cheat_source_path())),
            paths.temp.get_cheat_source_path())

        # copy js
        merge_directory(
            os.path.join(paths.temp.get_initialize_path(game_type), os.path.basename(paths.temp.get_js_source_path())),
            paths.temp.get_js_source_path())

        # remove initialize path
        shutil.rmtree(paths.temp.get_initialize_path(), ignore_errors=True)

        # compress to zip file
        shutil.rmtree(os.path.join(paths.temp.root_dir, '.idea'), ignore_errors=True)
        create_cheat_version_file(args.version, paths)
        validate_packaged_layout(paths.temp)
        if game_type == GameTypes.MV:
            shutil.make_archive(paths.get_output_file_path(game_type, args.version), 'gztar', paths.temp_root_path, 'www')
        else:
            shutil.make_archive(paths.get_output_file_path(game_type, args.version), 'gztar', paths.temp.root_dir)

        # remove temp directory
        shutil.rmtree(paths.temp_root_path)
