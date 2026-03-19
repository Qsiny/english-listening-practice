import audioValidator from '../utils/audioValidator.js';
import { transcribe } from '../services/speechRecognitionService.js';
import { splitSentences } from '../services/sentenceSplitterService.js';
import fs from 'fs';
import path from 'path';
import {
    ensureHistoryStorage,
    buildHistoryId,
    getItemPaths,
    upsertIndexItem,
} from '../services/historyService.js';

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

        // 自动断句
        const sentences = splitSentences(transcription);

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