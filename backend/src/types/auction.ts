// 경매 관련 TypeScript 타입 정의

// 데이터베이스 쿼리 결과 타입 (JOIN된 쿼리용)
export interface AuctionQueryResult {
  id: number;
  title: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  endTime: string | null;
  status: 'active' | 'ended' | 'pending' | 'rejected';
  createdAt: string;
  sellerName: string;
  bidCount: number;
}

// 기본 경매 테이블 타입 (SELECT * FROM auctions 용)
export interface AuctionRecord {
  id: number;
  title: string;
  description: string;
  starting_price: number;
  current_price: number;
  end_time: string | null;
  status: 'active' | 'ended' | 'pending' | 'rejected';
  created_at: string;
  seller_id: number;
  category?: string;
  images?: string;
  updated_at?: string;
  duration_minutes?: number;
  is_hot?: number;
}

// API 응답용 포맷된 경매 타입
export interface FormattedAuction {
  id: number;
  title: string;
  description: string;
  startingPrice: number;
  currentPrice: number;
  endTime: string | null;
  status: 'active' | 'ended' | 'pending' | 'rejected';
  createdAt: string;
  seller: {
    username: string;
  };
  bidCount: number;
  participantCount?: number;
  images?: string[];
  imageUrl?: string | null;
}

// 경매 생성 요청 타입
export interface CreateAuctionRequest {
  title: string;
  description: string;
  startingPrice: number;
  endTime?: string | null;
  category?: string;
  imageUris?: string[];
  duration?: '1h' | '6h' | '1d' | '3d';
}

// 입찰 요청 타입
export interface CreateBidRequest {
  amount: number;
}

// 입찰 레코드 타입
export interface BidRecord {
  id: number;
  auction_id: number;
  bidder_id: number;
  amount: number;
  created_at: string;
}

// 사용자 타입
export interface UserRecord {
  id: number;
  username: string;
  email: string;
  user_type: 'user' | 'admin';
  created_at: string;
}
