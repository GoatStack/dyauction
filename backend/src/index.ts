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
  origin: 'http://localhost:8082',  // 클라이언트의 오리진
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,  // 쿠키를 포함한 요청을 허용
}));
// 미들웨어 인스턴스를 미리 생성 (메모리 누수 방지)
const jsonParser = express.json({ 
  limit: '100mb',
  type: 'application/json'
});

const urlencodedParser = express.urlencoded({ 
  extended: true, 
  limit: '100mb',
  type: 'application/x-www-form-urlencoded'
});

// body-parser 미들웨어 등록 (Express가 자동으로 content-type에 따라 처리)
app.use(jsonParser);
app.use(urlencodedParser);

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

// CORS headers are already set via the cors middleware above.
app.options('*', (req, res) => {
  console.log('OPTIONS headers from client:', req.headers);
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8082');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

export default app;
