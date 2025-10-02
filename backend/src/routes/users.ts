import express from 'express';
import { getDatabase } from '../config/database';
import { auth, AuthRequest } from '../middleware/auth';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getImageUrl, processImageUrls, formatAuctionImages } from '../utils/imageUtils';

const router = express.Router();

// 이미지 업로드 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/profile-images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB 제한
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// 프로필 이미지 업로드
router.post('/upload-profile-image', auth, upload.single('profileImage'), async (req: AuthRequest, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({ error: '이미지 파일이 없습니다.' });
    }

    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    // 이미지 URL 생성
    const imageUrl = `/uploads/profile-images/${req.file.filename}`;
    
    // DB에 이미지 경로 저장
    const db = getDatabase();
    db.prepare(`
      UPDATE users SET profile_image = ? WHERE id = ?
    `).run(imageUrl, userId);


    res.json({ 
      message: '프로필 이미지가 성공적으로 업로드되었습니다.',
      imageUrl: imageUrl
    });
  } catch (error) {
    // console.error('Failed to upload profile image:', error);
    res.status(500).json({ error: '이미지 업로드에 실패했습니다.' });
  }
});

// 사용자 프로필 정보 가져오기
router.get('/profile', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    const user = db.prepare(`
      SELECT id, username, email, student_id, approval_status, created_at, user_type, profile_image
      FROM users 
      WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    res.json({
      id: user.id,
      name: user.username,
      email: user.email,
      studentId: user.student_id,
      verificationStatus: user.approval_status,
      createdAt: user.created_at,
      isAdmin: user.user_type === 'admin',
      profileImage: user.profile_image,
    });
  } catch (error) {
    // console.error('Failed to get user profile:', error);
    res.status(500).json({ error: '프로필 정보를 가져오는데 실패했습니다.' });
  }
});

// 사용자 통계 정보 가져오기
router.get('/stats', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    // 판매한 경매 수
    const salesCount = db.prepare(`
      SELECT COUNT(*) as count FROM auctions WHERE seller_id = ?
    `).get(userId) as any;

    // 입찰한 경매 수
    const bidsCount = db.prepare(`
      SELECT COUNT(DISTINCT auction_id) as count FROM bids WHERE bidder_id = ?
    `).get(userId) as any;

    // 낙찰한 경매 수
    const winsCount = db.prepare(`
      SELECT COUNT(*) as count FROM auctions 
      WHERE status = 'expired' 
      AND id IN (
        SELECT auction_id FROM bids 
        WHERE bidder_id = ? 
        AND amount = (
          SELECT MAX(amount) FROM bids WHERE auction_id = auctions.id
        )
      )
    `).get(userId) as any;

    res.json({
      sales: salesCount.count || 0,
      bids: bidsCount.count || 0,
      wins: winsCount.count || 0,
    });
  } catch (error) {
    // console.error('Failed to get user stats:', error);
    res.status(500).json({ error: '통계 정보를 가져오는데 실패했습니다.' });
  }
});

// 사용자 프로필 업데이트
router.put('/profile', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;
    const { email, currentPassword, newPassword, profileImage } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    // 현재 사용자 정보 가져오기
    const currentUser = db.prepare(`
      SELECT email, password FROM users WHERE id = ?
    `).get(userId) as any;

    if (!currentUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 비밀번호 변경이 요청된 경우 현재 비밀번호 확인
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: '현재 비밀번호를 입력해주세요.' });
      }

      const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
      if (!isValidPassword) {
        return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
      }
    }

    // 업데이트할 데이터 준비 (이름과 학번은 변경 불가)
    const updateData: any = {};
    if (email && email !== currentUser.email) updateData.email = email;

    // 비밀번호 변경
    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      updateData.password = hashedPassword;
    }

    // 프로필 이미지 업데이트
    if (profileImage) {
      updateData.profile_image = profileImage;
    }

    // 업데이트 실행
    if (Object.keys(updateData).length > 0) {
      const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
      const values = Object.values(updateData);
      values.push(userId);

      db.prepare(`
        UPDATE users SET ${setClause} WHERE id = ?
      `).run(...values);
    }

    res.json({ message: '프로필이 성공적으로 업데이트되었습니다.' });
  } catch (error) {
    // console.error('Failed to update user profile:', error);
    res.status(500).json({ error: '프로필 업데이트에 실패했습니다.' });
  }
});

// 학번 변경 요청
router.post('/request-student-id-change', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;
    const { newStudentId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    if (!newStudentId) {
      return res.status(400).json({ error: '새 학번을 입력해주세요.' });
    }

    // 현재 사용자 정보 가져오기
    const currentUser = db.prepare(`
      SELECT student_id FROM users WHERE id = ?
    `).get(userId) as any;

    if (!currentUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 새 학번이 현재 학번과 같은지 확인
    if (newStudentId === currentUser.student_id) {
      return res.status(400).json({ error: '현재 학번과 동일합니다.' });
    }

    // 새 학번이 이미 사용 중인지 확인
    const existingUser = db.prepare(`
      SELECT id FROM users WHERE student_id = ?
    `).get(newStudentId);

    if (existingUser) {
      return res.status(400).json({ error: '이미 사용 중인 학번입니다.' });
    }

    // 대기 중인 요청이 있는지 확인
    const pendingRequest = db.prepare(`
      SELECT id FROM student_id_change_requests 
      WHERE user_id = ? AND status = 'pending'
    `).get(userId);

    if (pendingRequest) {
      return res.status(400).json({ error: '이미 대기 중인 학번 변경 요청이 있습니다.' });
    }

    // 학번 변경 요청 생성
    const result = db.prepare(`
      INSERT INTO student_id_change_requests (user_id, current_student_id, new_student_id)
      VALUES (?, ?, ?)
    `).run(userId, currentUser.student_id, newStudentId);


    res.json({ 
      message: '학번 변경 요청이 제출되었습니다. 관리자 승인을 기다려주세요.',
      requestId: result.lastInsertRowid
    });
  } catch (error) {
    // console.error('Failed to create student ID change request:', error);
    res.status(500).json({ error: '학번 변경 요청에 실패했습니다.' });
  }
});

// 관리자용 학번 변경 요청 목록 조회
router.get('/student-id-change-requests', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    // 관리자 권한 확인
    const user = db.prepare(`
      SELECT user_type FROM users WHERE id = ?
    `).get(userId) as any;

    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    // 대기 중인 학번 변경 요청 목록 조회
    const requests = db.prepare(`
      SELECT 
        r.id,
        r.user_id,
        r.current_student_id,
        r.new_student_id,
        r.status,
        r.created_at,
        u.username,
        u.email
      FROM student_id_change_requests r
      JOIN users u ON r.user_id = u.id
      WHERE r.status = 'pending'
      ORDER BY r.created_at DESC
    `).all();

    res.json(requests);
  } catch (error) {
    // console.error('Failed to get student ID change requests:', error);
    res.status(500).json({ error: '학번 변경 요청 목록을 가져오는데 실패했습니다.' });
  }
});

// 관리자용 학번 변경 요청 승인/거부
router.post('/approve-student-id-change/:requestId', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const adminId = req.user?.userId;
    const { requestId } = req.params;
    const { action, comment } = req.body; // action: 'approve' or 'reject'

    if (!adminId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    // 관리자 권한 확인
    const admin = db.prepare(`
      SELECT user_type FROM users WHERE id = ?
    `).get(adminId) as any;

    if (!admin || admin.user_type !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: '올바른 액션을 선택해주세요. (approve 또는 reject)' });
    }

    // 요청 정보 가져오기
    const request = db.prepare(`
      SELECT * FROM student_id_change_requests WHERE id = ? AND status = 'pending'
    `).get(requestId) as any;

    if (!request) {
      return res.status(404).json({ error: '대기 중인 요청을 찾을 수 없습니다.' });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // 요청 상태 업데이트
    db.prepare(`
      UPDATE student_id_change_requests 
      SET status = ?, admin_id = ?, admin_comment = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newStatus, adminId, comment || null, requestId);

    if (action === 'approve') {
      // 학번 변경 승인 시 실제 사용자 학번 업데이트
      db.prepare(`
        UPDATE users 
        SET student_id = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(request.new_student_id, request.user_id);

    } else {
    }

    res.json({ 
      message: `학번 변경 요청이 ${action === 'approve' ? '승인' : '거부'}되었습니다.`,
      status: newStatus
    });
  } catch (error) {
    // console.error('Failed to process student ID change request:', error);
    res.status(500).json({ error: '학번 변경 요청 처리에 실패했습니다.' });
  }
});

// 비밀번호 변경
router.post('/change-password', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '현재 비밀번호와 새 비밀번호를 모두 입력해주세요.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '새 비밀번호는 최소 6자 이상이어야 합니다.' });
    }

    // 현재 사용자 정보 가져오기
    const currentUser = db.prepare(`
      SELECT password FROM users WHERE id = ?
    `).get(userId) as any;

    if (!currentUser) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 현재 비밀번호 확인
    const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
    if (!isValidPassword) {
      return res.status(400).json({ error: '현재 비밀번호가 올바르지 않습니다.' });
    }

    // 새 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 비밀번호 업데이트
    db.prepare(`
      UPDATE users SET password = ? WHERE id = ?
    `).run(hashedPassword, userId);

    res.json({ message: '비밀번호가 성공적으로 변경되었습니다.' });
  } catch (error) {
    // console.error('Failed to change password:', error);
    res.status(500).json({ error: '비밀번호 변경에 실패했습니다.' });
  }
});

// 사용자 경매 내역 가져오기
router.get('/auctions/:type', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;
    const { type } = req.params;

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    let auctions: any[] = [];

    if (type === 'selling') {
      // 판매중인 경매
      auctions = db.prepare(`
        SELECT 
          a.id,
          a.title,
          a.description,
          a.starting_price as startingPrice,
          a.current_price as currentPrice,
          a.end_time as endTime,
          a.status,
          a.created_at as createdAt,
          COUNT(b.id) as bidCount
        FROM auctions a
        LEFT JOIN bids b ON a.id = b.auction_id
        WHERE a.seller_id = ? AND a.status = 'active'
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `).all(userId);
    } else if (type === 'bidding') {
      // 입찰한 경매
      auctions = db.prepare(`
        SELECT DISTINCT
          a.id,
          a.title,
          a.description,
          a.starting_price as startingPrice,
          a.current_price as currentPrice,
          a.end_time as endTime,
          a.status,
          a.created_at as createdAt,
          COUNT(b2.id) as bidCount
        FROM auctions a
        JOIN bids b ON a.id = b.auction_id
        LEFT JOIN bids b2 ON a.id = b2.auction_id
        WHERE b.bidder_id = ? AND a.status = 'active'
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `).all(userId);
    } else if (type === 'won') {
      // 낙찰한 경매
      auctions = db.prepare(`
        SELECT 
          a.id,
          a.title,
          a.description,
          a.starting_price as startingPrice,
          a.current_price as currentPrice,
          a.end_time as endTime,
          a.status,
          a.created_at as createdAt,
          COUNT(b.id) as bidCount
        FROM auctions a
        LEFT JOIN bids b ON a.id = b.auction_id
        WHERE a.status = 'expired' 
        AND a.id IN (
          SELECT auction_id FROM bids 
          WHERE bidder_id = ? 
          AND amount = (
            SELECT MAX(amount) FROM bids WHERE auction_id = a.id
          )
        )
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `).all(userId);
    }

    // 응답 데이터 형식 맞추기 - 유틸리티 함수 사용
    const formattedAuctions = auctions.map((auction: any) => {
      // 실제 이미지 URL 가져오기
      const auctionWithImages = db.prepare(`
        SELECT images FROM auctions WHERE id = ?
      `).get(auction.id) as any;
      
      const formattedAuction = formatAuctionImages(auctionWithImages);
      
      return {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        startingPrice: auction.startingPrice,
        currentPrice: auction.currentPrice,
        endTime: auction.endTime,
        status: auction.status,
        createdAt: auction.createdAt,
        imageUrl: formattedAuction.imageUrl,
        sellerId: userId,
        sellerName: req.user?.username || '사용자',
        bids: [],
        participants: auction.bidCount || 0,
      };
    });

    res.json(formattedAuctions);
  } catch (error) {
    // console.error('Failed to get user auctions:', error);
    res.status(500).json({ error: '경매 내역을 가져오는데 실패했습니다.' });
  }
});

// 모든 사용자 목록 가져오기 (관리자용)
router.get('/', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as { user_type: string } | undefined;
    
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    const users = db.prepare(`
      SELECT 
        id, 
        username, 
        email, 
        username as name, 
        student_id, 
        user_type, 
        approval_status, 
        created_at,
        profile_image
      FROM users 
      ORDER BY created_at DESC
    `).all();
    
    res.json(users);
  } catch (error) {
    // console.error('Failed to get users:', error);
    res.status(500).json({ error: '사용자 목록을 가져오는데 실패했습니다.' });
  }
});

// 특정 사용자 상세 정보 가져오기 (관리자용)
router.get('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.params.id;
    
    // 관리자 권한 확인
    const adminUser = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as { user_type: string } | undefined;
    
    if (!adminUser || adminUser.user_type !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    const user = db.prepare(`
      SELECT 
        id, 
        username, 
        email, 
        username as name, 
        student_id, 
        user_type, 
        approval_status, 
        created_at,
        profile_image,
        id_card_image
      FROM users 
      WHERE id = ?
    `).get(userId);
    
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json(user);
  } catch (error) {
    // console.error('Failed to get user details:', error);
    res.status(500).json({ error: '사용자 상세 정보를 가져오는데 실패했습니다.' });
  }
});

// 사용자 승인 상태 변경 API
router.put('/:id/status', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.params.id;
    const { approval_status } = req.body;
    
    // 관리자 권한 확인
    const adminUser = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as { user_type: string } | undefined;
    
    if (!adminUser || adminUser.user_type !== 'admin') {
      return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    
    // 사용자 존재 확인
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }
    
    // 승인 상태 업데이트
    const stmt = db.prepare('UPDATE users SET approval_status = ? WHERE id = ?');
    stmt.run(approval_status, userId);
    
    res.json({ 
      message: '사용자 승인 상태가 변경되었습니다.',
      approval_status: approval_status
    });
  } catch (error) {
    // console.error('Failed to update user status:', error);
    res.status(500).json({ error: '사용자 상태 변경에 실패했습니다.' });
  }
});

export default router;
