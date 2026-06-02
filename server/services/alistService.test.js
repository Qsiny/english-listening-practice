import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };
let tempDir;

function setAListEnv() {
  process.env.ALIST_BASE_URL = 'http://alist.local/';
  process.env.ALIST_PUBLIC_BASE_URL = 'http://public.local';
  process.env.ALIST_USERNAME = 'upload_user';
  process.env.ALIST_PASSWORD = 'secret';
  process.env.ALIST_UPLOAD_DIR = '/audios/';
  delete process.env.ALIST_AUTH_PREFIX;
}

describe('alistService', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    setAListEnv();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'alist-service-'));
    vi.resetModules();
    vi.spyOn(Date, 'now').mockReturnValue(123);
    vi.spyOn(Math, 'random').mockReturnValue(0.42);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it('logs in, uploads the file, and returns the public AList download URL', async () => {
    const localFilePath = path.join(tempDir, 'test audio.mp3');
    fs.writeFileSync(localFilePath, 'audio bytes');

    vi.stubGlobal('fetch', vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 200, data: { token: 'token-1' } }), { status: 200 }))
      .mockImplementationOnce(async (_url, options) => {
        await new Promise((resolve, reject) => {
          options.body.on('end', resolve);
          options.body.on('error', reject);
          options.body.resume();
        });
        return new Response(JSON.stringify({ code: 200, message: 'success' }), { status: 200 });
      })
      .mockResolvedValueOnce(new Response(JSON.stringify({
        code: 200,
        message: 'success',
        data: {
          raw_url: 'http://alist.local/p/audios/123-420000000-test_audio.mp3',
        },
      }), { status: 200 })));

    const { uploadAudioToAList } = await import('./alistService.js');
    const result = await uploadAudioToAList(localFilePath);

    expect(result).toEqual({
      remotePath: '/audios/123-420000000-test_audio.mp3',
      publicUrl: 'http://public.local/p/audios/123-420000000-test_audio.mp3',
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      'http://alist.local/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ username: 'upload_user', password: 'secret' }),
      }),
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'http://alist.local/api/fs/put',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'token-1',
          'File-Path': '/audios/123-420000000-test_audio.mp3',
          'Content-Type': 'audio/mpeg',
          'Content-Length': '11',
        }),
        duplex: 'half',
      }),
    );

    expect(global.fetch).toHaveBeenNthCalledWith(
      3,
      'http://alist.local/api/fs/get',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'token-1',
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ path: '/audios/123-420000000-test_audio.mp3' }),
      }),
    );
  });
});
