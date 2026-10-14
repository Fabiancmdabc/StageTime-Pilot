/**
 * Notarisiert das macOS-Bundle nach dem Signieren.
 * Skippt still, wenn APPLE_ID / APPLE_APP_SPECIFIC_PASSWORD / APPLE_TEAM_ID fehlen.
 *
 * Benötigt aktives Apple Developer Program + Developer ID Application Zertifikat.
 */
const path = require("node:path");
const { notarize } = require("@electron/notarize");

/** @param {import('electron-builder').AfterPackContext} context */
exports.default = async function notarizing(context) {
  if (context.electronPlatformName !== "darwin") return;

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.log(
      "[notarize] übersprungen – setze APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD und APPLE_TEAM_ID",
    );
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  console.log(`[notarize] starte Notarisierung für ${appPath}`);

  // Staple kann bei Netzwerkfehlern (CloudKit -1005) fehlschlagen —
  // Notarize inkl. Staple mit kurzen Retries.
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await notarize({
        appPath,
        appleId,
        appleIdPassword,
        teamId,
      });
      console.log("[notarize] fertig");
      return;
    } catch (err) {
      lastError = err;
      const msg = err?.message || String(err);
      console.warn(`[notarize] Versuch ${attempt}/3 fehlgeschlagen: ${msg}`);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 5000 * attempt));
      }
    }
  }
  throw lastError;
};
