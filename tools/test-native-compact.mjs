// Isolated NW.js proof: uses the runtime executable, never its game's files.
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const value = (flag, fallback) =>
  args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback;
const executable = value("--runtime");
const engine = value("--engine", "MV");
const edition = value("--edition", "offline");
if (
  !executable ||
  !["MV", "MZ"].includes(engine) ||
  !["offline", "online"].includes(edition)
) {
  throw new Error(
    "Use --runtime path/to/Game.exe --engine MV|MZ --edition offline|online [--block-network] [--cache-root path]",
  );
}
const artifactRoot = path.join(root, "tmp/native-compact");
fs.mkdirSync(artifactRoot, { recursive: true });
const app = fs.mkdtempSync(
  path.join(artifactRoot, engine + "-" + edition + "-"),
);
const content = engine === "MV" ? path.join(app, "www") : app;
const reportPath = path.join(app, "result.json");
const cacheRoot = path.resolve(
  value("--cache-root", path.join(artifactRoot, "shared-cache")),
);
fs.mkdirSync(content, { recursive: true });
fs.cpSync(
  path.join(root, "output/runtime", edition, "cheat"),
  path.join(content, "cheat"),
  { recursive: true },
);
fs.copyFileSync(
  path.join(root, "preview/rpg-mocks.js"),
  path.join(content, "rpg-mocks.js"),
);
const fixture = fs
  .readFileSync(path.join(root, "preview/feature-mocks.js"), "utf8")
  .replace("export function", "function");
fs.writeFileSync(path.join(content, "feature-mocks.js"), fixture);
fs.writeFileSync(
  path.join(app, "package.json"),
  JSON.stringify({
    name: "cheat-native-smoke-" + path.basename(app).toLowerCase(),
    main: engine === "MV" ? "www/index.html" : "index.html",
    window: { show: false, width: 1000, height: 700 },
    "chromium-args": "--disable-gpu --no-first-run",
  }),
);
fs.writeFileSync(
  path.join(content, "index.html"),
  '<!doctype html><html><head><meta charset="utf-8"></head><body><script>window.onerror=function(message){require("fs").writeFileSync(' +
    JSON.stringify(reportPath) +
    ',JSON.stringify({status:"fail",versions:process.versions,error:String(message)}));require("nw.gui").App.quit();};</script><script src="./native-check.js"></script></body></html>',
);

const nativeCode = `
var fs=require('fs'),appRoot=${JSON.stringify(app)},reportPath=${JSON.stringify(reportPath)};
process.chdir(appRoot);
process.env.LOCALAPPDATA=${JSON.stringify(cacheRoot)};
process.env.XDG_CACHE_HOME=${JSON.stringify(cacheRoot)};
var report={status:'running',engine:${JSON.stringify(engine)},edition:${JSON.stringify(edition)},versions:process.versions,checks:[],errors:[],networkCalls:0};
function write(){fs.writeFileSync(reportPath,JSON.stringify(report,null,2));}
function check(value,label){if(!value)throw new Error(label);report.checks.push(label);write();}
function fail(error){report.status='fail';report.errors.push(String(error&&error.stack||error));write();require('nw.gui').App.quit();}
window.onerror=function(message,url,line,column,error){fail(error||message);};
window.addEventListener('unhandledrejection',function(event){fail(event.reason);});
var https=require('https'),originalGet=https.get;
https.get=function(){report.networkCalls++;if(${args.includes("--block-network")})throw new Error('Native smoke blocked network');return originalGet.apply(this,arguments);};
write();
function load(src){return new Promise(function(resolve,reject){var script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=function(){reject(new Error('load '+src));};document.body.appendChild(script);});}
async function until(test,label){var deadline=Date.now()+110000;while(!test()){if(Date.now()>deadline)throw new Error('Timed out '+label);await new Promise(function(resolve){setTimeout(resolve,25);});}}
async function run(){
  await load('./rpg-mocks.js');await load('./feature-mocks.js');installBrowserFixture(window);
  Utils.RPGMAKER_NAME=${JSON.stringify(engine)};
  for(var name of ['Window_Base','Window_ScrollText','Window_BattleLog','Window_ChoiceList','Game_Enemy']){
    window[name]=function(){};
    for(var method of ['drawText','drawTextEx','drawItemName','startMessage','scrollSpeed','messageSpeed','makeCommandList','addText','name'])window[name].prototype[method]=function(){return 1;};
  }
  await load('./cheat/init/import.js');
  check(!!window.__cheatSaveRuntime,'Save hooks installed before UI readiness');
  var payload={cheatDatabaseOverrides:{version:1,entries:[{kind:'enemy',id:1,patch:{gold:99}}]}};
  DataManager.extractSaveContents(payload);
  check(DataManager.makeSaveContents().cheatDatabaseOverrides.entries[0].patch.gold===99,'Save edits round-trip before UI readiness');
  await until(function(){return window.__cheatStarted||window.__cheatBoot&&window.__cheatBoot.error;},'overlay');
  check(!!window.__cheatStarted,'Native overlay starts: '+JSON.stringify(window.__cheatBoot));
  check(window.__cheatFeatures.database===window.__cheatSaveRuntime,'Native UI reuses early save runtime');
  await document.fonts.load('16px "Material Design Icons"');
  report.stylesheets=Array.from(document.styleSheets).map(function(sheet){return {href:sheet.href,rules:sheet.cssRules.length};});
  report.fonts=Array.from(document.fonts).map(function(font){return {family:font.family,status:font.status};});write();
  check(document.fonts.check('16px "Material Design Icons"'),'Native icon font loads');
  await document.fonts.load('400 16px Roboto');
  check(document.fonts.check('400 16px Roboto'),'Native Roboto loads');
  GeneralCheat.openCheatModal('watcher-panel');
  var popup=await new Promise(function(resolve){require('nw.gui').Window.open(new URL('cheat/window.html',location.href).href,{show:false,width:1000,height:700},function(child){setTimeout(function(){child.window.__cheatOpener=window;resolve(child);},100);});});
  await until(function(){return popup.window.__cheatStarted||popup.window.__cheatBoot&&popup.window.__cheatBoot.error;},'popout');
  check(!!popup.window.__cheatStarted,'Native popout starts: '+JSON.stringify(popup.window.__cheatBoot));
  check(popup.window.$dataMap===window.$dataMap,'Native popout bridges live game data');
  if(${args.includes("--block-network")})check(report.networkCalls===0,'No native dependency network requests');
  popup.close(true);report.status='pass';write();require('nw.gui').App.quit();
}
run().catch(fail);
`;
fs.writeFileSync(path.join(content, "native-check.js"), nativeCode);
console.log("Native artifacts: " + app);
// Some packaged runtimes ignore --nwapp beside their original package.json.
// Give the test its own executable directory, with only standard runtime files.
const runtimeDirectory = path.dirname(path.resolve(executable));
const runtimeExe = path.join(app, "native-runtime.exe");
fs.copyFileSync(path.resolve(executable), runtimeExe);
const runtimeFile =
  /^(?:(?:nw|nw_elf|node|ffmpeg|libEGL|libGLESv2|d3dcompiler_47|vk_swiftshader|vulkan-1)\.dll|nw_\d+_percent\.pak|resources\.pak|icudtl\.dat|natives_blob\.bin|snapshot_blob\.bin|v8_context_snapshot\.bin|notification_helper\.exe)$/i;
function linkOrCopy(source, target) {
  try {
    fs.linkSync(source, target);
  } catch (error) {
    fs.copyFileSync(source, target);
  }
}
for (const name of fs.readdirSync(runtimeDirectory)) {
  if (runtimeFile.test(name))
    linkOrCopy(path.join(runtimeDirectory, name), path.join(app, name));
}
for (const directory of ["locales", "swiftshader"]) {
  const source = path.join(runtimeDirectory, directory);
  if (fs.existsSync(source)) {
    fs.mkdirSync(path.join(app, directory));
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      if (entry.isFile())
        linkOrCopy(
          path.join(source, entry.name),
          path.join(app, directory, entry.name),
        );
    }
  }
}
const log = fs.openSync(path.join(app, "native-output.log"), "w");
const child = spawn(
  runtimeExe,
  [
    "--nwapp=" + app,
    "--user-data-dir=" + path.join(app, "profile"),
    "--enable-logging=stderr",
  ],
  {
    cwd: app,
    windowsHide: true,
    stdio: ["ignore", log, log],
  },
);
fs.closeSync(log);
async function stopOwnedRuntime() {
  // Give NW.App.quit time to shut down its renderers before forcing termination.
  const deadline = Date.now() + 2500;
  while (child.exitCode === null && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
  if (child.exitCode === null) {
    if (process.platform === "win32") spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore", timeout: 5000 });
    else child.kill();
  }
}
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
const deadline = Date.now() + 130000;
while (Date.now() < deadline) {
  await new Promise((resolve) => setTimeout(resolve, 500));
  let report;
  try {
    report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  } catch {
    continue;
  }
  if (report.status !== "running") {
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== "pass") process.exitCode = 1;
    await stopOwnedRuntime();
    break;
  }
}
if (
  !fs.existsSync(reportPath) ||
  JSON.parse(fs.readFileSync(reportPath, "utf8")).status === "running"
) {
  await stopOwnedRuntime();
  throw new Error("Native test did not finish; see " + app);
}
