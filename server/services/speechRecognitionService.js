import fs from 'fs';
import { uploadAudioToOSS, deleteOSSObject } from './ossService.js';

const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function forceHttps(url) {
  if (!url) return url;
  return url.replace(/^http:\/\//i, 'https://');
}

/**
 * 步骤2：提交异步转写任务（严格按文档示例）
 * @param {string} fileUrl 必须是有效的 http/https url
 * @returns {Promise<string>} task_id
 */
async function submitTranscriptionTask(fileUrl) {
  const requestBody = {
    model: 'qwen3-asr-flash-filetrans',
    input: {
      file_url: fileUrl,
    },
    parameters: {
      channel_id: [0],
      enable_itn: false,
      enable_words: true,
    },
  };

  const response = await fetch(`${BASE_URL}/services/audio/asr/transcription`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      'Content-Type': 'application/json',
      'X-DashScope-Async': 'enable',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`提交转写任务失败: ${err}`);
  }

  const data = await response.json();
  const taskId = data.output?.task_id;
  if (!taskId) throw new Error(`未获取到 task_id: ${JSON.stringify(data)}`);
  return taskId;
}

/**
 * 步骤3：轮询任务状态
 */
async function pollTaskResult(taskId) {
  const maxAttempts = 120;
  const interval = 3000;

  for (let i = 0; i < maxAttempts; i++) {
    await sleep(interval);

    const response = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${DASHSCOPE_API_KEY}`,
      },
    });

    if (!response.ok) continue;

    const data = await response.json();
    const status = data.output?.task_status;

    if (status === 'SUCCEEDED') return data;
    if (status === 'FAILED') {
      throw new Error(`转写任务失败: ${data.output?.message || JSON.stringify(data.output)}`);
    }
  }

  throw new Error('转写任务超时');
}

/**
 * 解析任务结果：通常会返回 transcription_url 需要再拉一次
 * （兼容 output.results / output.task_result / output.result 等）
 */
function parseTranscriptionResult(taskResult) {
  const out = taskResult?.output || {};

  const candidates = [
    out.results,
    out.result,
    out.task_result?.results,
    out.task_result,
    out.output?.results,
    out.output,
  ];

  const found = candidates.find((x) => x && (Array.isArray(x) ? x.length > 0 : typeof x === 'object'));

  if (!found) {
    throw new Error(`未获取到转写结果（results/task_result/result 都不存在）。output keys: ${Object.keys(out).join(', ')}`);
  }

  if (Array.isArray(found)) {
    const first = found[0];
    if (first?.transcription_url) return { transcriptionUrl: first.transcription_url, needFetch: true };
    return parseDirectResult(first);
  }

  if (found?.transcription_url) return { transcriptionUrl: found.transcription_url, needFetch: true };

  if (Array.isArray(found?.results) && found.results.length > 0) {
    const first = found.results[0];
    if (first?.transcription_url) return { transcriptionUrl: first.transcription_url, needFetch: true };
    return parseDirectResult(first);
  }

  return parseDirectResult(found);
}

async function fetchTranscriptionDetail(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`获取转写详情失败: ${err}`);
  }
  const data = await response.json();
  return parseDirectResult(data);
}

/**
 * 解析转写结果（保持你已有的兼容解析）
 */
function parseDirectResult(data) {
  let fullText = '';
  const segments = [];

  const transcripts = data?.transcripts || [];
  if (Array.isArray(transcripts) && transcripts.length > 0) {
    for (const transcript of transcripts) {
      const sentences = transcript?.sentences || [];
      for (const sentence of sentences) {
        const segmentText = sentence.text || '';
        fullText += segmentText + ' ';

        const words = [];
        if (Array.isArray(sentence.words)) {
          for (const w of sentence.words) {
            const wordText = w.text || w.word || '';
            if (wordText.trim()) {
              words.push({
                word: wordText,
                start: (w.begin_time ?? w.start ?? 0) / 1000,
                end: (w.end_time ?? w.end ?? 0) / 1000,
              });
            }
          }
        }

        segments.push({
          text: segmentText.trim(),
          start: (sentence.begin_time ?? sentence.start ?? 0) / 1000,
          end: (sentence.end_time ?? sentence.end ?? 0) / 1000,
          words,
        });
      }
    }
  }

  if (segments.length === 0 && typeof data?.transcript === 'string') {
    fullText = data.transcript;
    segments.push({ text: data.transcript, start: 0, end: 0, words: [] });
  }

  if (segments.length === 0 && data?.text) {
    fullText = data.text;
    segments.push({ text: data.text, start: 0, end: 0, words: [] });
  }

  return { text: fullText.trim(), segments };
}

/**
 * 主函数：转写音频文件
 * 核心变化：先上传 OSS（public-read）-> 直接使用 publicUrl 调百炼 ASR
 */
export async function transcribe(filePath) {
  if (!DASHSCOPE_API_KEY) throw new Error('请在 server/.env 中配置 DASHSCOPE_API_KEY');
  if (!fs.existsSync(filePath)) throw new Error(`音频文件不存在: ${filePath}`);

  // 1) 上传到 OSS（public-read）
  const { objectKey, publicUrl } = await uploadAudioToOSS(filePath, {
    prefix: 'english-listening-practice/audio/',
    privateAcl: false, // 你说已改为公共可读
  });

  if (!publicUrl) {
    throw new Error('OSS 上传后未返回 publicUrl');
  }

  const fileUrl = forceHttps(publicUrl);

  try {
    // 2) 提交任务
    const taskId = await submitTranscriptionTask(fileUrl);

    // 3) 轮询结果
    const taskResult = await pollTaskResult(taskId);

    // 4) 解析
    const parsed = parseTranscriptionResult(taskResult);
    if (parsed.needFetch && parsed.transcriptionUrl) {
      return await fetchTranscriptionDetail(parsed.transcriptionUrl);
    }
    return parsed;
  } finally {
    // 可选：转写完成后删除 OSS 对象
    const SHOULD_DELETE = process.env.OSS_DELETE_AFTER_TRANSCRIBE === 'true';
    if (SHOULD_DELETE) {
      try {
        await deleteOSSObject(objectKey);
      } catch {
        // ignore
      }
    }
  }
}