import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloaderService } from '../services/DownloaderService';
import axios from 'axios';
import fs from 'node:fs';

vi.mock('axios');
vi.mock('node:fs');

describe('DownloaderService', () => {
  let downloader: DownloaderService;

  beforeEach(() => {
    downloader = new DownloaderService();
    vi.clearAllMocks();
  });

  it('should download a file successfully', async () => {
    const mockResponse = {
      data: {
        on: vi.fn((event, cb) => {
          if (event === 'data') cb(Buffer.from('test data'));
          return mockResponse.data;
        }),
        pipe: vi.fn(),
      },
      headers: { 'content-length': '9' },
    };
    (axios as any).mockResolvedValue(mockResponse);
    (fs.createWriteStream as any).mockReturnValue({
      on: vi.fn((event, cb) => {
        if (event === 'finish') cb();
      }),
      close: vi.fn(),
    });
    (fs.existsSync as any).mockReturnValue(true);

    const result = await downloader.download({ url: 'http://test.com', savePath: 'test.zip' });
    expect(result).toBe('test.zip');
    expect(axios).toHaveBeenCalled();
  });

  it('should handle network errors and retry', async () => {
    (axios as any).mockRejectedValueOnce(new Error('Network Error'));
    
    // Second attempt success
    const mockResponse = {
      data: {
        on: vi.fn(() => mockResponse.data),
        pipe: vi.fn(),
      },
      headers: { 'content-length': '0' },
    };
    (axios as any).mockResolvedValue(mockResponse);
    (fs.createWriteStream as any).mockReturnValue({
      on: vi.fn((event, cb) => {
        if (event === 'finish') cb();
      }),
      close: vi.fn(),
    });

    const result = await downloader.download({ url: 'http://test.com', savePath: 'test.zip' });
    expect(result).toBe('test.zip');
    expect(axios).toHaveBeenCalledTimes(2);
  });

  it('should throw an error after max retries', async () => {
    (axios as any).mockRejectedValue(new Error('Persistent Error'));
    await expect(downloader.download({ url: 'http://test.com', savePath: 'test.zip' }))
      .rejects.toThrow('Failed to download after 3 attempts');
  });

  it('should be cancelled via AbortSignal', async () => {
    const controller = new AbortController();
    (axios as any).mockImplementation(({ signal }) => {
      if (signal.aborted) return Promise.reject({ name: 'AbortError' });
      return new Promise(() => {}); // never resolves
    });

    controller.abort();
    await expect(downloader.download({ url: 'http://test.com', savePath: 'test.zip' }, undefined, controller.signal))
      .rejects.toThrow();
  });
});
