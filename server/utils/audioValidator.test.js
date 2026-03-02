import { describe, it, expect } from 'vitest';
import audioValidator from './audioValidator.js';

describe('audioValidator', () => {
    it('should accept valid mp3 file', () => {
        const result = audioValidator('audio.mp3', 1024);
        expect(result.valid).toBe(true);
    });

    it('should accept valid wav file', () => {
        const result = audioValidator('audio.wav', 1024);
        expect(result.valid).toBe(true);
    });

    it('should accept valid m4a file', () => {
        const result = audioValidator('audio.m4a', 1024);
        expect(result.valid).toBe(true);
    });

    it('should reject unsupported format', () => {
        const result = audioValidator('audio.ogg', 1024);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('不支持的文件格式');
    });

    it('should reject file exceeding max size', () => {
        const result = audioValidator('audio.mp3', 100 * 1024 * 1024);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('文件过大');
    });
});