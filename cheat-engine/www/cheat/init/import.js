function validateNwjsVersion() {
  if (!(typeof require === "function" && typeof process === "object")) {
    return true;
  }

  var nwjsVersion = process.versions["node-webkit"];
  var minRequiredNwjsVersion = "0.26.4";

  if (compareVersionStrings(nwjsVersion, minRequiredNwjsVersion) < 0) {
    var msg = "";
    var docsUrl = "";

    if (/^ko\b/.test(navigator.language)) {
      msg =
        "게임의 Node Webkit 버전이 치트를 사용하기에 너무 낮습니다.\n" +
        "  - 현재 버전=" +
        nwjsVersion +
        ", 최소 요구 버전=" +
        minRequiredNwjsVersion +
        "\n치트가 제대로 동작하지 않을 수 있습니다.\n\n" +
        '해결 방법을 보려면 "확인"을 눌러주세요.';
      docsUrl =
        "https://github.com/paramonos/RPG-Maker-MV-MZ-Cheat-UI-Plugin/blob/main/README_ko-kr.md#%EA%B2%8C%EC%9E%84%EC%9D%98-nwjs-%EB%B2%84%EC%A0%84%EC%9D%B4-0264-%EB%B3%B4%EB%8B%A4-%EB%82%AE%EC%9D%80-%EA%B2%BD%EC%9A%B0-%EC%98%9B%EB%82%A0-%EB%B2%84%EC%A0%84%EC%9D%98-mv-%EA%B2%8C%EC%9E%84%EC%9D%B8-%EA%B2%BD%EC%9A%B0";
    } else {
      msg =
        "Node Webkit version of game is too low to using cheat\n" +
        "  - version=" +
        nwjsVersion +
        ", minimum required version=" +
        minRequiredNwjsVersion +
        "\nCheat may not work properly.\n\n" +
        'Click "OK" button to see the solution.\n';
      docsUrl =
        "https://github.com/paramonos/RPG-Maker-MV-MZ-Cheat-UI-Plugin#if-embeded-nwjs-version-of-game-is-lower-than-0264";
    }

    if (window.confirm(msg)) {
      window.open(docsUrl, "_blank");
    }
    return false;
  }

  return true;
}

function getCheatBootStatus() {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.__cheatBoot) {
    window.__cheatBoot = {
      phase: "import-loading",
      started: false,
      warned: false,
      error: null,
    };
  }

  return window.__cheatBoot;
}

function showCheatBootWarning(reason) {
  var status = getCheatBootStatus();
  if (status) {
    status.error = String(reason || "unknown error");
  }

  try {
    if (typeof console !== "undefined" && console.warn) {
      console.warn(
        "[Cheat] WARNING: cheat did not start: " + (reason || "unknown error"),
      );
    }
  } catch (e) {
    // ignore - logging is best effort
  }

  try {
    if (typeof document === "undefined" || !document.body) {
      return;
    }

    if (document.getElementById("cheat-boot-warning")) {
      return;
    }

    var banner = document.createElement("div");
    banner.id = "cheat-boot-warning";
    banner.setAttribute(
      "style",
      "position:fixed;left:8px;bottom:8px;z-index:999999;" +
        "max-width:420px;padding:10px 12px;border-radius:8px;" +
        "background:rgba(120,20,20,0.95);color:#fff;" +
        "font-family:sans-serif;font-size:12px;line-height:1.5;" +
        "box-shadow:0 2px 12px rgba(0,0,0,0.5);",
    );
    banner.textContent =
      "[Cheat] Cheat UI did not start (" +
      String(reason || "unknown error") +
      "). Game continues without cheats. " +
      "Open DevTools console (F12) and look for [Cheat] errors. " +
      "Check: cheat/ folder at game root (MZ) or www/ (MV), " +
      "delete cheat-settings/ and retry, update NW.js.";

    var closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.setAttribute(
      "style",
      "margin-left:8px;padding:2px 8px;border:1px solid #fff;border-radius:4px;" +
        "background:transparent;color:#fff;cursor:pointer;font-size:12px;",
    );
    closeButton.textContent = "Dismiss";
    closeButton.onclick = function () {
      var el = document.getElementById("cheat-boot-warning");
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    };
    banner.appendChild(closeButton);

    document.body.appendChild(banner);

    if (status) {
      status.warned = true;
    }
  } catch (e) {
    // ignore - banner is best effort
  }
}

function hideCheatBootWarning() {
  try {
    var el = document.getElementById("cheat-boot-warning");
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  } catch (e) {
    // ignore
  }
}

function isCheatRelatedError(message, filename) {
  var text = String(message || "") + " " + String(filename || "");
  return text.indexOf("cheat") !== -1 || text.indexOf("setup.js") !== -1;
}

function installCheatBootErrorWatch() {
  try {
    window.addEventListener("error", function (event) {
      var status = getCheatBootStatus();
      if (status && status.started) {
        return;
      }

      var message = "";
      var filename = "";
      try {
        message = (event && event.message) || "";
        filename = (event && event.filename) || "";
        if (event && event.error && event.error.stack) {
          message = message + " " + event.error.stack;
        }
      } catch (e) {
        // ignore
      }

      if (isCheatRelatedError(message, filename)) {
        showCheatBootWarning(message || "cheat script error");
      }
    });

    window.addEventListener("unhandledrejection", function (event) {
      var status = getCheatBootStatus();
      if (status && status.started) {
        return;
      }

      var reason = "";
      try {
        reason =
          (event &&
            event.reason &&
            (event.reason.stack || event.reason.message)) ||
          String((event && event.reason) || "");
      } catch (e) {
        reason = "unhandled rejection";
      }

      if (isCheatRelatedError(reason, "")) {
        showCheatBootWarning(reason || "cheat module failed to load");
      }
    });
  } catch (e) {
    // ignore - watchers are best effort
  }
}

function installCheatBootWatchdog(delayMs) {
  try {
    setTimeout(function () {
      var status = getCheatBootStatus();
      if (status && !status.started && !status.warned) {
        showCheatBootWarning(
          status.error || "setup.js did not report a successful start",
        );
      }
    }, delayMs || 12000);
  } catch (e) {
    // ignore
  }
}

function compareVersionStrings(leftVersion, rightVersion) {
  var leftParts = String(leftVersion || "0").split(".");
  var rightParts = String(rightVersion || "0").split(".");
  var maxLength = Math.max(leftParts.length, rightParts.length);

  for (var i = 0; i < maxLength; i++) {
    var leftPart = Number(leftParts[i] || 0);
    var rightPart = Number(rightParts[i] || 0);

    if (leftPart < rightPart) {
      return -1;
    }

    if (leftPart > rightPart) {
      return 1;
    }
  }

  return 0;
}

function applyCheat() {
  function __addScript(type, src) {
    var cheatScript = document.createElement("script");
    cheatScript.type = type;
    cheatScript.src = src;
    cheatScript.onerror = function () {
      showCheatBootWarning("failed to load " + src);
    };

    document.body.appendChild(cheatScript);
  }

  function __loadJavaScript(src) {
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = src;
    script.async = false;
    script._url = src;
    script.onerror = function () {
      try {
        if (typeof console !== "undefined" && console.error) {
          console.error("[Cheat] Failed to load " + src);
        }
      } catch (e) {
        // ignore
      }
    };
    document.body.appendChild(script);
  }

  var status = getCheatBootStatus();
  if (status) {
    status.phase = "import-loaded";
  }

  try {
    if (typeof console !== "undefined" && console.log) {
      console.log("[Cheat] import.js loaded - injecting cheat UI...");
    }
  } catch (e) {
    // ignore
  }

  // load libs
  __loadJavaScript("cheat/libs/axios.min.js");

  // add <div id='app'> node for vue
  var appDiv = document.createElement("div");

  appDiv.id = "app";
  appDiv.innerHTML =
    '<v-app app dark style="background-color: black;">' +
    "<v-main dark>" +
    "<main-component></main-component>" +
    "</v-main>" +
    "</v-app>";

  document.body.appendChild(appDiv);

  // import in head
  document.head.innerHTML +=
    '<link href="https://fonts.googleapis.com/css?family=Roboto:100,300,400,500,700,900" rel="stylesheet">' +
    '<link href="https://cdn.jsdelivr.net/npm/@mdi/font@6.x/css/materialdesignicons.min.css" rel="stylesheet">' +
    '<link href="https://cdn.jsdelivr.net/npm/vuetify@2.x/dist/vuetify.min.css" rel="stylesheet">' +
    '<link href="cheat/css/main.css" rel="stylesheet">';

  // import in body
  // __loadJavaScript('cheat/init/setup.js')
  __addScript("module", "cheat/init/setup.js");
}

function hasCheatBootstrapped() {
  try {
    return !!(typeof window !== "undefined" && window.__cheatImportExecuted);
  } catch (e) {
    return false;
  }
}

installCheatBootErrorWatch();
installCheatBootWatchdog(12000);

if (hasCheatBootstrapped()) {
  try {
    if (typeof console !== "undefined" && console.log) {
      console.log(
        "[Cheat] import.js already injected - skipping duplicate bootstrap",
      );
    }
  } catch (e) {
    // ignore
  }
} else {
  try {
    window.__cheatImportExecuted = true;
  } catch (e) {
    // ignore
  }

  try {
    validateNwjsVersion();
    applyCheat();
  } catch (e) {
    var message = "import.js failed";
    try {
      message = (e && (e.stack || e.message)) || String(e);
    } catch (err) {
      // ignore
    }
    showCheatBootWarning(message);
    throw e;
  }
}
