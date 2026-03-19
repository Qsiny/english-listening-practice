import express from 'express';
import path from 'path';
import fs from 'fs';
import {
  readIndex,
  readPractice,
  getItemDir,
} from '../services/historyService.js';

const router = express.Router();

router.get('/', (req, res) => {
  const index = readIndex();
  return res.json({ success: true, data: index.items });
});

router.get('/:id', (req, res) => {
  const { id } = req.params;
  const practice = readPractice(id);
  if (!practice) {
    return res.status(404).json({ error: '未找到该历史记录' });
  }

  return res.json({
    success: true,
    data: {
      ...practice,
      audioUrl: `/api/history/${encodeURIComponent(id)}/audio`,
    },
  });
});

router.get('/:id/audio', (req, res) => {
  const { id } = req.params;
  const dir = getItemDir(id);
  if (!fs.existsSync(dir)) {
    return res.status(404).json({ error: '未找到该历史记录' });
  }

  const files = fs.readdirSync(dir);
  const audioFile = files.find((f) => /^audio\./.test(f)) || files.find((f) => f === 'audio');
  if (!audioFile) {
    return res.status(404).json({ error: '未找到音频文件' });
  }

  return res.sendFile(path.join(dir, audioFile));
});

export default router;
