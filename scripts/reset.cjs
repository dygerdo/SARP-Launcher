const { existsSync, rmSync } = require("node:fs")
const { join } = require("node:path")
const os = require("node:os")

const APP_DIR_NAME = "san-andreas-roleplay-launcher"

function appDataDir() {
  if (process.platform === "win32") {
    return process.env.APPDATA ?? join(os.homedir(), "AppData", "Roaming")
  }
  if (process.platform === "darwin") {
    return join(os.homedir(), "Library", "Application Support")
  }
  return process.env.XDG_CONFIG_HOME ?? join(os.homedir(), ".config")
}

const appDir = join(appDataDir(), APP_DIR_NAME)
const configFile = join(appDir, "config.json")

if (!existsSync(configFile)) {
  console.log(`Nothing to reset — ${configFile} does not exist.`)
  process.exit(0)
}

try {
  rmSync(configFile, { force: true })
  console.log(`Reset complete — removed ${configFile}`)
} catch (err) {
  if (err.code === "EBUSY" || err.code === "EPERM") {
    console.error(`\nCannot reset — the launcher is running.`)
    console.error(`Close the app (cierra la ventana) and try again.\n`)
    process.exit(1)
  }
  throw err
}
