import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstallerService } from '../services/mod/InstallerService';
import { AppError, ErrorCode } from '../domain/errors/AppError';
import path from 'node:path';
import fs from 'node:fs';

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => 'tmp') }
}));
vi.mock('node:fs');

describe('InstallerService', () => {
  let installer: InstallerService;
  let downloader: any;
  let verifier: any;
  let extractor: any;
  let modRepo: any;
  let configRepo: any;

  beforeEach(() => {
    downloader = { download: vi.fn().mockResolvedValue('zipPath') };
    verifier = { verifyChecksum: vi.fn().mockResolvedValue(true) };
    extractor = { extract: vi.fn().mockResolvedValue(undefined) };
    modRepo = { saveMod: vi.fn() };
    configRepo = { get: vi.fn().mockReturnValue('gameDir') };

    installer = new InstallerService(downloader, verifier, extractor, modRepo, configRepo);
    vi.clearAllMocks();
    (fs.existsSync as any).mockReturnValue(true);
  });

  it('should orchestrate full installation successfully', async () => {
    const mod = { id: 'm1', downloadUrl: 'url', files: [], version: '1.0' };
    const result = await installer.install(mod as any);

    expect(result.success).toBe(true);
    expect(downloader.download).toHaveBeenCalled();
    expect(extractor.extract).toHaveBeenCalled();
    expect(modRepo.saveMod).toHaveBeenCalled();
  });

  it('should fail if checksum is invalid', async () => {
    verifier.verifyChecksum.mockResolvedValue(false);
    const mod = { id: 'm1', downloadUrl: 'url', sha256: 'hash', files: [], version: '1.0' };
    
    const result = await installer.install(mod as any);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Checksum mismatch');
    expect(extractor.extract).not.toHaveBeenCalled();
  });

  it('should fail if download fails', async () => {
    downloader.download.mockRejectedValue(new Error('Network error'));
    const mod = { id: 'm1', downloadUrl: 'url', files: [] };
    
    const result = await installer.install(mod as any);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});
