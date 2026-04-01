import os
import shutil
import argparse
import json
import subprocess
from main import GameTypes, CheatPaths, merge_directory

class DevPaths:
    def __init__(self, game_path):
        self.game_path = os.path.abspath(game_path)
        
        # Detect MV vs MZ based on core files
        # MZ: root/js/rmmz_core.js
        # MV: root/www/js/rpg_core.js  OR  root/js/rpg_core.js
        
        if os.path.exists(os.path.join(self.game_path, 'js', 'rmmz_core.js')):
            self.game_type = GameTypes.MZ
            self.root = self.game_path
        elif os.path.exists(os.path.join(self.game_path, 'www', 'js', 'rpg_core.js')):
            self.game_type = GameTypes.MV
            self.root = os.path.join(self.game_path, 'www')
        elif os.path.exists(os.path.join(self.game_path, 'js', 'rpg_core.js')):
            self.game_type = GameTypes.MV
            self.root = self.game_path
        else:
            raise Exception(f"Could not detect RPG Maker MV or MZ at {game_path}. \nEnsure the path contains 'js/rmmz_core.js' (MZ) or 'js/rpg_core.js' (MV).")
            
        script_dir = os.path.dirname(os.path.abspath(__file__))
        self.source_root = os.path.abspath(os.path.join(script_dir, '..', 'cheat-engine', 'www'))
        self.source = CheatPaths(self.source_root)
        self.target = CheatPaths(self.root)

def setup_dev_sync(game_path):
    try:
        paths = DevPaths(game_path)
    except Exception as e:
        print(f"Error: {e}")
        return

    print(f"Detected {paths.game_type.name} game at {paths.game_path}")
    
    # 1. Inject Core JS (main.js)
    # This is the entry point that bootstraps the cheat
    init_js_path = os.path.join(paths.source.get_initialize_path(paths.game_type), 'js', 'main.js')
    target_js_path = os.path.join(paths.target.get_js_source_path(), 'main.js')
    
    print(f"Injecting {init_js_path} -> {target_js_path}")
    os.makedirs(os.path.dirname(target_js_path), exist_ok=True)
    shutil.copy2(init_js_path, target_js_path)
    
    # 2. Sync secondary files (libs, components, etc.)
    # We copy everything EXCEPT 'cheat' and 'js' which we handle specially
    for item in os.listdir(paths.source_root):
        if item in ['cheat', 'js', '_cheat_initialize']:
            continue
        
        src_item = os.path.join(paths.source_root, item)
        dst_item = os.path.join(paths.root, item)
        
        if os.path.isdir(src_item):
            merge_directory(src_item, dst_item)
        else:
            shutil.copy2(src_item, dst_item)

    # 3. Handle 'js' folder merges (bootstrap libraries like CheatModal.js)
    # Note: We don't symlink 'js' because it contains game-critical files 
    # but we sync our cheat-specific js files.
    merge_directory(paths.source.get_js_source_path(), paths.target.get_js_source_path())

    # 4. SYMLINK 'cheat' folder
    # This is the "Magic": links your active dev folder to the game.
    # Any UI change in panels/*.js is updated instantly!
    cheat_src = paths.source.get_cheat_source_path()
    cheat_dst = paths.target.get_cheat_source_path()
    
    if os.path.exists(cheat_dst):
        print(f"Cleaning up existing cheat destination: {cheat_dst}")
        # On Windows, junctions are detected as directories but fail rmtree
        if os.path.islink(cheat_dst) or os.path.isdir(cheat_dst):
            try:
                # Try unlinking first (works for symlinks and some junctions)
                if os.path.islink(cheat_dst):
                    os.unlink(cheat_dst)
                else:
                    # For Windows Junctions, rmdir is often needed instead of rmtree
                    os.rmdir(cheat_dst)
            except OSError:
                # If it's a real directory with files, use rmtree
                shutil.rmtree(cheat_dst, ignore_errors=True)
                 
    print(f"Linking: {cheat_src} <===> {cheat_dst}")
    
    # Use Junctions on Windows (/J) as they don't require Admin privileges 
    # in most local developer environments.
    if os.name == 'nt':
        subprocess.run(['mklink', '/J', cheat_dst, cheat_src], shell=True)
    else:
        os.symlink(cheat_src, cheat_dst, target_is_directory=True)

    # 5. Version file
    with open(os.path.join(paths.root, 'cheat-version-description.json'), 'w') as wf:
        json.dump({'version': 'vDEV-SYNC'}, wf, indent=2)
        
    print("\n" + "="*40)
    print("🚀 [SUCCESS] Dev-Sync setup complete!")
    print("="*40)
    print("1. Your UI source is now LINKED to the game.")
    print("2. Simply EDIT your .js files in 'cheat-engine/www/cheat/'.")
    print("3. Press [F5] in the game to see changes INSTANTLY.")
    print("="*40)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='RPG Maker Cheat Dev-Sync Tool')
    parser.add_argument('--game-path', type=str, help='Path to game root folder')
    parser.add_argument('--mv', action='store_true', help='Target local MV test game')
    parser.add_argument('--mz', action='store_true', help='Target local MZ test game')
    args = parser.parse_args()
    
    # Auto-target common test paths if flags provided
    target = args.game_path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, '..'))
    
    if args.mv:
        target = os.path.join(project_root, 'tests', 'MV', 'bdpyh-demo-v0.3.2-win', 'PizzaYourHeart')
    elif args.mz:
        target = os.path.join(project_root, 'tests', 'MZ', 'stable_v03_eaDemo')
        
    if not target:
        print("Error: Please provide --game-path or use --mv / --mz flags.")
    else:
        setup_dev_sync(target)
