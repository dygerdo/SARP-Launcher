import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ManifestService } from '../services/ManifestService';
import axios from 'axios';

vi.mock('axios');

describe('ManifestService', () => {
  let service: ManifestService;
  let configRepo: any;

  beforeEach(() => {
    configRepo = { get: vi.fn(), set: vi.fn() };
    service = new ManifestService(configRepo);
    vi.clearAllMocks();
  });

  it('should fetch and cache manifest', async () => {
    const mockManifest = { version: '1.0', mods: [] };
    (axios.get as any).mockResolvedValue({ data: mockManifest });

    const result = await service.fetchManifest(true);
    expect(result).toEqual(mockManifest);
    expect(configRepo.set).toHaveBeenCalledWith('lastManifest', mockManifest);
  });

  it('should fallback to cache on network failure', async () => {
    const mockManifest = { version: '1.0', mods: [] };
    (axios.get as any).mockRejectedValue(new Error('Offline'));
    configRepo.get.mockReturnValue(mockManifest);

    const result = await service.fetchManifest(true);
    expect(result).toEqual(mockManifest);
  });
});
