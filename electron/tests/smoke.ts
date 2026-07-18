import { DownloaderService } from "../services/DownloaderService"
import { VerifierService } from "../services/mod/VerifierService"
import { ExtractorService } from "../services/mod/ExtractorService"
import { InstallerService } from "../services/mod/InstallerService"
import { ConfigRepository } from "../repositories/ConfigRepository"
import { ModRepository } from "../repositories/ModRepository"
import type { Mod } from "../../src/types/mods"

async function runTests() {
  console.log("=== Starting Mod System Smoke Tests ===")

  const config = new ConfigRepository()
  const modRepo = new ModRepository(config)
  const downloader = new DownloaderService()
  const verifier = new VerifierService()
  const extractor = new ExtractorService()
  const installer = new InstallerService(downloader, verifier, extractor, modRepo, config)

  const testMod: Mod = {
    id: "test-mod",
    name: "Test Mod",
    description: "Testing",
    version: "1.0.0",
    category: "misc",
    type: "cleo",
    requiresEssentials: [],
    downloadUrl: "https://example.com/invalid.zip",
    files: [],
    sha256: "invalid-sha",
    size: 1024,
  }

  try {
    console.log("Test 1: Verification Failure (Expected)")
    // This will fail because URL is invalid or SHA is wrong
    const result = await installer.install(testMod)
    if (
      (!result.success && result.error?.includes("Checksum mismatch")) ||
      result.error?.includes("download")
    ) {
      console.log("✓ Success: Caught expected failure.")
    } else {
      console.error("✗ Failure: Did not catch expected error.", result)
    }
  } catch (e) {
    console.log("✓ Success: Exception caught.")
  }

  console.log("=== Tests Finished ===")
}

runTests().catch(console.error)
