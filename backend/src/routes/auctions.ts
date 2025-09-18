import express from 'express';
import { getDatabase } from '../config/database';
import { auth, AuthRequest } from '../middleware/auth';
import {
  AuctionQueryResult,
  AuctionRecord,
  CreateAuctionRequest,
  CreateBidRequest,
  FormattedAuction
} from '../types/auction';

const router = express.Router();

// 모든 활성 경매 조회
router.get('/', async (req, res) => {
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
        u.username as sellerName,
        COUNT(b.id) as bidCount
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE a.status = 'active'
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `).all() as AuctionQueryResult[];
    
    // 응답 데이터 형식 맞추기
    const formattedAuctions: FormattedAuction[] = auctions.map((auction) => ({
      ...auction,
      seller: {
        username: auction.sellerName
      },
      bidCount: auction.bidCount || 0
    }));
    
    res.json(formattedAuctions);
  } catch (error) {
    console.error('Get auctions error:', error);
    res.status(500).json({ message: '경매 목록을 불러올 수 없습니다.' });
  }
});

// 특정 경매 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    
    const auction = db.prepare(`
      SELECT 
        a.id,
        a.title,
        a.description,
        a.starting_price as startingPrice,
        a.current_price as currentPrice,
        a.end_time as endTime,
        a.status,
        a.created_at as createdAt,
        u.username as sellerName,
        COUNT(b.id) as bidCount
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE a.id = ?
      GROUP BY a.id
    `).get(id) as AuctionQueryResult | undefined;
    
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    const formattedAuction: FormattedAuction = {
      ...auction,
      seller: {
        username: auction.sellerName
      },
      bidCount: auction.bidCount || 0
    };
    
    res.json(formattedAuction);
  } catch (error) {
    console.error('Get auction error:', error);
    res.status(500).json({ message: '경매 정보를 불러올 수 없습니다.' });
  }
});

// 새 경매 생성
router.post('/', auth, async (req: AuthRequest, res) => {
  try {
    const { title, description, startingPrice, endTime }: CreateAuctionRequest = req.body;
    const sellerId = req.user?.userId;
    
    if (!sellerId) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    if (!title || !description || !startingPrice) {
      return res.status(400).json({ message: '필수 필드가 누락되었습니다.' });
    }
    
    const db = getDatabase();
    
    const stmt = db.prepare(`
      INSERT INTO auctions (title, description, starting_price, current_price, seller_id, end_time, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      title,
      description,
      startingPrice,
      startingPrice, // 시작 가격을 현재 가격으로 설정
      sellerId,
      endTime || null,
      'active'
    );
    
    res.status(201).json({
      message: '경매가 생성되었습니다.',
      auctionId: result.lastInsertRowid
    });
  } catch (error) {
    console.error('Create auction error:', error);
    res.status(500).json({ message: '경매 생성에 실패했습니다.' });
  }
});

// 입찰
router.post('/:id/bid', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { amount }: CreateBidRequest = req.body;
    const bidderId = req.user?.userId;
    
    if (!bidderId) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: '올바른 입찰 금액을 입력해주세요.' });
    }
    
    const db = getDatabase();
    
    // 경매 정보 확인
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ?').get(id) as AuctionRecord | undefined;
    if (!auction) {
      return res.status(404).json({ message: '경매를 찾을 수 없습니다.' });
    }
    
    if (auction.status !== 'active') {
      return res.status(400).json({ message: '진행중인 경매가 아닙니다.' });
    }
    
    if (amount <= auction.current_price) {
      return res.status(400).json({ message: '현재 가격보다 높은 금액을 입력해주세요.' });
    }
    
    // 입찰 생성
    const bidStmt = db.prepare(`
      INSERT INTO bids (auction_id, bidder_id, amount) 
      VALUES (?, ?, ?)
    `);
    
    bidStmt.run(id, bidderId, amount);
    
    // 경매 현재 가격 업데이트
    const updateStmt = db.prepare(`
      UPDATE auctions SET current_price = ? WHERE id = ?
    `);
    
    updateStmt.run(amount, id);
    
    res.json({
      message: '입찰이 완료되었습니다.',
      bidAmount: amount
    });
  } catch (error) {
    console.error('Create bid error:', error);
    res.status(500).json({ message: '입찰에 실패했습니다.' });
  }
});

// 경매 종료
router.patch('/:id/end', auth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: '인증이 필요합니다.' });
    }
    
    const db = getDatabase();
    
    // 경매 소유자 확인
    const auction = db.prepare('SELECT * FROM auctions WHERE id = ? AND seller_id = ?').get(id, userId) as AuctionRecord | undefined;
    if (!auction) {
      return res.status(403).json({ message: '경매를 종료할 권한이 없습니다.' });
    }
    
    // 경매 상태 업데이트
    const stmt = db.prepare('UPDATE auctions SET status = ? WHERE id = ?');
    stmt.run('ended', id);
    
    res.json({ message: '경매가 종료되었습니다.' });
  } catch (error) {
    console.error('End auction error:', error);
    res.status(500).json({ message: '경매 종료에 실패했습니다.' });
  }
});

export default router;
