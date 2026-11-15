import argparse
import json
import os
import tkinter as tk
from tkinter import messagebox

if __package__:
    from .core import detect_game
    from .installer_ui import InstallerApp
    from .save_editor_view import SaveEditorView
    from .save_editor import backup_save_file, list_save_files, read_save_json, write_save_json
else:
    from core import detect_game
    from installer_ui import InstallerApp
    from save_editor_view import SaveEditorView
    from save_editor import backup_save_file, list_save_files, read_save_json, write_save_json


class SaveEditorWindow(SaveEditorView, tk.Toplevel):
    def __init__(self, parent, game_path):
        super().__init__(parent)
        self.parent = parent
        self.game_path = game_path
        self.save_paths = {}
        self.loaded_save_path = None
        self.loaded_data = None
        self.database = {"items": {}, "weapons": {}, "armors": {}, "actors": {}}
        self.actor_records = []
        self.actor_var = tk.StringVar()
        self.gold_var = tk.StringVar()
        self.inventory_category_var = tk.StringVar(value="items")
        self.inventory_quantity_var = tk.StringVar()
        self.inventory_show_all_var = tk.BooleanVar(value=True)
        self.actor_fields = {}
        self.actor_param_fields = {}
        self.status_text = tk.StringVar(value="Select a save, then choose Load.")

        self.title(f"Save Editor - {os.path.basename(os.path.normpath(game_path))}")
        width = min(980, max(740, self.winfo_screenwidth() - 60))
        height = min(680, max(500, self.winfo_screenheight() - 100))
        self.geometry(f"{width}x{height}")
        self.minsize(min(760, width), min(520, height))
        if parent.window_icon:
            self.iconphoto(True, parent.window_icon)

        self.create_widgets()
        self.refresh_saves()


    def refresh_saves(self):
        previous = self.get_selected_save_path() or self.loaded_save_path
        saves = list_save_files(self.game_path)
        for item_id in self.save_tree.get_children():
            self.save_tree.delete(item_id)

        self.save_paths = {}
        for index, save in enumerate(saves):
            item_id = str(index)
            self.save_paths[item_id] = save["path"]
            self.save_tree.insert(
                "",
                tk.END,
                iid=item_id,
                values=(
                    save["slot"],
                    save["name"],
                    save["size"],
                    save["modified"],
                    save["codec"],
                ),
            )
            if save["path"] == previous:
                self.save_tree.selection_set(item_id)
                self.save_tree.focus(item_id)

        self._selection_changed()
        self.status_text.set(f"{len(saves)} save file(s). Select one and choose Load.")

    def get_selected_save_path(self):
        selected = self.save_tree.selection()
        if not selected:
            return None
        return self.save_paths.get(selected[0])

    def load_selected_save(self):
        save_path = self.get_selected_save_path()
        if not save_path:
            messagebox.showwarning("Missing save", "Select a save file first.")
            return

        try:
            json_text = read_save_json(self.game_path, save_path)
        except Exception as error:
            self.status_text.set(f"Could not load save: {error}")
            messagebox.showerror("Save load error", str(error))
            return

        self.loaded_save_path = save_path
        self.loaded_data = json.loads(json_text)
        self.database = self.load_database()
        self.json_text.delete("1.0", tk.END)
        self.json_text.insert("1.0", json_text)
        self.json_text.edit_reset()
        self.configure_loaded_editor()
        suffix = "" if self.structured_supported else " (Raw JSON)"
        self.status_text.set(f"Editing {os.path.basename(save_path)}{suffix}")

    def backup_selected_save(self):
        save_path = self.get_selected_save_path()
        if not save_path:
            messagebox.showwarning("Missing save", "Select a save file first.")
            return

        try:
            backup_path = backup_save_file(self.game_path, save_path)
        except Exception as error:
            self.status_text.set(f"Backup failed: {error}")
            messagebox.showerror("Backup error", str(error))
            return

        self.parent.enqueue_log(f"Save backup created: {backup_path}")
        self.status_text.set(f"Backup created for {os.path.basename(save_path)}")
        messagebox.showinfo("Backup created", f"Save backup created:\n\n{backup_path}")

    def save_loaded_json(self, force_structured=False):
        if not self.loaded_save_path:
            messagebox.showwarning("Missing save", "Load a save file before writing JSON.")
            return

        json_text = self.prepare_json_text_for_save(force_structured=force_structured)
        if json_text is None:
            return

        confirm = messagebox.askyesno(
            "Write save file",
            f"Write changes to this save file?\n\n{self.loaded_save_path}\n\n"
            "A backup copy will be created before writing.",
        )
        if not confirm:
            return

        try:
            backup_path = write_save_json(self.game_path, self.loaded_save_path, json_text)
        except Exception as error:
            self.status_text.set(f"Save failed: {error}")
            messagebox.showerror("Save write error", str(error))
            return

        self.parent.enqueue_log(f"Save file edited: {self.loaded_save_path}")
        self.parent.enqueue_log(f"Save backup created: {backup_path}")
        self.reload_loaded_save_from_disk()
        self.refresh_saves()
        self.status_text.set(f"Saved and verified: {os.path.basename(self.loaded_save_path)}. Backup created.")
        messagebox.showinfo(
            "Save updated",
            "Save file updated and verified successfully.\n\n"
            f"Backup:\n{backup_path}\n\n"
            "If the game was open, close it before editing saves so it cannot overwrite the file.",
        )

    def load_database(self):
        target = detect_game(self.game_path)
        data_root = os.path.join(target.root_path, "data")
        return {
            "items": self.load_database_table(data_root, "Items.json"),
            "weapons": self.load_database_table(data_root, "Weapons.json"),
            "armors": self.load_database_table(data_root, "Armors.json"),
            "actors": self.load_database_table(data_root, "Actors.json"),
        }

    def load_database_table(self, data_root, filename):
        path = os.path.join(data_root, filename)
        if not os.path.exists(path):
            return {}

        try:
            with open(path, "r", encoding="utf-8-sig") as rf:
                data = json.load(rf)
        except (OSError, ValueError):
            return {}

        if not isinstance(data, list):
            return {}

        table = {}
        for entry in data:
            if not entry or not isinstance(entry, dict):
                continue
            entry_id = entry.get("id")
            if entry_id is None:
                continue
            table[str(entry_id)] = entry.get("name") or f"{filename} #{entry_id}"

        return table

    def reload_loaded_save_from_disk(self):
        if not self.loaded_save_path:
            return

        json_text = read_save_json(self.game_path, self.loaded_save_path)
        self.loaded_data = json.loads(json_text)
        self.json_text.delete("1.0", tk.END)
        self.json_text.insert("1.0", json_text)
        self.json_text.edit_reset()
        self.configure_loaded_editor()

    def configure_loaded_editor(self):
        previous = getattr(self, "structured_supported", False)
        self.structured_supported = isinstance(self.loaded_data, dict) and isinstance(self.loaded_data.get("party"), dict)
        self.editor_tabs.tab(0, state="normal" if self.structured_supported else "disabled")
        if self.structured_supported:
            if not previous:
                self.editor_tabs.select(0)
            self.populate_structured_editor()
        else:
            self.editor_tabs.select(1)
        self._set_editor_enabled(self.structured_supported, can_save=True)

    def populate_structured_editor(self):
        if not self.loaded_data:
            return

        party = self.loaded_data.get("party") or {}
        self.gold_var.set(str(party.get("_gold", 0)))
        self.actor_records = self.get_actor_records()
        actor_labels = [record["label"] for record in self.actor_records]
        self.actor_combo.configure(values=actor_labels)
        self.actor_var.set(actor_labels[0] if actor_labels else "")
        self.populate_actor_fields()
        self.populate_inventory()

    def get_actor_records(self):
        actors = (self.loaded_data.get("actors") or {}).get("_data")
        actor_list = self.get_jsonex_array(actors)
        records = []

        for index, actor in enumerate(actor_list):
            if not actor or not isinstance(actor, dict):
                continue

            actor_id = actor.get("_actorId") or index
            database_name = self.database.get("actors", {}).get(str(actor_id), "")
            save_name = actor.get("_name") or database_name or f"Actor {actor_id}"
            label = f"{actor_id}: {save_name}"
            records.append(
                {
                    "label": label,
                    "actor": actor,
                    "actor_id": actor_id,
                    "index": index,
                }
            )

        return records

    def get_selected_actor_record(self):
        selected_label = self.actor_var.get()
        for record in self.actor_records:
            if record["label"] == selected_label:
                return record
        return None

    def populate_actor_fields(self):
        record = self.get_selected_actor_record()
        actor = record["actor"] if record else {}

        for key, var in self.actor_fields.items():
            var.set(str(actor.get(key, "")))

        param_plus = self.get_jsonex_array(actor.get("_paramPlus"))
        for index, var in self.actor_param_fields.items():
            value = param_plus[index] if index < len(param_plus) else 0
            var.set(str(value))

    def populate_inventory(self):
        if not hasattr(self, "inventory_tree"):
            return

        for item_id in self.inventory_tree.get_children():
            self.inventory_tree.delete(item_id)

        if not self.loaded_data:
            return

        category = self.inventory_category_var.get()
        inventory = self.get_inventory_map(category)
        database = self.database.get(category, {})
        ids = set(inventory.keys())
        if self.inventory_show_all_var.get():
            ids.update(database.keys())

        for entry_id in sorted(ids, key=self.safe_int_sort):
            if entry_id.startswith("@"):
                continue
            quantity = int(inventory.get(entry_id, 0) or 0)
            if not self.inventory_show_all_var.get() and quantity <= 0:
                continue
            name = database.get(entry_id, f"{category[:-1].title()} {entry_id}")
            self.inventory_tree.insert(
                "",
                tk.END,
                iid=entry_id,
                values=(entry_id, name, quantity),
            )

    def populate_inventory_quantity(self):
        selected = self.inventory_tree.selection()
        if not selected:
            self.inventory_quantity_var.set("")
            return

        entry_id = selected[0]
        inventory = self.get_inventory_map(self.inventory_category_var.get())
        self.inventory_quantity_var.set(str(inventory.get(entry_id, 0) or 0))

    def apply_gold(self):
        if not self.sync_loaded_data_from_json():
            messagebox.showwarning("Missing save", "Load a save first.")
            return

        try:
            self.apply_gold_to_loaded_data()
        except ValueError as error:
            messagebox.showerror("Invalid gold", str(error))
            return

        self.refresh_json_from_loaded_data("Applied gold to JSON.")

    def apply_actor(self):
        if not self.sync_loaded_data_from_json():
            messagebox.showwarning("Missing save", "Load a save first.")
            return

        try:
            self.apply_actor_to_loaded_data(require_actor=True)
        except ValueError as error:
            messagebox.showerror("Invalid actor value", str(error))
            return

        self.refresh_json_from_loaded_data("Applied actor changes to JSON.")

    def apply_inventory_quantity(self):
        if not self.sync_loaded_data_from_json():
            messagebox.showwarning("Missing save", "Load a save first.")
            return

        selected = self.inventory_tree.selection()
        if not selected:
            messagebox.showwarning("Missing item", "Select an inventory row first.")
            return

        try:
            self.apply_inventory_quantity_to_loaded_data(require_selection=True)
        except ValueError as error:
            messagebox.showerror("Invalid quantity", str(error))
            return

        self.populate_inventory()
        self.refresh_json_from_loaded_data("Applied inventory quantity to JSON.")

    def prepare_json_text_for_save(self, force_structured=False):
        if force_structured or self.is_structured_tab_selected():
            if not self.sync_loaded_data_from_json():
                return None
            if not isinstance(self.loaded_data, dict) or not isinstance(self.loaded_data.get("party"), dict):
                messagebox.showwarning("Use Raw JSON", "This file has no party/actor save data. Edit it in Raw JSON instead.", parent=self)
                self.configure_loaded_editor()
                return None

            try:
                self.apply_gold_to_loaded_data()
                self.apply_actor_to_loaded_data(require_actor=False)
                self.apply_inventory_quantity_to_loaded_data(require_selection=False)
            except ValueError as error:
                messagebox.showerror("Invalid structured value", str(error))
                return None

            self.refresh_json_from_loaded_data("Structured changes are ready to save.")
            return self.json_text.get("1.0", tk.END).strip()

        json_text = self.json_text.get("1.0", tk.END).strip()
        try:
            self.loaded_data = json.loads(json_text)
        except ValueError as error:
            messagebox.showerror("Invalid JSON", f"Fix the Raw JSON before saving.\n\n{error}")
            return None

        return json_text

    def is_structured_tab_selected(self):
        return self.editor_tabs.index(self.editor_tabs.select()) == 0

    def apply_gold_to_loaded_data(self):
        gold = self.parse_int(self.gold_var.get(), "Gold", minimum=0)
        party = self.loaded_data.setdefault("party", {})
        party["_gold"] = gold

    def apply_actor_to_loaded_data(self, require_actor):
        self.actor_records = self.get_actor_records()
        record = self.get_selected_actor_record()
        if not record:
            if require_actor:
                raise ValueError("Select an actor first.")
            return

        actor = record["actor"]
        text_fields = {"_name", "_nickname"}
        numeric_fields = {
            "_level": ("Level", 1),
            "_hp": ("HP", 0),
            "_mp": ("MP", 0),
            "_tp": ("TP", 0),
        }

        for key, var in self.actor_fields.items():
            if key in text_fields:
                actor[key] = var.get()
            elif key in numeric_fields:
                label, minimum = numeric_fields[key]
                actor[key] = self.parse_int(var.get(), label, minimum=minimum)

        param_plus = self.ensure_jsonex_array(actor, "_paramPlus", size=8)
        for index, var in self.actor_param_fields.items():
            param_plus[index] = self.parse_int(var.get(), f"Param {index}", minimum=None)

    def apply_inventory_quantity_to_loaded_data(self, require_selection):
        selected = self.inventory_tree.selection()
        if not selected:
            if require_selection:
                raise ValueError("Select an inventory row first.")
            return

        quantity_text = self.inventory_quantity_var.get().strip()
        if not quantity_text and not require_selection:
            return

        entry_id = selected[0]
        category = self.inventory_category_var.get()
        quantity = self.parse_int(quantity_text, "Quantity", minimum=0)
        inventory = self.get_inventory_map(category)

        if quantity <= 0:
            inventory.pop(entry_id, None)
        else:
            inventory[entry_id] = quantity

    def get_inventory_map(self, category):
        party = self.loaded_data.setdefault("party", {})
        key = {
            "items": "_items",
            "weapons": "_weapons",
            "armors": "_armors",
        }.get(category, "_items")

        inventory = party.get(key)
        if not isinstance(inventory, dict):
            inventory = {}
            party[key] = inventory
        return inventory

    def get_jsonex_array(self, value):
        if isinstance(value, list):
            return value
        if isinstance(value, dict) and isinstance(value.get("@a"), list):
            return value["@a"]
        return []

    def ensure_jsonex_array(self, owner, key, size=0):
        value = owner.get(key)
        if isinstance(value, list):
            array = value
        elif isinstance(value, dict) and isinstance(value.get("@a"), list):
            array = value["@a"]
        else:
            array = []
            owner[key] = array

        while len(array) < size:
            array.append(0)

        return array

    def refresh_json_from_loaded_data(self, message):
        json_text = json.dumps(self.loaded_data, ensure_ascii=False, indent=2)
        self.json_text.delete("1.0", tk.END)
        self.json_text.insert("1.0", json_text)
        self.json_text.edit_modified(False)
        self.status_text.set(message)

    def sync_loaded_data_from_json(self):
        if not self.loaded_save_path:
            return False

        json_text = self.json_text.get("1.0", tk.END).strip()
        if not json_text:
            return False

        try:
            self.loaded_data = json.loads(json_text)
        except ValueError as error:
            messagebox.showerror(
                "Invalid JSON",
                f"Fix the Raw JSON before applying structured changes.\n\n{error}",
            )
            return False

        return True

    def parse_int(self, value, label, minimum=0):
        try:
            parsed = int(str(value).strip())
        except ValueError as error:
            raise ValueError(f"{label} must be a whole number.") from error

        if minimum is not None and parsed < minimum:
            raise ValueError(f"{label} must be {minimum} or higher.")

        return parsed

    def safe_int_sort(self, value):
        try:
            return (0, int(value))
        except ValueError:
            return (1, value)


def main():
    parser = argparse.ArgumentParser(description="Guided RPG Maker MV/MZ Cheat UI installer.")
    parser.add_argument("--game-path", help="Optional game folder or Game.exe path to check on startup.")
    args = parser.parse_args()
    app = InstallerApp(save_editor_factory=SaveEditorWindow)
    if args.game_path:
        app.game_path.set(args.game_path)
    app.mainloop()


if __name__ == "__main__":
    main()
