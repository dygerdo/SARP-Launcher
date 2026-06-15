import { DownloaderService } from "../services/DownloaderService";
import { VerifierService } from "../services/mod/VerifierService";
import { ExtractorService } from "../services/mod/ExtractorService";
import { InstallerService } from "../services/mod/InstallerService";
import { ConfigRepository } from "../repositories/ConfigRepository";
import { Mod } from "../domain/models/mod";
import path from "node:path";
import fs from "node:fs";

async function runTests() {
  console.log("=== Starting Mod System Smoke Tests ===");

  const config = new ConfigRepository();
  const downloader = new DownloaderService();
  const verifier = new VerifierService();
  const extractor = new ExtractorService();
  const installer = new InstallerService(downloader, verifier, extractor, config);

  const testMod: Mod = {
    id: "test-mod",
    name: "Test Mod",
    description: "Testing",
    version: "1.0.0",
    category: "misc",
    downloadUrl: "https://example.com/invalid.zip",
    files: [],
    sha256: "invalid-sha"
  };

  try {
    console.log("Test 1: Verification Failure (Expected)");
    // This will fail because URL is invalid or SHA is wrong
    const result = await installer.install(testMod);
    if (!result.success && result.error?.includes("Checksum mismatch") || result.error?.includes("download")) {
      console.log("Ô£ô Success: Caught expected failure.");
    } else {
      console.error("Ô£û Failure: Did not catch expected error.", result);
    }
  } catch (e) {
    console.log("Ô£ô Success: Exception caught.");
  }

  console.log("=== Tests Finished ===");
}

runTests().catch(console.error);
