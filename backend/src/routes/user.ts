import express from 'express';
import { getDatabase } from '../config/database';
import { auth, AuthRequest } from '../middleware/auth';

const router = express.Router();

// 사용자 프로필 조회 (인증 필요)
router.get('/profile', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const user = db.prepare(
      'SELECT id, username, email, created_at FROM users WHERE id = ?'
    ).get(req.user?.userId) as any;
    
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자 프로필 업데이트 (인증 필요)
router.put('/profile', auth, async (req: AuthRequest, res) => {
  try {
    const { username, email } = req.body;
    const db = getDatabase();
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user?.userId) as any;
    if (!user) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    
    // 중복 확인
    if (username && username !== user.username) {
      const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
      if (existingUser) {
        return res.status(400).json({ message: '이미 사용 중인 사용자명입니다.' });
      }
    }
    
    if (email && email !== user.email) {
      const existingUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      if (existingUser) {
        return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
      }
    }
    
    // 업데이트
    if (username || email) {
      const updateFields = [];
      const updateValues = [];
      
      if (username) {
        updateFields.push('username = ?');
        updateValues.push(username);
      }
      if (email) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }
      
      const stmt = db.prepare(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`);
      updateValues.push(req.user?.userId);
      stmt.run(...updateValues);
    }
    
    res.json({
      message: '프로필이 업데이트되었습니다.'
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자가 생성한 경매 조회 (인증 필요)
router.get('/auctions', auth, async (req: AuthRequest, res) => {
  try {
    console.log('🔍 사용자 ID:', req.user?.userId, typeof req.user?.userId);
    const db = getDatabase();
    const auctions = db.prepare(`
      SELECT 
        a.*,
        u.username as seller_name,
        COUNT(DISTINCT b.bidder_id) as participants
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE a.seller_id = ? 
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `).all(parseInt(req.user?.userId || '0'));
    
    console.log('📊 조회된 경매 수:', auctions.length);
    
    // 이미지 데이터 파싱 및 URL 변환
    const auctionsWithImages = auctions.map((auction: any) => {
      let images = [];
      let imageUrl = null;
      
      if (auction.images) {
        try {
          images = JSON.parse(auction.images);
          console.log('📸 파싱된 이미지 배열:', images);
          
          // 로컬 파일 경로를 웹 URL로 변환
          images = images.map((img: string) => {
            if (img.startsWith('file://')) {
              // 로컬 파일 경로를 웹 접근 가능한 URL로 변환
              const filename = img.split('/').pop();
              return `http://11.182.185.87:3000/uploads/${filename}`;
            } else if (img.includes('.jpg') || img.includes('.png') || img.includes('.jpeg')) {
              // 파일명만 있는 경우
              return `http://11.182.185.87:3000/uploads/${img}`;
            }
            return img;
          });
          
          imageUrl = images[0] || null;
          console.log('🌐 최종 이미지 URL:', imageUrl);
        } catch (error) {
          console.error('이미지 파싱 오류:', error);
          images = [];
        }
      }
      
      return {
        ...auction,
        images,
        imageUrl
      };
    });
    
    res.json(auctionsWithImages);
  } catch (error) {
    console.error('Get user auctions error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 사용자가 입찰한 경매 조회 (인증 필요)
router.get('/bids', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const bids = db.prepare(`
      SELECT 
        b.*, 
        a.title as auction_title,
        a.description,
        a.starting_price,
        a.current_price,
        a.status,
        a.end_time,
        a.images,
        u.username as seller_name,
        COUNT(DISTINCT b2.bidder_id) as participants
      FROM bids b 
      JOIN auctions a ON b.auction_id = a.id 
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b2 ON a.id = b2.auction_id
      WHERE b.bidder_id = ? 
      GROUP BY b.id, a.id
      ORDER BY b.bid_time DESC
    `).all(req.user?.userId);
    
    // 이미지 데이터 파싱 및 URL 변환
    const bidsWithImages = bids.map((bid: any) => {
      let images = [];
      let imageUrl = null;
      
      if (bid.images) {
        try {
          images = JSON.parse(bid.images);
          // 로컬 파일 경로를 웹 URL로 변환
          images = images.map((img: string) => {
            if (img.startsWith('file://')) {
              // 로컬 파일 경로를 웹 접근 가능한 URL로 변환
              const filename = img.split('/').pop();
              return `http://11.182.185.87:3000/uploads/${filename}`;
            }
            return img;
          });
          imageUrl = images[0] || null;
        } catch (error) {
          console.error('이미지 파싱 오류:', error);
          images = [];
        }
      }
      
      return {
        ...bid,
        images,
        imageUrl
      };
    });
    
    res.json(bidsWithImages);
  } catch (error) {
    console.error('Get user bids error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 탭별 경매 조회 엔드포인트들
router.get('/auctions/selling', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const auctions = db.prepare(`
      SELECT 
        a.*,
        u.username as seller_name,
        COUNT(DISTINCT b.bidder_id) as participants
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE a.seller_id = ? 
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `).all(req.user?.userId);
    
    // 이미지 데이터 파싱 및 URL 변환
    const auctionsWithImages = auctions.map((auction: any) => {
      let images = [];
      let imageUrl = null;
      
      console.log('🔍 경매 이미지 데이터:', auction.images);
      
      if (auction.images) {
        try {
          images = JSON.parse(auction.images);
          console.log('📸 파싱된 이미지 배열:', images);
          
          // 이미지 URL이 이미 웹 URL이므로 그대로 사용
          imageUrl = images[0] || null;
          console.log('🌐 최종 이미지 URL:', imageUrl);
        } catch (error) {
          console.error('이미지 파싱 오류:', error);
          images = [];
          imageUrl = null;
        }
      }
      
      return {
        ...auction,
        images,
        imageUrl
      };
    });
    
    res.json(auctionsWithImages);
  } catch (error) {
    console.error('Get selling auctions error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/auctions/bidding', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    const bids = db.prepare(`
      SELECT 
        b.*, 
        a.title as auction_title,
        a.description,
        a.starting_price,
        a.current_price,
        a.status,
        a.end_time,
        a.images,
        u.username as seller_name,
        COUNT(DISTINCT b2.bidder_id) as participants
      FROM bids b 
      JOIN auctions a ON b.auction_id = a.id 
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b2 ON a.id = b2.auction_id
      WHERE b.bidder_id = ? 
      GROUP BY b.id, a.id
      ORDER BY b.bid_time DESC
    `).all(req.user?.userId);
    
    // 이미지 데이터 파싱 및 URL 변환
    const bidsWithImages = bids.map((bid: any) => {
      let images = [];
      let imageUrl = null;
      
      if (bid.images) {
        try {
          images = JSON.parse(bid.images);
          // 로컬 파일 경로를 웹 URL로 변환
          images = images.map((img: string) => {
            if (img.startsWith('file://')) {
              // 로컬 파일 경로를 웹 접근 가능한 URL로 변환
              const filename = img.split('/').pop();
              return `http://11.182.185.87:3000/uploads/${filename}`;
            }
            return img;
          });
          imageUrl = images[0] || null;
        } catch (error) {
          console.error('이미지 파싱 오류:', error);
          images = [];
        }
      }
      
      return {
        ...bid,
        images,
        imageUrl
      };
    });
    
    res.json(bidsWithImages);
  } catch (error) {
    console.error('Get bidding auctions error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

router.get('/auctions/won', auth, async (req: AuthRequest, res) => {
  try {
    const db = getDatabase();
    // 낙찰된 경매 조회 (사용자가 최고가 입찰자인 종료된 경매)
    const wonAuctions = db.prepare(`
      SELECT 
        a.*,
        u.username as seller_name,
        COUNT(DISTINCT b.bidder_id) as participants
      FROM auctions a
      LEFT JOIN users u ON a.seller_id = u.id
      LEFT JOIN bids b ON a.id = b.auction_id
      WHERE a.status = 'ended' 
        AND a.id IN (
          SELECT auction_id 
          FROM bids 
          WHERE bidder_id = ? 
            AND amount = (
              SELECT MAX(amount) 
              FROM bids 
              WHERE auction_id = a.id
            )
        )
      GROUP BY a.id
      ORDER BY a.end_time DESC
    `).all(req.user?.userId);
    
    // 이미지 데이터 파싱 및 URL 변환
    const wonAuctionsWithImages = wonAuctions.map((auction: any) => {
      let images = [];
      let imageUrl = null;
      
      if (auction.images) {
        try {
          images = JSON.parse(auction.images);
          // 로컬 파일 경로를 웹 URL로 변환
          images = images.map((img: string) => {
            if (img.startsWith('file://')) {
              // 로컬 파일 경로를 웹 접근 가능한 URL로 변환
              const filename = img.split('/').pop();
              return `http://11.182.185.87:3000/uploads/${filename}`;
            }
            return img;
          });
          imageUrl = images[0] || null;
        } catch (error) {
          console.error('이미지 파싱 오류:', error);
          images = [];
        }
      }
      
      return {
        ...auction,
        images,
        imageUrl
      };
    });
    
    res.json(wonAuctionsWithImages);
  } catch (error) {
    console.error('Get won auctions error:', error);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

export default router;
