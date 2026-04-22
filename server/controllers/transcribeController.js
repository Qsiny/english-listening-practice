import audioValidator from '../utils/audioValidator.js';
import { transcribe } from '../services/speechRecognitionService.js';
import fs from 'fs';
import path from 'path';
import {
    ensureHistoryStorage,
    buildHistoryId,
    getItemPaths,
    upsertIndexItem,
} from '../services/historyService.js';

function stripWordPunctuation(word) {
    return (word ?? '')
        .toString()
        .trim()
        .replace(/^[^\w']+/u, '')
        .replace(/[^\w']+$/u, '');
}

function isPeriodPunctuation(punctuation) {
    return /[。.]/u.test(punctuation ?? '');
}

function buildSentenceFromWordObjects(wordObjs, fallbackStart, fallbackEnd) {
    const words = wordObjs
        .map((w) => stripWordPunctuation(w.word))
        .filter(Boolean);

    const text = wordObjs
        .map((w) => `${(w.word ?? '').trim()}${w.punctuation ?? ''}`.trim())
        .filter(Boolean)
        .join(' ')
        .trim();

    const first = wordObjs[0];
    const last = wordObjs[wordObjs.length - 1];
    const start = Number.isFinite(first?.start) ? first.start : fallbackStart;
    const end = Number.isFinite(last?.end) ? last.end : fallbackEnd;

    return { text, start, end, words };
}

function splitSegmentByPeriod(segment) {
    const text = (segment?.text ?? '').trim();
    const start = Number.isFinite(segment?.start) ? segment.start : 0;
    const end = Number.isFinite(segment?.end) ? segment.end : start;

    const rawWords = Array.isArray(segment?.words) ? segment.words : [];
    if (rawWords.length === 0) {
        const parts = text
            .split(/(?<=[。.])/u)
            .map((part) => part.trim())
            .filter(Boolean);

        const sourceParts = parts.length > 0 ? parts : [text].filter(Boolean);
        if (sourceParts.length === 0) return [];

        const duration = Math.max(0, end - start);
        const partDuration = sourceParts.length > 0 ? duration / sourceParts.length : 0;

        return sourceParts.map((part, idx) => {
            const sentenceStart = start + partDuration * idx;
            const sentenceEnd = idx === sourceParts.length - 1 ? end : start + partDuration * (idx + 1);
            return {
                text: part,
                start: sentenceStart,
                end: sentenceEnd,
                words: part.split(/\s+/).map(stripWordPunctuation).filter(Boolean),
            };
        });
    }

    const normalizedWords = rawWords
        .map((word) => ({
            word: (word?.word ?? '').trim(),
            punctuation: word?.punctuation ?? '',
            start: Number.isFinite(word?.start) ? word.start : start,
            end: Number.isFinite(word?.end) ? word.end : start,
        }))
        .filter((word) => word.word.length > 0);

    if (normalizedWords.length === 0) return [];

    const result = [];
    let buffer = [];

    for (const word of normalizedWords) {
        buffer.push(word);
        const wordEndsWithPeriod = /[。.]/u.test(word.word);
        if (isPeriodPunctuation(word.punctuation) || wordEndsWithPeriod) {
            result.push(buildSentenceFromWordObjects(buffer, start, end));
            buffer = [];
        }
    }

    if (buffer.length > 0) {
        result.push(buildSentenceFromWordObjects(buffer, start, end));
    }

    return result;
}

function toPracticeSentences(transcription) {
    const segments = Array.isArray(transcription?.segments) ? transcription.segments : [];
    return segments
        .flatMap((segment) => splitSegmentByPeriod(segment))
        .filter((sentence) => sentence.text || sentence.words.length > 0);
}

export async function transcribeAudio(req, res) {
    try {
        console.log('=== 收到转写请求 ===');

        if (!req.file) {
            return res.status(400).json({ error: '请上传音频文件' });
        }

        const { originalname, size, path: filePath } = req.file;
        const uploadedAt = Date.now();
        const historyId = buildHistoryId({ originalname, size, uploadedAt });
        console.log(`文件: ${originalname}, 大小: ${(size / 1024).toFixed(1)}KB`);

        // 验证文件
        const validation = audioValidator(originalname, size);
        if (!validation.valid) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: validation.error });
        }

        // 调用语音识别（这是异步的，可能需要几十秒）
        const { parsed: transcription, rawJson } = await transcribe(filePath);

        // 基于远程语音识别返回结果，仅按句号做轻量切分
        const sentences = toPracticeSentences(transcription);

        // 写入历史缓存（音频+转写原文+派生练习数据+索引）
        try {
            ensureHistoryStorage();

            const ext = path.extname(originalname) || '';
            const { itemDir, transcriptionPath, practicePath, audioPath } = getItemPaths(historyId, ext);
            fs.mkdirSync(itemDir, { recursive: true });

            fs.copyFileSync(filePath, audioPath);

            if (rawJson) {
                fs.writeFileSync(transcriptionPath, JSON.stringify(rawJson, null, 2), 'utf-8');
            }

            fs.writeFileSync(practicePath, JSON.stringify({ fullText: transcription.text, sentences }, null, 2), 'utf-8');

            upsertIndexItem({
                id: historyId,
                originalname,
                size,
                uploadedAt,
                sentenceCount: sentences.length,
            });
        } catch (e) {
            console.warn('写入历史缓存失败（不影响转写返回）:', e?.message || e);
        }

        console.log(`转写完成，共 ${sentences.length} 个句子`);
        console.log('句子预览:', sentences.slice(0, 3).map(s => s.text));

        // 清理上传的临时文件（可选）
        fs.unlinkSync(filePath);

        return res.json({
            success: true,
            data: {
                sentences,
                fullText: transcription.text,
                historyId,
                audioUrl: `/api/history/${encodeURIComponent(historyId)}/audio`,
            }
        });
    } catch (error) {
        console.error('转写失败:', error.message);
        return res.status(500).json({
            error: error.message || '转写服务出错，请稍后重试'
        });
    }
}
