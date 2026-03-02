import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { transcribeAudio } from '../controllers/transcribeController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/x-m4a', 'audio/mp4', 'audio/x-wav', 'audio/mp3'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`不支持的音频格式: ${file.mimetype}`), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB
    }
});

router.post('/', (req, res, next) => {
    // 转写可能需要较长时间，设置 10 分钟超时
    req.setTimeout(600000);
    res.setTimeout(600000);

    upload.single('audio')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `上传错误: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }
        next();
    });
}, transcribeAudio);

export default router;