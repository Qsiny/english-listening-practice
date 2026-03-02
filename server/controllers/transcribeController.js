import audioValidator from '../utils/audioValidator.js';
import { transcribe } from '../services/speechRecognitionService.js';
import { splitSentences } from '../services/sentenceSplitterService.js';
import fs from 'fs';

export async function transcribeAudio(req, res) {
    try {
        console.log('=== 收到转写请求 ===');

        if (!req.file) {
            return res.status(400).json({ error: '请上传音频文件' });
        }

        const { originalname, size, path: filePath } = req.file;
        console.log(`文件: ${originalname}, 大小: ${(size / 1024).toFixed(1)}KB`);

        // 验证文件
        const validation = audioValidator(originalname, size);
        if (!validation.valid) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: validation.error });
        }

        // 调用语音识别（这是异步的，可能需要几十秒）
        const transcription = await transcribe(filePath);

        // 自动断句
        const sentences = splitSentences(transcription);

        console.log(`转写完成，共 ${sentences.length} 个句子`);
        console.log('句子预览:', sentences.slice(0, 3).map(s => s.text));

        // 清理上传的临时文件（可选）
        fs.unlinkSync(filePath);

        return res.json({
            success: true,
            data: {
                sentences,
                fullText: transcription.text
            }
        });
    } catch (error) {
        console.error('转写失败:', error.message);
        return res.status(500).json({
            error: error.message || '转写服务出错，请稍后重试'
        });
    }
}