import express from 'express';
import bcrypt from 'bcryptjs';
import { getDatabase } from '../config/database';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 관리자 권한 확인 미들웨어
const requireAdmin = async (req: AuthRequest, res: any, next: any) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }

    const db = getDatabase();
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user.userId) as any;
    
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
};

// 모든 사용자 조회 (관리자만)
router.get('/users', auth, requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    
    // 데이터베이스 연결 확인
    try {
      db.prepare('SELECT 1').get();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ message: '데이터베이스 연결 오류가 발생했습니다.' });
    }
    
    const users = db.prepare(`
      SELECT id, username, email, student_id, approval_status, user_type, id_card_image, created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `).all();
    
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 새 사용자 계정 생성 (관리자만)
router.post('/users', auth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { username, email, password, studentId, approvalStatus, userType } = req.body;
    const db = getDatabase();

    // 필수 필드 확인
    if (!username || !email || !password || !studentId) {
      return res.status(400).json({ message: '필수 필드가 누락되었습니다.' });
    }

    // 중복 확인
    const existingUser = db.prepare(
      'SELECT * FROM users WHERE email = ? OR username = ? OR student_id = ?'
    ).get(email, username, studentId);
    
    if (existingUser) {
      return res.status(400).json({ message: '이미 존재하는 사용자입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 12);

    // 사용자 생성
    const stmt = db.prepare(`
      INSERT INTO users (username, email, password, student_id, approval_status, user_type) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      username, 
      email, 
      hashedPassword, 
      studentId, 
      approvalStatus || 'pending', 
      userType || 'user'
    );

    res.status(201).json({
      message: '사용자 계정이 생성되었습니다.',
      userId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 승인 상태 변경 (관리자만)
router.patch('/users/:id/approval', auth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { approvalStatus } = req.body;
    const db = getDatabase();

    if (!['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      return res.status(400).json({ message: '유효하지 않은 승인 상태입니다.' });
    }

    const stmt = db.prepare('UPDATE users SET approval_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(approvalStatus, id);

    if (result.changes === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      message: '사용자 승인 상태가 변경되었습니다.',
      approvalStatus
    });
  } catch (error) {
    console.error('Update approval status error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 타입 변경 (관리자만)
router.patch('/users/:id/type', auth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { userType } = req.body;
    const db = getDatabase();

    if (!['admin', 'user'].includes(userType)) {
      return res.status(400).json({ message: '유효하지 않은 사용자 타입입니다.' });
    }

    const stmt = db.prepare('UPDATE users SET user_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    const result = stmt.run(userType, id);

    if (result.changes === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      message: '사용자 타입이 변경되었습니다.',
      userType
    });
  } catch (error) {
    console.error('Update user type error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 삭제 (관리자만)
router.delete('/users/:id', auth, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 자신을 삭제하려는 경우 방지
    const userId = req.user?.userId;
    if (userId && parseInt(userId.toString()) === parseInt(id)) {
      return res.status(400).json({ message: '자신의 계정을 삭제할 수 없습니다.' });
    }

    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      message: '사용자가 삭제되었습니다.'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 통계 정보 (관리자만)
router.get('/stats', auth, requireAdmin, async (req, res) => {
  try {
    const db = getDatabase();
    
    const stats = {
      totalUsers: (db.prepare('SELECT COUNT(*) as count FROM users').get() as any).count,
      pendingUsers: (db.prepare('SELECT COUNT(*) as count FROM users WHERE approval_status = ?').get('pending') as any).count,
      approvedUsers: (db.prepare('SELECT COUNT(*) as count FROM users WHERE approval_status = ?').get('approved') as any).count,
      adminUsers: (db.prepare('SELECT COUNT(*) as count FROM users WHERE user_type = ?').get('admin') as any).count,
      totalAuctions: (db.prepare('SELECT COUNT(*) as count FROM auctions').get() as any).count,
      activeAuctions: (db.prepare('SELECT COUNT(*) as count FROM auctions WHERE status = ?').get('active') as any).count,
      totalBids: (db.prepare('SELECT COUNT(*) as count FROM bids').get() as any).count
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
