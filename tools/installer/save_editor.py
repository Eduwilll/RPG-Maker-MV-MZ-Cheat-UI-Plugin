import json
import os
import re
import shutil
import zlib
from datetime import datetime

try:
    from core import GameType, detect_game, get_available_backup_path
except ModuleNotFoundError:
    from .core import GameType, detect_game, get_available_backup_path


SAVE_EDITOR_BACKUP_DIR = "save-editor"


def list_save_files(game_path):
    target = detect_game(game_path)
    save_dir = get_save_dir(target)
    extension = ".rpgsave" if target.game_type == GameType.MV else ".rmmzsave"

    if not os.path.isdir(save_dir):
        return []

    saves = []
    for name in os.listdir(save_dir):
        path = os.path.join(save_dir, name)
        if not os.path.isfile(path) or not name.lower().endswith(extension):
            continue

        stat = os.stat(path)
        saves.append(
            {
                "name": name,
                "path": path,
                "slot": get_slot_label(name),
                "size": stat.st_size,
                "modified": datetime.fromtimestamp(stat.st_mtime).strftime(
                    "%Y-%m-%d %H:%M:%S"
                ),
                "codec": target.game_type.value,
            }
        )

    saves.sort(key=get_save_sort_key)
    return saves


def read_save_json(game_path, save_path):
    target = detect_game(game_path)
    safe_path = normalize_save_path(target, save_path)

    if target.game_type == GameType.MV:
        json_text = decode_mv_save(safe_path)
    else:
        json_text = decode_mz_save(safe_path)

    parsed = json.loads(json_text)
    return json.dumps(parsed, ensure_ascii=False, indent=2)


def write_save_json(game_path, save_path, json_text):
    target = detect_game(game_path)
    safe_path = normalize_save_path(target, save_path)

    parsed = json.loads(json_text)
    normalized_json = json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
    backup_path = backup_save_file(game_path, safe_path)

    if target.game_type == GameType.MV:
        encoded = encode_mv_save(normalized_json)
        with open(safe_path, "w", encoding="utf-8", newline="") as wf:
            wf.write(encoded)
            wf.flush()
            os.fsync(wf.fileno())
    else:
        encoded = encode_mz_save(normalized_json)
        with open(safe_path, "w", encoding="utf-8", newline="") as wf:
            wf.write(encoded)
            wf.flush()
            os.fsync(wf.fileno())

    verify_saved_json(game_path, safe_path, parsed)

    return backup_path


def verify_saved_json(game_path, save_path, expected_data):
    saved_data = json.loads(read_save_json(game_path, save_path))
    if saved_data != expected_data:
        raise RuntimeError(
            "The save file was written, but verification failed when reading it back. "
            "Close the game if it is running and try again."
        )


def backup_save_file(game_path, save_path):
    target = detect_game(game_path)
    safe_path = normalize_save_path(target, save_path)
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_root = os.path.join(target.backup_root, SAVE_EDITOR_BACKUP_DIR)
    backup_dir = get_available_backup_path(backup_root, timestamp)
    os.makedirs(backup_dir, exist_ok=True)

    backup_path = os.path.join(backup_dir, os.path.basename(safe_path))
    shutil.copy2(safe_path, backup_path)

    metadata = {
        "schema": 1,
        "reason": "save-editor",
        "gamePath": target.game_path,
        "rootPath": target.root_path,
        "gameType": target.game_type.value,
        "createdAt": timestamp,
        "sourcePath": safe_path,
        "backupPath": backup_path,
    }
    with open(os.path.join(backup_dir, "save-editor-backup.json"), "w", encoding="utf-8") as wf:
        json.dump(metadata, wf, indent=2)

    return backup_path


def get_save_dir(target):
    return os.path.join(target.root_path, "save")


def normalize_save_path(target, save_path):
    save_dir = os.path.abspath(get_save_dir(target))
    save_path = os.path.abspath(save_path)
    expected_extension = ".rpgsave" if target.game_type == GameType.MV else ".rmmzsave"

    if save_path != save_dir and not save_path.startswith(save_dir + os.sep):
        raise RuntimeError(f"Save file is outside the detected save folder: {save_path}")

    if not save_path.lower().endswith(expected_extension):
        raise RuntimeError(f"Unsupported save extension for {target.game_type.value}: {save_path}")

    if not os.path.isfile(save_path):
        raise FileNotFoundError(f"Save file not found: {save_path}")

    return save_path


def get_slot_label(name):
    lowered = name.lower()
    match = re.match(r"file(\d+)\.", lowered)
    if match:
        return f"Slot {int(match.group(1))}"
    if lowered.startswith("global."):
        return "Global"
    if lowered.startswith("config."):
        return "Config"
    return "Other"


def get_save_sort_key(save):
    slot = save["slot"]
    if slot.startswith("Slot "):
        return (0, int(slot.replace("Slot ", "")), save["name"].lower())
    if slot == "Global":
        return (1, 0, save["name"].lower())
    if slot == "Config":
        return (2, 0, save["name"].lower())
    return (3, 0, save["name"].lower())


def decode_mv_save(path):
    with open(path, "r", encoding="utf-8", newline="") as rf:
        encoded = rf.read()
    decoded = lz_decompress_from_base64(encoded)
    if decoded is None:
        raise RuntimeError(f"Could not decode MV save file: {path}")
    return decoded


def encode_mv_save(json_text):
    return lz_compress_to_base64(json_text)


def decode_mz_save(path):
    with open(path, "r", encoding="utf-8", newline="") as rf:
        text = rf.read()
    compressed = bytes(ord(ch) for ch in text)
    return zlib.decompress(compressed).decode("utf-8")


def encode_mz_save(json_text):
    compressed = zlib.compress(json_text.encode("utf-8"), level=1)
    return "".join(chr(byte) for byte in compressed)


def lz_compress_to_base64(uncompressed):
    if uncompressed is None:
        return ""

    key_str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    compressed = _lz_compress(uncompressed, 16, chr)
    result = []
    index = 0

    while index < len(compressed) * 2:
        if index % 2 == 0:
            n = ord(compressed[index // 2]) >> 8
            r = ord(compressed[index // 2]) & 255
            if index // 2 + 1 < len(compressed):
                i = ord(compressed[index // 2 + 1]) >> 8
            else:
                i = None
        else:
            n = ord(compressed[(index - 1) // 2]) & 255
            if (index + 1) // 2 < len(compressed):
                r = ord(compressed[(index + 1) // 2]) >> 8
                i = ord(compressed[(index + 1) // 2]) & 255
            else:
                r = None
                i = None

        index += 3
        s = n >> 2
        o = ((n & 3) << 4) | ((r or 0) >> 4)
        u = (((r or 0) & 15) << 2) | ((i or 0) >> 6)
        a = (i or 0) & 63

        if r is None:
            u = 64
            a = 64
        elif i is None:
            a = 64

        result.extend([key_str[s], key_str[o], key_str[u], key_str[a]])

    return "".join(result)


def lz_decompress_from_base64(compressed):
    if compressed is None:
        return ""
    if compressed == "":
        return None

    key_str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
    compressed = re.sub(r"[^A-Za-z0-9+/=]", "", compressed)
    text = []
    n = 0
    r = 0
    cursor = 0

    while cursor < len(compressed):
        u = key_str.find(compressed[cursor])
        a = key_str.find(compressed[cursor + 1])
        f = key_str.find(compressed[cursor + 2])
        l = key_str.find(compressed[cursor + 3])
        cursor += 4

        i = (u << 2) | (a >> 4)
        s = ((a & 15) << 4) | (f >> 2)
        o = ((f & 3) << 6) | l

        if n % 2 == 0:
            r = i << 8
            if f != 64:
                text.append(chr(r | s))
            if l != 64:
                r = o << 8
        else:
            text.append(chr(r | i))
            if f != 64:
                r = s << 8
            if l != 64:
                text.append(chr(r | o))

        n += 3

    compressed_text = "".join(text)
    return _lz_decompress(
        len(compressed_text),
        32768,
        lambda index: ord(compressed_text[index]),
    )


def _lz_compress(uncompressed, bits_per_char, get_char_from_int):
    context_dictionary = {}
    context_dictionary_to_create = {}
    context_c = ""
    context_wc = ""
    context_w = ""
    context_enlarge_in = 2
    context_dict_size = 3
    context_num_bits = 2
    context_data = []
    context_data_val = 0
    context_data_position = 0

    for char in uncompressed:
        context_c = char
        if context_c not in context_dictionary:
            context_dictionary[context_c] = context_dict_size
            context_dict_size += 1
            context_dictionary_to_create[context_c] = True

        context_wc = context_w + context_c
        if context_wc in context_dictionary:
            context_w = context_wc
        else:
            (
                context_data_val,
                context_data_position,
                context_enlarge_in,
                context_num_bits,
            ) = _lz_write_dictionary_value(
                context_w,
                context_dictionary,
                context_dictionary_to_create,
                context_data,
                context_data_val,
                context_data_position,
                context_enlarge_in,
                context_num_bits,
                bits_per_char,
                get_char_from_int,
            )
            context_enlarge_in, context_num_bits = _lz_maybe_enlarge(
                context_enlarge_in,
                context_num_bits,
            )
            context_dictionary[context_wc] = context_dict_size
            context_dict_size += 1
            context_w = context_c

    if context_w:
        (
            context_data_val,
            context_data_position,
            context_enlarge_in,
            context_num_bits,
        ) = _lz_write_dictionary_value(
            context_w,
            context_dictionary,
            context_dictionary_to_create,
            context_data,
            context_data_val,
            context_data_position,
            context_enlarge_in,
            context_num_bits,
            bits_per_char,
            get_char_from_int,
        )
        context_enlarge_in, context_num_bits = _lz_maybe_enlarge(
            context_enlarge_in,
            context_num_bits,
        )

    value = 2
    for _i in range(context_num_bits):
        context_data_val = (context_data_val << 1) | (value & 1)
        if context_data_position == bits_per_char - 1:
            context_data_position = 0
            context_data.append(get_char_from_int(context_data_val))
            context_data_val = 0
        else:
            context_data_position += 1
        value >>= 1

    while True:
        context_data_val = context_data_val << 1
        if context_data_position == bits_per_char - 1:
            context_data.append(get_char_from_int(context_data_val))
            break
        context_data_position += 1

    return "".join(context_data)


def _lz_write_dictionary_value(
    value,
    dictionary,
    dictionary_to_create,
    data,
    data_val,
    data_position,
    enlarge_in,
    num_bits,
    bits_per_char,
    get_char_from_int,
):
    if value in dictionary_to_create:
        char_code = ord(value[0])
        if char_code < 256:
            for _i in range(num_bits):
                data_val = data_val << 1
                if data_position == bits_per_char - 1:
                    data_position = 0
                    data.append(get_char_from_int(data_val))
                    data_val = 0
                else:
                    data_position += 1
            for i in range(8):
                data_val = (data_val << 1) | (char_code & 1)
                if data_position == bits_per_char - 1:
                    data_position = 0
                    data.append(get_char_from_int(data_val))
                    data_val = 0
                else:
                    data_position += 1
                char_code >>= 1
        else:
            value_flag = 1
            for _i in range(num_bits):
                data_val = (data_val << 1) | value_flag
                if data_position == bits_per_char - 1:
                    data_position = 0
                    data.append(get_char_from_int(data_val))
                    data_val = 0
                else:
                    data_position += 1
                value_flag = 0
            char_code = ord(value[0])
            for i in range(16):
                data_val = (data_val << 1) | (char_code & 1)
                if data_position == bits_per_char - 1:
                    data_position = 0
                    data.append(get_char_from_int(data_val))
                    data_val = 0
                else:
                    data_position += 1
                char_code >>= 1
        enlarge_in -= 1
        if enlarge_in == 0:
            enlarge_in = 2**num_bits
            num_bits += 1
        del dictionary_to_create[value]
    else:
        value_code = dictionary[value]
        for _i in range(num_bits):
            data_val = (data_val << 1) | (value_code & 1)
            if data_position == bits_per_char - 1:
                data_position = 0
                data.append(get_char_from_int(data_val))
                data_val = 0
            else:
                data_position += 1
            value_code >>= 1

    enlarge_in -= 1
    return data_val, data_position, enlarge_in, num_bits


def _lz_maybe_enlarge(enlarge_in, num_bits):
    if enlarge_in == 0:
        enlarge_in = 2**num_bits
        num_bits += 1
    return enlarge_in, num_bits


def _lz_decompress(length, reset_value, get_next_value):
    dictionary = {0: 0, 1: 1, 2: 2}
    enlarge_in = 4
    dict_size = 4
    num_bits = 3
    entry = ""
    result = []
    data = {
        "val": get_next_value(0),
        "position": reset_value,
        "index": 1,
    }

    bits = _lz_read_bits(2, data, reset_value, get_next_value)
    if bits == 0:
        c = chr(_lz_read_bits(8, data, reset_value, get_next_value))
    elif bits == 1:
        c = chr(_lz_read_bits(16, data, reset_value, get_next_value))
    elif bits == 2:
        return ""
    else:
        return None

    dictionary[3] = c
    w = c
    result.append(c)

    while True:
        if data["index"] > length:
            return ""

        c = _lz_read_bits(num_bits, data, reset_value, get_next_value)

        if c == 0:
            dictionary[dict_size] = chr(
                _lz_read_bits(8, data, reset_value, get_next_value)
            )
            dict_size += 1
            c = dict_size - 1
            enlarge_in -= 1
        elif c == 1:
            dictionary[dict_size] = chr(
                _lz_read_bits(16, data, reset_value, get_next_value)
            )
            dict_size += 1
            c = dict_size - 1
            enlarge_in -= 1
        elif c == 2:
            return "".join(result)

        if enlarge_in == 0:
            enlarge_in = 2**num_bits
            num_bits += 1

        if c in dictionary:
            entry = dictionary[c]
        elif c == dict_size:
            entry = w + w[0]
        else:
            return None

        result.append(entry)
        dictionary[dict_size] = w + entry[0]
        dict_size += 1
        enlarge_in -= 1
        w = entry

        if enlarge_in == 0:
            enlarge_in = 2**num_bits
            num_bits += 1


def _lz_read_bits(num_bits, data, reset_value, get_next_value):
    bits = 0
    maxpower = 2**num_bits
    power = 1

    while power != maxpower:
        resb = data["val"] & data["position"]
        data["position"] >>= 1
        if data["position"] == 0:
            data["position"] = reset_value
            data["val"] = get_next_value(data["index"])
            data["index"] += 1
        if resb > 0:
            bits |= power
        power <<= 1

    return bits
