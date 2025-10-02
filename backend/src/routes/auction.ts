import express, { Request } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getDatabase } from '../config/database';
import { auth, AuthRequest } from '../middleware/auth';
import { logAuctionActivity, getAuctionLogs } from '../utils/logger';
import { 
  sendWinNotificationEmail, 
  sendApprovalNotificationEmail, 
  sendHotAuctionNotificationEmail 
} from '../utils/emailService';
import { getImageUrl, processImageUrls, formatAuctionImages } from '../utils/imageUtils';

const router = express.Router();

// multer 설정 (이미지 업로드용)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 제한
    fieldSize: 50 * 1024 * 1024, // 50MB 필드 크기 제한
    fieldNameSize: 100, // 필드명 크기 제한
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
  }
});

// 자동 경매 종료 함수
const autoEndExpiredAuctions = async () => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();
    const expiredStmt = db.prepare(`
      SELECT a.*, u.email, u.username as seller_name
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      WHERE a.status = 'active' AND a.end_time <= ?
    `);
    const expiredAuctions = expiredStmt.all(now);
    for (const auction of expiredAuctions) {
      const auctionData = auction as any;
      const updateStmt = db.prepare('UPDATE auctions SET status = ? WHERE id = ?');
      updateStmt.run('ended', auctionData.id);
      if (auctionData.current_price > auctionData.starting_price) {
        try {
          const winnerStmt = db.prepare(`
            SELECT u.email, u.username 
            FROM users u 
            JOIN bids b ON u.id = b.bidder_id 
            WHERE b.auction_id = ? AND b.amount = ? 
            ORDER BY b.created_at DESC 
            LIMIT 1
          `);
          const winnerInfo = winnerStmt.get(auctionData.id, auctionData.current_price) as any;
          if (winnerInfo?.email) {
            await sendWinNotificationEmail(
              winnerInfo.email,
              winnerInfo.username,
              auctionData.title,
              auctionData.current_price,
              auctionData.id
            );
          }
          if (auctionData.email) {
            await sendApprovalNotificationEmail(
              auctionData.email,
              auctionData.seller_name,
              `${auctionData.title} 경매가 종료되었습니다. 낙찰가: ${auctionData.current_price.toLocaleString()}원`,
              auctionData.id
            );
          }
        } catch (error) {}
      } else {
        if (auctionData.email) {
          try {
            await sendApprovalNotificationEmail(
              auctionData.email,
              auctionData.seller_name,
              `${auctionData.title} 경매가 종료되었습니다. (입찰 없음)`,
              auctionData.id
            );
          } catch (error) {}
        }
      }
    }
  } catch (error) {}
};

// 1분마다 자동 종료 체크 (setInterval 중복 방지)
if (!(global as any).__auctionAutoEndInterval) {
  (global as any).__auctionAutoEndInterval = setInterval(autoEndExpiredAuctions, 60000); // 60초 = 1분
}

// 경매 이미지 업로드 API (파일 + DB 저장 방식)
router.post('/upload-image', auth, upload.single('auctionImage'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '이미지 파일이 필요합니다.' });
    }
    // 파일을 읽어서 DB에 저장
    const fileBuffer = fs.readFileSync(req.file.path);
    // 이미지 ID 생성
    const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // DB에 이미지 데이터 저장
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO images (id, data, mime_type, size, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    stmt.run(imageId, fileBuffer, req.file.mimetype, req.file.size, now);
    // 업로드 후 임시 파일 삭제
    fs.unlinkSync(req.file.path);
    const finalImageUrl = `/images/${imageId}`;
    res.json({ 
      message: '이미지 업로드 성공',
      imageId: imageId,
      imageUrl: finalImageUrl
    });
  } catch (error) {
    res.status(500).json({ message: '이미지 업로드에 실패했습니다.' });
  }
});

// OPTIONS 요청 처리 (CORS preflight)
router.options('/images/:imageId', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.status(200).end();
});

// 이미지 조회 API (DB에서 직접 조회)
router.get('/images/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    
    const db = getDatabase();
    const image = db.prepare(`
      SELECT data, mime_type FROM images WHERE id = ?
    `).get(imageId) as any;
    
    if (!image) {
      return res.status(404).json({ message: '이미지를 찾을 수 없습니다.' });
    }
    
    res.set({
      'Content-Type': image.mime_type,
      'Cache-Control': 'public, max-age=31536000', // 1년 캐시
      'Content-Length': image.data.length,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    res.send(image.data);
  } catch (error) {
    // console.error('이미지 조회 오류:', error);
    res.status(500).json({ message: '이미지 조회에 실패했습니다.' });
  }
});

// 모든 활성 경매 조회
router.get('/', async (req, res) => {
  try {
    const db = getDatabase();
    const { type, userId } = req.query; // type: 'selling', 'bidding', 'all'
    
    let whereClause = "WHERE a.status = 'active'";
    let joinClause = "LEFT JOIN users u ON a.seller_id = u.id LEFT JOIN bids b ON a.id = b.auction_id";
    
    if (type === 'selling' && userId) {
      whereClause += ` AND a.seller_id = ${userId}`;
    } else if (type === 'bidding' && userId) {
      whereClause += ` AND a.id IN (SELECT DISTINCT auction_id FROM bids WHERE bidder_id = ${userId})`;
      joinClause = "LEFT JOIN users u ON a.seller_id = u.id INNER JOIN bids b ON a.id = b.auction_id";
    } else if (type === 'won' && userId) {
      whereClause = "WHERE a.status = 'ended' AND a.winner_id = " + userId;
    }
    
    let auctions;
    
    if (type === 'bidding' && userId) {
      // 입찰한 경매는 서브쿼리로 처리
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
          a.images,
          u.username as sellerName,
          (SELECT COUNT(*) FROM bids WHERE auction_id = a.id) as bidCount,
          (SELECT COUNT(DISTINCT bidder_id) FROM bids WHERE auction_id = a.id) as participantCount
        FROM auctions a
        LEFT JOIN users u ON a.seller_id = u.id
        WHERE a.status = 'active' AND a.id IN (SELECT DISTINCT auction_id FROM bids WHERE bidder_id = ?)
        ORDER BY a.created_at DESC
      `).all(userId);
    } else {
      // 일반 쿼리
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
          a.images,
          u.username as sellerName,
          COUNT(b.id) as bidCount,
          COUNT(DISTINCT b.bidder_id) as participantCount
        FROM auctions a
        ${joinClause}
        ${whereClause}
        GROUP BY a.id
        ORDER BY a.created_at DESC
      `).all();
    }
    
    // 응답 데이터 형식 맞추기 (이미지 URL은 그대로 사용)
    const formattedAuctions = auctions.map((auction: any) => {
      
      return {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        startingPrice: auction.startingPrice,
        currentPrice: auction.currentPrice,
        endTime: auction.endTime,
        status: auction.status,
        createdAt: auction.createdAt,
        images: auction.images ? JSON.parse(auction.images) : [],
        imageUrl: auction.images ? JSON.parse(auction.images)[0] : null,
        seller: {
          username: auction.sellerName
        },
        bidCount: auction.bidCount || 0,
        participantCount: auction.participantCount || 0
      };
    });
    
    res.json(formattedAuctions);
  } catch (error) {
    // console.error('Get auctions error:', error);
    res.status(500).json({ message: '경매 목록을 불러올 수 없습니다.' });
  }
});

// 종료된 경매 조회
router.get('/ended', async (req, res) => {
  try {
    const db = getDatabase();
    
    const auctions = db.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.starting_price as startingPrice,
        a.current_price as currentPrice,
        a.end_time as endTime,
        a.status,
        a.created_at as createdAt,
        a.images,
        u.username as sellerName,
        COUNT(b.id) as bidCount,
        COUNT(DISTINCT b.bidder_id) as participantCount
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE a.status = 'ended'
      GROUP BY a.id
      ORDER BY a.end_time DESC
      LIMIT 20
    `).all();
    
    // 응답 데이터 형식 맞추기 및 이미지 URL 변환
    const formattedAuctions = auctions.map((auction: any) => {
      let images = [];
      let imageUrl = null;
      
      if (auction.images) {
        try {
          images = JSON.parse(auction.images);

          imageUrl = images[0] || null;
        } catch (error) {
          // console.error('이미지 파싱 오류:', error);
          images = [];
        }
      }
      
      return {
        id: auction.id,
        title: auction.title,
        description: auction.description,
        startingPrice: auction.startingPrice,
        currentPrice: auction.currentPrice,
        endTime: auction.endTime,
        status: auction.status,
        createdAt: auction.createdAt,
        images: images,
        imageUrl: imageUrl,
        seller: {
          username: auction.sellerName
        },
        bidCount: auction.bidCount || 0,
        participantCount: auction.participantCount || 0
      };
    });
    
    res.json(formattedAuctions);
  } catch (error) {
    // console.error('Get ended auctions error:', error);
    res.status(500).json({ message: '종료된 경매 목록을 불러올 수 없습니다.' });
  }
});

// 핫한 경매 조회
router.get('/hot', async (req, res) => {
  try {
    const db = getDatabase();
    
    const hotAuction = db.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.starting_price as startingPrice,
        a.current_price as currentPrice,
        a.end_time as endTime,
        a.status,
        a.created_at as createdAt,
        a.images,
        u.username as sellerName,
        COUNT(b.id) as bidCount,
        COUNT(DISTINCT b.bidder_id) as participantCount
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE a.is_hot = 1 AND a.status = 'active'
      GROUP BY a.id
      LIMIT 1
    `).get() as any;
    
    if (!hotAuction) {
      return res.json(null);
    }
    
    // 이미지 URL은 그대로 사용 (DB에서 조회한 URL 사용)
    
    const result = {
      id: hotAuction.id,
      title: hotAuction.title,
      description: hotAuction.description,
      startingPrice: hotAuction.startingPrice,
      currentPrice: hotAuction.currentPrice,
      endTime: hotAuction.endTime,
      status: hotAuction.status,
      createdAt: hotAuction.createdAt,
      images: hotAuction.images ? JSON.parse(hotAuction.images) : [],
      imageUrl: hotAuction.images ? JSON.parse(hotAuction.images)[0] : null,
      seller: {
        username: hotAuction.sellerName
      },
      bidCount: hotAuction.bidCount || 0,
      participantCount: hotAuction.participantCount || 0
    };
    
    res.json(result);
  } catch (error) {
    // console.error('Get hot auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 특정 경매 조회
router.get('/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const auction = db.prepare(`
      SELECT a.*, u.username as seller_name 
      FROM auctions a 
      LEFT JOIN users u ON a.seller_id = u.id 
      WHERE a.id = ?
    `).get(req.params.id) as any;
    
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    // 입찰 내역 조회
    const bids = db.prepare(`
      SELECT b.*, u.username as bidder_name 
      FROM bids b 
      JOIN users u ON b.bidder_id = u.id 
      WHERE b.auction_id = ? 
      ORDER BY b.amount DESC
    `).all(req.params.id);
    
    // 참여자 수 계산 (고유 bidder_id 개수)
    const participantCount = db.prepare(`
      SELECT COUNT(DISTINCT bidder_id) as count 
      FROM bids 
      WHERE auction_id = ?
    `).get(req.params.id) as any;
    
    auction.bids = bids;
    auction.participantCount = participantCount.count || 0;
    
    // 이미지 데이터 파싱 (이미 웹 URL이므로 변환 불필요)
    if (auction.images) {
      try {
        const images = JSON.parse(auction.images);
        auction.images = images;
        auction.imageUrl = images[0] || null;
      } catch (error) {
        // console.error('이미지 파싱 오류:', error);
        auction.images = [];
        auction.imageUrl = null;
      }
    }
    
    res.json(auction);
  } catch (error) {
    // console.error('Get auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 새 경매 생성 (인증 필요) - 승인 대기 상태로 생성
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const { title, description, startingPrice, duration, category, imageUris } = req.body;
    const db = getDatabase();
    
    // 경매 기간을 분 단위로 변환
    let durationMinutes = 1440; // 기본값: 24시간
    switch (duration) {
      case '1h': durationMinutes = 60; break;
      case '6h': durationMinutes = 360; break;
      case '1d': durationMinutes = 1440; break;
      case '3d': durationMinutes = 4320; break;
    }
    
    const now = new Date();
    const startTime = now.toISOString();
    const endTime = new Date(now.getTime() + durationMinutes * 60 * 1000).toISOString();
    
    // 이미지 URL을 그대로 저장 (이미 완전한 URL 형태)
    const processedImages = imageUris;
    
    const stmt = db.prepare(`
      INSERT INTO auctions (
        title, 
        description, 
        starting_price, 
        current_price, 
        seller_id, 
        category, 
        images, 
        status,
        start_time,
        end_time,
        duration_minutes,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      title, 
      description, 
      startingPrice, 
      startingPrice, 
      req.user?.userId, 
      category, 
      JSON.stringify(processedImages), // 변환된 이미지 URL 저장
      'pending', // 승인 대기 상태
      startTime,
      endTime,
      durationMinutes,
      new Date().toISOString(),
      new Date().toISOString()
    );
    
    const auctionId = result.lastInsertRowid;
    
    // 로그 기록
    logAuctionActivity({
      auctionId: Number(auctionId),
      userId: req.user?.userId,
      action: 'created',
      details: {
        title,
        category,
        startingPrice,
        duration,
        status: 'pending'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(201).json({
      message: '경매가 등록되었습니다. 관리자 승인 후 게시됩니다.',
      auctionId: auctionId
    });
  } catch (error) {
    // console.error('Create auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 입찰 (인증 필요)
router.post('/:id/bid', auth, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body;
    const auctionId = req.params.id;
    const db = getDatabase();
    
    // 경매 조회
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId) as any;
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    if (auction.status !== 'active') {
      return res.status(400).json({ message: '종료된 경매입니다.' });
    }
    
    // 자신이 등록한 경매에는 입찰할 수 없음
    if (auction.seller_id === req.user?.userId) {
      return res.status(400).json({ message: '자신이 등록한 경매에는 입찰할 수 없습니다.' });
    }
    
    // 경매 종료 시간 확인 (1분 미만 남았으면 입찰 불가)
    if (auction.end_time) {
      const now = new Date();
      const endTime = new Date(auction.end_time);
      const timeLeft = endTime.getTime() - now.getTime();
      const minutesLeft = timeLeft / (1000 * 60);
      
      if (minutesLeft < 1) {
        return res.status(400).json({ message: '경매 종료 1분 전부터는 입찰할 수 없습니다.' });
      }
    }
    
    if (amount <= auction.current_price) {
      return res.status(400).json({ message: '현재 가격보다 높은 금액을 입력해주세요.' });
    }
    
    // 트랜잭션 시작
    const transaction = db.transaction(() => {
      const now = new Date().toISOString();
      
      // 입찰 생성 (created_at 시간 포함)
      const bidStmt = db.prepare('INSERT INTO bids (auction_id, bidder_id, amount, created_at) VALUES (?, ?, ?, ?)');
      const bidResult = bidStmt.run(auctionId, req.user?.userId, amount, now);
      
      // 경매 현재 가격 업데이트
      const updateStmt = db.prepare('UPDATE auctions SET current_price = ? WHERE id = ?');
      updateStmt.run(amount, auctionId);
      
      return { ...bidResult, created_at: now };
    });
    
    const result = transaction();
    
    // 로그 기록
    logAuctionActivity({
      auctionId: parseInt(auctionId),
      userId: req.user?.userId,
      action: 'bid_placed',
      details: {
        amount,
        previousPrice: auction.current_price,
        newPrice: amount
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // 입찰 성공 로그 추가
    
    // 입찰자에게 개인화된 알림 전송 (자신이 입찰한 것만)
    const bidderInfo = db.prepare('SELECT username FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (bidderInfo) {
    }
    
    // 입찰 수 및 참여자 수 조회
    const bidCountResult = db.prepare('SELECT COUNT(*) as count FROM bids WHERE auction_id = ?').get(auctionId) as any;
    const participantCountResult = db.prepare('SELECT COUNT(DISTINCT bidder_id) as count FROM bids WHERE auction_id = ?').get(auctionId) as any;
    
    res.json({
      message: '입찰이 완료되었습니다.',
      bidId: result.lastInsertRowid,
      newCurrentPrice: amount,
      bidCount: bidCountResult.count,
      participantCount: participantCountResult.count,
      lastBidTime: result.created_at
    });
  } catch (error) {
    // console.error('Create bid error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 경매 종료 (판매자만)
router.patch('/:id/end', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id) as any;
    
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    if (auction.seller_id !== req.user?.userId) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }
    
    const stmt = db.prepare('UPDATE auctions SET status = ? WHERE id = ?');
    stmt.run('ended', req.params.id);
    
    res.json({
      message: '경매가 종료되었습니다.'
    });
  } catch (error) {
    // console.error('End auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 경매 승인/거부 API
router.patch('/:id/approve', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    // 경매 정보 조회 (이메일 발송용)
    const auctionInfo = db.prepare(`
      SELECT a.title, u.email, u.username, a.seller_id
      FROM auctions a 
      JOIN users u ON a.seller_id = u.id 
      WHERE a.id = ?
    `).get(req.params.id) as any;
    
    const stmt = db.prepare('UPDATE auctions SET status = ? WHERE id = ?');
    stmt.run('active', req.params.id);
    
    // 승인 알림 이메일 발송 (판매자에게만)
    if (auctionInfo?.email) {
      try {
        await sendApprovalNotificationEmail(
          auctionInfo.email,
          auctionInfo.username,
          auctionInfo.title,
          Number(req.params.id)
        );
      } catch (error) {
      }
    }
    
    res.json({
      message: '경매가 승인되었습니다.'
    });
  } catch (error) {
    // console.error('Approve auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.patch('/:id/reject', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const stmt = db.prepare('UPDATE auctions SET status = ? WHERE id = ?');
    stmt.run('rejected', req.params.id);
    
    res.json({
      message: '경매가 거부되었습니다.'
    });
  } catch (error) {
    // console.error('Reject auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 경매 거부 API (POST 메서드 호환)
router.post('/:id/reject', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const stmt = db.prepare('UPDATE auctions SET status = ? WHERE id = ?');
    stmt.run('rejected', req.params.id);
    
    res.json({
      message: '경매가 거부되었습니다.'
    });
  } catch (error) {
    // console.error('Reject auction (POST) error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 경매 종료 API
router.post('/:id/end', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id) as any;
    
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    const stmt = db.prepare('UPDATE auctions SET status = ? WHERE id = ?');
    stmt.run('ended', req.params.id);
    
    // 낙찰자와 판매자 정보 조회
    const sellerInfo = db.prepare(`
      SELECT u.email, u.username 
      FROM users u 
      WHERE u.id = ?
    `).get(auction.seller_id) as any;
    
    // 낙찰자 정보 조회 및 이메일 발송 (입찰이 있었을 때만)
    if (auction.current_price > auction.starting_price) {
      try {
        const winnerInfo = db.prepare(`
          SELECT u.email, u.username 
          FROM users u 
          JOIN bids b ON u.id = b.bidder_id 
          WHERE b.auction_id = ? AND b.amount = ? 
          ORDER BY b.created_at DESC 
          LIMIT 1
        `).get(req.params.id, auction.current_price) as any;
        
        // 낙찰자에게 낙찰 알림
        if (winnerInfo?.email) {
          await sendWinNotificationEmail(
            winnerInfo.email,
            winnerInfo.username,
            auction.title,
            auction.current_price,
            parseInt(req.params.id)
          );
        }
        
        // 판매자에게 경매 종료 알림
        if (sellerInfo?.email) {
          await sendApprovalNotificationEmail(
            sellerInfo.email,
            sellerInfo.username,
            `${auction.title} 경매가 종료되었습니다. 낙찰가: ${auction.current_price.toLocaleString()}원`,
            parseInt(req.params.id)
          );
        }
      } catch (error) {
        // console.error('경매 종료 알림 이메일 발송 실패:', error);
      }
    } else {
      // 입찰이 없었을 때는 판매자에게만 알림
      if (sellerInfo?.email) {
        try {
          await sendApprovalNotificationEmail(
            sellerInfo.email,
            sellerInfo.username,
            `${auction.title} 경매가 종료되었습니다. (입찰 없음)`,
            parseInt(req.params.id)
          );
        } catch (error) {
          // console.error('경매 종료 알림 이메일 발송 실패:', error);
        }
      }
    }
    
    // 로그 기록
    logAuctionActivity({
      auctionId: parseInt(req.params.id),
      userId: req.user?.userId,
      action: 'ended',
      details: {
        finalPrice: auction.current_price,
        reason: 'admin_manual_end'
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      message: '경매가 종료되었습니다.'
    });
  } catch (error) {
    // console.error('Admin end auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 경매 정보 수정 API
router.put('/:id', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const { title, description, startingPrice, currentPrice, category, status, autoEndEnabled, autoEndMinutes } = req.body;
    
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id) as any;
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    // 업데이트할 필드들
    const updateFields = [];
    const updateValues = [];
    
    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }
    if (startingPrice !== undefined) {
      updateFields.push('starting_price = ?');
      updateValues.push(startingPrice);
    }
    if (currentPrice !== undefined) {
      updateFields.push('current_price = ?');
      updateValues.push(currentPrice);
    }
    if (category !== undefined) {
      updateFields.push('category = ?');
      updateValues.push(category);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (autoEndEnabled !== undefined) {
      updateFields.push('auto_end_enabled = ?');
      updateValues.push(autoEndEnabled);
    }
    if (autoEndMinutes !== undefined) {
      updateFields.push('auto_end_minutes = ?');
      updateValues.push(autoEndMinutes);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: '수정할 필드를 지정해주세요.' });
    }
    
    updateFields.push('updated_at = ?');
    updateValues.push(new Date().toISOString());
    updateValues.push(req.params.id);
    
    const stmt = db.prepare(`UPDATE auctions SET ${updateFields.join(', ')} WHERE id = ?`);
    stmt.run(...updateValues);
    
    res.json({
      message: '경매 정보가 수정되었습니다.'
    });
  } catch (error) {
    // console.error('Update auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 경매 지연 종료 API
router.post('/:id/delay-end', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const { minutes } = req.body;
    if (!minutes || minutes < 1) {
      return res.status(400).json({ message: '유효한 시간을 입력해주세요.' });
    }
    
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id) as any;
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    if (auction.status !== 'active') {
      return res.status(400).json({ message: '활성 상태의 경매만 지연 종료할 수 있습니다.' });
    }
    
    // 현재 시간에서 지정된 분만큼 추가
    const newEndTime = new Date(Date.now() + minutes * 60 * 1000);
    
    const stmt = db.prepare('UPDATE auctions SET end_time = ?, auto_end_enabled = 1, auto_end_minutes = ? WHERE id = ?');
    stmt.run(newEndTime.toISOString(), minutes, req.params.id);
    
    // 로그 기록
    logAuctionActivity({
      auctionId: parseInt(req.params.id),
      userId: req.user?.userId,
      action: 'delayed_end',
      details: {
        delayMinutes: minutes,
        originalEndTime: auction.end_time,
        newEndTime: newEndTime.toISOString()
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      message: `${minutes}분 후에 경매가 종료됩니다.`,
      newEndTime: newEndTime.toISOString()
    });
  } catch (error) {
    // console.error('Delay end auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 경매 승인 시 종료 시간 설정 API
router.post('/:id/approve', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(req.params.id) as any;
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    if (auction.status !== 'pending') {
      return res.status(400).json({ message: '승인 대기 상태의 경매만 승인할 수 있습니다.' });
    }
    
    // 현재 시간에서 duration_minutes만큼 추가하여 종료 시간 계산
    const now = new Date();
    const endTime = new Date(now.getTime() + auction.duration_minutes * 60 * 1000);
    
    const stmt = db.prepare(`
      UPDATE auctions 
      SET status = 'active', 
          start_time = ?, 
          end_time = ?, 
          updated_at = ? 
      WHERE id = ?
    `);
    stmt.run(now.toISOString(), endTime.toISOString(), now.toISOString(), req.params.id);
    
    // 로그 기록
    logAuctionActivity({
      auctionId: parseInt(req.params.id),
      userId: req.user?.userId,
      action: 'approved',
      details: {
        startTime: now.toISOString(),
        endTime: endTime.toISOString(),
        duration: auction.duration_minutes
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      message: '경매가 승인되었습니다.',
      startTime: now.toISOString(),
      endTime: endTime.toISOString()
    });
  } catch (error) {
    // console.error('Approve auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 승인 대기 경매 목록 조회
router.get('/admin/pending', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const auctions = db.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.starting_price as startingPrice,
        a.category,
        a.images as imageUris,
        a.created_at as createdAt,
        u.username as sellerName,
        u.email as sellerEmail
      FROM auctions a
        JOIN users u ON a.seller_id = u.id
      WHERE a.status = 'pending'
      ORDER BY a.created_at DESC
    `).all();
    
    res.json(auctions);
  } catch (error) {
    // console.error('Get pending auctions error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 관리자용 경매 목록 조회 API (모든 상태의 경매)
router.get('/admin/all', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const auctions = db.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.starting_price as startingPrice,
        a.current_price as currentPrice,
        a.end_time as endTime,
        a.status,
        a.created_at as createdAt,
        a.category,
        a.images,
        u.username as sellerName
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      ORDER BY a.created_at DESC
    `).all();
    
    // 응답 데이터 형식 맞추기
    const formattedAuctions = auctions.map((auction: any) => ({
      id: auction.id,
      title: auction.title,
      description: auction.description,
      startingPrice: auction.startingPrice,
      currentPrice: auction.currentPrice,
      endTime: auction.endTime,
      status: auction.status,
      createdAt: auction.createdAt,
      category: auction.category,
      images: auction.images ? JSON.parse(auction.images) : [],
      imageUrl: auction.images ? JSON.parse(auction.images)[0] : null,
      seller: {
        username: auction.sellerName
      }
    }));
    
    res.json(formattedAuctions);
  } catch (error) {
    // console.error('Get all auctions error:', error);
    res.status(500).json({ message: '경매 목록을 불러올 수 없습니다.' });
  }
});

// 경매 로그 조회 API (관리자 전용) - 특정 경매 ID 조회보다 먼저 정의
router.get('/admin/logs', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const { auctionId, limit = 100 } = req.query;
    
    // 로그 조회 쿼리 수정
    let query = `
      SELECT al.*, u.username, a.title as auction_title
      FROM auction_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN auctions a ON al.auction_id = a.id
    `;
    
    const params: any[] = [];
    if (auctionId) {
      query += ' WHERE al.auction_id = ?';
      params.push(parseInt(auctionId as string));
    }
    
    query += ' ORDER BY al.timestamp DESC LIMIT ?';
    params.push(parseInt(limit as string));
    
    const logs = db.prepare(query).all(...params);
    
    res.json({
      logs,
      total: logs.length
    });
  } catch (error) {
    // console.error('Get logs error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 핫한 경매 설정/해제
router.post('/:id/set-hot', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const auctionId = req.params.id;
    const { isHot } = req.body;
    
    // 경매 존재 확인
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(auctionId) as any;
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    // 핫한 경매는 최대 1개만 허용
    if (isHot) {
      // 기존 핫한 경매 해제
      db.prepare('UPDATE auctions SET is_hot = 0 WHERE is_hot = 1').run();
    }
    
    // 핫한 경매 설정/해제
    db.prepare('UPDATE auctions SET is_hot = ? WHERE id = ?').run(isHot ? 1 : 0, auctionId);
    
    // 핫한 경매로 설정된 경우 판매자에게 이메일 발송
    if (isHot) {
      try {
        const sellerInfo = db.prepare(`
          SELECT u.email, u.username 
          FROM users u 
          WHERE u.id = ?
        `).get(auction.seller_id) as any;
        
        if (sellerInfo?.email) {
          await sendHotAuctionNotificationEmail(
            sellerInfo.email,
            sellerInfo.username,
            auction.title,
            parseInt(auctionId)
          );
        }
      } catch (error) {
        // console.error('핫한 경매 알림 이메일 발송 실패:', error);
      }
    }
    
    // 로그 기록
    logAuctionActivity({
      auctionId: parseInt(auctionId),
      userId: req.user?.userId,
      action: isHot ? 'set_hot' : 'unset_hot',
      details: {
        auctionTitle: auction.title,
        isHot: isHot
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      message: isHot ? '핫한 경매로 설정되었습니다.' : '핫한 경매 설정이 해제되었습니다.'
    });
  } catch (error) {
    // console.error('Set hot auction error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 이메일 테스트 엔드포인트 (개발용)
router.post('/test-email', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    
    // 관리자 권한 확인
    const user = db.prepare('SELECT user_type FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user || user.user_type !== 'admin') {
      return res.status(403).json({ message: '관리자 권한이 필요합니다.' });
    }
    
    const { email, type } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: '이메일 주소가 필요합니다.' });
    }
    
    let result = false;
    
    switch (type) {
      case 'win':
        result = await sendWinNotificationEmail(
          email,
          '테스트 사용자',
          '테스트 경매 상품',
          1000000,
          1
        );
        break;
      case 'approval':
        result = await sendApprovalNotificationEmail(
          email,
          '테스트 사용자',
          '테스트 경매 상품',
          1
        );
        break;
      case 'hot':
        result = await sendHotAuctionNotificationEmail(
          email,
          '테스트 사용자',
          '테스트 경매 상품',
          1
        );
        break;
      default:
        return res.status(400).json({ message: '유효한 이메일 타입이 아닙니다. (win, approval, hot)' });
    }
    
    if (result) {
      res.json({ message: '테스트 이메일이 성공적으로 발송되었습니다.' });
    } else {
      res.status(500).json({ message: '이메일 발송에 실패했습니다.' });
    }
  } catch (error) {
    // console.error('Test email error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자별 판매 중인 경매 조회
router.get('/selling', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    const auctions = db.prepare(`
      SELECT a.*, u.username as seller_name,
             COUNT(b.id) as bid_count,
             COUNT(DISTINCT b.bidder_id) as participant_count
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE a.seller_id = ? AND a.status = 'active'
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `).all(userId) as any[];

    // 이미지 URL 처리
    const processedAuctions = auctions.map(auction => ({
      ...auction,
      images: auction.images ? JSON.parse(auction.images) : [],
      imageUrl: auction.images ? JSON.parse(auction.images)[0] : null,
      seller: {
        username: auction.seller_name
      },
      bidCount: auction.bid_count || 0,
      participantCount: auction.participant_count || 0
    }));

    res.json(processedAuctions);
  } catch (error) {
    // console.error('Failed to get selling auctions:', error);
    res.status(500).json({ error: '판매 중인 경매를 가져오는데 실패했습니다.' });
  }
});

// 사용자별 입찰한 경매 조회
router.get('/bidding', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: '인증되지 않은 사용자입니다.' });
    }

    const auctions = db.prepare(`
      SELECT DISTINCT a.*, u.username as seller_name,
             COUNT(b.id) as bid_count,
             COUNT(DISTINCT b.bidder_id) as participant_count
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE b.bidder_id = ? AND a.status = 'active'
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `).all(userId) as any[];

    // 이미지 URL 처리
    const processedAuctions = auctions.map(auction => ({
      ...auction,
      images: auction.images ? JSON.parse(auction.images) : [],
      imageUrl: auction.images ? JSON.parse(auction.images)[0] : null,
      seller: {
        username: auction.seller_name
      },
      bidCount: auction.bid_count || 0,
      participantCount: auction.participant_count || 0
    }));

    res.json(processedAuctions);
  } catch (error) {
    // console.error('Failed to get bidding auctions:', error);
    res.status(500).json({ error: '입찰한 경매를 가져오는데 실패했습니다.' });
  }
});

export default router;
