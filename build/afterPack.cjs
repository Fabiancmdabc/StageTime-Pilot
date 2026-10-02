/**
 * Nach dem Packen: falsche Plattform-Binaries und unnötige Electron-Locales entfernen.
 */
const { rmSync, existsSync, readdirSync } = require("node:fs");
const path = require("node:path");

/** @param {import('electron-builder').AfterPackContext} context */
exports.default = async function afterPack(context) {
  const appOut = context.appOutDir;
  const platform = context.electronPlatformName; // darwin | win32
  // electron-builder arch: 0=ia32, 1=x64, 3=arm64
  const archNum = context.arch;
  const archName =
    typeof archNum === "number"
      ? { 0: "ia32", 1: "x64", 3: "arm64" }[archNum] || String(archNum)
      : String(archNum);

  const grandiKeep =
    platform === "darwin"
      ? archName === "arm64"
        ? "darwin-arm64"
        : "darwin-x64"
      : "win32-x64";

  const unpackedRoots = [
    path.join(
      appOut,
      "StageTime-Pilot.app",
      "Contents",
      "Resources",
      "app.asar.unpacked",
      "node_modules",
      "@grandi",
    ),
    path.join(appOut, "resources", "app.asar.unpacked", "node_modules", "@grandi"),
  ];

  for (const root of unpackedRoots) {
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root)) {
      if (name !== grandiKeep) {
        rmSync(path.join(root, name), { recursive: true, force: true });
        console.log(`[afterPack] removed @grandi/${name}`);
      }
    }
  }

  const localeDirs = [
    path.join(
      appOut,
      "StageTime-Pilot.app",
      "Contents",
      "Frameworks",
      "Electron Framework.framework",
      "Versions",
      "A",
      "Resources",
    ),
    path.join(appOut, "locales"),
  ];
  const keepLocales = new Set([
    "en.lproj",
    "de.lproj",
    "en-US.pak",
    "en.pak",
    "de.pak",
  ]);

  for (const dir of localeDirs) {
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      const isLocale = name.endsWith(".lproj") || name.endsWith(".pak");
      if (!isLocale) continue;
      if (!keepLocales.has(name)) {
        rmSync(path.join(dir, name), { recursive: true, force: true });
      }
    }
    console.log(`[afterPack] pruned locales in ${path.basename(dir)}`);
  }
};
