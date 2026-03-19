import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import transcribeRoutes from './routes/transcribe.js';
import historyRoutes from './routes/history.js';

const app = express();
const PORT = process.env.PORT || 5001;

// 允许所有来源的跨域请求
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 测试路由 - 验证服务是否正常
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务正常运行' });
});

app.use('/api/transcribe', transcribeRoutes);
app.use('/api/history', historyRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});