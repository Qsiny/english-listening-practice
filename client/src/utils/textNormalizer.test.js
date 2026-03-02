import { describe, it, expect } from 'vitest';
import { textNormalizer, extractWords, isWordMatch } from './textNormalizer';

describe('textNormalizer', () => {
    it('should convert text to lowercase and trim', () => {
        expect(textNormalizer('  Some Text!  ')).toBe('some text!');
    });

    it('should return empty string for null/undefined', () => {
        expect(textNormalizer(null)).toBe('');
        expect(textNormalizer(undefined)).toBe('');
        expect(textNormalizer('')).toBe('');
    });
});

describe('extractWords', () => {
    it('should split text into words and remove punctuation', () => {
        expect(extractWords('This is a test.')).toEqual(['This', 'is', 'a', 'test']);
    });

    it('should handle multiple spaces', () => {
        expect(extractWords('hello   world')).toEqual(['hello', 'world']);
    });

    it('should return empty array for empty input', () => {
        expect(extractWords('')).toEqual([]);
        expect(extractWords(null)).toEqual([]);
    });
});

describe('isWordMatch', () => {
    it('should match words ignoring case', () => {
        expect(isWordMatch('Hello', 'hello')).toBe(true);
    });

    it('should match words ignoring leading/trailing spaces', () => {
        expect(isWordMatch('  hello  ', 'hello')).toBe(true);
    });

    it('should reject non-matching words', () => {
        expect(isWordMatch('hell', 'hello')).toBe(false);
    });
});