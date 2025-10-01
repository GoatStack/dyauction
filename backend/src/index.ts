import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import { closeDatabase, initDatabase } from './config/database';
import adminRoutes from './routes/admin';
import auctionRoutes from './routes/auction';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';

// 환경 변수 로드
dotenv.config();

const app = express();
const PORT = process.env.PORT || 65000;

// 데이터베이스 초기화
initDatabase();

// 미들웨어
app.use(cors({
  origin: true, // 모든 도메인에서 접근 허용
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// 커스텀 body-parser 설정
app.use((req, res, next) => {
  console.log('📏 요청 Content-Type:', req.headers['content-type']);
  console.log('📏 요청 Content-Length:', req.headers['content-length']);
  
  if (req.headers['content-type']?.includes('application/json')) {
    express.json({ 
      limit: '100mb',
      type: 'application/json',
      verify: (req, res, buf) => {
        console.log('📏 JSON 요청 크기:', buf.length, 'bytes');
      }
    })(req, res, next);
  } else if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
    express.urlencoded({ 
      extended: true, 
      limit: '100mb',
      type: 'application/x-www-form-urlencoded',
      verify: (req, res, buf) => {
        console.log('📏 URL-encoded 요청 크기:', buf.length, 'bytes');
      }
    })(req, res, next);
  } else {
    next();
  }
});

// 정적 파일 서빙 (HTML, CSS, JS 등)
app.use(express.static(path.join(__dirname, '..')));

// 업로드된 이미지 파일 서빙
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 라우트
app.use('/api/auth', authRoutes);
app.use('/api/auctions', auctionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// 기본 라우트는 아래 리다이렉트 핸들러에서 처리

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

// 사용자 페이지 라우트 (기존 로그인 페이지를 사용자 페이지로 변경)
app.get('/user', (req, res) => {
  res.sendFile(path.join(__dirname, '../login.html'));
});

// 루트 경로는 사용자 페이지로 리다이렉트
app.get('/', (req, res) => {
  res.redirect('/user');
});

// 서버 시작
const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📱 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🌐 External API Base URL: http://40.82.159.69:${PORT}/api`);
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
