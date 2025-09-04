import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase, closeDatabase } from './config/database';
import authRoutes from './routes/auth';
import auctionRoutes from './routes/auction';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 데이터베이스 초기화
initDatabase();

// 미들웨어
app.use(cors({
  origin: true, // 모든 도메인에서 접근 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 (HTML, CSS, JS 등)
app.use(express.static(path.join(__dirname, '..')));

// 업로드된 이미지 파일 서빙
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: 'DyAuction Backend API Server' });
});

// Health check 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'DyAuction Backend API Server is running',
    timestamp: new Date().toISOString()
  });
});

// 관리자 페이지 라우트
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin.html'));
});

// 로그인 페이지 라우트
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

// 루트 경로에서 로그인 페이지로 리다이렉트
app.get('/', (req, res) => {
  res.redirect('/login');
});

// 서버 시작
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 External API Base URL: http://11.182.183.250:${PORT}/api`);
});

// 프로세스 종료 시 데이터베이스 연결 해제
process.on('SIGINT', () => {
  closeDatabase();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

export default app;
