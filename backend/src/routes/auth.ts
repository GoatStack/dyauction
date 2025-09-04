import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../config/database';
import { singleImage } from '../middleware/upload';

const router = express.Router();

// 회원가입 (이미지 업로드 포함)
router.post('/signup', singleImage, async (req, res) => {
  try {
    console.log('📥 회원가입 요청 데이터:', {
      body: req.body,
      file: req.file,
      headers: req.headers
    });
    
    const { username, email, password, studentId } = req.body;
    const db = getDatabase();
    
    // 이미지 파일 경로
    const idCardImage = req.file ? `/uploads/${req.file.filename}` : null;

    // 사용자 존재 여부 확인
    const existingUser = db.prepare(
      'SELECT * FROM users WHERE email = ? OR username = ?'
    ).get(email, username);
    
    if (existingUser) {
      return res.status(400).json({ message: '이미 존재하는 사용자입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 12);

    // 새 사용자 생성
    const stmt = db.prepare(
      'INSERT INTO users (username, email, password, student_id, id_card_image) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(username, email, hashedPassword, studentId, idCardImage);

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: result.lastInsertRowid },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: '회원가입이 완료되었습니다.',
      token,
      user: {
        id: result.lastInsertRowid,
        username,
        email
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDatabase();

    // 사용자 찾기 (이메일로 검색)
    const user = db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(email) as any;
    
    if (!user) {
      return res.status(400).json({ message: '해당 이메일로 가입된 사용자를 찾을 수 없습니다.' });
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: '잘못된 비밀번호입니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      message: '로그인이 완료되었습니다.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        approval_status: user.approval_status,
        user_type: user.user_type
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
