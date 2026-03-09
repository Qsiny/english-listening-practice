/**
 * 自动断句服务
 *
 * 数据来源：speechRecognitionService.parseDirectResult 返回的 segments，
 * 每个 word 对象格式为：
 *   { word: string, punctuation: string, start: number, end: number }
 *
 * 切分规则（优先级从高到低）：
 *   1. 当前词的 punctuation 字段包含 , . ! ; ? 任意一个 → 强制切分
 *   2. 下一词与当前词之间的停顿 >= pauseThreshold → 切分
 *
 * 输出的 words 数组：纯净单词文本（已去除标点），供拼写练习使用
 *
 * @param {Object} transcription - speechRecognitionService 返回的结果 { text, segments }
 * @param {number} pauseThreshold - 停顿阈值（秒），默认 0.6
 * @returns {Array<{ text: string, start: number, end: number, words: string[] }>}
 */
export function splitSentences(transcription, pauseThreshold = 0.6) {
  const { segments } = transcription;

  if (!segments || segments.length === 0) return [];

  const result = [];

  for (const segment of segments) {
    // 没有 word 级别数据：回退为整段作为一句，文本按空白切词并去标点
    if (!segment.words || segment.words.length === 0) {
      result.push({
        text: segment.text?.trim() || '',
        start: segment.start,
        end: segment.end,
        words: cleanWords(splitByWhitespace(segment.text || '')),
      });
      continue;
    }

    let currentWords = [segment.words[0]];
    let sentenceStart = segment.words[0].start;

    for (let i = 1; i < segment.words.length; i++) {
      const prevWord = segment.words[i - 1];
      const currWord = segment.words[i];

      // 规则1：前一词的 punctuation 字段含 , . ! ; ? → 强制切分
      const punctuation = prevWord.punctuation ?? '';
      const hasSplitPunct = /[,.!;?]/.test(punctuation);

      // 规则2：时间停顿超过阈值
      const pause = currWord.start - prevWord.end;
      const hasPause = pause >= pauseThreshold;

      if (hasSplitPunct || hasPause) {
        result.push(buildSentence(currentWords, sentenceStart, prevWord.end));
        currentWords = [currWord];
        sentenceStart = currWord.start;
      } else {
        currentWords.push(currWord);
      }
    }

    // 收尾：提交最后一组词
    if (currentWords.length > 0) {
      const lastWord = currentWords[currentWords.length - 1];
      result.push(buildSentence(currentWords, sentenceStart, lastWord.end));
    }
  }

  return result;
}

// ─── 内部工具 ────────────────────────────────────────────────

/**
 * 把一组 word 对象组装成句子
 * - text：带标点的原始拼接文本（展示/调试用）
 * - words：纯净单词列表（去除首尾标点），供拼写练习使用
 */
function buildSentence(wordObjs, start, end) {
  const rawText = wordObjs
    .map((w) => (w.word || '') + (w.punctuation || ''))
    .join(' ')
    .trim();

  const words = wordObjs
    .map((w) => stripPunctuation(w.word || ''))
    .filter(Boolean);

  return { text: rawText, start, end, words };
}

/**
 * 去除单词首尾的标点符号，保留内部撇号（如 don't / it's）
 */
function stripPunctuation(word) {
  return word
    .trim()
    .replace(/^[^\w']+/, '')
    .replace(/[^\w']+$/, '');
}

/**
 * 按空白切词（用于没有 word 时间戳的回退路径）
 */
function splitByWhitespace(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean);
}

/**
 * 对字符串数组批量去标点
 */
function cleanWords(arr) {
  return arr.map(stripPunctuation).filter(Boolean);
}
