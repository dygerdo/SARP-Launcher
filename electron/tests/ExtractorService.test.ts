import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExtractorService } from '../services/mod/ExtractorService';
import extract from 'extract-zip';
import fs from 'node:fs';

vi.mock('extract-zip');
vi.mock('node:fs');

describe('ExtractorService', () => {
  let extractor: ExtractorService;

  beforeEach(() => {
    extractor = new ExtractorService();
    vi.clearAllMocks();
  });

  it('should extract successfully', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    (extract as any).mockResolvedValue(undefined);

    await extractor.extract('test.zip', 'dest');
    expect(extract).toHaveBeenCalledWith('test.zip', expect.any(Object));
  });

  it('should prevent path traversal', async () => {
    (fs.existsSync as any).mockReturnValue(true);
    let onEntry: any;
    (extract as any).mockImplementation((_path, options) => {
      onEntry = options.onEntry;
      return Promise.resolve();
    });

    await extractor.extract('test.zip', 'dest');
    
    expect(() => onEntry({ fileName: '../evil.exe' })).toThrow('Insecure entry path');
    expect(() => onEntry({ fileName: 'C:\\windows\\system32.dll' })).toThrow('Insecure entry path');
  });
});
