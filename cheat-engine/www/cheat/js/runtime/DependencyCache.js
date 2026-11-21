import { canonicalAssets, validateManifest } from "./DependencyManifest.js";

function nativeModules() {
  if (typeof require !== "function")
    throw new Error("Online caching requires the game's NW.js runtime");
  return {
    fs: require("fs"),
    path: require("path"),
    crypto: require("crypto"),
    https: require("https"),
    os: require("os"),
  };
}
const digest = (node, bytes) =>
  node.crypto.createHash("sha256").update(bytes).digest("hex");

export function defaultCacheRoot(node) {
  const os = node.os;
  const env = typeof process === "object" ? process.env : {};
  const parent =
    os.platform() === "win32"
      ? env.LOCALAPPDATA || node.path.join(os.homedir(), "AppData", "Local")
      : os.platform() === "darwin"
        ? node.path.join(os.homedir(), "Library", "Caches")
        : env.XDG_CACHE_HOME || node.path.join(os.homedir(), ".cache");
  return node.path.join(parent, "RPGMakerCheatUI", "dependencies");
}

function ensureDirectory(node, directory) {
  const { fs, path } = node;
  try {
    const stat = fs.lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Unsafe dependency cache directory: " + directory);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    ensureDirectory(node, path.dirname(directory));
    try {
      fs.mkdirSync(directory);
    } catch (race) {
      if (race.code !== "EEXIST") throw race;
    }
    const stat = fs.lstatSync(directory);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new Error("Unsafe dependency cache directory");
  }
}

function assetFile(node, root, relative) {
  ensureDirectory(node, root);
  let directory = root;
  const parts = relative.split("/");
  for (let i = 0; i < parts.length - 1; i++) {
    directory = node.path.join(directory, parts[i]);
    ensureDirectory(node, directory);
  }
  const file = node.path.join(directory, parts[parts.length - 1]);
  try {
    const stat = node.fs.lstatSync(file);
    if (stat.isSymbolicLink() || !stat.isFile())
      throw new Error("Unsafe dependency cache file");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  return file;
}

function verifyBytes(node, asset, bytes) {
  if (
    !bytes ||
    bytes.length !== asset.size ||
    digest(node, bytes) !== asset.sha256
  )
    throw new Error("Dependency integrity check failed: " + asset.path);
  return bytes;
}

function readVerified(node, file, asset) {
  let fd;
  try {
    fd = node.fs.openSync(file, "r");
    const stat = node.fs.fstatSync(fd);
    if (!stat.isFile() || stat.size !== asset.size) return null;
    const bytes = Buffer.alloc(asset.size + 1);
    let length = 0;
    while (length < bytes.length) {
      const count = node.fs.readSync(
        fd,
        bytes,
        length,
        bytes.length - length,
        null,
      );
      if (!count) break;
      length += count;
    }
    return verifyBytes(node, asset, bytes.slice(0, length));
  } catch (error) {
    if (error.code === "EACCES" || error.code === "EPERM") throw error;
    return null;
  } finally {
    if (fd !== undefined) node.fs.closeSync(fd);
  }
}

export function downloadDependency(node, url, asset, deadline, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (asset.urls.indexOf(url) === -1 || redirects > 3)
      return reject(new Error("Untrusted dependency redirect"));
    const remaining = Math.min(15000, deadline - Date.now());
    if (remaining <= 0)
      return reject(new Error("Dependency download timed out"));
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value);
    };
    const parsed = new URL(url);
    // Node 9 only supports get(options, callback), not get(url, options, callback).
    const request = node.https.get(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        headers: {
          "Accept-Encoding": "identity",
          "User-Agent": "RPGMakerCheatUI",
        },
      },
      (response) => {
        if ([301, 302, 303, 307, 308].indexOf(response.statusCode) !== -1) {
          response.resume();
          // Only exact, manifest-pinned alternatives may be redirect targets.
          const target = response.headers.location;
          if (asset.urls.indexOf(target) === -1 || redirects >= 3)
            return finish(new Error("Untrusted dependency redirect"));
          clearTimeout(timer);
          downloadDependency(node, target, asset, deadline, redirects + 1).then(
            (bytes) => finish(null, bytes),
            finish,
          );
          return;
        }
        if (
          response.statusCode !== 200 ||
          (response.headers["content-encoding"] &&
            response.headers["content-encoding"] !== "identity")
        ) {
          response.resume();
          return finish(
            new Error(
              "Dependency download failed: HTTP " + response.statusCode,
            ),
          );
        }
        const chunks = [];
        let length = 0;
        response.on("data", (chunk) => {
          length += chunk.length;
          if (length > asset.size) {
            finish(new Error("Dependency exceeds declared size"));
            response.destroy();
            request.destroy();
          } else chunks.push(chunk);
        });
        response.on("end", () => finish(null, Buffer.concat(chunks, length)));
        response.on("error", finish);
        response.on("aborted", () =>
          finish(new Error("Dependency download interrupted")),
        );
      },
    );
    const timer = setTimeout(() => {
      finish(new Error("Dependency download timed out"));
      request.destroy();
    }, remaining);
    request.on("error", finish);
  });
}

export async function prepareDependencies(manifest, options = {}) {
  validateManifest(manifest);
  const node = options.node || nativeModules();
  if (digest(node, canonicalAssets(manifest.assets)) !== manifest.id)
    throw new Error("Dependency manifest identity mismatch");
  const root = node.path.resolve(options.cacheRoot || defaultCacheRoot(node));
  ensureDirectory(node, root);
  const setRoot = node.path.join(root, manifest.id);
  ensureDirectory(node, setRoot);
  const deadline = Date.now() + (options.timeout || 90000);
  const result = Object.create(null);
  let index = 0;
  let stopped = false;
  let timer;
  const work = async () => {
    while (!stopped && index < manifest.assets.length) {
      const asset = manifest.assets[index++];
      const file = assetFile(node, setRoot, asset.path);
      const cached = readVerified(node, file, asset);
      if (cached) {
        result[asset.path] = cached;
        continue;
      }
      if (options.log) options.log("Downloading dependency: " + asset.path);
      let bytes, failure;
      for (const url of asset.urls) {
        if (stopped || Date.now() >= deadline)
          throw new Error("Dependency download timed out");
        try {
          bytes = verifyBytes(
            node,
            asset,
            await (options.download
              ? options.download(url, asset, deadline)
              : downloadDependency(node, url, asset, deadline)),
          );
          break;
        } catch (error) {
          failure = error;
        }
      }
      if (!bytes) throw failure;
      if (stopped || Date.now() >= deadline)
        throw new Error("Dependency download timed out");
      const temporary =
        file + "." + node.crypto.randomBytes(12).toString("hex") + ".tmp";
      try {
        node.fs.writeFileSync(temporary, bytes, { flag: "wx", mode: 384 });
        assetFile(node, setRoot, asset.path);
        try {
          node.fs.renameSync(temporary, file);
        } catch (error) {
          if (!readVerified(node, file, asset)) throw error;
        }
        result[asset.path] = bytes;
      } finally {
        try {
          node.fs.unlinkSync(temporary);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
    }
  };
  try {
    await Promise.race([
      Promise.all([work(), work(), work()]),
      new Promise((resolve, reject) => {
        timer = setTimeout(
          () => {
            stopped = true;
            reject(new Error("Dependency preparation timed out"));
          },
          Math.max(1, deadline - Date.now()),
        );
      }),
    ]);
    return result;
  } finally {
    stopped = true;
    clearTimeout(timer);
  }
}
