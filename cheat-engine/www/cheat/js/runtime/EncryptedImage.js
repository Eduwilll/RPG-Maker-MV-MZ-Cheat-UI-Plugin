/** Optional images own their asynchronous decryption errors, never the global engine loader. */
export function loadEncryptedBitmap(game, url, mv) {
  return new Promise((resolve, reject) => {
    let done = false,
      objectUrl = null,
      image = null;
    const urls = game.URL || URL;
    const xhr = new game.XMLHttpRequest();
    const timer = setTimeout(() => finish(Error("Image timed out.")), 8000);
    function finish(error, bitmap) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (objectUrl) urls.revokeObjectURL(objectUrl);
      if (image) image.onload = image.onerror = null;
      xhr.onload = xhr.onerror = xhr.ontimeout = null;
      if (error) {
        try {
          xhr.abort();
        } catch (ignored) {}
        reject(error);
      } else resolve(bitmap);
    }
    try {
      xhr.open("GET", mv ? game.Decrypter.extToEncryptExt(url) : url + "_");
      xhr.responseType = "arraybuffer";
      xhr.timeout = 8000;
      xhr.onerror = xhr.ontimeout = () =>
        finish(Error("Encrypted image unavailable."));
      xhr.onload = () => {
        if (done) return;
        try {
          if (xhr.status >= 400) throw Error("Encrypted image unavailable.");
          const data = mv
            ? game.Decrypter.decryptArrayBuffer(xhr.response)
            : game.Utils.decryptArrayBuffer(xhr.response);
          objectUrl = urls.createObjectURL(
            new (game.Blob || Blob)([data], { type: "image/png" }),
          );
          image = new game.Image();
          image.onerror = () => finish(Error("Image decode failed."));
          image.onload = () => {
            if (done) return;
            try {
              const width = image.naturalWidth || image.width,
                height = image.naturalHeight || image.height;
              if (!width || !height) throw Error("Empty image.");
              const bitmap = new game.Bitmap(width, height);
              const ctx = bitmap.context || bitmap._context;
              ctx.drawImage(image, 0, 0);
              if (bitmap._setDirty) bitmap._setDirty();
              finish(null, bitmap);
            } catch (error) {
              finish(error);
            }
          };
          image.src = objectUrl;
        } catch (error) {
          finish(error);
        }
      };
      xhr.send();
    } catch (error) {
      finish(error);
    }
  });
}
