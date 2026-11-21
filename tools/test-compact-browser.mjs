import path from "node:path";
import { runBrowserChecks } from "./test-browser.mjs";

async function checkSidebarScroll({ page, checks }) {
  const frames = page
    .frames()
    .filter((frame) =>
      /compact-view\.html|\/cheat\/window\.html/.test(frame.url()),
    );
  if (frames.length !== 2)
    throw new Error("Expected overlay and popout frames");
  for (const frame of frames) {
    const surface = frame.url().includes("compact-view") ? "overlay" : "popout";
    const nav = frame.locator(".cheat-nav");
    const geometry = await nav.evaluate((element) => ({
      height: element.clientHeight,
      content: element.scrollHeight,
      overflow: getComputedStyle(element).overflowY,
    }));
    if (geometry.overflow !== "auto" || geometry.content <= geometry.height)
      throw new Error(
        surface + " sidebar is not scrollable: " + JSON.stringify(geometry),
      );
    const gameWheelBefore =
      surface === "overlay"
        ? await frame.evaluate(
            () => TouchInput._events.wheelY + TouchInput._newState.wheelY,
          )
        : 0;
    await nav.evaluate((element) => {
      element.scrollTop = 0;
    });
    await nav.hover();
    await page.mouse.wheel(0, 280);
    try {
      await frame.waitForFunction(
        () => document.querySelector(".cheat-nav").scrollTop > 0,
        null,
        { timeout: 3000 },
      );
    } catch (error) {
      throw new Error(
        surface +
          " sidebar ignores mouse-wheel scrolling despite scrollable geometry: " +
          JSON.stringify(geometry),
      );
    }
    checks.push(
      surface +
        " sidebar scrolls with a real mouse wheel after game input was bound",
    );
    if (surface === "overlay") {
      const gameWheelAfter = await frame.evaluate(
        () => TouchInput._events.wheelY + TouchInput._newState.wheelY,
      );
      if (gameWheelAfter !== gameWheelBefore)
        throw new Error("Scrolling the cheat also changed game wheel input");
      const outside = await frame.evaluate(() => {
        const event = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaY: 37,
        });
        const before = TouchInput._events.wheelY + TouchInput._newState.wheelY;
        document.body.dispatchEvent(event);
        return (
          event.defaultPrevented &&
          TouchInput._events.wheelY + TouchInput._newState.wheelY ===
            before + 37
        );
      });
      if (!outside)
        throw new Error(
          "Wheel input outside the cheat no longer reaches the game",
        );
      checks.push(
        "Cheat scrolling is isolated while wheel input outside still reaches the game",
      );
    }
  }
}

for (const edition of ["offline", "online"]) {
  for (const engine of ["MV", "MZ"]) {
    const artifactDir = path.resolve(
      "tmp/browser-smoke/compact-" + edition,
      Date.now() + "-" + process.pid + "-" + engine,
    );
    const result = await runBrowserChecks({
      entry:
        "tests/browser/compact.html?edition=" + edition + "&engine=" + engine,
      artifactDir,
      blockExternal: true,
      afterChecks: checkSidebarScroll,
    });
    console.log(
      edition +
        " " +
        engine +
        ": " +
        result.status.toUpperCase() +
        " - " +
        result.checks.length +
        " checks",
    );
    if (result.status !== "pass") {
      console.error(result.error + "\nDiagnostics: " + artifactDir);
      process.exitCode = 1;
    }
  }
}
