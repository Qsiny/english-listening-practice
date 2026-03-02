/**
 * 自动断句服务
 * 根据时间停顿和标点符号将转写结果分割为句子
 * @param {Object} transcription - 语音识别返回的结果
 * @param {number} pauseThreshold - 停顿阈值（秒），默认 0.6
 * @returns {Array<{ text: string, start: number, end: number, words: string[] }>}
 */
export function splitSentences(transcription, pauseThreshold = 0.6) {
  const { segments } = transcription;

  if (!segments || segments.length === 0) return [];

  const sentences = [];

  for (const segment of segments) {
    // 如果段落没有 word 级别时间戳，直接按空白切词（不去标点）
    if (!segment.words || segment.words.length === 0) {
      sentences.push({
        text: segment.text?.trim() || '',
        start: segment.start,
        end: segment.end,
        words: splitWordsKeepPunctuation(segment.text || '')
      });
      continue;
    }

    // 有 word 时间戳：用 ASR 返回的 token 原样作为 words（保留 ', \'' 等）
    let currentWords = [segment.words[0]];
    let sentenceStart = segment.words[0].start;

    for (let i = 1; i < segment.words.length; i++) {
      const prevWord = segment.words[i - 1];
      const currWord = segment.words[i];
      const pause = currWord.start - prevWord.end;

      const prevText = prevWord.word || '';
      const endsWithPunctuation = /[.!?]$/.test(prevText);

      if (pause >= pauseThreshold || endsWithPunctuation) {
        const text = currentWords.map(w => w.word).join(' ');
        sentences.push({
          text: text.trim(),
          start: sentenceStart,
          end: prevWord.end,
          words: currentWords.map(w => (w.word || '').trim()).filter(Boolean),
        });

        currentWords = [currWord];
        sentenceStart = currWord.start;
      } else {
        currentWords.push(currWord);
      }
    }

    if (currentWords.length > 0) {
      const text = currentWords.map(w => w.word).join(' ');
      const lastWord = currentWords[currentWords.length - 1];
      sentences.push({
        text: text.trim(),
        start: sentenceStart,
        end: lastWord.end,
        words: currentWords.map(w => (w.word || '').trim()).filter(Boolean),
      });
    }
  }

  return sentences;
}

/**
 * 仅按空白分割，保留 ' , . 等符号（它们是拼写的一部分）
 */
function splitWordsKeepPunctuation(text) {
  return (text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}